// Fetches candidate routes between two points.
//
// Priority order:
//   1. Google Directions API (needs GOOGLE_MAPS_API_KEY) — real road
//      geometry, real alternative routes, and when a departure time
//      is given (or defaulted to "now"), traffic-aware ETAs using
//      Google's live traffic model. This is the "proper map API"
//      path and is what the app uses whenever a key is configured.
//   2. OSRM public demo server (free, no key) — real road geometry
//      and alternatives, but no live traffic.
//   3. Synthesized routes — last resort so the app never breaks.

import { haversineKm } from '../constants.js';

const GOOGLE_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// --- Google encoded polyline decoder (standard algorithm, no dependency needed) ---
function decodePolyline(encoded) {
  let index = 0;
  let lat = 0;
  let lon = 0;
  const points = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lon / 1e5]);
  }
  return points;
}

function interpolate([lat1, lon1], [lat2, lon2], steps = 12) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t]);
  }
  return points;
}

function mockRoutes(start, end) {
  const startPt = [start.lat, start.lon];
  const endPt = [end.lat, end.lon];
  const directKm = haversineKm(startPt, endPt) * 1.25;
  const avgSpeedKmh = 30; // typical Tamil Nadu city-traffic average

  const variants = [
    { name: 'Direct route', bendKm: 0, timeFactor: 1.0 },
    { name: 'Alternate route A', bendKm: 0.9, timeFactor: 1.12 },
    { name: 'Alternate route B', bendKm: -0.7, timeFactor: 1.22 },
  ];

  return variants.map((v, idx) => {
    const mid = [
      (startPt[0] + endPt[0]) / 2 + v.bendKm * 0.01,
      (startPt[1] + endPt[1]) / 2 + v.bendKm * 0.012,
    ];
    const path = [...interpolate(startPt, mid, 8), ...interpolate(mid, endPt, 8).slice(1)];
    const distanceKm = directKm * v.timeFactor;
    const durationMin = Math.round((distanceKm / avgSpeedKmh) * 60);
    return {
      id: `mock-${idx}`,
      name: v.name,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMin,
      path,
      source: 'mock',
      liveTraffic: false,
    };
  });
}

async function getRoutesFromGoogle(start, end, departureTime, apiKey) {
  const url = new URL(GOOGLE_DIRECTIONS_URL);
  url.searchParams.set('origin', `${start.lat},${start.lon}`);
  url.searchParams.set('destination', `${end.lat},${end.lon}`);
  url.searchParams.set('alternatives', 'true');
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('region', 'in');
  url.searchParams.set('key', apiKey);

  // Real-time traffic requires a departure time. Default to "now" so
  // routes always reflect current live conditions unless the user
  // picked a future time.
  const epochSeconds = departureTime
    ? Math.max(Math.floor(new Date(departureTime).getTime() / 1000), Math.floor(Date.now() / 1000))
    : Math.floor(Date.now() / 1000);
  url.searchParams.set('departure_time', String(epochSeconds));
  url.searchParams.set('traffic_model', 'best_guess');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Google Directions responded ${res.status}`);
  const data = await res.json();

  if (data.status !== 'OK' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error(`Google Directions status: ${data.status}`);
  }

  const names = ['Fastest route (live traffic)', 'Alternate route A', 'Alternate route B', 'Alternate route C'];

  return data.routes.slice(0, 3).map((r, idx) => {
    const leg = r.legs[0];
    const hasTraffic = Boolean(leg.duration_in_traffic);
    const durationSec = hasTraffic ? leg.duration_in_traffic.value : leg.duration.value;
    return {
      id: `google-${idx}`,
      name: names[idx] || `Route ${idx + 1}`,
      distanceKm: Math.round((leg.distance.value / 1000) * 10) / 10,
      durationMin: Math.round(durationSec / 60),
      path: decodePolyline(r.overview_polyline.points),
      source: 'google',
      liveTraffic: hasTraffic,
    };
  });
}

async function getRoutesFromOSRM(start, end) {
  const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`;
  const url = new URL(`${OSRM_URL}/${coords}`);
  url.searchParams.set('alternatives', 'true');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`OSRM responded ${res.status}`);
  const data = await res.json();

  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error(`OSRM returned no routes (code: ${data.code})`);
  }

  const names = ['Fastest route', 'Alternate route A', 'Alternate route B', 'Alternate route C'];

  return data.routes.slice(0, 3).map((r, idx) => ({
    id: `osrm-${idx}`,
    name: names[idx] || `Route ${idx + 1}`,
    distanceKm: Math.round((r.distance / 1000) * 10) / 10,
    durationMin: Math.round(r.duration / 60),
    path: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    source: 'osrm',
    liveTraffic: false,
  }));
}

export async function getRoutes(start, end, departureTime) {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      return await getRoutesFromGoogle(start, end, departureTime, googleKey);
    } catch (err) {
      console.warn(`Google Directions failed, trying free fallback: ${err.message}`);
    }
  }

  try {
    return await getRoutesFromOSRM(start, end);
  } catch (err) {
    console.warn(`Routing fallback (mock) for (${start.lat},${start.lon}) -> (${end.lat},${end.lon}): ${err.message}`);
    return mockRoutes(start, end);
  }
}
