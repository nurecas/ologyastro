// -----------------------------------------------------------------------------
// Phase 3 — Classical Essential Dignities (Ptolemaic)
//
// For each classical planet, compute:
//   • rulership         — in its own sign?
//   • exaltation / fall — in its exaltation sign / the opposite?
//   • detriment         — in the sign opposite to rulership?
//   • triplicity        — day/night/participating ruler of the element/mode?
//   • terms             — Egyptian bounds (default); Ptolemaic alternative
//   • face              — decan ruler of the 10° segment within the sign
//
// Tables sourced from William Lilly, *Christian Astrology* (1647) and
// cross-checked against Deborah Houlding's compendium. Used in the
// Profile's Dignities card (Advanced mode only, surfaced in Phase 5).
// -----------------------------------------------------------------------------

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// Classical rulerships (traditional, pre-outer-planet — matches Lilly).
export const RULER = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
};

// Exaltations: sign → planet exalted there (and the reverse map below).
export const EXALTS = {
  Aries:'Sun', Taurus:'Moon', Cancer:'Jupiter', Virgo:'Mercury',
  Libra:'Saturn', Capricorn:'Mars', Pisces:'Venus',
};
const EXALT_OF = Object.fromEntries(Object.entries(EXALTS).map(([s, p]) => [p, s]));

// Detriment = sign opposite to rulership. Fall = sign opposite to exaltation.
function oppSign(s) { return SIGNS[(SIGNS.indexOf(s) + 6) % 12]; }

// Triplicities — day / night / participating rulers (Dorothean / Ptolemaic).
// Fire: Sun (day), Jupiter (night), Saturn (partic.)
// Earth: Venus (day), Moon (night), Mars (partic.)
// Air: Saturn (day), Mercury (night), Jupiter (partic.)
// Water: Venus (day), Mars (night), Moon (partic.)
const ELEMENT_OF = {
  Aries:'fire', Leo:'fire', Sagittarius:'fire',
  Taurus:'earth', Virgo:'earth', Capricorn:'earth',
  Gemini:'air', Libra:'air', Aquarius:'air',
  Cancer:'water', Scorpio:'water', Pisces:'water',
};
const TRIPLICITY = {
  fire:  { day:'Sun',    night:'Jupiter', partic:'Saturn'  },
  earth: { day:'Venus',  night:'Moon',    partic:'Mars'    },
  air:   { day:'Saturn', night:'Mercury', partic:'Jupiter' },
  water: { day:'Venus',  night:'Mars',    partic:'Moon'    },
};

// Egyptian terms — 5 unequal segments per sign, each ruled by one of the
// five non-luminary classical planets. Data from Ptolemy, *Tetrabiblos*
// I.22 (Egyptian table, preferred by most astrologers over Ptolemy's own).
// Each entry: [upperBoundDeg, ruler]. First starts at 0° of the sign.
const TERMS = {
  Aries:        [[6,'Jupiter'],[12,'Venus'],[20,'Mercury'],[25,'Mars'],[30,'Saturn']],
  Taurus:       [[8,'Venus'],  [14,'Mercury'],[22,'Jupiter'],[27,'Saturn'],[30,'Mars']],
  Gemini:       [[6,'Mercury'],[12,'Jupiter'],[17,'Venus'],[24,'Mars'],[30,'Saturn']],
  Cancer:       [[7,'Mars'],   [13,'Venus'],[19,'Mercury'],[26,'Jupiter'],[30,'Saturn']],
  Leo:          [[6,'Jupiter'],[11,'Venus'],[18,'Saturn'],[24,'Mercury'],[30,'Mars']],
  Virgo:        [[7,'Mercury'],[17,'Venus'],[21,'Jupiter'],[28,'Mars'],[30,'Saturn']],
  Libra:        [[6,'Saturn'], [14,'Mercury'],[21,'Jupiter'],[28,'Venus'],[30,'Mars']],
  Scorpio:      [[7,'Mars'],   [11,'Venus'],[19,'Mercury'],[24,'Jupiter'],[30,'Saturn']],
  Sagittarius:  [[12,'Jupiter'],[17,'Venus'],[21,'Mercury'],[26,'Saturn'],[30,'Mars']],
  Capricorn:    [[7,'Mercury'],[14,'Jupiter'],[22,'Venus'],[26,'Saturn'],[30,'Mars']],
  Aquarius:     [[7,'Mercury'],[13,'Venus'],[20,'Jupiter'],[25,'Mars'],[30,'Saturn']],
  Pisces:       [[12,'Venus'], [16,'Jupiter'],[19,'Mercury'],[28,'Mars'],[30,'Saturn']],
};

