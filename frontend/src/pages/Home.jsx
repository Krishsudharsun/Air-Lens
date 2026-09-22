import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRoutes } from '../api/client.js';
import { useRouteContext } from '../context/RouteContext.jsx';

const TN_CITIES = [
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

export default function Home() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { setSearchResult, setLastQuery } = useRouteContext();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!start.trim() || !destination.trim()) {
      setError('Please enter both a starting point and a destination.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await fetchRoutes({ start, destination, departureTime });
      setSearchResult(result);
      setLastQuery({ start, destination, departureTime });
      navigate('/results');
    } catch (err) {
      setError(err.message || 'Something went wrong finding routes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Plan a route</h1>
      <p className="page-subtitle">
        AIR LENS compares your route options across Tamil Nadu by how much air pollution you'd
        actually breathe on each one — using live Google Maps routing and real-time CPCB air
        quality stations — not just which one is fastest.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form className="card stack" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="field">
          <label htmlFor="start">Starting point</label>
          <input
            id="start"
            type="text"
            placeholder="e.g. Gandhipuram, Coimbatore"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            list="tn-cities"
          />
        </div>

        <div className="field">
          <label htmlFor="destination">Destination</label>
          <input
            id="destination"
            type="text"
            placeholder="e.g. Anna Nagar, Chennai"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            list="tn-cities"
          />
        </div>

        <datalist id="tn-cities">
          {TN_CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <div className="field">
          <label htmlFor="departureTime">Departure time (optional)</label>
          <input
            id="departureTime"
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Leave blank to use current live traffic conditions.
          </span>
        </div>

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Comparing routes…' : 'Compare routes'}
        </button>
      </form>

      <p style={{ marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Quick picks: {TN_CITIES.join(' · ')}
      </p>
    </div>
  );
}
