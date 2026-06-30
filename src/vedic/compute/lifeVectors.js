// Vedic — Life Vectors.
//
// A 100-year activation graph for the chart, built ENTIRELY from classical
// Jyotisha timing, not Western transit-aspect math. Each line tracks how
// strongly one life-domain (bhāva cluster + its kāraka) is activated across
// the native's life, sampled monthly.
//
// The dominant signal is the **Vimśottarī Daśā** — the principal predictive
// engine of Parāśarī jyotiṣa. A domain lights up when the running
// Mahādaśā / Antardaśā lord is connected to that domain by:
//   • lordship  — the lord rules one of the domain's houses (from Lagna)
//   • kāraka    — the lord is the natural significator of the domain
//   • occupation— the lord sits natally in one of the domain's houses
//   • dṛṣṭi     — the lord aspects one of the domain's houses (graha dṛṣṭi)
// each scaled by the lord's natal strength (dignity).
//
// The secondary signal is **Gochara** (transits) of the slow grahas
// (Jupiter, Saturn, Rāhu, Ketu — the only ones with multi-year structure),
// read against the Lagna, modulated by the **Aṣṭakavarga** bindus of the
// sign they transit, with a **Sade Sati** boost on the Self / Health lines.
//
// Two generic composite lines (Auspicious flow / Testing periods) sum the
// functional benefic vs. malefic activation so the user gets a top-level
// "good stretches / hard stretches" read alongside the eight domain lines.
//
// Sources: BPHS (daśā + bhāva kāraka + gochara chapters), Phaladeepika,
// standard Parāśarī functional-nature (yogakāraka / dusthāna-lord) rules.

import { RASHIS, EXALT } from './data.js';
import { housesAspectedBy } from './drishti.js';
import { currentMaha, currentAntar } from './dasha.js';
import {
  longitudesAtDate, extraLongitudeAtJD, dateToJD, decimalYearToDate,
  isInSwissRange, isSwissReady, setEphemerisOptions,
} from '../../astro/ephemeris.js';

function norm360(x) { let y = x % 360; if (y < 0) y += 360; return y; }
function signOf(lon) { return Math.floor(norm360(lon) / 30); }

// ---------------------------------------------------------------------------
// Domain definitions — bhāva clusters + their natural kārakas.
// House numbers are 1-based, counted from the Lagna. Mappings are the
// standard Parāśarī house significations.
// ---------------------------------------------------------------------------
export const VEDIC_DOMAINS = [
  { id: 'self',        name: 'Self & Vitality',      houses: [1],     karakas: ['Sun'],
    color: '#f5d680', blurb: 'Body, vitality, the unfolding of the self. Driven by the 1st bhāva and its lord, and the Sun (ātmakāraka in spirit).' },
  { id: 'wealth',      name: 'Wealth & Gains',       houses: [2, 11], karakas: ['Jupiter'],
    color: '#e8a35c', blurb: 'Accumulated resources (2nd) and gains/networks (11th). Jupiter is the dhana-kāraka.' },
  { id: 'home',        name: 'Home & Heart',         houses: [4],     karakas: ['Moon'],
    color: '#7fb0e8', blurb: 'Mother, home, inner peace, property. The 4th bhāva and the Moon (manas-kāraka).' },
  { id: 'creativity',  name: 'Creativity & Progeny', houses: [5],     karakas: ['Jupiter'],
    color: '#9adfa8', blurb: 'Intelligence, creativity, children, pūrva-puṇya (past merit). The 5th bhāva; Jupiter is the putra-kāraka.' },
  { id: 'relationship',name: 'Partnership',          houses: [7],     karakas: ['Venus'],
    color: '#f7c7c7', blurb: 'Marriage, partnership, the other. The 7th bhāva; Venus is the kalatra-kāraka.' },
  { id: 'career',      name: 'Career & Status',      houses: [10],    karakas: ['Sun', 'Saturn', 'Mercury'],
    color: '#ffb066', blurb: 'Karma, profession, public standing. The 10th bhāva; Sun, Saturn and Mercury are its kārakas.' },
  { id: 'health',      name: 'Health & Adversity',   houses: [6, 8],  karakas: ['Mars', 'Saturn'],
    color: '#ff6a6a', blurb: 'Illness, debts, enemies (6th) and crises, longevity, the hidden (8th). Mars and Saturn rule the struggle.' },
  { id: 'dharma',      name: 'Dharma & Spirit',      houses: [9, 12], karakas: ['Jupiter', 'Ketu'],
    color: '#b79aff', blurb: 'Fortune, guru, higher purpose (9th) and liberation, loss, retreat (12th). Jupiter and Ketu carry the spiritual current.' },
];

