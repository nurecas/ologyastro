// One-shot utility: dump Swiss longitudes at the 10 Phase-1 reference epochs
// so we can embed them as the test "gold" set. Swiss itself is the
// sub-arcsecond-precise reference (see NOTES.md); hardcoding its output lets
// us verify the WASM port stays faithful across future upgrades without a
// live JPL Horizons query. Run:  node scripts/gen-swiss-reference.mjs
import SwissEph from 'swisseph-wasm';

const EPOCHS = [
  ['1500-01-01', Date.UTC(1500, 0, 1)],
  ['1700-01-01', Date.UTC(1700, 0, 1)],
  ['1850-06-15', Date.UTC(1850, 5, 15)],
  ['1950-01-01', Date.UTC(1950, 0, 1)],
  ['J2000',      Date.UTC(2000, 0, 1)],
  ['1999-08-11', Date.UTC(1999, 7, 11, 11, 0, 0)],
  ['2020-12-21', Date.UTC(2020, 11, 21, 18, 0, 0)],
  ['2025-06-15', Date.UTC(2025, 5, 15)],
  ['2050-01-01', Date.UTC(2050, 0, 1)],
  ['2080-01-01', Date.UTC(2080, 0, 1)],
];

const swe = new SwissEph();
await swe.initSwissEph();

const dateToJD = (ms) => {
  const d = new Date(ms);
  const Y = d.getUTCFullYear(), M = d.getUTCMonth() + 1;
  const D = d.getUTCDate()
    + d.getUTCHours() / 24
    + d.getUTCMinutes() / 1440
    + d.getUTCSeconds() / 86400;
  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
};

const NAMES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const IDS = [swe.SE_SUN,swe.SE_MOON,swe.SE_MERCURY,swe.SE_VENUS,swe.SE_MARS,swe.SE_JUPITER,swe.SE_SATURN,swe.SE_URANUS,swe.SE_NEPTUNE,swe.SE_PLUTO];
const flag = swe.SEFLG_SWIEPH;

console.log('export const SWISS_REFERENCE = [');
for (const [label, ms] of EPOCHS) {
  const jd = dateToJD(ms);
  const pos = {};
  for (let i = 0; i < NAMES.length; i++) {
    const r = swe.calc_ut(jd, IDS[i], flag);
    pos[NAMES[i]] = +r[0].toFixed(6);
  }
  console.log(`  { label: ${JSON.stringify(label)}, ms: ${ms}, positions: ${JSON.stringify(pos)} },`);
}
console.log('];');
swe.close();
