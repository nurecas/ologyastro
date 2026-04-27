// Vedic — Rashi (D-1) chart PNG export.
// Renders the chart in the user's preferred format (North or South Indian)
// onto a high-resolution canvas with metadata + planet table + ayanamsa
// + lagna degree, then triggers a PNG download.

import { RASHIS, VEDIC_GLYPH, VEDIC_NAME } from '../compute/data.js';
import { planetsByHouse } from '../compute/chart.js';

function pad(n) { return String(n).padStart(2, '0'); }
function slug(s) { return (s || 'chart').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }
function fmtDeg(d) {
  const dd = Math.floor(d), mm = Math.round((d - dd) * 60);
  return `${dd}°${pad(mm)}'`;
}

// ---------------------------------------------------------------------------
// North Indian chart, drawn into a 2D canvas context.
// `cx, cy` is the centre; `r` is half the side length of the bounding square.
// ---------------------------------------------------------------------------
const N_HOUSE_CENTROIDS = {
  1:  [0.500, 0.225], 2:  [0.250, 0.138], 3:  [0.138, 0.250],
  4:  [0.262, 0.500], 5:  [0.138, 0.750], 6:  [0.250, 0.862],
  7:  [0.500, 0.762], 8:  [0.750, 0.862], 9:  [0.862, 0.750],
  10: [0.738, 0.500], 11: [0.862, 0.250], 12: [0.750, 0.138],
};

function drawNorthIndianChart(ctx, chart, cx, cy, r) {
  const left = cx - r, top = cy - r, right = cx + r, bottom = cy + r;
  const byHouse = planetsByHouse(chart);

  // Outer square.
  ctx.strokeStyle = 'rgba(245,214,128,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left, top, r * 2, r * 2);

  // Diagonals.
  ctx.strokeStyle = 'rgba(245,214,128,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(right, bottom);
  ctx.moveTo(left, bottom); ctx.lineTo(right, top);
  ctx.stroke();

  // Inscribed diamond.
  ctx.strokeStyle = 'rgba(245,214,128,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(right, cy);
  ctx.lineTo(cx, bottom);
  ctx.lineTo(left, cy);
  ctx.closePath();
  ctx.stroke();

  // House labels + sign + planets.
  for (let h = 1; h <= 12; h++) {
    const [fx, fy] = N_HOUSE_CENTROIDS[h];
    const x = left + fx * (r * 2);
    const y = top + fy * (r * 2);
    const sign = (chart.lagnaSignIdx + h - 1) % 12;
    const rashi = RASHIS[sign];
    const planets = byHouse[h - 1];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // House number.
    ctx.fillStyle = 'rgba(155,155,189,0.55)';
    ctx.font = `${Math.round(r * 0.045)}px Inter, sans-serif`;
    ctx.fillText(String(h), x, y - r * 0.105);

    // Sign glyph.
    ctx.fillStyle = '#f5d680';
    ctx.font = `${Math.round(r * 0.07)}px "Cormorant Garamond", serif`;
    ctx.fillText(rashi.glyph, x, y - r * 0.04);

    // Planets in this sign.
    ctx.font = `${Math.round(r * 0.062)}px "Cormorant Garamond", serif`;
    planets.forEach((p, i) => {
      ctx.fillStyle = p.dignity === 'exalted' ? '#fff8dd'
                    : p.dignity === 'debilitated' ? '#ff9a9a'
                    : (p.dignity === 'own' || p.dignity === 'mooltrikona') ? '#f5d680'
                    : '#e6e6f0';
      ctx.fillText(VEDIC_GLYPH[p.name] || p.name, x, y + r * 0.04 + i * (r * 0.07));
    });
  }

  // Lagna marker
  ctx.fillStyle = '#d79b3a';
  ctx.font = `${Math.round(r * 0.04)}px Inter, sans-serif`;
  ctx.fillText('LAGNA', cx, top + r * 0.32);
}

