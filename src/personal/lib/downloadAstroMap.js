// Western — Astrocartography map PNG export.
//
// 2400 × 1400 canvas with a 2400 × 1200 equirectangular map band
// (perfect 2:1 ratio — required for an undistorted equirectangular).
//
//   y =  130           ← bottom of header
//   y = 1330           ← top of legend (map band fills 130 → 1330)
//   y = 1400           ← canvas bottom
//
// Each of the 10 natal planets contributes 4 lines (MC / IC / ASC / DSC).
// Each of the 45 planet PAIRS contributes a midpoint with the same 4
// lines, drawn faintly in a blended colour so they don't drown out the
// primary lines.
//
// Coordinate frame: equatorial (RA, dec). Each (lon, lat) on Earth is
// where a given planet/midpoint sits at one of the four classical
// astrocartography loci. We use the same `astrocartographyLines` helper
// the Globe view uses, so map and globe stay in lock-step.

import {
  dateToJD, gmst, equatorialAtDate, PLANETS,
} from '../../astro/ephemeris.js';
import {
  astrocartographyLines, splitOnSeam,
} from '../../astro/astrocartography.js';

const PI = Math.PI;
const TWO_PI = 2 * PI;
const RAD = 180 / PI;

function pad(n) { return String(n).padStart(2, '0'); }
function slug(s) { return (s || 'chart').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }

// Per-planet colour palette. Picked for max contrast against a dim
// equirectangular Earth background.
const PLANET_COLOR = {
  Sun:     '#f5d680',
  Moon:    '#dfdfee',
  Mercury: '#9adfa8',
  Venus:   '#f7c7c7',
  Mars:    '#ff6a6a',
  Jupiter: '#e8a35c',
  Saturn:  '#b88c5e',
  Uranus:  '#7fb0e8',
  Neptune: '#5fa672',
  Pluto:   '#b79aff',
};

const PLANET_GLYPH = {
  Sun: '☉', Moon: '☾', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

// Midpoint colour = average of the two source planets' RGBs. Lets the
// reader trace a midpoint line back to its parents at a glance.
function avgHex(a, b) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round((ar + br) / 2), g = Math.round((ag + bg) / 2), bl = Math.round((ab + bb) / 2);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + bl.toString(16).padStart(2, '0');
}

// Shorter-arc midpoint of two angles (radians). Same logic as
// midpoints.js's `circularMidpoint`, just in radians.
function circularMidpointRad(a, b) {
  const diff = ((b - a + 3 * PI) % TWO_PI) - PI;
  return a + diff / 2;
}

// Midpoint of two equatorial points: shorter-arc RA midpoint + simple
// dec average. This matches the convention used by Astro-Cartography
// midpoint-tree software (e.g., Astrolabe, Treasure Maps).
function midpointEquatorial(ra1, dec1, ra2, dec2) {
  return {
    ra:  circularMidpointRad(ra1, ra2),
    dec: (dec1 + dec2) / 2,
  };
}

