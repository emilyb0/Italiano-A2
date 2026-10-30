// Plan automático de 14 días (2–3 h diarias), ajustado por la prueba diagnóstica y las estadísticas.
import type { Topic } from '../types';
import { TOPIC_LABEL } from '../types';
import type { ProgressData } from '../store/progress';
import { EXAMS, LESSONS, LISTENING, READING, WRITING, UNITS, topicLabel } from './content';
import { dayKey, daysBetween } from './dates';

export interface PlanBlock {
  id: string;
  icon: string;
  title: string;
  minutes: number;
  desc: string;
  to: string;
  /** enlaces a actividades concretas del bloque */
  items?: { label: string; to: string; done: boolean }[];
}

export interface DayPlan {
  day: number;
  phase: string;
  focus: string;
  blocks: PlanBlock[];
  totalMinutes: number;
}

export const PLAN_DAYS = 14;

/** Orden de lecciones del plan: unidades 1–11 en orden, con las "trampas" (unidad 12) intercaladas. */
export function planLessonOrder(): string[] {
  const byUnit = UNITS.map((u) => u.lessons.map((l) => l.id));
  const traps = UNITS.find((u) => u.id === 'u12')?.lessons.map((l) => l.id) ?? [];
  const main = UNITS.filter((u) => u.id !== 'u12');
  const insertAfter: Record<string, number> = { u02: 0, u03: 1, u04: 2, u07: 3, u09: 4 };
  const out: string[] = [];
  for (const u of main) {
    out.push(...u.lessons.map((l) => l.id));
    const t = insertAfter[u.id];
    if (t !== undefined && traps[t]) out.push(traps[t]);
  }
  traps.forEach((t) => !out.includes(t) && out.push(t));
  // Cualquier lección añadida en archivos nuevos va al final.
  byUnit.flat().forEach((id) => !out.includes(id) && out.push(id));
  return out;
}

const LESSONS_PER_DAY = [5, 7, 7, 7, 7, 7, 7, 7, 6];

export function lessonsForDay(day: number): string[] {
  if (day < 1 || day > 9) return [];
  const order = planLessonOrder();
  let start = 0;
  for (let d = 1; d < day; d++) start += LESSONS_PER_DAY[d - 1];
  const extra = day === 9 ? order.length : start + LESSONS_PER_DAY[day - 1];
  return order.slice(start, extra);
}

const DAY_VOCAB: Record<number, string[]> = {
  1: ['presentarsi', 'numeri'],
  2: ['famiglia', 'lavoro'],
  3: ['tempo-libero', 'cibo'],
  4: ['citta', 'trasporti'],
  5: ['routine', 'casa'],
  6: ['viaggi', 'connettivi'],
  7: ['clima', 'salute'],
  8: ['acquisti', 'chunks'],
  9: ['servizi', 'falsi-amici'],
};

const FOCUS: Record<number, string> = {
  1: 'Diagnóstico · artículos, género y plural · presentarse',
  2: 'Presente regular · familia y trabajo',
  3: 'Verbos irregulares · tiempo libre y comida',
  4: 'Preposiciones · ciudad y transporte',
  5: 'Reflexivos y rutina · passato prossimo (inicio)',
  6: 'Passato prossimo · imperfetto · viajes',
  7: 'Pronombres y piacere · clima y salud',
  8: "Posesivos, c'è / ci / ne · compras",
  9: 'Futuro, condicional, imperativo, comparativos · servicios',
  10: 'Simulacro 1 + refuerzo de puntos débiles',
  11: 'Simulacro 2 + refuerzo de puntos débiles',
  12: 'Simulacro 3 + refuerzo de puntos débiles',
  13: 'Simulacro final (el de peor resultado)',
  14: 'Repaso de errores y práctica oral',
};

export function phaseOf(day: number): string {
  if (day <= 4) return 'Bases';
  if (day <= 9) return 'Pasado, pronombres y temas restantes';
  if (day <= 12) return 'Simulacros';
  return 'Recta final';
}

/** Día actual del plan (1..14) según la fecha de inicio. */
export function currentDay(startDate: string | null, today = dayKey()): number {
  if (!startDate) return 1;
  return Math.max(1, Math.min(PLAN_DAYS, daysBetween(startDate, today) + 1));
}

