// -----------------------------------------------------------------------------
// Optional city → lat/lon/timezone lookup via Open-Meteo's free geocoding API.
//
//   https://open-meteo.com/en/docs/geocoding-api
//
// No API key, no signup, CORS-friendly.
//
// The endpoint returns IANA timezone names ("Asia/Kolkata"). We convert that
// to a signed minute-offset AT THE BIRTH DATE using the browser's Intl data,
// so historical DST is handled correctly in modern browsers.
// -----------------------------------------------------------------------------

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export async function searchLocation(query, { count = 6, language = 'en' } = {}) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const url = `${ENDPOINT}?name=${encodeURIComponent(q)}&count=${count}&language=${language}&format=json`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const json = await res.json();
  const results = json.results || [];
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    admin: [r.admin1, r.admin2, r.admin3].filter(Boolean).join(' · '),
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,          // IANA, e.g. "Asia/Kolkata"
    population: r.population || 0,
  }));
}

// Minutes east of UTC for a given IANA timezone on a given JS Date.
// Works for modern browsers with up-to-date ICU data (all mainstream since ~2020).
// Falls back to 0 if the zone is unrecognised.
export function offsetMinutesForZoneAt(iana, date) {
  if (!iana) return 0;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const map = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
    }
    // Intl formats midnight as "24" in some locales — normalise.
    if (map.hour === 24) map.hour = 0;
    const localAsIfUTC = Date.UTC(
      map.year, map.month - 1, map.day,
      map.hour, map.minute, map.second
    );
    const diffMs = localAsIfUTC - date.getTime();
    return Math.round(diffMs / 60000);
  } catch (_) {
    return 0;
  }
}
