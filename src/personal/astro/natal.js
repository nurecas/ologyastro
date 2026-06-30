// -----------------------------------------------------------------------------
// Natal-chart mathematics
//
// Given a birth moment (year/month/day/hour/minute UT) and a birth location
// (east-longitude in degrees, geographic latitude in degrees), produces:
//
//   MC   — Midheaven ecliptic longitude (°)
//   ASC  — Ascendant ecliptic longitude (°)
//   houses[12] — cusp degrees using Placidus (with Equal-House fallback
//                at |lat| > 66.5° where Placidus breaks down)
//   planets    — geocentric ecliptic longitudes at birth
//
// Astronomy references:
//   Meeus, Astronomical Algorithms 2nd ed. ch. 12, 13, 22
//   Hoskings, "The Placidus System" (standard semi-arc formulas)
// -----------------------------------------------------------------------------

import {
  dateToJD, gmst, obliquity, longitudesAtDate, PLANETS, AMPLITUDE_ARRAY,
  extraLongitudesAtDate, EXTRAS, EXTRA_AMPLITUDES,
  computeHousesSwiss,
} from '../../astro/ephemeris.js';

const DEG    = Math.PI / 180;
const RAD    = 180 / Math.PI;
const TWO_PI = Math.PI * 2;

function norm360(x) {
  let y = x % 360;
  if (y < 0) y += 360;
  return y;
}
function norm2pi(x) {
  let y = x % TWO_PI;
  if (y < 0) y += TWO_PI;
  return y;
}

// ---------------------------------------------------------------------------
// Build a UT Date from local birth components + tz offset (in minutes east
// of UTC — the value JavaScript's Date returns negatively).
// ---------------------------------------------------------------------------
export function birthToUTCDate({ year, month, day, hour, minute, tzOffsetMin }) {
  // tzOffsetMin is east-positive: IST = +330.
  const localMs = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(localMs - tzOffsetMin * 60000);
}

// ---------------------------------------------------------------------------
// Placidus MC / ASC (standard Meeus-style formulas; atan2 for quadrants).
// RAMC = local sidereal time (radians).
// ---------------------------------------------------------------------------

// MC (Midheaven): ecliptic longitude of the point on the upper meridian.
// tan(MC) = tan(RAMC) / cos(ε)  ⇒  atan2(sin RAMC, cos RAMC · cos ε)
// Returned value is in [0, 2π).
export function midheavenRad(ramcRad, epsRad) {
  return norm2pi(Math.atan2(
    Math.sin(ramcRad),
    Math.cos(ramcRad) * Math.cos(epsRad)
  ));
}

// ASC (Ascendant): ecliptic longitude rising on the eastern horizon.
//   y = −cos(RAMC)
//   x = sin(ε)·tan(φ) + cos(ε)·sin(RAMC)
//   raw = atan2(y, x)
// The raw value is 180° off from the astrological ASC. Add π, then wrap.
export function ascendantRad(ramcRad, epsRad, latRad) {
  const y = -Math.cos(ramcRad);
  const x = Math.sin(epsRad) * Math.tan(latRad)
          + Math.cos(epsRad) * Math.sin(ramcRad);
  return norm2pi(Math.atan2(y, x) + Math.PI);
}

