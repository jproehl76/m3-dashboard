import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { LoadedSession, GpsPoint, BestLapCorner } from '@/types/session';
import { KPH_TO_MPH, BAR_TO_PSI, M_TO_FEET, sessionLabel } from '@/lib/utils';

type ColorMode = 'speed' | 'throttle' | 'brake';

const SVG_W = 540;
const SVG_H = 480;
const PAD  = 40;

// ── Premium motorsport color scales ──────────────────────────────────────────
// Speed:    dark navy (braking zones) → BMW blue → cyan → bright mint (flat out)
// Throttle: off-black → vivid green
// Brake:    off-black → BMW M red

function getColor(t: number, mode: ColorMode): string {
  const c = Math.max(0, Math.min(1, t));
  if (mode === 'brake')    return d3.interpolateRgb('#12121E', '#EF3340')(c);
  if (mode === 'throttle') return d3.interpolateRgb('#12121E', '#00C853')(c);
  if (c < 0.40) return d3.interpolateRgb('#1C2B4A', '#1C69D4')(c / 0.40);
  if (c < 0.75) return d3.interpolateRgb('#1C69D4', '#00D4FF')((c - 0.40) / 0.35);
  return d3.interpolateRgb('#00D4FF', '#CCFFE8')((c - 0.75) / 0.25);
}

// ── Segment builder ───────────────────────────────────────────────────────────
interface Seg { x1: number; y1: number; x2: number; y2: number; t: number }

function buildSegments(points: GpsPoint[], mode: ColorMode) {
  if (points.length < 2) return { segs: [] as Seg[], proj: null as d3.GeoProjection | null };

  const proj = d3.geoMercator().fitExtent(
    [[PAD, PAD], [SVG_W - PAD, SVG_H - PAD]],
    {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: points.map(p => [p.lon, p.lat]) },
        properties: {},
      }],
    } as GeoJSON.FeatureCollection
  );

  const raw = points.map(p =>
    mode === 'speed'    ? p.speed_kph * KPH_TO_MPH :
    mode === 'throttle' ? p.throttle_pct :
    p.brake_bar * BAR_TO_PSI
  );
  const lo = d3.min(raw) ?? 0;
  const hi = d3.max(raw) ?? 1;
  const range = hi - lo || 1;

  const segs: Seg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = proj([points[i].lon,     points[i].lat]);
    const b = proj([points[i + 1].lon, points[i + 1].lat]);
    if (!a || !b) continue;
    segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], t: (raw[i] - lo) / range });
  }
  return { segs, proj };
}

// ── Corner apex detector ──────────────────────────────────────────────────────
interface Apex { id: string; name: string; x: number; y: number; corner: BestLapCorner }

function computeApexes(trace: GpsPoint[], corners: BestLapCorner[], proj: d3.GeoProjection): Apex[] {
  if (!trace.length || !corners.length) return [];
  const chunk = Math.ceil(trace.length / corners.length);
  return corners.flatMap((c, i) => {
    const slice = trace.slice(i * chunk, Math.min((i + 1) * chunk, trace.length));
    if (!slice.length) return [];
    const apex = slice.reduce((m, p) => p.speed_kph < m.speed_kph ? p : m, slice[0]);
    const xy = proj([apex.lon, apex.lat]);
    if (!xy) return [];
    return [{ id: c.corner_id, name: c.corner_name, x: xy[0], y: xy[1], corner: c }];
  });
}

