// -----------------------------------------------------------------------------
// Global Coherence Index
//
// For each time step t, compute:
//     F(θ, t) = Σᵢ Aᵢ · cos(θ − φᵢ(t))
//     C(t)   = √( (1/N) · Σ_θ F(θ, t)² )   with θ sampled N times over [0, 2π)
//
// The result is a scalar per time step — an RMS amplitude of the full
// interference field across the zodiac at that moment.
// -----------------------------------------------------------------------------

import { AMPLITUDE_ARRAY, PLANETS } from './ephemeris.js';

const NUM_THETA = 180; // 2° resolution
const TWO_PI = Math.PI * 2.0;

export function computeCoherence(longitudeData, numTime) {
  const P = PLANETS.length;
  const A = AMPLITUDE_ARRAY;
  const C = new Float32Array(numTime);

  for (let t = 0; t < numTime; t++) {
    let sumSq = 0;
    for (let k = 0; k < NUM_THETA; k++) {
      const theta = (k / NUM_THETA) * TWO_PI;
      let F = 0;
      for (let i = 0; i < P; i++) {
        const phi = longitudeData[t * P + i];
        F += A[i] * Math.cos(theta - phi);
      }
      sumSq += F * F;
    }
    C[t] = Math.sqrt(sumSq / NUM_THETA);
  }

  // Normalize to [0, 1] against max.
  let cmax = 0;
  for (let t = 0; t < numTime; t++) if (C[t] > cmax) cmax = C[t];
  if (cmax > 0) for (let t = 0; t < numTime; t++) C[t] /= cmax;

  return C;
}

// Identify top-K coherence peaks as local maxima, well-separated.
export function findTopPeaks(coherence, years, K = 12, minSeparationYears = 15) {
  const peaks = [];
  for (let t = 1; t < coherence.length - 1; t++) {
    if (coherence[t] > coherence[t - 1] && coherence[t] > coherence[t + 1]) {
      peaks.push({ t, year: years[t], value: coherence[t] });
    }
  }
  peaks.sort((a, b) => b.value - a.value);
  const picked = [];
  for (const p of peaks) {
    if (picked.every(q => Math.abs(q.year - p.year) >= minSeparationYears)) {
      picked.push(p);
      if (picked.length >= K) break;
    }
  }
  picked.sort((a, b) => a.year - b.year);
  return picked;
}
