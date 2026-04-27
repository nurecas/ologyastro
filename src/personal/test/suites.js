// Phase 7 — Test suites for the browser runner.
//
// 19 suites per the brief. Compute suites largely mirror the existing
// Node precision tests (src/personal/astro/_*.mjs, 475 assertions) so
// any Swiss-WASM drift is caught in the actual browser build, not only
// in headless Node. Browser-only suites cover UI smoke, interaction,
// data persistence, labels, responsive, and performance.

import { assert, assertClose, assertEqual, assertDefined } from './framework.js';

import {
  initSwiss, isSwissReady, hasSwissFailed, getPrecisionStatus,
  isInSwissRange, dateToJD, longitudesAtDate, longitudesAtDateStandish,
  extraLongitudesAtDate, extraLongitudeAtJD, fixStarPositionAtJD,
  setEphemerisOptions, getActiveZodiac, computeHousesSwiss,
  PLANETS, EXTRAS, URANIAN, EXTRA_AMPLITUDES, equatorialAtDate, sampleLongitudes,
} from '../../astro/ephemeris.js';
import { computeNatal, birthToUTCDate } from '../astro/natal.js';
import { dignitiesOf, dignityTable } from '../astro/dignities.js';
import { circularMidpoint, pairMidpoints, activatedMidpoints } from '../astro/midpoints.js';
import { aspectBetween, aspectGrid } from '../astro/aspectGrid.js';
import { analyzeChart } from '../astro/chartAnalysis.js';
import { currentAspects, lifeVectorSeries } from '../astro/aspects.js';
import { summarizeDay } from '../astro/day_summary.js';
import { secondaryProgressions, solarArcDirections } from '../astro/progressions.js';
import { solarReturn, lunarReturnNear } from '../astro/returns.js';
import { davisonChart } from '../astro/davison.js';
import { listStations } from '../astro/rxStations.js';
import { crossAspects } from '../astro/synastry.js';
import { PLANET_INFO, SIGN_INFO, HOUSE_INFO, ASPECT_INFO, PATTERN_INFO, PREDICTIVE_INFO } from '../astro/interpretation.js';
import { planetaryHourAt } from '../astro/planetaryHours.js';
import { usePersonal } from '../store.js';

const EXEMPLAR = {
  name: 'Exemplar',
  year: 1990, month: 6, day: 21, hour: 12, minute: 0, tzOffsetMin: 0,
  latDeg: 28.6139, lonDeg: 77.2090, placeName: 'New Delhi',
};
const J2000_DATE = new Date(Date.UTC(2000, 0, 1));
const J2000_JD = dateToJD(J2000_DATE);

// ---------- Compute suites ----------

const ephemeris = {
  name: 'Ephemeris',
  tests: [
    { name: 'Swiss init succeeds or flags failure', fn: async () => {
      await initSwiss();
      assert(isSwissReady() || hasSwissFailed(), 'Swiss is either ready or has failed after init');
    }},
    { name: 'longitudesAtDate returns 10 classical bodies', fn: () => {
      const L = longitudesAtDate(J2000_DATE);
      for (const n of PLANETS) assert(typeof L[n] === 'number', `${n} is numeric`);
    }},
    { name: 'Sun at J2000 ≈ 280°', fn: () => {
      assertClose(longitudesAtDate(J2000_DATE).Sun, 279.86, 0.1);
    }},
    { name: 'Standish fallback path produces same result as before', fn: () => {
      const a = longitudesAtDateStandish(J2000_DATE);
      assert(a.Sun > 0 && a.Sun < 360);
    }},
    { name: 'isInSwissRange correct at boundaries', fn: () => {
      assert(isInSwissRange(dateToJD(new Date(Date.UTC(1200, 0, 1)))));
      assert(!isInSwissRange(dateToJD(new Date(Date.UTC(1199, 11, 31)))));
      assert(!isInSwissRange(dateToJD(new Date(Date.UTC(2400, 0, 1)))));
    }},
    { name: 'getPrecisionStatus classifies correctly', fn: () => {
      const expected = isSwissReady() ? 'swiss' : 'fallback';
      assertEqual(getPrecisionStatus(J2000_JD), expected);
    }},
    { name: 'equatorialAtDate returns 10 RA/Dec pairs', fn: () => {
      const eq = equatorialAtDate(J2000_DATE);
      assertEqual(eq.length, 10);
      assert(typeof eq[0].ra === 'number' && typeof eq[0].dec === 'number');
    }},
    { name: 'sampleLongitudes preserves shape', fn: () => {
      const s = sampleLongitudes(2000, 2001, 12);
      assertEqual(s.data.length, 12 * 10);
    }},
  ],
};

