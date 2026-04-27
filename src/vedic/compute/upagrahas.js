// Vedic Upagrahas — Gulika and Mandi.
//
// Upagrahas ("sub-planets") are not luminous bodies but specific points on
// the ecliptic computed from the sunrise/sunset of the birth day. The two
// most-cited are Gulika (the "son of Saturn", a strong malefic point) and
// Mandi (a related point, sometimes called the "slow-moving point"). Both
// are read in Jyotish much like a planet — by sign, house, dispositors,
// nakshatra — for fine-grained karmic timing.
//
// Algorithm (Yavanajataka / Phaladeepika):
//
// Day birth — daytime (sunrise → sunset) is divided into 8 equal parts. The
// Gulika kāla (the period assigned to Saturn's son) is one of those parts,
// numbered by the weekday lord of the birth date:
//
//   Sun → 8th, Moon → 7th, Mars → 6th, Mercury → 5th,
//   Jupiter → 4th, Venus → 3rd, Saturn → 2nd part.
//
// Night birth — nighttime (sunset → next sunrise) is divided into 8 parts;
// the Gulika kāla part number is `((dayPart - 5) mod 8) + 1` — equivalently
// "subtract 4 from the day-rule, mod 8" per the prompt's Yavanajataka rule.
//
// Gulika longitude = sidereal Ascendant at the START of the part FOLLOWING
// Gulika kāla — i.e. at the END of the Gulika kāla part. (Some schools use
// the start of Gulika kāla itself; we expose both via "useGulikaStart"
// option for callers who prefer it.)
//
// Mandi longitude = sidereal Ascendant at the MIDPOINT of Gulika kāla —
// the most common convention; cited e.g. in Phaladeepika.
//
// Sources: Yavanajataka (Sphujidhvaja), Phaladeepika Ch. 4, BPHS.

import {
  dateToJD, computeHousesSwiss, isSwissReady, isInSwissRange,
  obliquity, longitudesAtDateStandish,
} from '../../astro/ephemeris.js';
import { birthToUTCDate } from '../../personal/astro/natal.js';
import { RASHIS, NAKSHATRAS } from './data.js';

const DEG = Math.PI / 180;
const NAK_SPAN = 360 / 27;
const PADA_SPAN = NAK_SPAN / 4;

function norm360(x) { let y = x % 360; if (y < 0) y += 360; return y; }
function signOf(lon) { return Math.floor(norm360(lon) / 30); }

// Day-part for Gulika kāla, 1-indexed. Weekday: 0=Sun..6=Sat.
//   Sun→8, Mon→7, Tue→6, Wed→5, Thu→4, Fri→3, Sat→2
const GULIKA_DAY_PART = [8, 7, 6, 5, 4, 3, 2];

// Sun declination at JD via the always-tropical Standish/Meeus path.
// We deliberately don't use longitudesAtDate here — it respects the active
// sidereal mode and would feed sidereal longitude into the declination
// formula, off by ~24°. The Standish Sun is ~0.05° accurate, sub-minute
// for sunrise/sunset — perfectly adequate for upagraha timing.
function sunDeclination(jd) {
  const date = new Date((jd - 2440587.5) * 86400000);
  const lonTrop = longitudesAtDateStandish(date).Sun * DEG;
  return Math.asin(Math.sin(lonTrop) * Math.sin(obliquity(jd)));
}

function sunHourAngle(latRad, decRad) {
  const c = -Math.tan(latRad) * Math.tan(decRad);
  if (c > 1 || c < -1) return null;     // circumpolar — no rise/set on this day
  return Math.acos(c);
}

