import { useState, useMemo } from 'react';
import type { LoadedSession, BestLapCorner } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, sessionLabel } from '@/lib/utils';

interface MergedCornerRow {
  id: string;
  name: string;
  // From best_lap_corners (single best lap)
  entryMph:     number | null;
  apexBestMph:  number | null;
  exitMph:      number | null;
  gear:         number | null;
  trailBrakeS:  number | null;
  throttleOnFt: number | null;
  // From consistency.corners (across all clean laps)
  apexAvgMph:   number | null;
  gapMph:       number | null;
  brakeStdFt:   number | null;
  coastAvgS:    number | null;
}

function capitalize(s: string): string {
  return s.toUpperCase();
}

function buildRows(session: LoadedSession): MergedCornerRow[] {
  const blcByid = new Map<string, BestLapCorner>();
  for (const c of session.data.best_lap_corners) {
    blcByid.set(c.corner_id.toUpperCase(), c);
    blcByid.set(c.corner_name.toUpperCase(), c);
  }

  // Merge consistency data + best_lap_corners
  const rows: MergedCornerRow[] = Object.entries(session.data.consistency.corners).map(([id, cc]) => {
    const uid = id.toUpperCase();
    const blc = blcByid.get(uid) ?? null;
    return {
      id: uid,
      name: uid,
      entryMph:     blc ? blc.entry_speed_kph * KPH_TO_MPH : null,
      apexBestMph:  blc ? blc.min_speed_kph * KPH_TO_MPH : cc.min_speed_best * KPH_TO_MPH,
      exitMph:      blc ? blc.exit_speed_kph * KPH_TO_MPH : null,
      gear:         blc?.gear_at_apex ?? null,
      trailBrakeS:  blc?.trail_brake_duration_s ?? null,
      throttleOnFt: blc ? blc.throttle_on_m * M_TO_FEET : null,
      apexAvgMph:   cc.min_speed_avg * KPH_TO_MPH,
      gapMph:       cc.min_speed_delta * KPH_TO_MPH,
      brakeStdFt:   cc.brake_point_std_m * M_TO_FEET,
      coastAvgS:    cc.coast_time_avg,
    };
  });

  // Sort by consistency gap descending (biggest opportunity first)
  return rows.sort((a, b) => (b.gapMph ?? 0) - (a.gapMph ?? 0));
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function gapColor(v: number | null): string {
  if (v === null) return 'inherit';
  if (v > 3)  return '#EF3340';
  if (v > 1.5) return '#F59E0B';
  return 'hsl(var(--muted-foreground))';
}

function brakeStdColor(v: number | null): string {
  if (v === null) return 'inherit';
  if (v > 40) return '#EF3340';
  if (v > 20) return '#F59E0B';
  return 'hsl(var(--muted-foreground))';
}

function coastColor(v: number | null): string {
  if (v === null) return 'inherit';
  if (v > 0.3) return '#F59E0B';
  return 'hsl(var(--muted-foreground))';
}

function trailColor(v: number | null): string {
  if (v === null) return 'inherit';
  // Long trail braking = good technique; very short = abrupt; none = not trail braking
  if (v > 0.3) return '#22C55E';
  if (v > 0.1) return '#F59E0B';
  return 'hsl(var(--muted-foreground))';
}

function throttleColor(v: number | null): string {
  if (v === null) return 'inherit';
  // Shorter throttle-on distance = earlier WOT pickup = better exit
  if (v < 50)  return '#22C55E';
  if (v < 100) return '#F59E0B';
  return '#EF3340';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`pb-2 pt-0 text-[8px] tracking-[0.12em] uppercase whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      style={{ color: '#404050', fontFamily: 'BMWTypeNext', fontWeight: 400, borderBottom: '1px solid #1A1A2A' }}>
      {children}
    </th>
  );
}

function Td({ children, right, mono, color, dim }: {
  children: React.ReactNode; right?: boolean; mono?: boolean; color?: string; dim?: boolean;
}) {
  return (
    <td className={`py-2 ${right ? 'text-right' : 'text-left'}`}
      style={{
        fontFamily: mono ? 'JetBrains Mono' : 'BMWTypeNext',
        fontSize: mono ? '12px' : '11px',
        color: color ?? (dim ? '#404050' : 'hsl(var(--foreground))'),
        letterSpacing: mono ? 0 : '0.03em',
        borderBottom: '1px solid #12121C',
      }}>
      {children}
    </td>
  );
}

function Val({ v, decimals, suffix, color }: { v: number | null; decimals?: number; suffix?: string; color?: string }) {
  if (v === null) return <span style={{ color: '#30303C' }}>—</span>;
  return (
    <span style={{ color }}>
      {decimals != null ? v.toFixed(decimals) : Math.round(v)}
      {suffix && <span style={{ fontSize: '8px', color: '#404050', marginLeft: 2 }}>{suffix}</span>}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { sessions: LoadedSession[] }

export function CornerDetailTable({ sessions }: Props) {
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id ?? '');
  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );
  const rows = useMemo(() => activeSession ? buildRows(activeSession) : [], [activeSession]);

  if (sessions.length === 0) return (
    <p className="text-xs tracking-wider text-muted-foreground uppercase">Load a session to see corner detail.</p>
  );

  const hasEntry   = rows.some(r => r.entryMph !== null);
  const hasExit    = rows.some(r => r.exitMph !== null);
  const hasGear    = rows.some(r => r.gear !== null);
  const hasTrail   = rows.some(r => r.trailBrakeS !== null);
  const hasThrotOn = rows.some(r => r.throttleOnFt !== null);

  return (
    <div className="space-y-3">
      {/* Session selector */}
      {sessions.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {sessions.map(s => (
            <button key={s.id} onClick={() => setActiveSessionId(s.id)}
              className="text-[10px] px-2.5 py-1 rounded border transition-colors tracking-wider uppercase"
              style={{
                borderColor: s.id === activeSessionId ? s.color : 'hsl(var(--border))',
                color: s.id === activeSessionId ? s.color : 'hsl(var(--muted-foreground))',
                background: s.id === activeSessionId ? `${s.color}12` : 'transparent',
                fontFamily: 'BMWTypeNext',
              }}>
              {sessionLabel(s)}
            </button>
          ))}
        </div>
      )}

      {/* Opportunity note */}
      <p className="text-[8px] tracking-[0.1em] uppercase" style={{ color: '#404050' }}>
        Sorted by opportunity — largest apex speed variance first
      </p>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr>
              <Th>Corner</Th>
              {hasEntry   && <Th right>Entry</Th>}
              <Th right>Best Apex</Th>
              <Th right>Avg Apex</Th>
              <Th right>Gap ↓</Th>
              {hasExit    && <Th right>Exit</Th>}
              {hasGear    && <Th right>Gear</Th>}
              {hasTrail   && <Th right>Trail</Th>}
              {hasThrotOn && <Th right>Throt-On</Th>}
              <Th right>Brake σ</Th>
              <Th right>Coast</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} style={{ background: idx === 0 ? 'rgba(239,51,64,0.04)' : undefined }}>
                <Td>
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <span className="text-[8px] px-1 py-0.5 rounded"
                        style={{ background: '#EF334020', color: '#EF3340', fontFamily: 'BMWTypeNext', letterSpacing: '0.06em' }}>
                        #1
                      </span>
                    )}
                    <span style={{ fontFamily: 'BMWTypeNext', fontSize: '13px', fontWeight: 600 }}>
                      {capitalize(row.name)}
                    </span>
                  </div>
                </Td>
                {hasEntry   && <Td right mono><Val v={row.entryMph}     decimals={1} suffix="mph" /></Td>}
                <Td right mono><Val v={row.apexBestMph} decimals={1} suffix="mph" /></Td>
                <Td right mono dim><Val v={row.apexAvgMph}  decimals={1} /></Td>
                <Td right mono color={gapColor(row.gapMph)}>
                  <Val v={row.gapMph} decimals={1} suffix="mph" color={gapColor(row.gapMph)} />
                </Td>
                {hasExit    && <Td right mono><Val v={row.exitMph}      decimals={1} suffix="mph" /></Td>}
                {hasGear    && <Td right mono dim><Val v={row.gear} /></Td>}
                {hasTrail   && (
                  <Td right mono color={trailColor(row.trailBrakeS)}>
                    <Val v={row.trailBrakeS} decimals={2} suffix="s" color={trailColor(row.trailBrakeS)} />
                  </Td>
                )}
                {hasThrotOn && (
                  <Td right mono color={throttleColor(row.throttleOnFt)}>
                    <Val v={row.throttleOnFt} decimals={0} suffix="ft" color={throttleColor(row.throttleOnFt)} />
                  </Td>
                )}
                <Td right mono color={brakeStdColor(row.brakeStdFt)}>
                  <Val v={row.brakeStdFt} decimals={0} suffix="ft" color={brakeStdColor(row.brakeStdFt)} />
                </Td>
                <Td right mono color={coastColor(row.coastAvgS)}>
                  <Val v={row.coastAvgS} decimals={2} suffix="s" color={coastColor(row.coastAvgS)} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
        {[
          { color: '#EF3340', label: 'High variability / poor technique' },
          { color: '#F59E0B', label: 'Moderate — worth attention' },
          { color: '#22C55E', label: 'Good technique (trail brake / throttle pickup)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color }} />
            <span style={{ fontFamily: 'BMWTypeNext', fontSize: '8px', letterSpacing: '0.08em', color: '#404050' }}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
