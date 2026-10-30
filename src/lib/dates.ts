// Utilidades de fechas en hora local.
export const DAY_MS = 86_400_000;

export function dayKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Días completos entre dos claves YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  const pa = new Date(a + 'T00:00:00').getTime();
  const pb = new Date(b + 'T00:00:00').getTime();
  return Math.round((pb - pa) / DAY_MS);
}

export function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
