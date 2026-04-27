// Vedic — reference data: signs, nakshatras, planet keywords, dignities.
// All planet keys map onto the names exported by ../../astro/ephemeris.js
// so we can index sidereal longitudes directly. Rahu = NorthNode (Swiss
// True Node); Ketu = SouthNode (mirror at +180°).

export const RASHIS = [
  { en: 'Aries',       sa: 'Mesha',     glyph: '♈', element: 'fire',  mode: 'movable',  ruler: 'Mars'    },
  { en: 'Taurus',      sa: 'Vrishabha', glyph: '♉', element: 'earth', mode: 'fixed',    ruler: 'Venus'   },
  { en: 'Gemini',      sa: 'Mithuna',   glyph: '♊', element: 'air',   mode: 'dual',     ruler: 'Mercury' },
  { en: 'Cancer',      sa: 'Karka',     glyph: '♋', element: 'water', mode: 'movable',  ruler: 'Moon'    },
  { en: 'Leo',         sa: 'Simha',     glyph: '♌', element: 'fire',  mode: 'fixed',    ruler: 'Sun'     },
  { en: 'Virgo',       sa: 'Kanya',     glyph: '♍', element: 'earth', mode: 'dual',     ruler: 'Mercury' },
  { en: 'Libra',       sa: 'Tula',      glyph: '♎', element: 'air',   mode: 'movable',  ruler: 'Venus'   },
  { en: 'Scorpio',     sa: 'Vrischika', glyph: '♏', element: 'water', mode: 'fixed',    ruler: 'Mars'    },
  { en: 'Sagittarius', sa: 'Dhanu',     glyph: '♐', element: 'fire',  mode: 'dual',     ruler: 'Jupiter' },
  { en: 'Capricorn',   sa: 'Makara',    glyph: '♑', element: 'earth', mode: 'movable',  ruler: 'Saturn'  },
  { en: 'Aquarius',    sa: 'Kumbha',    glyph: '♒', element: 'air',   mode: 'fixed',    ruler: 'Saturn'  },
  { en: 'Pisces',      sa: 'Meena',     glyph: '♓', element: 'water', mode: 'dual',     ruler: 'Jupiter' },
];

// 27 nakshatras. Each spans 360/27 = 13°20' = 13.3333°. Pada = 1/4 of a
// nakshatra = 3°20' = 3.3333°. Lord cycle: Ketu, Venus, Sun, Moon, Mars,
// Rahu, Jupiter, Saturn, Mercury — repeated three times.
const NAK_LORDS = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
export const NAKSHATRAS = [
  { name: 'Ashwini',           deity: 'Ashwini Kumars',     symbol: 'Horse head',         keyword: 'pioneering · healing'        },
  { name: 'Bharani',           deity: 'Yama',                symbol: 'Yoni',                keyword: 'restraint · transformation'  },
  { name: 'Krittika',          deity: 'Agni',                symbol: 'Razor / flame',       keyword: 'cutting · purifying fire'    },
  { name: 'Rohini',            deity: 'Brahma',              symbol: 'Cart / temple',       keyword: 'fertility · charm'           },
  { name: 'Mrigashira',        deity: 'Soma',                symbol: 'Deer head',           keyword: 'searching · sensitivity'     },
  { name: 'Ardra',             deity: 'Rudra',               symbol: 'Teardrop',            keyword: 'storm · destruction-renewal' },
  { name: 'Punarvasu',         deity: 'Aditi',               symbol: 'Quiver of arrows',    keyword: 'return · renewal'            },
  { name: 'Pushya',             deity: 'Brihaspati',          symbol: 'Cow’s udder',         keyword: 'nourishment · spiritual'     },
  { name: 'Ashlesha',          deity: 'Naga (serpent)',      symbol: 'Coiled serpent',      keyword: 'mystic · entwining'          },
  { name: 'Magha',             deity: 'Pitris (ancestors)',  symbol: 'Royal throne',        keyword: 'lineage · authority'         },
  { name: 'Purva Phalguni',    deity: 'Bhaga',               symbol: 'Front of bed',        keyword: 'pleasure · creativity'       },
  { name: 'Uttara Phalguni',   deity: 'Aryaman',             symbol: 'Back of bed',         keyword: 'commitment · service'        },
  { name: 'Hasta',             deity: 'Savitr',              symbol: 'Hand',                keyword: 'craft · skill'               },
  { name: 'Chitra',            deity: 'Vishvakarma',         symbol: 'Bright jewel',        keyword: 'beauty · design'             },
  { name: 'Swati',             deity: 'Vayu',                symbol: 'Young shoot',         keyword: 'independence · trade'        },
  { name: 'Vishakha',          deity: 'Indra-Agni',          symbol: 'Forked tree',         keyword: 'goal-driven · achievement'   },
  { name: 'Anuradha',          deity: 'Mitra',               symbol: 'Lotus',               keyword: 'devotion · friendship'       },
  { name: 'Jyeshtha',          deity: 'Indra',               symbol: 'Earring',             keyword: 'eldership · power'           },
  { name: 'Mula',              deity: 'Nirriti',             symbol: 'Tied roots',          keyword: 'root-cause · investigation'  },
  { name: 'Purva Ashadha',     deity: 'Apas',                symbol: 'Fan / winnow',        keyword: 'invincibility · purification'},
  { name: 'Uttara Ashadha',    deity: 'Vishvedevas',         symbol: 'Elephant tusk',       keyword: 'enduring victory'            },
  { name: 'Shravana',          deity: 'Vishnu',              symbol: 'Three footprints',    keyword: 'listening · learning'        },
  { name: 'Dhanishta',         deity: 'Eight Vasus',         symbol: 'Drum',                keyword: 'rhythm · prosperity'         },
  { name: 'Shatabhisha',       deity: 'Varuna',              symbol: 'Empty circle',        keyword: 'mystic healing · isolation'  },
  { name: 'Purva Bhadrapada',  deity: 'Aja Ekapada',         symbol: 'Funeral cot',         keyword: 'fiery transcendence'         },
  { name: 'Uttara Bhadrapada', deity: 'Ahir Budhnya',        symbol: 'Two legs of cot',     keyword: 'depth · serpent wisdom'      },
  { name: 'Revati',            deity: 'Pushan',              symbol: 'Fish · drum',         keyword: 'safe passage · completion'   },
].map((n, i) => ({ ...n, lord: NAK_LORDS[i % 9], index: i }));

