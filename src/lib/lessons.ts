// Construcción de sesiones: lecciones con práctica intercalada y ejercicios generados del vocabulario.
import type { Exercise, Lesson, Topic, VocabItem } from '../types';
import { grammarById, LESSONS, UNITS, VOCAB } from './content';
import { sample, shuffle } from './util';

const first = (s: string) => s.split('|')[0].trim();

/** Ejercicios generados automáticamente a partir de palabras y frases. */
export function vocabExercises(items: VocabItem[], pool: VocabItem[] = VOCAB): Exercise[] {
  const out: Exercise[] = [];
  items.forEach((v, i) => {
    const it = first(v.it);
    const alts = v.it.split('|').slice(1).map((s) => s.trim());
    const mode = i % 4;
    if (v.kind === 'chunk' && mode % 2 === 0) {
      out.push({ type: 'speak', it, es: v.es, topic: 'lessico' });
    } else if (mode === 1 && v.ex) {
      out.push({ type: 'dictation', it: v.ex, es: v.exEs ?? v.es, topic: 'lessico' });
    } else if (mode === 3) {
      const distract = sample(pool.filter((x) => x.id !== v.id && x.topic === v.topic && x.es !== v.es), 2).map((x) => x.es);
      if (distract.length === 2)
        out.push({ type: 'listen-choose', audio: it, question: 'Che cosa significa?', options: [v.es, ...distract], answer: 0, es: v.es, topic: 'lessico' });
      else out.push({ type: 'translate', es: v.es, it, alts, topic: 'lessico', explain: v.note });
    } else {
      out.push({ type: 'translate', es: v.es, it, alts, topic: 'lessico', explain: v.note });
    }
  });
  for (let k = 0; k + 4 <= items.length; k += 5) {
    const group = items.slice(k, k + 5).filter((v) => v.kind !== 'chunk');
    if (group.length >= 3)
      out.push({ type: 'match', instruction: 'Empareja italiano y español', pairs: group.map((v) => [first(v.it), v.es] as [string, string]), topic: 'lessico' });
  }
  return shuffle(out);
}

/** Lección completa: regla → ejercicios propios → palabras del tema → 2 repasos de lecciones anteriores. */
export function buildLesson(lesson: Lesson, doneIds: string[]): Exercise[] {
  const ex: Exercise[] = [];
  const g = lesson.grammar ? grammarById.get(lesson.grammar) : undefined;
  if (g) ex.push({ type: 'teach', title: g.title, body: g.body, examples: g.examples.slice(0, 3) });
  const own = lesson.exercises.map((e) => (e.type === 'translate' && e.tiles === undefined ? { ...e, tiles: Math.random() < 0.3 } : e));
  const teach = own.filter((e) => e.type === 'teach');
  const practice = own.filter((e) => e.type !== 'teach');
  ex.push(...teach);

  const vocab = lesson.vocabTopics?.length
    ? sample(VOCAB.filter((v) => lesson.vocabTopics!.includes(v.topic)), 3)
    : [];
  const vex = vocabExercises(vocab).slice(0, 3);

  const previous = LESSONS.filter((l) => doneIds.includes(l.id) && l.id !== lesson.id);
  const review = sample(previous.flatMap((l) => l.exercises.filter((e) => e.type !== 'teach').map((e) => ({ ...e, topic: e.topic ?? (grammarById.get(l.grammar ?? '')?.topic as Topic | undefined) }))), 2);

  // Intercalado: mezcla los ejercicios nuevos con vocabulario y repaso, sin poner el repaso al principio.
  const middle = shuffle([...practice.slice(2), ...vex, ...review]);
  ex.push(...practice.slice(0, 2), ...middle);
  return ex;
}

export function lessonTopic(lesson: Lesson): Topic | undefined {
  return lesson.grammar ? grammarById.get(lesson.grammar)?.topic : undefined;
}

/** Una lección se desbloquea cuando la anterior está completada. */
export function isUnlocked(lessonId: string, doneIds: string[]): boolean {
  const i = LESSONS.findIndex((l) => l.id === lessonId);
  return i <= 0 || doneIds.includes(LESSONS[i - 1].id) || doneIds.includes(lessonId);
}

export function nextLesson(doneIds: string[], unitIds?: string[]) {
  return LESSONS.find((l) => !doneIds.includes(l.id) && (!unitIds || unitIds.includes(l.unitId)));
}

/** Práctica mixta intercalada: ejercicios de lecciones hechas, con más peso a los temas débiles. */
export function mixedPractice(doneIds: string[], weakTopics: Topic[], n = 12): Exercise[] {
  const pool = LESSONS.filter((l) => doneIds.includes(l.id)).flatMap((l) =>
    l.exercises.filter((e) => e.type !== 'teach').map((e) => ({ ...e, topic: e.topic ?? lessonTopic(l) })),
  );
  if (!pool.length) return [];
  const weak = pool.filter((e) => e.topic && weakTopics.includes(e.topic));
  const picked = [...sample(weak, Math.ceil(n / 2)), ...sample(pool, n)];
  const seen = new Set<Exercise>();
  return shuffle(picked.filter((e) => (seen.has(e) ? false : (seen.add(e), true)))).slice(0, n);
}

/** Ejercicios de un tema gramatical concreto (para los bloques de refuerzo). */
export function topicPractice(topic: Topic, n = 12): Exercise[] {
  const lessons = LESSONS.filter((l) => lessonTopic(l) === topic);
  const pool = lessons.flatMap((l) => l.exercises.filter((e) => e.type !== 'teach').map((e) => ({ ...e, topic: e.topic ?? topic })));
  return sample(pool, n);
}

export function unitOf(lessonId: string) {
  return UNITS.find((u) => u.lessons.some((l) => l.id === lessonId));
}
