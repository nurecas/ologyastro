// Gematria — calculation engines for every supported script.
// computeHebrew/Greek/Arabic/English each return an array of system-level
// results: { name, alt, value, desc, implies }.

import {
  HEB_STD, HEB_GADOL, HEB_ORD, HEB_NAME, HEB_ATBASH, HEB_ALBAM, HEBREW,
  GRK_STD, GRK_ORD,
  ARB_STD,
  ENG_ORDINAL, ENG_REVERSE, ENG_REDUCTION, ENG_REV_REDUCTION, ENG_AGRIPPA, ENG_CHALDEAN,
  getVowelSet,
} from './maps.js';

export function sumByMap(text, map) {
  let s = 0;
  for (const ch of text) if (map[ch] != null) s += map[ch];
  return s;
}

export function reduceNumber(n, preserveMasters = true) {
  const steps = [n];
  let cur = Math.abs(n);
  while (cur > 9) {
    if (preserveMasters && (cur === 11 || cur === 22 || cur === 33)) break;
    cur = String(cur).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    steps.push(cur);
  }
  return { final: cur, steps, isMaster: [11, 22, 33].includes(cur) };
}

export function calcTrinity(text, lang, primaryMap, includeY) {
  const vowelSet = getVowelSet(lang, includeY);
  let soul = 0, personality = 0, destiny = 0;
  let vCount = 0, cCount = 0;
  const vowels = [], consonants = [];
  for (const raw of text) {
    const ch = (lang === 'english') ? raw.toUpperCase() : raw;
    const v = primaryMap[ch];
    if (v == null) continue;
    destiny += v;
    if (vowelSet.has(ch)) { soul += v; vCount++; vowels.push(raw); }
    else                  { personality += v; cCount++; consonants.push(raw); }
  }
  return { soul, personality, destiny, vCount, cCount, vowels, consonants };
}

function hebrewMilui(text) {
  let expanded = '';
  for (const ch of text) if (HEB_NAME[ch]) expanded += HEBREW.names[ch] || '';
  return sumByMap(expanded, HEB_STD);
}
function hebrewNeelam(text) {
  let total = 0;
  for (const ch of text) {
    if (HEBREW.names[ch]) total += sumByMap(HEBREW.names[ch].substring(1), HEB_STD);
  }
  return total;
}
function hebrewKolel(text) {
  const letters = Array.from(text).filter(c => HEB_STD[c] != null);
  return sumByMap(text, HEB_STD) + letters.length;
}
function hebrewKatanMispari(text) {
  return reduceNumber(sumByMap(text, HEB_STD), false).final;
}
function hebrewKatan(text) {
  let total = 0;
  for (const ch of text) {
    if (HEB_STD[ch] != null) total += reduceNumber(HEB_STD[ch], false).final;
  }
  return total;
}

