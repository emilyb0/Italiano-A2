// Carga de contenido. Todos los JSON de src/content se incluyen en el build (funciona sin conexión).
// Para agregar contenido basta con crear un archivo nuevo en la carpeta correspondiente.
import type {
  Exam,
  Exercise,
  GrammarNote,
  ListeningItem,
  MinimalPair,
  MonologueTopic,
  OralQuestion,
  ReadingText,
  Unit,
  VocabItem,
  WritingTask,
} from '../types';

type Glob<T> = Record<string, T>;
const values = <T,>(g: Glob<{ default: T }>) =>
  Object.keys(g)
    .sort()
    .map((k) => g[k].default);

const vocabFiles = import.meta.glob<{ default: VocabItem[] }>('../content/vocab/*.json', { eager: true });
const unitFiles = import.meta.glob<{ default: Unit }>('../content/lessons/*.json', { eager: true });
const examFiles = import.meta.glob<{ default: Exam }>('../content/exams/*.json', { eager: true });
const readingFiles = import.meta.glob<{ default: ReadingText[] }>('../content/reading/*.json', { eager: true });
const listeningFiles = import.meta.glob<{ default: ListeningItem[] }>('../content/listening/*.json', { eager: true });
const grammarFiles = import.meta.glob<{ default: GrammarNote[] }>('../content/grammar/*.json', { eager: true });
const writingFiles = import.meta.glob<{ default: WritingTask[] }>('../content/writing/*.json', { eager: true });
const oralFiles = import.meta.glob<{ default: { questions: OralQuestion[]; monologues: MonologueTopic[] } }>(
  '../content/oral/*.json',
  { eager: true },
);
const pairFiles = import.meta.glob<{ default: MinimalPair[] }>('../content/pairs/*.json', { eager: true });
const diagFiles = import.meta.glob<{ default: Exercise[] }>('../content/diagnostic/*.json', { eager: true });

export const VOCAB: VocabItem[] = values(vocabFiles).flat();
export const UNITS: Unit[] = values(unitFiles).sort((a, b) => a.order - b.order);
export const LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })));
export const EXAMS: Exam[] = values(examFiles);
export const READING: ReadingText[] = values(readingFiles).flat();
export const LISTENING: ListeningItem[] = values(listeningFiles).flat();
export const GRAMMAR: GrammarNote[] = values(grammarFiles).flat();
export const WRITING: WritingTask[] = values(writingFiles).flat();
export const ORAL_QUESTIONS: OralQuestion[] = values(oralFiles).flatMap((o) => o.questions);
export const MONOLOGUES: MonologueTopic[] = values(oralFiles).flatMap((o) => o.monologues);
export const PAIRS: MinimalPair[] = values(pairFiles).flat();
export const DIAGNOSTIC: Exercise[] = values(diagFiles).flat();

export const vocabById = new Map(VOCAB.map((v) => [v.id, v]));
export const grammarById = new Map(GRAMMAR.map((g) => [g.id, g]));
export const lessonById = new Map(LESSONS.map((l) => [l.id, l]));

export const VOCAB_TOPICS: { id: string; label: string; emoji: string }[] = [
  { id: 'presentarsi', label: 'Presentarse', emoji: '👋' },
  { id: 'numeri', label: 'Números, horas y fechas', emoji: '🔢' },
  { id: 'famiglia', label: 'Familia', emoji: '👨‍👩‍👧' },
  { id: 'casa', label: 'Casa', emoji: '🏠' },
  { id: 'citta', label: 'Ciudad y direcciones', emoji: '🗺️' },
  { id: 'trasporti', label: 'Transporte', emoji: '🚆' },
  { id: 'acquisti', label: 'Compras y ropa', emoji: '🛍️' },
  { id: 'cibo', label: 'Comida y restaurante', emoji: '🍝' },
  { id: 'salute', label: 'Salud y cuerpo', emoji: '🩺' },
  { id: 'lavoro', label: 'Trabajo y estudio', emoji: '💼' },
  { id: 'tempo-libero', label: 'Tiempo libre y gustos', emoji: '⚽' },
  { id: 'clima', label: 'Clima y estaciones', emoji: '🌦️' },
  { id: 'viaggi', label: 'Vacaciones y viajes', emoji: '✈️' },
  { id: 'servizi', label: 'Servicios (banco, correo…)', emoji: '🏦' },
  { id: 'routine', label: 'Rutina diaria', emoji: '⏰' },
  { id: 'connettivi', label: 'Conectores y tiempo', emoji: '🔗' },
  { id: 'chunks', label: 'Frases útiles para el oral', emoji: '💬' },
  { id: 'falsi-amici', label: 'Falsos amigos', emoji: '⚠️' },
];

export const topicLabel = (id: string) => VOCAB_TOPICS.find((t) => t.id === id)?.label ?? id;

/** Contenido de una tarjeta SRS a partir de su id. */
export interface CardContent {
  kind: 'vocab' | 'rule' | 'error';
  front: string;
  frontLang: 'es' | 'it';
  answers: string[];
  display: string;
  hint?: string;
  example?: string;
  exampleEs?: string;
  explain?: string;
}

export function vocabCardId(v: VocabItem) {
  return 'v:' + v.id;
}

export function grammarCardIds(g: GrammarNote): string[] {
  return (g.drills ?? []).map((_, i) => `g:${g.id}:${i}`);
}

export function cardContent(id: string, errors: { id: string; prompt: string; expected: string; explain?: string }[]): CardContent | null {
  if (id.startsWith('v:')) {
    const v = vocabById.get(id.slice(2));
    if (!v) return null;
    const answers = v.it.split('|').map((s) => s.trim());
    return { kind: 'vocab', front: v.es, frontLang: 'es', answers, display: answers[0], example: v.ex, exampleEs: v.exEs, explain: v.note };
  }
  if (id.startsWith('g:')) {
    const [, gid, idx] = id.split(':');
    const g = grammarById.get(gid);
    const d = g?.drills?.[Number(idx)];
    if (!g || !d) return null;
    const answers = d.a.split('|').map((s) => s.trim());
    return { kind: 'rule', front: d.q, frontLang: 'it', answers, display: answers[0], hint: d.hint, explain: g.title };
  }
  if (id.startsWith('err:')) {
    const e = errors.find((x) => x.id === id.slice(4));
    if (!e) return null;
    const answers = e.expected.split('|').map((s) => s.trim());
    return { kind: 'error', front: e.prompt, frontLang: 'es', answers, display: answers[0], explain: e.explain };
  }
  return null;
}
