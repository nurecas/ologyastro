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
// Simple sunrise/sunset geometry — accurate to a minute for general use;
// we intentionally don't fold in atmospheric refraction or elevation.
// -----------------------------------------------------------------------------

import { dateToJD, obliquity, longitudesAtDate } from '../../astro/ephemeris.js';

const CHALDEAN_ORDER = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'];
const DAY_RULER = [
  'Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn',
]; // index = JS getUTCDay() Sunday=0

const DEG = Math.PI / 180;

// Sun's approximate declination at JD (radians).
function sunDec(jd) {
  const lonDeg = longitudesAtDate(new Date((jd - 2440587.5) * 86400000)).Sun;
  const eps = obliquity(jd);
  return Math.asin(Math.sin(lonDeg * DEG) * Math.sin(eps));
}

// Hour-angle of the Sun at sunrise / sunset for observer at latitude (rad).
// cos H = -tan(lat) tan(dec). If |cos H| > 1, Sun is circumpolar / never
// rises — return null so callers can show "—".
function sunHourAngle(latRad, decRad) {
  const c = -Math.tan(latRad) * Math.tan(decRad);
  if (c > 1 || c < -1) return null;
  return Math.acos(c);
}

// Sunrise / sunset JDs for the UT calendar day containing `date`, at the
// observer's lat/lon (east-positive). Returns { sunriseJD, sunsetJD,
// dayLengthHours }.
export function sunTransitsFor(date, latDeg, lonDeg) {
  const jd0 = dateToJD(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12)));
  const latRad = latDeg * DEG;
  const dec = sunDec(jd0);
  const H = sunHourAngle(latRad, dec);
  if (H == null) return { sunriseJD: null, sunsetJD: null, dayLengthHours: 0 };
  // Local solar noon JD — at longitude lon, solar noon is 12:00 local
  // apparent time. UT offset = -lon / 15 hours.
  const noonJD = jd0 - lonDeg / 360;
  const halfDay = H / (2 * Math.PI);  // fraction of a day
  return {
    sunriseJD: noonJD - halfDay,
    sunsetJD:  noonJD + halfDay,
    dayLengthHours: halfDay * 24 * 2,
  };
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
  let phase, base, arcLen, dayIndex;
  // Day-of-week of the current arc is the day on which its sunrise fell
  // (UT). For a night-arc that started last night, use YESTERDAY's dow.
  if (jdNow < today.sunriseJD) {
    // Before today's sunrise — we're in the night arc that started at
    // yesterday's sunset.
    const yday = new Date(date.getTime() - 86400000);
    const ytr  = sunTransitsFor(yday, latDeg, lonDeg);
    if (ytr.sunsetJD == null) return null;
    phase = 'night';
    base = ytr.sunsetJD;
    arcLen = today.sunriseJD - ytr.sunsetJD;
    dayIndex = new Date((ytr.sunriseJD - 2440587.5) * 86400000).getUTCDay();
  } else if (jdNow < today.sunsetJD) {
    phase = 'day';
    base = today.sunriseJD;
    arcLen = today.sunsetJD - today.sunriseJD;
    dayIndex = date.getUTCDay();
  } else {
    phase = 'night';
    base = today.sunsetJD;
    arcLen = tomorrow.sunriseJD - today.sunsetJD;
    dayIndex = date.getUTCDay();
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
