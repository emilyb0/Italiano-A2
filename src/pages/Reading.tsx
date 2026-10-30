import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { READING } from '../lib/content';
import { useProgress } from '../store/progress';
import { ListenButton, PageHeader, Translation } from '../components/ui/ui';
import { GlossText } from '../components/GlossText';
import { MatchTaskView, QuestionList, scoreMatch, scoreQuestions, type QAnswers } from '../components/Questions';

export default function Reading() {
  const { id } = useParams();
  const activities = useProgress((s) => s.activities);
  if (id) return <Reader key={id} id={id} />;
  return (
    <div>
      <PageHeader title="Comprensione della lettura" subtitle="Avisos, carteles, anuncios, correos y textos informativos. Toca las palabras subrayadas para ver su traducción." />
      <div className="grid gap-2 sm:grid-cols-2">
        {READING.map((r, i) => {
          const a = activities[r.id];
          return (
            <Link key={r.id} to={`/lectura/${r.id}`} className="card flex items-center gap-3 p-3 hover:border-green-400">
              <span className="w-8 text-center font-extrabold text-slate-400">{i + 1}</span>
              <div className="flex-1">
                <p className="font-bold" lang="it">{r.title}</p>
                <p className="text-xs text-slate-500">{r.genre}</p>
              </div>
              {a && <span className="chip bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">{Math.round(a.score * 100)} %</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Reader({ id }: { id: string }) {
  const nav = useNavigate();
  const r = READING.find((x) => x.id === id);
  const [answers, setAnswers] = useState<QAnswers>({});
  const [matchA, setMatchA] = useState<Record<number, number | undefined>>({});
  const [checked, setChecked] = useState(false);
  const store = useProgress();
  if (!r) return <p>Texto no encontrado.</p>;
  const idx = READING.indexOf(r);
  const next = READING[idx + 1];

  const check = () => {
    setChecked(true);
    const q = scoreQuestions(r.questions ?? [], answers);
    const m = r.match ? scoreMatch(r.match, matchA) : { correct: 0, total: 0 };
    const total = q.total + m.total;
    const correct = q.correct + m.correct;
    for (let i = 0; i < total; i++) store.recordAnswer({ section: 'lettura', correct: i < correct });
    (r.questions ?? []).forEach((qq, i) => {
      if (answers[i] !== qq.answer)
        store.logError({
          prompt: `[${r.title}] ${qq.q}`,
          expected: qq.type === 'vf' ? (qq.answer ? 'Vero' : 'Falso') : qq.options![qq.answer as number],
          given: answers[i] === undefined ? '(sin respuesta)' : qq.type === 'vf' ? (answers[i] ? 'Vero' : 'Falso') : qq.options![answers[i] as number],
          explain: qq.explain,
          section: 'lettura',
        });
    });
    store.markActivity(r.id, total ? correct / total : 1);
    store.addXp(10 + correct * 2);
  };
  const q = scoreQuestions(r.questions ?? [], answers);
  const m = r.match ? scoreMatch(r.match, matchA) : { correct: 0, total: 0 };

  return (
    <div className="space-y-4">
      <button className="btn btn-ghost text-sm" onClick={() => nav('/lectura')}>← Todas las lecturas</button>
      <div className="card">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">{r.genre}</p>
            <h1 className="text-xl font-extrabold" lang="it">{r.title}</h1>
          </div>
          <ListenButton text={r.text} />
        </div>
        <GlossText text={r.text} glossary={r.glossary} />
        <Translation text={r.es} label="Ver traducción completa" />
      </div>
      {r.questions && r.questions.length > 0 && (
        <div className="card">
          <QuestionList questions={r.questions} answers={answers} checked={checked} onChange={(i, v) => setAnswers({ ...answers, [i]: v })} />
        </div>
      )}
      {r.match && (
        <div className="card">
          <MatchTaskView task={r.match} answers={matchA} checked={checked} onChange={(i, v) => setMatchA({ ...matchA, [i]: v })} />
        </div>
      )}
      {!checked ? (
        <button className="btn btn-primary w-full" onClick={check}>Corregir</button>
      ) : (
        <div className="card text-center">
          <p className="text-3xl font-extrabold text-green-600">{q.correct + m.correct} / {q.total + m.total}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={() => { setAnswers({}); setMatchA({}); setChecked(false); }}>Repetir</button>
            {next && <Link className="btn btn-primary flex-1" to={`/lectura/${next.id}`}>Siguiente texto</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
