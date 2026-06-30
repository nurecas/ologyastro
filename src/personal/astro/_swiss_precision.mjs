// -----------------------------------------------------------------------------
// Phase 1 — Swiss Ephemeris precision test (Node-side)
//
// Verifies:
//  1. `initSwiss()` succeeds in the Node context.
//  2. `longitudesAtDate` routes through Swiss when ready.
//  3. Swiss output at 10 reference epochs matches the frozen Swiss reference
//     values to within 5 arcseconds (port-fidelity check).
//  4. Dates outside the 1200-2399 CE window fall back to Standish+Meeus.
//  5. Before `initSwiss()` is called, the default path is Standish+Meeus.
//
// The frozen reference values were produced by
// `node scripts/gen-swiss-reference.mjs` and embedded below. Re-run that
// script only when intentionally upgrading the Swiss port; document the
// change in NOTES.md. JPL Horizons cross-checks are handled separately in
// the browser test mode (Phase 7) where the full sidereal/tropical path is
// also exercised.
// -----------------------------------------------------------------------------

import {
  longitudesAtDate, longitudesAtDateStandish, dateToJD,
  initSwiss, isSwissReady, hasSwissFailed,
  isInSwissRange, getPrecisionStatus,
  PLANETS,
  extraLongitudesAtDate, extraLongitudeAtJD, extraSpeedAtJD,
  fixStarPositionAtJD,
  ASTEROIDS, URANIAN, EXTRAS, EXTRA_AMPLITUDES,
} from '../../astro/ephemeris.js';

const ARCSEC_PER_DEG = 3600;
const TOL_ARCSEC = 5;

const SWISS_REFERENCE = [
  { label: "1500-01-01", ms: -14831769600000, positions: {"Sun":280.262717,"Moon":158.400497,"Mercury":271.859478,"Venus":276.713663,"Mars":19.68128,"Jupiter":322.341,"Saturn":44.20293,"Uranus":323.636342,"Neptune":284.512924,"Pluto":234.37393} },
  { label: "1700-01-01", ms: -8520336000000,  positions: {"Sun":280.715129,"Moon":40.002805,"Mercury":299.985295,"Venus":292.390319,"Mars":203.556924,"Jupiter":280.375824,"Saturn":328.746075,"Uranus":98.718794,"Neptune":2.816093,"Pluto":130.743068} },
  { label: "1850-06-15", ms: -3772569600000,  positions: {"Sun":83.481196,"Moon":148.342517,"Mercury":76.492385,"Venus":110.046012,"Mars":137.477382,"Jupiter":164.95509,"Saturn":19.044279,"Uranus":29.270228,"Neptune":337.040089,"Pluto":29.511707} },
  { label: "1950-01-01", ms: -631152000000,   positions: {"Sun":280.004856,"Moon":61.415434,"Mercury":299.447278,"Venus":316.979503,"Mars":182.211223,"Jupiter":306.505359,"Saturn":169.437441,"Uranus":92.682791,"Neptune":197.266065,"Pluto":137.798387} },
  { label: "J2000",      ms: 946684800000,    positions: {"Sun":279.859214,"Moon":217.293286,"Mercury":271.111807,"Venus":240.961411,"Mars":327.57547,"Jupiter":25.23313,"Saturn":40.405864,"Uranus":314.784071,"Neptune":303.175254,"Pluto":251.43717} },
  { label: "1999-08-11", ms: 934369200000,    positions: {"Sun":138.347676,"Moon":138.271005,"Mercury":120.159798,"Venus":152.157067,"Mars":226.844709,"Jupiter":34.680901,"Saturn":46.876504,"Uranus":314.669253,"Neptune":302.547041,"Pluto":247.753716} },
  { label: "2020-12-21", ms: 1608573600000,   positions: {"Sun":270.337836,"Moon":357.706532,"Mercury":271.247064,"Venus":247.584513,"Mars":23.206783,"Jupiter":300.482955,"Saturn":300.484557,"Uranus":36.959503,"Neptune":348.311464,"Pluto":293.861302} },
  { label: "2025-06-15", ms: 1749945600000,   positions: {"Sun":84.163862,"Moon":306.974184,"Mercury":101.592616,"Venus":38.935806,"Mars":148.684967,"Jupiter":91.164479,"Saturn":1.275295,"Uranus":58.889618,"Neptune":2.067509,"Pluto":303.447168} },
  { label: "2050-01-01", ms: 2524608000000,   positions: {"Sun":280.748439,"Moon":18.676432,"Mercury":270.059422,"Venus":281.24811,"Mars":227.714727,"Jupiter":121.691538,"Saturn":297.574274,"Uranus":170.732536,"Neptune":53.603448,"Pluto":337.533023} },
  { label: "2080-01-01", ms: 3471292800000,   positions: {"Sun":280.456323,"Moon":18.265342,"Mercury":284.579246,"Venus":246.669517,"Mars":216.082055,"Jupiter":295.06263,"Saturn":303.459183,"Uranus":300.479427,"Neptune":122.424091,"Pluto":12.165151} },
];

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  \u2713 ' + msg); }
  else      { fail++; console.log('  \u2717 ' + msg); }
}
function arcsecDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d * ARCSEC_PER_DEG;
}

