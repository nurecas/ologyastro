// Vedic Rashi (D1 Lagna chart) panel.
// Renders the user's preferred chart format (North or South Indian) plus
// a planet table with dignity / nakshatra / pada.

import React from 'react';
import { useVedic } from '../store.js';
import NorthIndianChart from './NorthIndianChart.jsx';
import SouthIndianChart from './SouthIndianChart.jsx';
import { RASHIS, VEDIC_GLYPH, VEDIC_NAME } from '../compute/data.js';

const DIGNITY_LABEL = {
  exalted:      { label: 'Exalted',      tone: 'text-[#fff8dd]'  },
  mooltrikona:  { label: 'Mooltrikona',  tone: 'text-[#f5d680]'  },
  own:          { label: 'Own sign',     tone: 'text-[#f5d680]'  },
  debilitated:  { label: 'Debilitated',  tone: 'text-[#ff9a9a]'  },
  neutral:      { label: '—',            tone: 'text-[#9b9bbd]'  },
};

function fmtDeg(d) {
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return `${deg}° ${String(min).padStart(2, '0')}′`;
}

export default function Rashi() {
  const chart = useVedic(s => s.chart);
  const format = useVedic(s => s.chartFormat);
  const setFormat = useVedic(s => s.setChartFormat);
  if (!chart) return null;

  const ChartCmp = format === 'south' ? SouthIndianChart : NorthIndianChart;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Rashi · Janma Kundali</h2>
          <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
            The natal chart in the sidereal zodiac. Lagna ({chart.lagnaSign} · {chart.lagnaSignSa}) sits in House 1; signs follow clockwise. Planet glyphs show dignities — gold for own / mooltrikona, white for exalted, red for debilitated.
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setFormat('north')} className={`btn-ghost ${format === 'north' ? 'active' : ''}`}>North Indian</button>
          <button onClick={() => setFormat('south')} className={`btn-ghost ${format === 'south' ? 'active' : ''}`}>South Indian</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-4">
          <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 flex justify-center">
            <ChartCmp chart={chart} size={420} />
          </div>
          {chart.panchang && <PanchangCard panchang={chart.panchang} />}
          {(chart.arudha || chart.upapada) && <SpecialLagnasCard chart={chart} />}
        </div>

        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 overflow-x-auto">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Grahas</div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[#6d6d88] text-[10.5px] tracking-[0.18em] uppercase">
                <th className="py-1 pr-2">Graha</th>
                <th className="py-1 pr-2">Rashi</th>
                <th className="py-1 pr-2">Bhava</th>
                <th className="py-1 pr-2">Position</th>
                <th className="py-1 pr-2">Nakshatra · Pada</th>
                <th className="py-1 pr-2">Dignity</th>
              </tr>
            </thead>
            <tbody>
              {chart.planets.map(p => {
                const d = DIGNITY_LABEL[p.dignity] || DIGNITY_LABEL.neutral;
                return (
                  <tr key={p.name} className="border-t border-white/5">
                    <td className="py-1.5 pr-2">
                      <span className="text-[#f5d680] mr-1.5">{VEDIC_GLYPH[p.name]}</span>
                      <span className="text-[#e6e6f0]">{p.name}</span>
                      <span className="text-[#6d6d88] ml-1.5 text-[10.5px]">{VEDIC_NAME[p.name]}</span>
                      {p.isVargottama && (
                        <span className="ml-1.5 text-[10px] tracking-[0.15em] uppercase text-[#d8caff]" title="Same sign in D-1 and D-9 — classical strength booster">✦ vargottama</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-[#c8c8dd]">
                      {RASHIS[p.signIdx].glyph} {p.sign}
                    </td>
                    <td className="py-1.5 pr-2 text-[#9b9bbd]">{p.house}</td>
                    <td className="py-1.5 pr-2 text-[#fff8dd] font-mono">{fmtDeg(p.withinDeg)}</td>
                    <td className="py-1.5 pr-2 text-[#9b9bbd]">{p.nakshatra} · {p.pada}</td>
                    <td className={`py-1.5 pr-2 ${d.tone}`}>{d.label}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-white/10">
                <td className="py-1.5 pr-2 text-[#d79b3a] tracking-[0.15em] text-[10.5px] uppercase">Lagna</td>
                <td className="py-1.5 pr-2 text-[#c8c8dd]">{RASHIS[chart.lagnaSignIdx].glyph} {chart.lagnaSign}</td>
                <td className="py-1.5 pr-2 text-[#9b9bbd]">1</td>
                <td className="py-1.5 pr-2 text-[#fff8dd] font-mono">{fmtDeg(chart.lagnaWithinDeg)}</td>
                <td className="py-1.5 pr-2 text-[#9b9bbd]">—</td>
                <td className="py-1.5 pr-2 text-[#9b9bbd]">—</td>
              </tr>
              {chart.upagrahas && (
                <>
                  <UpagraphaRow body={chart.upagrahas.gulika} />
                  <UpagraphaRow body={chart.upagrahas.mandi}  />
                </>
              )}
            </tbody>
          </table>
          {chart.upagrahas && (
            <div className="text-[10.5px] text-[#6d6d88] italic mt-3 leading-snug">
              ✦ Upagrahas — Gulika and Mandi are sensitive points (not bodies) computed from the {chart.upagrahas.isDayBirth ? 'daytime' : 'night'} arc of {chart.upagrahas.weekdayName}, dividing it into eight parts and reading the sidereal Ascendant at part {chart.upagrahas.partNumber}. Read like a malefic graha for fine-grained karmic timing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UpagraphaRow({ body }) {
  if (!body) return null;
  return (
    <tr className="border-t border-white/10 bg-[#0a0a14]">
      <td className="py-1.5 pr-2">
        <span className="text-[#d8caff] mr-1.5">✦</span>
        <span className="text-[#e6e6f0]">{body.name}</span>
        <span className="text-[#6d6d88] ml-1.5 text-[10.5px]">upagraha</span>
      </td>
      <td className="py-1.5 pr-2 text-[#c8c8dd]">{RASHIS[body.signIdx].glyph} {body.sign}</td>
      <td className="py-1.5 pr-2 text-[#9b9bbd]">{body.house ?? '—'}</td>
      <td className="py-1.5 pr-2 text-[#fff8dd] font-mono">
        {(() => {
          const deg = Math.floor(body.withinDeg);
          const min = Math.round((body.withinDeg - deg) * 60);
          return `${deg}° ${String(min).padStart(2,'0')}′`;
        })()}
      </td>
      <td className="py-1.5 pr-2 text-[#9b9bbd]">{body.nakshatra} · {body.pada}</td>
      <td className="py-1.5 pr-2 text-[#9b9bbd]">—</td>
    </tr>
  );
}

function PanchangCard({ panchang }) {
  const rows = [
    ['Vara',      panchang.vara],
    ['Tithi',     `${panchang.tithi.paksha} · ${panchang.tithi.name}`],
    ['Nakshatra', `${panchang.nakshatra.name} · lord ${panchang.nakshatra.lord}`],
    ['Yoga',      panchang.yoga.name],
    ['Karana',    panchang.karana.name],
  ];
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Panchang at birth</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-baseline justify-between border-b border-dashed border-white/5 pb-1">
            <span className="text-[#9b9bbd] italic font-serif">{label}</span>
            <span className="text-[#fff8dd]">{val}</span>
          </div>
        ))}
      </div>
      <div className="text-[10.5px] text-[#6d6d88] italic mt-2 leading-snug">
        The five limbs of the Hindu calendar at your moment of birth — the lunar day, weekday, lunar mansion, sun-moon yoga, and karana.
      </div>
    </div>
  );
}

function SpecialLagnasCard({ chart }) {
  const items = [];
  if (chart.arudha) items.push({
    label: 'Arudha Lagna',
    sign: chart.arudha.sign,
    house: chart.arudha.house,
    blurb: 'How the world sees you — the projected image of self.',
  });
  if (chart.upapada) items.push({
    label: 'Upapada Lagna',
    sign: chart.upapada.sign,
    house: chart.upapada.house,
    blurb: 'Indicator of long-term partnership and the spouse\'s image.',
  });
  if (!items.length) return null;
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Special Lagnas (Jaimini)</div>
      <div className="space-y-3 text-[12.5px]">
        {items.map(it => (
          <div key={it.label} className="border-b border-dashed border-white/5 pb-2 last:border-b-0">
            <div className="flex items-baseline justify-between">
              <span className="text-[#9b9bbd] italic font-serif">{it.label}</span>
              <span className="text-[#fff8dd] font-serif">{it.sign} <span className="text-[#9b9bbd] text-[11px]">· House {it.house}</span></span>
            </div>
            <div className="text-[10.5px] text-[#6d6d88] italic leading-snug mt-1">{it.blurb}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
