// Phase 5 — Retrograde stations panel (Advanced-only, Transits view).
// Lists each slow planet's upcoming direct/retrograde stations within
// a 12-month window from `fromDate`. Brief Phase 3 defined the compute;
// this is the UI surface.

import React, { useMemo } from 'react';
import { usePersonal } from '../store.js';
import { listStations } from '../astro/rxStations.js';
import { PLANET_INFO } from '../astro/interpretation.js';

const GLYPH = Object.fromEntries(Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph]));

export default function RxStationsPanel({ fromDate }) {
  const uiMode = usePersonal(s => s.uiMode);
  const stations = useMemo(() => {
    if (uiMode !== 'advanced') return [];
    const from = fromDate || new Date();
    const to = new Date(from.getTime() + 365 * 86400000);
    try { return listStations({ fromDate: from, toDate: to }); }
    catch { return []; }
  }, [fromDate, uiMode]);

  if (uiMode !== 'advanced') return null;
  if (!stations.length) return null;

  const fmt = (d) => {
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${m[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  };

  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3">
      <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
        Retrograde stations · next 12 months
      </div>
      <ul className="space-y-1 text-[11px]">
        {stations.map((st, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="text-[#f5d680] w-5 text-center">{GLYPH[st.body] || '•'}</span>
            <span className="text-[#e6e6f0] w-16">{st.body}</span>
            <span className={st.direction === 'retrograde' ? 'text-[#d79b3a]' : 'text-[#7fb6ff]'}>
              stations {st.direction}
            </span>
            <span className="text-[#9b9bbd] ml-auto">{fmt(st.date)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
