// -----------------------------------------------------------------------------
// Interpretation text for the personal app.
//
// All definitions here are *astrological conventions* — we report what a
// given symbol *means in the tradition*, not what will happen to the user.
// Kept concise and sourced from classical (Ptolemy, Lilly) and modern
// (Hand, Greene) astrological consensus.
// -----------------------------------------------------------------------------

export const PLANET_INFO = {
  Sun: {
    glyph: '☉',
    title: 'Sun',
    role: 'core identity, vitality, will',
    body: `The Sun is the heart of the chart — what you are moving toward over a lifetime, the animating "I am." Its sign shows the tone of your core self; its house shows the arena of life where that self most wants to shine.`,
    keywords: ['identity', 'vitality', 'purpose', 'ego', 'creative drive'],
  },
  Moon: {
    glyph: '☾',
    title: 'Moon',
    role: 'inner world, feeling, rhythm',
    body: `The Moon is the instinctive body of the chart — what you need in order to feel safe, the texture of your moods, the private self beneath the persona. Its sign colours how you process emotion; its house shows where you seek belonging.`,
    keywords: ['emotion', 'nurture', 'memory', 'home', 'habit'],
  },
  Mercury: {
    glyph: '☿',
    title: 'Mercury',
    role: 'mind, language, exchange',
    body: `Mercury is how you think, speak, connect, and move information. Its sign shows the cognitive style — fast and abstract, slow and concrete, lyrical, analytical. Its house is where your curiosity lives.`,
    keywords: ['thought', 'speech', 'learning', 'commerce', 'siblings'],
  },
  Venus: {
    glyph: '♀',
    title: 'Venus',
    role: 'love, beauty, value',
    body: `Venus governs what you find beautiful and worth drawing toward you — aesthetic sense, relational attraction, the texture of pleasure, the way you attract resources. Its sign is your style of loving; its house is where harmony feels earned.`,
    keywords: ['love', 'beauty', 'art', 'value', 'attraction'],
  },
  Mars: {
    glyph: '♂',
    title: 'Mars',
    role: 'drive, courage, conflict',
    body: `Mars is the assertive force — how you pursue what you want, how you fight, how you protect. Its sign is your fighting style (cold / hot, direct / oblique); its house is where the blade gets drawn.`,
    keywords: ['drive', 'anger', 'courage', 'sexuality', 'action'],
  },
  Jupiter: {
    glyph: '♃',
    title: 'Jupiter',
    role: 'expansion, meaning, grace',
    body: `Jupiter is the principle of abundance, faith, and larger frameworks of meaning — religion, law, philosophy, foreign cultures. It shows where life tends to open for you, and where you're prone to excess and over-promise.`,
    keywords: ['expansion', 'luck', 'faith', 'excess', 'teaching'],
  },
  Saturn: {
    glyph: '♄',
    title: 'Saturn',
    role: 'structure, discipline, time',
    body: `Saturn is the principle of limit and mastery. It shows where life asks for patience, where you will build something real through sustained effort, and where you fear inadequacy. Saturn's gift is earned authority.`,
    keywords: ['discipline', 'structure', 'responsibility', 'fear', 'mastery'],
  },
  Uranus: {
    glyph: '♅',
    title: 'Uranus',
    role: 'rebellion, awakening, breakthrough',
    body: `Uranus disrupts whatever is stale to make room for the new. It shows where you rebel, where you shock, where sudden insight arrives, and where you feel most fundamentally "other." A generational planet — its sign is shared; its house is yours.`,
    keywords: ['revolution', 'freedom', 'insight', 'disruption', 'genius'],
  },
  Neptune: {
    glyph: '♆',
    title: 'Neptune',
    role: 'dissolution, dream, longing',
    body: `Neptune dissolves boundaries — between self and other, self and divine, self and delusion. It shows where you yearn, where you lose yourself (in love, art, intoxication, service), and where you are most porous to collective imagination.`,
    keywords: ['dream', 'imagination', 'longing', 'sacrifice', 'illusion'],
  },
  Pluto: {
    glyph: '♇',
    title: 'Pluto',
    role: 'transformation, power, shadow',
    body: `Pluto is the principle of deep transformation through descent — what must die so that something truer may be born. It shows where you meet raw power (your own and others'), where obsession lives, and where genuine rebirth is possible.`,
    keywords: ['power', 'death', 'rebirth', 'obsession', 'hidden depths'],
  },

  // Phase 2 extras — Chiron, True Nodes, asteroids. Interpretations drawn
  // from Melanie Reinhart (*Chiron and the Healing Journey*), Jan Spiller
  // (*Astrology for the Soul*), Stephen Arroyo (*Astrology, Karma &
  // Transformation*) for the nodes, and Demetra George (*Asteroid
  // Goddesses*) and Martha Lang-Wescott (*Asteroids: Mechanics of the Soul*)
  // for the asteroids.
  Chiron: {
    glyph: '⚷',
    title: 'Chiron',
    role: 'the wound that teaches',
    body: `Chiron marks the inherited wound — the vulnerability that can never be fully healed but that, when owned, becomes the source of authentic help to others. Its sign describes the tone of the wound; its house, the arena of life where it keeps pressing for attention until it is named.`,
    keywords: ['wound', 'healing', 'mentorship', 'outsider', 'vulnerability'],
  },
  NorthNode: {
    glyph: '☊',
    title: 'North Node',
    role: 'the karmic direction',
    body: `The True North Node points toward the growth edge — qualities that do not come easily and that feel unfamiliar, but that the soul is reaching for in this lifetime. Its sign and house describe the unfamiliar ground to keep walking onto, even when the South Node (always opposite) keeps pulling you back into old competencies.`,
    keywords: ['destiny', 'growth', 'karma', 'unfamiliar strengths'],
  },
  SouthNode: {
    glyph: '☋',
    title: 'South Node',
    role: 'the old competencies',
    body: `The South Node is exactly opposite the North — skills and patterns that feel effortless because they are well-worn, often from previous lifetimes in traditional reading. Its sign and house describe where it is easy to retreat, and where holding too tightly prevents the North Node\u2019s growth.`,
    keywords: ['comfort zone', 'past patterns', 'innate skill', 'karmic release'],
  },
  Ceres: {
    glyph: '⚳',
    title: 'Ceres',
    role: 'nourishment and loss',
    body: `Ceres is the great mother — how you nurture, how you accept nurture, and how you grieve. Where Ceres is strong, cycles of cultivation and relinquishment play out: the mother who loses the daughter, and the reunion that follows (Demetra George).`,
    keywords: ['nourishment', 'grief', 'mothering', 'cycles of loss'],
  },
  Pallas: {
    glyph: '⚴',
    title: 'Pallas Athene',
    role: 'pattern recognition, strategy',
    body: `Pallas is the clear-sighted strategist — the capacity to see patterns where others see noise, and to act wisely on what is seen. In the chart it describes the intellect of strategic intelligence and the politics of visibility as a capable woman in male-coded arenas (Demetra George).`,
    keywords: ['strategy', 'pattern', 'craft', 'intellectual independence'],
  },
  Juno: {
    glyph: '⚵',
    title: 'Juno',
    role: 'commitment, equality in partnership',
    body: `Juno is the goddess of marriage — not romance but the contract. She describes what you need in a long partnership, how you experience betrayal, and the negotiated equality (or its absence) between committed equals (Demetra George).`,
    keywords: ['commitment', 'fidelity', 'marriage', 'betrayal', 'equality'],
  },
  Vesta: {
    glyph: '⚶',
    title: 'Vesta',
    role: 'the sacred flame',
    body: `Vesta is devotion itself — the quiet fire tended in solitude, the place of the chart where something is protected, private, held sacred. Her gift is concentration; her shadow is a withdrawal that excludes intimacy (Demetra George).`,
    keywords: ['devotion', 'focus', 'chastity', 'service', 'inner fire'],
  },

  // Uranian (Hamburg School) — interpretations drawn from Reinhold Ebertin
  // (*The Combination of Stellar Influences*) and Alfred Witte. These
  // hypothetical points are never in Basic mode; Settings-drawer toggle.
  Cupido: {
    glyph: '⯰',
    title: 'Cupido',
    role: 'the family, the group',
    body: `Cupido (Witte) signifies the family, the intimate group, the corporation as organism — how one belongs to a collective of kin or work (Ebertin).`,
    keywords: ['family', 'group', 'organization', 'attachment'],
  },
  Hades: {
    glyph: '⯱',
    title: 'Hades',
    role: 'decay, the hidden',
    body: `Hades (Witte) signifies what is buried, unwanted, archaic — secrets, waste, poverty, the deep past; also archaeology and forensic work (Ebertin).`,
    keywords: ['buried', 'secrets', 'decay', 'past', 'ugliness'],
  },
  Zeus: {
    glyph: '⯲',
    title: 'Zeus',
    role: 'directed force',
    body: `Zeus (Witte) signifies controlled fire — the engine, directed will, creative force that can be channelled into production (Ebertin).`,
    keywords: ['propulsion', 'creativity', 'leadership', 'firepower'],
  },
  Kronos: {
    glyph: '⯳',
    title: 'Kronos',
    role: 'authority, the sovereign',
    body: `Kronos (Witte) signifies the high executive, the person in authority, mastery and the recognition that follows it (Ebertin).`,
    keywords: ['authority', 'mastery', 'government', 'high office'],
  },
  Apollon: {
    glyph: '⯴',
    title: 'Apollon',
    role: 'expansion and commerce',
    body: `Apollon (Witte) signifies multiplication — science, trade, publishing, breadth of reach; success through dissemination (Ebertin).`,
    keywords: ['trade', 'broadcast', 'abundance', 'breadth'],
  },
  Admetos: {
    glyph: '⯵',
    title: 'Admetos',
    role: 'the deep still point',
    body: `Admetos (Witte) signifies the immovable, the bedrock — concentration, endurance, conservation; also blockage and stubborn patience (Ebertin).`,
    keywords: ['endurance', 'depth', 'blockage', 'conservation'],
  },
  Vulcanus: {
    glyph: '⯶',
    title: 'Vulcanus',
    role: 'raw power',
    body: `Vulcanus (Witte) signifies immense physical power — industry, muscle, the capacity to exert overwhelming force (Ebertin).`,
    keywords: ['power', 'force', 'industry', 'might'],
  },
  Fortune: {
    glyph: '⊕',
    title: 'Part of Fortune',
    role: 'the point of ease',
    body: `The Part of Fortune is a calculated point — where the Sun, Moon, and Ascendant come into alignment. Traditionally it marks the arena of natural flow and good fortune, where things come easily and joy is found. Its sign describes the *flavour* of that ease; its house, the arena of life where it most readily appears.`,
    keywords: ['ease', 'fortune', 'flow', 'natural good'],
  },
  Poseidon: {
    glyph: '⯷',
    title: 'Poseidon',
    role: 'spirit, clarity',
    body: `Poseidon (Witte) signifies refined awareness — spirit, ideology, illumination; the point where intellect meets transcendence (Ebertin).`,
    keywords: ['spirit', 'clarity', 'ideology', 'illumination'],
  },
};

