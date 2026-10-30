import { describe, expect, it } from 'vitest';
import { buildQueue, isDue, isMastered, newCard, review, RELEARN_MS, MIN_EASE } from '../lib/srs';
import { startOfDay, addDays } from '../lib/dates';

const NOW = new Date('2026-11-01T10:00:00').getTime();

describe('SRS (SM-2 adaptado)', () => {
  it('una tarjeta nueva está pendiente de inmediato', () => {
    const c = newCard('a', NOW);
    expect(isDue(c, NOW)).toBe(true);
    expect(c.ease).toBe(2.5);
  });

  it('acierto: intervalos 1 → 3 → intervalo × facilidad', () => {
    let c = newCard('a', NOW);
    c = review(c, 'good', NOW);
    expect(c.interval).toBe(1);
    expect(c.due).toBe(startOfDay(addDays(NOW, 1)));
    c = review(c, 'good', c.due);
    expect(c.interval).toBe(3);
    const ease = c.ease;
    c = review(c, 'good', c.due);
    expect(c.interval).toBe(Math.round(3 * ease));
    expect(c.reps).toBe(3);
  });

  it('la facilidad sube con "easy" y baja con "hard"', () => {
    const c = newCard('a', NOW);
    expect(review(c, 'easy', NOW).ease).toBeGreaterThan(2.5);
    expect(review(c, 'hard', NOW).ease).toBeLessThan(2.5);
    expect(review(c, 'good', NOW).ease).toBe(2.5);
  });

  it('un fallo reinicia, cuenta el lapso y vuelve en 10 minutos', () => {
    let c = newCard('a', NOW);
    c = review(c, 'good', NOW);
    c = review(c, 'good', c.due);
    const t = c.due;
    c = review(c, 'again', t);
    expect(c.reps).toBe(0);
    expect(c.interval).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.due).toBe(t + RELEARN_MS);
    expect(isDue(c, t + 5 * 60_000)).toBe(false);
    expect(isDue(c, t + RELEARN_MS)).toBe(true);
  });

  it('la facilidad nunca baja de 1.3', () => {
    let c = newCard('a', NOW);
    for (let i = 0; i < 20; i++) c = review(c, 'again', NOW);
    expect(c.ease).toBe(MIN_EASE);
  });

  it('el intervalo siempre crece con aciertos sucesivos', () => {
    let c = newCard('a', NOW);
    let prev = 0;
    for (let i = 0; i < 6; i++) {
      c = review(c, 'hard', c.due);
      expect(c.interval).toBeGreaterThan(prev);
      prev = c.interval;
    }
  });

  it('dominada tras varias revisiones espaciadas', () => {
    let c = newCard('a', NOW);
    for (let i = 0; i < 3; i++) c = review(c, 'good', c.due);
    expect(isMastered(c)).toBe(true);
  });

  it('cola: pendientes primero (más atrasadas antes) y nuevas hasta el límite', () => {
    const cards = {
      x: { ...newCard('x', NOW), due: NOW - 1000 },
      y: { ...newCard('y', NOW), due: NOW - 5000 },
      z: { ...newCard('z', NOW), due: NOW + 99999 },
    };
    const q = buildQueue(cards, ['x', 'n1', 'n2', 'n3'], 2, NOW);
    expect(q.due).toEqual(['y', 'x']);
    expect(q.fresh).toEqual(['n1', 'n2']);
  });
});
