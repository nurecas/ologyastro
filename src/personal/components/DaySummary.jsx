import React, { useMemo } from 'react';
import { summarizeDay } from '../astro/day_summary.js';
import { usePersonal } from '../store.js';
import { PLANET_INFO, ASPECT_INFO } from '../astro/interpretation.js';

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

const TONE_STYLE = {
  quiet:      { label: 'quiet',      color: '#8b8ba5' },
  supportive: { label: 'supportive', color: '#44ff88' },
  demanding:  { label: 'demanding',  color: '#ff8844' },
  mixed:      { label: 'mixed',      color: '#f5d680' },
};

export default function DaySummary({ date }) {
  const natal    = usePersonal(s => s.natal);
  const openInfo = usePersonal(s => s.openInfo);
  const summary  = useMemo(() => summarizeDay(natal, date), [natal, date]);

  const tone = TONE_STYLE[summary.tone] || TONE_STYLE.mixed;

  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3 overflow-y-auto">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd]">
          Day Summary
        </div>
        <div className="text-[10px] tracking-[0.25em] uppercase" style={{ color: tone.color }}>
          {tone.label}
        </div>
      </div>
      <div className="text-[12px] text-[#c8c8dd] mb-2">
        {summary.dateLabel}
      </div>

      <div className="text-[13px] text-[#f5d680] leading-snug mb-3">
        {summary.headline}
      </div>

      {/* Weather pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {Object.entries(summary.weather).map(([k, v]) => v > 0 && (
          <button
            key={k}
            onClick={(e) => openInfo({ kind: 'aspect', id: k, meta: `${v} currently within orb`, x: e.clientX, y: e.clientY })}
            className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-[#bfbfd6] hover:text-white hover:border-white/30"
          >
            {v}× {k}
          </button>
        ))}
        <span className="text-[10px] text-[#6d6d88] self-center">
          · {summary.totalAspects} in total
        </span>
      </div>

      {/* Top aspects */}
      <div className="space-y-2">
        {summary.top.map((t, i) => (
          <div key={i} className="border-l-2 border-white/10 pl-2">
            <div className="flex items-center gap-1.5 text-[12px]">
              <button
                onClick={(e) => openInfo({ kind: 'planet', id: t.transit, meta: `Transiting ${t.transit}`, x: e.clientX, y: e.clientY })}
                className="text-[#79d0ff] hover:text-white"
                title={`Transiting ${t.transit}`}
              >
                {PLANET_GLYPH[t.transit]}
              </button>
              <button
                onClick={(e) => openInfo({ kind: 'aspect', id: t.aspect, meta: `${t.transit} → natal ${t.natal}`, x: e.clientX, y: e.clientY })}
                className="text-[#f5d680] hover:text-white"
                title="What this aspect means"
              >
                {t.aspectGlyph}
              </button>
              <button
                onClick={(e) => openInfo({ kind: 'planet', id: t.natal, meta: `Natal ${t.natal}`, x: e.clientX, y: e.clientY })}
                className="text-[#fff8dd] hover:text-white"
                title={`Natal ${t.natal}`}
              >
                {PLANET_GLYPH[t.natal]}
              </button>
              <span className="text-[#6d6d88] text-[11px]">orb {t.orb.toFixed(1)}°</span>
            </div>
            <div className="text-[12px] text-[#d8d8e8] leading-snug mt-1">
              {t.text}
            </div>
            <div className="text-[11px] text-[#9b9bbd] mt-0.5 italic">{t.trend}</div>
          </div>
        ))}
        {summary.top.length === 0 && (
          <div className="text-[12px] text-[#6d6d88] italic">No transits within orb.</div>
        )}
      </div>

      <div className="text-[10px] text-[#6d6d88] mt-3 pt-2 border-t border-white/5 leading-snug">
        {summary.note}
      </div>
    </div>
  );
}
