// Vedic — nakshatras panel.
// Each body's lunar mansion + pada + the nakshatra's deity / symbol /
// keyword. Janma Nakshatra (Moon's nakshatra) is highlighted because it
// seeds the Vimshottari dasha sequence.

import React from 'react';
import { useVedic } from '../store.js';
import { NAKSHATRAS, VEDIC_GLYPH } from '../compute/data.js';

export default function Nakshatras() {
  const chart = useVedic(s => s.chart);
  if (!chart) return null;

  const moon = chart.planets.find(p => p.name === 'Moon');

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto">
      <header className="mb-4">
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Nakshatras · Lunar Mansions</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          The 27 nakshatras divide the sidereal zodiac into 13°20′ stations, each with its own deity, symbol, and ruling planet. Your <strong className="text-[#f5d680]">Janma Nakshatra</strong> — the nakshatra of your natal Moon — anchors your Vimshottari dasha and is read as the deepest emotional signature.
        </p>
      </header>

      {moon && (
        <div className="bg-[#0c0c18] border border-[#f5d680]/30 rounded-md p-5 mb-5">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-1">Janma Nakshatra</div>
          <div className="flex items-baseline gap-3">
            <div className="text-[28px] font-serif text-[#f5d680]">{moon.nakshatra}</div>
            <div className="text-[16px] text-[#fff8dd]">· Pada {moon.pada}</div>
            <div className="text-[12px] text-[#9b9bbd] ml-auto">Lord: <span className="text-[#f5d680]">{moon.nakshatraLord}</span></div>
          </div>
          <NakshatraDetail idx={moon.nakshatraIndex} />
        </div>
      )}

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 overflow-x-auto">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Every body</div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[#6d6d88] text-[10.5px] tracking-[0.18em] uppercase">
              <th className="py-1 pr-2">Graha</th>
              <th className="py-1 pr-2">Nakshatra</th>
              <th className="py-1 pr-2">Pada</th>
              <th className="py-1 pr-2">Lord</th>
              <th className="py-1 pr-2">Deity · Symbol</th>
              <th className="py-1 pr-2">Keyword</th>
            </tr>
          </thead>
          <tbody>
            {chart.planets.map(p => {
              const nak = NAKSHATRAS[p.nakshatraIndex];
              const isJanma = p.name === 'Moon';
              return (
                <tr key={p.name} className={`border-t border-white/5 ${isJanma ? 'bg-[#f5d680]/[0.03]' : ''}`}>
                  <td className="py-1.5 pr-2">
                    <span className="text-[#f5d680] mr-1.5">{VEDIC_GLYPH[p.name]}</span>
                    <span className="text-[#e6e6f0]">{p.name}</span>
                  </td>
                  <td className="py-1.5 pr-2 text-[#fff8dd]">{p.nakshatra}</td>
                  <td className="py-1.5 pr-2 text-[#9b9bbd]">{p.pada}</td>
                  <td className="py-1.5 pr-2 text-[#f5d680]">{p.nakshatraLord}</td>
                  <td className="py-1.5 pr-2 text-[#9b9bbd]">{nak.deity} · {nak.symbol}</td>
                  <td className="py-1.5 pr-2 text-[#c8c8dd] italic">{nak.keyword}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NakshatraDetail({ idx }) {
  const n = NAKSHATRAS[idx];
  if (!n) return null;
  return (
    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-dashed border-white/10 text-[12px]">
      <div><div className="text-[10px] tracking-[0.18em] uppercase text-[#6d6d88]">Deity</div><div className="text-[#e6e6f0]">{n.deity}</div></div>
      <div><div className="text-[10px] tracking-[0.18em] uppercase text-[#6d6d88]">Symbol</div><div className="text-[#e6e6f0]">{n.symbol}</div></div>
      <div><div className="text-[10px] tracking-[0.18em] uppercase text-[#6d6d88]">Keyword</div><div className="text-[#fff8dd] italic">{n.keyword}</div></div>
    </div>
  );
}
