// Gematria / Numerology — precision tests.
//
// Run: node src/gematria/_precision.mjs
//
// The gematria system previously shipped with NO automated coverage, so a
// wrong letter value or a mistyped corpus entry could go unnoticed. This suite
// pins:
//   1. Canonical letter-value cross-checks (Hebrew / Greek / English ordinal).
//   2. Accented (polytonic) Greek — must NFD-normalise so precomposed vowels
//      still score (regression: Ἰησοῦς scored 478 instead of 888).
//   3. Corpus integrity — every EQUIVALENT_CORPUS entry's stored `value` must
//      equal the actual gematria of its word (regression: HUMAN was 56 not 57,
//      CROSS was 67 not 74).

import { computeGreek, computeEnglish, computeHebrew, computeForLang } from './compute/calculate.js';
import { EQUIVALENT_CORPUS, EQUIV_SYSTEM } from './compute/equivalents.js';

let PASS = 0, FAIL = 0; const FAILS = [];
const ok = (c, m) => c ? PASS++ : (FAIL++, FAILS.push(m), console.log('  ✗', m));
const section = t => console.log('\n──', t, '──────');
const valOf = (rows, name) => rows.find(r => r.name === name)?.value;

section('Canonical cross-checks');
ok(valOf(computeHebrew('חי'), 'Mispar Hechrechi') === 18, 'Hebrew חי (chai) = 18');
ok(valOf(computeHebrew('אמת'), 'Mispar Hechrechi') === 441, 'Hebrew אמת (emet) = 441');
ok(valOf(computeHebrew('שלום'), 'Mispar Hechrechi') === 376, 'Hebrew שלום (shalom) = 376');
ok(valOf(computeGreek('ιησους'), 'Isopsephy') === 888, 'Greek ιησους (Iesous) = 888');
ok(valOf(computeGreek('τειταν'), 'Isopsephy') === 666, 'Greek τειταν (Teitan) = 666');
ok(valOf(computeEnglish('GOD'), 'English Ordinal') === 26, 'English Ordinal GOD = 26');

section('Accented (polytonic) Greek — NFD normalisation');
ok(valOf(computeGreek('Ἰησοῦς'), 'Isopsephy') === 888, 'accented Ἰησοῦς = 888 (was 478 before NFD fix)');
ok(valOf(computeGreek('ἀμήν'), 'Isopsephy') === 99, 'accented ἀμήν = 99 (was 90)');
ok(valOf(computeGreek('ἀμήν'), 'Isopsephy') === valOf(computeGreek('αμην'), 'Isopsephy'),
   'accented and bare Greek score identically');

section('English data fixes');
ok(valOf(computeEnglish('HUMAN'), 'English Ordinal') === 57, 'HUMAN ordinal = 57');
ok(valOf(computeEnglish('CROSS'), 'English Ordinal') === 74, 'CROSS ordinal = 74');
ok(valOf(computeEnglish('MOON'), 'English Ordinal') === 57, 'MOON ordinal = 57 (HUMAN\'s true match)');

section('Corpus integrity — every stored value equals its computed gematria');
let mismatches = 0;
for (const e of EQUIVALENT_CORPUS) {
  const rows = computeForLang(e.word, e.lang);
  const computed = valOf(rows, EQUIV_SYSTEM[e.lang]);
  if (computed !== e.value) {
    mismatches++;
    console.log(`  ✗ ${e.lang} ${e.word} stored ${e.value} but computes ${computed}`);
  }
}
ok(mismatches === 0, `all ${EQUIVALENT_CORPUS.length} corpus entries match their computed value`);