// Vedic body amplitude (used purely for ranking dominance in JSON exports).
export const VEDIC_BODIES = [
  'Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu',
];

// Map our internal planet names to display names.
export const VEDIC_NAME = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangala', Mercury: 'Budha',
  Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani',
  Rahu: 'Rahu', Ketu: 'Ketu',
};

export const VEDIC_GLYPH = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
  Rahu: '☊', Ketu: '☋',
};

// ---------------------------------------------------------------------------
// Dignities — own sign / exaltation / debilitation / mooltrikona / friendship
// Sources: BPHS / Parashara, standard tables.
// ---------------------------------------------------------------------------

// Each planet's own signs (0-indexed sign numbers).
export const OWN_SIGN = {
  Sun:     [4],          // Leo
  Moon:    [3],          // Cancer
  Mars:    [0, 7],       // Aries, Scorpio
  Mercury: [2, 5],       // Gemini, Virgo
  Jupiter: [8, 11],      // Sagittarius, Pisces
  Venus:   [1, 6],       // Taurus, Libra
  Saturn:  [9, 10],      // Capricorn, Aquarius
};

// Exaltation: { sign: index 0-11, deg: degree of deepest exaltation }
export const EXALT = {
  Sun:     { sign: 0,  deg: 10 },   // Aries 10°
  Moon:    { sign: 1,  deg: 3  },   // Taurus 3°
  Mars:    { sign: 9,  deg: 28 },   // Capricorn 28°
  Mercury: { sign: 5,  deg: 15 },   // Virgo 15°
  Jupiter: { sign: 3,  deg: 5  },   // Cancer 5°
  Venus:   { sign: 11, deg: 27 },   // Pisces 27°
  Saturn:  { sign: 6,  deg: 20 },   // Libra 20°
};
// Debilitation = exact opposite sign + same degree.
export const DEBIL = Object.fromEntries(
  Object.entries(EXALT).map(([p, e]) => [p, { sign: (e.sign + 6) % 12, deg: e.deg }])
);

// Mooltrikona — special "headquarters" range. { sign, from, to } in degrees.
export const MOOLTRIKONA = {
  Sun:     { sign: 4,  from: 0,  to: 20 }, // Leo 0–20
  Moon:    { sign: 1,  from: 4,  to: 30 }, // Taurus 4–30
  Mars:    { sign: 0,  from: 0,  to: 12 }, // Aries 0–12
  Mercury: { sign: 5,  from: 16, to: 20 }, // Virgo 16–20
  Jupiter: { sign: 8,  from: 0,  to: 10 }, // Sagittarius 0–10
  Venus:   { sign: 6,  from: 0,  to: 15 }, // Libra 0–15
  Saturn:  { sign: 10, from: 0,  to: 20 }, // Aquarius 0–20
};

// Naisargika (natural) friendship table — symmetric in spirit but not always.
// Friend (F), Enemy (E), Neutral (N).
export const NAISARGIKA = {
  Sun:     { Moon:'F', Mars:'F', Mercury:'N', Jupiter:'F', Venus:'E', Saturn:'E' },
  Moon:    { Sun:'F',  Mars:'N', Mercury:'F', Jupiter:'N', Venus:'N', Saturn:'N' },
  Mars:    { Sun:'F',  Moon:'F', Mercury:'E', Jupiter:'F', Venus:'N', Saturn:'N' },
  Mercury: { Sun:'F',  Moon:'E', Mars:'N',    Jupiter:'N', Venus:'F', Saturn:'N' },
  Jupiter: { Sun:'F',  Moon:'F', Mars:'F',    Mercury:'E', Venus:'E', Saturn:'N' },
  Venus:   { Sun:'E',  Moon:'E', Mars:'N',    Mercury:'F', Jupiter:'N', Saturn:'F' },
  Saturn:  { Sun:'E',  Moon:'E', Mars:'E',    Mercury:'F', Jupiter:'N', Venus:'F' },
};

// Vimshottari Mahadasha cycle: order + duration in years.
export const VIM_DASHA = [
  { lord: 'Ketu',    years:  7 },
  { lord: 'Venus',   years: 20 },
  { lord: 'Sun',     years:  6 },
  { lord: 'Moon',    years: 10 },
  { lord: 'Mars',    years:  7 },
  { lord: 'Rahu',    years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn',  years: 19 },
  { lord: 'Mercury', years: 17 },
];
export const VIM_TOTAL = 120;