export const SIGN_INFO = {
  Aries:       { glyph:'♈', element:'fire',  mode:'cardinal', ruler:'Mars',    keyword:'initiating will' },
  Taurus:      { glyph:'♉', element:'earth', mode:'fixed',    ruler:'Venus',   keyword:'embodied stability' },
  Gemini:      { glyph:'♊', element:'air',   mode:'mutable',  ruler:'Mercury', keyword:'connecting curiosity' },
  Cancer:      { glyph:'♋', element:'water', mode:'cardinal', ruler:'Moon',    keyword:'protective belonging' },
  Leo:         { glyph:'♌', element:'fire',  mode:'fixed',    ruler:'Sun',     keyword:'radiant expression' },
  Virgo:       { glyph:'♍', element:'earth', mode:'mutable',  ruler:'Mercury', keyword:'discerning service' },
  Libra:       { glyph:'♎', element:'air',   mode:'cardinal', ruler:'Venus',   keyword:'relational balance' },
  Scorpio:     { glyph:'♏', element:'water', mode:'fixed',    ruler:'Pluto',   keyword:'penetrating depth' },
  Sagittarius: { glyph:'♐', element:'fire',  mode:'mutable',  ruler:'Jupiter', keyword:'questing meaning' },
  Capricorn:   { glyph:'♑', element:'earth', mode:'cardinal', ruler:'Saturn',  keyword:'structured ambition' },
  Aquarius:    { glyph:'♒', element:'air',   mode:'fixed',    ruler:'Uranus',  keyword:'collective vision' },
  Pisces:      { glyph:'♓', element:'water', mode:'mutable',  ruler:'Neptune', keyword:'dissolving compassion' },
};

