// Vedic Life Vectors — accuracy test. Swiss-backed (real chart).
// Run: node src/vedic/_lifevectors.mjs

import { initSwiss, isSwissReady, setEphemerisOptions, decimalYearToDate } from '../astro/ephemeris.js';
import { computeVedicChart } from './compute/chart.js';
import { lifeVectorSeriesVedic, VEDIC_VECTORS, VEDIC_DOMAINS } from './compute/lifeVectors.js';
import { currentMaha } from './compute/dasha.js';
import { RASHIS } from './compute/data.js';

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

console.log(`\n──────────────────────────────────────`);
console.log(`  ${PASS} passed · ${FAIL} failed`);
if (FAIL) for (const m of FAILS) console.log('  ✗', m);
process.exit(FAIL ? 1 : 0);
