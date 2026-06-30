import { create } from 'zustand';
import {
  sampleLongitudes, PLANETS, AMPLITUDE_ARRAY,
  decimalYearToDate, dateToJD, mcLongitudeRad,
} from './astro/ephemeris.js';
import { computeCoherence, findTopPeaks } from './astro/coherence.js';
import { LAYERS } from './astro/layers.js';
import { POP_REGIONS, regionWeightsAtYear } from './astro/population.js';

const DEG = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

const START_YEAR = 1500;
// Timeline ends Jan 1 2081 so we cover through Dec 31 2080.
const END_YEAR   = 2081;
const NUM_TIME   = 1162; // ≈ 0.5 year resolution over 581 years

// Population-weighted coherence using each region's Midheaven (MC) ecliptic
// degree at its centroid longitude:
//
//   C_weighted(t) = √( Σᵣ w(r, t) · F(θ_MC(r, t), t)² )
//
// where θ_MC depends on the region's east-longitude and the current GMST.
function populationWeightedCoherence(data, years, numTime) {
  const P = PLANETS.length;
  const A = AMPLITUDE_ARRAY;
  const out = new Float32Array(numTime);

  for (let t = 0; t < numTime; t++) {
    const yr  = years[t];
    const jd  = dateToJD(decimalYearToDate(yr));
    const weights = regionWeightsAtYear(yr);

    let sumSq = 0;
    for (const region of POP_REGIONS) {
      const theta = mcLongitudeRad(region.centroidLon * DEG, jd);
      let F = 0;
      for (let i = 0; i < P; i++) {
        const phi = data[t * P + i];
        F += A[i] * Math.cos(theta - phi);
      }
      const w = weights.get(region.name) || 0;
      sumSq += w * F * F;
    }
    out[t] = Math.sqrt(sumSq);
  }

  // Normalize.
  let mx = 0;
  for (let t = 0; t < numTime; t++) if (out[t] > mx) mx = out[t];
  if (mx > 0) for (let t = 0; t < numTime; t++) out[t] /= mx;
  return out;
}

function buildField() {
  const { data, years } = sampleLongitudes(START_YEAR, END_YEAR, NUM_TIME);
  const coherence = computeCoherence(data, NUM_TIME);
  const peaks     = findTopPeaks(coherence, years, 12, 15);
  const weighted  = populationWeightedCoherence(data, years, NUM_TIME);
  return { data, years, coherence, weighted, peaks };
}

const initial = buildField();

export const useStore = create((set, get) => ({
  startYear: START_YEAR,
  endYear:   END_YEAR,
  numTime:   NUM_TIME,
  planets:   PLANETS,
  longitudes: initial.data,
  years:      initial.years,
  coherence:  initial.coherence,
  weighted:   initial.weighted,
  peaks:      initial.peaks,

  // t maps 0→1 across [startYear, endYear]. Default near 2026 so you land
  // in a recognisable frame at launch.
  t: (2026 - START_YEAR) / (END_YEAR - START_YEAR),
  playing: false,
  speed: 10,

  setT: (t) => set({ t: Math.max(0, Math.min(1, t)) }),
  togglePlay: () => set({ playing: !get().playing }),
  setSpeed: (s) => set({ speed: s }),

  currentYear: () => {
    const { startYear, endYear, t } = get();
    return startYear + (endYear - startYear) * t;
  },

  // --- Phase 2: layers -----------------------------------------------------
  view: 'field',
  setView: (v) => set({ view: v }),

  layers: LAYERS.map(l => ({
    id: l.id, name: l.name, color: l.color,
    enabled: false, mix: 0.8,
  })),
  masterCoherence: false,
  setLayerEnabled: (id, enabled) => set({
    layers: get().layers.map(l => l.id === id ? { ...l, enabled } : l),
  }),
  setLayerMix: (id, mix) => set({
    layers: get().layers.map(l => l.id === id ? { ...l, mix } : l),
  }),
  toggleMasterCoherence: () => set({ masterCoherence: !get().masterCoherence }),

  // --- Phase 3: population, events ----------------------------------------
  coherenceMode: 'both',
  setCoherenceMode: (m) => set({ coherenceMode: m }),

  events: [
    { year: 1543, label: 'De revolutionibus',    kind: 'idea'     },
    { year: 1609, label: 'Kepler laws',          kind: 'idea'     },
    { year: 1687, label: 'Principia',            kind: 'idea'     },
    { year: 1776, label: 'American Revolution',  kind: 'conflict' },
    { year: 1789, label: 'French Revolution',    kind: 'conflict' },
    { year: 1914, label: 'WWI begins',           kind: 'conflict' },
    { year: 1939, label: 'WWII begins',          kind: 'conflict' },
    { year: 1945, label: 'Atomic age / UN',      kind: 'shift'    },
    { year: 1969, label: 'Apollo 11',            kind: 'idea'     },
    { year: 1989, label: 'Berlin Wall falls',    kind: 'shift'    },
    { year: 2008, label: 'Global financial crisis', kind: 'shift' },
    { year: 2020, label: 'COVID-19 pandemic',    kind: 'shift'    },
  ],
  setEvents: (e) => set({ events: e }),
}));
