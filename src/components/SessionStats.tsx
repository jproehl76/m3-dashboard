import type { LoadedSession } from '@/types/session';
import { formatLapTime, sessionLabel, consistencyRating } from '@/lib/utils';

interface Props {
  sessions: LoadedSession[];
}

export function SessionStats({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-600">
        Load sessions to see summary statistics
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(sessions.length, 3)}, 1fr)` }}>
      {sessions.map(session => {
        const { consistency, header, friction_circle } = session.data;
        const rating = consistencyRating(consistency.spread_s);

        return (
          <div
            key={session.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3"
            style={{ borderLeftColor: session.color, borderLeftWidth: 3 }}
          >
            {/* Session label */}
            <div>
              <p className="text-xs font-semibold text-slate-200 truncate">{sessionLabel(session)}</p>
              <p className="text-xs text-slate-500">{header.analyzed_laps} laps · {header.duration_minutes.toFixed(1)} min</p>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Best Lap" value={formatLapTime(consistency.best_lap_s)} />
              <Stat label="Avg Lap" value={formatLapTime(consistency.mean_lap_s)} />
              <Stat label="Spread" value={`${consistency.spread_s.toFixed(1)}s`} valueColor={rating.color} />
              <Stat label="Consistency" value={rating.label} valueColor={rating.color} />
              <Stat label="Peak Lat G" value={`${friction_circle.peak_lat_g.toFixed(2)}G`} />
              <Stat label=">0.8G" value={`${friction_circle.time_above_08g_pct.toFixed(1)}%`} />
            </div>

            {/* Missing channels warning */}
            {header.channels_missing.length > 0 && (
              <p className="text-xs text-amber-500">
                ⚠ Missing: {header.channels_missing.join(', ')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold font-mono" style={{ color: valueColor ?? '#e2e8f0' }}>
        {value}
      </p>
    </div>
  );
}
