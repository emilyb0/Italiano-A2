import { Fragment, useMemo } from 'react';
import type { MatchTask, Question } from '../types';
import { ListenButton } from './ui/ui';

export type QAnswers = Record<number, number | boolean | undefined>;

export function scoreQuestions(qs: Question[], a: QAnswers): { correct: number; total: number } {
  return { correct: qs.filter((q, i) => a[i] !== undefined && a[i] === q.answer).length, total: qs.length };
}

export function scoreMatch(m: MatchTask, a: Record<number, number | undefined>): { correct: number; total: number } {
  return { correct: m.answer.filter((r, i) => a[i] === r).length, total: m.answer.length };
}

/** Preguntas de selección múltiple (3 opciones) y verdadero/falso, como en el examen. */
export function QuestionList({
  questions,
  answers,
  onChange,
  checked,
  prefix = '',
}: {
  questions: Question[];
  answers: QAnswers;
  onChange: (i: number, v: number | boolean) => void;
  checked: boolean;
  prefix?: string;
}) {
  return (
    <ol className="space-y-4">
      {questions.map((q, i) => {
        const a = answers[i];
        const right = a === q.answer;
        return (
          <li key={i} className="rounded-2xl border-2 border-slate-200 p-3 dark:border-slate-700">
            <div className="mb-2 flex items-start gap-2">
              <span className="font-extrabold text-slate-400">{prefix}{i + 1}.</span>
              <p className="flex-1 font-semibold" lang="it">{q.q}</p>
              <ListenButton text={q.q} size="sm" />
            </div>
            {q.type === 'vf' ? (
              <div className="flex gap-2">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    disabled={checked}
                    onClick={() => onChange(i, v)}
                    className={`flex-1 rounded-xl border-2 px-3 py-2 font-bold ${
                      checked && q.answer === v
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : checked && a === v
                          ? 'border-red-500 bg-red-50 dark:bg-red-950'
                          : a === v
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950'
                            : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {v ? 'Vero' : 'Falso'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-1.5">
                {q.options!.map((o, oi) => (
                  <button
                    key={oi}
                    disabled={checked}
                    onClick={() => onChange(i, oi)}
                    lang="it"
                    className={`rounded-xl border-2 px-3 py-2 text-left ${
                      checked && q.answer === oi
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : checked && a === oi
                          ? 'border-red-500 bg-red-50 dark:bg-red-950'
                          : a === oi
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950'
                            : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="mr-2 font-bold text-slate-400">{String.fromCharCode(65 + oi)}</span>
                    {o}
                  </button>
                ))}
              </div>
            )}
            {checked && (
              <p className={`mt-2 text-sm ${right ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {right ? '✅ Correcto' : a === undefined ? '⚪ Sin responder' : '❌ Incorrecto'}
                {q.explain && <span className="text-slate-600 dark:text-slate-300"> — 💡 {q.explain}</span>}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Emparejar (textos con títulos, preguntas con respuestas). */
export function MatchTaskView({
  task,
  answers,
  onChange,
  checked,
}: {
  task: MatchTask;
  answers: Record<number, number | undefined>;
  onChange: (i: number, v: number) => void;
  checked: boolean;
}) {
  const letters = useMemo(() => task.right.map((_, i) => String.fromCharCode(65 + i)), [task]);
  return (
    <div className="space-y-3">
      <p className="font-bold">{task.instruction}</p>
      <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
        {task.right.map((r, i) => (
          <p key={i} lang="it"><b>{letters[i]}.</b> {r}</p>
        ))}
      </div>
      <div className="grid gap-2">
        {task.left.map((l, i) => {
          const ok = answers[i] === task.answer[i];
          return (
            <Fragment key={i}>
              <label className={`flex items-center gap-2 rounded-xl border-2 p-2 ${checked ? (ok ? 'border-green-500' : 'border-red-500') : 'border-slate-200 dark:border-slate-700'}`}>
                <span className="flex-1" lang="it">{i + 1}. {l}</span>
                <select
                  disabled={checked}
                  value={answers[i] ?? ''}
                  onChange={(e) => onChange(i, Number(e.target.value))}
                  className="rounded-lg border-2 border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">—</option>
                  {letters.map((L, li) => (
                    <option key={L} value={li}>{L}</option>
                  ))}
                </select>
                {checked && !ok && <span className="font-bold text-green-600">{letters[task.answer[i]]}</span>}
              </label>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