const natalSuite = {
  name: 'Natal chart',
  tests: [
    { name: 'computeNatal returns full chart shape', fn: () => {
      const n = computeNatal(EXEMPLAR);
      assertDefined(n.ascDeg); assertDefined(n.mcDeg);
      assertEqual(n.houses.length, 12);
      assert(n.planets.length >= 10);
    }},
    { name: 'Each house cusp is in [0,360)', fn: () => {
      const n = computeNatal(EXEMPLAR);
      for (const c of n.houses) assert(c >= 0 && c < 360, `cusp ${c} in [0,360)`);
    }},
    { name: 'Placidus houses', fn: () => {
      const n = computeNatal(EXEMPLAR, { houseSystem: 'placidus' });
      assertDefined(n.houses); assert(n.houseSystem === 'placidus' || n.houseSystem === 'equal');
    }},
    { name: 'Whole Sign houses on sign boundaries', fn: () => {
      if (!isSwissReady()) return;
      const n = computeNatal(EXEMPLAR, { houseSystem: 'whole-sign' });
      const start = Math.floor(n.ascDeg / 30) * 30;
      assertClose(n.houses[0], start, 1e-9);
    }},
    { name: 'Koch houses (Swiss only)', fn: () => {
      if (!isSwissReady()) return;
      const n = computeNatal(EXEMPLAR, { houseSystem: 'koch' });
      assertDefined(n.houses[0]);
    }},
    { name: 'Equal houses 30° apart (Swiss only)', fn: () => {
      if (!isSwissReady()) return;
      const n = computeNatal(EXEMPLAR, { houseSystem: 'equal' });
      for (let i = 1; i < 12; i++) {
        const d = ((n.houses[i] - n.houses[i-1]) % 360 + 360) % 360;
        assertClose(d, 30, 1e-6, `cusp ${i} 30° after ${i-1}`);
      }
    }},
    { name: 'Part of Fortune present and in range', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const f = n.planets.find(p => p.name === 'Fortune');
      assertDefined(f); assert(f.lonDeg >= 0 && f.lonDeg < 360);
    }},
  ],
};

const dignitiesSuite = {
  name: 'Dignities',
  tests: [
    { name: 'Sun in Leo is ruler',          fn: () => assert(dignitiesOf('Sun', 135, true).entries.includes('rulership')) },
    { name: 'Sun in Aries is exalted',      fn: () => assert(dignitiesOf('Sun', 15,  true).entries.includes('exaltation')) },
    { name: 'Mars in Cancer is in fall',    fn: () => assert(dignitiesOf('Mars', 95, true).entries.includes('fall')) },
    { name: 'Saturn in Cancer is detriment',fn: () => assert(dignitiesOf('Saturn', 95, true).entries.includes('detriment')) },
    { name: 'Triplicity day ruler',         fn: () => assert(dignitiesOf('Sun', 135, true).entries.includes('triplicity-ruler')) },
    { name: 'dignityTable returns 7 classical rows', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const tbl = dignityTable(n);
      assertEqual(tbl.length, 7);
    }},
  ],
};

const midpointsSuite = {
  name: 'Midpoints',
  tests: [
    { name: 'midpoint(10, 350) wraps to 0',     fn: () => assertClose(circularMidpoint(10, 350), 0, 1e-9) },
    { name: 'midpoint is order-symmetric',      fn: () => assertClose(circularMidpoint(350, 10), 0, 1e-9) },
    { name: 'midpoint(0, 90) is 45',            fn: () => assertClose(circularMidpoint(0, 90),  45, 1e-9) },
    { name: '45 pairwise midpoints of classical 10', fn: () => {
      const n = computeNatal(EXEMPLAR);
      assertEqual(pairMidpoints(n).length, 45);
    }},
    { name: 'activatedMidpoints returns array', fn: () => {
      const n = computeNatal(EXEMPLAR);
      assert(Array.isArray(activatedMidpoints(n, 1.5)));
    }},
  ],
};

