import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { LoadedSession } from '@/types/session';
import { kphToMph, sessionLabel } from '@/lib/utils';

interface Props {
  sessions: LoadedSession[];
}

interface ChartPoint {
  corner: string;
  [sessionId: string]: number | string;
}

function buildChartData(sessions: LoadedSession[]): ChartPoint[] {
  // Collect all corner IDs across sessions
  const cornerIds = new Set<string>();
  sessions.forEach(s => {
    Object.keys(s.data.consistency.corners).forEach(id => cornerIds.add(id));
    s.data.best_lap_corners.forEach(c => cornerIds.add(c.corner_id));
  });

  return Array.from(cornerIds).sort().map(cornerId => {
    const point: ChartPoint = { corner: cornerId };
    sessions.forEach(session => {
      // Prefer best_lap_corners for the best lap min speed
      const bestCorner = session.data.best_lap_corners.find(c => c.corner_id === cornerId);
      if (bestCorner) {
        point[session.id] = parseFloat(kphToMph(bestCorner.min_speed_kph).toFixed(1));
      } else {
        const consistencyCorner = session.data.consistency.corners[cornerId];
        if (consistencyCorner) {
          point[session.id] = parseFloat(kphToMph(consistencyCorner.min_speed_best).toFixed(1));
        }
      }
    });
    return point;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-slate-300">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono">{entry.value} mph</span>
        </p>
      ))}
    </div>
  );
}

export function CornerSpeedChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-600">
        Load sessions to compare corner speeds
      </div>
    );
  }

  const data = buildChartData(sessions);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Best lap minimum corner speed. Higher = faster through corner.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="corner" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => `${v}`}
            label={{ value: 'mph', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => {
              const s = sessions.find(s => s.id === value);
              return <span className="text-xs text-slate-300">{s ? sessionLabel(s) : value}</span>;
            }}
          />
          {sessions.map(session => (
            <Bar
              key={session.id}
              dataKey={session.id}
              name={session.id}
              fill={session.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
