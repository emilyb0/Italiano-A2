import { describe, expect, it } from 'vitest';
import { analyse } from '../lib/production';
import { countWords } from '../lib/util';

describe('analyse (escrito/oral)', () => {
  it('detecta passato prossimo, imperfetto y conectores', () => {
    const a = analyse('Ieri sono andata al mare perché faceva caldo. Poi ho mangiato una pizza, però era fredda.');
    expect(a.usesPast).toBe(true);
    expect(a.connectors).toEqual(expect.arrayContaining(['perché', 'poi', 'però']));
    expect(a.sentences).toBe(2);
  });
  it('sin pasado', () => {
    expect(analyse('Mi chiamo Emily e studio italiano.').usesPast).toBe(false);
  });
  it('saludo y despedida en mensajes', () => {
    const a = analyse('Ciao Marta, grazie per l’invito! Vengo volentieri. A presto, Emily');
    expect(a.hasGreeting).toBe(true);
    expect(a.hasClosing).toBe(true);
  });
  it('cuenta palabras', () => {
    expect(countWords('Ciao, come stai? Io sto bene — grazie!')).toBe(7);
  });
});
