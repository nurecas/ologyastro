// Western — Astrocartography map PNG export.
//
// Renders a 2400×1200 equirectangular world map with the natal chart's 10
// planet lines (MC / IC / ASC / DSC each) overlaid in the planet's colour.
// Uses the existing public/earth_topo.jpg as the base texture (the same
// asset the Globe view uses), so no new bundle weight.
//
// Equirectangular projection: x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H
// — the simplest map projection and the one ACG software has used for
// decades. Latitudes near the poles look stretched horizontally; that's
// fine for astrocartography because the lines that matter run mostly
// vertically (MC/IC) or diagonally (ASC/DSC) through inhabited latitudes.

import {
  dateToJD, gmst, equatorialAtDate, PLANETS,
} from '../../astro/ephemeris.js';
import {
  astrocartographyLines, splitOnSeam,
} from '../../astro/astrocartography.js';

const RAD = 180 / Math.PI;

function pad(n) { return String(n).padStart(2, '0'); }
function slug(s) { return (s || 'chart').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }

// Planet colour palette — each planet's MC line gets its own colour so a
// reader can scan the map and see which line is which without legends. We
// pick saturated, distinct hues that read clearly over the dark Earth
// texture.
const PLANET_COLOR = {
  Sun:     '#f5d680',
  Moon:    '#c8c8dd',
  Mercury: '#9adfa8',
  Venus:   '#f7c7c7',
  Mars:    '#ff6a6a',
  Jupiter: '#e8a35c',
  Saturn:  '#7a4f24',
  Uranus:  '#5b7fc7',
  Neptune: '#5fa672',
  Pluto:   '#b79aff',
};

