import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useProgress } from './store/progress';
import Today from './pages/Today';
import Diagnostic from './pages/Diagnostic';
import MapPage from './pages/MapPage';
import LessonPage from './pages/LessonPage';
import Review from './pages/Review';
import Errors from './pages/Errors';
import Vocab from './pages/Vocab';
import Practice, { PracticeHub } from './pages/Practice';
import Listening from './pages/Listening';
import Shadowing from './pages/Shadowing';
import Pairs from './pages/Pairs';
import Reading from './pages/Reading';
import Writing from './pages/Writing';
import Oral from './pages/Oral';
import Traps from './pages/Traps';
import ExamPage from './pages/ExamPage';
import Stats from './pages/Stats';
import SettingsPage from './pages/SettingsPage';

function useTheme() {
  const theme = useProgress((s) => s.settings.theme);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    try {
      localStorage.setItem('ita-theme', JSON.stringify(theme));
    } catch {
      /* sin localStorage */
    }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const loaded = useProgress((s) => s.loaded);
  const init = useProgress((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  useTheme();
  if (!loaded) return <div className="flex min-h-screen items-center justify-center text-4xl">🇮🇹</div>;
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="diagnostico" element={<Diagnostic />} />
          <Route path="mapa" element={<MapPage />} />
          <Route path="leccion/:id" element={<LessonPage />} />
          <Route path="repaso" element={<Review />} />
          <Route path="errores" element={<Errors />} />
          <Route path="vocabulario" element={<Vocab />} />
          <Route path="vocabulario/:topic" element={<Vocab />} />
          <Route path="practicar" element={<PracticeHub />} />
          <Route path="practica" element={<Practice />} />
          <Route path="escucha" element={<Listening />} />
          <Route path="escucha/:id" element={<Listening />} />
          <Route path="shadowing" element={<Shadowing />} />
          <Route path="pares" element={<Pairs />} />
          <Route path="lectura" element={<Reading />} />
          <Route path="lectura/:id" element={<Reading />} />
          <Route path="escritura" element={<Writing />} />
          <Route path="escritura/:id" element={<Writing />} />
          <Route path="oral" element={<Oral />} />
          <Route path="trampas" element={<Traps />} />
          <Route path="simulacro" element={<ExamPage />} />
          <Route path="simulacro/:id" element={<ExamPage />} />
          <Route path="estadisticas" element={<Stats />} />
          <Route path="ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Today />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
