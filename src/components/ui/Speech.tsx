import { useEffect, useRef, useState } from 'react';
import { compareBest, type WordResult } from '../../lib/compare';
import { listen, recordSupported, startRecording, sttSupported, type ListenHandle } from '../../lib/speech';

export function WordDiff({ words }: { words: WordResult[] }) {
  const cls: Record<WordResult['status'], string> = {
    ok: 'text-green-700 dark:text-green-400',
    close: 'text-amber-600 dark:text-amber-400 underline decoration-wavy',
    missing: 'text-red-600 dark:text-red-400 line-through decoration-2',
    extra: 'text-slate-400 italic',
  };
  return (
    <p className="text-lg leading-relaxed" lang="it">
      {words.map((w, i) => (
        <span key={i} className={`${cls[w.status]} mr-1.5`} title={w.status === 'missing' ? 'falta / no se entendió' : w.status === 'extra' ? 'sobra' : w.status === 'close' ? 'casi' : ''}>
          {w.status === 'extra' ? `(${w.word})` : w.word}
        </span>
      ))}
    </p>
  );
}

export function SttWarning() {
  if (sttSupported) return null;
  return (
    <div className="rounded-2xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      ⚠️ Tu navegador no soporta reconocimiento de voz. Para que la app reconozca lo que dices usa <b>Google Chrome</b> (escritorio o Android).
      Mientras tanto puedes <b>grabarte, escucharte y autoevaluarte</b>.
    </div>
  );
}

/** Botón de micrófono que devuelve la transcripción. continuous=true para respuestas largas. */
export function MicButton({
  onText,
  onInterim,
  continuous = false,
  label = 'Hablar',
  disabled,
}: {
  onText: (t: string) => void;
  onInterim?: (t: string) => void;
  continuous?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const handle = useRef<ListenHandle | null>(null);
  useEffect(() => () => handle.current?.stop(), []);
  if (!sttSupported) return null;
  const toggle = () => {
    if (active) {
      handle.current?.stop();
      return;
    }
    setError('');
    const h = listen(
      {
        onInterim,
        onFinal: (t) => onText(t),
        onError: (m) => setError(m),
        onEnd: () => {
          setActive(false);
          handle.current = null;
        },
      },
      continuous,
    );
    if (h) {
      handle.current = h;
      setActive(true);
    }
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={`btn ${active ? 'btn-danger animate-pulse' : 'btn-primary'} min-w-40`}
      >
        {active ? '⏹ Detener' : `🎤 ${label}`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Grabadora para autoevaluación cuando no hay reconocimiento de voz. */
export function SelfRecorder({ onGrade }: { onGrade?: (ok: boolean) => void }) {
  const [rec, setRec] = useState<{ stop: () => Promise<string> } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  if (!recordSupported) return <p className="text-sm text-slate-500">Di la frase en voz alta y marca si te salió bien.</p>;
  return (
    <div className="flex flex-col items-center gap-2">
      {rec ? (
        <button className="btn btn-danger animate-pulse" onClick={async () => { setUrl(await rec.stop()); setRec(null); }}>
          ⏹ Detener grabación
        </button>
      ) : (
        <button
          className="btn btn-secondary"
          onClick={async () => {
            try {
              setErr('');
              setRec(await startRecording());
            } catch {
              setErr('No se pudo acceder al micrófono.');
            }
          }}
        >
          ⏺ Grabarme
        </button>
      )}
      {url && <audio src={url} controls className="w-full max-w-xs" />}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {onGrade && (
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => onGrade(false)}>😕 Debo repetir</button>
          <button className="btn btn-primary" onClick={() => onGrade(true)}>👍 Estuvo bien</button>
        </div>
      )}
    </div>
  );
}

/** Práctica de repetir una frase: reconoce la voz y compara con el texto. */
export function RepeatPractice({
  text,
  onResult,
  disabled,
}: {
  text: string;
  onResult: (r: { correct: boolean; given: string; words?: WordResult[]; selfGraded?: boolean }) => void;
  disabled?: boolean;
}) {
  const [interim, setInterim] = useState('');
  const [words, setWords] = useState<WordResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  useEffect(() => {
    setInterim('');
    setWords(null);
    setScore(null);
  }, [text]);
  if (!sttSupported) {
    return (
      <div className="space-y-3">
        <SttWarning />
        <SelfRecorder onGrade={disabled ? undefined : (ok) => onResult({ correct: ok, given: '(autoevaluación)', selfGraded: true })} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <MicButton
        disabled={disabled}
        label="Repetir en voz alta"
        onInterim={setInterim}
        onText={(t) => {
          setInterim(t);
          const r = compareBest(text.split('|'), t, 'speech');
          setWords(r.words);
          setScore(r.score);
          onResult({ correct: r.ok, given: t || '(nada)', words: r.words });
        }}
      />
      {interim && !words && <p className="italic text-slate-500">“{interim}”</p>}
      {words && (
        <div className="w-full rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <p className="mb-1 text-xs font-bold uppercase text-slate-500">Lo que entendí ({Math.round((score ?? 0) * 100)} %)</p>
          <p className="mb-2 italic text-slate-600 dark:text-slate-300">“{interim || '…'}”</p>
          <WordDiff words={words} />
          <p className="mt-1 text-xs text-slate-500">Verde: bien · Ámbar: casi · Rojo tachado: no se entendió</p>
        </div>
      )}
    </div>
  );
}
