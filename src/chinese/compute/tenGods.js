// Chinese BaZi — Ten Gods (十神) computation.
//
// Each stem in the chart has a relationship to the Day Master (the day's
// heavenly stem). The relationship is defined by:
//   1. Element relation between the stem's element and the Day Master's
//      element (same / produced-by / produces / controlled-by / controls):
//        - same element                            → "Self"
//        - element produced by DM (DM → ?)         → "Output"
//        - element controlled by DM (DM → wealth)  → "Wealth"
//        - element controlling DM (officer → DM)   → "Officer"
//        - element producing DM (resource → DM)    → "Resource"
//   2. Yin/Yang polarity match with Day Master:
//        - same polarity → "direct" / canonical pair
//        - opposite      → "indirect" / mirror pair
// The pair (relation, polarity) selects one of the 10 Gods.

import { STEMS, BRANCHES, HIDDEN_STEMS, STEM_BY_HANZI, PRODUCES, CONTROLS, TEN_GODS } from './data.js';

// Map (relation, samePolarity) → Ten God id from data.js TEN_GODS keys.
//                            samePolarity      oppositePolarity
const TENGOD_MAP = {
  Self:     { same: 'Bijian',  diff: 'Jiecai'    },
  Output:   { same: 'Shishen', diff: 'Shangguan' },
  Wealth:   { same: 'Piancai', diff: 'Zhengcai'  },
  Officer:  { same: 'Qisha',   diff: 'Zhengguan' },
  Resource: { same: 'Pianyin', diff: 'Zhengyin'  },
};

function elementRelation(stemElement, dmElement) {
  if (stemElement === dmElement)              return 'Self';
  if (PRODUCES[dmElement]   === stemElement)  return 'Output';
  if (CONTROLS[dmElement]   === stemElement)  return 'Wealth';
  if (CONTROLS[stemElement] === dmElement)    return 'Officer';
  if (PRODUCES[stemElement] === dmElement)    return 'Resource';
  return null;
}

// Compute the Ten God for any stem against the Day Master stem.
// Returns the Ten God key (e.g. 'Zhengcai') and metadata.
export function tenGodOfStem(stem, dayMaster) {
  if (!stem || !dayMaster) return null;
  const rel = elementRelation(stem.element, dayMaster.element);
  if (!rel) return null;
  const same = stem.yang === dayMaster.yang;
  const id = TENGOD_MAP[rel][same ? 'same' : 'diff'];
  return { id, ...TEN_GODS[id], relation: rel, samePolarity: same };
}

// Apply tenGodOfStem to every stem in the four pillars + every hidden stem
// in each branch. Returns a structured map.
export function tenGodsForChart(pillars) {
  if (!pillars?.day?.stem) return null;
  const dm = pillars.day.stem;
  const out = {};
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (!p) continue;
    out[key] = {
      stemGod: tenGodOfStem(p.stem, dm),
      branchHidden: (HIDDEN_STEMS[p.branch.hanzi] || []).map(stemHanzi => {
        const stem = STEM_BY_HANZI[stemHanzi];
        return { stem, god: tenGodOfStem(stem, dm) };
      }),
    };
  }
  return out;
}

// Distribution of Ten Gods across the chart — counts for the donut chart
// view. Each stem in the chart contributes 1 to its god; we exclude the
// Day Master itself (since it's not a Ten God of itself in any meaningful
// sense — it always shows as Bijian, but the day stem is special).
export function tenGodsDistribution(tenGodsMap) {
  if (!tenGodsMap) return {};
  const counts = {};
  for (const tg of Object.keys(TEN_GODS)) counts[tg] = 0;
  for (const [pillarKey, p] of Object.entries(tenGodsMap)) {
    if (pillarKey !== 'day' && p.stemGod) counts[p.stemGod.id]++;
    for (const h of p.branchHidden) {
      if (h.god) counts[h.god.id]++;
    }
  }
  return counts;
}

// Day Master self-strength estimate. Classical BaZi gives a rough rating:
//   - "strong"  if many Self / Resource gods support the DM
//   - "weak"    if many Officer / Wealth / Output gods drain the DM
//   - "balanced" otherwise
// This is a coarse heuristic — proper Yong Shen (favourable element)
// analysis requires season + structure consideration, which we surface as
// a separate hint.
export function dayMasterStrength(distribution) {
  if (!distribution) return null;
  const supports = (distribution.Bijian || 0)
                 + (distribution.Jiecai || 0)
                 + (distribution.Pianyin || 0)
                 + (distribution.Zhengyin || 0);
  const drains = (distribution.Shishen || 0)
               + (distribution.Shangguan || 0)
               + (distribution.Piancai || 0)
               + (distribution.Zhengcai || 0)
               + (distribution.Qisha || 0)
               + (distribution.Zhengguan || 0);
  const total = supports + drains;
  if (total === 0) return { rating: 'unknown', supports, drains, ratio: 0 };
  const ratio = supports / total;
  let rating;
  if (ratio >= 0.6)      rating = 'strong';
  else if (ratio <= 0.3) rating = 'weak';
  else                    rating = 'balanced';
  return { rating, supports, drains, ratio };
}

// Element distribution across the chart (from all visible stems + hidden
// stems). Useful for the elements-pie view.
export function elementDistribution(pillars) {
  if (!pillars) return {};
  const counts = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (!p) continue;
    counts[p.stem.element]++;
    counts[p.branch.element]++;   // primary element of branch
    for (const stemHanzi of (HIDDEN_STEMS[p.branch.hanzi] || []).slice(1)) {
      const stem = STEM_BY_HANZI[stemHanzi];
      if (stem) counts[stem.element] += 0.5;   // hidden stems half-weight
    }
  }
  return counts;
}

// Day Master archetype text — original short notes per (element, polarity).
// 10 archetypes total, indexed by stem hanzi.
export const DAY_MASTER_ARCHETYPE = {
  '甲': { name: 'Yang Wood — the great tree',
          note: 'Upright, ambitious, growth-oriented. Stable when rooted; can be inflexible. Reaches for the canopy.' },
  '乙': { name: 'Yin Wood — the bending vine',
          note: 'Adaptive, persistent, social. Wraps around obstacles rather than confronting them. Beautiful and resilient.' },
  '丙': { name: 'Yang Fire — the radiant sun',
          note: 'Bright, generous, magnetic. Lights up rooms and projects. Can burn out when not appreciated.' },
  '丁': { name: 'Yin Fire — the candle flame',
          note: 'Warm, intimate, devotional. Shines for those near. Sensitive to environment and emotion.' },
  '戊': { name: 'Yang Earth — the mountain',
          note: 'Steady, foundational, slow to change. Reliable anchor for others. Resists where it should yield.' },
  '己': { name: 'Yin Earth — the cultivated field',
          note: 'Nurturing, productive, accommodating. The harvest depends on what is sown. Underestimates own value.' },
  '庚': { name: 'Yang Metal — the sword',
          note: 'Decisive, principled, sharp. Cuts through ambiguity. Can wound when wielded carelessly.' },
  '辛': { name: 'Yin Metal — the polished gem',
          note: 'Refined, precise, particular. Beauty in detail. Can be brittle under pressure.' },
  '壬': { name: 'Yang Water — the great river',
          note: 'Restless, expansive, intelligent. Moves continuously, shapes terrain. Hard to contain.' },
  '癸': { name: 'Yin Water — the gentle rain',
          note: 'Reflective, intuitive, soft. Penetrates where force cannot. Carries hidden depth.' },
};
