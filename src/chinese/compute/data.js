// Chinese BaZi — reference data: Heavenly Stems, Earthly Branches,
// elements, animals, sexagenary cycle, Ten Gods.
//
// All data tables here are structural — they describe the canonical
// astronomy and arithmetic of the system, not creative interpretation.
// Hexagram-style names (Jiǎ/Yǐ/Bǐng…) are the standard Chinese terms used
// in every BaZi reference.

// 10 Heavenly Stems (天干). Each is one of 5 elements × yin/yang.
// `idx` is the 0-based index in the cycle 甲(0) ... 癸(9).
export const STEMS = [
  { idx: 0, hanzi: '甲', pinyin: 'Jiǎ',   element: 'Wood',  yang: true,  label: 'Yang Wood'  },
  { idx: 1, hanzi: '乙', pinyin: 'Yǐ',    element: 'Wood',  yang: false, label: 'Yin Wood'   },
  { idx: 2, hanzi: '丙', pinyin: 'Bǐng',  element: 'Fire',  yang: true,  label: 'Yang Fire'  },
  { idx: 3, hanzi: '丁', pinyin: 'Dīng',  element: 'Fire',  yang: false, label: 'Yin Fire'   },
  { idx: 4, hanzi: '戊', pinyin: 'Wù',    element: 'Earth', yang: true,  label: 'Yang Earth' },
  { idx: 5, hanzi: '己', pinyin: 'Jǐ',    element: 'Earth', yang: false, label: 'Yin Earth'  },
  { idx: 6, hanzi: '庚', pinyin: 'Gēng',  element: 'Metal', yang: true,  label: 'Yang Metal' },
  { idx: 7, hanzi: '辛', pinyin: 'Xīn',   element: 'Metal', yang: false, label: 'Yin Metal'  },
  { idx: 8, hanzi: '壬', pinyin: 'Rén',   element: 'Water', yang: true,  label: 'Yang Water' },
  { idx: 9, hanzi: '癸', pinyin: 'Guǐ',   element: 'Water', yang: false, label: 'Yin Water'  },
];

// 12 Earthly Branches (地支). Each maps to an element, yin/yang, animal,
// and a fixed (sun longitude) span in the solar-term system. The branch's
// "main" element is the dominant one; some branches have additional
// "hidden" stems contributing minor element flavours (see HIDDEN_STEMS).
//
// `season`: spring/summer/autumn/winter — useful for some readings.
// `sunLonStart`: tropical Sun longitude at the beginning of the branch's
// month (the start of the corresponding 节 jié solar-term).
//
// Branch 0 = 子 (Zi, Rat). Solar-term system month 1 = 寅 (Tiger), starting
// at Lichun (Sun lon 315°). So the branches in solar-term-month order are:
// 寅(2) 卯(3) 辰(4) 巳(5) 午(6) 未(7) 申(8) 酉(9) 戌(10) 亥(11) 子(0) 丑(1).
export const BRANCHES = [
  { idx:  0, hanzi: '子', pinyin: 'Zǐ',    element: 'Water', yang: true,  animal: 'Rat',     season: 'winter', sunLonStart: 255 },  // Daxue
  { idx:  1, hanzi: '丑', pinyin: 'Chǒu',  element: 'Earth', yang: false, animal: 'Ox',      season: 'winter', sunLonStart: 285 },  // Xiaohan
  { idx:  2, hanzi: '寅', pinyin: 'Yín',   element: 'Wood',  yang: true,  animal: 'Tiger',   season: 'spring', sunLonStart: 315 },  // Lichun
  { idx:  3, hanzi: '卯', pinyin: 'Mǎo',   element: 'Wood',  yang: false, animal: 'Rabbit',  season: 'spring', sunLonStart: 345 },  // Jingzhe
  { idx:  4, hanzi: '辰', pinyin: 'Chén',  element: 'Earth', yang: true,  animal: 'Dragon',  season: 'spring', sunLonStart:  15 },  // Qingming
  { idx:  5, hanzi: '巳', pinyin: 'Sì',    element: 'Fire',  yang: false, animal: 'Snake',   season: 'summer', sunLonStart:  45 },  // Lixia
  { idx:  6, hanzi: '午', pinyin: 'Wǔ',    element: 'Fire',  yang: true,  animal: 'Horse',   season: 'summer', sunLonStart:  75 },  // Mangzhong
  { idx:  7, hanzi: '未', pinyin: 'Wèi',   element: 'Earth', yang: false, animal: 'Goat',    season: 'summer', sunLonStart: 105 },  // Xiaoshu
  { idx:  8, hanzi: '申', pinyin: 'Shēn',  element: 'Metal', yang: true,  animal: 'Monkey',  season: 'autumn', sunLonStart: 135 },  // Liqiu
  { idx:  9, hanzi: '酉', pinyin: 'Yǒu',   element: 'Metal', yang: false, animal: 'Rooster', season: 'autumn', sunLonStart: 165 },  // Bailu
  { idx: 10, hanzi: '戌', pinyin: 'Xū',    element: 'Earth', yang: true,  animal: 'Dog',     season: 'autumn', sunLonStart: 195 },  // Hanlu
  { idx: 11, hanzi: '亥', pinyin: 'Hài',   element: 'Water', yang: false, animal: 'Pig',     season: 'winter', sunLonStart: 225 },  // Lidong
];

