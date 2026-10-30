import { useEffect, useRef, useState } from 'react';
import { dataOf, useProgress, type Theme } from '../store/progress';
import { downloadJSON, storageKind } from '../lib/storage';
import { italianVoices, recordSupported, speak, sttSupported, ttsSupported } from '../lib/speech';
import { dayKey } from '../lib/dates';
import { PageHeader } from '../components/ui/ui';

export default function SettingsPage() {
  const store = useProgress();
  const s = store.settings;
  const [voices, setVoices] = useState(italianVoices());
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setVoices(italianVoices()), 500);
    return () => clearTimeout(t);
  }, []);

  const row = 'flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800';
  return (
    <div className="space-y-5">
      <PageHeader title="Ajustes" />
      <div className="card">
        <div className={row}>
          <span className="font-bold">Tema</span>
          <div className="flex gap-1">
            {(['system', 'light', 'dark'] as Theme[]).map((t) => (
              <button key={t} onClick={() => store.setSettings({ theme: t })} className={`chip px-3 py-1.5 ${s.theme === t ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
                {t === 'system' ? 'Sistema' : t === 'light' ? '☀️ Claro' : '🌙 Oscuro'}
              </button>
            ))}
          </div>
        </div>
        <label className={row}>
          <span><b>Vidas (corazones)</b><br /><span className="text-sm text-slate-500">Pierdes uno por error en lecciones; se recargan cada 30 min.</span></span>
          <input type="checkbox" className="h-6 w-6 accent-green-600" checked={s.hearts} onChange={(e) => store.setSettings({ hearts: e.target.checked })} />
        </label>
        <label className={row}>
          <span><b>Temporizador Pomodoro</b><br /><span className="text-sm text-slate-500">25 min de trabajo + 5 de descanso.</span></span>
          <input type="checkbox" className="h-6 w-6 accent-green-600" checked={s.pomodoro} onChange={(e) => store.setSettings({ pomodoro: e.target.checked })} />
        </label>
        <label className={row}>
          <span className="font-bold">Meta diaria de XP</span>
          <select className="rounded-xl border-2 border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900" value={s.dailyGoalXp} onChange={(e) => store.setSettings({ dailyGoalXp: Number(e.target.value) })}>
            {[50, 100, 150, 250, 400].map((x) => <option key={x} value={x}>{x} XP</option>)}
          </select>
        </label>
        <label className={row}>
          <span><b>Tarjetas nuevas por día (SRS)</b><br /><span className="text-sm text-slate-500">30 al día ≈ 400 palabras en 14 días.</span></span>
          <select className="rounded-xl border-2 border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900" value={s.newCardsPerDay} onChange={(e) => store.setSettings({ newCardsPerDay: Number(e.target.value) })}>
            {[10, 20, 30, 40, 60].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      </div>

      <div className="card">
        <h2 className="mb-1 font-extrabold">Voz</h2>
        <p className="text-sm">
          Síntesis: {ttsSupported ? '✅' : '❌'} · Reconocimiento de voz: {sttSupported ? '✅' : '❌ (usa Chrome)'} · Grabación: {recordSupported ? '✅' : '❌'}
        </p>
        <div className={row}>
          <span className="font-bold">Voz italiana</span>
          <select className="max-w-60 rounded-xl border-2 border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900" value={s.voiceURI ?? ''} onChange={(e) => store.setSettings({ voiceURI: e.target.value || undefined })}>
            <option value="">Automática</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
          </select>
        </div>
        {voices.length === 0 && ttsSupported && <p className="text-sm text-amber-600">No se encontraron voces italianas. En Windows: Configuración → Hora e idioma → Voz → Agregar voces → Italiano. Chrome incluye «Google italiano».</p>}
        <label className={row}>
          <span className="font-bold">Velocidad normal: {s.rate.toFixed(2)}</span>
          <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => store.setSettings({ rate: Number(e.target.value) })} />
        </label>
        <label className={row}>
          <span className="font-bold">Velocidad lenta: {s.slowRate.toFixed(2)}</span>
          <input type="range" min={0.4} max={0.9} step={0.05} value={s.slowRate} onChange={(e) => store.setSettings({ slowRate: Number(e.target.value) })} />
        </label>
        <button className="btn btn-secondary mt-2" onClick={() => speak('Ciao! Questa è la voce che userai per studiare. Buono studio!', { rate: s.rate, voiceURI: s.voiceURI })}>🔊 Probar voz</button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-extrabold">Tu progreso</h2>
        <p className="text-sm text-slate-500">
          Se guarda automáticamente en este navegador ({storageKind() === 'indexeddb' ? 'IndexedDB' : storageKind() === 'localStorage' ? 'localStorage' : '⚠️ solo memoria'}).
          Exporta una copia para pasarla a otro dispositivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => downloadJSON(dataOf(store), `italiano-a2-progreso-${dayKey()}.json`)}>⬇️ Exportar progreso</button>
          <button className="btn btn-secondary" onClick={() => file.current?.click()}>⬆️ Importar progreso</button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const ok = store.importData(JSON.parse(await f.text()));
                setMsg(ok ? '✅ Progreso importado.' : '❌ El archivo no es un progreso válido de esta app.');
              } catch {
                setMsg('❌ No se pudo leer el archivo.');
              }
              e.target.value = '';
            }}
          />
        </div>
        {msg && <p className="text-sm font-bold">{msg}</p>}
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm('¿Borrar TODO tu progreso? Esta acción no se puede deshacer. (Exporta antes si quieres conservarlo.)')) {
              store.reset();
              setMsg('Progreso borrado.');
            }
          }}
        >
          🗑️ Borrar progreso
        </button>
      </div>
    </div>
  );
}
