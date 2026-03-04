import { useState } from 'react';
import { X, Eye, EyeOff, Pencil, Check } from 'lucide-react';
import type { LoadedSession } from '@/types/session';
import { sessionLabel } from '@/lib/utils';

interface SessionListProps {
  sessions: LoadedSession[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onClearAll: () => void;
}

export function SessionList({ sessions, activeIds, onToggle, onRemove, onRename, onClearAll }: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (sessions.length === 0) return null;

  const startEdit = (session: LoadedSession) => {
    setEditingId(session.id);
    setEditValue(session.label ?? sessionLabel(session));
  };

  const commitEdit = (id: string) => {
    onRename(id, editValue);
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Sessions ({sessions.length})
        </p>
        <button
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          Clear all
        </button>
      </div>

      {sessions.map((session) => {
        const isActive = activeIds.has(session.id);
        const isEditing = editingId === session.id;

        return (
          <div
            key={session.id}
            className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 border border-slate-700/50"
          >
            <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: session.color }} />

            {isEditing ? (
              <input
                className="flex-1 min-w-0 text-xs bg-slate-700 text-slate-100 rounded px-1 py-0.5 outline-none border border-blue-500"
                value={editValue}
                autoFocus
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit(session.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(session.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span className={`flex-1 min-w-0 text-xs truncate ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                {sessionLabel(session)}
              </span>
            )}

            <button
              onClick={() => isEditing ? commitEdit(session.id) : startEdit(session)}
              className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors"
              title={isEditing ? 'Save name' : 'Rename session'}
            >
              {isEditing ? <Check size={14} /> : <Pencil size={14} />}
            </button>

            <button
              onClick={() => onToggle(session.id)}
              className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors"
              title={isActive ? 'Hide session' : 'Show session'}
            >
              {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            <button
              onClick={() => onRemove(session.id)}
              className="shrink-0 text-slate-500 hover:text-red-400 transition-colors"
              title="Remove session"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
