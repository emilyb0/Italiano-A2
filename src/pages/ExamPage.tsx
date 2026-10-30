import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Exam, Section } from '../types';
import { SECTION_LABEL } from '../types';
import { EXAMS } from '../lib/content';
import { blanks, parseCloze } from '../lib/cloze';
import { PASS_MARK, SECTIONS } from '../lib/stats';
import { useProgress } from '../store/progress';
import { Confetti, PageHeader, ProgressBar } from '../components/ui/ui';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { MatchTaskView, QuestionList, scoreMatch, scoreQuestions, type QAnswers } from '../components/Questions';
import { ClozeText, scoreCloze } from '../components/exercises/ClozeEx';
import { TaskPrompt, WordCounter, WritingTaskView } from '../components/WritingTaskView';
import { fmt, Monologue, RolePlay, useCountdown } from '../components/OralSim';

const MINUTES: Record<Section, number> = { ascolto: 30, lettura: 40, strutture: 40, scritta: 40, orale: 10 };

export default function ExamPage() {
  const { id } = useParams();
  const exams = useProgress((s) => s.exams);
  const exam = EXAMS.find((e) => e.id === id);
  if (exam) return <ExamRunner key={exam.id} exam={exam} />;
  return (
    <div>
      <PageHeader title="Simulacros de examen" subtitle="Formato tipo CILS A2: 5 partes en orden, con cronómetro y puntaje por sección." />
      <div className="card mb-4 text-sm">
        <p className="font-bold">Cómo funciona</p>
        <ul className="mt-1 list-disc pl-5">
          {SECTIONS.map((s) => <li key={s}>{SECTION_LABEL[s]} — {MINUTES[s]} min</li>)}
        </ul>
        <p className="mt-2">Para aprobar necesitas al menos un {Math.round(PASS_MARK * 100)} % en cada sección. La escritura y el oral se autoevalúan con una rúbrica y un texto modelo.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {EXAMS.map((e) => {
          const res = exams.filter((r) => r.examId === e.id);
          const last = res.at(-1);
          return (
            <Link key={e.id} to={`/simulacro/${e.id}`} className="card hover:border-green-400">
              <p className="text-3xl">⏱️</p>
              <p className="font-extrabold">{e.title}</p>
              {last ? (
                <div className="mt-2 space-y-1 text-xs">
                  {SECTIONS.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-16">{s}</span>
                      <ProgressBar value={last.scores[s] ?? 0} className="h-2" color={(last.scores[s] ?? 0) >= PASS_MARK ? 'bg-green-500' : 'bg-red-400'} />
                    </div>
                  ))}
                  <p className="text-slate-500">Hecho {res.length} {res.length === 1 ? 'vez' : 'veces'}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Sin hacer</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ExamRunner({ exam }: { exam: Exam }) {
  const nav = useNavigate();
  const store = useProgress();
  const [step, setStep] = useState(-1);
  const [scores, setScores] = useState<Partial<Record<Section, number>>>({});
  const [pause, setPause] = useState(false);

  const finishSection = (s: Section, score: number) => {
    const next = { ...scores, [s]: score };
    setScores(next);
    if (step + 1 >= SECTIONS.length) {
      store.saveExam({ examId: exam.id, at: Date.now(), scores: next });
      store.addXp(100);
    }
    setStep(step + 1);
    setPause(step + 1 < SECTIONS.length);
  };

  if (step === -1)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <button className="btn btn-ghost text-sm" onClick={() => nav('/simulacro')}>← Simulacros</button>
        <h1 className="text-2xl font-extrabold">{exam.title}</h1>
        <div className="card space-y-1">
          {SECTIONS.map((s, i) => <p key={s}><b>{i + 1}.</b> {SECTION_LABEL[s]} · {MINUTES[s]} min</p>)}
          <p className="pt-2 text-sm text-slate-500">Total ≈ 2 h 40 min. Puedes descansar entre secciones. En ascolto cada audio se puede escuchar 2 veces. Busca un lugar tranquilo y usa auriculares.</p>
        </div>
        <button className="btn btn-primary w-full" onClick={() => { setStep(0); setPause(false); }}>Empezar el simulacro</button>
      </div>
    );

  if (step >= SECTIONS.length) {
    const vals = SECTIONS.map((s) => scores[s] ?? 0);
    const passed = vals.every((v) => v >= PASS_MARK);
    const failing = vals.filter((v) => v < PASS_MARK).length;
    return (
      <div className="mx-auto max-w-xl space-y-4 py-6 text-center">
        {passed && <Confetti />}
        <p className="animate-pop text-6xl">{passed ? '🏅' : '📈'}</p>
        <h1 className="text-3xl font-extrabold">{passed ? 'Promossa!' : failing === 1 ? 'Casi: te falta una sección' : `Todavía no: ${failing} secciones por debajo del 60 %`}</h1>
        <div className="card space-y-2 text-left">
          {SECTIONS.map((s) => (
            <div key={s}>
              <div className="flex justify-between text-sm font-bold"><span>{SECTION_LABEL[s]}</span><span>{Math.round((scores[s] ?? 0) * 100)} %</span></div>
              <ProgressBar value={scores[s] ?? 0} color={(scores[s] ?? 0) >= PASS_MARK ? 'bg-green-500' : 'bg-red-400'} />
            </div>
          ))}
          <p className="pt-2 text-center text-lg font-extrabold">Media: {Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)} %</p>
        </div>
        <p className="text-sm text-slate-500">Los errores de ascolto, lettura y strutture se guardaron en tu cuaderno de errores.</p>
        <div className="flex gap-2">
          <Link to="/errores" className="btn btn-secondary flex-1">Ver errores</Link>
          <Link to="/estadisticas" className="btn btn-primary flex-1">Estadísticas</Link>
        </div>
      </div>
    );
  }

  const section = SECTIONS[step];
  if (pause)
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="text-5xl">☕</p>
        <h2 className="mt-2 text-2xl font-extrabold">Pausa</h2>
        <p className="mt-1">Sección anterior: {Math.round((scores[SECTIONS[step - 1]] ?? 0) * 100)} %</p>
        <p className="mt-3 font-bold">Siguiente: {SECTION_LABEL[section]} ({MINUTES[section]} min)</p>
        <button className="btn btn-primary mt-4 w-full" onClick={() => setPause(false)}>Continuar</button>
      </div>
    );

  return <SectionRunner key={section} exam={exam} section={section} onFinish={(s) => finishSection(section, s)} onExit={() => nav('/simulacro')} />;
}

function SectionRunner({ exam, section, onFinish, onExit }: { exam: Exam; section: Section; onFinish: (score: number) => void; onExit: () => void }) {
  const store = useProgress();
  const [timeUp, setTimeUp] = useState(false);
  const [ended, setEnded] = useState(false);
  const left = useCountdown(MINUTES[section] * 60, !ended, () => setTimeUp(true));
  const [qa, setQa] = useState<Record<string, QAnswers>>({});
  const [ma, setMa] = useState<Record<string, Record<number, number | undefined>>>({});
  const [cloze, setCloze] = useState<Record<number, string[]>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [wScores, setWScores] = useState<Record<string, number>>({});
  const [oral, setOral] = useState<{ role?: number; mono?: number }>({});

  const logQuestions = (title: string, qs: NonNullable<Exam['lettura'][number]['questions']>, a: QAnswers, sec: Section) =>
    qs.forEach((q, i) => {
      const ok = a[i] === q.answer;
      store.recordAnswer({ section: sec, correct: ok });
      if (!ok)
        store.logError({
          prompt: `[Simulacro · ${title}] ${q.q}`,
          expected: q.type === 'vf' ? (q.answer ? 'Vero' : 'Falso') : q.options![q.answer as number],
          given: a[i] === undefined ? '(sin respuesta)' : q.type === 'vf' ? (a[i] ? 'Vero' : 'Falso') : q.options![a[i] as number],
          explain: q.explain,
          section: sec,
        });
    });

  const gradeObjective = (): number => {
    let c = 0;
    let t = 0;
    if (section === 'ascolto')
      exam.ascolto.forEach((l) => {
        const s = scoreQuestions(l.questions, qa[l.id] ?? {});
        c += s.correct;
        t += s.total;
        logQuestions(l.title, l.questions, qa[l.id] ?? {}, 'ascolto');
      });
    if (section === 'lettura')
      exam.lettura.forEach((r) => {
        if (r.questions) {
          const s = scoreQuestions(r.questions, qa[r.id] ?? {});
          c += s.correct;
          t += s.total;
          logQuestions(r.title, r.questions, qa[r.id] ?? {}, 'lettura');
        }
        if (r.match) {
          const s = scoreMatch(r.match, ma[r.id] ?? {});
          c += s.correct;
          t += s.total;
          for (let i = 0; i < s.total; i++) store.recordAnswer({ section: 'lettura', correct: i < s.correct });
        }
      });
    if (section === 'strutture')
      exam.strutture.forEach((ct, k) => {
        const values = cloze[k] ?? [];
        const s = scoreCloze(ct.text, values);
        c += s.correct;
        t += s.total;
        blanks(parseCloze(ct.text)).forEach((b) => {
          const ok = scoreCloze(`[[${b.options ? b.options.join('/') : b.answers.join('|')}]]`, [values[b.index] ?? '']).correct === 1;
          store.recordAnswer({ section: 'strutture', correct: ok });
          if (!ok) {
            const ctx = ct.text.replace(/\[\[(.+?)\]\]/g, (_, inner: string, off: number) => (off === findOffset(ct.text, b.index) ? '___' : inner.split(/[|/]/)[0]));
            store.logError({ prompt: `[Simulacro · ${ct.title}] ${excerpt(ctx)}`, expected: b.answers[0], given: values[b.index] || '(vacío)', section: 'strutture', topic: undefined });
          }
        });
      });
    return t ? c / t : 0;
  };

  const end = () => {
    setEnded(true);
    if (section === 'ascolto' || section === 'lettura' || section === 'strutture') onFinish(gradeObjective());
  };

  const header = (
    <div className="sticky top-14 z-20 -mx-4 mb-4 flex items-center gap-3 border-b-2 border-slate-200 bg-slate-50/95 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/95">
      <button className="btn btn-ghost px-2" onClick={() => confirm('¿Salir del simulacro? Se perderá el progreso de este intento.') && onExit()}>✕</button>
      <p className="flex-1 font-extrabold">{SECTION_LABEL[section]}</p>
      <span className={`rounded-full px-3 py-1 font-extrabold tabular-nums ${left < 120 ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>⏱️ {fmt(left)}</span>
      {!ended && section !== 'orale' && (
        <button className="btn btn-primary px-3 py-2 text-sm" onClick={() => confirm('¿Entregar esta sección?') && end()}>Entregar</button>
      )}
    </div>
  );

  if (timeUp && !ended && section !== 'orale') {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="text-5xl">⏰</p>
        <h2 className="mt-2 text-2xl font-extrabold">¡Tiempo!</h2>
        <button className="btn btn-primary mt-4 w-full" onClick={end}>{section === 'scritta' ? 'Pasar a la autoevaluación' : 'Ver resultado de la sección'}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {header}
      {section === 'ascolto' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">Lee las preguntas, luego escucha. Cada audio se puede escuchar 2 veces.</p>
          {exam.ascolto.map((l, i) => (
            <div key={l.id} className="card space-y-3">
              <p className="font-extrabold">Brano {i + 1}: <span lang="it">{l.title}</span></p>
              <DialoguePlayer lines={l.lines} maxPlays={2} allowSlow={false} />
              <QuestionList questions={l.questions} answers={qa[l.id] ?? {}} checked={false} onChange={(k, v) => setQa({ ...qa, [l.id]: { ...(qa[l.id] ?? {}), [k]: v } })} />
            </div>
          ))}
        </div>
      )}
      {section === 'lettura' && (
        <div className="space-y-5">
          {exam.lettura.map((r, i) => (
            <div key={r.id} className="card space-y-3">
              <p className="text-xs font-bold uppercase text-slate-500">Testo {i + 1} · {r.genre}</p>
              <h3 className="text-lg font-extrabold" lang="it">{r.title}</h3>
              <p className="whitespace-pre-line text-lg leading-relaxed" lang="it">{r.text}</p>
              {r.questions && <QuestionList questions={r.questions} answers={qa[r.id] ?? {}} checked={false} onChange={(k, v) => setQa({ ...qa, [r.id]: { ...(qa[r.id] ?? {}), [k]: v } })} />}
              {r.match && <MatchTaskView task={r.match} answers={ma[r.id] ?? {}} checked={false} onChange={(k, v) => setMa({ ...ma, [r.id]: { ...(ma[r.id] ?? {}), [k]: v } })} />}
            </div>
          ))}
        </div>
      )}
      {section === 'strutture' && (
        <div className="space-y-5">
          {exam.strutture.map((ct, k) => (
            <div key={k} className="card space-y-2">
              <p className="font-extrabold">{k + 1}. {ct.title}</p>
              <p className="text-sm text-slate-500">{ct.instruction}</p>
              <ClozeText text={ct.text} values={cloze[k] ?? []} checked={false} onChange={(i, v) => setCloze((c) => { const n = [...(c[k] ?? [])]; n[i] = v; return { ...c, [k]: n }; })} />
            </div>
          ))}
        </div>
      )}
      {section === 'scritta' && (
        <div className="space-y-5">
          {exam.scritta.map((w, i) => (
            <div key={w.id} className="card space-y-3">
              <p className="font-extrabold">Prova {i + 1}: <span lang="it">{w.title}</span></p>
              {!ended ? (
                <>
                  <TaskPrompt task={w} />
                  <textarea className="input min-h-40" lang="it" spellCheck={false} value={texts[w.id] ?? ''} onChange={(e) => setTexts({ ...texts, [w.id]: e.target.value })} placeholder="Scrivi qui…" />
                  <WordCounter text={texts[w.id] ?? ''} min={w.min} max={w.max} />
                </>
              ) : (
                <WritingTaskView task={w} text={texts[w.id] ?? ''} onText={() => {}} submitted showChunks={false} onScore={(s) => setWScores({ ...wScores, [w.id]: s })} />
              )}
            </div>
          ))}
          {ended && (
            <button
              className="btn btn-primary w-full"
              disabled={exam.scritta.some((w) => wScores[w.id] === undefined)}
              onClick={() => {
                const v = exam.scritta.map((w) => wScores[w.id] ?? 0);
                const s = v.reduce((a, b) => a + b, 0) / v.length;
                store.recordAnswer({ section: 'scritta', correct: s >= PASS_MARK });
                onFinish(s);
              }}
            >
              Guardar y continuar
            </button>
          )}
        </div>
      )}
      {section === 'orale' && (
        <div className="space-y-5">
          {oral.role === undefined ? (
            <>
              <p className="text-sm text-slate-500">Parte 1: conversación con el examinador (≈5 min).</p>
              <RolePlay questions={exam.orale.roleplay} onDone={(s) => setOral({ role: s })} />
            </>
          ) : oral.mono === undefined ? (
            <>
              <p className="text-sm text-slate-500">Parte 2: monólogo (1 min de preparación + 1,5–2 min).</p>
              <Monologue topic={exam.orale.monologue} onDone={(s) => setOral({ ...oral, mono: s })} />
            </>
          ) : (
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                const s = ((oral.role ?? 0) + (oral.mono ?? 0)) / 2;
                store.recordAnswer({ section: 'orale', correct: s >= PASS_MARK });
                onFinish(s);
              }}
            >
              Ver resultado final
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function findOffset(text: string, blankIndex: number): number {
  const re = /\[\[(.+?)\]\]/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (i++ === blankIndex) return m.index;
  }
  return -1;
}

function excerpt(s: string): string {
  const i = s.indexOf('___');
  return (i > 60 ? '…' : '') + s.slice(Math.max(0, i - 60), i + 60) + (i + 60 < s.length ? '…' : '');
}
