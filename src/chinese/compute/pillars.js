// Chinese BaZi — the Four Pillars (四柱).
//
// Year   Pillar = stem-branch of the SOLAR year (Lichun-anchored, NOT Jan 1)
// Month  Pillar = stem-branch derived from the active solar-term jié + year stem
// Day    Pillar = stem-branch from the sexagenary day cycle
// Hour   Pillar = stem-branch from the local hour + day stem
//
// Each pillar carries a Heavenly Stem (天干) over an Earthly Branch (地支).
// In a written chart the stems sit on top, branches below.

import { STEMS, BRANCHES, BRANCH_BY_HANZI, ganzhi } from './data.js';
import { lichunBefore, jieBefore, jieAfter, jiePrevious } from './solarTerms.js';
import { dateToJD, isSwissReady } from '../../astro/ephemeris.js';

// ---------------------------------------------------------------------------
// Day Pillar — sexagenary cycle anchored on a known reference date.
//
// Anchor: 1900-01-01 (Gregorian) was a 甲戌 day. Sexagenary index of 甲戌 is 10
// (stem 甲=0, branch 戌=10; CRT: n ≡ 0 (mod 10), n ≡ 10 (mod 12) → n=10).
//
// The Julian Day Number of 1900-01-01 is 2415021. So:
//   day_index = (JDN + 49) mod 60
// where 49 = (10 - 21) mod 60 = (10 - (2415021 mod 60)) mod 60.
//
// Day-boundary convention: the day pillar uses the LOCAL Gregorian date.
// (Some classical schools advance the day pillar at 23:00 Zi-hour; we
// expose `useZiAdvance` as an option but default to midnight-local.)
// ---------------------------------------------------------------------------
const DAY_INDEX_OFFSET = 49;

