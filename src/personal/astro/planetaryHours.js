// -----------------------------------------------------------------------------
// Phase 5 — Classical Planetary Hours
//
// The ancient Chaldean system divides the day (sunrise-to-sunset) and the
// night (sunset-to-next-sunrise) each into 12 "hours" — not equal clock
// hours, but equal fractions of the daylight/nighttime arc. Each hour is
// ruled by one of the seven traditional planets cycling in Chaldean order:
//   Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon
// The ruler of the FIRST hour after sunrise = the ruler of the day.
// Day-of-week → day-ruler:
//   Sunday: Sun, Monday: Moon, Tuesday: Mars, Wednesday: Mercury,
//   Thursday: Jupiter, Friday: Venus, Saturday: Saturn.
// The 24-hour cycle then follows Chaldean order from that first hour.
//
// Used by the Transits-view top strip (Advanced mode, Phase 5 surfaces).
// Sunrise/sunset include the equation of time and the standard -0.833 deg
// horizon (refraction + solar semidiameter); observer elevation is ignored.
// -----------------------------------------------------------------------------

import { dateToJD } from '../../astro/ephemeris.js';

const CHALDEAN_ORDER = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'];
const DAY_RULER = [
  'Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn',
]; // index = JS getUTCDay() Sunday=0

const DEG = Math.PI / 180;

// Apparent Sun for rise/set work: declination (rad) and the equation of
// time (minutes) at JD, from the Meeus ch. 25 low-precision solar theory
// (about 0.01 deg in longitude, a few seconds in the equation of time).
// Always TROPICAL and independent of the ephemeris' sidereal mode.
function sunRiseSetParams(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const om = (125.04 - 1934.136 * T) * DEG;
  const lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(om)) * DEG;   // apparent longitude
  const eps = (23.439291 - 0.0130042 * T + 0.00256 * Math.cos(om)) * DEG;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / DEG;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  let eot = (L0 - 0.0057183 - ra) % 360;            // degrees
  if (eot > 180) eot -= 360; if (eot < -180) eot += 360;
  return { dec, eotMin: eot * 4 };
}

// Standard altitude of the Sun's upper limb at rise/set: -0deg50' (34' mean
// refraction + 16' semidiameter), as used by almanacs (USNO, NOAA).
const SUN_H0 = -0.8333 * DEG;

// Sunrise / sunset JDs for the observer's LOCAL (mean solar) civil day
// containing `date`, at lat/lon (east-positive). Iterates the hour angle
// with the Sun's declination and the equation of time evaluated at the
// event itself, against the -0.833 deg horizon. Agrees with Astronomy
// Engine / timeanddate to well under a minute at non-polar latitudes.
// Returns { sunriseJD, sunsetJD, dayLengthHours }; nulls when the Sun does
// not rise or set that day (polar day/night).
export function sunTransitsFor(date, latDeg, lonDeg) {
  // Anchor the solar day to the observer's LOCAL civil day, not the UTC day.
  // A longitude whose local day straddles UTC midnight would otherwise be
  // handed the neighbouring day's daylight arc — producing a wrong day/night
  // phase and an out-of-range (negative or >11) hour index.
  const local = new Date(date.getTime() + lonDeg * 240000); // 240000 ms per ° of longitude (east +)
  // UT instant of local MEAN midnight that starts this day.
  const day0Ms = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - lonDeg * 240000;
  const latRad = latDeg * DEG;
  const event = (sign) => {             // sign: -1 rise, +1 set
    let tMs = day0Ms + 12 * 3600000;
    for (let i = 0; i < 5; i++) {
      const { dec, eotMin } = sunRiseSetParams(tMs / 86400000 + 2440587.5);
      const c = (Math.sin(SUN_H0) - Math.sin(latRad) * Math.sin(dec)) / (Math.cos(latRad) * Math.cos(dec));
      if (c > 1 || c < -1) return null;
      const H = Math.acos(c) / DEG;     // degrees
      tMs = day0Ms + (720 - eotMin + sign * H * 4) * 60000;
    }
    return tMs / 86400000 + 2440587.5;
  };
  const sunriseJD = event(-1), sunsetJD = event(+1);
  if (sunriseJD == null || sunsetJD == null) return { sunriseJD: null, sunsetJD: null, dayLengthHours: 0 };
  return { sunriseJD, sunsetJD, dayLengthHours: (sunsetJD - sunriseJD) * 24 };
}

