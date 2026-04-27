// Vedic — Sambandha (planetary relationship analysis).
// Three layers per Parashara:
//   1. Naisargika (natural) — permanent friendships baked into each planet.
//   2. Tatkalika (temporal) — based on chart placement: planets in 2, 3, 4,
//      10, 11, 12 from a given planet are its temporal friends; the rest
//      (same sign + 5/6/7/8/9 from it) are temporal enemies.
//   3. Pancha-dha (composite/effective) — combines natural + temporal:
//        F+F = great friend  |  F+N = friend     |  F+E = neutral
//        N+F = friend        |  N+N = neutral    |  N+E = enemy
//        E+F = neutral       |  E+N = enemy      |  E+E = great enemy

import { NAISARGIKA } from './data.js';

const SEVEN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const TEMPORAL_FRIEND_HOUSES = new Set([2, 3, 4, 10, 11, 12]); // 1-based, counted from the reference planet's sign

function naisargika(a, b) {
  if (a === b) return null;
  return NAISARGIKA[a]?.[b] || null; // 'F' | 'E' | 'N' | undefined
}

function tatkalika(chart, a, b) {
  if (a === b) return null;
  const pa = chart.planets.find(p => p.name === a);
  const pb = chart.planets.find(p => p.name === b);
  if (!pa || !pb) return null;
  const housesAway = ((pb.signIdx - pa.signIdx + 12) % 12) + 1;
  return TEMPORAL_FRIEND_HOUSES.has(housesAway) ? 'F' : 'E';
}

// Combine the two via Parashara's pancha-dha table.
const COMBINE = {
  F: { F: 'great_friend',  N: 'friend',  E: 'neutral'     },
  N: { F: 'friend',         N: 'neutral', E: 'enemy'        },
  E: { F: 'neutral',        N: 'enemy',   E: 'great_enemy'  },
};

export function panchadha(chart, a, b) {
  const n = naisargika(a, b);
  const t = tatkalika(chart, a, b);
  if (!n || !t) return null;
  return COMBINE[n][t];
}

// Build a 7×7 effective-relationship table for the seven luminary planets
// (Rahu/Ketu have no own sign and are excluded from the sambandha system).
export function sambandhaTable(chart) {
  const out = {};
  for (const a of SEVEN) {
    out[a] = {};
    for (const b of SEVEN) {
      out[a][b] = a === b ? 'self' : panchadha(chart, a, b);
    }
  }
  return out;
}

// Convenience — for a single planet, return its strongest friends and worst
// enemies by effective relationship.
export function relationsFor(chart, planet) {
  const row = sambandhaTable(chart)[planet] || {};
  const greatFriends = [], friends = [], enemies = [], greatEnemies = [];
  for (const [other, rel] of Object.entries(row)) {
    if (rel === 'great_friend')      greatFriends.push(other);
    else if (rel === 'friend')       friends.push(other);
    else if (rel === 'enemy')        enemies.push(other);
    else if (rel === 'great_enemy')  greatEnemies.push(other);
  }
  return { greatFriends, friends, enemies, greatEnemies };
}
