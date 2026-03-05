import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '@/lib/sessionStore';
import type { SessionStore } from '@/lib/sessionStore';

const SESSION_KEY = (id: string) => `session:${id}`;
const MAX_SESSIONS = 10;

export interface PersistedSessionStore extends SessionStore {
  clearSavedSessions: () => void;
}

export function usePersistedSessions(): PersistedSessionStore {
  const store = useSessionStore();
  const rehydrated = useRef(false);

  // Rehydrate from individual session: keys on first mount
  useEffect(() => {
    if (rehydrated.current) return;
    rehydrated.current = true;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('session:'));
      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const session = JSON.parse(raw) as import('@/types/session').LoadedSession;
          // Only add if not already in store (store may have loaded from m3-sessions-v1)
          if (!store.sessions.some(s => s.id === session.id)) {
            store.addSession(session.filename, session.data);
          }
        } catch {
          // Corrupt entry — skip silently
        }
      }
    } catch {
      // localStorage unavailable
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // Wrap addSession to enforce cap and write individual keys
  const addSession = useCallback(
    (filename: string, data: import('@/types/session').SessionSummary) => {
      // Enforce cap: evict oldest by date if at limit
      if (store.sessions.length >= MAX_SESSIONS) {
        const sorted = [...store.sessions].sort(
          (a, b) =>
            new Date(a.data.header.date).getTime() -
            new Date(b.data.header.date).getTime()
        );
        const oldest = sorted[0];
        store.removeSession(oldest.id);
        try {
          localStorage.removeItem(SESSION_KEY(oldest.id));
        } catch { /* quota */ }
      }

      const result = store.addSession(filename, data);

      if (result.ok) {
        // Find the newly added session and persist it
        // It will be the last in the updated sessions array after next render
        // Use a microtask to read it after state update
        Promise.resolve().then(() => {
          try {
            const newSession = store.sessions.find(s =>
              s.data.header.date === data.header.date &&
              s.data.header.track === data.header.track
            );
            if (newSession) {
              localStorage.setItem(SESSION_KEY(newSession.id), JSON.stringify(newSession));
            }
          } catch { /* quota */ }
        });
      }

      return result;
    },
    [store]
  );

  const clearSavedSessions = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('session:'));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch { /* unavailable */ }
    store.clearAll();
  }, [store]);

  return { ...store, addSession, clearSavedSessions };
}
