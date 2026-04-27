// -----------------------------------------------------------------------------
// Natal-chart PNG export.
//
// Renders the full natal wheel + metadata to an offscreen canvas and
// triggers a download. Independent of the live NatalWheel component so
// it works from any mode, even when the wheel isn't currently rendered.
// -----------------------------------------------------------------------------

import { SIGN_GLYPHS, fmtLon } from '../astro/natal.js';
import { PLANET_INFO } from '../astro/interpretation.js';

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

function pad(n) { return String(n).padStart(2, '0'); }
function slug(s) { return (s || 'chart').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(); }

// Draw just the natal wheel centred at (cx, cy) with outer radius R.
function drawWheel(ctx, cx, cy, R, natal) {
  const Rout    = R;
  const s       = R / 260;            // scale offsets proportionally
  const Rsigns  = Rout   - 22 * s;
  const Rhouses = Rsigns - 14 * s;
  const Rnatal  = Rhouses - 38 * s;
  const Rinner  = Rnatal  - 52 * s;

  const asc = natal.ascDeg;
  const ang = (lon) => ((lon - asc) * DEG) - Math.PI;

  // Rings.
  ctx.strokeStyle = '#f5d680';
  ctx.lineWidth = 1 * s;
  for (const r of [Rout, Rsigns, Rhouses, Rinner]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.stroke();
  }

  // Sign sector dividers.
  ctx.strokeStyle = 'rgba(245,214,128,0.35)';
  for (let i = 0; i < 12; i++) {
    const a = ang(i * 30);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * Rsigns, cy + Math.sin(a) * Rsigns);
    ctx.lineTo(cx + Math.cos(a) * Rout,   cy + Math.sin(a) * Rout);
    ctx.stroke();
  }

  // Sign glyphs, mid-sign.
  ctx.font = `${24 * s}px "Cormorant Garamond", serif`;
  ctx.fillStyle = '#e8e5d5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = ang(i * 30 + 15);
    const r = (Rsigns + Rout) / 2;
    ctx.fillText(SIGN_GLYPHS[i], cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }

  // Degree ticks every 5°.
  for (let deg = 0; deg < 360; deg += 5) {
    const a = ang(deg);
    const len = deg % 30 === 0 ? 14 * s : deg % 10 === 0 ? 8 * s : 4 * s;
    ctx.strokeStyle = 'rgba(200, 200, 220, 0.45)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (Rsigns - len), cy + Math.sin(a) * (Rsigns - len));
    ctx.lineTo(cx + Math.cos(a) * Rsigns,         cy + Math.sin(a) * Rsigns);
    ctx.stroke();
  }

  // House cusps.
  natal.houses.forEach((h, i) => {
    const a = ang(h);
    const emphasized = (i === 0 || i === 3 || i === 6 || i === 9);
    ctx.strokeStyle = emphasized ? 'rgba(245,214,128,0.75)' : 'rgba(200,200,220,0.2)';
    ctx.lineWidth = emphasized ? 1.6 * s : 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * Rinner,  cy + Math.sin(a) * Rinner);
    ctx.lineTo(cx + Math.cos(a) * Rhouses, cy + Math.sin(a) * Rhouses);
    ctx.stroke();

    // House number mid-house, just inside the cusp ring.
    ctx.font = `${13 * s}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(191,191,214,0.7)';
    const na = ang(h + 15);
    const nr = Rinner + 14 * s;
    ctx.fillText(String(i + 1), cx + Math.cos(na) * nr, cy + Math.sin(na) * nr);
  });

  // Angle labels (ASC, DSC, MC, IC).
  const drawAngle = (deg, label) => {
    const a = ang(deg);
    const r = Rhouses - 26 * s;
    ctx.font = `bold ${14 * s}px Inter, sans-serif`;
    ctx.fillStyle = '#f5d680';
    ctx.fillText(label, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  };
  drawAngle(natal.ascDeg, 'ASC');
  drawAngle(natal.dscDeg, 'DSC');
  drawAngle(natal.mcDeg,  'MC');
  drawAngle(natal.icDeg,  'IC');

  // Aspect lines inside the inner disk (natal × natal).
  const aspectTable = [
    { angle:   0, color: '#ffffff', maxOrb: 7 },
    { angle: 180, color: '#ff6a6a', maxOrb: 6 },
    { angle:  90, color: '#ffaa44', maxOrb: 5 },
    { angle: 120, color: '#44ff88', maxOrb: 5 },
    { angle:  60, color: '#4488ff', maxOrb: 4 },
  ];
  // Aspect lines — classical 10 only. Including extras + Fortune here
  // clutters the wheel with faint noise (and Fortune isn't a body so
  // aspect lines *to* it would be misleading).
  const classicalForAspects = natal.planets.filter(p => p.classical !== false && !p.calculatedPoint);
  classicalForAspects.forEach((p1, i) => {
    for (let j = i + 1; j < classicalForAspects.length; j++) {
      const p2 = classicalForAspects[j];
      const diff = Math.abs(((p1.lonDeg - p2.lonDeg) % 360 + 360) % 360);
      const d = diff > 180 ? 360 - diff : diff;
      for (const a of aspectTable) {
        const orb = Math.abs(d - a.angle);
        if (orb > a.maxOrb) continue;
        const alpha = 0.55 * (1 - orb / a.maxOrb);
        ctx.strokeStyle = a.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.0 * s;
        const x1 = cx + Math.cos(ang(p1.lonDeg)) * Rnatal;
        const y1 = cy + Math.sin(ang(p1.lonDeg)) * Rnatal;
        const x2 = cx + Math.cos(ang(p2.lonDeg)) * Rnatal;
        const y2 = cy + Math.sin(ang(p2.lonDeg)) * Rnatal;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
  });

  // Natal planet glyphs.
  ctx.font = `${26 * s}px "Cormorant Garamond", serif`;
  natal.planets.forEach(p => {
    const a = ang(p.lonDeg);
    const x = cx + Math.cos(a) * Rnatal;
    const y = cy + Math.sin(a) * Rnatal;
    // Gold halo.
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 22 * s);
    grad.addColorStop(0, 'rgba(245,214,128,0.55)');
    grad.addColorStop(1, 'rgba(245,214,128,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 22 * s, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#fff8dd';
    ctx.fillText(PLANET_GLYPH[p.name], x, y);
    // Degree under glyph.
    ctx.font = `${11 * s}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(191,191,214,0.85)';
    ctx.fillText(`${(p.lonDeg % 30).toFixed(0)}°`, x, y + 22 * s);
    ctx.font = `${26 * s}px "Cormorant Garamond", serif`;
  });
}

