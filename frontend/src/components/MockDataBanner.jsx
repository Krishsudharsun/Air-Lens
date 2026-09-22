export default function MockDataBanner({ meta }) {
  if (!meta) return null;
  const flags = [];
  if (meta.usingMockGeocoding) flags.push('location lookup');
  if (meta.usingMockRouting) flags.push('route data');
  if (meta.usingMockAirQuality) flags.push('air quality data');

  if (flags.length === 0) return null;

  return (
    <div className="banner" role="status">
      <span>⚠️</span>
      <span>
        Using sample data for {flags.join(', ')} — the live public API wasn't reachable just
        now. The comparison below still works the same way, but treat the numbers as
        illustrative rather than real-time.
      </span>
    </div>
  );
}
