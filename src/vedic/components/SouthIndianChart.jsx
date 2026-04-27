// South Indian chart — fixed-sign 4×4 grid with the centre 2×2 hollow.
// Aries always top-left of the second row; signs go clockwise. Lagna is
// marked on whichever cell currently holds the ascendant sign.

import React from 'react';
import { RASHIS, VEDIC_GLYPH } from '../compute/data.js';
import { planetsByHouse } from '../compute/chart.js';

// Standard South-Indian layout — each entry: [signIndex, row 0..3, col 0..3].
// The centre 2×2 cells are intentionally absent (the chart's hollow interior).
//   row 0 (top):     Pisces 11, Aries 0, Taurus 1, Gemini 2
//   row 1:           Aquarius 10,  -    -    Cancer 3
//   row 2:           Capricorn 9,  -    -    Leo 4
//   row 3 (bottom):  Sagittarius 8, Scorpio 7, Libra 6, Virgo 5
const CELLS = [
  [11, 0, 0], [0, 0, 1], [1, 0, 2], [2, 0, 3],
  [10, 1, 0],                       [3, 1, 3],
  [ 9, 2, 0],                       [4, 2, 3],
  [ 8, 3, 0], [7, 3, 1], [6, 3, 2], [5, 3, 3],
];

export default function SouthIndianChart({ chart, size = 420 }) {
  if (!chart) return null;
  const byHouse = planetsByHouse(chart);

  // Build a sign → planets array map (instead of house → planets, since
  // South Indian charts are sign-fixed).
  const planetsBySign = Array.from({ length: 12 }, () => []);
  for (let h = 1; h <= 12; h++) {
    const sign = (chart.lagnaSignIdx + h - 1) % 12;
    planetsBySign[sign] = byHouse[h - 1];
  }
  // Upagrahas — only on natal D-1, indexed by sign for this layout.
  const upagrahasBySign = Array.from({ length: 12 }, () => []);
  if (chart.upagrahas) {
    if (chart.upagrahas.gulika) upagrahasBySign[chart.upagrahas.gulika.signIdx].push(chart.upagrahas.gulika);
    if (chart.upagrahas.mandi)  upagrahasBySign[chart.upagrahas.mandi.signIdx].push(chart.upagrahas.mandi);
  }

  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%"
         style={{ maxWidth: size, maxHeight: size, aspectRatio: '1 / 1' }}
         className="block">
      {/* Outer frame */}
      <rect x="2" y="2" width="396" height="396" fill="none" stroke="rgba(245,214,128,0.55)" strokeWidth="1.2" />
      {/* Inner frame around the centre 2×2 cavity */}
      <rect x="100" y="100" width="200" height="200" fill="none" stroke="rgba(245,214,128,0.35)" strokeWidth="0.8" />
      {/* 4×4 grid lines */}
      <line x1="100" y1="2" x2="100" y2="100" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="200" y1="2" x2="200" y2="100" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="300" y1="2" x2="300" y2="100" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="100" y1="300" x2="100" y2="398" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="200" y1="300" x2="200" y2="398" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="300" y1="300" x2="300" y2="398" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="2"   y1="100" x2="100" y2="100" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="2"   y1="200" x2="100" y2="200" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="2"   y1="300" x2="100" y2="300" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="300" y1="100" x2="398" y2="100" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="300" y1="200" x2="398" y2="200" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />
      <line x1="300" y1="300" x2="398" y2="300" stroke="rgba(245,214,128,0.4)" strokeWidth="0.8" />

      {CELLS.map(([sign, r, c]) => {
        const cx = c * 100 + 50;
        const cy = r * 100 + 50;
        const planets = planetsBySign[sign];
        const isLagna = sign === chart.lagnaSignIdx;
        const house = ((sign - chart.lagnaSignIdx + 12) % 12) + 1;

        return (
          <g key={sign}>
            {isLagna && (
              <rect x={cx - 50} y={cy - 50} width="100" height="100"
                    fill="rgba(245,214,128,0.06)" stroke="rgba(245,214,128,0.6)" strokeWidth="1.4" />
            )}
            <text x={cx} y={cy - 32} textAnchor="middle" fontSize="9"
                  fill="rgba(155,155,189,0.65)" letterSpacing="0.18em" fontFamily="Inter, sans-serif">
              {RASHIS[sign].en} · H{house}
            </text>
            <text x={cx} y={cy - 14} textAnchor="middle" fontSize="16" fill="#f5d680" fontFamily="Cormorant Garamond, serif">
              {RASHIS[sign].glyph}
            </text>
            {planets.map((p, i) => (
              <text
                key={p.name}
                x={cx}
                y={cy + 4 + i * 14}
                textAnchor="middle"
                fontSize="12"
                fill={p.dignity === 'exalted' ? '#fff8dd'
                    : p.dignity === 'debilitated' ? '#ff9a9a'
                    : p.dignity === 'own' || p.dignity === 'mooltrikona' ? '#f5d680'
                    : '#e6e6f0'}
                fontFamily="Cormorant Garamond, serif"
              >
                {VEDIC_GLYPH[p.name] || p.name}
              </text>
            ))}
            {upagrahasBySign[sign].map((u, i) => (
              <text
                key={u.name}
                x={cx}
                y={cy + 4 + (planets.length + i) * 14}
                textAnchor="middle"
                fontSize="9"
                fill="#d8caff"
                fillOpacity="0.65"
                fontFamily="Inter, sans-serif"
                letterSpacing="0.05em"
              >
                ✦{u.name === 'Gulika' ? 'Gu' : 'Md'}
              </text>
            ))}
            {isLagna && (
              <text x={cx} y={cy + 38} textAnchor="middle" fontSize="9"
                    fill="#d79b3a" letterSpacing="0.2em" fontFamily="Inter, sans-serif">
                LAGNA
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
