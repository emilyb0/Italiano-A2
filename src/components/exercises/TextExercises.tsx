import { useMemo, useState } from 'react';
import type { Exercise } from '../../types';
import { compareBest } from '../../lib/compare';
import { ListenButton, Translation } from '../ui/ui';
import { MicButton } from '../ui/Speech';
import { Prompt, TileBuilder, tokensForTiles, type AnswerResult, type ExProps } from './common';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

const SUBJECT = /^\s*(io|tu|lui|lei|noi|voi|loro)\s+/i;

function textResult(accepted: string[], given: string): AnswerResult {
  // El pronombre sujeto es opcional en italiano: se acepta con o sin él.
  const all = [...accepted, ...accepted.filter((a) => SUBJECT.test(a)).map((a) => a.replace(SUBJECT, ''))];
  let r = compareBest(all, given, 'text');
  if (!r.ok && SUBJECT.test(given)) {
    const r2 = compareBest(all, given.replace(SUBJECT, ''), 'text');
    if (r2.ok) r = r2;
  }
  let note: string | undefined;
  if (r.ok && r.accentOnly) note = 'Atención a los acentos.';
  if (r.ok && r.typo) note = 'Aceptada, pero revisa la ortografía (¿doble consonante?).';
  return { correct: r.ok, given, expected: accepted[0], words: r.words, note };
}

function CheckButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button className="btn btn-primary w-full" disabled={disabled} onClick={onClick}>
      Comprobar
    </button>
  );
}

/** Campo de respuesta escrita con opción de dictar por voz. */
function AnswerInput({ value, onChange, onSubmit, disabled, placeholder }: { value: string; onChange: (s: string) => void; onSubmit: () => void; disabled: boolean; placeholder: string }) {
  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        rows={2}
        lang="it"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="input resize-none"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) onSubmit();
          }
        }}
      />
      {!disabled && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AccentKeys onKey={(k) => onChange(value + k)} />
          <MicButton label="Decirlo" onText={(t) => onChange(t)} onInterim={onChange} />
        </div>
      )}
    </div>
  );
}

function AccentKeys({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="flex gap-1">
      {['à', 'è', 'é', 'ì', 'ò', 'ù'].map((k) => (
        <button key={k} type="button" className="h-9 w-9 rounded-lg border-2 border-slate-200 font-bold dark:border-slate-700" onClick={() => onKey(k)}>
          {k}
        </button>
      ))}
    </div>
  );
}

export function TranslateEx({ ex, answered, onAnswer }: ExProps<Of<'translate'>>) {
  const [value, setValue] = useState('');
  const accepted = [ex.it, ...(ex.alts ?? [])];
  const tiles = useMemo(() => [...tokensForTiles(ex.it), ...(ex.extra ?? [])], [ex]);
  const submit = () => onAnswer(textResult(accepted, value));
  return (
    <div>
      <Prompt label="Traduce al italiano">
        <p className="text-xl font-semibold">🇪🇸 {ex.es}</p>
      </Prompt>
      {ex.tiles ? (
        <TileBuilder words={tiles} onChange={setValue} disabled={answered} />
      ) : (
        <AnswerInput value={value} onChange={setValue} onSubmit={submit} disabled={answered} placeholder="Escribe en italiano…" />
      )}
      {!answered && <div className="mt-4"><CheckButton onClick={submit} disabled={!value.trim()} /></div>}
    </div>
  );
}

export function OrderEx({ ex, answered, onAnswer }: ExProps<Of<'order'>>) {
  const [value, setValue] = useState('');
  const tiles = useMemo(() => [...tokensForTiles(ex.it), ...(ex.extra ?? [])], [ex]);
  return (
    <div>
      <Prompt label="Ordena las palabras para formar la frase">
        <Translation text={ex.es} label="Ver significado" />
      </Prompt>
      <TileBuilder words={tiles} onChange={setValue} disabled={answered} />
      {!answered && (
        <div className="mt-4">
          <CheckButton onClick={() => onAnswer(textResult([ex.it], value))} disabled={!value.trim()} />
        </div>
      )}
    </div>
  );
}

export function DictationEx({ ex, answered, onAnswer }: ExProps<Of<'dictation'>>) {
  const [value, setValue] = useState('');
  const submit = () => onAnswer(textResult([ex.it, ...(ex.alts ?? [])], value));
  return (
    <div>
      <Prompt label="Escucha y escribe lo que oyes">
        <div className="flex justify-center py-2">
          <ListenButton text={ex.it} size="lg" autoPlay />
        </div>
      </Prompt>
      <AnswerInput value={value} onChange={setValue} onSubmit={submit} disabled={answered} placeholder="Escribe en italiano…" />
      {answered && <Translation text={ex.es} />}
      {!answered && <div className="mt-4"><CheckButton onClick={submit} disabled={!value.trim()} /></div>}
    </div>
  );
}