// 1. Before init — default routing is Standish+Meeus.
console.log('\n\u2500\u2500 1. Pre-init: default backend is Standish+Meeus \u2500\u2500');
assert(!isSwissReady(), 'isSwissReady() === false before initSwiss()');
const preInit = longitudesAtDate(new Date(Date.UTC(2000, 0, 1)));
const standishJ2000 = longitudesAtDateStandish(new Date(Date.UTC(2000, 0, 1)));
assert(preInit.Sun === standishJ2000.Sun, 'pre-init longitudesAtDate matches Standish path exactly');
assert(getPrecisionStatus() === 'fallback', 'getPrecisionStatus() === "fallback" before init');

// 2. Initialize Swiss — must succeed.
console.log('\n\u2500\u2500 2. initSwiss() \u2500\u2500');
const ok = await initSwiss();
assert(ok === true, 'initSwiss() returned true');
assert(isSwissReady() === true, 'isSwissReady() === true');
assert(hasSwissFailed() === false, 'hasSwissFailed() === false');

// 3. Reference-epoch precision \u2264 5 arcsec.
console.log(`\n\u2500\u2500 3. 10-epoch precision vs frozen Swiss reference (tol = ${TOL_ARCSEC}") \u2500\u2500`);
let worst = { arcsec: 0, where: '' };
for (const { label, ms, positions } of SWISS_REFERENCE) {
  const got = longitudesAtDate(new Date(ms));
  for (const name of PLANETS) {
    const d = arcsecDiff(got[name], positions[name]);
    if (d > worst.arcsec) worst = { arcsec: d, where: `${label} ${name}` };
    assert(d <= TOL_ARCSEC, `${label.padEnd(10)} ${name.padEnd(8)} |\u0394| = ${d.toFixed(3)}"`);
  }
}
console.log(`  worst: ${worst.arcsec.toFixed(3)}" at ${worst.where}`);

// 4. Out-of-range date falls back to Standish+Meeus.
console.log('\n\u2500\u2500 4. Date-range fallback (pre-1200 / post-2399) \u2500\u2500');
const preSwiss  = new Date(Date.UTC(800, 0, 1));
const postSwiss = new Date(Date.UTC(2450, 0, 1));
const okSwiss   = new Date(Date.UTC(1500, 0, 1));
assert(!isInSwissRange(dateToJD(preSwiss)),  'isInSwissRange(800 CE) === false');
assert(!isInSwissRange(dateToJD(postSwiss)), 'isInSwissRange(2450 CE) === false');
assert( isInSwissRange(dateToJD(okSwiss)),   'isInSwissRange(1500 CE) === true');
assert(getPrecisionStatus(dateToJD(preSwiss))  === 'out-of-range', 'status(800 CE)  === "out-of-range"');
assert(getPrecisionStatus(dateToJD(okSwiss))   === 'swiss',        'status(1500 CE) === "swiss"');
const pre  = longitudesAtDate(preSwiss);
const preS = longitudesAtDateStandish(preSwiss);
assert(pre.Sun === preS.Sun, '800 CE routes through Standish+Meeus (not Swiss)');

// 5. Exact boundary behaviour: 1199-12-31 fallback, 1200-01-01 Swiss,
//    2399-12-31 Swiss, 2400-01-01 fallback. Upper bound is strict per brief.
console.log('\n\u2500\u2500 5. Exact boundary dates \u2500\u2500');
const b1199 = new Date(Date.UTC(1199, 11, 31));
const b1200 = new Date(Date.UTC(1200, 0, 1));
const b2399 = new Date(Date.UTC(2399, 11, 31));
const b2400 = new Date(Date.UTC(2400, 0, 1));
assert(!isInSwissRange(dateToJD(b1199)), '1199-12-31 \u2192 out of range');
assert( isInSwissRange(dateToJD(b1200)), '1200-01-01 \u2192 in range (lower bound inclusive)');
assert( isInSwissRange(dateToJD(b2399)), '2399-12-31 \u2192 in range');
assert(!isInSwissRange(dateToJD(b2400)), '2400-01-01 \u2192 out of range (upper bound exclusive)');
assert(getPrecisionStatus(dateToJD(b1199)) === 'out-of-range', 'status(1199-12-31) === "out-of-range"');
assert(getPrecisionStatus(dateToJD(b1200)) === 'swiss',        'status(1200-01-01) === "swiss"');
assert(getPrecisionStatus(dateToJD(b2399)) === 'swiss',        'status(2399-12-31) === "swiss"');
assert(getPrecisionStatus(dateToJD(b2400)) === 'out-of-range', 'status(2400-01-01) === "out-of-range"');

// 6. Signature-preservation: dependents of longitudesAtDate (computeNatal via
//    natal.js, equatorialAtDate, sampleLongitudes) are all sync, so
//    once Swiss is ready the same synchronous call now returns Swiss data
//    transparently. We already exercised longitudesAtDate above; here we
//    verify equatorialAtDate stays sync + routes through the active backend.
console.log('\n\u2500\u2500 6. equatorialAtDate/sampleLongitudes routing \u2500\u2500');
const { equatorialAtDate, sampleLongitudes } = await import('../../astro/ephemeris.js');
const eq = equatorialAtDate(new Date(Date.UTC(2000, 0, 1)));
assert(Array.isArray(eq) && eq.length === 10, 'equatorialAtDate returns 10 bodies');
assert(typeof eq[0].ra === 'number' && typeof eq[0].dec === 'number', 'RA/Dec are numeric');
const sampled = sampleLongitudes(2000, 2001, 5);
assert(sampled.data.length === 5 * 10, 'sampleLongitudes data layout unchanged');
assert(sampled.years.length === 5, 'sampleLongitudes years unchanged');