export async function downloadNatalChart(natal) {
  if (!natal) return;

  const W = 1400, H = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background.
  ctx.fillStyle = '#0b0b15';
  ctx.fillRect(0, 0, W, H);

  // Header.
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('O L O G Y', W / 2, 42);

  ctx.fillStyle = '#f5d680';
  ctx.font = 'bold 40px "Cormorant Garamond", serif';
  ctx.fillText(natal.birth.name || 'Untitled chart', W / 2, 96);

  ctx.fillStyle = '#c8c8dd';
  ctx.font = '16px Inter, sans-serif';
  const dateStr = `${natal.birth.day}/${natal.birth.month}/${natal.birth.year}  ·  ${pad(natal.birth.hour)}:${pad(natal.birth.minute)}  ·  ${natal.birth.placeName}`;
  ctx.fillText(dateStr, W / 2, 126);

  // Wheel centred, leaving room for the legend below.
  const wheelCenterY = 680;
  const wheelR = 460;
  drawWheel(ctx, W / 2, wheelCenterY, wheelR, natal);

  // Legend — dynamic 2- or 3-column grid, sized to the body list.
  // Previous layout hard-coded 10 slots in 2×5; with extras the 6th body
  // wrapped onto the same row as the 1st, garbling the output. Now we
  // lay out in column-major order with a column count that adapts.
  const legendTop = wheelCenterY + wheelR + 80;
  const bodies = natal.planets; // includes classical + extras + Fortune
  const colCount = bodies.length <= 10 ? 2 : 3;
  const rowsPerCol = Math.ceil(bodies.length / colCount);
  const colWidth = colCount === 2 ? 380 : 280;
  const firstColX = W / 2 - (colCount * colWidth) / 2 + 20;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '24px "Cormorant Garamond", serif';
  bodies.forEach((p, i) => {
    const col = Math.floor(i / rowsPerCol);
    const row = i % rowsPerCol;
    const x = firstColX + col * colWidth;
    const y = legendTop + row * 36;
    ctx.fillStyle = '#f5d680';
    ctx.font = '24px "Cormorant Garamond", serif';
    ctx.fillText(PLANET_GLYPH[p.name] || '•', x, y);
    ctx.fillStyle = '#e6e6f0';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(p.name, x + 36, y);
    ctx.fillStyle = '#c8c8dd';
    ctx.fillText(fmtLon(p.lonDeg), x + 140, y);
    if (!p.calculatedPoint) {
      ctx.fillStyle = '#9b9bbd';
      ctx.fillText(`house ${p.house}`, x + colWidth - 80, y);
    }
  });

  // Angles (ASC / MC) below the grid, centred.
  const angleY = legendTop + rowsPerCol * 36 + 30;
  const colX = [W / 2 - 200, W / 2 + 200];
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9b9bbd';
  ctx.fillText('Ascendant', colX[0] + 100, angleY);
  ctx.fillText('Midheaven', colX[1] + 100, angleY);
  ctx.fillStyle = '#f5d680';
  ctx.font = '22px "Cormorant Garamond", serif';
  ctx.fillText(fmtLon(natal.ascDeg), colX[0] + 100, angleY + 28);
  ctx.fillText(fmtLon(natal.mcDeg),  colX[1] + 100, angleY + 28);

  // House system note.
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = '#6d6d88';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${natal.houseSystem === 'placidus' ? 'Placidus' : 'Equal'} houses  ·  tropical zodiac  ·  J2000 mean ecliptic`,
    W / 2, H - 60
  );
  ctx.fillText('Generated by Ology', W / 2, H - 40);

  // Direct PNG download — anchor with data-URI. Skips the print dialog so
  // the user gets a sharp 1400×1800 image they can use anywhere (paste
  // into a slide, attach to an email, drag into an LLM with the JSON).
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${slug(natal.birth.name)}-ology.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
