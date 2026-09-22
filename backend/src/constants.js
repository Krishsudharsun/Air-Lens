// Tamil Nadu is the focus region for this prototype. These are used to:
//  - bias/restrict geocoding so ambiguous place names resolve inside TN
//  - decide which CPCB monitoring stations count as "nearby"
//  - power the quick-pick city list on the frontend

export const TAMIL_NADU_BOUNDS = {
  minLat: 8.0,
  maxLat: 13.6,
  minLon: 76.2,
  maxLon: 80.4,
};

// [south, west, north, east] — the format most mapping APIs want
export const TAMIL_NADU_BOUNDS_SWNE = [
  TAMIL_NADU_BOUNDS.minLat,
  TAMIL_NADU_BOUNDS.minLon,
  TAMIL_NADU_BOUNDS.maxLat,
  TAMIL_NADU_BOUNDS.maxLon,
];

export const TAMIL_NADU_CENTER = { lat: 10.9, lon: 78.3 };

export const MAJOR_TN_CITIES = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Thanjavur',
  'Tiruppur',
  'Thoothukudi',
  'Kanyakumari',
];

export function isWithinTamilNadu(lat, lon) {
  return (
    lat >= TAMIL_NADU_BOUNDS.minLat &&
    lat <= TAMIL_NADU_BOUNDS.maxLat &&
    lon >= TAMIL_NADU_BOUNDS.minLon &&
    lon <= TAMIL_NADU_BOUNDS.maxLon
  );
}

export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
