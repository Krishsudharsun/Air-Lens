# AIR LENS — Tamil Nadu

**Personalized air pollution exposure route advisor for Tamil Nadu.** Built by team ERROR_503.

Generic AQI apps give you one pollution number for a whole city. AIR LENS instead
compares the actual routes between two points in Tamil Nadu — on real roads, with
real-time traffic and real-time air quality — and shows a personal exposure score
for each one, including a "cigarette equivalent" number, so you can weigh a
cleaner route against a faster one.

## What's real, and what needs a key

The app is designed so you add your own keys for the accurate, live path. Every
piece has a free-tier or free-forever key option, and everything still degrades
gracefully (never crashes) if a key is missing or a call fails.

| Purpose | Live source (needs a free key) | Fallback if no key / call fails |
|---|---|---|
| Routing (real roads, alternatives, **live traffic**) | **Google Directions API** | OSRM demo server (free, no key, no live traffic) → synthesized routes |
| Geocoding (place name → coordinates, Tamil Nadu-biased) | **Google Geocoding API** | OpenStreetMap Nominatim (free, no key) → deterministic mock |
| Air quality (**real-time**, Tamil Nadu) | **CPCB via data.gov.in** (official Indian govt. monitoring stations) | WAQI (real-time, global) → Open-Meteo (modeled, no key) → mock |
| Map rendering in the browser | **Google Maps JavaScript API** | Simple built-in SVG route preview |

The Results and Route Detail pages show a green "✓ live source" badge for
whichever of these actually served real-time data for your search, and an
amber banner if anything had to fall back to sample data — so it's always
clear what you're looking at.

## Where to get free API keys

### 1. Google Maps Platform (routing, geocoding, map rendering)
- Go to **https://console.cloud.google.com/google/maps-apis**
- Create a project, enable **Directions API**, **Geocoding API**, and
  **Maps JavaScript API**
- Create an API key (Credentials → Create credentials → API key)
- New Google Cloud accounts get **$200/month in free credit**, which comfortably
  covers a prototype/demo's usage
- **Use two separate keys**: one unrestricted-enough for the backend
  (`GOOGLE_MAPS_API_KEY`), and a second one restricted to *Maps JavaScript API*
  + your site's HTTP referrer for the frontend (`VITE_GOOGLE_MAPS_API_KEY`),
  since the frontend key is visible in the browser

### 2. data.gov.in — CPCB real-time Air Quality Index (Tamil Nadu)
- Go to **https://data.gov.in**, click **Sign Up**, verify your email
- Once logged in, go to **My Account → API Keys** to generate a free key —
  instant, no cost, no billing/card required
- This unlocks the **"Real Time Air Quality Index From Various Locations"**
  dataset, published by the Central Pollution Control Board (CPCB), which
  includes live PM2.5 readings from official monitoring stations across Tamil
  Nadu (Chennai, Coimbatore, Madurai, Tiruchirappalli, Vellore, and more).
  This is the most accurate, most Tamil-Nadu-specific source in the app, and
  where you should put your first key if you only get one.

### 3. WAQI / aqicn.org (real-time backup, global coverage)
- Go to **https://aqicn.org/data-platform/token/**, enter your email — the
  token is emailed instantly, free, no account setup
- Used automatically as a real-time backup whenever a route point falls
  outside CPCB's Tamil Nadu station coverage, or if you skip the data.gov.in
  key

### Free alternatives to Google Maps (optional, not pre-wired)
If you'd rather not use Google for maps, two India-focused options with
generous free tiers exist and could be swapped into
`backend/src/services/routing.js` / `geocode.js` following the same pattern
as the Google functions there:
- **Mappls (MapmyIndia)** — https://about.mappls.com/api/ — strong Tamil Nadu
  road coverage, free developer tier
- **Ola Maps** — https://maps.olakrishna.com (Ola Krutrim) — free tier aimed
  at Indian developers

## Project structure

```
air-lens/
  backend/   Node.js + Express API (routing, geocoding, air quality, scoring)
  frontend/  React + Vite app (Home, Results, Route Detail, About)
```

## Setup

Requires Node.js 18+ (for built-in `fetch`).

```bash
# from the air-lens/ root
npm run install:all
```

Then add your keys:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Fill in as many of these as you have (all optional, but the more you add, the
more of the app runs on live data instead of fallbacks):

- `backend/.env` → `GOOGLE_MAPS_API_KEY`, `DATA_GOV_IN_API_KEY`, `WAQI_API_TOKEN`
- `frontend/.env.local` → `VITE_GOOGLE_MAPS_API_KEY` (and `VITE_API_BASE_URL`
  only if your backend isn't on the default port)

## Running locally

From the `air-lens/` root, run both servers at once:

```bash
npm run dev
```

Or separately in two terminals:

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

Open **http://localhost:5173**, enter two Tamil Nadu locations (try the quick
picks on the Home page — Chennai, Coimbatore, Madurai, etc., or a specific
locality like "Gandhipuram, Coimbatore" or "Anna Nagar, Chennai"), and hit
**Compare routes**.

## Pages

1. **Plan a route (`/`)** — start, destination (Tamil Nadu quick-pick list),
   optional departure time (defaults to live/current traffic conditions).
2. **Results (`/results`)** — 2–3 route cards side by side: a real map with the
   route drawn on actual roads, travel time (live-traffic-aware when Google
   is configured), average/peak PM2.5, the cigarette-equivalent meter, and
   "Fastest" / "Cleanest" / "Live traffic" badges.
3. **Route detail (`/route/:id`)** — how PM2.5 changes along that specific
   route, as a line chart, plus the full-size real map.
4. **About (`/about`)** — what AIR LENS does differently from apps like Plume
   Labs, IQAir AirVisual, and AQI Path, and why it's built specifically for
   Tamil Nadu.

## Design status — placeholder on purpose

The current visual styling is intentionally plain and lives in **one isolated
file**: `frontend/src/theme/theme.css` (CSS variables + a small set of
utility classes). Component files reference those classes/variables only, so
that when the real UI design is provided, re-skinning the app should mean
editing that one theme layer, not restructuring components.

## Notes on the exposure/ranking logic

- `cigaretteEquivalent = (avgPM25 × durationHours) / (22 × 24)`, based on the
  Berkeley Earth rule of thumb that ~22 µg/m³ of PM2.5 sustained over 24h ≈ 1
  cigarette, applied illustratively to a single trip. Shown in-app under "How
  this is calculated."
- `exposureScore` (used only to badge "Cleanest") blends average PM2.5 (70%)
  and dose-per-hour (30%) so a short trip through very dirty air and a longer
  trip through moderately dirty air can be compared. It's a simplification,
  documented in the UI.
- CPCB station data is cached in-memory for 10 minutes per server process
  (one fetch covers every point in a search); individual point lookups
  (across any source) are cached for 15 minutes. Swapping in Redis/Postgres
  later is a drop-in change to `backend/src/services/airQuality.js`.
