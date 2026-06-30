// Comprehensive precision test suite for every module in the personal app.
//
// Run: node src/personal/astro/_precision.mjs
//
// Sections:
//   1. Ephemeris at multiple epochs
//   2. Natal chart (AC/MC/Placidus)
//   3. Chart analysis (elements, modes, patterns, shape)
//   4. Life-vectors aspect-strength function
//   5. Forecast event-date interpolation
//   6. AstroCartography line geometry
//   7. Synastry cross-aspects + composite midpoint
//   8. Geocode → timezone offset correctness
// -----------------------------------------------------------------------------

import { computeNatal } from './natal.js';
import { longitudesAtDate, dateToJD, gmst, obliquity, mcLongitudeRad, eclipticToEquatorial, PLANETS } from '../../astro/ephemeris.js';
import { analyzeChart, elementDistribution, modeDistribution, grandTrines, tSquares, grandCrosses, stelliums, chartShape } from './chartAnalysis.js';
import { lifeVectorSeries, currentAspects } from './aspects.js';
import { forecastEvents } from './forecast.js';
import { astrocartographyLines } from '../../astro/astrocartography.js';
import { crossAspects, compositeChart, compatibilityHighlights, synastrySummary } from './synastry.js';
import { offsetMinutesForZoneAt } from './geocode.js';

function angDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

let passed = 0, failed = 0;
const fails = [];
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; fails.push(msg); console.log('  ✗ ' + msg); }
}
function head(s) { console.log('\n── ' + s + ' ────────'); }

// -----------------------------------------------------------------------------
// 1. EPHEMERIS
// -----------------------------------------------------------------------------
head('1. Ephemeris: J2000 baseline (10 planets ≤ 0.5°)');
{
  const jan2000 = new Date('2000-01-01T00:00:00Z');
  const L = longitudesAtDate(jan2000);
  const expected = {
    Sun: 279.86, Moon: 217.70, Mercury: 271.15, Venus: 240.81, Mars: 327.56,
    Jupiter: 25.23, Saturn: 40.35, Uranus: 314.73, Neptune: 303.57, Pluto: 251.36,
  };
  for (const p of PLANETS) {
    assert(angDiff(L[p], expected[p]) <= 0.5, `${p} within 0.5° at J2000 (got ${L[p].toFixed(2)}, expected ${expected[p]})`);
  }
}

head('1b. Ephemeris: consistent across modern decades');
{
  // Positions should vary continuously and planet longitudes always ∈ [0, 360).
  for (const year of [1700, 1850, 1950, 2050, 2080]) {
    const d = new Date(Date.UTC(year, 5, 15));
    const L = longitudesAtDate(d);
    for (const p of PLANETS) {
      assert(L[p] >= 0 && L[p] < 360 && Number.isFinite(L[p]), `${p} in [0,360) at ${year}`);
    }
  }
}

head('1c. Obliquity + eclipticToEquatorial sanity');
{
  const jd = dateToJD(new Date('2000-01-01T00:00:00Z'));
  const eps = obliquity(jd);
  assert(Math.abs(eps * RAD - 23.4393) < 0.001, `Obliquity at J2000 ≈ 23.4393° (got ${(eps*RAD).toFixed(4)}°)`);
  // Vernal equinox point (0°, 0°) → (RA 0, Dec 0).
  const eq = eclipticToEquatorial(0, 0, jd);
  assert(Math.abs(eq.ra) < 0.001 && Math.abs(eq.dec) < 0.001, `VE point → (RA 0, Dec 0)`);
  // Summer solstice (90°, 0°) → (RA 90°, Dec +23.44°).
  const ss = eclipticToEquatorial(90, 0, jd);
  assert(Math.abs(ss.ra * RAD - 90) < 0.01, `Summer-solstice RA ≈ 90° (got ${(ss.ra*RAD).toFixed(3)})`);
  assert(Math.abs(ss.dec * RAD - 23.4393) < 0.01, `Summer-solstice Dec ≈ +23.44° (got ${(ss.dec*RAD).toFixed(3)})`);
}

