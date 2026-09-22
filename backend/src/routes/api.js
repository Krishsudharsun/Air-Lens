import { Router } from 'express';
import { geocodeLocation } from '../services/geocode.js';
import { getRoutes } from '../services/routing.js';
import { getPM25ForPoints } from '../services/airQuality.js';
import {
  samplePointsAlongPath,
  computeExposure,
  SAMPLE_POINTS_PER_ROUTE,
  CIGARETTE_PM25_REFERENCE,
} from '../services/exposure.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.post('/routes', async (req, res) => {
  const { start, destination, departureTime } = req.body || {};

  if (!start || !destination) {
    return res.status(400).json({ error: 'Both "start" and "destination" are required.' });
  }

  try {
    const [startGeo, endGeo] = await Promise.all([
      geocodeLocation(start),
      geocodeLocation(destination),
    ]);

    const rawRoutes = await getRoutes(startGeo, endGeo, departureTime);

    const routingSources = new Set(rawRoutes.map((r) => r.source));
    const airQualitySources = new Set();

    const routes = [];
    for (const route of rawRoutes) {
      const samplePath = samplePointsAlongPath(route.path, SAMPLE_POINTS_PER_ROUTE);
      const { values: pm25Samples, sourcesUsed } = await getPM25ForPoints(samplePath);
      sourcesUsed.forEach((s) => airQualitySources.add(s));

      const exposure = computeExposure({ pm25Samples, durationMin: route.durationMin });

      routes.push({
        id: route.id,
        name: route.name,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        path: route.path,
        routingSource: route.source,
        liveTraffic: Boolean(route.liveTraffic),
        exposureProfile: samplePath.map((pt, i) => ({
          fraction: samplePath.length > 1 ? i / (samplePath.length - 1) : 0,
          lat: pt[0],
          lon: pt[1],
          pm25: pm25Samples[i],
        })),
        ...exposure,
      });
    }

    // Sort by distance so "fastest" and "cleanest" can be badged relative to each other.
    const fastest = [...routes].sort((a, b) => a.durationMin - b.durationMin)[0];
    const cleanest = [...routes].sort((a, b) => a.avgPM25 - b.avgPM25)[0];

    const annotated = routes.map((r) => ({
      ...r,
      isFastest: r.id === fastest.id,
      isCleanest: r.id === cleanest.id,
    }));

    res.json({
      query: {
        start: { input: start, ...startGeo },
        destination: { input: destination, ...endGeo },
        departureTime: departureTime || null,
      },
      routes: annotated,
      meta: {
        routingSources: [...routingSources], // 'google' | 'osrm' | 'mock'
        airQualitySources: [...airQualitySources], // 'cpcb' | 'waqi' | 'open-meteo' | 'mock'
        usingMockRouting: routingSources.has('mock'),
        usingMockAirQuality: airQualitySources.has('mock'),
        usingMockGeocoding: startGeo.source === 'mock' || endGeo.source === 'mock',
        usingLiveGoogleMaps: routingSources.has('google'),
        usingLiveCpcbData: airQualitySources.has('cpcb'),
        cigaretteReferencePM25: CIGARETTE_PM25_REFERENCE,
        samplePointsPerRoute: SAMPLE_POINTS_PER_ROUTE,
        formulaNote:
          'cigaretteEquivalent = (avgPM25 x durationHours) / (22 x 24), based on the Berkeley Earth rule of thumb that ~22 µg/m³ sustained over 24h ≈ 1 cigarette, applied illustratively to a single trip.',
      },
    });
  } catch (err) {
    console.error('POST /api/routes failed:', err);
    res.status(500).json({ error: 'Failed to compute routes', detail: err.message });
  }
});

export default router;
