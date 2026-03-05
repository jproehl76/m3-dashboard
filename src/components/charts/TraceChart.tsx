import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { LoadedSession, TracePoint } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, BAR_TO_PSI, sessionLabel } from '@/lib/utils';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, CHANNEL_COLORS } from '@/lib/chartTheme';

interface TraceRow {
  distanceFt: number;
  speedMph: number;
  throttlePct: number;
  brakePsi: number;
}

function transformTrace(points: TracePoint[]): TraceRow[] {
  return points.map(p => ({
    distanceFt: p.distance_m * M_TO_FEET,
    speedMph: p.speed_kph * KPH_TO_MPH,
    throttlePct: p.throttle_pct,
    brakePsi: p.brake_bar * BAR_TO_PSI,
  }));
}

interface Props {
  sessions: LoadedSession[];
}

export function TraceChart({ sessions }: Props) {
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id ?? '');

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  const trace = activeSession?.data.best_lap_trace;

  const data = useMemo(
    () => (trace ? transformTrace(trace) : []),
    [trace]
  );

  const brakePoints = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.data.best_lap_corners.map(c => ({
      distanceFt: c.brake_point_m * M_TO_FEET,
      label: c.corner_name,
    }));
  }, [activeSession]);

  if (sessions.length === 0 || !trace || trace.length === 0) {
    return (
      <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: '#606070' }}>
        Throttle/brake trace requires CAN-bus channels (brake_pres, throttle).
      </p>
    );
  }

  return (
    <div className="space-y-4" style={{ touchAction: 'pan-x pan-y', userSelect: 'none' }}>
      {sessions.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className="text-xs px-2 py-1 rounded border transition-colors"
              style={{
                fontFamily: 'Rajdhani',
                borderColor: s.id === activeSessionId ? '#3B82F6' : '#2E2E3C',
                color: s.id === activeSessionId ? '#3B82F6' : '#606070',
                background: s.id === activeSessionId ? 'rgba(59,130,246,0.1)' : 'transparent',
              }}
            >
              {sessionLabel(s)}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid
            stroke={GRID_STYLE.stroke}
            vertical={GRID_STYLE.vertical}
          />
          <XAxis
            dataKey="distanceFt"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}ft`}
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{ value: 'Distance (ft)', position: 'insideBottom', offset: -5, fill: '#606070', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 150]}
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{ value: 'Throttle % / Brake PSI', angle: -90, position: 'insideLeft', fill: '#606070', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            tick={AXIS_STYLE.tick}
            axisLine={AXIS_STYLE.axisLine}
            tickLine={AXIS_STYLE.tickLine}
            label={{ value: 'Speed (mph)', angle: 90, position: 'insideRight', fill: '#606070', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return String(value);
              if (name === 'speedMph') return [`${value.toFixed(1)} mph`, 'Speed'] as [string, string];
              if (name === 'throttlePct') return [`${value.toFixed(0)}%`, 'Throttle'] as [string, string];
              if (name === 'brakePsi') return [`${value.toFixed(0)} PSI`, 'Brake'] as [string, string];
              return String(value);
            }}
          />
          <Legend wrapperStyle={{ fontFamily: 'Rajdhani', fontSize: 12 }} />
          {brakePoints.map(bp => (
            <ReferenceLine
              key={bp.label}
              yAxisId="left"
              x={bp.distanceFt}
              stroke="#38384A"
              strokeDasharray="4 4"
              label={{ value: bp.label, position: 'top', fill: '#9898A8', fontSize: 9 }}
            />
          ))}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="throttlePct"
            stroke={CHANNEL_COLORS.throttle}
            fill={CHANNEL_COLORS.throttle}
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={false}
            name="throttlePct"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="brakePsi"
            stroke={CHANNEL_COLORS.brake}
            strokeWidth={1.5}
            dot={false}
            name="brakePsi"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="speedMph"
            stroke={CHANNEL_COLORS.speed}
            strokeWidth={1.5}
            dot={false}
            name="speedMph"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
