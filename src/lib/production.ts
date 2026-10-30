// Comprobaciones automáticas aproximadas para textos escritos y transcripciones orales.
import { stripAccents } from './compare';
import { countWords } from './util';

const PARTICIPLES =
  /\b(ho|hai|ha|abbiamo|avete|hanno|sono|sei|e|siamo|siete|mi sono|ci siamo|si e|ti sei)\s+(gia\s+|appena\s+|mai\s+)?([a-z]+(ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)|fatto|fatta|detto|visto|vista|preso|presa|messo|letto|scritto|stato|stata|stati|nato|nata|aperto|chiuso|bevuto|vissuto|rimasto|rimasta|corso|perso|speso|scelto|risposto|chiesto|venuto|venuta|morto|offerto|sceso|scesa|vinto)\b/;
const IMPERFETTO = /\b[a-z]+(avo|avi|ava|avamo|avate|avano|evo|evi|eva|evamo|evano|ivo|ivi|iva|ivamo|ivano)\b|\b(ero|eri|era|eravamo|erano|c'era)\b/;
export const CONNECTORS = ['perché', 'poi', 'però', 'quindi', 'ma', 'anche', 'quando', 'allora', 'infatti', 'dopo', 'prima', 'invece', 'mentre', 'secondo me', 'di solito', 'inoltre', 'cioè', 'comunque'];

export interface ProductionCheck {
  words: number;
  sentences: number;
  avgSentence: number;
  usesPast: boolean;
  connectors: string[];
  hasGreeting: boolean;
  hasClosing: boolean;
}

export function analyse(text: string): ProductionCheck {
  const t = ' ' + stripAccents(text.toLowerCase()).replace(/[’']/g, "'") + ' ';
  const words = countWords(text);
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((s) => countWords(s) > 0).length);
  const connectors = CONNECTORS.filter((c) => new RegExp(`(^|[^a-z])${stripAccents(c)}([^a-z]|$)`).test(t));
  return {
    words,
    sentences,
    avgSentence: words / sentences,
    usesPast: PARTICIPLES.test(t) || IMPERFETTO.test(t),
    connectors,
    hasGreeting: /\b(ciao|caro|cara|cari|gentile|salve|buongiorno|buonasera)\b/.test(t),
    hasClosing: /\b(a presto|un abbraccio|baci|saluti|un bacio|ci vediamo|a dopo|cordiali|grazie)\b/.test(t),
  };
}
