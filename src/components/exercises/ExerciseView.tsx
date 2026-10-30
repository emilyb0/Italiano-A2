import type { Exercise, Section } from '../../types';
import type { ExProps } from './common';
import { DictationEx, OrderEx, TranslateEx } from './TextExercises';
import { ChoiceEx, ListenChooseEx, MinimalPairEx } from './ChoiceExercises';
import { ClozeEx } from './ClozeEx';
import { MatchEx } from './MatchEx';
import { AnswerOralEx, SpeakEx, TeachEx } from './SpeakExercises';

export function ExerciseView(props: ExProps<Exercise>) {
  const { ex } = props;
  switch (ex.type) {
    case 'translate': return <TranslateEx {...props} ex={ex} />;
    case 'order': return <OrderEx {...props} ex={ex} />;
    case 'dictation': return <DictationEx {...props} ex={ex} />;
    case 'listen-choose': return <ListenChooseEx {...props} ex={ex} />;
    case 'choice': return <ChoiceEx {...props} ex={ex} />;
    case 'cloze': return <ClozeEx {...props} ex={ex} />;
    case 'match': return <MatchEx {...props} ex={ex} />;
    case 'speak': return <SpeakEx {...props} ex={ex} />;
    case 'answer-oral': return <AnswerOralEx {...props} ex={ex} />;
    case 'minimal-pair': return <MinimalPairEx {...props} ex={ex} />;
    case 'teach': return <TeachEx {...props} ex={ex} />;
  }
}

/** Sección del examen que entrena cada tipo de ejercicio (para estadísticas). */
export function sectionOf(ex: Exercise): Section {
  if (ex.section) return ex.section;
  switch (ex.type) {
    case 'dictation':
    case 'listen-choose':
    case 'minimal-pair':
      return 'ascolto';
    case 'speak':
    case 'answer-oral':
      return 'orale';
    default:
      return 'strutture';
  }
}

/** Texto que identifica el ejercicio en el cuaderno de errores. */
export function promptOf(ex: Exercise): string {
  switch (ex.type) {
    case 'translate': return `Traduce: ${ex.es}`;
    case 'order': return `Ordena: ${ex.es}`;
    case 'dictation': return `Dictado (${ex.es})`;
    case 'listen-choose': return `${ex.question} — audio: «${ex.audio}»`;
    case 'choice': return ex.question;
    case 'cloze': return ex.text.replace(/\[\[(.+?)\]\]/g, '___');
    case 'match': return ex.instruction ?? 'Emparejar';
    case 'speak': return `Repite: ${ex.it}`;
    case 'answer-oral': return ex.question;
    case 'minimal-pair': return `Pares mínimos: ${ex.words.join(' / ')}`;
    case 'teach': return ex.title;
  }
}
