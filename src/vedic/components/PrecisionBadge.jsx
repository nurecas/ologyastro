// Vedic — corner precision badge. Click opens settings.

import React from 'react';
import { useVedic } from '../store.js';
import { getPrecisionStatus } from '../../astro/ephemeris.js';

const AYAN_LABEL = {
  lahiri: 'Lahiri', kp: 'KP', raman: 'Raman',
  truecitra: 'True Citra', fagan_bradley: 'Fagan/Bradley',
};

export default function PrecisionBadge() {
  const chart = useVedic(s => s.chart);
  const swissStatus = useVedic(s => s.swissStatus);
  const ayanamsa = useVedic(s => s.ayanamsa);
  const open = useVedic(s => s.openSettings);
  const timeUnknown = useVedic(s => s.timeUnknown);
  if (!chart) return null;

  const prec = getPrecisionStatus(chart.jd);
  let tone = 'neutral';
  let label;
  if (timeUnknown) {
    tone = 'warn';
    label = '⚠ Birth time unknown · Lagna unreliable';
  } else if (prec === 'fallback' || swissStatus === 'failed') {
    tone = 'warn';
    label = '⚠ Vedic requires Swiss · standish fallback';
  } else if (prec === 'out-of-range') {
    tone = 'warn';
    label = '⚠ reduced precision · date outside Swiss range';
  } else {
    label = `☉ Swiss · Sidereal ${AYAN_LABEL[ayanamsa] || ayanamsa} · Whole-Sign`;
  }

  return (
    <button
      onClick={open}
      title="Open settings"
      className={`fixed bottom-3 right-3 z-20 text-[10px] px-2.5 py-1 rounded-full border transition-colors pointer-events-auto ${
        tone === 'warn'
          ? 'bg-[#1a110a]/90 border-[#d79b3a]/40 text-[#d79b3a]'
          : 'bg-[#0a0a14]/90 border-white/10 text-[#9b9bbd] hover:text-[#e6e6f0]'
      }`}
    >{label}</button>
  );
}
