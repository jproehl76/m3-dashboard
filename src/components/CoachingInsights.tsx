import { useMemo } from 'react';
import type { LoadedSession } from '@/types/session';
import { KPH_TO_MPH, M_TO_FEET, sessionLabel } from '@/lib/utils';

interface Insight {
  id: string;
  label: string;
  detail: string;
  borderColor: string;
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
      borderColor: '#ef4444',
    });
  } else if (consistency.spread_s >= 4) {
    insights.push({
      id: 'consistency',
      label: 'Work Needed',
      detail: `${consistency.spread_s.toFixed(1)}s lap time spread`,
      borderColor: '#f59e0b',
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
        borderColor: '#3b82f6',
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
      borderColor: '#f59e0b',
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
        borderColor: '#ef4444',
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
    return <p className="text-xs text-slate-600">Load a session to see coaching insights.</p>;
  }

  return (
    <div className="space-y-6">
      {insightsBySession.map(({ session, insights }) => (
        <div key={session.id} className="space-y-2">
          {sessions.length > 1 && (
            <p className="text-xs font-semibold text-slate-400">{sessionLabel(session)}</p>
          )}
          {insights.length === 0 ? (
            <div className="flex items-center gap-2 pl-3 border-l-2 border-emerald-500 text-xs text-emerald-400">
              No significant issues found — consistent driving.
            </div>
          ) : (
            insights.map(insight => (
              <div
                key={insight.id}
                className="pl-3 py-1.5 text-xs space-y-0.5"
                style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: insight.borderColor }}
              >
                <p className="font-semibold text-slate-200">{insight.label}</p>
                <p className="text-slate-400">{insight.detail}</p>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
