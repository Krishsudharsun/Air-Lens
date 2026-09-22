import { useNavigate } from 'react-router-dom';
import GoogleRouteMap from './GoogleRouteMap.jsx';

function pm25Label(avg) {
  if (avg <= 12) return { text: 'Good', color: 'var(--color-clean)' };
  if (avg <= 35) return { text: 'Moderate', color: 'var(--color-moderate)' };
  return { text: 'Unhealthy', color: 'var(--color-dirty)' };
}

export default function RouteCard({ route }) {
  const navigate = useNavigate();
  const quality = pm25Label(route.avgPM25);

  return (
    <article
      className="card route-card"
      onClick={() => navigate(`/route/${route.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/route/${route.id}`);
      }}
    >
      <div className="route-card__header">
        <h3 className="route-card__name">{route.name}</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {route.isFastest && <span className="badge badge--fastest">Fastest</span>}
          {route.isCleanest && <span className="badge badge--cleanest">Cleanest</span>}
          {route.liveTraffic && <span className="badge">Live traffic</span>}
        </div>
      </div>

      <GoogleRouteMap path={route.path} exposureProfile={route.exposureProfile} />

      <div className="route-card__stat-row">
        <span className="route-card__stat-label">Travel time</span>
        <span>{route.durationMin} min</span>
      </div>
      <div className="route-card__stat-row">
        <span className="route-card__stat-label">Distance</span>
        <span>{route.distanceKm} km</span>
      </div>
      <div className="route-card__stat-row">
        <span className="route-card__stat-label">Avg. PM2.5</span>
        <span>
          <span className="pm25-dot" style={{ background: quality.color }} />
          {route.avgPM25} µg/m³ ({quality.text})
        </span>
      </div>
      <div className="route-card__stat-row">
        <span className="route-card__stat-label">Peak PM2.5</span>
        <span>{route.peakPM25} µg/m³</span>
      </div>

      <div className="route-card__cigarette">
        <div className="route-card__cigarette-number">
          🚬 {route.cigaretteEquivalent} cigarette{route.cigaretteEquivalent === 1 ? '' : 's'}
        </div>
        <div className="route-card__cigarette-label">estimated exposure for this trip</div>
      </div>
    </article>
  );
}
