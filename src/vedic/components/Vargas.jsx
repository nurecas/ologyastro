// Vedic — Vargas (divisional charts) mode.
// Picker for one of the 16 standard vargas (D-1 through D-60). The chart
// renders in the user's preferred format (North or South Indian) using the
// same components as the Rasi mode. Vargottama planets get a small ✦ tag.

import React, { useMemo, useState } from 'react';
import { useVedic } from '../store.js';
import NorthIndianChart from './NorthIndianChart.jsx';
import SouthIndianChart from './SouthIndianChart.jsx';
import { computeVarga, VARGA_INFO } from '../compute/vargas.js';
import { RASHIS, VEDIC_GLYPH } from '../compute/data.js';

const DIGNITY_TINT = {
  exalted:     'text-[#fff8dd]',
  own:         'text-[#f5d680]',
  debilitated: 'text-[#ff9a9a]',
  neutral:     'text-[#c8c8dd]',
};

export default function Vargas() {
  const chart  = useVedic(s => s.chart);
  const format = useVedic(s => s.chartFormat);
  const setFormat = useVedic(s => s.setChartFormat);
  const [divisor, setDivisor] = useState(9);   // default to Navamsa — most consulted

  const varga = useMemo(() => chart ? computeVarga(chart, divisor) : null, [chart, divisor]);
  if (!chart || !varga) return null;

  const ChartCmp = format === 'south' ? SouthIndianChart : NorthIndianChart;
  const info = varga.info;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto space-y-5">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Vargas · Divisional Charts</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          Each varga divides every sign into smaller parts and reads the resulting placement as a finer-grained chart for one specific area of life. The Navamsa (D-9) and Dasamsa (D-10) are the most consulted after the Rasi (D-1). A planet that occupies the same sign in both D-1 and D-9 is called <strong className="text-[#f5d680]">Vargottama</strong> — it gains classical strength.
        </p>
      </header>

      {/* Varga picker — pills with divisor + abbreviation */}
      <section className="bg-[#0c0c18] border border-white/10 rounded-md p-3">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Choose a varga</div>
        <div className="flex flex-wrap gap-1.5">
          {VARGA_INFO.map(v => {
            const active = divisor === v.d;
            const major  = v.importance === 'major';
            return (
              <button
                key={v.d}
                onClick={() => setDivisor(v.d)}
                title={`${v.name} · ${v.area}`}
                className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                  active
                    ? 'bg-[#f5d680]/15 border-[#f5d680]/60 text-[#f5d680]'
                    : major
                    ? 'border-[#f5d680]/30 text-[#fff8dd] hover:bg-[#f5d680]/[0.04]'
                    : 'border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]'
                }`}
              >
                D-{v.d} · {v.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active varga subtitle + format toggle */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="font-serif text-[18px] text-[#fff8dd]">
            D-{info.d} · {info.name} <span className="text-[#9b9bbd] text-[14px] italic">({info.sa})</span>
          </div>
          <div className="text-[12px] text-[#9b9bbd] italic">{info.area}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setFormat('north')} className={`btn-ghost ${format === 'north' ? 'active' : ''}`}>North Indian</button>
          <button onClick={() => setFormat('south')} className={`btn-ghost ${format === 'south' ? 'active' : ''}`}>South Indian</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 flex justify-center">
          <ChartCmp chart={varga} size={420} />
        </div>

        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 overflow-x-auto">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">
            Grahas in D-{info.d} · Lagna {RASHIS[varga.lagnaSignIdx].glyph} {varga.lagnaSign}
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[#6d6d88] text-[10.5px] tracking-[0.18em] uppercase">
                <th className="py-1 pr-2">Graha</th>
                <th className="py-1 pr-2">Rashi</th>
                <th className="py-1 pr-2">Bhava</th>
                <th className="py-1 pr-2">Dignity</th>
                <th className="py-1 pr-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {varga.planets.map(p => (
                <tr key={p.name} className="border-t border-white/5">
                  <td className="py-1.5 pr-2">
                    <span className="text-[#f5d680] mr-1.5">{VEDIC_GLYPH[p.name]}</span>
                    <span className="text-[#e6e6f0]">{p.name}</span>
                  </td>
                  <td className="py-1.5 pr-2 text-[#c8c8dd]">{RASHIS[p.signIdx].glyph} {p.sign}</td>
                  <td className="py-1.5 pr-2 text-[#9b9bbd]">{p.house}</td>
                  <td className={`py-1.5 pr-2 ${DIGNITY_TINT[p.dignity] || 'text-[#9b9bbd]'}`}>
                    {p.dignity === 'neutral' ? '—' : (p.dignity || '—')}
                  </td>
                  <td className="py-1.5 pr-2 text-[#d8caff] text-[11px]">
                    {p.isVargottama && divisor === 9 ? '✦ Vargottama' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {divisor === 9 && (
            <div className="text-[10.5px] text-[#6d6d88] italic mt-3 leading-snug">
              ✦ Vargottama = the planet sits in the same sign in D-1 and D-9. Classical strength booster — the body and the soul are aligned.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
