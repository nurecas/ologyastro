// Vedic — divisional charts (vargas).
// 15 standard vargas per Brihat Parashara Hora Shastra. Each takes a sidereal
// longitude and returns the resulting sign in that divisional scheme. The
// chart-level entry computeVarga(chart, divisor) builds a full divisional
// chart (Lagna + planets in their divisional signs) suitable for rendering
// in the same North/South Indian components as D-1.

import { RASHIS } from './data.js';

function norm360(x) { let y = x % 360; if (y < 0) y += 360; return y; }

// --- Divisional formulas ---------------------------------------------------
// Each function takes (natalSignIdx 0..11, withinDeg 0..30) and returns
// the divisional sign 0..11.

function d1(sign)            { return sign; }                                   // Rasi
function d2(sign, within) {
  // 2 halves of 15°. Odd signs: 1st = Leo (Sun), 2nd = Cancer (Moon). Even
  // signs: 1st = Cancer, 2nd = Leo. Result is always Leo or Cancer.
  const part = Math.floor(within / 15);
  const odd = sign % 2 === 0;
  if (odd) return part === 0 ? 4 : 3;
  else     return part === 0 ? 3 : 4;
}
function d3(sign, within) {
  // 3 × 10°. Same sign / 5th / 9th — i.e., the same triplicity (element).
  const part = Math.floor(within / 10);
  return (sign + [0, 4, 8][part]) % 12;
}
function d4(sign, within) {
  // 4 × 7.5°. Always lands in a kendra of the natal sign (1, 4, 7, 10).
  const part = Math.floor(within / 7.5);
  return (sign + [0, 3, 6, 9][part]) % 12;
}
function d7(sign, within) {
  // 7 × ~4.286°. Odd: starts from same sign. Even: starts from 7th from same.
  const part = Math.floor(within / (30 / 7));
  const odd = sign % 2 === 0;
  const start = odd ? sign : (sign + 6) % 12;
  return (start + part) % 12;
}
function d9(sign, within) {
  // 9 × ~3.333° (= one nakshatra-pada).
  // Movable (chara): start from same sign. Fixed (sthira): start from 9th
  // from same. Dual (dvisvabhava): start from 5th from same.
  const part = Math.floor(within / (30 / 9));
  const cat = sign % 3; // 0=movable, 1=fixed, 2=dual (in standard Vedic order)
  const startOffset = cat === 0 ? 0 : cat === 1 ? 8 : 4;
  return (sign + startOffset + part) % 12;
}
function d10(sign, within) {
  // 10 × 3°. Odd: same sign. Even: 9th from same.
  const part = Math.floor(within / 3);
  const odd = sign % 2 === 0;
  const start = odd ? sign : (sign + 8) % 12;
  return (start + part) % 12;
}
function d12(sign, within) {
  // 12 × 2.5°. Always start from same sign.
  const part = Math.floor(within / 2.5);
  return (sign + part) % 12;
}
function d16(sign, within) {
  // 16 × 1.875°. Movable: starts Aries (0); Fixed: Leo (4); Dual: Sagittarius (8).
  const part = Math.floor(within / (30 / 16));
  const cat = sign % 3;
  const start = cat === 0 ? 0 : cat === 1 ? 4 : 8;
  return (start + part) % 12;
}
function d20(sign, within) {
  // 20 × 1.5°. Movable: Aries; Fixed: Sagittarius; Dual: Leo.
  const part = Math.floor(within / 1.5);
  const cat = sign % 3;
  const start = cat === 0 ? 0 : cat === 1 ? 8 : 4;
  return (start + part) % 12;
}
function d24(sign, within) {
  // 24 × 1.25°. Odd: starts Leo (4). Even: starts Cancer (3).
  const part = Math.floor(within / 1.25);
  const odd = sign % 2 === 0;
  const start = odd ? 4 : 3;
  return (start + part) % 12;
}
function d27(sign, within) {
  // 27 × ~1.111° = one nakshatra. By element / triplicity.
  const part = Math.floor(within / (30 / 27));
  // Fire: starts Aries (0); Earth: Cancer (3); Air: Libra (6); Water: Capricorn (9).
  const elementStarts = [0, 3, 6, 9];
  const start = elementStarts[sign % 4];
  return (start + part) % 12;
}
function d30(sign, within) {
  // Special — irregular degree boundaries → planet ownership → sign.
  // Per BPHS Ch.6 v.22-24.
  const odd = sign % 2 === 0;
  if (odd) {
    if (within < 5)  return 0;   // Mars → Aries
    if (within < 10) return 10;  // Saturn → Aquarius
    if (within < 18) return 8;   // Jupiter → Sagittarius
    if (within < 25) return 2;   // Mercury → Gemini
    return 6;                    // Venus → Libra
  } else {
    if (within < 5)  return 1;   // Venus → Taurus
    if (within < 12) return 5;   // Mercury → Virgo
    if (within < 20) return 11;  // Jupiter → Pisces
    if (within < 25) return 9;   // Saturn → Capricorn
    return 7;                    // Mars → Scorpio
  }
}
function d40(sign, within) {
  // 40 × 0.75°. Odd: starts Aries. Even: starts Libra (6).
  const part = Math.floor(within / 0.75);
  const odd = sign % 2 === 0;
  const start = odd ? 0 : 6;
  return (start + part) % 12;
}
function d45(sign, within) {
  // 45 × ~0.667°. Movable: starts Aries; Fixed: Leo (4); Dual: Sagittarius (8).
  const part = Math.floor(within / (30 / 45));
  const cat = sign % 3;
  const start = cat === 0 ? 0 : cat === 1 ? 4 : 8;
  return (start + part) % 12;
}
function d60(sign, within) {
  // 60 × 0.5°. Each part advances the sign by one. The standard rule
  // (Parashara) walks forward through signs starting from the natal sign.
  // Some traditions reverse for even signs; we use the uniform forward
  // rule used by most modern software (Jagannatha Hora etc.).
  const part = Math.floor(within / 0.5);
  return (sign + part) % 12;
}