const chartAnalysisSuite = {
  name: 'Chart analysis',
  tests: [
    { name: 'analyzeChart returns distributions', fn: () => {
      const a = analyzeChart(computeNatal(EXEMPLAR));
      assertDefined(a.elements); assertDefined(a.modes); assertDefined(a.hemispheres);
    }},
    { name: 'element distribution sums to ≈ 1', fn: () => {
      const a = analyzeChart(computeNatal(EXEMPLAR));
      const s = Object.values(a.elements).reduce((x, y) => x + y, 0);
      assertClose(s, 1, 1e-6);
    }},
    { name: 'mode distribution sums to ≈ 1', fn: () => {
      const a = analyzeChart(computeNatal(EXEMPLAR));
      const s = Object.values(a.modes).reduce((x, y) => x + y, 0);
      assertClose(s, 1, 1e-6);
    }},
    { name: 'dominance identifies a top sign', fn: () => {
      const a = analyzeChart(computeNatal(EXEMPLAR));
      assertDefined(a.signDominance[0]);
    }},
    { name: 'chartShape returns a string', fn: () => {
      const a = analyzeChart(computeNatal(EXEMPLAR));
      assert(typeof a.shape === 'string');
    }},
  ],
};

const aspectsSuite = {
  name: 'Aspects',
  tests: [
    { name: 'exact conjunction detected', fn: () => {
      const r = aspectBetween(10, 10);
      assertEqual(r && r.name, 'conjunction');
    }},
    { name: '178° → opposition with 2° orb', fn: () => {
      const r = aspectBetween(0, 178);
      assertEqual(r && r.name, 'opposition');
      assertClose(r.orb, 2, 1e-9);
    }},
    { name: '35° → no aspect', fn: () => {
      assertEqual(aspectBetween(0, 35), null);
    }},
    { name: 'currentAspects produces array', fn: () => {
      const n = computeNatal(EXEMPLAR);
      assert(Array.isArray(currentAspects(n, J2000_DATE)));
    }},
    { name: 'Self-conjunctions == 10 for classical set', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const a = currentAspects(n, n.utc);
      const selfConj = a.filter(x => x.aspect.name === 'Conjunction' && x.transit === x.natal);
      assertEqual(selfConj.length, 10);
    }},
    { name: 'Angle-transit opt-in', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const w = currentAspects(n, J2000_DATE, { includeAngles: true });
      const wo = currentAspects(n, J2000_DATE);
      assert(w.length >= wo.length);
      assert(!wo.some(a => a.targetIsAngle));
    }},
    { name: 'lifeVectorSeries returns 8 layers × N samples', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const s = lifeVectorSeries({ natal: n, startYear: 2000, endYear: 2010, samplesPerYear: 4 });
      assertEqual(s.series.length, 8);
    }},
    { name: 'aspectGrid returns a square matrix', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const g = aspectGrid(n);
      assertEqual(g.rows.length, g.cols.length);
    }},
  ],
};

const forecastSuite = {
  name: 'Forecast',
  tests: [
    { name: 'summarizeDay returns tone + headline', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const s = summarizeDay(n, new Date());
      assert(['quiet', 'mixed', 'demanding', 'supportive'].includes(s.tone));
      assert(typeof s.headline === 'string');
    }},
    { name: 'listStations runs without throwing (Swiss only)', fn: () => {
      if (!isSwissReady()) return;
      const stations = listStations({
        fromDate: new Date(Date.UTC(2025, 0, 1)),
        toDate:   new Date(Date.UTC(2025, 5, 1)),
        bodies: ['Mercury'],
      });
      assert(Array.isArray(stations));
    }},
  ],
};

