import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Topic } from '../types';
import { TOPIC_LABEL } from '../types';
import { mixedPractice, topicPractice } from '../lib/lessons';
import { weakTopics } from '../lib/plan';
import { useProgress } from '../store/progress';
import { LessonRunner } from '../components/LessonRunner';
import { Empty, PageHeader } from '../components/ui/ui';

const HUB = [
  { to: '/practica', icon: '🔀', title: 'Práctica mixta', desc: 'Ejercicios intercalados de todo lo visto, con más peso a tus temas débiles.' },
  { to: '/simulacro', icon: '⏱️', title: 'Simulacros de examen', desc: '3 exámenes completos cronometrados con puntaje por sección.' },
  { to: '/escucha', icon: '🎧', title: 'Ascolto', desc: 'Diálogos y anuncios con preguntas tipo examen.' },
  { to: '/shadowing', icon: '🦜', title: 'Shadowing', desc: 'Escucha, repite imitando la entonación y compara.' },
  { to: '/pares', icon: '👂', title: 'Pares mínimos', desc: 'Dobles consonantes y sonidos difíciles: pala / palla.' },
  { to: '/lectura', icon: '📖', title: 'Lettura', desc: 'Avisos, correos, anuncios y textos informativos.' },
  { to: '/escritura', icon: '✍️', title: 'Produzione scritta', desc: 'Describir (40–60 palabras) y responder mensajes (15–30).' },
  { to: '/oral', icon: '🗣️', title: 'Produzione orale', desc: 'Role play con examinador virtual y monólogo cronometrado.' },
  { to: '/vocabulario', icon: '🗂️', title: 'Vocabulario', desc: 'Temas del examen y frases útiles (chunks).' },
  { to: '/trampas', icon: '⚠️', title: 'Trampas para hispanohablantes', desc: 'Falsos amigos, dobles consonantes, essere/stare…' },
  { to: '/errores', icon: '📕', title: 'Cuaderno de errores', desc: 'Todo lo que fallaste, para repasar.' },
];

export function PracticeHub() {
  return (
    <div>
      <PageHeader title="Práctica" subtitle="Entrena cada parte del examen." />
      <div className="grid gap-3 sm:grid-cols-2">
        {HUB.map((h) => (
          <Link key={h.to} to={h.to} className="card flex items-start gap-3 hover:border-green-400">
            <span className="text-3xl">{h.icon}</span>
            <div>
              <p className="font-extrabold">{h.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{h.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Practice() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const topic = params.get('tema') as Topic | null;
  const store = useProgress();
  const weak = weakTopics(store);
  const exercises = useMemo(
    () => (topic ? topicPractice(topic, 12) : mixedPractice(Object.keys(store.lessons), weak, 12)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic],
  );
  if (!exercises.length)
    return (
      <Empty>
        Aún no hay ejercicios para practicar aquí. Completa algunas lecciones primero.
        <div><Link to="/mapa" className="btn btn-primary mt-3">Ir a las lecciones</Link></div>
      </Empty>
    );
  return (
    <LessonRunner
      exercises={exercises}
      title={topic ? `Refuerzo: ${TOPIC_LABEL[topic]}` : 'Práctica mixta'}
      defaultTopic={topic ?? undefined}
      onExit={() => nav(-1)}
      onFinish={() => nav('/')}
    />
  );
}
