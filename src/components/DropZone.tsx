import { useCallback, useState } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SessionSummary } from '@/types/session';
import { parseRacechronoCsv } from '@/lib/parseRacechronoCsv';

interface DropZoneProps {
  onSessionLoaded: (filename: string, data: SessionSummary) => { ok: boolean; error?: string };
}

export function DropZone({ onSessionLoaded }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');

    if (!isJson && !isCsv) {
      toast.error(`"${file.name}" is not a JSON or CSV file.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (isCsv) {
          const parsed = parseRacechronoCsv(content);
          const result = onSessionLoaded(file.name, parsed);
          if (result.ok) {
            toast.success(`Loaded: ${file.name}`);
          } else {
            toast.error(result.error ?? 'Unknown error.');
          }
        } else {
          const parsed = JSON.parse(content);
          const result = onSessionLoaded(file.name, parsed);
          if (result.ok) {
            toast.success(`Loaded: ${file.name}`);
          } else {
            toast.error(result.error ?? 'Unknown error.');
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Could not parse "${file.name}".`);
      }
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
        accept=".json,.csv"
        multiple
        className="sr-only"
        onChange={onInputChange}
      />
      <div className="flex items-center gap-2 text-slate-400">
        <Upload size={20} />
        <FileJson size={20} />
      </div>
      <p className="text-sm text-slate-400 text-center">
        Drop session JSON or CSV files here or <span className="text-blue-400 underline">click to browse</span>
      </p>
      <p className="text-xs text-slate-600">Multiple files supported</p>
    </label>
  );
}
