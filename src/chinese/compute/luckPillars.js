// Chinese BaZi — Luck Pillars (大运 dà yùn) — 10-year decadal cycles
// walking forward or backward through the sexagenary cycle from the
// month pillar.
//
// Direction:
//   Forward  if (Male AND year-stem is yang) OR (Female AND year-stem is yin)
//   Backward if (Male AND year-stem is yin)  OR (Female AND year-stem is yang)
//
// Starting age: derived from the time between birth and the next/previous
// solar-term jié, using the classical "3 days = 1 year" conversion. The
// number of days between birth and the relevant jié, divided by 3, gives
// the starting age in years (so each luck pillar runs ~10 calendar years).
//   - Forward: distance to NEXT jié.
//   - Backward: distance from PREVIOUS jié to birth.

import { STEMS, BRANCHES, ganzhi } from './data.js';
import { jieAfter, jieBefore } from './solarTerms.js';
import { dateToJD } from '../../astro/ephemeris.js';

// 3 days of life ≈ 1 year of luck-pillar age (classical convention).
const DAYS_PER_LUCK_YEAR = 3;

// Determine direction. `gender` is 'male' | 'female'.
export function luckDirection(yearStem, gender) {
  const yearYang = !!yearStem.yang;
  const male = gender === 'male';
  const forward = (male && yearYang) || (!male && !yearYang);
  return forward ? 'forward' : 'backward';
}

// Starting age in years (decimal — the user transitions onto Luck Pillar 1
// at this age).
//
// Forward: distance from BIRTH to the NEXT jié (the upcoming month boundary).
// Backward: distance from the MOST RECENT jié BEFORE birth to BIRTH (i.e.
//   the days already elapsed since the active month-pillar boundary).
// Both are days; divide by 3 (classical "3 days = 1 year") to get years.
export function luckStartingAge(birthUTC, direction) {
  const jd = dateToJD(birthUTC);
  let bracketJD;
  if (direction === 'forward') {
    const next = jieAfter(jd);
    if (!next) return null;
    bracketJD = next.jd;
  } else {
    const prev = jieBefore(jd);     // most recent jié BEFORE birth
    if (!prev) return null;
    bracketJD = prev.jd;
  }
  const days = Math.abs(bracketJD - jd);
  return days / DAYS_PER_LUCK_YEAR;
}

// Build the luck-pillar sequence. Each pillar is 10 years long. Returns
// an array of:
//   { stem, branch, ganzhiIdx, startAge, endAge, startDate, endDate }
//
// `pillars`: the four pillars from pillars.js (we use month + year to
//            seed direction and starting position).
// `birth`:   the birth descriptor — needed for absolute date math.
// `gender`:  'male' | 'female'.
// `count`:   how many luck pillars to compute (default 10 → 100 years of
//            life coverage).
const MS_YEAR = 365.25636 * 86400000;   // sidereal year for date math
                                         // (matches Vimshottari for consistency)

export function luckPillars(pillars, birth, gender, count = 10) {
  if (!pillars || !birth) return null;
  const direction = luckDirection(pillars.year.stem, gender);
  const startAge = luckStartingAge(pillars.utc, direction);
  if (startAge == null) return null;
  // Seed: the MONTH pillar's ganzhi index. First luck pillar is the next
  // (forward) or previous (backward) ganzhi.
  const seedIdx = (pillars.month.stem.idx % 10) +
                  ((pillars.month.branch.idx - (pillars.month.stem.idx % 10)) +
                   60 * 10) % 60;
  // The seed in the sexagenary cycle:
  //   month_ganzhi_idx is the cycle position whose stem-mod10 == month.stem.idx
  //   AND branch-mod12 == month.branch.idx. Find it via CRT.
  const monthCycleIdx = sexagenaryFromStemBranch(
    pillars.month.stem.idx, pillars.month.branch.idx,
  );

  const out = [];
  let cycleIdx = monthCycleIdx;
  for (let i = 0; i < count; i++) {
    cycleIdx = direction === 'forward'
      ? (cycleIdx + 1) % 60
      : (cycleIdx + 59) % 60;
    const gz = ganzhi(cycleIdx);
    const sAge = startAge + i * 10;
    const eAge = sAge + 10;
    const sMs = pillars.utc.getTime() + sAge * MS_YEAR;
    const eMs = pillars.utc.getTime() + eAge * MS_YEAR;
    out.push({
      stem: gz.stem,
      branch: gz.branch,
      ganzhiIdx: cycleIdx,
      startAge: sAge,
      endAge: eAge,
      startDate: new Date(sMs),
      endDate: new Date(eMs),
    });
  }
  return { direction, startingAge: startAge, pillars: out };
}

// Helper: given (stem index 0-9, branch index 0-11), return the
// sexagenary position 0-59. The cycle requires both indices increment in
// lockstep, so (stemIdx % 10, branchIdx % 12) uniquely determines a single
// position 0-59 — but only for valid ganzhi pairs (stem-branch with the
// same parity in 0/1 indexing). Invalid pairs (mismatched parity) don't
// appear in the cycle and would never be passed here.
function sexagenaryFromStemBranch(stemIdx, branchIdx) {
  // CRT: find n in [0,60) with n ≡ stemIdx (mod 10) AND n ≡ branchIdx (mod 12).
  for (let n = 0; n < 60; n++) {
    if (n % 10 === stemIdx && n % 12 === branchIdx) return n;
  }
  return null;
}