export const HOUSE_INFO = [
  { n: 1,  title: '1st House',  role: 'Self, body, appearance', body: 'How you show up — your physical self, the vibe you give off, the "door" of the chart. The Ascendant lives here.' },
  { n: 2,  title: '2nd House',  role: 'Resources, body, income', body: 'What you gather, earn, own, and value — including your relationship to your own body as a resource.' },
  { n: 3,  title: '3rd House',  role: 'Mind, siblings, local', body: 'Daily environment, the way you communicate, siblings and neighbours, short journeys, the learning of your early life.' },
  { n: 4,  title: '4th House',  role: 'Roots, home, lineage', body: 'The private foundations — ancestry, home, family of origin, the soul\'s quiet room. The IC lives here.' },
  { n: 5,  title: '5th House',  role: 'Creativity, play, love affairs', body: 'What you make for the joy of making it — art, children, romance, performance, risk.' },
  { n: 6,  title: '6th House',  role: 'Work, health, service', body: 'Daily regimen, health, rituals of maintenance, the work you do in exchange for craft and wellbeing.' },
  { n: 7,  title: '7th House',  role: 'Partners, open enemies', body: 'The other — committed partnerships, contracts, visible opponents. The Descendant lives here.' },
  { n: 8,  title: '8th House',  role: 'Shared resources, death, depth', body: 'What is shared (money, bodies, secrets), intimacy at depth, inheritance, transformation, the occult.' },
  { n: 9,  title: '9th House',  role: 'Meaning, travel, teaching', body: 'Long journeys both geographic and intellectual — religion, philosophy, higher learning, foreign cultures.' },
  { n: 10, title: '10th House', role: 'Career, public role', body: 'What you are visibly known for — vocation, public standing, calling. The Midheaven lives here.' },
  { n: 11, title: '11th House', role: 'Community, future, friends', body: 'The tribe beyond the family — friends, chosen community, collective hopes, movements you belong to.' },
  { n: 12, title: '12th House', role: 'Hidden, spiritual, undoing', body: 'The unseen — what is behind the scenes, monastery and prison, dreams, compassion, what un-does you.' },
];

