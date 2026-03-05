import { useMemo } from 'react';
import type { LoadedSession } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, sessionLabel } from '@/lib/utils';

interface Insight {
  id: string;
  label: string;
  detail: string;
  severityColor: string;
  severityRGB: string;
}

function buildInsights(session: LoadedSession): Insight[] {
  const insights: Insight[] = [];
  const { consistency, best_lap_corners } = session.data;

  // 1. Consistency
  if (consistency.spread_s >= 8) {
    insights.push({
      id: 'consistency',
      label: 'Consistency Crisis',
      detail: `${consistency.spread_s.toFixed(1)}s spread between best and worst lap`,
      severityColor: '#EF4444',
      severityRGB: '239,68,68',
    });
  } else if (consistency.spread_s >= 4) {
    insights.push({
      id: 'consistency',
      label: 'Work Needed',
      detail: `${consistency.spread_s.toFixed(1)}s lap time spread`,
      severityColor: '#F59E0B',
      severityRGB: '245,158,11',
    });
  }

  // 2. Top corner opportunity
  const corners = Object.entries(consistency.corners);
  if (corners.length > 0) {
    const [bestCornerName, bestCorner] = corners.reduce((best, curr) =>
      curr[1].min_speed_delta > best[1].min_speed_delta ? curr : best
    );
    if (bestCorner.min_speed_delta > 0) {
      insights.push({
        id: 'corner-opportunity',
        label: 'Corner Opportunity',
        detail: `${bestCornerName} — ${(bestCorner.min_speed_delta * KPH_TO_MPH).toFixed(1)} mph avg gap vs best lap`,
        severityColor: '#3B82F6',
        severityRGB: '59,130,246',
      });
    }
  }

  // 3. Coast time
  const coastOffender = best_lap_corners.find(c => c.coast_time_s > 0.3);
  if (coastOffender) {
    insights.push({
      id: 'coast-time',
      label: 'Coasting Detected',
      detail: `${coastOffender.coast_time_s.toFixed(2)}s coasting at ${coastOffender.corner_name} — consider earlier throttle`,
      severityColor: '#F59E0B',
      severityRGB: '245,158,11',
    });
  }

  // 4. Braking consistency
  if (corners.length > 0) {
    const [worstBrakeName, worstBrake] = corners.reduce((worst, curr) =>
      curr[1].brake_point_std_m > worst[1].brake_point_std_m ? curr : worst
    );
    if (worstBrake.brake_point_std_m > 6) {
      insights.push({
        id: 'braking',
        label: 'Braking Inconsistency',
        detail: `${worstBrakeName} — ${(worstBrake.brake_point_std_m * M_TO_FEET).toFixed(0)} ft brake point std dev`,
        severityColor: '#EF4444',
        severityRGB: '239,68,68',
      });
    }
  }

  return insights.slice(0, 3);
}

interface Props {
  sessions: LoadedSession[];
}

export function CoachingInsights({ sessions }: Props) {
  const insightsBySession = useMemo(
    () => sessions.map(s => ({ session: s, insights: buildInsights(s) })),
    [sessions]
  );

  if (sessions.length === 0) {
    return <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: '#606070' }}>Load a session to see coaching insights.</p>;
  }

  return (
    <div className="space-y-6">
      {insightsBySession.map(({ session, insights }) => (
        <div key={session.id} className="space-y-2">
          {sessions.length > 1 && (
            <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', fontWeight: 600, color: '#9898A8' }}>{sessionLabel(session)}</p>
          )}
          {insights.length === 0 ? (
            <div className="card p-3 flex items-start gap-3" style={{ borderLeft: '3px solid #22C55E', background: 'rgba(34,197,94,0.04)' }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: '13px', fontWeight: 600, color: '#22C55E' }}>
                No significant issues found — consistent driving.
              </div>
            </div>
          ) : (
            insights.map(insight => (
              <div
                key={insight.id}
                className="card p-3 flex flex-col gap-1"
                style={{ borderLeft: `3px solid ${insight.severityColor}`, background: `rgba(${insight.severityRGB}, 0.04)` }}
              >
                <div style={{ fontFamily: 'Rajdhani', fontSize: '13px', fontWeight: 600, color: '#E8E8F0' }}>{insight.label}</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: '11px', color: '#9898A8', marginTop: 2 }}>{insight.detail}</div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
