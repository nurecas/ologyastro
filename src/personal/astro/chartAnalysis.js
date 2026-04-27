// -----------------------------------------------------------------------------
// Natal chart structural analysis.
//
// Produces at-a-glance descriptors of a natal chart:
//   • element / modality / hemisphere distribution (amplitude-weighted)
//   • detected classical patterns: stellium, grand trine, T-square,
//     grand cross, yod, kite
//   • dominant planet / sign / house
//   • Sun · Moon · Rising banner
//
// All computation is deterministic and traceable — no opinions, just geometry
// on the natal positions already computed in natal.js.
// -----------------------------------------------------------------------------

import { PLANETS, AMPLITUDE_ARRAY } from '../../astro/ephemeris.js';
import { SIGN_INFO } from './interpretation.js';

const SIGNS_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// Unsigned angular distance in degrees, folded to [0, 180].
function angDist(a, b) {
  let d = ((a - b) % 360 + 360) % 360;
  return d > 180 ? 360 - d : d;
}
function signIndex(lonDeg) {
  return Math.floor(((lonDeg % 360) + 360) % 360 / 30);
}

// Phase 2: element / mode / hemisphere distributions use only the classical
// 10 per brief ("only classical 10 in element/mode distributions —
// asteroids and nodes are additive, not redistributing"). Dominance scoring
// below includes every body in natal.planets, extras included.
function classicalOnly(natal) {
  return natal.planets.filter(p => p.classical !== false);
}

// -----------------------------------------------------------------------------
// Distributions
// -----------------------------------------------------------------------------
export function elementDistribution(natal) {
  const out = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const p of classicalOnly(natal)) {
    const el = SIGN_INFO[SIGNS_ORDER[signIndex(p.lonDeg)]].element;
    out[el] += p.amplitude;
  }
  const total = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = out[k] / total;
  return out;
}

export function modeDistribution(natal) {
  const out = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of classicalOnly(natal)) {
    const mo = SIGN_INFO[SIGNS_ORDER[signIndex(p.lonDeg)]].mode;
    out[mo] += p.amplitude;
  }
  const total = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = out[k] / total;
  return out;
}

// Hemisphere emphasis — where the weight sits around the wheel.
// East (houses 10–12–1–2–3): self-assertion.
// West (houses 4–5–6–7–8–9): other-oriented.
// North / below-horizon (houses 1–6): introverted / personal.
// South / above-horizon (houses 7–12): externalised / public.
// (Conventions vary; we use the classical east=ASC-side, south=MC-side.)
export function hemisphereDistribution(natal) {
  const out = { east: 0, west: 0, north: 0, south: 0 };
  for (const p of classicalOnly(natal)) {
    const h = p.house;
    // East/West:
    if (h === 10 || h === 11 || h === 12 || h === 1 || h === 2 || h === 3) out.east += p.amplitude;
    else out.west += p.amplitude;
    // North/South (below/above horizon):
    if (h >= 1 && h <= 6) out.north += p.amplitude;
    else out.south += p.amplitude;
  }
  const totalEW = out.east + out.west || 1;
  const totalNS = out.north + out.south || 1;
  out.east /= totalEW; out.west /= totalEW;
  out.north /= totalNS; out.south /= totalNS;
  return out;
}

// -----------------------------------------------------------------------------
// Pattern detection
// -----------------------------------------------------------------------------

// STELLIUM — 3+ planets in the same sign (with combined amplitude threshold).
// Traditional definition uses the classical 7-10; extras don't count toward
// the conjunction cluster (they'd inflate every chart with stelliums).
export function stelliums(natal) {
  const bySign = new Array(12).fill(null).map(() => []);
  for (const p of classicalOnly(natal)) bySign[signIndex(p.lonDeg)].push(p);
  return bySign
    .map((list, i) => ({ sign: SIGNS_ORDER[i], planets: list.map(p => p.name) }))
    .filter(x => x.planets.length >= 3);
}

