// Looks up PM2.5 (µg/m³) for a batch of [lat, lon] points.
//
// Priority order, per point:
//   1. CPCB real-time monitoring stations via data.gov.in
//      (DATA_GOV_IN_API_KEY) — official Indian government station
//      data, filtered to Tamil Nadu. This is the real, live,
//      region-specific source the prototype is built around.
//   2. WAQI (aqicn.org) real-time station/feed data (WAQI_API_TOKEN)
//      — global coverage, used when a point falls outside CPCB's
//      Tamil Nadu station network (or no CPCB key is set).
//   3. Open-Meteo Air Quality API (free, no key) — model-based
//      estimate, not a live station reading, used only if neither
//      keyed source is available/reachable.
//   4. Deterministic mock PM2.5 — last resort so the app never
//      breaks, and the UI is told to flag it as sample data.

import { TAMIL_NADU_CENTER, haversineKm } from '../constants.js';

const CPCB_RESOURCE_URL = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
const WAQI_URL = 'https://api.waqi.info/feed/geo';
const OPEN_METEO_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const MAX_STATION_DISTANCE_KM = 60; // beyond this, a CPCB station reading is too far to trust for a point

// Approximate centers for Tamil Nadu cities that appear as CPCB
// station "city" fields — used when a station record has no
// latitude/longitude of its own (the public dataset doesn't always
// include it), so we can still place the station on the map.
const TN_CITY_COORDS = {
  chennai: [13.0827, 80.2707],
  coimbatore: [11.0168, 76.9558],
  madurai: [9.9252, 78.1198],
  tiruchirappalli: [10.7905, 78.7047],
  trichy: [10.7905, 78.7047],
  salem: [11.6643, 78.146],
  tirunelveli: [8.7139, 77.7567],
  erode: [11.341, 77.7172],
  vellore: [12.9165, 79.1325],
  thanjavur: [10.787, 79.1378],
  tiruppur: [11.1085, 77.3411],
  thoothukudi: [8.7642, 78.1348],
  tuticorin: [8.7642, 78.1348],
};

// --- point-level result cache (used for all sources alike) ---
const pointCache = new Map(); // key -> { value, source, expiresAt }
const POINT_CACHE_TTL_MS = 15 * 60 * 1000;

// --- CPCB station list cache (one fetch covers every point in a request) ---
let cpcbStationCache = { stations: null, expiresAt: 0 };
const CPCB_CACHE_TTL_MS = 10 * 60 * 1000;

function pointCacheKey(lat, lon) {
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  return `${lat.toFixed(3)},${lon.toFixed(3)}@${hourBucket}`;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function mockPM25(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const h = Math.abs(hashString(key));
  const base = 12 + (h % 70);
  const noise = (((h >> 4) % 100) / 100) * 8 - 4;
  return Math.max(3, Math.round((base + noise) * 10) / 10);
}

// --- CPCB (data.gov.in) ---

async function loadTamilNaduStations() {
  const now = Date.now();
  if (cpcbStationCache.stations && cpcbStationCache.expiresAt > now) {
    return cpcbStationCache.stations;
  }

  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) throw new Error('DATA_GOV_IN_API_KEY not set');

  const url = new URL(CPCB_RESOURCE_URL);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('filters[state]', 'Tamil Nadu');
  url.searchParams.set('limit', '500');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`data.gov.in responded ${res.status}`);
  const data = await res.json();

  const records = Array.isArray(data.records) ? data.records : [];
  const stations = records
    .filter((r) => (r.pollutant_id || '').toUpperCase().replace(/[.\s]/g, '') === 'PM25')
    .map((r) => {
      const avg = parseFloat(r.pollutant_avg);
      if (Number.isNaN(avg)) return null;

      let lat = parseFloat(r.latitude);
      let lon = parseFloat(r.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        const cityKey = (r.city || '').trim().toLowerCase();
        const fallback = TN_CITY_COORDS[cityKey];
        if (!fallback) return null;
        [lat, lon] = fallback;
      }

      return {
        station: r.station || r.city,
        city: r.city,
        lat,
        lon,
        pm25: avg,
        lastUpdate: r.last_update,
      };
    })
    .filter(Boolean);

  cpcbStationCache = { stations, expiresAt: now + CPCB_CACHE_TTL_MS };
  return stations;
}

