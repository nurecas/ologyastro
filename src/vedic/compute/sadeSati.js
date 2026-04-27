// Sade Sati & Saturn-from-Moon transit periods.
//
// Sade Sati is Saturn's ~7.5 year transit through three signs — the sign
// before Moon (12th from Moon), the Moon's sign itself, and the sign after
// Moon (2nd from Moon). It happens roughly every 28–30 years.
//
// We also compute Ashtama Shani (Saturn in 8th from Moon) and Ardha-
// Ashtama Shani (Saturn in 4th from Moon) — each ~2.5 years, mini
// versions of Sade Sati read as periods of testing.
//
// Algorithm: scan Saturn's sidereal sign monthly across the full lifetime
// window. Group consecutive months in the relevant sign(s) into periods;
// merge gaps shorter than ~1 year (retrograde dips). Then refine each
// period boundary to ±1 day by re-scanning daily across the ±1 month
// neighbourhood of the monthly transition — this gives ≤24 h precision on
// every "Saturn enters / exits sign X" date instead of the ±15 days a
// monthly scan alone produces.

import { longitudesAtDate } from '../../astro/ephemeris.js';
import { RASHIS } from './data.js';

const MS_MONTH = 30 * 86400000;
const MS_DAY   = 86400000;

function signOf(lon) {
  const x = ((lon % 360) + 360) % 360;
  return Math.floor(x / 30);
}

// Sample Saturn's sidereal sign monthly across [from, to]. Returns array
// of { date, signIdx }.
function sampleSaturn(from, to) {
  const out = [];
  let t = from.getTime();
  const end = to.getTime();
  while (t <= end) {
    const d = new Date(t);
    const lon = longitudesAtDate(d).Saturn;
    out.push({ date: d, signIdx: signOf(lon) });
    t += MS_MONTH;
  }
  return out;
}

// Group consecutive samples whose sign matches the predicate `targetFn`
// into periods. Bridges retrograde gaps shorter than `mergeGapMs`.
function groupBySign(samples, targetFn, mergeGapMs = 365 * 86400000) {
  const periods = [];
  let cur = null;
  for (const s of samples) {
    const matches = targetFn(s.signIdx);
    if (matches) {
      if (!cur) cur = { start: s.date, end: s.date, signs: new Set([s.signIdx]) };
      else { cur.end = s.date; cur.signs.add(s.signIdx); }
    } else if (cur) {
      periods.push(cur);
      cur = null;
    }
  }
  if (cur) periods.push(cur);
  // Merge close-together periods (Saturn retrograde dipping out then back).
  const merged = [];
  for (const p of periods) {
    const last = merged[merged.length - 1];
    if (last && (p.start.getTime() - last.end.getTime()) < mergeGapMs) {
      last.end = p.end;
      for (const s of p.signs) last.signs.add(s);
    } else {
      merged.push({ ...p, signs: new Set(p.signs) });
    }
  }
  return merged;
}

// Refine a monthly-resolution date down to ±1 day.
// `coarse` anchors a sign transition; we scan ±35 days daily around it.
//
//   refineSignEntry — return the FIRST day Saturn enters `newSign` in the
//   window. If Saturn retrogrades in/out/in, we want the first entry that
//   begins this phase, not the last (which would be a re-entry after a
//   retrograde dip — that's not the start of the period).
function refineSignEntry(coarse, newSign) {
  const start = new Date(coarse.getTime() - 35 * MS_DAY);
  let prev = signOf(longitudesAtDate(start).Saturn);
  for (let t = start.getTime() + MS_DAY; t <= coarse.getTime() + 35 * MS_DAY; t += MS_DAY) {
    const d = new Date(t);
    const cur = signOf(longitudesAtDate(d).Saturn);
    if (prev !== newSign && cur === newSign) return d;
    prev = cur;
  }
  return coarse;  // fallback if no transition found in the window
}
function refineSignExit(coarse, sign) {
  const start = new Date(coarse.getTime() - 35 * MS_DAY);
  let exit = coarse;
  let prev = signOf(longitudesAtDate(start).Saturn);
  for (let t = start.getTime() + MS_DAY; t <= coarse.getTime() + 35 * MS_DAY; t += MS_DAY) {
    const d = new Date(t);
    const cur = signOf(longitudesAtDate(d).Saturn);
    if (prev === sign && cur !== sign) exit = new Date(t - MS_DAY);
    prev = cur;
  }
  return exit;
}

