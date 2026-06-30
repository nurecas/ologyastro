// Vedic — main chart compute. Wraps the shared Swiss ephemeris in
// sidereal Lahiri mode (or another ayanamsa picked in settings) and assembles
// a Vedic-flavoured chart object: lagna, planets in whole-sign houses,
// nakshatra+pada per body, dignities, dasha tree.

import {
  longitudesAtDate, extraLongitudeAtJD, dateToJD, gmst, obliquity,
  isSwissReady, isInSwissRange, setEphemerisOptions, computeHousesSwiss,
  PLANETS,
} from '../../astro/ephemeris.js';
import { birthToUTCDate } from '../../personal/astro/natal.js';
import {
  RASHIS, NAKSHATRAS, OWN_SIGN, EXALT, DEBIL, MOOLTRIKONA, NAISARGIKA,
  VEDIC_BODIES,
} from './data.js';
import { vimshottariDasha } from './dasha.js';
import { computePanchang } from './panchang.js';
import { detectYogas, detectDoshas } from './yogas.js';
import { vargottamaPlanets } from './vargas.js';
import { sambandhaTable } from './sambandha.js';
import { arudhaLagna, upapadaLagna } from './specialLagnas.js';
import { argalaTable } from './argala.js';
import { ashtakavargaTable } from './ashtakavarga.js';
import { computeUpagrahas } from './upagrahas.js';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const NAK_SPAN = 360 / 27;
const PADA_SPAN = NAK_SPAN / 4;

function norm360(x) { let y = x % 360; if (y < 0) y += 360; return y; }

function signOf(lonDeg) {
  const d = norm360(lonDeg);
  return Math.floor(d / 30);
}

function nakshatraOf(lonDeg) {
  const d = norm360(lonDeg);
  const idx = Math.floor(d / NAK_SPAN);
  const within = d - idx * NAK_SPAN;
  const pada = Math.floor(within / PADA_SPAN) + 1;
  return { ...NAKSHATRAS[idx], padaIndex: pada, withinDeg: within };
}

function dignityOf(planet, lonDeg) {
  const sign = signOf(lonDeg);
  const within = norm360(lonDeg) - sign * 30;
  const owns = OWN_SIGN[planet] || [];
  if (owns.includes(sign)) {
    const mt = MOOLTRIKONA[planet];
    if (mt && mt.sign === sign && within >= mt.from && within <= mt.to) return 'mooltrikona';
    return 'own';
  }
  const ex = EXALT[planet];
  if (ex && ex.sign === sign) return 'exalted';
  const de = DEBIL[planet];
  if (de && de.sign === sign) return 'debilitated';
  return 'neutral';
}

// Naisargika friendship of a planet with the lord of the sign it sits in.
function relationshipWithLord(planet, sign) {
  const ruler = RASHIS[sign].ruler;
  if (ruler === planet) return 'self';
  const row = NAISARGIKA[planet];
  if (!row) return null;       // rahu/ketu — skipped
  return ({ F: 'friend', E: 'enemy', N: 'neutral' }[row[ruler]] || null);
}

// Compute the sidereal Ascendant via Swiss (Whole-Sign houses) and return
// (lonDeg, signIdx, withinDeg). `birth` is the user's birth descriptor.
function computeLagna(birth, jd) {
  const houses = computeHousesSwiss(jd, birth.latDeg, birth.lonDeg, 'whole-sign');
  if (!houses) {
    // Standish fallback — use a hand-computed ascendant on the tropical
    // longitude minus a coarse Lahiri correction. This path is rarely
    // hit; vedic.html only loads when Swiss is ready, but guard anyway.
    const eps = obliquity(jd);
    const ramc = gmst(jd) + birth.lonDeg * DEG;
    const phi = birth.latDeg * DEG;
    const y = -Math.cos(ramc);
    const x = Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(ramc);
    let asc = Math.atan2(y, x) + Math.PI;
    asc = (((asc * RAD) % 360) + 360) % 360;
    return { lonDeg: asc, signIdx: signOf(asc), withinDeg: asc - signOf(asc) * 30 };
  }
  const lonDeg = houses.asc;
  return { lonDeg, signIdx: signOf(lonDeg), withinDeg: lonDeg - signOf(lonDeg) * 30 };
}

