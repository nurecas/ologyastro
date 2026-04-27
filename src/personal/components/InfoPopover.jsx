import React from 'react';
import { usePersonal } from '../store.js';
import {
  PLANET_INFO, SIGN_INFO, HOUSE_INFO, LINE_INFO, ASPECT_INFO, LAYER_INFO,
  PLANET_LINE_INFO, GOAL_PRESETS, PATTERN_INFO,
} from '../astro/interpretation.js';

export default function InfoPopover() {
  const info = usePersonal(s => s.info);
  const close = usePersonal(s => s.closeInfo);
  if (!info) return null;

  const content = resolve(info);
  if (!content) return null;

  // Position: use absolute (x,y) if given; else center.
  const pos = (info.x != null && info.y != null)
    ? { left: Math.min(info.x + 12, window.innerWidth - 400),
        top:  Math.min(info.y + 12, window.innerHeight - 260) }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <>
      {/* Transparent backdrop — click anywhere outside the card closes. */}
      <div
        className="fixed inset-0 z-40"
        onClick={close}
        style={{ cursor: 'default' }}
      />
      <div
      className="fixed z-50 w-[380px] bg-[#0c0c18]/95 border border-white/10 rounded-lg
                 shadow-2xl text-[#e6e6f0] p-4 backdrop-blur-md"
      style={pos}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          {content.glyph && (
            <span className="text-[24px] mr-2 align-middle" style={{ color: content.color || '#f5d680' }}>
              {content.glyph}
            </span>
          )}
          <span className="font-serif text-[20px] tracking-[0.10em] align-middle">
            {content.title}
          </span>
          {content.subtitle && (
            <div className="text-[12px] tracking-[0.18em] uppercase text-[#9b9bbd] mt-0.5">
              {content.subtitle}
            </div>
          )}
        </div>
        <button
          onClick={close}
          className="text-[#9b9bbd] hover:text-white text-[17px] leading-none px-1"
          aria-label="Close"
        >×</button>
      </div>

      {content.meta && (
        <div className="text-[11px] tracking-[0.12em] uppercase text-[#9b9bbd] mb-2">
          {content.meta}
        </div>
      )}

      <div className="text-[13.5px] leading-relaxed text-[#d8d8e8]">
        {content.body}
      </div>

      {content.keywords && (
        <div className="flex flex-wrap gap-1 mt-3">
          {content.keywords.map(k => (
            <span
              key={k}
              className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-[#bfbfd6]"
            >{k}</span>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

function resolve(info) {
  switch (info.kind) {
    case 'planet': {
      const p = PLANET_INFO[info.id];
      if (!p) return null;
      return {
        glyph: p.glyph,
        title: p.title,
        subtitle: p.role,
        body: p.body,
        keywords: p.keywords,
        meta: info.meta,
      };
    }
    case 'sign': {
      const s = SIGN_INFO[info.id];
      if (!s) return null;
      return {
        glyph: s.glyph,
        title: info.id,
        subtitle: `${s.element} · ${s.mode} · ruled by ${s.ruler}`,
        body: `${s.keyword}. Signs describe *how* a planet acts: its style, temperament, and mode of expression when it passes through. This sign's combination of ${s.element} element and ${s.mode} mode gives it its characteristic texture.`,
      };
    }
    case 'house': {
      const h = HOUSE_INFO[info.id - 1];
      if (!h) return null;
      return {
        title: h.title,
        subtitle: h.role,
        body: h.body,
      };
    }
    case 'line': {
      const l = LINE_INFO[info.id];
      if (!l) return null;
      // If we also know the planet, prefer the planet-specific entry.
      if (info.planet && PLANET_LINE_INFO[info.planet]?.[info.id]) {
        const pl = PLANET_LINE_INFO[info.planet][info.id];
        const p  = PLANET_INFO[info.planet];
        return {
          glyph: p.glyph,
          title: `${info.planet} ${info.id} line`,
          subtitle: l.subtitle,
          body: (
            <>
              <div className="mb-2">{pl.gist}</div>
              <div className="text-[12px] text-[#a2d8ff] mb-1">Good for:</div>
              <div className="text-[12.5px] mb-2">{pl.best}</div>
              <div className="text-[12px] text-[#ff9a9a] mb-1">Watch for:</div>
              <div className="text-[12.5px]">{pl.watch}</div>
              <div className="text-[11px] text-[#9b9bbd] mt-3 italic border-t border-white/5 pt-2">
                {l.body}
              </div>
            </>
          ),
        };
      }
      return {
        title: l.title,
        subtitle: l.subtitle,
        body: l.body,
      };
    }

    case 'planetLine': {
      const pl = PLANET_LINE_INFO[info.planet]?.[info.line];
      const l  = LINE_INFO[info.line];
      const p  = PLANET_INFO[info.planet];
      if (!pl || !l || !p) return null;
      return {
        glyph: p.glyph,
        title: `${info.planet} ${info.line} line`,
        subtitle: l.subtitle,
        body: (
          <>
            <div className="mb-2">{pl.gist}</div>
            <div className="text-[12px] text-[#a2d8ff] mb-1">Good for:</div>
            <div className="text-[12.5px] mb-2">{pl.best}</div>
            <div className="text-[12px] text-[#ff9a9a] mb-1">Watch for:</div>
            <div className="text-[12.5px]">{pl.watch}</div>
            <div className="text-[11px] text-[#9b9bbd] mt-3 italic border-t border-white/5 pt-2">
              {l.body}
            </div>
          </>
        ),
      };
    }

    case 'goal': {
      const g = GOAL_PRESETS.find(x => x.id === info.id);
      if (!g) return null;
      return {
        color: g.color,
        title: g.name,
        subtitle: 'AstroCartography goal preset',
        body: (
          <>
            <div className="mb-3">{g.description}</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#9b9bbd] mb-1">Weights used</div>
            <div className="space-y-0.5 text-[12px]">
              {g.weights.map((w, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#d8d8e8]">{w.planet} {w.line}</span>
                  <span className="text-[#9b9bbd]">w = {w.w.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </>
        ),
      };
    }
    case 'aspect': {
      const a = ASPECT_INFO[info.id];
      if (!a) return null;
      return {
        title: info.id,
        subtitle: info.meta,
        body: a.body,
      };
    }
    case 'chartPattern': {
      const p = PATTERN_INFO[info.id];
      if (!p) return null;
      return {
        title: p.title,
        subtitle: 'chart geometry',
        body: p.body,
      };
    }
    case 'layer': {
      const text = LAYER_INFO[info.id];
      if (!text) return null;
      return {
        title: info.name || info.id,
        subtitle: 'vector layer',
        body: text,
        color: info.color,
      };
    }
    default: return null;
  }
}
