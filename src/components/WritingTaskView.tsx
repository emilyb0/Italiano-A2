import { useState } from 'react';
import type { WritingTask } from '../types';
import { analyse } from '../lib/production';
import { countWords } from '../lib/util';
import { ListenButton, Translation } from './ui/ui';

export const RUBRIC = [
  { id: 'task', label: 'Cumple la tarea', help: '¿Respondiste a todos los puntos de la consigna?' },
  { id: 'words', label: 'Número de palabras', help: 'Dentro del rango pedido.' },
  { id: 'grammar', label: 'Gramática', help: 'Concordancias, artículos, verbos y preposiciones correctos.' },
  { id: 'vocab', label: 'Vocabulario', help: 'Palabras adecuadas y variadas, sin español ni inglés.' },
] as const;

export function WordCounter({ text, min, max }: { text: string; min: number; max: number }) {
  const n = countWords(text);
  const color = n < min ? 'text-amber-600' : n > max ? 'text-red-600' : 'text-green-600';
  return (
    <p className={`text-sm font-bold ${color}`}>
      {n} palabras · objetivo {min}–{max} {n >= min && n <= max ? '✓' : n < min ? `(faltan ${min - n})` : `(sobran ${n - max})`}
    </p>
  );
}

export function TaskPrompt({ task }: { task: WritingTask }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <ListenButton text={task.prompt} size="sm" />
        <p className="font-semibold" lang="it">{task.prompt}</p>
      </div>
      <Translation text={task.promptEs} label="Ver consigna en español" />
      {task.scene && <div className="rounded-2xl bg-sky-50 p-4 text-center text-5xl leading-snug tracking-widest dark:bg-sky-950">{task.scene}</div>}
    </div>
  );
}

/** Escritura + autoevaluación con rúbrica y texto modelo. Devuelve una nota 0..1. */
export function WritingTaskView({
  task,
  text,
  onText,
  submitted,
  onSubmit,
  onScore,
  showChunks = true,
}: {
  task: WritingTask;
  text: string;
  onText: (s: string) => void;
  submitted: boolean;
  onSubmit?: () => void;
  onScore?: (score: number) => void;
  showChunks?: boolean;
}) {
  const [rubric, setRubric] = useState<Record<string, number>>({});
  const [scored, setScored] = useState(false);
  const n = countWords(text);
  const a = analyse(text);
  const wordsAuto = n >= task.min && n <= task.max ? 2 : n >= task.min * 0.75 && n <= task.max * 1.25 ? 1 : 0;
  const values: Record<string, number | undefined> = { ...rubric, words: wordsAuto };
  const complete = RUBRIC.every((r) => values[r.id] !== undefined);
  return (
    <div className="space-y-3">
      <TaskPrompt task={task} />
      {showChunks && !submitted && (
        <details className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
          <summary className="cursor-pointer font-bold">💬 Frases útiles</summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {task.chunks.map((c) => (
              <li key={c}><button className="chip bg-white py-1 dark:bg-slate-900" onClick={() => onText((text ? text.trimEnd() + ' ' : '') + c)} lang="it">{c}</button></li>
            ))}
          </ul>
        </details>
      )}
      <textarea
        className="input min-h-40"
        lang="it"
        spellCheck={false}
        value={text}
        disabled={submitted}
        onChange={(e) => onText(e.target.value)}
        placeholder="Scrivi qui…"
      />
      <WordCounter text={text} min={task.min} max={task.max} />
      {!submitted && onSubmit && (
        <button className="btn btn-primary w-full" disabled={n < 5} onClick={onSubmit}>Terminar y autoevaluar</button>
      )}
      {submitted && (
        <div className="space-y-3">
          <div className="rounded-2xl border-2 border-dashed border-green-400 p-3">
            <div className="mb-1 flex items-center gap-2">
              <p className="font-extrabold text-green-700 dark:text-green-400">Texto modelo</p>
              <ListenButton text={task.model} size="sm" />
            </div>
            <p className="whitespace-pre-line" lang="it">{task.model}</p>
            <Translation text={task.modelEs} />
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
            <p className="mb-1 font-bold">Comprobaciones automáticas</p>
            <ul className="space-y-0.5">
              <li>{wordsAuto === 2 ? '✅' : '⚠️'} {n} palabras (pedido {task.min}–{task.max})</li>
              <li>{a.connectors.length >= 2 ? '✅' : '⚠️'} Conectores: {a.connectors.join(', ') || 'ninguno'} {a.connectors.length < 2 && '— usa e, ma, perché, poi, quindi…'}</li>
              {task.kind === 'messaggio' && <li>{a.hasGreeting ? '✅' : '⚠️'} Saludo inicial (Ciao…, Caro/a…)</li>}
              {task.kind === 'messaggio' && <li>{a.hasClosing ? '✅' : '⚠️'} Despedida (A presto, Un abbraccio…)</li>}
              <li>{a.avgSentence >= 5 ? '✅' : '⚠️'} Frases completas (≈{Math.round(a.avgSentence)} palabras por frase)</li>
            </ul>
            <p className="mt-2 font-bold">Lista de la consigna</p>
            <ul className="list-disc pl-5">
              {task.checklist.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-extrabold">Rúbrica de autoevaluación</p>
            {RUBRIC.map((r) => (
              <div key={r.id} className="rounded-xl border-2 border-slate-200 p-2 dark:border-slate-700">
                <p className="font-bold">{r.label}</p>
                <p className="text-xs text-slate-500">{r.help}</p>
                <div className="mt-1 flex gap-1.5">
                  {[0, 1, 2].map((v) => (
                    <button
                      key={v}
                      disabled={r.id === 'words' || scored}
                      onClick={() => setRubric((prev) => ({ ...prev, [r.id]: v }))}
                      className={`flex-1 rounded-lg border-2 px-2 py-1 text-sm font-bold ${values[r.id] === v ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      {v === 0 ? 'No' : v === 1 ? 'En parte' : 'Sí'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {onScore && !scored && (
              <button
                className="btn btn-primary w-full"
                disabled={!complete}
                onClick={() => {
                  setScored(true);
                  onScore(RUBRIC.reduce((s, r) => s + (values[r.id] ?? 0), 0) / (RUBRIC.length * 2));
                }}
              >
                Guardar puntuación
              </button>
            )}
            {scored && (
              <p className="text-center text-xl font-extrabold text-green-600">
                {Math.round((RUBRIC.reduce((s, r) => s + (values[r.id] ?? 0), 0) / (RUBRIC.length * 2)) * 100)} %
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
