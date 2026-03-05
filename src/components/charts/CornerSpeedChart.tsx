import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { LoadedSession } from '@/types/session';
import { kphToMph, sessionLabel } from '@/lib/utils';
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/chartTheme';

interface Props {
  sessions: LoadedSession[];
}

interface ChartPoint {
  corner: string;
  [sessionId: string]: number | string;
}

function buildChartData(sessions: LoadedSession[]): ChartPoint[] {
  const cornerIds = new Set<string>();
  sessions.forEach(s => {
    Object.keys(s.data.consistency.corners).forEach(id => cornerIds.add(id));
    s.data.best_lap_corners.forEach(c => cornerIds.add(c.corner_id));
  });

  return Array.from(cornerIds).sort().map(cornerId => {
    const point: ChartPoint = { corner: cornerId };
    sessions.forEach(session => {
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
    <div style={TOOLTIP_STYLE}>
      <p style={{ marginBottom: 4, fontWeight: 600, color: '#9898A8' }}>{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span>{entry.value} mph</span>
        </p>
      ))}
    </div>
  );
}

export function CornerSpeedChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center" style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: '#606070' }}>
        Load sessions to compare corner speeds
      </div>
    );
  }

  const data = buildChartData(sessions);

  return (
    <div className="space-y-2" style={{ touchAction: 'pan-x pan-y', userSelect: 'none' }}>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '11px', color: '#606070' }}>
        Best lap minimum corner speed. Higher = faster through corner.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={CHART_MARGINS}>
          <CartesianGrid
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="corner"
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
          />
          <YAxis
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            tickFormatter={(v: number) => `${v}`}
            label={{ value: 'mph', angle: -90, position: 'insideLeft', fill: '#606070', fontSize: 10, fontFamily: 'JetBrains Mono' }}
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
