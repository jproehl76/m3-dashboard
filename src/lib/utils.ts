import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SessionSummary, LoadedSession, AlertLevel } from '@/types/session';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Unit conversion ────────────────────────────────────────────────────────

export function kphToMph(kph: number): number {
  return kph * 0.621371;
}

export function celsiusToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function formatLapTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${mins}:${secs}`;
}

export function formatSpeed(kph: number): string {
  return `${kphToMph(kph).toFixed(1)} mph`;
}

export function formatTemp(celsius: number, unit: string): string {
  if (unit === '°C') return `${celsiusToF(celsius).toFixed(0)}°F`;
  return `${celsius.toFixed(2)} ${unit}`;
}

// ─── Session color palette (colorblind-safe) ────────────────────────────────

const SESSION_COLORS = [
  '#2563EB',
  '#D97706',
  '#059669',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
];

export function assignSessionColor(index: number): string {
  return SESSION_COLORS[index % SESSION_COLORS.length];
}

export function makeSessionId(summary: SessionSummary): string {
  return `${summary.header.track}__${summary.header.date}`;
}

export function isValidSession(obj: unknown): obj is SessionSummary {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.header === 'object' &&
    Array.isArray(s.laps) &&
    typeof s.consistency === 'object' &&
    Array.isArray(s.best_lap_corners) &&
    Array.isArray(s.thermals) &&
    typeof s.friction_circle === 'object'
  );
}

export const THERMAL_THRESHOLDS: Record<string, { watch: number; critical: number; label: string }> = {
  oil_temp:     { watch: 266, critical: 284, label: 'Oil Temp' },
  trans_temp:   { watch: 185, critical: 212, label: 'Trans Temp' },
  coolant_temp: { watch: 216, critical: 239, label: 'Coolant' },
  iat:          { watch: 104, critical: 122, label: 'Intake Air' },
  boost:        { watch: 1.2, critical: 1.5, label: 'Boost (bar)' },
};

export function thermalAlertLevel(channel: string, peakVal: number): AlertLevel {
  const th = THERMAL_THRESHOLDS[channel];
  if (!th) return 'ok';
  const val = channel === 'boost' ? peakVal : celsiusToF(peakVal);
  if (val >= th.critical) return 'critical';
  if (val >= th.watch) return 'watch';
  return 'ok';
}

export function consistencyRating(spreadSeconds: number): { label: string; color: string } {
  if (spreadSeconds < 4) return { label: 'Good', color: '#059669' };
  if (spreadSeconds < 8) return { label: 'Work Needed', color: '#D97706' };
  return { label: 'Crisis', color: '#DC2626' };
}

export function sessionLabel(session: LoadedSession): string {
  if (session.label) return session.label;
  const d = new Date(session.data.header.date);
  const dateStr = isNaN(d.getTime())
    ? session.data.header.date
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${session.data.header.track} — ${dateStr}`;
}
