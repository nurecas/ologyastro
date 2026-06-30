import React, { useMemo, useState } from 'react';
import { usePersonal } from '../store.js';
import { forecastEvents, groupByBand } from '../astro/forecast.js';
import { PLANET_INFO } from '../astro/interpretation.js';

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

const WINDOWS = [
  { id: '6m',  label: '6 mo',  days: 183 },
  { id: '1y',  label: '1 yr',  days: 365 },
  { id: '2y',  label: '2 yr',  days: 730 },
  { id: '5y',  label: '5 yr',  days: 1825 },
];

function fmtDate(d) {
  const m = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
}

function daysAway(d, now) {
  const delta = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (delta === 0) return 'today';
  if (delta === 1) return 'tomorrow';
  if (delta === -1) return 'yesterday';
  if (delta > 0) return `in ${delta} days`;
  return `${-delta} days ago`;
}

export default function Forecast({ fromDate }) {
  const natal     = usePersonal(s => s.natal);
  const openInfo  = usePersonal(s => s.openInfo);
  const [winId, setWinId] = useState('1y');

  const win = WINDOWS.find(w => w.id === winId);
  const now = fromDate || new Date();
  const toDate = new Date(now.getTime() + win.days * 86400000);

  const events = useMemo(
    () => forecastEvents({ natal, fromDate: now, toDate }),
    [natal, now.getTime(), toDate.getTime()]
  );
  const grouped = useMemo(() => groupByBand(events, now), [events, now]);

  // Short "Apr 26 – May 3" style range caption for a band header.
  const fmtRange = (a, b) => {
    if (!a || !b) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ms = (d) => months[d.getUTCMonth()];
    const d  = (d) => d.getUTCDate();
    // "Apr 26 – May 3"  /  "Apr 26 – Apr 30" collapse-like the second one to "Apr 26 – 30"
    if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
      return `${ms(a)} ${d(a)}–${d(b)}`;
    }
    if (a.getUTCFullYear() === b.getUTCFullYear()) {
      return `${ms(a)} ${d(a)} – ${ms(b)} ${d(b)}`;
    }
    return `${ms(a)} ${d(a)} ${a.getUTCFullYear()} – ${ms(b)} ${d(b)} ${b.getUTCFullYear()}`;
  };

  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3 overflow-y-auto">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd]">
          Forecast
        </div>
        <div className="flex gap-0.5">
          {WINDOWS.map(w => (
            <button
              key={w.id}
              onClick={() => setWinId(w.id)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                winId === w.id
                  ? 'bg-[#f5d680]/20 text-[#f5d680]'
                  : 'text-[#6d6d88] hover:text-white'
              }`}
            >{w.label}</button>
          ))}
        </div>
      </div>

      <div className="text-[11.5px] text-[#9b9bbd] mb-3 leading-snug">
        Major outer-planet transits exactly aspecting your natal chart over the
        next {win.label.replace(' ', '')}. These are the real "event" moments
        — slow planets moving to precise aspects with your birth positions.
      </div>

      <div className="space-y-3">
        {grouped.length === 0 && (
          <div className="text-[12px] text-[#6d6d88] italic">
            No outer-planet exact aspects in this window.
          </div>
        )}
        {grouped.map(b => (
          <div key={b.id}>
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#8b8ba5]">
                {b.label} · {b.events.length}
              </div>
              {b.rangeStart && b.rangeEnd && (
                <div className="text-[9.5px] text-[#6d6d88]">
                  {fmtRange(b.rangeStart, b.rangeEnd)}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {b.events.map((e, i) => (
                <button
                  key={i}
                  onClick={(ev) => openInfo({
                    kind: 'aspect', id: e.aspect.name,
                    meta: `${e.transit} ${e.aspect.glyph} natal ${e.natal} · ${fmtDate(e.date)}`,
                    x: ev.clientX, y: ev.clientY,
                  })}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 border-l-2"
                  style={{ borderColor: e.retrograde ? '#ff8844' : 'transparent' }}
                >
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span className="text-[#79d0ff] w-4">{PLANET_GLYPH[e.transit]}</span>
                    <span className="text-[#f5d680]">{e.aspect.glyph}</span>
                    <span className="text-[#fff8dd] w-4">{PLANET_GLYPH[e.natal]}</span>
                    <span className="flex-1 text-[#d8d8e8]">
                      {e.transit} {e.aspect.name.toLowerCase()} {e.natal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 pl-6">
                    <span className="text-[11px] text-[#bfbfd6]">{fmtDate(e.date)}</span>
                    <span className="text-[10.5px] text-[#6d6d88]">
                      {e.retrograde ? 'Rx · ' : ''}{daysAway(e.date, now)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {grouped.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/5 text-[10.5px] text-[#6d6d88] leading-snug">
          Events marked <span style={{ color: '#ff8844' }}>●</span> happen while
          the transiting planet is retrograde — typically one of three passes
          in the classic triple-hit sequence.
        </div>
      )}
    </div>
  );
}
