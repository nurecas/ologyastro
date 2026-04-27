// Phase 5 — One-line planetary-hours strip (Section 3.5 of the brief).
// Shown at the top of the Transits view in Advanced mode when the
// `showPlanetaryHours` toggle is on.

import React, { useMemo } from 'react';
import { usePersonal } from '../store.js';
import { planetaryHourAt, nextPlanetaryHourAt } from '../astro/planetaryHours.js';
import { PLANET_INFO } from '../astro/interpretation.js';

const GLYPH = Object.fromEntries(Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph]));

export default function PlanetaryHoursStrip({ date, lat, lon }) {
  const dismissed  = usePersonal(s => s.hintsDismissed);
  const dismissHint = usePersonal(s => s.dismissHint);
  const { cur, next } = useMemo(() => {
    try {
      return { cur: planetaryHourAt(date, lat, lon), next: nextPlanetaryHourAt(date, lat, lon) };
    } catch { return { cur: null, next: null }; }
  }, [date, lat, lon]);

  if (dismissed?.planetaryHours) return null;
  if (!cur) return null;

  const fmtTime = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return (
    <div className="flex items-center gap-4 bg-[#0a0a14] border border-white/5 rounded px-3 py-1.5 text-[11px] mb-2">
      <span className="text-[#9b9bbd]">Hour of</span>
      <span className="text-[#f5d680] text-[14px]">{GLYPH[cur.ruler]}</span>
      <span className="text-[#e6e6f0]">{cur.ruler}</span>
      <span className="text-[#6d6d88]">({cur.phase})</span>
      {next && (
        <>
          <span className="text-[#6d6d88]">— next</span>
          <span className="text-[#f5d680] text-[14px]">{GLYPH[next.ruler]}</span>
          <span className="text-[#e6e6f0]">at {fmtTime(next.start)}</span>
        </>
      )}
      <button
        onClick={() => dismissHint('planetaryHours')}
        className="ml-auto text-[10px] text-[#6d6d88] hover:text-[#e6e6f0]"
        title="Hide for this session"
      >×</button>
    </div>
  );
}
