// -----------------------------------------------------------------------------
// Phase 3 — Classical Aspect Grid
//
// Every pair's aspect (if any) and orb, rendered as a square matrix in the
// UI (Profile, Advanced mode). Also accessible from the Natal Wheel via a
// grid icon (Phase 5 adds the UI surfacing).
// -----------------------------------------------------------------------------

export const GRID_ASPECTS = [
  { name: 'conjunction', angle:   0, orb: 8, glyph: '☌' },
  { name: 'sextile',     angle:  60, orb: 5, glyph: '⚹' },
  { name: 'square',      angle:  90, orb: 6, glyph: '□' },
  { name: 'trine',       angle: 120, orb: 7, glyph: '△' },
  { name: 'opposition',  angle: 180, orb: 8, glyph: '☍' },
];

function angDist180(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

// Compute the tightest aspect between two longitudes. Returns null if no
// aspect is within orb. Orbs per aspect are classical (Lilly / Hand).
export function aspectBetween(lonA, lonB) {
  const d = angDist180(lonA, lonB);
  let best = null;
  for (const a of GRID_ASPECTS) {
    const o = Math.abs(d - a.angle);
    if (o <= a.orb && (best == null || o < best.orb)) {
      best = { ...a, orb: o };
    }
  }
  return best;
}

// Full N×N grid including angles (ASC + MC) at the end.
// Returns:
//   rows: [planetName, ...], cols: same
//   cells[i][j] = null | { name, orb, glyph }   for i != j; cells[i][i] = null
export function aspectGrid(natal, { includeAngles = true, classicalOnly = true } = {}) {
  const bodies = natal.planets
    .filter(p => classicalOnly ? p.classical !== false : !p.calculatedPoint)
    .map(p => ({ name: p.name, lonDeg: p.lonDeg }));
  if (includeAngles) {
    bodies.push({ name: 'ASC', lonDeg: natal.ascDeg });
    bodies.push({ name: 'MC',  lonDeg: natal.mcDeg  });
  }
  const rows = bodies.map(b => b.name);
  const cells = bodies.map((a, i) =>
    bodies.map((b, j) => i === j ? null : aspectBetween(a.lonDeg, b.lonDeg))
  );
  return { rows, cols: rows, cells };
}

// One-line summary: "20 aspects total · 6 tight" (orb ≤ 2°).
export function aspectGridSummary(natal, { tightOrbDeg = 2 } = {}) {
  const { cells } = aspectGrid(natal);
  let total = 0, tight = 0;
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const c = cells[i][j];
      if (!c) continue;
      total++;
      if (c.orb <= tightOrbDeg) tight++;
    }
  }
  return `${total} aspect${total === 1 ? '' : 's'} total \u00b7 ${tight} tight`;
}
