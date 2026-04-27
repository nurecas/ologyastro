// -----------------------------------------------------------------------------
// Phase 5 — Advanced-only collapsible Profile cards (Section 3.4)
//
// Three cards below the fold on Profile mode. Each is closed by default
// with a one-line summary; click to expand.
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { usePersonal } from '../store.js';
import { dignityTable, dignitySummary } from '../astro/dignities.js';
import { activatedMidpoints, midpointSummary } from '../astro/midpoints.js';
import { aspectGrid, aspectGridSummary } from '../astro/aspectGrid.js';
import { PLANET_INFO, SIGN_INFO } from '../astro/interpretation.js';

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

function Card({ title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-baseline justify-between px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] text-[#f5d680] font-serif tracking-wider">{title}</span>
          <span className="text-[11px] text-[#9b9bbd]">{summary}</span>
        </div>
        <span className="text-[#9b9bbd] text-[11px]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/5">{children}</div>}
    </div>
  );
}

function DignityLabel({ e }) {
  const MAP = {
    rulership: { label: 'ruler',    tone: 'strong' },
    exaltation:{ label: 'exalt',    tone: 'strong' },
    fall:      { label: 'fall',     tone: 'weak' },
    detriment: { label: 'detriment',tone: 'weak' },
    'triplicity-ruler':  { label: 'triplicity', tone: 'neutral' },
    'triplicity-partic': { label: 'triplicity·p', tone: 'neutral' },
    terms:     { label: 'terms',    tone: 'neutral' },
    face:      { label: 'face',     tone: 'neutral' },
  };
  const m = MAP[e] || { label: e, tone: 'neutral' };
  const cls = m.tone === 'strong' ? 'text-[#f5d680]'
            : m.tone === 'weak'   ? 'text-[#d79b3a]/70'
            : 'text-[#9b9bbd]';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border border-white/10 ${cls}`}>{m.label}</span>;
}

function DignitiesCard() {
  const natal = usePersonal(s => s.natal);
  if (!natal) return null;
  const rows = dignityTable(natal);
  const summary = dignitySummary(natal);
  return (
    <Card title="Essential Dignities" summary={summary}>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[#6d6d88] text-left">
              <th className="py-1 pr-2">Planet</th>
              <th className="py-1 pr-2">In</th>
              <th className="py-1 pr-2">Dignities</th>
              <th className="py-1 pr-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.planet} className="border-t border-white/5">
                <td className="py-1.5 pr-2 text-[#e6e6f0]">
                  <span className="text-[#f5d680] mr-1">{PLANET_GLYPH[r.planet]}</span>{r.planet}
                </td>
                <td className="py-1.5 pr-2 text-[#c8c8dd]">
                  {SIGN_INFO[r.sign]?.glyph} {r.sign} {r.within.toFixed(1)}°
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex flex-wrap gap-1">
                    {r.entries.length ? r.entries.map(e => <DignityLabel key={e} e={e} />) : <span className="text-[#6d6d88]">—</span>}
                  </div>
                </td>
                <td className={`py-1.5 pr-2 text-right font-mono ${r.score > 0 ? 'text-[#f5d680]' : r.score < 0 ? 'text-[#d79b3a]/70' : 'text-[#9b9bbd]'}`}>
                  {r.score >= 0 ? `+${r.score}` : r.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[10px] text-[#6d6d88] mt-3">
          Classical Ptolemaic scoring: rulership +5, exaltation +4, triplicity +3, terms +2, face +1, detriment −5, fall −4.
        </div>
      </div>
    </Card>
  );
}

function MidpointsCard() {
  const natal = usePersonal(s => s.natal);
  if (!natal) return null;
  const acts = activatedMidpoints(natal, 1.5);
  const summary = midpointSummary(natal, 1.5);
  return (
    <Card title="Midpoints · Ebertin 90° dial" summary={summary}>
      <div className="mt-3">
        {acts.length === 0 ? (
          <div className="text-[11px] text-[#9b9bbd]">No activations within 1.5° — a quieter midpoint structure.</div>
        ) : (
          <ul className="space-y-1 text-[11px]">
            {acts.map((a, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-[#f5d680] font-mono w-[110px]">
                  {a.a}/{a.b}
                </span>
                <span className="text-[#9b9bbd]">activated by</span>
                <span className="text-[#e6e6f0]">{a.activator}</span>
                <span className="text-[#6d6d88] ml-auto">orb {a.orb.toFixed(2)}°</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function AspectGridCard() {
  const natal = usePersonal(s => s.natal);
  if (!natal) return null;
  const { rows, cells } = aspectGrid(natal);
  const summary = aspectGridSummary(natal);
  return (
    <Card title="Aspect Grid" summary={summary}>
      <div className="mt-3 overflow-x-auto">
        <table className="text-[10px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="w-8"></th>
              {rows.map(r => (
                <th key={r} className="w-7 h-7 text-[#9b9bbd] text-center">
                  {PLANET_GLYPH[r] || r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rn, i) => (
              <tr key={rn}>
                <th className="w-8 text-[#9b9bbd] text-right pr-1">
                  {PLANET_GLYPH[rn] || rn}
                </th>
                {rows.map((cn, j) => {
                  const c = cells[i][j];
                  if (i === j) return <td key={j} className="w-7 h-7 border border-white/5 bg-white/5"></td>;
                  if (!c)      return <td key={j} className="w-7 h-7 border border-white/5"></td>;
                  return (
                    <td
                      key={j}
                      className="w-7 h-7 border border-white/5 text-center align-middle text-[#f5d680]"
                      title={`${rn} ${c.name} ${cn} · orb ${c.orb.toFixed(2)}°`}
                    >
                      {c.glyph}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function ProfileAdvancedCards() {
  const uiMode = usePersonal(s => s.uiMode);
  if (uiMode !== 'advanced') return null;
  return (
    <div className="mt-6 space-y-3">
      <DignitiesCard />
      <MidpointsCard />
      <AspectGridCard />
    </div>
  );
}
