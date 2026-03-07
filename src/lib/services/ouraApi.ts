const BASE_URL = 'https://api.ouraring.com';

export interface OuraDayData {
  date: string;
  readiness_score: number | null;
  hrv_average: number | null;
  resting_hr: number | null;
  temperature_deviation: number | null;
  sleep_score: number | null;
  sleep_efficiency: number | null;
  deep_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  activity_score: number | null;
}

// ─── API response shapes ──────────────────────────────────────────────────────

interface OuraReadinessRecord {
  day: string;
  score: number | null;
  contributors?: {
    hrv_balance?: number | null;
    resting_heart_rate?: number | null;
    body_temperature?: number | null;
  };
  temperature_deviation?: number | null;
}

interface OuraSleepRecord {
  day: string;
  score: number | null;
  contributors?: {
    efficiency?: number | null;
    deep_sleep?: number | null;
    rem_sleep?: number | null;
  };
  efficiency?: number | null;
  deep_sleep_duration?: number | null;   // seconds
  rem_sleep_duration?: number | null;    // seconds
}

interface OuraActivityRecord {
  day: string;
  score: number | null;
}

interface OuraPagedResponse<T> {
  data: T[];
}

async function ouraGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error(`Oura API error at ${path}:`, response.status, response.statusText);
      return null;
    }
    return (await response.json()) as T;
  } catch (err) {
    console.error(`Oura fetch error at ${path}:`, err);
    return null;
  }
}

export async function fetchOuraDataForDates(dates: string[]): Promise<OuraDayData[]> {
  if (dates.length === 0) return [];

  const token = import.meta.env.VITE_OURA_PERSONAL_TOKEN as string | undefined;
  if (!token) return [];

  const sorted = [...dates].sort();
  const startDate = sorted[0];
  const endDate = sorted[sorted.length - 1];
  const rangeQuery = `start_date=${startDate}&end_date=${endDate}`;

  const [readinessRes, sleepRes, activityRes] = await Promise.all([
    ouraGet<OuraPagedResponse<OuraReadinessRecord>>(
      `/v2/usercollection/daily_readiness?${rangeQuery}`,
      token
    ),
    ouraGet<OuraPagedResponse<OuraSleepRecord>>(
      `/v2/usercollection/daily_sleep?${rangeQuery}`,
      token
    ),
    ouraGet<OuraPagedResponse<OuraActivityRecord>>(
      `/v2/usercollection/daily_activity?${rangeQuery}`,
      token
    ),
  ]);

  const readinessByDate = new Map<string, OuraReadinessRecord>();
  for (const rec of readinessRes?.data ?? []) readinessByDate.set(rec.day, rec);

  const sleepByDate = new Map<string, OuraSleepRecord>();
  for (const rec of sleepRes?.data ?? []) sleepByDate.set(rec.day, rec);

  const activityByDate = new Map<string, OuraActivityRecord>();
  for (const rec of activityRes?.data ?? []) activityByDate.set(rec.day, rec);

  return dates.map((date): OuraDayData => {
    const r = readinessByDate.get(date);
    const s = sleepByDate.get(date);
    const a = activityByDate.get(date);

    const secToHours = (sec: number | null | undefined) =>
      sec != null ? +(sec / 3600).toFixed(2) : null;

    // Oura v2 daily_readiness contributors include hrv_balance (0–100) but
    // the actual average HRV ms comes from the readiness record's temperature_deviation
    // sibling fields. The v2 API puts hrv_average on daily_readiness at top level.
    const readinessRecord = r as (OuraReadinessRecord & { hrv_average?: number | null }) | undefined;

    return {
      date,
      readiness_score:       r?.score ?? null,
      hrv_average:           readinessRecord?.hrv_average ?? null,
      resting_hr:            r?.contributors?.resting_heart_rate ?? null,
      temperature_deviation: r?.temperature_deviation ?? null,
      sleep_score:           s?.score ?? null,
      sleep_efficiency:      s?.efficiency ?? null,
      deep_sleep_hours:      secToHours(s?.deep_sleep_duration),
      rem_sleep_hours:       secToHours(s?.rem_sleep_duration),
      activity_score:        a?.score ?? null,
    };
  });
}
