// Vedic yogas + doshas detection.
// Sources: Brihat Parashara Hora Shastra, Phaladeepika, Saravali, Sanjay
// Rath's notes. Conservative implementations — we only flag yogas whose
// classical conditions are unambiguously satisfied.

import { OWN_SIGN, EXALT, RASHIS } from './data.js';

// Helper: planet object lookup.
function bp(chart) {
  return Object.fromEntries(chart.planets.map(p => [p.name, p]));
}

// Distance in houses (1..12) — how many houses from A to B counted forward.
function houseDist(fromHouse, toHouse) {
  return ((toHouse - fromHouse + 12) % 12) + 1;
}
function signDist(fromSign, toSign) {
  return ((toSign - fromSign + 12) % 12) + 1;
}

const KENDRAS = new Set([1, 4, 7, 10]);
const TRIKONAS = new Set([1, 5, 9]);
const TRIKAS  = new Set([6, 8, 12]);

// Natural benefics / malefics (classical).
const NATURAL_BENEFICS = new Set(['Jupiter', 'Venus', 'Mercury', 'Moon']);  // Mercury when not with malefic
const NATURAL_MALEFICS = new Set(['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu']);

// ---------------------------------------------------------------------------
// Pancha Mahapurusha Yogas: a non-luminary planet (Mars/Mercury/Jupiter/
// Venus/Saturn) in its OWN sign or EXALTATION sign, sitting in a KENDRA
// from the Lagna. Each carries a great-person archetype.
// ---------------------------------------------------------------------------
const PANCHA_NAMES = {
  Mars:    'Ruchaka', Mercury: 'Bhadra',  Jupiter: 'Hamsa',
  Venus:   'Malavya', Saturn:  'Sasha',
};
const PANCHA_BLURB = {
  Ruchaka: 'Warrior · commander · the courageous body. Mars in dignity and visible.',
  Bhadra:  'Sharp intellect · trader · scholar. Mercury at his strongest, in plain sight.',
  Hamsa:   'Wisdom and grace · the swan. Jupiter in dignity, lifting the chart upward.',
  Malavya: 'Beauty · charm · refined senses. Venus in dignity, visible to all.',
  Sasha:   'Discipline · authority · enduring power. Saturn in dignity, structure made flesh.',
};

