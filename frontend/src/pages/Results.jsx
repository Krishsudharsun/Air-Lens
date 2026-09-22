import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useRouteContext } from '../context/RouteContext.jsx';
import RouteCard from '../components/RouteCard.jsx';
import MockDataBanner from '../components/MockDataBanner.jsx';
import LiveDataBadges from '../components/LiveDataBadges.jsx';
import HowCalculated from '../components/HowCalculated.jsx';

export default function Results() {
  const { searchResult, lastQuery } = useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!searchResult) navigate('/');
  }, [searchResult, navigate]);

  if (!searchResult) return null;

  const { routes, meta, query } = searchResult;

  return (
    <div>
      <h1 className="page-title">Route options</h1>
      <p className="page-subtitle">
        {query?.start?.input || lastQuery?.start} → {query?.destination?.input || lastQuery?.destination}
        {query?.departureTime ? ` · departing ${new Date(query.departureTime).toLocaleString()}` : ''}
      </p>

      <MockDataBanner meta={meta} />
      <LiveDataBadges meta={meta} />

      {routes.length === 0 ? (
        <div className="empty-state">No routes found for this trip. Try different locations.</div>
      ) : (
        <div className="route-grid">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}

      <HowCalculated meta={meta} />

      <p style={{ marginTop: 'var(--space-4)' }}>
        <Link to="/">← Start a new search</Link>
      </p>
    </div>
  );
}
