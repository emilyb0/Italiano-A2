// Estado global del progreso del usuario, persistido automáticamente.
import { create } from 'zustand';
import type { Section, Topic } from '../types';
import { newCard, review, type CardState, type Grade } from '../lib/srs';
import { dayKey, addDays } from '../lib/dates';
import { loadState, saveState } from '../lib/storage';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
  hearts: boolean;
  dailyGoalXp: number;
  newCardsPerDay: number;
  rate: number;
  slowRate: number;
  voiceURI?: string;
  pomodoro: boolean;
}

export interface ErrorEntry {
  id: string;
  at: number;
  prompt: string;
  expected: string;
  given: string;
  explain?: string;
  topic?: Topic;
  section?: Section;
  count: number;
  resolved: boolean;
}

export interface Tally {
  correct: number;
  total: number;
}

export interface ExamResult {
  examId: string;
  at: number;
  /** puntaje por sección en 0..1 */
  scores: Partial<Record<Section, number>>;
}

export interface DiagnosticResult {
  at: number;
  topics: Partial<Record<Topic, number>>;
  sections: Partial<Record<Section, number>>;
  overall: number;
}

export interface ProgressData {
  version: 1;
  startDate: string | null;
  diagnostic: DiagnosticResult | null;
  settings: Settings;
  xp: number;
  xpByDay: Record<string, number>;
  streak: { current: number; best: number; lastDay: string | null };
  hearts: number;
  heartsAt: number;
  lessons: Record<string, { best: number; at: number }>;
  cards: Record<string, CardState>;
  newCardsByDay: Record<string, number>;
  errors: ErrorEntry[];
  studyMsByDay: Record<string, number>;
  sections: Partial<Record<Section, Tally>>;
  topics: Partial<Record<Topic, Tally>>;
  exams: ExamResult[];
  activities: Record<string, { score: number; at: number }>;
  plan: Record<string, string[]>;
}

export const MAX_HEARTS = 5;
const HEART_MS = 30 * 60 * 1000;

export const defaultData = (): ProgressData => ({
  version: 1,
  startDate: null,
  diagnostic: null,
  settings: {
    theme: 'system',
    hearts: false,
    dailyGoalXp: 150,
    newCardsPerDay: 30,
    rate: 0.95,
    slowRate: 0.65,
    pomodoro: true,
  },
  xp: 0,
  xpByDay: {},
  streak: { current: 0, best: 0, lastDay: null },
  hearts: MAX_HEARTS,
  heartsAt: Date.now(),
  lessons: {},
  cards: {},
  newCardsByDay: {},
  errors: [],
  studyMsByDay: {},
  sections: {},
  topics: {},
  exams: [],
  activities: {},
  plan: {},
});

interface Actions {
  loaded: boolean;
  saveOk: boolean;
  init: () => Promise<void>;
  setSettings: (s: Partial<Settings>) => void;
  addXp: (n: number) => void;
  recordAnswer: (a: { section?: Section; topic?: Topic; correct: boolean }) => void;
  logError: (e: Omit<ErrorEntry, 'id' | 'at' | 'count' | 'resolved'>) => void;
  resolveError: (id: string, ok: boolean) => void;
  deleteError: (id: string) => void;
  introduceCards: (ids: string[]) => void;
  gradeCard: (id: string, g: Grade) => void;
  completeLesson: (id: string, score: number) => void;
  addStudyTime: (ms: number) => void;
  loseHeart: () => void;
  regenHearts: () => void;
  setDiagnostic: (d: DiagnosticResult) => void;
  saveExam: (r: ExamResult) => void;
  markActivity: (id: string, score: number) => void;
  togglePlanBlock: (day: string, block: string) => void;
  importData: (d: unknown) => boolean;
  reset: () => void;
}

export type Store = ProgressData & Actions;

export function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function bump(t: Tally | undefined, correct: boolean): Tally {
  return { correct: (t?.correct ?? 0) + (correct ? 1 : 0), total: (t?.total ?? 0) + 1 };
}

export function dataOf(s: Store): ProgressData {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (typeof v !== 'function' && k !== 'loaded' && k !== 'saveOk') out[k] = v;
  return out as unknown as ProgressData;
}

export function isValidData(d: unknown): d is ProgressData {
  return !!d && typeof d === 'object' && (d as ProgressData).version === 1 && typeof (d as ProgressData).cards === 'object';
}