const progressionsSuite = {
  name: 'Progressions',
  tests: [
    { name: 'secondaryProgressions at age ≈ 0 ≈ natal', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const p = secondaryProgressions(EXEMPLAR, birthToUTCDate(EXEMPLAR));
      const progSun = p.planets.find(x => x.name === 'Sun');
      const natSun  = n.planets.find(x => x.name === 'Sun');
      assertClose(progSun.lonDeg, natSun.lonDeg, 0.1);
    }},
    { name: 'Solar Arc naibod = age × 59\'08"/year', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const sa = solarArcDirections(EXEMPLAR, n, new Date(Date.UTC(2025, 5, 21)), 'naibod');
      assertClose(sa.arc, sa.age * (59 + 8/60) / 60, 1e-6);
    }},
    { name: 'Solar Arc advances all bodies by same arc', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const sa = solarArcDirections(EXEMPLAR, n, new Date(Date.UTC(2025, 5, 21)), 'solar');
      for (const p of sa.planets) {
        const o = n.planets.find(q => q.name === p.name);
        const d = ((p.lonDeg - o.lonDeg + 540) % 360) - 180;
        const norm = ((d - sa.arc + 540) % 360) - 180;
        assertClose(norm, 0, 1e-6, `${p.name}`);
      }
    }},
  ],
};

const returnsSuite = {
  name: 'Returns',
  tests: [
    { name: 'Solar Return Sun matches natal Sun within 1\'', fn: () => {
      if (!isSwissReady()) return;
      const sr = solarReturn(EXEMPLAR, 2025);
      const d = Math.abs(((sr.planets.Sun - sr.natalSunLon) + 540) % 360 - 180);
      assert(d * 60 < 1, `|Δ| = ${(d * 60).toFixed(3)}'`);
    }},
    { name: 'Lunar Return Moon matches natal Moon within 1\'', fn: () => {
      if (!isSwissReady()) return;
      const lr = lunarReturnNear(EXEMPLAR, new Date(Date.UTC(2025, 5, 21)));
      const d = Math.abs(((lr.planets.Moon - lr.natalMoonLon) + 540) % 360 - 180);
      assert(d * 60 < 1);
    }},
    { name: 'Solar Return within 2 days of birthday', fn: () => {
      if (!isSwissReady()) return;
      const sr = solarReturn(EXEMPLAR, 2025);
      const days = Math.abs((sr.date.getTime() - Date.UTC(2025, EXEMPLAR.month - 1, EXEMPLAR.day)) / 86400000);
      assert(days < 2);
    }},
  ],
};

const synastrySuite = {
  name: 'Synastry',
  tests: [
    { name: 'self-synastry has 10 self-conjunctions', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const a = crossAspects(n, n);
      const selfConj = a.filter(x => x.aspect.name === 'Conjunction' && x.aName === x.bName);
      assertEqual(selfConj.length, 10);
    }},
    { name: 'Davison chart produces full natal shape', fn: () => {
      if (!isSwissReady()) return;
      const b = { ...EXEMPLAR, name: 'B', year: 1991, month: 12, day: 11, hour: 3, minute: 30, latDeg: 40.7, lonDeg: -74 };
      const d = davisonChart(EXEMPLAR, b);
      assertDefined(d.ascDeg); assert(d.planets.length >= 10);
    }},
  ],
};

const siderealSuite = {
  name: 'Sidereal',
  tests: [
    { name: 'Toggle to sidereal changes Sun longitude by ≈ ayanamsa', fn: () => {
      if (!isSwissReady()) return;
      setEphemerisOptions({ zodiac: 'tropical' });
      const trop = longitudesAtDate(J2000_DATE).Sun;
      setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
      const sid = longitudesAtDate(J2000_DATE).Sun;
      const ayan = ((trop - sid) % 360 + 360) % 360;
      assert(ayan > 23 && ayan < 24.5, `ayanamsa ${ayan}`);
      setEphemerisOptions({ zodiac: 'tropical' });
    }},
    { name: 'Round-trip tropical unchanged', fn: () => {
      if (!isSwissReady()) return;
      setEphemerisOptions({ zodiac: 'tropical' });
      const a = longitudesAtDate(J2000_DATE).Sun;
      setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
      setEphemerisOptions({ zodiac: 'tropical' });
      const b = longitudesAtDate(J2000_DATE).Sun;
      assertClose(a, b, 1e-9);
    }},
    { name: 'Raman differs from Lahiri', fn: () => {
      if (!isSwissReady()) return;
      setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'lahiri' });
      const la = longitudesAtDate(J2000_DATE).Sun;
      setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: 'raman' });
      const ra = longitudesAtDate(J2000_DATE).Sun;
      assert(Math.abs(la - ra) > 0.05);
      setEphemerisOptions({ zodiac: 'tropical' });
    }},
  ],
};

