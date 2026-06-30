// -----------------------------------------------------------------------------
// Transit / aspect mathematics for a personal chart.
//
// Given a natal chart (positions of 10 bodies at birth) and a transit date,
// compute:
//
//   • the current positions of all 10 transiting bodies
//   • the significant aspects they form with natal bodies
//   • a 100-year "life-vector" breakdown — for each of the 8 vector layers,
//     a time series of resonance between transits and the natal chart
//
// Aspect set used (Ptolemaic + minor; astronomer-friendly weighting):
//   Conjunction   0°   (w = 1.0)
//   Opposition  180°   (w = 0.9)
//   Trine       120°   (w = 0.7)
//   Square       90°   (w = 0.7)
//   Sextile      60°   (w = 0.5)
//
// Orbs scale by planet amplitude so the Sun has wide orb, Pluto has narrow.
// -----------------------------------------------------------------------------

import {
  PLANETS, AMPLITUDE_ARRAY, longitudesAtDate, decimalYearToDate,
  dateToDecimalYear,
} from '../../astro/ephemeris.js';
import { LAYERS } from '../../astro/layers.js';

const DEG = Math.PI / 180;

export const ASPECTS = [
  { name: 'Conjunction', glyph: '☌', angle: 0,   weight: 1.0, orb: 8 },
  { name: 'Opposition',  glyph: '☍', angle: 180, weight: 0.9, orb: 7 },
  { name: 'Trine',       glyph: '△', angle: 120, weight: 0.7, orb: 6 },
  { name: 'Square',      glyph: '□', angle: 90,  weight: 0.7, orb: 6 },
  { name: 'Sextile',     glyph: '✶', angle: 60,  weight: 0.5, orb: 4 },
];