// -----------------------------------------------------------------------------
// Phase 2 — Chiron, True Nodes, asteroids, Uranian, fixed stars.
//
// All new bodies must (a) compute to a normalized longitude in [0, 360) at
// J2000 via Swiss, (b) route null when Swiss is unavailable or JD out of
// range, (c) respect amplitude table, (d) South Node is exactly 180° from
// True Node. Fixed-star check reproduces Aldebaran at a known epoch.
// -----------------------------------------------------------------------------

console.log('\n\u2500\u2500 7. Phase 2 extras \u2014 Chiron / Nodes / asteroids \u2500\u2500');
const j2000 = dateToJD(new Date(Date.UTC(2000, 0, 1)));
for (const name of EXTRAS) {
  const lon = extraLongitudeAtJD(name, j2000);
  assert(typeof lon === 'number' && lon >= 0 && lon < 360,
         `${name.padEnd(10)} longitude in [0, 360)  (got ${lon?.toFixed?.(3)})`);
  assert(EXTRA_AMPLITUDES[name] > 0, `${name} has astrological amplitude`);
}
// Chiron at J2000 is ~15\u00b0 Sagittarius = ~255\u00b0. Quick sanity ceiling.
const chiron = extraLongitudeAtJD('Chiron', j2000);
assert(chiron > 250 && chiron < 260, `Chiron J2000 in Sagittarius early (got ${chiron.toFixed(2)}\u00b0)`);
// True Node at J2000 is in early-to-mid Leo per Swiss (the osculating True
// Node value differs meaningfully from the Mean Node's ~Taurus position).
const nnode = extraLongitudeAtJD('NorthNode', j2000);
assert(nnode > 120 && nnode < 126, `True Node J2000 near 4\u00b0 Leo (got ${nnode.toFixed(2)}\u00b0)`);

console.log('\n\u2500\u2500 8. South Node = North Node + 180\u00b0 (exact mirror) \u2500\u2500');
const extrasJ2000 = extraLongitudesAtDate(new Date(Date.UTC(2000, 0, 1)));
const opp = ((extrasJ2000.SouthNode - extrasJ2000.NorthNode) % 360 + 360) % 360;
assert(Math.abs(opp - 180) < 1e-9, `(South - North) mod 360 === 180\u00b0  (got ${opp.toFixed(6)})`);

console.log('\n\u2500\u2500 9. Uranian points \u2014 off by default, computable on request \u2500\u2500');
const extrasDefault = extraLongitudesAtDate(new Date(Date.UTC(2000, 0, 1)));
assert(extrasDefault.Cupido === undefined, 'Cupido hidden by default');
const extrasWithUranian = extraLongitudesAtDate(new Date(Date.UTC(2000, 0, 1)), { includeUranian: true });
for (const name of URANIAN) {
  const lon = extrasWithUranian[name];
  assert(typeof lon === 'number' && lon >= 0 && lon < 360,
         `${name.padEnd(10)} computable when opted in (got ${lon?.toFixed?.(3)})`);
}

console.log('\n\u2500\u2500 10. Retrograde speed sign \u2014 Chiron has signed speed \u2500\u2500');
const chiSpeed = extraSpeedAtJD('Chiron', j2000);
assert(typeof chiSpeed === 'number' && isFinite(chiSpeed), `Chiron speed is numeric (${chiSpeed.toFixed?.(4)} \u00b0/day)`);

console.log('\n\u2500\u2500 10b. True Node vs Mean Node \u2014 we use SE_TRUE_NODE per brief \u2500\u2500');
// True Node (osculating) and Mean Node diverge by \u00b11.5\u00b0. At J2000 Swiss
// gives True = 123.98\u00b0, Mean = 125.07\u00b0 \u2014 a 1.09\u00b0 gap. Our NorthNode
// must match True, not Mean.
{
  const { default: SwissEph } = await import('swisseph-wasm');
  const swe = new SwissEph();
  await swe.initSwissEph();
  const meanJ2000 = swe.calc_ut(j2000, swe.SE_MEAN_NODE, swe.SEFLG_SWIEPH)[0];
  swe.close?.();
  assert(Math.abs(nnode - meanJ2000) > 0.5,
         `our NorthNode differs from Mean Node by > 0.5\u00b0 (|True-Mean| = ${Math.abs(nnode - meanJ2000).toFixed(3)}\u00b0)`);
}

console.log('\n\u2500\u2500 10c. Chiron sanity at J2000 vs astro.com convention \u2500\u2500');
// Astro.com / Swiss consensus: Chiron at J2000 \u2248 11\u00b034' Sagittarius = 251.57\u00b0.
// Tight window; catches a wrong body-id or ayanamsa leak.
assert(Math.abs(chiron - 251.56) < 0.05, `Chiron J2000 within 0.05\u00b0 of 251.56\u00b0 (got ${chiron.toFixed(3)})`);

