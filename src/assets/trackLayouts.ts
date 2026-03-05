// Reference GPS outlines for known race tracks.
// Coordinates: [lat, lon], clockwise, S/F first, closing back to start.
// Road Atlanta has a bridge at T11 where the T12 return passes under the T1-T3 approach.
// These waypoints are arranged so the back straight goes sufficiently EAST, avoiding
// the self-intersection (figure 8) that results from an incorrect back-straight direction.

export interface TrackLayout {
  name: string;
  aliases: string[];
  /** [lat, lon] pairs, clockwise, start = S/F */
  waypoints: [number, number][];
  /** Waypoints for the "overpass" segment — drawn on top to simulate the bridge */
  bridgeWaypoints?: [number, number][];
  corners: { id: string; name: string; lat: number; lon: number }[];
}

// ── Road Atlanta (Michelin Raceway Road Atlanta) ──────────────────────────────
// Braselton, GA · 2.540 mi · 12 turns · clockwise
// Layout: front straight on the west (heading N), T1-T3 sweep northeast-east,
// esses on the east side heading south, T7 tight hairpin bottom-center,
// back straight heading EAST to T10 chicane, T12 "The Dive" returns northwest.
// Bridge: T1-approach section overpass above the T11/T12 return at ~[34.153,-83.814].
const roadAtlanta: TrackLayout = {
  name: 'Road Atlanta',
  aliases: ['road atlanta', 'michelin raceway road atlanta', 'roadatlanta', 'road_atlanta', 'mrra'],
  waypoints: [
    // S/F — south end of pit straight, west side, heading NORTH
    [34.1496, -83.8193],
    [34.1509, -83.8191],
    [34.1520, -83.8188],
    [34.1527, -83.8185],

    // T1 — uphill banked right-hander, turning NORTHEAST then EAST
    [34.1534, -83.8175],
    [34.1540, -83.8160],
    [34.1546, -83.8145],
    [34.1551, -83.8130],

    // T2 — blind crest, heading east
    [34.1555, -83.8115],
    [34.1557, -83.8103],

    // T3 — blind downhill right, beginning of esses, heading SOUTHEAST
    [34.1555, -83.8092],
    [34.1551, -83.8082],

    // ESSES (T4-T5) — fast sweeping complex heading south on the EAST side
    [34.1542, -83.8076],
    [34.1532, -83.8075],
    [34.1521, -83.8080],
    [34.1511, -83.8090],

    // T6 — camber/uphill-downhill, heading SOUTHWEST
    [34.1502, -83.8104],
    [34.1493, -83.8122],
    [34.1485, -83.8141],

    // T7 — tight left hairpin at bottom-center, apex then exit heading EAST
    [34.1478, -83.8155],
    [34.1474, -83.8160],  // apex

    // BACK STRAIGHT — heading EAST (lon decreasing sharply = moving east)
    [34.1470, -83.8148],
    [34.1464, -83.8130],
    [34.1458, -83.8112],
    [34.1451, -83.8094],
    [34.1444, -83.8078],

    // T10a / T10b CHICANE — hardest braking zone, southeast corner
    [34.1439, -83.8068],
    [34.1436, -83.8072],
    [34.1433, -83.8082],
    [34.1433, -83.8093],

    // T11/T12 return — heading NORTHWEST back to pit straight ("The Dive")
    [34.1436, -83.8106],
    [34.1440, -83.8120],
    [34.1446, -83.8136],
    [34.1454, -83.8153],
    [34.1464, -83.8169],
    [34.1474, -83.8179],
    [34.1484, -83.8187],
    [34.1491, -83.8191],
    [34.1496, -83.8193],  // closes at S/F
  ],

  // The T1-approach section passes OVER the T11-return in reality.
  // Draw this segment last so it renders on top, giving an overpass effect.
  bridgeWaypoints: [
    [34.1527, -83.8185],
    [34.1534, -83.8175],
    [34.1540, -83.8160],
  ],

  corners: [
    { id: 't1',  name: 'T1',  lat: 34.1540, lon: -83.8160 },
    { id: 't2',  name: 'T2',  lat: 34.1556, lon: -83.8108 },
    { id: 't3',  name: 'T3',  lat: 34.1553, lon: -83.8086 },
    { id: 't4',  name: 'T4',  lat: 34.1537, lon: -83.8076 },
    { id: 't5',  name: 'T5',  lat: 34.1516, lon: -83.8085 },
    { id: 't6',  name: 'T6',  lat: 34.1493, lon: -83.8122 },
    { id: 't7',  name: 'T7',  lat: 34.1476, lon: -83.8158 },
    { id: 't10', name: 'T10', lat: 34.1436, lon: -83.8072 },
    { id: 't11', name: 'T11', lat: 34.1436, lon: -83.8106 },
    { id: 't12', name: 'T12', lat: 34.1446, lon: -83.8136 },
  ],
};

export const TRACK_LAYOUTS: TrackLayout[] = [roadAtlanta];

export function findTrackLayout(trackName: string | undefined): TrackLayout | null {
  if (!trackName) return null;
  const lc = trackName.toLowerCase().trim();
  return TRACK_LAYOUTS.find(t =>
    t.aliases.some(a => lc.includes(a) || a.includes(lc))
  ) ?? null;
}
