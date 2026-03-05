import { useEffect, useState } from 'react';
import {
  initiateWhoopAuth,
  isWhoopConnected,
  disconnectWhoop,
  getWhoopToken,
} from '@/lib/services/whoopAuth';
import { fetchWhoopDataForDates, type WhoopDayData } from '@/lib/services/whoopApi';

// Guard: hide the panel entirely when credentials are not configured
const CLIENT_ID = import.meta.env.VITE_WHOOP_CLIENT_ID as string | undefined;

interface Props {
  sessionDates: string[];
  connectedOverride?: boolean;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

function recoveryColor(score: number | null): string {
  if (score === null) return '#505060';
  if (score >= 67) return '#22C55E';
  if (score >= 34) return '#F59E0B';
  return '#EF4444';
}

function sleepColor(pct: number | null): string {
  if (pct === null) return '#505060';
  if (pct >= 85) return '#22C55E';
  if (pct >= 70) return '#F59E0B';
  return '#EF4444';
}

function hrvColor(ms: number | null): string {
  if (ms === null) return '#505060';
  if (ms >= 70) return '#22C55E';
  if (ms >= 50) return '#F59E0B';
  return '#EF4444';
}

function hrColor(bpm: number | null): string {
  if (bpm === null) return '#505060';
  if (bpm <= 55) return '#22C55E';
  if (bpm <= 65) return '#F59E0B';
  return '#EF4444';
}

function respColor(rate: number | null): string {
  if (rate === null) return '#505060';
  if (rate >= 12 && rate <= 16) return '#22C55E';
  if (rate <= 18) return '#F59E0B';
  return '#EF4444';
}

function strainColor(strain: number | null): string {
  if (strain === null) return '#505060';
  if (strain < 10) return '#22C55E';
  if (strain < 14) return '#F59E0B';
  if (strain < 18) return '#F97316';
  return '#EF4444';
}

function tempColor(delta: number | null): string {
  if (delta === null) return '#505060';
  const abs = Math.abs(delta);
  if (abs <= 0.3) return '#22C55E';
  if (abs <= 0.6) return '#F59E0B';
  return '#EF4444';
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmt(v: number | null, decimals = 0, suffix = ''): string {
  if (v === null) return '—';
  return `${decimals === 0 ? Math.round(v) : v.toFixed(decimals)}${suffix}`;
}

function fmtHours(h: number | null): string {
  if (h === null) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function fmtTempDelta(v: number | null): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}°C`;
}

function formatDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[(month ?? 1) - 1]} ${day}`;
}

function hasAnyData(d: WhoopDayData): boolean {
  return d.recovery_score !== null || d.hrv_rmssd_ms !== null || d.resting_hr !== null
    || d.sleep_performance_pct !== null || d.day_strain !== null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** A single metric tile */
function Tile({
  label, value, color, sub,
}: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded p-2 text-center" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
      <div className="text-[7px] tracking-widest uppercase mb-1" style={{ color: `${color}90` }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '15px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div className="text-[8px] mt-0.5" style={{ color: `${color}70` }}>{sub}</div>}
    </div>
  );
}

/** Horizontal fill bar */
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

/** Recovery score gauge arc (SVG half-circle) */
function RecoveryArc({ score, color }: { score: number | null; color: string }) {
  const pct = score ?? 0;
  const r = 38;
  const cx = 52, cy = 52;
  const circumference = Math.PI * r; // half circle
  const offset = circumference * (1 - pct / 100);

  return (
    <svg width="104" height="60" viewBox="0 0 104 60" style={{ overflow: 'visible' }}>
      {/* Track */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
        fill="none" stroke="#1A1A2A" strokeWidth={8} strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {/* Score */}
      <text x={cx} y={cy - 4} textAnchor="middle"
        style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 700, fill: color }}>
        {score !== null ? score : '—'}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        style={{ fontFamily: 'BMWTypeNext', fontSize: '7px', letterSpacing: '0.15em', fill: `${color}70`, textTransform: 'uppercase' }}>
        Recovery
      </text>
    </svg>
  );
}

/** A single day driver card */
function DriverCard({ day }: { day: WhoopDayData }) {
  const recColor = recoveryColor(day.recovery_score);
  const slColor  = sleepColor(day.sleep_performance_pct);

  if (!hasAnyData(day)) {
    return (
      <div className="rounded-lg p-3 border border-border/50"
        style={{ fontFamily: 'BMWTypeNext', fontSize: '12px', color: '#505060' }}>
        No WHOOP data — {formatDate(day.date)}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden" style={{ background: '#0B0B14' }}>

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40"
        style={{ background: '#0D0D18' }}>
        <span className="text-[8px] tracking-widest uppercase" style={{ color: '#606070' }}>
          WHOOP · {formatDate(day.date)}
        </span>
        {day.day_strain !== null && (
          <span className="text-[8px] tracking-widest uppercase"
            style={{ color: strainColor(day.day_strain) }}>
            Strain {fmt(day.day_strain, 1)}
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">

        {/* ── Section 1: Readiness ── */}
        <div className="flex items-start gap-3">
          {/* Recovery arc */}
          <div className="shrink-0">
            <RecoveryArc score={day.recovery_score} color={recColor} />
          </div>

          {/* HRV + RHR stack */}
          <div className="flex-1 space-y-1.5 pt-1">
            <div>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[7px] tracking-widest uppercase" style={{ color: '#606070' }}>HRV</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: hrvColor(day.hrv_rmssd_ms) }}>
                  {fmt(day.hrv_rmssd_ms, 0, 'ms')}
                </span>
              </div>
              <Bar pct={(day.hrv_rmssd_ms ?? 0) / 120 * 100} color={hrvColor(day.hrv_rmssd_ms)} />
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-[7px] tracking-widest uppercase" style={{ color: '#606070' }}>Resting HR</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: hrColor(day.resting_hr) }}>
                  {fmt(day.resting_hr, 0, 'bpm')}
                </span>
              </div>
              {/* Inverted bar — lower RHR is better */}
              <Bar pct={day.resting_hr !== null ? Math.max(0, 100 - ((day.resting_hr - 40) / 60 * 100)) : 0}
                color={hrColor(day.resting_hr)} />
            </div>

            {day.respiratory_rate !== null && (
              <div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[7px] tracking-widest uppercase" style={{ color: '#606070' }}>Resp Rate</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: respColor(day.respiratory_rate) }}>
                    {fmt(day.respiratory_rate, 1, '/min')}
                  </span>
                </div>
                <Bar pct={(day.respiratory_rate / 25) * 100} color={respColor(day.respiratory_rate)} />
              </div>
            )}
          </div>
        </div>

        {/* ── Section 2: Sleep ── */}
        <div>
          <div className="text-[7px] tracking-widest uppercase mb-1.5" style={{ color: '#404050' }}>Sleep</div>
          <div className="space-y-1 mb-2">
            {day.sleep_performance_pct !== null && (
              <div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[7px] tracking-widest uppercase" style={{ color: '#606070' }}>Performance</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: slColor }}>
                    {fmt(day.sleep_performance_pct, 0, '%')}
                  </span>
                </div>
                <Bar pct={day.sleep_performance_pct} color={slColor} />
              </div>
            )}
            {day.sleep_consistency_pct !== null && (
              <div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[7px] tracking-widest uppercase" style={{ color: '#606070' }}>Consistency</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: sleepColor(day.sleep_consistency_pct) }}>
                    {fmt(day.sleep_consistency_pct, 0, '%')}
                  </span>
                </div>
                <Bar pct={day.sleep_consistency_pct} color={sleepColor(day.sleep_consistency_pct)} />
              </div>
            )}
          </div>

          {/* Sleep stage tiles */}
          {(day.rem_sleep_hours !== null || day.swe_sleep_hours !== null) && (
            <div className="grid grid-cols-2 gap-1.5">
              {day.rem_sleep_hours !== null && (
                <Tile
                  label="REM Sleep"
                  value={fmtHours(day.rem_sleep_hours)}
                  color={day.rem_sleep_hours >= 1.5 ? '#22C55E' : day.rem_sleep_hours >= 1.0 ? '#F59E0B' : '#EF4444'}
                  sub="target ≥1.5h"
                />
              )}
              {day.swe_sleep_hours !== null && (
                <Tile
                  label="Deep Sleep"
                  value={fmtHours(day.swe_sleep_hours)}
                  color={day.swe_sleep_hours >= 1.0 ? '#22C55E' : day.swe_sleep_hours >= 0.5 ? '#F59E0B' : '#EF4444'}
                  sub="target ≥1h"
                />
              )}
            </div>
          )}
        </div>

        {/* ── Section 3: Engine (autonomic markers) ── */}
        {(day.spo2_pct !== null || day.skin_temp_celsius !== null || day.max_hr !== null) && (
          <div>
            <div className="text-[7px] tracking-widest uppercase mb-1.5" style={{ color: '#404050' }}>Markers</div>
            <div className={`grid gap-1.5 ${[day.spo2_pct, day.skin_temp_celsius, day.max_hr].filter(v => v !== null).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {day.spo2_pct !== null && (
                <Tile
                  label="SpO₂"
                  value={fmt(day.spo2_pct, 1, '%')}
                  color={day.spo2_pct >= 98 ? '#22C55E' : day.spo2_pct >= 95 ? '#F59E0B' : '#EF4444'}
                />
              )}
              {day.skin_temp_celsius !== null && (
                <Tile
                  label="Skin Temp"
                  value={fmtTempDelta(day.skin_temp_celsius)}
                  color={tempColor(day.skin_temp_celsius)}
                  sub="vs baseline"
                />
              )}
              {day.max_hr !== null && (
                <Tile
                  label="Max HR"
                  value={fmt(day.max_hr, 0, 'bpm')}
                  color="#8080A0"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Section 4: Load ── */}
        {day.day_strain !== null && (
          <div>
            <div className="text-[7px] tracking-widest uppercase mb-1.5" style={{ color: '#404050' }}>Load</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[7px] tracking-widest uppercase" style={{ color: '#606070' }}>Day Strain</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: strainColor(day.day_strain) }}>
                    {fmt(day.day_strain, 1)} <span className="text-[8px]" style={{ color: '#505060' }}>/ 21</span>
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#1A1A2A' }}>
                  {/* Graduated zones */}
                  <div className="absolute inset-0 flex">
                    <div style={{ width: '47.6%', background: '#22C55E30' }} />
                    <div style={{ width: '19%',   background: '#F59E0B30' }} />
                    <div style={{ width: '19%',   background: '#F9731630' }} />
                    <div style={{ width: '14.4%', background: '#EF444430' }} />
                  </div>
                  {/* Fill */}
                  <div className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${(day.day_strain / 21) * 100}%`, background: strainColor(day.day_strain) }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  {['Easy', 'Mod', 'Hard', 'Max'].map(z => (
                    <span key={z} className="text-[6px] tracking-widest uppercase" style={{ color: '#404050' }}>{z}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WhoopPanel({ sessionDates, connectedOverride }: Props) {
  if (!CLIENT_ID) return null;

  const [connected, setConnected]  = useState<boolean>(() => isWhoopConnected());
  const [loading, setLoading]      = useState<boolean>(false);
  const [data, setData]            = useState<WhoopDayData[]>([]);
  const [error, setError]          = useState<string | null>(null);

  useEffect(() => {
    if (connectedOverride) setConnected(true);
  }, [connectedOverride]);

  useEffect(() => {
    if (!connected || sessionDates.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const token = await getWhoopToken();
        if (!token) {
          if (!cancelled) { setError('WHOOP session expired. Please reconnect.'); setConnected(false); }
          return;
        }
        const result = await fetchWhoopDataForDates(sessionDates, token);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load WHOOP data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [connected, sessionDates.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDisconnect() {
    disconnectWhoop();
    setConnected(false);
    setData([]);
    setError(null);
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={initiateWhoopAuth}
          className="px-3 py-1.5 rounded-lg transition-colors"
          style={{
            fontFamily: 'BMWTypeNext', fontSize: '12px', fontWeight: 600,
            letterSpacing: '0.05em', background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.4)', color: '#22C55E',
          }}
        >
          Connect WHOOP
        </button>
        <p style={{ fontFamily: 'BMWTypeNext', fontSize: '12px', color: '#606070' }}>
          See your biometrics on race day
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2" style={{ fontFamily: 'BMWTypeNext', fontSize: '12px', color: '#9898A8' }}>
        <span className="animate-spin">⟳</span>
        Loading WHOOP data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p style={{ fontFamily: 'BMWTypeNext', fontSize: '12px', color: '#EF4444' }}>{error}</p>
        <button onClick={handleDisconnect} className="underline transition-colors"
          style={{ fontFamily: 'BMWTypeNext', fontSize: '12px', color: '#606070' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
          onMouseLeave={e => (e.currentTarget.style.color = '#606070')}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(day => <DriverCard key={day.date} day={day} />)}

      <button onClick={handleDisconnect} className="underline transition-colors"
        style={{ fontFamily: 'BMWTypeNext', fontSize: '12px', color: '#505060' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
        onMouseLeave={e => (e.currentTarget.style.color = '#505060')}>
        Disconnect WHOOP
      </button>
    </div>
  );
}