// For each Sade Sati period, compute the start/end of each phase
// (12th-from-Moon → Moon-sign → 2nd-from-Moon) by scanning the
// month-by-month timeline within that period, then refining each
// boundary to daily resolution.
function buildPhases(period, samples, moonSign) {
  const phasesIdx = [(moonSign + 11) % 12, moonSign, (moonSign + 1) % 12];
  const phaseLabels = ['Phase 1 · Setting Phase (12th from Moon)', 'Phase 2 · Peak Phase (Moon sign)', 'Phase 3 · Rising Phase (2nd from Moon)'];
  const within = samples.filter(s =>
    s.date >= period.start && s.date <= period.end
  );
  return phasesIdx.map((sign, i) => {
    const matchingSamples = within.filter(s => s.signIdx === sign);
    if (!matchingSamples.length) {
      return { label: phaseLabels[i], sign, signName: RASHIS[sign].en, start: null, end: null };
    }
    const coarseStart = matchingSamples[0].date;
    const coarseEnd   = matchingSamples[matchingSamples.length - 1].date;
    return {
      label: phaseLabels[i],
      sign,
      signName: RASHIS[sign].en,
      start: refineSignEntry(coarseStart, sign),
      end:   refineSignExit(coarseEnd, sign),
    };
  });
}

// Compute every Sade Sati and Ashtama-Shani period across a window.
// Returns:
//   { sadeSati: [{ start, end, phases: [{label, sign, start, end}] }],
//     ashtamaShani: [{ start, end }],
//     ardhaAshtama: [{ start, end }],
//     currentSadeSati: <period or null>,
//     currentSubPhase: <phase or null>,
//     samples: optional debug }
//
// `birthDate` and `now` (defaults to "today") let us scope the window to a
// reasonable lifetime span.
export function computeSaturnPeriods(chart, options = {}) {
  if (!chart) return null;
  const moon = chart.planets.find(p => p.name === 'Moon');
  if (!moon) return null;
  const moonSign = moon.signIdx;
  const sadeSatiSigns = new Set([(moonSign + 11) % 12, moonSign, (moonSign + 1) % 12]);
  const ashtamaSign   = (moonSign + 7) % 12;   // 8th from Moon
  const ardhaSign     = (moonSign + 3) % 12;   // 4th from Moon

  const now = options.now || new Date();
  // Window: must cover (a) the user's full lifetime and (b) the present
  // and near future, regardless of how old the chart is. For a chart
  // born 1900 with "now" = 2026, a fixed birth±N window misses the
  // present, so we union (birth − 50 yrs, birth + 100 yrs) with
  // (now − 30 yrs, now + 30 yrs).
  const birth = chart.utc;
  const YR = 365.25 * 86400000;
  const from = new Date(Math.min(birth.getTime() - 50 * YR, now.getTime() - 30 * YR));
  const to   = new Date(Math.max(birth.getTime() + 100 * YR, now.getTime() + 30 * YR));

  const samples = sampleSaturn(from, to);

  const sadeSati = groupBySign(samples, s => sadeSatiSigns.has(s));
  const ashtama  = groupBySign(samples, s => s === ashtamaSign);
  const ardha    = groupBySign(samples, s => s === ardhaSign);

  const sadeSatiPeriods = sadeSati.map(p => ({
    start: p.start,
    end:   p.end,
    phases: buildPhases(p, samples, moonSign),
  }));

  const ms = now.getTime();
  const currentSadeSati = sadeSatiPeriods.find(p =>
    p.start.getTime() <= ms && p.end.getTime() >= ms
  ) || null;
  const currentSubPhase = currentSadeSati
    ? currentSadeSati.phases.find(ph => ph.start && ph.start.getTime() <= ms && ph.end && ph.end.getTime() >= ms) || null
    : null;
  const currentAshtama = ashtama.find(p => p.start.getTime() <= ms && p.end.getTime() >= ms) || null;
  const currentArdha   = ardha.find(p => p.start.getTime() <= ms && p.end.getTime() >= ms) || null;

  return {
    moonSign,
    moonSignName: RASHIS[moonSign].en,
    sadeSati: sadeSatiPeriods,
    ashtamaShani: ashtama.map(p => ({ start: p.start, end: p.end })),
    ardhaAshtamaShani: ardha.map(p => ({ start: p.start, end: p.end })),
    currentSadeSati,
    currentSubPhase,
    currentAshtama,
    currentArdha,
  };
}