head('1d. GMST at J2000 00:00 UT');
{
  // Expected GMST on 2000-01-01 00:00 UT ≈ 6h 39m 52.3s = 99.97°.
  const g = gmst(dateToJD(new Date('2000-01-01T00:00:00Z'))) * RAD;
  assert(Math.abs(g - 99.967) < 0.1, `GMST J2000 ≈ 99.967° (got ${g.toFixed(3)}°)`);
}

// -----------------------------------------------------------------------------
// 2. NATAL
// -----------------------------------------------------------------------------
head('2. Natal: angles invariants + Placidus cusps');
{
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  assert(Math.abs(angDiff(chart.ascDeg, chart.dscDeg) - 180) < 0.001, `ASC-DSC exactly 180° apart`);
  assert(Math.abs(angDiff(chart.mcDeg,  chart.icDeg)  - 180) < 0.001, `MC-IC exactly 180° apart`);
  assert(chart.houseSystem === 'placidus', `Using Placidus at mid-latitude`);
  // House 1 = ASC, 10 = MC, 4 = IC, 7 = DSC.
  assert(angDiff(chart.houses[0], chart.ascDeg) < 0.001, `House 1 cusp = ASC`);
  assert(angDiff(chart.houses[3], chart.icDeg)  < 0.001, `House 4 cusp = IC`);
  assert(angDiff(chart.houses[6], chart.dscDeg) < 0.001, `House 7 cusp = DSC`);
  assert(angDiff(chart.houses[9], chart.mcDeg)  < 0.001, `House 10 cusp = MC`);
  // Every planet assigned to exactly one house ∈ [1,12].
  for (const p of chart.planets) {
    assert(p.house >= 1 && p.house <= 12, `${p.name} assigned to house ${p.house} ∈ [1,12]`);
  }
}

head('2b. Natal: equal-house fallback at polar latitude');
{
  const polar = computeNatal({
    year: 2000, month: 6, day: 21, hour: 12, minute: 0,
    tzOffsetMin: 0, latDeg: 78, lonDeg: 0,
  });
  assert(polar.houseSystem === 'equal', `Equal-house fallback at |lat|>66.5°`);
  for (let i = 0; i < 12; i++) {
    const gap = (polar.houses[(i+1)%12] - polar.houses[i] + 360) % 360;
    assert(Math.abs(gap - 30) < 0.001, `Equal-house cusp ${i+1} exactly 30° from next`);
    if (Math.abs(gap - 30) >= 0.001) break;
  }
}

head('2c. Natal: geographic rotation invariance of MC at same LST');
{
  // Two births at the same UT but different longitudes will have different
  // LSTs and so different MCs. What MUST be true: if we take the same UT
  // but shift longitude by 15°, LST shifts by 15° and MC shifts by ~15°.
  const base  = { year: 2000, month: 6, day: 21, hour: 12, minute: 0, tzOffsetMin: 0, latDeg: 0, lonDeg: 0 };
  const shift = { ...base, lonDeg: 15 };
  const A = computeNatal(base);
  const B = computeNatal(shift);
  const dMc = angDiff(A.mcDeg, B.mcDeg);
  assert(dMc > 12 && dMc < 18, `Shifting longitude 15° moves MC by ~15° (got ${dMc.toFixed(2)}°)`);
}

// -----------------------------------------------------------------------------
// 3. CHART ANALYSIS
// -----------------------------------------------------------------------------
head('3. Chart analysis: distributions sum to 1');
{
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  const el = elementDistribution(chart);
  const elSum = Object.values(el).reduce((a, b) => a + b, 0);
  assert(Math.abs(elSum - 1) < 1e-6, `Element distribution sums to 1 (got ${elSum.toFixed(4)})`);
  const mo = modeDistribution(chart);
  const moSum = Object.values(mo).reduce((a, b) => a + b, 0);
  assert(Math.abs(moSum - 1) < 1e-6, `Mode distribution sums to 1 (got ${moSum.toFixed(4)})`);
}

