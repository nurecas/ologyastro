// -----------------------------------------------------------------------------
// Ology — Ephemeris
//
// Computes GEOCENTRIC ecliptic longitude (of-date, approximate) for the 10
// classical astrological bodies, deterministic and offline.
//
// Planets (except Sun/Moon): E.M. Standish (JPL) "Keplerian Elements for
// Approximate Positions of the Major Planets" (valid 1800-2050 at ~1°;
// graceful degradation outside; Pluto is the weakest).
//
// Sun: Geocentric apparent longitude via reduced Meeus (Ch. 25, truncated).
// Moon: Reduced ELP2000 / Meeus Ch. 47 with leading periodic terms.
//
// Reference accuracy target: ≤ 1° for 1500-2100 CE for the Sun, Moon, and
// inner planets. Outer planets (especially Pluto) drift further outside
// 1800-2050 but remain adequate as a *field* driver (the harmonic field is
// sensitive to positions, not arc-seconds).
// -----------------------------------------------------------------------------

export const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
];

// Astrological amplitude weights (per spec).
export const AMPLITUDES = {
  Sun: 0.5, Moon: 0.15, Mercury: 0.2, Venus: 0.3, Mars: 0.4,
  Jupiter: 0.6, Saturn: 0.7, Uranus: 0.8, Neptune: 0.9, Pluto: 1.0,
};

export const AMPLITUDE_ARRAY = PLANETS.map(p => AMPLITUDES[p]);

const DEG = Math.PI / 180.0;
const RAD = 180.0 / Math.PI;
const TWO_PI = Math.PI * 2.0;

function norm360(x) {
  let y = x % 360;
  if (y < 0) y += 360;
  return y;
}
function norm2pi(x) {
  let y = x % TWO_PI;
  if (y < 0) y += TWO_PI;
  return y;
}

// Julian Date for a given Date (UTC).
export function dateToJD(date) {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate() + (
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400
  );
  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) +
         Math.floor(30.6001 * (m + 1)) +
         D + B - 1524.5;
}

// Julian Date to a decimal year (Gregorian approximation).
export function jdToDecimalYear(jd) {
  return (jd - 2451545.0) / 365.25 + 2000.0;
}

// Build a JS Date from a decimal year.
export function decimalYearToDate(yr) {
  const y = Math.floor(yr);
  const frac = yr - y;
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return new Date(start + frac * (end - start));
}

// Inverse: Date → decimal year (Gregorian calendar).
export function dateToDecimalYear(date) {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - start) / (end - start);
}

