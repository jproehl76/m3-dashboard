import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { LoadedSession } from '@/types/session';
import { KPH_TO_MPH, sessionLabel } from '@/lib/utils';

interface DeltaRow {
  cornerName: string;
  deltaMph: number;
}

function buildDeltaRows(session: LoadedSession): DeltaRow[] {
  return Object.entries(session.data.consistency.corners)
    .map(([name, corner]) => ({
      cornerName: name,
      deltaMph: corner.min_speed_delta * KPH_TO_MPH,
    }))
    .sort((a, b) => b.deltaMph - a.deltaMph);
}

function barColor(delta: number): string {
  if (delta > 3) return '#ef4444';
  if (delta > 1) return '#f59e0b';
  return '#10b981';
}

interface Props {
  sessions: LoadedSession[];
}

export function LapDeltaChart({ sessions }: Props) {
  const sessionData = useMemo(
    () => sessions.map(s => ({ session: s, rows: buildDeltaRows(s) })),
    [sessions]
  );

  if (sessions.length === 0) {
    return (
      <p className="text-xs text-slate-600">
        Lap delta requires 2 or more laps in a session.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sessionData.map(({ session, rows }) => (
        <div key={session.id} className="space-y-2">
          {sessions.length > 1 && (
            <p className="text-xs font-semibold text-slate-400">{sessionLabel(session)}</p>
          )}
          <p className="text-xs text-slate-500">
            Corner min-speed gap vs. best lap (mph) — larger = more time available
          </p>
          {rows.length < 2 ? (
            <p className="text-xs text-slate-600">Insufficient corner data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="cornerName"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  label={{ value: 'Speed gap (mph)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
                  formatter={(value: number | undefined) => [value !== undefined ? `${value.toFixed(1)} mph` : '--', 'Gap vs best']}
                />
                <ReferenceLine y={0.5} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="4 4" />
                <Bar dataKey="deltaMph" radius={[3, 3, 0, 0]}>
                  {rows.map((row, i) => (
                    <Cell key={`${row.cornerName}-${i}`} fill={barColor(row.deltaMph)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      ))}
    </div>
  );
}