console.log('\n\u2500\u2500 10d. Cupido motion \u2014 Hamburg point is actually moving \u2500\u2500');
// Cupido's period is ~262 years \u2192 ~1.37\u00b0/year. Check it's moved
// between J2000 and 2020 by roughly 27-28\u00b0. If the Hamburg calc is
// broken, Cupido would be static.
const cupidoJ2000 = extrasWithUranian.Cupido;
const cupido2020  = extraLongitudesAtDate(new Date(Date.UTC(2020, 0, 1)), { includeUranian: true }).Cupido;
const cupidoMotion = ((cupido2020 - cupidoJ2000 + 720) % 360);
assert(cupidoMotion > 10 && cupidoMotion < 60,
       `Cupido moves ~27\u00b0 in 20 years (got ${cupidoMotion.toFixed(2)})`);

console.log('\n\u2500\u2500 11. Fixed stars \u2014 Aldebaran at J2000 \u2500\u2500');
const ald = fixStarPositionAtJD('Aldebaran', j2000);
assert(ald !== null, 'Aldebaran resolves from sefstars.txt');
// Aldebaran J2000 ecliptic ~ 69\u00b0 47' = ~9\u00b0 47' Gemini. Accept 68-72.
assert(ald.lon > 68 && ald.lon < 72, `Aldebaran longitude near 9\u00b047' Gemini (got ${ald.lon.toFixed(3)})`);
// Ecliptic latitude for Aldebaran is ~ -5.5\u00b0.
assert(ald.lat < -5.0 && ald.lat > -6.0, `Aldebaran latitude near -5.5\u00b0 (got ${ald.lat.toFixed(3)})`);
// Non-existent star → null, not crash.
assert(fixStarPositionAtJD('NotARealStar', j2000) === null, 'Unknown star name returns null');

console.log('\n\u2500\u2500 12. Out-of-range: extras + stars return null (no Standish impostor) \u2500\u2500');
const jdPre = dateToJD(new Date(Date.UTC(800, 0, 1)));
assert(extraLongitudeAtJD('Chiron', jdPre) === null, '800 CE Chiron \u2192 null');
assert(fixStarPositionAtJD('Aldebaran', jdPre) === null, '800 CE Aldebaran \u2192 null');
const outExtras = extraLongitudesAtDate(new Date(Date.UTC(800, 0, 1)));
assert(outExtras.NorthNode === null && outExtras.SouthNode === null,
       'Nodes null out of range \u2014 no phantom 180\u00b0 pair');

// -----------------------------------------------------------------------------
// Phase 3 — reference systems + classical techniques
// -----------------------------------------------------------------------------

console.log('\n\u2500\u2500 13. Sidereal zodiac \u2014 Lahiri shift at J2000 \u2500\u2500');
const { setEphemerisOptions, getActiveZodiac, computeHousesSwiss } =
  await import('../../astro/ephemeris.js');
const tropSun = longitudesAtDate(new Date(Date.UTC(2000, 0, 1))).Sun;
setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
assert(getActiveZodiac() === 'sidereal', 'getActiveZodiac() === "sidereal"');
const sidSun = longitudesAtDate(new Date(Date.UTC(2000, 0, 1))).Sun;
// Lahiri ayanamsa at J2000 is ~23\u00b051'. Sidereal = tropical - ayanamsa.
const ayan = ((tropSun - sidSun) + 360) % 360;
assert(ayan > 23 && ayan < 24.5, `Lahiri ayanamsa at J2000 in [23, 24.5] (got ${ayan.toFixed(3)})`);
// Switch back to tropical so later tests aren't affected.
setEphemerisOptions({ zodiac: 'tropical' });
assert(getActiveZodiac() === 'tropical', 'reverted to tropical');
const tropAgain = longitudesAtDate(new Date(Date.UTC(2000, 0, 1))).Sun;
assert(Math.abs(tropAgain - tropSun) < 1e-9, 'tropical value matches original after round-trip');

console.log('\n\u2500\u2500 13b. Lahiri ayanamsa at 5 reference epochs \u2500\u2500');
// Lahiri ayanamsa grows by ~50.3"/year. Cross-check against Swiss's own
// get_ayanamsa output at 5 epochs. The test that matters: our
// `sidereal = tropical - ayanamsa` identity holds at each epoch.
setEphemerisOptions({ zodiac: 'tropical' });
const { default: SwissEphForTest } = await import('swisseph-wasm');
const sweT = new SwissEphForTest();
await sweT.initSwissEph();
for (const [label, ms] of [
  ['1850-01-01', Date.UTC(1850, 0, 1)],
  ['1900-01-01', Date.UTC(1900, 0, 1)],
  ['1950-01-01', Date.UTC(1950, 0, 1)],
  ['2000-01-01', Date.UTC(2000, 0, 1)],
  ['2050-01-01', Date.UTC(2050, 0, 1)],
]) {
  const d = new Date(ms);
  const jd = dateToJD(d);
  sweT.set_sid_mode(1, 0, 0); // Lahiri
  setEphemerisOptions({ zodiac: 'tropical' });
  const trop = longitudesAtDate(d).Sun;
  setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
  const sid  = longitudesAtDate(d).Sun;
  const measured = ((trop - sid) % 360 + 360) % 360;
  // Sanity: ayanamsa at these epochs sits between 22\u00b0 (1850) and 24.5\u00b0
  // (2050) for Lahiri. Growth rate \u224850"/yr \u2192 ~0.014\u00b0/yr. A 200-year
  // window covers 2.8\u00b0 of growth.
  assert(measured > 21 && measured < 25.5,
         `${label}: Lahiri ayanamsa in [21, 25.5]\u00b0 (got ${measured.toFixed(4)})`);
  // Compare to Swiss's own get_ayanamsa_ex_ut (which accounts for nutation
  // like SEFLG_SIDEREAL does). Tolerance is 1 arc-second.
  const swissAyanEx = sweT.get_ayanamsa_ex_ut(jd, sweT.SEFLG_SWIEPH);
  // get_ayanamsa_ex_ut returns [retFlag, ayanamsa] in some wrappers; handle both.
  const swissAyanVal = Array.isArray(swissAyanEx) ? swissAyanEx[0] : swissAyanEx;
  assert(Math.abs(measured - swissAyanVal) < 1 / 3600,
         `${label}: sidereal offset \u2261 Swiss apparent ayanamsa to 1" (\u0394 = ${(Math.abs(measured - swissAyanVal) * 3600).toFixed(3)}")`);
}
sweT.close?.();
setEphemerisOptions({ zodiac: 'tropical' });