// -----------------------------------------------------------------------------
// Kepler elements table (Standish, J2000 epoch; rate per Julian century).
// Columns: a (AU), e, I (deg), L (deg, mean longitude), long-peri (deg), long-node (deg).
// -----------------------------------------------------------------------------
const EL = {
  Mercury: {
    a0:  0.38709927, ad:  0.00000037,
    e0:  0.20563593, ed:  0.00001906,
    i0:  7.00497902, id: -0.00594749,
    L0:252.25032350, Ld:149472.67411175,
    w0: 77.45779628, wd:  0.16047689,
    O0: 48.33076593, Od: -0.12534081,
  },
  Venus: {
    a0:  0.72333566, ad:  0.00000390,
    e0:  0.00677672, ed: -0.00004107,
    i0:  3.39467605, id: -0.00078890,
    L0:181.97909950, Ld:58517.81538729,
    w0:131.60246718, wd:  0.00268329,
    O0: 76.67984255, Od: -0.27769418,
  },
  EMBary: {
    a0:  1.00000261, ad:  0.00000562,
    e0:  0.01671123, ed: -0.00004392,
    i0: -0.00001531, id: -0.01294668,
    L0:100.46457166, Ld:35999.37244981,
    w0:102.93768193, wd:  0.32327364,
    O0:  0.0,        Od:  0.0,
  },
  Mars: {
    a0:  1.52371034, ad:  0.00001847,
    e0:  0.09339410, ed:  0.00007882,
    i0:  1.84969142, id: -0.00813131,
    L0: -4.55343205, Ld:19140.30268499,
    w0:-23.94362959, wd:  0.44441088,
    O0: 49.55953891, Od: -0.29257343,
  },
  Jupiter: {
    a0:  5.20288700, ad: -0.00011607,
    e0:  0.04838624, ed: -0.00013253,
    i0:  1.30439695, id: -0.00183714,
    L0: 34.39644051, Ld: 3034.74612775,
    w0: 14.72847983, wd:  0.21252668,
    O0:100.47390909, Od:  0.20469106,
  },
  Saturn: {
    a0:  9.53667594, ad: -0.00125060,
    e0:  0.05386179, ed: -0.00050991,
    i0:  2.48599187, id:  0.00193609,
    L0: 49.95424423, Ld: 1222.49362201,
    w0: 92.59887831, wd: -0.41897216,
    O0:113.66242448, Od: -0.28867794,
  },
  Uranus: {
    a0: 19.18916464, ad: -0.00196176,
    e0:  0.04725744, ed: -0.00004397,
    i0:  0.77263783, id: -0.00242939,
    L0:313.23810451, Ld:  428.48202785,
    w0:170.95427630, wd:  0.40805281,
    O0: 74.01692503, Od:  0.04240589,
  },
  Neptune: {
    a0: 30.06992276, ad:  0.00026291,
    e0:  0.00859048, ed:  0.00005105,
    i0:  1.77004347, id:  0.00035372,
    L0:-55.12002969, Ld:  218.45945325,
    w0: 44.96476227, wd: -0.32241464,
    O0:131.78422574, Od: -0.00508664,
  },
  Pluto: {
    a0: 39.48211675, ad: -0.00031596,
    e0:  0.24882730, ed:  0.00005170,
    i0: 17.14001206, id:  0.00004818,
    L0:238.92903833, Ld:  145.20780515,
    w0:224.06891629, wd: -0.04062942,
    O0:110.30393684, Od: -0.01183482,
  },
};

