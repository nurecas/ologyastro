// -----------------------------------------------------------------------------
// Coarse reverse-geocoder for AstroCartography hotspots.
//
// Given a lat/lon in degrees, returns a human-readable label like
//   "near Cairo"            (within ~1500 km of a known city)
//   "Central Africa"        (continent region fallback)
//   "North Atlantic Ocean"  (ocean fallback)
//
// Everything is local — no external API, no internet. Fidelity is
// intentionally loose ("near X" = within 1500 km), matching the fact that
// AstroCartography lines are themselves linear loci rather than points.
// -----------------------------------------------------------------------------

// A slightly broader city list than the population dots, specifically
// chosen for geographic coverage so every inhabited region has a nearby
// reference within ~1500 km.
const REF_CITIES = [
  // North America
  { name: 'New York',      lat:  40.7, lon:  -74.0 },
  { name: 'Los Angeles',   lat:  34.1, lon: -118.2 },
  { name: 'Chicago',       lat:  41.9, lon:  -87.6 },
  { name: 'Mexico City',   lat:  19.4, lon:  -99.1 },
  { name: 'Vancouver',     lat:  49.3, lon: -123.1 },
  { name: 'Anchorage',     lat:  61.2, lon: -149.9 },
  // South America
  { name: 'São Paulo',     lat: -23.5, lon:  -46.6 },
  { name: 'Buenos Aires',  lat: -34.6, lon:  -58.4 },
  { name: 'Lima',          lat: -12.0, lon:  -77.0 },
  { name: 'Bogotá',        lat:   4.7, lon:  -74.1 },
  { name: 'Brasília',      lat: -15.8, lon:  -47.9 },
  // Europe
  { name: 'London',        lat:  51.5, lon:   -0.1 },
  { name: 'Paris',         lat:  48.9, lon:    2.3 },
  { name: 'Berlin',        lat:  52.5, lon:   13.4 },
  { name: 'Rome',          lat:  41.9, lon:   12.5 },
  { name: 'Madrid',        lat:  40.4, lon:   -3.7 },
  { name: 'Moscow',        lat:  55.8, lon:   37.6 },
  { name: 'Istanbul',      lat:  41.0, lon:   28.9 },
  // Africa
  { name: 'Cairo',         lat:  30.0, lon:   31.2 },
  { name: 'Lagos',         lat:   6.5, lon:    3.4 },
  { name: 'Nairobi',       lat:  -1.3, lon:   36.8 },
  { name: 'Cape Town',     lat: -33.9, lon:   18.4 },
  { name: 'Kinshasa',      lat:  -4.3, lon:   15.3 },
  { name: 'Addis Ababa',   lat:   9.0, lon:   38.7 },
  { name: 'Casablanca',    lat:  33.6, lon:   -7.6 },
  // Middle East
  { name: 'Tehran',        lat:  35.7, lon:   51.4 },
  { name: 'Baghdad',       lat:  33.3, lon:   44.4 },
  { name: 'Riyadh',        lat:  24.7, lon:   46.7 },
  { name: 'Jerusalem',     lat:  31.8, lon:   35.2 },
  // South Asia
  { name: 'Delhi',         lat:  28.6, lon:   77.2 },
  { name: 'Mumbai',        lat:  19.1, lon:   72.9 },
  { name: 'Karachi',       lat:  24.9, lon:   67.0 },
  { name: 'Dhaka',         lat:  23.8, lon:   90.4 },
  { name: 'Colombo',       lat:   6.9, lon:   79.9 },
  // East Asia
  { name: 'Beijing',       lat:  39.9, lon:  116.4 },
  { name: 'Shanghai',      lat:  31.2, lon:  121.5 },
  { name: 'Tokyo',         lat:  35.7, lon:  139.7 },
  { name: 'Seoul',         lat:  37.6, lon:  127.0 },
  { name: 'Hong Kong',     lat:  22.3, lon:  114.2 },
  // Southeast Asia
  { name: 'Jakarta',       lat:  -6.2, lon:  106.8 },
  { name: 'Bangkok',       lat:  13.8, lon:  100.5 },
  { name: 'Manila',        lat:  14.6, lon:  120.9 },
  { name: 'Singapore',     lat:   1.3, lon:  103.8 },
  { name: 'Ho Chi Minh',   lat:  10.8, lon:  106.7 },
  // Oceania
  { name: 'Sydney',        lat: -33.9, lon:  151.2 },
  { name: 'Perth',         lat: -31.9, lon:  115.9 },
  { name: 'Auckland',      lat: -36.9, lon:  174.8 },
  { name: 'Honolulu',      lat:  21.3, lon: -157.9 },
  // Arctic reference
  { name: 'Reykjavík',     lat:  64.1, lon:  -21.9 },
];

// Haversine distance in km between two (lat, lon) in degrees.
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
            Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normLon(lon) {
  let x = ((lon + 180) % 360 + 360) % 360 - 180;
  return x;
}

// Coarse region — checked after the city test fails. Rough rectangles on
// the Earth, deliberately simple; errs toward land labels when land is
// nearby, ocean labels otherwise.
function regionFallback(lat, lonRaw) {
  const lon = normLon(lonRaw);

  // Polar caps.
  if (lat >  70) return 'Arctic';
  if (lat < -60) return 'Antarctic';

  // Eurasia / Africa / Middle East block (rough, land-first).
  if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 65) return 'Europe / Western Russia';
  if (lat >= 35 && lat <= 75 && lon >  65 && lon <= 140) return 'Siberia / Central Asia';
  if (lat >=  5 && lat <  35 && lon >= -20 && lon <=  30) return 'North Africa / Sahara';
  if (lat >= -35 && lat <   5 && lon >=   5 && lon <=  50) return 'Central / Southern Africa';
  if (lat >= 15  && lat <  40 && lon >   30 && lon <=  65) return 'Middle East';
  if (lat >= -10 && lat <=  5 && lon >   90 && lon <= 140) return 'Maritime Southeast Asia';
  if (lat >=  5 && lat <=  45 && lon >   65 && lon <= 100) return 'South Asia';
  if (lat >= 20  && lat <=  50 && lon > 100 && lon <= 140) return 'East Asia';

  // Americas.
  if (lat >= 20  && lat <=  70 && lon >= -170 && lon <  -50) return 'North America';
  if (lat >= -55 && lat <   20 && lon >=  -85 && lon <  -30) return 'South America';
  if (lat >=  10 && lat <=  30 && lon >=  -95 && lon <  -60) return 'Caribbean';

  // Oceania landmasses.
  if (lat >= -50 && lat <  -10 && lon >= 110 && lon <= 180) return 'Australia / Oceania';
  if (lat >= -50 && lat <  -30 && lon >= 160 && lon <= 180) return 'New Zealand';

  // Oceans (catch-all).
  if (lat >= -60 && lat <=  70 && lon >= -70 && lon <= -15) return 'Atlantic Ocean';
  if (lat >= -60 && lat <=  20 && lon >= -15 && lon <=  20 && lat < 30) return 'Eastern Atlantic';
  if (lat >= -50 && lat <=  30 && lon >=  40 && lon <= 100) return 'Indian Ocean';
  if ((lon >= 140 || lon <= -80) && lat >= -60 && lat <= 60) return 'Pacific Ocean';

  return 'open ocean';
}

export function locationLabel(lat, lon) {
  // Nearest-city test first.
  let best = null, bestD = Infinity;
  for (const c of REF_CITIES) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (best && bestD < 900) return `near ${best.name}`;
  if (best && bestD < 1800) return `off ${best.name}`;
  return regionFallback(lat, lon);
}
