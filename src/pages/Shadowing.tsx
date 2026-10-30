import { useState } from 'react';
import { LISTENING, VOCAB } from '../lib/content';
import { sample } from '../lib/util';
import { countWords } from '../lib/util';
import { useProgress } from '../store/progress';
import { ListenButton, PageHeader, ProgressBar, Translation } from '../components/ui/ui';
import { RepeatPractice } from '../components/ui/Speech';

interface Sentence {
  it: string;
  es?: string;
}

function pool(source: 'chunks' | 'dialoghi'): Sentence[] {
  if (source === 'chunks')
    return [
      ...VOCAB.filter((v) => v.topic === 'chunks').map((v) => ({ it: v.it.split('|')[0], es: v.es })),
      ...VOCAB.filter((v) => v.ex).map((v) => ({ it: v.ex!, es: v.exEs })),
    ];
  return LISTENING.flatMap((l) => l.lines.filter((x) => countWords(x.t) >= 4 && countWords(x.t) <= 16).map((x) => ({ it: x.t })));
}

export default function Shadowing() {
  const [source, setSource] = useState<'chunks' | 'dialoghi'>('chunks');
  const [list, setList] = useState<Sentence[] | null>(null);
  const [i, setI] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [score, setScore] = useState<boolean | null>(null);
  const store = useProgress();

  if (!list)
    return (
      <div>
        <PageHeader title="Shadowing" subtitle="Escucha una frase, repítela en voz alta imitando ritmo y entonación, y compara." />
        <div className="card space-y-3">
          <p>Técnica: 1) escucha a velocidad normal, 2) escucha lento si hace falta, 3) repite <b>sin mirar el texto</b> si puedes, 4) revisa las palabras en rojo y repite.</p>
          <div className="flex gap-2">
            {(['chunks', 'dialoghi'] as const).map((s) => (
              <button key={s} onClick={() => setSource(s)} className={`chip px-3 py-1.5 ${source === s ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                {s === 'chunks' ? 'Frases útiles y ejemplos' : 'Líneas de los diálogos'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary w-full" onClick={() => { setList(sample(pool(source), 10)); setI(0); }}>Empezar (10 frases)</button>
        </div>
      </div>
    );

  if (i >= list.length)
    return (
      <div className="py-10 text-center">
        <p className="text-6xl">🦜</p>
        <h2 className="mt-2 text-2xl font-extrabold">¡Bravissima!</h2>
        <button className="btn btn-primary mt-4" onClick={() => { store.addXp(15); setList(null); }}>Terminar</button>
      </div>
    );

  const s = list[i];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost px-2" onClick={() => setList(null)}>✕</button>
        <ProgressBar value={i / list.length} />
      </div>
      <div className="card space-y-4 text-center">
        <div className="flex justify-center"><ListenButton key={i} text={s.it} size="lg" autoPlay /></div>
        <p className="text-xl font-semibold" lang="it">{s.it}</p>
        <Translation text={s.es} />
        <RepeatPractice
          key={`${i}-${attempt}`}
          text={s.it}
          onResult={(r) => {
            setScore(r.correct);
            store.recordAnswer({ section: 'orale', correct: r.correct });
          }}
        />
        {score !== null && (
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={() => { setAttempt(attempt + 1); setScore(null); }}>🔁 Otra vez</button>
            <button className="btn btn-primary flex-1" onClick={() => { setI(i + 1); setScore(null); }}>Siguiente</button>
          </div>
        )}
        {score === null && <button className="btn btn-ghost text-sm" onClick={() => setI(i + 1)}>Saltar</button>}
      </div>
    </div>
  );
}
