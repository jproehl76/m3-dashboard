// ─── Derived from real preprocessor output schema ──────────────────────────

export interface SessionHeader {
  track: string;
  date: string;
  session_type: 'track' | 'street';
  export_format: string;
  channels_found: string[];
  channels_missing: string[];
  total_laps: number;
  analyzed_laps: number;
  excluded_laps: Array<{ lap: number; reason: string }>;
  total_rows: number;
  duration_minutes: number;
  sample_rate_hz: number;
}

export interface LapData {
  lap_num: number;
  lap_time_s: number;
  sector_times: number[];
  max_speed_kph: number;
  avg_speed_kph: number;
  coast_time_s: number;
  total_g_mean: number;
  total_g_p95: number;
  steering_reversals: number;
  peak_lat_g: number;
  peak_long_g_brake: number;
  is_outlier: boolean;
  outlier_reason: string;
}

export interface CornerConsistency {
  name: string;
  min_speed_best: number;
  min_speed_avg: number;
  min_speed_std: number;
  min_speed_delta: number;
  brake_point_std_m: number;
  coast_time_avg: number;
  total_g_avg: number;
}

export interface Consistency {
  lap_count: number;
  best_lap_s: number;
  worst_lap_s: number;
  mean_lap_s: number;
  median_lap_s: number;
  spread_s: number;
  std_dev_s: number;
  consistency_score: number;
  corners: Record<string, CornerConsistency>;
}

export interface BestLapCorner {
  corner_id: string;
  corner_name: string;
  entry_speed_kph: number;
  min_speed_kph: number;
  exit_speed_kph: number;
  peak_lat_g: number;
  brake_point_m: number;
  trail_brake_duration_s: number;
  coast_time_s: number;
  throttle_on_m: number;
  total_g_mean: number;
  gear_at_apex: number;
}

export interface ThermalChannel {
  channel: string;
  unit: string;
  start_val: number;
  peak_val: number;
  end_val: number;
  time_to_peak_min: number;
  time_above_watch: number;
  alert_level: 'ok' | 'watch' | 'critical';
}

export interface GpsPoint {
  lat: number;
  lon: number;
  speed_kph: number;
  throttle_pct: number;
  brake_bar: number;
}

export interface TracePoint {
  distance_m: number;
  speed_kph: number;
  throttle_pct: number;
  brake_bar: number;
}

export interface FrictionScatterPoint {
  lat_g: number;
  long_g: number;
  total_g: number;
}

export interface FrictionCircle {
  total_g_mean: number;
  total_g_p95: number;
  total_g_max: number;
  peak_lat_g: number;
  peak_long_g_brake: number;
  peak_long_g_accel: number;
  time_above_08g_pct: number;
  time_above_10g_pct: number;
  scatter_points?: FrictionScatterPoint[];
}

export interface XDrive {
  front_rear_delta_mean_pct: number;
  front_rear_delta_max_pct: number;
  front_lr_delta_max_kph: number;
  rear_lr_delta_max_kph: number;
}

export interface SessionSummary {
  header: SessionHeader;
  laps: LapData[];
  consistency: Consistency;
  best_lap_corners: BestLapCorner[];
  thermals: ThermalChannel[];
  friction_circle: FrictionCircle;
  xdrive?: XDrive;
  gps_trace?: GpsPoint[];
  best_lap_trace?: TracePoint[];
}

// ─── App-level types ────────────────────────────────────────────────────────

export interface LoadedSession {
  id: string;           // unique key: track + date
  filename: string;
  color: string;        // assigned chart color
  label?: string;       // user-defined display name
  data: SessionSummary;
}

export type AlertLevel = 'ok' | 'watch' | 'critical';