// ---------------------------------------------------------------------------
// South Indian chart — fixed-sign 4×4 grid.
// ---------------------------------------------------------------------------
const S_CELLS = [
  [11, 0, 0], [0, 0, 1], [1, 0, 2], [2, 0, 3],
  [10, 1, 0],                       [3, 1, 3],
  [ 9, 2, 0],                       [4, 2, 3],
  [ 8, 3, 0], [7, 3, 1], [6, 3, 2], [5, 3, 3],
];
function drawSouthIndianChart(ctx, chart, cx, cy, r) {
  const size = r * 2;
  const cell = size / 4;
  const left = cx - r, top = cy - r;
  const byHouse = planetsByHouse(chart);

  // Outer + inner frames.
  ctx.strokeStyle = 'rgba(245,214,128,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left, top, size, size);
  ctx.strokeStyle = 'rgba(245,214,128,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left + cell, top + cell, cell * 2, cell * 2);

  // Cell grid lines (only the outer ring; centre stays hollow).
  ctx.strokeStyle = 'rgba(245,214,128,0.4)';
  ctx.lineWidth = 1;
  // Vertical lines
  for (const x of [left + cell, left + 2 * cell, left + 3 * cell]) {
    // Top portion (from top to top+cell)
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + cell); ctx.stroke();
    // Bottom portion (from top+3*cell to top+size)
    ctx.beginPath(); ctx.moveTo(x, top + 3 * cell); ctx.lineTo(x, top + size); ctx.stroke();
  }
  // Horizontal lines (left and right strips)
  for (const y of [top + cell, top + 2 * cell, top + 3 * cell]) {
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + cell, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left + 3 * cell, y); ctx.lineTo(left + size, y); ctx.stroke();
  }

  // Map sign → planets.
  const planetsBySign = Array.from({ length: 12 }, () => []);
  for (let h = 1; h <= 12; h++) {
    const sign = (chart.lagnaSignIdx + h - 1) % 12;
    planetsBySign[sign] = byHouse[h - 1];
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [sign, row, col] of S_CELLS) {
    const x = left + col * cell + cell / 2;
    const y = top + row * cell + cell / 2;
    const isLagna = sign === chart.lagnaSignIdx;
    const planets = planetsBySign[sign];
    const house = ((sign - chart.lagnaSignIdx + 12) % 12) + 1;

    if (isLagna) {
      ctx.fillStyle = 'rgba(245,214,128,0.08)';
      ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
      ctx.strokeStyle = 'rgba(245,214,128,0.6)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x - cell / 2, y - cell / 2, cell, cell);
    }

    ctx.fillStyle = 'rgba(155,155,189,0.6)';
    ctx.font = `${Math.round(cell * 0.10)}px Inter, sans-serif`;
    ctx.fillText(`${RASHIS[sign].en} · H${house}`, x, y - cell * 0.32);

    ctx.fillStyle = '#f5d680';
    ctx.font = `${Math.round(cell * 0.18)}px "Cormorant Garamond", serif`;
    ctx.fillText(RASHIS[sign].glyph, x, y - cell * 0.13);

    ctx.font = `${Math.round(cell * 0.13)}px "Cormorant Garamond", serif`;
    planets.forEach((p, i) => {
      ctx.fillStyle = p.dignity === 'exalted' ? '#fff8dd'
                    : p.dignity === 'debilitated' ? '#ff9a9a'
                    : (p.dignity === 'own' || p.dignity === 'mooltrikona') ? '#f5d680'
                    : '#e6e6f0';
      ctx.fillText(VEDIC_GLYPH[p.name] || p.name, x, y + cell * 0.05 + i * cell * 0.13);
    });

    if (isLagna) {
      ctx.fillStyle = '#d79b3a';
      ctx.font = `${Math.round(cell * 0.10)}px Inter, sans-serif`;
      ctx.fillText('LAGNA', x, y + cell * 0.36);
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry — composes the page (header + chart + planet table) and pulls
// the trigger.
// ---------------------------------------------------------------------------
const AYAN_LABEL = {
  lahiri: 'Lahiri', kp: 'KP', raman: 'Raman',
  truecitra: 'True Citra', fagan_bradley: 'Fagan/Bradley',
};

export function downloadVedicChart(chart, format = 'north') {
  if (!chart) return;
  const W = 1400, H = 1900;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background.
  ctx.fillStyle = '#0b0b15';
  ctx.fillRect(0, 0, W, H);

  // Header text.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('O L O G Y · V E D I C', W / 2, 42);
  ctx.fillStyle = '#f5d680';
  ctx.font = 'bold 40px "Cormorant Garamond", serif';
  ctx.fillText(chart.birth.name || 'Untitled chart', W / 2, 96);
  ctx.fillStyle = '#c8c8dd';
  ctx.font = '16px Inter, sans-serif';
  const dateStr = `${chart.birth.day}/${chart.birth.month}/${chart.birth.year}  ·  ${pad(chart.birth.hour)}:${pad(chart.birth.minute)}  ·  ${chart.birth.placeName}`;
  ctx.fillText(dateStr, W / 2, 126);
  ctx.fillStyle = '#d79b3a';
  ctx.font = 'italic 14px "Cormorant Garamond", serif';
  ctx.fillText(`Sidereal · ${AYAN_LABEL[chart.ayanamsa] || chart.ayanamsa} · Whole-Sign Houses`, W / 2, 150);

  // Chart in the upper portion.
  const chartCx = W / 2;
  const chartCy = 580;
  const chartR = 380;
  if (format === 'south') drawSouthIndianChart(ctx, chart, chartCx, chartCy, chartR);
  else                    drawNorthIndianChart(ctx, chart, chartCx, chartCy, chartR);

  // Lagna line below chart.
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(`Lagna: ${chart.lagnaSign} (${chart.lagnaSignSa}) · ${fmtDeg(chart.lagnaWithinDeg)}`, W / 2, chartCy + chartR + 50);

  // Planet table.
  const tableTop = chartCy + chartR + 100;
  const colX = [W * 0.15, W * 0.30, W * 0.45, W * 0.55, W * 0.70, W * 0.86];
  const headers = ['Graha', 'Rashi', 'Bhava', 'Position', 'Nakshatra · Pada', 'Dignity'];
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = '#9b9bbd';
  headers.forEach((h, i) => ctx.fillText(h.toUpperCase(), colX[i], tableTop));

  // Header underline.
  ctx.strokeStyle = 'rgba(245,214,128,0.25)';
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(W * 0.10, tableTop + 8); ctx.lineTo(W * 0.95, tableTop + 8); ctx.stroke();

  let rowY = tableTop + 32;
  ctx.font = '14px Inter, sans-serif';
  for (const p of chart.planets) {
    // Glyph + name
    ctx.fillStyle = '#f5d680';
    ctx.font = '20px "Cormorant Garamond", serif';
    ctx.fillText(VEDIC_GLYPH[p.name] || '•', colX[0], rowY);
    ctx.fillStyle = '#e6e6f0';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`${p.name}${p.isVargottama ? '  ✦' : ''}`, colX[0] + 30, rowY);
    // Rashi
    ctx.fillStyle = '#c8c8dd';
    ctx.fillText(`${RASHIS[p.signIdx].glyph} ${p.sign}`, colX[1], rowY);
    // Bhava
    ctx.fillStyle = '#9b9bbd';
    ctx.fillText(String(p.house), colX[2], rowY);
    // Position
    ctx.fillStyle = '#fff8dd';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(fmtDeg(p.withinDeg), colX[3], rowY);
    // Nakshatra · pada
    ctx.fillStyle = '#9b9bbd';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(`${p.nakshatra} · ${p.pada}`, colX[4], rowY);
    // Dignity
    const tone = p.dignity === 'exalted' ? '#fff8dd'
               : p.dignity === 'debilitated' ? '#ff9a9a'
               : (p.dignity === 'own' || p.dignity === 'mooltrikona') ? '#f5d680'
               : '#9b9bbd';
    ctx.fillStyle = tone;
    ctx.fillText(p.dignity || '—', colX[5], rowY);

    rowY += 30;
  }

  // Lagna row at the bottom.
  ctx.strokeStyle = 'rgba(245,214,128,0.15)';
  ctx.beginPath(); ctx.moveTo(W * 0.10, rowY - 14); ctx.lineTo(W * 0.95, rowY - 14); ctx.stroke();
  ctx.fillStyle = '#d79b3a';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('LAGNA', colX[0] + 30, rowY);
  ctx.fillStyle = '#c8c8dd';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(`${RASHIS[chart.lagnaSignIdx].glyph} ${chart.lagnaSign}`, colX[1], rowY);
  ctx.fillStyle = '#9b9bbd';
  ctx.fillText('1', colX[2], rowY);
  ctx.fillStyle = '#fff8dd';
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText(fmtDeg(chart.lagnaWithinDeg), colX[3], rowY);

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6d6d88';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(`${format === 'south' ? 'South-Indian' : 'North-Indian'} chart · Sidereal Lahiri · whole-sign houses`, W / 2, H - 60);
  ctx.fillText('Generated by Ology — Vedic', W / 2, H - 40);

  // Trigger PNG download.
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${slug(chart.birth.name)}-vedic.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
