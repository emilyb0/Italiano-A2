import { useState } from 'react';
import type { Exercise } from '../../types';
import { sttSupported } from '../../lib/speech';
import { ListenButton, Translation } from '../ui/ui';
import { MicButton, RepeatPractice, SelfRecorder, SttWarning } from '../ui/Speech';
import { Md } from '../ui/Md';
import { Prompt, type ExProps } from './common';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

export function SpeakEx({ ex, answered, onAnswer }: ExProps<Of<'speak'>>) {
  return (
    <div>
      <Prompt label="Escucha y repite en voz alta (imita el ritmo)">
        <div className="flex items-start gap-3">
          <ListenButton text={ex.it} autoPlay />
          <p className="text-xl font-semibold" lang="it">{ex.it}</p>
        </div>
        <Translation text={ex.es} />
      </Prompt>
      <RepeatPractice text={ex.it} disabled={answered} onResult={(r) => onAnswer({ ...r, expected: ex.it })} />
      {!answered && (
        <button className="btn btn-ghost mt-3 w-full text-sm" onClick={() => onAnswer({ correct: true, given: '', expected: ex.it, skipped: true })}>
          Ahora no puedo hablar — saltar
        </button>
      )}
    </div>
  );
}

/** Responder libremente a una pregunta oral; autoevaluación guiada con respuesta modelo. */
export function AnswerOralEx({ ex, answered, onAnswer }: ExProps<Of<'answer-oral'>>) {
  const [text, setText] = useState('');
  const [finished, setFinished] = useState(false);
  const show = finished || !sttSupported;
  return (
    <div>
      <Prompt label="Responde en voz alta con una frase completa">
        <div className="flex items-start gap-3">
          <ListenButton text={ex.question} autoPlay />
          <p className="text-xl font-semibold" lang="it">{ex.question}</p>
        </div>
        <Translation text={ex.es} />
      </Prompt>
      {sttSupported ? (
        <div className="flex flex-col items-center gap-2">
          <MicButton continuous label="Responder" onInterim={setText} onText={(t) => { setText(t); setFinished(true); }} disabled={answered} />
          {text && <p className="w-full rounded-xl bg-slate-100 p-3 italic dark:bg-slate-800" lang="it">“{text}”</p>}
        </div>
      ) : (
        <>
          <SttWarning />
          <div className="mt-2"><SelfRecorder /></div>
        </>
      )}
      {show && (
        <div className="mt-4 space-y-2 rounded-2xl border-2 border-dashed border-green-400 p-3">
          <p className="text-sm font-bold text-green-700 dark:text-green-400">Respuesta modelo</p>
          <div className="flex items-start gap-2">
            <ListenButton text={ex.sample} size="sm" />
            <p lang="it">{ex.sample}</p>
          </div>
          {ex.checks && <Md className="text-sm" text={ex.checks.map((c) => '- ' + c).join('\n')} />}
          {!answered && (
            <div className="flex gap-2 pt-2">
              <button className="btn btn-secondary flex-1" onClick={() => onAnswer({ correct: false, given: text || '(oral)', expected: ex.sample })}>😕 Me faltó</button>
              <button className="btn btn-primary flex-1" onClick={() => onAnswer({ correct: true, given: text || '(oral)', expected: ex.sample })}>👍 Lo dije bien</button>
            </div>
          )}
        </div>
      )}
      {!answered && !show && (
        <button className="btn btn-ghost mt-3 w-full text-sm" onClick={() => setFinished(true)}>Ver respuesta modelo</button>
      )}
    </div>
  );
}

export function TeachEx({ ex, answered, onAnswer }: ExProps<Of<'teach'>>) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold uppercase tracking-wide text-green-600">📘 Regla</p>
      <h2 className="mb-3 text-2xl font-extrabold">{ex.title}</h2>
      <Md text={ex.body} />
      {ex.examples && (
        <div className="mt-4 space-y-2">
          {ex.examples.map(([it, es], i) => (
            <div key={i} className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <div className="flex items-start gap-2">
                <ListenButton text={it} size="sm" />
                <span className="font-semibold" lang="it">{it}</span>
              </div>
              <Translation text={es} />
            </div>
          ))}
        </div>
      )}
      {!answered && (
        <button className="btn btn-primary mt-5 w-full" onClick={() => onAnswer({ correct: true, given: '', expected: '', skipped: true })}>
          Entendido
        </button>
      )}
    </div>
  );
}
