import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cardContent, GRAMMAR, grammarCardIds, LESSONS, VOCAB, vocabCardId, type CardContent } from '../lib/content';
import { buildQueue, type Grade } from '../lib/srs';
import { compareBest, type CompareResult } from '../lib/compare';
import { dayKey } from '../lib/dates';
import { shuffle } from '../lib/util';
import { useProgress } from '../store/progress';
import { Confetti, ListenButton, PageHeader, ProgressBar, Translation } from '../components/ui/ui';
import { MicButton, WordDiff } from '../components/ui/Speech';

/** Orden de introducción de tarjetas nuevas: lo que ya viste en lecciones primero. */
function newCandidates(doneLessonIds: string[], practicedTopics: string[]): string[] {
  const done = LESSONS.filter((l) => doneLessonIds.includes(l.id));
  const topics = new Set([...practicedTopics, ...done.flatMap((l) => l.vocabTopics ?? [])]);
  const grammarIds = new Set(done.map((l) => l.grammar).filter(Boolean));
  const vocabSeen = VOCAB.filter((v) => topics.has(v.topic)).map(vocabCardId);
  const rules = GRAMMAR.filter((g) => grammarIds.has(g.id)).flatMap(grammarCardIds);
  const rest = VOCAB.map(vocabCardId);
  // Intercala reglas entre palabras.
  const mixed: string[] = [];
  const a = [...vocabSeen];
  const b = [...rules];
  while (a.length || b.length) {
    mixed.push(...a.splice(0, 3));
    if (b.length) mixed.push(b.shift()!);
  }
  return [...new Set([...mixed, ...rest])];
}

const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: 'again', label: 'Otra vez', cls: 'btn-danger' },
  { g: 'hard', label: 'Difícil', cls: 'btn-secondary' },
  { g: 'good', label: 'Bien', cls: 'btn-primary' },
  { g: 'easy', label: 'Fácil', cls: 'btn-secondary' },
];

export default function Review() {
  const store = useProgress();
  const [session, setSession] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [stats, setStats] = useState({ ok: 0, total: 0 });
  const today = dayKey();

  const plan = useMemo(() => {
    const doneIds = Object.keys(store.lessons);
    const practiced = Object.keys(store.activities).filter((k) => k.startsWith('vocab:')).map((k) => k.slice(6));
    const left = Math.max(0, store.settings.newCardsPerDay - (store.newCardsByDay[today] ?? 0));
    return buildQueue(store.cards, newCandidates(doneIds, practiced), left);
    // Se calcula al entrar; durante la sesión la cola es fija.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session === null]);

  if (!session) {
    return (
      <div>
        <PageHeader title="Repaso SRS" subtitle="Repetición espaciada: lo que estás por olvidar, justo a tiempo." />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card"><p className="text-3xl font-extrabold text-red-500">{plan.due.length}</p><p className="text-sm text-slate-500">tarjetas pendientes (van primero)</p></div>
          <div className="card"><p className="text-3xl font-extrabold text-sky-500">{plan.fresh.length}</p><p className="text-sm text-slate-500">tarjetas nuevas hoy (límite en Ajustes)</p></div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Verás el español y tendrás que <b>producir</b> el italiano (escribiendo o hablando). Algunas tarjetas son de escucha y otras son reglas de gramática.
          Los errores de las lecciones también aparecen aquí.
        </p>
        {plan.due.length + plan.fresh.length > 0 ? (
          <button
            className="btn btn-primary mt-5 w-full"
            onClick={() => {
              // Práctica intercalada: mezcla tipos de tarjeta dentro de las pendientes.
              setSession([...shuffle(plan.due), ...plan.fresh]);
              setPos(0);
            }}
          >
            Empezar repaso ({plan.due.length + plan.fresh.length})
          </button>
        ) : (
          <div className="card mt-5 text-center">
            <p className="text-4xl">✅</p>
            <p className="font-bold">¡Todo al día!</p>
            <p className="text-sm text-slate-500">Completa lecciones o practica vocabulario para tener tarjetas nuevas.</p>
            <Link to="/vocabulario" className="btn btn-secondary mt-3">Ir a vocabulario</Link>
          </div>
        )}
      </div>
    );
  }

  if (pos >= session.length) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <Confetti />
        <p className="animate-pop text-7xl">🧠</p>
        <h2 className="mt-2 text-3xl font-extrabold">Repaso terminado</h2>
        <p className="mt-2">{stats.ok} de {stats.total} correctas a la primera.</p>
        <button className="btn btn-primary mt-5 w-full" onClick={() => setSession(null)}>Volver</button>
      </div>
    );
  }

  const id = session[pos];
  const content = cardContent(id, store.errors);
  const isNew = !store.cards[id] || (!store.cards[id].last && store.cards[id].reps === 0);

  const advance = (g: Grade, firstTry: boolean) => {
    store.gradeCard(id, g);
    if (id.startsWith('err:') && g !== 'again') store.resolveError(id.slice(4), true);
    setStats((s) => ({ ok: s.ok + (firstTry && g !== 'again' ? 1 : 0), total: s.total + (firstTry ? 1 : 0) }));
    const occurrences = session.slice(0, pos + 1).filter((x) => x === id).length;
    if (g === 'again' && occurrences < 3) setSession([...session, id]);
    if (pos + 1 >= session.length && !(g === 'again' && occurrences < 3)) store.addXp(5 + stats.total);
    setPos(pos + 1);
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <button className="btn btn-ghost px-2" onClick={() => setSession(null)} aria-label="Salir">✕</button>
        <ProgressBar value={pos / session.length} />
        <span className="text-sm font-bold text-slate-500">{session.length - pos}</span>
      </div>
      {content ? (
        <CardView
          key={pos}
          id={id}
          c={content}
          isNew={isNew}
          listenMode={content.kind === 'vocab' && !isNew && pos % 3 === 2}
          onDone={(g, first) => {
            store.recordAnswer({ section: content.kind === 'rule' ? 'strutture' : undefined, topic: content.kind === 'vocab' ? 'lessico' : undefined, correct: g !== 'again' });
            advance(g, first);
          }}
        />
      ) : (
        <div className="card">
          <p>Esta tarjeta ya no existe en el contenido.</p>
          <button className="btn btn-secondary mt-2" onClick={() => setPos(pos + 1)}>Saltar</button>
        </div>
      )}
    </div>
  );
}

