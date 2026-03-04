import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { LoadedSession } from '@/types/session';
import { formatLapTime, sessionLabel } from '@/lib/utils';

interface Props {
  sessions: LoadedSession[];
}

interface ChartPoint {
  lap: number;
  [sessionId: string]: number;
}

function buildChartData(sessions: LoadedSession[]): ChartPoint[] {
  const maxLaps = Math.max(...sessions.map(s => s.data.laps.filter(l => !l.is_outlier).length), 0);
  const points: ChartPoint[] = [];

  for (let i = 1; i <= maxLaps; i++) {
    const point: ChartPoint = { lap: i };
    sessions.forEach(session => {
      const lap = session.data.laps.find(l => l.lap_num === i && !l.is_outlier);
      if (lap) point[session.id] = lap.lap_time_s;
    });
    points.push(point);
  }

  return points;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-slate-300">Lap {label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono">{formatLapTime(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function LapTimesChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return <EmptyState message="Load sessions to see lap time progression" />;
  }

  const data = buildChartData(sessions);

  // Best lap reference lines per session
  const bestLaps = sessions.map(s => ({
    id: s.id,
    color: s.color,
    best: s.data.consistency.best_lap_s,
  }));

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Outlier laps excluded. Dashed lines = best lap per session.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="lap"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            label={{ value: 'Lap', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => formatLapTime(v)}
            width={72}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => {
              const s = sessions.find(s => s.id === value);
              return <span className="text-xs text-slate-300">{s ? sessionLabel(s) : value}</span>;
            }}
          />
          {bestLaps.map(({ id, color, best }) => (
            <ReferenceLine
              key={`ref-${id}`}
              y={best}
              stroke={color}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          ))}
          {sessions.map(session => (
            <Line
              key={session.id}
              type="monotone"
              dataKey={session.id}
              name={session.id}
              stroke={session.color}
              strokeWidth={2}
              dot={{ r: 3, fill: session.color }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-slate-600">
      {message}
    </div>
  );
}
