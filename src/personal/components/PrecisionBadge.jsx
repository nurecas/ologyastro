// -----------------------------------------------------------------------------
// Phase 5 — Precision badge (Section 3.6 of the brief)
//
// Small grey pill in the bottom-right corner of every chart view. Shows
// the active configuration: `☉ Swiss · Tropical · Placidus` OR a warning
// variant: `⚠ Standish fallback` / `⚠ Solar chart`. Click opens the
// Settings drawer.
// -----------------------------------------------------------------------------

import React from 'react';
import { usePersonal } from '../store.js';
import { getPrecisionStatus } from '../../astro/ephemeris.js';

const HOUSE_LABEL = {
  placidus: 'Placidus', 'whole-sign': 'Whole Sign', koch: 'Koch', equal: 'Equal',
};

export default function PrecisionBadge() {
  const {
    natal, swissStatus, zodiac, ayanamsa, houseSystem, timeUnknown,
    openSettings,
  } = usePersonal();
  if (!natal) return null;

  const jd = natal.jd;
  const prec = getPrecisionStatus(jd);

  let tone = 'neutral';
  let label;
  if (timeUnknown) {
    tone = 'warn';
    label = '⚠ Solar chart · birth time unknown';
  } else if (prec === 'fallback') {
    tone = 'warn';
    label = '⚠ Standish fallback';
  } else if (prec === 'out-of-range') {
    tone = 'warn';
    label = '⚠ reduced precision';
  } else {
    const zLabel = zodiac === 'sidereal' ? `Sidereal · ${ayanamsa[0].toUpperCase() + ayanamsa.slice(1)}` : 'Tropical';
    label = `☉ Swiss · ${zLabel} · ${HOUSE_LABEL[houseSystem] || houseSystem}`;
  }

  return (
    <button
      onClick={openSettings}
      title="Open settings"
      className={`fixed bottom-3 right-3 z-20 text-[10px] px-2.5 py-1 rounded-full border transition-colors pointer-events-auto ${
        tone === 'warn'
          ? 'bg-[#1a110a]/90 border-[#d79b3a]/40 text-[#d79b3a]'
          : 'bg-[#0a0a14]/90 border-white/10 text-[#9b9bbd] hover:text-[#e6e6f0]'
      }`}
    >
      {label}
    </button>
  );
}