// Main entry. Returns a Vedic chart object suitable for both UI rendering
// and JSON export.
export function computeVedicChart(birth, options = {}) {
  const { ayanamsa = 'lahiri' } = options;
  // Force sidereal mode for this whole computation. (vedic.html sets this
  // once at boot too; setting again here is idempotent.)
  setEphemerisOptions({ zodiac: 'sidereal', ayanamsa });

  const utc = birthToUTCDate(birth);
  const jd  = dateToJD(utc);

  if (!isSwissReady() || !isInSwissRange(jd)) {
    // Vedic relies on Swiss for sidereal positions and Whole-Sign houses.
    // If Swiss isn't available, return a "loading" placeholder.
    return null;
  }

  const lagna = computeLagna(birth, jd);
  const lagnaSign = lagna.signIdx;

  const lonsClassical = longitudesAtDate(utc);
  const rahuLon = extraLongitudeAtJD('NorthNode', jd);

  // Build planet list. Drop Uranus/Neptune/Pluto for the classical Vedic
  // surface (they're not part of the Parashara seven; we'll add them as
  // optional overlays in a future phase).
  const bodies = [];
  const classicalNames = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
  for (const name of classicalNames) {
    bodies.push({ name, lonDeg: lonsClassical[name] });
  }
  if (rahuLon != null) {
    bodies.push({ name: 'Rahu', lonDeg: rahuLon });
    bodies.push({ name: 'Ketu', lonDeg: norm360(rahuLon + 180) });
  }

  const planets = bodies.map(b => {
    const sign = signOf(b.lonDeg);
    const within = norm360(b.lonDeg) - sign * 30;
    const nak = nakshatraOf(b.lonDeg);
    const dignity = ['Rahu','Ketu'].includes(b.name) ? null : dignityOf(b.name, b.lonDeg);
    const relation = ['Rahu','Ketu'].includes(b.name) ? null : relationshipWithLord(b.name, sign);
    const house = ((sign - lagnaSign + 12) % 12) + 1;
    return {
      name: b.name,
      lonDeg: b.lonDeg,
      signIdx: sign,
      sign: RASHIS[sign].en,
      signSa: RASHIS[sign].sa,
      withinDeg: within,
      house,
      nakshatra: nak.name,
      nakshatraIndex: nak.index,
      pada: nak.padaIndex,
      nakshatraLord: nak.lord,
      dignity,
      relation,
      isRetrograde: false,        // we compute from longitudesAtDate which doesn't return speed; ignore here
    };
  });

  // Vimshottari dasha seeded from the Moon's sidereal longitude.
  const moon = planets.find(p => p.name === 'Moon');
  const dasha = moon ? vimshottariDasha(moon.lonDeg, utc, 120) : null;

  // Panchang at birth — Tithi · Yoga · Karana · Vara · Nakshatra.
  // For Vara we must use the LOCAL calendar day, not UT: a 2 AM IST birth
  // is 8:30 PM UT of the previous day, which would yield the wrong weekday.
  const sun = planets.find(p => p.name === 'Sun');
  const localDate = new Date(utc.getTime() + (birth.tzOffsetMin || 0) * 60000);
  const panchang = (sun && moon) ? computePanchang(sun.lonDeg, moon.lonDeg, localDate) : null;

  // Build a partial chart so detectors below can reference standard fields.
  // Special lagnas + sambandha need lagnaLonDeg / lagnaSignIdx + planets.
  const partial = {
    lagnaSignIdx: lagnaSign,
    lagnaLonDeg: lagna.lonDeg,
    planets,
  };
  const yogas      = detectYogas(partial);
  const doshas     = detectDoshas(partial);
  // Vargottama: planet in same sign in D-1 and D-9. Annotate the planet
  // objects so the UI can highlight them.
  const vargot     = new Set(vargottamaPlanets(partial));
  for (const p of planets) p.isVargottama = vargot.has(p.name);
  const sambandha  = sambandhaTable(partial);
  const arudha     = arudhaLagna(partial);
  const upapada    = upapadaLagna(partial);

  // Argala (interventional houses) — for each of the 12 bhāvas, what does
  // the 2nd/4th/5th/11th from it look like, and is it counter-cancelled?
  // Cheap to compute once per chart.
  const argala = argalaTable(partial);

  // Ashtakavarga — BAV per planet + SAV per house, classical Parashara
  // bindu table. Pre-computed so the Strength UI doesn't recalculate per
  // render; small enough (336 cells) to be free.
  const ashtakavarga = ashtakavargaTable(partial);

  // Upagrahas (Gulika & Mandi) — computed from sunrise/sunset of the
  // local birth day. Adds them as separate kind:'upagraha' entries below
  // the 9 grahas in the planet table.
  const upagrahas = computeUpagrahas(birth, { lagnaSignIdx: lagnaSign, ayanamsa });

  return {
    birth,
    utc,
    jd,
    ayanamsa,
    lagnaLonDeg: lagna.lonDeg,
    lagnaSignIdx: lagnaSign,
    lagnaSign: RASHIS[lagnaSign].en,
    lagnaSignSa: RASHIS[lagnaSign].sa,
    lagnaWithinDeg: lagna.withinDeg,
    planets,
    dasha,
    panchang,
    yogas,
    doshas,
    sambandha,
    arudha,
    upapada,
    argala,
    ashtakavarga,
    upagrahas,
    vargottama: [...vargot],
  };
}

// Helper: the planets that fall in each whole-sign house, given a chart.
export function planetsByHouse(chart) {
  const out = Array.from({ length: 12 }, () => []);
  for (const p of chart.planets) out[p.house - 1].push(p);
  return out;
}

// Helper: the sign that occupies each whole-sign house.
export function signInHouse(chart, house1based) {
  return (chart.lagnaSignIdx + (house1based - 1)) % 12;
}
