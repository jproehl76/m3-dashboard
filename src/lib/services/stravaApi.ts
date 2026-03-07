const BASE_URL = 'https://www.strava.com/api/v3';

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  distance: number;           // meters
  moving_time: number;        // seconds
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
  total_elevation_gain: number;
}

async function stravaGet<T>(path: string, accessToken: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error(`Strava API error at ${path}:`, response.status, response.statusText);
      return null;
    }
    return (await response.json()) as T;
  } catch (err) {
    console.error(`Strava fetch error at ${path}:`, err);
    return null;
  }
}

export async function fetchStravaActivities(
  accessToken: string,
  afterUnix: number,
  beforeUnix: number
): Promise<StravaActivity[]> {
  const result = await stravaGet<StravaActivity[]>(
    `/athlete/activities?after=${afterUnix}&before=${beforeUnix}&per_page=20`,
    accessToken
  );
  return result ?? [];
}
