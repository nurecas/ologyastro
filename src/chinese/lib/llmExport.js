// Chinese BaZi — LLM-flavoured JSON export. Prompt asks the AI to honour
// the BaZi frame: read by Day Master, Ten Gods, element balance, and
// Luck Pillar overlay.

import { downloadLLMJson, downloadRawJson } from '../../shared/lib/downloadJSON.js';
import { tenGodOfStem } from '../compute/tenGods.js';
import { HIDDEN_STEMS, STEM_BY_HANZI } from '../compute/data.js';

const PROMPT = `You are a grounded BaZi (Four Pillars) reader. The JSON file alongside this prompt contains a complete BaZi chart computed by the Ology desktop app — solar terms via Swiss Ephemeris, sub-arcsecond precise.

Your task: write a specific, evidence-cited reading. Rules:

1. Use only the data in the file. Never invent pillars, gods, or dates.
2. Cite your evidence. Name the activation that supports each claim — e.g. "Day stem 丁 (Yin Fire), Day branch 酉 (Yin Metal Rooster)".
3. Honour the BaZi frame. Centre the reading on the Day Master (the day's stem). Ten Gods are RELATIONSHIPS to the Day Master; element balance is read AGAINST the Day Master's element + season.
4. Distinguish data from interpretation. "The chart shows X" vs "this typically signifies Y" — keep that seam visible.
5. Don't predict events with certainty. Frame Luck Pillars as "this decade favours X / asks for Y", not "X will happen on Y".
6. Honour element flow. Wood produces Fire produces Earth produces Metal produces Water (生); Wood controls Earth controls Water controls Fire controls Metal controls Wood (剋). Use these to explain why a particular Ten God shows up.

Structure your response as:

- Day Master at a glance — chart.day_master gives the stem hanzi + element + polarity. Read the archetype briefly (chart.archetype.note).
- The Four Pillars — name each pillar's stem-over-branch + element + ten god (or hidden stems' gods). chart.pillars.year/month/day/hour.
- Day Master strength — chart.strength gives a coarse rating (strong/balanced/weak). Discuss what's strengthening (Self/Resource gods) vs what's draining (Output/Wealth/Officer).
- Element distribution — chart.elements.{Wood,Fire,Earth,Metal,Water} shows weighted counts including hidden stems. Identify the dominant element + the missing/weak one — this often points to the Yong Shen (favourable element).
- Ten Gods balance — chart.distribution counts every Ten God. Comment on which gods appear most (the chart's "voice") and which are absent.
- Luck Pillars — chart.luck.pillars are 10-year decadal cycles. Walk through the user's age range and discuss the texture of each pillar's stem-god overlay on the Day Master. Direction: chart.luck.direction.
- Hour pillar caveat — if birth.time_known is false, the Hour pillar (and the day-stem-derived hour stem) is not reliable. Skip its discussion.
- One question — name a single open question this chart raises that the reader could sit with.

If user_focus is set, weight the response toward that area.

Begin. The data follows.`;

const SCHEMA = {
  birth: 'name, ISO local datetime, tz_offset_minutes, lat_deg, lon_deg, place_name, time_known, gender.',
  chart: {
    day_master: '{ hanzi, pinyin, element, yang, label } — the day stem',
    archetype:  '{ name, note } — Day Master archetype text',
    pillars: {
      year:  '{ stem, branch, ganzhiIdx, solarYear }',
      month: '{ stem, branch, monthOffset, jie: {name, hanzi, sunLon, date} }',
      day:   '{ stem, branch, ganzhiIdx, jdn }',
      hour:  '{ stem, branch }',
    },
    ten_gods_per_pillar: 'For each pillar, the stem god + hidden-stem gods.',
    distribution: 'Counts of each Ten God across the chart.',
    strength: '{ rating, supports, drains, ratio } — coarse Day Master strength rating',
    elements: '{ Wood, Fire, Earth, Metal, Water } — weighted element distribution',
    luck: '{ direction, startingAge, pillars[] } — decadal sequence',
    lichun: '{ date, solarYear } — the Lichun crossing that sets the year pillar',
  },
};

function pad(n) { return String(n).padStart(2, '0'); }

