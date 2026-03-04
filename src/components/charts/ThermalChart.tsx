import type { LoadedSession } from '@/types/session';
import { celsiusToF, sessionLabel, THERMAL_THRESHOLDS } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';


interface ChartPoint {
  session: string;
  peak: number;
  start: number;
}

function buildData(sessions: LoadedSession[], channel: string): ChartPoint[] {
  return sessions.map(s => {
    const t = s.data.thermals.find(th => th.channel === channel);
    if (!t) return null;
    const isBoost = channel === 'boost';
    return {
      session: sessionLabel(s),
      peak: isBoost ? parseFloat(t.peak_val.toFixed(2)) : Math.round(celsiusToF(t.peak_val)),
      start: isBoost ? parseFloat(t.start_val.toFixed(2)) : Math.round(celsiusToF(t.start_val)),
    };
  }).filter((p): p is ChartPoint => p !== null);
}

const CHANNEL_OPTIONS = [
  { key: 'oil_temp', label: 'Oil Temp' },
  { key: 'trans_temp', label: 'Trans Temp' },
  { key: 'coolant_temp', label: 'Coolant' },
  { key: 'iat', label: 'Intake Air' },
  { key: 'boost', label: 'Boost' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const isBoost = payload[0]?.payload && label;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-slate-300 truncate max-w-48">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono">{entry.value}{isBoost ? ' bar' : '°F'}</span>
        </p>
      ))}
    </div>
  );
}

interface ThermalChartProps {
  sessions: LoadedSession[];
}

export function ThermalChart({ sessions }: ThermalChartProps) {
  const [activeChannel, setActiveChannel] = React.useState('oil_temp');

  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-600">
        Load sessions to see thermal trends
      </div>
    );
  }

  const data = buildData(sessions, activeChannel);
  const th = THERMAL_THRESHOLDS[activeChannel];
  const isBoost = activeChannel === 'boost';
  const unit = isBoost ? 'bar' : '°F';

  return (
    <div className="space-y-3">
      {/* Channel selector */}
      <div className="flex flex-wrap gap-2">
        {CHANNEL_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setActiveChannel(opt.key)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeChannel === opt.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Peak vs. start value per session. Watch: {th?.watch}{unit} | Critical: {th?.critical}{unit}
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="session"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: number) => `${v}`}
            label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          {th && (
            <>
              <ReferenceLine y={th.watch} stroke="#D97706" strokeDasharray="4 4" label={{ value: 'Watch', fill: '#D97706', fontSize: 10 }} />
              <ReferenceLine y={th.critical} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Critical', fill: '#DC2626', fontSize: 10 }} />
            </>
          )}
          <Bar dataKey="start" name="Start" fill="#475569" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Bar dataKey="peak" name="Peak" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Need React for useState
import React from 'react';