export function weakTopics(data: Pick<ProgressData, 'topics' | 'diagnostic'>, n = 3): Topic[] {
  const scores: [Topic, number][] = [];
  const all = new Set<Topic>([...(Object.keys(data.topics) as Topic[]), ...(Object.keys(data.diagnostic?.topics ?? {}) as Topic[])]);
  for (const t of all) {
    if (t === 'lessico') continue;
    const live = data.topics[t];
    const diag = data.diagnostic?.topics[t];
    let s: number | undefined;
    if (live && live.total >= 5) s = live.correct / live.total;
    if (diag !== undefined) s = s === undefined ? diag : 0.6 * s + 0.4 * diag;
    if (s !== undefined && s < 0.75) scores.push([t, s]);
  }
  return scores.sort((a, b) => a[1] - b[1]).slice(0, n).map(([t]) => t);
}

function slice<T>(arr: T[], day: number, perDay: number): T[] {
  return arr.slice((day - 1) * perDay, day * perDay);
}

export function buildDayPlan(day: number, data: ProgressData): DayPlan {
  const done = (id: string) => !!data.activities[id] || !!data.lessons[id];
  const blocks: PlanBlock[] = [];
  const weak = weakTopics(data);
  const diag = data.diagnostic;
  const weakSections = diag ? (Object.entries(diag.sections) as [string, number][]).filter(([, v]) => v < 0.6).map(([k]) => k) : [];
  const lessonTitle = (id: string) => LESSONS.find((l) => l.id === id)?.title ?? id;

  if (day === 1 && !diag) {
    blocks.push({ id: 'diag', icon: '🧭', title: 'Prueba diagnóstica', minutes: 15, desc: 'Prueba corta para ajustar tu plan según tu nivel real.', to: '/diagnostico' });
  }
  blocks.push({ id: 'srs', icon: '🔁', title: 'Repaso SRS', minutes: 20, desc: 'Siempre primero: tarjetas pendientes de hoy + palabras nuevas.', to: '/repaso' });

  if (day <= 9) {
    const ids = lessonsForDay(day);
    const basicsStrong = diag && day <= 4 && ['articoli', 'presente', 'preposizioni'].every((t) => (diag.topics[t as Topic] ?? 0) >= 0.85);
    blocks.push({
      id: 'grammar',
      icon: '📘',
      title: 'Gramática nueva con práctica',
      minutes: basicsStrong ? 30 : 40,
      desc: basicsStrong ? 'Tu diagnóstico en las bases es muy bueno: haz las lecciones a ritmo rápido.' : `${ids.length} lecciones cortas (5–8 min) que se encadenan.`,
      to: ids.find((i) => !data.lessons[i]) ? `/leccion/${ids.find((i) => !data.lessons[i])}` : '/mapa',
      items: ids.map((id) => ({ label: lessonTitle(id), to: `/leccion/${id}`, done: !!data.lessons[id] })),
    });
    const refuerzo = weak.length ? weak[(day - 1) % weak.length] : undefined;
    blocks.push({
      id: 'vocab',
      icon: '🗂️',
      title: 'Vocabulario temático',
      minutes: refuerzo ? 20 : 30,
      desc: 'Aprende las palabras y frases del tema; pasan al SRS.',
      to: `/vocabulario/${DAY_VOCAB[day][0]}`,
      items: DAY_VOCAB[day].map((t) => ({ label: topicLabel(t), to: `/vocabulario/${t}`, done: !!data.activities['vocab:' + t] })),
    });
    if (refuerzo)
      blocks.push({ id: 'weak', icon: '🎯', title: `Refuerzo: ${TOPIC_LABEL[refuerzo]}`, minutes: 15, desc: 'Según tu diagnóstico y tus errores, este tema necesita práctica extra.', to: `/practica?tema=${refuerzo}` });
    const listen = slice(LISTENING, day, 3);
    blocks.push({
      id: 'listen',
      icon: '🎧',
      title: 'Escucha y shadowing',
      minutes: weakSections.includes('ascolto') ? 40 : 30,
      desc: 'Escucha los audios tipo examen y repite frases imitando la entonación. Termina con 5 min de pares mínimos.',
      to: listen[0] ? `/escucha/${listen[0].id}` : '/escucha',
      items: [
        ...listen.map((l) => ({ label: l.title, to: `/escucha/${l.id}`, done: done(l.id) })),
        { label: 'Shadowing', to: '/shadowing', done: false },
        { label: 'Pares mínimos', to: '/pares', done: false },
      ],
    });
    const read = slice(READING, day, 3);
    blocks.push({
      id: 'read',
      icon: '📖',
      title: 'Lectura',
      minutes: 20,
      desc: 'Textos tipo examen con glosario a demanda.',
      to: read[0] ? `/lectura/${read[0].id}` : '/lectura',
      items: read.map((r) => ({ label: r.title, to: `/lectura/${r.id}`, done: done(r.id) })),
    });
    if (day % 2 === 1) {
      const w = slice(WRITING, Math.ceil(day / 2), 2);
      blocks.push({
        id: 'write',
        icon: '✍️',
        title: 'Escritura',
        minutes: 20,
        desc: 'Una descripción (40–60 palabras) y un mensaje (15–30 palabras).',
        to: w[0] ? `/escritura/${w[0].id}` : '/escritura',
        items: w.map((x) => ({ label: x.title, to: `/escritura/${x.id}`, done: done(x.id) })),
      });
    } else {
      blocks.push({ id: 'oral', icon: '🗣️', title: 'Oral', minutes: 20, desc: 'Role play con el examinador virtual y un monólogo cronometrado.', to: '/oral' });
    }
    blocks.push({ id: 'errors', icon: '📕', title: 'Cuaderno de errores', minutes: 10, desc: 'Repasa los fallos de hoy antes de terminar.', to: '/errores' });
  } else if (day <= 13) {
    let exam = EXAMS[day - 10];
    if (day === 13) {
      const worst = [...EXAMS].sort((a, b) => examScore(data, a.id) - examScore(data, b.id))[0];
      exam = worst;
    }
    if (exam)
      blocks.push({ id: 'exam', icon: '⏱️', title: `Simulacro: ${exam.title}`, minutes: 160, desc: 'Las 5 partes con los tiempos reales: ascolto 30′, lettura 40′, strutture 40′, scritta 40′, orale 10′. Puedes hacer una pausa entre partes.', to: `/simulacro/${exam.id}` });
    if (weak.length)
      blocks.push({ id: 'weak', icon: '🎯', title: `Refuerzo: ${weak.map((t) => TOPIC_LABEL[t]).join(', ')}`, minutes: 15, desc: 'Práctica de tus temas más débiles.', to: `/practica?tema=${weak[0]}` });
    blocks.push({ id: 'errors', icon: '📕', title: 'Cuaderno de errores', minutes: 10, desc: 'Revisa los errores del simulacro.', to: '/errores' });
  } else {
    blocks.push({ id: 'errors', icon: '📕', title: 'Cuaderno de errores (todo)', minutes: 30, desc: 'Repasa todos los errores pendientes.', to: '/errores' });
    blocks.push({ id: 'oral', icon: '🗣️', title: 'Simulador oral completo', minutes: 40, desc: 'Role play + monólogo, dos veces con temas distintos.', to: '/oral' });
    blocks.push({ id: 'listen', icon: '🎧', title: 'Escucha y shadowing', minutes: 30, desc: 'Audios que aún no hiciste y shadowing.', to: '/escucha' });
    blocks.push({ id: 'read', icon: '📖', title: 'Lectura', minutes: 20, desc: 'Lecturas pendientes.', to: '/lectura' });
    blocks.push({ id: 'mix', icon: '🔀', title: 'Práctica mixta', minutes: 30, desc: 'Ejercicios intercalados de todos los temas, más peso a los débiles.', to: '/practica' });
  }
  return {
    day,
    phase: phaseOf(day),
    focus: FOCUS[day],
    blocks,
    totalMinutes: blocks.reduce((s, b) => s + b.minutes, 0),
  };
}

export function examScore(data: Pick<ProgressData, 'exams'>, examId: string): number {
  const r = data.exams.filter((e) => e.examId === examId).at(-1);
  if (!r) return -1;
  const v = Object.values(r.scores);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : -1;
}
