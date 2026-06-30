// -----------------------------------------------------------------------------
// Vector Layers (Phase 2)
//
// Each layer = a filtered interference sub-field built from a subset of
// planets plus (optionally) a pair of static zodiac-axis contributors.
// -----------------------------------------------------------------------------

import { PLANETS } from './ephemeris.js';

// Convenience: index of a planet in the PLANETS array.
const idx = (name) => PLANETS.indexOf(name);

// Axis degrees are interpreted as static cos(θ − axis) contributions.
// Axis amplitude is a dimensionless weight (0..1) applied alongside planet amps.
export const LAYERS = [
  {
    id: 'vitality',
    name: 'Vitality / Will',
    color: '#FF4444',
    planets: [idx('Sun'), idx('Mars')],
    axes: [], // no axis
  },
  {
    id: 'career',
    name: 'Career / Structure',
    color: '#FF8C00',
    planets: [idx('Saturn'), idx('Jupiter')],
    axes: [],
  },
  {
    id: 'intellect',
    name: 'Intellect / Communication',
    color: '#FFD700',
    planets: [idx('Mercury')],
    axes: [60, 240], // Gemini–Sagittarius axis
  },
  {
    id: 'relational',
    name: 'Relational / Love',
    color: '#44FF88',
    planets: [idx('Venus')],
    axes: [180], // Libra axis
  },
  {
    id: 'emotional',
    name: 'Emotional / Subconscious',
    color: '#4488FF',
    planets: [idx('Moon')],
    axes: [90], // Cancer axis
  },
  {
    id: 'spiritual',
    name: 'Spiritual / Dissolution',
    color: '#AA44FF',
    planets: [idx('Neptune')],
    axes: [330], // Pisces axis
  },
  {
    id: 'transformation',
    name: 'Transformation / Shadow',
    color: '#FF44AA',
    planets: [idx('Pluto')],
    axes: [210], // Scorpio axis
  },
  {
    id: 'breakthrough',
    name: 'Breakthrough / Rebellion',
    color: '#44FFFF',
    planets: [idx('Uranus')],
    axes: [300], // Aquarius axis
  },
];

// Utility: hex → [r,g,b] in 0..1.
export function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substr(0, 2), 16) / 255,
    parseInt(h.substr(2, 2), 16) / 255,
    parseInt(h.substr(4, 2), 16) / 255,
  ];
}
