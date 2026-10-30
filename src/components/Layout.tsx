import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useProgress } from '../store/progress';
import { Pomodoro } from './Pomodoro';
import { isDue } from '../lib/srs';

const NAV = [
  { to: '/', label: 'Hoy', icon: '🏠' },
  { to: '/mapa', label: 'Lecciones', icon: '🗺️' },
  { to: '/repaso', label: 'Repaso', icon: '🔁' },
  { to: '/practicar', label: 'Práctica', icon: '🎯' },
  { to: '/estadisticas', label: 'Progreso', icon: '📊' },
];

const MORE = [
  { to: '/simulacro', label: 'Simulacros', icon: '⏱️' },
  { to: '/errores', label: 'Cuaderno de errores', icon: '📕' },
  { to: '/vocabulario', label: 'Vocabulario', icon: '🗂️' },
  { to: '/escucha', label: 'Escucha', icon: '🎧' },
  { to: '/lectura', label: 'Lectura', icon: '📖' },
  { to: '/escritura', label: 'Escritura', icon: '✍️' },
  { to: '/oral', label: 'Oral', icon: '🗣️' },
  { to: '/trampas', label: 'Trampas', icon: '⚠️' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];

/** Cuenta el tiempo de estudio activo (pestaña visible e interacción en los últimos 2 minutos). */
function useStudyTimer() {
  const addStudyTime = useProgress((s) => s.addStudyTime);
  const last = useRef(Date.now());
  useEffect(() => {
    const mark = () => (last.current = Date.now());
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last.current < 120_000) addStudyTime(15_000);
    }, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(id);
    };
  }, [addStudyTime]);
}

export function Layout() {
  useStudyTimer();
  const { streak, xp, hearts, settings, cards, saveOk } = useProgress();
  const due = Object.values(cards).filter((c) => isDue(c)).length;
  const loc = useLocation();
  const focusMode = /^\/(leccion|simulacro\/|diagnostico|practica$)/.test(loc.pathname);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r-2 border-slate-200 p-4 md:flex dark:border-slate-800">
        <div className="mb-4 px-2 text-2xl font-extrabold text-green-600">🇮🇹 Italiano A2</div>
        {[...NAV, ...MORE].map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 font-bold ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
            }
          >
            <span className="text-xl">{n.icon}</span>
            {n.label}
            {n.to === '/repaso' && due > 0 && <span className="chip ml-auto bg-red-500 text-white">{due}</span>}
          </NavLink>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-slate-200 bg-slate-50/90 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <span className="font-extrabold text-green-600 md:hidden">🇮🇹 A2</span>
          <span className="font-bold text-orange-500" title="Racha de días">🔥 {streak.current}</span>
          <span className="font-bold text-amber-500" title="Experiencia">⭐ {xp}</span>
          {settings.hearts && <span className="font-bold text-red-500" title="Corazones">❤️ {hearts}</span>}
          <div className="ml-auto flex items-center gap-2">
            {settings.pomodoro && <Pomodoro />}
            <NavLink to="/ajustes" className="text-xl md:hidden" aria-label="Ajustes">⚙️</NavLink>
          </div>
        </header>
        {!saveOk && (
          <div className="bg-red-600 px-4 py-2 text-sm text-white">
            ⚠️ No se puede guardar el progreso en este navegador (¿modo privado?). Exporta tu progreso desde Ajustes para no perderlo.
          </div>
        )}
        <main className={`mx-auto w-full max-w-4xl flex-1 px-4 pt-5 ${focusMode ? 'pb-6' : 'pb-28 md:pb-10'}`}>
          <Outlet />
        </main>
        {!focusMode && (
          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => `relative flex flex-1 flex-col items-center py-2 text-xs font-bold ${isActive ? 'text-green-600' : 'text-slate-500'}`}
              >
                <span className="text-2xl">{n.icon}</span>
                {n.label}
                {n.to === '/repaso' && due > 0 && <span className="chip absolute right-3 top-1 bg-red-500 px-1.5 text-[10px] text-white">{due}</span>}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
