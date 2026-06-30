// Vedic Argala — interventional houses.
//
// From any reference sign, certain other signs exert "argala" (intervention,
// arresting force) on it. Planets sitting in those signs influence the
// reference. Other signs exert "virodha argala" — counter-intervention which
// can cancel the primary argala.
//
// Sources: Brihat Parashara Hora Shastra, Ch. 27 (Argala Adhyaya); Sanjay
// Rath's Crux of Vedic Astrology. The classical primary argalas are 2nd,
// 4th, 5th and 11th from the reference. The 3rd is read as a secondary or
// "weak" argala in some traditions; we surface it as a separate column. The
// virodha argalas counter the primary 2/4/5/11 from the OPPOSITE direction —
// 12th counters 2nd, 10th counters 4th, 9th counters 5th, 3rd counters 11th.
//
// `argalaOn(chart, fromSignIdx)` returns:
//   {
//     fromSign: 0..11,
//     primary: [{ kind: '2nd' | '4th' | '5th' | '11th', sign, house,
//                 planets: [planet names], virodhaSign, virodhaPlanets,
//                 cancelled: boolean }],
//     secondary: [{ kind: '3rd', ... }],
//   }
//
// `cancelled` is true when the virodha sign holds at least as many planets
// (counting Rahu/Ketu) as the primary sign — the classical rule of thumb.

import { RASHIS } from './data.js';

// House offsets counted from the reference sign — 0-based, so "2nd from"
// means signIdx + 1, "4th from" means signIdx + 3, etc.
const PRIMARY = [
  { kind: '2nd',  step:  1, virodhaStep: 11 },   // virodha 12th (step 11)
  { kind: '4th',  step:  3, virodhaStep:  9 },   // virodha 10th (step 9)
  { kind: '5th',  step:  4, virodhaStep:  8 },   // virodha  9th (step 8)
  { kind: '11th', step: 10, virodhaStep:  2 },   // virodha  3rd (step 2)
];
const SECONDARY = [
  { kind: '3rd',  step:  2, virodhaStep:  null }, // 3rd is itself counter to 11th
];

// Build the lookup of planets per sign once per call so we don't re-scan
// for each argala house.
function planetsBySignMap(chart) {
  const map = Array.from({ length: 12 }, () => []);
  for (const p of chart.planets) map[p.signIdx].push(p.name);
  return map;
}

function houseFromLagna(lagnaSignIdx, signIdx) {
  return ((signIdx - lagnaSignIdx + 12) % 12) + 1;
}

function buildEntry(rule, fromSignIdx, lagnaSignIdx, planetMap) {
  const sign = (fromSignIdx + rule.step) % 12;
  const planets = planetMap[sign];
  const out = {
    kind: rule.kind,
    sign,
    signName: RASHIS[sign].en,
    house: houseFromLagna(lagnaSignIdx, sign),
    planets,
  };
  if (rule.virodhaStep != null) {
    const vSign = (fromSignIdx + rule.virodhaStep) % 12;
    const vPlanets = planetMap[vSign];
    out.virodhaSign     = vSign;
    out.virodhaSignName = RASHIS[vSign].en;
    out.virodhaHouse    = houseFromLagna(lagnaSignIdx, vSign);
    out.virodhaPlanets  = vPlanets;
    // Classical: argala is "fully cancelled" when virodha holds ≥ as many
    // planets as the primary; partially cancelled when fewer.
    out.cancelled = planets.length > 0 && vPlanets.length >= planets.length;
  }
  return out;
}

// Public entry — given a reference sign (0..11), return primary + secondary
// argala entries with their occupant planets and virodha state.
export function argalaOn(chart, fromSignIdx) {
  if (!chart) return null;
  const planetMap = planetsBySignMap(chart);
  return {
    fromSign: fromSignIdx,
    fromSignName: RASHIS[fromSignIdx].en,
    primary:   PRIMARY  .map(r => buildEntry(r, fromSignIdx, chart.lagnaSignIdx, planetMap)),
    secondary: SECONDARY.map(r => buildEntry(r, fromSignIdx, chart.lagnaSignIdx, planetMap)),
  };
}

// Convenience: argala from each of the 12 houses-of-the-Lagna (so callers
// can render the full table without 12 separate calls).
export function argalaTable(chart) {
  if (!chart) return [];
  const out = [];
  for (let h = 1; h <= 12; h++) {
    const sign = (chart.lagnaSignIdx + (h - 1)) % 12;
    out.push({
      house: h,
      sign,
      signName: RASHIS[sign].en,
      ...argalaOn(chart, sign),
    });
  }
  return out;
}