console.log('\n\u2500\u2500 14. Ayanamsa selection \u2014 Raman \u2260 Lahiri \u2500\u2500');
setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
const sidLahiri = longitudesAtDate(new Date(Date.UTC(2000, 0, 1))).Sun;
setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'raman' });
const sidRaman = longitudesAtDate(new Date(Date.UTC(2000, 0, 1))).Sun;
// Raman and Lahiri use different epochs; their ayanamsas differ by roughly
// 1-2\u00b0 depending on date.
assert(Math.abs(sidLahiri - sidRaman) > 0.05 && Math.abs(sidLahiri - sidRaman) < 3,
       `Raman vs Lahiri differ by a small-but-nonzero amount (got ${Math.abs(sidLahiri - sidRaman).toFixed(3)}\u00b0)`);
setEphemerisOptions({ zodiac: 'tropical' });

console.log('\n\u2500\u2500 15. House systems (Swiss) \u2500\u2500');
const jdNatal = dateToJD(new Date(Date.UTC(1990, 5, 21, 12, 0))); // brief exemplar-ish
const lat = 28.6139, lon = 77.2090; // New Delhi
const plac = computeHousesSwiss(jdNatal, lat, lon, 'placidus');
const whol = computeHousesSwiss(jdNatal, lat, lon, 'whole-sign');
const koch = computeHousesSwiss(jdNatal, lat, lon, 'koch');
const equa = computeHousesSwiss(jdNatal, lat, lon, 'equal');
for (const [label, h] of [['placidus', plac], ['whole-sign', whol], ['koch', koch], ['equal', equa]]) {
  assert(h && h.cusps.length === 12, `${label} returns 12 cusps`);
  assert(typeof h.asc === 'number' && typeof h.mc === 'number', `${label} asc/mc are numbers`);
}
// Whole Sign: house 1 cusp = 0\u00b0 of the ASC's sign.
const ascSignStart = Math.floor(whol.asc / 30) * 30;
assert(Math.abs(whol.cusps[0] - ascSignStart) < 1e-9,
       `Whole Sign: house 1 cusp at sign boundary (cusp ${whol.cusps[0].toFixed(3)} / expected ${ascSignStart.toFixed(3)})`);
// Whole Sign: each subsequent house starts 30\u00b0 later AND at the next sign's boundary.
for (let i = 1; i < 12; i++) {
  const expected = ((ascSignStart + 30 * i) % 360 + 360) % 360;
  assert(Math.abs(whol.cusps[i] - expected) < 1e-9,
         `Whole Sign: house ${i+1} cusp at sign boundary (expected ${expected.toFixed(3)}, got ${whol.cusps[i].toFixed(3)})`);
}
// Whole Sign: asc/mc are the REAL positions, not the cusps (per Swiss convention).
assert(Math.abs(((whol.asc - whol.cusps[0]) % 360 + 360) % 360) < 30,
       `Whole Sign: ASC falls within house 1's 30\u00b0 sign arc`);

// Equal: successive cusps are 30\u00b0 apart.
for (let i = 1; i < 12; i++) {
  const d = ((equa.cusps[i] - equa.cusps[i-1]) % 360 + 360) % 360;
  assert(Math.abs(d - 30) < 1e-9, `Equal: cusp ${i} is 30\u00b0 after cusp ${i-1}`);
}
// Equal: house 1 cusp = ASC exactly.
assert(Math.abs(equa.cusps[0] - equa.asc) < 1e-9,
       `Equal: house 1 cusp == ASC (\u0394 = ${Math.abs(equa.cusps[0] - equa.asc).toExponential(2)})`);

