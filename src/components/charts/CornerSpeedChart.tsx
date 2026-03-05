import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts';
import type { LoadedSession } from '@/types/session';
import { kphToMph, sessionLabel } from '@/lib/utils';
import { CHART_MARGINS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/chartTheme';
import { SESSION_COLORS } from '@/lib/chartTheme';

interface Props {
  sessions: LoadedSession[];
}

interface CornerRow {
  corner: string;
  label: string;
  // Per session: entry / apex / exit
  [key: string]: number | string;
}

function mph(kph: number) { return parseFloat(kphToMph(kph).toFixed(1)); }

function buildChartData(sessions: LoadedSession[]): CornerRow[] {
  // Collect all corner IDs seen in best_lap_corners
  const allIds = new Set<string>();
  sessions.forEach(s => s.data.best_lap_corners.forEach(c => allIds.add(c.corner_id)));

  return Array.from(allIds).sort().map(cornerId => {
    const row: CornerRow = { corner: cornerId, label: cornerId.toUpperCase() };
    sessions.forEach(s => {
      const c = s.data.best_lap_corners.find(b => b.corner_id === cornerId);
      if (c) {
        row[`${s.id}_entry`] = mph(c.entry_speed_kph);
        row[`${s.id}_apex`]  = mph(c.min_speed_kph);
        row[`${s.id}_exit`]  = mph(c.exit_speed_kph);
      }
    });
    return row;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, sessions }: any) {
  if (!active || !payload?.length) return null;
  // Group by session
  const bySession = new Map<string, { entry?: number; apex?: number; exit?: number }>();
  for (const p of payload) {
    const [sid, type] = p.dataKey.split('_');
    if (!bySession.has(sid)) bySession.set(sid, {});
    bySession.get(sid)![type as 'entry' | 'apex' | 'exit'] = p.value;
  }

  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 180 }}>
      <p style={{ marginBottom: 8, color: '#606070', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </p>
      {sessions.map((s: LoadedSession) => {
        const d = bySession.get(s.id);
        if (!d) return null;
        return (
          <div key={s.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: s.color, textTransform: 'uppercase', marginBottom: 4 }}>
              {sessionLabel(s)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[['Entry', d.entry, '#3B82F6'], ['Apex', d.apex, '#A855F7'], ['Exit', d.exit, '#22C55E']].map(([name, val, color]) => (
                val != null && (
                  <div key={name as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#505060', letterSpacing: '0.08em' }}>{name as string}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: color as string }}>
                      {(val as number).toFixed(0)}
                    </div>
                    <div style={{ fontSize: '7px', color: '#404050' }}>mph</div>
                  </div>
                )
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Speed-colored single bar — green when fast, amber when moderate */
function speedColor(baseColor: string, value: number, min: number, max: number): string {
  if (max <= min) return baseColor;
  const t = (value - min) / (max - min);
  // Blend: red at 0, amber at 0.5, green at 1 — but tinted to session color
  if (t >= 0.75) return '#22C55E';
  if (t >= 0.4)  return '#F59E0B';
  return '#EF4444';
}

export function CornerSpeedChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <span style={{ fontFamily: 'BMWTypeNext', fontSize: '13px', letterSpacing: '0.08em', color: '#505060', textTransform: 'uppercase' }}>
          Load sessions to compare corner speeds
        </span>
      </div>
    );
  }

  const data = buildChartData(sessions);

  // Global min/max apex speed for color scale
  const allApexes = data.flatMap(row =>
    sessions.map(s => (row[`${s.id}_apex`] as number | undefined) ?? NaN)
  ).filter(v => !isNaN(v));
  const globalMin = Math.min(...allApexes);
  const globalMax = Math.max(...allApexes);

  // Determine if we have entry/exit data
  const hasFullData = sessions.some(s =>
    data.some(row => row[`${s.id}_entry`] != null && row[`${s.id}_exit`] != null)
  );

  return (
    <div className="space-y-4" style={{ touchAction: 'pan-x pan-y', userSelect: 'none' }}>

      {/* Legend + descriptor */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        {sessions.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: SESSION_COLORS[i % SESSION_COLORS.length] }} />
            <span style={{ fontFamily: 'BMWTypeNext', fontSize: '11px', letterSpacing: '0.08em', color: '#8080A0', textTransform: 'uppercase' }}>
              {sessionLabel(s)}
            </span>
          </div>
        ))}
        {hasFullData && (
          <div className="flex items-center gap-3 ml-auto">
            {[['Entry', '#3B82F6'], ['Apex', '#A855F7'], ['Exit', '#22C55E']].map(([name, color]) => (
              <span key={name} className="flex items-center gap-1">
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ fontFamily: 'BMWTypeNext', fontSize: '9px', letterSpacing: '0.08em', color: '#505060' }}>{name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Apex Speed bar chart ── */}
      <div>
        <div className="text-[8px] tracking-widest uppercase mb-1 px-1" style={{ color: '#404050' }}>
          Apex Speed — mph · best lap
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={CHART_MARGINS} barCategoryGap="25%">
            <CartesianGrid stroke={GRID_STYLE.stroke} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} />
            <YAxis
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={AXIS_STYLE.tickLine}
              label={{ value: 'MPH', angle: -90, position: 'insideLeft', offset: 12, fill: '#404050', fontSize: 10, fontFamily: 'BMWTypeNext', letterSpacing: '0.1em' }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip sessions={sessions} />} />
            {sessions.map(session => (
              <Bar key={session.id} dataKey={`${session.id}_apex`} name={sessionLabel(session)} radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((row, i) => {
                  const val = (row[`${session.id}_apex`] as number) ?? 0;
                  const color = speedColor(session.color, val, globalMin, globalMax);
                  return <Cell key={i} fill={color} fillOpacity={0.9} />;
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Entry / Exit speed strip (when data available) ── */}
      {hasFullData && (
        <div>
          <div className="text-[8px] tracking-widest uppercase mb-1 px-1" style={{ color: '#404050' }}>
            Entry vs Exit Speed — mph
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={CHART_MARGINS} barCategoryGap="20%" barGap={2}>
              <CartesianGrid stroke={GRID_STYLE.stroke} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={AXIS_STYLE.tickLine} />
              <YAxis
                tick={AXIS_STYLE.tick}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={AXIS_STYLE.tickLine}
                label={{ value: 'MPH', angle: -90, position: 'insideLeft', offset: 12, fill: '#404050', fontSize: 10, fontFamily: 'BMWTypeNext', letterSpacing: '0.1em' }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip sessions={sessions} />} />
              {sessions.flatMap(session => [
                <Bar key={`${session.id}-entry`} dataKey={`${session.id}_entry`} name="Entry" radius={[3, 3, 0, 0]} maxBarSize={22} fill="#3B82F6" fillOpacity={0.75} />,
                <Bar key={`${session.id}-exit`}  dataKey={`${session.id}_exit`}  name="Exit"  radius={[3, 3, 0, 0]} maxBarSize={22} fill="#22C55E" fillOpacity={0.75} />,
              ])}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Speed delta tiles per corner ── */}
      {sessions.length >= 2 && (() => {
        const [s1, s2] = sessions;
        const deltas = data.map(row => {
          const a = row[`${s1.id}_apex`] as number | undefined;
          const b = row[`${s2.id}_apex`] as number | undefined;
          if (a == null || b == null) return null;
          return { corner: row.label, delta: parseFloat((b - a).toFixed(1)) };
        }).filter(Boolean) as { corner: string; delta: number }[];

        if (deltas.length === 0) return null;
        return (
          <div>
            <div className="text-[8px] tracking-widest uppercase mb-2 px-1" style={{ color: '#404050' }}>
              Apex speed delta — {sessionLabel(s2)} vs {sessionLabel(s1)}
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {deltas.map(({ corner, delta }) => {
                const color = delta > 0.5 ? '#22C55E' : delta < -0.5 ? '#EF4444' : '#F59E0B';
                return (
                  <div key={corner} className="flex flex-col items-center rounded px-2 py-1"
                    style={{ background: `${color}10`, border: `1px solid ${color}30`, minWidth: 44 }}>
                    <span style={{ fontFamily: 'BMWTypeNext', fontSize: '7px', letterSpacing: '0.1em', color: '#505060' }}>
                      {corner}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color, lineHeight: 1.2 }}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                    <span style={{ fontSize: '6px', color: `${color}80` }}>mph</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
