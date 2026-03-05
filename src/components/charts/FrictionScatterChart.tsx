import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { LoadedSession, FrictionScatterPoint } from '@/types/session';
import { sessionLabel } from '@/lib/utils';

function pointColor(totalG: number): string {
  if (totalG > 0.8) return '#10b981';
  if (totalG >= 0.5) return '#f59e0b';
  return '#475569';
}

interface ScatterDot {
  x: number;
  y: number;
  totalG: number;
}

interface Props {
  sessions: LoadedSession[];
}

export function FrictionScatterChart({ sessions }: Props) {
  const seriesData = useMemo(
    () =>
      sessions.map(session => ({
        session,
        points: (session.data.friction_circle.scatter_points ?? []).map(
          (p: FrictionScatterPoint): ScatterDot => ({
            x: p.lat_g,
            y: p.long_g,
            totalG: p.total_g,
          })
        ),
      })),
    [sessions]
  );

  const hasData = seriesData.some(s => s.points.length > 0);

  if (!hasData) {
    return (
      <p className="text-xs text-slate-600">
        No scatter point data available. Ensure the preprocessor outputs friction_circle.scatter_points.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-2, 2]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: '← Left   Lateral G   Right →', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[-2, 2]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Longitudinal G', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
          />
          <ReferenceLine y={0} stroke="#334155" />
          <ReferenceLine x={0} stroke="#334155" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return String(value);
              if (name === 'x') return [`${value.toFixed(2)}G`, 'Lateral'] as [string, string];
              if (name === 'y') return [`${value.toFixed(2)}G`, 'Longitudinal'] as [string, string];
              if (name === 'totalG') return [`${value.toFixed(2)}G`, 'Total G'] as [string, string];
              return String(value);
            }}
          />
          {seriesData.map(({ session, points }) => (
            <Scatter
              key={session.id}
              name={sessionLabel(session)}
              data={points}
              opacity={sessions.length > 1 ? 0.5 : 0.8}
            >
              {points.map((point, i) => (
                <Cell
                  key={`${session.id}-${i}`}
                  fill={pointColor(point.totalG)}
                />
              ))}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-xs text-slate-500">
        <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />&gt;0.8G</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />0.5–0.8G</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-slate-600 mr-1" />&lt;0.5G</span>
      </div>
    </div>
  );
}
