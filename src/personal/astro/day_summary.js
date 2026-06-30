// -----------------------------------------------------------------------------
// Day-summary generator.
//
// Given a natal chart and a transit date, produce a structured,
// astrologically-honest summary of what the day's sky is doing to this chart.
// The summary is TEMPLATE-BASED — no LLM, no hallucination. Every sentence
// is assembled from the same classical interpretation tables used elsewhere
// in the app (PLANET_INFO + ASPECT_VERB + ASPECT_QUALITY). Kept short and
// auditable.
//
// Returns:
//   {
//     dateLabel: "30 June 1905",
//     tone: "active" | "quiet" | "mixed",
//     headline: string,
//     top: [ { transit, natal, aspect, orb, trend, text } ],  // 1 per aspect, top 5
//     weather: { conj, opp, sq, tr, sx } counts,
//     note: string
//   }
// -----------------------------------------------------------------------------

import { currentAspects } from './aspects.js';
import { longitudesAtDate, decimalYearToDate, dateToDecimalYear, PLANETS, AMPLITUDE_ARRAY } from '../../astro/ephemeris.js';
import { PLANET_INFO, ASPECT_VERB, ASPECT_QUALITY } from './interpretation.js';

// Applying vs separating — compute the aspect orb one day before and after
// to decide if it's tightening (applying), exact, or loosening (separating).
function aspectTrend(natal, date, transit, nPlanet, aspectAngle) {
  const MS = 86400000;
  const now = currentAngularDiff(transit, nPlanet, natal, date);
  const prev = currentAngularDiff(transit, nPlanet, natal, new Date(date.getTime() - MS));
  const next = currentAngularDiff(transit, nPlanet, natal, new Date(date.getTime() + MS));
  const orbNow  = Math.abs(now  - aspectAngle);
  const orbPrev = Math.abs(prev - aspectAngle);
  const orbNext = Math.abs(next - aspectAngle);
  if (orbNext < orbNow && orbNow < orbPrev) return 'applying';
  if (orbNext > orbNow && orbNow > orbPrev) return 'separating';
  if (orbNow < 0.1) return 'exact';
  return 'exact'; // turning point
}

function currentAngularDiff(transitName, natalName, natal, date) {
  const tLon = longitudesAtDate(date)[transitName];
  const nLon = natal.planets.find(p => p.name === natalName).lonDeg;
  let d = Math.abs(((tLon - nLon) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

// Estimate days to exact (rough — sample forward/backward up to ±30 days,
// find the crossing where diff is minimum).
function daysToExact(natal, date, transitName, natalName, aspectAngle) {
  let best = Infinity, bestDay = 0;
  for (let d = -30; d <= 30; d++) {
    const test = new Date(date.getTime() + d * 86400000);
    const diff = Math.abs(currentAngularDiff(transitName, natalName, natal, test) - aspectAngle);
    if (diff < best) { best = diff; bestDay = d; }
  }
  if (best > 1.5) return null; // never exact in the window
  return bestDay;
}

function sentenceFor(a) {
  const Tp = PLANET_INFO[a.transit];
  const Np = PLANET_INFO[a.natal];
  const verb = ASPECT_VERB[a.aspect.name] || 'aspects';
  const quality = ASPECT_QUALITY[a.aspect.name] || '';

  // Self-aspect (transit planet same as natal — e.g. Saturn return)
  if (a.transit === a.natal) {
    const returnKind = {
      Conjunction: 'return',
      Opposition:  'opposition',
      Square:      'square',
      Trine:       'trine',
      Sextile:     'sextile',
    }[a.aspect.name];
    return `${a.transit} ${returnKind} — transiting ${a.transit} reaches ${quality} with its own natal position. A classic ${a.transit}-cycle moment in your life.`;
  }

  return `Transiting ${a.transit} (${Tp.role}) ${verb} your natal ${a.natal} (${Np.role}) — ${quality}.`;
}

export function summarizeDay(natal, date) {
  const aspects = currentAspects(natal, date);

  // Pick the top 5 by amplitude × weight × closeness. (currentAspects
  // already sorts by a similar metric.)
  const top = aspects.slice(0, 5).map(a => {
    const exactDay = daysToExact(natal, date, a.transit, a.natal, a.aspect.angle);
    let trendText;
    if (a.exact) trendText = 'Exact today.';
    else if (exactDay === null) trendText = 'Passing through orb.';
    else if (exactDay === 0) trendText = 'Exact today.';
    else if (exactDay > 0) trendText = `Exact in ${exactDay} day${exactDay === 1 ? '' : 's'}.`;
    else trendText = `Was exact ${-exactDay} day${exactDay === -1 ? '' : 's'} ago, separating.`;

    return {
      transit: a.transit,
      natal: a.natal,
      aspect: a.aspect.name,
      aspectGlyph: a.aspect.glyph,
      orb: a.orb,
      trend: trendText,
      text: sentenceFor(a),
    };
  });

  // "Weather" — unweighted counts (kept for display compatibility).
  const weather = { Conjunction: 0, Opposition: 0, Square: 0, Trine: 0, Sextile: 0 };
  for (const a of aspects) weather[a.aspect.name] = (weather[a.aspect.name] || 0) + 1;

  // Tone — weighted by closeness (1 − orb/maxOrb, so exact == 1) and by
  // the astrological amplitude of both bodies (outer-planet aspects
  // matter more than Mercury-Ceres). Conjunctions are excluded from the
  // soft/hard ratio entirely: astrologically they're neutral — their
  // character depends on which planets are involved (Sun ☌ Jupiter is
  // supportive; Saturn ☌ Sun is demanding). Squares + Oppositions =
  // hard; Trines + Sextiles = soft.
  const ampOf = (name) => {
    const p = natal.planets.find(q => q.name === name);
    return p ? (p.amplitude || 0.3) : 0.3;
  };
  let hardW = 0, softW = 0, totalW = 0;
  for (const a of aspects) {
    const tightness = Math.max(0, 1 - (a.orb / a.aspect.orb));
    const w = tightness * (ampOf(a.transit) + ampOf(a.natal));
    totalW += w;
    if (a.aspect.name === 'Square' || a.aspect.name === 'Opposition') hardW += w;
    else if (a.aspect.name === 'Trine' || a.aspect.name === 'Sextile') softW += w;
    // Conjunctions fall through — counted in totalW only.
  }
  const active = hardW + softW;
  let tone = 'mixed';
  if (active < 0.4)                     tone = 'quiet';         // weighted-quiet: very few significant aspects
  else if (hardW > softW * 1.5)         tone = 'demanding';
  else if (softW > hardW * 1.5)         tone = 'supportive';

  // Headline: pick the strongest aspect by orb & amplitude and write a lead line.
  let headline;
  if (top.length === 0) {
    headline = 'A quiet sky today — few transits within orb of your natal chart.';
  } else {
    const a = top[0];
    if (a.transit === a.natal) {
      headline = `A ${a.transit}-cycle moment: transiting ${a.transit} ${a.aspectGlyph} your natal ${a.natal}.`;
    } else {
      headline = `Strongest today: transiting ${a.transit} ${a.aspectGlyph} your natal ${a.natal} (orb ${a.orb.toFixed(1)}°). ${a.trend}`;
    }
  }

  const dateLabel = date.toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  return {
    dateLabel,
    tone,
    headline,
    top,
    totalAspects: aspects.length,
    weather,
    note: 'Generated from classical aspect rules — nothing is hallucinated, every sentence is assembled from the interpretation tables in this app. Your own experience is the final authority.',
  };
}
