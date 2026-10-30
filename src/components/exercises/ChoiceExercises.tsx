import { useMemo, useState } from 'react';
import type { Exercise } from '../../types';
import { ListenButton, Translation } from '../ui/ui';
import { OptionButtons, Prompt, type ExProps } from './common';
import { shuffle } from '../../lib/util';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

/** Baraja las opciones manteniendo cuál es la correcta. */
function useShuffled(options: string[], answer: number) {
  return useMemo(() => {
    const order = shuffle(options.map((_, i) => i));
    return { options: order.map((i) => options[i]), correct: order.indexOf(answer) };
  }, [options, answer]);
}

export function ChoiceEx({ ex, answered, onAnswer }: ExProps<Of<'choice'>>) {
  const { options, correct } = useShuffled(ex.options, ex.answer);
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div>
      <Prompt label="Elige la opción correcta">
        <div className="flex items-start gap-2">
          {/[a-zà-ù]/i.test(ex.question) && <ListenButton text={ex.question.replace(/_+/g, '…')} size="sm" />}
          <p className="text-xl font-semibold" lang="it">{ex.question}</p>
        </div>
        <Translation text={ex.es} />
      </Prompt>
      <OptionButtons options={options} selected={sel} onSelect={setSel} answered={answered} correctIndex={correct} />
      {!answered && (
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={sel === null}
          onClick={() => onAnswer({ correct: sel === correct, given: options[sel!], expected: options[correct] })}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}

export function ListenChooseEx({ ex, answered, onAnswer }: ExProps<Of<'listen-choose'>>) {
  const { options, correct } = useShuffled(ex.options, ex.answer);
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div>
      <Prompt label="Escucha y responde">
        <div className="mb-3 flex justify-center">
          <ListenButton text={ex.audio} size="lg" autoPlay />
        </div>
        <p className="text-lg font-semibold" lang="it">{ex.question}</p>
      </Prompt>
      <OptionButtons options={options} selected={sel} onSelect={setSel} answered={answered} correctIndex={correct} />
      {answered && (
        <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
          <p lang="it">📝 {ex.audio}</p>
          <Translation text={ex.es} />
        </div>
      )}
      {!answered && (
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={sel === null}
          onClick={() => onAnswer({ correct: sel === correct, given: options[sel!], expected: options[correct] })}
        >
          Comprobar
        </button>
      )}
    </div>
  );
}

export function MinimalPairEx({ ex, answered, onAnswer }: ExProps<Of<'minimal-pair'>>) {
  const [sel, setSel] = useState<number | null>(null);
  const target = ex.words[ex.target];
  return (
    <div>
      <Prompt label="¿Qué palabra oyes?">
        <div className="flex justify-center py-2">
          <ListenButton text={target} size="lg" autoPlay />
        </div>
      </Prompt>
      <div className="grid grid-cols-2 gap-3">
        {ex.words.map((w, i) => {
          let cls = 'border-slate-200 dark:border-slate-700';
          if (answered && i === ex.target) cls = 'border-green-500 bg-green-50 dark:bg-green-950';
          else if (answered && i === sel) cls = 'border-red-500 bg-red-50 dark:bg-red-950';
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setSel(i);
                onAnswer({ correct: i === ex.target, given: w, expected: target });
              }}
              className={`rounded-2xl border-2 bg-white p-5 text-2xl font-extrabold dark:bg-slate-900 ${cls}`}
              lang="it"
            >
              {w}
              {answered && ex.es && <span className="block text-sm font-normal text-slate-500">{ex.es[i]}</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 flex justify-center gap-6 text-sm">
          {ex.words.map((w) => (
            <span key={w} className="flex items-center gap-1">
              <ListenButton text={w} size="sm" /> {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
