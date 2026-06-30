// -----------------------------------------------------------------------------
// Phase 4 — Solar Return & Lunar Return
//
// SOLAR RETURN: the moment each year when the Sun's transiting ecliptic
// longitude equals its natal longitude. The chart cast for that moment
// governs the year ahead (Hand, *Planets in Transit*).
//
// LUNAR RETURN: same for the Moon. Occurs every ~27.3 days. Used for the
// "feel" of the coming month.
//
// Implementation: iterative root-finding on λ(body, t) − λ_natal.
// We seed at the (calendar-year + longitude-of-year guess) then Newton's
// method using the body's speed.
// -----------------------------------------------------------------------------

import { dateToJD, longitudesAtDate, extraLongitudesAtDate } from '../../astro/ephemeris.js';

function norm360(x) { return ((x % 360) + 360) % 360; }
function signedDelta(a, b) {
  return ((a - b + 540) % 360) - 180;
}

function jdToUTCDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

// Find the JD where body `name`'s longitude equals `targetLon` near `seedDate`.
// `speedHint` in deg/day — used for Newton step; defaults based on body.
function findLongitudeCrossing(name, targetLon, seedDate, speedHint) {
  let jd = dateToJD(seedDate);
  for (let iter = 0; iter < 40; iter++) {
    const lon = longitudesAtDate(jdToUTCDate(jd))[name];
    if (lon == null) break;
    const d = signedDelta(lon, targetLon);
    if (Math.abs(d) < 1e-7) break;
    // Numerical derivative over 0.01 days.
    const lon2 = longitudesAtDate(jdToUTCDate(jd + 0.01))[name];
    const speed = (signedDelta(lon2, lon) + 1e-12) / 0.01;  // deg/day
    const step = -d / (Math.abs(speed) < 1e-4 ? speedHint : speed);
    jd += step;
    if (Math.abs(step) < 1e-7) break;
  }
  return jd;
}

// Solar Return for `year`. Seed: approximate date = birth month + year.
// Returns a Date in UT plus the full return chart planet set.
export function solarReturn(birth, year) {
  const natalSunDate = new Date(Date.UTC(year, birth.month - 1, birth.day, birth.hour, birth.minute));
  const natalSun = longitudesAtDate(new Date(Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute))).Sun;
  const jd = findLongitudeCrossing('Sun', natalSun, natalSunDate, 1);  // Sun ~1°/day
  const date = jdToUTCDate(jd);
  const lons = longitudesAtDate(date);
  const extras = extraLongitudesAtDate(date);
  return { year, date, jd, natalSunLon: natalSun, planets: { ...lons, ...Object.fromEntries(Object.entries(extras).filter(([k,v]) => v != null)) } };
}

// Lunar Return nearest to `seedDate`. The Moon completes one lunar cycle
// (~27.3 days) so we find the Moon-at-natal-position closest to the seed.
export function lunarReturnNear(birth, seedDate) {
  const natalMoon = longitudesAtDate(new Date(Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute))).Moon;
  // Seed with Moon speed hint ~13.18 deg/day.
  const jd = findLongitudeCrossing('Moon', natalMoon, seedDate, 13.18);
  const date = jdToUTCDate(jd);
  const lons = longitudesAtDate(date);
  const extras = extraLongitudesAtDate(date);
  return { date, jd, natalMoonLon: natalMoon, planets: { ...lons, ...Object.fromEntries(Object.entries(extras).filter(([k,v]) => v != null)) } };
}
