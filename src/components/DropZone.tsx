import { useCallback, useState } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionSummary } from '@/types/session';

interface DropZoneProps {
  onSessionLoaded: (filename: string, data: SessionSummary) => { ok: boolean; error?: string };
}

export function DropZone({ onSessionLoaded }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setStatus({ type: 'error', message: `"${file.name}" is not a JSON file.` });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const result = onSessionLoaded(file.name, parsed);
        if (result.ok) {
          setStatus({ type: 'success', message: `Loaded: ${file.name}` });
        } else {
          setStatus({ type: 'error', message: result.error ?? 'Unknown error.' });
        }
      } catch {
        setStatus({ type: 'error', message: `Could not parse "${file.name}" as JSON.` });
      }
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    };
    reader.readAsText(file);
  }, [onSessionLoaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  }, [processFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(processFile);
    e.target.value = '';
  }, [processFile]);

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200',
        isDragging
          ? 'border-blue-500 bg-blue-950/30'
          : 'border-slate-600 bg-slate-900/50 hover:border-slate-400 hover:bg-slate-800/50'
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept=".json"
        multiple
        className="sr-only"
        onChange={onInputChange}
      />
      {status.type === 'idle' ? (
        <>
          <div className="flex items-center gap-2 text-slate-400">
            <Upload size={20} />
            <FileJson size={20} />
          </div>
          <p className="text-sm text-slate-400 text-center">
            Drop session JSON files here or <span className="text-blue-400 underline">click to browse</span>
          </p>
          <p className="text-xs text-slate-600">Multiple files supported</p>
        </>
      ) : (
        <p className={cn(
          'text-sm font-medium text-center',
          status.type === 'success' ? 'text-emerald-400' : 'text-red-400'
        )}>
          {status.message}
        </p>
      )}
    </label>
  );
}
