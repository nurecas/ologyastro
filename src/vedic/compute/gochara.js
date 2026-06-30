// Vedic Gochara — transits read against the natal chart.
//
// Classical gochara reads each transiting graha (Sun..Saturn + Rahu/Ketu)
// from BOTH the natal Moon (Chandra Lagna — the dominant frame) and the
// natal Lagna (Lagna gochara — secondary). For each planet, certain houses
// from the reference are read as favourable, mixed, or challenging:
//
//   Sun        favourable in 3, 6, 10, 11
//   Moon       favourable in 1, 3, 6, 7, 10, 11
//   Mars       favourable in 3, 6, 11
//   Mercury    favourable in 2, 4, 6, 8, 10, 11
//   Jupiter    favourable in 2, 5, 7, 9, 11
//   Venus      favourable in 1, 2, 3, 4, 5, 8, 9, 11, 12
//   Saturn     favourable in 3, 6, 11
//   Rahu/Ketu  favourable in 3, 6, 10, 11 (reading them as malefic shadow
//              grahas like Saturn/Mars)
//
// The remaining houses are read as challenging, with two classical
// exceptions: Saturn in the 8th from Moon = Ashtama Shani, and Saturn in
// the 12/1/2 from Moon = Sade Sati — these are flagged with their own
// labels so the UI can highlight them. Saturn in 4 from Moon = Ardha-
// Ashtama Shani, also called out.
//
// Source: BPHS Ch. 41 (Gochara Phaladhyaya); Phaladeepika Ch. 26;
// Saravali. Different schools differ in details but the favourable-house
// list above is the consensus core.

import {
  longitudesAtDate, extraLongitudeAtJD, dateToJD, isSwissReady,
  setEphemerisOptions, isInSwissRange,
} from '../../astro/ephemeris.js';
import { RASHIS } from './data.js';

const FAVOURABLE = {
  Sun:     new Set([3, 6, 10, 11]),
  Moon:    new Set([1, 3, 6, 7, 10, 11]),
  Mars:    new Set([3, 6, 11]),
  Mercury: new Set([2, 4, 6, 8, 10, 11]),
  Jupiter: new Set([2, 5, 7, 9, 11]),
  Venus:   new Set([1, 2, 3, 4, 5, 8, 9, 11, 12]),
  Saturn:  new Set([3, 6, 11]),
  Rahu:    new Set([3, 6, 10, 11]),
  Ketu:    new Set([3, 6, 10, 11]),
};

function norm360(x) { let y = x % 360; if (y < 0) y += 360; return y; }
function signOf(lon) { return Math.floor(norm360(lon) / 30); }
function houseFrom(refSign, transitSign) {
  return ((transitSign - refSign + 12) % 12) + 1;
}

// Tag a Saturn transit with the classical Saturn-from-Moon hazard label
// when applicable. Returns one of: 'sade_sati_phase1' | 'sade_sati_peak' |
// 'sade_sati_phase3' | 'ashtama_shani' | 'ardha_ashtama' | null.
function saturnFromMoonTag(houseFromMoon) {
  if (houseFromMoon === 12) return 'sade_sati_phase1';
  if (houseFromMoon === 1)  return 'sade_sati_peak';
  if (houseFromMoon === 2)  return 'sade_sati_phase3';
  if (houseFromMoon === 8)  return 'ashtama_shani';
  if (houseFromMoon === 4)  return 'ardha_ashtama';
  return null;
}

// One transit row's flavour. `tag` is the Saturn-specific override when
// present — Sade Sati / Ashtama overrides the simple favourable lookup
// even though the bare house may otherwise be favourable.
function flavourOf(planet, houseFromMoon, houseFromLagna, saturnTag) {
  if (planet === 'Saturn' && saturnTag) {
    if (saturnTag === 'sade_sati_peak')   return 'challenging';
    if (saturnTag === 'sade_sati_phase1') return 'challenging';
    if (saturnTag === 'sade_sati_phase3') return 'challenging';
    if (saturnTag === 'ashtama_shani')    return 'challenging';
    if (saturnTag === 'ardha_ashtama')    return 'challenging';
  }
  const favSet = FAVOURABLE[planet] || new Set();
  const okMoon  = favSet.has(houseFromMoon);
  const okLagna = favSet.has(houseFromLagna);
  if (okMoon && okLagna) return 'favourable';
  if (okMoon || okLagna) return 'mixed';
  return 'challenging';
}