// Wrap to (-π, π].
function normLon(lon) {
  let x = ((lon + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  return x;
}

function loadEarthTexture() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Earth texture failed to load'));
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    img.src = base + 'earth_topo.jpg';
  });
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
export async function downloadAstroMap(natal) {
  if (!natal) return;
  // Geometry — exact 2:1 ratio for the map band.
  const W = 2400;
  const MAP_W = 2400;
  const MAP_H = 1200;
  const HEADER_H = 130;
  const LEGEND_H = 70;
  const H = HEADER_H + MAP_H + LEGEND_H;
  const MAP_TOP = HEADER_H;
  const MAP_BOTTOM = MAP_TOP + MAP_H;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background.
  ctx.fillStyle = '#0b0b15';
  ctx.fillRect(0, 0, W, H);

  // ---- Header ----
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('O L O G Y · A S T R O C A R T O G R A P H Y', W / 2, 32);
  ctx.fillStyle = '#f5d680';
  ctx.font = 'bold 36px "Cormorant Garamond", serif';
  ctx.fillText(natal.birth.name || 'Untitled', W / 2, 76);
  ctx.fillStyle = '#c8c8dd';
  ctx.font = '14px Inter, sans-serif';
  const dateStr = `${natal.birth.day}/${natal.birth.month}/${natal.birth.year}  ·  ${pad(natal.birth.hour)}:${pad(natal.birth.minute)}  ·  ${natal.birth.placeName}`;
  ctx.fillText(dateStr, W / 2, 104);

  // ---- Map band ----

  // Equirectangular projection that lands inside the map band.
  const projectMap = (lonRad, latRad) => {
    const lon = lonRad * RAD;
    const lat = latRad * RAD;
    return [
      ((lon + 180) / 360) * MAP_W,
      ((90 - lat) / 180) * MAP_H + MAP_TOP,
    ];
  };

  // Try the Earth texture first. Fall back to a dark ocean fill if the
  // image can't be loaded (offline before SW caches it, etc.).
  let bgDrawn = false;
  try {
    const img = await loadEarthTexture();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(img, 0, MAP_TOP, MAP_W, MAP_H);
    ctx.globalAlpha = 1;
    bgDrawn = true;
  } catch (e) {
    ctx.fillStyle = '#0e1a2c';
    ctx.fillRect(0, MAP_TOP, MAP_W, MAP_H);
  }

  // Graticule — 30° lon × 15° lat.
  ctx.strokeStyle = bgDrawn ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.6;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px Inter, sans-serif';
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = projectMap(lon / RAD, 0);
    ctx.beginPath();
    ctx.moveTo(x, MAP_TOP); ctx.lineTo(x, MAP_BOTTOM);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = projectMap(0, lat / RAD);
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(MAP_W, y);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(`${lat >= 0 ? '+' : ''}${lat}°`, 6, y - 3);
  }
  // Equator slightly heavier.
  ctx.strokeStyle = 'rgba(245,214,128,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const [, equY] = projectMap(0, 0);
  ctx.moveTo(0, equY); ctx.lineTo(MAP_W, equY);
  ctx.stroke();
  // Lon labels along the equator.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  for (let lon = -180; lon <= 180; lon += 30) {
    if (lon === -180 || lon === 180) continue;
    const [x] = projectMap(lon / RAD, 0);
    ctx.fillText(`${lon}°`, x, equY - 4);
  }

  // Compute lines. Same code path as the Globe — guarantees consistency.
  const G = gmst(natal.jd);
  const eqs = equatorialAtDate(natal.utc);

  // Clip to map band so lines + labels can't bleed into the legend.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, MAP_TOP, MAP_W, MAP_H);
  ctx.clip();

  function strokePolyline(points) {
    const segments = splitOnSeam(points);
    for (const seg of segments) {
      if (seg.length < 2) continue;
      ctx.beginPath();
      seg.forEach(([lon, lat], i) => {
        const [x, y] = projectMap(lon, lat);
        if (i === 0) ctx.moveTo(x, y);
        else         ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  // Pre-compute every line set once (used for both drawing AND labels).
  const planetLines = eqs.map((e, i) => ({
    name: PLANETS[i],
    colour: PLANET_COLOR[PLANETS[i]],
    ra: e.ra,
    dec: e.dec,
    lines: astrocartographyLines(e.ra, e.dec, G),
  }));

  // ----- Midpoint lines (drawn FIRST so primary planet lines paint on top) -----
  // 45 pairs × 4 lines = 180 lines. Drawn very thin and faint to avoid
  // overwhelming the chart; colour is the average of the pair's two
  // planet colours so the visual link is preserved.
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < eqs.length; i++) {
    for (let j = i + 1; j < eqs.length; j++) {
      const mp = midpointEquatorial(eqs[i].ra, eqs[i].dec, eqs[j].ra, eqs[j].dec);
      const lines = astrocartographyLines(mp.ra, mp.dec, G);
      ctx.strokeStyle = avgHex(PLANET_COLOR[PLANETS[i]], PLANET_COLOR[PLANETS[j]]);
      ctx.setLineDash([]);
      strokePolyline(lines.mc);
      strokePolyline(lines.ic);
      ctx.setLineDash([5, 4]);
      strokePolyline(lines.asc);
      strokePolyline(lines.dsc);
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // ----- Primary planet lines -----
  ctx.lineWidth = 2.4;
  for (const p of planetLines) {
    ctx.strokeStyle = p.colour;
    ctx.setLineDash([]);
    strokePolyline(p.lines.mc);
    strokePolyline(p.lines.ic);
    ctx.setLineDash([10, 7]);
    strokePolyline(p.lines.asc);
    strokePolyline(p.lines.dsc);
  }
  ctx.setLineDash([]);

  // ----- MC / IC labels with planet glyphs -----
  // Each MC line is a meridian (vertical line) at lon = ra - GMST. Label
  // the planet glyph at TOP of map (78°N) for MC and BOTTOM (-78°S) for
  // IC, with a small filled disc behind the glyph for legibility.
  ctx.font = 'bold 22px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of planetLines) {
    const mcLon = normLon(p.ra - G);
    const icLon = normLon(p.ra - G + PI);
    const [mx, my] = projectMap(mcLon, 78 / RAD);
    const [ix, iy] = projectMap(icLon, -78 / RAD);
    // MC label
    ctx.fillStyle = '#0b0b15';
    ctx.beginPath(); ctx.arc(mx, my, 18, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = p.colour; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(mx, my, 18, 0, TWO_PI); ctx.stroke();
    ctx.fillStyle = p.colour;
    ctx.fillText(PLANET_GLYPH[p.name] || p.name[0], mx, my + 1);
    // IC label
    ctx.fillStyle = '#0b0b15';
    ctx.beginPath(); ctx.arc(ix, iy, 14, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = p.colour; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ix, iy, 14, 0, TWO_PI); ctx.stroke();
    ctx.fillStyle = p.colour;
    ctx.font = 'bold 17px "Cormorant Garamond", serif';
    ctx.fillText(PLANET_GLYPH[p.name] || p.name[0], ix, iy + 1);
    ctx.font = 'bold 22px "Cormorant Garamond", serif';
  }

  // ----- Birth-place marker -----
  // Mark where the chart was cast — useful as an anchor when scanning
  // the map for "good places" relative to home.
  if (Number.isFinite(natal.birth.latDeg) && Number.isFinite(natal.birth.lonDeg)) {
    const [bx, by] = projectMap(natal.birth.lonDeg / RAD, natal.birth.latDeg / RAD);
    ctx.fillStyle = '#fff8dd';
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = '#0b0b15'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, TWO_PI); ctx.stroke();
    ctx.fillStyle = '#fff8dd';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(' Birth place', bx + 9, by - 8);
  }

  ctx.restore();   // remove map clip

  // Map border.
  ctx.strokeStyle = 'rgba(245,214,128,0.5)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(0, MAP_TOP, MAP_W, MAP_H);

  // ---- Legend ----
  const legendY = MAP_BOTTOM + 22;
  ctx.fillStyle = '#9b9bbd';
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('PLANETS', 50, legendY);

  // 10 planet swatches across the row.
  const slotW = (W - 100) / 10;
  for (let i = 0; i < PLANETS.length; i++) {
    const planet = PLANETS[i];
    const colour = PLANET_COLOR[planet];
    const x = 50 + i * slotW;
    const y = legendY + 22;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y); ctx.stroke();
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + 48, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colour;
    ctx.font = 'bold 14px "Cormorant Garamond", serif';
    ctx.fillText(`${PLANET_GLYPH[planet]}  ${planet}`, x + 56, y + 5);
  }

  // Right side: line-style key.
  ctx.fillStyle = '#9b9bbd';
  ctx.textAlign = 'right';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('SOLID = MC / IC (meridian)   ·   DASHED = ASC / DSC (horizon)   ·   FAINT = midpoints (45 pairs)', W - 50, H - 12);

  // ---- Trigger PNG download ----
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${slug(natal.birth.name)}-astrocartography.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
