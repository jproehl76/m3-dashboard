import { useState, useCallback } from 'react';

const MAX_CHARS = 2000;
const noteKey = (id: string) => `notes:${id}`;

interface Props {
  sessionId: string;
}

export function DebriefNotes({ sessionId }: Props) {
  const [text, setText] = useState<string>(() => {
    try {
      return localStorage.getItem(noteKey(sessionId)) ?? '';
    } catch {
      return '';
    }
  });
  const [saved, setSaved] = useState(false);

  const handleBlur = useCallback(() => {
    try {
      localStorage.setItem(noteKey(sessionId), text.slice(0, MAX_CHARS));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* quota */ }
  }, [sessionId, text]);

  const remaining = MAX_CHARS - text.length;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full rounded-lg bg-slate-800/60 border border-slate-700 text-slate-200 text-xs p-3 resize-none focus:outline-none focus:border-blue-500 transition-colors"
        rows={4}
        maxLength={MAX_CHARS}
        placeholder="Add debrief notes for this session…"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        aria-label="Session debrief notes"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={remaining < 100 ? 'text-red-400' : 'text-slate-600'}>
          {text.length} / {MAX_CHARS}
        </span>
        {saved && <span className="text-emerald-400">Saved ✓</span>}
      </div>
    </div>
  );
}