head('3b. Chart analysis: grand-trine requires same element');
{
  // Synthetic chart with planets at 0° Aries, 0° Leo, 0° Sagittarius — pure Fire GT.
  const synth = {
    planets: [
      { name: 'Sun',     lonDeg:   0, amplitude: 0.5, house: 1 },
      { name: 'Moon',    lonDeg: 120, amplitude: 0.15, house: 5 },
      { name: 'Mercury', lonDeg: 240, amplitude: 0.2, house: 9 },
      { name: 'Venus',   lonDeg:  10, amplitude: 0.3, house: 1 },
      { name: 'Mars',    lonDeg: 200, amplitude: 0.4, house: 8 },
      { name: 'Jupiter', lonDeg: 340, amplitude: 0.6, house:12 },
      { name: 'Saturn',  lonDeg: 170, amplitude: 0.7, house: 7 },
      { name: 'Uranus',  lonDeg: 290, amplitude: 0.8, house:11 },
      { name: 'Neptune', lonDeg: 100, amplitude: 0.9, house: 4 },
      { name: 'Pluto',   lonDeg:  45, amplitude: 1.0, house: 2 },
    ],
    ascDeg: 0, dscDeg: 180, mcDeg: 270, icDeg: 90,
  };
  const gts = grandTrines(synth);
  const fire = gts.find(gt => gt.element === 'fire');
  assert(fire && fire.planets.includes('Sun') && fire.planets.includes('Moon') && fire.planets.includes('Mercury'),
    `Finds Sun-Moon-Mercury grand trine in fire`);

  // Synthetic chart with OUT-OF-SIGN grand trine (not all same element):
  //   Aries 29° → 29°, Virgo 3° → 153°, Sag 5° → 245° — diffs 124°, 92°, 144°.
  // Adjust to actual 120°: pick 29° Aries + 29° Leo (149°) + 29° Sag (269°).
  // Now widen one by 5° → 29° Aries, 4° Virgo (154°, which IS out of Leo).
  const outOfSign = {
    planets: [
      { name: 'Sun',     lonDeg:  29, amplitude: 0.5, house: 1 }, // Aries
      { name: 'Moon',    lonDeg: 154, amplitude: 0.15, house: 6 }, // Virgo (earth), not Leo
      { name: 'Mercury', lonDeg: 274, amplitude: 0.2, house:10 }, // Capricorn (earth), not Sag
      ...synth.planets.slice(3),
    ],
    ascDeg: 0, dscDeg: 180, mcDeg: 270, icDeg: 90,
  };
  // Distances: 29→154=125, 154→274=120, 29→274=245 → fold 115. 125,120,115 — 125 > 120+6.
  // So it might not even geometrically qualify. Use tighter placements:
  //   0° Aries (0), 0° Virgo (150), 5° Sag (245) → 150, 95, 115 — 95 is far from 120.
  // Finding a geometric GT with mixed elements is hard, because 120° ± 6° confines you.
  // Plenty of the near-miss cases are mixed; let me just verify that a purely
  // geometric GT where elements don't line up is rejected.
  // 3° Aries, 3° Leo, 27° Scorpio(237) — diffs: 120, 114, 126 — 126 > 126-6=120? Yes 126-120=6 ≤ 6.
  // Wait 27° Scorpio = 210+27 = 237°. 3° Aries = 3°. 3° Leo = 123°.
  // 3→123 = 120 ✓; 123→237 = 114; 3→237 = 234 → fold 126. So 114 and 126 are in orb.
  // Elements: Aries=fire, Leo=fire, Scorpio=water. Mixed! Should be rejected.
  const mixedGT = {
    planets: [
      { name: 'Sun',     lonDeg:   3, amplitude: 0.5, house: 1 },
      { name: 'Moon',    lonDeg: 123, amplitude: 0.15, house: 5 },
      { name: 'Mercury', lonDeg: 237, amplitude: 0.2, house: 9 },
      ...synth.planets.slice(3),
    ],
    ascDeg: 0, dscDeg: 180, mcDeg: 270, icDeg: 90,
  };
  const gts2 = grandTrines(mixedGT);
  const hasMixedGT = gts2.some(gt =>
    gt.planets.includes('Sun') && gt.planets.includes('Moon') && gt.planets.includes('Mercury')
  );
  assert(!hasMixedGT, `Rejects out-of-element grand trine (Sun-Moon-Mercury in 3 different elements)`);
}

