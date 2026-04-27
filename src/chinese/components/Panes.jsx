// Chinese BaZi — UI panes.
//   Pillars     — the four pillars with element colours + hidden stems +
//                 ten gods on each.
//   DayMaster   — archetype card + strength rating + element distribution.
//   TenGodsView — 10-gods donut + per-pillar table.
//   LuckPillars — decadal timeline.

import React from 'react';
import { useBazi } from '../store.js';
import { ELEMENT_COLOR, HIDDEN_STEMS, STEM_BY_HANZI, TEN_GODS } from '../compute/data.js';
import { tenGodOfStem } from '../compute/tenGods.js';

const ACCENT = '#ff6a6a';

function PaneHeader({ title, subtitle }) {
  return (
    <header className="mb-5">
      <h2 className="font-serif text-[24px] tracking-[0.12em]" style={{ color: ACCENT }}>{title}</h2>
      {subtitle && <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">{subtitle}</p>}
    </header>
  );
}
function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-[#0c0c18] border border-white/10 rounded-md p-4 ${className}`}>
      {title && <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">{title}</div>}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PILLARS pane — the canonical four-column table.
// Stems on top, branches below, with hidden-stem gods underneath each branch.
// ---------------------------------------------------------------------------
function PillarColumn({ label, pillar, isDayMaster, dm }) {
  if (!pillar) return null;
  const stemColor = ELEMENT_COLOR[pillar.stem.element];
  const branchColor = ELEMENT_COLOR[pillar.branch.element];
  const hidden = HIDDEN_STEMS[pillar.branch.hanzi] || [];
  const stemGod = !isDayMaster ? tenGodOfStem(pillar.stem, dm) : null;
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd]">{label}</div>
      {/* Ten God on stem */}
      <div className="text-[10.5px] text-[#9b9bbd] h-4 italic font-serif">
        {isDayMaster ? <span style={{ color: ACCENT }}>Day Master</span> : (stemGod ? stemGod.english : '—')}
      </div>
      {/* Stem block */}
      <div className="w-full rounded-md p-3 text-center"
           style={{ background: stemColor.bg, border: `1.5px solid ${stemColor.accent}` }}>
        <div className="font-serif text-[44px] leading-none" style={{ color: stemColor.fg }}>
          {pillar.stem.hanzi}
        </div>
        <div className="text-[10.5px] text-[#9b9bbd] mt-1 tracking-wide">
          {pillar.stem.pinyin} · {pillar.stem.label}
        </div>
      </div>
      {/* Branch block */}
      <div className="w-full rounded-md p-3 text-center"
           style={{ background: branchColor.bg, border: `1.5px solid ${branchColor.accent}` }}>
        <div className="font-serif text-[40px] leading-none" style={{ color: branchColor.fg }}>
          {pillar.branch.hanzi}
        </div>
        <div className="text-[10.5px] text-[#9b9bbd] mt-1 tracking-wide">
          {pillar.branch.pinyin} · {pillar.branch.animal} · {pillar.branch.element}
        </div>
      </div>
      {/* Hidden stems — fixed-height block (3 rows) so all columns line up
          regardless of how many hidden stems each branch has (1..3). */}
      <div className="text-[10.5px] text-[#9b9bbd] mt-1 leading-tight text-center w-full">
        <div className="text-[9.5px] tracking-[0.18em] uppercase text-[#6d6d88] mb-1">Hidden</div>
        {[0, 1, 2].map(slot => {
          const h = hidden[slot];
          if (!h) return <div key={slot} className="h-4">&nbsp;</div>;
          const stem = STEM_BY_HANZI[h];
          if (!stem) return <div key={slot} className="h-4">&nbsp;</div>;
          const god = tenGodOfStem(stem, dm);
          return (
            <div key={slot} className="flex items-baseline gap-1.5 justify-center h-4">
              <span style={{ color: ELEMENT_COLOR[stem.element].fg }}>{h}</span>
              <span className="text-[#6d6d88]">{god?.english || '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PillarsPane() {
  const chart = useBazi(s => s.chart);
  if (!chart) return null;
  const dm = chart.dayMaster;
  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1200px] mx-auto space-y-5">
      <PaneHeader
        title="Four Pillars (四柱)"
        subtitle="Year, Month, Day, Hour — each a Heavenly Stem (top) over an Earthly Branch (bottom). The Day Master sits in the third column; everything else is read in relation to it. Hidden stems beneath each branch are secondary influences."
      />

      <Card>
        {/* On mobile a 4-col stack would crush each column; let it switch
            to a 2x2 grid (sm) and only show the linear 4-up at md+. */}
        <div className="grid grid-cols-2 md:flex md:gap-3 md:justify-between md:items-stretch gap-3">
          <PillarColumn label="Year (年)"  pillar={chart.pillars.year}  dm={dm} />
          <PillarColumn label="Month (月)" pillar={chart.pillars.month} dm={dm} />
          <PillarColumn label="Day (日)"   pillar={chart.pillars.day}   dm={dm} isDayMaster />
          <PillarColumn label="Hour (時)"  pillar={chart.pillars.hour}  dm={dm} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="Solar year (Lichun-anchored)">
          <div className="text-[13px] text-[#fff8dd]">{chart.pillars.lichun.solarYear}</div>
          <div className="text-[10.5px] text-[#9b9bbd] mt-1">
            Lichun: {chart.pillars.lichun.date.toISOString().slice(0, 10)}
          </div>
        </Card>
        <Card title="Active month boundary (節)">
          <div className="text-[13px] text-[#fff8dd]">
            {chart.pillars.month.jie.hanzi} · {chart.pillars.month.jie.name}
          </div>
          <div className="text-[10.5px] text-[#9b9bbd] mt-1">
            Sun longitude {chart.pillars.month.jie.sunLon}° · {chart.pillars.month.jie.date.toISOString().slice(0, 10)}
          </div>
        </Card>
        <Card title="Day Master">
          <div className="font-serif text-[18px]" style={{ color: ELEMENT_COLOR[dm.element].fg }}>
            {dm.hanzi} {dm.pinyin}
          </div>
          <div className="text-[10.5px] text-[#9b9bbd] mt-1">{dm.label}</div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DAY MASTER pane — archetype + strength rating + element bars
// ---------------------------------------------------------------------------
const STRENGTH_TINT = {
  strong:   { color: '#9adfa8', label: 'Strong' },
  balanced: { color: '#f5d680', label: 'Balanced' },
  weak:     { color: '#ff9a9a', label: 'Weak' },
  unknown:  { color: '#9b9bbd', label: 'Unknown' },
};

export function DayMasterPane() {
  const chart = useBazi(s => s.chart);
  if (!chart) return null;
  const dm = chart.dayMaster;
  const arch = chart.archetype;
  const strength = chart.strength;
  const tint = STRENGTH_TINT[strength?.rating || 'unknown'];
  const elementColor = ELEMENT_COLOR[dm.element];
  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1100px] mx-auto space-y-5">
      <PaneHeader
        title="Day Master (日主)"
        subtitle="The Day Master is the heavenly stem of your birth day — the central reference for every reading. Element + polarity together name the archetype."
      />
      <Card>
        <div className="flex items-center gap-6">
          <div className="rounded-md p-6 text-center"
               style={{ background: elementColor.bg, border: `2px solid ${elementColor.accent}` }}>
            <div className="font-serif text-[80px] leading-none" style={{ color: elementColor.fg }}>{dm.hanzi}</div>
            <div className="text-[11px] mt-2 tracking-[0.2em] uppercase text-[#9b9bbd]">{dm.pinyin}</div>
          </div>
          <div className="flex-1">
            {arch && (
              <>
                <div className="font-serif text-[20px] text-[#fff8dd]">{arch.name}</div>
                <div className="text-[13px] text-[#c8c8dd] italic font-serif leading-relaxed mt-2">{arch.note}</div>
              </>
            )}
          </div>
        </div>
      </Card>
      {strength && (
        <Card title="Day Master strength">
          <div className="flex items-baseline gap-3">
            <div className="text-[10.5px] tracking-[0.2em] uppercase text-[#9b9bbd]">Rating</div>
            <div className="font-serif text-[18px]" style={{ color: tint.color }}>{tint.label}</div>
          </div>
          <div className="text-[12.5px] text-[#9b9bbd] mt-1">
            Supports (Self / Resource): <span className="text-[#fff8dd]">{strength.supports}</span> · Drains (Output / Wealth / Officer): <span className="text-[#fff8dd]">{strength.drains}</span> · Ratio {(strength.ratio * 100).toFixed(0)}%
          </div>
          <div className="text-[10.5px] text-[#6d6d88] italic mt-2 leading-snug">
            A coarse heuristic — strong DMs tend to favour reading toward Output / Wealth / Officer; weak DMs favour Resource / Self. Proper Yong Shen analysis (favourable element) needs season + structure consideration; this rating is a starting hint.
          </div>
        </Card>
      )}
      <Card title="Element distribution">
        <div className="space-y-2">
          {Object.entries(chart.elements).map(([el, count]) => {
            const ec = ELEMENT_COLOR[el];
            const max = Math.max(...Object.values(chart.elements));
            const pct = max > 0 ? (count / max) * 100 : 0;
            return (
              <div key={el} className="flex items-center gap-3">
                <div className="text-[12px] w-16 text-[#9b9bbd]">{el}</div>
                <div className="flex-1 h-5 bg-white/5 rounded relative overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${pct}%`, background: ec.accent }} />
                </div>
                <div className="text-[12px] w-12 text-right font-mono" style={{ color: ec.fg }}>{count}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TEN GODS pane
// ---------------------------------------------------------------------------
const TEN_GOD_GROUP = {
  Bijian:   { group: 'Self',     color: '#f5d680' },
  Jiecai:   { group: 'Self',     color: '#d79b3a' },
  Shishen:  { group: 'Output',   color: '#9adfa8' },
  Shangguan:{ group: 'Output',   color: '#5fa672' },
  Piancai:  { group: 'Wealth',   color: '#ff9a9a' },
  Zhengcai: { group: 'Wealth',   color: '#d8595c' },
  Qisha:    { group: 'Officer',  color: '#a8c5ff' },
  Zhengguan:{ group: 'Officer',  color: '#5b7fc7' },
  Pianyin:  { group: 'Resource', color: '#d8caff' },
  Zhengyin: { group: 'Resource', color: '#b79aff' },
};

export function TenGodsPane() {
  const chart = useBazi(s => s.chart);
  if (!chart) return null;
  const dist = chart.distribution || {};
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1100px] mx-auto space-y-5">
      <PaneHeader
        title="Ten Gods (十神)"
        subtitle="Every other stem in the chart — visible and hidden — has a relationship to the Day Master. Those relationships are the 10 Gods. Each carries a flavour: Self, Output (expression), Wealth, Officer (authority/pressure), or Resource (support)."
      />
      <Card title="Distribution">
        <div className="space-y-1.5">
          {Object.entries(dist)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => {
              const god = TEN_GODS[key];
              const meta = TEN_GOD_GROUP[key];
              const pct = (count / total) * 100;
              return (
                <div key={key} className="flex items-center gap-3 text-[12px]">
                  <div className="w-32">
                    <div style={{ color: meta.color }}>{god.hanzi} · {key}</div>
                    <div className="text-[10px] text-[#6d6d88]">{god.english}</div>
                  </div>
                  <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                  <div className="w-8 text-right font-mono text-[#fff8dd]">{count}</div>
                </div>
              );
            })}
        </div>
      </Card>
      <Card title="Reference table">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          {Object.entries(TEN_GODS).map(([key, god]) => (
            <div key={key} className="border-b border-dashed border-white/5 pb-2 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span style={{ color: TEN_GOD_GROUP[key].color }}>{god.hanzi}</span>
                <span className="text-[#fff8dd]">{god.pinyin}</span>
                <span className="text-[10.5px] text-[#9b9bbd]">{god.english}</span>
              </div>
              <div className="text-[11px] text-[#9b9bbd] italic font-serif leading-snug mt-0.5">{god.note}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LUCK PILLARS pane
// ---------------------------------------------------------------------------
export function LuckPillarsPane() {
  const chart = useBazi(s => s.chart);
  if (!chart) return null;
  const luck = chart.luck;
  const dm = chart.dayMaster;
  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1100px] mx-auto space-y-5">
      <PaneHeader
        title="Luck Pillars (大運)"
        subtitle="10-year decadal cycles starting from a precise moment determined by birth-to-jié distance. Each pillar's stem-branch combo overlays the natal chart for that decade — its element interactions reveal the period's texture."
      />
      <Card>
        <div className="text-[12px] text-[#9b9bbd]">
          Direction: <span className="text-[#fff8dd]">{luck.direction}</span> · Starting age: <span className="text-[#fff8dd]">{luck.startingAge.toFixed(2)} years</span>
          <span className="ml-2 text-[10.5px]">({chart.gender}, year stem {chart.pillars.year.stem.label})</span>
        </div>
      </Card>
      <Card title="Decadal timeline">
        <div className="space-y-2">
          {luck.pillars.map((lp, i) => {
            const stemColor = ELEMENT_COLOR[lp.stem.element];
            const branchColor = ELEMENT_COLOR[lp.branch.element];
            const stemGod = tenGodOfStem(lp.stem, dm);
            return (
              <div key={i} className="grid grid-cols-[60px_72px_1fr] gap-3 items-center bg-[#0a0a14] border border-white/5 rounded-md p-2.5">
                <div className="text-[10px] text-[#9b9bbd] tracking-wide">Age {Math.floor(lp.startAge)}–{Math.floor(lp.endAge)}</div>
                <div className="flex flex-col items-center">
                  <div className="font-serif text-[20px]" style={{ color: stemColor.fg }}>{lp.stem.hanzi}</div>
                  <div className="font-serif text-[20px]" style={{ color: branchColor.fg }}>{lp.branch.hanzi}</div>
                </div>
                <div className="text-[12px] text-[#c8c8dd]">
                  <div>{lp.stem.label} / {lp.branch.element} {lp.branch.animal}</div>
                  <div className="text-[10.5px] text-[#9b9bbd] italic">
                    {lp.startDate.getUTCFullYear()} — {lp.endDate.getUTCFullYear()} · stem god: <span className="text-[#fff8dd]">{stemGod?.english || '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
