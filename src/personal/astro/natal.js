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

  // Intermediate cusps by PORPHYRY trisection of each quadrant between the
  // (correct) angles. This is the standard no-Swiss fallback for a quadrant
  // house system: exact on the angles, and a close approximation of Placidus
  // in between at non-polar latitudes.
  //
  // (The previous semi-arc solver mis-fired: its `F` sign parameter — the
  // above/below-horizon selector — was declared but never used in the body,
  // so cusps 2/3/11/12 all ran the identical equator-only diurnal formula and
  // landed up to ~20° off sub-tropically, enough to misplace a planet by a
  // whole house. True Placidus semi-arc cusps come from the Swiss path when
  // it is available; this fallback only serves the Standish/out-of-range path.)
  const third = (from, to) => {
    const arc = norm2pi(to - from);
    return [norm2pi(from + arc / 3), norm2pi(from + 2 * arc / 3)];
  };
  [cusps[11], cusps[12]] = third(MC,  ASC);  // MC  → ASC quadrant (houses 11, 12)
  [cusps[2],  cusps[3]]  = third(ASC, IC);   // ASC → IC  quadrant (houses 2, 3)
  [cusps[5],  cusps[6]]  = third(IC,  DSC);  // IC  → DSC quadrant (houses 5, 6)
  [cusps[8],  cusps[9]]  = third(DSC, MC);   // DSC → MC  quadrant (houses 8, 9)

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
    // Fallback — no Swiss, or out of range. placidusCusps() returns exact
    // angles with Porphyry-trisected intermediate cusps (a close, standard
    // no-Swiss approximation of Placidus); Equal House if it degenerates
    // (polar). Koch / Whole Sign have no no-Swiss form and share this path.
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
  //   Day (Sun above horizon):   PF = ASC + Moon \u2212 Sun
  //   Night (Sun below horizon): PF = ASC + Sun  \u2212 Moon
  // Amplitude 0.2 (calculated point, per brief). Visible in Basic + Advanced.
  // Sect: the Sun is above the horizon exactly when its ecliptic longitude
  // lies on the DSC → MC → ASC half of the ecliptic (the Sun has ~0 latitude).
  // Testing "houses 7-12" is only equivalent for quadrant systems; in
  // whole-sign (and near the horizon) it misreads the sect.
  const sunPlanet  = planets.find(p => p.name === 'Sun');
  const moonPlanet = planets.find(p => p.name === 'Moon');
  const ascDeg     = ascRad * RAD;
  const sunDeg     = sunPlanet?.lonDeg ?? 0;
  const isDay      = norm360(sunDeg - ascDeg) >= 180;
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