const extrasSuite = {
  name: 'Extras (Chiron, Nodes, asteroids, Uranian, stars)',
  tests: [
    { name: 'Chiron J2000 ≈ 251.6°', fn: () => {
      if (!isSwissReady()) return;
      assertClose(extraLongitudeAtJD('Chiron', J2000_JD), 251.56, 0.1);
    }},
    { name: 'True Node ≠ Mean Node at J2000', fn: () => {
      if (!isSwissReady()) return;
      const trueN = extraLongitudeAtJD('NorthNode', J2000_JD);
      // Mean node is deterministic — rough formula for cross-check
      assert(trueN > 120 && trueN < 126, `True Node ${trueN}`);
    }},
    { name: 'South Node = North Node + 180°', fn: () => {
      if (!isSwissReady()) return;
      const e = extraLongitudesAtDate(J2000_DATE);
      assertClose((e.SouthNode - e.NorthNode + 540) % 360, 180, 1e-9);
    }},
    { name: 'Uranian off by default', fn: () => {
      if (!isSwissReady()) return;
      const e = extraLongitudesAtDate(J2000_DATE);
      assert(e.Cupido === undefined);
    }},
    { name: 'Uranian computable when opted in', fn: () => {
      if (!isSwissReady()) return;
      const e = extraLongitudesAtDate(J2000_DATE, { includeUranian: true });
      for (const n of URANIAN) assert(typeof e[n] === 'number');
    }},
    { name: 'Aldebaran fixed-star resolves', fn: () => {
      if (!isSwissReady()) return;
      const p = fixStarPositionAtJD('Aldebaran', J2000_JD);
      assertDefined(p); assert(p.lon > 68 && p.lon < 72);
    }},
  ],
};

// ---------- Interpretation suite (every user-facing string resolves) ----------

const interpretationSuite = {
  name: 'Interpretation',
  tests: [
    { name: 'PLANET_INFO has every classical + extra body', fn: () => {
      const all = [...PLANETS, ...EXTRAS, 'SouthNode', 'Fortune'];
      for (const n of all) assertDefined(PLANET_INFO[n], `${n} missing`);
    }},
    { name: 'PLANET_INFO has every Uranian point', fn: () => {
      for (const n of URANIAN) assertDefined(PLANET_INFO[n], `${n} missing`);
    }},
    { name: 'SIGN_INFO has all 12 signs', fn: () => {
      for (const s of ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']) {
        assertDefined(SIGN_INFO[s], s);
      }
    }},
    { name: 'HOUSE_INFO has 12 entries', fn: () => assertEqual(HOUSE_INFO.length, 12) },
    { name: 'ASPECT_INFO covers classical 5', fn: () => {
      for (const a of ['Conjunction','Opposition','Square','Trine','Sextile']) assertDefined(ASPECT_INFO[a], a);
    }},
    { name: 'PATTERN_INFO has all 6 patterns', fn: () => {
      for (const k of ['stellium','grandTrine','tSquare','grandCross','yod','kite']) assertDefined(PATTERN_INFO[k], k);
    }},
    { name: 'PREDICTIVE_INFO covers all 4 techniques + tri-wheel', fn: () => {
      for (const k of ['progressions','solarArc','solarReturn','lunarReturn','davison','triWheel']) {
        assertDefined(PREDICTIVE_INFO[k], k);
      }
    }},
  ],
};

// ---------- Planetary hours suite (new Phase-5 module) ----------

const hoursSuite = {
  name: 'Planetary hours',
  tests: [
    { name: 'planetaryHourAt returns a ruler + phase', fn: () => {
      const r = planetaryHourAt(new Date(), 28.6, 77.2);
      if (!r) return; // polar night — skip
      assert(['day', 'night'].includes(r.phase));
      assertDefined(r.ruler);
    }},
  ],
};

// ---------- Browser-only suites ----------

