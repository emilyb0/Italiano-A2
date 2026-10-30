import { useMemo, useState } from 'react';
import type { Exercise, Section, Topic } from '../types';
import { ExerciseView, promptOf, sectionOf } from './exercises/ExerciseView';
import type { AnswerResult } from './exercises/common';
import { Confetti, ListenButton, ProgressBar } from './ui/ui';
import { WordDiff } from './ui/Speech';
import { heartsAvailable, MAX_HEARTS, useProgress } from '../store/progress';

export interface RunSummary {
  correct: number;
  total: number;
  xp: number;
  perTopic: Partial<Record<Topic, { correct: number; total: number }>>;
  perSection: Partial<Record<Section, { correct: number; total: number }>>;
}

interface Props {
  exercises: Exercise[];
  title?: string;
  defaultTopic?: Topic;
  /** repite al final los ejercicios fallados (estilo Duolingo) */
  requeue?: boolean;
  /** modo diagnóstico: no muestra la respuesta correcta ni gasta corazones */
  quiet?: boolean;
  onFinish: (s: RunSummary) => void;
  onExit: () => void;
}

function expectedText(ex: Exercise): string | null {
  switch (ex.type) {
    case 'translate':
    case 'order':
    case 'dictation':
    case 'speak':
      return ex.it;
    default:
      return null;
  }
}

export function LessonRunner({ exercises, title, defaultTopic, requeue = true, quiet = false, onFinish, onExit }: Props) {
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [summary, setSummary] = useState<RunSummary>({ correct: 0, total: 0, xp: 0, perTopic: {}, perSection: {} });
  const [finished, setFinished] = useState<RunSummary | null>(null);
  const [retried] = useState(() => new Set<number>());
  const store = useProgress();
  const hearts = store.settings.hearts && !quiet;
  const gradedCount = useMemo(() => exercises.filter((e) => e.type !== 'teach').length, [exercises]);

  const ex = queue[idx];

  const handleAnswer = (r: AnswerResult) => {
    setResult(r);
    if (r.skipped) return;
    const topic = ex.topic ?? defaultTopic;
    const section = sectionOf(ex);
    store.recordAnswer({ section, topic, correct: r.correct });
    setSummary((s) => {
      const t = topic ? { ...s.perTopic, [topic]: { correct: (s.perTopic[topic]?.correct ?? 0) + (r.correct ? 1 : 0), total: (s.perTopic[topic]?.total ?? 0) + 1 } } : s.perTopic;
      const sec = { ...s.perSection, [section]: { correct: (s.perSection[section]?.correct ?? 0) + (r.correct ? 1 : 0), total: (s.perSection[section]?.total ?? 0) + 1 } };
      return { ...s, correct: s.correct + (r.correct ? 1 : 0), total: s.total + 1, perTopic: t, perSection: sec };
    });
    if (!r.correct) {
      store.logError({ prompt: promptOf(ex), expected: r.expected, given: r.given, explain: ex.explain, topic, section });
      if (!quiet) store.loseHeart();
      if (requeue && !retried.has(idx)) {
        retried.add(queue.length);
        setQueue((q) => [...q, ex]);
      }
    }
  };

  const next = () => {
    if (idx + 1 >= queue.length) {
      const firstTry = Math.min(summary.correct, gradedCount);
      const xp = 10 + firstTry * 2;
      store.addXp(xp);
      const s = { ...summary, xp };
      setFinished(s);
      return;
    }
    setResult(null);
    setIdx(idx + 1);
  };

  if (finished) {
    const accuracy = finished.total ? finished.correct / finished.total : 1;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        {accuracy >= 0.6 && <Confetti />}
        <div className="animate-pop text-7xl">{accuracy >= 0.9 ? '🏆' : accuracy >= 0.6 ? '🎉' : '💪'}</div>
        <h2 className="text-3xl font-extrabold">{accuracy >= 0.9 ? 'Perfetto!' : accuracy >= 0.6 ? 'Bravissima!' : 'Continua così!'}</h2>
        <div className="grid w-full grid-cols-2 gap-3">
          <div className="card"><div className="text-2xl font-extrabold text-amber-500">+{finished.xp} XP</div><div className="text-xs text-slate-500">experiencia</div></div>
          <div className="card"><div className="text-2xl font-extrabold text-green-600">{Math.round(accuracy * 100)} %</div><div className="text-xs text-slate-500">aciertos</div></div>
        </div>
        {finished.total - finished.correct > 0 && (
          <p className="text-sm text-slate-500">Tus errores se guardaron en el cuaderno de errores y volverán en el repaso.</p>
        )}
        <button className="btn btn-primary w-full" onClick={() => onFinish(finished)}>Continuar</button>
      </div>
    );
  }

  if (hearts && !heartsAvailable(store) && !result) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="text-6xl">💔</div>
        <h2 className="mt-3 text-2xl font-extrabold">Te quedaste sin corazones</h2>
        <p className="mt-2 text-slate-500">Se recarga uno cada 30 minutos. Mientras tanto haz tu repaso SRS o el cuaderno de errores, o desactiva los corazones en Ajustes.</p>
        <button className="btn btn-primary mt-5" onClick={onExit}>Salir</button>
      </div>
    );
  }

  const expected = result && !result.correct && !result.skipped ? expectedText(ex) : null;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col">
      <div className="mb-5 flex items-center gap-3">
        <button className="btn-ghost btn px-2" aria-label="Salir" onClick={onExit}>✕</button>
        <ProgressBar value={idx / queue.length} />
        {hearts && <span className="font-extrabold text-red-500">❤️ {store.hearts}/{MAX_HEARTS}</span>}
      </div>
      {title && <p className="mb-2 text-sm font-semibold text-slate-500">{title}</p>}
      <div className="flex-1">
        <ExerciseView key={idx} ex={ex} answered={!!result} onAnswer={handleAnswer} />
      </div>
      {result && (
        <div
          className={`sticky bottom-0 -mx-4 mt-6 animate-pop rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
            result.skipped ? 'bg-slate-100 dark:bg-slate-800' : result.correct ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'
          }`}
        >
          {!result.skipped && (
            <p className={`text-xl font-extrabold ${result.correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {result.correct ? '✅ Corretto!' : quiet ? 'Respuesta registrada' : '❌ No es correcto'}
            </p>
          )}
          {!quiet && result.note && <p className="text-sm text-amber-700 dark:text-amber-300">{result.note}</p>}
          {!quiet && !result.correct && !result.skipped && (
            <div className="mt-1 space-y-1">
              {expected ? (
                <div className="flex items-start gap-2">
                  <ListenButton text={expected} size="sm" />
                  <p><span className="font-bold">Respuesta correcta:</span> <span lang="it">{expected}</span></p>
                </div>
              ) : (
                result.expected && ex.type !== 'match' && <p><span className="font-bold">Respuesta correcta:</span> <span lang="it">{result.expected}</span></p>
              )}
              {result.words && result.words.some((w) => w.status !== 'ok') && (
                <div className="rounded-xl bg-white/60 p-2 dark:bg-black/20">
                  <p className="text-xs font-bold text-slate-500">Tu respuesta comparada:</p>
                  <WordDiff words={result.words} />
                </div>
              )}
            </div>
          )}
          {!quiet && ex.explain && !result.skipped && <p className="mt-2 text-sm">💡 {ex.explain}</p>}
          <button className={`btn mt-3 w-full ${result.correct || result.skipped ? 'btn-primary' : 'btn-danger'}`} onClick={next} autoFocus>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
