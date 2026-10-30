import { Link } from 'react-router-dom';
import { GRAMMAR, UNITS, VOCAB } from '../lib/content';
import { useProgress } from '../store/progress';
import { ListenButton, PageHeader } from '../components/ui/ui';
import { Md } from '../components/ui/Md';

export default function Traps() {
  const lessons = useProgress((s) => s.lessons);
  const notes = GRAMMAR.filter((g) => g.topic === 'trappole');
  const falsi = VOCAB.filter((v) => v.topic === 'falsi-amici');
  const unit = UNITS.find((u) => u.id === 'u12');
  return (
    <div className="space-y-5">
      <PageHeader title="Trampas para hispanohablantes" subtitle="Lo que más falla cuando el español «ayuda» demasiado.">
        <Link to="/pares" className="btn btn-primary">👂 Pares mínimos</Link>
      </PageHeader>
      {unit && (
        <div className="card">
          <h2 className="mb-2 font-extrabold">Lecciones de la unidad {unit.order}</h2>
          <div className="flex flex-wrap gap-2">
            {unit.lessons.map((l) => (
              <Link key={l.id} to={`/leccion/${l.id}`} className={`chip py-1.5 ${lessons[l.id] ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {lessons[l.id] ? '★ ' : ''}{l.title}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <h2 className="mb-2 font-extrabold">⚠️ Falsos amigos</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {falsi.map((v) => (
            <div key={v.id} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="flex items-center gap-2"><ListenButton text={v.it.split('|')[0]} size="sm" /><b lang="it">{v.it}</b> = {v.es}</div>
              {v.note && <p className="text-xs text-red-600 dark:text-red-400">{v.note}</p>}
            </div>
          ))}
        </div>
      </div>
      {notes.map((g) => (
        <div key={g.id} className="card">
          <h2 className="mb-2 font-extrabold">{g.title}</h2>
          <Md text={g.body} />
          <div className="mt-3 space-y-1">
            {g.examples.map(([it, es]) => (
              <div key={it} className="flex items-start gap-2 text-sm"><ListenButton text={it} size="sm" /><span><b lang="it">{it}</b> — {es}</span></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
