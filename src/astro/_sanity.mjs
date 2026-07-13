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

// Expected values are Swiss-Ephemeris (JPL-DE-calibrated) truth for each
// instant — tropical, geocentric-of-date, degrees 0-360 — regenerated via
// scripts/gen-swiss-reference.mjs style probe. (The earlier hand-entered
// "almanac" set had six transcription errors: Aug-1999 Mercury was off 36°,
// 2020 Moon off 20°, etc., which made the Standish fallback look wrong when it
// is in fact accurate to ~0.3° here.)

// 2000-01-01 00:00 UT: standard J2000 check.
run(new Date('2000-01-01T00:00:00Z'), 'J2000', {
  Sun: 279.86,
  Moon: 217.29,
  Mercury: 271.11,
  Venus: 240.96,
  Mars: 327.58,
  Jupiter: 25.23,
  Saturn: 40.41,
  Uranus: 314.78,
  Neptune: 303.18,
  Pluto: 251.44,
});

// 1999-08-11 11:00 UT (great solar eclipse / grand cross)
run(new Date('1999-08-11T11:00:00Z'), 'Aug 1999 Grand Cross', {
  Sun: 138.35,
  Moon: 138.27,
  Mercury: 120.16,
  Venus: 152.16,
  Mars: 226.84,
  Jupiter: 34.68,
  Saturn: 46.88,
  Uranus: 314.67,
  Neptune: 302.55,
  Pluto: 247.75,
});

// 2020-12-21 18:00 UT — "Great Conjunction" Jupiter-Saturn
run(new Date('2020-12-21T18:00:00Z'), '2020 Great Conjunction', {
  Sun: 270.34,
  Moon: 357.71,
  Mercury: 271.25,
  Venus: 247.58,
  Mars: 23.21,
  Jupiter: 300.48,
  Saturn: 300.48,
  Uranus: 36.96,
  Neptune: 348.31,
  Pluto: 293.86,
});