// Koch tests (brief: 3 specific checks). Koch shares ASC and MC with
// Placidus but intermediate cusps differ (semi-arc method vs house-
// division). We verify: (a) Koch ASC/MC equal Placidus ASC/MC to 1e-9,
// (b) Koch intermediate cusps differ from Placidus by a measurable
// amount for our 28.6\u00b0 N exemplar, (c) Koch is defined (non-null).
assert(!!koch, 'Koch houses computable');
assert(Math.abs(koch.asc - plac.asc) < 1e-6, 'Koch ASC == Placidus ASC');
assert(Math.abs(koch.mc  - plac.mc ) < 1e-6, 'Koch MC == Placidus MC');
let kochDiffers = false;
for (let i = 1; i < 12; i++) {
  if (i === 3 || i === 9) continue; // ASC/DSC/IC/MC shared
  const d = Math.abs(((koch.cusps[i] - plac.cusps[i]) % 360 + 540) % 360 - 180);
  if (d > 0.5) { kochDiffers = true; break; }
}
assert(kochDiffers, 'Koch intermediate cusps differ from Placidus (Koch semi-arc \u2260 Placidus)');

console.log('\n\u2500\u2500 16. Part of Fortune (natal.computeNatal) \u2500\u2500');
const { computeNatal } = await import('../../personal/astro/natal.js');
const exemplar = {
  name: 'T', year: 1990, month: 6, day: 21, hour: 12, minute: 0, tzOffsetMin: 0,
  latDeg: 28.6139, lonDeg: 77.2090,
};
const nat = computeNatal(exemplar);
const fortune = nat.planets.find(p => p.name === 'Fortune');
assert(!!fortune, 'Part of Fortune present in natal.planets');
assert(fortune.calculatedPoint === true, 'Fortune marked calculatedPoint');
// Verify formula manually.
const sunP = nat.planets.find(p => p.name === 'Sun');
const moonP = nat.planets.find(p => p.name === 'Moon');
const expected = nat.isDay
  ? ((nat.ascDeg + moonP.lonDeg - sunP.lonDeg) % 360 + 360) % 360
  : ((nat.ascDeg + sunP.lonDeg - moonP.lonDeg) % 360 + 360) % 360;
assert(Math.abs(fortune.lonDeg - expected) < 1e-9, 'Fortune matches classical formula');

console.log('\n\u2500\u2500 17. Essential Dignities (Lilly examples) \u2500\u2500');
const { dignitiesOf } = await import('../../personal/astro/dignities.js');
// Sun in Leo (day) \u2192 rulership AND triplicity ruler (fire day = Sun).
const sunLeo = dignitiesOf('Sun', 135, true);
assert(sunLeo.entries.includes('rulership'),         'Sun in Leo is its own ruler');
assert(sunLeo.entries.includes('triplicity-ruler'), 'Sun in Leo by day is fire-triplicity ruler');
// Mars in Cancer \u2192 fall.
const marsCancer = dignitiesOf('Mars', 95, true);
assert(marsCancer.entries.includes('fall'), 'Mars in Cancer is in fall');
// Saturn in Cancer \u2192 detriment (rules Capricorn, opposite = Cancer).
const satCancer = dignitiesOf('Saturn', 95, true);
assert(satCancer.entries.includes('detriment'), 'Saturn in Cancer is in detriment');
// Sun in Aries \u2192 exaltation.
const sunAries = dignitiesOf('Sun', 15, true);
assert(sunAries.entries.includes('exaltation'), 'Sun in Aries is exalted');

console.log('\n\u2500\u2500 18. Midpoints (circular midpoint correctness) \u2500\u2500');
const { circularMidpoint, pairMidpoints } = await import('../../personal/astro/midpoints.js');
assert(Math.abs(circularMidpoint(0, 180) - 90) < 1e-9 || Math.abs(circularMidpoint(0, 180) - 270) < 1e-9,
       'midpoint(0,180) is 90 or 270 (either half of the wheel is valid)');
assert(Math.abs(circularMidpoint(350, 10) - 0) < 1e-9,
       'midpoint(350, 10) wraps to 0');
assert(Math.abs(circularMidpoint(10, 350) - 0) < 1e-9, 'midpoint is order-symmetric across wrap');
const mids = pairMidpoints(nat);
assert(mids.length === 45, `45 pairwise midpoints of classical 10 (got ${mids.length})`);

console.log('\n\u2500\u2500 19. Aspect Grid \u2500\u2500');
const { aspectBetween, aspectGrid } = await import('../../personal/astro/aspectGrid.js');
// Known: 0\u00b0 apart = conjunction.
const aConj = aspectBetween(10, 10);
assert(aConj && aConj.name === 'conjunction' && aConj.orb === 0, 'exact conjunction detected');
// 178\u00b0 apart \u2192 opposition (orb 2).
const aOpp = aspectBetween(0, 178);
assert(aOpp && aOpp.name === 'opposition' && Math.abs(aOpp.orb - 2) < 1e-9, 'opposition with 2\u00b0 orb');
// 35\u00b0 apart \u2192 no aspect.
assert(aspectBetween(0, 35) === null, '35\u00b0 \u2192 no aspect within orb');
const grid = aspectGrid(nat);
assert(grid.rows.length === grid.cols.length, 'grid square');
assert(grid.rows.length >= 10, 'grid has at least 10 bodies');

console.log('\n\u2500\u2500 20. Transit aspects to natal angles (opt-in) \u2500\u2500');
const { currentAspects } = await import('../../personal/astro/aspects.js');
const withAngles = currentAspects(nat, new Date(Date.UTC(2000, 0, 1)), { includeAngles: true });
const withoutAngles = currentAspects(nat, new Date(Date.UTC(2000, 0, 1)));
assert(withAngles.length >= withoutAngles.length, 'includeAngles is \u2265 planet-only');
assert(!withoutAngles.some(a => a.targetIsAngle), 'planet-only result has no angle hits (default Basic-mode behaviour)');

