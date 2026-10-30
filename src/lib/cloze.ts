// Sintaxis de huecos: [[respuesta|alternativa]] = respuesta libre; [[correcta/opción2/opción3]] = opción múltiple.
import { accentMismatchMatters, normalize } from './compare';

export type ClozePart = { kind: 'text'; text: string } | { kind: 'blank'; index: number; answers: string[]; options?: string[] };

export function parseCloze(text: string): ClozePart[] {
  const parts: ClozePart[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let last = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) });
    const inner = m[1];
    if (inner.includes('/')) {
      const options = inner.split('/').map((s) => s.trim());
      parts.push({ kind: 'blank', index: idx++, answers: [options[0]], options });
    } else {
      parts.push({ kind: 'blank', index: idx++, answers: inner.split('|').map((s) => s.trim()) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

export function blanks(parts: ClozePart[]) {
  return parts.filter((p): p is Extract<ClozePart, { kind: 'blank' }> => p.kind === 'blank');
}

/** Corrige un hueco (ignora mayúsculas, espacios y acentos, salvo cuando cambian el significado: è/e). */
export function checkBlank(answers: string[], given: string): boolean {
  const g = normalize(given);
  const gAcc = given.trim().toLowerCase();
  return g.length > 0 && answers.some((a) => normalize(a) === g && !accentMismatchMatters(a.trim().toLowerCase(), gAcc));
}

/** Texto con los huecos rellenados con la primera respuesta (para escuchar el texto completo). */
export function clozeFull(text: string): string {
  return parseCloze(text)
    .map((p) => (p.kind === 'text' ? p.text : p.answers[0]))
    .join('');
}