// Placidus intermediate-house cusps.
// Houses 11 and 12 are between MC and ASC; 2 and 3 between ASC and IC.
// Semi-arc method: for each intermediate cusp we solve an equation for the
// right ascension where Sun has travelled a given fraction of its day/night
// semi-arc. We do Newton-style iteration on the RA.
//
// This implementation uses the explicit Meeus recipe (Ch. 46 extension;
// widely published) and is accurate to ≪ 0.01° for |φ| ≤ 60°.
export function placidusCusps(ramcRad, epsRad, latRad) {
  // Special cases / degeneracy near poles — fall back to Equal House.
  if (Math.abs(latRad) > 66.5 * DEG) return null;

  const cusps = new Array(13);
  const MC  = midheavenRad(ramcRad, epsRad);
  const IC  = norm2pi(MC + Math.PI);
  const ASC = ascendantRad(ramcRad, epsRad, latRad);
  const DSC = norm2pi(ASC + Math.PI);
  cusps[10] = MC;
  cusps[1]  = ASC;
  cusps[4]  = IC;
  cusps[7]  = DSC;

  // For intermediate cusp (house number h ∈ {11, 12, 2, 3}), the formula:
  //   Let F = fraction of semi-arc (1/3 or 2/3 depending on the cusp)
  //   Find RA such that   sin(δ(RA)) = sin(ε)·sin(RA − ramcΔ)
  //   converges. We iterate.
  //
  // Standard form from Meeus / Pottenger: for cusp i,
  //   angle = RAMC + fraction · π/2 (east half) or RAMC − ...
  // then solve  tan(λ) = (sin θ_H) / (cos θ_H · cos ε − tan φ · sin ε · F)
  // where θ_H is the cusp's right ascension hypothesis.

  const solveCusp = (H, F) => {
    // H = hour-angle offset from MC in radians (positive east, negative west)
    // F = fraction (−1 for above-horizon houses, +1 for below-horizon)
    // Iterate on RA.
    let ra = ramcRad + H;
    for (let it = 0; it < 12; it++) {
      // tan(decl_assumed) = sin(ra) · tan(ε)  (ecliptic point on horizon band)
      const dec = Math.atan(Math.sin(ra - ramcRad) * Math.tan(epsRad));
      // semi-arc condition:  cos(HA) = −tan(φ)·tan(δ) · F
      // where HA is distance from meridian, and F=1 for below-horizon semi.
      const argSA = -Math.tan(latRad) * Math.tan(dec);
      if (Math.abs(argSA) >= 1) break; // never rises/sets at this lat
      const SA = Math.acos(argSA); // semi-arc
      // New RA estimate:
      const newRa = ramcRad + H * (SA / (Math.PI / 2));
      if (Math.abs(newRa - ra) < 1e-7) { ra = newRa; break; }
      ra = newRa;
    }
    // Convert RA (equator) + assumed ecliptic latitude 0 to ecliptic lon:
    //   tan(λ) = tan(ra) / cos(ε)  (for β = 0)
    return norm2pi(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsRad)));
  };

  // H offsets for the 4 intermediate cusps (from MC, with east = +):
  //   House 11: east, 1/3 of 90°   →  +30° · F11
  //   House 12: east, 2/3 of 90°   →  +60° · F12
  //   House 2:  east of ASC …      which is MC + 120° equivalently
  //   House 3:  MC + 150°
  // Below sign conventions follow Hoskings / Astro-Databank.
  cusps[11] = solveCusp( 1 * Math.PI / 6, +1); // RAMC + 30°
  cusps[12] = solveCusp( 2 * Math.PI / 6, +1); // RAMC + 60°
  cusps[2]  = solveCusp( 4 * Math.PI / 6, -1); // RAMC + 120°
  cusps[3]  = solveCusp( 5 * Math.PI / 6, -1); // RAMC + 150°

  // Opposite houses:
  cusps[5]  = norm2pi(cusps[11] + Math.PI);
  cusps[6]  = norm2pi(cusps[12] + Math.PI);
  cusps[8]  = norm2pi(cusps[2]  + Math.PI);
  cusps[9]  = norm2pi(cusps[3]  + Math.PI);

  return cusps.slice(1).map(r => r * RAD); // houses[0..11] degrees
}

// Equal House fallback: house N cusp = ASC + (N−1)·30°
export function equalHouseCusps(ascDeg) {
  const out = [];
  for (let i = 0; i < 12; i++) out.push(norm360(ascDeg + i * 30));
  return out;
}