export const LINE_INFO = {
  MC: {
    title: 'MC Line — Midheaven',
    subtitle: 'where the planet is overhead',
    body: `Along this line on Earth the planet is on the local meridian at your birth moment — it culminates at its highest point. Astrocartography tradition treats MC lines as places where that planet's qualities are visible to the world: career, reputation, destiny, public role. Living under a planet's MC line tends to amplify how others see you through that planet's lens.`,
  },
  IC: {
    title: 'IC Line — Lower Meridian',
    subtitle: 'where the planet is underfoot',
    body: `The planet is on the opposite side of Earth — below the horizon, at its lowest point. IC lines are private places: home, roots, ancestry, the psychological foundation. Living under a planet's IC line tends to activate that planet's qualities in inner life, family, and the sense of "where I come from."`,
  },
  ASC: {
    title: 'ASC Line — Rising',
    subtitle: 'where the planet rises',
    body: `The planet rises on the eastern horizon at your birth moment along this curve. ASC lines are places where that planet's qualities colour your physical presence, self-image, and first impressions. You "become" the planet a little more visibly when you live or travel here.`,
  },
  DSC: {
    title: 'DSC Line — Setting',
    subtitle: 'where the planet sets',
    body: `The planet sets on the western horizon along this curve. DSC lines are relational — places where you meet others who embody the planet's qualities, or where partnerships and open conflict take on that planet's flavour.`,
  },
};

export const ASPECT_INFO = {
  Conjunction: {
    body: 'Two bodies at the same zodiac degree — their forces fuse. Whether this is helpful or stressful depends on the planets involved. The most intense meeting of energies.',
  },
  Opposition: {
    body: 'Two bodies directly across the zodiac — a balance to hold, a tension between complementary forces. Often played out between self and other.',
  },
  Trine: {
    body: 'Two bodies 120° apart — a flow, an ease. Gifts come with trines, though the ease can become a lazy strength if unnoticed.',
  },
  Square: {
    body: 'Two bodies 90° apart — friction and demand. Squares force growth; they are the energy that builds muscle. Resolved squares are among the most productive places in a chart.',
  },
  Sextile: {
    body: 'Two bodies 60° apart — an opportunity that must be accepted. Sextiles are helpful but require a little initiative to activate.',
  },
};

