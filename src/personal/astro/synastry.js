// -----------------------------------------------------------------------------
// Synastry — cross-chart aspect analysis between two natal charts.
//
// Returns a sorted list of aspects between A's planets and B's planets with
// orb and amplitude. Also surfaces key compatibility signatures in classical
// astrology:
//
//   • Sun–Moon (core compatibility)
//   • Venus–Mars (attraction)
//   • Moon–Moon (emotional rhythm)
//   • Saturn contacts (commitment / karmic gravity)
//   • Composite chart summary (midpoint chart, optional)
// -----------------------------------------------------------------------------

import { ASPECTS } from './aspects.js';
import { PLANETS, AMPLITUDE_ARRAY } from '../../astro/ephemeris.js';

function angDist(a, b) {
  let d = ((a - b) % 360 + 360) % 360;
  return d > 180 ? 360 - d : d;
}
function angMid(a, b) {
  // Circular midpoint of two ecliptic longitudes.
  const ax = Math.cos(a * Math.PI / 180);
  const ay = Math.sin(a * Math.PI / 180);
  const bx = Math.cos(b * Math.PI / 180);
  const by = Math.sin(b * Math.PI / 180);
  const m = Math.atan2(ay + by, ax + bx) * 180 / Math.PI;
  return (m + 360) % 360;
}

// All cross-aspects between the bodies of A and B within orb. Synastry is a
// body-to-body technique — calculated points (Part of Fortune) are personal
// and excluded.
export function crossAspects(natalA, natalB) {
  const out = [];
  const aList = natalA.planets.filter(p => !p.calculatedPoint);
  const bList = natalB.planets.filter(p => !p.calculatedPoint);
  for (const pa of aList) {
    for (const pb of bList) {
      const diff = angDist(pa.lonDeg, pb.lonDeg);
      for (const asp of ASPECTS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          const score = (pa.amplitude + pb.amplitude) * asp.weight * (1 - orb / asp.orb);
          out.push({
            aName: pa.name,
            bName: pb.name,
            aLon: pa.lonDeg,
            bLon: pb.lonDeg,
            aspect: asp,
            orb,
            score,
            exact: orb < 0.2,
          });
        }
      }
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// Classical compatibility signatures — extracted from the cross-aspect list.
export function compatibilityHighlights(cross) {
  const pick = (aName, bName) =>
    cross.filter(c => (c.aName === aName && c.bName === bName) || (c.aName === bName && c.bName === aName));
  return {
    sunMoon:    [...pick('Sun', 'Moon'), ...pick('Moon', 'Sun')],
    venusMars:  [...pick('Venus', 'Mars'), ...pick('Mars', 'Venus')],
    moonMoon:   pick('Moon', 'Moon'),
    sunSun:     pick('Sun', 'Sun'),
    // Saturn contacts to inner planets — weighty & karmic.
    saturn:     cross.filter(c =>
      (c.aName === 'Saturn' && ['Sun','Moon','Venus','Mars','Mercury'].includes(c.bName)) ||
      (c.bName === 'Saturn' && ['Sun','Moon','Venus','Mars','Mercury'].includes(c.aName))
    ),
    // Outer-planet contacts to inner.
    transformational: cross.filter(c => {
      const outer = ['Uranus','Neptune','Pluto'];
      const inner = ['Sun','Moon','Mercury','Venus','Mars'];
      return (outer.includes(c.aName) && inner.includes(c.bName))
          || (outer.includes(c.bName) && inner.includes(c.aName));
    }),
  };
}

// Composite chart (midpoint method) — a single "relationship chart" whose
// planets are the midpoints of A's and B's.
export function compositeChart(natalA, natalB) {
  const planets = PLANETS.map((name, i) => {
    const a = natalA.planets.find(p => p.name === name);
    const b = natalB.planets.find(p => p.name === name);
    return {
      name,
      lonDeg: angMid(a.lonDeg, b.lonDeg),
      amplitude: AMPLITUDE_ARRAY[i],
    };
  });
  const ascDeg = angMid(natalA.ascDeg, natalB.ascDeg);
  const mcDeg  = angMid(natalA.mcDeg, natalB.mcDeg);
  return { planets, ascDeg, mcDeg };
}

// Rough summary score of overall relationship "weight" and tone.
export function synastrySummary(cross) {
  let harmonious = 0, tense = 0, total = 0;
  for (const c of cross) {
    total += c.score;
    if (['Trine', 'Sextile'].includes(c.aspect.name)) harmonious += c.score;
    if (['Square', 'Opposition'].includes(c.aspect.name)) tense += c.score;
    if (c.aspect.name === 'Conjunction') {
      // Conjunctions can go either way — count half to each.
      harmonious += c.score * 0.5;
      tense += c.score * 0.5;
    }
  }
  const balance = total > 0 ? (harmonious - tense) / total : 0;
  let tone;
  if (balance > 0.25) tone = 'flowing';
  else if (balance < -0.25) tone = 'challenging';
  else tone = 'mixed';
  return {
    totalWeight: total,
    harmonious,
    tense,
    balance,
    tone,
    count: cross.length,
  };
}
