// Latin → Hebrew / Greek / Arabic transliteration. Digraphs first.
// Ported from the standalone Gematria.html.

const HEBREW_TRANSLIT = [
  ['sh','ש'],['ch','ח'],['kh','כ'],['ts','צ'],['tz','צ'],
  ['th','ת'],['ph','פ'],
  ['ai','אי'],['ei','אי'],['oo','ו'],['ou','ו'],['ee','י'],
  ['a','א'],['b','ב'],['c','כ'],['d','ד'],['e','ע'],['f','פ'],
  ['g','ג'],['h','ה'],['i','י'],['j','י'],['k','ק'],['l','ל'],
  ['m','מ'],['n','נ'],['o','ע'],['p','פ'],['q','ק'],['r','ר'],
  ['s','ס'],['t','ט'],['u','ו'],['v','ו'],['w','ו'],['x','כס'],
  ['y','י'],['z','ז'],
];

const GREEK_TRANSLIT = [
  ['ch','χ'],['ph','φ'],['ps','ψ'],['th','θ'],['ks','ξ'],['rh','ρ'],
  ['ou','ου'],['ei','ει'],['ai','αι'],['oi','οι'],['eu','ευ'],['au','αυ'],
  ['a','α'],['b','β'],['c','κ'],['d','δ'],['e','ε'],['f','φ'],
  ['g','γ'],['h','η'],['i','ι'],['j','ι'],['k','κ'],['l','λ'],
  ['m','μ'],['n','ν'],['o','ο'],['p','π'],['q','κ'],['r','ρ'],
  ['s','σ'],['t','τ'],['u','υ'],['v','β'],['w','ω'],['x','ξ'],
  ['y','υ'],['z','ζ'],
];

const ARABIC_TRANSLIT = [
  ['sh','ش'],['th','ث'],['kh','خ'],['dh','ذ'],['gh','غ'],['ch','ش'],
  ['aa','ا'],['ee','ي'],['oo','و'],
  ['a','ا'],['b','ب'],['c','ك'],['d','د'],['e','ا'],['f','ف'],
  ['g','ج'],['h','ه'],['i','ي'],['j','ج'],['k','ك'],['l','ل'],
  ['m','م'],['n','ن'],['o','و'],['p','ب'],['q','ق'],['r','ر'],
  ['s','س'],['t','ت'],['u','و'],['v','ف'],['w','و'],['x','كس'],
  ['y','ي'],['z','ز'],
];

const MAPS = { hebrew: HEBREW_TRANSLIT, greek: GREEK_TRANSLIT, arabic: ARABIC_TRANSLIT };

export function transliterate(text, lang) {
  const map = MAPS[lang];
  if (!map) return text;
  const t = (text || '').toLowerCase();
  let out = '';
  let i = 0;
  while (i < t.length) {
    let matched = false;
    for (const [latin, target] of map) {
      if (latin.length > 1 && t.substr(i, latin.length) === latin) {
        out += target; i += latin.length; matched = true; break;
      }
    }
    if (matched) continue;
    for (const [latin, target] of map) {
      if (latin.length === 1 && t[i] === latin) {
        out += target; i++; matched = true; break;
      }
    }
    if (!matched) {
      if (/[\s\-']/.test(t[i])) out += t[i];
      i++;
    }
  }
  return out;
}