// Two generic composite lines appended to the domain set.
export const VEDIC_COMPOSITES = [
  { id: 'shubha',  name: 'Auspicious flow', color: '#9adfa8', composite: true,
    blurb: 'Sum of functionally benefic activation — periods ruled by trikona / yogakāraka lords in dignity, with Jupiter\'s supportive transits.' },
  { id: 'ashubha', name: 'Testing periods', color: '#8e8fb0', composite: true,
    blurb: 'Sum of functionally malefic activation — daśās of dusthāna lords, Sade Sati, and afflicted transits. Not "bad" — the stretches that ask the most.' },
];

// All lines shown in the UI (domains + generic composites).
export const VEDIC_VECTORS = [...VEDIC_DOMAINS, ...VEDIC_COMPOSITES];

const KENDRAS  = new Set([1, 4, 7, 10]);
const TRIKONAS = new Set([1, 5, 9]);
const DUSTHANAS = new Set([6, 8, 12]);

// Slow grahas — the only transits with multi-year structure. Fast grahas
// (Sun..Mars) average to a flat line on a life-scale, so we exclude them
// from gochara exactly as the classical "read Jupiter & Saturn for the
// year, the others for the day" guidance implies. Rāhu/Ketu included.
const SLOW_TRANSITS = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];
// How "loud" each slow graha's transit is.
const TRANSIT_WEIGHT = { Jupiter: 0.9, Saturn: 1.0, Rahu: 0.7, Ketu: 0.7 };

// Dignity → strength multiplier. A daśā lord delivers its significations in
// proportion to its natal strength.
function dignityFactor(planet) {
  switch (planet?.dignity) {
    case 'exalted':     return 1.35;
    case 'mooltrikona': return 1.30;
    case 'own':         return 1.20;
    case 'debilitated': return 0.55;
    default:            return 1.0;   // neutral, or Rāhu/Ketu (dignity null)
  }
}

// Houses (1-based from Lagna) that a planet rules. Rāhu/Ketu rule nothing.
function housesRuledBy(planetName, lagnaSignIdx) {
  const out = [];
  for (let h = 1; h <= 12; h++) {
    const sign = (lagnaSignIdx + h - 1) % 12;
    if (RASHIS[sign].ruler === planetName) out.push(h);
  }
  return out;
}

// Functional nature score for a planet, by Lagna. Positive = functional
// benefic, negative = functional malefic. Trikona lordship is most
// benefic; dusthāna lordship most malefic; a planet that lords BOTH a
// kendra and a trikona is a yogakāraka (strongly benefic). Rāhu/Ketu have
// no lordship → treated as mild malefics (they act per dispositor, but as
// shadow grahas lean malefic for a generic composite).
function functionalScore(planetName, lagnaSignIdx) {
  const houses = housesRuledBy(planetName, lagnaSignIdx);
  if (houses.length === 0) {
    return (planetName === 'Rahu' || planetName === 'Ketu') ? -1.0 : 0;
  }
  let score = 0;
  let lordsKendra = false, lordsTrikona = false;
  for (const h of houses) {
    if (TRIKONAS.has(h))       { score += 2.0; lordsTrikona = true; }
    else if (h === 4 || h === 7 || h === 10) { score += 0.5; lordsKendra = true; }
    else if (h === 2)          { score += 0.5; }
    else if (h === 11)         { score -= 0.6; }
    else if (h === 3)          { score -= 1.0; }
    else if (DUSTHANAS.has(h)) { score -= 2.0; }
  }
  score /= houses.length;
  // Yogakāraka bonus — lords a kendra AND a trikona (e.g. Saturn for Tula
  // lagna, Venus for Makara lagna).
  if (lordsKendra && lordsTrikona) score += 1.5;
  return score;
}

// ---------------------------------------------------------------------------
// Precompute per-(lord, domain) relevance — this depends only on the natal
// chart, never on time, so we build it once and the daśā loop is a lookup.
// ---------------------------------------------------------------------------
function buildRelevanceTable(chart) {
  const lagna = chart.lagnaSignIdx;
  const planetByName = Object.fromEntries(chart.planets.map(p => [p.name, p]));
  const lords = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];

  const table = {};
  for (const lord of lords) {
    const lp = planetByName[lord];
    table[lord] = {};
    const ruled = new Set(housesRuledBy(lord, lagna));
    const occupiedHouse = lp ? lp.house : null;
    const aspectedSigns = lp ? new Set(housesAspectedBy(lord, lp.signIdx)) : new Set();
    const df = dignityFactor(lp);

    for (const domain of VEDIC_DOMAINS) {
      const domainHouses = new Set(domain.houses);
      const domainSigns = new Set(domain.houses.map(h => (lagna + h - 1) % 12));
      let rel = 0;
      // Lordship — the strongest karmic link (the lord IS the bhāva's agent).
      if (domain.houses.some(h => ruled.has(h))) rel += 1.0;
      // Kāraka — the natural significator.
      if (domain.karakas.includes(lord)) rel += 0.8;
      // Occupation — the lord sits in the bhāva.
      if (occupiedHouse != null && domainHouses.has(occupiedHouse)) rel += 0.7;
      // Dṛṣṭi — the lord aspects the bhāva.
      if ([...aspectedSigns].some(s => domainSigns.has(s))) rel += 0.4;
      table[lord][domain.id] = rel * df;
    }
  }
  return table;
}

