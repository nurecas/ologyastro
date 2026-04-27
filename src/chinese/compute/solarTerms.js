// Chinese BaZi — solar-term computation.
//
// Each of the 24 jieqi is the moment when the tropical Sun reaches a
// specific longitude (315°/345°/15°/.../285° for Lichun..Xiaohan, with
// the mid-month qì terms in between). We use Swiss Ephemeris to find
// these crossings by bisection on JD.
//
// The Sun moves continuously forward through tropical longitudes (no
// retrograde — it's our reference frame). So bisection is monotonic over
// any interval not crossing 360°→0° unless we wrap-aware the diff.

import { longitudesAtDate, dateToJD, isSwissReady, isInSwissRange } from '../../astro/ephemeris.js';
import { SOLAR_TERMS } from './data.js';

const MS_DAY = 86400000;

// Wrap-aware longitude difference in [-180, 180]. Positive = `lon` is
// AHEAD of `target`; negative = behind.
function lonDiff(lon, target) {
  let d = lon - target;
  if (d > 180)  d -= 360;
  if (d < -180) d += 360;
  return d;
}

function sunLonAtJD(jd) {
  return longitudesAtDate(new Date((jd - 2440587.5) * MS_DAY)).Sun;
}

// Find the JD at which Sun reaches `targetLon` within `[loJD, hiJD]`.
// Returns null if Sun's range across the interval doesn't span the target.
function bisectSunCrossing(loJD, hiJD, targetLon) {
  let dLo = lonDiff(sunLonAtJD(loJD), targetLon);
  let dHi = lonDiff(sunLonAtJD(hiJD), targetLon);
  // Sun moves forward (~0.985°/day). We want dLo <= 0 < dHi (target lies
  // within [loJD, hiJD]). Reject brackets where Sun never crosses target.
  if (dLo > 0 && dHi > 0) return null;       // target already past
  if (dLo < 0 && dHi < 0) return null;       // target not yet reached
  for (let i = 0; i < 60; i++) {
    const midJD = (loJD + hiJD) / 2;
    const dMid = lonDiff(sunLonAtJD(midJD), targetLon);
    if (Math.abs(dMid) < 1e-7) return midJD;
    if (dLo <= 0 && dMid >= 0) { hiJD = midJD; dHi = dMid; }
    else                        { loJD = midJD; dLo = dMid; }
  }
  return (loJD + hiJD) / 2;
}

// Find the JD of a specific solar-term in the year-window containing
// `aroundJD`. Strategy: estimate from mean Sun motion, bracket ±5 days,
// bisect.
//
// Sun longitude advances ~0.9856°/day. To target longitude L, the Sun
// arrives ~ (L - currentLon) / 0.9856 days ahead. We compute that and
// bisect around the estimate.
export function findSolarTermJD(targetSunLon, aroundJD) {
  if (!isSwissReady()) return null;
  // Initial estimate.
  const lonAtAround = sunLonAtJD(aroundJD);
  const delta = lonDiff(targetSunLon, lonAtAround);
  const estJD = aroundJD + delta / 0.9856;
  // Bracket ±5 days.
  const lo = estJD - 5;
  const hi = estJD + 5;
  if (!isInSwissRange(lo) || !isInSwissRange(hi)) return null;
  return bisectSunCrossing(lo, hi, targetSunLon);
}

// All 12 month-boundary jiés (节) within ±400 days of `aroundJD`. Returns
// an array of { name, hanzi, sunLon, jd, date, starts (branch hanzi) }
// sorted ascending by jd. We compute about 13 (>= 12) to ensure the
// bracketing for Year/Month pillar logic.
export function jiesWithinYear(aroundJD) {
  if (!isSwissReady()) return [];
  const out = [];
  // Find Lichun (315°) of the year(s) surrounding aroundJD.
  // First compute approximate Lichun JD: Sun at 315° around February each year.
  // Look back ~400 days and forward ~400 days for all 12 jiés.
  const jies = SOLAR_TERMS.filter(t => t.isJie);
  for (const t of jies) {
    // Find the most recent crossing of t.sunLon ≤ aroundJD + 30 days.
    // We attempt twice: one looking back ~365 days from aroundJD, and one
    // looking forward ~365 days. This catches both prev/next instances.
    for (const probe of [aroundJD - 200, aroundJD + 200]) {
      const jd = findSolarTermJD(t.sunLon, probe);
      if (jd != null) {
        const date = new Date((jd - 2440587.5) * MS_DAY);
        out.push({ name: t.name, hanzi: t.hanzi, sunLon: t.sunLon, jd, date, starts: t.starts });
      }
    }
  }
  // Dedupe by JD (rounded to ~5 hours) and sort.
  const dedup = [];
  for (const e of out) {
    if (!dedup.find(d => Math.abs(d.jd - e.jd) < 0.2)) dedup.push(e);
  }
  return dedup.sort((a, b) => a.jd - b.jd);
}