// Element colour palette (used by the Pillars UI). Classical:
// Water → black/navy, Wood → green/jade, Fire → red/crimson,
// Earth → yellow/gold, Metal → white/silver.
export const ELEMENT_COLOR = {
  Water: { bg: '#1e2a4d', fg: '#a8c5ff', accent: '#5b7fc7' },
  Wood:  { bg: '#1d3826', fg: '#9adfa8', accent: '#5fa672' },
  Fire:  { bg: '#3d1818', fg: '#ff9a9a', accent: '#d8595c' },
  Earth: { bg: '#3d3318', fg: '#f5d680', accent: '#b8993f' },
  Metal: { bg: '#2a2a2a', fg: '#d8d8d8', accent: '#9b9bbd' },
};

// Five Element generation cycle (生): Wood → Fire → Earth → Metal → Water → Wood.
export const PRODUCES = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};
// Five Element control cycle (剋): Wood → Earth → Water → Fire → Metal → Wood.
export const CONTROLS = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
};

// ---------------------------------------------------------------------------
// Hidden Stems (人元 rényuán) — every Branch contains 1-3 stems that
// contribute their elements as background influences. The "main" hidden
// stem (列 first in each list) shares the branch's primary element; the
// others bring secondary flavours used in advanced BaZi reading.
// Source: classical 子平真詮 (Ziping Zhenquan) hidden-stem table.
// ---------------------------------------------------------------------------
export const HIDDEN_STEMS = {
  '子': ['癸'],                       // Water
  '丑': ['己', '癸', '辛'],            // Earth + Water + Metal
  '寅': ['甲', '丙', '戊'],            // Wood + Fire + Earth
  '卯': ['乙'],                       // Wood
  '辰': ['戊', '乙', '癸'],            // Earth + Wood + Water
  '巳': ['丙', '戊', '庚'],            // Fire + Earth + Metal
  '午': ['丁', '己'],                  // Fire + Earth
  '未': ['己', '丁', '乙'],            // Earth + Fire + Wood
  '申': ['庚', '壬', '戊'],            // Metal + Water + Earth
  '酉': ['辛'],                       // Metal
  '戌': ['戊', '辛', '丁'],            // Earth + Metal + Fire
  '亥': ['壬', '甲'],                  // Water + Wood
};

