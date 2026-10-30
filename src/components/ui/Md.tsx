import { Fragment, type ReactNode } from 'react';

/** Markdown mínimo: **negrita**, *cursiva*, `código`, listas con "- " y párrafos. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++} className="text-green-700 dark:text-green-400">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++} className="rounded bg-slate-100 px-1 dark:bg-slate-800">{t.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => l.includes('|') && l.trim().startsWith('|'))) {
          const rows = lines.filter((l) => !/^\|\s*-/.test(l.trim()));
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((r, j) => (
                    <tr key={j} className={j === 0 ? 'font-bold' : 'border-t border-slate-200 dark:border-slate-700'}>
                      {r.trim().slice(1, -1).split('|').map((c, ci) => (
                        <td key={ci} className="px-2 py-1">{inline(c.trim())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