// Faces / decans — three 10° segments per sign, each ruled by a classical
// planet. Using the Chaldean order as given by Lilly.
const FACES = {
  Aries:       ['Mars','Sun','Venus'],
  Taurus:      ['Mercury','Moon','Saturn'],
  Gemini:      ['Jupiter','Mars','Sun'],
  Cancer:      ['Venus','Mercury','Moon'],
  Leo:         ['Saturn','Jupiter','Mars'],
  Virgo:       ['Sun','Venus','Mercury'],
  Libra:       ['Moon','Saturn','Jupiter'],
  Scorpio:     ['Mars','Sun','Venus'],
  Sagittarius: ['Mercury','Moon','Saturn'],
  Capricorn:   ['Jupiter','Mars','Sun'],
  Aquarius:    ['Venus','Mercury','Moon'],
  Pisces:      ['Saturn','Jupiter','Mars'],
};

// Ptolemy's point-scoring for essential dignity (used to surface
// "how essentially dignified is this planet?").
const DIGNITY_POINTS = {
  rulership: 5, exaltation: 4, triplicity: 3, terms: 2, face: 1,
  detriment: -5, fall: -4,
};

function norm360(x) { return ((x % 360) + 360) % 360; }
function signOfDeg(lonDeg) { return SIGNS[Math.floor(norm360(lonDeg) / 30)]; }
function withinSignDeg(lonDeg) { return norm360(lonDeg) - Math.floor(norm360(lonDeg) / 30) * 30; }

function termRulerAt(sign, withinDeg) {
  for (const [upper, ruler] of TERMS[sign]) {
    if (withinDeg < upper) return ruler;
  }
  return TERMS[sign][TERMS[sign].length - 1][1];
}

// Compute the dignities of one planet at one longitude, given day/night
// context. Returns a rich object suitable for UI rendering.
export function dignitiesOf(planetName, lonDeg, isDay) {
  const sign = signOfDeg(lonDeg);
  const within = withinSignDeg(lonDeg);
  const entries = [];
  if (RULER[sign] === planetName) entries.push('rulership');
  if (RULER[oppSign(sign)] === planetName) entries.push('detriment');
  if (EXALTS[sign] === planetName) entries.push('exaltation');
  if (EXALT_OF[planetName] && oppSign(EXALT_OF[planetName]) === sign) entries.push('fall');
  const trip = TRIPLICITY[ELEMENT_OF[sign]];
  if (trip[isDay ? 'day' : 'night'] === planetName) entries.push('triplicity-ruler');
  else if (trip.partic === planetName) entries.push('triplicity-partic');
  if (termRulerAt(sign, within) === planetName) entries.push('terms');
  const faceIdx = Math.floor(within / 10);
  if (FACES[sign][faceIdx] === planetName) entries.push('face');
  const score =
      (entries.includes('rulership')  ?  DIGNITY_POINTS.rulership   : 0)
    + (entries.includes('exaltation') ?  DIGNITY_POINTS.exaltation  : 0)
    + (entries.some(e => e.startsWith('triplicity')) ? DIGNITY_POINTS.triplicity : 0)
    + (entries.includes('terms')      ?  DIGNITY_POINTS.terms       : 0)
    + (entries.includes('face')       ?  DIGNITY_POINTS.face        : 0)
    + (entries.includes('detriment')  ?  DIGNITY_POINTS.detriment   : 0)
    + (entries.includes('fall')       ?  DIGNITY_POINTS.fall        : 0);
  return { sign, within, entries, score };
}

// Whole-natal dignity table: row per classical planet. `natal.isDay`
// provides the day/night context for triplicity scoring.
const CLASSICAL = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];

export function dignityTable(natal) {
  const isDay = !!natal.isDay;
  return CLASSICAL
    .map(name => {
      const p = natal.planets.find(q => q.name === name);
      if (!p) return null;
      return { planet: name, ...dignitiesOf(name, p.lonDeg, isDay) };
    })
    .filter(Boolean);
}

// One-line summary for the collapsed card: "3 strong · 1 in fall · 2 in detriment".
export function dignitySummary(natal) {
  const rows = dignityTable(natal);
  const strong = rows.filter(r => r.entries.includes('rulership') || r.entries.includes('exaltation')).length;
  const inFall = rows.filter(r => r.entries.includes('fall')).length;
  const inDetriment = rows.filter(r => r.entries.includes('detriment')).length;
  const parts = [];
  if (strong)      parts.push(`${strong} strong`);
  if (inFall)      parts.push(`${inFall} in fall`);
  if (inDetriment) parts.push(`${inDetriment} in detriment`);
  return parts.length ? parts.join(' \u00b7 ') : 'no classical-dignity extremes';
}