section('Date numerology conventions (audit d)');
{
  const { lifePath, personalYear, pinnacles } = await import('./compute/numberMeanings.js');
  // Life path keeps masters: 2000-01-08 → 1 + 8 + 2 = 11.
  ok(lifePath(2000, 1, 8).final === 11, 'life path 2000-01-08 = 11');
  // First pinnacle ends at 36 − (life path reduced to one digit): 11 → 2 → 34.
  const p = pinnacles(2000, 1, 8);
  ok(p[0].period === 'Birth — age 34', `LP 11 first pinnacle ends at 34 (got "${p[0].period}")`);
  ok(p[1].period === 'Age 35 — 43', `LP 11 second pinnacle 35-43 (got "${p[1].period}")`);
  // Pinnacles reduce month/day/year to single digits first; 11 and 22 survive
  // only in the resulting pinnacle. 1975-11-22: M 2, D 4, Y 4.
  const q = pinnacles(1975, 11, 22).map(x => x.value);
  ok(JSON.stringify(q) === JSON.stringify([6, 8, 5, 6]), `pinnacles 1975-11-22 = [6,8,5,6] (got ${JSON.stringify(q)})`);
  const r = pinnacles(1975, 11, 22);
  ok(r[0].period === 'Birth — age 35', `1975-11-22 (LP 55→1) first pinnacle ends 35 (got "${r[0].period}")`);
  // A master pinnacle is still possible: 1990-02-09 → P1 = 2 + 9 = 11.
  ok(pinnacles(1990, 2, 9)[0].value === 11, 'pinnacle sum 11 is kept as a master');
  // Personal year: single-digit components, result 1-9 with 11/22 kept, never 33.
  const py = personalYear(11, 11, 2009);
  ok(py.final === 6, `personal year 11/11 in 2009 = 2+2+2 = 6, not 33 (got ${py.final})`);
  ok(personalYear(1, 1, 2025).final === 11, 'personal year 1 + 1 + 9 = 11 is kept as a master');
  ok(personalYear(2, 9, 2024).final === 1, 'personal year 2 + 9 + 8 = 19 → 1');
}

section('Date numerology reference date is an explicit local date (audit e)');
{
  const { localDateISO, referenceYear } = await import('./compute/numberMeanings.js');
  // 23:30 local on 31 Dec is still the old year whatever the device zone.
  ok(localDateISO(new Date(2026, 11, 31, 23, 30)) === '2026-12-31', 'localDateISO uses the local calendar date');
  ok(localDateISO(new Date(2027, 0, 1, 0, 15)) === '2027-01-01', 'localDateISO just after local midnight');
  ok(referenceYear('2031-05-01') === 2031, 'an explicit reference date selects another year');
  ok(typeof referenceYear() === 'number', 'default reference year is today (local)');
}

section('Letter variants that must not score 0');
{
  const { computeArabic } = await import('./compute/calculate.js');
  const abjad = (w) => computeArabic(w)[0].value;
  // Persian/Urdu keyboards type yeh as U+06CC and kaf as U+06A9.
  ok(abjad('علي') === 110, 'Arabic علي (Arabic yeh) = 110');
  ok(abjad('علی') === 110, `Persian-keyboard علی (U+06CC yeh) = 110 (got ${abjad('علی')})`);
  ok(abjad('کتاب') === abjad('كتاب'), `کتاب with U+06A9 kaf = كتاب (got ${abjad('کتاب')} vs ${abjad('كتاب')})`);
  ok(abjad('ٱلله') === abjad('الله'), 'alif wasla ٱ scores as alif');
  // Greek: digamma (= stigma, 6), archaic koppa (90), lunate sigma (200).
  ok(valOf(computeGreek('ϝ'), 'Isopsephy') === 6, 'digamma ϝ = 6');
  ok(valOf(computeGreek('ϙ'), 'Isopsephy') === 90, 'archaic koppa ϙ = 90');
  ok(valOf(computeGreek('ϲ'), 'Isopsephy') === 200 && valOf(computeGreek('Ϲ'), 'Isopsephy') === 200, 'lunate sigma ϲ Ϲ = 200');
}

console.log(`\n──────────────────────────────────────`);
console.log(`  ${PASS} passed · ${FAIL} failed`);
if (FAIL) for (const m of FAILS) console.log('  ✗', m);
process.exit(FAIL ? 1 : 0);
