import { useMemo, useState } from 'react';
import type { Exercise } from '../../types';
import { speak } from '../../lib/speech';
import { shuffle } from '../../lib/util';
import { useProgress } from '../../store/progress';
import { Prompt, type ExProps } from './common';

type MatchExercise = Extract<Exercise, { type: 'match' }>;

export function MatchEx({ ex, answered, onAnswer }: ExProps<MatchExercise>) {
  const rate = useProgress((s) => s.settings.rate);
  const voiceURI = useProgress((s) => s.settings.voiceURI);
  const left = useMemo(() => shuffle(ex.pairs.map((_, i) => i)), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((_, i) => i)), [ex]);
  const [selL, setSelL] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const pickRight = (r: number) => {
    if (selL === null || answered) return;
    if (r === selL) {
      const nd = [...done, r];
      setDone(nd);
      setSelL(null);
      if (nd.length === ex.pairs.length)
        onAnswer({
          correct: mistakes === 0,
          given: mistakes ? `${mistakes} error(es)` : 'todo bien',
          expected: ex.pairs.map((p) => `${p[0]} = ${p[1]}`).join('; '),
        });
    } else {
      setMistakes((m) => m + 1);
      setWrong(r);
      setTimeout(() => setWrong(null), 400);
    }
  };

  const base = 'w-full rounded-2xl border-2 px-3 py-3 text-left font-semibold transition';
  return (
    <div>
      <Prompt label={ex.instruction ?? 'Empareja cada elemento con su pareja'} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {left.map((i) => (
            <button
              key={i}
              lang="it"
              disabled={done.includes(i)}
              onClick={() => {
                setSelL(i);
                void speak(ex.pairs[i][0], { rate, voiceURI });
              }}
              className={`${base} ${done.includes(i) ? 'border-green-300 bg-green-50 text-green-700 opacity-60 dark:bg-green-950' : selL === i ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
            >
              {ex.pairs[i][0]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((i) => (
            <button
              key={i}
              disabled={done.includes(i)}
              onClick={() => pickRight(i)}
              className={`${base} ${done.includes(i) ? 'border-green-300 bg-green-50 text-green-700 opacity-60 dark:bg-green-950' : wrong === i ? 'animate-shake border-red-500 bg-red-50 dark:bg-red-950' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
            >
              {ex.pairs[i][1]}
            </button>
          ))}
        </div>
      </div>
      {mistakes > 0 && !answered && <p className="mt-2 text-sm text-red-600">Errores: {mistakes}</p>}
    </div>
  );
}