// ---------------------------------------------------------------------------
// 24 solar-terms (节气). Even-numbered (节, jié) are MONTH BOUNDARIES; odd
// (气, qì) are MID-MONTH points used for some traditions. Each term is the
// moment when the Sun reaches a specific tropical longitude. Lichun (315°)
// is the most important: it's the Year Pillar boundary.
// ---------------------------------------------------------------------------
export const SOLAR_TERMS = [
  // Month boundaries (节 jié) — used for Year + Month pillars
  { idx: 0,  name: 'Lichun',     hanzi: '立春', sunLon: 315, isJie: true,  starts: '寅', meaning: 'Beginning of spring' },
  { idx: 2,  name: 'Jingzhe',    hanzi: '惊蛰', sunLon: 345, isJie: true,  starts: '卯', meaning: 'Awakening of insects' },
  { idx: 4,  name: 'Qingming',   hanzi: '清明', sunLon: 15,  isJie: true,  starts: '辰', meaning: 'Pure brightness' },
  { idx: 6,  name: 'Lixia',      hanzi: '立夏', sunLon: 45,  isJie: true,  starts: '巳', meaning: 'Beginning of summer' },
  { idx: 8,  name: 'Mangzhong',  hanzi: '芒种', sunLon: 75,  isJie: true,  starts: '午', meaning: 'Grain in ear' },
  { idx: 10, name: 'Xiaoshu',    hanzi: '小暑', sunLon: 105, isJie: true,  starts: '未', meaning: 'Slight heat' },
  { idx: 12, name: 'Liqiu',      hanzi: '立秋', sunLon: 135, isJie: true,  starts: '申', meaning: 'Beginning of autumn' },
  { idx: 14, name: 'Bailu',      hanzi: '白露', sunLon: 165, isJie: true,  starts: '酉', meaning: 'White dew' },
  { idx: 16, name: 'Hanlu',      hanzi: '寒露', sunLon: 195, isJie: true,  starts: '戌', meaning: 'Cold dew' },
  { idx: 18, name: 'Lidong',     hanzi: '立冬', sunLon: 225, isJie: true,  starts: '亥', meaning: 'Beginning of winter' },
  { idx: 20, name: 'Daxue',      hanzi: '大雪', sunLon: 255, isJie: true,  starts: '子', meaning: 'Major snow' },
  { idx: 22, name: 'Xiaohan',    hanzi: '小寒', sunLon: 285, isJie: true,  starts: '丑', meaning: 'Slight cold' },
  // Mid-month markers (中气, qì) — kept for completeness and for the
  // calendar-month integer naming, not used by the pillar logic.
  { idx: 1,  name: 'Yushui',     hanzi: '雨水', sunLon: 330, isJie: false, meaning: 'Rain water' },
  { idx: 3,  name: 'Chunfen',    hanzi: '春分', sunLon:   0, isJie: false, meaning: 'Spring equinox' },
  { idx: 5,  name: 'Guyu',       hanzi: '谷雨', sunLon:  30, isJie: false, meaning: 'Grain rain' },
  { idx: 7,  name: 'Xiaoman',    hanzi: '小满', sunLon:  60, isJie: false, meaning: 'Grain full' },
  { idx: 9,  name: 'Xiazhi',     hanzi: '夏至', sunLon:  90, isJie: false, meaning: 'Summer solstice' },
  { idx: 11, name: 'Dashu',      hanzi: '大暑', sunLon: 120, isJie: false, meaning: 'Major heat' },
  { idx: 13, name: 'Chushu',     hanzi: '处暑', sunLon: 150, isJie: false, meaning: 'End of heat' },
  { idx: 15, name: 'Qiufen',     hanzi: '秋分', sunLon: 180, isJie: false, meaning: 'Autumn equinox' },
  { idx: 17, name: 'Shuangjiang',hanzi: '霜降', sunLon: 210, isJie: false, meaning: 'Frost descent' },
  { idx: 19, name: 'Xiaoxue',    hanzi: '小雪', sunLon: 240, isJie: false, meaning: 'Slight snow' },
  { idx: 21, name: 'Dongzhi',    hanzi: '冬至', sunLon: 270, isJie: false, meaning: 'Winter solstice' },
  { idx: 23, name: 'Dahan',      hanzi: '大寒', sunLon: 300, isJie: false, meaning: 'Major cold' },
];