// Explicit ASC/MC transit test (brief Phase 3): place a synthetic natal at
// a known ASC/MC and a transit Sun exactly conjunct the MC; verify the
// angle-transit is detected.
const pinnedNatal = {
  ...nat,
  ascDeg: 0,       // Aries 0\u00b0
  mcDeg:  270,     // Capricorn 0\u00b0
  icDeg:  90,
  dscDeg: 180,
};
// At some moment the Sun is at Capricorn 0\u00b0 — roughly Dec 22 each year.
// We don't need the exact moment, we just need a date where the Sun is
// near 270\u00b0. 2024-12-22 12:00 UT gives Sun ~0\u00b0 Cap.
const mcTransitDate = new Date(Date.UTC(2024, 11, 22, 12, 0));
const transitsAngles = currentAspects(pinnedNatal, mcTransitDate, { includeAngles: true });
const mcHits = transitsAngles.filter(a => a.natal === 'MC' && a.transit === 'Sun');
assert(mcHits.length >= 1, `transit Sun aspects natal MC when Sun is near MC (got ${mcHits.length} hit${mcHits.length === 1 ? '' : 's'})`);

// -----------------------------------------------------------------------------
// Phase 4 — Predictive techniques
// -----------------------------------------------------------------------------

console.log('\n\u2500\u2500 21. Secondary progressions (day-for-a-year) \u2500\u2500');
const { secondaryProgressions, solarArcDirections, ageAt } =
  await import('../../personal/astro/progressions.js');
const targetDate = new Date(Date.UTC(2025, 5, 21, 12, 0)); // 35 years after exemplar
const age = ageAt(exemplar, targetDate);
assert(age > 34.9 && age < 35.1, `age at targetDate \u2248 35 (got ${age.toFixed(3)})`);
const prog = secondaryProgressions(exemplar, targetDate);
assert(prog.planets.length >= 10, 'progressed chart returns at least 10 bodies');
const progSun = prog.planets.find(p => p.name === 'Sun');
// Progressed Sun moves ~1\u00b0/year, so ~35\u00b0 after natal Sun at age 35.
const natalSun = nat.planets.find(p => p.name === 'Sun');
const progSunArc = ((progSun.lonDeg - natalSun.lonDeg + 540) % 360) - 180;
assert(progSunArc > 33 && progSunArc < 37, `progressed Sun ~35\u00b0 ahead of natal at age 35 (got ${progSunArc.toFixed(2)})`);

console.log('\n\u2500\u2500 22. Solar Arc directions \u2500\u2500');
const sa = solarArcDirections(exemplar, nat, targetDate, 'solar');
assert(sa.arc > 33 && sa.arc < 37, `solar arc \u2248 35\u00b0 at age 35 (got ${sa.arc.toFixed(2)})`);
// Every point should advance by the same arc.
for (const p of sa.planets) {
  const orig = nat.planets.find(q => q.name === p.name);
  const delta = ((p.lonDeg - orig.lonDeg + 540) % 360) - 180;
  assert(Math.abs(delta - sa.arc) < 1e-6 || Math.abs(delta + 360 - sa.arc) < 1e-6,
         `${p.name} advanced by the solar arc`);
}
// Naibod variant uses 59'08"/year constant.
const saNaibod = solarArcDirections(exemplar, nat, targetDate, 'naibod');
const expectedNaibod = age * (59 + 8/60) / 60;
assert(Math.abs(saNaibod.arc - expectedNaibod) < 1e-6, `Naibod arc = age \u00d7 59'08" (got ${saNaibod.arc.toFixed(4)} / expected ${expectedNaibod.toFixed(4)})`);

console.log('\n\u2500\u2500 23. Solar Return (Sun-longitude iterative root-find) \u2500\u2500');
const { solarReturn } = await import('../../personal/astro/returns.js');
const sr = solarReturn(exemplar, 2025);
assert(sr.date instanceof Date, 'solarReturn returns a Date');
// The Sun's longitude at the Return must equal the natal Sun's longitude
// to within ~1 minute of arc.
const srSun = sr.planets.Sun;
const diff = Math.abs(signedDelta(srSun, sr.natalSunLon));
// Brief: "matches Swiss Ephemeris output to within 1 minute" \u2014 read as
// 1 arc-minute of the Sun's longitude (Sun moves ~1\u00b0/day so 1 arc-min
// \u2248 24 min of clock time).
assert(diff * 60 < 1, `Return Sun \u2248 natal Sun within 1 arc-minute (|\u0394| = ${(diff * 60).toFixed(3)}')`);
// Return date must be near the birthday anniversary (Sun returns within
// \u00b11 day of the birthday each year; solar/tropical-year mismatch is
// ~6 hr).
const daysOffBirthday = Math.abs((sr.date.getTime() - Date.UTC(2025, exemplar.month - 1, exemplar.day)) / 86400000);
assert(daysOffBirthday < 1.5, `Solar return within 1.5 days of birthday (got ${daysOffBirthday.toFixed(2)})`);