// GRAND TRINE — three planets mutually ~120° apart AND all in the same
// element. We intentionally require same-element: a geometric-only trine
// where orb-slip puts one planet into a different element is "out-of-sign"
// and classically does not count as a Grand Trine.
export function grandTrines(natal) {
  const found = [];
  const ps = classicalOnly(natal);
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++)
      for (let k = j + 1; k < ps.length; k++) {
        const d1 = angDist(ps[i].lonDeg, ps[j].lonDeg);
        const d2 = angDist(ps[j].lonDeg, ps[k].lonDeg);
        const d3 = angDist(ps[i].lonDeg, ps[k].lonDeg);
        if (Math.abs(d1 - 120) > 6 || Math.abs(d2 - 120) > 6 || Math.abs(d3 - 120) > 6) continue;
        const e1 = SIGN_INFO[SIGNS_ORDER[signIndex(ps[i].lonDeg)]].element;
        const e2 = SIGN_INFO[SIGNS_ORDER[signIndex(ps[j].lonDeg)]].element;
        const e3 = SIGN_INFO[SIGNS_ORDER[signIndex(ps[k].lonDeg)]].element;
        if (e1 !== e2 || e2 !== e3) continue; // classical: same element required
        found.push({ planets: [ps[i].name, ps[j].name, ps[k].name], element: e1 });
      }
  return found;
}

// T-SQUARE — opposition + two squares to a third planet.
// Includes the modality of the three planets' signs: if all three share a
// modality, the t-square carries that modality's character (classically:
// cardinal t-squares push outward action, fixed t-squares demand endurance,
// mutable t-squares demand adaptation).
export function tSquares(natal) {
  const out = [];
  const ps = classicalOnly(natal);
  const modeOf = (lon) => SIGN_INFO[SIGNS_ORDER[signIndex(lon)]].mode;
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      if (Math.abs(angDist(ps[i].lonDeg, ps[j].lonDeg) - 180) > 6) continue;
      for (let k = 0; k < ps.length; k++) {
        if (k === i || k === j) continue;
        if (Math.abs(angDist(ps[i].lonDeg, ps[k].lonDeg) - 90) <= 6 &&
            Math.abs(angDist(ps[j].lonDeg, ps[k].lonDeg) - 90) <= 6) {
          const m1 = modeOf(ps[i].lonDeg);
          const m2 = modeOf(ps[j].lonDeg);
          const m3 = modeOf(ps[k].lonDeg);
          const modality = (m1 === m2 && m2 === m3) ? m1 : 'mixed';
          out.push({
            opposition: [ps[i].name, ps[j].name],
            apex: ps[k].name,
            modality,
          });
        }
      }
    }
  return out;
}

// GRAND CROSS — two oppositions + four squares (four planets in a cross).
export function grandCrosses(natal) {
  const ps = classicalOnly(natal);
  const found = [];
  // Find all oppositions.
  const opps = [];
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++)
      if (Math.abs(angDist(ps[i].lonDeg, ps[j].lonDeg) - 180) <= 6)
        opps.push([i, j]);
  // Find pairs of oppositions that square each other.
  for (let a = 0; a < opps.length; a++)
    for (let b = a + 1; b < opps.length; b++) {
      const [i1, j1] = opps[a];
      const [i2, j2] = opps[b];
      // All 4 cross-members must be distinct.
      const all = new Set([i1, j1, i2, j2]);
      if (all.size !== 4) continue;
      const sq1 = Math.abs(angDist(ps[i1].lonDeg, ps[i2].lonDeg) - 90);
      const sq2 = Math.abs(angDist(ps[i1].lonDeg, ps[j2].lonDeg) - 90);
      const sq3 = Math.abs(angDist(ps[j1].lonDeg, ps[i2].lonDeg) - 90);
      const sq4 = Math.abs(angDist(ps[j1].lonDeg, ps[j2].lonDeg) - 90);
      if (sq1 <= 6 && sq2 <= 6 && sq3 <= 6 && sq4 <= 6) {
        const modeOf = (lon) => SIGN_INFO[SIGNS_ORDER[signIndex(lon)]].mode;
        const modes = [
          modeOf(ps[i1].lonDeg), modeOf(ps[j1].lonDeg),
          modeOf(ps[i2].lonDeg), modeOf(ps[j2].lonDeg),
        ];
        const modality = modes.every(m => m === modes[0]) ? modes[0] : 'mixed';
        found.push({
          planets: [ps[i1].name, ps[j1].name, ps[i2].name, ps[j2].name],
          modality,
        });
      }
    }
  return found;
}

