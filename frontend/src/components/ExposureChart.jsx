export default function ExposureChart({ exposureProfile }) {
  if (!exposureProfile || exposureProfile.length === 0) return null;

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 32, left: 44 };

  const values = exposureProfile.map((p) => p.pm25);
  const maxVal = Math.max(...values, 10) * 1.15;
  const minVal = 0;

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (fraction) => padding.left + fraction * innerW;
  const y = (val) => padding.top + innerH - ((val - minVal) / (maxVal - minVal)) * innerH;

  const linePoints = exposureProfile
    .map((p) => `${x(p.fraction)},${y(p.pm25)}`)
    .join(' ');

  const areaPoints = `${x(0)},${y(minVal)} ${linePoints} ${x(1)},${y(minVal)}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * (maxVal - minVal));

  return (
    <div className="exposure-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="PM2.5 along the route">
        {/* gridlines + y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--color-text-muted)">
              {Math.round(t)}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="var(--color-accent)" opacity="0.12" />
        <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />

        {exposureProfile.map((p, i) => (
          <circle key={i} cx={x(p.fraction)} cy={y(p.pm25)} r={3} fill="var(--color-accent)" />
        ))}

        <text
          x={padding.left}
          y={height - 6}
          fontSize="11"
          fill="var(--color-text-muted)"
        >
          start
        </text>
        <text
          x={width - padding.right}
          y={height - 6}
          fontSize="11"
          textAnchor="end"
          fill="var(--color-text-muted)"
        >
          destination
        </text>
      </svg>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        PM2.5 (µg/m³) sampled at points along the route.
      </p>
    </div>
  );
}
