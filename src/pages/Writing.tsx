import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { WRITING } from '../lib/content';
import { useProgress } from '../store/progress';
import { PageHeader } from '../components/ui/ui';
import { WritingTaskView } from '../components/WritingTaskView';

export default function Writing() {
  const { id } = useParams();
  const activities = useProgress((s) => s.activities);
  if (id) return <Editor key={id} id={id} />;
  const groups = [
    { kind: 'descrizione', title: 'Describir una imagen o lugar (40–60 palabras)' },
    { kind: 'messaggio', title: 'Responder un mensaje (15–30 palabras)' },
  ] as const;
  return (
    <div>
      <PageHeader title="Produzione scritta" subtitle="Escribe, cuenta palabras, compara con el modelo y autoevalúate con la rúbrica." />
      {groups.map((g) => (
        <section key={g.kind} className="mb-5">
          <h2 className="mb-2 font-extrabold">{g.title}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {WRITING.filter((w) => w.kind === g.kind).map((w) => (
              <Link key={w.id} to={`/escritura/${w.id}`} className="card flex items-center gap-3 p-3 hover:border-green-400">
                <span className="text-2xl">{w.scene?.slice(0, 2) ?? '✉️'}</span>
                <p className="flex-1 font-bold" lang="it">{w.title}</p>
                {activities[w.id] && <span className="chip bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">{Math.round(activities[w.id].score * 100)} %</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Editor({ id }: { id: string }) {
  const nav = useNavigate();
  const task = WRITING.find((w) => w.id === id);
  const draftKey = 'draft:' + id;
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(draftKey) ?? '';
    } catch {
      return '';
    }
  });
  const [submitted, setSubmitted] = useState(false);
  const store = useProgress();
  if (!task) return <p>Tarea no encontrada.</p>;
  const next = WRITING[WRITING.indexOf(task) + 1];
  const save = (s: string) => {
    setText(s);
    try {
      localStorage.setItem(draftKey, s);
    } catch {
      /* borrador solo en memoria */
    }
  };
  return (
    <div className="space-y-4">
      <button className="btn btn-ghost text-sm" onClick={() => nav('/escritura')}>← Todas las tareas</button>
      <div className="card">
        <p className="text-xs font-bold uppercase text-slate-500">{task.kind === 'descrizione' ? 'Descripción' : 'Mensaje'} · {task.min}–{task.max} palabras · ⏱️ ~{task.kind === 'descrizione' ? 20 : 15} min en el examen</p>
        <h1 className="mb-3 text-xl font-extrabold" lang="it">{task.title}</h1>
        <WritingTaskView
          task={task}
          text={text}
          onText={save}
          submitted={submitted}
          onSubmit={() => setSubmitted(true)}
          onScore={(s) => {
            store.markActivity(task.id, s);
            store.recordAnswer({ section: 'scritta', correct: s >= 0.6 });
            store.addXp(20);
          }}
        />
      </div>
      {submitted && (
        <div className="flex gap-2">
          <button className="btn btn-secondary flex-1" onClick={() => { save(''); setSubmitted(false); }}>Reescribir</button>
          {next && <Link className="btn btn-primary flex-1" to={`/escritura/${next.id}`}>Siguiente tarea</Link>}
        </div>
      )}
    </div>
  );
}
