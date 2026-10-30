import { useEffect, useRef, useState } from 'react';
import type { MonologueTopic, OralQuestion } from '../types';
import { analyse } from '../lib/production';
import { listen, speak, sttSupported, type ListenHandle } from '../lib/speech';
import { useProgress } from '../store/progress';
import { ListenButton, Translation } from './ui/ui';
import { SelfRecorder, SttWarning } from './ui/Speech';

export function useCountdown(seconds: number, running: boolean, onEnd?: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(0);
  const cb = useRef(onEnd);
  cb.current = onEnd;
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);
  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        cb.current?.();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return left;
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Grabación continua con transcripción en vivo. */
function useContinuousListen() {
  const [text, setText] = useState('');
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const h = useRef<ListenHandle | null>(null);
  useEffect(() => () => h.current?.stop(), []);
  const start = () => {
    setText('');
    setError('');
    h.current = listen({ onInterim: setText, onFinal: (t) => setText(t), onError: setError, onEnd: () => setActive(false) }, true);
    setActive(!!h.current);
  };
  const stop = () => h.current?.stop();
  return { text, active, error, start, stop };
}

const SELF = [
  { id: 'fluency', label: 'Fluidez (sin pausas largas)' },
  { id: 'pron', label: 'Pronunciación y entonación' },
  { id: 'grammar', label: 'Gramática (verbos, concordancias)' },
  { id: 'vocab', label: 'Vocabulario adecuado' },
];

function SelfRubric({ onScore }: { onScore: (s: number) => void }) {
  const [v, setV] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const total = SELF.reduce((s, r) => s + (v[r.id] ?? 0), 0) / (SELF.length * 2);
  return (
    <div className="space-y-2">
      <p className="font-extrabold">Autoevaluación</p>
      {SELF.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2">
          <span className="min-w-48 flex-1 text-sm font-semibold">{r.label}</span>
          {[0, 1, 2].map((x) => (
            <button key={x} disabled={done} onClick={() => setV((prev) => ({ ...prev, [r.id]: x }))} className={`rounded-lg border-2 px-3 py-1 text-sm font-bold ${v[r.id] === x ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-slate-200 dark:border-slate-700'}`}>
              {x === 0 ? 'Mal' : x === 1 ? 'Regular' : 'Bien'}
            </button>
          ))}
        </div>
      ))}
      {!done ? (
        <button className="btn btn-primary w-full" disabled={Object.keys(v).length < SELF.length} onClick={() => { setDone(true); onScore(total); }}>Guardar</button>
      ) : (
        <p className="text-center text-xl font-extrabold text-green-600">{Math.round(total * 100)} %</p>
      )}
    </div>
  );
}

export function Checklist({ text, answers }: { text: string; answers?: string[] }) {
  const a = analyse(text);
  const parts = answers ?? [text];
  const complete = parts.filter((p) => p.trim().split(/\s+/).length >= 6).length;
  const items = [
    { ok: a.usesPast, label: '¿Usé verbos en pasado (passato prossimo / imperfetto)?' },
    { ok: complete >= Math.ceil(parts.length * 0.7), label: `¿Respondí con frases completas? (${complete}/${parts.length} respuestas de 6+ palabras)` },
    { ok: a.connectors.length >= 3, label: `¿Usé conectores como perché, poi, però? (${a.connectors.join(', ') || 'ninguno'})` },
    { ok: /\b(di solito|secondo me|mi piace|mi piacciono|vorrei|preferisco)\b/i.test(text), label: '¿Usé frases útiles (di solito, secondo me, mi piace, vorrei…)?' },
  ];
  return (
    <ul className="space-y-1 text-sm">
      {items.map((i) => (
        <li key={i.label}>{i.ok ? '✅' : '⬜'} {i.label}</li>
      ))}
      {!sttSupported && <li className="text-slate-500">(Sin reconocimiento de voz: revisa estos puntos escuchando tu grabación.)</li>}
    </ul>
  );
}