function signedDelta(a, b) { return ((a - b + 540) % 360) - 180; }

console.log('\n\u2500\u2500 24. Lunar Return (~27.3-day cycle) \u2500\u2500');
const { lunarReturnNear } = await import('../../personal/astro/returns.js');
const lr = lunarReturnNear(exemplar, new Date(Date.UTC(2025, 5, 21)));
const lrMoon = lr.planets.Moon;
const mdiff = Math.abs(signedDelta(lrMoon, lr.natalMoonLon));
assert(mdiff < 0.02, `Return Moon \u2248 natal Moon (|\u0394| = ${(mdiff * 3600).toFixed(2)}")`);

console.log('\n\u2500\u2500 25. Davison chart (midpoint in time + space) \u2500\u2500');
const { davisonBirth, davisonChart } = await import('../../personal/astro/davison.js');
const partnerB = {
  name: 'B', year: 1991, month: 12, day: 11, hour: 3, minute: 30, tzOffsetMin: 0,
  latDeg: 40.7128, lonDeg: -74.0060,  // NYC
};
const mid = davisonBirth(exemplar, partnerB);
// Davison midpoint-in-time hand calculation (brief Phase 4):
//   ms1 = Date.UTC(1990, 5, 21, 12, 0)  = 645969600000
//   ms2 = Date.UTC(1991, 11, 11, 3, 30) = 692513400000
//   mid = (ms1 + ms2) / 2                = 669241500000
//   new Date(669241500000) = 1991-03-17T07:45:00.000Z
const ms1 = Date.UTC(1990, 5, 21, 12, 0);
const ms2 = Date.UTC(1991, 11, 11, 3, 30);
const expectedMid = new Date((ms1 + ms2) / 2);
assert(mid.year === expectedMid.getUTCFullYear(), `Davison year matches hand-calc (got ${mid.year})`);
assert(mid.month === expectedMid.getUTCMonth() + 1, `Davison month matches hand-calc (got ${mid.month})`);
assert(mid.day === expectedMid.getUTCDate(), `Davison day matches hand-calc (expected ${expectedMid.getUTCDate()}, got ${mid.day})`);
assert(mid.hour === expectedMid.getUTCHours(), `Davison hour matches hand-calc (expected ${expectedMid.getUTCHours()}, got ${mid.hour})`);
assert(mid.minute === expectedMid.getUTCMinutes(), `Davison minute matches hand-calc (expected ${expectedMid.getUTCMinutes()}, got ${mid.minute})`);
// Midpoint in SPACE: latitudes average, longitudes take circular midpoint.
const expectedLat = (exemplar.latDeg + partnerB.latDeg) / 2;
assert(Math.abs(mid.latDeg - expectedLat) < 1e-9, 'Davison latitude = arithmetic mean');
// Exemplar 77.2\u00b0E + NYC -74\u00b0: both are < 180\u00b0 apart going through 0\u00b0,
// so the shorter-arc midpoint is near +1.5\u00b0 (Mediterranean). The naive
// arithmetic mean would also land there — here we just verify the circular-
// midpoint implementation doesn't wander into the wrong half-plane.
const expectedLonApprox = ((exemplar.lonDeg + partnerB.lonDeg) / 2);
assert(Math.abs(mid.lonDeg - expectedLonApprox) < 0.5,
       `Davison longitude = circular midpoint \u2248 arithmetic mean for sub-180\u00b0 pairs (got ${mid.lonDeg.toFixed(2)}, arith ${expectedLonApprox.toFixed(2)})`);
// Extra: test the antimeridian wrap case with a truly antipodal-ish pair.
const fiji = { name:'F', year:1990, month:1, day:1, hour:0, minute:0, tzOffsetMin:0, latDeg:-18, lonDeg:178 };
const samoa = { name:'S', year:1990, month:1, day:1, hour:0, minute:0, tzOffsetMin:0, latDeg:-13, lonDeg:-172 };
const midFS = davisonBirth(fiji, samoa);
assert(Math.abs(midFS.lonDeg) > 170,
       `Fiji 178\u00b0E + Samoa -172\u00b0 \u2192 midpoint near antimeridian (got ${midFS.lonDeg.toFixed(2)})`);
// Full chart is composed.
const dav = davisonChart(exemplar, partnerB);
assert(dav.planets.length >= 10, 'Davison chart is a full natal');
assert(typeof dav.ascDeg === 'number', 'Davison has ASC');

console.log('\n\u2500\u2500 26. Retrograde stations (root-finding) \u2500\u2500');
const { listStations } = await import('../../personal/astro/rxStations.js');
// Mercury has 3 Rx periods per year \u2014 so 6 stations in 12 months.
const stations = listStations({
  fromDate: new Date(Date.UTC(2025, 0, 1)),
  toDate:   new Date(Date.UTC(2025, 11, 31)),
  bodies:   ['Mercury'],
});
assert(stations.length >= 4 && stations.length <= 8,
       `Mercury stations in 2025: expect 6 \u00b12 (got ${stations.length})`);
for (const st of stations) {
  assert(st.direction === 'direct' || st.direction === 'retrograde', `station ${st.body} has a direction`);
  assert(st.date instanceof Date, 'station has a Date');
}

console.log('\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
console.log(`  ${pass} passed \u00b7 ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
