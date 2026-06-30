// Gematria — LLM-flavoured JSON export. Bakes a prompt asking for a
// resonance-grounded reading rather than personality fluff.

import { downloadLLMJson, downloadRawJson } from '../../shared/lib/downloadJSON.js';
import { computeForLang, calcTrinity, reduceNumber, getPrimaryMap } from '../compute/calculate.js';
import { findEquivalents, EQUIV_SYSTEM } from '../compute/equivalents.js';
import { fingerprint, lifePath, birthdayNum, personalYear, pinnacles, challenges } from '../compute/numberMeanings.js';
import { transliterate } from '../compute/transliterate.js';

const PROMPT = `You are a gematria scholar with deep knowledge of the four classical traditions: Hebrew Gematria (Mispar Hechrechi and its variants), Greek Isopsephy, Arabic Abjad (ʿilm al-ḥurūf), and Western Pythagorean numerology. The JSON file alongside this prompt contains a complete computation by the Ology desktop app.

Your task: write a grounded, specific reading of these numbers. Rules:

1. Use only the data in the file. Do not compute new values; do not invent equivalent words. The "resonances" array lists every kinship the app has found in its corpus — work from those.
2. Be concrete, not generic. Avoid horoscope-style filler. The whole point is to draw out what these specific values might mean.
3. Distinguish "this word equals X" (data) from "X traditionally signifies Y" (interpretation). Keep the seam visible.
4. Read across systems. The same word will have one value in Hebrew Standard, another in Atbash, another in Ordinal — each is a different lens. Comment on what aligns and what diverges.
5. Honour gezera shava — the principle that words sharing a value share a hidden kinship. The "resonances" list is your library here.
6. If a date is included (date_numerology), read the Life Path / Pinnacles / Challenges as a separate movement. Don't conflate it with the word reading.
7. If "user_focus" is set, weight your reading toward that area. If it's null, give a balanced reading.

Structure your response as:

- The word in number — the primary value (chart.primary), what it is in the chosen tradition's main system, and the reduced final number with its meaning.
- The trinity — Soul / Personality / Destiny, what each says.
- Across the systems — one sentence per non-trivial system, especially noting any matches or unusually high/low values.
- Resonances — what the kinship words in the corpus suggest about this name's hidden architecture.
- The final number's character — using the chart.fingerprint properties (prime, triangular, sacred constants…) and the meaning of the reduced number.
- (If a date is present) The pattern in time — Life Path, Birthday, Personal Year, Pinnacles, Challenges — what arc do they describe?
- A question — one open question this number-reading raises that the reader should sit with.

Begin. The data follows.`;

const SCHEMA = {
  word: 'the input word as the user typed it',
  processed: 'the word after pronunciation→script transliteration (if applicable); same as word for English/native input',
  language: 'english | hebrew | greek | arabic',
  primary_system: 'name of the system used as primary (e.g. "Mispar Hechrechi" for Hebrew)',
  primary: 'the primary numeric value',
  reduced: '{ final, steps[], isMaster } — the reduction ladder preserving 11/22/33',
  systems: 'array of { name, alt, value, desc, implies, reduced } — every gematria/isopsephy/abjad/numerology system',
  trinity: '{ soul, personality, destiny, vCount, cCount, vowels, consonants } — based on the primary numerology map for the language',
  resonances: 'array of { word, translit, gloss, value } — words sharing the primary value, drawn from a curated corpus (gezera shava)',
  fingerprint: 'array of { tag, note } — mathematical/mystical properties of the primary value (Prime, Triangular, sacred constants, etc.)',
  date_numerology: 'optional — present only if a date was supplied. { date, lifePath, birthday, personalYear, universalYear, pinnacles[], challenges[] }',
};

function buildChart(state) {
  const { input, lang, usePron, useYasVowel, birth } = state;
  const processed = (usePron && lang !== 'english') ? transliterate(input, lang) : input;
  const systems = computeForLang(processed, lang);
  const primary = systems.find(s => s.value > 0) || systems[0];
  const trinity = calcTrinity(processed, lang, getPrimaryMap(lang), useYasVowel);
  const reduced = reduceNumber(primary.value);
  const resonances = findEquivalents(lang, primary.value, processed);
  const fp = fingerprint(primary.value);

  const chart = {
    word: input,
    processed,
    language: lang,
    primary_system: primary.name,
    primary: primary.value,
    reduced: { final: reduced.final, steps: reduced.steps, is_master: reduced.isMaster },
    systems: systems.map(s => {
      const r = reduceNumber(s.value);
      return { ...s, reduced: { final: r.final, steps: r.steps, is_master: r.isMaster } };
    }),
    trinity: {
      soul: trinity.soul,
      personality: trinity.personality,
      destiny: trinity.destiny,
      v_count: trinity.vCount,
      c_count: trinity.cCount,
      vowels: trinity.vowels,
      consonants: trinity.consonants,
      soul_reduced: reduceNumber(trinity.soul).final,
      personality_reduced: reduceNumber(trinity.personality).final,
      destiny_reduced: reduceNumber(trinity.destiny).final,
    },
    resonances: resonances.map(r => ({ word: r.word, translit: r.translit, gloss: r.gloss, value: r.value })),
    fingerprint: fp,
    equiv_system: EQUIV_SYSTEM[lang],
  };

  // Optional date numerology if the birth has a date.
  if (birth && birth.year && birth.month && birth.day) {
    const lp = lifePath(birth.year, birth.month, birth.day);
    const bday = birthdayNum(birth.day);
    const calY = new Date().getFullYear();
    const pY = personalYear(birth.month, birth.day, calY);
    const pins = pinnacles(birth.year, birth.month, birth.day);
    const chs = challenges(birth.year, birth.month, birth.day);
    chart.date_numerology = {
      date: `${birth.year}-${String(birth.month).padStart(2,'0')}-${String(birth.day).padStart(2,'0')}`,
      life_path: lp,
      birthday: bday,
      personal_year: { year: calY, ...pY },
      universal_year: pY.final,
      pinnacles: pins,
      challenges: chs,
    };
  }

  return chart;
}

export function exportGematriaForLLM(state, userFocus = null) {
  const chart = buildChart(state);
  if (!chart.word.trim()) return;
  downloadLLMJson({
    name: chart.word || state.birth?.name || 'gematria',
    system: 'gematria',
    prompt: PROMPT,
    schema: SCHEMA,
    chart,
    birth: state.birth?.name ? {
      name: state.birth.name,
      iso_date: chart.date_numerology?.date || null,
    } : null,
    userFocus,
  });
}

export function exportGematriaRaw(state) {
  const chart = buildChart(state);
  if (!chart.word.trim()) return;
  downloadRawJson({
    name: chart.word || 'gematria',
    system: 'gematria',
    payload: { chart },
  });
}
