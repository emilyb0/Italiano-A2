// Estadísticas y predicción de preparación para el examen.
import type { Section } from '../types';
import type { ProgressData } from '../store/progress';
import { isMastered } from './srs';
import { LESSONS, VOCAB } from './content';

export const SECTIONS: Section[] = ['ascolto', 'lettura', 'strutture', 'scritta', 'orale'];
export const PASS_MARK = 0.6;

export function sectionEstimate(data: ProgressData, s: Section): number | undefined {
  const t = data.sections[s];
  const practice = t && t.total >= 3 ? t.correct / t.total : undefined;
  const exams = data.exams.map((e) => e.scores[s]).filter((x): x is number => x !== undefined);
  const lastExams = exams.slice(-2);
  const exam = lastExams.length ? lastExams.reduce((a, b) => a + b, 0) / lastExams.length : undefined;
  const diag = data.diagnostic?.sections[s];
  if (exam !== undefined && practice !== undefined) return 0.65 * exam + 0.35 * practice;
  if (exam !== undefined) return exam;
  if (practice !== undefined && diag !== undefined) return 0.7 * practice + 0.3 * diag;
  return practice ?? diag;
}

export interface Readiness {
  score: number;
  perSection: Partial<Record<Section, number>>;
  coverage: number;
  label: string;
  advice: string;
}

export function readiness(data: ProgressData): Readiness {
  const perSection: Partial<Record<Section, number>> = {};
  for (const s of SECTIONS) {
    const v = sectionEstimate(data, s);
    if (v !== undefined) perSection[s] = v;
  }
  const vals = SECTIONS.map((s) => perSection[s] ?? 0.3);
  const skill = vals.reduce((a, b) => a + b, 0) / vals.length;
  const lessonsCov = Object.keys(data.lessons).length / Math.max(1, LESSONS.length);
  const vocabIds = VOCAB.map((v) => 'v:' + v.id);
  const learned = vocabIds.filter((id) => data.cards[id]?.reps).length / Math.max(1, vocabIds.length);
  const coverage = 0.5 * lessonsCov + 0.5 * learned;
  const score = Math.max(0, Math.min(1, 0.75 * skill + 0.25 * coverage));
  const weakest = SECTIONS.filter((s) => (perSection[s] ?? 0) < PASS_MARK);
  const label = score >= 0.75 ? 'Lista para aprobar' : score >= 0.6 ? 'Cerca: sigue así' : score >= 0.4 ? 'En camino' : 'Al comienzo';
  const advice = weakest.length
    ? `Prioriza: ${weakest.map((s) => s).join(', ')}. Cada sección debe superar el ${Math.round(PASS_MARK * 100)} %.`
    : 'Todas las secciones están por encima del umbral. Mantén el SRS y haz simulacros.';
  return { score, perSection, coverage, label, advice };
}

export function vocabStats(data: ProgressData) {
  const ids = VOCAB.map((v) => 'v:' + v.id);
  const cards = ids.map((id) => data.cards[id]).filter(Boolean);
  return {
    total: ids.length,
    seen: cards.filter((c) => c.reps > 0 || c.lapses > 0).length,
    mastered: cards.filter(isMastered).length,
  };
}

export function totalStudyMs(data: ProgressData): number {
  return Object.values(data.studyMsByDay).reduce((a, b) => a + b, 0);
}
