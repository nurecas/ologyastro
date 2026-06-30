// Vedic Life Vectors — accuracy test. Swiss-backed (real chart).
// Run: node src/vedic/_lifevectors.mjs

import { initSwiss, isSwissReady, setEphemerisOptions, decimalYearToDate } from '../astro/ephemeris.js';
import { computeVedicChart } from './compute/chart.js';
import { lifeVectorSeriesVedic, VEDIC_VECTORS, VEDIC_DOMAINS,
         strengthMultiplier, functionalScore } from './compute/lifeVectors.js';
import { currentMaha } from './compute/dasha.js';
import { RASHIS } from './compute/data.js';

const peakRawOf = (series, id) => series.find(s => s.vector.id === id)?.peakRaw ?? 0;
// Shallow override that preserves Date objects in chart.dasha.sequence
// (a JSON deep-clone would stringify them and break currentMaha).
const withDignity = (c, dignity) => ({ ...c, planets: c.planets.map(p => ({ ...p, dignity })) });

let PASS = 0, FAIL = 0; const FAILS = [];
const ok = (c, m) => c ? PASS++ : (FAIL++, FAILS.push(m), console.log('  ✗', m));
const section = t => console.log('\n──', t, '──────');

await initSwiss();
setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
ok(isSwissReady(), 'Swiss ready');

const birth = { name: 'Test', year: 1985, month: 7, day: 15, hour: 9, minute: 30, tzOffsetMin: 330, latDeg: 28.6139, lonDeg: 77.2090, placeName: 'Delhi' };
const chart = computeVedicChart(birth, { ayanamsa: 'lahiri' });
ok(!!chart, 'chart computed');

const { years, series, events } = lifeVectorSeriesVedic({ chart, startYear: 1985, endYear: 2065, samplesPerYear: 12 });

section('Structure');
ok(years.length >= 24, `sampled ${years.length} points`);
ok(series.length === VEDIC_VECTORS.length, `${series.length} vector lines (8 domains + 2 composites)`);
ok(events.length > 0, `${events.length} mahadasha events on ribbon`);
ok(events.every(e => e.kind === 'maha' && e.lord), 'events are mahadasha changes with a lord');
ok(events.every((e, i) => i === 0 || events[i - 1].year <= e.year), 'events sorted by year');

section('Normalisation — every line in [0,1], each peaks ~1');
for (const s of series) {
  let mx = 0, mn = 1, finite = true;
  for (const v of s.values) { if (!Number.isFinite(v)) finite = false; if (v > mx) mx = v; if (v < mn) mn = v; }
  ok(finite, `${s.vector.name}: all finite`);
  ok(mx <= 1.0001 && mn >= -0.0001, `${s.vector.name}: within [0,1]`);
  ok(mx >= 0.98, `${s.vector.name}: peaks at ~1 (got ${mx.toFixed(2)})`);
}

section('Daśā dominance — a domain elevates during the daśā of a connected lord');
// Career domain: its lord (10th lord) OR a karaka (Sun/Saturn/Mercury) running
// as Mahadasha should put career activation in the upper half of its range.
const career = series.find(s => s.vector.id === 'career');
const tenthLord = RASHIS[(chart.lagnaSignIdx + 9) % 12].ruler;
const careerKarakas = new Set(['Sun', 'Saturn', 'Mercury', tenthLord]);
let connectedSum = 0, connectedN = 0, otherSum = 0, otherN = 0;
for (let i = 0; i < years.length; i++) {
  const maha = currentMaha(chart.dasha.sequence, decimalYearToDate(years[i]));
  if (careerKarakas.has(maha.lord)) { connectedSum += career.values[i]; connectedN++; }
  else { otherSum += career.values[i]; otherN++; }
}
const connAvg = connectedN ? connectedSum / connectedN : 0;
const otherAvg = otherN ? otherSum / otherN : 0;
ok(connAvg > otherAvg, `career activation higher under connected daśās (${connAvg.toFixed(2)} > ${otherAvg.toFixed(2)})`);

section('Domains + composites present');
ok(VEDIC_DOMAINS.length === 8, '8 life domains');
ok(VEDIC_VECTORS.filter(v => v.composite).length === 2, '2 generic composites');
for (const d of VEDIC_DOMAINS) ok(d.houses.length >= 1 && d.karakas.length >= 1, `${d.name}: has houses + karakas`);
ok(VEDIC_DOMAINS.find(d => d.id === 'health')?.affliction === true, 'Health is flagged as an affliction (pressure) domain');

// ── M3: ashubha now intensifies WITH malefic strength (sign of df, not inverted)
section('M3 — composite ashubha scales UP with functional-malefic strength (BPHS fullness-of-results)');
{
  const strong = lifeVectorSeriesVedic({ chart: withDignity(chart, 'exalted'),     startYear: 1985, endYear: 2065, samplesPerYear: 12 });
  const weak   = lifeVectorSeriesVedic({ chart: withDignity(chart, 'debilitated'), startYear: 1985, endYear: 2065, samplesPerYear: 12 });
  ok(peakRawOf(strong.series, 'ashubha') > peakRawOf(weak.series, 'ashubha'),
    `strong malefic daśā reads as MORE testing than weak (${peakRawOf(strong.series,'ashubha').toFixed(2)} > ${peakRawOf(weak.series,'ashubha').toFixed(2)})`);
  ok(peakRawOf(strong.series, 'shubha') > peakRawOf(weak.series, 'shubha'),
    'shubha likewise scales up with benefic strength (symmetric)');
}

