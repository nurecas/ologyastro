// Vedic — Arudha Lagna and Upapada Lagna.
// These are reflective points (not bodies) that reveal how the chart's
// themes externally project. Both follow the same Jaimini formula, just
// applied to different houses (1st for Arudha; 12th for Upapada).
//
// Formula:
//   1. Find the lord of the reference house.
//   2. Count how many houses forward the lord sits.
//   3. Count that same number of houses forward from the lord — that sign
//      is the Arudha (or Upapada) of that house.
//   4. Special rule: if the result falls in the SAME house as the
//      reference, or in the 7th from it, advance by 10 more houses to
//      avoid degeneracy (per Parashara/Jaimini commentary).

import { RASHIS } from './data.js';

// Generic — given a chart and a 1-based house number, return the Arudha
// pada (a sign 0..11) of that house.
export function arudhaPadaOfHouse(chart, house) {
  const houseSign = (chart.lagnaSignIdx + (house - 1)) % 12;
  const lord = RASHIS[houseSign].ruler;
  const lp = chart.planets.find(p => p.name === lord);
  if (!lp) return null;
  // How many houses forward the lord sits from `houseSign`.
  const n = ((lp.signIdx - houseSign + 12) % 12);
  // Apply the same forward shift from the lord's sign.
  let arudha = (lp.signIdx + n) % 12;
  // Degeneracy fix — per BPHS Ch. 13 v. 1-7 ("दशम्" = "10th from there"):
  // when the result coincides with the reference house OR its 7th, take
  // the 10th sign FROM the result. "10th from X" in Vedic 1-indexed
  // counting (X = 1st) is X + 9 in 0-indexed sign math, NOT X + 10. The
  // off-by-one matters: for an Aries lagna with Mars in Aries the true
  // AL is Capricorn (10th from Aries), not Aquarius (which would be 11th).
  // Cross-checked against Sanjay Rath ("Crux of Vedic Astrology"),
  // K.N. Rao, and Phaladeepika commentary.
  const ref = houseSign;
  if (arudha === ref || arudha === (ref + 6) % 12) {
    arudha = (arudha + 9) % 12;
  }
  return arudha;
}

// Arudha Lagna (AL or A1) — the projected image of the self.
export function arudhaLagna(chart) {
  const sign = arudhaPadaOfHouse(chart, 1);
  if (sign == null) return null;
  return {
    signIdx: sign,
    sign: RASHIS[sign].en,
    signSa: RASHIS[sign].sa,
    house: ((sign - chart.lagnaSignIdx + 12) % 12) + 1,
    blurb: 'Arudha Lagna — how the world sees you, the visible image of self separate from inner identity (the Lagna).',
  };
}

// Upapada Lagna (UL) — the Arudha of the 12th house, classically the
// indicator of marriage and committed long-term partnership.
export function upapadaLagna(chart) {
  const sign = arudhaPadaOfHouse(chart, 12);
  if (sign == null) return null;
  return {
    signIdx: sign,
    sign: RASHIS[sign].en,
    signSa: RASHIS[sign].sa,
    house: ((sign - chart.lagnaSignIdx + 12) % 12) + 1,
    blurb: 'Upapada Lagna — Arudha of the 12th house, classically read as the indicator of long-term partnership and the spouse\'s image.',
  };
}

// All Arudha padas A1..A12 — sometimes useful for advanced reading. A1 is
// the Arudha Lagna; A7 is the Darapada (relating to spouse/conflict).
export function allArudhaPadas(chart) {
  const out = {};
  for (let h = 1; h <= 12; h++) {
    const sign = arudhaPadaOfHouse(chart, h);
    if (sign != null) {
      out['A' + h] = { signIdx: sign, sign: RASHIS[sign].en };
    }
  }
  return out;
}
