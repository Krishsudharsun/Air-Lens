// Renders a route's shape as a simple normalized SVG polyline, with
// dots along it colored by PM2.5 at that point. This intentionally
// avoids pulling in a full map SDK/API key for the MVP — it's a
// schematic "shape of the trip", not a geographic map. Swappable for
// a real map later without touching any other component.

function pm25Color(value) {
  if (value <= 12) return 'var(--color-clean)';
  if (value <= 35) return 'var(--color-moderate)';
  return 'var(--color-dirty)';
}

export default function MiniRouteMap({ path, exposureProfile }) {
  if (!path || path.length < 2) return null;

  const lats = path.map((p) => p[0]);
  const lons = path.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const width = 300;
  const height = 80;
  const padding = 8;

  const latRange = maxLat - minLat || 0.0001;
  const lonRange = maxLon - minLon || 0.0001;

  const project = ([lat, lon]) => {
    const x = padding + ((lon - minLon) / lonRange) * (width - padding * 2);
    // flip y so north is up
    const y = height - padding - ((lat - minLat) / latRange) * (height - padding * 2);
    return [x, y];
  };

  const pointsAttr = path.map((p) => project(p).join(',')).join(' ');
  const dots = (exposureProfile || []).map((s, i) => {
    const [x, y] = project([s.lat, s.lon]);
    return <circle key={i} cx={x} cy={y} r={3.5} fill={pm25Color(s.pm25)} />;
  });

  return (
    <svg
      className="mini-route-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Simplified shape of this route, colored by pollution level along the way"
    >
      <polyline points={pointsAttr} fill="none" stroke="var(--color-border)" strokeWidth="3" />
      {dots}
    </svg>
  );
}