// Sunrise / sunset JDs for the UT calendar day containing `date` at the
// observer's lat/lon (east-positive). Returns null if the Sun is
// circumpolar at this latitude on this day — Gulika is undefined in that
// case and callers can show "—".
function sunTransits(date, latDeg, lonDeg) {
  const jd0 = dateToJD(new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12,
  )));
  const dec = sunDeclination(jd0);
  const H   = sunHourAngle(latDeg * DEG, dec);
  if (H == null) return null;
  const noonJD = jd0 - lonDeg / 360;
  const halfDay = H / (2 * Math.PI);
  return {
    sunriseJD: noonJD - halfDay,
    sunsetJD:  noonJD + halfDay,
  };
}

function sidWeekday(birth) {
  // Vāra is keyed by the LOCAL calendar day of birth (matches how the
  // panchang module does it — a 2 AM IST birth is "today" in IST, not
  // "yesterday" in UT).
  const utc = birthToUTCDate(birth);
  const local = new Date(utc.getTime() + (birth.tzOffsetMin || 0) * 60000);
  return local.getUTCDay();   // 0=Sun..6=Sat
}

// Compute one upagraha given a JD and the birth's geographic coords.
function upagraphaAt(jd, latDeg, lonDeg) {
  const houses = computeHousesSwiss(jd, latDeg, lonDeg, 'whole-sign');
  if (!houses) return null;
  const lon = norm360(houses.asc);
  const sign = signOf(lon);
  const within = lon - sign * 30;
  const nakIdx = Math.floor(lon / NAK_SPAN);
  const padaIdx = Math.floor((lon - nakIdx * NAK_SPAN) / PADA_SPAN) + 1;
  return {
    lonDeg: lon,
    signIdx: sign,
    sign: RASHIS[sign].en,
    signSa: RASHIS[sign].sa,
    withinDeg: within,
    nakshatra: NAKSHATRAS[nakIdx].name,
    nakshatraIndex: nakIdx,
    nakshatraLord: NAKSHATRAS[nakIdx].lord,
    pada: padaIdx,
  };
}

