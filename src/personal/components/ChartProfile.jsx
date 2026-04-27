import React, { useMemo } from 'react';
import { usePersonal } from '../store.js';
import { analyzeChart } from '../astro/chartAnalysis.js';
import { SIGN_INFO, PLANET_INFO, PATTERN_INFO, ELEMENT_INFO, MODE_INFO, HOUSE_INFO } from '../astro/interpretation.js';
import ProfileAdvancedCards from './ProfileAdvancedCards.jsx';

const ELEMENT_COLOR = {
  fire:  '#ff6a6a',
  earth: '#d0b07a',
  air:   '#79d0ff',
  water: '#7fb6ff',
};
const MODE_COLOR = {
  cardinal: '#f5d680',
  fixed:    '#b79aff',
  mutable:  '#7ad0ff',
};

function BalanceBars({ data, colors, label }) {
  const entries = Object.entries(data);
  return (
    <div>
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">{label}</div>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="text-[13px] capitalize" style={{ color: colors[k] }}>{k}</span>
              <span className="text-[11px] text-[#9b9bbd]">{Math.round(v * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${v * 100}%`, background: colors[k] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatternCard({ kind, items }) {
  const openInfo = usePersonal(s => s.openInfo);
  if (!items.length) return null;
  const info = PATTERN_INFO[kind];
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-3">
      <button
        onClick={(e) => openInfo({
          kind: 'chartPattern', id: kind,
          x: e.clientX, y: e.clientY,
        })}
        className="text-left w-full hover:text-white"
      >
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[13px] text-[#f5d680] font-serif tracking-wider">{info.title}</div>
          <div className="text-[10px] text-[#6d6d88]">{items.length}× ℹ</div>
        </div>
      </button>
      <ul className="space-y-1 text-[12px] text-[#d8d8e8]">
        {items.map((it, i) => (
          <li key={i} className="text-[12px]">
            {kind === 'stellium'     && <>{it.planets.join(', ')} in <span style={{color: '#f5d680'}}>{it.sign}</span></>}
            {kind === 'grandTrine'   && <>{it.planets.join(' ▵ ')} <span className="text-[#9b9bbd]">({it.element})</span></>}
            {kind === 'tSquare'      && <>{it.opposition.join(' ☍ ')} □ <span style={{color:'#f5d680'}}>{it.apex}</span> <span className="text-[#6d6d88] text-[10.5px]">({it.modality})</span></>}
            {kind === 'grandCross'   && <>{it.planets.join(' ✚ ')} <span className="text-[#6d6d88] text-[10.5px]">({it.modality})</span></>}
            {kind === 'yod'          && <>{it.base.join(' ⚹ ')} → <span style={{color:'#f5d680'}}>{it.apex}</span></>}
            {kind === 'kite'         && <>{it.trine.join(' ▵ ')} · tail: {it.tail} opposite <span style={{color:'#f5d680'}}>{it.apex}</span></>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChartProfile() {
  const natal            = usePersonal(s => s.natal);
  const openInfo         = usePersonal(s => s.openInfo);
  const showChartPatterns = usePersonal(s => s.showChartPatterns);
  const analysis         = useMemo(() => analyzeChart(natal), [natal]);

  const Sun    = natal.planets[0];
  const Moon   = natal.planets[1];
  const sunMeta   = SIGN_INFO[analysis.sunSign];
  const moonMeta  = SIGN_INFO[analysis.moonSign];
  const risingMeta= SIGN_INFO[analysis.risingSign];

  const hasAnyPattern = Object.values(analysis.patterns).some(arr => arr.length);

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto">
      <header className="mb-5">
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
          Profile
        </h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          A one-page portrait of the natal chart: the three anchors (Sun, Moon,
          Rising), how the chart's weight is distributed across elements and
          modes, any classical patterns it forms, and which planets / signs /
          houses carry the most influence. Click any card for its meaning.
        </p>
      </header>

      {/* Three Anchors ------------------------------------------------------- */}
      <section className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Sun',     sign: analysis.sunSign,    meta: sunMeta,    sub: 'core identity', planet: 'Sun' },
          { label: 'Moon',    sign: analysis.moonSign,   meta: moonMeta,   sub: 'inner world',   planet: 'Moon' },
          { label: 'Rising',  sign: analysis.risingSign, meta: risingMeta, sub: 'how you show up', planet: null },
        ].map((a) => (
          <button
            key={a.label}
            onClick={(e) => openInfo({
              kind: 'sign', id: a.sign, x: e.clientX, y: e.clientY,
            })}
            className="bg-[#0c0c18] border border-white/10 rounded-md p-4 text-left hover:border-[#f5d680]/50 transition-colors"
          >
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd]">{a.label}</div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-[42px] text-[#f5d680] font-serif leading-none">{a.meta.glyph}</span>
              <div>
                <div className="text-[20px] font-serif tracking-wider">{a.sign}</div>
                <div className="text-[11px] text-[#9b9bbd] mt-0.5">{a.sub}</div>
              </div>
            </div>
            <div className="text-[11.5px] text-[#bfbfd6] mt-3 leading-snug">
              <span style={{color: ELEMENT_COLOR[a.meta.element]}}>{a.meta.element}</span>{' · '}
              <span>{a.meta.mode}</span>{' · '}
              <span>ruled by {a.meta.ruler}</span>
            </div>
            <div className="text-[11px] text-[#9b9bbd] mt-1 italic">{a.meta.keyword}.</div>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Elements */}
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
          <BalanceBars data={analysis.elements} colors={ELEMENT_COLOR} label="Element Balance" />
          <div className="mt-3 text-[11px] text-[#9b9bbd] leading-snug">
            {(() => {
              const e = Object.entries(analysis.elements).sort((a, b) => b[1] - a[1]);
              const top = e[0][0]; const low = e[3][0];
              return `Strongest in ${top} (${ELEMENT_INFO[top].blurb.toLowerCase()}). Thin on ${low}.`;
            })()}
          </div>
        </div>
        {/* Modes */}
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
          <BalanceBars data={analysis.modes} colors={MODE_COLOR} label="Modality Balance" />
          <div className="mt-3 text-[11px] text-[#9b9bbd] leading-snug">
            {(() => {
              const e = Object.entries(analysis.modes).sort((a, b) => b[1] - a[1]);
              return `${e[0][0].replace(/^\w/, c => c.toUpperCase())} dominant. ${MODE_INFO[e[0][0]].blurb}`;
            })()}
          </div>
        </div>
        {/* Hemispheres */}
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Hemisphere Emphasis</div>
          <div className="space-y-2">
            <Hemi label="East · self-driven" value={analysis.hemispheres.east} color="#ffb070" />
            <Hemi label="West · other-oriented" value={analysis.hemispheres.west} color="#7fb6ff" />
            <Hemi label="Above horizon · public" value={analysis.hemispheres.south} color="#f5d680" />
            <Hemi label="Below horizon · private" value={analysis.hemispheres.north} color="#b79aff" />
          </div>
          <div className="mt-3 text-[11px] text-[#9b9bbd] leading-snug">
            Chart shape: <span className="text-[#f5d680]">{analysis.shape}</span>
          </div>
        </div>
      </div>

      {/* Dominants + Patterns in a two-column grid */}
      <section className="grid grid-cols-[320px_1fr] gap-5">
        {/* Dominants */}
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 space-y-4">
          <div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Dominant Planets</div>
            <div className="space-y-1.5">
              {analysis.dominantPlanets.map((p, i) => (
                <button
                  key={p.name}
                  onClick={(e) => openInfo({ kind: 'planet', id: p.name, x: e.clientX, y: e.clientY })}
                  className="w-full flex items-center gap-2 text-left hover:bg-white/5 rounded px-1.5 py-1"
                >
                  <span className="text-[#6d6d88] w-3 text-[11px]">{i + 1}</span>
                  <span className="text-[17px] text-[#f5d680]">{PLANET_INFO[p.name].glyph}</span>
                  <span className="flex-1 text-[13px]">{p.name}</span>
                  <span className="text-[10px] text-[#6d6d88]">{p.aspectCount} aspects</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Dominant Signs</div>
            <div className="space-y-1.5">
              {analysis.dominantSigns.map((s, i) => (
                <button
                  key={s.sign}
                  onClick={(e) => openInfo({ kind: 'sign', id: s.sign, x: e.clientX, y: e.clientY })}
                  className="w-full flex items-center gap-2 text-left hover:bg-white/5 rounded px-1.5 py-1"
                >
                  <span className="text-[#6d6d88] w-3 text-[11px]">{i + 1}</span>
                  <span className="text-[16px] text-[#f5d680]">{SIGN_INFO[s.sign].glyph}</span>
                  <span className="flex-1 text-[13px]">{s.sign}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Dominant Houses</div>
            <div className="space-y-1.5">
              {analysis.dominantHouses.slice(0, 3).map((h, i) => (
                <button
                  key={h.house}
                  onClick={(e) => openInfo({ kind: 'house', id: h.house, x: e.clientX, y: e.clientY })}
                  className="w-full flex items-center gap-2 text-left hover:bg-white/5 rounded px-1.5 py-1"
                >
                  <span className="text-[#6d6d88] w-3 text-[11px]">{i + 1}</span>
                  <span className="text-[13px] text-[#f5d680] w-6">{h.house}</span>
                  <span className="flex-1 text-[12.5px] text-[#d8d8e8]">{HOUSE_INFO[h.house - 1].role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Patterns — Advanced may hide via Settings drawer toggle. */}
        {showChartPatterns && (<>
        <div>
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">
            Classical Patterns
          </div>
          {!hasAnyPattern && (
            <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 text-[12px] text-[#9b9bbd] italic">
              No major geometric patterns detected. An unpatterned chart isn't a
              poorer chart — the planets simply work individually rather than in
              tight formations.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <PatternCard kind="stellium"    items={analysis.patterns.stelliums} />
            <PatternCard kind="grandTrine"  items={analysis.patterns.grandTrines} />
            <PatternCard kind="tSquare"     items={analysis.patterns.tSquares} />
            <PatternCard kind="grandCross"  items={analysis.patterns.grandCrosses} />
            <PatternCard kind="yod"         items={analysis.patterns.yods} />
            <PatternCard kind="kite"        items={analysis.patterns.kites} />
          </div>
          <FirstVisitHint />
        </div>
        </>)}
        {!showChartPatterns && <FirstVisitHint />}
      </section>
      <ProfileAdvancedCards />
    </div>
  );
}

function FirstVisitHint() {
  const dismissed = usePersonal(s => s.hintsDismissed);
  const dismissHint = usePersonal(s => s.dismissHint);
  if (dismissed?.profileIntro) return null;
  return (
    <div className="mt-3 flex items-baseline justify-between text-[11px] text-[#9b9bbd] border-t border-white/5 pt-3">
      <span>Click any element, planet, or card for its meaning.</span>
      <button
        onClick={() => dismissHint('profileIntro')}
        className="ml-4 text-[#6d6d88] hover:text-[#e6e6f0]"
      >Got it</button>
    </div>
  );
}

function Hemi({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-[11.5px] mb-0.5">
        <span>{label}</span>
        <span className="text-[#9b9bbd]">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}
