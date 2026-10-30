// Repetición espaciada: variante de SM-2 adaptada a un curso intensivo de 14 días.
// - Un fallo devuelve la tarjeta a la cola en 10 minutos (re-aprendizaje en la misma sesión).
// - Primeros intervalos cortos (1 y 3 días) para que haya varias revisiones antes del examen.
// - La fecha de revisión se fija al inicio del día, así las tarjetas aparecen "pendientes" desde la mañana.
import { addDays, startOfDay } from './dates';

export interface CardState {
  id: string;
  ease: number;
  /** intervalo en días (0 = en aprendizaje) */
  interval: number;
  reps: number;
  lapses: number;
  due: number;
  last?: number;
  created: number;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const GRADE_Q: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export const MIN_EASE = 1.3;
export const RELEARN_MS = 10 * 60 * 1000;
export const MAX_INTERVAL = 60;

export function newCard(id: string, now: number = Date.now()): CardState {
  return { id, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, created: now };
}

export function nextEase(ease: number, q: number): number {
  const e = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.max(MIN_EASE, Math.round(e * 100) / 100);
}

export function review(card: CardState, grade: Grade, now: number = Date.now()): CardState {
  const q = GRADE_Q[grade];
  if (q < 3) {
    return {
      ...card,
      reps: 0,
      lapses: card.lapses + 1,
      interval: 0,
      ease: Math.max(MIN_EASE, Math.round((card.ease - 0.2) * 100) / 100),
      due: now + RELEARN_MS,
      last: now,
    };
  }
  const reps = card.reps + 1;
  let interval: number;
  if (reps === 1) interval = grade === 'easy' ? 2 : 1;
  else if (reps === 2) interval = grade === 'hard' ? 2 : grade === 'easy' ? 4 : 3;
  else {
    const factor = grade === 'hard' ? 0.8 : grade === 'easy' ? 1.3 : 1;
    interval = Math.max(card.interval + 1, Math.round(card.interval * card.ease * factor));
  }
  interval = Math.min(MAX_INTERVAL, interval);
  return {
    ...card,
    reps,
    interval,
    ease: nextEase(card.ease, q),
    due: startOfDay(addDays(now, interval)),
    last: now,
  };
}

export function isDue(card: CardState, now: number = Date.now()): boolean {
  return card.due <= now;
}

/** Una tarjeta se considera "dominada" cuando ya superó varias revisiones espaciadas. */
export function isMastered(card: CardState): boolean {
  return card.reps >= 3 && card.interval >= 7;
}

/**
 * Cola de repaso: primero las pendientes (las más atrasadas primero, las que fallaste
 * recientemente al final), después tarjetas nuevas hasta el límite diario.
 */
export function buildQueue(
  cards: Record<string, CardState>,
  candidateNewIds: string[],
  newLimit: number,
  now: number = Date.now(),
): { due: string[]; fresh: string[] } {
  const due = Object.values(cards)
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.due - b.due)
    .map((c) => c.id);
  const fresh = candidateNewIds.filter((id) => !cards[id]).slice(0, Math.max(0, newLimit));
  return { due, fresh };
}
