import { useState } from 'react';
import { useProgress, type ErrorEntry } from '../store/progress';
import { compareBest } from '../lib/compare';
import { dayKey } from '../lib/dates';
import { SECTION_LABEL, TOPIC_LABEL } from '../types';
import { Empty, ListenButton, PageHeader, ProgressBar } from '../components/ui/ui';
import { WordDiff } from '../components/ui/Speech';

const typed = (e: ErrorEntry) => e.expected.length < 90 && !e.expected.includes(' = ') && e.given !== '(oral)';

export default function Errors() {
  const { errors, resolveError, deleteError, addXp } = useProgress();
  const [filter, setFilter] = useState<'today' | 'open' | 'all'>('open');
  const [quiz, setQuiz] = useState<ErrorEntry[] | null>(null);
  const today = dayKey();
  const list = errors.filter((e) => (filter === 'all' ? true : filter === 'open' ? !e.resolved : dayKey(e.at) === today));
  const open = errors.filter((e) => !e.resolved);
  const todays = open.filter((e) => dayKey(e.at) === today);

  if (quiz) return <ErrorQuiz items={quiz} onEnd={() => { addXp(10); setQuiz(null); }} onResolve={resolveError} />;

  return (
    <div>
      <PageHeader title="Cuaderno de errores" subtitle="Cada fallo se guarda aquí y entra al repaso SRS. Repásalos al final del día.">
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={!todays.length} onClick={() => setQuiz(todays)}>Repasar los de hoy ({todays.length})</button>
          <button className="btn btn-secondary" disabled={!open.length} onClick={() => setQuiz(open.slice(0, 30))}>Todos ({open.length})</button>
        </div>
      </PageHeader>
      <div className="mb-4 flex gap-2">
        {(['open', 'today', 'all'] as const).map((f) => (
          <button key={f} className={`chip px-3 py-1.5 ${filter === f ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`} onClick={() => setFilter(f)}>
            {f === 'open' ? 'Pendientes' : f === 'today' ? 'De hoy' : 'Todos'}
          </button>
        ))}
      </div>
      {!list.length ? (
        <Empty>Sin errores aquí. 🎉</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((e) => (
            <li key={e.id} className={`card ${e.resolved ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {e.topic && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">{TOPIC_LABEL[e.topic]}</span>}
                {e.section && <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{SECTION_LABEL[e.section]}</span>}
                {e.count > 1 && <span className="chip bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">×{e.count}</span>}
                {e.resolved && <span className="chip bg-green-100 text-green-700 dark:bg-green-950">resuelto</span>}
              </div>
              <p className="mt-1 font-semibold">{e.prompt}</p>
              <p className="text-sm"><span className="text-red-600 line-through">{e.given}</span></p>
              <div className="flex items-center gap-2 text-sm">
                <ListenButton text={e.expected.split('|')[0]} size="sm" />
                <span className="font-bold text-green-700 dark:text-green-400" lang="it">{e.expected}</span>
              </div>
              {e.explain && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">💡 {e.explain}</p>}
              <div className="mt-2 flex gap-3 text-sm">
                <button className="font-bold text-green-700 underline dark:text-green-400" onClick={() => resolveError(e.id, !e.resolved)}>{e.resolved ? 'Reabrir' : 'Marcar resuelto'}</button>
                <button className="text-slate-500 underline" onClick={() => deleteError(e.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorQuiz({ items, onEnd, onResolve }: { items: ErrorEntry[]; onEnd: () => void; onResolve: (id: string, ok: boolean) => void }) {
  const [i, setI] = useState(0);
  const [value, setValue] = useState('');
  const [shown, setShown] = useState<null | { ok: boolean; words?: ReturnType<typeof compareBest>['words'] }>(null);
  const e = items[i];
  if (!e) {
    return (
      <div className="py-10 text-center">
        <p className="text-6xl">📕✅</p>
        <h2 className="mt-2 text-2xl font-extrabold">Repaso de errores terminado</h2>
        <button className="btn btn-primary mt-4" onClick={onEnd}>Volver</button>
      </div>
    );
  }
  const next = () => {
    setI(i + 1);
    setValue('');
    setShown(null);
  };
  const isTyped = typed(e);
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost px-2" onClick={onEnd}>✕</button>
        <ProgressBar value={i / items.length} />
      </div>
      <div className="card space-y-3">
        <p className="text-sm font-bold uppercase text-slate-500">Antes fallaste esto</p>
        <p className="text-xl font-bold">{e.prompt}</p>
        {isTyped && (
          <input
            autoFocus
            className="input"
            lang="it"
            value={value}
            disabled={!!shown}
            onChange={(ev) => setValue(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && !shown && value.trim() && (() => {
              const r = compareBest(e.expected.split('|'), value);
              setShown({ ok: r.ok, words: r.words });
              onResolve(e.id, r.ok);
            })()}
            placeholder="Tu respuesta…"
          />
        )}
        {!shown ? (
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              if (isTyped) {
                const r = compareBest(e.expected.split('|'), value);
                setShown({ ok: r.ok, words: r.words });
                onResolve(e.id, r.ok);
              } else setShown({ ok: true });
            }}
          >
            {isTyped ? 'Comprobar' : 'Ver solución'}
          </button>
        ) : (
          <div className={`rounded-2xl p-3 ${shown.ok ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
            <div className="flex items-center gap-2">
              <ListenButton text={e.expected.split('|')[0]} size="sm" autoPlay />
              <p className="font-bold" lang="it">{e.expected}</p>
            </div>
            {isTyped && !shown.ok && shown.words && <WordDiff words={shown.words} />}
            {e.explain && <p className="mt-1 text-sm">💡 {e.explain}</p>}
            {isTyped ? (
              <button className="btn btn-primary mt-3 w-full" autoFocus onClick={next}>Siguiente</button>
            ) : (
              <div className="mt-3 flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => { onResolve(e.id, false); next(); }}>Aún me cuesta</button>
                <button className="btn btn-primary flex-1" onClick={() => { onResolve(e.id, true); next(); }}>Ya lo entiendo</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