// Classical planetary hour at `date` for an observer at (lat, lon).
// Returns { ruler, index, start: Date, end: Date, phase: 'day' | 'night' }
// or null if the Sun is circumpolar.
export function planetaryHourAt(date, latDeg, lonDeg) {
  // We need today's sunrise + today's sunset + tomorrow's sunrise to decide
  // whether we're in the day or night arc.
  const today = sunTransitsFor(date, latDeg, lonDeg);
  if (today.sunriseJD == null) return null;
  const tomorrow = sunTransitsFor(new Date(date.getTime() + 86400000), latDeg, lonDeg);
  if (tomorrow.sunriseJD == null) return null;

  const jdNow = dateToJD(date);
  // The planetary day runs sunrise→sunrise, so an arc's ruling weekday is the
  // LOCAL civil day on which its opening sunrise falls (a night arc belongs to
  // the day of its PRECEDING sunrise). Using the UTC weekday mis-rules charts
  // whose local day differs from the UTC day.
  const localDowOfJD = (jd) => new Date((jd - 2440587.5) * 86400000 + lonDeg * 240000).getUTCDay();
  let phase, base, arcLen, dayIndex;
  if (jdNow < today.sunriseJD) {
    // Before today's sunrise — night arc that started at yesterday's sunset.
    const yday = new Date(date.getTime() - 86400000);
    const ytr  = sunTransitsFor(yday, latDeg, lonDeg);
    if (ytr.sunsetJD == null) return null;
    phase = 'night';
    base = ytr.sunsetJD;
    arcLen = today.sunriseJD - ytr.sunsetJD;
    dayIndex = localDowOfJD(ytr.sunriseJD);
  } else if (jdNow < today.sunsetJD) {
    phase = 'day';
    base = today.sunriseJD;
    arcLen = today.sunsetJD - today.sunriseJD;
    dayIndex = localDowOfJD(today.sunriseJD);
  } else {
    phase = 'night';
    base = today.sunsetJD;
    arcLen = tomorrow.sunriseJD - today.sunsetJD;
    dayIndex = localDowOfJD(today.sunriseJD);
  }
  const hourLen = arcLen / 12;
  const hourIdx = Math.floor((jdNow - base) / hourLen); // 0..11

  // Which Chaldean position is the first hour of the day? Day ruler is
  // the first hour after SUNRISE; since the 7-planet cycle repeats, the
  // first hour of the following night is at position (12 % 7), then
  // continues through second day sunrise, etc.
  const dayRuler = DAY_RULER[dayIndex];
  const firstHourOfDayCh = CHALDEAN_ORDER.indexOf(dayRuler);
  // Hours since the most recent sunrise AT THIS date:
  let hoursSinceSunrise;
  if (phase === 'day') hoursSinceSunrise = hourIdx;
  else if (phase === 'night' && jdNow < today.sunriseJD) {
    // Night arc from yesterday's sunset → today's sunrise.
    // Hours since yesterday's sunrise = 12 (day arc) + hourIdx.
    hoursSinceSunrise = 12 + hourIdx;
  } else {
    hoursSinceSunrise = 12 + hourIdx; // post-sunset tonight
  }
  const ruler = CHALDEAN_ORDER[(firstHourOfDayCh + hoursSinceSunrise) % 7];
  const start = new Date((base + hourIdx * hourLen - 2440587.5) * 86400000);
  const end   = new Date((base + (hourIdx + 1) * hourLen - 2440587.5) * 86400000);
  return { ruler, index: hourIdx, phase, start, end };
}

// Convenience: the NEXT planetary hour after `date`.
export function nextPlanetaryHourAt(date, latDeg, lonDeg) {
  const cur = planetaryHourAt(date, latDeg, lonDeg);
  if (!cur) return null;
  // Step just past the end of the current hour.
  return planetaryHourAt(new Date(cur.end.getTime() + 1000), latDeg, lonDeg);
}
