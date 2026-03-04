import type { LoadedSession } from '@/types/session';
import { sessionLabel } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';

interface Props {
  sessions: LoadedSession[];
}

interface RadarPoint {
  metric: string;
  fullMark: number;
  [sessionId: string]: number | string;
}

function buildRadarData(sessions: LoadedSession[]): RadarPoint[] {
  const metrics: Array<{ key: keyof typeof sessions[0]['data']['friction_circle'] | 'consistency'; label: string; scale: number }> = [
    { key: 'total_g_p95', label: 'G-Force P95', scale: 2 },
    { key: 'time_above_08g_pct', label: '>0.8G Time %', scale: 20 },
    { key: 'peak_lat_g', label: 'Peak Lateral G', scale: 2 },
    { key: 'consistency', label: 'Consistency', scale: 10 },
    { key: 'time_above_10g_pct', label: '>1.0G Time %', scale: 5 },
  ];

  return metrics.map(({ key, label, scale }) => {
    const point: RadarPoint = { metric: label, fullMark: 100 };
    sessions.forEach(s => {
      let raw: number;
      if (key === 'consistency') {
        // Invert spread — lower spread = higher score
        const spread = s.data.consistency.spread_s;
        raw = Math.max(0, 10 - spread);
      } else {
        raw = s.data.friction_circle[key as keyof typeof s.data.friction_circle] as number;
      }
      // Normalize to 0-100
      point[s.id] = parseFloat(Math.min(100, (raw / scale) * 100).toFixed(1));
    });
    return point;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function FrictionCircleChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-600">
        Load sessions to see driver development radar
      </div>
    );
  }

  const data = buildRadarData(sessions);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Normalized scores (0–100). Higher = better. Consistency inverts spread — lower spread = higher score.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 16, right: 32, left: 32, bottom: 16 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => {
              const s = sessions.find(s => s.id === value);
              return <span className="text-xs text-slate-300">{s ? sessionLabel(s) : value}</span>;
            }}
          />
          {sessions.map(session => (
            <Radar
              key={session.id}
              name={session.id}
              dataKey={session.id}
              stroke={session.color}
              fill={session.color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
