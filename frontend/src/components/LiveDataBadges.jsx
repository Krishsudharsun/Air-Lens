const SOURCE_LABELS = {
  google: 'Google Maps (live traffic)',
  osrm: 'OSRM routing',
  cpcb: 'CPCB real-time (Tamil Nadu)',
  waqi: 'WAQI real-time',
  'open-meteo': 'Open-Meteo (modeled)',
};

export default function LiveDataBadges({ meta }) {
  if (!meta) return null;
  const routing = (meta.routingSources || []).filter((s) => s !== 'mock');
  const air = (meta.airQualitySources || []).filter((s) => s !== 'mock');
  const labels = [...routing, ...air].map((s) => SOURCE_LABELS[s] || s);

  if (labels.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-4)' }}>
      {labels.map((label) => (
        <span key={label} className="badge badge--cleanest">
          ✓ {label}
        </span>
      ))}
    </div>
  );
}