// ---------------------------------------------------------------------------
// MAIN — build the life-vector series.
//
//   lifeVectorSeriesVedic({ chart, startYear, endYear, samplesPerYear })
//     → { years, series: [{ vector, values }], events: [{year, kind, label}] }
//
// `vector` is an entry from VEDIC_VECTORS. Values are normalised per-line to
// the line's own lifetime maximum, so each line shows its activation arc
// across the life (peak = 1.0); cross-line magnitude is intentionally not
// implied (a Career peak and a Health peak aren't on the same physical
// scale).
// ---------------------------------------------------------------------------
export function lifeVectorSeriesVedic({ chart, startYear, endYear, samplesPerYear = 12 }) {
  if (!chart || !chart.dasha) return { years: new Float64Array(0), series: [], events: [] };

  // Ensure sidereal mode (change-gated, safe even if already set).
  setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: chart.ayanamsa || 'lahiri' });

  const lagna = chart.lagnaSignIdx;
  const moon = chart.planets.find(p => p.name === 'Moon');
  const moonSign = moon ? moon.signIdx : 0;
  const sav = chart.ashtakavarga?.sav || new Array(12).fill(25);
  const relevance = buildRelevanceTable(chart);

  // Pre-resolve domain house-signs.
  const domainSigns = {};
  for (const d of VEDIC_DOMAINS) {
    domainSigns[d.id] = new Set(d.houses.map(h => (lagna + h - 1) % 12));
  }

  // Functional scores for the generic composites (time-invariant per lord).
  const funcScore = {};
  for (const lord of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']) {
    funcScore[lord] = functionalScore(lord, lagna);
  }
  const planetByName = Object.fromEntries(chart.planets.map(p => [p.name, p]));

  const totalYears = Math.max(1, endYear - startYear);
  const numSamples = Math.max(24, Math.round(totalYears * samplesPerYear));
  const years = new Float64Array(numSamples);

  // Output accumulator: per vector id → Float32Array.
  const raw = {};
  for (const v of VEDIC_VECTORS) raw[v.id] = new Float32Array(numSamples);

  // SAV → magnitude modulation. High bindu sign ⇒ a transit ripens more
  // fully. Maps SAV 0..40 → factor ~0.7..1.3 (typical 25..35 → 1.07..1.22).
  const savFactor = (signIdx) => 0.7 + (Math.min(40, Math.max(0, sav[signIdx])) / 40) * 0.6;

  for (let t = 0; t < numSamples; t++) {
    const yr = startYear + totalYears * (t / (numSamples - 1));
    years[t] = yr;
    const date = decimalYearToDate(yr);

    // ---- Daśā lords at t (dominant signal) ----
    const maha = currentMaha(chart.dasha.sequence, date);
    const antar = maha ? currentAntar(maha, date) : null;
    const running = [];
    if (maha)  running.push({ lord: maha.lord,  w: 1.0 });
    if (antar) running.push({ lord: antar.lord, w: 0.5 });

    // Per-domain daśā activation.
    for (const d of VEDIC_DOMAINS) {
      let s = 0;
      for (const r of running) s += r.w * (relevance[r.lord]?.[d.id] || 0);
      raw[d.id][t] += s;   // DASHA_WEIGHT = 1.0 (baseline)
    }

    // Generic composites from daśā functional nature.
    let shubha = 0, ashubha = 0;
    for (const r of running) {
      const fs = funcScore[r.lord] || 0;
      const df = dignityFactor(planetByName[r.lord]);
      if (fs > 0) shubha  += r.w * fs * df;
      if (fs < 0) ashubha += r.w * (-fs) * (2 - Math.min(1.35, df)); // weak malefic bites harder
    }

    // ---- Gochara of slow grahas (secondary signal) ----
    const jd = dateToJD(date);
    let transitSign = null;
    if (Number.isFinite(jd) && isInSwissRange(jd) && isSwissReady()) {
      const lons = longitudesAtDate(date);
      const rahuLon = extraLongitudeAtJD('NorthNode', jd);
      transitSign = {
        Jupiter: signOf(lons.Jupiter),
        Saturn:  signOf(lons.Saturn),
        Rahu:    rahuLon != null ? signOf(rahuLon) : null,
        Ketu:    rahuLon != null ? signOf(norm360(rahuLon + 180)) : null,
      };
    }

    if (transitSign) {
      // Saturn's house from Moon — for the Sade Sati boost.
      const satHouseFromMoon = transitSign.Saturn != null
        ? ((transitSign.Saturn - moonSign + 12) % 12) + 1 : null;
      const inSadeSati = satHouseFromMoon === 12 || satHouseFromMoon === 1 || satHouseFromMoon === 2;

      for (const d of VEDIC_DOMAINS) {
        let g = 0;
        for (const T of SLOW_TRANSITS) {
          const tSign = transitSign[T];
          if (tSign == null) continue;
          const hL = ((tSign - lagna + 12) % 12) + 1;
          let base = 0;
          if (d.houses.includes(hL)) base = 1.0;                       // transiting the bhāva
          else {
            const asp = housesAspectedBy(T, tSign);                    // aspecting the bhāva
            if (asp.some(s => domainSigns[d.id].has(s))) base = 0.4;
          }
          if (base > 0) g += base * TRANSIT_WEIGHT[T] * savFactor(tSign);
        }
        // Sade Sati intensifies the Self & Health lines.
        if (inSadeSati && (d.id === 'self' || d.id === 'health')) g += 0.6;
        raw[d.id][t] += 0.7 * g;   // GOCHARA_WEIGHT = 0.7 (daśā stays dominant)
      }

      // Composite transit modulation.
      // Jupiter's blessing — in a kendra/trikona from Lagna, or 2/5/9/11 from Moon.
      const jHL = transitSign.Jupiter != null ? ((transitSign.Jupiter - lagna + 12) % 12) + 1 : null;
      const jHM = transitSign.Jupiter != null ? ((transitSign.Jupiter - moonSign + 12) % 12) + 1 : null;
      if (jHL && (KENDRAS.has(jHL) || TRIKONAS.has(jHL))) shubha += 0.5 * savFactor(transitSign.Jupiter);
      if (jHM && [2,5,9,11].includes(jHM))                shubha += 0.4 * savFactor(transitSign.Jupiter);
      // Saturn's pressure — Sade Sati, or in a dusthāna from Lagna.
      const sHL = transitSign.Saturn != null ? ((transitSign.Saturn - lagna + 12) % 12) + 1 : null;
      if (inSadeSati)                 ashubha += 0.8;
      if (sHL && DUSTHANAS.has(sHL))  ashubha += 0.5;
      // Rāhu/Ketu over the luminaries' signs or in a dusthāna.
      for (const node of ['Rahu', 'Ketu']) {
        const nSign = transitSign[node];
        if (nSign == null) continue;
        const nHL = ((nSign - lagna + 12) % 12) + 1;
        if (DUSTHANAS.has(nHL)) ashubha += 0.3;
      }
    }

    raw.shubha[t]  += shubha;
    raw.ashubha[t] += ashubha;
  }

  // Smooth (cut sub-year wobble, keep the multi-year envelope) then
  // normalise each line to its own lifetime max.
  const radius = Math.max(2, Math.round(samplesPerYear / 4));
  const series = VEDIC_VECTORS.map(v => {
    const sm = boxcarSmooth(raw[v.id], radius);
    let mx = 0;
    for (let i = 0; i < sm.length; i++) if (sm[i] > mx) mx = sm[i];
    const norm = mx > 1e-6 ? mx : 1;
    const values = new Float32Array(sm.length);
    for (let i = 0; i < sm.length; i++) values[i] = sm[i] / norm;
    return { vector: v, values, peakRaw: mx };
  });

  const events = buildDashaEvents(chart, startYear, endYear);
  return { years, series, events };
}

function boxcarSmooth(arr, radius) {
  const N = arr.length;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let sum = 0, count = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = i + k;
      if (j >= 0 && j < N) { sum += arr[j]; count++; }
    }
    out[i] = sum / count;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Event ribbon — the authentic Vedic "big chapter" markers:
//   • Mahādaśā changes — the decade-scale life chapters.
//   • Sade Sati onsets — Saturn entering the 12th from natal Moon.
// ---------------------------------------------------------------------------
function buildDashaEvents(chart, startYear, endYear) {
  const events = [];
  const seq = chart.dasha?.sequence || [];
  for (const m of seq) {
    if (!m.start) continue;
    const yr = m.start.getUTCFullYear() + m.start.getUTCMonth() / 12;
    if (yr < startYear || yr > endYear) continue;
    events.push({ year: yr, kind: 'maha', label: `${m.lord} Mahādaśā begins`, lord: m.lord });
  }
  events.sort((a, b) => a.year - b.year);
  return events;
}
