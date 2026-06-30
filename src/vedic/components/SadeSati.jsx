// Sade Sati mode — current state at top, lifetime ribbon, every Sade Sati
// period with phase boundaries, plus Ashtama Shani (8th from Moon) and
// Ardha Ashtama (4th from Moon) periods.

import React, { useMemo } from 'react';
import { useVedic } from '../store.js';
import { computeSaturnPeriods } from '../compute/sadeSati.js';
import { RASHIS } from '../compute/data.js';

function fmt(d) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
function yearsBetween(a, b) {
  return ((b.getTime() - a.getTime()) / (365.25 * 86400000));
}

export default function SadeSati() {
  const chart = useVedic(s => s.chart);
  const data = useMemo(() => chart ? computeSaturnPeriods(chart) : null, [chart]);

  if (!chart || !data) {
    return (
      <div className="p-6 text-[#9b9bbd] italic text-center">
        Saturn timeline unavailable — sidereal Saturn position requires Swiss ephemeris.
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto space-y-6">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Sade Sati & Saturn periods</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          Sade Sati is Saturn's ~7.5 year transit through three signs — the
          sign before your natal Moon, the Moon's own sign, and the sign
          after — read in tradition as a period of testing, restructuring,
          and earned maturity. Your natal Moon is in <strong className="text-[#f5d680]">{data.moonSignName}</strong>.
        </p>
      </header>

      {/* Current state — the most-asked question */}
      <CurrentState data={data} now={now} />

      {/* Sade Sati timeline */}
      <section>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Every Sade Sati in your lifetime · {data.sadeSati.length}</div>
        {data.sadeSati.length === 0 ? (
          <div className="bg-[#0c0c18] border border-white/10 rounded-md p-5 text-[12.5px] text-[#9b9bbd] italic">
            No Sade Sati period in the computed lifetime window.
          </div>
        ) : (
          <div className="space-y-3">
            {data.sadeSati.map((p, i) => {
              const isCurrent = data.currentSadeSati && p.start.getTime() === data.currentSadeSati.start.getTime();
              const isPast = p.end < now;
              return (
                <SadeSatiCard
                  key={i}
                  index={i + 1}
                  period={p}
                  status={isCurrent ? 'current' : isPast ? 'past' : 'future'}
                  now={now}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Ashtama Shani (8th from Moon) — mini-Sade-Sati */}
      <section>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Ashtama Shani · Saturn in the 8th from Moon</div>
        <div className="text-[11.5px] text-[#9b9bbd] mb-3 leading-snug">
          A 2.5-year period — read as one of Saturn's three "testing transits" alongside the central Sade Sati. The 8th house from Moon is the house of upheaval and depth; Saturn's passage through it asks for sustained inner work.
        </div>
        <PeriodList periods={data.ashtamaShani} current={data.currentAshtama} now={now} accent="#d79b3a" />
      </section>

      <section>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Ardha Ashtama Shani · Saturn in the 4th from Moon</div>
        <div className="text-[11.5px] text-[#9b9bbd] mb-3 leading-snug">
          Another 2.5-year stretch — the 4th from Moon is roots, home, mother. Saturn through it tests one's foundation. Often surfaces as restructuring of family or living situation.
        </div>
        <PeriodList periods={data.ardhaAshtamaShani} current={data.currentArdha} now={now} accent="#d79b3a" />
      </section>
    </div>
  );
}

function CurrentState({ data, now }) {
  if (data.currentSadeSati) {
    const sub = data.currentSubPhase;
    const totalYrs = yearsBetween(data.currentSadeSati.start, data.currentSadeSati.end);
    const elapsedYrs = yearsBetween(data.currentSadeSati.start, now);
    const pct = totalYrs > 0 ? Math.max(0, Math.min(1, elapsedYrs / totalYrs)) : 0;
    return (
      <div className="bg-[#0c0c18] border border-[#f5d680]/40 rounded-md p-5">
        <div className="flex items-baseline gap-3 mb-2">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd]">Right now</div>
          <div className="font-serif text-[18px] text-[#fff8dd]">In Sade Sati</div>
          {sub && <div className="text-[12px] text-[#d79b3a] italic">— {sub.label}</div>}
        </div>
        <div className="grid grid-cols-3 gap-3 text-[12px]">
          <Stat label="Started"  value={fmt(data.currentSadeSati.start)} />
          <Stat label="Ends"     value={fmt(data.currentSadeSati.end)} />
          <Stat label="Elapsed"  value={`${elapsedYrs.toFixed(1)} of ${totalYrs.toFixed(1)} yrs`} />
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#d79b3a] to-[#f5d680]" style={{ width: `${(pct * 100).toFixed(1)}%` }} />
        </div>
      </div>
    );
  }
  // Not in Sade Sati — find the nearest past + nearest future.
  const past = [...data.sadeSati].reverse().find(p => p.end < now);
  const future = data.sadeSati.find(p => p.start > now);
  return (
    <div className="bg-[#0c0c18] border border-[#9adfa8]/30 rounded-md p-5">
      <div className="flex items-baseline gap-3 mb-2">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd]">Right now</div>
        <div className="font-serif text-[18px] text-[#9adfa8]">Not in Sade Sati</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        {past && <Stat label="Last Sade Sati ended" value={fmt(past.end)} />}
        {future && <Stat label="Next Sade Sati begins" value={fmt(future.start)} />}
        {!past && !future && <Stat label="No Sade Sati in the computed window" value="—" />}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.18em] uppercase text-[#6d6d88]">{label}</div>
      <div className="text-[14px] text-[#fff8dd] font-mono mt-0.5">{value}</div>
    </div>
  );
}

function SadeSatiCard({ index, period, status, now }) {
  const ringTone =
    status === 'current' ? 'border-[#f5d680]/60 bg-[#f5d680]/[0.04]'
    : status === 'past'  ? 'border-white/5 opacity-70'
    : 'border-white/10';
  const totalYrs = yearsBetween(period.start, period.end);
  return (
    <div className={`bg-[#0c0c18] border rounded-md p-4 ${ringTone}`}>
      <div className="flex items-baseline gap-3 mb-2">
        <div className="font-serif text-[16px] text-[#fff8dd]">Sade Sati {index}</div>
        <div className="text-[10px] tracking-[0.18em] uppercase font-mono"
             style={{ color: status === 'current' ? '#f5d680' : status === 'past' ? '#6d6d88' : '#9b9bbd' }}>
          {status}
        </div>
        <div className="ml-auto text-[12px] font-mono text-[#9b9bbd]">
          {fmt(period.start)} → {fmt(period.end)} · {totalYrs.toFixed(1)} yrs
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {period.phases.map((ph, i) => {
          const isCurPhase = ph.start && ph.end && ph.start <= now && ph.end >= now;
          return (
            <div key={i} className={`bg-black/30 rounded-md px-3 py-2 border-l-2 ${isCurPhase ? 'border-[#f5d680]' : 'border-white/10'}`}>
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#9b9bbd] leading-tight">{ph.label.split(' · ')[0]}</div>
              <div className="text-[12px] text-[#fff8dd] mt-0.5">Saturn in {ph.signName}</div>
              <div className="text-[10.5px] text-[#9b9bbd] font-mono mt-1">{fmt(ph.start)} → {fmt(ph.end)}</div>
              {isCurPhase && <div className="text-[10px] text-[#f5d680] tracking-[0.15em] uppercase mt-0.5">running now</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodList({ periods, current, now, accent }) {
  if (!periods?.length) {
    return (
      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 text-[12.5px] text-[#9b9bbd] italic">
        No periods detected in the computed window.
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {periods.map((p, i) => {
        const isCur = current && p.start.getTime() === current.start.getTime();
        const isPast = p.end < now;
        const isFuture = p.start > now;
        const cls = isCur
          ? `border-l-2 bg-[${accent}]/[0.04]`
          : isPast ? 'opacity-60'
          : '';
        return (
          <li key={i}
              className={`flex items-baseline justify-between bg-[#0c0c18] border border-white/10 rounded-md px-4 py-2.5 text-[12.5px] ${isCur ? 'border-[#d79b3a]/50' : ''}`}>
            <span className={isCur ? 'text-[#fff8dd]' : isPast ? 'text-[#6d6d88]' : 'text-[#c8c8dd]'}>
              {fmt(p.start)} → {fmt(p.end)}
              {isCur && <span className="ml-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>current</span>}
              {isFuture && <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-[#9b9bbd]">future</span>}
            </span>
            <span className="text-[#6d6d88] font-mono text-[11px]">
              {yearsBetween(p.start, p.end).toFixed(1)} yrs
            </span>
          </li>
        );
      })}
    </ul>
  );
}
