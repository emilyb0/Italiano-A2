// Envoltorio de la Web Speech API: síntesis it-IT y reconocimiento de voz.

let voicesCache: SpeechSynthesisVoice[] = [];

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function loadVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}

if (ttsSupported) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => loadVoices();
}

export function italianVoices(): SpeechSynthesisVoice[] {
  return loadVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('it'));
}

const PREFERRED = /google|natural|online|elsa|isabella|alice|federica|luca|diego/i;

function pickVoice(preferredURI?: string, index = 0): SpeechSynthesisVoice | undefined {
  const it = italianVoices();
  if (!it.length) return undefined;
  if (index === 0 && preferredURI) {
    const p = it.find((v) => v.voiceURI === preferredURI);
    if (p) return p;
  }
  const sorted = [...it].sort((a, b) => Number(PREFERRED.test(b.name)) - Number(PREFERRED.test(a.name)));
  return sorted[index % sorted.length];
}

export interface SpeakOptions {
  rate?: number;
  /** índice de hablante, para alternar voz/tono en diálogos */
  speaker?: number;
  voiceURI?: string;
}

/** Divide textos largos por frases (Chrome corta enunciados de más de ~15 s). */
function chunks(text: string): string[] {
  const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) ?? [text];
  return parts.map((p) => p.trim()).filter(Boolean);
}

let speakToken = 0;

export function stopSpeaking() {
  speakToken++;
  if (ttsSupported) window.speechSynthesis.cancel();
}

export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!ttsSupported) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  const token = ++speakToken;
  return speakQueue(chunks(text), opts, token);
}

function speakQueue(parts: string[], opts: SpeakOptions, token: number): Promise<void> {
  const synth = window.speechSynthesis;
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (token !== speakToken || i >= parts.length) return resolve();
      const u = new SpeechSynthesisUtterance(parts[i++]);
      u.lang = 'it-IT';
      const speaker = opts.speaker ?? 0;
      const voice = pickVoice(opts.voiceURI, speaker);
      if (voice) u.voice = voice;
      u.rate = opts.rate ?? 0.95;
      // Si solo hay una voz italiana, diferenciamos hablantes con el tono.
      u.pitch = speaker === 0 ? 1 : speaker === 1 ? (italianVoices().length > 1 ? 1 : 0.75) : 1.25;
      u.onend = next;
      u.onerror = next;
      synth.speak(u);
    };
    next();
  });
}

/** Lee un diálogo línea por línea alternando voces según el hablante. */
export async function speakDialogue(lines: { s: string; t: string }[], opts: SpeakOptions = {}): Promise<void> {
  if (!ttsSupported) return;
  window.speechSynthesis.cancel();
  const token = ++speakToken;
  const speakers: string[] = [];
  for (const line of lines) {
    if (token !== speakToken) return;
    let idx = speakers.indexOf(line.s);
    if (idx < 0) idx = speakers.push(line.s) - 1;
    await speakQueue(chunks(line.t), { ...opts, speaker: idx }, token);
    await new Promise((r) => setTimeout(r, 350));
  }
}

// ---------------- Reconocimiento de voz ----------------

type RecognitionCtor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const sttSupported = !!getCtor();

export interface ListenHandle {
  stop: () => void;
}

export interface ListenCallbacks {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Permiso de micrófono denegado. Actívalo en la barra de direcciones del navegador.',
  'no-speech': 'No se detectó voz. Intenta hablar más cerca del micrófono.',
  'audio-capture': 'No se encontró micrófono.',
  network: 'El reconocimiento de voz de Chrome necesita conexión a internet.',
};

/**
 * Escucha al usuario. Con continuous=true (monólogos) acumula todo lo dicho
 * hasta que se llama a stop().
 */
export function listen(cb: ListenCallbacks, continuous = false): ListenHandle | null {
  const Ctor = getCtor();
  if (!Ctor) {
    cb.onError?.('Tu navegador no soporta reconocimiento de voz. Usa Chrome.');
    return null;
  }
  stopSpeaking();
  const rec = new Ctor();
  rec.lang = 'it-IT';
  rec.continuous = continuous;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  let stopped = false;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += ' ' + r[0].transcript;
      else interim += r[0].transcript;
    }
    cb.onInterim?.((finalText + ' ' + interim).trim());
  };
  rec.onerror = (e) => {
    if (e.error === 'aborted') return;
    cb.onError?.(ERRORS[e.error] ?? `Error de reconocimiento: ${e.error}`);
  };
  rec.onend = () => {
    // En modo continuo Chrome a veces corta solo; reiniciamos hasta que el usuario pare.
    if (continuous && !stopped) {
      try {
        rec.start();
        return;
      } catch {
        /* sigue al final */
      }
    }
    cb.onFinal(finalText.trim());
    cb.onEnd?.();
  };
  try {
    rec.start();
  } catch (err) {
    cb.onError?.(String(err));
    return null;
  }
  return {
    stop: () => {
      stopped = true;
      rec.stop();
    },
  };
}

// ---------------- Grabación (autoevaluación) ----------------

export const recordSupported =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export async function startRecording(): Promise<{ stop: () => Promise<string> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => parts.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(URL.createObjectURL(new Blob(parts, { type: rec.mimeType })));
        };
        rec.stop();
      }),
  };
}
