import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRouteContext } from '../context/RouteContext.jsx';
import ExposureChart from '../components/ExposureChart.jsx';
import GoogleRouteMap from '../components/GoogleRouteMap.jsx';
import HowCalculated from '../components/HowCalculated.jsx';

export default function RouteDetail() {
  const { routeId } = useParams();
  const { getRouteById, searchResult } = useRouteContext();
  const navigate = useNavigate();

  const route = getRouteById(routeId);

  if (!searchResult) {
    return (
      <div className="empty-state">
        No active search. <Link to="/">Start a new search</Link>.
      </div>
    );
  }

  if (!route) {
    return (
      <div className="empty-state">
        Route not found. <Link to="/results">Back to results</Link>.
      </div>
    );
  }

  return (
    <div>
      <p>
        <Link to="/results">← Back to route options</Link>
      </p>
      <h1 className="page-title">{route.name}</h1>
      <p className="page-subtitle">
        {route.distanceKm} km · {route.durationMin} min · avg {route.avgPM25} µg/m³ PM2.5
      </p>

      <div className="card">
        <GoogleRouteMap path={route.path} exposureProfile={route.exposureProfile} height={280} />
        <ExposureChart exposureProfile={route.exposureProfile} />
      </div>

      <div className="detail-stats">
        <div className="detail-stat">
          <div className="detail-stat__value">{route.avgPM25}</div>
          <div className="detail-stat__label">Avg PM2.5 (µg/m³)</div>
        </div>
        <div className="detail-stat">
          <div className="detail-stat__value">{route.peakPM25}</div>
          <div className="detail-stat__label">Peak PM2.5 (µg/m³)</div>
        </div>
        <div className="detail-stat">
          <div className="detail-stat__value">{route.durationMin}</div>
          <div className="detail-stat__label">Minutes</div>
        </div>
        <div className="detail-stat">
          <div className="detail-stat__value">🚬 {route.cigaretteEquivalent}</div>
          <div className="detail-stat__label">Cigarette equivalent</div>
        </div>
      </div>

      <HowCalculated meta={searchResult.meta} />

      <div style={{ marginTop: 'var(--space-4)' }}>
        <button className="btn btn--primary" onClick={() => navigate('/results')}>
          Choose this route
        </button>
      </div>
    </div>
  );
}
