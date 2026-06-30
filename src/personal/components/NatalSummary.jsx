import React from 'react';
import { usePersonal } from '../store.js';
import { fmtLon } from '../astro/natal.js';
import { PLANET_INFO } from '../astro/interpretation.js';
import { getPrecisionStatus } from '../../astro/ephemeris.js';

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

export default function NatalSummary() {
  const natal       = usePersonal(s => s.natal);
  const swissStatus = usePersonal(s => s.swissStatus);
  const timeUnknown = usePersonal(s => s.timeUnknown);
  const openInfo    = usePersonal(s => s.openInfo);

  if (!natal) return null;

  // Phase-1 out-of-range warning: if the birth falls outside Swiss's
  // supported window (pre-1200 / post-2399 CE) AND Swiss itself is healthy,
  // the chart is being computed on the ±0.5° Standish+Meeus fallback.
  // Surface that honestly next to the summary. The full precision pill
  // (`\u2609 Swiss \u00b7 Tropical \u00b7 Placidus`) lands in Phase 5 per
  // Section 3.6 of the brief; this badge only warns when precision is
  // materially reduced.
  const precision = getPrecisionStatus(natal.jd);
  const warning =
    precision === 'out-of-range'
      ? 'reduced precision \u2014 date outside Swiss range'
      : swissStatus === 'failed'
      ? 'Standish fallback \u2014 Swiss failed to load'
      : null;
  return (
    <div className="bg-[#0a0a14] border-b border-white/5 px-6 py-3 flex items-center gap-6 text-[12px]">
      <div>
        <div className="text-[#9b9bbd] text-[10px] tracking-[0.25em] uppercase">Name</div>
        <div className="text-[#e6e6f0]">{natal.birth.name}</div>
      </div>
      <div>
        <div className="text-[#9b9bbd] text-[10px] tracking-[0.25em] uppercase">Born</div>
        <div className="text-[#e6e6f0]">
          {natal.birth.day}/{natal.birth.month}/{natal.birth.year}{' '}
          {String(natal.birth.hour).padStart(2, '0')}:{String(natal.birth.minute).padStart(2, '0')}
        </div>
      </div>
      <div>
        <div className="text-[#9b9bbd] text-[10px] tracking-[0.25em] uppercase">Place</div>
        <div className="text-[#e6e6f0]">{natal.birth.placeName}</div>
      </div>
      <div className="flex-1 flex items-center gap-4 border-l border-white/5 pl-6 overflow-x-auto">
        {natal.planets.map(p => (
          <button
            key={p.name}
            onClick={(e) => openInfo({
              kind: 'planet', id: p.name, x: e.clientX, y: e.clientY,
              meta: `Natal · ${fmtLon(p.lonDeg)} · house ${p.house}`,
            })}
            className="text-left whitespace-nowrap hover:bg-white/5 rounded px-2 py-1"
          >
            <div className="text-[#f5d680] text-[15px]">
              {PLANET_GLYPH[p.name]} <span className="text-[11px] text-[#9b9bbd]">{p.name}</span>
            </div>
            <div className="text-[11px] text-[#c8c8dd]">{fmtLon(p.lonDeg)}</div>
          </button>
        ))}
        {!timeUnknown && (
          <div className="border-l border-white/5 pl-4 ml-2">
            <div className="text-[#9b9bbd] text-[10px] tracking-[0.25em] uppercase">Ascendant · Midheaven</div>
            <div className="text-[#e6e6f0]">{fmtLon(natal.ascDeg)} · {fmtLon(natal.mcDeg)}</div>
          </div>
        )}
        {warning && (
          <div
            className="border-l border-white/5 pl-4 ml-2 text-[10px] text-[#d79b3a]/80 tracking-wide max-w-[220px]"
            title="See NOTES.md for precision details."
          >
            ⚠ {warning}
          </div>
        )}
      </div>
    </div>
  );
}
