import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC, EXAMS, GRAMMAR, LESSONS, LISTENING, MONOLOGUES, ORAL_QUESTIONS, PAIRS, READING, UNITS, VOCAB, VOCAB_TOPICS, WRITING,
} from '../lib/content';
import { blanks, parseCloze } from '../lib/cloze';
import { countWords } from '../lib/util';
import { TOPIC_LABEL } from '../types';
import type { Exercise, ListeningItem, MatchTask, Question, ReadingText, WritingTask } from '../types';

const SECTIONS = ['ascolto', 'lettura', 'strutture', 'scritta', 'orale'];

function unique(ids: string[], label: string) {
  const seen = new Set<string>();
  const dup = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  expect(dup, `ids duplicados en ${label}`).toEqual([]);
}

function checkCloze(text: string, where: string) {
  expect((text.match(/\[\[/g) ?? []).length, `corchetes desparejados en ${where}`).toBe((text.match(/\]\]/g) ?? []).length);
  const bs = blanks(parseCloze(text));
  expect(bs.length, `cloze sin huecos en ${where}`).toBeGreaterThan(0);
  for (const b of bs) {
    expect(b.answers.every((a) => a.length > 0), `hueco vacío en ${where}`).toBe(true);
    if (b.options) expect(new Set(b.options).size, `opciones repetidas en ${where}: ${b.options}`).toBe(b.options.length);
  }
}

function checkQuestion(q: Question, where: string) {
  if (q.type === 'vf') expect(typeof q.answer, where).toBe('boolean');
  else {
    expect(q.options?.length ?? 0, `${where}: opciones`).toBeGreaterThanOrEqual(2);
    expect(typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.options!.length, `${where}: índice de respuesta`).toBe(true);
  }
}

function checkMatch(m: MatchTask, where: string) {
  expect(m.answer.length, `${where}: longitud de answer`).toBe(m.left.length);
  expect(m.answer.every((i) => i >= 0 && i < m.right.length), `${where}: índice fuera de rango`).toBe(true);
  expect(new Set(m.answer).size, `${where}: respuestas repetidas`).toBe(m.answer.length);
}

function checkReading(r: ReadingText) {
  expect(r.text && r.es, r.id).toBeTruthy();
  expect((r.questions?.length ?? 0) + (r.match ? 1 : 0), `${r.id} sin preguntas`).toBeGreaterThan(0);
  r.questions?.forEach((q, i) => checkQuestion(q, `${r.id}#${i}`));
  if (r.match) checkMatch(r.match, r.id);
}

function checkListening(l: ListeningItem) {
  expect(l.lines.length, l.id).toBeGreaterThan(0);
  expect(l.lines.every((x) => x.s && x.t), `${l.id}: línea vacía`).toBe(true);
  expect(['dialogo', 'monologo', 'annuncio']).toContain(l.kind);
  expect(l.questions.length, l.id).toBeGreaterThan(0);
  l.questions.forEach((q, i) => checkQuestion(q, `${l.id}#${i}`));
}

function checkWriting(w: WritingTask) {
  expect(['descrizione', 'messaggio']).toContain(w.kind);
  const n = countWords(w.model);
  expect(n >= w.min && n <= w.max, `${w.id}: el modelo tiene ${n} palabras (${w.min}-${w.max})`).toBe(true);
}

function checkExercise(ex: Exercise, where: string) {
  switch (ex.type) {
    case 'choice':
    case 'listen-choose':
      expect(ex.answer >= 0 && ex.answer < ex.options.length, `${where}: índice`).toBe(true);
      expect(new Set(ex.options).size, `${where}: opciones repetidas`).toBe(ex.options.length);
      break;
    case 'cloze':
      checkCloze(ex.text, where);
      break;
    case 'match':
      expect(ex.pairs.length, where).toBeGreaterThanOrEqual(2);
      expect(new Set(ex.pairs.map((p) => p[0])).size, `${where}: izquierda repetida`).toBe(ex.pairs.length);
      expect(new Set(ex.pairs.map((p) => p[1])).size, `${where}: derecha repetida`).toBe(ex.pairs.length);
      break;
    case 'translate':
    case 'order':
    case 'dictation':
    case 'speak':
      expect(ex.it && ex.es, where).toBeTruthy();
      break;
    case 'minimal-pair':
      expect([0, 1]).toContain(ex.target);
      break;
    default:
      break;
  }
  if (ex.topic) expect(Object.keys(TOPIC_LABEL), `${where}: topic`).toContain(ex.topic);
  if (ex.section) expect(SECTIONS, `${where}: section`).toContain(ex.section);
}