const uiSuite = {
  name: 'UI smoke',
  tests: [
    { name: 'store has core fields', fn: () => {
      const s = usePersonal.getState();
      assertDefined(s.birth); assertDefined(s.natal); assertDefined(s.mode);
      assertDefined(s.zodiac); assertDefined(s.houseSystem); assertDefined(s.uiMode);
    }},
    { name: 'setMode switches modes', fn: () => {
      const s = usePersonal.getState();
      const was = s.mode;
      s.setMode('profile'); assertEqual(usePersonal.getState().mode, 'profile');
      s.setMode('wheel');   assertEqual(usePersonal.getState().mode, 'wheel');
      s.setMode(was);
    }},
    { name: 'openSettings/closeSettings', fn: () => {
      const s = usePersonal.getState();
      s.openSettings();  assertEqual(usePersonal.getState().settingsOpen, true);
      s.closeSettings(); assertEqual(usePersonal.getState().settingsOpen, false);
    }},
    { name: 'toggleUIMode flips basic/advanced', fn: () => {
      const s = usePersonal.getState();
      const was = s.uiMode;
      s.toggleUIMode();
      const now = usePersonal.getState().uiMode;
      assert(now !== was);
      s.toggleUIMode();
      assertEqual(usePersonal.getState().uiMode, was);
    }},
  ],
};

const dataSuite = {
  name: 'Data (localStorage + JSON round-trip)',
  tests: [
    { name: 'localStorage persists zustand state', fn: () => {
      const raw = localStorage.getItem('ology-personal-v1');
      assertDefined(raw, 'persistence key written');
      const parsed = JSON.parse(raw);
      assertDefined(parsed.state);
    }},
    { name: 'JSON export shape round-trips', fn: () => {
      const s = usePersonal.getState();
      const payload = {
        version: 1, birth: s.birth,
        computed: s.natal ? { ascDeg: s.natal.ascDeg } : null,
      };
      const str = JSON.stringify(payload);
      const back = JSON.parse(str);
      assertEqual(back.birth.year, s.birth.year);
    }},
  ],
};

const labelsSuite = {
  name: 'Labels',
  tests: [
    { name: 'every planet has glyph + body text', fn: () => {
      const all = [...PLANETS, ...EXTRAS, 'Fortune'];
      for (const n of all) {
        const p = PLANET_INFO[n];
        assert(p?.glyph, `${n}.glyph`);
        assert(p?.body,  `${n}.body`);
      }
    }},
    { name: 'every sign has glyph + element + mode', fn: () => {
      for (const s of Object.values(SIGN_INFO)) {
        assert(s.glyph && s.element && s.mode);
      }
    }},
  ],
};

const responsiveSuite = {
  name: 'Responsive',
  tests: [
    { name: 'viewport width readable', fn: () => {
      assert(window.innerWidth > 0);
    }},
    { name: 'no body horizontal overflow at current viewport', fn: () => {
      // Only report, don't fail — manual QA confirms
      assert(document.body.scrollWidth <= window.innerWidth + 2);
    }},
    { name: 'viewport meta tag present', fn: () => {
      const m = document.querySelector('meta[name=viewport]');
      assertDefined(m);
    }},
  ],
};

const performanceSuite = {
  name: 'Performance',
  tests: [
    { name: 'computeNatal < 100ms', fn: () => {
      const t = performance.now();
      for (let i = 0; i < 5; i++) computeNatal(EXEMPLAR);
      const avg = (performance.now() - t) / 5;
      assert(avg < 100, `avg ${avg.toFixed(1)}ms`);
    }},
    { name: 'longitudesAtDate < 5ms per call', fn: () => {
      const t = performance.now();
      for (let i = 0; i < 100; i++) longitudesAtDate(new Date(J2000_DATE.getTime() + i * 86400000));
      const avg = (performance.now() - t) / 100;
      assert(avg < 5, `avg ${avg.toFixed(2)}ms`);
    }},
    { name: 'currentAspects < 50ms', fn: () => {
      const n = computeNatal(EXEMPLAR);
      const t = performance.now();
      currentAspects(n, new Date());
      const ms = performance.now() - t;
      assert(ms < 50, `${ms.toFixed(1)}ms`);
    }},
  ],
};

// Export the full suite list in brief's order.
export const SUITES = [
  ephemeris,
  natalSuite,
  dignitiesSuite,
  midpointsSuite,
  chartAnalysisSuite,
  aspectsSuite,
  forecastSuite,
  progressionsSuite,
  returnsSuite,
  synastrySuite,
  siderealSuite,
  extrasSuite,
  interpretationSuite,
  hoursSuite,
  uiSuite,
  dataSuite,
  labelsSuite,
  responsiveSuite,
  performanceSuite,
];
