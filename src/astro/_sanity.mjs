// Quick sanity check — compare computed ecliptic longitudes against known
// astronomical almanac values for a handful of dates.
//
// Run: node src/astro/_sanity.mjs
//
// Expected: each body within 1–2° of the published value.

import { longitudesAtDate, PLANETS } from './ephemeris.js';

function fmt(x) { return x.toFixed(2).padStart(8); }

function run(date, label, expected) {
  const L = longitudesAtDate(date);
  console.log(`\n${label}  (${date.toISOString()})`);
  for (const p of PLANETS) {
    const got = L[p];
    const exp = expected[p];
    const d = exp == null ? null : Math.abs(((got - exp) + 540) % 360 - 180);
    const mark = d == null ? '  ' : (d < 2 ? 'ok' : d < 5 ? '~ ' : 'X ');
    console.log(`  ${p.padEnd(8)}  got ${fmt(got)}   expected ${exp == null ? '     ?   ' : fmt(exp)}   |Δ|=${d == null ? '  ?' : d.toFixed(2)} ${mark}`);
  }
}

// Expected values taken from a common astronomical almanac; tropical,
// geocentric-of-date, degrees 0-360.

// 2000-01-01 00:00 UT: standard J2000 check.
run(new Date('2000-01-01T00:00:00Z'), 'J2000', {
  Sun: 279.86,
  Moon: 217.70,
  Mercury: 271.15,
  Venus: 240.81,
  Mars: 327.56,
  Jupiter: 25.23,
  Saturn: 40.35,
  Uranus: 314.73,
  Neptune: 303.57,
  Pluto: 251.36,
});

// 1999-08-11 11:00 UT (great solar eclipse / grand cross)
run(new Date('1999-08-11T11:00:00Z'), 'Aug 1999 Grand Cross', {
  Sun: 138.71,
  Moon: 138.58,
  Mercury: 156.74,
  Venus: 145.34,
  Mars: 232.05,
  Jupiter: 44.65,
  Saturn: 46.91,
  Uranus: 314.73,
  Neptune: 302.70,
  Pluto: 248.43,
});

// 2020-12-21 18:00 UT — "Great Conjunction" Jupiter-Saturn
run(new Date('2020-12-21T18:00:00Z'), '2020 Great Conjunction', {
  Sun: 270.52,
  Moon: 337.46,
  Mercury: 275.24,
  Venus: 246.49,
  Mars: 22.02,
  Jupiter: 300.33,
  Saturn: 300.45,
  Uranus: 36.57,
  Neptune: 348.28,
  Pluto: 293.62,
});