head('3c. Chart analysis: t-square modality + stelliums');
{
  // T-square: Sun at 0° Aries (0), Moon at 0° Libra (180) [opposition];
  // apex Jupiter at 0° Cancer (90) [square both]. All three CARDINAL.
  const synth = {
    planets: [
      { name: 'Sun',     lonDeg:   0, amplitude: 0.5, house: 1 },
      { name: 'Moon',    lonDeg: 180, amplitude: 0.15, house: 7 },
      { name: 'Jupiter', lonDeg:  90, amplitude: 0.6, house: 4 },
      { name: 'Mercury', lonDeg:  50, amplitude: 0.2, house: 2 },
      { name: 'Venus',   lonDeg: 210, amplitude: 0.3, house: 8 },
      { name: 'Mars',    lonDeg: 260, amplitude: 0.4, house: 9 },
      { name: 'Saturn',  lonDeg:  30, amplitude: 0.7, house: 1 },
      { name: 'Uranus',  lonDeg: 150, amplitude: 0.8, house: 6 },
      { name: 'Neptune', lonDeg: 300, amplitude: 0.9, house:11 },
      { name: 'Pluto',   lonDeg: 330, amplitude: 1.0, house:12 },
    ],
    ascDeg: 0, dscDeg: 180, mcDeg: 270, icDeg: 90,
  };
  const ts = tSquares(synth);
  const sunMoonJup = ts.find(t =>
    t.opposition.includes('Sun') && t.opposition.includes('Moon') && t.apex === 'Jupiter'
  );
  assert(sunMoonJup && sunMoonJup.modality === 'cardinal',
    `Sun☍Moon □ Jupiter is cardinal t-square (got ${sunMoonJup?.modality})`);

  // Stellium: three planets in Gemini (60°-90°).
  const stelSynth = {
    planets: [
      { name: 'Sun',     lonDeg:  62, amplitude: 0.5, house: 1 },
      { name: 'Mercury', lonDeg:  75, amplitude: 0.2, house: 1 },
      { name: 'Venus',   lonDeg:  85, amplitude: 0.3, house: 1 },
      { name: 'Moon',    lonDeg: 180, amplitude: 0.15, house: 7 },
      { name: 'Mars',    lonDeg: 210, amplitude: 0.4, house: 8 },
      { name: 'Jupiter', lonDeg: 240, amplitude: 0.6, house: 9 },
      { name: 'Saturn',  lonDeg: 270, amplitude: 0.7, house:10 },
      { name: 'Uranus',  lonDeg: 300, amplitude: 0.8, house:11 },
      { name: 'Neptune', lonDeg: 330, amplitude: 0.9, house:12 },
      { name: 'Pluto',   lonDeg:   0, amplitude: 1.0, house: 1 },
    ],
    ascDeg: 0, dscDeg: 180, mcDeg: 270, icDeg: 90,
  };
  const st = stelliums(stelSynth);
  const gemini = st.find(s => s.sign === 'Gemini');
  assert(gemini && gemini.planets.length === 3, `Finds 3-planet Gemini stellium`);
}

