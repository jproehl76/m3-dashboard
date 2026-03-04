import { X, Eye, EyeOff } from 'lucide-react';
import type { LoadedSession } from '@/types/session';
import { sessionLabel } from '@/lib/utils';

interface SessionListProps {
  sessions: LoadedSession[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function SessionList({ sessions, activeIds, onToggle, onRemove, onClearAll }: SessionListProps) {
  if (sessions.length === 0) return null;

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
        return (
          <div
            key={session.id}
            className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 border border-slate-700/50"
          >
            {/* Color swatch */}
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: session.color }}
            />

            {/* Label */}
            <span className={`flex-1 text-xs truncate ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
              {sessionLabel(session)}
            </span>

            {/* Toggle visibility */}
            <button
              onClick={() => onToggle(session.id)}
              className="text-slate-500 hover:text-slate-200 transition-colors"
              title={isActive ? 'Hide session' : 'Show session'}
            >
              {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            {/* Remove */}
            <button
              onClick={() => onRemove(session.id)}
              className="text-slate-500 hover:text-red-400 transition-colors"
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
