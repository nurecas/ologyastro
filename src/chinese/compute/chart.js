// Chinese BaZi — main chart entry. Composes the four pillars, ten gods,
// luck pillars, day-master strength, and element distribution into one
// chart object suitable for UI + JSON export.

import { fourPillars, dayMaster } from './pillars.js';
import { tenGodsForChart, tenGodsDistribution, dayMasterStrength,
         elementDistribution, DAY_MASTER_ARCHETYPE } from './tenGods.js';
import { luckPillars } from './luckPillars.js';
import { isSwissReady, setEphemerisOptions } from '../../astro/ephemeris.js';
import { TEN_GODS, HIDDEN_STEMS, STEM_BY_HANZI } from './data.js';

export function computeBaziChart(birth, options = {}) {
  if (!birth || !birth.name) return null;
  if (!isSwissReady()) return null;
  // BaZi uses tropical Sun longitudes for solar-term boundaries.
  setEphemerisOptions({ zodiac: 'tropical' });

  const { gender = 'male' } = options;

  const pillars = fourPillars(birth);
  if (!pillars) return null;

  const dm = dayMaster(pillars);
  const tenGods = tenGodsForChart(pillars);
  const distribution = tenGodsDistribution(tenGods);
  const strength = dayMasterStrength(distribution);
  const elements = elementDistribution(pillars);
  const luck = luckPillars(pillars, birth, gender);
  const archetype = DAY_MASTER_ARCHETYPE[dm.hanzi] || null;

  return {
    birth,
    gender,
    pillars,
    dayMaster: dm,
    archetype,
    tenGods,
    distribution,
    strength,
    elements,
    luck,
    // Reference dictionaries (UI uses these for labels).
    TEN_GODS,
    HIDDEN_STEMS,
  };
}
