// Vedic — Vimshottari dasha timeline.
// Shows the running mahadasha + its antardashas as a horizontal ribbon,
// plus the upcoming mahadashas. Each row in the antar table marks the
// currently-running antardasha.

import React, { useMemo, useState } from 'react';
import { useVedic } from '../store.js';
import { antarSequence, currentMaha, dashaAtDate } from '../compute/dasha.js';
import { VEDIC_GLYPH } from '../compute/data.js';
import { describeDashaCombo } from '../compute/dashaInterpretation.js';

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PLANET_TINT = {
  Sun: '#f5d680', Moon: '#cfd8ff', Mars: '#ff8866', Mercury: '#9adfa8',
  Jupiter: '#ffd07a', Venus: '#ffaedb', Saturn: '#7f8aa6',
  Rahu: '#a07cff', Ketu: '#7ad0c2',
};

export default function Dasha() {
  const chart = useVedic(s => s.chart);
  // Probed date drives every "current" section — date-probe cards, the
  // ribbon's "now" marker, the antardasha table heading. Defaults to
  // today; changing it surveys the whole tree at any moment.
  const [probeDate, setProbeDate] = useState(() => new Date());

  if (!chart || !chart.dasha) {
    return (
      <div className="p-6 text-[#9b9bbd] italic text-center">
        Dasha unavailable — Swiss ephemeris is required for the Moon's sidereal position.
      </div>
    );
  }

  const { sequence } = chart.dasha;
  const cur = currentMaha(sequence, probeDate);
  const antarList = antarSequence(cur);

  // Window covering all the displayed mahadashas, used to scale the ribbon.
  const tStart = sequence[0].start.getTime();
  const tEnd   = sequence[sequence.length - 1].end.getTime();
  const total  = tEnd - tStart;
  const xOf = (t) => ((t - tStart) / total) * 100;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto space-y-6">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Vimshottari Dasha</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          A 120-year cycle of planetary periods seeded from your Janma Nakshatra ({chart.dasha.nakshatra}, lord <span className="text-[#f5d680]">{chart.dasha.runningLord}</span>). Each Mahadasha colours an entire stretch of life; antardashas (sub-periods) refine the texture month-by-month.
        </p>
      </header>

      {/* Date probe — pick any moment in life and see Maha/Antar/Pratyantar.
          Below sections (lifetime ribbon, antardasha table) follow this
          date so everything stays in sync with the probe. */}
      <DateProbe chart={chart} date={probeDate} setDate={setProbeDate} />

      {/* Ribbon — all mahadashas across life. The vertical marker tracks
          the date probe (defaults to today). */}
      <div>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Lifetime — all Mahadashas</div>
        <div className="relative h-12 bg-black/30 rounded border border-white/5 overflow-hidden">
          {sequence.map((m, i) => {
            const left = xOf(m.start.getTime());
            const width = xOf(m.end.getTime()) - left;
            const isCur = m.start <= probeDate && m.end > probeDate;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex items-center justify-center border-r border-black/40 text-[10px] font-mono"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: PLANET_TINT[m.lord] + (isCur ? '38' : '18'),
                  color: isCur ? '#fff8dd' : 'rgba(230,230,240,0.7)',
                  borderTop: isCur ? `2px solid ${PLANET_TINT[m.lord]}` : 'none',
                }}
                title={`${m.lord} · ${fmtDate(m.start)} → ${fmtDate(m.end)} (${m.years.toFixed(1)} yrs)`}
              >
                {width > 4 ? m.lord : ''}
              </div>
            );
          })}
          <div
            className="absolute top-0 bottom-0 w-px bg-[#f5d680]"
            style={{ left: `${xOf(probeDate.getTime())}%`, boxShadow: '0 0 6px rgba(245,214,128,0.8)' }}
            title={`Probe date · ${fmtDate(probeDate)}`}
          />
        </div>
      </div>

      {/* Antardashas of the current Mahadasha */}
      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">
          Antardashas inside {cur.lord}
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[#6d6d88] text-[10.5px] tracking-[0.18em] uppercase">
              <th className="py-1 pr-2">Antar</th>
              <th className="py-1 pr-2">From</th>
              <th className="py-1 pr-2">To</th>
              <th className="py-1 pr-2 text-right">Years</th>
            </tr>
          </thead>
          <tbody>
            {antarList.map(a => {
              const isCur = a.start <= probeDate && a.end > probeDate;
              return (
                <tr key={a.lord} className={`border-t border-white/5 ${isCur ? 'bg-[#f5d680]/[0.05] text-[#fff8dd]' : 'text-[#c8c8dd]'}`}>
                  <td className="py-1.5 pr-2">
                    <span className="mr-1.5" style={{ color: PLANET_TINT[a.lord] }}>{VEDIC_GLYPH[a.lord]}</span>
                    {a.lord}{isCur ? ' · running' : ''}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[11.5px]">{fmtDate(a.start)}</td>
                  <td className="py-1.5 pr-2 font-mono text-[11.5px]">{fmtDate(a.end)}</td>
                  <td className="py-1.5 pr-2 text-right text-[#9b9bbd] font-mono">{a.years.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date Probe — pick any date and read the running Maha / Antar / Pratyantar.
// "Today" is the default; back/forward buttons step by 1 month / 1 year.
// ---------------------------------------------------------------------------
function DateProbe({ chart, date, setDate }) {
  const probe = useMemo(() => dashaAtDate(chart.dasha, date), [chart, date]);
  const isNow = Math.abs(date.getTime() - Date.now()) < 60000;

  const step = (deltaMs) => setDate(d => new Date(d.getTime() + deltaMs));
  const onPick = (e) => {
    const v = e.target.value;
    if (!v) return;
    const d = new Date(v + 'T12:00:00Z');
    if (!Number.isNaN(d.getTime())) setDate(d);
  };
  const toIso = (d) => {
    const y = d.getUTCFullYear(), m = String(d.getUTCMonth()+1).padStart(2,'0'), dd = String(d.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };

  if (!probe) {
    return (
      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 text-[#9b9bbd] italic">
        Date out of range for this dasha tree.
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c18] border border-[#f5d680]/30 rounded-md p-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd]">Dasha at any date</div>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => step(-365 * 86400000)} className="btn-ghost text-[11px] px-2" title="−1 year">«</button>
          <button onClick={() => step(-30 * 86400000)}  className="btn-ghost text-[11px] px-2" title="−1 month">‹</button>
          <input type="date" value={toIso(date)} onChange={onPick}
                 className="form-input py-1 px-2 text-[12px]" style={{ colorScheme: 'dark', width: 150 }} />
          <button onClick={() => step(30 * 86400000)}   className="btn-ghost text-[11px] px-2" title="+1 month">›</button>
          <button onClick={() => step(365 * 86400000)}  className="btn-ghost text-[11px] px-2" title="+1 year">»</button>
          <button onClick={() => setDate(new Date())} className={`btn-ghost text-[10px] tracking-[0.18em] uppercase ml-1 ${isNow ? 'active' : ''}`}>Now</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DashaLevelCard label="Mahadasha" lord={probe.maha.lord} start={probe.maha.start} end={probe.maha.end} pct={probe.maha.elapsedPct} />
        {probe.antar && (
          <DashaLevelCard label="Antardasha" lord={probe.antar.lord} start={probe.antar.start} end={probe.antar.end} pct={probe.antar.elapsedPct} />
        )}
        {probe.pratyantar && (
          <DashaLevelCard label="Pratyantar" lord={probe.pratyantar.lord} start={probe.pratyantar.start} end={probe.pratyantar.end} pct={probe.pratyantar.elapsedPct} />
        )}
      </div>

      <ProbeDescription date={date} probe={probe} />
    </div>
  );
}

// One-line tonal hint composed from each level's planet "essence" (see
// compute/dashaInterpretation.js). Templated, not opinionated — the LLM
// export carries the full chart and can write deeper interpretation.
function ProbeDescription({ date, probe }) {
  const desc = describeDashaCombo(probe.maha, probe.antar, probe.pratyantar);
  return (
    <div className="border-t border-dashed border-white/10 pt-3 space-y-1.5">
      <div className="text-[11px] text-[#9b9bbd]">
        On <span className="text-[#fff8dd]">{fmtDate(date)}</span> the running combination is{' '}
        <span style={{ color: PLANET_TINT[probe.maha.lord] }} className="font-mono">{probe.maha.lord}</span>
        {probe.antar && <> / <span style={{ color: PLANET_TINT[probe.antar.lord] }} className="font-mono">{probe.antar.lord}</span></>}
        {probe.pratyantar && <> / <span style={{ color: PLANET_TINT[probe.pratyantar.lord] }} className="font-mono">{probe.pratyantar.lord}</span></>}.
      </div>
      {desc && (
        <div className="text-[12.5px] text-[#c8c8dd] leading-relaxed font-serif italic">
          <span className="text-[#f5d680] not-italic font-medium">{desc.headline}</span>
          {' — '}
          {desc.body}
        </div>
      )}
    </div>
  );
}

function DashaLevelCard({ label, lord, start, end, pct }) {
  const tint = PLANET_TINT[lord] || '#f5d680';
  return (
    <div className="bg-black/30 border border-white/5 rounded-md p-3">
      <div className="text-[10px] tracking-[0.22em] uppercase text-[#6d6d88] mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-[20px] font-serif" style={{ color: tint }}>{VEDIC_GLYPH[lord]}</span>
        <span className="text-[18px] font-serif text-[#fff8dd]">{lord}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full" style={{ width: `${(pct * 100).toFixed(1)}%`, background: tint }} />
      </div>
      <div className="flex items-baseline justify-between mt-1.5 text-[10.5px] font-mono">
        <span className="text-[#9b9bbd]">{fmtDate(start)}</span>
        <span className="text-[#6d6d88]">{(pct * 100).toFixed(0)}% done</span>
        <span className="text-[#9b9bbd]">{fmtDate(end)}</span>
      </div>
    </div>
  );
}