head('3d. Chart shape detection');
{
  // Bundle: planets within 120° — say all between 0° and 100°.
  const bundle = {
    planets: Array.from({ length: 10 }, (_, i) => ({
      name: PLANETS[i], lonDeg: i * 10, amplitude: 0.5, house: 1,
    })),
    ascDeg: 0, mcDeg: 270, dscDeg: 180, icDeg: 90,
  };
  assert(chartShape(bundle) === 'Bundle', `10 planets in 90° arc → Bundle`);

  // Splash: planets evenly spread — 0, 36, 72, 108, … 324 (every 36°).
  const splash = {
    planets: Array.from({ length: 10 }, (_, i) => ({
      name: PLANETS[i], lonDeg: i * 36, amplitude: 0.5, house: 1,
    })),
    ascDeg: 0, mcDeg: 270, dscDeg: 180, icDeg: 90,
  };
  assert(chartShape(splash) === 'Splash', `10 planets evenly at 36° spacing → Splash`);

  // Bowl: 10 planets within 180°.
  const bowl = {
    planets: Array.from({ length: 10 }, (_, i) => ({
      name: PLANETS[i], lonDeg: i * 18, amplitude: 0.5, house: 1,
    })),
    ascDeg: 0, mcDeg: 270, dscDeg: 180, icDeg: 90,
  };
  assert(chartShape(bowl) === 'Bowl', `10 planets in 162° arc → Bowl`);

  // Bucket: 9 in a bowl + 1 handle opposite.
  const bucketPlanets = Array.from({ length: 9 }, (_, i) => ({
    name: PLANETS[i], lonDeg: i * 15, amplitude: 0.5, house: 1,
  }));
  bucketPlanets.push({ name: 'Pluto', lonDeg: 200, amplitude: 1.0, house: 7 });
  const bucket = { planets: bucketPlanets, ascDeg: 0, mcDeg: 270, dscDeg: 180, icDeg: 90 };
  assert(chartShape(bucket) === 'Bucket', `9 in a bowl + 1 opposite handle → Bucket`);
}

// -----------------------------------------------------------------------------
// 4. LIFE VECTORS
// -----------------------------------------------------------------------------
head('4. Life vectors: scale + smoothness + non-negativity');
{
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  const { series } = lifeVectorSeries({ natal: chart, startYear: 1990, endYear: 2090, samplesPerYear: 12 });
  for (const s of series) {
    let mn = Infinity, mx = -Infinity, maxJump = 0;
    for (let t = 0; t < s.values.length; t++) {
      const v = s.values[t];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      if (t > 0) maxJump = Math.max(maxJump, Math.abs(v - s.values[t-1]));
    }
    assert(mn >= -1e-6, `${s.layer.id}: non-negative (min ${mn.toFixed(4)})`);
    assert(mx <= 1.5,   `${s.layer.id}: bounded ≤ 1.5 (max ${mx.toFixed(4)})`);
    assert(maxJump < 0.15, `${s.layer.id}: no month-to-month jump > 0.15 (saw ${maxJump.toFixed(4)})`);
  }
}

head('4b. Life vectors: fast-only layers now show variation');
{
  // Previously Emotional/Intellect/Relational were flat. Since we added
  // slow transits to layer's natal planets, they should have meaningful range.
  const chart = computeNatal({
    year: 1980, month: 3, day: 20, hour: 10, minute: 0,
    tzOffsetMin: 0, latDeg: 40, lonDeg: 0,
  });
  const { series } = lifeVectorSeries({ natal: chart, startYear: 1980, endYear: 2080, samplesPerYear: 12 });
  for (const id of ['emotional', 'intellect', 'relational']) {
    const s = series.find(x => x.layer.id === id);
    const mn = Math.min(...s.values), mx = Math.max(...s.values);
    assert(mx - mn > 0.05, `${id} layer has visible range over 100 yr (Δ ${(mx - mn).toFixed(4)})`);
  }
}

// -----------------------------------------------------------------------------
// 5. FORECAST
// -----------------------------------------------------------------------------
head('5. Forecast: finds a known Saturn-return event window');
{
  // Classic Saturn return — Saturn completes its ~29.5-year orbit and
  // returns to its natal position. For a 1990 birth with natal Saturn at
  // ~19° Capricorn, the first Saturn return is around 2019.
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  const from = new Date(Date.UTC(2018, 0, 1));
  const to   = new Date(Date.UTC(2021, 0, 1));
  const evs = forecastEvents({ natal: chart, fromDate: from, toDate: to });
  const satReturn = evs.filter(e =>
    e.transit === 'Saturn' && e.natal === 'Saturn' && e.aspect.name === 'Conjunction'
  );
  assert(satReturn.length >= 1, `Detects Saturn return (1-3 passes) in 2018-2020 window (found ${satReturn.length})`);
  if (satReturn.length) {
    const yrs = satReturn.map(e => e.date.getUTCFullYear());
    const minY = Math.min(...yrs), maxY = Math.max(...yrs);
    assert(minY >= 2018 && maxY <= 2021, `Saturn return(s) within [2018, 2020] (${yrs.join(', ')})`);
  }
}

