// Turns a free-text place name into { lat, lon, label, source }.
//
// Priority order:
//   1. Google Geocoding API (accurate, needs GOOGLE_MAPS_API_KEY) —
//      biased toward Tamil Nadu so "Anna Nagar" or "Gandhipuram"
//      resolve to the right city without a full address.
//   2. OpenStreetMap Nominatim (free, no key) — same Tamil Nadu bias
//      via a viewbox, used automatically if no Google key is set or
//      the Google call fails.
//   3. Deterministic mock coordinates inside Tamil Nadu — last
//      resort, keeps the demo from ever hard-crashing.

import { TAMIL_NADU_BOUNDS, TAMIL_NADU_BOUNDS_SWNE } from '../constants.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const KNOWN_PLACES = {
  chennai: { lat: 13.0827, lon: 80.2707 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  madurai: { lat: 9.9252, lon: 78.1198 },
  tiruchirappalli: { lat: 10.7905, lon: 78.7047 },
  trichy: { lat: 10.7905, lon: 78.7047 },
  salem: { lat: 11.6643, lon: 78.146 },
  tirunelveli: { lat: 8.7139, lon: 77.7567 },
  erode: { lat: 11.341, lon: 77.7172 },
  vellore: { lat: 12.9165, lon: 79.1325 },
  thanjavur: { lat: 10.787, lon: 79.1378 },
  tiruppur: { lat: 11.1085, lon: 77.3411 },
  thoothukudi: { lat: 8.7642, lon: 78.1348 },
  kanyakumari: { lat: 8.0883, lon: 77.5385 },
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function mockGeocode(query) {
  const key = query.trim().toLowerCase();
  for (const name of Object.keys(KNOWN_PLACES)) {
    if (key.includes(name)) {
      const base = KNOWN_PLACES[name];
      const h = hashString(key);
      const jitter = ((h % 1000) / 1000 - 0.5) * 0.04;
      return { lat: base.lat + jitter, lon: base.lon + jitter * 0.7, label: query, source: 'mock' };
    }
  }
  // Unknown input — synthesize a stable point inside Tamil Nadu so the
  // demo stays on-region even without a real geocoding match.
  const h = Math.abs(hashString(key));
  const lat =
    TAMIL_NADU_BOUNDS.minLat + ((h % 1000) / 1000) * (TAMIL_NADU_BOUNDS.maxLat - TAMIL_NADU_BOUNDS.minLat);
  const lon =
    TAMIL_NADU_BOUNDS.minLon +
    (((h >> 8) % 1000) / 1000) * (TAMIL_NADU_BOUNDS.maxLon - TAMIL_NADU_BOUNDS.minLon);
  return { lat, lon, label: query, source: 'mock' };
}

async function geocodeWithGoogle(query, apiKey) {
  const [south, west, north, east] = TAMIL_NADU_BOUNDS_SWNE;
  const url = new URL(GOOGLE_GEOCODE_URL);
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('region', 'in');
  // Bias (not hard-restrict) results toward Tamil Nadu.
  url.searchParams.set('bounds', `${south},${west}|${north},${east}`);
  url.searchParams.set('components', 'country:IN');

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Google Geocoding responded ${res.status}`);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Google Geocoding status: ${data.status}`);
  }

  const best = data.results[0];
  return {
    lat: best.geometry.location.lat,
    lon: best.geometry.location.lng,
    label: best.formatted_address || query,
    source: 'google',
  };
}

async function geocodeWithNominatim(query) {
  const [south, west, north, east] = TAMIL_NADU_BOUNDS_SWNE;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  // Soft bias toward Tamil Nadu (bounded=0 keeps it a preference, not a hard wall).
  url.searchParams.set('viewbox', `${west},${north},${east},${south}`);
  url.searchParams.set('bounded', '0');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AirLens-TamilNadu/1.0 (team ERROR_503 hackathon prototype)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No geocoding result for "${query}"`);
  }

  const best = data[0];
  return {
    lat: parseFloat(best.lat),
    lon: parseFloat(best.lon),
    label: best.display_name || query,
    source: 'nominatim',
  };
}

export async function geocodeLocation(query) {
  if (!query || !query.trim()) {
    throw new Error('Empty location query');
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      return await geocodeWithGoogle(query, googleKey);
    } catch (err) {
      console.warn(`Google Geocoding failed for "${query}", trying free fallback: ${err.message}`);
    }
  }

  try {
    return await geocodeWithNominatim(query);
  } catch (err) {
    console.warn(`Geocoding fallback (mock) for "${query}": ${err.message}`);
    return mockGeocode(query);
  }
}
