import { useState } from 'react';
import type { MonologueTopic, OralQuestion } from '../types';
import { MONOLOGUES, ORAL_QUESTIONS } from '../lib/content';
import { sample } from '../lib/util';
import { useProgress } from '../store/progress';
import { ListenButton, PageHeader, Translation } from '../components/ui/ui';
import { Monologue, RolePlay } from '../components/OralSim';
import { SttWarning } from '../components/ui/Speech';

/** Elige preguntas de temas distintos, empezando siempre por la presentación. */
export function pickRoleplay(n = 6): OralQuestion[] {
  const intro = ORAL_QUESTIONS.filter((q) => q.theme === 'presentazione');
  const others = ORAL_QUESTIONS.filter((q) => q.theme !== 'presentazione');
  const themes = [...new Set(others.map((q) => q.theme))];
  const picked = sample(themes, n - 1).map((t) => sample(others.filter((q) => q.theme === t), 1)[0]);
  return [...sample(intro, 1), ...picked].filter(Boolean);
}

export default function Oral() {
  const [mode, setMode] = useState<null | { kind: 'role'; qs: OralQuestion[] } | { kind: 'mono'; topic: MonologueTopic }>(null);
  const store = useProgress();
  const finish = (s: number) => {
    store.recordAnswer({ section: 'orale', correct: s >= 0.6 });
    store.markActivity(`oral:${Date.now()}`, s);
    store.addXp(25);
  };

  if (mode)
    return (
      <div className="mx-auto max-w-2xl">
        <button className="btn btn-ghost mb-2 text-sm" onClick={() => setMode(null)}>← Salir</button>
        {mode.kind === 'role' ? <RolePlay questions={mode.qs} onDone={finish} /> : <Monologue topic={mode.topic} onDone={finish} />}
      </div>
    );

  const themes = [...new Set(ORAL_QUESTIONS.map((q) => q.theme))];
  return (
    <div className="space-y-5">
      <PageHeader title="Produzione orale" subtitle="Unos 10 minutos en el examen: conversación con el examinador y un monólogo corto." />
      <SttWarning />
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="card text-left hover:border-green-400" onClick={() => setMode({ kind: 'role', qs: pickRoleplay() })}>
          <p className="text-3xl">🧑‍🏫</p>
          <p className="font-extrabold">Role play con el examinador</p>
          <p className="text-sm text-slate-500">6 preguntas típicas A2 por voz. Respondes hablando; al final ves la transcripción y una lista de verificación.</p>
        </button>
        <button className="card text-left hover:border-green-400" onClick={() => setMode({ kind: 'mono', topic: sample(MONOLOGUES, 1)[0] })}>
          <p className="text-3xl">🎙️</p>
          <p className="font-extrabold">Monólogo cronometrado</p>
          <p className="text-sm text-slate-500">Un tema o imagen, 1 minuto para preparar y 1,5–2 minutos para hablar.</p>
        </button>
      </div>
      <section>
        <h2 className="mb-2 text-lg font-extrabold">Banco de preguntas ({ORAL_QUESTIONS.length})</h2>
        <p className="mb-3 text-sm text-slate-500">Escucha la pregunta, responde en voz alta y compara con la respuesta modelo.</p>
        {themes.map((t) => (
          <details key={t} className="card mb-2">
            <summary className="cursor-pointer font-bold capitalize">{t}</summary>
            <ul className="mt-2 space-y-3">
              {ORAL_QUESTIONS.filter((q) => q.theme === t).map((q) => (
                <li key={q.id} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                  <div className="flex items-start gap-2"><ListenButton text={q.q} size="sm" /><p className="font-semibold" lang="it">{q.q}</p></div>
                  <Translation text={q.es} />
                  <details className="mt-1 text-sm">
                    <summary className="cursor-pointer text-green-700 dark:text-green-400">Respuesta modelo</summary>
                    <div className="flex items-start gap-2"><ListenButton text={q.sample} size="sm" /><p lang="it">{q.sample}</p></div>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <h2 className="mb-2 mt-5 text-lg font-extrabold">Temas de monólogo ({MONOLOGUES.length})</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {MONOLOGUES.map((m) => (
            <button key={m.id} className="card p-3 text-left hover:border-green-400" onClick={() => setMode({ kind: 'mono', topic: m })}>
              <span className="mr-2">{m.scene?.slice(0, 2) ?? '🎙️'}</span><b lang="it">{m.title}</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
