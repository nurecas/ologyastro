// Vedic — Gochara (transits) mode.
// Reads the current sky against the natal Moon and Lagna and tags each
// transiting graha favourable / mixed / challenging by classical gochara
// houses (BPHS Ch. 41). Probe-able by date — the user picks a moment and
// sees the planetary climate at that moment.

import React, { useMemo, useState } from 'react';
import { useVedic } from '../store.js';
import { computeGochara } from '../compute/gochara.js';
import { RASHIS, VEDIC_GLYPH } from '../compute/data.js';

const FLAVOUR_TINT = {
  favourable:  { color: '#9adfa8', label: 'Favourable'  },
  mixed:       { color: '#f5d680', label: 'Mixed'       },
  challenging: { color: '#ff9a9a', label: 'Challenging' },
};

const SATURN_TAG_LABEL = {
  sade_sati_phase1: 'Sade Sati · Setting Phase',
  sade_sati_peak:   'Sade Sati · Peak Phase',
  sade_sati_phase3: 'Sade Sati · Rising Phase',
  ashtama_shani:    'Ashtama Shani (Saturn 8th from Moon)',
  ardha_ashtama:    'Ardha-Ashtama Shani (Saturn 4th from Moon)',
};

// ISO local input <-> Date (no tz adjustment — these are wall-clock probes,
// the user is asking "what's happening at this clock moment NOW".
function dateToLocalInput(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Gochara() {
  const chart = useVedic(s => s.chart);
  const [probe, setProbe] = useState(() => new Date());
  const [probeStr, setProbeStr] = useState(() => dateToLocalInput(new Date()));

  const result = useMemo(
    () => chart ? computeGochara(chart, { now: probe }) : null,
    [chart, probe],
  );

  if (!chart) return null;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto space-y-5">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Gochara · Transits</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          The current sky read against this chart's natal Moon (Chandra Lagna — the dominant frame in classical gochara) and natal Lagna. Each transiting graha is tagged favourable, mixed, or challenging by BPHS Ch. 41 rules. Saturn's transit is also flagged for Sade Sati and Ashtama Shani when applicable.
        </p>
      </header>

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 flex flex-wrap items-center gap-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Probe date</div>
          <input
            type="datetime-local"
            value={probeStr}
            onChange={e => {
              setProbeStr(e.target.value);
              const d = new Date(e.target.value);
              if (!Number.isNaN(d.getTime())) setProbe(d);
            }}
            className="form-input text-[12.5px] py-1.5"
          />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => { const d = new Date(); setProbe(d); setProbeStr(dateToLocalInput(d)); }}
                  className="btn-ghost text-[11px]">Now</button>
          <button onClick={() => { const d = new Date(probe.getTime() - 30 * 86400000); setProbe(d); setProbeStr(dateToLocalInput(d)); }}
                  className="btn-ghost text-[11px]">−30d</button>
          <button onClick={() => { const d = new Date(probe.getTime() + 30 * 86400000); setProbe(d); setProbeStr(dateToLocalInput(d)); }}
                  className="btn-ghost text-[11px]">+30d</button>
          <button onClick={() => { const d = new Date(probe.getTime() + 365 * 86400000); setProbe(d); setProbeStr(dateToLocalInput(d)); }}
                  className="btn-ghost text-[11px]">+1y</button>
        </div>
        {result && (
          <div className="ml-auto text-[11px] text-[#9b9bbd]">
            Reference: Moon in <span className="text-[#fff8dd]">{RASHIS[result.refMoonSignIdx].en}</span> · Lagna in <span className="text-[#fff8dd]">{RASHIS[result.refLagnaSignIdx].en}</span>
          </div>
        )}
      </div>

      {!result && (
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-5 text-[12.5px] text-[#9b9bbd] italic">
          Loading transit positions… (Swiss Ephemeris is initialising)
        </div>
      )}

      {result && (
        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[#6d6d88] text-[10.5px] tracking-[0.18em] uppercase">
                <th className="py-1 pr-2">Graha</th>
                <th className="py-1 pr-2">Now in</th>
                <th className="py-1 pr-2">From Moon</th>
                <th className="py-1 pr-2">From Lagna</th>
                <th className="py-1 pr-2">Reading</th>
                <th className="py-1 pr-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {result.transits.map(t => {
                const fl = FLAVOUR_TINT[t.flavour];
                return (
                  <tr key={t.name} className="border-t border-white/5">
                    <td className="py-1.5 pr-2">
                      <span className="text-[#f5d680] mr-1.5">{VEDIC_GLYPH[t.name]}</span>
                      <span>{t.name}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-[#c8c8dd]">{t.signGlyph} {t.signName}</td>
                    <td className="py-1.5 pr-2 text-[#9b9bbd] font-mono">H{t.houseFromMoon}</td>
                    <td className="py-1.5 pr-2 text-[#9b9bbd] font-mono">H{t.houseFromLagna}</td>
                    <td className="py-1.5 pr-2 text-[10.5px] tracking-[0.16em] uppercase font-mono" style={{ color: fl.color }}>
                      {fl.label}
                    </td>
                    <td className="py-1.5 pr-2 text-[11px] italic text-[#d8caff]">
                      {t.saturnTag ? SATURN_TAG_LABEL[t.saturnTag] : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
        <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-2">Classical favourable houses (from Moon or Lagna)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-[11.5px] text-[#c8c8dd]">
          <div><span className="text-[#f5d680]">Sun</span>: 3, 6, 10, 11</div>
          <div><span className="text-[#f5d680]">Moon</span>: 1, 3, 6, 7, 10, 11</div>
          <div><span className="text-[#f5d680]">Mars</span>: 3, 6, 11</div>
          <div><span className="text-[#f5d680]">Mercury</span>: 2, 4, 6, 8, 10, 11</div>
          <div><span className="text-[#f5d680]">Jupiter</span>: 2, 5, 7, 9, 11</div>
          <div><span className="text-[#f5d680]">Venus</span>: 1-5, 8, 9, 11, 12</div>
          <div><span className="text-[#f5d680]">Saturn</span>: 3, 6, 11</div>
          <div><span className="text-[#f5d680]">Rahu / Ketu</span>: 3, 6, 10, 11</div>
        </div>
        <div className="text-[10.5px] text-[#6d6d88] italic mt-2 leading-snug">
          A reading is favourable when the transit house is in the planet's favourable list FROM BOTH the Moon and the Lagna; mixed if from only one; challenging otherwise. Saturn's Sade Sati / Ashtama overrides override the simple lookup.
        </div>
      </div>
    </div>
  );
}
