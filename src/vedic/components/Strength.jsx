// Vedic — Strength mode (Ashtakavarga).
// Renders the BAV per planet × SAV per house bindu table with simple
// traffic-light colouring. SAV totals across the 12 houses sum to ~337
// for any chart; per-house values typically fall between 22 (stressed)
// and 40 (well-supported).

import React from 'react';
import { useVedic } from '../store.js';
import { RASHIS, VEDIC_GLYPH } from '../compute/data.js';

// SAV traffic light. Classical thresholds (Parashara):
//   ≥ 30 — strongly supportive
//   25-29 — neutral / mixed
//   ≤ 24 — stressed / depletive
function savColour(v) {
  if (v >= 30) return '#9adfa8';
  if (v >= 25) return '#f5d680';
  return '#ff9a9a';
}

// BAV cell shading by bindu count out of 8 — each cell can range 0..8 in
// theory (a beneficiary receives a max of 8 bindus in any one house, one
// from each of the 7 contributors + Lagna). Most cells sit at 2-5.
function bavOpacity(v) { return Math.min(1, 0.08 + 0.11 * v); }

export default function Strength() {
  const chart = useVedic(s => s.chart);
  if (!chart || !chart.ashtakavarga) return null;
  const { rows, beneficiaries, minSAV, maxSAV, totalSAV } = chart.ashtakavarga;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto space-y-5">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Ashtakavarga · Bindu Strength</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          The Parashari "eight-fold strength" system. Each of the seven classical grahas (and the Lagna as the eighth contributor) bestows <em className="text-[#f5d680] font-serif">bindus</em> — auspicious points — on certain houses counted from where it sits. The per-planet table is <em className="text-[#fff8dd] font-serif">Bhinnashtakavarga</em>; the column-totals are <em className="text-[#fff8dd] font-serif">Sarvashtakavarga</em> — houses with high SAV are read as well-supported, low SAV as stressed.
        </p>
      </header>

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[#6d6d88] text-[10.5px] tracking-[0.18em] uppercase">
              <th className="py-1 pr-3">House</th>
              <th className="py-1 pr-3">Sign</th>
              {beneficiaries.map(b => (
                <th key={b} className="py-1 pr-2 text-center" title={b}>
                  <span className="text-[#f5d680] mr-0.5">{VEDIC_GLYPH[b]}</span>
                  <span className="text-[10px]">{b.slice(0, 3)}</span>
                </th>
              ))}
              <th className="py-1 pl-3 text-right">SAV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.house} className="border-t border-white/5">
                <td className="py-1.5 pr-3 text-[#9b9bbd] font-mono">H{r.house}</td>
                <td className="py-1.5 pr-3 text-[#c8c8dd]">{r.signGlyph} {r.signName}</td>
                {beneficiaries.map(b => {
                  const v = r.bav[b];
                  return (
                    <td
                      key={b}
                      className="py-1.5 pr-2 text-center font-mono"
                      style={{ background: `rgba(245,214,128,${bavOpacity(v).toFixed(3)})` }}
                    >
                      {v}
                    </td>
                  );
                })}
                <td
                  className="py-1.5 pl-3 text-right font-mono font-semibold"
                  style={{ color: savColour(r.sav) }}
                >
                  {r.sav}
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/15 text-[10.5px] tracking-[0.18em] uppercase text-[#6d6d88]">
              <td className="py-2 pr-3" colSpan={2}>Per-planet total</td>
              {beneficiaries.map(b => (
                <td key={b} className="py-2 pr-2 text-center font-mono text-[#9b9bbd]">
                  {rows.reduce((s, r) => s + r.bav[b], 0)}
                </td>
              ))}
              <td className="py-2 pl-3 text-right font-mono text-[#f5d680]">{totalSAV}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Strongest house" value={`H${rows.find(r => r.sav === maxSAV)?.house ?? '—'} · SAV ${maxSAV}`} tone="#9adfa8" />
        <Stat label="Weakest house"   value={`H${rows.find(r => r.sav === minSAV)?.house ?? '—'} · SAV ${minSAV}`} tone="#ff9a9a" />
        <Stat label="Total SAV"       value={`${totalSAV} / 337 expected`} tone="#f5d680" />
      </div>

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
        <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-2">How to read</div>
        <div className="text-[12px] text-[#c8c8dd] italic font-serif leading-relaxed space-y-2">
          <p>Bindus are how Parashara measured "supportive light" on a house. Each cell = number of contributors that bestow a bindu on that house for that planet's affairs. A planet's own BAV row tells you which houses make ITS karaka (significations) flourish; the column SAV gives the overall vitality of the house.</p>
          <p>SAV ≥ 30 is strongly supportive — actions and significations of that house tend to ripen. SAV ≤ 24 is stressed — that house's affairs require effort. Between is neutral.</p>
          <p>The grand total SAV of any natal chart sums to <span className="text-[#f5d680]">337</span> by construction (BPHS Ch. 65). If your chart's totalSAV differs, the bindu table has a bug — flag it.</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-3">
      <div className="text-[10px] tracking-[0.22em] uppercase text-[#9b9bbd]">{label}</div>
      <div className="font-serif text-[15px]" style={{ color: tone }}>{value}</div>
    </div>
  );
}