// -----------------------------------------------------------------------------
// Planet × Line combined interpretations (40 entries). Each describes what a
// specific planet's line type means to live under, in classical AstroCartography
// tradition (Jim Lewis, Robert Currey).
//
// Schema: PLANET_LINE_INFO[planet][lineType] = { gist, best, watch }
// -----------------------------------------------------------------------------
export const PLANET_LINE_INFO = {
  Sun: {
    MC: {
      gist: 'Places of public recognition and authority. Your identity becomes visible — you are seen, often promoted, often in leadership. Solar light on your public role.',
      best: 'Career advancement · Executive roles · Creative prominence · Being "in the spotlight"',
      watch: 'Ego inflation · exhaustion from constant visibility',
    },
    IC: {
      gist: 'Deep, private self-knowing. The Sun warms your foundations — home becomes a place of self-discovery, creative solitude, inner authority.',
      best: 'Sabbatical · Artistic hermitage · Family healing · Quiet self-mastery',
      watch: 'Can feel "underground" for a while before it bears fruit',
    },
    ASC: {
      gist: 'Embodied vitality. People notice you physically. Magnetism, robust health, natural leadership just by showing up.',
      best: 'Reinventing yourself · Athletic pursuits · Personal branding',
      watch: 'Can burn hot — pacing matters',
    },
    DSC: {
      gist: 'You meet your identity through partners — they often shine, or they prompt you to rise. Relationships of distinction.',
      best: 'Finding a mentor or influential partner · Visible partnerships',
      watch: 'Partners may overshadow you; boundary work needed',
    },
  },
  Moon: {
    MC: {
      gist: 'The public responds to your emotional presence. Professions of care, mass appeal, mothering. Women / family may feature publicly.',
      best: 'Caregiving careers · Media · Hospitality · Public emotional work',
      watch: 'Mood swings become visible; emotional privacy is hard',
    },
    IC: {
      gist: 'Profound emotional belonging to the land. You feel "at home" here in your bones. Ancestral resonance, deep roots, sanctuary.',
      best: 'Raising a family · Returning to origins · Deep rest · Real estate / home-base',
      watch: 'Homesickness when you leave; emotional enmeshment possible',
    },
    ASC: {
      gist: 'Emotional permeability. Intuitive, approachable, nurturing presence. People read your moods. Gentle, watery appeal.',
      best: 'Counselling · Intuitive work · Deepening personal sensitivity',
      watch: 'Porous to others\' emotions — replenishment essential',
    },
    DSC: {
      gist: 'You meet nurturers — and you mother others. Deep emotional intimacy in partnerships. Family-forming energy.',
      best: 'Marriage · Soul-level friendship · Co-parenting',
      watch: 'Dependency and enmeshment patterns can surface',
    },
  },
  Mercury: {
    MC: {
      gist: 'Verbal authority. You become known for what you say and write. Teaching, journalism, publishing, analysis — the public intellect.',
      best: 'Writing careers · Academia · Technology · Speaking',
      watch: 'Over-talking; mental overwork',
    },
    IC: {
      gist: 'Rich intellectual life in private. Writing from home, archives, learning from ancestry, mental foundations take shape.',
      best: 'Book-writing · Research · Returning to study · Private learning',
      watch: 'Insular thinking; overthinking foundations',
    },
    ASC: {
      gist: 'Quick-witted, verbal, visibly mercurial. You present as clever, articulate, restless. The communicator.',
      best: 'Networking · Media personality · Consulting · Short-form creation',
      watch: 'Nervous energy, scatter',
    },
    DSC: {
      gist: 'Partners are talkers, teachers, siblings-in-spirit. Relationships built on exchange, correspondence, shared curiosity.',
      best: 'Business partnerships · Writing collaborations · Negotiation',
      watch: 'Superficial connections if depth isn\'t cultivated',
    },
  },
  Venus: {
    MC: {
      gist: 'Public beauty and grace. You are publicly loved; aesthetic careers flourish; relational success becomes visible reputation.',
      best: 'Arts · Fashion · Diplomacy · Beauty industries · Public performance',
      watch: 'Vanity; being loved more than seen',
    },
    IC: {
      gist: 'Harmonious, beautiful home. Aesthetic sanctuary. Love lives at the foundations — a tender, settled domestic life.',
      best: 'Making a beloved home · Art-filled private life · Peaceful family bonds',
      watch: 'Complacency; avoiding conflict',
    },
    ASC: {
      gist: 'Physical charm. You become more beautiful, more magnetic here. Grace, charisma, attraction of resources and people.',
      best: 'Dating · Creative self-expression · Personal reinvention · Attracting opportunity',
      watch: 'Vanity; dependent on being desired',
    },
    DSC: {
      gist: 'The classical "love line". Deep partnerships, marriage, the meeting of a beloved. Beauty in the other.',
      best: 'Finding or deepening a life partnership · Artistic collaboration',
      watch: 'Idealizing the partner; conflict-avoidance',
    },
  },
  Mars: {
    MC: {
      gist: 'Visible drive. Competitive, pioneering career. You make your mark through action. Known for courage or combat.',
      best: 'Entrepreneurship · Athletics · Engineering · Military / emergency services',
      watch: 'Public conflict; burnout',
    },
    IC: {
      gist: 'Fire at the foundations. Energy for building a home base; but also domestic friction, ancestral fight patterns.',
      best: 'Renovating home · Starting a family business · Root-level action',
      watch: 'Household tension; family arguments',
    },
    ASC: {
      gist: 'Energetic, athletic, sometimes aggressive presence. A warrior vibe. Sexual magnetism.',
      best: 'Physical training · Sports · Bold new chapters · Pioneering action',
      watch: 'Accidents, hot temper, injuries',
    },
    DSC: {
      gist: 'Fiery partners, passionate or combative. Open conflict visible. Sexual chemistry. Partnership as battle or dance.',
      best: 'Passionate meetings · Sport partnerships · Healthy competition',
      watch: 'Open conflict with others; legal disputes',
    },
  },
  Jupiter: {
    MC: {
      gist: 'The traditional "luck" line for career. Expansion, visibility, benevolent authority. Teaching, publishing, law, religion.',
      best: 'Career advancement · Teaching · International work · Public causes',
      watch: 'Over-promise, over-extend, arrogance',
    },
    IC: {
      gist: 'Abundant, philosophical home. Generous foundations. Faith and meaning at the root of your life here.',
      best: 'Settling into a cherished home · Spiritual family · Building long-term roots',
      watch: 'Can become indulgent; complacency',
    },
    ASC: {
      gist: 'Optimism embodied. People experience you as generous, cheerful, expansive. Fortunate presence.',
      best: 'Starting a new chapter · Travel · Meeting mentors · Physical wellbeing',
      watch: 'Weight gain (literal); over-confidence',
    },
    DSC: {
      gist: 'Generous, teaching, foreign partners. Relationships open your world. Partnerships bring opportunity.',
      best: 'Marriage that expands you · International partnership · Mentorship',
      watch: 'Partners may be flakey, or the relationship too idealized',
    },
  },
  Saturn: {
    MC: {
      gist: 'Earned authority. Slow, steady, serious career. Long-built reputation; structural roles; responsibility is visible.',
      best: 'Institution-building · Long-term career commitments · Mastery professions',
      watch: 'Heavy burden; delayed reward; public criticism',
    },
    IC: {
      gist: 'Discipline and gravitas at the roots. Strict family patterns; karmic foundations; slow-built long-term stability.',
      best: 'Building a forever home · Dealing with family responsibilities · Saturn-return work',
      watch: 'Loneliness at home; feeling burdened by lineage',
    },
    ASC: {
      gist: 'Mature, disciplined bearing. Physical body tested — you appear serious, reserved, older than your years.',
      best: 'Long-term health discipline · Mastery practice · Inner work',
      watch: 'Depression, physical weariness, feeling "not young enough"',
    },
    DSC: {
      gist: 'Serious, committed partnerships. Older partners, karmic relationships, contracts. Loyalty tested and built.',
      best: 'Long marriage · Business partnership · Committed mentorship',
      watch: 'Partner as taskmaster; cold dynamics',
    },
  },
  Uranus: {
    MC: {
      gist: 'Disruption of career, unconventional public role. Sudden changes of direction, breakthroughs visible to the world.',
      best: 'Innovation · Tech, reform, independent careers · Radical creative expression',
      watch: 'Sudden job loss; public unpredictability',
    },
    IC: {
      gist: 'Unstable ground. Home and family change suddenly or unconventionally. The foundation breaks open so something freer can emerge.',
      best: 'Chosen family · Alternative living · Liberating yourself from lineage patterns',
      watch: 'Frequent moves; home instability',
    },
    ASC: {
      gist: 'Eccentric, electric presence. You feel and appear different here — sudden changes to the body or image.',
      best: 'Radical reinvention · Liberating physical habits · Experimental self-expression',
      watch: 'Insomnia, nervous-system flares, accidents',
    },
    DSC: {
      gist: 'Unusual partners, sudden meetings and partings, unconventional relationships. Friendship-as-partnership.',
      best: 'Open relationships · Friendships that bloom suddenly · Shaking loose old couple-patterns',
      watch: 'Instability; abrupt breakups',
    },
  },
  Neptune: {
    MC: {
      gist: 'Glamour and illusion in public role. Artistic or spiritual career, but truth can blur with image. Beloved or mystified.',
      best: 'Film · Music · Poetry · Healing · Spiritual service',
      watch: 'Scandal, deception, confusion about who you are professionally',
    },
    IC: {
      gist: 'Mystical, oceanic home. Foundations dissolve — ancestry feels mysterious or unknown. Compassion rules the domestic.',
      best: 'Retreat · Contemplative living · Healing ancestral wounds · Oceanfront life',
      watch: 'Addictive patterns in the home; ungrounded',
    },
    ASC: {
      gist: 'Ethereal, glamourous, sensitive presence. Mystical vibe. Porous body.',
      best: 'Healing work · Meditation retreats · Artistic embodiment',
      watch: 'Boundaries dissolve; susceptibility to substances; tiredness',
    },
    DSC: {
      gist: 'Idealized partners — spiritual mates, or those you project upon. Merging. Rescuer / rescued dynamics.',
      best: 'Spiritual partnership · Creative collaboration · Healing together',
      watch: 'Disillusionment; dependence; being deceived',
    },
  },
  Pluto: {
    MC: {
      gist: 'Power and transformation in public role. Rise-and-fall patterns. You influence the collective — for better or worse.',
      best: 'Deep influence · Therapy, research, investigation · Transformative leadership',
      watch: 'Power struggles visible; scandal; obsession with status',
    },
    IC: {
      gist: 'Deep roots. Hidden family power, ancestral trauma surfacing, total transformation of foundations.',
      best: 'Genealogy and healing · Long-term home transformation · Facing family depths',
      watch: 'Family secrets erupt; dark emotional undercurrents',
    },
    ASC: {
      gist: 'Intense, magnetic, sometimes intimidating presence. Regenerative physical experiences. You are changed.',
      best: 'Deep therapy · Somatic work · Complete reinvention',
      watch: 'Power struggles with strangers; intensity that frightens others',
    },
    DSC: {
      gist: 'Intense partners. Power dynamics, fatal attractions, total transformation through the other.',
      best: 'Deep intimacy · Transformative therapy with a partner · Soul-level work',
      watch: 'Control, jealousy, destructive dependency',
    },
  },
};