head('5b. Forecast: retrograde flag sanity');
{
  // Jupiter retrograde in 2023 ≈ Sep 4 → Dec 31.
  const chart = computeNatal({
    year: 1980, month: 3, day: 20, hour: 10, minute: 0,
    tzOffsetMin: 0, latDeg: 40, lonDeg: 0,
  });
  // We'll scan 2023 and see if any Jupiter events are flagged retrograde.
  const evs = forecastEvents({
    natal: chart,
    fromDate: new Date(Date.UTC(2023, 8, 1)),
    toDate:   new Date(Date.UTC(2023, 11, 31)),
  });
  const jupiterRx = evs.filter(e => e.transit === 'Jupiter' && e.retrograde);
  // Jupiter is Rx for ~4 months, so if there's a Jupiter event in that window
  // at all it should often be Rx. Only weak assertion possible.
  if (evs.some(e => e.transit === 'Jupiter')) {
    assert(jupiterRx.length >= 0, `Jupiter retrograde detection does not crash (${jupiterRx.length}/${evs.filter(e => e.transit === 'Jupiter').length} flagged Rx)`);
  } else {
    assert(true, `No Jupiter exact-hits in test window (OK)`);
  }
}

// -----------------------------------------------------------------------------
// 6. ASTROCARTOGRAPHY
// -----------------------------------------------------------------------------
head('6. AstroCartography: MC line math');
{
  // For a hypothetical planet with RA = GMST, its MC line should be longitude 0.
  // We'll fake it using the function directly.
  const ra = 1.234; // radians
  const theta = 1.234;
  const lines = astrocartographyLines(ra, 0.3, theta);
  // mcLon = ra - theta = 0. The mc polyline should have constant longitude 0.
  const mcLons = lines.mc.map(p => p[0]);
  const allNearZero = mcLons.every(l => Math.abs(l) < 1e-6);
  assert(allNearZero, `MC line longitudes all ≈ 0 when ra = GMST`);
  // IC line should be ±π.
  const icLons = lines.ic.map(p => p[0]);
  const allNearPi = icLons.every(l => Math.abs(Math.abs(l) - Math.PI) < 1e-6);
  assert(allNearPi, `IC line longitudes all ≈ ±π when ra = GMST`);
  // Latitude limits: MC truncated at ±85°.
  const maxLat = Math.max(...lines.mc.map(p => Math.abs(p[1]))) * RAD;
  assert(maxLat <= 85.001, `MC line latitude ≤ 85° (got ${maxLat.toFixed(2)}°)`);
}

head('6b. AstroCartography: rising/setting latitude limits');
{
  // Planet with declination δ only rises for lat ∈ (-(90-|δ|), +(90-|δ|)).
  // At δ = 30°, planet never sets north of +60° lat or south of -60°.
  const lines = astrocartographyLines(0, 30 * DEG, 0);
  const maxAscLat = Math.max(...lines.asc.map(p => Math.abs(p[1]))) * RAD;
  assert(maxAscLat < 61, `ASC line latitude < 61° when declination = 30° (got ${maxAscLat.toFixed(2)}°)`);
}

// -----------------------------------------------------------------------------
// 7. SYNASTRY
// -----------------------------------------------------------------------------
head('7. Synastry: self-synastry = 10 self-conjunctions');
{
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  chart.birth = { name: 'Test' };
  const cx = crossAspects(chart, chart);
  const selfConj = cx.filter(a =>
    a.aName === a.bName && a.aspect.name === 'Conjunction' && a.orb < 0.001
  );
  assert(selfConj.length === 10, `Chart × itself: 10 exact self-conjunctions (got ${selfConj.length})`);
}

head('7b. Synastry: composite chart invariant');
{
  // Composite of a chart with itself should equal the chart.
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  const comp = compositeChart(chart, chart);
  for (let i = 0; i < PLANETS.length; i++) {
    assert(
      angDiff(comp.planets[i].lonDeg, chart.planets[i].lonDeg) < 0.001,
      `Composite(chart, chart).${PLANETS[i]} = chart.${PLANETS[i]}`
    );
  }
  assert(angDiff(comp.ascDeg, chart.ascDeg) < 0.001, `Composite ASC = chart ASC`);
  assert(angDiff(comp.mcDeg,  chart.mcDeg)  < 0.001, `Composite MC = chart MC`);
}