/** Role play: la app hace de examinador y hace preguntas por voz. */
export function RolePlay({ questions, onDone }: { questions: OralQuestion[]; onDone: (score: number) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const mic = useContinuousListen();
  const { rate, voiceURI } = useProgress((s) => s.settings);
  const q = questions[i];
  useEffect(() => {
    if (q) void speak(q.q, { rate, voiceURI });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!q) {
    const all = answers.join('. ');
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold">Resultado del role play</h2>
        <div className="space-y-2">
          {questions.map((qq, k) => (
            <div key={qq.id} className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <p className="font-bold" lang="it">🧑‍🏫 {qq.q}</p>
              <p className="italic" lang="it">🗣️ {answers[k] || '(sin transcripción)'}</p>
              <details className="mt-1 text-sm">
                <summary className="cursor-pointer text-green-700 dark:text-green-400">Respuesta modelo</summary>
                <div className="flex items-start gap-2"><ListenButton text={qq.sample} size="sm" /><p lang="it">{qq.sample}</p></div>
              </details>
            </div>
          ))}
        </div>
        <div className="card"><p className="mb-2 font-extrabold">Lista de verificación</p><Checklist text={all} answers={answers} /></div>
        <div className="card"><SelfRubric onScore={onDone} /></div>
      </div>
    );
  }

  const nextQ = () => {
    mic.stop();
    setAnswers((a) => [...a, mic.text]);
    setI(i + 1);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-slate-500">Pregunta {i + 1} de {questions.length} · tema: {q.theme}</p>
      <div className="card space-y-2">
        <div className="flex items-start gap-3">
          <span className="text-4xl">🧑‍🏫</span>
          <div className="flex-1">
            <p className="text-xl font-semibold" lang="it">{q.q}</p>
            <Translation text={q.es} />
          </div>
          <ListenButton text={q.q} size="sm" />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Pistas</summary>
          <ul className="list-disc pl-5" lang="it">{q.hints.map((h) => <li key={h}>{h}</li>)}</ul>
        </details>
      </div>
      {sttSupported ? (
        <div className="flex flex-col items-center gap-2">
          {mic.active ? (
            <button className="btn btn-danger animate-pulse" onClick={mic.stop}>⏹ Terminar respuesta</button>
          ) : (
            <button className="btn btn-primary" onClick={mic.start}>🎤 {mic.text ? 'Responder de nuevo' : 'Responder'}</button>
          )}
          {mic.error && <p className="text-sm text-red-600">{mic.error}</p>}
          {mic.text && <p className="w-full rounded-xl bg-slate-100 p-3 italic dark:bg-slate-800" lang="it">“{mic.text}”</p>}
        </div>
      ) : (
        <>
          <SttWarning />
          <SelfRecorder />
        </>
      )}
      <button className="btn btn-secondary w-full" disabled={mic.active} onClick={nextQ}>
        {i + 1 < questions.length ? 'Siguiente pregunta →' : 'Terminar'}
      </button>
    </div>
  );
}

/** Monólogo: 1 minuto para preparar y 1,5–2 minutos para hablar. */
export function Monologue({ topic, onDone, prepSeconds = 60, speakSeconds = 120 }: { topic: MonologueTopic; onDone: (score: number) => void; prepSeconds?: number; speakSeconds?: number }) {
  const [phase, setPhase] = useState<'intro' | 'prep' | 'speak' | 'done'>('intro');
  const mic = useContinuousListen();
  const prepLeft = useCountdown(prepSeconds, phase === 'prep', () => setPhase('speak'));
  const speakLeft = useCountdown(speakSeconds, phase === 'speak' && (mic.active || !sttSupported), () => {
    mic.stop();
    setPhase('done');
  });
  const elapsed = speakSeconds - speakLeft;

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <p className="text-xs font-bold uppercase text-slate-500">Monólogo</p>
        <h2 className="text-xl font-extrabold" lang="it">{topic.title}</h2>
        <div className="flex items-start gap-2"><ListenButton text={topic.prompt} size="sm" /><p lang="it">{topic.prompt}</p></div>
        <Translation text={topic.promptEs} />
        {topic.scene && <div className="rounded-2xl bg-sky-50 p-4 text-center text-5xl tracking-widest dark:bg-sky-950">{topic.scene}</div>}
        {phase !== 'intro' && (
          <ul className="list-disc pl-5 text-sm" lang="it">{topic.points.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
      </div>
      {phase === 'intro' && <button className="btn btn-primary w-full" onClick={() => setPhase('prep')}>Empezar: 1 minuto para preparar</button>}
      {phase === 'prep' && (
        <div className="card text-center">
          <p className="text-sm font-bold text-slate-500">Preparación (piensa en los puntos, no escribas frases completas)</p>
          <p className="text-5xl font-extrabold tabular-nums">{fmt(prepLeft)}</p>
          <button className="btn btn-secondary mt-2" onClick={() => setPhase('speak')}>Estoy lista</button>
        </div>
      )}
      {phase === 'speak' && (
        <div className="card space-y-3 text-center">
          <p className="text-sm font-bold text-slate-500">Habla entre 1:30 y 2:00</p>
          <p className={`text-5xl font-extrabold tabular-nums ${elapsed >= 90 ? 'text-green-600' : ''}`}>{fmt(elapsed)}</p>
          {sttSupported ? (
            mic.active ? (
              <button className="btn btn-danger animate-pulse" onClick={() => { mic.stop(); setPhase('done'); }}>⏹ Terminar</button>
            ) : (
              <button className="btn btn-primary" onClick={mic.start}>🎤 Empezar a hablar</button>
            )
          ) : (
            <>
              <SttWarning />
              <SelfRecorder />
              <button className="btn btn-secondary" onClick={() => setPhase('done')}>Terminar</button>
            </>
          )}
          {mic.error && <p className="text-sm text-red-600">{mic.error}</p>}
          {mic.text && <p className="rounded-xl bg-slate-100 p-3 text-left italic dark:bg-slate-800" lang="it">“{mic.text}”</p>}
        </div>
      )}
      {phase === 'done' && (
        <div className="space-y-4">
          <div className="card">
            <p className="font-extrabold">Tu transcripción · {fmt(elapsed)} · {mic.text.split(/\s+/).filter(Boolean).length} palabras</p>
            <p className="mt-1 italic" lang="it">“{mic.text || '(sin transcripción)'}”</p>
            {elapsed < 90 && sttSupported && <p className="mt-1 text-sm text-amber-600">⚠️ Hablaste menos de 1:30. En el examen intenta llegar a 1,5–2 minutos.</p>}
          </div>
          <div className="card"><p className="mb-2 font-extrabold">Lista de verificación</p><Checklist text={mic.text} /></div>
          <div className="card">
            <div className="mb-1 flex items-center gap-2"><p className="font-extrabold text-green-700 dark:text-green-400">Monólogo modelo</p><ListenButton text={topic.sample} size="sm" /></div>
            <p lang="it">{topic.sample}</p>
          </div>
          <div className="card"><SelfRubric onScore={onDone} /></div>
        </div>
      )}
    </div>
  );
}