const PLANET_GLYPH = {
  Sun: '☉', Moon: '☾', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

// Project a [lon, lat] pair (radians) to canvas (x, y).
function project(lonRad, latRad, W, H) {
  const lon = lonRad * RAD;
  const lat = latRad * RAD;
  return [
    ((lon + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ];
}

// Draw a polyline in pixel space, splitting on the ±180° seam so segments
// don't span the whole map.
function drawPolyline(ctx, points, W, H) {
  // Split on seam first (in lon-lat space), then project + stroke.
  const segments = splitOnSeam(points);
  for (const seg of segments) {
    if (seg.length < 2) continue;
    ctx.beginPath();
    seg.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat, W, H);
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

// Load an Image from the deploy's base path. The Globe component already
// fetches earth_topo.jpg this way; we reuse it.
function loadEarthTexture() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Earth texture failed to load'));
    // Cloudflare/Pages serves /earth_topo.jpg from the dist root.
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    img.src = base + 'earth_topo.jpg';
  });
}

// MAIN — given the natal chart object, render and trigger PNG download.
export async function downloadAstroMap(natal) {
  if (!natal) return;
  const W = 2400, H = 1200;
  const MAP_TOP = 140;            // header height
  const MAP_HEIGHT = 1000;        // 2:1 equirectangular plus header + legend
  const MAP_BOTTOM = MAP_TOP + MAP_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background.
  ctx.fillStyle = '#0b0b15';
  ctx.fillRect(0, 0, W, H);

  // Header.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('O L O G Y · A S T R O C A R T O G R A P H Y', W / 2, 36);
  ctx.fillStyle = '#f5d680';
  ctx.font = 'bold 36px "Cormorant Garamond", serif';
  ctx.fillText(natal.birth.name || 'Untitled', W / 2, 80);
  ctx.fillStyle = '#c8c8dd';
  ctx.font = '14px Inter, sans-serif';
  const dateStr = `${natal.birth.day}/${natal.birth.month}/${natal.birth.year}  ·  ${pad(natal.birth.hour)}:${pad(natal.birth.minute)}  ·  ${natal.birth.placeName}`;
  ctx.fillText(dateStr, W / 2, 108);

  // Try to load + draw the Earth texture as the map background. If it
  // fails (network, CORS, deploy without the asset), fall back to a
  // dark-blue ocean fill + 30° graticule so the map is still readable.
  let bgDrawn = false;
  try {
    const img = await loadEarthTexture();
    // The image is equirectangular; we paint it slightly dimmed so the
    // bright planet lines pop on top.
    ctx.globalAlpha = 0.55;
    ctx.drawImage(img, 0, MAP_TOP, W, MAP_HEIGHT);
    ctx.globalAlpha = 1;
    bgDrawn = true;
  } catch (e) {
    // Fallback ocean colour.
    ctx.fillStyle = '#0e1a2c';
    ctx.fillRect(0, MAP_TOP, W, MAP_HEIGHT);
  }

  // Graticule — 30° lon, 15° lat. Always draw on top of the texture for
  // location reference.
  ctx.strokeStyle = bgDrawn ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.6;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px Inter, sans-serif';
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(x, MAP_TOP);
    ctx.lineTo(x, MAP_BOTTOM);
    ctx.stroke();
    if (lon !== -180 && lon !== 180) {
      ctx.textAlign = 'center';
      ctx.fillText(`${lon}°`, x, MAP_BOTTOM + 14);
    }
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * MAP_HEIGHT + MAP_TOP;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillText(`${lat}°`, 6, y - 3);
  }
  // Equator slightly heavier.
  ctx.strokeStyle = 'rgba(245,214,128,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, MAP_TOP + MAP_HEIGHT / 2);
  ctx.lineTo(W, MAP_TOP + MAP_HEIGHT / 2);
  ctx.stroke();

  // Compute lines. Same code path as the Globe view — guarantees consistency.
  const G = gmst(natal.jd);
  const eqs = equatorialAtDate(natal.utc);

  // Helper that confines drawing to the map band (clip rect).
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, MAP_TOP, W, MAP_HEIGHT);
  ctx.clip();

  // Translate the projection to land on the map band, not the canvas top.
  // We do this by post-transforming after `project()` returns y in [0, H_map].
  // Easier: project to a temporary canvas-sized space, then add MAP_TOP.
  const projectMap = (lonRad, latRad) => {
    const lon = lonRad * RAD;
    const lat = latRad * RAD;
    return [
      ((lon + 180) / 360) * W,
      ((90 - lat) / 180) * MAP_HEIGHT + MAP_TOP,
    ];
  };

  function strokePolyline(points, mapTransform = projectMap) {
    const segments = splitOnSeam(points);
    for (const seg of segments) {
      if (seg.length < 2) continue;
      ctx.beginPath();
      seg.forEach(([lon, lat], i) => {
        const [x, y] = mapTransform(lon, lat);
        if (i === 0) ctx.moveTo(x, y);
        else         ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  // Draw lines: per planet, four loci. MC and IC are solid (vertical
  // meridians); ASC and DSC are dashed (horizontal-ish curves) so they
  // can be told apart at a glance. Line widths are chunky — these are
  // the chart's headline data.
  for (let i = 0; i < eqs.length; i++) {
    const planet = PLANETS[i];
    const colour = PLANET_COLOR[planet];
    const lines = astrocartographyLines(eqs[i].ra, eqs[i].dec, G);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([]);
    strokePolyline(lines.mc);
    strokePolyline(lines.ic);
    ctx.setLineDash([8, 6]);
    strokePolyline(lines.asc);
    strokePolyline(lines.dsc);
  }
  ctx.setLineDash([]);

  // Label each MC line with the planet glyph at the top of the map.
  for (let i = 0; i < eqs.length; i++) {
    const planet = PLANETS[i];
    const colour = PLANET_COLOR[planet];
    const mcLonRad = ((eqs[i].ra - G) + Math.PI * 3) % (2 * Math.PI) - Math.PI;
    const [x, y] = projectMap(mcLonRad, 80 / RAD);   // 80°N
    ctx.fillStyle = colour;
    ctx.font = 'bold 22px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PLANET_GLYPH[planet] || planet[0], x, y);
  }

  ctx.restore();   // remove map clip

  // Border around the map band.
  ctx.strokeStyle = 'rgba(245,214,128,0.45)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(0, MAP_TOP, W, MAP_HEIGHT);

  // Legend across the bottom.
  const legendY = MAP_BOTTOM + 50;
  ctx.fillStyle = '#9b9bbd';
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillText('PLANETS', 60, legendY - 10);
  const legendCols = 5;
  const colW = (W - 120) / legendCols;
  for (let i = 0; i < PLANETS.length; i++) {
    const planet = PLANETS[i];
    const colour = PLANET_COLOR[planet];
    const col = i % legendCols;
    const row = Math.floor(i / legendCols);
    const x = 60 + col * colW;
    const y = legendY + row * 26;
    // Coloured solid stroke + dashed stroke, then planet name.
    ctx.strokeStyle = colour;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y); ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x + 22, y); ctx.lineTo(x + 40, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colour;
    ctx.font = 'bold 14px "Cormorant Garamond", serif';
    ctx.fillText(`${PLANET_GLYPH[planet]}  ${planet}`, x + 50, y + 4);
  }
  // MC/IC/ASC/DSC key.
  ctx.fillStyle = '#9b9bbd';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SOLID = MC / IC (meridian)        DASHED = ASC / DSC (horizon)', W - 60, legendY + 60);

  // Footer.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6d6d88';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Generated by Ology — Astrocartography (equirectangular projection)', W / 2, H - 24);

  // Trigger PNG download.
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${slug(natal.birth.name)}-astrocartography.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