// YOD — two planets in sextile, both quincunx (150°) a third planet (apex).
export function yods(natal) {
  const out = [];
  const ps = classicalOnly(natal);
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      if (Math.abs(angDist(ps[i].lonDeg, ps[j].lonDeg) - 60) > 4) continue;
      for (let k = 0; k < ps.length; k++) {
        if (k === i || k === j) continue;
        if (Math.abs(angDist(ps[i].lonDeg, ps[k].lonDeg) - 150) <= 4 &&
            Math.abs(angDist(ps[j].lonDeg, ps[k].lonDeg) - 150) <= 4) {
          out.push({ base: [ps[i].name, ps[j].name], apex: ps[k].name });
        }
      }
    }
  return out;
}

// KITE — a grand trine + a fourth planet opposing one vertex (and sextile the other two).
export function kites(natal) {
  const trines = grandTrines(natal);
  if (!trines.length) return [];
  const classical = classicalOnly(natal);
  const found = [];
  for (const t of trines) {
    const tPlanets = t.planets.map(n => classical.find(p => p.name === n));
    for (const p of classical) {
      if (tPlanets.some(tp => tp.name === p.name)) continue;
      for (const apex of tPlanets) {
        const opp = Math.abs(angDist(p.lonDeg, apex.lonDeg) - 180);
        if (opp > 6) continue;
        const others = tPlanets.filter(tp => tp.name !== apex.name);
        const sx1 = Math.abs(angDist(p.lonDeg, others[0].lonDeg) - 60);
        const sx2 = Math.abs(angDist(p.lonDeg, others[1].lonDeg) - 60);
        if (sx1 <= 6 && sx2 <= 6) {
          found.push({ trine: t.planets, apex: apex.name, tail: p.name });
        }
      }
    }
  }
  return found;
}

// -----------------------------------------------------------------------------
// Dominants
// -----------------------------------------------------------------------------

// Planet score: amplitude × aspect-count × angularity (within 10° of ASC/MC/DC/IC).
export function planetDominance(natal) {
  const angles = [natal.ascDeg, natal.mcDeg, natal.dscDeg, natal.icDeg];
  return natal.planets
    .map(p => {
      let aspectCount = 0;
      for (const q of natal.planets) {
        if (q.name === p.name) continue;
        const d = angDist(p.lonDeg, q.lonDeg);
        for (const a of [0, 60, 90, 120, 180]) {
          if (Math.abs(d - a) <= 7) { aspectCount++; break; }
        }
      }
      const nearAngle = Math.min(...angles.map(A => angDist(p.lonDeg, A)));
      const angular = nearAngle <= 10 ? (1 + (10 - nearAngle) / 10) : 1;
      const score = p.amplitude * (1 + aspectCount * 0.2) * angular;
      return { name: p.name, score, aspectCount, nearAngle };
    })
    .sort((a, b) => b.score - a.score);
}

// Dominant sign: sum of amplitudes of planets in each sign, plus the
// sign containing the Ascendant (weighted heavily).
export function signDominance(natal) {
  const scores = new Array(12).fill(0);
  for (const p of natal.planets) scores[signIndex(p.lonDeg)] += p.amplitude;
  scores[signIndex(natal.ascDeg)] += 1.0;
  scores[signIndex(natal.mcDeg)] += 0.6;
  return scores
    .map((s, i) => ({ sign: SIGNS_ORDER[i], score: s }))
    .sort((a, b) => b.score - a.score);
}