// -----------------------------------------------------------------------------
// GOAL PRESETS — for the "ideal place" map.
// Each goal is a weighted set of (planet, line) contributions. The globe's
// goodness map shades Earth gold where the sum of these Gaussian bumps is
// high, i.e. near the relevant AstroCartography lines.
// -----------------------------------------------------------------------------
export const GOAL_PRESETS = [
  {
    id: 'career', name: 'Career / public role', color: '#FF8C00',
    description: 'Where your visible role in the world takes on leadership, ' +
                 'luck, and earned authority. Weighted by Jupiter MC (expansion), ' +
                 'Sun MC (recognition), Saturn MC (earned authority), Mercury MC (skill).',
    weights: [
      { planet: 'Jupiter', line: 'MC', w: 1.0 },
      { planet: 'Sun',     line: 'MC', w: 0.9 },
      { planet: 'Saturn',  line: 'MC', w: 0.6 },
      { planet: 'Mercury', line: 'MC', w: 0.5 },
      { planet: 'Mars',    line: 'MC', w: 0.3 },
    ],
  },
  {
    id: 'home', name: 'Home / roots', color: '#4488FF',
    description: 'Where you feel most at home — deep belonging and settled ' +
                 'foundations. Weighted heavily by Moon IC (emotional roots) and ' +
                 'Venus IC (beauty), with Saturn IC for long-term stability.',
    weights: [
      { planet: 'Moon',    line: 'IC', w: 1.0 },
      { planet: 'Venus',   line: 'IC', w: 0.6 },
      { planet: 'Saturn',  line: 'IC', w: 0.6 },
      { planet: 'Jupiter', line: 'IC', w: 0.5 },
    ],
  },
  {
    id: 'love', name: 'Love / partnership', color: '#44FF88',
    description: 'Where deep partnerships form. Weighted by Venus DSC ' +
                 '(beloved), Moon DSC (emotional intimacy), and Venus ASC ' +
                 '(personal charm that attracts).',
    weights: [
      { planet: 'Venus',   line: 'DSC', w: 1.0 },
      { planet: 'Moon',    line: 'DSC', w: 0.7 },
      { planet: 'Jupiter', line: 'DSC', w: 0.6 },
      { planet: 'Venus',   line: 'ASC', w: 0.5 },
    ],
  },
  {
    id: 'presence', name: 'Magnetism / vitality', color: '#FFD700',
    description: 'Where you are noticed and feel most alive in your body. ' +
                 'Sun ASC (radiance), Jupiter ASC (generous optimism), Venus ASC ' +
                 '(beauty), Mars ASC (vitality).',
    weights: [
      { planet: 'Sun',     line: 'ASC', w: 1.0 },
      { planet: 'Jupiter', line: 'ASC', w: 0.8 },
      { planet: 'Venus',   line: 'ASC', w: 0.7 },
      { planet: 'Mars',    line: 'ASC', w: 0.5 },
    ],
  },
  {
    id: 'spiritual', name: 'Spiritual life', color: '#AA44FF',
    description: 'Where contemplative, mystical, healing practice deepens. ' +
                 'Neptune IC (oceanic roots), Neptune ASC (porous presence), ' +
                 'Jupiter IC (faith foundations).',
    weights: [
      { planet: 'Neptune', line: 'IC',  w: 1.0 },
      { planet: 'Neptune', line: 'ASC', w: 0.8 },
      { planet: 'Jupiter', line: 'IC',  w: 0.4 },
    ],
  },
  {
    id: 'breakthru', name: 'Breakthrough / freedom', color: '#44FFFF',
    description: 'Where the old pattern breaks open. Uranus ASC (electric ' +
                 'presence) and Uranus MC (career disruption / innovation).',
    weights: [
      { planet: 'Uranus', line: 'ASC', w: 1.0 },
      { planet: 'Uranus', line: 'MC',  w: 0.9 },
    ],
  },
  {
    id: 'depth', name: 'Transformation / depth', color: '#FF44AA',
    description: 'Where profound inner change is possible. Pluto ASC (total ' +
                 'body-level transformation) and Pluto IC (ancestral depth).',
    weights: [
      { planet: 'Pluto', line: 'ASC', w: 1.0 },
      { planet: 'Pluto', line: 'IC',  w: 0.7 },
      { planet: 'Pluto', line: 'MC',  w: 0.5 },
    ],
  },
  {
    id: 'study', name: 'Study / intellect', color: '#FFE680',
    description: 'Where the mind flourishes. Mercury MC (verbal authority), ' +
                 'Jupiter MC (higher learning), Mercury ASC (verbal presence).',
    weights: [
      { planet: 'Mercury', line: 'MC',  w: 1.0 },
      { planet: 'Jupiter', line: 'MC',  w: 0.6 },
      { planet: 'Mercury', line: 'ASC', w: 0.6 },
    ],
  },
];

