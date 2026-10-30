import { useEffect, useState, type ReactNode } from 'react';
import { speak, stopSpeaking, ttsSupported } from '../../lib/speech';
import { useProgress } from '../../store/progress';

export function ProgressBar({ value, className = '', color = 'bg-green-500' }: { value: number; className?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Botones para escuchar un texto italiano a velocidad normal y lenta. */
export function ListenButton({ text, size = 'md', autoPlay = false }: { text: string; size?: 'sm' | 'md' | 'lg'; autoPlay?: boolean }) {
  const { rate, slowRate, voiceURI } = useProgress((s) => s.settings);
  const [playing, setPlaying] = useState<'n' | 's' | null>(null);
  const play = async (slow: boolean) => {
    setPlaying(slow ? 's' : 'n');
    await speak(text, { rate: slow ? slowRate : rate, voiceURI });
    setPlaying(null);
  };
  useEffect(() => {
    if (autoPlay) void play(false);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  if (!ttsSupported) return null;
  const cls =
    size === 'lg'
      ? 'h-14 w-14 text-2xl'
      : size === 'sm'
        ? 'h-7 w-7 text-sm'
        : 'h-10 w-10 text-lg';
  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle">
      <button
        type="button"
        aria-label="Escuchar"
        title="Escuchar"
        onClick={(e) => { e.stopPropagation(); void play(false); }}
        className={`${cls} inline-flex items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_3px_0_#0369a1] active:translate-y-[2px] active:shadow-none ${playing === 'n' ? 'animate-pulse' : ''}`}
      >
        🔊
      </button>
      <button
        type="button"
        aria-label="Escuchar lento"
        title="Escuchar lento"
        onClick={(e) => { e.stopPropagation(); void play(true); }}
        className={`${size === 'lg' ? 'h-11 w-11 text-xl' : size === 'sm' ? 'h-7 w-7 text-sm' : 'h-9 w-9 text-base'} inline-flex items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200 ${playing === 's' ? 'animate-pulse' : ''}`}
      >
        🐢
      </button>
    </span>
  );
}

/** Traducción oculta por defecto, se muestra a demanda. */
export function Translation({ text, label = 'Ver traducción' }: { text?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-1">
      {open ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" onClick={() => setOpen(false)}>
          🇪🇸 {text}
        </p>
      ) : (
        <button type="button" className="text-sm font-semibold text-amber-700 underline decoration-dotted dark:text-amber-400" onClick={() => setOpen(true)}>
          {label}
        </button>
      )}
    </div>
  );
}

/** Línea de texto italiano con botón de audio y traducción opcional. */
export function ItLine({ it, es, size = 'md', className = '' }: { it: string; es?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <ListenButton text={it} size={size === 'lg' ? 'md' : 'sm'} />
        <p className={size === 'lg' ? 'text-xl font-semibold' : size === 'sm' ? 'text-sm' : ''} lang="it">
          {it}
        </p>
      </div>
      {es && <Translation text={es} />}
    </div>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-md overflow-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const COLORS = ['#16a34a', '#dc2626', '#facc15', '#0ea5e9', '#a855f7', '#f97316'];

export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.6 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
    })),
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span key={i} className="confetti" style={{ left: `${p.left}vw`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </>
  );
}

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: string }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <div className="text-xl font-extrabold">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-slate-500 dark:text-slate-400">{children}</div>;
}