// Public: compute current transits at `now` (or any probed date) read
// against the natal chart's Moon and Lagna.
//
// Returns:
//   {
//     asOf: Date,
//     transits: [
//       { name, lonDeg, signIdx, signName,
//         houseFromMoon, houseFromLagna,
//         flavour: 'favourable' | 'mixed' | 'challenging',
//         saturnTag?: 'sade_sati_*' | 'ashtama_shani' | 'ardha_ashtama' }
//     ],
//     refMoonSignIdx, refLagnaSignIdx,
//   }
//
// `chart` must already exist with a Moon planet and a lagnaSignIdx.
// If Swiss is not ready, returns null — gochara depends on the same
// sidereal ephemeris as the natal chart.
export function computeGochara(chart, options = {}) {
  if (!chart) return null;
  const moon = chart.planets.find(p => p.name === 'Moon');
  if (!moon) return null;
  if (!isSwissReady()) return null;

  const ayanamsa = chart.ayanamsa || 'lahiri';
  // Sidereal mode is set globally by computeVedicChart at chart-compute
  // time and by vedic/main.jsx at boot. setEphemerisOptions is now
  // change-gated, so calling it here is safe but redundant — and a
  // redundant call before the recursion fix triggered Swiss WASM crashes
  // via the chart-store listener. Keep the call so Gochara still works
  // if invoked from a context that left a different mode active.
  setEphemerisOptions({ zodiac: 'sidereal', ayanamsa });

  const now = options.now || new Date();
  const jd  = dateToJD(now);
  if (!Number.isFinite(jd) || !isInSwissRange(jd)) return null;
  const lons = longitudesAtDate(now);
  const rahuLon = extraLongitudeAtJD('NorthNode', jd);

  const planets = [
    { name: 'Sun',     lonDeg: lons.Sun     },
    { name: 'Moon',    lonDeg: lons.Moon    },
    { name: 'Mars',    lonDeg: lons.Mars    },
    { name: 'Mercury', lonDeg: lons.Mercury },
    { name: 'Jupiter', lonDeg: lons.Jupiter },
    { name: 'Venus',   lonDeg: lons.Venus   },
    { name: 'Saturn',  lonDeg: lons.Saturn  },
  ];
  if (rahuLon != null) {
    planets.push({ name: 'Rahu', lonDeg: rahuLon });
    planets.push({ name: 'Ketu', lonDeg: norm360(rahuLon + 180) });
  }

  const refMoon  = moon.signIdx;
  const refLagna = chart.lagnaSignIdx;

  const transits = planets.map(p => {
    const tSign = signOf(p.lonDeg);
    const hMoon  = houseFrom(refMoon,  tSign);
    const hLagna = houseFrom(refLagna, tSign);
    const saturnTag = (p.name === 'Saturn') ? saturnFromMoonTag(hMoon) : null;
    return {
      name: p.name,
      lonDeg: p.lonDeg,
      signIdx: tSign,
      signName: RASHIS[tSign].en,
      signGlyph: RASHIS[tSign].glyph,
      houseFromMoon: hMoon,
      houseFromLagna: hLagna,
      flavour: flavourOf(p.name, hMoon, hLagna, saturnTag),
      saturnTag,
    };
  });

  return {
    asOf: now,
    transits,
    refMoonSignIdx:  refMoon,
    refMoonSignName: RASHIS[refMoon].en,
    refLagnaSignIdx: refLagna,
    refLagnaSignName: RASHIS[refLagna].en,
  };
}
