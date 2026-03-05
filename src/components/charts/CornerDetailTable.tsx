import { useState, useMemo } from 'react';
import type { LoadedSession } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, sessionLabel } from '@/lib/utils';

interface CornerRow {
  cornerName: string;
  bestSpeedMph: number;
  avgSpeedMph: number;
  gapMph: number;
  brakeStdFt: number;
  coastTimeS: number;
}

function gapColor(gapMph: number): string {
  if (gapMph > 3) return '#EF4444';
  if (gapMph >= 2) return '#F59E0B';
  return '#9898A8';
}

function brakeColor(ft: number): string {
  if (ft > 40) return '#EF4444';
  if (ft >= 20) return '#F59E0B';
  return '#9898A8';
}

function buildRows(session: LoadedSession): CornerRow[] {
  return Object.entries(session.data.consistency.corners)
    .map(([name, corner]) => ({
      cornerName: name,
      bestSpeedMph: corner.min_speed_best * KPH_TO_MPH,
      avgSpeedMph: corner.min_speed_avg * KPH_TO_MPH,
      gapMph: corner.min_speed_delta * KPH_TO_MPH,
      brakeStdFt: corner.brake_point_std_m * M_TO_FEET,
      coastTimeS: corner.coast_time_avg,
    }))
    .sort((a, b) => b.gapMph - a.gapMph);
}

interface Props {
  sessions: LoadedSession[];
}

export function CornerDetailTable({ sessions }: Props) {
  const [activeSessionId, setActiveSessionId] = useState<string>(
    sessions[0]?.id ?? ''
  );

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  const rows = useMemo(
    () => (activeSession ? buildRows(activeSession) : []),
    [activeSession]
  );

  if (sessions.length === 0) {
    return <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: '#606070' }}>Load a session to see corner detail.</p>;
  }

  const thStyle: React.CSSProperties = {
    fontFamily: 'Rajdhani',
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#606070',
    fontWeight: 500,
    paddingBottom: 8,
    paddingRight: 12,
  };

  return (
    <div className="space-y-4">
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2E2E3C' }}>
              <th className="text-left" style={thStyle}>Corner</th>
              <th className="text-right" style={thStyle}>Best (mph)</th>
              <th className="text-right" style={thStyle}>Avg (mph)</th>
              <th className="text-right" style={thStyle}>Gap (mph)</th>
              <th className="text-right" style={thStyle}>Brake Std</th>
              <th className="text-right" style={{ ...thStyle, paddingRight: 0 }}>Coast</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.cornerName}
                style={{ borderBottom: '1px solid #1E1E28', height: 44 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#242430')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ fontFamily: 'Rajdhani', fontSize: '14px', fontWeight: 600, color: '#E8E8F0', paddingRight: 12 }}>
                  {row.cornerName}
                </td>
                <td className="text-right" style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#E8E8F0', paddingRight: 12 }}>
                  {row.bestSpeedMph.toFixed(1)}
                </td>
                <td className="text-right" style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#9898A8', paddingRight: 12 }}>
                  {row.avgSpeedMph.toFixed(1)}
                </td>
                <td className="text-right" style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 600, color: gapColor(row.gapMph), paddingRight: 12 }}>
                  {row.gapMph.toFixed(1)}
                  <span style={{ fontFamily: 'Rajdhani', fontSize: '10px', color: '#606070', marginLeft: 2 }}>mph</span>
                </td>
                <td className="text-right" style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: brakeColor(row.brakeStdFt), paddingRight: 12 }}>
                  {row.brakeStdFt.toFixed(0)}
                  <span style={{ fontFamily: 'Rajdhani', fontSize: '10px', color: '#606070', marginLeft: 2 }}>ft</span>
                </td>
                <td className="text-right" style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#9898A8' }}>
                  {row.coastTimeS.toFixed(2)}
                  <span style={{ fontFamily: 'Rajdhani', fontSize: '10px', color: '#606070', marginLeft: 2 }}>s</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
