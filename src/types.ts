// Tipos compartidos de contenido y progreso.

export type Section = 'ascolto' | 'lettura' | 'strutture' | 'scritta' | 'orale';

export const SECTION_LABEL: Record<Section, string> = {
  ascolto: 'Ascolto (escucha)',
  lettura: 'Lettura (lectura)',
  strutture: 'Strutture (gramática)',
  scritta: 'Produzione scritta',
  orale: 'Produzione orale',
};

/** Temas gramaticales y de vocabulario usados para estadísticas y puntos débiles. */
export type Topic =
  | 'articoli'
  | 'presente'
  | 'irregolari'
  | 'preposizioni'
  | 'riflessivi'
  | 'passato'
  | 'imperfetto'
  | 'pronomi'
  | 'possessivi'
  | 'ci-ne'
  | 'futuro'
  | 'comparativi'
  | 'trappole'
  | 'lessico';

export const TOPIC_LABEL: Record<Topic, string> = {
  articoli: 'Artículos, género y plural',
  presente: 'Presente regular',
  irregolari: 'Verbos irregulares',
  preposizioni: 'Preposiciones',
  riflessivi: 'Reflexivos y rutina',
  passato: 'Passato prossimo',
  imperfetto: 'Imperfetto',
  pronomi: 'Pronombres y piacere',
  possessivi: 'Posesivos',
  'ci-ne': "C'è / ci sono, ci, ne",
  futuro: 'Futuro, condicional, imperativo',
  comparativi: 'Comparativos y adverbios',
  trappole: 'Trampas para hispanohablantes',
  lessico: 'Vocabulario',
};

export interface VocabItem {
  id: string;
  it: string;
  es: string;
  topic: string;
  kind?: 'word' | 'chunk';
  ex?: string;
  exEs?: string;
  note?: string;
}

interface ExerciseBase {
  topic?: Topic;
  /** sección del examen que entrena (si no se indica, se deduce del tipo) */
  section?: Section;
  explain?: string;
}

export type Exercise = ExerciseBase &
  (
    | { type: 'translate'; es: string; it: string; alts?: string[]; tiles?: boolean; extra?: string[] }
    | { type: 'order'; it: string; es: string; extra?: string[] }
    | { type: 'dictation'; it: string; es: string; alts?: string[] }
    | { type: 'listen-choose'; audio: string; question: string; options: string[]; answer: number; es?: string }
    | { type: 'choice'; question: string; options: string[]; answer: number; es?: string }
    | { type: 'cloze'; text: string; es?: string; instruction?: string }
    | { type: 'match'; pairs: [string, string][]; instruction?: string }
    | { type: 'speak'; it: string; es: string }
    | { type: 'answer-oral'; question: string; sample: string; es: string; checks?: string[] }
    | { type: 'minimal-pair'; words: [string, string]; target: 0 | 1; es?: [string, string] }
    | { type: 'teach'; title: string; body: string; examples?: [string, string][] }
  );

export type ExerciseType = Exercise['type'];

export interface Lesson {
  id: string;
  title: string;
  grammar?: string;
  vocabTopics?: string[];
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  description: string;
  emoji: string;
  lessons: Lesson[];
}

export interface GrammarNote {
  id: string;
  topic: Topic;
  title: string;
  body: string;
  examples: [string, string][];
  /** Tarjetas de regla para el SRS: q en italiano con hueco, a respuesta(s) separadas por | */
  drills?: { q: string; a: string; hint?: string }[];
}

export interface Question {
  type: 'choice' | 'vf';
  q: string;
  options?: string[];
  /** índice de la opción correcta, o true/false para vf */
  answer: number | boolean;
  explain?: string;
}

export interface MatchTask {
  instruction: string;
  left: string[];
  right: string[];
  /** answer[i] = índice en right que corresponde a left[i] */
  answer: number[];
}

export interface ReadingText {
  id: string;
  title: string;
  genre: string;
  text: string;
  es: string;
  glossary?: Record<string, string>;
  questions?: Question[];
  match?: MatchTask;
}

export interface ListeningLine {
  s: string;
  t: string;
}

export interface ListeningItem {
  id: string;
  title: string;
  kind: 'dialogo' | 'monologo' | 'annuncio';
  lines: ListeningLine[];
  es: string;
  questions: Question[];
}

export interface WritingTask {
  id: string;
  kind: 'descrizione' | 'messaggio';
  title: string;
  prompt: string;
  promptEs: string;
  scene?: string;
  min: number;
  max: number;
  model: string;
  modelEs: string;
  chunks: string[];
  checklist: string[];
}

export interface OralQuestion {
  id: string;
  theme: string;
  q: string;
  es: string;
  sample: string;
  hints: string[];
}

export interface MonologueTopic {
  id: string;
  title: string;
  prompt: string;
  promptEs: string;
  scene?: string;
  points: string[];
  sample: string;
}

export interface ClozeText {
  title: string;
  instruction: string;
  text: string;
  es?: string;
}

export interface Exam {
  id: string;
  title: string;
  ascolto: ListeningItem[];
  lettura: ReadingText[];
  strutture: ClozeText[];
  scritta: WritingTask[];
  orale: { roleplay: OralQuestion[]; monologue: MonologueTopic };
}

export interface MinimalPair {
  a: string;
  b: string;
  aEs: string;
  bEs: string;
  focus: string;
}
