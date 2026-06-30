// Vedic — Vimshottari dasha.
// Seeded from the Moon's nakshatra at birth: the lord of that nakshatra is
// the running mahadasha; the proportion already traversed within the
// nakshatra determines how much of that dasha has elapsed at birth.
// Sub-period (antardasha) durations within a mahadasha M of length M-years
// are M·P/120 for each planet P, walked through the same VIM_DASHA cycle
// starting at M itself.

import { NAKSHATRAS, VIM_DASHA, VIM_TOTAL } from './data.js';

const NAK_SPAN = 360 / 27;   // 13.3333° per nakshatra
// Vimshottari "year" — the classical solar year per Surya Siddhanta and
// modern Jyotish software (Jagannatha Hora, Parashara's Light) is the
// SIDEREAL year, 365.25636 days. Using a Gregorian year (365.2425) would
// drift ~1.66 days across the 120-year cycle. The sidereal value is the
// authoritative choice for dasha date math.
const MS_YEAR  = 365.25636 * 86400000;

function lordIndexOf(name) {
  return VIM_DASHA.findIndex(d => d.lord === name);
}

// Returns the running mahadasha at birth + start date of the FIRST elapsed
// (already-running) dasha + a sequence of every dasha from there forward
// covering at least `windowYears` years.
//
// `moonLonDeg` must be a SIDEREAL longitude.
export function vimshottariDasha(moonLonDeg, birthDate, windowYears = 120) {
  const lon = ((moonLonDeg % 360) + 360) % 360;
  const nakIdx = Math.floor(lon / NAK_SPAN);
  const nak = NAKSHATRAS[nakIdx];
  const lord = nak.lord;
  const lordIdx = lordIndexOf(lord);
  const lordEntry = VIM_DASHA[lordIdx];

  // Fraction already traversed inside the nakshatra → fraction of this dasha
  // that's already elapsed at birth.
  const fracElapsed = (lon - nakIdx * NAK_SPAN) / NAK_SPAN;
  const elapsedYears = fracElapsed * lordEntry.years;
  const remainingYears = lordEntry.years - elapsedYears;

  const birthMs = birthDate.getTime();
  // Start of the running mahadasha (moment when its full duration would have
  // begun) is birthMs - elapsedYears * MS_YEAR.
  const runningStart = new Date(birthMs - elapsedYears * MS_YEAR);

  const sequence = [];
  // First entry: the running mahadasha (truncated to remaining at birth).
  sequence.push({
    lord,
    years: lordEntry.years,
    start: runningStart,
    end:   new Date(runningStart.getTime() + lordEntry.years * MS_YEAR),
    isCurrent: true,
    elapsedAtBirthYears: elapsedYears,
    remainingAtBirthYears: remainingYears,
  });

  let cursor = sequence[0].end.getTime();
  let acc = remainingYears;
  let i = (lordIdx + 1) % VIM_DASHA.length;
  while (acc < windowYears) {
    const d = VIM_DASHA[i];
    sequence.push({
      lord: d.lord,
      years: d.years,
      start: new Date(cursor),
      end:   new Date(cursor + d.years * MS_YEAR),
      isCurrent: false,
    });
    cursor += d.years * MS_YEAR;
    acc += d.years;
    i = (i + 1) % VIM_DASHA.length;
  }

  return {
    nakshatra: nak.name,
    nakshatraIndex: nakIdx,
    fractionElapsed: fracElapsed,
    runningLord: lord,
    runningStart,
    runningEnd: sequence[0].end,
    sequence,
  };
}

// Build the antardasha (level-2) sequence inside a single mahadasha entry.
export function antarSequence(maha) {
  const startIdx = lordIndexOf(maha.lord);
  const out = [];
  let cursor = maha.start.getTime();
  for (let k = 0; k < VIM_DASHA.length; k++) {
    const sub = VIM_DASHA[(startIdx + k) % VIM_DASHA.length];
    const yrs = (maha.years * sub.years) / VIM_TOTAL;
    const start = new Date(cursor);
    const end = new Date(cursor + yrs * MS_YEAR);
    out.push({ lord: sub.lord, years: yrs, start, end });
    cursor = end.getTime();
  }
  return out;
}

// Identify the running antardasha within a maha at a given moment.
export function currentAntar(maha, atDate) {
  const ms = atDate.getTime();
  const list = antarSequence(maha);
  return list.find(a => a.start.getTime() <= ms && a.end.getTime() > ms) || null;
}

// Identify the running mahadasha within a sequence at a given moment.
export function currentMaha(sequence, atDate) {
  const ms = atDate.getTime();
  return sequence.find(m => m.start.getTime() <= ms && m.end.getTime() > ms) || sequence[0];
}

// Pratyantar (level-3 sub-sub period) inside a single antardasha.
// Inside an antar of length A_yrs, each pratyantar of planet P is
// A_yrs · P/120 long, walked from the antar's lord onwards.
export function pratyantarSequence(antar) {
  const startIdx = lordIndexOf(antar.lord);
  const out = [];
  let cursor = antar.start.getTime();
  for (let k = 0; k < VIM_DASHA.length; k++) {
    const sub = VIM_DASHA[(startIdx + k) % VIM_DASHA.length];
    const yrs = (antar.years * sub.years) / VIM_TOTAL;
    const start = new Date(cursor);
    const end = new Date(cursor + yrs * MS_YEAR);
    out.push({ lord: sub.lord, years: yrs, start, end });
    cursor = end.getTime();
  }
  return out;
}

export function currentPratyantar(antar, atDate) {
  const ms = atDate.getTime();
  const list = pratyantarSequence(antar);
  return list.find(p => p.start.getTime() <= ms && p.end.getTime() > ms) || null;
}

// Resolve the running Maha + Antar + Pratyantar at any moment.
// Returns each level with start/end dates and an elapsedPct in [0,1].
export function dashaAtDate(dashaTree, atDate) {
  if (!dashaTree?.sequence?.length) return null;
  const ms = atDate.getTime();
  const pct = (range) => {
    const total = range.end.getTime() - range.start.getTime();
    const done  = ms - range.start.getTime();
    return total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
  };
  const maha = currentMaha(dashaTree.sequence, atDate);
  if (!maha) return null;
  const antar = currentAntar(maha, atDate);
  if (!antar) return { maha: { ...maha, elapsedPct: pct(maha) }, antar: null, pratyantar: null };
  const pratyantar = currentPratyantar(antar, atDate);
  return {
    maha:       { ...maha,       elapsedPct: pct(maha) },
    antar:      { ...antar,      elapsedPct: pct(antar) },
    pratyantar: pratyantar ? { ...pratyantar, elapsedPct: pct(pratyantar) } : null,
  };
}
