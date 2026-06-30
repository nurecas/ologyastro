// Western — LLM-flavoured JSON export.
// Assembles every meaningful number the user sees on screen, plus the active
// settings and a forecast window, and bakes a system-aware prompt the user
// can drop into any LLM for a grounded reading.

import { downloadLLMJson, downloadRawJson } from '../../shared/lib/downloadJSON.js';
import { analyzeChart } from '../astro/chartAnalysis.js';
import { currentAspects } from '../astro/aspects.js';
import { forecastEvents } from '../astro/forecast.js';
import { dignityTable } from '../astro/dignities.js';
import { activatedMidpoints } from '../astro/midpoints.js';
import { aspectGrid } from '../astro/aspectGrid.js';
import { fmtLon } from '../astro/natal.js';
import { getPrecisionStatus } from '../../astro/ephemeris.js';

const PROMPT = `You are an experienced Western astrologer with deep familiarity in the Hellenistic, traditional, and modern psychological lineages (Robert Hand, Liz Greene, Chris Brennan, William Lilly). The JSON file alongside this prompt contains a complete natal chart computed by the Ology desktop app — every position is sub-arcsecond Swiss Ephemeris accurate.

Your task: write a grounded, specific reading of this chart. Rules:

1. Use only the data in the file. Never invent positions, aspects, or transits. If the user asks about something not in the file, say so.
2. Cite your evidence. When you make a claim, name the placement that supports it (e.g. "Mars in Capricorn in the 6th, square Saturn at orb 1.4°"). The reader should be able to verify against the data.
3. Be concrete, not generic. Avoid "you are unique and special" filler — the whole point of working from the data is to say things that couldn't be said about anyone else.
4. Distinguish data from interpretation. "The chart shows X" is data; "this often manifests as Y" is interpretation — keep the seam visible so the reader can disagree.
5. Honour both supportive and challenging placements. Astrology is a frame for self-knowing, including hard parts.
6. Do not predict events with certainty. Astrology describes the timing of themes, not outcomes. Frame transits as "this period favours X / asks for Y", not "X will happen on date Z".
7. If birth.time_known is false, do not interpret Ascendant, Midheaven, or houses — say so once and read the rest.

Structure your response as:

- The chart at a glance — Sun / Moon / Rising, dominant element + mode, chart shape, and one sentence on the overall signature.
- Three anchors deeper — half a page each on the Sun, Moon, and Rising sign placements, with houses and tightest aspects.
- The standout patterns — any stelliums, grand trines, T-squares, oppositions, kites, yods or grand crosses present, with what they're asking for.
- What's loud right now — the top five active transits and the next major outer-planet hits within twelve months.
- A question for the reader — one open question this chart raises that the reader should sit with.

If the user has provided a user_focus field, weight your response toward that area without ignoring the rest. If user_focus is null, give a balanced reading.

Begin. The data follows.`;

const SCHEMA = {
  birth: 'name, ISO local datetime, tz_offset_minutes east-of-UTC, lat_deg, lon_deg, place_name, time_known.',
  settings: 'zodiac (tropical|sidereal), ayanamsa (when sidereal), house_system, ui_mode.',
  angles: 'asc, mc, dsc, ic — ecliptic longitudes in degrees.',
  houses: '12-element array of cusp longitudes (degrees), index 0 = house 1.',
  planets: 'array of {name, lon_deg, sign, sign_glyph, within_sign_deg, house, amplitude, classical (true=traditional 10), is_calculated_point}. Names include Sun..Pluto, Chiron, NorthNode, SouthNode, Ceres, Pallas, Juno, Vesta, Fortune.',
  analysis: 'sun_sign, moon_sign, rising_sign, elements (fire/earth/air/water 0–1), modes (cardinal/fixed/mutable), hemispheres (east/west/north/south), shape (Splash|Bundle|Bowl|Locomotive|Seesaw|Bucket|Splay|Splay), patterns (stelliums/grandTrines/tSquares/grandCrosses/yods/kites), dominant_planets/signs/houses (top 3).',
  aspects_now: 'transit→natal aspects within orb on the as_of date — {transit, natal, aspect, orb_deg, exact, retrograde_or_speed}.',
  forecast: 'next 12 months of slow-planet (Jupiter+) exact aspects to natal — {date, transit, natal, aspect, retrograde}.',
  dignities: 'classical Ptolemaic essential dignities per traditional planet — score, entries (rulership/exaltation/triplicity/terms/face/detriment/fall).',
  midpoints: 'Ebertin 90° dial — pair-midpoints activated within 1.5° by another natal point.',
  aspect_grid: 'N×N grid of natal-natal aspects (classical 10 + ASC + MC). cells[i][j] is null or {name, glyph, orb}.',
  precision: 'one of "swiss", "out-of-range", "fallback", or "loading".',
};

