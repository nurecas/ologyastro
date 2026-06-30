// -----------------------------------------------------------------------------
// Phase 3 — Midpoints (Ebertin 90° dial)
//
// Reinhold Ebertin's *The Combination of Stellar Influences* formalised
// midpoint analysis. For each pair of the 10 classical planets we compute
// the ecliptic midpoint; a planet, Ascendant, or MC within 1.5° of a
// midpoint is an "activation" — the midpoint's archetype is being
// expressed by that body.
//
// Used by the Profile Midpoints card (Advanced mode — Phase 5).
// -----------------------------------------------------------------------------

const CLASSICAL_ORDER = [
  'Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto',
];

function norm360(x) { return ((x % 360) + 360) % 360; }

// Circular midpoint of two longitudes — takes the shorter arc's midpoint.
export function circularMidpoint(a, b) {
  const diff = ((b - a + 540) % 360) - 180;
  return norm360(a + diff / 2);
}

// Angular distance folded to [0, 180].
function angDist180(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

// Build all 45 pair midpoints of the classical 10. Returns:
//   [{ pair: 'Sun/Moon', a: 'Sun', b: 'Moon', lonDeg }]
export function pairMidpoints(natal) {
  const byName = Object.fromEntries(natal.planets.map(p => [p.name, p]));
  const pairs = [];
  for (let i = 0; i < CLASSICAL_ORDER.length; i++) {
    for (let j = i + 1; j < CLASSICAL_ORDER.length; j++) {
      const a = CLASSICAL_ORDER[i], b = CLASSICAL_ORDER[j];
      const pa = byName[a], pb = byName[b];
      if (!pa || !pb) continue;
      pairs.push({ pair: `${a}/${b}`, a, b, lonDeg: circularMidpoint(pa.lonDeg, pb.lonDeg) });
    }
  }
  return pairs;
}

// Activations: midpoints within `orbDeg` (default 1.5°) of a natal planet
// or angle. Each activation entry contains the midpoint + the activating
// point. Used to render the Ebertin-style interpretation list.
export function activatedMidpoints(natal, orbDeg = 1.5) {
  const mids = pairMidpoints(natal);
  const targets = [
    ...natal.planets.filter(p => p.classical !== false).map(p => ({ name: p.name, lonDeg: p.lonDeg })),
    { name: 'ASC', lonDeg: natal.ascDeg },
    { name: 'MC',  lonDeg: natal.mcDeg },
  ];
  const out = [];
  for (const m of mids) {
    for (const t of targets) {
      // Skip trivial activations: the midpoint's own two endpoints.
      if (t.name === m.a || t.name === m.b) continue;
      const d = angDist180(m.lonDeg, t.lonDeg);
      if (d <= orbDeg) {
        out.push({ ...m, activator: t.name, orb: d });
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}

// One-line summary: "5 midpoints within 1.5° of natal points".
export function midpointSummary(natal, orbDeg = 1.5) {
  const acts = activatedMidpoints(natal, orbDeg);
  return acts.length
    ? `${acts.length} midpoint${acts.length === 1 ? '' : 's'} within ${orbDeg}\u00b0 of natal points`
    : `no midpoints within ${orbDeg}\u00b0 of natal points`;
}
