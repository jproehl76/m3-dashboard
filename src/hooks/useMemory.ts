import { useState, useEffect, useCallback } from 'react';
import { readMemory, writeMemory, DEFAULT_MEMORY } from '@/lib/memory';
import type { AppMemory } from '@/lib/memory';

export function useMemory() {
  const [memory, setMemory] = useState<AppMemory>(DEFAULT_MEMORY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readMemory().then(m => { setMemory(m); setLoaded(true); });
  }, []);

  const update = useCallback(async (patch: Partial<AppMemory>) => {
    setMemory(prev => ({ ...prev, ...patch }));
    await writeMemory(patch);
  }, []);

  return { memory, loaded, update };
}
