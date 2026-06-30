import React, { useMemo, useState, useEffect, useRef } from 'react';
import { usePersonal, profileKey } from '../store.js';
import { computeNatal } from '../astro/natal.js';
import { crossAspects, compatibilityHighlights, synastrySummary } from '../astro/synastry.js';
import { davisonChart } from '../astro/davison.js';
import { PLANET_INFO } from '../astro/interpretation.js';
import { fmtLon } from '../astro/natal.js';

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

const TONE_COLOR = {
  flowing:     '#44ff88',
  challenging: '#ff8844',
  mixed:       '#f5d680',
};

function BiWheel({ natalA, natalB }) {
  const canvasRef = useRef(null);
  const DEG = Math.PI / 180;
  const TWO_PI = Math.PI * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const draw = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const Rout   = Math.max(140, Math.min(W, H) / 2 - 90);
      const Rmid   = Rout - 40;
      const Rinner = Rmid - 40;
      const asc = natalA.ascDeg;
      const ang = (lon) => ((lon - asc) * DEG) - Math.PI;

      // Rings
      ctx.strokeStyle = 'rgba(245,214,128,0.35)';
      ctx.lineWidth = 0.8;
      [Rout, Rmid, Rinner].forEach(r => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.stroke();
      });

      // Sign boundaries.
      ctx.strokeStyle = 'rgba(245,214,128,0.15)';
      for (let s = 0; s < 12; s++) {
        const a = ang(s * 30);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * Rmid, cy + Math.sin(a) * Rmid);
        ctx.lineTo(cx + Math.cos(a) * Rout, cy + Math.sin(a) * Rout);
        ctx.stroke();
      }

      // Cross-aspect lines inside the inner ring.
      const aspects = crossAspects(natalA, natalB);
      ctx.lineWidth = 0.8;
      for (const c of aspects) {
        const color = {
          Conjunction: 'rgba(255,255,255,',
          Opposition:  'rgba(255,106,106,',
          Square:      'rgba(255,170,68,',
          Trine:       'rgba(68,255,136,',
          Sextile:     'rgba(68,136,255,',
        }[c.aspect.name] || 'rgba(245,214,128,';
        const alpha = 0.35 * (1 - c.orb / c.aspect.orb);
        ctx.strokeStyle = color + alpha + ')';
        const aA = ang(c.aLon);
        const aB = ang(c.bLon);
        const x1 = cx + Math.cos(aA) * (Rmid - 4);
        const y1 = cy + Math.sin(aA) * (Rmid - 4);
        const x2 = cx + Math.cos(aB) * (Rmid - 4);
        const y2 = cy + Math.sin(aB) * (Rmid - 4);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }

      // Chart A planets on inner ring (gold).
      ctx.font = '18px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      natalA.planets.forEach(p => {
        const a = ang(p.lonDeg);
        const x = cx + Math.cos(a) * Rmid;
        const y = cy + Math.sin(a) * Rmid;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 14);
        grad.addColorStop(0, 'rgba(245,214,128,0.55)');
        grad.addColorStop(1, 'rgba(245,214,128,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = '#fff8dd';
        ctx.fillText(PLANET_GLYPH[p.name], x, y);
      });

      // Chart B planets on outer ring (cyan).
      natalB.planets.forEach(p => {
        const a = ang(p.lonDeg);
        const x = cx + Math.cos(a) * Rout;
        const y = cy + Math.sin(a) * Rout;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 14);
        grad.addColorStop(0, 'rgba(120,220,255,0.55)');
        grad.addColorStop(1, 'rgba(120,220,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = '#d0f0ff';
        ctx.fillText(PLANET_GLYPH[p.name], x, y);
      });

      // Centre label.
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#8b8ba5';
      ctx.fillText(natalA.birth.name, cx, cy - 8);
      ctx.fillStyle = '#79d0ff';
      ctx.fillText(natalB.birth.name, cx, cy + 8);
    };
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [natalA, natalB]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function PartnerPicker({ currentKey, onSelect }) {
  const profiles = usePersonal(s => s.profiles);
  const others = profiles.filter(p => profileKey(p) !== currentKey);

  if (others.length === 0) {
    return (
      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 text-[12px] text-[#9b9bbd]">
        To compare two charts, add a second person in the birth form first.
        Click <span className="text-[#f5d680]">Change chart</span> in the top
        bar, enter someone else's details, and they'll show up here.
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
        Pick a partner chart
      </div>
      <div className="flex flex-wrap gap-2">
        {others.map(p => {
          const k = profileKey(p);
          return (
            <button
              key={k}
              onClick={() => onSelect(k)}
              className="bg-[#0b0b15] border border-white/10 rounded-md px-3 py-2 text-left hover:border-[#f5d680]/50 transition-colors"
              style={{ minWidth: 180 }}
            >
              <div className="text-[13px] text-[#e6e6f0]">{p.name || 'Untitled'}</div>
              <div className="text-[11px] text-[#9b9bbd]">
                {p.day}/{p.month}/{p.year} · {String(p.hour).padStart(2,'0')}:{String(p.minute).padStart(2,'0')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Synastry() {
  const birth       = usePersonal(s => s.birth);
  const natalA      = usePersonal(s => s.natal);
  const profiles    = usePersonal(s => s.profiles);
  const partnerKey  = usePersonal(s => s.partnerKey);
  const setPartnerKey = usePersonal(s => s.setPartnerKey);
  const openInfo    = usePersonal(s => s.openInfo);
  const uiMode      = usePersonal(s => s.uiMode);
  const davisonOn   = usePersonal(s => s.davisonOn);
  const setDavisonOn = usePersonal(s => s.setDavisonOn);
  const advanced    = uiMode === 'advanced';

  const partnerBirth = profiles.find(p => profileKey(p) === partnerKey);
  const natalB = useMemo(
    () => partnerBirth ? computeNatal(partnerBirth) : null,
    [partnerBirth]
  );

  const selfKey = profileKey(birth);

  const cross = useMemo(
    () => natalA && natalB ? crossAspects(natalA, natalB) : [],
    [natalA, natalB]
  );
  const highlights = useMemo(
    () => natalB ? compatibilityHighlights(cross) : null,
    [cross, natalB]
  );
  const summary = useMemo(
    () => natalB ? synastrySummary(cross) : null,
    [cross, natalB]
  );
  // Phase 5: Davison chart (Advanced + toggle on). Cast for the
  // midpoint-in-time-and-space of both births; read as the chart of the
  // relationship itself.
  const davisonNat = useMemo(
    () => (advanced && davisonOn && natalA && partnerBirth) ? davisonChart(birth, partnerBirth) : null,
    [advanced, davisonOn, birth, partnerBirth, natalA]
  );

  if (!natalB) {
    return (
      <div className="w-full p-6 text-[#e6e6f0] max-w-[1000px] mx-auto">
        <header className="mb-4">
          <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
            Synastry
          </h2>
          <p className="text-[13px] text-[#9b9bbd] mt-1 leading-relaxed">
            Compare two natal charts and see how their planets aspect each
            other. This is the classical astrological method for reading
            relationships — romantic, family, working.
          </p>
        </header>
        <PartnerPicker currentKey={selfKey} onSelect={setPartnerKey} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6 text-[#e6e6f0]">
      <header className="mb-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
            Synastry
          </h2>
          <div className="flex items-center gap-3">
            {advanced && (
              <label className="text-[11px] text-[#9b9bbd] flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={davisonOn}
                  onChange={(e) => setDavisonOn(e.target.checked)}
                />
                Davison chart
              </label>
            )}
            <button
              onClick={() => setPartnerKey(null)}
              className="btn-ghost"
              title="Pick a different partner chart"
            >
              ↺ Change partner
            </button>
          </div>
        </div>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          <span className="text-[#f5d680]">{natalA.birth.name}</span> (inner ring, gold)
          × <span className="text-[#79d0ff]">{natalB.birth.name}</span> (outer ring, cyan).
          Coloured lines inside the wheel show aspects between the two charts.
        </p>
      </header>

      {/* Summary badge */}
      {summary && (
        <div className="mb-3 flex items-center gap-3 text-[12.5px]">
          <span className="text-[#9b9bbd]">Overall tone:</span>
          <span className="font-serif text-[18px]" style={{ color: TONE_COLOR[summary.tone] }}>
            {summary.tone}
          </span>
          <span className="text-[#6d6d88]">
            · {summary.count} aspects in orb · {summary.harmonious.toFixed(1)} supportive
            · {summary.tense.toFixed(1)} tense
          </span>
        </div>
      )}

      {davisonNat && (
        <div className="mb-3 bg-[#0a0a14] border border-[#f5d680]/20 rounded-md p-3 text-[11px]">
          <div className="text-[#f5d680] font-serif tracking-wider mb-1">Davison chart — midpoint in time & space</div>
          <div className="text-[#9b9bbd] mb-2">
            Cast for {davisonNat.birth.year}-{String(davisonNat.birth.month).padStart(2,'0')}-{String(davisonNat.birth.day).padStart(2,'0')}
            {' '}{String(davisonNat.birth.hour).padStart(2,'0')}:{String(davisonNat.birth.minute).padStart(2,'0')} UT at
            {' '}{davisonNat.birth.latDeg.toFixed(2)}°, {davisonNat.birth.lonDeg.toFixed(2)}°.
            The chart of the relationship itself — read as a natal chart.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1">
            {davisonNat.planets.filter(p => p.classical !== false).map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-[#f5d680] w-4">{PLANET_GLYPH[p.name] || '•'}</span>
                <span className="text-[#e6e6f0] w-16">{p.name}</span>
                <span className="text-[#c8c8dd]">{fmtLon(p.lonDeg)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px_300px] gap-3">
        <div className="bg-[#0a0a14] border border-white/5 rounded-md overflow-hidden">
          <BiWheel natalA={natalA} natalB={natalB} />
        </div>

        {/* All cross-aspects */}
        <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3 overflow-y-auto">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
            All Cross-Aspects · {cross.length}
          </div>
          <div className="space-y-1">
            {cross.slice(0, 40).map((c, i) => (
              <button
                key={i}
                onClick={(e) => openInfo({
                  kind: 'aspect', id: c.aspect.name,
                  meta: `${natalA.birth.name}'s ${c.aName} ${c.aspect.glyph} ${natalB.birth.name}'s ${c.bName} · orb ${c.orb.toFixed(2)}°`,
                  x: e.clientX, y: e.clientY,
                })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-left text-[12px]"
              >
                <span className="text-[#f5d680] w-4">{PLANET_GLYPH[c.aName]}</span>
                <span className="text-[#bfbfd6]">{c.aspect.glyph}</span>
                <span className="text-[#79d0ff] w-4">{PLANET_GLYPH[c.bName]}</span>
                <span className="flex-1 text-[#d8d8e8]">
                  {c.aName} {c.aspect.name.toLowerCase()} {c.bName}
                </span>
                <span className={`text-[10.5px] ${c.exact ? 'text-[#f5d680]' : 'text-[#6d6d88]'}`}>
                  {c.orb.toFixed(1)}°
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3 overflow-y-auto">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
            Classical Highlights
          </div>
          <HighlightBlock title="Sun ↔ Moon" body="Core compatibility of essential self with emotional body." aspects={highlights.sunMoon} />
          <HighlightBlock title="Venus ↔ Mars" body="Style of attraction and desire between the two." aspects={highlights.venusMars} />
          <HighlightBlock title="Moon ↔ Moon" body="How the two emotional bodies rhyme or clash." aspects={highlights.moonMoon} />
          <HighlightBlock title="Saturn contacts" body="Commitment, challenge, the weight of time. Where the bond has gravity." aspects={highlights.saturn} />
          <HighlightBlock title="Uranus / Neptune / Pluto" body="Transformational and disruptive contacts to inner planets — deep but intense." aspects={highlights.transformational} />
        </div>
      </div>
    </div>
  );
}

function HighlightBlock({ title, body, aspects }) {
  const openInfo = usePersonal(s => s.openInfo);
  return (
    <div className="mb-3 pb-3 border-b border-white/5 last:border-b-0 last:mb-0 last:pb-0">
      <div className="text-[12.5px] text-[#f5d680] mb-0.5">{title}</div>
      <div className="text-[10.5px] text-[#6d6d88] mb-1.5 leading-snug">{body}</div>
      {aspects.length === 0 ? (
        <div className="text-[11px] text-[#6d6d88] italic">None within orb.</div>
      ) : (
        <div className="space-y-0.5">
          {aspects.map((c, i) => (
            <button
              key={i}
              onClick={(e) => openInfo({
                kind: 'aspect', id: c.aspect.name,
                meta: `${c.aName} ${c.aspect.glyph} ${c.bName} · orb ${c.orb.toFixed(1)}°`,
                x: e.clientX, y: e.clientY,
              })}
              className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-white/5 text-left text-[11.5px]"
            >
              <span className="text-[#f5d680] w-3">{PLANET_GLYPH[c.aName]}</span>
              <span className="text-[#bfbfd6]">{c.aspect.glyph}</span>
              <span className="text-[#79d0ff] w-3">{PLANET_GLYPH[c.bName]}</span>
              <span className="flex-1 text-[#d8d8e8]">
                {c.aspect.name.toLowerCase()}
              </span>
              <span className="text-[10px] text-[#6d6d88]">{c.orb.toFixed(1)}°</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
