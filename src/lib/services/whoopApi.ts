const BASE_URL = 'https://api.prod.whoop.com/developer';

export interface WhoopDayData {
  date: string; // ISO date YYYY-MM-DD
  // Recovery
  recovery_score: number | null;
  hrv_rmssd_ms: number | null;
  resting_hr: number | null;
  spo2_pct: number | null;
  respiratory_rate: number | null;   // breaths/min
  skin_temp_celsius: number | null;  // deviation from baseline
  // Sleep
  sleep_performance_pct: number | null;
  sleep_consistency_pct: number | null;
  rem_sleep_hours: number | null;
  swe_sleep_hours: number | null;    // slow-wave / deep sleep
  // Cycle / load
  day_strain: number | null;
  avg_hr: number | null;
  max_hr: number | null;
}

// ─── API response shapes ─────────────────────────────────────────────────────

interface RecoveryRecord {
  updated_at: string;
  score?: {
    recovery_score: number;
    hrv_rmssd_milli: number;
    resting_heart_rate: number;
    spo2_percentage: number;
    respiratory_rate: number;
    skin_temp_celsius: number;
  } | null;
}

interface CycleRecord {
  start: string;
  score?: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
  } | null;
}

interface SleepRecord {
  end: string;
  nap: boolean;
  score?: {
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    stage_summary?: {
      total_rem_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_light_sleep_time_milli: number;
    };
  } | null;
}

interface PagedResponse<T> {
  records: T[];
  next_token?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dateOf(isoString: string): string {
  // Extract YYYY-MM-DD portion from ISO timestamp
  return isoString.slice(0, 10);
}

function expandDate(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function whoopGet<T>(
  path: string,
  accessToken: string
): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error(`WHOOP API error at ${path}:`, response.status, response.statusText);
      return null;
    }
    return (await response.json()) as T;
  } catch (err) {
    console.error(`WHOOP fetch error at ${path}:`, err);
    return null;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function fetchWhoopDataForDates(
  dates: string[],
  accessToken: string
): Promise<WhoopDayData[]> {
  if (dates.length === 0) return [];

  const sorted = [...dates].sort();
  const minDate = expandDate(sorted[0], -1);
  const maxDate = expandDate(sorted[sorted.length - 1], 1);

  const startParam = `${minDate}T00:00:00.000Z`;
  const endParam = `${maxDate}T23:59:59.000Z`;
  const rangeQuery = `start=${startParam}&end=${endParam}&limit=25`;

  // Fetch all three endpoints in parallel
  const [recoveryRes, cycleRes, sleepRes] = await Promise.all([
    whoopGet<PagedResponse<RecoveryRecord>>(
      `/v2/recovery?${rangeQuery}`,
      accessToken
    ),
    whoopGet<PagedResponse<CycleRecord>>(
      `/v2/cycle?${rangeQuery}`,
      accessToken
    ),
    whoopGet<PagedResponse<SleepRecord>>(
      `/v2/activity/sleep?${rangeQuery}`,
      accessToken
    ),
  ]);

  // Index recovery records by the date of updated_at
  const recoveryByDate = new Map<string, RecoveryRecord>();
  for (const rec of recoveryRes?.records ?? []) {
    const d = dateOf(rec.updated_at);
    recoveryByDate.set(d, rec);
  }

  // Index cycle records by the date of start
  const cycleByDate = new Map<string, CycleRecord>();
  for (const rec of cycleRes?.records ?? []) {
    const d = dateOf(rec.start);
    cycleByDate.set(d, rec);
  }

  // Index sleep records by the date of end (exclude naps)
  const sleepByDate = new Map<string, SleepRecord>();
  for (const rec of sleepRes?.records ?? []) {
    if (rec.nap) continue;
    const d = dateOf(rec.end);
    sleepByDate.set(d, rec);
  }

  // Build one WhoopDayData per requested date
  return dates.map((date): WhoopDayData => {
    const recovery = recoveryByDate.get(date);
    const cycle = cycleByDate.get(date);
    const sleep = sleepByDate.get(date);

    const stageSummary = sleep?.score?.stage_summary;
    const msToHours = (ms: number | undefined) => ms != null ? +(ms / 3_600_000).toFixed(2) : null;

    return {
      date,
      recovery_score:      recovery?.score?.recovery_score ?? null,
      hrv_rmssd_ms:        recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr:          recovery?.score?.resting_heart_rate ?? null,
      spo2_pct:            recovery?.score?.spo2_percentage ?? null,
      respiratory_rate:    recovery?.score?.respiratory_rate ?? null,
      skin_temp_celsius:   recovery?.score?.skin_temp_celsius ?? null,
      sleep_performance_pct:  sleep?.score?.sleep_performance_percentage ?? null,
      sleep_consistency_pct:  sleep?.score?.sleep_consistency_percentage ?? null,
      rem_sleep_hours:     msToHours(stageSummary?.total_rem_sleep_time_milli),
      swe_sleep_hours:     msToHours(stageSummary?.total_slow_wave_sleep_time_milli),
      day_strain:          cycle?.score?.strain ?? null,
      avg_hr:              cycle?.score?.average_heart_rate ?? null,
      max_hr:              cycle?.score?.max_heart_rate ?? null,
    };
  });
}
