// -----------------------------------------------------------------------------
// AstroCartography line geometry (Phase 3)
//
// For each planet with equatorial coords (α, δ) and Greenwich sidereal time Θ,
// compute four loci on Earth's surface:
//
//   MC line : longitude = α − Θ (vertical meridian — planet on upper meridian)
//   IC line : longitude = α − Θ + 180° (lower meridian)
//   ASC line: points where planet rises (eastern horizon)
//   DSC line: points where planet sets (western horizon)
//
// Rising/setting uses hour-angle: cos(H) = −tan(δ) tan(φ). Valid only where
// |tan(δ) tan(φ)| ≤ 1 (outside that the planet is circumpolar / never
// visible — line simply does not exist at that latitude).
// -----------------------------------------------------------------------------

const PI = Math.PI;
const TWO_PI = 2 * PI;

function normLon(lon) {
  // Wrap to (−π, π].
  let x = ((lon + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  return x;
}

export function astrocartographyLines(ra, dec, theta) {
  // ra, dec, theta in radians.
  const mcLon = normLon(ra - theta);
  const icLon = normLon(ra - theta + PI);

  // Truncate MC / IC meridians short of the poles. Lines that reach the
  // pole itself converge to a single 3D point — this creates a visually
  // ugly pinch and depth-precision issues where all planets' lines cross
  // the mesh. Stopping at ±85° avoids the uninhabited polar caps anyway.
  const POLE_LIMIT = 85 * (Math.PI / 180);
  const mc = [];
  const ic = [];
  const MER = 80;
  for (let i = 0; i <= MER; i++) {
    const lat = -POLE_LIMIT + (i / MER) * (2 * POLE_LIMIT);
    mc.push([mcLon, lat]);
    ic.push([icLon, lat]);
  }

  const asc = [], dsc = [];
  // Iterate latitude densely; skip where formula has no solution.
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const lat = -PI / 2 + 1e-3 + (i / N) * (PI - 2e-3);
    const cosH = -Math.tan(dec) * Math.tan(lat);
    if (cosH >= -1 && cosH <= 1) {
      const H = Math.acos(cosH);
      asc.push([normLon(ra - theta - H), lat]);
      dsc.push([normLon(ra - theta + H), lat]);
    }
  }

  return { mc, ic, asc, dsc };
}

// Convert (lon, lat) in radians to XYZ on a unit sphere whose UV mapping
// matches a standard equirectangular map texture.
//
// Three.js's SphereGeometry default UV unwrapping places:
//   u = 0.50  →  +X axis    → texture 0° (Greenwich)
//   u = 0.25  →  +Z axis    → texture -90° (Americas)
//   u = 0.75  →  -Z axis    → texture +90° (East Asia)
//
// Therefore EAST longitude must go to NEGATIVE z, not positive.
// (An earlier version had `z = +sin(lon)`, which mirrored everything
// east-west across Greenwich — cities and lines landed on the opposite
// side of the world. Delhi showed up near Cuba.)
export function latLonToXYZ(lon, lat, r = 1) {
  const cl = Math.cos(lat);
  return [
    r * cl * Math.cos(lon),
    r * Math.sin(lat),
    -r * cl * Math.sin(lon),
  ];
}

// Split a sequence of [lon, lat] into multiple polylines wherever longitude
// wraps across the ±π seam, so line rendering doesn't cross the globe.
export function splitOnSeam(points) {
  const out = [];
  let cur = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0) { cur.push(points[i]); continue; }
    const prev = points[i - 1];
    const now = points[i];
    if (Math.abs(now[0] - prev[0]) > PI) {
      out.push(cur);
      cur = [now];
    } else {
      cur.push(now);
    }
  }
  if (cur.length) out.push(cur);
  return out;
}