function jdnOfDate(year, month, day) {
  // Standard Gregorian → JDN. JDN labels the calendar day at noon UT.
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
         Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function dayPillar(localYear, localMonth, localDay, localHour = 0, options = {}) {
  let yr = localYear, mo = localMonth, da = localDay;
  // Optional Zi-hour day advance — birth from 23:00 to 23:59 belongs to
  // the NEXT calendar day's day-pillar in classical schools.
  if (options.useZiAdvance && localHour >= 23) {
    const d = new Date(Date.UTC(yr, mo - 1, da + 1));
    yr = d.getUTCFullYear(); mo = d.getUTCMonth() + 1; da = d.getUTCDate();
  }
  const jdn = jdnOfDate(yr, mo, da);
  const idx = ((jdn + DAY_INDEX_OFFSET) % 60 + 60) % 60;
  const stem   = STEMS[idx % 10];
  const branch = BRANCHES[idx % 12];
  return { stem, branch, ganzhiIdx: idx, jdn };
}

// ---------------------------------------------------------------------------
// Year Pillar — solar year, Lichun-anchored.
//
// effectiveYear = Gregorian year if birth ≥ Lichun of that year, else year-1.
// stem  = ((effectiveYear - 4) mod 10)   →  index into STEMS
// branch = ((effectiveYear - 4) mod 12)  →  index into BRANCHES
//
// Reference: year 4 CE was 甲子 (cycle position 0), so Y - 4 mod 60 gives
// the cycle position. Modern check: 1984 = 甲子 (Y-4=1980, mod 60 = 0). ✓
// ---------------------------------------------------------------------------
export function yearPillar(effectiveSolarYear) {
  const idx = ((effectiveSolarYear - 4) % 60 + 60) % 60;
  return {
    stem: STEMS[idx % 10],
    branch: BRANCHES[idx % 12],
    ganzhiIdx: idx,
    solarYear: effectiveSolarYear,
  };
}

// Determine the EFFECTIVE solar year from birth UT and Lichun crossings.
// Returns { solarYear, lichunJD, lichunDate }.
export function effectiveSolarYear(birthUTC) {
  const jd = dateToJD(birthUTC);
  const lichun = lichunBefore(jd);
  if (!lichun) return null;
  // The Gregorian year of Lichun's date is the effective solar year.
  const y = lichun.date.getUTCFullYear();
  return { solarYear: y, lichunJD: lichun.jd, lichunDate: lichun.date };
}

// ---------------------------------------------------------------------------
// Month Pillar — solar month, jié-anchored.
//
// Branch = Earthly Branch whose month begins at the most recent jié.
// Stem   = derived from year stem via the Five Tigers Rule (五虎遁月):
//
//   Year stem  甲/己 → first month (寅) stem = 丙
//   Year stem  乙/庚 → first month (寅) stem = 戊
//   Year stem  丙/辛 → first month (寅) stem = 庚
//   Year stem  丁/壬 → first month (寅) stem = 壬
//   Year stem  戊/癸 → first month (寅) stem = 甲
//
// Pattern: stem_at_寅 = (year_stem mod 5) * 2 + 2  (mod 10), 0-indexed.
//   year 0/5 (甲/己) → 2 (丙) ✓
//   year 1/6 (乙/庚) → 4 (戊) ✓
//   year 2/7 (丙/辛) → 6 (庚) ✓
//   year 3/8 (丁/壬) → 8 (壬) ✓
//   year 4/9 (戊/癸) → 0 (甲) ✓
//
// Then each successive month branch (after 寅) advances the stem by +1.
// ---------------------------------------------------------------------------
export function monthPillar(birthUTC, yearStem) {
  const jd = dateToJD(birthUTC);
  const jie = jieBefore(jd);
  if (!jie) return null;
  const branch = BRANCH_BY_HANZI[jie.starts];
  if (!branch) return null;
  // Months count from 寅 (branch 2). monthOffset = number of jiés past Lichun.
  // branch.idx ∈ {2..11, 0, 1}. monthOffset = (branch.idx - 2 + 12) mod 12.
  const monthOffset = ((branch.idx - 2) + 12) % 12;
  const stemAtYin = ((yearStem.idx % 5) * 2 + 2) % 10;
  const stemIdx = (stemAtYin + monthOffset) % 10;
  const stem = STEMS[stemIdx];
  return {
    stem,
    branch,
    monthOffset,
    jie: { name: jie.name, hanzi: jie.hanzi, sunLon: jie.sunLon, jd: jie.jd, date: jie.date },
    nextJie: jieAfter(jd),
  };
}

// ---------------------------------------------------------------------------
// Hour Pillar.
//
// Branch — 12 two-hour blocks anchored on Zi (子) at 23:00-01:00.
//   Branch index from local hour: ((h + 1) >> 1) mod 12 (using 1-based math)
// More explicitly:
//   23:00–01:00 → 子 (0)
//   01:00–03:00 → 丑 (1)
//   03:00–05:00 → 寅 (2)
//   ...
//   21:00–23:00 → 亥 (11)
//
// Stem from Day stem (Five Mice Rule 五鼠遁時):
//   Day stem 甲/己 → hour 子 stem = 甲 (0)
//   Day stem 乙/庚 → hour 子 stem = 丙 (2)
//   Day stem 丙/辛 → hour 子 stem = 戊 (4)
//   Day stem 丁/壬 → hour 子 stem = 庚 (6)
//   Day stem 戊/癸 → hour 子 stem = 壬 (8)
//
// Pattern: hour_zi_stem = (day_stem mod 5) * 2.
// ---------------------------------------------------------------------------
export function hourBranchFromHour(hour24) {
  // Map 0..23 → branch 0..11.
  // 23 → 0 (子), 0..1 → 0 (子), 1..3 → 1 (丑), 3..5 → 2 (寅), ..., 21..23 → 11 (亥).
  const h = ((hour24 % 24) + 24) % 24;
  if (h === 23) return 0;
  return Math.floor((h + 1) / 2) % 12;
}

export function hourPillar(localHour, dayStem) {
  const branchIdx = hourBranchFromHour(localHour);
  const branch = BRANCHES[branchIdx];
  const stemAtZi = ((dayStem.idx % 5) * 2) % 10;
  const stemIdx = (stemAtZi + branchIdx) % 10;
  const stem = STEMS[stemIdx];
  return { stem, branch };
}

// ---------------------------------------------------------------------------
// MAIN — assemble all four pillars from a birth.
// Returns { year, month, day, hour } each as { stem, branch, ... }.
// ---------------------------------------------------------------------------
export function fourPillars(birth) {
  if (!birth || !isSwissReady()) return null;
  const utc = new Date(Date.UTC(
    birth.year, birth.month - 1, birth.day,
    birth.hour, birth.minute, 0,
  ).valueOf() - (birth.tzOffsetMin || 0) * 60000);

  // Local clock (the user's birth time as wall-clock).
  const localDate = new Date(utc.getTime() + (birth.tzOffsetMin || 0) * 60000);
  const localYear  = localDate.getUTCFullYear();
  const localMonth = localDate.getUTCMonth() + 1;
  const localDay   = localDate.getUTCDate();
  const localHour  = localDate.getUTCHours();
  const localMinute= localDate.getUTCMinutes();

  // Year Pillar via Lichun.
  const sy = effectiveSolarYear(utc);
  if (!sy) return null;
  const year = yearPillar(sy.solarYear);

  // Month Pillar via active jié + year stem.
  const month = monthPillar(utc, year.stem);
  if (!month) return null;

  // Day Pillar — local Gregorian date.
  const day = dayPillar(localYear, localMonth, localDay, localHour);

  // Hour Pillar — local hour + day stem.
  const hour = hourPillar(localHour, day.stem);

  return {
    year, month, day, hour,
    utc, localDate,
    localYear, localMonth, localDay, localHour, localMinute,
    lichun: { jd: sy.lichunJD, date: sy.lichunDate, solarYear: sy.solarYear },
  };
}

// Convenience: get the "Day Master" (the day's stem) — the central
// reference for all reading.
export function dayMaster(pillars) {
  return pillars?.day?.stem || null;
}
