import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Section, Topic } from '../types';
import { SECTION_LABEL, TOPIC_LABEL } from '../types';
import { DIAGNOSTIC } from '../lib/content';
import { useProgress, type DiagnosticResult } from '../store/progress';
import { LessonRunner } from '../components/LessonRunner';
import { PageHeader, ProgressBar } from '../components/ui/ui';

export default function Diagnostic() {
  const nav = useNavigate();
  const { diagnostic, setDiagnostic } = useProgress();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  if (running)
    return (
      <LessonRunner
        exercises={DIAGNOSTIC}
        title="Prueba diagnóstica"
        requeue={false}
        quiet
        onExit={() => setRunning(false)}
        onFinish={(s) => {
          const topics: Partial<Record<Topic, number>> = {};
          for (const [t, v] of Object.entries(s.perTopic)) topics[t as Topic] = v!.correct / v!.total;
          const sections: Partial<Record<Section, number>> = {};
          for (const [k, v] of Object.entries(s.perSection)) sections[k as Section] = v!.correct / v!.total;
          const d = { at: Date.now(), topics, sections, overall: s.total ? s.correct / s.total : 0 };
          setDiagnostic(d);
          setResult(d);
          setRunning(false);
        }}
      />
    );

  const shown = result ?? diagnostic;
  if (shown) {
    const sorted = (Object.entries(shown.topics) as [Topic, number][]).sort((a, b) => a[1] - b[1]);
    return (
      <div className="space-y-4">
        <PageHeader title="Resultado del diagnóstico" subtitle={`Aciertos globales: ${Math.round(shown.overall * 100)} %`} />
        <div className="card space-y-2">
          <h2 className="font-extrabold">Por tema</h2>
          {sorted.map(([t, v]) => (
            <div key={t}>
              <div className="flex justify-between text-sm"><span>{TOPIC_LABEL[t]}</span><span className="font-bold">{Math.round(v * 100)} %</span></div>
              <ProgressBar value={v} color={v < 0.5 ? 'bg-red-400' : v < 0.75 ? 'bg-amber-400' : 'bg-green-500'} />
            </div>
          ))}
        </div>
        <div className="card space-y-2">
          <h2 className="font-extrabold">Por sección del examen</h2>
          {(Object.entries(shown.sections) as [Section, number][]).map(([s, v]) => (
            <div key={s}>
              <div className="flex justify-between text-sm"><span>{SECTION_LABEL[s]}</span><span className="font-bold">{Math.round(v * 100)} %</span></div>
              <ProgressBar value={v} color={v < 0.6 ? 'bg-red-400' : 'bg-green-500'} />
            </div>
          ))}
        </div>
        <div className="card bg-green-50 dark:bg-green-950">
          <p>
            📅 Tu plan ya se ajustó: los temas por debajo del 75 % tendrán <b>bloques de refuerzo</b> diarios, y si una sección queda por debajo del 60 % le doy más tiempo.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex-1" onClick={() => setRunning(true)}>Repetir prueba</button>
          <Link to="/" className="btn btn-primary flex-1">Ver mi plan de hoy</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Prueba diagnóstica" subtitle={`${DIAGNOSTIC.length} preguntas · unos 15 minutos`} />
      <div className="card space-y-2">
        <p>Esta prueba mide qué recuerdas de cada tema A2: artículos, presente, irregulares, preposiciones, pasado, pronombres… además de escucha y lectura.</p>
        <p>No verás las respuestas correctas durante la prueba. <b>Responde sin ayuda</b>: si no sabes algo, intenta igual. Así el plan se ajusta a tu nivel real.</p>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={() => nav('/')}>Ahora no</button>
        <button className="btn btn-primary flex-1" onClick={() => setRunning(true)}>Empezar</button>
      </div>
    </div>
  );
}