export function computeHebrew(text) {
  const t = (text || '').replace(/[^\u0590-\u05FF]/g, '');
  return [
    { name: 'Mispar Hechrechi', alt: 'Standard / Absolute', value: sumByMap(t, HEB_STD),
      desc: 'Each letter by its absolute numerical value (א=1, ב=2 … ת=400). The default Gematria.',
      implies: 'The manifest, declared essence of the word — what it openly is.' },
    { name: 'Mispar Gadol', alt: 'Great / Sofit', value: sumByMap(t, HEB_GADOL),
      desc: 'Final-form letters (ך ם ן ף ץ) carry the higher values 500–900.',
      implies: 'The completed, sealed expression — the word with its endings honoured.' },
    { name: 'Mispar Siduri', alt: 'Ordinal', value: sumByMap(t, HEB_ORD),
      desc: 'Each letter by its position in the alphabet (1–22).',
      implies: 'The word’s structural place — its rank within the divine order.' },
    { name: 'Mispar Katan', alt: 'Small / Reduced', value: hebrewKatan(t),
      desc: 'Each letter reduced to a single digit (10→1, 20→2, 100→1) and then summed.',
      implies: 'The condensed essence — each letter sounded as its seed.' },
    { name: 'Mispar Katan Mispari', alt: 'Integral Reduced', value: hebrewKatanMispari(t),
      desc: 'The standard total reduced down to a single integral digit (1–9).',
      implies: 'The single integral pulse — the whole word as one beat.' },
    { name: 'Mispar Kolel', alt: 'Inclusive', value: hebrewKolel(t),
      desc: 'Standard value plus the number of letters (the Kolel — "the whole").',
      implies: 'The form plus its own count — the body and its parts together.' },
    { name: 'Mispar Shemi', alt: 'Full / Milui', value: hebrewMilui(t),
      desc: 'Each letter spelled out fully and summed (א becomes אלף, ב becomes בית …).',
      implies: 'What the word becomes when each letter speaks its own full name.' },
    { name: 'Mispar Ne\'elam', alt: 'Hidden', value: hebrewNeelam(t),
      desc: 'The full letter-name with the visible letter removed — only the "hidden" residue counted.',
      implies: 'What is concealed inside each letter — the secret behind the seen.' },
    { name: 'Atbash', alt: 'Reversed cipher', value: sumByMap(t, HEB_ATBASH),
      desc: 'Cipher swapping the alphabet head-to-tail (א↔ת, ב↔ש, ג↔ר …).',
      implies: 'The mirror reading — what the word becomes when reflected.' },
    { name: 'Albam', alt: 'Halved cipher', value: sumByMap(t, HEB_ALBAM),
      desc: 'Cipher halving the alphabet at 11 and swapping the two halves (א↔ל, ב↔מ …).',
      implies: 'The shifted reading — the meaning across the dividing line.' },
  ];
}

export function computeEnglish(text) {
  const t = (text || '').toUpperCase().replace(/[^A-Z]/g, '');
  return [
    { name: 'English Ordinal', alt: 'Simple', value: sumByMap(t, ENG_ORDINAL),
      desc: 'A = 1, B = 2 … Z = 26. The plainest English count.',
      implies: 'The surface, civic value — the word as written, plainly weighed.' },
    { name: 'Reverse Ordinal', alt: 'Simple Reverse', value: sumByMap(t, ENG_REVERSE),
      desc: 'A = 26, B = 25 … Z = 1. The alphabet read backwards.',
      implies: 'The shadow side — the word’s reflected lesson.' },
    { name: 'Full Reduction', alt: 'Pythagorean', value: sumByMap(t, ENG_REDUCTION),
      desc: 'A = 1, B = 2 … I = 9, J = 1 … repeating in cycles of nine.',
      implies: 'The core vibration — the soul-tone of the word distilled.' },
    { name: 'Reverse Reduction', alt: 'Reverse Pythagorean', value: sumByMap(t, ENG_REV_REDUCTION),
      desc: 'Reverse ordinal then reduced to 1–9.',
      implies: 'The shadow distilled — the word’s under-note.' },
    { name: 'Jewish / Agrippa', alt: 'English Qabbalah', value: sumByMap(t, ENG_AGRIPPA),
      desc: 'A–I = 1–9, J–R = 10–90, S–Z = 100–800. Mirrors the Hebrew structure.',
      implies: 'The magical correspondence — English mapped onto the Hebrew architecture.' },
    { name: 'Chaldean', alt: 'Mystic', value: sumByMap(t, ENG_CHALDEAN),
      desc: 'Ancient Babylonian system, by sound not by order. No letter is given the sacred 9.',
      implies: 'The cosmic pattern — the vibration of how the word is heard.' },
  ];
}

