// Turns a route's geometry + PM2.5 samples into a transparent,
// intentionally simple exposure estimate.
//
// FORMULA (also surfaced to the user in the UI's "How this is
// calculated" panel — never hide the assumptions):
//
//   1. Sample PM2.5 at N evenly-spaced points along the route.
//   2. avgPM25   = mean of those samples
//   3. peakPM25  = max of those samples
//   4. dose      = avgPM25 (µg/m³) x travel time (hours)
//   5. cigaretteEquivalent = dose / (22 x 24)
//        — using the Berkeley Earth rule of thumb that sustained
//          exposure to 22 µg/m³ of PM2.5 over 24 hours is roughly
//          equivalent to smoking 1 cigarette. We're applying that
//          same concentration-x-time relationship to a much shorter
//          window (a single trip), which the source rule of thumb
//          was NOT designed for — treat this as an illustrative,
//          relatable proxy, not a medical or precise dose estimate.
//   6. exposureScore (0-100, for ranking/color only) blends avgPM25
//      and total dose so a short trip through very dirty air and a
//      long trip through moderately dirty air can be compared.

export const SAMPLE_POINTS_PER_ROUTE = 10;
export const CIGARETTE_PM25_REFERENCE = 22; // µg/m3 over 24h ≈ 1 cigarette (Berkeley Earth)

export function samplePointsAlongPath(path, count = SAMPLE_POINTS_PER_ROUTE) {
  if (path.length <= count) return path;
  const samples = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (path.length - 1));
    samples.push(path[idx]);
  }
  return samples;
}

export function computeExposure({ pm25Samples, durationMin }) {
  const avgPM25 = pm25Samples.reduce((a, b) => a + b, 0) / pm25Samples.length;
  const peakPM25 = Math.max(...pm25Samples);
  const minPM25 = Math.min(...pm25Samples);

  const durationHours = durationMin / 60;
  const dose = avgPM25 * durationHours; // µg·h/m³
  const cigaretteEquivalent = dose / (CIGARETTE_PM25_REFERENCE * 24);

  // Ranking score: 70% weight on average concentration (what it's
  // like to breathe on this route), 30% on total dose (how long you're
  // exposed for). Purely for sorting/badges — not shown as a "real"
  // number, since combining unlike units this way is a simplification.
  const exposureScore = Math.round(avgPM25 * 0.7 + (dose / durationHours || 0) * 0.3);

  return {
    avgPM25: round1(avgPM25),
    peakPM25: round1(peakPM25),
    minPM25: round1(minPM25),
    dose: round1(dose),
    cigaretteEquivalent: round2(cigaretteEquivalent),
    exposureScore,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
