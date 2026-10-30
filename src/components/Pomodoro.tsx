import { useEffect, useRef, useState } from 'react';

const WORK = 25 * 60;
const BREAK = 5 * 60;

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* sin audio */
  }
}

function notify(text: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Italiano A2', { body: text });
  } catch {
    /* sin notificaciones */
  }
}

/** Temporizador Pomodoro (25 min de trabajo, 5 de descanso). Se mantiene al cambiar de página. */
export function Pomodoro() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [left, setLeft] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [cycles, setCycles] = useState(0);
  const endAt = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        beep();
        if (mode === 'work') {
          setCycles((c) => c + 1);
          setMode('break');
          setLeft(BREAK);
          endAt.current = Date.now() + BREAK * 1000;
          setBanner('🍅 ¡Pomodoro completado! Descansa 5 minutos: levántate, toma agua, mira lejos.');
          notify('¡Descanso de 5 minutos!');
        } else {
          setMode('work');
          setLeft(WORK);
          setRunning(false);
          setBanner('💪 Fin del descanso. Pulsa el tomate para empezar otro bloque de 25 minutos.');
          notify('Fin del descanso, ¡a estudiar!');
        }
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <>
      <div className="flex items-center gap-1">
        <button
          title={running ? 'Pausar' : 'Iniciar Pomodoro'}
          onClick={() => {
            if (!running && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
            setRunning(!running);
          }}
          className={`rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${mode === 'break' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200' : running ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          {mode === 'break' ? '☕' : '🍅'} {mm}:{ss} {running ? '⏸' : '▶'}
        </button>
        {cycles > 0 && <span className="hidden text-xs text-slate-500 sm:inline">×{cycles}</span>}
      </div>
      {banner && (
        <div className="fixed inset-x-0 top-16 z-40 mx-auto w-[min(92vw,32rem)] animate-pop rounded-2xl bg-slate-900 p-4 text-white shadow-xl dark:bg-slate-100 dark:text-slate-900">
          <p>{banner}</p>
          <button className="mt-2 text-sm font-bold underline" onClick={() => setBanner(null)}>Cerrar</button>
        </div>
      )}
    </>
  );
}