// Fast lookup: 12 month-boundary jiés (Lichun first), in order around the
// year. Each maps {sunLon → branch-name + month-stem-offset}.
export const MONTH_JIES = SOLAR_TERMS.filter(t => t.isJie).sort((a, b) => {
  // Sort so Lichun (315°) is first, then forward through the year.
  const ax = (a.sunLon - 315 + 360) % 360;
  const bx = (b.sunLon - 315 + 360) % 360;
  return ax - bx;
});

// ---------------------------------------------------------------------------
// Ten Gods (十神) — relationship of any stem to the Day Master.
// Computed from element + yin/yang relationship (see tenGods.js). Names
// listed here for reference and UI labelling.
// ---------------------------------------------------------------------------
export const TEN_GODS = {
  Bijian: { hanzi: '比肩', pinyin: 'Bǐ Jiān',     english: 'Friend (peer)',
            note: 'Same element + same polarity as Day Master. A peer — supports identity, can also compete for resources.' },
  Jiecai: { hanzi: '劫财', pinyin: 'Jié Cái',     english: 'Rob Wealth',
            note: 'Same element, opposite polarity. A rival or sibling — competes more sharply for the same resources.' },
  Shishen:{ hanzi: '食神', pinyin: 'Shí Shén',    english: 'Eating God',
            note: 'Element produced by Day Master, same polarity. Output, expression, talent, generative joy.' },
  Shangguan:{hanzi:'伤官', pinyin: 'Shāng Guān',  english: 'Hurting Officer',
            note: 'Element produced by Day Master, opposite polarity. Sharper expression — performance, criticism, rebellion.' },
  Piancai:{ hanzi: '偏财', pinyin: 'Piān Cái',    english: 'Indirect Wealth',
            note: 'Element controlled by Day Master, same polarity. Opportunistic wealth — speculative, lateral, fluid resources.' },
  Zhengcai:{hanzi: '正财', pinyin: 'Zhèng Cái',   english: 'Direct Wealth',
            note: 'Element controlled by Day Master, opposite polarity. Earned wealth — labour, salary, reliable income.' },
  Qisha:  { hanzi: '七煞', pinyin: 'Qī Shā',      english: 'Seven Killings (Indirect Officer)',
            note: 'Element controlling Day Master, same polarity. Sharp authority — pressure, challenge, transformation through trial.' },
  Zhengguan:{hanzi:'正官', pinyin: 'Zhèng Guān',  english: 'Direct Officer',
            note: 'Element controlling Day Master, opposite polarity. Structured authority — rules, status, formal responsibility.' },
  Pianyin:{ hanzi: '偏印', pinyin: 'Piān Yìn',    english: 'Indirect Resource',
            note: 'Element producing Day Master, same polarity. Unconventional learning — intuition, spiritual study, eccentric mentors.' },
  Zhengyin:{hanzi: '正印', pinyin: 'Zhèng Yìn',   english: 'Direct Resource',
            note: 'Element producing Day Master, opposite polarity. Conventional learning — formal education, mother, the supportive teacher.' },
};

// Quick lookup: stem index → stem object.
export const STEM_BY_INDEX = STEMS;
export const BRANCH_BY_INDEX = BRANCHES;
export const STEM_BY_HANZI   = Object.fromEntries(STEMS.map(s => [s.hanzi, s]));
export const BRANCH_BY_HANZI = Object.fromEntries(BRANCHES.map(b => [b.hanzi, b]));

// Sexagenary cycle helper: given index 0..59, return (stem, branch) pair.
export function ganzhi(idx) {
  const i = ((idx % 60) + 60) % 60;
  return { stem: STEMS[i % 10], branch: BRANCHES[i % 12], idx: i };
}
