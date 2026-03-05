import { useMemo, useState } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { LoadedSession, TracePoint } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, BAR_TO_PSI, sessionLabel } from '@/lib/utils';

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
      <p className="text-xs text-slate-600">
        Throttle/brake trace requires CAN-bus channels (brake_pres, throttle).
      </p>
    );
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

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="distanceFt"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}ft`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Distance (ft)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 150]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Throttle % / Brake PSI', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Speed (mph)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return String(value);
              if (name === 'speedMph') return [`${value.toFixed(1)} mph`, 'Speed'] as [string, string];
              if (name === 'throttlePct') return [`${value.toFixed(0)}%`, 'Throttle'] as [string, string];
              if (name === 'brakePsi') return [`${value.toFixed(0)} PSI`, 'Brake'] as [string, string];
              return String(value);
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {brakePoints.map(bp => (
            <ReferenceLine
              key={bp.label}
              yAxisId="left"
              x={bp.distanceFt}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{ value: bp.label, position: 'top', fill: '#94a3b8', fontSize: 9 }}
            />
          ))}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="throttlePct"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={false}
            name="throttlePct"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="brakePsi"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            name="brakePsi"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="speedMph"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            name="speedMph"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