// Solve Kepler's equation E - e sin E = M (radians).
function solveKepler(M, e) {
  M = norm2pi(M);
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 6; i++) {
    const dM = M - (E - e * Math.sin(E));
    const dE = dM / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

// Return heliocentric ecliptic (J2000) coords [x,y,z] in AU for a planet
// at centuries T past J2000.
function helioEcliptic(name, T) {
  const p = EL[name];
  const a  = p.a0 + p.ad * T;
  const e  = p.e0 + p.ed * T;
  const I  = (p.i0 + p.id * T) * DEG;
  const L  = (p.L0 + p.Ld * T) * DEG;
  const wBar = (p.w0 + p.wd * T) * DEG;   // longitude of perihelion
  const O  = (p.O0 + p.Od * T) * DEG;     // longitude of ascending node
  const w  = wBar - O;                    // argument of perihelion
  const M  = L - wBar;

  const E  = solveKepler(M, e);
  // Position in orbital plane
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotation matrix elements (orbital → J2000 ecliptic)
  const cw = Math.cos(w), sw = Math.sin(w);
  const cO = Math.cos(O), sO = Math.sin(O);
  const cI = Math.cos(I), sI = Math.sin(I);

  const x =  (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y =  (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z =  (sw * sI) * xp + (cw * sI) * yp;

  return [x, y, z];
}

// Geocentric ecliptic longitude (degrees) of a planet, for JD TT ≈ UT here.
function planetGeoLongitudeDeg(name, jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const [xh, yh, zh] = helioEcliptic(name, T);
  const [xe, ye, ze] = helioEcliptic('EMBary', T);
  const x = xh - xe;
  const y = yh - ye;
  // z = zh - ze; // not needed for ecliptic longitude
  return norm360(Math.atan2(y, x) * RAD);
}

// -------- Sun (geocentric apparent longitude) --------
// Meeus Ch.25, low-precision.
function sunGeoLongitudeDeg(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M  = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const e  = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C  =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T)                   * Math.sin(2 * M)
    +  0.000289                                    * Math.sin(3 * M);
  const trueLong = L0 + C;
  // Apparent longitude (nutation/aberration low-order correction)
  const Om = (125.04 - 1934.136 * T) * DEG;
  const app = trueLong - 0.00569 - 0.00478 * Math.sin(Om);
  return norm360(app);
}

// -------- Moon (geocentric ecliptic longitude) --------
// Reduced Meeus Ch.47 — leading ~12 periodic terms; good to ~0.3°-1°.
function moonGeoLongitudeDeg(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const Lp = norm360(218.3164477 + 481267.88123421 * T
                    - 0.0015786 * T * T
                    + T * T * T / 538841 - T * T * T * T / 65194000);
  const D  = norm360(297.8501921 + 445267.1114034 * T
                    - 0.0018819 * T * T
                    + T * T * T / 545868 - T * T * T * T / 113065000);
  const M  = norm360(357.5291092 + 35999.0502909 * T
                    - 0.0001536 * T * T
                    + T * T * T / 24490000);
  const Mp = norm360(134.9633964 + 477198.8675055 * T
                    + 0.0087414 * T * T
                    + T * T * T / 69699 - T * T * T * T / 14712000);
  const F  = norm360( 93.2720950 + 483202.0175233 * T
                    - 0.0036539 * T * T
                    - T * T * T / 3526000 + T * T * T * T / 863310000);

  const d  = D  * DEG;
  const m  = M  * DEG;
  const mp = Mp * DEG;
  const f  = F  * DEG;

  // Leading periodic terms (degrees).
  let S = 0;
  S +=  6.288774 * Math.sin(mp);
  S +=  1.274027 * Math.sin(2 * d - mp);
  S +=  0.658314 * Math.sin(2 * d);
  S +=  0.213618 * Math.sin(2 * mp);
  S += -0.185116 * Math.sin(m);
  S += -0.114332 * Math.sin(2 * f);
  S +=  0.058793 * Math.sin(2 * d - 2 * mp);
  S +=  0.057066 * Math.sin(2 * d - m - mp);
  S +=  0.053322 * Math.sin(2 * d + mp);
  S +=  0.045758 * Math.sin(2 * d - m);
  S += -0.040923 * Math.sin(m - mp);
  S += -0.034720 * Math.sin(d);
  S += -0.030383 * Math.sin(m + mp);

  return norm360(Lp + S);
}

// -----------------------------------------------------------------------------
// Phase 3 — zodiac + ayanamsa + house-system active configuration
//
// Module-level state: when a component / store switches the zodiac, every
// downstream call to longitudesAtDate / extraLongitudeAtJD / computeHouses
// picks up the change automatically. Explicit overrides on a per-call
// basis are also respected (options.zodiac / options.ayanamsa).
//
// Supported ayanamsas (brief Phase 3):
//   lahiri      → SE_SIDM_LAHIRI        (default sidereal, most common Indian)
//   kp          → SE_SIDM_KRISHNAMURTI  (KP New-Lahiri variant)
//   raman       → SE_SIDM_RAMAN
//   truecitra   → SE_SIDM_TRUE_CITRA    (modern precise Lahiri derivative)
//   fagan_bradley → SE_SIDM_FAGAN_BRADLEY
// Stored here as strings; resolved to Swiss SIDM_* ints lazily at call time.
// -----------------------------------------------------------------------------

const AYANAMSA_ID = {
  lahiri: 1,        // SE_SIDM_LAHIRI
  kp: 5,            // SE_SIDM_KRISHNAMURTI
  raman: 3,         // SE_SIDM_RAMAN
  truecitra: 27,    // SE_SIDM_TRUE_CITRA (Swiss numbering)
  fagan_bradley: 0, // SE_SIDM_FAGAN_BRADLEY
};

let _activeZodiac   = 'tropical';    // 'tropical' | 'sidereal'
let _activeAyanamsa = 'lahiri';      // one of the keys above
let _sidModeSetTo   = null;          // cache: last-set SIDM to avoid redundant ccalls

export function getActiveZodiac()    { return _activeZodiac; }
export function getActiveAyanamsa()  { return _activeAyanamsa; }

// Update the ephemeris options. Listeners (chart store) subscribe via
// onSwissStateChange OR call this directly and force a recompute. Settable
// even before Swiss is ready — the setting takes effect on first calc.
//
// Important: only fires _notifySwiss when state actually changed. The
// chart store's listener calls chartFromBirth → computeVedicChart →
// setEphemerisOptions; without the change-check that bounce would recurse
// indefinitely (manifesting as a Swiss WASM "memory access out of bounds"
// once the JS stack collapses inside a Swiss call). The store recomputes
// the chart explicitly when the user changes ayanamsa, so we don't lose
// the "force recompute" semantic — same-value calls are simply idempotent.
export function setEphemerisOptions({ zodiac, ayanamsa } = {}) {
  let changed = false;
  if ((zodiac === 'tropical' || zodiac === 'sidereal') && zodiac !== _activeZodiac) {
    _activeZodiac = zodiac;
    changed = true;
  }
  if (ayanamsa && AYANAMSA_ID[ayanamsa] !== undefined && ayanamsa !== _activeAyanamsa) {
    _activeAyanamsa = ayanamsa;
    changed = true;
  }
  if (!changed) return;
  _sidModeSetTo = null;  // force re-apply on next Swiss calc
  _notifySwiss();         // chart store re-renders
}

// Apply the active ayanamsa to the Swiss C module (memoised — only ccall
// when the ayanamsa changes). Returns the numeric flag to OR into calc_ut
// iflag; 0 for tropical.
function _applySiderealFlag() {
  if (!_swissReady) return 0;
  if (_activeZodiac !== 'sidereal') return 0;
  const id = AYANAMSA_ID[_activeAyanamsa] ?? 1;
  if (_sidModeSetTo !== id) {
    _swissInstance.set_sid_mode(id, 0, 0);
    _sidModeSetTo = id;
  }
  return _swissInstance.SEFLG_SIDEREAL;
}

// -----------------------------------------------------------------------------
// Swiss Ephemeris backend (Phase 1)
//
// Async init + sync calc. When ready, longitudesAtDate routes through Swiss;
// otherwise falls back to the Standish+Meeus path above. Dates outside
// 1200-2399 CE always use the Standish+Meeus path (Swiss data range limit).
// -----------------------------------------------------------------------------

// JD bounds for the Swiss data range declared in the brief: "pre-1200 CE or
// after 2399 CE". The embedded data actually covers a far wider interval,
// but matching the brief's explicit contract keeps the out-of-range warning
// honest — 2400-01-01 onward reverts to Standish+Meeus with a badge.
// Upper bound is strict (`<`) so the instant the clock crosses into 2400 CE
// we fall back.
const SWISS_JD_MIN = 2159350.5; // 1200-01-01 00:00 UT (inclusive)
const SWISS_JD_MAX = 2597641.5; // 2400-01-01 00:00 UT (exclusive)

let _swissInstance = null;
let _swissReady = false;
let _swissFailed = false;
let _swissInitPromise = null;

// Listeners notified when Swiss becomes ready (or fails). Subscribers can
// trigger a re-render once the precise backend is online.
const _swissListeners = new Set();
export function onSwissStateChange(fn) {
  _swissListeners.add(fn);
  return () => _swissListeners.delete(fn);
}
function _notifySwiss() { for (const fn of _swissListeners) { try { fn(); } catch {} } }

export function isSwissReady() { return _swissReady; }
export function hasSwissFailed() { return _swissFailed; }
export function isSwissLoading() { return _swissInitPromise !== null && !_swissReady && !_swissFailed; }

// JD range check — use before calling Swiss. Upper bound is exclusive: the
// brief says "after 2399 CE" falls back, so 2400-01-01 exactly is already
// out of range.
export function isInSwissRange(jd) {
  return jd >= SWISS_JD_MIN && jd < SWISS_JD_MAX;
}

// Classification returned by getPrecisionStatus() — used by the precision
// badge and by the "loading ephemeris…" UI. See Section 3.6 of the brief.
//   'swiss'         → Swiss WASM active, JD inside range
//   'loading'       → Swiss is still initializing; UI should show a loader
//   'out-of-range'  → Swiss ready but JD outside 1200-2399 CE
//   'fallback'      → Swiss failed to init; Standish+Meeus active
export function getPrecisionStatus(jd) {
  if (_swissFailed) return 'fallback';
  if (!_swissReady) return _swissInitPromise ? 'loading' : 'fallback';
  if (typeof jd === 'number' && !isInSwissRange(jd)) return 'out-of-range';
  return 'swiss';
}

// Kick off Swiss WASM initialization. Safe to call multiple times; returns the
// same promise. Never throws — on failure, sets _swissFailed so the Standish
// path is used permanently.
export function initSwiss(options = {}) {
  if (_swissInitPromise) return _swissInitPromise;
  _swissInitPromise = (async () => {
    try {
      const { default: SwissEph } = await import('swisseph-wasm');
      const swe = new SwissEph();
      // Node path resolution is baked into the wrapper. In the browser,
      // `options.browserInit` can be provided by the personal app entry —
      // it should configure locateFile via Vite's ?url asset handling and
      // return a ready SweModule. If omitted, we fall through to the
      // wrapper's default (which may or may not work depending on bundler).
      if (options.browserInit) {
        const mod = await options.browserInit();
        swe.SweModule = mod;
        if (!swe.SweModule.HEAP32) {
          swe.SweModule.HEAP32 = new Int32Array(swe.SweModule.HEAPF64.buffer);
        }
        swe.set_ephe_path('sweph');
      } else {
        await swe.initSwissEph();
      }
      _swissInstance = swe;
      _swissReady = true;
      _notifySwiss();
      return true;
    } catch (e) {
      console.warn('[ephemeris] Swiss init failed, falling back to Standish+Meeus:', e);
      _swissFailed = true;
      _notifySwiss();
      return false;
    }
  })();
  return _swissInitPromise;
}

// Map our planet names → Swiss body IDs. Populated lazily once Swiss is up.
function _swissIds(swe) {
  return {
    // Classical 10
    Sun: swe.SE_SUN, Moon: swe.SE_MOON,
    Mercury: swe.SE_MERCURY, Venus: swe.SE_VENUS, Mars: swe.SE_MARS,
    Jupiter: swe.SE_JUPITER, Saturn: swe.SE_SATURN,
    Uranus: swe.SE_URANUS, Neptune: swe.SE_NEPTUNE, Pluto: swe.SE_PLUTO,
    // Phase 2 extras
    Chiron: swe.SE_CHIRON,
    NorthNode: swe.SE_TRUE_NODE,   // True Node per brief (osculating, more accurate)
    Ceres: swe.SE_CERES, Pallas: swe.SE_PALLAS,
    Juno: swe.SE_JUNO, Vesta: swe.SE_VESTA,
    // Uranian / Hamburg-school hypothetical points
    Cupido: swe.SE_CUPIDO, Hades: swe.SE_HADES, Zeus: swe.SE_ZEUS,
    Kronos: swe.SE_KRONOS, Apollon: swe.SE_APOLLON, Admetos: swe.SE_ADMETOS,
    Vulcanus: swe.SE_VULKANUS, Poseidon: swe.SE_POSEIDON,
  };
}

// Phase 2 body lists — exported so consumers (chart analysis, wheel, tests)
// can iterate without hard-coding names.
export const ASTEROIDS  = ['Ceres', 'Pallas', 'Juno', 'Vesta'];
export const URANIAN    = ['Cupido', 'Hades', 'Zeus', 'Kronos', 'Apollon', 'Admetos', 'Vulcanus', 'Poseidon'];
export const EXTRAS     = ['Chiron', 'NorthNode', ...ASTEROIDS];  // always-on extras

// Astrological amplitudes for the extras (per brief Phase 2).
export const EXTRA_AMPLITUDES = {
  Chiron: 0.35,      // wounded healer
  NorthNode: 0.3,    // true lunar node
  SouthNode: 0.3,    // mirror of NorthNode (displayed, not computed)
  Ceres: 0.15, Pallas: 0.15, Juno: 0.15, Vesta: 0.15,
  Cupido: 0.2, Hades: 0.2, Zeus: 0.2, Kronos: 0.2,
  Apollon: 0.2, Admetos: 0.2, Vulcanus: 0.2, Poseidon: 0.2,
};

// Swiss-backed longitude table for a given JD (UT). Caller MUST verify Swiss
// is ready AND JD is in range before invoking. Respects the active zodiac
// via _applySiderealFlag().
function longitudesSwiss(jd) {
  const swe = _swissInstance;
  const ids = _swissIds(swe);
  const flag = swe.SEFLG_SWIEPH | _applySiderealFlag();
  const out = {};
  for (const name of PLANETS) {
    const r = swe.calc_ut(jd, ids[name], flag);
    out[name] = norm360(r[0]);
  }
  return out;
}

// Standish+Meeus longitude table — the original implementation, now extracted
// so both backends can be exercised from tests.
function longitudesStandish(jd) {
  return {
    Sun:     sunGeoLongitudeDeg(jd),
    Moon:    moonGeoLongitudeDeg(jd),
    Mercury: planetGeoLongitudeDeg('Mercury', jd),
    Venus:   planetGeoLongitudeDeg('Venus', jd),
    Mars:    planetGeoLongitudeDeg('Mars', jd),
    Jupiter: planetGeoLongitudeDeg('Jupiter', jd),
    Saturn:  planetGeoLongitudeDeg('Saturn', jd),
    Uranus:  planetGeoLongitudeDeg('Uranus', jd),
    Neptune: planetGeoLongitudeDeg('Neptune', jd),
    Pluto:   planetGeoLongitudeDeg('Pluto', jd),
  };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

// Compute all 10 geocentric ecliptic longitudes (degrees) at a given Date.
// Routes to Swiss if ready and JD is in range; otherwise Standish+Meeus.
export function longitudesAtDate(date) {
  const jd = dateToJD(date);
  if (_swissReady && isInSwissRange(jd)) return longitudesSwiss(jd);
  return longitudesStandish(jd);
}

// Explicit Standish+Meeus access — used by tests that pin the fallback path.
export function longitudesAtDateStandish(date) {
  return longitudesStandish(dateToJD(date));
}

// -----------------------------------------------------------------------------
// Phase 2 — extra bodies (Chiron, Nodes, asteroids, Uranian).
//
// Swiss-only. Out-of-range / failed-Swiss states return null for every
// extra so callers can gracefully hide the feature instead of showing
// bogus numbers. The Standish+Meeus fallback has no orbital elements for
// these bodies.
// -----------------------------------------------------------------------------

// Compute a single extra body's longitude (degrees) at JD. Returns null if
// Swiss isn't available or the date is out of range.
export function extraLongitudeAtJD(bodyName, jd) {
  if (!_swissReady || !isInSwissRange(jd)) return null;
  const ids = _swissIds(_swissInstance);
  const id = ids[bodyName];
  if (id === undefined) return null;
  const flag = _swissInstance.SEFLG_SWIEPH | _applySiderealFlag();
  const r = _swissInstance.calc_ut(jd, id, flag);
  return r && r.length ? norm360(r[0]) : null;
}

// Extras for a given date. Returns null for each body if Swiss is unavailable.
// `options.includeUranian` gates the 8 Hamburg-school points (off by default
// per brief — exposed via Settings drawer in Phase 5).
export function extraLongitudesAtDate(date, options = {}) {
  const jd = dateToJD(date);
  const want = [...EXTRAS];
  if (options.includeUranian) want.push(...URANIAN);
  const out = {};
  for (const name of want) out[name] = extraLongitudeAtJD(name, jd);
  // South Node is always exactly 180° from North (brief: "display South Node
  // as its mirror, no separate computation"). Provide as convenience.
  if (out.NorthNode != null) out.SouthNode = norm360(out.NorthNode + 180);
  else out.SouthNode = null;
  return out;
}

// Retrograde-speed flag for an extra body. Uses SEFLG_SPEED and returns the
// speed in degrees/day (positive = direct, negative = retrograde). Nodes are
// treated as direct since the True Node is osculating and its motion is
// almost always retrograde — we still report the sign faithfully.
export function extraSpeedAtJD(bodyName, jd) {
  if (!_swissReady || !isInSwissRange(jd)) return null;
  const ids = _swissIds(_swissInstance);
  const id = ids[bodyName];
  if (id === undefined) return null;
  const flag = _swissInstance.SEFLG_SWIEPH | _swissInstance.SEFLG_SPEED | _applySiderealFlag();
  const r = _swissInstance.calc_ut(jd, id, flag);
  return r && r.length >= 4 ? r[3] : null;
}

// -----------------------------------------------------------------------------
// Phase 3 — houses (Swiss-backed, supports Placidus / Whole Sign / Koch /
// Equal). Sidereal-aware via the active zodiac flag. Falls through to
// `null` if Swiss isn't ready; natal.js' hand-rolled Placidus + Equal
// fallback takes over for that path.
//
// Return shape matches existing natal.js usage: { cusps[1..12] (deg),
// asc, mc } so downstream UI is agnostic to house system.
// -----------------------------------------------------------------------------

const HOUSE_CHAR = { placidus: 'P', 'whole-sign': 'W', koch: 'K', equal: 'E' };

export function computeHousesSwiss(jd, latDeg, lonDeg, system = 'placidus') {
  if (!_swissReady || !isInSwissRange(jd)) return null;
  const hsys = HOUSE_CHAR[system] || 'P';
  const swe = _swissInstance;
  const iflag = swe.SEFLG_SWIEPH | _applySiderealFlag();
  const { cusps, ascmc } = swe.houses_ex(jd, iflag, latDeg, lonDeg, hsys);
  // Swiss returns cusps[0] = unused, cusps[1..12] = house cusps in degrees.
  // Repackage to a 12-element array (cusps[0] = house 1) so it matches
  // natal.js' placidusCusps output.
  const out = new Array(12);
  for (let i = 0; i < 12; i++) out[i] = norm360(cusps[i + 1]);
  return {
    cusps: out,                 // 0-indexed, 12 entries
    asc:  norm360(ascmc[0]),    // ecliptic longitude (deg)
    mc:   norm360(ascmc[1]),
    armc: norm360(ascmc[2]),    // for downstream consumers
  };
}

// -----------------------------------------------------------------------------
// Phase 2 — fixed stars (Brady list).
//
// The prolaxu wrapper's `fixstar_ut` ships with a bug — it omits the `serr`
// char* parameter, so returned longitudes come back as 0. We call
// `swe_fixstar_ut` directly via ccall with the correct 5-parameter
// signature. Returns { lon, lat } or null if the name isn't found.
// -----------------------------------------------------------------------------

export function fixStarPositionAtJD(name, jd) {
  if (!_swissReady || !isInSwissRange(jd)) return null;
  const swe = _swissInstance;
  const mod = swe.SweModule;
  const xx = mod._malloc(6 * 8);
  const starBuf = mod._malloc(41);
  mod.stringToUTF8(name, starBuf, 41);
  const serr = mod._malloc(256);
  try {
    const ret = mod.ccall(
      'swe_fixstar_ut',
      'number',
      ['pointer', 'number', 'number', 'pointer', 'pointer'],
      [starBuf, jd, swe.SEFLG_SWIEPH, xx, serr],
    );
    if (ret < 0) return null;
    return {
      lon: norm360(mod.HEAPF64[(xx >> 3) + 0]),
      lat: mod.HEAPF64[(xx >> 3) + 1],
    };
  } finally {
    mod._free(xx); mod._free(starBuf); mod._free(serr);
  }
}

// Sample planetary longitudes (radians) across a time range.
// Returns { data: Float32Array(numTime * 10), years: Float64Array(numTime) }
// data layout: row-major [time, planet] so data[t*10 + i] = phi_i(t) in radians.
export function sampleLongitudes(startYear, endYear, numTime) {
  const years = new Float64Array(numTime);
  const data  = new Float32Array(numTime * PLANETS.length);
  for (let t = 0; t < numTime; t++) {
    const yr = startYear + (endYear - startYear) * (t / (numTime - 1));
    years[t] = yr;
    const d  = decimalYearToDate(yr);
    const L  = longitudesAtDate(d);
    for (let i = 0; i < PLANETS.length; i++) {
      data[t * PLANETS.length + i] = L[PLANETS[i]] * DEG;
    }
  }
  return { data, years };
}

// -----------------------------------------------------------------------------
// Equatorial coordinates + GMST for AstroCartography (Phase 3)
// -----------------------------------------------------------------------------

// Mean obliquity of the ecliptic (radians), Meeus 22.2.
export function obliquity(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const eps = 23.43929111
            - 0.01300416667 * T
            - 1.63888889e-7  * T * T
            + 5.03611111e-7  * T * T * T;
  return eps * DEG;
}

// Convert (ecliptic lon, lat, JD) → right ascension & declination (radians).
export function eclipticToEquatorial(lonDeg, latDeg, jd) {
  const eps = obliquity(jd);
  const l = lonDeg * DEG, b = latDeg * DEG;
  const sinDec = Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l);
  const dec = Math.asin(sinDec);
  const y = Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps);
  const x = Math.cos(l);
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += TWO_PI;
  return { ra, dec };
}

// Greenwich Mean Sidereal Time (radians) at JD_UT.
// Meeus 12.4.
export function gmst(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837
            + 360.98564736629 * (jd - 2451545.0)
            + 0.000387933 * T * T
            - T * T * T / 38710000;
  theta = norm360(theta);
  return theta * DEG;
}

// Equatorial position table for all 10 bodies at JD.
// Returns [{name, ra, dec}] with ra, dec in radians.
export function equatorialAtDate(date) {
  const jd = dateToJD(date);
  const L  = longitudesAtDate(date);
  return PLANETS.map(name => ({
    name,
    ...eclipticToEquatorial(L[name], 0, jd), // β=0 approximation
  }));
}

// Midheaven (MC) ecliptic longitude (radians, [0, 2π)) for a location with
// east-positive longitude `lonRad` at Julian date `jd`.
//
// Local sidereal time  LST = GMST + lon_east.
// The MC is the ecliptic point whose RA equals LST. With β=0 (on ecliptic):
//   tan(α) = cos(ε)·tan(λ)  ⇒  λ = atan2(sin(α), cos(α)·cos(ε))
// where α = LST and ε = obliquity.
export function mcLongitudeRad(lonRad, jd) {
  const lst = gmst(jd) + lonRad;
  const eps = obliquity(jd);
  let lambda = Math.atan2(Math.sin(lst), Math.cos(lst) * Math.cos(eps));
  if (lambda < 0) lambda += TWO_PI;
  return lambda;
}

// -----------------------------------------------------------------------------

// Zodiac sign utility.
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
               'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export function degreesToSign(deg) {
  const d = norm360(deg);
  const idx = Math.floor(d / 30);
  const within = d - idx * 30;
  return { sign: SIGNS[idx], degree: within };
}