function nearestCpcbReading(stations, [lat, lon]) {
  let best = null;
  let bestDist = Infinity;
  for (const s of stations) {
    const d = haversineKm([lat, lon], [s.lat, s.lon]);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  if (!best || bestDist > MAX_STATION_DISTANCE_KM) return null;
  return best.pm25;
}

// --- WAQI ---

// Standard EPA PM2.5 breakpoints, used to invert WAQI's AQI sub-index
// back into an approximate µg/m³ concentration.
const PM25_BREAKPOINTS = [
  { aqiLow: 0, aqiHigh: 50, cLow: 0.0, cHigh: 12.0 },
  { aqiLow: 51, aqiHigh: 100, cLow: 12.1, cHigh: 35.4 },
  { aqiLow: 101, aqiHigh: 150, cLow: 35.5, cHigh: 55.4 },
  { aqiLow: 151, aqiHigh: 200, cLow: 55.5, cHigh: 150.4 },
  { aqiLow: 201, aqiHigh: 300, cLow: 150.5, cHigh: 250.4 },
  { aqiLow: 301, aqiHigh: 400, cLow: 250.5, cHigh: 350.4 },
  { aqiLow: 401, aqiHigh: 500, cLow: 350.5, cHigh: 500.4 },
];

function aqiToPM25(aqi) {
  const bp = PM25_BREAKPOINTS.find((b) => aqi >= b.aqiLow && aqi <= b.aqiHigh) || PM25_BREAKPOINTS.at(-1);
  const conc = ((bp.cHigh - bp.cLow) / (bp.aqiHigh - bp.aqiLow)) * (aqi - bp.aqiLow) + bp.cLow;
  return Math.round(conc * 10) / 10;
}

async function fetchWAQI(lat, lon) {
  const token = process.env.WAQI_API_TOKEN;
  if (!token) throw new Error('WAQI_API_TOKEN not set');

  const url = new URL(`${WAQI_URL}/${lat};${lon}/`);
  url.searchParams.set('token', token);

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`WAQI responded ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(`WAQI status: ${data.status}`);

  const pm25Sub = data.data?.iaqi?.pm25?.v;
  if (typeof pm25Sub !== 'number') throw new Error('WAQI response missing pm25 sub-index');

  return aqiToPM25(pm25Sub);
}

// --- Open-Meteo (keyless fallback) ---

async function fetchOpenMeteoBatch(points) {
  const lats = points.map((p) => p[0].toFixed(4)).join(',');
  const lons = points.map((p) => p[1].toFixed(4)).join(',');

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', lats);
  url.searchParams.set('longitude', lons);
  url.searchParams.set('current', 'pm2_5');
  url.searchParams.set('domains', 'auto');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  const data = await res.json();

  const results = Array.isArray(data) ? data : [data];
  if (results.length !== points.length) throw new Error('Open-Meteo batch result count mismatch');

  return results.map((r, i) => {
    const val = r?.current?.pm2_5;
    if (typeof val !== 'number' || Number.isNaN(val)) throw new Error(`Missing pm2_5 for point ${i}`);
    return val;
  });
}

/**
 * @param {Array<[number, number]>} points - array of [lat, lon]
 * @returns {Promise<{ values: number[], sourcesUsed: string[] }>}
 *   sourcesUsed is the distinct set of sources actually used across
 *   the batch: any of 'cpcb' | 'waqi' | 'open-meteo' | 'mock'.
 */
export async function getPM25ForPoints(points) {
  if (!points.length) return { values: [], sourcesUsed: [] };

  const now = Date.now();
  const values = new Array(points.length).fill(null);
  const sourcesUsed = new Set();
  const stillMissing = [];

  // 1. point cache
  points.forEach((p, i) => {
    const hit = pointCache.get(pointCacheKey(p[0], p[1]));
    if (hit && hit.expiresAt > now) {
      values[i] = hit.value;
      sourcesUsed.add(hit.source);
    } else {
      stillMissing.push(i);
    }
  });
  if (stillMissing.length === 0) return { values, sourcesUsed: [...sourcesUsed] };

  // 2. CPCB (Tamil Nadu real-time stations)
  let stations = null;
  if (process.env.DATA_GOV_IN_API_KEY) {
    try {
      stations = await loadTamilNaduStations();
    } catch (err) {
      console.warn(`CPCB station load failed: ${err.message}`);
    }
  }

  const afterCpcb = [];
  if (stations && stations.length) {
    for (const i of stillMissing) {
      const reading = nearestCpcbReading(stations, points[i]);
      if (reading != null) {
        values[i] = reading;
        sourcesUsed.add('cpcb');
        pointCache.set(pointCacheKey(points[i][0], points[i][1]), {
          value: reading,
          source: 'cpcb',
          expiresAt: now + POINT_CACHE_TTL_MS,
        });
      } else {
        afterCpcb.push(i);
      }
    }
  } else {
    afterCpcb.push(...stillMissing);
  }
  if (afterCpcb.length === 0) return { values, sourcesUsed: [...sourcesUsed] };

  // 3. WAQI (per-point, global real-time fallback)
  const afterWaqi = [];
  if (process.env.WAQI_API_TOKEN) {
    for (const i of afterCpcb) {
      try {
        const val = await fetchWAQI(points[i][0], points[i][1]);
        values[i] = val;
        sourcesUsed.add('waqi');
        pointCache.set(pointCacheKey(points[i][0], points[i][1]), {
          value: val,
          source: 'waqi',
          expiresAt: now + POINT_CACHE_TTL_MS,
        });
      } catch (err) {
        afterWaqi.push(i);
      }
    }
  } else {
    afterWaqi.push(...afterCpcb);
  }
  if (afterWaqi.length === 0) return { values, sourcesUsed: [...sourcesUsed] };

  // 4. Open-Meteo (batched, keyless)
  try {
    const batchPoints = afterWaqi.map((i) => points[i]);
    const fetched = await fetchOpenMeteoBatch(batchPoints);
    afterWaqi.forEach((i, j) => {
      values[i] = fetched[j];
      sourcesUsed.add('open-meteo');
      pointCache.set(pointCacheKey(points[i][0], points[i][1]), {
        value: fetched[j],
        source: 'open-meteo',
        expiresAt: now + POINT_CACHE_TTL_MS,
      });
    });
  } catch (err) {
    console.warn(`Open-Meteo fallback failed for ${afterWaqi.length} point(s): ${err.message}`);
    // 5. mock, absolute last resort
    afterWaqi.forEach((i) => {
      values[i] = mockPM25(points[i][0], points[i][1]);
      sourcesUsed.add('mock');
    });
  }

  return { values, sourcesUsed: [...sourcesUsed] };
}

export { TAMIL_NADU_CENTER };
