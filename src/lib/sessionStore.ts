import { useState, useCallback, useEffect } from 'react';
import type { LoadedSession, SessionSummary } from '@/types/session';
import { makeSessionId, assignSessionColor, isValidSession } from '@/lib/utils';

const STORAGE_KEY = 'm3-sessions-v1';

export interface SessionStore {
  sessions: LoadedSession[];
  activeSessionIds: Set<string>;
  addSession: (filename: string, data: SessionSummary) => { ok: boolean; error?: string };
  removeSession: (id: string) => void;
  toggleActive: (id: string) => void;
  renameSession: (id: string, label: string) => void;
  clearAll: () => void;
  activeSessions: LoadedSession[];
}

export function useSessionStore(): SessionStore {
  const [sessions, setSessions] = useState<LoadedSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { sessions?: LoadedSession[] };
      return Array.isArray(parsed.sessions) ? parsed.sessions : [];
    } catch {
      return [];
    }
  });

  const [activeSessionIds, setActiveSessionIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as { activeIds?: string[] };
      return new Set(Array.isArray(parsed.activeIds) ? parsed.activeIds : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessions,
        activeIds: [...activeSessionIds],
      }));
    } catch {
      // storage quota exceeded or unavailable
    }
  }, [sessions, activeSessionIds]);

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

  const renameSession = useCallback((id: string, label: string) => {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, label: label.trim() || undefined } : s
    ));
  }, []);

  const clearAll = useCallback(() => {
    setSessions([]);
    setActiveSessionIds(new Set());
  }, []);

  const activeSessions = sessions.filter(s => activeSessionIds.has(s.id));

  return { sessions, activeSessionIds, addSession, removeSession, toggleActive, renameSession, clearAll, activeSessions };
}