// Public — compute Gulika and Mandi for a birth.
//
// Returns:
//   {
//     isDayBirth, weekday, partNumber, partRange: { startJD, endJD },
//     gulika: { name, lonDeg, signIdx, sign, ..., house },
//     mandi:  { ... },
//   }
//
// or null if the Sun is circumpolar / Swiss is unavailable / birth coords
// are invalid.
//
// Caller MUST have already set sidereal+ayanamsa on the ephemeris (the
// parent computeVedicChart does this once at its top). We deliberately
// don't call setEphemerisOptions here — it would fire the chart store's
// Swiss-state listener and recurse the chart compute.
export function computeUpagrahas(birth, options = {}) {
  if (!birth) return null;
  if (!isSwissReady()) return null;
  const { lagnaSignIdx = null } = options;

  // Defensive validation — Swiss WASM crashes hard on NaN coords or JD.
  // BirthForm permits submit even with bad lat/lon when "time unknown" is
  // checked, so guard explicitly.
  if (!Number.isFinite(birth.latDeg) || !Number.isFinite(birth.lonDeg))     return null;
  if (Math.abs(birth.latDeg) > 89 || Math.abs(birth.lonDeg) > 180)          return null;

  const utc = birthToUTCDate(birth);
  const jdBirth = dateToJD(utc);
  if (!Number.isFinite(jdBirth) || !isInSwissRange(jdBirth)) return null;

  const today = sunTransits(utc, birth.latDeg, birth.lonDeg);
  if (!today || !Number.isFinite(today.sunriseJD) || !Number.isFinite(today.sunsetJD)) return null;

  // Determine day vs night birth from sunrise/sunset of the LOCAL calendar
  // day. A birth at 5 AM might be before today's sunrise (still night-arc
  // from yesterday); we account for that.
  let isDay, baseJD, arcLen;
  if (jdBirth >= today.sunriseJD && jdBirth < today.sunsetJD) {
    isDay  = true;
    baseJD = today.sunriseJD;
    arcLen = today.sunsetJD - today.sunriseJD;
  } else if (jdBirth >= today.sunsetJD) {
    // Night arc starting tonight at sunset → tomorrow's sunrise.
    const tomorrow = sunTransits(new Date(utc.getTime() + 86400000),
                                  birth.latDeg, birth.lonDeg);
    if (!tomorrow || !Number.isFinite(tomorrow.sunriseJD)) return null;
    isDay  = false;
    baseJD = today.sunsetJD;
    arcLen = tomorrow.sunriseJD - today.sunsetJD;
  } else {
    // Before today's sunrise — night arc that began at YESTERDAY's sunset.
    const yesterday = sunTransits(new Date(utc.getTime() - 86400000),
                                   birth.latDeg, birth.lonDeg);
    if (!yesterday || !Number.isFinite(yesterday.sunsetJD)) return null;
    isDay  = false;
    baseJD = yesterday.sunsetJD;
    arcLen = today.sunriseJD - yesterday.sunsetJD;
  }
  if (!Number.isFinite(baseJD) || !Number.isFinite(arcLen) || arcLen <= 0) return null;

  const partLen = arcLen / 8;

  // Vāra: weekday on which the active arc began. For day-arc that's the
  // birth's local day. For night-arc that started LAST evening, classical
  // texts still tag the night with the weekday of the day that preceded
  // it — i.e., the weekday at sunrise of that day.
  let weekday;
  if (isDay) {
    weekday = sidWeekday(birth);
  } else if (jdBirth >= today.sunsetJD) {
    weekday = sidWeekday(birth);                                           // tonight
  } else {
    // Pre-sunrise: night-arc began at yesterday's sunset. Tag with yesterday's vāra.
    const yLocal = new Date(utc.getTime() + (birth.tzOffsetMin || 0) * 60000 - 86400000);
    weekday = yLocal.getUTCDay();
  }

  const dayPart = GULIKA_DAY_PART[weekday];
  const partNumber = isDay
    ? dayPart
    : (((dayPart - 5) % 8) + 8) % 8 + 1;       // night = (day-rule - 4) mod 8

  // Gulika kāla part bounds (1-indexed → 0-indexed offset).
  const partStartJD = baseJD + (partNumber - 1) * partLen;
  const partEndJD   = baseJD +  partNumber      * partLen;
  const partMidJD   = baseJD + (partNumber - 0.5) * partLen;

  // Gulika at the END of the part = start of next part. Some schools take
  // the START of the part instead — we expose both via the option flag.
  const gulikaJD = options.useGulikaStart ? partStartJD : partEndJD;
  if (!Number.isFinite(gulikaJD) || !Number.isFinite(partMidJD))    return null;
  if (!isInSwissRange(gulikaJD) || !isInSwissRange(partMidJD))      return null;
  const gulika   = upagraphaAt(gulikaJD, birth.latDeg, birth.lonDeg);
  // Mandi at the MIDPOINT of Gulika kāla.
  const mandi    = upagraphaAt(partMidJD, birth.latDeg, birth.lonDeg);
  if (!gulika || !mandi) return null;

  // House from the Lagna, if we have one.
  if (lagnaSignIdx != null) {
    gulika.house = ((gulika.signIdx - lagnaSignIdx + 12) % 12) + 1;
    mandi.house  = ((mandi.signIdx  - lagnaSignIdx + 12) % 12) + 1;
  }
  gulika.name = 'Gulika';
  mandi.name  = 'Mandi';
  gulika.kind = 'upagraha';
  mandi.kind  = 'upagraha';

  return {
    isDayBirth: isDay,
    weekday,
    weekdayName: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][weekday],
    partNumber,
    partRange: {
      startJD: partStartJD,
      endJD:   partEndJD,
      midJD:   partMidJD,
      startDate: new Date((partStartJD - 2440587.5) * 86400000),
      endDate:   new Date((partEndJD   - 2440587.5) * 86400000),
    },
    gulika,
    mandi,
  };
}
