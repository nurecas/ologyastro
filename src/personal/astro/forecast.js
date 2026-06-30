// -----------------------------------------------------------------------------
// Forecast — dated major transits in a forward window.
//
// Produces a chronologically-sorted list of moments when a slow transiting
// planet (Jupiter → Pluto) exactly aspects a natal body. Each "event" carries:
//
//   transit, natal (planet names)
//   aspect (name + glyph + angle)
//   date  (JS Date at exact hit; interpolated daily)
//   orb-to-exact vs today
//   band  ("this week" | "this month" | "this year" | "later")
//   retrograde pass  (true if transit planet is retrograde at the hit date)
//
// Transits that happen multiple times (applying / retrograde / final)
// are reported as separate events so users can see the full "triple pass"
// signature of outer-planet aspects.
// -----------------------------------------------------------------------------

import { PLANETS, longitudesAtDate } from '../../astro/ephemeris.js';
import { ASPECTS } from './aspects.js';

const SLOW_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const MS_DAY = 86400000;

function angDist(a, b) {
  let d = ((a - b) % 360 + 360) % 360;
  return d > 180 ? 360 - d : d;
}

function bandFor(date, now) {
  const days = (date.getTime() - now.getTime()) / MS_DAY;
  if (days < 0) {
    if (days > -30)  return { id: 'past',     label: 'recent', days };
    return               { id: 'past-old', label: 'past',   days };
  }
  // Labels are intentionally "Next N days" style rather than "This week"
  // — a 7-day window starting Apr 26 runs into May, and the old "this
  // week" label made those May events look misfiled. Exact date ranges
  // are shown in the UI header per band (Forecast.jsx) for total clarity.
  if (days <= 7)   return { id: 'next-7',    label: 'Next 7 days',     days };
  if (days <= 31)  return { id: 'next-30',   label: 'Next 30 days',    days };
  if (days <= 93)  return { id: 'next-3mo',  label: 'Next 3 months',   days };
  if (days <= 365) return { id: 'this-year', label: 'Later this year', days };
  return              { id: 'later',     label: 'Beyond a year',   days };
}

// Is the transiting planet retrograde at this date? Check with a 1-day lookback.
function isRetrograde(planetName, date) {
  const today = longitudesAtDate(date)[planetName];
  const earlier = longitudesAtDate(new Date(date.getTime() - MS_DAY))[planetName];
  let d = today - earlier;
  if (d > 180)  d -= 360;
  if (d < -180) d += 360;
  return d < 0;
}

// Build the forecast.
//
// Detection: for each (transit planet, natal planet, aspect) triple, sample
// the absolute orb `|angDist(tLon, nLon) − aspect.angle|` on a daily grid
// and find LOCAL MINIMA — the exact moment a transit body reaches an aspect
// is precisely where this function dips to its minimum. This handles all
// five classical aspects uniformly, including conjunction (a = 0°) and
// opposition (a = 180°), where a simple sign-change detector would fail
// because the folded angular distance never crosses zero symmetrically.
//
// Minimum refinement uses a parabolic interpolation through the three
// samples around the minimum → sub-day accuracy.
export function forecastEvents({ natal, fromDate, toDate }) {
  const events = [];
  const now = fromDate;

  const stepDays = 1;
  const N = Math.ceil((toDate.getTime() - fromDate.getTime()) / (MS_DAY * stepDays));
  if (N < 3) return events;

  // Pre-sample all transit longitudes for the window.
  const cache = new Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const d = new Date(fromDate.getTime() + i * stepDays * MS_DAY);
    cache[i] = { date: d, L: longitudesAtDate(d) };
  }

  for (const tName of SLOW_PLANETS) {
    for (const natalPlanet of natal.planets) {
      const nLon = natalPlanet.lonDeg;
      for (const asp of ASPECTS) {
        // Build the daily orb series.
        const orbs = new Array(N + 1);
        for (let i = 0; i <= N; i++) {
          const tLon = cache[i].L[tName];
          orbs[i] = Math.abs(angDist(tLon, nLon) - asp.angle);
        }
        // Scan for local minima that are inside orb.
        for (let i = 1; i < N; i++) {
          const a = orbs[i - 1], b = orbs[i], c = orbs[i + 1];
          if (!(b < a && b < c)) continue;
          if (b > asp.orb)       continue; // minimum is outside orb → not an event
          // Parabolic interpolation: fit y = α x² + β x + γ through three
          // equispaced samples at x = −1, 0, +1. Minimum is at
          //    x* = (a − c) / (2 (a − 2b + c)).
          const denom = a - 2 * b + c;
          let frac = 0;
          if (Math.abs(denom) > 1e-9) frac = (a - c) / (2 * denom);
          // Clamp — parabolic fit can occasionally overshoot if samples are flat.
          if (frac < -1) frac = -1;
          if (frac >  1) frac =  1;
          const hitMs = cache[i].date.getTime() + frac * stepDays * MS_DAY;
          const hit = new Date(hitMs);
          if (hit < fromDate || hit > toDate) continue;
          events.push({
            transit: tName,
            natal: natalPlanet.name,
            aspect: asp,
            date: hit,
            retrograde: isRetrograde(tName, hit),
            band: bandFor(hit, now),
          });
        }
      }
    }
  }

  events.sort((a, b) => a.date - b.date);
  return events;
}

// Group events by band for display.
//
// Also returns each band's date RANGE (from `fromDate` + N days) so the UI
// can show an explicit "Apr 26 – May 3" caption under the band heading.
// This is what prevents "Next 7 days" from looking wrong when the 7-day
// window happens to straddle a month boundary.
export function groupByBand(events, fromDate) {
  const DAY_MS = 86400000;
  const order = ['next-7', 'next-30', 'next-3mo', 'this-year', 'later'];
  const bands = Object.fromEntries(order.map(id => [id, []]));
  for (const e of events) {
    if (bands[e.band.id]) bands[e.band.id].push(e);
  }
  const start = fromDate ? fromDate.getTime() : null;
  const range = (offsetDays) => start == null
    ? null
    : new Date(start + offsetDays * DAY_MS);
  return order
    .map(id => ({
      id,
      label: BAND_LABEL[id],
      events: bands[id],
      // Inclusive start / exclusive end of the band's window.
      rangeStart: range(BAND_START[id]),
      rangeEnd:   range(BAND_END[id]),
    }))
    .filter(b => b.events.length > 0);
}

const BAND_LABEL = {
  'next-7':    'Next 7 days',
  'next-30':   'Next 30 days',
  'next-3mo':  'Next 3 months',
  'this-year': 'Later this year',
  'later':     'Beyond a year',
};
const BAND_START = {
  'next-7':   0,   'next-30':   7,   'next-3mo':  31,  'this-year':  93,  'later':  365,
};
const BAND_END   = {
  'next-7':   7,   'next-30':  31,   'next-3mo':  93,  'this-year': 365,  'later': 3650,
};
