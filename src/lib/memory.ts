export interface AppMemory {
  lastActiveTab: string;
  lastViewedLapIndex: number;
  debriefNotes: Record<string, string>;
  preferences: {
    tempUnit: 'f' | 'c';
    chartHeight: 'compact' | 'normal' | 'expanded';
  };
  trackHistory: Array<{
    sessionId: string;
    track: string;
    date: string;
    bestLap: string;
    lapCount: number;
  }>;
  whoopBaselines: {
    restingHR: number | null;
    hrv: number | null;
    lastUpdated: string | null;
  };
}

export const DEFAULT_MEMORY: AppMemory = {
  lastActiveTab: 'overview',
  lastViewedLapIndex: 0,
  debriefNotes: {},
  preferences: { tempUnit: 'f', chartHeight: 'normal' },
  trackHistory: [],
  whoopBaselines: { restingHR: null, hrv: null, lastUpdated: null },
};

const DB_NAME = 'm3_dashboard';
const DB_VERSION = 1;
const STORE_NAME = 'memory';
const MEMORY_KEY = 'm3_memory_v1';

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source as object) as Array<keyof T>) {
    const s = source[key]; const t = target[key];
    if (s !== null && typeof s === 'object' && !Array.isArray(s) && t !== null && typeof t === 'object') {
      result[key] = deepMerge(t, s as Partial<typeof t>);
    } else if (s !== undefined) {
      result[key] = s as T[keyof T];
    }
  }
  return result;
}

export async function readMemory(): Promise<AppMemory> {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(MEMORY_KEY);
      req.onsuccess = () => resolve({ ...DEFAULT_MEMORY, ...(req.result ?? {}) });
      req.onerror = () => resolve(DEFAULT_MEMORY);
    });
  } catch { return DEFAULT_MEMORY; }
}

export async function writeMemory(patch: Partial<AppMemory>): Promise<void> {
  try {
    const current = await readMemory();
    const next = deepMerge(current, patch);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(next, MEMORY_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* silent */ }
}
