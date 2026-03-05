import type { LoadedSession } from '@/types/session';
import { formatLapTime } from '@/lib/utils';

interface Props { sessions: LoadedSession[] }

// Colors matching F1 timing screens
const SECTOR_COLORS = {
  best:    '#A855F7', // purple = fastest overall
  good:    '#22C55E', // green  = personal best this session
  normal:  '#F59E0B', // yellow = slower
};

export function LapInfoPanel({ sessions }: Props) {
  if (sessions.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-border">
      {sessions.map((session, si) => {
        const cleanLaps = session.data.laps.filter(l => !l.is_outlier);
        if (cleanLaps.length === 0) return null;

        // Find best lap
        const bestLap = cleanLaps.reduce((b, l) => l.lap_time_s < b.lap_time_s ? l : b, cleanLaps[0]);
        const hasSectors = (bestLap.sector_times?.length ?? 0) > 0;

        // Per-sector best across all clean laps (for color coding)
        const sectorBests = hasSectors
          ? bestLap.sector_times.map((_, si2) =>
              Math.min(...cleanLaps.map(l => l.sector_times?.[si2] ?? Infinity))
            )
          : [];

        const accentColor = session.color;

        return (
          <div key={session.id}
            className="px-3 py-2.5 space-y-2"
            style={{ borderLeft: si === 0 ? `2px solid ${accentColor}` : `2px solid ${session.color}40` }}>

            {/* Best lap */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: sessions.length > 1 ? '20px' : '26px',
                  fontWeight: 700,
                  color: SECTOR_COLORS.best,
                  lineHeight: 1,
                  textShadow: `0 0 20px ${SECTOR_COLORS.best}50`,
                }}>
                  {formatLapTime(session.data.consistency.best_lap_s)}
                </span>
                <span className="text-[9px] tracking-widest uppercase text-muted-foreground">
                  Best
                </span>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
                  L{bestLap.lap_num}
                </div>
                <div className="text-[8px] tracking-widest text-muted-foreground/50 uppercase">
                  {cleanLaps.length} laps
                </div>
              </div>
            </div>

            {/* Sector breakdown */}
            {hasSectors && (
              <div className="flex gap-1">
                {bestLap.sector_times.map((t, si2) => {
                  const isBest = t <= sectorBests[si2] + 0.001;
                  const color = isBest ? SECTOR_COLORS.best : SECTOR_COLORS.good;
                  return (
                    <div key={si2} className="flex-1 rounded px-1.5 py-1 text-center"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <div className="text-[7px] tracking-widest uppercase mb-0.5"
                        style={{ color: `${color}80` }}>
                        S{si2 + 1}
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color, lineHeight: 1 }}>
                        {t.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Consistency bar — spread across lap times */}
            <div className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[8px] tracking-widest uppercase text-muted-foreground/50">
                  Consistency
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'hsl(var(--muted-foreground))' }}>
                  ±{session.data.consistency.std_dev_s.toFixed(2)}s
                </span>
              </div>
              {/* Mini lap sparkline — relative dot positions */}
              <div className="relative h-4 flex items-center">
                {(() => {
                  const times = cleanLaps.map(l => l.lap_time_s);
                  const min = Math.min(...times), max = Math.max(...times);
                  const range = max - min || 1;
                  return (
                    <svg width="100%" height="16" style={{ overflow: 'visible' }}>
                      {times.map((t, i) => {
                        const x = (i / Math.max(times.length - 1, 1)) * 100;
                        const isBestDot = t === session.data.consistency.best_lap_s;
                        const normalizedY = ((t - min) / range) * 12;
                        return (
                          <circle key={i}
                            cx={`${x}%`} cy={normalizedY + 2} r={isBestDot ? 2.5 : 1.5}
                            fill={isBestDot ? SECTOR_COLORS.best : accentColor}
                            opacity={isBestDot ? 1 : 0.5}
                          />
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
