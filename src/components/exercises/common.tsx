import { useMemo, useState } from 'react';
import type { WordResult } from '../../lib/compare';
import { shuffle } from '../../lib/util';
import { ListenButton } from '../ui/ui';

export interface AnswerResult {
  correct: boolean;
  given: string;
  expected: string;
  words?: WordResult[];
  /** aviso cuando se acepta con acentos o tipeo */
  note?: string;
  /** ejercicio sin calificación (explicación, saltado) */
  skipped?: boolean;
}

export interface ExProps<T> {
  ex: T;
  answered: boolean;
  onAnswer: (r: AnswerResult) => void;
}

export function Prompt({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {children}
    </div>
  );
}

/** Banco de fichas para armar frases. */
export function TileBuilder({ words, onChange, disabled }: { words: string[]; onChange: (s: string) => void; disabled?: boolean }) {
  const bank = useMemo(() => shuffle(words.map((w, i) => ({ w, i }))), [words]);
  const [picked, setPicked] = useState<number[]>([]);
  const update = (p: number[]) => {
    setPicked(p);
    onChange(p.map((i) => words[i]).join(' '));
  };
  return (
    <div className="space-y-4">
      <div className="flex min-h-16 flex-wrap gap-2 border-b-2 border-slate-200 pb-3 dark:border-slate-700">
        {picked.map((i, k) => (
          <button key={k} disabled={disabled} className="btn btn-secondary px-3 py-2" onClick={() => update(picked.filter((_, j) => j !== k))}>
            {words[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {bank.map(({ w, i }) => (
          <button
            key={i}
            disabled={disabled || picked.includes(i)}
            className={`btn btn-secondary px-3 py-2 ${picked.includes(i) ? 'opacity-30' : ''}`}
            onClick={() => update([...picked, i])}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

export function tokensForTiles(s: string): string[] {
  return s.replace(/[.,!?;:]/g, '').split(/\s+/).filter(Boolean);
}

export function OptionButtons({
  options,
  selected,
  onSelect,
  answered,
  correctIndex,
  speakOptions,
}: {
  options: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  answered: boolean;
  correctIndex: number;
  speakOptions?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o, i) => {
        let cls = 'border-slate-200 dark:border-slate-700';
        if (answered && i === correctIndex) cls = 'border-green-500 bg-green-50 dark:bg-green-950';
        else if (answered && i === selected) cls = 'border-red-500 bg-red-50 dark:bg-red-950';
        else if (i === selected) cls = 'border-sky-500 bg-sky-50 dark:bg-sky-950';
        return (
          <div key={i} className="flex items-center gap-2">
            <button
              disabled={answered}
              onClick={() => onSelect(i)}
              className={`flex-1 rounded-2xl border-2 bg-white px-4 py-3 text-left font-semibold dark:bg-slate-900 ${cls}`}
            >
              <span className="mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>
              <span lang="it">{o}</span>
            </button>
            {speakOptions && <ListenButton text={o} size="sm" />}
          </div>
        );
      })}
    </div>
  );
}
