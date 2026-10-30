import { useMemo, useState } from 'react';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Texto italiano con glosario a demanda: las palabras subrayadas muestran su traducción al tocarlas. */
export function GlossText({ text, glossary }: { text: string; glossary?: Record<string, string> }) {
  const [open, setOpen] = useState<string | null>(null);
  const parts = useMemo(() => {
    const keys = Object.keys(glossary ?? {}).sort((a, b) => b.length - a.length);
    if (!keys.length) return [text];
    const re = new RegExp(`(?<![\\p{L}])(${keys.map(esc).join('|')})(?![\\p{L}])`, 'giu');
    return text.split(re);
  }, [text, glossary]);
  const lookup = (w: string) => {
    if (!glossary) return undefined;
    const k = Object.keys(glossary).find((x) => x.toLowerCase() === w.toLowerCase());
    return k ? glossary[k] : undefined;
  };
  return (
    <div className="whitespace-pre-line text-lg leading-relaxed" lang="it">
      {parts.map((p, i) => {
        const tr = i % 2 === 1 ? lookup(p) : undefined;
        if (!tr) return <span key={i}>{p}</span>;
        const id = `${i}`;
        return (
          <span key={i} className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === id ? null : id)}
              className="underline decoration-amber-500 decoration-dotted decoration-2 underline-offset-4"
            >
              {p}
            </button>
            {open === id && (
              <span className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
                {tr}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
