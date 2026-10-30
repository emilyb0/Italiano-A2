import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { topicLabel, VOCAB, VOCAB_TOPICS, vocabCardId } from '../lib/content';
import { vocabExercises } from '../lib/lessons';
import { isMastered } from '../lib/srs';
import { sample } from '../lib/util';
import { useProgress } from '../store/progress';
import { ListenButton, PageHeader, ProgressBar, Translation } from '../components/ui/ui';
import { LessonRunner } from '../components/LessonRunner';

export default function Vocab() {
  const { topic } = useParams();
  const cards = useProgress((s) => s.cards);
  if (!topic) {
    return (
      <div>
        <PageHeader title="Vocabulario por temas" subtitle={`${VOCAB.length} palabras y frases. Al practicarlas entran a tu repaso SRS.`} />
        <div className="grid gap-3 sm:grid-cols-2">
          {VOCAB_TOPICS.map((t) => {
            const items = VOCAB.filter((v) => v.topic === t.id);
            const seen = items.filter((v) => cards[vocabCardId(v)]).length;
            const mastered = items.filter((v) => cards[vocabCardId(v)] && isMastered(cards[vocabCardId(v)])).length;
            return (
              <Link key={t.id} to={`/vocabulario/${t.id}`} className="card flex items-center gap-3 hover:border-green-400">
                <span className="text-3xl">{t.emoji}</span>
                <div className="flex-1">
                  <p className="font-extrabold">{t.label}</p>
                  <p className="text-xs text-slate-500">{items.length} elementos · {seen} en SRS · {mastered} dominados</p>
                  <ProgressBar value={seen / Math.max(1, items.length)} className="mt-1 h-2" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }
  return <TopicDetail topic={topic} />;
}

function TopicDetail({ topic }: { topic: string }) {
  const nav = useNavigate();
  const items = VOCAB.filter((v) => v.topic === topic);
  const [showEs, setShowEs] = useState(false);
  const [practice, setPractice] = useState<ReturnType<typeof vocabExercises> | null>(null);
  const store = useProgress();

  if (practice)
    return (
      <LessonRunner
        exercises={practice}
        title={topicLabel(topic)}
        defaultTopic="lessico"
        onExit={() => setPractice(null)}
        onFinish={(s) => {
          store.markActivity('vocab:' + topic, s.total ? s.correct / s.total : 1);
          const ids = items.map(vocabCardId).filter((id) => !store.cards[id]);
          store.introduceCards(ids.slice(0, 15));
          setPractice(null);
        }}
      />
    );

  return (
    <div>
      <PageHeader title={topicLabel(topic)} subtitle={`${items.length} elementos`}>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowEs(!showEs)}>{showEs ? 'Ocultar' : 'Ver'} español</button>
          <button className="btn btn-primary" onClick={() => setPractice(vocabExercises(sample(items, 10), VOCAB))}>Practicar</button>
        </div>
      </PageHeader>
      <button className="btn btn-ghost mb-2 text-sm" onClick={() => nav('/vocabulario')}>← Todos los temas</button>
      <ul className="space-y-2">
        {items.map((v) => {
          const it = v.it.split('|')[0];
          return (
            <li key={v.id} className="card flex items-start gap-3 p-3">
              <ListenButton text={it} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-bold" lang="it">{v.it.replace(/\|/g, ' / ')}</p>
                {showEs ? <p className="text-sm text-slate-500">{v.es}</p> : <Translation text={v.es} label="ver significado" />}
                {v.ex && <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-300" lang="it">«{v.ex}»</p>}
                {v.note && showEs && <p className="text-xs text-slate-500">💡 {v.note}</p>}
              </div>
              {store.cards[vocabCardId(v)] && <span className="chip bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">SRS</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
