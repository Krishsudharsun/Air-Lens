export default function HowCalculated({ meta }) {
  const refPM25 = meta?.cigaretteReferencePM25 ?? 22;
  const samplePoints = meta?.samplePointsPerRoute ?? 10;

  return (
    <details className="how-calculated">
      <summary>How this is calculated</summary>
      <ol>
        <li>
          We sample PM2.5 (fine particulate pollution) at {samplePoints} evenly-spaced points
          along each route.
        </li>
        <li>
          <strong>Average exposure</strong> = the mean PM2.5 across those points.{' '}
          <strong>Peak exposure</strong> = the highest single reading.
        </li>
        <li>
          <strong>Dose</strong> = average PM2.5 × travel time — a rough stand-in for how much
          pollution you actually breathe in on that trip.
        </li>
        <li>
          <strong>Cigarette equivalent</strong> = dose ÷ ({refPM25} × 24), using the Berkeley
          Earth rule of thumb that sustained exposure to ~{refPM25} µg/m³ of PM2.5 over 24 hours
          is roughly equivalent to smoking one cigarette. That rule of thumb was built for
          full-day exposure, not a single short trip — we're applying it here as an
          illustrative, relatable comparison, not a medical or precisely accurate dose estimate.
        </li>
      </ol>
      <p style={{ marginBottom: 0 }}>
        Treat every number on this page as a directional estimate for comparing routes against
        each other — not a certified air-quality measurement.
      </p>
    </details>
  );
}