export function computeGreek(text) {
  const t = (text || '').replace(/[^\u0370-\u03FF\u1F00-\u1FFF]/g, '');
  return [
    { name: 'Isopsephy', alt: 'Arithmos', value: sumByMap(t, GRK_STD),
      desc: 'Standard Greek numerical values, including archaic ϛ (6), ϟ (90), ϡ (900).',
      implies: 'The classical equal-value reading — the Hellenic Gematria.' },
    { name: 'Greek Ordinal', alt: 'Positional', value: sumByMap(t, GRK_ORD),
      desc: 'Each letter by its position in the Greek alphabet.',
      implies: 'The structural position — the word’s rank in the Greek order.' },
  ];
}

export function computeArabic(text) {
  const t = (text || '').replace(/[^\u0600-\u06FF]/g, '');
  return [
    { name: 'Abjad Hawwaz', alt: 'Eastern (Mashriqi)', value: sumByMap(t, ARB_STD),
      desc: 'Traditional Arabic numeral-letter system. Order: أ ب ج د ه و ز ح ط ي ك ل م ن س ع ف ص ق ر ش ت ث خ ذ ض ظ غ.',
      implies: 'The classical Abjad reading — the science of letters (ʿilm al-ḥurūf).' },
  ];
}

export function computeForLang(text, lang) {
  if (lang === 'english') return computeEnglish(text);
  if (lang === 'hebrew')  return computeHebrew(text);
  if (lang === 'greek')   return computeGreek(text);
  return computeArabic(text);
}

export function getPrimaryMap(lang) {
  if (lang === 'english') return ENG_REDUCTION;
  if (lang === 'hebrew')  return HEB_STD;
  if (lang === 'greek')   return GRK_STD;
  return ARB_STD;
}

// Letter values across systems — used by the letter modal.
export function letterAllValues(letter, lang) {
  const out = [];
  if (lang === 'hebrew') {
    if (HEB_STD[letter] != null)    out.push(['Standard', HEB_STD[letter]]);
    if (HEB_GADOL[letter] != null && HEB_GADOL[letter] !== HEB_STD[letter]) out.push(['Gadol (sofit)', HEB_GADOL[letter]]);
    if (HEB_ORD[letter] != null)    out.push(['Ordinal', HEB_ORD[letter]]);
    if (HEB_ATBASH[letter] != null) out.push(['Atbash', HEB_ATBASH[letter]]);
    if (HEB_ALBAM[letter] != null)  out.push(['Albam', HEB_ALBAM[letter]]);
  } else if (lang === 'greek') {
    const lc = letter.toLowerCase();
    if (GRK_STD[lc] != null) out.push(['Isopsephy', GRK_STD[lc]]);
    if (GRK_ORD[lc] != null) out.push(['Ordinal', GRK_ORD[lc]]);
  } else if (lang === 'arabic') {
    if (ARB_STD[letter] != null) out.push(['Abjad', ARB_STD[letter]]);
  } else if (lang === 'english') {
    const up = letter.toUpperCase();
    if (ENG_ORDINAL[up] != null) {
      out.push(['Ordinal', ENG_ORDINAL[up]]);
      out.push(['Reverse', ENG_REVERSE[up]]);
      out.push(['Pythagorean', ENG_REDUCTION[up]]);
      out.push(['Agrippa', ENG_AGRIPPA[up]]);
      if (ENG_CHALDEAN[up] != null) out.push(['Chaldean', ENG_CHALDEAN[up]]);
    }
  }
  return out;
}

export function buildLetterBreakdown(text, lang) {
  const cells = [];
  for (const ch of text) {
    let value = null, name = '';
    if (lang === 'hebrew' && HEB_STD[ch] != null) {
      value = HEB_STD[ch]; name = HEB_NAME[ch];
    } else if (lang === 'greek' && GRK_STD[ch] != null) {
      value = GRK_STD[ch];
    } else if (lang === 'arabic' && ARB_STD[ch] != null) {
      value = ARB_STD[ch];
    } else if (lang === 'english') {
      const up = ch.toUpperCase();
      if (ENG_ORDINAL[up] != null) value = ENG_ORDINAL[up];
    }
    if (value != null) cells.push({ glyph: ch, name, value });
  }
  return cells;
}
