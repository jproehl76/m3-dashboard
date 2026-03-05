import { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { LoadedSession, GpsPoint } from '@/types/session';
import { KPH_TO_MPH, BAR_TO_PSI, sessionLabel } from '@/lib/utils';

type ColorMode = 'speed' | 'throttle' | 'brake';

const COLOR_MODES: Array<{ value: ColorMode; label: string }> = [
  { value: 'speed', label: 'Speed (mph)' },
  { value: 'throttle', label: 'Throttle (%)' },
  { value: 'brake', label: 'Brake (PSI)' },
];

const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const PADDING = 30;

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value: number;
}

function computeSegments(
  points: GpsPoint[],
  mode: ColorMode
): { segments: Segment[]; min: number; max: number } {
  if (points.length < 2) return { segments: [], min: 0, max: 1 };

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map(p => [p.lon, p.lat]),
      },
      properties: {},
    }],
  };

  const projection = d3.geoMercator().fitExtent(
    [[PADDING, PADDING], [SVG_WIDTH - PADDING, SVG_HEIGHT - PADDING]],
    geojson
  );

  const getValue = (p: GpsPoint): number => {
    if (mode === 'speed') return p.speed_kph * KPH_TO_MPH;
    if (mode === 'throttle') return p.throttle_pct;
    return p.brake_bar * BAR_TO_PSI;
  };

  const values = points.map(getValue);
  const min = d3.min(values) ?? 0;
  const max = d3.max(values) ?? 1;

  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = projection([points[i].lon, points[i].lat]);
    const p2 = projection([points[i + 1].lon, points[i + 1].lat]);
    if (!p1 || !p2) continue;
    segments.push({ x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], value: getValue(points[i]) });
  }

  return { segments, min, max };
}

function getColor(value: number, min: number, max: number, mode: ColorMode): string {
  const t = max > min ? (value - min) / (max - min) : 0;
  if (mode === 'brake') {
    return d3.interpolateReds(t);
  }
  // speed and throttle: red (slow/none) → amber → green (fast/full)
  return d3.interpolateRdYlGn(t);
}

interface Props {
  sessions: LoadedSession[];
}

export function TrackMapChart({ sessions }: Props) {
  const [colorMode, setColorMode] = useState<ColorMode>('speed');
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id ?? '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setSvgScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? SVG_WIDTH;
      setSvgScale(Math.min(1, width / SVG_WIDTH));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  const gpsPoints = activeSession?.data.gps_trace ?? [];

  const { segments, min, max } = useMemo(
    () => computeSegments(gpsPoints, colorMode),
    [gpsPoints, colorMode]
  );

  if (sessions.length === 0 || gpsPoints.length === 0) {
    return (
      <p className="text-xs text-slate-600">
        GPS trace requires a loaded session with gps_trace data.
      </p>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {sessions.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  s.id === activeSessionId
                    ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                    : 'border-slate-700 text-slate-500 hover:border-slate-500'
                }`}
              >
                {sessionLabel(s)}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          {COLOR_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => setColorMode(m.value)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                colorMode === m.value
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          width: '100%',
          aspectRatio: `${SVG_WIDTH} / ${SVG_HEIGHT}`,
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          height="100%"
          style={{ background: '#0f172a', borderRadius: 8 }}
          aria-label="GPS track map"
        >
          {segments.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={getColor(seg.value, min, max, colorMode)}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="h-1 w-24 rounded" style={{
          background: colorMode === 'brake'
            ? 'linear-gradient(to right, #fef2f2, #ef4444)'
            : 'linear-gradient(to right, #ef4444, #f59e0b, #10b981)'
        }} />
        <span>Low → High {colorMode === 'speed' ? 'mph' : colorMode === 'throttle' ? '%' : 'PSI'}</span>
      </div>
    </div>
  );
}
