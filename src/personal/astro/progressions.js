// -----------------------------------------------------------------------------
// Phase 4 — Secondary Progressions + Solar Arc directions
//
// SECONDARY PROGRESSIONS (day-for-a-year): one day after birth represents
// one year of life. For a person at age A, the progressed chart is cast
// for (birth + A solar days), but interpreted as the unfolding of the
// natal potential rather than physical sky positions of that future day.
// Source: Robert Hand, *Planets in Transit*, appendix; Noel Tyl.
//
// SOLAR ARC directions: every planet + angle advances at the same rate as
// the secondary-progressed Sun (the "solar arc"). A natal Sun at 10° Leo
// and a progressed Sun at 35 years at 15° Virgo means a 35° arc; every
// point in the chart is advanced by 35° to produce the solar-arc chart.
// Source: Noel Tyl, *Solar Arcs*.
// -----------------------------------------------------------------------------

import { dateToJD, longitudesAtDate, extraLongitudesAtDate, PLANETS } from '../../astro/ephemeris.js';
import { birthToUTCDate } from './natal.js';

const TROP_YEAR_DAYS = 365.242199; // mean tropical year

function norm360(x) { return ((x % 360) + 360) % 360; }

// Age of the chart at `targetDate` in decimal years.
export function ageAt(birth, targetDate) {
  const utc = birthToUTCDate(birth);
  const ms = (targetDate.getTime() - utc.getTime());
  return ms / (TROP_YEAR_DAYS * 86400000);
}

// Convert `age` years into "progressed date" = birth + age days.
function progressedUTCAt(birth, age) {
  const utc = birthToUTCDate(birth);
  return new Date(utc.getTime() + age * 86400000); // 1 day per year of age
}

// Secondary progressed positions for a chart at a given target date.
// Returns:
//   { age, progressedDate, planets: [{ name, lonDeg, classical }] }
// The `planets` array includes classical 10 (+ extras when Swiss is available).
export function secondaryProgressions(birth, targetDate) {
  const age = ageAt(birth, targetDate);
  const progDate = progressedUTCAt(birth, age);
  const lons = longitudesAtDate(progDate);
  const extras = extraLongitudesAtDate(progDate);
  const planets = PLANETS.map(name => ({
    name, lonDeg: lons[name], classical: true,
  }));
  for (const [name, lon] of Object.entries(extras)) {
    if (lon == null) continue;
    planets.push({ name, lonDeg: lon, classical: false });
  }
  return { age, progressedDate: progDate, planets };
}

// Solar Arc chart: every natal point is advanced by the progressed-Sun arc.
// Returns a "directed" chart with planets + MC + ASC shifted by the arc.
// Variant: 'naibod' uses Naibod's constant (59'8"/year); 'solar' uses the
// actual progressed-Sun arc. Default is 'solar' per modern usage.
export function solarArcDirections(birth, natal, targetDate, variant = 'solar') {
  const age = ageAt(birth, targetDate);
  let arc;
  if (variant === 'naibod') {
    arc = age * (59 + 8/60) / 60; // Naibod rate 59'08"/year
  } else {
    const prog = secondaryProgressions(birth, targetDate);
    const natalSun = natal.planets.find(p => p.name === 'Sun');
    const progSun = prog.planets.find(p => p.name === 'Sun');
    arc = ((progSun.lonDeg - natalSun.lonDeg) % 360 + 540) % 360 - 180;
    // Solar arc should be positive (forward in time); wrap if negative due
    // to the progressed Sun crossing 0° Aries.
    if (arc < 0) arc += 360;
  }
  const planets = natal.planets.map(p => ({ ...p, lonDeg: norm360(p.lonDeg + arc) }));
  return {
    age,
    arc,
    variant,
    planets,
    mcDeg:  norm360(natal.mcDeg  + arc),
    ascDeg: norm360(natal.ascDeg + arc),
    icDeg:  norm360(natal.icDeg  + arc),
    dscDeg: norm360(natal.dscDeg + arc),
  };
}
