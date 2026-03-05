import { useState, useMemo } from 'react';
import type { LoadedSession } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, sessionLabel } from '@/lib/utils';

interface CornerRow {
  cornerName: string;
  bestSpeedMph: number;
  avgSpeedMph: number;
  gapMph: number;
  brakeStdFt: number;
  coastTimeS: number;
}

function gapColor(gapMph: number): string {
  if (gapMph > 3) return 'text-red-400';
  if (gapMph >= 2) return 'text-amber-400';
  return 'text-slate-400';
}

function brakeColor(ft: number): string {
  if (ft > 40) return 'text-red-400';
  if (ft >= 20) return 'text-amber-400';
  return 'text-slate-400';
}

function buildRows(session: LoadedSession): CornerRow[] {
  return Object.entries(session.data.consistency.corners)
    .map(([name, corner]) => ({
      cornerName: name,
      bestSpeedMph: corner.min_speed_best * KPH_TO_MPH,
      avgSpeedMph: corner.min_speed_avg * KPH_TO_MPH,
      gapMph: corner.min_speed_delta * KPH_TO_MPH,
      brakeStdFt: corner.brake_point_std_m * M_TO_FEET,
      coastTimeS: corner.coast_time_avg,
    }))
    .sort((a, b) => b.gapMph - a.gapMph);
}

interface Props {
  sessions: LoadedSession[];
}

export function CornerDetailTable({ sessions }: Props) {
  const [activeSessionId, setActiveSessionId] = useState<string>(
    sessions[0]?.id ?? ''
  );

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  const rows = useMemo(
    () => (activeSession ? buildRows(activeSession) : []),
    [activeSession]
  );

  if (sessions.length === 0) {
    return <p className="text-xs text-slate-600">Load a session to see corner detail.</p>;
  }

  return (
    <div className="space-y-4">
      {sessions.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                s.id === activeSessionId
                  ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                  : 'border-slate-700 text-slate-500 hover:border-slate-500'
              }`}
            >
              {sessionLabel(s)}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500 text-left">
              <th className="pb-2 pr-4 font-medium">Corner</th>
              <th className="pb-2 pr-4 font-medium text-right">Best (mph)</th>
              <th className="pb-2 pr-4 font-medium text-right">Avg (mph)</th>
              <th className="pb-2 pr-4 font-medium text-right">Gap (mph)</th>
              <th className="pb-2 pr-4 font-medium text-right">Brake Std Dev</th>
              <th className="pb-2 font-medium text-right">Coast Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.cornerName} className="border-b border-slate-800/50">
                <td className="py-2 pr-4 text-slate-300 font-medium">{row.cornerName}</td>
                <td className="py-2 pr-4 text-right text-slate-300">{row.bestSpeedMph.toFixed(1)}</td>
                <td className="py-2 pr-4 text-right text-slate-400">{row.avgSpeedMph.toFixed(1)}</td>
                <td className={`py-2 pr-4 text-right font-semibold ${gapColor(row.gapMph)}`}>
                  {row.gapMph.toFixed(1)}
                </td>
                <td className={`py-2 pr-4 text-right ${brakeColor(row.brakeStdFt)}`}>
                  {row.brakeStdFt.toFixed(0)} ft
                </td>
                <td className="py-2 text-right text-slate-400">
                  {row.coastTimeS.toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