function detectPanchaMahapurusha(chart) {
  // BV Raman, "Three Hundred Important Combinations": "Ruchaka Yoga: when
  // Mars occupies its own/exalted sign in a kendra FROM LAGNA OR MOON".
  // This is the canonical reading that BPHS Ch.36, Phaladeepika, and
  // Saravali concur on. We accept either kendra; results are stronger
  // when both hold (we surface that distinction as 'very_strong').
  const out = [];
  const moon = chart.planets.find(p => p.name === 'Moon');
  for (const planet of ['Mars','Mercury','Jupiter','Venus','Saturn']) {
    const p = chart.planets.find(x => x.name === planet);
    if (!p) continue;
    const inOwn = OWN_SIGN[planet]?.includes(p.signIdx);
    const inExalt = EXALT[planet]?.sign === p.signIdx;
    if (!(inOwn || inExalt)) continue;
    const kendraFromLagna = KENDRAS.has(p.house);
    const kendraFromMoon  = moon ? KENDRAS.has(((p.signIdx - moon.signIdx + 12) % 12) + 1) : false;
    if (!(kendraFromLagna || kendraFromMoon)) continue;
    const fromBoth = kendraFromLagna && kendraFromMoon;
    out.push({
      id: 'pancha_' + planet.toLowerCase(),
      name: PANCHA_NAMES[planet] + ' Yoga',
      planet,
      house: p.house,
      sign: p.sign,
      reason: `${planet} in ${p.sign} (${inExalt ? 'exalted' : 'own sign'}) in a kendra from ${
        fromBoth ? 'both Lagna and Moon' : kendraFromLagna ? 'Lagna' : 'Moon'
      }.`,
      blurb: PANCHA_BLURB[PANCHA_NAMES[planet]],
      strength: fromBoth ? 'very_strong' : 'strong',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gajakesari Yoga — Moon and Jupiter in mutual kendra (1, 4, 7, or 10 from
// each other). Classical "wisdom + good fortune" combination.
// ---------------------------------------------------------------------------
function detectGajakesari(chart) {
  const m = chart.planets.find(p => p.name === 'Moon');
  const j = chart.planets.find(p => p.name === 'Jupiter');
  if (!m || !j) return [];
  const dist = signDist(m.signIdx, j.signIdx);
  if (![1, 4, 7, 10].includes(dist)) return [];
  return [{
    id: 'gajakesari',
    name: 'Gajakesari Yoga',
    reason: `Moon in ${m.sign} (H${m.house}); Jupiter in ${j.sign} (H${j.house}) — mutually in kendra (${dist === 1 ? 'conjunct' : dist + 'th from each other'}).`,
    blurb: 'Wisdom in service of good fortune. The "elephant-lion" yoga — power that is also intelligent.',
    strength: 'strong',
  }];
}

// ---------------------------------------------------------------------------
// Budhaditya Yoga — Sun and Mercury in conjunction (same sign). Intellect
// + authority. (Some traditions require Mercury non-combust; we flag both
// cases below.)
// ---------------------------------------------------------------------------
function detectBudhaditya(chart) {
  const s = chart.planets.find(p => p.name === 'Sun');
  const m = chart.planets.find(p => p.name === 'Mercury');
  if (!s || !m || s.signIdx !== m.signIdx) return [];
  const arcDeg = Math.abs(((s.lonDeg - m.lonDeg + 540) % 360) - 180);
  // Mercury combust if within ~14° of Sun. Distinct sub-flag.
  const combust = arcDeg < 14;
  return [{
    id: 'budhaditya',
    name: 'Budhaditya Yoga',
    reason: `Sun and Mercury both in ${s.sign} (H${s.house}).${combust ? ' Mercury is combust — yoga weakens.' : ''}`,
    blurb: 'Sun + Mercury — radiant intellect, visible authority through speech and analysis.',
    strength: combust ? 'mild' : 'strong',
  }];
}

// ---------------------------------------------------------------------------
// Chandra–Mangala Yoga — Moon and Mars in conjunction. Drive + emotion;
// wealth in some traditions; volatility in others.
// ---------------------------------------------------------------------------
function detectChandraMangala(chart) {
  const m = chart.planets.find(p => p.name === 'Moon');
  const ma = chart.planets.find(p => p.name === 'Mars');
  if (!m || !ma || m.signIdx !== ma.signIdx) return [];
  return [{
    id: 'chandra_mangala',
    name: 'Chandra–Mangala Yoga',
    reason: `Moon and Mars conjunct in ${m.sign} (H${m.house}).`,
    blurb: 'Emotional fire. Often wealth-bringing; can be irritable. Strong drive coupled with feeling.',
    strength: 'medium',
  }];
}

// ---------------------------------------------------------------------------
// Lunar yogas: planets adjacent to the Moon (excluding luminaries and the
// nodes — the standard rule). 2nd from Moon → Sunapha; 12th from Moon →
// Anapha; both → Durudhura; neither (Moon completely isolated except for
// luminaries/nodes) → Kemadruma.
// ---------------------------------------------------------------------------
function detectLunarYogas(chart) {
  const moon = chart.planets.find(p => p.name === 'Moon');
  if (!moon) return [];
  const eligible = chart.planets.filter(p =>
    !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(p.name)
  );
  const second   = (moon.signIdx + 1) % 12;
  const twelfth  = (moon.signIdx + 11) % 12;
  const inSecond = eligible.filter(p => p.signIdx === second);
  const inTwelfth = eligible.filter(p => p.signIdx === twelfth);
  const inSame   = eligible.filter(p => p.signIdx === moon.signIdx);

  const out = [];
  if (inSecond.length && inTwelfth.length) {
    out.push({
      id: 'durudhura',
      name: 'Durudhura Yoga',
      reason: `Planets in both 2nd and 12th from Moon (${[...inSecond, ...inTwelfth].map(p=>p.name).join(', ')}).`,
      blurb: 'The Moon flanked on both sides — abundance, household comfort, support.',
      strength: 'medium',
    });
  } else if (inSecond.length) {
    out.push({
      id: 'sunapha',
      name: 'Sunapha Yoga',
      reason: `Planet(s) in 2nd from Moon (${inSecond.map(p=>p.name).join(', ')}).`,
      blurb: 'Self-earned prosperity, intelligent action — wealth through one\'s own efforts.',
      strength: 'medium',
    });
  } else if (inTwelfth.length) {
    out.push({
      id: 'anapha',
      name: 'Anapha Yoga',
      reason: `Planet(s) in 12th from Moon (${inTwelfth.map(p=>p.name).join(', ')}).`,
      blurb: 'Refinement, comfort, sometimes a meditative or otherworldly disposition.',
      strength: 'medium',
    });
  } else if (inSame.length === 0) {
    // Kemadruma — Moon utterly alone (no eligible planet in 2nd, 12th, or
    // same sign). Classical "deprivation" yoga, often softened in modern
    // readings if Moon is otherwise well placed.
    out.push({
      id: 'kemadruma',
      name: 'Kemadruma Yoga',
      reason: `No planet in the 2nd, 12th, or same sign as Moon (${moon.sign}).`,
      blurb: 'The isolated Moon — a feeling of going it alone. Often mitigated when Moon is in own/exalted sign or aspected by Jupiter.',
      strength: 'caution',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adhi Yoga — natural benefics in 6, 7, 8 from Moon (or Lagna). Powerful
// success combination.
// ---------------------------------------------------------------------------
function detectAdhi(chart) {
  const moon = chart.planets.find(p => p.name === 'Moon');
  if (!moon) return [];
  const houses = [(moon.signIdx + 5) % 12, (moon.signIdx + 6) % 12, (moon.signIdx + 7) % 12];
  const benefics = chart.planets.filter(p =>
    ['Jupiter', 'Venus', 'Mercury'].includes(p.name) && houses.includes(p.signIdx)
  );
  if (benefics.length < 2) return [];
  return [{
    id: 'adhi',
    name: 'Adhi Yoga',
    reason: `Benefics (${benefics.map(b=>b.name).join(', ')}) in the 6/7/8 from Moon — supportive lift.`,
    blurb: 'A foundational success yoga — the natural benefics support the Moon from the relational and transformative houses.',
    strength: 'strong',
  }];
}

// ---------------------------------------------------------------------------
// Vipareeta Raja Yoga — lord of a trika house (6/8/12) sits in another
// trika house. Adversity that becomes power.
// Sub-types: Harsha (6th lord in 8/12), Sarala (8th lord in 6/12),
// Vimala (12th lord in 6/8). Per Phaladeepika Ch.7.
// ---------------------------------------------------------------------------
const VIPAREETA_NAMES = { 6: 'Harsha', 8: 'Sarala', 12: 'Vimala' };
function detectVipareeta(chart) {
  const out = [];
  const trikaHouses = [6, 8, 12];
  for (const h of trikaHouses) {
    const sign = (chart.lagnaSignIdx + h - 1) % 12;
    const ruler = RASHIS[sign].ruler;
    const rp = chart.planets.find(p => p.name === ruler);
    if (!rp) continue;
    if (TRIKAS.has(rp.house) && rp.house !== h) {
      out.push({
        id: 'vipareeta_' + h,
        name: `${VIPAREETA_NAMES[h]} Yoga (Vipareeta Raja)`,
        reason: `${ruler}, ruler of the ${h}th house, sits in House ${rp.house} — both are trika houses (6/8/12).`,
        blurb: 'Adversity converted to authority — the malefic forces neutralise each other and yield rare power.',
        strength: 'medium',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Raja Yoga — kendra-trikona lord union. The single most foundational yoga
// in classical Jyotish (BPHS Ch. 36). When the LORD of a kendra (1/4/7/10)
// and the LORD of a trikona (1/5/9) are conjunct in any sign, OR aspect
// each other, OR exchange signs (Parivartana), they form a Raja Yoga —
// a combination that confers authority, status, and good fortune.
//
// We flag two flavours here:
//   1. Conjunction: kendra lord and trikona lord in the same sign.
//   2. Mutual aspect by graha drishti (any drishti — implementations
//      vary; we use the broad rule "either aspects the other").
//
// Parivartana between kendra-trikona lords is detected separately in
// detectParivartana below; if both lords also form a Parivartana, that's
// noted there.
//
// Note: when Lagna lord is involved, both lord-of-kendra (1) and lord-of-
// trikona (1) are the same. To avoid trivial self-Raja-Yoga we exclude
// pairings where both roles are filled by the same planet for the same
// house (e.g. Lagna lord with itself).
// ---------------------------------------------------------------------------
import { housesAspectedBy } from './drishti.js';

const KENDRA_HOUSES = [1, 4, 7, 10];
const TRIKONA_HOUSES = [1, 5, 9];

function rulerOfHouse(chart, h) {
  const sign = (chart.lagnaSignIdx + h - 1) % 12;
  return { sign, ruler: RASHIS[sign].ruler };
}

function detectRajaYoga(chart) {
  const out = [];
  const seenPairs = new Set();
  for (const kh of KENDRA_HOUSES) {
    for (const th of TRIKONA_HOUSES) {
      if (kh === th) continue;       // same house — not a kendra-trikona pair
      const { ruler: kLord } = rulerOfHouse(chart, kh);
      const { ruler: tLord } = rulerOfHouse(chart, th);
      if (kLord === tLord) continue; // same planet rules both — not a yoga
      const pairKey = [kLord, tLord].sort().join('-');
      if (seenPairs.has(pairKey)) continue;
      const kp = chart.planets.find(p => p.name === kLord);
      const tp = chart.planets.find(p => p.name === tLord);
      if (!kp || !tp) continue;

      // Conjunction = same sign.
      if (kp.signIdx === tp.signIdx) {
        seenPairs.add(pairKey);
        out.push({
          id: 'raja_conj_' + pairKey,
          name: 'Raja Yoga · conjunction',
          reason: `${kLord} (lord of H${kh}, kendra) and ${tLord} (lord of H${th}, trikona) conjunct in ${kp.sign}.`,
          blurb: 'A foundational power yoga. The owners of an angular and a trinal house combine forces — authority, recognition, and good fortune flow when this connection is active.',
          strength: 'strong',
        });
        continue;
      }
      // Mutual aspect — either planet aspects the other's sign by graha drishti.
      const kAspectsTSign = housesAspectedBy(kLord, kp.signIdx).includes(tp.signIdx);
      const tAspectsKSign = housesAspectedBy(tLord, tp.signIdx).includes(kp.signIdx);
      if (kAspectsTSign || tAspectsKSign) {
        seenPairs.add(pairKey);
        out.push({
          id: 'raja_aspect_' + pairKey,
          name: 'Raja Yoga · aspect',
          reason: `${kLord} (lord of H${kh}, kendra) and ${tLord} (lord of H${th}, trikona) aspect each other (graha drishti).`,
          blurb: 'Power-yoga by mutual gaze. Less concentrated than conjunction but still confers status and capability when the periods of either lord run.',
          strength: 'medium',
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Dhana Yoga — wealth combinations. Lord of a dhana house (2 wealth, 5
// past merit, 9 fortune, 11 gains) connecting to another dhana house
// lord by conjunction or mutual aspect. BPHS Ch. 36, Phaladeepika Ch. 6.
//
// Many sub-variants exist — we use the conservative core: any two of the
// 2/5/9/11 lords joined together flags a Dhana Yoga. Stronger results when
// 2nd or 11th lord is involved (the canonical wealth lords).
// ---------------------------------------------------------------------------
const DHANA_HOUSES = [2, 5, 9, 11];

function detectDhanaYoga(chart) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < DHANA_HOUSES.length; i++) {
    for (let j = i + 1; j < DHANA_HOUSES.length; j++) {
      const h1 = DHANA_HOUSES[i], h2 = DHANA_HOUSES[j];
      const { ruler: l1 } = rulerOfHouse(chart, h1);
      const { ruler: l2 } = rulerOfHouse(chart, h2);
      if (l1 === l2) continue;
      const pairKey = [l1, l2].sort().join('-');
      if (seen.has(pairKey)) continue;
      const p1 = chart.planets.find(p => p.name === l1);
      const p2 = chart.planets.find(p => p.name === l2);
      if (!p1 || !p2) continue;

      const conjunct = p1.signIdx === p2.signIdx;
      const aspect = housesAspectedBy(l1, p1.signIdx).includes(p2.signIdx)
                  || housesAspectedBy(l2, p2.signIdx).includes(p1.signIdx);
      if (!conjunct && !aspect) continue;

      seen.add(pairKey);
      const involvesCore = h1 === 2 || h1 === 11 || h2 === 2 || h2 === 11;
      out.push({
        id: `dhana_${h1}_${h2}_${conjunct ? 'conj' : 'asp'}`,
        name: 'Dhana Yoga',
        reason: `${l1} (lord of H${h1}) ${conjunct ? 'conjunct' : 'aspecting'} ${l2} (lord of H${h2}) — both wealth-houses.`,
        blurb: 'Wealth combination. The lords of the dhana-bhavas (2, 5, 9, 11) collaborate; the strongest forms involve the 2nd (accumulated wealth) or 11th (gains).',
        strength: involvesCore ? 'strong' : 'medium',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parivartana Yoga — sign exchange between two house lords. The lord of
// house A sits in house B, while the lord of B sits in A. There are three
// classes per K.N. Rao: Maha Parivartana (kendra ↔ trikona), Khala
// Parivartana (involves trika 6/8/12), and Dainya Parivartana (between
// trika lords). Maha is the strong wealth/raja-yoga form; Khala is mixed;
// Dainya is the difficulty-becomes-strength variant.
// ---------------------------------------------------------------------------
function classifyParivartana(h1, h2) {
  const isKendra = (h) => KENDRA_HOUSES.includes(h);
  const isTrikona = (h) => TRIKONA_HOUSES.includes(h);
  const isTrika = (h) => h === 6 || h === 8 || h === 12;
  const a = isTrika(h1), b = isTrika(h2);
  if (a && b) return { type: 'Dainya', strength: 'medium', blurb: 'Trika ↔ trika exchange — adversity transmuted into resilience.' };
  if (a || b) return { type: 'Khala',  strength: 'mild',   blurb: 'Trika-involving exchange — turbulent but capable of producing capability through difficulty.' };
  if ((isKendra(h1) && isTrikona(h2)) || (isTrikona(h1) && isKendra(h2)))
    return { type: 'Maha',   strength: 'strong', blurb: 'Kendra ↔ trikona exchange — the strongest Parivartana, a foundational power-yoga of the chart.' };
  return { type: 'Generic', strength: 'medium', blurb: 'Mutual sign exchange — the two houses\' affairs are deeply entangled and feed each other.' };
}

function detectParivartana(chart) {
  const out = [];
  const seen = new Set();
  for (let h1 = 1; h1 <= 12; h1++) {
    const { sign: s1, ruler: r1 } = rulerOfHouse(chart, h1);
    const p1 = chart.planets.find(p => p.name === r1);
    if (!p1) continue;
    for (let h2 = h1 + 1; h2 <= 12; h2++) {
      const { sign: s2, ruler: r2 } = rulerOfHouse(chart, h2);
      if (r1 === r2) continue;
      const p2 = chart.planets.find(p => p.name === r2);
      if (!p2) continue;
      // Exchange: r1 sits in s2, r2 sits in s1.
      if (p1.signIdx === s2 && p2.signIdx === s1) {
        const key = [h1, h2].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        const cls = classifyParivartana(h1, h2);
        out.push({
          id: `parivartana_${h1}_${h2}`,
          name: `${cls.type} Parivartana Yoga`,
          reason: `${r1} (lord of H${h1}) is in H${h2}; ${r2} (lord of H${h2}) is in H${h1} — mutual sign exchange.`,
          blurb: cls.blurb,
          strength: cls.strength,
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Neecha Bhanga Raja Yoga — cancellation of debility. When a planet sits
// in its sign of debilitation, the debility can be cancelled by various
// classical conditions. The most cited (BPHS Ch. 39, Phaladeepika Ch. 7):
//
//   (a) The lord of the debilitating sign is in a kendra from the Lagna
//       OR from the Moon.
//   (b) The planet of EXALTATION for that sign sits in a kendra from the
//       Lagna OR from the Moon.
//   (c) The debilitated planet is aspected by, or conjunct with, its
//       exaltation lord.
//
// When ANY of these hold, debility is "broken" (Neecha Bhanga) and the
// planet often produces a Raja Yoga in its dasha.
// ---------------------------------------------------------------------------
function detectNeechaBhanga(chart) {
  const out = [];
  const moon = chart.planets.find(p => p.name === 'Moon');
  // Helper — house from Moon (1-based).
  const houseFromMoon = (signIdx) =>
    moon ? ((signIdx - moon.signIdx + 12) % 12) + 1 : null;

  for (const p of chart.planets) {
    if (p.dignity !== 'debilitated') continue;
    const debilSign = p.signIdx;

    // (1) Sign where THIS planet would be EXALTED, and that sign's lord.
    //     Per BPHS Ch. 39: "if the lord of the exaltation sign of the
    //     debilitated planet is in a kendra from Lagna or Moon, debility
    //     is cancelled". This is the most-cited Neecha Bhanga rule.
    const exaltSign = EXALT[p.name]?.sign;
    const lordOfExalt = exaltSign != null ? RASHIS[exaltSign].ruler : null;
    const exaltLordP = lordOfExalt ? chart.planets.find(x => x.name === lordOfExalt) : null;

    // (2) Lord of the DEBILITATION sign (the dispositor of the debilitated
    //     planet). Phaladeepika cites this as a secondary condition.
    const lordOfDebil = RASHIS[debilSign].ruler;
    const debilLordP = chart.planets.find(x => x.name === lordOfDebil);

    // (3) The planet whose EXALTATION is in the same sign as our
    //     debilitated planet (e.g. Saturn is exalted in Libra; if Sun is
    //     debilitated in Libra and Saturn is in a kendra, cancellation).
    const exaltedHere = Object.entries(EXALT).find(([, e]) => e.sign === debilSign)?.[0];
    const exaltedHereP = exaltedHere ? chart.planets.find(x => x.name === exaltedHere) : null;

    const reasons = [];

    // Rule A: lord of the exaltation sign in kendra from Lagna or Moon.
    if (exaltLordP && (KENDRAS.has(exaltLordP.house) || KENDRAS.has(houseFromMoon(exaltLordP.signIdx)))) {
      reasons.push(`${lordOfExalt} (lord of ${p.name}'s exaltation sign) is in a kendra from Lagna or Moon`);
    }
    // Rule B: dispositor (lord of debility sign) in kendra.
    if (debilLordP && (KENDRAS.has(debilLordP.house) || KENDRAS.has(houseFromMoon(debilLordP.signIdx)))) {
      reasons.push(`${lordOfDebil} (dispositor of ${p.name}) is in a kendra from Lagna or Moon`);
    }
    // Rule C: the planet exalted in the same sign as our debility, in kendra.
    if (exaltedHereP && exaltedHereP.name !== p.name &&
        (KENDRAS.has(exaltedHereP.house) || KENDRAS.has(houseFromMoon(exaltedHereP.signIdx)))) {
      reasons.push(`${exaltedHere} (whose exaltation is ${RASHIS[debilSign].en}) is in a kendra from Lagna or Moon`);
    }
    // Rule D: debilitated planet conjunct exaltation lord or aspected by it.
    if (exaltLordP && exaltLordP.signIdx === p.signIdx) {
      reasons.push(`${p.name} is conjunct ${lordOfExalt} (lord of its exaltation sign)`);
    }
    if (exaltLordP && housesAspectedBy(lordOfExalt, exaltLordP.signIdx).includes(p.signIdx)) {
      reasons.push(`${lordOfExalt} (lord of ${p.name}'s exaltation) aspects ${p.name}`);
    }
    // Rule E: dispositor (debil sign lord) conjunct or aspecting debilitated planet.
    if (debilLordP && debilLordP.signIdx === p.signIdx && debilLordP.name !== p.name) {
      reasons.push(`${p.name} is conjunct ${lordOfDebil} (its dispositor)`);
    }
    if (debilLordP && debilLordP.name !== p.name &&
        housesAspectedBy(lordOfDebil, debilLordP.signIdx).includes(p.signIdx)) {
      reasons.push(`${lordOfDebil} (dispositor) aspects ${p.name}`);
    }

    if (reasons.length > 0) {
      out.push({
        id: 'neecha_bhanga_' + p.name.toLowerCase(),
        name: 'Neecha Bhanga Raja Yoga',
        reason: `${p.name} is debilitated in ${p.sign}, but ${reasons.join('; ')}. Debility cancelled.`,
        blurb: 'Cancellation of debility. The chart\'s "weak point" reorganises into power — often producing a Raja Yoga in this planet\'s dasha. Read with care: classical tradition warns that the early life may show the unbroken neecha before maturation reveals the bhanga.',
        strength: 'strong',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// MAIN entry — run every detector and return a flat list of yogas.
// ---------------------------------------------------------------------------
export function detectYogas(chart) {
  return [
    ...detectPanchaMahapurusha(chart),
    ...detectGajakesari(chart),
    ...detectBudhaditya(chart),
    ...detectChandraMangala(chart),
    ...detectLunarYogas(chart),
    ...detectAdhi(chart),
    ...detectVipareeta(chart),
    ...detectRajaYoga(chart),
    ...detectDhanaYoga(chart),
    ...detectParivartana(chart),
    ...detectNeechaBhanga(chart),
  ];
}

// ---------------------------------------------------------------------------
// DOSHAS
// ---------------------------------------------------------------------------

// Kala Sarpa — every classical planet (Sun..Saturn) sits within the half
// of the zodiac bounded by Rahu and Ketu, on EITHER direction. The
// Rahu→Ketu arc (forward in zodiac) is classical Kala Sarpa; the Ketu→Rahu
// arc is sometimes called Kala Amrita — same shape, mirrored. The
// geometric configuration is identical, so we flag both as Kala Sarpa.
export function detectKalaSarpa(chart) {
  const rahu = chart.planets.find(p => p.name === 'Rahu');
  const ketu = chart.planets.find(p => p.name === 'Ketu');
  if (!rahu || !ketu) return null;
  const classical = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
  // Are all classical planets in the half-arc starting at `from` and walking
  // forward to `to`? Rahu and Ketu are 180° apart so each arc is exactly half.
  const allInArc = (from, to) => {
    const arcLen = ((to.lonDeg - from.lonDeg + 360) % 360);
    return classical.every(name => {
      const p = chart.planets.find(q => q.name === name);
      if (!p) return false;
      const rel = ((p.lonDeg - from.lonDeg + 360) % 360);
      return rel <= arcLen;
    });
  };
  const rahuToKetu = allInArc(rahu, ketu);
  const ketuToRahu = !rahuToKetu && allInArc(ketu, rahu);
  if (!rahuToKetu && !ketuToRahu) return null;
  const direction = rahuToKetu ? 'Rahu → Ketu' : 'Ketu → Rahu';
  return {
    id: 'kala_sarpa',
    name: 'Kala Sarpa Yoga',
    severity: 'medium',
    reason: `All classical planets (Sun…Saturn) lie in the ${direction} half-arc — a "serpent of time" enclosure.`,
    blurb: 'The seven grahas hemmed inside the lunar nodes. Classical traditions read this as karmic intensity — a life with strong themes that demand attention; modern interpreters often soften it to "concentrated focus".',
  };
}

// Mangal Dosha (Manglik) — Mars in 1, 2, 4, 7, 8, or 12 from Lagna (and
// often also checked from Moon and Venus). Affects marriage compatibility
// in classical readings; many mitigations exist (Mars in own/exalted, etc.)
const MANGAL_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

export function detectMangalDosha(chart) {
  const mars = chart.planets.find(p => p.name === 'Mars');
  if (!mars) return null;
  const fromLagna = MANGAL_HOUSES.has(mars.house);
  // From Moon
  const moon = chart.planets.find(p => p.name === 'Moon');
  const fromMoon = moon ? MANGAL_HOUSES.has(((mars.signIdx - moon.signIdx + 12) % 12) + 1) : false;
  // From Venus
  const venus = chart.planets.find(p => p.name === 'Venus');
  const fromVenus = venus ? MANGAL_HOUSES.has(((mars.signIdx - venus.signIdx + 12) % 12) + 1) : false;
  if (!(fromLagna || fromMoon || fromVenus)) return null;
  // Classical mitigations.
  const inOwn = OWN_SIGN.Mars.includes(mars.signIdx);
  const inExalt = EXALT.Mars.sign === mars.signIdx;
  const mitigated = inOwn || inExalt;
  const sources = [];
  if (fromLagna) sources.push('Lagna');
  if (fromMoon)  sources.push('Moon');
  if (fromVenus) sources.push('Venus');
  return {
    id: 'mangal_dosha',
    name: 'Mangal Dosha (Manglik)',
    severity: mitigated ? 'mitigated' : (fromLagna ? 'strong' : 'medium'),
    reason: `Mars sits in House ${mars.house} (${mars.sign}), counted Manglik from ${sources.join(', ')}.${mitigated ? ' Mitigated: Mars in ' + (inExalt ? 'exaltation' : 'own sign') + '.' : ''}`,
    blurb: 'Classical concern in marriage matchmaking — Mars in these houses is read as bringing friction to spouse-related affairs. Many modern Jyotishis read it as a need for an active, expressive partner rather than as a hard prohibition.',
  };
}

// Combustion — non-luminary planet within a sign-specific orb of the Sun.
// Classical orbs (Phaladeepika): Mercury 14°, Venus 10° (8° if retrograde),
// Mars 17°, Jupiter 11°, Saturn 15°. Moon: 12°. Combust planets are
// considered weakened — they "lose their light" near the Sun.
const COMBUST_ORB = {
  Moon: 12, Mercury: 14, Venus: 10, Mars: 17, Jupiter: 11, Saturn: 15,
};
export function detectCombustion(chart) {
  const sun = chart.planets.find(p => p.name === 'Sun');
  if (!sun) return [];
  const out = [];
  for (const [name, orb] of Object.entries(COMBUST_ORB)) {
    const p = chart.planets.find(x => x.name === name);
    if (!p) continue;
    const arc = Math.min(
      Math.abs(p.lonDeg - sun.lonDeg),
      360 - Math.abs(p.lonDeg - sun.lonDeg),
    );
    if (arc < orb) {
      out.push({
        planet: name,
        arcDeg: arc,
        orbDeg: orb,
        note: `${name} within ${arc.toFixed(2)}° of the Sun (orb ${orb}°) — combust (Astangata).`,
      });
    }
  }
  return out;
}

// One-shot entry for all doshas.
export function detectDoshas(chart) {
  const out = {};
  const ks = detectKalaSarpa(chart);    if (ks) out.kalaSarpa = ks;
  const mg = detectMangalDosha(chart);  if (mg) out.mangal    = mg;
  const cb = detectCombustion(chart);   if (cb.length) out.combust = cb;
  return out;
}
