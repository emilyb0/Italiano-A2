import { useMemo, useState } from 'react';
import type { Exercise } from '../../types';
import { blanks, checkBlank, clozeFull, parseCloze } from '../../lib/cloze';
import { shuffle } from '../../lib/util';
import { ListenButton, Translation } from '../ui/ui';
import { Prompt, type ExProps } from './common';

type ClozeExercise = Extract<Exercise, { type: 'cloze' }>;

/** Texto con huecos reutilizable (lecciones y sección de estructuras del simulacro). */
export function ClozeText({
  text,
  values,
  onChange,
  checked,
}: {
  text: string;
  values: string[];
  onChange: (i: number, v: string) => void;
  checked: boolean;
}) {
  const parts = useMemo(() => parseCloze(text), [text]);
  const shuffledOptions = useMemo(
    () => parts.map((p) => (p.kind === 'blank' && p.options ? shuffle(p.options) : undefined)),
    [parts],
  );
  return (
    <p className="text-lg leading-[2.6]" lang="it">
      {parts.map((p, k) => {
        if (p.kind === 'text') return <span key={k} className="whitespace-pre-line">{p.text}</span>;
        const v = values[p.index] ?? '';
        const ok = checked && checkBlank(p.answers, v);
        const border = checked ? (ok ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950') : 'border-sky-400';
        const opts = shuffledOptions[k];
        return (
          <span key={k} className="mx-0.5 inline-flex flex-col align-middle leading-tight">
            {opts ? (
              <select
                disabled={checked}
                value={v}
                onChange={(e) => onChange(p.index, e.target.value)}
                className={`rounded-lg border-2 bg-white px-1 py-1 text-base dark:bg-slate-900 ${border}`}
              >
                <option value="">…</option>
                {opts.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                disabled={checked}
                value={v}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => onChange(p.index, e.target.value)}
                style={{ width: `${Math.max(4, p.answers[0].length + 2)}ch` }}
                className={`rounded-lg border-2 bg-white px-1.5 py-0.5 text-base outline-none dark:bg-slate-900 ${border}`}
              />
            )}
            {checked && !ok && <span className="text-sm font-bold text-green-700 dark:text-green-400">{p.answers[0]}</span>}
          </span>
        );
      })}
    </p>
  );
}

export function scoreCloze(text: string, values: string[]): { correct: number; total: number } {
  const b = blanks(parseCloze(text));
  return { correct: b.filter((x) => checkBlank(x.answers, values[x.index] ?? '')).length, total: b.length };
}

export function ClozeEx({ ex, answered, onAnswer }: ExProps<ClozeExercise>) {
  const [values, setValues] = useState<string[]>([]);
  const b = useMemo(() => blanks(parseCloze(ex.text)), [ex.text]);
  const filled = b.every((x) => (values[x.index] ?? '').trim());
  return (
    <div>
      <Prompt label={ex.instruction ?? 'Completa los espacios'} />
      <ClozeText text={ex.text} values={values} checked={answered} onChange={(i, v) => setValues((s) => { const n = [...s]; n[i] = v; return n; })} />
      {answered && (
        <div className="mt-2 flex items-center gap-2">
          <ListenButton text={clozeFull(ex.text)} size="sm" />
          <Translation text={ex.es} />
        </div>
      )}
      {!answered && (
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={!filled}
          onClick={() => {
            const s = scoreCloze(ex.text, values);
            onAnswer({ correct: s.correct === s.total, given: values.join(' · '), expected: b.map((x) => x.answers[0]).join(' · ') });
          }}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}
