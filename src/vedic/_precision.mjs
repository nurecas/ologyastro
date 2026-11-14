// Vedic precision audit — pure-logic tests that DON'T require Swiss WASM.
//
// Strategy: build synthetic charts (lagnaSignIdx + planets[] with hand-set
// signIdx/lonDeg/house) and run every pure-logic detector against them.
// Cross-check against canonical Parashara / Phaladeepika expectations.
//
// Run: `node src/vedic/_precision.mjs`
//
// Coverage:
//   1. Yogas — Pancha Mahapurusha · Gajakesari · Budhaditya · Chandra-Mangala
//      · Lunar yogas · Adhi · Vipareeta · Raja Yoga (kendra-trikona) ·
//      Dhana Yoga · Parivartana · Neecha Bhanga.
//   2. Doshas — Kala Sarpa · Mangal · Combust.
//   3. Drishti — graha drishti (Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10) ·
//      rashi drishti (Jaimini sign-on-sign).
//   4. Argala — primary, secondary, virodha, cancellation.
//   5. Ashtakavarga — BAV row totals (canonical: 48/49/39/54/56/52/39),
//      SAV grand total = 337.
//   6. Vimshottari dasha — sequence sums to 120 yrs, current pratyantar is
//      inside antar inside maha.
//   7. Vargas — D-1 == natal sign; D-9 of an exalted planet stays in
//      angle/trine of D-9 lagna; vargottama detection.
//   8. Sambandha — pancha-dha symmetry where it should be (great_friend
//      mutual via natural+temporal logic).
//   9. Special lagnas — Arudha Lagna of a chart with lord in 1st = same sign.
//  10. Panchang — Tithi math: Moon ahead of Sun by 12° = Pratipada Shukla.
//  11. Upagrahas — Gulika weekday-part formula (day & night).

import { detectYogas, detectDoshas, detectKalaSarpa, detectMangalDosha, detectCombustion } from './compute/yogas.js';
import { housesAspectedBy, rashiDrishtiOf, rashiAspectMap } from './compute/drishti.js';
import { argalaOn, argalaTable } from './compute/argala.js';
import { computeBAV, computeSAV, ashtakavargaTable } from './compute/ashtakavarga.js';
import { vimshottariDasha, antarSequence, pratyantarSequence, dashaAtDate } from './compute/dasha.js';
import { vargaSignOf, computeVarga, vargottamaPlanets } from './compute/vargas.js';
import { sambandhaTable, panchadha } from './compute/sambandha.js';
import { arudhaLagna, upapadaLagna, arudhaPadaOfHouse } from './compute/specialLagnas.js';
import { computePanchang } from './compute/panchang.js';
import { rashiAspectMap as rashiAspectMap2 } from './compute/drishti.js';
import { RASHIS, NAKSHATRAS } from './compute/data.js';

let PASS = 0, FAIL = 0;
const FAILS = [];