function buildBirth(birth, timeUnknown, gender) {
  if (!birth) return null;
  const iso = `${birth.year}-${pad(birth.month)}-${pad(birth.day)}T${pad(birth.hour)}:${pad(birth.minute)}:00`;
  return {
    name: birth.name, iso_local: iso, tz_offset_minutes: birth.tzOffsetMin,
    lat_deg: birth.latDeg, lon_deg: birth.lonDeg, place_name: birth.placeName,
    time_known: !timeUnknown, gender,
  };
}

function pillarPayload(p, dm, isDM = false) {
  if (!p) return null;
  const stemGod = isDM ? null : tenGodOfStem(p.stem, dm);
  const hidden = (HIDDEN_STEMS[p.branch.hanzi] || []).map(h => {
    const stem = STEM_BY_HANZI[h];
    if (!stem) return null;
    const god = tenGodOfStem(stem, dm);
    return { stem: stem.hanzi, element: stem.element, polarity: stem.yang ? 'yang' : 'yin', god: god?.id, god_english: god?.english };
  }).filter(Boolean);
  return {
    stem: { hanzi: p.stem.hanzi, pinyin: p.stem.pinyin, element: p.stem.element, polarity: p.stem.yang ? 'yang' : 'yin', label: p.stem.label },
    branch: { hanzi: p.branch.hanzi, pinyin: p.branch.pinyin, element: p.branch.element, animal: p.branch.animal, season: p.branch.season },
    ganzhi: `${p.stem.hanzi}${p.branch.hanzi}`,
    stem_god: stemGod ? { id: stemGod.id, english: stemGod.english, hanzi: stemGod.hanzi } : null,
    hidden_stems: hidden,
  };
}

function buildChart(state) {
  const c = state.chart;
  if (!c) return null;
  const dm = c.dayMaster;
  return {
    day_master: { hanzi: dm.hanzi, pinyin: dm.pinyin, element: dm.element, polarity: dm.yang ? 'yang' : 'yin', label: dm.label },
    archetype: c.archetype,
    pillars: {
      year:  pillarPayload(c.pillars.year, dm),
      month: pillarPayload(c.pillars.month, dm),
      day:   pillarPayload(c.pillars.day, dm, true),
      hour:  pillarPayload(c.pillars.hour, dm),
    },
    distribution: c.distribution,
    strength: c.strength,
    elements: c.elements,
    luck: {
      direction: c.luck.direction,
      starting_age: c.luck.startingAge,
      pillars: c.luck.pillars.map(lp => ({
        ganzhi: `${lp.stem.hanzi}${lp.branch.hanzi}`,
        stem: lp.stem.hanzi, branch: lp.branch.hanzi,
        stem_element: lp.stem.element, branch_element: lp.branch.element,
        animal: lp.branch.animal,
        start_age: lp.startAge, end_age: lp.endAge,
        start_year: lp.startDate.getUTCFullYear(),
        end_year: lp.endDate.getUTCFullYear(),
        stem_god: tenGodOfStem(lp.stem, dm)?.id,
      })),
    },
    lichun: {
      date: c.pillars.lichun.date.toISOString(),
      solar_year: c.pillars.lichun.solarYear,
    },
    month_jie: {
      name: c.pillars.month.jie.name, hanzi: c.pillars.month.jie.hanzi,
      sun_lon: c.pillars.month.jie.sunLon,
      date: c.pillars.month.jie.date.toISOString(),
    },
  };
}

export function exportBaziForLLM(state, userFocus = null) {
  const chart = buildChart(state);
  if (!chart) return;
  downloadLLMJson({
    name: state.birth?.name || 'bazi',
    system: 'chinese',
    prompt: PROMPT,
    schema: SCHEMA,
    chart,
    birth: buildBirth(state.birth, state.timeUnknown, state.gender),
    userFocus,
  });
}

export function exportBaziRaw(state) {
  const chart = buildChart(state);
  if (!chart) return;
  downloadRawJson({
    name: state.birth?.name || 'bazi',
    system: 'chinese',
    payload: { birth: buildBirth(state.birth, state.timeUnknown, state.gender), chart },
  });
}
