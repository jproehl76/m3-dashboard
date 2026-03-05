// Reference GPS outlines for known race tracks.
// Adding a new track: fill in waypoints, corners, colors, logo, aliases.
// Waypoints: [lat, lon], clockwise, S/F first, closing back to start.
// Corners: geographic apex positions used to place markers accurately on the map.
//
// For tracks not in this list the app falls back to the GPS trace from the session,
// which draws the correct outline but places corner markers less precisely.

export interface TrackLayout {
  name: string;
  /** String fragments that might appear in session header.track — case-insensitive */
  aliases: string[];
  /** Brand colors for header tinting and accent lines */
  colors: { primary: string; accent: string };
  /** Official logo URL — ideally SVG with transparent background */
  logo?: string;
  /** [lat, lon] pairs, clockwise, start = S/F, last point closes back to start */
  waypoints: [number, number][];
  /** Overpass segment drawn on top to simulate a bridge (optional) */
  bridgeWaypoints?: [number, number][];
  /** Geographic apex for each corner — used to place map markers accurately */
  corners: { id: string; name: string; lat: number; lon: number }[];
}

// ── Road Atlanta (Michelin Raceway Road Atlanta) ──────────────────────────────
// Braselton, GA · 2.540 mi · 12 turns · clockwise
// Logo: white version works on dark header
const roadAtlanta: TrackLayout = {
  name: 'Road Atlanta',
  aliases: ['road atlanta', 'michelin raceway road atlanta', 'roadatlanta', 'road_atlanta', 'mrra'],
  colors: { primary: '#27509B', accent: '#FFE601' },
  logo: 'https://michelinracewayroadatlanta.com/images/MichelinRoadAtlanta_logoREV-02.svg',
  waypoints: [
    [34.1496, -83.8193], [34.1509, -83.8191], [34.1520, -83.8188], [34.1527, -83.8185],
    [34.1534, -83.8175], [34.1540, -83.8160], [34.1546, -83.8145], [34.1551, -83.8130],
    [34.1555, -83.8115], [34.1557, -83.8103],
    [34.1555, -83.8092], [34.1551, -83.8082],
    [34.1542, -83.8076], [34.1532, -83.8075], [34.1521, -83.8080], [34.1511, -83.8090],
    [34.1502, -83.8104], [34.1493, -83.8122], [34.1485, -83.8141],
    [34.1478, -83.8155], [34.1474, -83.8160],
    [34.1470, -83.8148], [34.1464, -83.8130], [34.1458, -83.8112], [34.1451, -83.8094], [34.1444, -83.8078],
    [34.1439, -83.8068], [34.1436, -83.8072], [34.1433, -83.8082], [34.1433, -83.8093],
    [34.1436, -83.8106], [34.1440, -83.8120], [34.1446, -83.8136], [34.1454, -83.8153],
    [34.1464, -83.8169], [34.1474, -83.8179], [34.1484, -83.8187], [34.1491, -83.8191],
    [34.1496, -83.8193],
  ],
  // T1-approach overpass segment — rendered on top of T11-return
  bridgeWaypoints: [
    [34.1527, -83.8185], [34.1534, -83.8175], [34.1540, -83.8160],
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

// ── Road America ──────────────────────────────────────────────────────────────
// Elkhart Lake, WI · 4.048 mi · 14 turns · counterclockwise
// NOTE: waypoints are approximate — will be refined from session GPS data
const roadAmerica: TrackLayout = {
  name: 'Road America',
  aliases: ['road america', 'roadamerica', 'road_america', 'elkhart lake'],
  colors: { primary: '#C8102E', accent: '#FFFFFF' },
  waypoints: [
    // S/F — south end of pit straight, heading east
    [43.7970, -87.9960],
    [43.7970, -87.9940], [43.7970, -87.9918], [43.7970, -87.9898],
    // T1 — left-hander, heading north
    [43.7972, -87.9880], [43.7980, -87.9873],
    // T2/T3 Hurry Downs — heading NE
    [43.7993, -87.9868], [43.8007, -87.9868],
    // T5 Canada Corner — left-hander, heading west/SW
    [43.8020, -87.9875], [43.8025, -87.9890],
    // T6/T7/T8 — Kettle Bottoms section
    [43.8022, -87.9910], [43.8015, -87.9928],
    // T9/T10 — heading south
    [43.8005, -87.9942], [43.7993, -87.9948],
    // T10 Kink — slight right, heading south
    [43.7982, -87.9945], [43.7973, -87.9940],
    // T12/T13 Carousel — heading southwest
    [43.7968, -87.9925], [43.7965, -87.9910],
    // T14 — final hairpin, back onto pit straight heading east
    [43.7966, -87.9890], [43.7968, -87.9872],
    [43.7970, -87.9960], // closes
  ],
  corners: [
    { id: 't1',  name: 'T1',  lat: 43.7975, lon: -87.9878 },
    { id: 't3',  name: 'T3',  lat: 43.7993, lon: -87.9868 },
    { id: 't5',  name: 'T5',  lat: 43.8020, lon: -87.9878 },
    { id: 't7',  name: 'T7',  lat: 43.8018, lon: -87.9918 },
    { id: 't10', name: 'T10', lat: 43.7982, lon: -87.9945 },
    { id: 't12', name: 'T12', lat: 43.7968, lon: -87.9925 },
    { id: 't14', name: 'T14', lat: 43.7966, lon: -87.9882 },
  ],
};

// ── Brainerd International Raceway ────────────────────────────────────────────
// Brainerd, MN · 2.5 mi · road course · clockwise
// NOTE: waypoints are approximate — will be refined from session GPS data
const brainerd: TrackLayout = {
  name: 'Brainerd International Raceway',
  aliases: ['brainerd', 'bir', 'brainerd international', 'brainerd raceway'],
  colors: { primary: '#E31837', accent: '#FFD700' },
  waypoints: [
    // S/F — north end of front straight
    [46.3958, -94.0858],
    [46.3948, -94.0858], [46.3940, -94.0860], [46.3932, -94.0862],
    // T1 — right-hander
    [46.3926, -94.0870], [46.3922, -94.0882],
    // Infield complex
    [46.3920, -94.0896], [46.3925, -94.0910],
    [46.3932, -94.0918], [46.3940, -94.0915],
    // Bowl/Carousel
    [46.3948, -94.0910], [46.3954, -94.0900],
    [46.3958, -94.0888], [46.3960, -94.0874],
    [46.3958, -94.0862],
    [46.3958, -94.0858], // closes
  ],
  corners: [
    { id: 't1', name: 'T1', lat: 46.3924, lon: -94.0876 },
    { id: 't3', name: 'T3', lat: 46.3920, lon: -94.0900 },
    { id: 't5', name: 'T5', lat: 46.3932, lon: -94.0918 },
    { id: 't7', name: 'T7', lat: 46.3954, lon: -94.0902 },
  ],
};

// ── Sebring International Raceway ─────────────────────────────────────────────
// Sebring, FL · 3.74 mi · 17 turns · clockwise
// NOTE: waypoints are approximate
const sebring: TrackLayout = {
  name: 'Sebring International Raceway',
  aliases: ['sebring', 'sebring international', 'sebring raceway'],
  colors: { primary: '#003087', accent: '#FF6600' },
  waypoints: [
    [27.4545, -81.3470],
    [27.4548, -81.3450], [27.4550, -81.3430], [27.4548, -81.3412],
    [27.4540, -81.3400], [27.4528, -81.3395],
    [27.4515, -81.3400], [27.4508, -81.3412],
    [27.4505, -81.3428], [27.4508, -81.3445],
    [27.4515, -81.3458], [27.4525, -81.3462],
    [27.4535, -81.3468], [27.4545, -81.3470],
  ],
  corners: [
    { id: 't1',  name: 'T1',  lat: 27.4548, lon: -81.3415 },
    { id: 't7',  name: 'T7',  lat: 27.4507, lon: -81.3412 },
    { id: 't13', name: 'T13', lat: 27.4508, lon: -81.3445 },
    { id: 't17', name: 'T17', lat: 27.4535, lon: -81.3465 },
  ],
};

// ── Pittsburgh International Race Complex (PittRace) ─────────────────────────
// Wampum, PA · 2.78 mi · clockwise
const pittRace: TrackLayout = {
  name: 'Pittsburgh International Race Complex',
  aliases: ['pitt race', 'pittrace', 'pirc', 'pittsburgh international', 'wampum'],
  colors: { primary: '#FFB612', accent: '#101820' },
  waypoints: [
    [40.8912, -80.3680],
    [40.8920, -80.3668], [40.8928, -80.3655],
    [40.8930, -80.3638], [40.8925, -80.3622],
    [40.8915, -80.3610], [40.8905, -80.3615],
    [40.8898, -80.3628], [40.8895, -80.3645],
    [40.8898, -80.3660], [40.8906, -80.3672],
    [40.8912, -80.3680],
  ],
  corners: [
    { id: 't1', name: 'T1', lat: 40.8926, lon: -80.3658 },
    { id: 't4', name: 'T4', lat: 40.8926, lon: -80.3625 },
    { id: 't8', name: 'T8', lat: 40.8897, lon: -80.3645 },
  ],
};

export const TRACK_LAYOUTS: TrackLayout[] = [
  roadAtlanta,
  roadAmerica,
  brainerd,
  sebring,
  pittRace,
];

export function findTrackLayout(trackName: string | undefined): TrackLayout | null {
  if (!trackName) return null;
  const lc = trackName.toLowerCase().trim();
  return TRACK_LAYOUTS.find(t =>
    t.aliases.some(a => lc.includes(a) || a.includes(lc))
  ) ?? null;
}
