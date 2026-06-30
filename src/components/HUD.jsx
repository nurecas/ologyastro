import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store.js';
import {
  decimalYearToDate, dateToDecimalYear, longitudesAtDate,
  PLANETS, degreesToSign,
} from '../astro/ephemeris.js';

const SIGN_GLYPH = {
  Aries:'♈', Taurus:'♉', Gemini:'♊', Cancer:'♋', Leo:'♌', Virgo:'♍',
  Libra:'♎', Scorpio:'♏', Sagittarius:'♐', Capricorn:'♑', Aquarius:'♒', Pisces:'♓'
};
const PLANET_GLYPH = {
  Sun:'☉', Moon:'☾', Mercury:'☿', Venus:'♀', Mars:'♂',
  Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇'
};

function formatDate(d) {
  const m = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
}
function toISODate(d) {
  // yyyy-mm-dd for <input type="date">. Native input won't accept years
  // < 0100 reliably, but our window is 1500+ so we're safe.
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function HUD() {
  const t         = useStore(s => s.t);
  const setT      = useStore(s => s.setT);
  const startYear = useStore(s => s.startYear);
  const endYear   = useStore(s => s.endYear);
  const coherence = useStore(s => s.coherence);

  const year = startYear + (endYear - startYear) * t;
  const idx  = Math.round(t * (coherence.length - 1));
  const coh  = coherence[idx] || 0;
  const date = decimalYearToDate(year);
  const L = longitudesAtDate(date);

  // --- Date picker state ---------------------------------------------------
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const onDateChange = (e) => {
    const v = e.target.value; // yyyy-mm-dd
    if (!v) return;
    const d = new Date(v + 'T12:00:00Z');
    if (isNaN(d.getTime())) return;
    const dy = dateToDecimalYear(d);
    const newT = (dy - startYear) / (endYear - startYear);
    setT(Math.max(0, Math.min(1, newT)));
  };
  const stepDays = (days) => {
    const next = new Date(date.getTime() + days * 86400000);
    const dy = dateToDecimalYear(next);
    setT(Math.max(0, Math.min(1, (dy - startYear) / (endYear - startYear))));
  };

  return (
    <>
      {/* Title */}
      <div className="absolute top-4 left-5 select-none">
        <div className="font-serif text-[20px] tracking-[0.22em] text-[#e8e5d5] pointer-events-none">
          OLOGY
        </div>
        <div className="text-[9.5px] tracking-[0.3em] uppercase text-[#9b9bbd] mt-1 pointer-events-none">
          Chronological Harmonic Resonance Field
        </div>
        <a
          href="/personal.html"
          className="inline-block mt-2 text-[10px] tracking-[0.25em] uppercase text-[#f5d680]/80 hover:text-[#f5d680] border border-[#f5d680]/30 hover:border-[#f5d680]/70 rounded px-2 py-0.5 transition-colors"
        >
          ✦ Your Chart
        </a>
      </div>

      {/* Date picker + coherence */}
      <div className="absolute top-4 right-5 text-right select-none flex flex-col items-end">
        <button
          onClick={() => setEditing(v => !v)}
          className="font-serif text-[22px] tracking-[0.12em] text-[#f5d680] hover:text-[#fff8dd] transition-colors"
          title="Click to pick a date"
        >
          {formatDate(date)}
        </button>

        {editing && (
          <div className="mt-2 flex items-center gap-1 bg-[#0b0b15]/95 border border-white/10 rounded-md px-2 py-1.5 backdrop-blur-md">
            <button className="btn-ghost" onClick={() => stepDays(-365)} title="−1 year">«</button>
            <button className="btn-ghost" onClick={() => stepDays(-30)}  title="−1 month">‹</button>
            <input
              ref={inputRef}
              type="date"
              value={toISODate(date)}
              min={`${startYear}-01-01`}
              max={`${endYear - 1}-12-31`}
              onChange={onDateChange}
              className="bg-transparent border border-white/10 rounded px-2 py-1 text-[11px] tracking-wide text-[#f5d680]
                         focus:outline-none focus:border-[#f5d680]/60 w-[140px]"
              style={{ colorScheme: 'dark' }}
            />
            <button className="btn-ghost" onClick={() => stepDays(30)}  title="+1 month">›</button>
            <button className="btn-ghost" onClick={() => stepDays(365)} title="+1 year">»</button>
            <button className="btn-ghost ml-1" onClick={() => setEditing(false)}>Close</button>
          </div>
        )}

        <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mt-1">
          Global Coherence · {coh.toFixed(3)}
        </div>
      </div>

      {/* Planet strip */}
      <div className="absolute bottom-4 left-5 flex gap-3 text-[10px] tracking-wider text-[#bfbfd6]/85 select-none pointer-events-none">
        {PLANETS.map(p => {
          const { sign, degree } = degreesToSign(L[p]);
          return (
            <div key={p} className="flex flex-col items-center px-1" style={{ minWidth: 46 }}>
              <div className="text-[14px] text-[#f2ecd6]" title={p}>
                {PLANET_GLYPH[p]}
              </div>
              <div className="opacity-70">
                {SIGN_GLYPH[sign]} {degree.toFixed(1)}°
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
