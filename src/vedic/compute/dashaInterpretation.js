// Vedic — templated descriptions for Maha / Antar / Pratyantar combinations.
// We don't write 729 hand-crafted entries; instead each planet has a short
// "essence" record, and the description is composed at render time. Special
// cases (same lord across levels, return-type periods) get their own
// phrasing.

const ESSENCE = {
  Sun: {
    keyword: 'will, soul, recognition',
    role:    'shines as authority and selfhood',
    gift:    'leadership · vitality · clarity of purpose',
    shadow:  'pride · isolation · burnout',
  },
  Moon: {
    keyword: 'mind, mother, public feeling',
    role:    'flows through emotion and adaptability',
    gift:    'popularity · emotional intelligence · comfort',
    shadow:  'mood swings · dependency · restlessness',
  },
  Mars: {
    keyword: 'drive, courage, conflict',
    role:    'pushes through with assertion and effort',
    gift:    'initiative · achievement · physical strength',
    shadow:  'anger · accidents · combative friction',
  },
  Mercury: {
    keyword: 'mind, exchange, craft',
    role:    'works through analysis and connection',
    gift:    'learning · business · eloquence',
    shadow:  'overthinking · scattered focus · anxiety',
  },
  Jupiter: {
    keyword: 'wisdom, expansion, blessing',
    role:    'expands through faith, teaching and grace',
    gift:    'opportunity · meaning · long-arc abundance',
    shadow:  'overreach · complacency · over-promise',
  },
  Venus: {
    keyword: 'love, beauty, harmony',
    role:    'attracts through pleasure, art and value',
    gift:    'relationships · creativity · material ease',
    shadow:  'indulgence · vanity · codependency',
  },
  Saturn: {
    keyword: 'discipline, structure, time',
    role:    'tests through patience, work and consequence',
    gift:    'mastery · longevity · earned authority',
    shadow:  'delay · depression · contraction',
  },
  Rahu: {
    keyword: 'desire, ambition, the foreign',
    role:    'amplifies and pulls toward what is unknown',
    gift:    'rapid rise · innovation · the new path',
    shadow:  'obsession · scandal · anxious overreach',
  },
  Ketu: {
    keyword: 'detachment, mysticism, the past',
    role:    'dissolves what is no longer essential',
    gift:    'spiritual insight · liberation · depth',
    shadow:  'confusion · isolation · accident-prone',
  },
};

// Compose a short, system-aware description for a Maha / Antar / Pratyantar
// triplet. Returns { headline, body } or null if data is missing.
export function describeDashaCombo(maha, antar, pratyantar) {
  if (!maha?.lord) return null;
  const M = ESSENCE[maha.lord];
  const A = antar?.lord ? ESSENCE[antar.lord] : null;
  const P = pratyantar?.lord ? ESSENCE[pratyantar.lord] : null;
  if (!M) return null;

  // Special case 1: same lord at every level — rare nested signature.
  if (A && M === A && P && A === P) {
    return {
      headline: `${maha.lord} · ${maha.lord} · ${maha.lord}`,
      body: `A rare nesting where ${maha.lord}'s themes (${M.keyword}) run undiluted at every level — the period's signature at maximum strength. Strongest expression of ${M.gift}; also strongest pull toward ${M.shadow}.`,
    };
  }

  // Special case 2: Maha lord = Antar lord = "own antardasha" of the maha.
  // Always the first antar inside any new maha — pure expression of the
  // mahadasha lord's themes before sub-flavours mix in.
  if (A && maha.lord === antar.lord) {
    return {
      headline: `${maha.lord}'s own antardasha`,
      body: `The opening sub-period of the ${maha.lord} mahadasha — its themes (${M.keyword}) at full strength before later antardashas refract them.${P ? ` ${pratyantar.lord} sharpens the immediate moment with ${P.keyword}.` : ''}`,
    };
  }

  // Special case 3: Antar lord = Pratyantar lord — the antar's "own"
  // pratyantar. First sub-sub of any new antardasha.
  if (P && antar.lord === pratyantar.lord) {
    return {
      headline: `${maha.lord} / ${antar.lord} · ${antar.lord}`,
      body: `${maha.lord} ${M.role} across the season; ${antar.lord} refines this through ${A.keyword}. The opening pratyantar of the ${antar.lord} sub-period — themes are crisp, undiluted by a third lord.`,
    };
  }

  // General case: three distinct lords stack their colours.
  let headline = maha.lord;
  if (A) headline += ` / ${antar.lord}`;
  if (P) headline += ` / ${pratyantar.lord}`;

  let body = `${maha.lord} ${M.role} across this stretch — ${M.keyword}.`;
  if (A) body += ` ${antar.lord} refines through ${A.keyword}.`;
  if (P) body += ` ${pratyantar.lord} sharpens the immediate moment with ${P.keyword}.`;

  // Add a tone hint when antar/pratyantar are friendly or harsh to maha.
  // Only the most universally agreed pairs — keep it short.
  body += ' ' + toneHint(maha.lord, antar?.lord, pratyantar?.lord);

  return { headline, body: body.trim() };
}

// A single-sentence tonal hint for the combination. Built from natural
// friendships among the seven luminary planets (Naisargika), kept gentle
// — Vedic combinations rarely have a clean "good/bad" verdict.
const FRIENDS = {
  Sun:     ['Moon','Mars','Jupiter'],
  Moon:    ['Sun','Mercury'],
  Mars:    ['Sun','Moon','Jupiter'],
  Mercury: ['Sun','Venus'],
  Jupiter: ['Sun','Moon','Mars'],
  Venus:   ['Mercury','Saturn'],
  Saturn:  ['Mercury','Venus'],
};
function toneHint(maha, antar, _pratyantar) {
  if (!antar || maha === antar) return '';
  if (['Rahu','Ketu'].includes(maha) || ['Rahu','Ketu'].includes(antar)) {
    return 'Node-coloured periods often bring sudden shifts and unfamiliar terrain.';
  }
  if ((FRIENDS[maha] || []).includes(antar)) {
    return 'These lords are natural friends — the mix tends to flow.';
  }
  if ((FRIENDS[antar] || []).includes(maha)) {
    return 'These lords are natural friends — the mix tends to flow.';
  }
  return 'These lords are not natural friends — the mix asks for adjustment.';
}
