import type { LoadedSession } from '@/types/session';
import { sessionLabel } from '@/lib/utils';
import { TOOLTIP_STYLE } from '@/lib/chartTheme';
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
  // All five axes are pure G-force metrics — consistent unit and meaning
  const metrics: Array<{ key: keyof typeof sessions[0]['data']['friction_circle']; label: string; scale: number }> = [
    { key: 'total_g_p95',         label: 'Total G P95',  scale: 1.8 },
    { key: 'time_above_08g_pct',  label: '>0.8G Time %', scale: 18  },
    { key: 'peak_lat_g',          label: 'Peak Lateral', scale: 1.6 },
    { key: 'peak_long_g_brake',   label: 'Brake G',      scale: 1.4 },
    { key: 'peak_long_g_accel',   label: 'Accel G',      scale: 0.7 },
  ];

  return metrics.map(({ key, label, scale }) => {
    const point: RadarPoint = { metric: label, fullMark: 100 };
    sessions.forEach(s => {
      const raw = s.data.friction_circle[key] as number;
      point[s.id] = parseFloat(Math.min(100, (raw / scale) * 100).toFixed(1));
    });
    return point;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span>{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function FrictionCircleChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center" style={{ fontFamily: 'BMWTypeNext', fontSize: '13px', color: '#606070' }}>
        Load sessions to see driver development radar
      </div>
    );
  }

  const data = buildRadarData(sessions);

  return (
    <div className="space-y-2" style={{ touchAction: 'pan-x pan-y', userSelect: 'none' }}>
      <p style={{ fontFamily: 'BMWTypeNext', fontSize: '10px', color: '#505060', letterSpacing: '0.04em' }}>
        Grip utilization profile — normalized 0–100. Higher = using more of the car's performance envelope.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 16, right: 32, left: 32, bottom: 16 }}>
          <PolarGrid stroke="#2E2E3C" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#9898A8', fontSize: 11, fontFamily: 'BMWTypeNext' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: 'BMWTypeNext', fontSize: '12px' }}
            formatter={(value) => {
              const s = sessions.find(s => s.id === value);
              return <span style={{ color: '#9898A8', fontFamily: 'BMWTypeNext' }}>{s ? sessionLabel(s) : value}</span>;
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
