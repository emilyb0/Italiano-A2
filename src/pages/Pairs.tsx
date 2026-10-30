import { useState } from 'react';
import type { Exercise } from '../types';
import { PAIRS } from '../lib/content';
import { sample } from '../lib/util';
import { LessonRunner } from '../components/LessonRunner';
import { ListenButton, PageHeader } from '../components/ui/ui';

function buildRound(): Exercise[] {
  return sample(PAIRS, 12).map((p) => ({
    type: 'minimal-pair',
    words: [p.a, p.b],
    target: Math.random() < 0.5 ? 0 : 1,
    es: [p.aEs, p.bEs],
    topic: 'trappole',
    explain: p.focus,
  }));
}

export default function Pairs() {
  const [round, setRound] = useState<Exercise[] | null>(null);
  if (round) return <LessonRunner exercises={round} title="Pares mínimos" defaultTopic="trappole" requeue={false} onExit={() => setRound(null)} onFinish={() => setRound(null)} />;
  const focuses = [...new Set(PAIRS.map((p) => p.focus))];
  return (
    <div>
      <PageHeader title="Pares mínimos" subtitle="Entrena el oído: dobles consonantes, gl, gn, sc, c/g ante e/i.">
        <button className="btn btn-primary" onClick={() => setRound(buildRound())}>Empezar (12 rondas)</button>
      </PageHeader>
      {focuses.map((f) => (
        <section key={f} className="mb-4">
          <h2 className="mb-2 font-extrabold">{f}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAIRS.filter((p) => p.focus === f).map((p) => (
              <div key={p.a + p.b} className="card flex items-center justify-between gap-2 p-3">
                <span className="flex items-center gap-1"><ListenButton text={p.a} size="sm" /> <b lang="it">{p.a}</b> <span className="text-xs text-slate-500">{p.aEs}</span></span>
                <span className="flex items-center gap-1"><ListenButton text={p.b} size="sm" /> <b lang="it">{p.b}</b> <span className="text-xs text-slate-500">{p.bEs}</span></span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