export const useProgress = create<Store>((set, get) => ({
  ...defaultData(),
  loaded: false,
  saveOk: true,

  init: async () => {
    const saved = await loadState<ProgressData>();
    if (isValidData(saved)) {
      const base = defaultData();
      set({ ...base, ...saved, settings: { ...base.settings, ...saved.settings }, loaded: true });
    } else set({ loaded: true });
    get().regenHearts();
  },

  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

  addXp: (n) =>
    set((st) => {
      const today = dayKey();
      const yesterday = dayKey(addDays(Date.now(), -1));
      let { current, best, lastDay } = st.streak;
      if (lastDay !== today) {
        current = lastDay === yesterday ? current + 1 : 1;
        lastDay = today;
        best = Math.max(best, current);
      }
      return {
        xp: st.xp + n,
        xpByDay: { ...st.xpByDay, [today]: (st.xpByDay[today] ?? 0) + n },
        streak: { current, best, lastDay },
        startDate: st.startDate ?? today,
      };
    }),

  recordAnswer: ({ section, topic, correct }) =>
    set((st) => ({
      sections: section ? { ...st.sections, [section]: bump(st.sections[section], correct) } : st.sections,
      topics: topic ? { ...st.topics, [topic]: bump(st.topics[topic], correct) } : st.topics,
    })),

  logError: (e) =>
    set((st) => {
      const id = hashId(e.prompt + '→' + e.expected);
      const existing = st.errors.find((x) => x.id === id);
      const errors = existing
        ? st.errors.map((x) => (x.id === id ? { ...x, ...e, at: Date.now(), count: x.count + 1, resolved: false } : x))
        : [{ ...e, id, at: Date.now(), count: 1, resolved: false }, ...st.errors].slice(0, 1500);
      const cid = 'err:' + id;
      const cards = { ...st.cards };
      // El error entra al SRS para que vuelva a aparecer pronto.
      cards[cid] = cards[cid] ? { ...cards[cid], due: Date.now() } : newCard(cid);
      return { errors, cards };
    }),

  resolveError: (id, ok) =>
    set((st) => ({
      errors: st.errors.map((x) => (x.id === id ? { ...x, resolved: ok, count: ok ? x.count : x.count + 1 } : x)),
    })),

  deleteError: (id) =>
    set((st) => {
      const cards = { ...st.cards };
      delete cards['err:' + id];
      return { errors: st.errors.filter((x) => x.id !== id), cards };
    }),

  introduceCards: (ids) =>
    set((st) => {
      const cards = { ...st.cards };
      const now = Date.now();
      for (const id of ids) if (!cards[id]) cards[id] = newCard(id, now);
      return { cards };
    }),

  gradeCard: (id, g) =>
    set((st) => {
      const card = st.cards[id] ?? newCard(id);
      const isNew = card.reps === 0 && card.lapses === 0 && !card.last;
      const today = dayKey();
      return {
        cards: { ...st.cards, [id]: review(card, g) },
        newCardsByDay: isNew ? { ...st.newCardsByDay, [today]: (st.newCardsByDay[today] ?? 0) + 1 } : st.newCardsByDay,
      };
    }),

  completeLesson: (id, score) =>
    set((st) => ({
      lessons: { ...st.lessons, [id]: { best: Math.max(score, st.lessons[id]?.best ?? 0), at: Date.now() } },
    })),

  addStudyTime: (ms) =>
    set((st) => {
      const today = dayKey();
      return { studyMsByDay: { ...st.studyMsByDay, [today]: (st.studyMsByDay[today] ?? 0) + ms } };
    }),

  loseHeart: () => {
    if (!get().settings.hearts) return;
    get().regenHearts();
    set((st) => ({ hearts: Math.max(0, st.hearts - 1), heartsAt: st.hearts === MAX_HEARTS ? Date.now() : st.heartsAt }));
  },

  regenHearts: () =>
    set((st) => {
      if (st.hearts >= MAX_HEARTS) return { heartsAt: Date.now() };
      const gained = Math.floor((Date.now() - st.heartsAt) / HEART_MS);
      if (gained <= 0) return {};
      return { hearts: Math.min(MAX_HEARTS, st.hearts + gained), heartsAt: st.heartsAt + gained * HEART_MS };
    }),

  setDiagnostic: (d) => set((st) => ({ diagnostic: d, startDate: st.startDate ?? dayKey() })),

  saveExam: (r) => set((st) => ({ exams: [...st.exams, r] })),

  markActivity: (id, score) =>
    set((st) => ({
      activities: { ...st.activities, [id]: { score: Math.max(score, st.activities[id]?.score ?? 0), at: Date.now() } },
    })),

  togglePlanBlock: (day, block) =>
    set((st) => {
      const cur = st.plan[day] ?? [];
      const next = cur.includes(block) ? cur.filter((b) => b !== block) : [...cur, block];
      return { plan: { ...st.plan, [day]: next } };
    }),

  importData: (d) => {
    if (!isValidData(d)) return false;
    const base = defaultData();
    set({ ...base, ...d, settings: { ...base.settings, ...d.settings } });
    return true;
  },

  reset: () => set({ ...defaultData() }),
}));

// Guardado automático (con pequeña espera para agrupar cambios).
let timer: ReturnType<typeof setTimeout> | undefined;
useProgress.subscribe((s) => {
  if (!s.loaded) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const ok = await saveState(dataOf(useProgress.getState()));
    if (ok !== useProgress.getState().saveOk) useProgress.setState({ saveOk: ok });
  }, 400);
});

// Guardado inmediato al cerrar u ocultar la pestaña.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    const s = useProgress.getState();
    if (s.loaded) void saveState(dataOf(s));
  });
}

export function heartsAvailable(s: Store): boolean {
  return !s.settings.hearts || s.hearts > 0;
}