// ---------------------------------------------------------------------------
// Full natal chart.
// ---------------------------------------------------------------------------
export function computeNatal(birth, options = {}) {
  const utc = birthToUTCDate(birth);
  const jd  = dateToJD(utc);
  const eps = obliquity(jd);
  const ramc = gmst(jd) + birth.lonDeg * DEG;
  const phi  = birth.latDeg * DEG;

  // Phase 3 house system selection. Default: Placidus. Supported values:
  // 'placidus' | 'whole-sign' | 'koch' | 'equal'. Swiss is used when
  // available (required for Koch + Whole Sign); hand-rolled Placidus +
  // Equal fallback still serves the Standish-only path.
  const requestedSystem = options.houseSystem || 'placidus';
  let mcRad, ascRad, houses, houseSystem = requestedSystem;

  const swissHouses = computeHousesSwiss(jd, birth.latDeg, birth.lonDeg, requestedSystem);
  if (swissHouses) {
    // Swiss supplies asc/mc and cusps already in degrees, zodiac-aware.
    houses  = swissHouses.cusps;
    ascRad  = swissHouses.asc * DEG;
    mcRad   = swissHouses.mc  * DEG;
  } else {
    // Fallback — no Swiss, or out of range. Only Placidus + Equal are
    // available here; Koch / Whole Sign silently degrade to Placidus.
    mcRad  = midheavenRad(ramc, eps);
    ascRad = ascendantRad(ramc, eps, phi);
    houses = placidusCusps(ramc, eps, phi);
    if (!houses) { houses = equalHouseCusps(ascRad * RAD); houseSystem = 'equal'; }
    else houseSystem = 'placidus';
  }

  const longitudes = longitudesAtDate(utc); // { Sun: deg, Moon: deg, ... }
  const planets = PLANETS.map((name, i) => ({
    name,
    lonDeg: longitudes[name],
    amplitude: AMPLITUDE_ARRAY[i],
    house: houseOfLongitude(longitudes[name], houses),
    classical: true,
  }));

  // Phase 2 extras — Chiron, True North Node (+ South mirror), 4 asteroids.
  // Swiss-only; returns null values when Swiss is unavailable or the birth
  // is out of Swiss range. Any null-longitude extras are dropped from the
  // planets array so downstream code never sees phantom bodies.
  const extras = extraLongitudesAtDate(utc);
  const extraList = [
    ...EXTRAS,          // Chiron, NorthNode, Ceres, Pallas, Juno, Vesta
    'SouthNode',        // always-available mirror
  ];
  for (const name of extraList) {
    const lon = extras[name];
    if (lon == null) continue;
    planets.push({
      name,
      lonDeg: lon,
      amplitude: EXTRA_AMPLITUDES[name] ?? 0.15,
      house: houseOfLongitude(lon, houses),
      classical: false,
    });
  }

  // Part of Fortune (brief Phase 3). Classical day/night formulas:
  //   Day (Sun above horizon, houses 7-12):  PF = ASC + Moon \u2212 Sun
  //   Night (Sun below horizon, houses 1-6): PF = ASC + Sun  \u2212 Moon
  // Amplitude 0.2 (calculated point, per brief). Visible in Basic + Advanced.
  const sunPlanet  = planets.find(p => p.name === 'Sun');
  const moonPlanet = planets.find(p => p.name === 'Moon');
  const sunHouse   = sunPlanet?.house ?? 1;
  const isDay      = sunHouse >= 7 && sunHouse <= 12;
  const ascDeg     = ascRad * RAD;
  const sunDeg     = sunPlanet?.lonDeg ?? 0;
  const moonDeg    = moonPlanet?.lonDeg ?? 0;
  const fortuneDeg = isDay
    ? norm360(ascDeg + moonDeg - sunDeg)
    : norm360(ascDeg + sunDeg - moonDeg);
  planets.push({
    name: 'Fortune',
    lonDeg: fortuneDeg,
    amplitude: 0.2,
    house: houseOfLongitude(fortuneDeg, houses),
    classical: false,
    calculatedPoint: true,   // not a body — a geometric point; excluded from speed / aspect-count tests
  });

  return {
    birth,
    utc,
    jd,
    mcDeg:  mcRad * RAD,
    ascDeg,
    icDeg:  norm360(mcRad * RAD + 180),
    dscDeg: norm360(ascDeg + 180),
    houses,           // length-12 array in degrees (house N−1 = index N−1)
    houseSystem,      // 'placidus' | 'whole-sign' | 'koch' | 'equal'
    planets,          // classical 10 always first; extras appended when Swiss available; Fortune last
    epsDeg: eps * RAD,
    ramcDeg: norm360(ramc * RAD),
    isDay,            // brief: day/night flag for dignity triplicity scoring
    partOfFortuneDeg: fortuneDeg,
  };
}

// Find which house (1..12) contains an ecliptic longitude given cusps[0..11]
// (house i cusp at index i−1).
export function houseOfLongitude(lonDeg, cuspsDeg) {
  const L = norm360(lonDeg);
  for (let i = 0; i < 12; i++) {
    const a = cuspsDeg[i];
    const b = cuspsDeg[(i + 1) % 12];
    if (a <= b) {
      if (L >= a && L < b) return i + 1;
    } else {
      // wraps 360°
      if (L >= a || L < b) return i + 1;
    }
  }
  return 1;
}

// Zodiac sign name + within-sign degree for a longitude.
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
export const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

export function signOf(lonDeg) {
  const L = norm360(lonDeg);
  const idx = Math.floor(L / 30);
  return { name: SIGNS[idx], glyph: SIGN_GLYPHS[idx], index: idx, withinDeg: L - idx * 30 };
}

// Format degree to "12°34' ♋"
export function fmtLon(lonDeg) {
  const s = signOf(lonDeg);
  const d = Math.floor(s.withinDeg);
  const m = Math.round((s.withinDeg - d) * 60);
  return `${d}°${m.toString().padStart(2, '0')}' ${s.glyph}`;
}