function ok(cond, msg) {
  if (cond) { PASS++; }
  else      { FAIL++; FAILS.push(msg); console.log('  ✗', msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} — got ${a}, expected ${b}±${eps}`); }
function section(title) { console.log('\n──', title, '─────────'); }

// Helper — synthesize a planet with explicit fields.
function P(name, signIdx, lonDegInSign = 15, dignity = 'neutral') {
  return {
    name,
    signIdx,
    sign: RASHIS[signIdx].en,
    signSa: RASHIS[signIdx].sa,
    withinDeg: lonDegInSign,
    lonDeg: signIdx * 30 + lonDegInSign,
    house: 0,    // filled in by buildChart
    nakshatra: NAKSHATRAS[Math.floor((signIdx * 30 + lonDegInSign) / (360 / 27))].name,
    pada: 1,
    nakshatraIndex: Math.floor((signIdx * 30 + lonDegInSign) / (360 / 27)),
    nakshatraLord: NAKSHATRAS[Math.floor((signIdx * 30 + lonDegInSign) / (360 / 27))].lord,
    dignity,
    relation: null,
    isRetrograde: false,
    isVargottama: false,
  };
}

function buildChart(lagnaSignIdx, planets, lagnaLonDeg = lagnaSignIdx * 30 + 15) {
  // Fill in `house` field for each planet based on whole-sign frame.
  for (const p of planets) {
    p.house = ((p.signIdx - lagnaSignIdx + 12) % 12) + 1;
  }
  return {
    lagnaSignIdx,
    lagnaLonDeg,
    lagnaWithinDeg: lagnaLonDeg - lagnaSignIdx * 30,
    planets,
    ayanamsa: 'lahiri',
  };
}

// --- 1. YOGAS ---------------------------------------------------------------

section('1a. Pancha Mahapurusha — Mars exalted in Capricorn in House 1 → Ruchaka');
{
  // Lagna = Capricorn (sign 9). Mars in Capricorn at degree 28 (deepest exalt).
  // Capricorn = Mars's exaltation sign. House 1 from Capricorn = Capricorn.
  const chart = buildChart(9, [
    P('Sun', 0), P('Moon', 3), P('Mars', 9, 28, 'exalted'),
    P('Mercury', 1), P('Venus', 2), P('Jupiter', 4), P('Saturn', 5),
    P('Rahu', 6), P('Ketu', 0),
  ]);
  const yogas = detectYogas(chart);
  const ruchaka = yogas.find(y => y.id === 'pancha_mars');
  ok(ruchaka, 'Ruchaka detected');
  eq(ruchaka?.name, 'Ruchaka Yoga', 'Ruchaka name');
}

section('1b. Pancha Mahapurusha NOT triggered — Mars exalted but kendra from neither Lagna nor Moon');
{
  // Lagna = Aquarius (10). Mars in Capricorn (9) → 12th from Lagna.
  // Moon in Aquarius (10) → Mars in Capricorn = 12th from Moon also (NOT kendra).
  const chart = buildChart(10, [
    P('Sun', 0), P('Moon', 10), P('Mars', 9, 28, 'exalted'),
    P('Mercury', 1), P('Venus', 2), P('Jupiter', 4), P('Saturn', 5),
    P('Rahu', 6), P('Ketu', 0),
  ]);
  const yogas = detectYogas(chart);
  ok(!yogas.find(y => y.id === 'pancha_mars'), 'Ruchaka NOT triggered (12th from both)');
}

section('1b2. Pancha Mahapurusha — kendra from Moon ONLY (BV Raman classical reading)');
{
  // Lagna = Aquarius (10). Mars in Capricorn (9) → 12th from Lagna (NOT kendra).
  // Moon at Aries (0). Mars in Capricorn = 10th from Moon (kendra). Should fire.
  const chart = buildChart(10, [
    P('Sun', 0), P('Moon', 0), P('Mars', 9, 28, 'exalted'),
    P('Mercury', 1), P('Venus', 2), P('Jupiter', 4), P('Saturn', 5),
    P('Rahu', 6), P('Ketu', 0),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'pancha_mars'), 'Ruchaka via Moon kendra (BV Raman)');
}

section('1c. Gajakesari — Moon and Jupiter in mutual kendra');
{
  // Moon in Aries (0), Jupiter in Cancer (3) → 4th from each other.
  const chart = buildChart(0, [
    P('Sun', 8), P('Moon', 0), P('Mars', 9), P('Mercury', 8),
    P('Venus', 7), P('Jupiter', 3), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'gajakesari'), 'Gajakesari detected');
}

section('1d. Gajakesari NOT triggered — Moon and Jupiter in 3rd from each other');
{
  // Moon in Aries (0), Jupiter in Gemini (2) → 3rd from each other (not kendra).
  const chart = buildChart(0, [
    P('Sun', 8), P('Moon', 0), P('Mars', 9), P('Mercury', 8),
    P('Venus', 7), P('Jupiter', 2), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(!yogas.find(y => y.id === 'gajakesari'), 'Gajakesari NOT triggered');
}

section('1e. Budhaditya — Sun and Mercury same sign, NOT combust');
{
  // Sun at 0°, Mercury at 16° → 16° apart, > 14° combust orb.
  const chart = buildChart(0, [
    P('Sun', 0, 0), P('Moon', 3), P('Mars', 9), P('Mercury', 0, 16),
    P('Venus', 7), P('Jupiter', 4), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  const ba = yogas.find(y => y.id === 'budhaditya');
  ok(ba, 'Budhaditya detected');
  eq(ba?.strength, 'strong', 'Budhaditya not combust');
}

section('1f. Budhaditya — Sun and Mercury combust within 14°');
{
  // Sun at 10°, Mercury at 12° → 2° apart, combust.
  const chart = buildChart(0, [
    P('Sun', 0, 10), P('Moon', 3), P('Mars', 9), P('Mercury', 0, 12),
    P('Venus', 7), P('Jupiter', 4), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  const ba = yogas.find(y => y.id === 'budhaditya');
  ok(ba, 'Budhaditya detected even when combust');
  eq(ba?.strength, 'mild', 'Budhaditya weakened (combust)');
}

section('1g. Lunar yogas — Sunapha (planet in 2nd from Moon, none in 12th)');
{
  // Moon in Aries (0), Mars in Taurus (1) = 2nd from Moon. Nothing in Pisces.
  const chart = buildChart(0, [
    P('Sun', 6), P('Moon', 0), P('Mars', 1), P('Mercury', 6),
    P('Venus', 7), P('Jupiter', 8), P('Saturn', 5),
    P('Rahu', 6), P('Ketu', 0),    // Ketu conjunct Moon — but it's a node (excluded)
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'sunapha'),  'Sunapha detected');
  ok(!yogas.find(y => y.id === 'anapha'),   'Anapha NOT triggered');
  ok(!yogas.find(y => y.id === 'durudhura'),'Durudhura NOT triggered');
  ok(!yogas.find(y => y.id === 'kemadruma'),'Kemadruma NOT triggered');
}

section('1h. Lunar yogas — Anapha (planet in 12th from Moon, none in 2nd)');
{
  // Moon in Aries (0), Mars in Pisces (11) = 12th from Moon.
  const chart = buildChart(0, [
    P('Sun', 6), P('Moon', 0), P('Mars', 11), P('Mercury', 6),
    P('Venus', 7), P('Jupiter', 8), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'anapha'),    'Anapha detected');
  ok(!yogas.find(y => y.id === 'sunapha'),  'Sunapha NOT triggered');
}

section('1i. Lunar yogas — Durudhura (both 2nd and 12th occupied)');
{
  // Moon in Aries (0), Mars in Taurus (1), Saturn in Pisces (11).
  const chart = buildChart(0, [
    P('Sun', 6), P('Moon', 0), P('Mars', 1), P('Mercury', 6),
    P('Venus', 7), P('Jupiter', 8), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'durudhura'), 'Durudhura detected');
}

section('1j. Lunar yogas — Kemadruma (Moon utterly alone)');
{
  // Moon in Aries (0). Sun, Rahu, Ketu in Aries — but they\'re excluded.
  // No other planet in Aries, Taurus (2nd), or Pisces (12th).
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 0), P('Mars', 6), P('Mercury', 4),
    P('Venus', 5), P('Jupiter', 8), P('Saturn', 9),
    P('Rahu', 6), P('Ketu', 0),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'kemadruma'), 'Kemadruma detected');
}

section('1k. Adhi Yoga — benefics in 6/7/8 from Moon');
{
  // Moon in Aries (0). 6/7/8 from Moon = Virgo (5) / Libra (6) / Scorpio (7).
  // Place Jupiter, Venus, Mercury there.
  const chart = buildChart(0, [
    P('Sun', 2), P('Moon', 0), P('Mars', 9), P('Mercury', 5),
    P('Venus', 6), P('Jupiter', 7), P('Saturn', 3),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'adhi'), 'Adhi detected with all 3 benefics in 6/7/8');
}

section('1l. Vipareeta Raja Yoga — 6th lord in 8th');
{
  // Lagna = Aries (0). 6th house = Virgo (5), ruler = Mercury.
  // Mercury in 8th house = Scorpio (7).
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 0), P('Mars', 9), P('Mercury', 7),
    P('Venus', 5), P('Jupiter', 8), P('Saturn', 3),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'vipareeta_6'), 'Vipareeta from 6th lord (Harsha)');
}

section('1m. Raja Yoga — 5th lord conjunct 10th lord');
{
  // Aries lagna. 5th = Leo, lord = Sun. 10th = Capricorn, lord = Saturn.
  // Place Sun and Saturn in same sign (Aquarius).
  const chart = buildChart(0, [
    P('Sun', 10), P('Moon', 3), P('Mars', 0), P('Mercury', 4),
    P('Venus', 6), P('Jupiter', 8), P('Saturn', 10),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id.startsWith('raja_conj')), 'Raja Yoga by conjunction');
}

section('1n. Raja Yoga — kendra-trikona lord mutual aspect');
{
  // Aries lagna. 9th lord = Jupiter (Sagittarius). 4th lord = Moon (Cancer).
  // Place Jupiter in Aries, Moon in Libra (mutual 7th aspect).
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 6), P('Mars', 9), P('Mercury', 4),
    P('Venus', 7), P('Jupiter', 0), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id.startsWith('raja_aspect_') && y.id.includes('Jupiter') && y.id.includes('Moon')), 'Raja Yoga by mutual aspect (Jupiter-Moon)');
}

section('1o. Dhana Yoga — 2nd lord conjunct 11th lord');
{
  // Aries lagna. 2nd = Taurus, lord = Venus. 11th = Aquarius, lord = Saturn.
  // Place Venus and Saturn together in any sign.
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 3), P('Mars', 0), P('Mercury', 4),
    P('Venus', 8), P('Jupiter', 7), P('Saturn', 8),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id.startsWith('dhana_2_11')), 'Dhana Yoga 2-11 detected');
}

section('1p. Parivartana — Maha Parivartana between kendra and trikona lords');
{
  // Aries lagna. 1st lord = Mars (Aries). 5th lord = Sun (Leo).
  // Mars in Leo, Sun in Aries → mutual exchange.
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 3), P('Mars', 4), P('Mercury', 4),
    P('Venus', 7), P('Jupiter', 8), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  const par = yogas.find(y => y.id === 'parivartana_1_5');
  ok(par, 'Parivartana 1-5 detected');
  ok(par && par.name.startsWith('Maha'), 'Classified as Maha Parivartana (kendra-trikona)');
}

section('1q. Parivartana — Dainya between trika lords');
{
  // Aries lagna. 6th lord = Mercury (Virgo). 8th lord = Mars (Scorpio).
  // Mercury in Scorpio, Mars in Virgo → exchange.
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 3), P('Mars', 5), P('Mercury', 7),
    P('Venus', 11), P('Jupiter', 8), P('Saturn', 9),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  const par = yogas.find(y => y.id === 'parivartana_6_8');
  ok(par, 'Parivartana 6-8 detected');
  ok(par && par.name.startsWith('Dainya'), 'Classified as Dainya (trika-trika)');
}

section('1r. Neecha Bhanga — exalted lord aspects debilitated planet');
{
  // Place Sun debilitated in Libra (sign 6). Sun's exaltation = Aries (sign 0).
  // Lord of Aries = Mars. Place Mars in Aries (so it aspects Libra by 7th).
  // Aries lagna so Mars is in Lagna (kendra).
  const chart = buildChart(0, [
    P('Sun', 6, 10, 'debilitated'),
    P('Moon', 3), P('Mars', 0), P('Mercury', 4),
    P('Venus', 7), P('Jupiter', 8), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const yogas = detectYogas(chart);
  ok(yogas.find(y => y.id === 'neecha_bhanga_sun'), 'Neecha Bhanga for Sun (Mars in kendra + 7th aspect)');
}

// --- 2. DOSHAS --------------------------------------------------------------

section('2a. Kala Sarpa — all classical planets in Rahu→Ketu half');
{
  // Rahu at 0° Aries (0), Ketu at 0° Libra (6). All planets in Aries..Virgo.
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 1), P('Mars', 2), P('Mercury', 3),
    P('Venus', 4), P('Jupiter', 5), P('Saturn', 5),
    P('Rahu', 0, 0),
    P('Ketu', 6, 0),
  ]);
  const ks = detectKalaSarpa(chart);
  ok(ks, 'Kala Sarpa detected');
}

section('2b. Kala Sarpa NOT triggered — one planet outside the arc');
{
  // Rahu at 0° Aries, Ketu at 0° Libra. Saturn in Sagittarius (8) — outside.
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 1), P('Mars', 2), P('Mercury', 3),
    P('Venus', 4), P('Jupiter', 5), P('Saturn', 8),
    P('Rahu', 0, 0),
    P('Ketu', 6, 0),
  ]);
  const ks = detectKalaSarpa(chart);
  ok(!ks, 'Kala Sarpa NOT triggered');
}

section('2c. Mangal Dosha — Mars in 7th from Lagna');
{
  // Lagna = Aries (0). Mars in Libra (6) = 7th house.
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 0), P('Mars', 6), P('Mercury', 4),
    P('Venus', 5), P('Jupiter', 8), P('Saturn', 9),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const md = detectMangalDosha(chart);
  ok(md, 'Mangal Dosha detected (Mars in 7th)');
  eq(md?.severity, 'strong', 'Mangal Dosha severity strong (from Lagna)');
}

section('2d. Mangal Dosha mitigated — Mars exalted in Capricorn');
{
  // Lagna = Cancer (3). Mars in Capricorn (9) = 7th from Lagna. Exalted.
  const chart = buildChart(3, [
    P('Sun', 0), P('Moon', 0), P('Mars', 9, 28, 'exalted'),
    P('Mercury', 4), P('Venus', 5), P('Jupiter', 8), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const md = detectMangalDosha(chart);
  ok(md, 'Mangal Dosha detected even when exalted');
  eq(md?.severity, 'mitigated', 'Mangal Dosha severity mitigated');
}

section('2e. Combust — Mercury within 14° of Sun');
{
  const chart = buildChart(0, [
    P('Sun', 0, 10), P('Moon', 3), P('Mars', 9), P('Mercury', 0, 16),
    P('Venus', 7), P('Jupiter', 4), P('Saturn', 5),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const cb = detectCombustion(chart);
  ok(cb.find(c => c.planet === 'Mercury'), 'Mercury combust detected');
}

// --- 3. DRISHTI -------------------------------------------------------------

section('3a. Graha drishti — Mars aspects 4th, 7th, 8th from itself');
{
  // Mars in Aries (0). Aspects = signs 3 (Cancer, 4th), 6 (Libra, 7th), 7 (Scorpio, 8th).
  const aspects = housesAspectedBy('Mars', 0);
  eq(aspects.length, 3, 'Mars aspects 3 signs');
  ok(aspects.includes(3), '4th = Cancer');
  ok(aspects.includes(6), '7th = Libra');
  ok(aspects.includes(7), '8th = Scorpio');
}

section('3b. Graha drishti — Jupiter aspects 5th, 7th, 9th');
{
  const aspects = housesAspectedBy('Jupiter', 0);
  eq(aspects.length, 3, 'Jupiter aspects 3 signs');
  ok(aspects.includes(4), '5th = Leo');
  ok(aspects.includes(6), '7th = Libra');
  ok(aspects.includes(8), '9th = Sagittarius');
}

section('3c. Graha drishti — Saturn aspects 3rd, 7th, 10th');
{
  const aspects = housesAspectedBy('Saturn', 0);
  eq(aspects.length, 3, 'Saturn aspects 3 signs');
  ok(aspects.includes(2), '3rd = Gemini');
  ok(aspects.includes(6), '7th = Libra');
  ok(aspects.includes(9), '10th = Capricorn');
}

section('3d. Rashi drishti — Aries (Movable) aspects Fixed signs except Taurus');
{
  // Aries = Movable. Should aspect Leo, Scorpio, Aquarius (fixed) — NOT Taurus.
  const targets = rashiDrishtiOf(0);
  eq(targets.length, 3, 'Aries aspects 3 fixed signs');
  ok(targets.includes(4),  'aspects Leo');
  ok(targets.includes(7),  'aspects Scorpio');
  ok(targets.includes(10), 'aspects Aquarius');
  ok(!targets.includes(1), 'does NOT aspect Taurus (2nd from movable)');
}

section('3e. Rashi drishti — Leo (Fixed) aspects Movable signs except Cancer');
{
  // Leo = Fixed. Aspects Movable: Aries, Capricorn, Libra. NOT Cancer (12th from Leo).
  const targets = rashiDrishtiOf(4);
  eq(targets.length, 3, 'Leo aspects 3 movable signs');
  ok(targets.includes(0),  'aspects Aries');
  ok(targets.includes(6),  'aspects Libra');
  ok(targets.includes(9),  'aspects Capricorn');
  ok(!targets.includes(3), 'does NOT aspect Cancer (12th from fixed)');
}

section('3f. Rashi drishti — Gemini (Dual) aspects the other three Duals');
{
  // Gemini = Dual. Aspects Virgo, Sagittarius, Pisces (other duals).
  const targets = rashiDrishtiOf(2);
  eq(targets.length, 3, 'Gemini aspects 3 dual signs');
  ok(targets.includes(5),  'aspects Virgo');
  ok(targets.includes(8),  'aspects Sagittarius');
  ok(targets.includes(11), 'aspects Pisces');
}

// --- 4. ARGALA --------------------------------------------------------------

section('4. Argala — primary 2nd argala cancelled by virodha 12th');
{
  const chart = buildChart(0, [
    P('Sun', 1),     // 2nd from Lagna — primary 2nd argala
    P('Mars', 3),    // 4th from Lagna — primary 4th argala
    P('Saturn', 11), // 12th from Lagna — virodha to 2nd
    P('Mercury', 4), P('Jupiter', 10), P('Venus', 6),
    P('Moon', 0), P('Rahu', 5), P('Ketu', 11),
  ]);
  const a = argalaOn(chart, 0);
  const second = a.primary.find(p => p.kind === '2nd');
  ok(second, 'argala 2nd entry');
  eq(second?.cancelled, true, 'cancelled by virodha (Saturn count >= Sun count)');
  const fourth = a.primary.find(p => p.kind === '4th');
  eq(fourth?.cancelled, false, '4th NOT cancelled (no virodha occupants)');
}

// --- 5. ASHTAKAVARGA -------------------------------------------------------

section('5a. Ashtakavarga — per-planet BAV totals match BPHS canon');
{
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 11), P('Mars', 9), P('Mercury', 5),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
  ]);
  const bav = computeBAV(chart);
  const expected = { Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39 };
  for (const [name, exp] of Object.entries(expected)) {
    const sum = bav[name].reduce((a, b) => a + b, 0);
    eq(sum, exp, `BAV ${name} total`);
  }
}

section('5b. Ashtakavarga — SAV grand total = 337');
{
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 11), P('Mars', 9), P('Mercury', 5),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
  ]);
  const sav = computeSAV(chart);
  const total = sav.reduce((a, b) => a + b, 0);
  eq(total, 337, 'SAV grand total');
  ok(sav.every(v => v >= 0 && v <= 56), 'every SAV cell in [0,56]');
}

// --- 6. VIMSHOTTARI DASHA --------------------------------------------------

section('6a. Vimshottari — sequence covers ≥ 120 yrs from birth (loop overshoots)');
{
  const tree = vimshottariDasha(45.0, new Date(1990, 5, 21), 120);
  // Sum of "remaining" of running maha + full lengths of all subsequent.
  // Loop exits the FIRST time acc >= windowYears, so total exceeds 120 by
  // the size of the last entry added (up to 20 yrs). Verify ≥ 120 strictly.
  let total = tree.sequence[0].remainingAtBirthYears;
  for (let i = 1; i < tree.sequence.length; i++) total += tree.sequence[i].years;
  ok(total >= 120 && total <= 120 + 20, `Vimshottari sequence covers ≥ 120 yrs (got ${total.toFixed(2)})`);
}

section('6b. Vimshottari — antarSequence within a maha sums to maha.years');
{
  const tree = vimshottariDasha(45.0, new Date(1990, 5, 21), 120);
  const venus = tree.sequence.find(m => m.lord === 'Venus');
  if (venus) {
    const antars = antarSequence(venus);
    const sum = antars.reduce((a, b) => a + b.years, 0);
    approx(sum, venus.years, 0.001, 'antardasha sum = mahadasha years');
    eq(antars.length, 9, 'antardasha count = 9');
    eq(antars[0].lord, venus.lord, 'first antardasha is the maha lord itself');
  } else {
    ok(false, 'Venus maha exists somewhere');
  }
}

section('6c. Vimshottari — pratyantar within antar sums to antar.years');
{
  const tree = vimshottariDasha(45.0, new Date(1990, 5, 21), 120);
  const venus = tree.sequence.find(m => m.lord === 'Venus');
  if (venus) {
    const antars = antarSequence(venus);
    const a0 = antars[0];
    const prats = pratyantarSequence(a0);
    const sum = prats.reduce((s, p) => s + p.years, 0);
    approx(sum, a0.years, 0.0001, 'pratyantar sum = antar years');
  } else {
    ok(false, 'Venus maha exists somewhere');
  }
}

section('6d. Vimshottari — running lord = nakshatra lord');
{
  // Moon at 5° Krittika (Sun-ruled, nak index 2) → running maha lord = Sun.
  const lon = 26.6667 + 1;  // 1° into Krittika (which spans 26°40' Aries to 10°00' Taurus)
  const tree = vimshottariDasha(lon, new Date(1990, 5, 21), 120);
  eq(tree.runningLord, 'Sun', 'running lord matches nakshatra lord');
  eq(tree.nakshatraIndex, 2, 'nakshatra index 2 (Krittika)');
}

// --- 7. VARGAS -------------------------------------------------------------

section('7a. Varga D-1 — divisional sign equals natal sign');
{
  for (let s = 0; s < 12; s++) {
    for (const w of [0, 5, 15, 25, 29.99]) {
      const v = vargaSignOf(s * 30 + w, 1);
      eq(v, s, `D-1 of ${RASHIS[s].en} ${w}° → ${RASHIS[s].en}`);
    }
  }
}

section('7b. Varga D-9 (Navamsa) — BPHS Ch.6 v.10-11 starting points');
{
  // Movable signs start from same sign.
  eq(vargaSignOf(0,        9), 0, 'Aries 0° → Aries (movable: same)');
  eq(vargaSignOf(3.5,      9), 1, 'Aries 3.5° → Taurus (2nd navamsa)');
  eq(vargaSignOf(90,       9), 3, 'Cancer 0° → Cancer (movable: same)');
  // Fixed signs start from the 9th sign (1-indexed) from same — i.e. the
  // movable sign of the SAME triplicity. Leo (fire) → Aries; Taurus → Capricorn.
  eq(vargaSignOf(120,      9), 0, 'Leo 0° → Aries (fixed: 9th from = movable of same triplicity)');
  eq(vargaSignOf(30,       9), 9, 'Taurus 0° → Capricorn');
  // Dual signs start from the 5th sign (1-indexed) from same. Gemini → Libra.
  eq(vargaSignOf(60,       9), 6, 'Gemini 0° → Libra (dual: 5th from)');
  eq(vargaSignOf(150,      9), 9, 'Virgo 0° → Capricorn');
}

section('7c. Vargottama — planet in same sign in D-1 and D-9');
{
  // Place Sun in Aries at 0° → D-1 = Aries, D-9 of Aries 0° = Aries.
  const chart = buildChart(0, [
    P('Sun', 0, 0), P('Moon', 3), P('Mars', 9), P('Mercury', 5),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const vargot = vargottamaPlanets(chart);
  ok(vargot.includes('Sun'), 'Sun is vargottama at Aries 0°');
}

// --- 8. SAMBANDHA ---------------------------------------------------------

section('8. Sambandha — Sun-Moon natural friend; in mutual 7th = temporal enemy');
{
  // Sun in Aries (0), Moon in Libra (6) — mutually 7th. Naturally Sun's friend.
  // Tatkalika: Moon is at 7 from Sun → enemy. Naisargika: Sun→Moon = F.
  // Combine F + E = neutral.
  const chart = buildChart(0, [
    P('Sun', 0), P('Moon', 6), P('Mars', 9), P('Mercury', 5),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const r = panchadha(chart, 'Sun', 'Moon');
  eq(r, 'neutral', 'Sun-Moon = F + E = neutral');
}

// --- 9. SPECIAL LAGNAS -----------------------------------------------------

section('9a. Arudha Lagna — lord in Lagna → AL = 10th from Lagna (BPHS Ch.13)');
{
  // Aries lagna with Mars (Aries lord) in Aries. Naive AL = Aries (same as ref).
  // Degeneracy fix: take 10th sign from Aries (1-indexed inclusive) = Capricorn.
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 3), P('Mars', 0), P('Mercury', 4),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const al = arudhaLagna(chart);
  eq(al.signIdx, 9, 'Arudha Lagna = Capricorn (10th from Aries)');
}

section('9b. Arudha Lagna — lord in 7th → AL = 10th from Lagna');
{
  // Aries lagna, Mars in Libra (7th). 2L-R mod 12 = 12 mod 12 = 0 = Aries.
  // Degenerate. AL = 10th from Aries = Capricorn (sign 9).
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 3), P('Mars', 6), P('Mercury', 4),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const al = arudhaLagna(chart);
  eq(al.signIdx, 9, 'Arudha Lagna degeneracy → Capricorn');
}

section('9c. Arudha Lagna — lord in 4th → AL = 4th from Lagna');
{
  // Aries lagna, Mars in Cancer (4th). 2L-R mod 12 = (6-0) mod 12 = 6 = Libra.
  // Naive AL = Libra (= ref+6, the 7th from ref). Degenerate.
  // AL = 10th from Libra = Cancer (sign 3).
  const chart = buildChart(0, [
    P('Sun', 5), P('Moon', 3), P('Mars', 3), P('Mercury', 4),
    P('Jupiter', 8), P('Venus', 6), P('Saturn', 11),
    P('Rahu', 4), P('Ketu', 10),
  ]);
  const al = arudhaLagna(chart);
  eq(al.signIdx, 3, 'Arudha Lagna degeneracy (lord in 4th) → Cancer');
}

// --- 10. PANCHANG ---------------------------------------------------------

section('10. Panchang — Tithi from Sun-Moon difference');
{
  const local = new Date(2020, 5, 21, 12, 0, 0);
  // Moon 6° ahead of Sun → still within Shukla Pratipada (0°-12°).
  const p = computePanchang(0, 6, local);
  eq(p.tithi.paksha, 'Shukla', 'Tithi paksha (waxing)');
  eq(p.tithi.name,   'Pratipada', 'Pratipada at 6° elongation');
  // Moon 12° ahead = boundary, transitions to Dvitiya.
  const p2 = computePanchang(0, 12, local);
  eq(p2.tithi.name, 'Dvitiya', 'Dvitiya begins at 12° elongation');
  // Moon 174° ahead → in Shukla 15 (168°-180°) = Purnima.
  const p3 = computePanchang(0, 174, local);
  eq(p3.tithi.name, 'Purnima', 'Purnima before 180°');
  // Moon 195° ahead → Krishna paksha.
  const p4 = computePanchang(0, 195, local);
  eq(p4.tithi.paksha, 'Krishna', 'Krishna paksha after 180°');
  // Moon 354° ahead → Krishna 30 = Amavasya (348°-360°).
  const p5 = computePanchang(0, 354, local);
  eq(p5.tithi.name, 'Amavasya', 'Amavasya before reset');
}

// --- 12. Dignity precedence — BPHS exaltation / mooltrikona / own (audit c) ---
section('12. Dignity precedence (BPHS ch. 3): exaltation, mooltrikona, own sign');
{
  const { dignityOf } = await import('./compute/chart.js');
  const S = (sign, deg) => sign * 30 + deg;
  const cases = [
    // Mercury in Virgo: uccha to 15°, mooltrikona 15-20°, own 20-30°.
    ['Mercury', S(5, 10),   'exalted'],
    ['Mercury', S(5, 17),   'mooltrikona'],
    ['Mercury', S(5, 25),   'own'],
    ['Mercury', S(2, 10),   'own'],          // Gemini
    // Moon in Taurus: uccha to 3°, mooltrikona the rest.
    ['Moon',    S(1, 2),    'exalted'],
    ['Moon',    S(1, 10),   'mooltrikona'],
    ['Moon',    S(3, 10),   'own'],          // Cancer
    // Sun: Leo mooltrikona 0-20°, own 20-30°; exalted Aries.
    ['Sun',     S(4, 10),   'mooltrikona'],
    ['Sun',     S(4, 25),   'own'],
    ['Sun',     S(0, 25),   'exalted'],
    // Mars: Aries MT 0-12°, own 12-30°; Scorpio own; Capricorn exalted.
    ['Mars',    S(0, 5),    'mooltrikona'],
    ['Mars',    S(0, 20),   'own'],
    ['Mars',    S(7, 5),    'own'],
    ['Mars',    S(9, 5),    'exalted'],
    // Jupiter: Sagittarius MT 0-10°, own 10-30°; Pisces own; Cancer exalted.
    ['Jupiter', S(8, 5),    'mooltrikona'],
    ['Jupiter', S(8, 15),   'own'],
    ['Jupiter', S(3, 25),   'exalted'],
    // Venus: Libra MT 0-15°, own 15-30°; Taurus own; Pisces exalted.
    ['Venus',   S(6, 5),    'mooltrikona'],
    ['Venus',   S(6, 20),   'own'],
    ['Venus',   S(1, 5),    'own'],
    ['Venus',   S(11, 5),   'exalted'],
    // Saturn: Aquarius MT 0-20°, own 20-30°; Capricorn own; Libra exalted.
    ['Saturn',  S(10, 5),   'mooltrikona'],
    ['Saturn',  S(10, 25),  'own'],
    ['Saturn',  S(9, 5),    'own'],
    ['Saturn',  S(6, 5),    'exalted'],
    // Debilitation still whole-sign.
    ['Mercury', S(11, 20),  'debilitated'],
    ['Moon',    S(7, 20),   'debilitated'],
  ];
  for (const [pl, lon, want] of cases) eq(dignityOf(pl, lon), want, `${pl} at ${RASHIS[Math.floor(lon / 30)].en} ${(lon % 30).toFixed(0)}° → ${want}`);
}

// --- 13. Vara runs sunrise to sunrise (audit b) — needs Swiss ---------------
section('13. Vara (weekday) changes at local sunrise, not at midnight');
{
  const { initSwiss } = await import('../astro/ephemeris.js');
  const { computeVedicChart } = await import('./compute/chart.js');
  await initSwiss();
  const delhi = { year: 1990, month: 6, day: 21, minute: 0, tzOffsetMin: 330, latDeg: 28.6139, lonDeg: 77.2090 };
  // 1990-06-21 was a Thursday; Delhi sunrise that day ≈ 05:24 IST.
  const pre  = computeVedicChart({ ...delhi, hour: 4 });
  eq(pre?.panchang?.vara, 'Wednesday', 'Delhi 1990-06-21 04:00 IST (before sunrise) is still Wednesday');
  const post = computeVedicChart({ ...delhi, hour: 6 });
  eq(post?.panchang?.vara, 'Thursday', 'Delhi 1990-06-21 06:00 IST (after sunrise) is Thursday');
  const eve  = computeVedicChart({ ...delhi, hour: 23 });
  eq(eve?.panchang?.vara, 'Thursday', 'Delhi 1990-06-21 23:00 IST is still Thursday (until next sunrise)');
}

// --- 14. Gulika = Saturn's eighth of the day / night (BPHS 3.66-68) --------
section('14. Upagrahas — Gulika part is the Saturn-ruled eighth; weekday from sunrise');
{
  const { computeUpagrahas } = await import('./compute/upagrahas.js');
  const delhi = { minute: 0, tzOffsetMin: 330, latDeg: 28.6139, lonDeg: 77.2090 };
  // Day parts are ruled from the weekday lord in weekday order, 8th lordless:
  // Saturn's part = Sun 7, Mon 6, Tue 5, Wed 4, Thu 3, Fri 2, Sat 1.
  // Night parts start from the 5th lord from the weekday lord:
  // Saturn's part = Sun 3, Mon 2, Tue 1, Wed 7, Thu 6, Fri 5, Sat 4.
  const thuDay = computeUpagrahas({ ...delhi, year: 1990, month: 6, day: 21, hour: 10 });
  eq(thuDay?.weekday, 4, 'Delhi 1990-06-21 10:00 IST → Thursday');
  eq(thuDay?.isDayBirth, true, '… day birth');
  eq(thuDay?.partNumber, 3, '… Gulika = 3rd day part (Saturn) on Thursday');
  // Saturn's day part starts at sunrise + 2/8 of daylight. Sunrise 05:23:46 IST,
  // sunset 19:21:50 IST (Astronomy Engine) → part 3 starts 08:53:17 IST = 03:23:17Z.
  const st = thuDay?.partRange?.startDate;
  ok(st && Math.abs(st.getTime() - Date.parse('1990-06-21T03:23:17Z')) < 90000, `… Thursday part 3 starts ≈ 03:23:17Z (got ${st && st.toISOString()})`);
  const wedNight = computeUpagrahas({ ...delhi, year: 1990, month: 6, day: 21, hour: 4 });
  eq(wedNight?.weekday, 3, 'Delhi 1990-06-21 04:00 IST (pre-dawn) → Wednesday night');
  eq(wedNight?.isDayBirth, false, '… night birth');
  eq(wedNight?.partNumber, 7, '… Gulika = 7th night part (Saturn) on Wednesday night');
  const sunNight = computeUpagrahas({ ...delhi, year: 2026, month: 11, day: 15, hour: 21 });
  eq(sunNight?.weekday, 0, 'Delhi 2026-11-15 21:00 IST → Sunday');
  eq(sunNight?.partNumber, 3, '… Gulika = 3rd night part (Saturn) on Sunday night');
  const satDay = computeUpagrahas({ ...delhi, year: 2026, month: 11, day: 14, hour: 7 });
  eq(satDay?.partNumber, 1, 'Saturday day → Gulika = 1st part');
}

// --- 15. Sade Sati / Ashtama window boundaries refined to the day ---------
section('15. Sade Sati window start/end = Saturn sidereal ingress (±2 days)');
{
  const { computeVedicChart } = await import('./compute/chart.js');
  const { computeSaturnPeriods } = await import('./compute/sadeSati.js');
  // Moon in Aquarius (sidereal 309.5°). Saturn (Lahiri) entered Capricorn on
  // 2020-01-24 and leaves Pisces for Aries on 2028-02-23 (independent
  // Astronomy-Engine bisection; matches published transit dates).
  const c = computeVedicChart({ year: 1990, month: 1, day: 1, hour: 12, minute: 0, tzOffsetMin: 0, latDeg: 28.6, lonDeg: 77.2 });
  const P = computeSaturnPeriods(c, { now: new Date('2026-01-01') });
  const w = P?.sadeSati?.find(x => x.start.getUTCFullYear() === 2020);
  const days = (a, iso) => Math.abs(a.getTime() - Date.parse(iso)) / 86400000;
  ok(w && days(w.start, '2020-01-24T05:27Z') <= 2, `Sade Sati starts 2020-01-24 (got ${w && w.start.toISOString().slice(0, 10)})`);
  ok(w && days(w.end, '2028-02-23T13:23Z') <= 2, `Sade Sati ends 2028-02-23 (got ${w && w.end.toISOString().slice(0, 10)})`);
  const prev = P?.sadeSati?.find(x => x.start.getUTCFullYear() === 1990);
  ok(prev && days(prev.start, '1990-03-20T19:22Z') <= 2, `previous Sade Sati starts 1990-03-20 (got ${prev && prev.start.toISOString().slice(0, 10)})`);
  // Moon in Sagittarius: Saturn leaves Capricorn 1993-03-05 but retrogrades
  // back in for 25 days (1993-10-15 → 11-09); the window ends at the final exit.
  const c2 = computeVedicChart({ year: 1966, month: 4, day: 10, hour: 12, minute: 0, tzOffsetMin: 0, latDeg: 20, lonDeg: 0 });
  const P2 = computeSaturnPeriods(c2, { now: new Date('2026-01-01') });
  const w2 = P2?.sadeSati?.find(x => x.start.getUTCFullYear() === 1984);
  ok(w2 && days(w2.end, '1993-11-09T00:00Z') <= 2, `Sade Sati 1984-93 ends at the final egress 1993-11-09 (got ${w2 && w2.end.toISOString().slice(0, 10)})`);
}

// --- SUMMARY --------------------------------------------------------------

console.log(`\n──────────────────────────────────────────────────`);
console.log(`  ${PASS} passed · ${FAIL} failed`);
if (FAIL) {
  console.log('\nFAILURES:');
  for (const m of FAILS) console.log('  ✗', m);
}
process.exit(FAIL ? 1 : 0);
