import type { LoadedSession } from '@/types/session';
import { celsiusToF, sessionLabel, THERMAL_THRESHOLDS, thermalAlertLevel } from '@/lib/utils';

interface ThermalCardData {
  label: string;
  channel: string;
  current: number;
  peak: number;
  start: number;
  unit: string;
  alertLevel: 'ok' | 'watch' | 'critical';
  pct: number;
}

const CHANNEL_OPTIONS = [
  { key: 'oil_temp',     label: 'Oil Temp',   min: 180, max: 300 },
  { key: 'trans_temp',   label: 'Trans',      min: 100, max: 230 },
  { key: 'coolant_temp', label: 'Coolant',    min: 150, max: 260 },
  { key: 'iat',          label: 'Intake Air', min: 50,  max: 150 },
  { key: 'boost',        label: 'Boost',      min: 0,   max: 2.0 },
];

function alertColor(level: 'ok' | 'watch' | 'critical'): string {
  if (level === 'critical') return '#EF4444';
  if (level === 'watch') return '#F59E0B';
  return '#22C55E';
}

function buildCardData(session: LoadedSession): ThermalCardData[] {
  return CHANNEL_OPTIONS.flatMap(opt => {
    const t = session.data.thermals.find(th => th.channel === opt.key);
    if (!t) return [];
    const isBoost = opt.key === 'boost';
    const current = isBoost ? parseFloat(t.end_val.toFixed(2)) : Math.round(celsiusToF(t.end_val));
    const peak = isBoost ? parseFloat(t.peak_val.toFixed(2)) : Math.round(celsiusToF(t.peak_val));
    const start = isBoost ? parseFloat(t.start_val.toFixed(2)) : Math.round(celsiusToF(t.start_val));
    const unit = isBoost ? 'bar' : '°F';
    const alertLevel = thermalAlertLevel(opt.key, t.peak_val);
    const th = THERMAL_THRESHOLDS[opt.key];
    const rangeMin = isBoost ? opt.min : Math.round(celsiusToF(opt.min));
    const rangeMax = th ? th.critical * 1.05 : (isBoost ? opt.max : Math.round(celsiusToF(opt.max)));
    const pct = Math.min(100, Math.max(0, ((peak - rangeMin) / (rangeMax - rangeMin)) * 100));
    return [{
      label: opt.label,
      channel: opt.key,
      current,
      peak,
      start,
      unit,
      alertLevel,
      pct,
    }];
  });
}

interface ThermalChartProps {
  sessions: LoadedSession[];
}

export function ThermalChart({ sessions }: ThermalChartProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center" style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: '#606070' }}>
        Load sessions to see thermal trends
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map(session => (
        <div key={session.id} className="space-y-2">
          {sessions.length > 1 && (
            <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', fontWeight: 600, color: '#9898A8' }}>{sessionLabel(session)}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {buildCardData(session).map(card => {
              const color = alertColor(card.alertLevel);
              return (
                <div key={card.channel} className="card p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: 'Rajdhani', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#606070' }}>
                      {card.label}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#606070' }}>
                      pk {card.peak}{card.unit}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '20px', fontWeight: 500, color, lineHeight: 1 }}>
                    {card.current}{card.unit}
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1E1E28' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${card.pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
                    />
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#606070' }}>
                    start {card.start}{card.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
