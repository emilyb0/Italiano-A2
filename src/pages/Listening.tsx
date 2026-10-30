import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LISTENING } from '../lib/content';
import { useProgress } from '../store/progress';
import { ListenButton, PageHeader, Translation } from '../components/ui/ui';
import { DialoguePlayer } from '../components/DialoguePlayer';
import { QuestionList, scoreQuestions, type QAnswers } from '../components/Questions';
import { RepeatPractice } from '../components/ui/Speech';

const KIND: Record<string, string> = { dialogo: '💬 Diálogo', monologo: '🎙️ Monólogo', annuncio: '📢 Anuncio' };

export default function Listening() {
  const { id } = useParams();
  const activities = useProgress((s) => s.activities);
  if (id) return <Player key={id} id={id} />;
  return (
    <div>
      <PageHeader title="Ascolto" subtitle="Escucha sin leer. El guion se muestra solo después de responder.">
        <div className="flex gap-2">
          <Link to="/shadowing" className="btn btn-secondary">🦜 Shadowing</Link>
          <Link to="/pares" className="btn btn-secondary">👂 Pares mínimos</Link>
        </div>
      </PageHeader>
      <div className="grid gap-2 sm:grid-cols-2">
        {LISTENING.map((l, i) => {
          const a = activities[l.id];
          return (
            <Link key={l.id} to={`/escucha/${l.id}`} className="card flex items-center gap-3 p-3 hover:border-green-400">
              <span className="w-8 text-center font-extrabold text-slate-400">{i + 1}</span>
              <div className="flex-1">
                <p className="font-bold" lang="it">{l.title}</p>
                <p className="text-xs text-slate-500">{KIND[l.kind]} · {l.questions.length} preguntas</p>
              </div>
              {a && <span className="chip bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">{Math.round(a.score * 100)} %</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Player({ id }: { id: string }) {
  const nav = useNavigate();
  const item = LISTENING.find((l) => l.id === id);
  const [answers, setAnswers] = useState<QAnswers>({});
  const [checked, setChecked] = useState(false);
  const [shadow, setShadow] = useState<number | null>(null);
  const store = useProgress();
  if (!item) return <p>Audio no encontrado.</p>;
  const next = LISTENING[LISTENING.indexOf(item) + 1];
  const s = scoreQuestions(item.questions, answers);

  const check = () => {
    setChecked(true);
    item.questions.forEach((q, i) => {
      const ok = answers[i] === q.answer;
      store.recordAnswer({ section: 'ascolto', correct: ok });
      if (!ok)
        store.logError({
          prompt: `[Ascolto: ${item.title}] ${q.q}`,
          expected: q.type === 'vf' ? (q.answer ? 'Vero' : 'Falso') : q.options![q.answer as number],
          given: answers[i] === undefined ? '(sin respuesta)' : q.type === 'vf' ? (answers[i] ? 'Vero' : 'Falso') : q.options![answers[i] as number],
          explain: q.explain,
          section: 'ascolto',
        });
    });
    store.markActivity(item.id, s.total ? s.correct / s.total : 1);
    store.addXp(10 + s.correct * 2);
  };

  return (
    <div className="space-y-4">
      <button className="btn btn-ghost text-sm" onClick={() => nav('/escucha')}>← Todos los audios</button>
      <div className="card">
        <p className="text-xs font-bold uppercase text-slate-500">{KIND[item.kind]}</p>
        <h1 className="mb-3 text-xl font-extrabold" lang="it">{item.title}</h1>
        <DialoguePlayer lines={item.lines} />
        <p className="mt-2 text-xs text-slate-500">Consejo: lee las preguntas antes de escuchar, como en el examen. Escucha dos veces a velocidad normal.</p>
      </div>
      <div className="card">
        <QuestionList questions={item.questions} answers={answers} checked={checked} onChange={(i, v) => setAnswers({ ...answers, [i]: v })} />
      </div>
      {!checked ? (
        <button className="btn btn-primary w-full" onClick={check}>Corregir</button>
      ) : (
        <>
          <div className="card text-center">
            <p className="text-3xl font-extrabold text-green-600">{s.correct} / {s.total}</p>
          </div>
          <div className="card space-y-2">
            <h2 className="font-extrabold">📝 Transcripción y shadowing</h2>
            <p className="text-sm text-slate-500">Toca 🦜 en una línea para repetirla en voz alta imitando el ritmo.</p>
            {item.lines.map((l, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                <div className="flex items-start gap-2">
                  <span className="w-16 shrink-0 text-xs font-bold text-slate-500">{l.s}</span>
                  <ListenButton text={l.t} size="sm" />
                  <p className="flex-1" lang="it">{l.t}</p>
                  <button className="text-xl" title="Shadowing" onClick={() => setShadow(shadow === i ? null : i)}>🦜</button>
                </div>
                {shadow === i && (
                  <div className="mt-2">
                    <RepeatPractice text={l.t} onResult={(r) => store.recordAnswer({ section: 'orale', correct: r.correct })} />
                  </div>
                )}
              </div>
            ))}
            <Translation text={item.es} label="Ver traducción completa" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={() => { setAnswers({}); setChecked(false); }}>Repetir</button>
            {next && <Link className="btn btn-primary flex-1" to={`/escucha/${next.id}`}>Siguiente audio</Link>}
          </div>
        </>
      )}
    </div>
  );
}