// Dispatch table — every supported divisor maps to its sign function.
const VARGA_FN = {
  1: d1, 2: d2, 3: d3, 4: d4, 7: d7, 9: d9, 10: d10, 12: d12,
  16: d16, 20: d20, 24: d24, 27: d27, 30: d30, 40: d40, 45: d45, 60: d60,
};

// Public — given a sidereal longitude and a varga divisor, return the
// divisional sign 0..11.
export function vargaSignOf(lonDeg, divisor) {
  const fn = VARGA_FN[divisor];
  if (!fn) return null;
  const lon = norm360(lonDeg);
  const sign = Math.floor(lon / 30);
  const within = lon - sign * 30;
  return fn(sign, within);
}

// Display metadata for each varga — name, Sanskrit term, life domain.
export const VARGA_INFO = [
  { d:  1, name: 'Rasi',           sa: 'Rāśi',           area: 'overall life · the body',                  importance: 'foundational' },
  { d:  2, name: 'Hora',           sa: 'Horā',           area: 'wealth · accumulation',                    importance: 'minor'        },
  { d:  3, name: 'Drekkana',       sa: 'Drekkāṇa',       area: 'siblings · co-borns',                      importance: 'medium'       },
  { d:  4, name: 'Chaturthamsa',   sa: 'Caturthāṁśa',    area: 'fortune · fixed assets · home',            importance: 'medium'       },
  { d:  7, name: 'Saptamsa',       sa: 'Saptāṁśa',       area: 'progeny · creative output',                importance: 'medium'       },
  { d:  9, name: 'Navamsa',        sa: 'Navāṁśa',        area: 'marriage · dharma · the soul',             importance: 'major'        },
  { d: 10, name: 'Dasamsa',        sa: 'Daśāṁśa',        area: 'career · public life · achievement',       importance: 'major'        },
  { d: 12, name: 'Dwadasamsa',     sa: 'Dvādaśāṁśa',     area: 'parents · ancestral lineage',              importance: 'medium'       },
  { d: 16, name: 'Shodasamsa',     sa: 'Ṣoḍaśāṁśa',      area: 'vehicles · comforts · happiness',          importance: 'medium'       },
  { d: 20, name: 'Vimsamsa',       sa: 'Viṁśāṁśa',       area: 'spirituality · religious practice',        importance: 'medium'       },
  { d: 24, name: 'Chaturvimsamsa', sa: 'Caturviṁśāṁśa',  area: 'education · learning · knowledge',         importance: 'medium'       },
  { d: 27, name: 'Saptavimsamsa',  sa: 'Saptaviṁśāṁśa',  area: 'strengths and weaknesses · stamina',       importance: 'medium'       },
  { d: 30, name: 'Trimsamsa',      sa: 'Triṁśāṁśa',      area: 'evils · misfortunes · trouble-points',     importance: 'medium'       },
  { d: 40, name: 'Khavedamsa',     sa: 'Khavedāṁśa',     area: 'maternal legacy',                          importance: 'minor'        },
  { d: 45, name: 'Akshavedamsa',   sa: 'Akṣavedāṁśa',    area: 'paternal legacy',                          importance: 'minor'        },
  { d: 60, name: 'Shastiamsa',     sa: 'Ṣaṣṭyāṁśa',      area: 'overall life karmas · the most subtle',    importance: 'major'        },
];