// ── M1: Health (affliction) activation must NOT scale with the benefic dignity factor
section('M1 — Health (duḥsthāna) is dignity-neutral: strong vs weak 6/8 lord read the same adversity');
{
  const strong = lifeVectorSeriesVedic({ chart: withDignity(chart, 'exalted'),     startYear: 1985, endYear: 2065, samplesPerYear: 12 });
  const weak   = lifeVectorSeriesVedic({ chart: withDignity(chart, 'debilitated'), startYear: 1985, endYear: 2065, samplesPerYear: 12 });
  ok(Math.abs(peakRawOf(strong.series, 'health') - peakRawOf(weak.series, 'health')) < 1e-3,
    `Health peak independent of lord dignity (${peakRawOf(strong.series,'health').toFixed(3)} ≈ ${peakRawOf(weak.series,'health').toFixed(3)})`);
}

// ── S6: strengthMultiplier folds in neecha-bhanga + naisargika relation
section('S6 — strengthMultiplier: neecha-bhanga + friend/enemy refinement');
{
  ok(strengthMultiplier({ dignity: 'exalted' }, new Set()) === 1.35, 'exalted → 1.35');
  ok(strengthMultiplier({ dignity: 'debilitated', name: 'Sun' }, new Set()) === 0.55, 'plain debilitated → 0.55');
  ok(strengthMultiplier({ dignity: 'debilitated', name: 'Sun' }, new Set(['sun'])) === 1.10, 'debilitated + neecha-bhanga → restored to 1.10');
  ok(Math.abs(strengthMultiplier({ dignity: 'own', relation: 'friend' }, new Set()) - 1.20 * 1.10) < 1e-9, 'own in a friend\'s sign → ×1.10');
  ok(Math.abs(strengthMultiplier({ dignity: 'own', relation: 'enemy' }, new Set()) - 1.20 * 0.85) < 1e-9, 'own in an enemy\'s sign → ×0.85');
  ok(strengthMultiplier(null, new Set()) === 1.0, 'missing planet → neutral 1.0');
}

// ── S7: Kendrādhipati doṣa (narrow) — penalises pure-kendra natural benefic, exempts lagna lord
section('S7 — Kendrādhipati doṣa applied only to a pure-kendra natural benefic');
{
  // Gemini lagna (signIdx 2): Jupiter rules 7th (Sagittarius) + 10th (Pisces) — pure kendras, no trikoṇa.
  ok(functionalScore('Jupiter', 2) < 0.01, `Gemini-lagna Jupiter penalised to ~0 (got ${functionalScore('Jupiter', 2).toFixed(2)})`);
  // Sagittarius lagna (signIdx 8): Jupiter rules 1st + 4th — lagna lord (trikoṇa) is EXEMT and yogakāraka-strong.
  ok(functionalScore('Jupiter', 8) > 2.0, `Sagittarius-lagna Jupiter (lagna lord) stays strongly benefic (got ${functionalScore('Jupiter', 8).toFixed(2)})`);
}

// ── S1: degenerate / inverted window returns the empty contract (no phantom series, no NaN axis)
section('S1 — degenerate window guards');
{
  const zero = lifeVectorSeriesVedic({ chart, startYear: 2080, endYear: 2080, samplesPerYear: 12 });
  ok(zero.years.length === 0 && zero.series.length === 0 && zero.events.length === 0, 'zero-width window → empty contract');
  const inv = lifeVectorSeriesVedic({ chart, startYear: 2065, endYear: 1985, samplesPerYear: 12 });
  ok(inv.years.length === 0, 'inverted window (end<start) → empty contract');
}

// ── S2: malformed ashtakavarga.sav must never leak NaN into the series
section('S2 — malformed SAV is sanitised (no NaN)');
{
  let nanFree = true;
  for (const badSav of [[], [1, 2, 3], new Array(12).fill(NaN), new Array(12).fill(undefined)]) {
    const r = lifeVectorSeriesVedic({ chart: { ...chart, ashtakavarga: { sav: badSav } }, startYear: 1985, endYear: 2065, samplesPerYear: 12 });
    for (const line of r.series) for (const v of line.values) if (!Number.isFinite(v)) nanFree = false;
  }
  ok(nanFree, 'no NaN leaked from empty / short / NaN sav arrays');
}

// ── S3: empty dasha.sequence returns the empty contract (not a gochara-only graph)
section('S3 — empty dasha.sequence guard');
{
  const r = lifeVectorSeriesVedic({ chart: { ...chart, dasha: { sequence: [] } }, startYear: 1985, endYear: 2065, samplesPerYear: 12 });
  ok(r.years.length === 0, 'empty dasha.sequence → empty contract, not a silent gochara-only chart');
}

// ── Regression: normal window honours [startYear,endYear] exactly + determinism
section('Determinism + window fidelity');
{
  ok(years[0] === 1985 && years[years.length - 1] === 2065, 'normal window spans [startYear, endYear] exactly');
  const again = lifeVectorSeriesVedic({ chart, startYear: 1985, endYear: 2065, samplesPerYear: 12 });
  let identical = again.series.length === series.length;
  for (let s = 0; s < series.length && identical; s++)
    for (let i = 0; i < series[s].values.length; i++)
      if (series[s].values[i] !== again.series[s].values[i]) identical = false;
  ok(identical, 'same chart twice → identical series (deterministic, no Date.now/random)');
}

console.log(`\n──────────────────────────────────────`);
console.log(`  ${PASS} passed · ${FAIL} failed`);
if (FAIL) for (const m of FAILS) console.log('  ✗', m);
process.exit(FAIL ? 1 : 0);
