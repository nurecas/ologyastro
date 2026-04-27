// -----------------------------------------------------------------------------
// Phase 2 — Fixed stars (Brady's list, reduced)
//
// The brief requires "Brady's list of ~30 notable stars". We ship the list
// here with astrological keywords drawn from Bernadette Brady's *Brady's
// Book of Fixed Stars* (1998) and Vivian Robson's *Fixed Stars and
// Constellations in Astrology* (1923). Positions are NOT hardcoded —
// Swiss's sefstars.txt is the source of truth, precession-corrected at
// each chart. We only need the name (as Swiss knows it) plus the
// interpretation keyword.
//
// Star names here MUST match the first token on the relevant line in
// sefstars.txt (Swiss accepts either traditional names or Bayer
// designations — traditional is easier to read in the UI).
// -----------------------------------------------------------------------------

export const FIXED_STARS = [
  // The four "Royal Stars" of Persia — archangel watchers of the equinoxes
  // and solstices, historically the most emphasised stars in western
  // astrology.
  { name: 'Aldebaran',  tradition: 'Watcher of the East — integrity rewarded, tests of honor (Brady).' },
  { name: 'Antares',    tradition: 'Watcher of the West — passionate courage; obsessive intensity (Brady).' },
  { name: 'Regulus',    tradition: 'Watcher of the North — public success conditional on humility (Brady).' },
  { name: 'Fomalhaut',  tradition: 'Watcher of the South — idealistic vision; danger of escapism (Brady).' },

  // Other first-magnitude and historically prominent stars
  { name: 'Spica',      tradition: 'Gift of brilliance, protection; cultural flowering (Robson).' },
  { name: 'Algol',      tradition: 'The Medusa — repressed intensity, the shadow made conscious (Brady).' },
  { name: 'Sirius',     tradition: 'The sacred — prominence earned through devotion, mythic scale (Brady).' },
  { name: 'Vega',       tradition: 'The Harp — artistry, refinement, the charisma of the performer (Brady).' },
  { name: 'Arcturus',   tradition: 'A new path pioneer — vision that leads others (Brady).' },
  { name: 'Rigel',      tradition: 'The teacher — knowledge that enlightens others (Robson).' },
  { name: 'Betelgeuse', tradition: 'Unmitigated success — but with warnings on hubris (Robson).' },
  { name: 'Procyon',    tradition: 'Swift rise, swift fall — speed rewarded, speed punished (Robson).' },
  { name: 'Capella',    tradition: 'The little she-goat — curiosity, inquiry, learned honour (Brady).' },
  { name: 'Polaris',    tradition: 'Pole star — fixedness of purpose; the unchanging centre (Robson).' },
  { name: 'Deneb',      tradition: 'Deneb Adige, Cygnus tail — mystical poetry, the soul\u2019s inheritance (Brady).' },
  { name: 'Altair',     tradition: 'The eagle — ambition realised through force of will (Robson).' },
  { name: 'Achernar',   tradition: 'End of the river — resolution, fidelity, crisis\u2019s closure (Brady).' },
  { name: 'Canopus',    tradition: 'The pilot — voyages, navigation, return after long labour (Brady).' },
  { name: 'Hamal',      tradition: 'Head of the Ram — blunt authority, leadership in violence (Robson).' },
  { name: 'Alcyone',    tradition: 'Brightest Pleiad — vision of the grieving, "something to cry about" (Brady).' },
  { name: 'Alphard',    tradition: 'Heart of the serpent — deep emotional reserves, loneliness (Robson).' },
  { name: 'Alphecca',   tradition: 'Corona Borealis — honour through relationships, tested by temptation (Robson).' },
  { name: 'Bellatrix',  tradition: 'The female warrior — success via determined conflict (Robson).' },
  { name: 'Castor',     tradition: 'One of the Gemini twins — writing, publishing, duality (Robson).' },
  { name: 'Pollux',     tradition: 'The other Gemini — physical competition, crueller counterpart to Castor (Robson).' },
  { name: 'Denebola',   tradition: 'Lion\u2019s tail — opposing current structures, social reform (Robson).' },
  { name: 'Mirach',     tradition: 'Andromeda — devotion through suffering, redemptive love (Brady).' },
  { name: 'Alnilam',    tradition: 'Belt of Orion — brief moments of fame, public spotlight (Robson).' },
  { name: 'Zuben Elgenubi', tradition: 'Southern Scale — imbalance demanding reform; social justice (Brady).' },
  { name: 'Zuben Eschamali', tradition: 'Northern Scale — good judgement, measured reform (Robson).' },
];

export const FIXED_STAR_NAMES = FIXED_STARS.map(s => s.name);
export const FIXED_STAR_INFO = Object.fromEntries(FIXED_STARS.map(s => [s.name, s]));
