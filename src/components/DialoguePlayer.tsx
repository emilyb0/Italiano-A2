import { useEffect, useState } from 'react';
import type { ListeningLine } from '../types';
import { speakDialogue, stopSpeaking, ttsSupported } from '../lib/speech';
import { useProgress } from '../store/progress';

/** Reproduce un guion con TTS, alternando voces por hablante. maxPlays limita las escuchas (como en el examen). */
export function DialoguePlayer({ lines, maxPlays, allowSlow = true }: { lines: ListeningLine[]; maxPlays?: number; allowSlow?: boolean }) {
  const { rate, slowRate, voiceURI } = useProgress((s) => s.settings);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!ttsSupported) return <p className="text-sm text-red-600">Tu navegador no tiene síntesis de voz. Usa Chrome o Edge.</p>;
  const left = maxPlays === undefined ? undefined : maxPlays - plays;
  const play = async (slow: boolean) => {
    setPlaying(true);
    setPlays((p) => p + 1);
    await speakDialogue(lines, { rate: slow ? slowRate : rate, voiceURI });
    setPlaying(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {playing ? (
        <button className="btn btn-danger" onClick={() => { stopSpeaking(); setPlaying(false); }}>⏹ Detener</button>
      ) : (
        <>
          <button className="btn btn-primary" disabled={left === 0} onClick={() => play(false)}>▶ Escuchar</button>
          {allowSlow && <button className="btn btn-secondary" disabled={left === 0} onClick={() => play(true)}>🐢 Lento</button>}
        </>
      )}
      <span className="text-sm text-slate-500">
        {left === undefined ? `Escuchado ${plays} ${plays === 1 ? 'vez' : 'veces'}` : `Te quedan ${left} de ${maxPlays} escuchas`}
      </span>
    </div>
  );
}