describe('cantidades mínimas', () => {
  it('cumple los mínimos pedidos', () => {
    expect(VOCAB.length).toBeGreaterThanOrEqual(400);
    expect(LESSONS.length).toBeGreaterThanOrEqual(60);
    expect(READING.length).toBeGreaterThanOrEqual(30);
    expect(LISTENING.length).toBeGreaterThanOrEqual(30);
    expect(WRITING.length).toBeGreaterThanOrEqual(20);
    expect(ORAL_QUESTIONS.length).toBeGreaterThanOrEqual(30);
    expect(MONOLOGUES.length).toBeGreaterThanOrEqual(5);
    expect(EXAMS.length).toBeGreaterThanOrEqual(3);
    expect(PAIRS.length).toBeGreaterThanOrEqual(30);
    expect(DIAGNOSTIC.length).toBeGreaterThanOrEqual(20);
  });
});

describe('ids únicos', () => {
  it('no hay ids repetidos', () => {
    unique(VOCAB.map((v) => v.id), 'vocab');
    unique(LESSONS.map((l) => l.id), 'lecciones');
    unique(UNITS.map((u) => u.id), 'unidades');
    unique(GRAMMAR.map((g) => g.id), 'gramática');
    unique(READING.map((r) => r.id), 'lecturas');
    unique(LISTENING.map((l) => l.id), 'escuchas');
    unique(WRITING.map((w) => w.id), 'escritura');
    unique([...ORAL_QUESTIONS.map((q) => q.id), ...MONOLOGUES.map((m) => m.id)], 'oral');
    unique(EXAMS.map((e) => e.id), 'simulacros');
    unique(PAIRS.map((p) => `${p.a}/${p.b}`), 'pares');
  });
});

describe('vocabulario', () => {
  it('cada palabra tiene it, es y un tema conocido', () => {
    const topics = new Set(VOCAB_TOPICS.map((t) => t.id));
    for (const v of VOCAB) {
      expect(v.it && v.es, v.id).toBeTruthy();
      expect(topics.has(v.topic), `${v.id}: tema ${v.topic}`).toBe(true);
    }
  });
});

describe('gramática y lecciones', () => {
  it('las notas tienen tema válido y drills completos', () => {
    for (const g of GRAMMAR) {
      expect(Object.keys(TOPIC_LABEL), g.id).toContain(g.topic);
      g.drills?.forEach((d, i) => expect(d.q && d.a, `${g.id}#${i}`).toBeTruthy());
    }
  });
  it('las lecciones referencian gramática y temas existentes, y sus ejercicios son válidos', () => {
    const grammarIds = new Set(GRAMMAR.map((g) => g.id));
    const topics = new Set(VOCAB_TOPICS.map((t) => t.id));
    for (const l of LESSONS) {
      if (l.grammar) expect(grammarIds.has(l.grammar), `${l.id}: gramática ${l.grammar}`).toBe(true);
      l.vocabTopics?.forEach((t) => expect(topics.has(t), `${l.id}: tema ${t}`).toBe(true));
      expect(l.exercises.length, l.id).toBeGreaterThan(0);
      l.exercises.forEach((ex, i) => checkExercise(ex, `${l.id}#${i}`));
    }
  });
});

describe('lecturas, escuchas, escritura, oral', () => {
  it('lecturas válidas', () => READING.forEach(checkReading));
  it('escuchas válidas', () => LISTENING.forEach(checkListening));
  it('textos modelo dentro del rango de palabras', () => WRITING.forEach(checkWriting));
  it('hay preguntas de presentación para el role play', () => {
    expect(ORAL_QUESTIONS.filter((q) => q.theme === 'presentazione').length).toBeGreaterThanOrEqual(2);
    for (const q of ORAL_QUESTIONS) expect(q.q && q.es && q.sample, q.id).toBeTruthy();
    for (const m of MONOLOGUES) expect(m.points.length, m.id).toBeGreaterThan(0);
  });
  it('pares mínimos distintos', () => PAIRS.forEach((p) => expect(p.a, `${p.a}/${p.b}`).not.toBe(p.b)));
  it('diagnóstico con tema y sección', () => {
    DIAGNOSTIC.forEach((ex, i) => {
      expect(ex.topic && ex.section, `diagnóstico #${i}`).toBeTruthy();
      checkExercise(ex, `diagnóstico #${i}`);
    });
    const secs = new Set(DIAGNOSTIC.map((e) => e.section));
    expect(secs.has('ascolto') && secs.has('lettura') && secs.has('strutture')).toBe(true);
  });
});

describe('simulacros', () => {
  it('cada simulacro tiene las 5 partes completas', () => {
    for (const e of EXAMS) {
      expect(e.ascolto.length, e.id).toBeGreaterThan(0);
      expect(e.lettura.length, e.id).toBeGreaterThan(0);
      expect(e.strutture.length, e.id).toBeGreaterThan(0);
      expect(e.scritta.length, e.id).toBe(2);
      expect(e.orale.roleplay.length, e.id).toBeGreaterThan(0);
      expect(e.orale.monologue.sample, e.id).toBeTruthy();
      e.ascolto.forEach(checkListening);
      e.lettura.forEach(checkReading);
      e.strutture.forEach((c, i) => checkCloze(c.text, `${e.id} strutture #${i}`));
      e.scritta.forEach(checkWriting);
    }
  });
});