function norm180(x) {
  let y = ((x % 360) + 540) % 360 - 180; // signed diff wrap
  return y;
}
function normAbs(x) {
  const d = Math.abs(((x % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// List current transit→natal aspects within orb.
export function currentAspects(natal, date, options = {}) {
  const { includeAngles = false } = options;
  const transitLons = longitudesAtDate(date);
  const out = [];
  // Phase 3: optionally extend targets with natal angles (ASC/MC/DSC/IC).
  // Brief: "transit aspects to natal angles — among the most significant
  // transits and missing before". Gated behind includeAngles so Basic mode
  // keeps the existing planet-to-planet list.
  const targets = natal.planets.filter(p => !p.calculatedPoint).map(p => ({
    name: p.name, lonDeg: p.lonDeg,
  }));
  if (includeAngles) {
    targets.push(
      { name: 'ASC', lonDeg: natal.ascDeg, angle: true },
      { name: 'MC',  lonDeg: natal.mcDeg,  angle: true },
      { name: 'DSC', lonDeg: natal.dscDeg, angle: true },
      { name: 'IC',  lonDeg: natal.icDeg,  angle: true },
    );
  }
  for (const tn of PLANETS) {
    const tLon = transitLons[tn];
    for (const np of targets) {
      const diff = normAbs(tLon - np.lonDeg);
      for (const asp of ASPECTS) {
        const delta = Math.abs(diff - asp.angle);
        if (delta <= asp.orb) {
          out.push({
            transit: tn,
            natal: np.name,
            aspect: asp,
            orb: delta,
            angularDistance: diff,
            tLon,
            nLon: np.lonDeg,
            exact: delta < 0.2,
            targetIsAngle: !!np.angle,
          });
        }
      }
    }
  }
  // Sort by amplitude × closeness. Natal angles (ASC/MC/DSC/IC) aren't in
  // PLANETS; treat them with amplitude 0.5 (significant but not weighty as
  // outer planets).
  const ampOf = (name) => {
    const i = PLANETS.indexOf(name);
    return i >= 0 ? AMPLITUDE_ARRAY[i] : 0.5;
  };
  out.sort((a, b) => {
    const sA = (ampOf(a.transit) + ampOf(a.natal)) * a.aspect.weight * (1 - a.orb / a.aspect.orb);
    const sB = (ampOf(b.transit) + ampOf(b.natal)) * b.aspect.weight * (1 - b.orb / b.aspect.orb);
    return sB - sA;
  });
  return out;
}

// -----------------------------------------------------------------------------
// 100-year life-vector breakdown.
//
// For each layer L and each transit time t, we accumulate the strength of
// every classical Ptolemaic aspect between each layer-planet and each natal
// planet, weighted by both bodies' amplitudes. The aspect strength is a
// Gaussian bump at each aspect angle — so conjunctions, sextiles, squares,
// trines and oppositions all count as "active", falling off smoothly with
// orb. (Using plain `cos(Δ)` as before was wrong astrologically — it made
// oppositions cancel conjunctions and gave squares zero weight.)
//
// Aspect set (angle°, weight, sigma°):
//   Conjunction   0°  w=1.0   σ=7   (widest orb)
//   Opposition  180°  w=0.9   σ=6
//   Square       90°  w=0.7   σ=6   (both 90° & 270° on [0,360])
//   Trine       120°  w=0.6   σ=6   (both 120° & 240°)
//   Sextile      60°  w=0.4   σ=4   (both 60° & 300°)
//
// Gaussian maximum is 1 per peak; the function is normalised so that a
// single perfect conjunction of full-amplitude bodies contributes 1.0.
// -----------------------------------------------------------------------------

const ASPECT_PEAKS = [
  { angle:   0, weight: 1.0, sigma: 7 },
  { angle:  60, weight: 0.4, sigma: 4 },
  { angle:  90, weight: 0.7, sigma: 6 },
  { angle: 120, weight: 0.6, sigma: 6 },
  { angle: 180, weight: 0.9, sigma: 6 },
];

// Pre-compute the theoretical maximum of the aspect-strength function
// (reached at Δ = 0°, the conjunction peak) once, for normalisation.
const ASPECT_MAX = ASPECT_PEAKS[0].weight;

// Unsigned angular distance in degrees, folded to [0, 180].
function angDist180(aRad, bRad) {
  let d = ((aRad - bRad) * 180 / Math.PI) % 360;
  if (d < 0) d += 360;
  return d > 180 ? 360 - d : d;
}

// Aspect strength in [0, ~1] given unsigned angular distance in degrees.
function aspectStrength(deltaDeg) {
  let s = 0;
  for (const p of ASPECT_PEAKS) {
    const d = deltaDeg - p.angle;
    s += p.weight * Math.exp(-(d * d) / (2 * p.sigma * p.sigma));
  }
  return s;
}

// Planets that matter on a life-scale (years-decades) timeline. Inner planets
// (Sun/Moon/Mercury/Venus/Mars) cycle too fast to produce meaningful
// multi-year structure — their signal smooths to a flat line after monthly
// sampling.
const SLOW_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const SLOW_IDX = SLOW_PLANETS.map(n => PLANETS.indexOf(n));

export function lifeVectorSeries({ natal, startYear, endYear, samplesPerYear = 12 }) {
  const totalYears = endYear - startYear;
  const numSamples = Math.max(24, Math.round(totalYears * samplesPerYear));
  const years = new Float64Array(numSamples);
  const P = PLANETS.length;

  // Pre-sample transit longitudes across the whole window.
  const transits = new Float32Array(numSamples * P);
  for (let t = 0; t < numSamples; t++) {
    const yr = startYear + (endYear - startYear) * (t / (numSamples - 1));
    years[t] = yr;
    const d  = decimalYearToDate(yr);
    const L  = longitudesAtDate(d);
    for (let i = 0; i < P; i++) transits[t * P + i] = L[PLANETS[i]] * DEG;
  }

  // Natal data — life vectors are defined over the classical 10 whose
  // amplitudes sum to the normalizer constant used below. Extras + Part
  // of Fortune are excluded: layer.planets indices map into
  // PLANETS (classical 10), so extras would read via natalLon[j] for
  // j >= 10 and desynchronise the layer/natal index pairing.
  const classicalNatal = natal.planets.filter(p => p.classical !== false);
  const natalLon = classicalNatal.map(p => p.lonDeg * DEG);
  const natalAmp = classicalNatal.map(p => p.amplitude);
  const sumNatalAmp = natalAmp.reduce((a, b) => a + b, 0);

  const series = LAYERS.map((layer) => {
    const values = new Float32Array(numSamples);
    // Does this layer consist only of fast-cycling planets?
    const onlyFast = layer.planets.every(pi =>
      !SLOW_IDX.includes(pi)
    );

    // Contribution A: transits from this layer's planets to the whole natal chart.
    // Contribution B: slow-planet transits to this layer's *natal* planets — only
    //   applied when the layer itself has no slow planets, so we never
    //   double-count slow transits on layers that already contain them.
    let ampA = 0;
    for (const pi of layer.planets) ampA += AMPLITUDE_ARRAY[pi];
    let ampB = 0;
    if (onlyFast) {
      for (const pi of SLOW_IDX) ampB += AMPLITUDE_ARRAY[pi];
    }

    // Normalizer so that V_L(t) ≈ [0, 1].
    // Max contribution ≈ (ampA × sumNatalAmp × ASPECT_MAX)
    //                  + (ampB × sum of layer.planets' natal amps × ASPECT_MAX).
    const layerNatalAmp = layer.planets.reduce((s, pi) => s + natalAmp[pi], 0);
    const normalizer = Math.max(0.0001,
      ampA * sumNatalAmp * ASPECT_MAX
      + ampB * layerNatalAmp * ASPECT_MAX
    );

    for (let t = 0; t < numSamples; t++) {
      let acc = 0;
      // A — layer's planets transiting all natal.
      for (const pi of layer.planets) {
        const phi = transits[t * P + pi];
        const Ap = AMPLITUDE_ARRAY[pi];
        for (let j = 0; j < natalLon.length; j++) {
          acc += Ap * natalAmp[j] * aspectStrength(angDist180(phi, natalLon[j]));
        }
      }
      // B — slow-planet transits to this layer's natal planets (only if layer is fast-only).
      if (onlyFast) {
        for (const pi of SLOW_IDX) {
          const phi = transits[t * P + pi];
          const Ap = AMPLITUDE_ARRAY[pi];
          for (const jPi of layer.planets) {
            const lamJ = natalLon[jPi];
            acc += Ap * natalAmp[jPi] * aspectStrength(angDist180(phi, lamJ));
          }
        }
      }
      values[t] = acc / normalizer;
    }

    // Boxcar smoothing to cut sub-year fast-planet wobble while preserving
    // the multi-year slow-planet envelope.
    const smoothed = boxcarSmooth(values, Math.max(3, Math.round(samplesPerYear / 3)));
    return { layer, values: smoothed };
  });

  return { years, series };
}

function boxcarSmooth(arr, radius) {
  const N = arr.length;
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let sum = 0, count = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = i + k;
      if (j >= 0 && j < N) { sum += arr[j]; count += 1; }
    }
    out[i] = sum / count;
  }
  return out;
}

// Major-transit events: list years in [startYear, endYear] when a slow
// transit planet (Jupiter..Pluto) makes an exact conjunction/opposition/
// square/trine with a natal body. Useful for a "Life Phase" ribbon.
export function majorLifeEvents({ natal, startYear, endYear }) {
  const P = PLANETS.length;
  const slow = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const slowIdx = slow.map(s => PLANETS.indexOf(s));
  const events = [];

  // Sample daily for precision; track sign change of (angular diff − aspect).
  const samplesPerYear = 12; // monthly is enough to bracket and then refine
  const N = Math.round((endYear - startYear) * samplesPerYear);
  const cache = new Array(N + 1);
  for (let t = 0; t <= N; t++) {
    const yr = startYear + (endYear - startYear) * (t / N);
    const d  = decimalYearToDate(yr);
    const L  = longitudesAtDate(d);
    cache[t] = { yr, L };
  }

  for (const tIdx of slowIdx) {
    const tName = PLANETS[tIdx];
    for (const np of natal.planets) {
      for (const asp of ASPECTS) {
        let prevSign = null;
        let prevDiff = null;
        for (let t = 0; t <= N; t++) {
          const tLon = cache[t].L[tName];
          const d = normAbs(tLon - np.lonDeg) - asp.angle;
          const sign = Math.sign(d);
          if (prevSign != null && sign !== 0 && sign !== prevSign && Math.abs(d - prevDiff) < 40) {
            // zero crossing between t-1 and t → interpolate year
            const frac = prevDiff / (prevDiff - d);
            const yr = cache[t - 1].yr + (cache[t].yr - cache[t - 1].yr) * frac;
            events.push({
              year: yr,
              transit: tName,
              natal: np.name,
              aspect: asp,
            });
          }
          prevSign = sign;
          prevDiff = d;
        }
      }
    }
  }

  events.sort((a, b) => a.year - b.year);
  return events;
}
