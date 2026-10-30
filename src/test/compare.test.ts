import { describe, expect, it } from 'vitest';
import { compare, compareBest, normalize, numberToItalian, splitAlts } from '../lib/compare';

describe('normalize', () => {
  it('ignora mayúsculas, puntuación y acentos', () => {
    expect(normalize('Perché?  Sì, è così!')).toBe('perche si e cosi');
  });
  it('separa elisiones y unifica apóstrofos', () => {
    expect(normalize('L’amico dell’anno')).toBe("l' amico dell' anno");
  });
});

describe('compare (texto)', () => {
  it('respuesta exacta', () => {
    const r = compare('Mi chiamo Emily.', 'mi chiamo emily');
    expect(r.ok).toBe(true);
    expect(r.exact).toBe(true);
  });
  it('acepta acentos faltantes pero lo indica', () => {
    const r = compare('Città più bella', 'citta piu bella');
    expect(r.ok).toBe(true);
    expect(r.exact).toBe(false);
    expect(r.accentOnly).toBe(true);
  });
  it('acepta un error de tipeo en palabras largas', () => {
    const r = compare('Vado alla stazione', 'vado alla stazone');
    expect(r.ok).toBe(true);
    expect(r.typo).toBe(true);
    expect(r.words.find((w) => w.word === 'stazione')?.status).toBe('close');
  });
  it('no acepta cambiar palabras cortas (artículos, preposiciones)', () => {
    const r = compare('Vado al cinema', 'vado a cinema');
    expect(r.ok).toBe(false);
    expect(r.words.find((w) => w.word === 'al')?.status).toBe('missing');
  });
  it('marca palabras que sobran y que faltan', () => {
    const r = compare('Sono andata al mare', 'ho andata al mare ieri');
    expect(r.ok).toBe(false);
    const st = Object.fromEntries(r.words.map((w) => [w.word, w.status]));
    expect(st['Sono']).toBe('missing');
    expect(st['ieri']).toBe('extra');
    expect(st['mare']).toBe('ok');
  });
  it('è y e no son intercambiables', () => {
    expect(compare('Lui è italiano', 'lui e italiano').ok).toBe(false);
    expect(compare('Perché sei qui', 'perche sei qui').ok).toBe(true);
  });
  it('respuesta vacía es incorrecta', () => {
    expect(compare('Ciao', '').ok).toBe(false);
  });
  it('compareBest elige la alternativa correcta', () => {
    const r = compareBest(splitAlts('Sono andato al mare|Sono andata al mare'), 'sono andata al mare');
    expect(r.exact).toBe(true);
  });
});

describe('compare (voz)', () => {
  it('es tolerante: aprueba con ≥80 % de palabras', () => {
    const r = compare('Di solito mi sveglio alle sette e mezza', 'di solito mi sveglio alle sette mezza', 'speech');
    expect(r.ok).toBe(true);
    expect(r.words.find((w) => w.word === 'e')?.status).toBe('missing');
  });
  it('convierte dígitos a palabras', () => {
    const r = compare('Ho ventitré anni', 'ho 23 anni', 'speech');
    expect(r.ok).toBe(true);
  });
  it('falla si se dicen pocas palabras', () => {
    expect(compare('Vorrei un caffè e un cornetto per favore', 'vorrei caffè', 'speech').ok).toBe(false);
  });
});

describe('numberToItalian', () => {
  it('convierte números', () => {
    expect(numberToItalian(21)).toBe('ventuno');
    expect(numberToItalian(28)).toBe('ventotto');
    expect(numberToItalian(33)).toBe('trentatré');
    expect(numberToItalian(100)).toBe('cento');
    expect(numberToItalian(2026)).toBe('duemilaventisei');
  });
});

import { parseCloze, blanks, checkBlank, clozeFull } from '../lib/cloze';

describe('cloze', () => {
  it('reconoce huecos libres y de opción múltiple', () => {
    const p = parseCloze('Ieri [[sono andata|sono andato]] [[al/allo/alla]] cinema.');
    const b = blanks(p);
    expect(b).toHaveLength(2);
    expect(b[0].answers).toEqual(['sono andata', 'sono andato']);
    expect(b[1].options).toEqual(['al', 'allo', 'alla']);
    expect(b[1].answers).toEqual(['al']);
    expect(clozeFull('Vado [[a/in]] Roma.')).toBe('Vado a Roma.');
  });
  it('corrige huecos ignorando mayúsculas y acentos', () => {
    expect(checkBlank(['perché'], 'perche')).toBe(true);
    expect(checkBlank(['è'], 'e')).toBe(false);
    expect(checkBlank(['sono andato', 'sono andata'], 'Sono andata')).toBe(true);
    expect(checkBlank(['al'], 'allo')).toBe(false);
    expect(checkBlank(['al'], '')).toBe(false);
  });
});
