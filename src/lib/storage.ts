// Persistencia: IndexedDB (idb-keyval) con respaldo en localStorage y, si todo falla, memoria.
import { get, set } from 'idb-keyval';

const KEY = 'italiano-a2-progress';
export type StorageKind = 'indexeddb' | 'localStorage' | 'memory';
let kind: StorageKind = 'indexeddb';
let memory: unknown = null;

export function storageKind(): StorageKind {
  return kind;
}

export async function loadState<T>(): Promise<T | null> {
  try {
    const v = await get<T>(KEY);
    if (v) return v;
  } catch {
    kind = 'localStorage';
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    kind = 'memory';
  }
  return (memory as T) ?? null;
}

export async function saveState<T>(state: T): Promise<boolean> {
  memory = state;
  if (kind === 'indexeddb') {
    try {
      await set(KEY, state);
      return true;
    } catch {
      kind = 'localStorage';
    }
  }
  if (kind === 'localStorage') {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      kind = 'memory';
    }
  }
  return false;
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
