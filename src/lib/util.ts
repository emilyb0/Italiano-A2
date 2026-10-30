export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export function pct(x: number | undefined): string {
  return x === undefined || Number.isNaN(x) ? '—' : `${Math.round(x * 100)} %`;
}

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
}
