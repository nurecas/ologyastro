// -----------------------------------------------------------------------------
// Phase 4 — Davison relationship chart
//
// Distinct from the Composite (which averages endpoint positions). The
// Davison chart is cast for the midpoint *in time and space* of two
// people's births. Source: Ronald Davison, *The Technique of Prediction*
// (1955); Robert Hand, *Planets in Composite*.
//
// Formula (from the brief):
//   midpoint time = (timeA + timeB) / 2
//   midpoint lat  = (latA + latB) / 2
//   midpoint lon  = circularMidpoint(lonA, lonB)    // wrap-aware
//
// Returned chart is a full natal-shaped object so downstream UI (wheel,
// aspect grid, etc.) treats it as any other chart.
// -----------------------------------------------------------------------------

import { computeNatal, birthToUTCDate } from './natal.js';
import { circularMidpoint } from './midpoints.js';

// Build a synthetic "birth" object at the Davison midpoint. The fictional
// chart is then handed to computeNatal exactly like a real one.
export function davisonBirth(birthA, birthB) {
  const utcA = birthToUTCDate(birthA);
  const utcB = birthToUTCDate(birthB);
  const midMs = (utcA.getTime() + utcB.getTime()) / 2;
  const midDate = new Date(midMs);

  const midLat = (birthA.latDeg + birthB.latDeg) / 2;
  const midLon = circularMidpoint(birthA.lonDeg + 180, birthB.lonDeg + 180) - 180;
  // Note: geographic longitudes are a linear field for small deltas, but
  // wrap at ±180°. Treating them as angular and taking the circular midpoint
  // (+180 shift so the wrap happens at 0°) handles the pathological case
  // of e.g. Fiji / Samoa pairs across the dateline.

  return {
    name: `Davison(${birthA.name || 'A'}, ${birthB.name || 'B'})`,
    year:   midDate.getUTCFullYear(),
    month:  midDate.getUTCMonth() + 1,
    day:    midDate.getUTCDate(),
    hour:   midDate.getUTCHours(),
    minute: midDate.getUTCMinutes(),
    tzOffsetMin: 0,
    latDeg: midLat,
    lonDeg: midLon,
    placeName: 'Davison midpoint',
  };
}

// Full Davison chart. Options forwarded to computeNatal (houseSystem,
// etc.) so the UI can surface the same settings.
export function davisonChart(birthA, birthB, options = {}) {
  const mid = davisonBirth(birthA, birthB);
  return computeNatal(mid, options);
}