// -----------------------------------------------------------------------------
// ASPECT NARRATIVE templates for the day-summary generator.
// Given (transit planet, natal planet, aspect) produce a single sentence.
// No LLM — the text is pure classical astrology, auditable in this file.
// -----------------------------------------------------------------------------
export const ASPECT_VERB = {
  Conjunction: 'fuses with',
  Opposition:  'stands opposite',
  Trine:       'flows gracefully to',
  Square:      'challenges',
  Sextile:     'offers opportunity to',
};
export const ASPECT_QUALITY = {
  Conjunction: 'an intense merging',
  Opposition:  'a balancing tension',
  Trine:       'an ease',
  Square:      'productive friction',
  Sextile:     'a gentle offering',
};

// -----------------------------------------------------------------------------
// Chart-pattern interpretations (for the Profile mode).
// -----------------------------------------------------------------------------
export const PATTERN_INFO = {
  stellium: {
    title: 'Stellium',
    body: 'Three or more planets clustered in a single sign — that sign\'s tone dominates your life. Whatever the sign\'s element and mode, you are a concentrated expression of it.',
  },
  grandTrine: {
    title: 'Grand Trine',
    body: 'Three planets 120° apart, in the same element. A circuit of natural ease and flow. Gifts are real but can go unused because they\'re effortless.',
  },
  tSquare: {
    title: 'T-Square',
    body: 'Two planets in opposition, both square a third (the apex). A high-pressure configuration that drives growth. The apex planet is the release valve.',
  },
  grandCross: {
    title: 'Grand Cross',
    body: 'Four planets forming two oppositions at right angles. A constantly active tension that demands continuous choice. Rare and intense.',
  },
  yod: {
    title: 'Yod (Finger of Fate)',
    body: 'Two planets in sextile, both quincunx a third (the apex). A sense of a specific calling or direction that keeps resurfacing until answered.',
  },
  kite: {
    title: 'Kite',
    body: 'A grand trine with a fourth planet opposing one vertex. The ease of the trine, directed through the fourth planet as a point of output.',
  },
};

