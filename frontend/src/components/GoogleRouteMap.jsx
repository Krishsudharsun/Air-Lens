import { useEffect, useRef, useState } from 'react';
import MiniRouteMap from './MiniRouteMap.jsx';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Loads the Google Maps JS API script exactly once, even though many
// route cards may mount at the same time.
let mapsScriptPromise = null;
function loadGoogleMapsScript() {
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps JS API'));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

function pm25Color(value) {
  if (value <= 12) return '#2f6f4f';
  if (value <= 35) return '#b08900';
  return '#b3261e';
}

/**
 * Renders an actual Google Map with the route drawn on real roads and
 * PM2.5-colored markers along it. Requires VITE_GOOGLE_MAPS_API_KEY.
 * With no key set, silently renders the lightweight schematic SVG
 * preview instead, so the app still runs with zero keys configured.
 */
export default function GoogleRouteMap({ path, exposureProfile, height = 160 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!API_KEY || !path || path.length < 2) return;
    let cancelled = false;

    loadGoogleMapsScript()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const bounds = new maps.LatLngBounds();
        const latLngPath = path.map(([lat, lon]) => {
          const p = { lat, lng: lon };
          bounds.extend(p);
          return p;
        });

        const map = new maps.Map(containerRef.current, {
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });
        map.fitBounds(bounds, 16);
        mapRef.current = map;

        new maps.Polyline({
          path: latLngPath,
          strokeColor: '#2f6f4f',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        });

        (exposureProfile || []).forEach((s) => {
          new maps.Marker({
            position: { lat: s.lat, lng: s.lon },
            map,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: pm25Color(s.pm25),
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#ffffff',
            },
            title: `PM2.5: ${s.pm25} µg/m³`,
          });
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [path, exposureProfile]);

  if (!API_KEY || failed) {
    // No key configured (or the script failed to load) — fall back
    // to the dependency-free schematic preview so the app still works.
    return <MiniRouteMap path={path} exposureProfile={exposureProfile} />;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: 'var(--radius)', overflow: 'hidden' }}
      role="img"
      aria-label="Map of this route with live pollution markers"
    />
  );
}