// ── Corner coaching card ──────────────────────────────────────────────────────
function CornerCard({ corner, onClose }: { corner: BestLapCorner; onClose: () => void }) {
  const mph = (k: number) => (k * KPH_TO_MPH).toFixed(0);
  const ft  = (m: number) => (m * M_TO_FEET).toFixed(0);

  return (
    <div className="shrink-0 border-t border-[#2E2E3C] p-3" style={{ background: 'rgba(168,85,247,0.05)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 rounded-full" style={{ background: '#A855F7' }} />
          <span style={{ fontFamily: 'Barlow Condensed', fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em', color: '#E8E8F0', textTransform: 'uppercase' }}>
            {corner.corner_name}
          </span>
        </div>
        <button onClick={onClose}
          style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.1em', color: '#404058', textTransform: 'uppercase' }}
          className="hover:text-[#EF4444] transition-colors px-1">✕</button>
      </div>

      {/* Speed trio */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {[
          { label: 'Entry', val: mph(corner.entry_speed_kph), color: '#3B82F6' },
          { label: 'Apex',  val: mph(corner.min_speed_kph),   color: '#A855F7' },
          { label: 'Exit',  val: mph(corner.exit_speed_kph),  color: '#22C55E' },
        ].map(s => (
          <div key={s.label} className="rounded p-2 text-center" style={{ background: '#0A0A12', border: `1px solid ${s.color}28` }}>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '8px', letterSpacing: '0.15em', color: '#404058', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '15px', fontWeight: 600, color: s.color, lineHeight: 1.1, marginTop: 1 }}>{s.val}</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '8px', color: '#404058' }}>mph</div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Brake',  val: corner.brake_point_m > 0 ? `${ft(corner.brake_point_m)}ft` : '—',       warn: false },
          { label: 'Coast',  val: corner.coast_time_s > 0.05 ? `${corner.coast_time_s.toFixed(2)}s` : 'none', warn: corner.coast_time_s > 0.2 },
          { label: 'Peak G', val: `${corner.peak_lat_g.toFixed(2)}G`,                                      warn: false },
        ].map(s => (
          <div key={s.label} className="rounded p-2 text-center" style={{ background: '#0A0A12', border: '1px solid #1E1E28' }}>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '8px', letterSpacing: '0.15em', color: '#404058', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600, color: s.warn ? '#F59E0B' : '#9898A8', lineHeight: 1.1, marginTop: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export interface TrackMapProps {
  sessions: LoadedSession[];
  /** 'panel' fills parent height; 'chart' uses fixed aspect ratio */
  variant?: 'panel' | 'chart';
  selectedCornerId?: string | null;
  onCornerSelect?: (id: string | null) => void;
}

export function TrackMapChart({ sessions, variant = 'chart', selectedCornerId, onCornerSelect }: TrackMapProps) {
  const [mode, setMode]     = useState<ColorMode>('speed');
  const [activeId, setId]   = useState(sessions[0]?.id ?? '');

  const session = useMemo(() => sessions.find(s => s.id === activeId) ?? sessions[0], [sessions, activeId]);
  const trace   = session?.data.gps_trace ?? [];

  const { segs, proj } = useMemo(() => buildSegments(trace, mode), [trace, mode]);
  const apexes = useMemo(
    () => (proj && session ? computeApexes(trace, session.data.best_lap_corners, proj) : []),
    [trace, session, proj]
  );
  const selApex = apexes.find(a => a.id === selectedCornerId);

  const modeAccent: Record<ColorMode, string> = { speed: '#1C69D4', throttle: '#00C853', brake: '#EF3340' };

  if (!session || !trace.length) {
    return (
      <div className="flex items-center justify-center w-full rounded-lg"
        style={{
          background: '#050508',
          height: variant === 'panel' ? '100%' : undefined,
          aspectRatio: variant === 'chart' ? `${SVG_W}/${SVG_H}` : undefined,
        }}>
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.15em', color: '#252535', textTransform: 'uppercase' }}>
          Load a session · GPS trace appears here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full overflow-hidden rounded-lg"
      style={{ background: '#050508', height: variant === 'panel' ? '100%' : undefined }}>

      {/* ── Controls ── */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 shrink-0">
        {sessions.length > 1 ? (
          <div className="flex gap-1 flex-wrap min-w-0">
            {sessions.map(s => (
              <button key={s.id} onClick={() => setId(s.id)} style={{
                fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 3, border: '1px solid',
                borderColor: s.id === activeId ? s.color : '#1E1E28',
                color: s.id === activeId ? s.color : '#404058',
                background: s.id === activeId ? `${s.color}14` : 'transparent',
              }}>{sessionLabel(s)}</button>
            ))}
          </div>
        ) : (
          <span style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', color: '#404058', textTransform: 'uppercase' }}>
            {session.data.header.track || 'GPS Trace'}
          </span>
        )}
        <div className="flex gap-0.5 shrink-0">
          {(['speed', 'throttle', 'brake'] as ColorMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              fontFamily: 'Barlow Condensed', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 3, border: '1px solid',
              borderColor: mode === m ? modeAccent[m] : '#1E1E28',
              color: mode === m ? modeAccent[m] : '#404058',
              background: mode === m ? `${modeAccent[m]}14` : 'transparent',
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── SVG map ── */}
      <div className="w-full min-h-0" style={{
        flex: variant === 'panel' ? '1 1 0' : undefined,
        aspectRatio: variant === 'chart' ? `${SVG_W}/${SVG_H}` : undefined,
        padding: '0 10px',
      }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <filter id="tGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="cGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect width={SVG_W} height={SVG_H} fill="#050508" />

          {/* Subtle grid */}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={SVG_W / 8 * i} y1={0} x2={SVG_W / 8 * i} y2={SVG_H} stroke="#0C0C14" strokeWidth={1} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={SVG_H / 6 * i} x2={SVG_W} y2={SVG_H / 6 * i} stroke="#0C0C14" strokeWidth={1} />
          ))}

          {/* Glowing track line */}
          <g filter="url(#tGlow)">
            {segs.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={getColor(s.t, mode)} strokeWidth={3.5} strokeLinecap="round" />
            ))}
          </g>

          {/* Corner markers */}
          {apexes.map(a => {
            const sel = selectedCornerId === a.id;
            return (
              <g key={a.id} style={{ cursor: 'pointer' }} filter={sel ? 'url(#cGlow)' : undefined}
                onClick={() => onCornerSelect?.(sel ? null : a.id)}>
                {sel && <circle cx={a.x} cy={a.y} r={17} fill="none" stroke="#A855F7" strokeWidth={1} opacity={0.4} />}
                <circle cx={a.x} cy={a.y} r={sel ? 11 : 8}
                  fill={sel ? '#A855F7' : '#08080F'}
                  stroke={sel ? '#A855F7' : '#505060'} strokeWidth={sel ? 0 : 1.5} />
                <text x={a.x} y={a.y + 0.5} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontFamily: 'Barlow Condensed', fontSize: sel ? '9px' : '8px', fontWeight: 700,
                    fill: sel ? '#FFF' : '#9898A8', userSelect: 'none', pointerEvents: 'none' }}>
                  {a.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 px-4 pb-2 shrink-0">
        <span style={{ fontFamily: 'Barlow Condensed', fontSize: '8px', letterSpacing: '0.1em', color: '#303040', textTransform: 'uppercase' }}>
          {mode === 'speed' ? 'slow' : '0'}
        </span>
        <div className="h-0.5 flex-1 rounded" style={{
          background:
            mode === 'brake'    ? 'linear-gradient(to right,#12121E,#EF3340)' :
            mode === 'throttle' ? 'linear-gradient(to right,#12121E,#00C853)' :
            'linear-gradient(to right,#1C2B4A,#1C69D4,#00D4FF,#CCFFE8)',
        }} />
        <span style={{ fontFamily: 'Barlow Condensed', fontSize: '8px', letterSpacing: '0.1em', color: '#505060', textTransform: 'uppercase' }}>
          {mode === 'speed' ? 'fast' : mode === 'throttle' ? '100%' : 'max'}
        </span>
      </div>

      {/* Corner coaching card */}
      {selApex && <CornerCard corner={selApex.corner} onClose={() => onCornerSelect?.(null)} />}
    </div>
  );
}