function CardView({ id, c, isNew, listenMode, onDone }: { id: string; c: CardContent; isNew: boolean; listenMode: boolean; onDone: (g: Grade, firstTry: boolean) => void }) {
  const [phase, setPhase] = useState<'learn' | 'test' | 'result'>(isNew && c.kind === 'vocab' ? 'learn' : 'test');
  const [value, setValue] = useState('');
  const [res, setRes] = useState<CompareResult | null>(null);

  const check = () => {
    const r = compareBest(c.answers, value, 'text');
    setRes(r);
    setPhase('result');
  };
  const suggested: Grade = !res ? 'good' : !res.ok ? 'again' : res.exact ? 'good' : 'hard';

  const kindLabel = c.kind === 'vocab' ? (listenMode ? '🎧 Escucha y escribe' : '🗂️ ¿Cómo se dice en italiano?') : c.kind === 'rule' ? '📘 Regla: completa' : '📕 Del cuaderno de errores';

  if (phase === 'learn') {
    return (
      <div className="card space-y-3 text-center">
        <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200">✨ Nueva</span>
        <div className="flex items-center justify-center gap-2">
          <ListenButton text={c.display} autoPlay />
          <p className="text-3xl font-extrabold" lang="it">{c.display}</p>
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-300">🇪🇸 {c.front}</p>
        {c.example && (
          <div className="rounded-2xl bg-slate-100 p-3 text-left dark:bg-slate-800">
            <div className="flex items-start gap-2"><ListenButton text={c.example} size="sm" /><p lang="it">{c.example}</p></div>
            <Translation text={c.exampleEs} />
          </div>
        )}
        {c.explain && <p className="text-sm">💡 {c.explain}</p>}
        <div className="flex gap-2">
          <button className="btn btn-secondary flex-1" onClick={() => onDone('easy', true)}>Ya la sé</button>
          <button className="btn btn-primary flex-1" onClick={() => setPhase('test')}>Practicar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4" data-card={id}>
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{kindLabel}</p>
      {listenMode ? (
        <div className="flex justify-center"><ListenButton text={c.display} size="lg" autoPlay /></div>
      ) : (
        <div>
          <p className="text-2xl font-extrabold" lang={c.frontLang}>{c.frontLang === 'es' && c.kind !== 'rule' ? '🇪🇸 ' : ''}{c.front}</p>
          {c.hint && <p className="text-sm text-slate-500">Pista: {c.hint}</p>}
        </div>
      )}
      <textarea
        autoFocus
        rows={2}
        lang="it"
        spellCheck={false}
        autoCapitalize="off"
        className="input resize-none"
        placeholder="Escribe en italiano…"
        value={value}
        disabled={phase === 'result'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (phase === 'test') check();
            else onDone(suggested, true);
          }
        }}
      />
      {phase === 'test' && (
        <div className="space-y-3">
          <MicButton label="Decirlo" onText={setValue} onInterim={setValue} />
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={check}>No lo sé</button>
            <button className="btn btn-primary flex-1" onClick={check} disabled={!value.trim()}>Comprobar</button>
          </div>
        </div>
      )}
      {phase === 'result' && res && (
        <div className={`space-y-2 rounded-2xl p-3 ${res.ok ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
          <p className="font-extrabold">{res.ok ? (res.exact ? '✅ Corretto!' : '✅ Casi perfecto') : '❌ La respuesta era:'}</p>
          <div className="flex items-center gap-2">
            <ListenButton text={c.display} size="sm" autoPlay />
            <p className="text-xl font-bold" lang="it">{c.answers.join(' / ')}</p>
          </div>
          {value && !res.exact && <WordDiff words={res.words} />}
          {listenMode && <p className="text-sm">🇪🇸 {c.front}</p>}
          {c.explain && <p className="text-sm">💡 {c.explain}</p>}
          {c.example && <p className="text-sm italic" lang="it">«{c.example}»</p>}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {GRADES.map((g) => (
              <button
                key={g.g}
                className={`btn px-1 py-2 text-sm ${g.cls} ${g.g === suggested ? 'ring-4 ring-sky-300' : ''}`}
                onClick={() => onDone(g.g, true)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Sugerido: <b>{GRADES.find((g) => g.g === suggested)?.label}</b> (Enter). Si fue solo un error al teclear, puedes elegir otra opción.</p>
        </div>
      )}
    </div>
  );
}
