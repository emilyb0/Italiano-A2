import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { lessonById, LESSONS, VOCAB, vocabCardId } from '../lib/content';
import { buildLesson, isUnlocked, lessonTopic } from '../lib/lessons';
import { useProgress } from '../store/progress';
import { LessonRunner } from '../components/LessonRunner';

export default function LessonPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const lesson = lessonById.get(id);
  const lessons = useProgress((s) => s.lessons);
  const completeLesson = useProgress((s) => s.completeLesson);
  const introduceCards = useProgress((s) => s.introduceCards);
  const doneIds = Object.keys(lessons);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const exercises = useMemo(() => (lesson ? buildLesson(lesson, doneIds) : []), [id]);

  if (!lesson) return <p>Lección no encontrada. <Link to="/mapa" className="underline">Volver al mapa</Link></p>;
  if (!isUnlocked(id, doneIds))
    return (
      <div className="py-10 text-center">
        <p className="text-5xl">🔒</p>
        <p className="mt-2">Completa la lección anterior para desbloquear esta.</p>
        <Link to="/mapa" className="btn btn-primary mt-4">Ir al mapa</Link>
      </div>
    );

  const idx = LESSONS.findIndex((l) => l.id === id);
  const next = LESSONS[idx + 1];

  return (
    <LessonRunner
      key={id}
      exercises={exercises}
      title={lesson.title}
      defaultTopic={lessonTopic(lesson)}
      onExit={() => nav('/mapa')}
      onFinish={(s) => {
        completeLesson(id, s.total ? s.correct / s.total : 1);
        // Las palabras del tema de la lección entran al SRS (máximo 6 por lección para no saturar).
        if (lesson.vocabTopics?.length) {
          const fresh = VOCAB.filter((v) => lesson.vocabTopics!.includes(v.topic)).map(vocabCardId);
          const cards = useProgress.getState().cards;
          introduceCards(fresh.filter((c) => !cards[c]).slice(0, 6));
        }
        nav(next ? `/leccion/${next.id}` : '/mapa', { replace: true });
      }}
    />
  );
}
