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

console.log(`\n──────────────────────────────────────`);
console.log(`  ${PASS} passed · ${FAIL} failed`);
if (FAIL) for (const m of FAILS) console.log('  ✗', m);
process.exit(FAIL ? 1 : 0);
