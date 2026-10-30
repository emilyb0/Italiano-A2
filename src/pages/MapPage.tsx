import { Link } from 'react-router-dom';
import { UNITS } from '../lib/content';
import { isUnlocked } from '../lib/lessons';
import { useProgress } from '../store/progress';
import { PageHeader, ProgressBar } from '../components/ui/ui';

const OFFSETS = [0, 40, 60, 40, 0, -40, -60, -40];

export default function MapPage() {
  const lessons = useProgress((s) => s.lessons);
  const doneIds = Object.keys(lessons);
  const total = UNITS.reduce((s, u) => s + u.lessons.length, 0);
  let k = 0;
  return (
    <div>
      <PageHeader title="Mapa de lecciones" subtitle={`${doneIds.length} de ${total} lecciones completadas`} />
      <ProgressBar value={doneIds.length / Math.max(1, total)} className="mb-6" />
      <div className="space-y-8">
        {UNITS.map((u) => {
          const done = u.lessons.filter((l) => lessons[l.id]).length;
          return (
            <section key={u.id}>
              <div className={`rounded-3xl p-4 text-white ${done === u.lessons.length ? 'bg-amber-500' : 'bg-green-600'}`}>
                <p className="text-sm font-bold uppercase opacity-80">Unidad {u.order}</p>
                <h2 className="text-xl font-extrabold">{u.emoji} {u.title}</h2>
                <p className="text-sm opacity-90">{u.description}</p>
                <p className="mt-1 text-sm font-bold">{done}/{u.lessons.length}</p>
              </div>
              <div className="mt-4 flex flex-col items-center gap-4">
                {u.lessons.map((l) => {
                  const unlocked = isUnlocked(l.id, doneIds);
                  const isDone = !!lessons[l.id];
                  const offset = OFFSETS[k++ % OFFSETS.length];
                  const circle = (
                    <div className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold ${
                          isDone
                            ? 'bg-amber-400 text-white shadow-[0_5px_0_#d97706]'
                            : unlocked
                              ? 'bg-green-500 text-white shadow-[0_5px_0_#15803d] animate-pulse'
                              : 'bg-slate-200 text-slate-400 shadow-[0_5px_0_#cbd5e1] dark:bg-slate-800 dark:shadow-[0_5px_0_#1e293b]'
                        }`}
                      >
                        {isDone ? '★' : unlocked ? '▶' : '🔒'}
                      </div>
                      <span className={`mt-2 max-w-48 text-center text-sm font-bold ${unlocked ? '' : 'text-slate-400'}`}>{l.title}</span>
                    </div>
                  );
                  return unlocked ? (
                    <Link key={l.id} to={`/leccion/${l.id}`}>{circle}</Link>
                  ) : (
                    <div key={l.id} title="Completa la lección anterior para desbloquear">{circle}</div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
