// Vedic drishti (sign-based aspects).
// Whole-sign system: every planet aspects its 7th house counted from where
// it sits. Mars adds 4th + 8th, Jupiter adds 5th + 9th, Saturn adds 3rd
// + 10th. Rahu and Ketu by Parashara: 5th, 7th, 9th.
// Aspect counts are 1-based ("nth house from"): 7 means the opposite sign;
// 4 means three signs forward; etc.

const SPECIAL = {
  Mars:    [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn:  [3, 7, 10],
  Rahu:    [5, 7, 9],
  Ketu:    [5, 7, 9],
};
const DEFAULT_ASPECTS = [7];

// `housesAspectedBy` returns the array of sign-indices (0-based) that the
// planet at signIdx aspects, given its name.
export function housesAspectedBy(planet, signIdx) {
  const aspects = SPECIAL[planet] || DEFAULT_ASPECTS;
  return aspects.map(n => (signIdx + (n - 1)) % 12);
}

// ---------------------------------------------------------------------------
// Jaimini Rashi Drishti — sign-on-sign aspects, distinct from the planet-
// based Graha Drishti above.
//   Movable signs (chara) aspect Fixed signs except the 2nd from itself
//                              (the immediately-following sign).
//   Fixed signs (sthira) aspect Movable signs except the 12th from itself
//                              (the immediately-preceding sign).
//   Dual signs (dvisvabhava) aspect the other 3 Dual signs.
// ---------------------------------------------------------------------------
const SIGN_CATEGORY = ['M','F','D','M','F','D','M','F','D','M','F','D'];

export function rashiDrishtiOf(signIdx) {
  const cat = SIGN_CATEGORY[signIdx];
  const targetCat = cat === 'M' ? 'F' : cat === 'F' ? 'M' : 'D';
  const out = [];
  for (let i = 0; i < 12; i++) {
    if (i === signIdx) continue;
    if (SIGN_CATEGORY[i] !== targetCat) continue;
    if (cat === 'M' && i === (signIdx + 1) % 12)  continue;  // 2nd from movable
    if (cat === 'F' && i === (signIdx + 11) % 12) continue;  // 12th from fixed
    out.push(i);
  }
  return out;
}

// Build a sign-aspect map for the chart's 12 occupied signs — for each
// sign that holds at least one planet (or the Lagna), list which signs it
// aspects and what planets sit there.
export function rashiAspectMap(chart) {
  const occupied = new Set([chart.lagnaSignIdx, ...chart.planets.map(p => p.signIdx)]);
  const out = [];
  for (const fromSign of [...occupied].sort((a, b) => a - b)) {
    const targets = rashiDrishtiOf(fromSign);
    out.push({
      fromSign,
      fromHouse: ((fromSign - chart.lagnaSignIdx + 12) % 12) + 1,
      targets: targets.map(s => ({
        sign: s,
        house: ((s - chart.lagnaSignIdx + 12) % 12) + 1,
        planetsThere: chart.planets.filter(q => q.signIdx === s).map(q => q.name),
      })),
    });
  }
  return out;
}

// Build the full aspect map for a chart — for each planet, list the signs
// (and their associated houses) it aspects, plus the planets currently in
// those signs.
export function aspectMap(chart) {
  const out = [];
  for (const p of chart.planets) {
    const targets = housesAspectedBy(p.name, p.signIdx);
    out.push({
      from: p.name,
      fromSign: p.signIdx,
      fromHouse: p.house,
      targets: targets.map(s => ({
        sign: s,
        house: ((s - chart.lagnaSignIdx + 12) % 12) + 1,
        planetsThere: chart.planets.filter(q => q.signIdx === s && q.name !== p.name).map(q => q.name),
      })),
    });
  }
  return out;
}
