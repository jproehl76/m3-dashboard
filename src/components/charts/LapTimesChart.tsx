import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { LoadedSession } from '@/types/session';
import { formatLapTime, sessionLabel } from '@/lib/utils';
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/chartTheme';

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
    <div style={TOOLTIP_STYLE}>
      <p style={{ marginBottom: 4, fontWeight: 600, color: '#9898A8' }}>Lap {label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span>{formatLapTime(entry.value)}</span>
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
    <div className="space-y-2" style={{ touchAction: 'pan-x pan-y', userSelect: 'none' }}>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '11px', color: '#606070' }}>
        Outlier laps excluded. Dashed lines = best lap per session.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={CHART_MARGINS}>
          <CartesianGrid
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="lap"
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{ value: 'Lap', position: 'insideBottom', offset: -4, fill: '#606070', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            tickFormatter={(v: number) => formatLapTime(v)}
            width={72}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: '12px' }}
            formatter={(value) => {
              const s = sessions.find(s => s.id === value);
              return <span style={{ color: '#9898A8', fontFamily: 'Rajdhani' }}>{s ? sessionLabel(s) : value}</span>;
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
    <div className="flex h-48 items-center justify-center" style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: '#606070' }}>
      {message}
    </div>
  );
}
