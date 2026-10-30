import { Link } from 'react-router-dom';
import type { Topic } from '../types';
import { SECTION_LABEL, TOPIC_LABEL } from '../types';
import { dataOf, useProgress } from '../store/progress';
import { readiness, SECTIONS, PASS_MARK, totalStudyMs, vocabStats } from '../lib/stats';
import { weakTopics } from '../lib/plan';
import { addDays, dayKey, formatMinutes } from '../lib/dates';
import { LESSONS } from '../lib/content';
import { PageHeader, ProgressBar, Stat } from '../components/ui/ui';

export default function Stats() {
  const store = useProgress();
  const data = dataOf(store);
  const r = readiness(data);
  const v = vocabStats(data);
  const weak = weakTopics(data, 5);
  const days = Array.from({ length: 14 }, (_, i) => dayKey(addDays(Date.now(), i - 13)));
  const maxMs = Math.max(3 * 3600_000, ...days.map((d) => store.studyMsByDay[d] ?? 0));
  const topics = (Object.entries(store.topics) as [Topic, { correct: number; total: number }][]).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

  return (
    <div className="space-y-5">
      <PageHeader title="Progreso" subtitle="Cómo vas hacia el examen." />

      <div className="card">
        <p className="text-sm font-bold text-slate-500">Predicción de preparación</p>
        <div className="flex items-end gap-3">
          <p className="text-5xl font-extrabold text-green-600">{Math.round(r.score * 100)} %</p>
          <p className="pb-1 font-bold">{r.label}</p>
        </div>
        <ProgressBar value={r.score} className="mt-2" />
        <p className="mt-2 text-sm">{r.advice}</p>
        <p className="mt-1 text-xs text-slate-500">Combina tus aciertos por sección (simulacros pesan más), el diagnóstico y la cobertura de lecciones y vocabulario.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="⏱️" label="tiempo de estudio" value={formatMinutes(totalStudyMs(data))} />
        <Stat icon="🧠" label={`palabras dominadas de ${v.total}`} value={v.mastered} />
        <Stat icon="📘" label={`lecciones de ${LESSONS.length}`} value={Object.keys(store.lessons).length} />
        <Stat icon="🔥" label={`racha (mejor: ${store.streak.best})`} value={store.streak.current} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-extrabold">Horas por día (últimos 14 días)</h2>
        <div className="flex h-32 items-end gap-1">
          {days.map((d) => {
            const ms = store.studyMsByDay[d] ?? 0;
            return (
              <div key={d} className="flex flex-1 flex-col items-center justify-end" title={`${d}: ${formatMinutes(ms)}`}>
                <div className={`w-full rounded-t ${ms >= 2 * 3600_000 ? 'bg-green-500' : 'bg-sky-400'}`} style={{ height: `${(ms / maxMs) * 100}%`, minHeight: ms ? 3 : 0 }} />
                <span className="mt-1 text-[10px] text-slate-500">{d.slice(8)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-500">Verde: 2 h o más.</p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-extrabold">Aciertos por sección del examen</h2>
        {SECTIONS.map((s) => {
          const t = store.sections[s];
          const est = r.perSection[s];
          return (
            <div key={s}>
              <div className="flex justify-between text-sm">
                <span>{SECTION_LABEL[s]}</span>
                <span className="font-bold">{est !== undefined ? `${Math.round(est * 100)} %` : '—'} <span className="font-normal text-slate-500">({t ? `${t.correct}/${t.total}` : 'sin datos'})</span></span>
              </div>
              <ProgressBar value={est ?? 0} color={(est ?? 0) >= PASS_MARK ? 'bg-green-500' : 'bg-red-400'} />
            </div>
          );
        })}
      </div>

      <div className="card space-y-2">
        <h2 className="font-extrabold">Temas</h2>
        {weak.length > 0 && (
          <p className="text-sm">
            🎯 Temas débiles: {weak.map((t) => (
              <Link key={t} to={`/practica?tema=${t}`} className="chip mr-1 bg-red-100 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">{TOPIC_LABEL[t]} →</Link>
            ))}
          </p>
        )}
        {topics.length === 0 && <p className="text-sm text-slate-500">Aún sin datos.</p>}
        {topics.map(([t, x]) => (
          <div key={t}>
            <div className="flex justify-between text-sm"><span>{TOPIC_LABEL[t]}</span><span className="font-bold">{Math.round((x.correct / x.total) * 100)} % <span className="font-normal text-slate-500">({x.total})</span></span></div>
            <ProgressBar value={x.correct / x.total} color={x.correct / x.total < 0.7 ? 'bg-amber-400' : 'bg-green-500'} />
          </div>
        ))}
      </div>

      {store.exams.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-extrabold">Simulacros</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th>Fecha</th>{SECTIONS.map((s) => <th key={s} className="capitalize">{s.slice(0, 4)}</th>)}</tr></thead>
            <tbody>
              {store.exams.map((e, i) => (
                <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                  <td>{new Date(e.at).toLocaleDateString('es')}</td>
                  {SECTIONS.map((s) => <td key={s} className={(e.scores[s] ?? 0) >= PASS_MARK ? 'text-green-600' : 'text-red-500'}>{Math.round((e.scores[s] ?? 0) * 100)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
