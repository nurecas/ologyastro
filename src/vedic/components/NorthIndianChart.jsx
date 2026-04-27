// North Indian (Bhava Chakra) SVG chart.
// A square divided by two diagonals and an inscribed diamond — 12 sectors,
// fixed house positions (1 at top-center, going clockwise). The Lagna sign
// label appears in house 1; subsequent signs follow the zodiac order.

import React from 'react';
import { RASHIS, VEDIC_GLYPH } from '../compute/data.js';
import { planetsByHouse } from '../compute/chart.js';

// Centroids for each of the 12 sectors in a 400×400 square — visually tuned.
// The four kendras (1, 4, 7, 10) sit in the central diamond's wider triangles.
const HOUSE_CENTROIDS = {
  1:  [200,  90],
  2:  [100,  55],
  3:  [ 55, 100],
  4:  [105, 200],
  5:  [ 55, 300],
  6:  [100, 345],
  7:  [200, 305],
  8:  [300, 345],
  9:  [345, 300],
  10: [295, 200],
  11: [345, 100],
  12: [300,  55],
};

export default function NorthIndianChart({ chart, size = 420 }) {
  if (!chart) return null;
  const byHouse = planetsByHouse(chart);
  // Upagrahas (Gulika/Mandi) — present on natal D-1 only, so no .upagrahas
  // field on divisional charts. Group by house for the same render path.
  const upagrahasByHouse = Array.from({ length: 12 }, () => []);
  if (chart.upagrahas) {
    if (chart.upagrahas.gulika?.house) upagrahasByHouse[chart.upagrahas.gulika.house - 1].push(chart.upagrahas.gulika);
    if (chart.upagrahas.mandi?.house)  upagrahasByHouse[chart.upagrahas.mandi.house  - 1].push(chart.upagrahas.mandi);
  }
  const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const scale = size / 400;
  const px = (x) => x * scale;

  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%"
         style={{ maxWidth: size, maxHeight: size, aspectRatio: '1 / 1' }}
         className="block">
      {/* Outer square */}
      <rect x="2" y="2" width="396" height="396" fill="none" stroke="rgba(245,214,128,0.55)" strokeWidth="1.2" />
      {/* Diagonals */}
      <line x1="2" y1="2" x2="398" y2="398" stroke="rgba(245,214,128,0.4)" strokeWidth="0.9" />
      <line x1="2" y1="398" x2="398" y2="2" stroke="rgba(245,214,128,0.4)" strokeWidth="0.9" />
      {/* Inscribed diamond */}
      <polygon points="200,2 398,200 200,398 2,200"
               fill="none" stroke="rgba(245,214,128,0.5)" strokeWidth="1.1" />

      {houses.map(h => {
        const [cx, cy] = HOUSE_CENTROIDS[h];
        const sign = (chart.lagnaSignIdx + h - 1) % 12;
        const r = RASHIS[sign];
        const planets = byHouse[h - 1];
        return (
          <g key={h}>
            {/* House number */}
            <text x={cx} y={cy - 24} textAnchor="middle" fontSize="9"
                  fill="rgba(155,155,189,0.6)" fontFamily="Inter, sans-serif" letterSpacing="0.15em">
              {h}
            </text>
            {/* Sign glyph + abbreviation */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="14"
                  fill="#f5d680" fontFamily="Cormorant Garamond, serif">
              {r.glyph}
            </text>
            {/* Planets in this sign */}
            {planets.map((p, i) => (
              <text
                key={p.name}
                x={cx}
                y={cy + 10 + i * 14}
                textAnchor="middle"
                fontSize="13"
                fill={p.dignity === 'exalted' ? '#fff8dd'
                    : p.dignity === 'debilitated' ? '#ff9a9a'
                    : p.dignity === 'own' || p.dignity === 'mooltrikona' ? '#f5d680'
                    : '#e6e6f0'}
                fontFamily="Cormorant Garamond, serif"
              >
                {VEDIC_GLYPH[p.name] || p.name}
              </text>
            ))}
            {/* Upagrahas — faint, beneath the grahas */}
            {upagrahasByHouse[h - 1].map((u, i) => (
              <text
                key={u.name}
                x={cx}
                y={cy + 10 + (planets.length + i) * 14}
                textAnchor="middle"
                fontSize="10"
                fill="#d8caff"
                fillOpacity="0.65"
                fontFamily="Inter, sans-serif"
                letterSpacing="0.05em"
              >
                ✦{u.name === 'Gulika' ? 'Gu' : 'Md'}
              </text>
            ))}
          </g>
        );
      })}

      {/* Lagna marker — small "AS" tucked into house 1 */}
      <text x="200" y="120" textAnchor="middle" fontSize="9"
            fill="#d79b3a" letterSpacing="0.2em" fontFamily="Inter, sans-serif">
        ASC
      </text>
    </svg>
  );
}
