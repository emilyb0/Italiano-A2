import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dataOf, useProgress } from '../store/progress';
import { buildDayPlan, currentDay, PLAN_DAYS } from '../lib/plan';
import { dayKey, formatMinutes } from '../lib/dates';
import { isDue } from '../lib/srs';
import { readiness } from '../lib/stats';
import { ProgressBar } from '../components/ui/ui';

export default function Today() {
  const store = useProgress();
  const data = dataOf(store);
  const today = currentDay(store.startDate);
  const [day, setDay] = useState(today);
  const plan = buildDayPlan(day, data);
  const planKey = `d${day}`;
  const doneBlocks = store.plan[planKey] ?? [];
  const xpToday = store.xpByDay[dayKey()] ?? 0;
  const goal = store.settings.dailyGoalXp;
  const studied = store.studyMsByDay[dayKey()] ?? 0;
  const due = Object.values(store.cards).filter((c) => isDue(c)).length;
  const r = readiness(data);
  const doneMin = plan.blocks.filter((b) => doneBlocks.includes(b.id)).reduce((s, b) => s + b.minutes, 0);

  return (
    <div className="space-y-5">
      {!store.diagnostic && (
        <div className="card border-green-500 bg-green-50 dark:bg-green-950">
          <h2 className="text-xl font-extrabold">Benvenuta! 👋</h2>
          <p className="mt-1">Empieza con la <b>prueba diagnóstica</b> (unos 15 min). Con tus resultados ajusto el plan de 14 días a tus puntos débiles.</p>
          <Link to="/diagnostico" className="btn btn-primary mt-3">🧭 Hacer la prueba diagnóstica</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm font-bold text-slate-500">Meta diaria</p>
          <p className="text-2xl font-extrabold text-amber-500">{xpToday} / {goal} XP</p>
          <ProgressBar value={xpToday / goal} color="bg-amber-400" className="mt-2" />
          {xpToday >= goal && <p className="mt-1 text-sm font-bold text-green-600">🎉 ¡Meta cumplida!</p>}
        </div>
        <div className="card">
          <p className="text-sm font-bold text-slate-500">Estudiado hoy</p>
          <p className="text-2xl font-extrabold">{formatMinutes(studied)}</p>
          <ProgressBar value={studied / (150 * 60000)} className="mt-2" />
          <p className="mt-1 text-xs text-slate-500">Objetivo: 2–3 h</p>
        </div>
        <Link to="/estadisticas" className="card block">
          <p className="text-sm font-bold text-slate-500">Preparación para el examen</p>
          <p className="text-2xl font-extrabold text-green-600">{Math.round(r.score * 100)} %</p>
          <ProgressBar value={r.score} className="mt-2" />
          <p className="mt-1 text-xs text-slate-500">{r.label}</p>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn btn-ghost" disabled={day <= 1} onClick={() => setDay(day - 1)} aria-label="Día anterior">◀</button>
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{plan.phase}</p>
          <h1 className="text-2xl font-extrabold">Día {day} de {PLAN_DAYS}{day === today && ' · hoy'}</h1>
          <p className="text-slate-600 dark:text-slate-300">{plan.focus}</p>
        </div>
        <button className="btn btn-ghost" disabled={day >= PLAN_DAYS} onClick={() => setDay(day + 1)} aria-label="Día siguiente">▶</button>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-500">
          <span>Plan del día · {formatMinutes(plan.totalMinutes * 60000)}</span>
          <span>{doneMin} / {plan.totalMinutes} min</span>
        </div>
        <ProgressBar value={doneMin / plan.totalMinutes} />
        {store.settings.pomodoro && <p className="mt-1 text-xs text-slate-500">🍅 Usa el temporizador de arriba: bloques de 25 min con 5 min de descanso.</p>}
      </div>

      <ol className="space-y-3">
        {plan.blocks.map((b) => {
          const done = doneBlocks.includes(b.id);
          return (
            <li key={b.id} className={`card ${done ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => store.togglePlanBlock(planKey, b.id)}
                  className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
                  aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                >
                  {done && '✓'}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl">{b.icon}</span>
                    <h3 className="font-extrabold">{b.title}</h3>
                    <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{b.minutes} min</span>
                    {b.id === 'srs' && due > 0 && <span className="chip bg-red-500 text-white">{due} pendientes</span>}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{b.desc}</p>
                  {b.items && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {b.items.map((it) => (
                        <Link key={it.to + it.label} to={it.to} className={`chip py-1 ${it.done ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                          {it.done ? '✓ ' : ''}{it.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Link to={b.to} className="btn btn-primary shrink-0 px-3 py-2 text-sm">Empezar</Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
