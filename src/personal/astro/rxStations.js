// -----------------------------------------------------------------------------
// Phase 3 — Retrograde stations calendar
//
// For the slow bodies (Mercury through Pluto + Chiron), compute the next
// direct and retrograde stations in a given window (default 12 months).
// Station detection: scan daily, find days where sign(speed) flips, then
// refine via bisection to sub-day accuracy.
//
// Used by the Transits mode's Rx Stations panel (Advanced — Phase 5
// surfaces the UI card).
// -----------------------------------------------------------------------------

import { extraSpeedAtJD, isSwissReady, isInSwissRange, dateToJD } from '../../astro/ephemeris.js';

// Stations module reuses the Swiss calc_ut speed output. For classical
// bodies (Mercury through Pluto) we call through a minimal helper that
// uses the same ids table as ephemeris.js.
//
// This wrapper deliberately depends on a Swiss-ready state. The `listStations`
// function early-returns an empty array when Swiss is unavailable — the UI
// hides the panel accordingly.

const BODIES = [
  'Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron',
];

// Minimal speed reader that covers classical + Chiron. Reuses
// extraSpeedAtJD under the hood for Chiron; for classical we compute via
// symmetric finite difference of longitude (fallback doesn't matter —
// Swiss is assumed present).
function speedAt(bodyName, jd) {
  // extraSpeedAtJD handles Chiron and Uranian; for classical we call it
  // too since ephemeris.js maps classical names in the same `_swissIds`
  // table.
  return extraSpeedAtJD(bodyName, jd);
}

// Refine the instant of station by bisection within a [jd0, jd1] window
// where speed(jd0) and speed(jd1) have opposite signs.
function refineStation(bodyName, jd0, jd1) {
  let s0 = speedAt(bodyName, jd0);
  let s1 = speedAt(bodyName, jd1);
  for (let i = 0; i < 24; i++) {
    const mid = (jd0 + jd1) / 2;
    const sm = speedAt(bodyName, mid);
    if (sm === null) return mid;
    if (Math.sign(sm) === Math.sign(s0)) { jd0 = mid; s0 = sm; }
    else                                 { jd1 = mid; s1 = sm; }
    if (Math.abs(jd1 - jd0) < 1 / 1440) break; // ~1 minute precision
  }
  return (jd0 + jd1) / 2;
}

// Find all station crossings in the window [fromDate, toDate]. Daily scan
// is fine for the slow bodies since Mercury's fastest retrograde arc is
// ~22 days and we only care about sign flips of d(longitude)/dt.
export function listStations({ fromDate, toDate, bodies = BODIES } = {}) {
  if (!isSwissReady()) return [];
  const jdFrom = dateToJD(fromDate);
  const jdTo   = dateToJD(toDate);
  if (!isInSwissRange(jdFrom) || !isInSwissRange(jdTo)) return [];

  const out = [];
  for (const name of bodies) {
    let prevJD = jdFrom;
    let prev = speedAt(name, prevJD);
    if (prev === null) continue;
    for (let jd = jdFrom + 1; jd <= jdTo; jd += 1) {
      const s = speedAt(name, jd);
      if (s === null) continue;
      if (Math.sign(s) !== Math.sign(prev) && Math.sign(s) !== 0 && Math.sign(prev) !== 0) {
        const stationJD = refineStation(name, prevJD, jd);
        out.push({
          body: name,
          jd: stationJD,
          date: new Date((stationJD - 2440587.5) * 86400000),
          direction: s > 0 ? 'direct' : 'retrograde',  // direction AFTER the station
        });
      }
      prevJD = jd;
      prev = s;
    }
  }
  return out.sort((a, b) => a.jd - b.jd);
}