function planetPayload(p) {
  const { sign, signGlyph, withinSignDeg } = parseLon(p.lonDeg);
  return {
    name: p.name,
    lon_deg: round(p.lonDeg, 4),
    sign,
    sign_glyph: signGlyph,
    within_sign_deg: round(withinSignDeg, 3),
    house: p.house,
    amplitude: p.amplitude,
    classical: p.classical !== false,
    is_calculated_point: !!p.calculatedPoint,
    formatted: fmtLon(p.lonDeg),
  };
}

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
function parseLon(d) {
  const n = ((d % 360) + 360) % 360;
  const idx = Math.floor(n / 30);
  return { sign: SIGNS[idx], signGlyph: SIGN_GLYPHS[idx], withinSignDeg: n - idx * 30 };
}
function round(x, n) {
  const k = Math.pow(10, n);
  return Math.round(x * k) / k;
}

function buildChart(state) {
  const { natal, birth, zodiac, ayanamsa, houseSystem, uiMode } = state;
  if (!natal) return null;
  const now = new Date();
  const aspects = currentAspects(natal, now, { includeAngles: true });
  const future = forecastEvents({
    natal,
    fromDate: now,
    toDate: new Date(now.getTime() + 365 * 86400000),
  });
  const analysis = analyzeChart(natal);
  const dignities = dignityTable(natal);
  const midpoints = activatedMidpoints(natal, 1.5);
  const grid = aspectGrid(natal);
  const precision = getPrecisionStatus(natal.jd);

  return {
    as_of: now.toISOString(),
    settings: {
      zodiac,
      ayanamsa: zodiac === 'sidereal' ? ayanamsa : null,
      house_system: houseSystem,
      ui_mode: uiMode,
    },
    angles: {
      asc: round(natal.ascDeg, 4),
      mc:  round(natal.mcDeg, 4),
      dsc: round(natal.dscDeg, 4),
      ic:  round(natal.icDeg, 4),
      asc_formatted: fmtLon(natal.ascDeg),
      mc_formatted:  fmtLon(natal.mcDeg),
    },
    houses: natal.houses.map(h => round(h, 4)),
    planets: natal.planets.map(planetPayload),
    is_day_chart: natal.isDay,
    analysis: {
      sun_sign:    analysis.sunSign,
      moon_sign:   analysis.moonSign,
      rising_sign: analysis.risingSign,
      elements:    analysis.elements,
      modes:       analysis.modes,
      hemispheres: analysis.hemispheres,
      shape:       analysis.shape,
      patterns:    analysis.patterns,
      dominant_planets: analysis.dominantPlanets,
      dominant_signs:   analysis.dominantSigns,
      dominant_houses:  analysis.dominantHouses,
    },
    aspects_now: aspects.slice(0, 30).map(a => ({
      transit: a.transit,
      natal: a.natal,
      aspect: a.aspect.name,
      glyph: a.aspect.glyph,
      orb_deg: round(a.orb, 3),
      exact: a.exact,
      target_is_angle: !!a.targetIsAngle,
    })),
    forecast: future.slice(0, 60).map(e => ({
      date: e.date.toISOString().slice(0, 10),
      transit: e.transit,
      natal: e.natal,
      aspect: e.aspect.name,
      glyph: e.aspect.glyph,
      retrograde: e.retrograde,
      band: e.band.label,
    })),
    dignities: dignities.map(d => ({
      planet: d.planet,
      sign: d.sign,
      within_deg: round(d.within, 2),
      entries: d.entries,
      score: d.score,
    })),
    midpoints: midpoints.slice(0, 20).map(m => ({
      pair: m.pair,
      lon_deg: round(m.lonDeg, 3),
      activator: m.activator,
      orb_deg: round(m.orb, 3),
    })),
    aspect_grid: grid,
    precision,
  };
}

function buildBirth(birth, timeUnknown) {
  if (!birth) return null;
  const iso = `${birth.year}-${String(birth.month).padStart(2,'0')}-${String(birth.day).padStart(2,'0')}T${String(birth.hour).padStart(2,'0')}:${String(birth.minute).padStart(2,'0')}:00`;
  return {
    name: birth.name,
    iso_local: iso,
    tz_offset_minutes: birth.tzOffsetMin,
    lat_deg: birth.latDeg,
    lon_deg: birth.lonDeg,
    place_name: birth.placeName,
    time_known: !timeUnknown,
  };
}

export function exportWesternForLLM(state, userFocus = null) {
  const chart = buildChart(state);
  if (!chart) return;
  downloadLLMJson({
    name: state.birth?.name || 'chart',
    system: 'western',
    prompt: PROMPT,
    schema: SCHEMA,
    chart,
    birth: buildBirth(state.birth, state.timeUnknown),
    userFocus,
  });
}

export function exportWesternRaw(state) {
  const chart = buildChart(state);
  if (!chart) return;
  downloadRawJson({
    name: state.birth?.name || 'chart',
    system: 'western',
    payload: {
      birth: buildBirth(state.birth, state.timeUnknown),
      chart,
    },
  });
}
