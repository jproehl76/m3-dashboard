import { useState, useCallback } from 'react';
import type { LoadedSession, SessionSummary } from '@/types/session';
import { makeSessionId, assignSessionColor, isValidSession } from '@/lib/utils';

export interface SessionStore {
  sessions: LoadedSession[];
  activeSessionIds: Set<string>;
  addSession: (filename: string, data: SessionSummary) => { ok: boolean; error?: string };
  removeSession: (id: string) => void;
  toggleActive: (id: string) => void;
  clearAll: () => void;
  activeSessions: LoadedSession[];
}

export function useSessionStore(): SessionStore {
  const [sessions, setSessions] = useState<LoadedSession[]>([]);
  const [activeSessionIds, setActiveSessionIds] = useState<Set<string>>(new Set());

  const addSession = useCallback((filename: string, data: unknown): { ok: boolean; error?: string } => {
    if (!isValidSession(data)) {
      return { ok: false, error: 'File does not appear to be a valid session summary JSON.' };
    }

    const id = makeSessionId(data);

    if (sessions.some(s => s.id === id)) {
      return { ok: false, error: `Session "${id}" is already loaded.` };
    }

    const color = assignSessionColor(sessions.length);
    const loaded: LoadedSession = { id, filename, color, data };

    setSessions(prev => [...prev, loaded]);
    setActiveSessionIds(prev => new Set([...prev, id]));

    return { ok: true };
  }, [sessions]);

  const removeSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setActiveSessionIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleActive = useCallback((id: string) => {
    setActiveSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSessions([]);
    setActiveSessionIds(new Set());
  }, []);

  const activeSessions = sessions.filter(s => activeSessionIds.has(s.id));

  return { sessions, activeSessionIds, addSession, removeSession, toggleActive, clearAll, activeSessions };
}