// The most recent Lichun (start of solar year) at or before `aroundJD`.
// Year Pillar boundary. Returns { jd, date } or null.
export function lichunBefore(aroundJD) {
  if (!isSwissReady()) return null;
  // Search in window aroundJD-400 to aroundJD. Lichun is at Sun 315°.
  // Probe from aroundJD - 30 first (same calendar year), then aroundJD - 380.
  const tries = [aroundJD - 30, aroundJD - 200, aroundJD - 365];
  for (const probe of tries) {
    const jd = findSolarTermJD(315, probe);
    if (jd != null && jd <= aroundJD + 1e-3) return { jd, date: new Date((jd - 2440587.5) * MS_DAY) };
  }
  return null;
}

// The most recent month-boundary jié (节) at or before `aroundJD`.
// Returns { name, hanzi, sunLon, jd, date, starts } or null.
//
// Each branch's "month" begins at its sunLonStart. The Sun's current
// longitude tells us which branch month we're in.
export function jieBefore(aroundJD) {
  if (!isSwissReady()) return null;
  const jies = SOLAR_TERMS.filter(t => t.isJie);
  // Compute Sun longitude now to pick the active branch month.
  const lonNow = sunLonAtJD(aroundJD);
  // The active jié is the one whose sunLon ≤ lonNow if we read lonNow
  // mod 360 going BACKWARDS from 315° (Lichun) frame.
  // Convert lonNow to "offset from Lichun" 0..360.
  const off = ((lonNow - 315) + 360 + 360) % 360;
  // The active month boundary's sunLon offset = floor(off / 30) * 30.
  const activeOff = Math.floor(off / 30) * 30;
  const activeSunLon = (315 + activeOff) % 360;
  const activeJie = jies.find(t => Math.round(t.sunLon) === Math.round(activeSunLon));
  if (!activeJie) return null;
  // Bisect the actual JD when Sun crossed activeSunLon (looking back ≤ 35 days).
  const jd = findSolarTermJD(activeSunLon, aroundJD - 15);
  if (jd == null) return null;
  return {
    name: activeJie.name,
    hanzi: activeJie.hanzi,
    sunLon: activeJie.sunLon,
    jd,
    date: new Date((jd - 2440587.5) * MS_DAY),
    starts: activeJie.starts,
  };
}

// Find the next jié after `aroundJD`. Used for luck-pillar starting age.
export function jieAfter(aroundJD) {
  if (!isSwissReady()) return null;
  const jies = SOLAR_TERMS.filter(t => t.isJie);
  const lonNow = sunLonAtJD(aroundJD);
  const off = ((lonNow - 315) + 360 + 360) % 360;
  // Next jié = ceil(off / 30) * 30.
  const nextOff = (Math.floor(off / 30) + 1) * 30;
  const nextSunLon = (315 + nextOff) % 360;
  const nextJie = jies.find(t => Math.round(t.sunLon) === Math.round(nextSunLon));
  if (!nextJie) return null;
  const jd = findSolarTermJD(nextSunLon, aroundJD + 15);
  if (jd == null) return null;
  return {
    name: nextJie.name,
    hanzi: nextJie.hanzi,
    sunLon: nextJie.sunLon,
    jd,
    date: new Date((jd - 2440587.5) * MS_DAY),
    starts: nextJie.starts,
  };
}

// The previous jié before `aroundJD`. Used for luck-pillar starting age
// when the direction is backward.
export function jiePrevious(aroundJD) {
  if (!isSwissReady()) return null;
  const cur = jieBefore(aroundJD);
  if (!cur) return null;
  // The "previous" jié relative to NOW is the one immediately before the
  // current one — i.e. 30° earlier in solar longitude.
  const prevSunLon = (cur.sunLon - 30 + 360) % 360;
  const jd = findSolarTermJD(prevSunLon, cur.jd - 15);
  if (jd == null) return null;
  const jies = SOLAR_TERMS.filter(t => t.isJie);
  const prevJie = jies.find(t => Math.round(t.sunLon) === Math.round(prevSunLon));
  return {
    name: prevJie?.name,
    hanzi: prevJie?.hanzi,
    sunLon: prevSunLon,
    jd,
    date: new Date((jd - 2440587.5) * MS_DAY),
    starts: prevJie?.starts,
  };
}