export const ELEMENT_INFO = {
  fire:  { glyph: '△', blurb: 'Activating, expressive, direct. Fire people initiate.' },
  earth: { glyph: '▽', blurb: 'Grounding, embodied, practical. Earth people build.' },
  air:   { glyph: '△̸', blurb: 'Mental, connecting, relational. Air people communicate.' },
  water: { glyph: '▽̸', blurb: 'Feeling, receptive, depth-seeking. Water people attune.' },
};
export const MODE_INFO = {
  cardinal: { blurb: 'Initiating energy — starts things, leads.' },
  fixed:    { blurb: 'Stabilizing energy — sustains, persists, builds.' },
  mutable:  { blurb: 'Adapting energy — adjusts, transitions, refines.' },
};

// -----------------------------------------------------------------------------
// Phase 4 — Predictive-technique interpretations
//
// Framed as what the *technique* means astrologically, not as
// predictions. Sources: Robert Hand (*Planets in Transit*, *Planets
// in Composite*), Noel Tyl (*Solar Arcs*), Ronald Davison (*The
// Technique of Prediction*).
// -----------------------------------------------------------------------------

export const PREDICTIVE_INFO = {
  progressions: {
    title: 'Secondary progressions',
    role: 'the unfolding of the natal potential',
    body: `Secondary progressions apply a symbolic one-day-for-a-year mapping: the positions of the planets a few weeks after birth are read as the unfolding of the natal chart across the life. Progressed positions move slowly — the progressed Sun advances ~1° per year, the progressed Moon ~13° — so progressions speak to inner maturation and psychological phase rather than outer event (Robert Hand, *Planets in Transit*).`,
    keywords: ['inner unfolding', 'psychological phase', 'maturation'],
  },
  solarArc: {
    title: 'Solar Arc directions',
    role: 'the directed arc from the progressed Sun',
    body: `Solar Arcs advance every body and angle by the same arc — the distance the progressed Sun has travelled since birth. Unlike progressions, which preserve the relative motion of bodies, Solar Arcs move the whole chart forward as a unit, making them the cleanest technique for dating major life structures. Noel Tyl's *Solar Arcs* is the modern reference; Naibod's 59'08"/year is the traditional rate-of-arc when the progressed Sun isn't computed directly.`,
    keywords: ['directed chart', 'structural dating', 'life arcs'],
  },
  solarReturn: {
    title: 'Solar Return',
    role: 'the year\u2019s cycle from birthday to birthday',
    body: `The Solar Return chart is cast for the exact moment the transiting Sun returns to its natal longitude — within ±1 day of the birthday each year. Read as a "year chart," it describes the themes of the coming solar year: where the ASC and angles fall, which houses the Sun and the inner planets occupy, and which natal positions are highlighted by the Return angles. The Return is always cast at the year's current location, not the place of birth (Hand, *Planets in Transit*).`,
    keywords: ['year chart', 'birthday cycle', 'annual theme'],
  },
  lunarReturn: {
    title: 'Lunar Return',
    role: 'the emotional month',
    body: `The Lunar Return — cast for the Moon's return to its natal longitude, roughly every 27.3 days — describes the emotional texture and feeling-tone of the coming lunar month. Shorter and more immediate than the Solar Return; best read alongside it as the month-to-year context.`,
    keywords: ['monthly theme', 'emotional cycle', 'lunar tone'],
  },
  davison: {
    title: 'Davison relationship chart',
    role: 'the relationship cast as a being in its own right',
    body: `Where the Composite chart averages two people's planetary positions, the Davison chart is cast for the *real* midpoint moment in time and space between two births — a chart with its own ascendant, its own houses, its own natal moment. Read as the chart of the relationship itself, it often describes the purpose the two bring into the world together more vividly than the Composite (Robert Hand, *Planets in Composite*, building on Ronald Davison).`,
    keywords: ['relationship chart', 'shared purpose', 'real midpoint'],
  },
  triWheel: {
    title: 'Tri-wheel',
    role: 'natal \u2190 progressed \u2190 transit in one view',
    body: `The tri-wheel superimposes three charts on one canvas: natal at the inner ring, secondary-progressed in the middle, and current transit at the outer edge. Used for "what is the sky doing to the natal and progressed picture right now" — reads major turning points faster than three separate wheels would.`,
    keywords: ['layered chart', 'turning points', 'three-chart view'],
  },
};

export const LAYER_INFO = {
  vitality:       'Solar-Martian vector: identity, physical energy, the assertion of self. When active, emphasises work on who you are and how you act.',
  career:         'Jovian-Saturnian vector: outer-world structure. When active, emphasises vocation, public role, long-arc achievements, responsibility.',
  intellect:      'Mercurial vector anchored to the Gemini-Sagittarius axis: mind, communication, study, travel. When active, emphasises learning and exchange.',
  relational:     'Venusian vector anchored to Libra: love, beauty, partnership, aesthetic life. When active, relationships move to the foreground.',
  emotional:      'Lunar vector anchored to Cancer: inner life, moods, home, care. When active, emphasises what you need in order to feel safe.',
  spiritual:      'Neptunian vector anchored to Pisces: dreams, longing, dissolution, compassion. When active, boundaries soften and imagination opens.',
  transformation: 'Plutonian vector anchored to Scorpio: power, depth, obsession, death-rebirth. When active, something underneath has to change.',
  breakthrough:   'Uranian vector anchored to Aquarius: disruption, insight, freedom, the new. When active, patterns break open and unexpected paths appear.',
};