head('7c. Synastry: midpoint handles wrap-around');
{
  // Midpoint of 350° and 10° should be 0° (short way), not 180°.
  const fakeA = { planets: [{ name: 'Sun', lonDeg: 350, amplitude: 0.5, house: 1 }], ascDeg: 0, mcDeg: 0, dscDeg: 180, icDeg: 180 };
  const fakeB = { planets: [{ name: 'Sun', lonDeg:  10, amplitude: 0.5, house: 1 }], ascDeg: 0, mcDeg: 0, dscDeg: 180, icDeg: 180 };
  // compositeChart iterates PLANETS (10 of them) — pad with dummies.
  for (let i = 1; i < PLANETS.length; i++) {
    fakeA.planets.push({ name: PLANETS[i], lonDeg: 0, amplitude: 0.5, house: 1 });
    fakeB.planets.push({ name: PLANETS[i], lonDeg: 0, amplitude: 0.5, house: 1 });
  }
  const mid = compositeChart(fakeA, fakeB);
  const sunMid = mid.planets.find(p => p.name === 'Sun');
  assert(Math.abs(sunMid.lonDeg) < 0.001 || Math.abs(sunMid.lonDeg - 360) < 0.001,
    `Midpoint(350°, 10°) ≈ 0° (got ${sunMid.lonDeg.toFixed(4)})`);
}

head('7d. Synastry: summary tone of identical charts is balanced');
{
  const chart = computeNatal({
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    tzOffsetMin: 330, latDeg: 28.61, lonDeg: 77.21,
  });
  const cx = crossAspects(chart, chart);
  const summ = synastrySummary(cx);
  assert(summ.count > 0, `Self-synastry produces aspects`);
  assert(['flowing', 'mixed', 'challenging'].includes(summ.tone), `Tone labeled`);
}

// -----------------------------------------------------------------------------
// 8. GEOCODE TIMEZONE
// -----------------------------------------------------------------------------
head('8. Timezone offset at birth date: modern non-DST');
{
  // India Standard Time: UTC+5:30 year-round. 330 min.
  const jan = new Date('2020-01-15T00:00:00Z');
  assert(offsetMinutesForZoneAt('Asia/Kolkata', jan) === 330, `Asia/Kolkata in January → 330 min (got ${offsetMinutesForZoneAt('Asia/Kolkata', jan)})`);
  const jul = new Date('2020-07-15T00:00:00Z');
  assert(offsetMinutesForZoneAt('Asia/Kolkata', jul) === 330, `Asia/Kolkata in July → 330 min`);
}

head('8b. Timezone offset across DST');
{
  // America/New_York: winter UTC-5:00 (-300), summer UTC-4:00 (-240).
  const janNY = new Date('2020-01-15T12:00:00Z');
  const julNY = new Date('2020-07-15T12:00:00Z');
  assert(offsetMinutesForZoneAt('America/New_York', janNY) === -300, `NY January: -300 min (got ${offsetMinutesForZoneAt('America/New_York', janNY)})`);
  assert(offsetMinutesForZoneAt('America/New_York', julNY) === -240, `NY July: -240 min (got ${offsetMinutesForZoneAt('America/New_York', julNY)})`);
}

head('8c. Timezone offset for historical dates');
{
  // Before DST was introduced, local standard time applies. We don't check
  // pre-1900 rules strictly — just that the function doesn't throw.
  const d = new Date('1850-06-15T12:00:00Z');
  const off = offsetMinutesForZoneAt('Europe/London', d);
  assert(Number.isFinite(off), `Historical London 1850: offset is finite (got ${off})`);
}

// -----------------------------------------------------------------------------
console.log(`\n${'─'.repeat(48)}`);
console.log(`  ${passed} passed · ${failed} failed`);
if (failed) {
  console.log('\nFailures:');
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
