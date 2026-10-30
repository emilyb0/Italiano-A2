// Comparador tolerante de respuestas (escritas o transcritas por voz).
// Normaliza mayúsculas, puntuación, apóstrofos y acentos, alinea palabra por palabra
// y devuelve qué palabras están bien, casi bien (tipeo), faltan o sobran.

export type WordStatus = 'ok' | 'close' | 'missing' | 'extra';

export interface WordResult {
  word: string;
  status: WordStatus;
}

export interface CompareResult {
  ok: boolean;
  /** coincide exactamente (incluidos acentos) */
  exact: boolean;
  /** solo difiere en acentos */
  accentOnly: boolean;
  /** aceptada pero con errores de tipeo */
  typo: boolean;
  score: number;
  words: WordResult[];
  expected: string;
}

export type CompareMode = 'text' | 'speech';

interface Token {
  raw: string;
  acc: string;
  norm: string;
}

const PUNCT = /[.,;:!?¡¿"«»“”()[\]{}\-–—…/\\*_]+/g;

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const UNITS = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
const TENS = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

/** Convierte 0–9999 a palabras italianas (el reconocimiento de voz a veces devuelve dígitos). */
export function numberToItalian(n: number): string {
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const u = n % 10;
    if (u === 0) return t;
    const base = u === 1 || u === 8 ? t.slice(0, -1) : t;
    return base + (u === 3 ? 'tré' : UNITS[u]);
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const hs = h === 1 ? 'cento' : UNITS[h] + 'cento';
    return hs + (rest ? numberToItalian(rest) : '');
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    const ts = th === 1 ? 'mille' : UNITS[th] + 'mila';
    return ts + (rest ? numberToItalian(rest) : '');
  }
  return String(n);
}

export function tokenize(s: string, convertNumbers = false): Token[] {
  const cleaned = s
    .replace(/[’‘`´]/g, "'")
    .replace(PUNCT, ' ')
    .replace(/'/g, "' ")
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  return cleaned.split(' ').filter(Boolean).flatMap((raw) => {
    if (convertNumbers && /^\d+$/.test(raw)) {
      const w = numberToItalian(parseInt(raw, 10));
      return [{ raw, acc: w, norm: stripAccents(w) }];
    }
    const acc = raw.toLowerCase();
    return [{ raw, acc, norm: stripAccents(acc) }];
  });
}

export function normalize(s: string): string {
  return tokenize(s).map((t) => t.norm).join(' ');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Palabras en las que el acento cambia el significado (è/e, là/la, sì/si…). */
export const ACCENT_MATTERS = new Set(['è', 'e', 'là', 'la', 'lì', 'li', 'sì', 'si', 'dà', 'da', 'né', 'ne', 'tè', 'te']);

export function accentMismatchMatters(expectedAcc: string, givenAcc: string): boolean {
  return expectedAcc !== givenAcc && ACCENT_MATTERS.has(expectedAcc) && ACCENT_MATTERS.has(givenAcc);
}

function similarity(e: Token, g: Token, mode: CompareMode): 0 | 1 | 2 {
  if (e.norm === g.norm) return mode === 'text' && accentMismatchMatters(e.acc, g.acc) ? 0 : 2;
  const len = e.norm.length;
  const d = levenshtein(e.norm, g.norm);
  if (mode === 'text' && len >= 4 && d <= 1) return 1;
  if (mode === 'speech' && ((len >= 3 && d <= 1) || (len >= 7 && d <= 2))) return 1;
  return 0;
}

export function compare(expected: string, given: string, mode: CompareMode = 'text'): CompareResult {
  const E = tokenize(expected, false);
  const G = tokenize(given, mode === 'speech');
  if (mode === 'speech') E.forEach((t) => { if (/^\d+$/.test(t.raw)) { t.acc = numberToItalian(+t.raw); t.norm = stripAccents(t.acc); } });

  // Alineación por programación dinámica (LCS ponderada).
  const n = E.length;
  const m = G.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const s = similarity(E[i], G[j], mode);
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], s ? s + dp[i + 1][j + 1] : 0);
    }
  }
  const words: WordResult[] = [];
  let i = 0;
  let j = 0;
  let okCount = 0;
  let closeCount = 0;
  let extra = 0;
  let accentDiff = false;
  while (i < n || j < m) {
    if (i < n && j < m) {
      const s = similarity(E[i], G[j], mode);
      if (s && dp[i][j] === s + dp[i + 1][j + 1]) {
        if (s === 2) {
          okCount++;
          if (E[i].acc !== G[j].acc) accentDiff = true;
          words.push({ word: E[i].raw, status: 'ok' });
        } else {
          closeCount++;
          words.push({ word: E[i].raw, status: 'close' });
        }
        i++;
        j++;
        continue;
      }
      if (dp[i + 1][j] >= dp[i][j + 1]) {
        words.push({ word: E[i].raw, status: 'missing' });
        i++;
      } else {
        words.push({ word: G[j].raw, status: 'extra' });
        extra++;
        j++;
      }
    } else if (i < n) {
      words.push({ word: E[i].raw, status: 'missing' });
      i++;
    } else {
      words.push({ word: G[j].raw, status: 'extra' });
      extra++;
      j++;
    }
  }
  const missing = n - okCount - closeCount;
  const denom = Math.max(n, 1);
  let score = (okCount + 0.5 * closeCount) / denom;
  if (mode === 'text') score = Math.max(0, score - (extra * 0.5) / denom);

  let ok: boolean;
  if (mode === 'text') ok = n > 0 && missing === 0 && extra === 0;
  else ok = n > 0 && (okCount + closeCount) / denom >= 0.8;

  const exact = ok && closeCount === 0 && !accentDiff && missing === 0 && extra === 0;
  return {
    ok,
    exact,
    accentOnly: ok && closeCount === 0 && accentDiff,
    typo: ok && closeCount > 0,
    score: Math.round(score * 100) / 100,
    words,
    expected,
  };
}

/** Compara contra varias respuestas aceptadas y devuelve el mejor resultado. */
export function compareBest(accepted: string[], given: string, mode: CompareMode = 'text'): CompareResult {
  let best: CompareResult | null = null;
  for (const a of accepted) {
    const r = compare(a, given, mode);
    if (!best || rank(r) > rank(best)) best = r;
    if (r.exact) break;
  }
  return best ?? compare('', given, mode);
}

function rank(r: CompareResult): number {
  return (r.exact ? 4 : 0) + (r.ok ? 2 : 0) + r.score;
}

/** Divide "a|b|c" en alternativas aceptadas. */
export function splitAlts(s: string): string[] {
  return s.split('|').map((x) => x.trim()).filter(Boolean);
}