// House dominance — sum of amplitudes by house.
export function houseDominance(natal) {
  const scores = new Array(13).fill(0); // 1..12
  for (const p of natal.planets) scores[p.house] += p.amplitude;
  return scores
    .map((s, i) => i === 0 ? null : { house: i, score: s })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

// -----------------------------------------------------------------------------
// Chart shape — the seven classical Marc Edmund Jones types.
//
//   Bundle     — planets all within 120° (one-third of the wheel)
//   Bowl       — planets all within 180° (one hemisphere)
//   Bucket     — a Bowl + one isolated planet ("handle") in the empty half
//   Locomotive — planets span 240°, leaving 120° empty
//   Seesaw     — two opposing groups separated by two empty 60°+ arcs
//   Splash     — planets evenly distributed, no gap exceeds 60°
//   Splay      — asymmetric clusters, doesn't fit any other type
//
// Classified by inspecting the angular gaps between consecutive planets
// around the sorted wheel.
// -----------------------------------------------------------------------------
export function chartShape(natal) {
  // Marc Jones shapes were formulated on the classical bodies; extras would
  // over-cluster every chart into Splash. Use only the 10-planet set.
  const lons = classicalOnly(natal).map(p => ((p.lonDeg % 360) + 360) % 360).sort((a, b) => a - b);
  const N = lons.length;

  // gaps[i] = angular arc after planet i going clockwise to the next.
  // For the last planet the gap wraps to the first + 360.
  const gaps = [];
  for (let i = 0; i < N; i++) {
    const next = lons[(i + 1) % N];
    let g = next - lons[i];
    if (g <= 0) g += 360;
    gaps.push(g);
  }
  const sortedGaps = [...gaps].sort((a, b) => b - a);
  const g1 = sortedGaps[0];
  const g2 = sortedGaps[1];

  // Bundle: all within 120° arc → empty arc > 240°.
  if (g1 >= 240) return 'Bundle';
  // Bowl: all within 180° → empty arc > 180° but < 240°.
  if (g1 >= 180) return 'Bowl';

  // Bucket: look for a "handle" — a single planet flanked by gaps ≥ 60° on
  // BOTH sides, while the remaining planets span ≤ 190° (the bowl).
  for (let i = 0; i < N; i++) {
    const leftGap  = gaps[(i - 1 + N) % N];
    const rightGap = gaps[i];
    if (leftGap < 60 || rightGap < 60) continue;
    // "Others" are the N-1 remaining planets. Compute their max gap.
    const others = lons.slice(0, i).concat(lons.slice(i + 1));
    let otherMax = 0;
    for (let j = 0; j < others.length; j++) {
      const next = others[(j + 1) % others.length];
      let og = next - others[j];
      if (og <= 0) og += 360;
      if (og > otherMax) otherMax = og;
    }
    // Others cluster within ≤ 190° if their max gap ≥ 170°.
    if (otherMax >= 170) return 'Bucket';
  }

  // Locomotive: single gap ≥ 120° (and not Bowl).
  if (g1 >= 120) return 'Locomotive';
  // Seesaw: two gaps ≥ 60° (two empty arcs opposite each other).
  if (g1 >= 60 && g2 >= 60) return 'Seesaw';
  // Splash: no large gap.
  if (g1 < 60) return 'Splash';
  return 'Splay';
}

// -----------------------------------------------------------------------------
// One-shot summary used by the Profile component.
// -----------------------------------------------------------------------------
export function analyzeChart(natal) {
  const sunIdx = signIndex(natal.planets[0].lonDeg);
  const moonIdx = signIndex(natal.planets[1].lonDeg);
  const ascIdx = signIndex(natal.ascDeg);
  return {
    sunSign:    SIGNS_ORDER[sunIdx],
    moonSign:   SIGNS_ORDER[moonIdx],
    risingSign: SIGNS_ORDER[ascIdx],
    elements:   elementDistribution(natal),
    modes:      modeDistribution(natal),
    hemispheres: hemisphereDistribution(natal),
    patterns: {
      stelliums:    stelliums(natal),
      grandTrines:  grandTrines(natal),
      tSquares:     tSquares(natal),
      grandCrosses: grandCrosses(natal),
      yods:         yods(natal),
      kites:        kites(natal),
    },
    dominantPlanets: planetDominance(natal).slice(0, 3),
    dominantSigns:   signDominance(natal).slice(0, 3),
    dominantHouses:  houseDominance(natal).slice(0, 3),
    shape: chartShape(natal),
  };
}