// Build a complete divisional chart from an existing Rasi (D-1) chart.
// Returns an object shaped like the natal chart so the same NorthIndianChart
// / SouthIndianChart components can render it.
export function computeVarga(chart, divisor) {
  if (!chart || !VARGA_FN[divisor]) return null;
  const lagnaSignIdx = vargaSignOf(chart.lagnaLonDeg, divisor);
  const planets = chart.planets.map(p => {
    const signIdx = vargaSignOf(p.lonDeg, divisor);
    const house = ((signIdx - lagnaSignIdx + 12) % 12) + 1;
    return {
      name: p.name,
      lonDeg: p.lonDeg,           // keep natal longitude for reference
      signIdx,
      sign: RASHIS[signIdx].en,
      signSa: RASHIS[signIdx].sa,
      withinDeg: 0,                // not meaningful in a varga visualisation
      house,
      // Carry over natal nakshatra for the planet table; harmless here.
      nakshatra: p.nakshatra,
      pada: p.pada,
      nakshatraLord: p.nakshatraLord,
      // Dignity in this varga (rashi-based, computed against varga sign).
      dignity: vargaDignity(p.name, signIdx),
      isVargottama: signIdx === p.signIdx,
      classical: true,
    };
  });
  return {
    divisor,
    info: VARGA_INFO.find(v => v.d === divisor),
    lagnaSignIdx,
    lagnaSign: RASHIS[lagnaSignIdx].en,
    lagnaSignSa: RASHIS[lagnaSignIdx].sa,
    planets,
  };
}

// Vargas-aware dignity — own/exalt/debilitation in the destination sign.
import { OWN_SIGN, EXALT, DEBIL } from './data.js';
function vargaDignity(planet, signIdx) {
  if (['Rahu','Ketu'].includes(planet)) return null;
  if (OWN_SIGN[planet]?.includes(signIdx)) return 'own';
  if (EXALT[planet]?.sign === signIdx)     return 'exalted';
  if (DEBIL[planet]?.sign === signIdx)     return 'debilitated';
  return 'neutral';
}

// Vargottama = a planet occupies the same sign in D-1 and D-9. A classical
// strength booster — the planet's themes are "consistent" across the soul
// (D-9) and the body (D-1).
export function vargottamaPlanets(chart) {
  const d9 = computeVarga(chart, 9);
  if (!d9) return [];
  return chart.planets
    .filter(p => {
      const v = d9.planets.find(q => q.name === p.name);
      return v && v.signIdx === p.signIdx;
    })
    .map(p => p.name);
}
