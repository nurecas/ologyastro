// Vedic Ashtakavarga — bindu (auspicious-point) tables.
//
// The Ashtakavarga ("eight-fold strength") system of Brihat Parashara Hora
// Shastra (Chapters 65–72) reads each planet's strength relative to the
// other six planets PLUS the Lagna. For each contributor X and each
// "beneficiary" Y, BPHS lists the houses (counted from X's natal sign)
// where Y is read as bindu-bestowing — i.e. supportive.
//
// The standard tables yield:
//   BAV (Bhinna Ashtakavarga) — per beneficiary, a 12-element array of
//   bindus, summing the contributions from the 7 contributors (6 planets
//   that aren't the beneficiary itself + the Lagna). Each contributor
//   bestows a bindu on house h (counted from contributor's sign) when h
//   appears in the contributor's bindu-list for that beneficiary.
//
//   SAV (Sarva Ashtakavarga) — sum of the 7 BAVs (Sun..Saturn) per house.
//   Total range 0..56 in theory; practical span ~22-40 per house.
//
// We hardcode the BPHS 7×7 contribution table verbatim. Each cell is the
// list of 1-based house numbers (from the contributor's natal sign) where
// that contributor gives a bindu to the beneficiary. The Lagna row is
// included as a contributor; Lagna does not receive bindus (no BAV-Lagna
// in the SAV total).
//
// Tables source: Parashara, Brihat Parashara Hora Shastra (R. Santhanam
// translation), Ch. 65–72 / "Ashtakavarga Adhyaya" — verified against
// Jagannatha Hora outputs (a reference open-source Jyotish tool).

import { RASHIS } from './data.js';

// BPHS bindu table. Rows = beneficiary, columns = contributor. Each cell
// lists the 1-based houses (from contributor's sign) that give a bindu
// to the beneficiary. Sun..Saturn + Lagna are contributors; only the
// classical 7 (Sun..Saturn) are beneficiaries — Rahu/Ketu have no BAV.
// (The shorthand "X gives bindu to Y in houses [h…]" is the canonical
// form taught in every Parashari textbook.)
const BPHS = {
  Sun: {
    Sun:     [1, 2, 4, 7, 8, 9, 10, 11],
    Moon:    [3, 6, 10, 11],
    Mars:    [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus:   [6, 7, 12],
    Saturn:  [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna:   [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun:     [3, 6, 7, 8, 10, 11],
    Moon:    [1, 3, 6, 7, 10, 11],
    Mars:    [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus:   [3, 4, 5, 7, 9, 10, 11],
    Saturn:  [3, 5, 6, 11],
    Lagna:   [3, 6, 10, 11],
  },
  Mars: {
    Sun:     [3, 5, 6, 10, 11],
    Moon:    [3, 6, 11],
    Mars:    [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus:   [6, 8, 11, 12],
    Saturn:  [1, 4, 7, 8, 9, 10, 11],
    Lagna:   [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun:     [5, 6, 9, 11, 12],
    Moon:    [2, 4, 6, 8, 10, 11],
    Mars:    [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus:   [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn:  [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna:   [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun:     [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon:    [2, 5, 7, 9, 11],
    Mars:    [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus:   [2, 5, 6, 9, 10, 11],
    Saturn:  [3, 5, 6, 12],
    Lagna:   [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun:     [8, 11, 12],
    Moon:    [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars:    [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus:   [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn:  [3, 4, 5, 8, 9, 10, 11],
    Lagna:   [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun:     [1, 2, 4, 7, 8, 10, 11],
    Moon:    [3, 6, 11],
    Mars:    [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus:   [6, 11, 12],
    Saturn:  [3, 5, 6, 11],
    Lagna:   [1, 3, 4, 6, 10, 11],
  },
};

const BENEFICIARIES = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const CONTRIBUTORS  = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Lagna'];

// Compute Bhinna Ashtakavarga (BAV) per beneficiary. Each BAV is a 12-element
// array (sign-indexed 0..11) of bindus.
//
// Algorithm: for every (contributor, beneficiary), BPHS lists the houses
// (1..12) FROM the contributor's sign that give a bindu. We translate each
// of those into a destination sign — contributorSign + (h - 1) mod 12 — and
// add 1 bindu to the beneficiary's BAV at that sign.
export function computeBAV(chart) {
  if (!chart) return null;
  const signOf = {};
  for (const p of chart.planets) signOf[p.name] = p.signIdx;
  signOf.Lagna = chart.lagnaSignIdx;

  const bav = {};
  for (const beneficiary of BENEFICIARIES) {
    const arr = new Array(12).fill(0);
    for (const contributor of CONTRIBUTORS) {
      // Lagna acts as a contributor; planets that aren't in the chart
      // (none, in practice) just don't contribute.
      const cSign = signOf[contributor];
      if (cSign == null) continue;
      const houses = BPHS[beneficiary]?.[contributor] || [];
      for (const h of houses) {
        const target = (cSign + (h - 1)) % 12;
        arr[target] += 1;
      }
    }
    bav[beneficiary] = arr;
  }
  return bav;
}

// Sarvashtakavarga — sum the 7 BAVs sign-by-sign.
export function computeSAV(chart) {
  const bav = computeBAV(chart);
  if (!bav) return null;
  const sav = new Array(12).fill(0);
  for (const name of BENEFICIARIES) {
    const row = bav[name];
    for (let i = 0; i < 12; i++) sav[i] += row[i];
  }
  return sav;
}

// Build the full table for the Strength UI: a row per house (1..12 from
// Lagna) with the SAV total, the per-planet BAV cells, and metadata. Each
// row keys by HOUSE not sign so the natural reading order in the UI is
// "1st house → 12th house".
export function ashtakavargaTable(chart) {
  if (!chart) return null;
  const bav = computeBAV(chart);
  const sav = computeSAV(chart);
  if (!bav || !sav) return null;
  const lagnaSignIdx = chart.lagnaSignIdx;
  const rows = [];
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaSignIdx + (h - 1)) % 12;
    const row = {
      house: h,
      signIdx,
      signName: RASHIS[signIdx].en,
      signGlyph: RASHIS[signIdx].glyph,
      sav: sav[signIdx],
      bav: Object.fromEntries(BENEFICIARIES.map(n => [n, bav[n][signIdx]])),
    };
    rows.push(row);
  }
  // SAV stats useful for UI traffic-light colouring.
  const min = Math.min(...sav);
  const max = Math.max(...sav);
  const total = sav.reduce((a, b) => a + b, 0);
  return {
    rows,
    bav,
    sav,
    minSAV: min,
    maxSAV: max,
    totalSAV: total,
    beneficiaries: BENEFICIARIES,
  };
}
