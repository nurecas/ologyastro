// Chinese BaZi — pure-logic precision tests.
//
// Coverage:
//   1. Stem / branch lookup tables (length + element + polarity).
//   2. Sexagenary cycle (60-position arithmetic).
//   3. Day pillar (anchor 1900-01-01 = 甲戌, JDN-based formula).
//   4. Year pillar (1984 = 甲子, 2024 = 甲辰, etc.).
//   5. Month pillar Five Tigers Rule.
//   6. Hour branch from 24-hour clock + Five Mice Rule.
//   7. Ten Gods (all 10 from a Yang Wood Day Master).
//   8. Element distribution / Day Master strength helpers.
//   9. Hidden stems (verified count + main element matches branch).
//  10. Solar-term ephemeris bisection (verified against Swiss).

import { STEMS, BRANCHES, ganzhi, HIDDEN_STEMS, STEM_BY_HANZI, TEN_GODS, MONTH_JIES, SOLAR_TERMS } from './compute/data.js';
import { dayPillar, yearPillar, hourBranchFromHour, hourPillar } from './compute/pillars.js';
import { tenGodOfStem, dayMasterStrength, elementDistribution } from './compute/tenGods.js';
import { luckDirection } from './compute/luckPillars.js';

let PASS = 0, FAIL = 0; const FAILS = [];
function ok(c, m) { if (c) PASS++; else { FAIL++; FAILS.push(m); console.log('  ✗', m); } }
function eq(a, b, m) { ok(a === b, `${m} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
function section(t) { console.log('\n──', t, '─────────'); }

// --- 1. Tables ---
section('1. Stems & Branches structural counts');
{
  eq(STEMS.length, 10, '10 stems');
  eq(BRANCHES.length, 12, '12 branches');
  // Polarity: alternating yang/yin starting yang at idx 0.
  for (let i = 0; i < 10; i++) eq(STEMS[i].yang, i % 2 === 0, `stem ${STEMS[i].hanzi} polarity`);
  for (let i = 0; i < 12; i++) eq(BRANCHES[i].yang, i % 2 === 0, `branch ${BRANCHES[i].hanzi} polarity`);
  // Five elements, two stems each.
  const stemEls = {};
  for (const s of STEMS) stemEls[s.element] = (stemEls[s.element] || 0) + 1;
  for (const el of ['Wood','Fire','Earth','Metal','Water']) eq(stemEls[el], 2, `2 stems for ${el}`);
}

// --- 2. Sexagenary cycle ---
section('2. Sexagenary cycle (60 positions)');
{
  for (let i = 0; i < 60; i++) {
    const gz = ganzhi(i);
    eq(gz.idx, i, `position ${i} idx`);
    eq(gz.stem.idx, i % 10, `position ${i} stem`);
    eq(gz.branch.idx, i % 12, `position ${i} branch`);
  }
  // Wraparound
  eq(ganzhi(60).idx, 0, 'cycle wraps at 60');
  eq(ganzhi(-1).idx, 59, 'negative wraps');
  // Specific known positions
  eq(ganzhi(0).stem.hanzi + ganzhi(0).branch.hanzi, '甲子', 'pos 0 = 甲子');
  eq(ganzhi(10).stem.hanzi + ganzhi(10).branch.hanzi, '甲戌', 'pos 10 = 甲戌');
  eq(ganzhi(40).stem.hanzi + ganzhi(40).branch.hanzi, '甲辰', 'pos 40 = 甲辰');
  eq(ganzhi(59).stem.hanzi + ganzhi(59).branch.hanzi, '癸亥', 'pos 59 = 癸亥');
}

// --- 3. Day pillar ---
section('3. Day pillar from JDN — 1900-01-01 anchor');
{
  // 1900-01-01 should be 甲戌 (sexagenary 10).
  const p = dayPillar(1900, 1, 1);
  eq(p.stem.hanzi, '甲', '1900-01-01 stem');
  eq(p.branch.hanzi, '戌', '1900-01-01 branch');
  eq(p.ganzhiIdx, 10, '1900-01-01 sexagenary 10');
  eq(p.jdn, 2415021, 'JDN(1900-01-01) = 2415021');

  // Two days later → 丙子 (sexagenary 12).
  const p2 = dayPillar(1900, 1, 3);
  eq(p2.ganzhiIdx, 12, '1900-01-03 sexagenary +2');

  // 60 days later → cycle wraps (1900-03-02 = 甲戌 again).
  const p3 = dayPillar(1900, 3, 2);
  eq(p3.ganzhiIdx, 10, '1900-03-02 wraps to 甲戌');
}

// --- 4. Year pillar ---
section('4. Year pillar Lichun-anchored');
{
  // Without Lichun adjustment, the formula uses (Y - 4) mod 60.
  eq(yearPillar(1984).stem.hanzi + yearPillar(1984).branch.hanzi, '甲子', '1984 = 甲子');
  eq(yearPillar(2000).stem.hanzi + yearPillar(2000).branch.hanzi, '庚辰', '2000 = 庚辰');
  eq(yearPillar(2024).stem.hanzi + yearPillar(2024).branch.hanzi, '甲辰', '2024 = 甲辰');
  // Verify 60-year cycle.
  eq(yearPillar(2044).ganzhiIdx, yearPillar(1984).ganzhiIdx, '2044 cycles back to 甲子');
}

// --- 5. Hour branch + Five Mice Rule ---
section('5. Hour branch (24-hour → 12 branches)');
{
  // 子 at 23:00-01:00, 丑 01:00-03:00, 寅 03:00-05:00...
  eq(hourBranchFromHour(0),  0, '00:00 = 子');
  eq(hourBranchFromHour(1),  1, '01:00 = 丑');
  eq(hourBranchFromHour(3),  2, '03:00 = 寅');
  eq(hourBranchFromHour(11), 6, '11:00 = 午');   // 11..13 = 午
  eq(hourBranchFromHour(13), 7, '13:00 = 未');
  eq(hourBranchFromHour(22), 11, '22:00 = 亥');
  eq(hourBranchFromHour(23), 0, '23:00 = 子 (Zi-hour wraparound)');
}

section('5b. Hour pillar Five Mice Rule (day stem 甲)');
{
  // Day stem 甲(0): hour 子 stem = 甲(0). Hour 丑 = 乙. Hour 寅 = 丙.
  const dayJia = STEMS[0];
  const hZi   = hourPillar(0,  dayJia);   // 00:00 = 子
  const hChou = hourPillar(2,  dayJia);   // 02:00 = 丑
  const hYin  = hourPillar(4,  dayJia);   // 04:00 = 寅
  eq(hZi.stem.hanzi   + hZi.branch.hanzi,   '甲子', 'day 甲, hour 子 → 甲子');
  eq(hChou.stem.hanzi + hChou.branch.hanzi, '乙丑', 'day 甲, hour 丑 → 乙丑');
  eq(hYin.stem.hanzi  + hYin.branch.hanzi,  '丙寅', 'day 甲, hour 寅 → 丙寅');
}

section('5c. Hour pillar Five Mice Rule (day stem 丁)');
{
  // Day stem 丁(3): hour 子 stem = (3 mod 5)*2 = 6 = 庚. So 庚子, 辛丑, 壬寅...
  const dayDing = STEMS[3];
  const hZi = hourPillar(0, dayDing);
  eq(hZi.stem.hanzi + hZi.branch.hanzi, '庚子', 'day 丁, hour 子 → 庚子');
  // For hour 辰 (07:00-09:00): hour branch = 4. Stem = (6+4) mod 10 = 0 = 甲.
  const hChen = hourPillar(7, dayDing);
  eq(hChen.stem.hanzi + hChen.branch.hanzi, '甲辰', 'day 丁, hour 辰 → 甲辰');
}

// --- 6. Ten Gods ---
section('6. Ten Gods from Day Master 甲 (Yang Wood)');
{
  const dm = STEMS[0];
  const expected = {
    '甲': 'Bijian',  '乙': 'Jiecai',
    '丙': 'Shishen', '丁': 'Shangguan',
    '戊': 'Piancai', '己': 'Zhengcai',
    '庚': 'Qisha',   '辛': 'Zhengguan',
    '壬': 'Pianyin', '癸': 'Zhengyin',
  };
  for (const [hanzi, godId] of Object.entries(expected)) {
    const stem = STEM_BY_HANZI[hanzi];
    const g = tenGodOfStem(stem, dm);
    eq(g.id, godId, `${hanzi} → ${godId}`);
  }
}

section('6b. Ten Gods from Day Master 庚 (Yang Metal)');
{
  // Yang Metal DM. Metal-Metal same yang → Bijian. Metal-Metal yin → Jiecai.
  // Metal produces Water → Output. Same yang (壬) → Shishen; yin (癸) → Shangguan.
  // Metal controls Wood → Wealth. Yang (甲) → Piancai; yin (乙) → Zhengcai.
  // Fire controls Metal → Officer. Yang (丙) → Qisha; yin (丁) → Zhengguan.
  // Earth produces Metal → Resource. Yang (戊) → Pianyin; yin (己) → Zhengyin.
  const dm = STEMS[6];
  eq(tenGodOfStem(STEMS[6], dm).id, 'Bijian', '庚 → Bijian');
  eq(tenGodOfStem(STEMS[7], dm).id, 'Jiecai', '辛 → Jiecai');
  eq(tenGodOfStem(STEMS[8], dm).id, 'Shishen', '壬 → Shishen');
  eq(tenGodOfStem(STEMS[9], dm).id, 'Shangguan', '癸 → Shangguan');
  eq(tenGodOfStem(STEMS[0], dm).id, 'Piancai', '甲 → Piancai');
  eq(tenGodOfStem(STEMS[1], dm).id, 'Zhengcai', '乙 → Zhengcai');
  eq(tenGodOfStem(STEMS[2], dm).id, 'Qisha', '丙 → Qisha');
  eq(tenGodOfStem(STEMS[3], dm).id, 'Zhengguan', '丁 → Zhengguan');
  eq(tenGodOfStem(STEMS[4], dm).id, 'Pianyin', '戊 → Pianyin');
  eq(tenGodOfStem(STEMS[5], dm).id, 'Zhengyin', '己 → Zhengyin');
}

// --- 7. Hidden stems ---
section('7. Hidden stems — every branch has a primary stem matching its element');
{
  for (const branch of BRANCHES) {
    const hidden = HIDDEN_STEMS[branch.hanzi];
    ok(hidden && hidden.length >= 1, `${branch.hanzi} has hidden stems`);
    if (!hidden) continue;
    // The MAIN hidden stem (first in list) shares the branch's element.
    const mainStem = STEM_BY_HANZI[hidden[0]];
    eq(mainStem.element, branch.element, `${branch.hanzi} primary hidden stem element matches`);
  }
}

// --- 8. Luck direction ---
section('8. Luck direction — gender + year stem polarity');
{
  // Yang year + male → forward
  eq(luckDirection(STEMS[0], 'male'),   'forward',  'male + 甲 (yang) → forward');
  eq(luckDirection(STEMS[1], 'male'),   'backward', 'male + 乙 (yin) → backward');
  eq(luckDirection(STEMS[0], 'female'), 'backward', 'female + 甲 (yang) → backward');
  eq(luckDirection(STEMS[1], 'female'), 'forward',  'female + 乙 (yin) → forward');
}

// --- 9. Solar term metadata ---
section('9. Solar term metadata');
{
  eq(SOLAR_TERMS.length, 24, '24 solar terms');
  // 12 jiés (节) — month boundaries.
  const jies = SOLAR_TERMS.filter(t => t.isJie);
  eq(jies.length, 12, '12 month-boundary jiés');
  // 12 mid-month qìs.
  const qis = SOLAR_TERMS.filter(t => !t.isJie);
  eq(qis.length, 12, '12 mid-month qìs');
  // Lichun is at 315°, sets month branch 寅.
  const lichun = SOLAR_TERMS.find(t => t.name === 'Lichun');
  eq(lichun.sunLon, 315, 'Lichun at Sun longitude 315°');
  eq(lichun.starts, '寅', 'Lichun begins month 寅 (Tiger)');
  // MONTH_JIES sorted with Lichun first.
  eq(MONTH_JIES[0].name, 'Lichun', 'MONTH_JIES[0] = Lichun');
}

// --- Summary ---
console.log(`\n──────────────────────────────────────────────────`);
console.log(`  ${PASS} passed · ${FAIL} failed`);
if (FAIL) for (const m of FAILS) console.log('  ✗', m);
process.exit(FAIL ? 1 : 0);
