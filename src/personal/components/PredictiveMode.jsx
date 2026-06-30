// -----------------------------------------------------------------------------
// Phase 5 — Predictive mode (Section 3.3)
//
// 6th mode (Advanced only). Chart-type selector at top switches between
// progressions, Solar Arc, Solar Return, and Lunar Return. All four share
// a simple SVG wheel for now; visual polish lands in Phase 6.
// -----------------------------------------------------------------------------

import React, { useMemo } from 'react';
import { usePersonal } from '../store.js';
import { secondaryProgressions, solarArcDirections } from '../astro/progressions.js';
import { solarReturn, lunarReturnNear } from '../astro/returns.js';
import { PLANET_INFO, PREDICTIVE_INFO } from '../astro/interpretation.js';

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);
const SIGN_GLYPH = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

const TYPES = [
  { id: 'progressions', label: 'Progressions', infoKey: 'progressions' },
  { id: 'solarArc',     label: 'Solar Arc',    infoKey: 'solarArc' },
  { id: 'solarReturn',  label: 'Solar Return', infoKey: 'solarReturn' },
  { id: 'lunarReturn',  label: 'Lunar Return', infoKey: 'lunarReturn' },
];

function fmtLon(d) {
  const n = ((d % 360) + 360) % 360;
  const s = Math.floor(n / 30);
  const within = n - s * 30;
  const deg = Math.floor(within);
  const min = Math.round((within - deg) * 60);
  return `${deg}° ${SIGN_GLYPH[s]} ${String(min).padStart(2, '0')}'`;
}

// Tiny SVG wheel showing the 12 sign boundaries + a ring of planet glyphs.
function SimpleWheel({ planets, size = 420 }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.42, rGlyph = size * 0.36, rSignGlyph = size * 0.47;
  // Convert ecliptic longitude to canvas angle: 0° Aries on the left (+X
  // = East in the sky, but astrological wheels place Aries at 9-o'clock).
  const toXY = (lonDeg, rr) => {
    const theta = (180 - lonDeg) * Math.PI / 180;
    return [cx + rr * Math.cos(theta), cy + rr * Math.sin(theta)];
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block mx-auto">
      <circle cx={cx} cy={cy} r={r}        fill="none" stroke="rgba(245,214,128,0.25)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      {/* Sign spokes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const [x1, y1] = toXY(i * 30, r);
        const [x2, y2] = toXY(i * 30, r * 0.78);
        return <line key={`s${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" />;
      })}
      {/* Sign glyphs */}
      {SIGN_GLYPH.map((g, i) => {
        const [x, y] = toXY(i * 30 + 15, rSignGlyph);
        return (
          <text key={`sg${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#f5d680">
            {g}
          </text>
        );
      })}
      {/* Planet glyphs */}
      {planets.map(p => {
        const [x, y] = toXY(p.lonDeg, rGlyph);
        return (
          <g key={p.name}>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#f5d680">
              {PLANET_GLYPH[p.name] || '•'}
            </text>
            <text x={x} y={y + 14} textAnchor="middle" fontSize="8" fill="#9b9bbd">
              {p.lonDeg.toFixed(0)}°
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function normalizePlanets(raw) {
  // Accepts either array of { name, lonDeg } (progressions, solar arcs) or
  // an object { Sun: deg, Moon: deg, ... } (returns).
  if (Array.isArray(raw)) return raw.filter(p => p.lonDeg != null);
  return Object.entries(raw).filter(([, v]) => v != null).map(([name, lonDeg]) => ({ name, lonDeg }));
}

export default function PredictiveMode() {
  const {
    birth, natal,
    predictiveType, setPredictiveType,
    predictiveYear, setPredictiveYear,
  } = usePersonal();

  const { chart, subtitle } = useMemo(() => {
    if (!birth || !natal) return { chart: null, subtitle: '' };
    const target = new Date(Date.UTC(predictiveYear, birth.month - 1, birth.day, birth.hour, birth.minute));
    try {
      if (predictiveType === 'progressions') {
        const prog = secondaryProgressions(birth, target);
        return { chart: prog, subtitle: `Progressed for ${predictiveYear} (age ${prog.age.toFixed(1)})` };
      }
      if (predictiveType === 'solarArc') {
        const sa = solarArcDirections(birth, natal, target, 'solar');
        return { chart: sa, subtitle: `Solar Arc +${sa.arc.toFixed(2)}° at age ${sa.age.toFixed(1)}` };
      }
      if (predictiveType === 'solarReturn') {
        const sr = solarReturn(birth, predictiveYear);
        return { chart: { planets: normalizePlanets(sr.planets) }, subtitle: `Solar Return · ${sr.date.toISOString().slice(0, 16).replace('T', ' ')} UT` };
      }
      if (predictiveType === 'lunarReturn') {
        const lr = lunarReturnNear(birth, target);
        return { chart: { planets: normalizePlanets(lr.planets) }, subtitle: `Lunar Return · ${lr.date.toISOString().slice(0, 16).replace('T', ' ')} UT` };
      }
    } catch (e) {
      console.error('Predictive compute error:', e);
    }
    return { chart: null, subtitle: '' };
  }, [birth, natal, predictiveType, predictiveYear]);

  if (!natal) return null;
  const activeInfo = PREDICTIVE_INFO[TYPES.find(t => t.id === predictiveType)?.infoKey || 'progressions'];

  return (
    <div className="flex flex-col h-full px-6 py-4 gap-4 overflow-auto">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
          Predictive
        </h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          How your natal chart unfolds over time. Each technique reads a
          different layer of the future:{' '}
          <span className="text-[#e6e6f0]">Progressions</span> for inner maturation
          (one day after birth = one year of life);{' '}
          <span className="text-[#e6e6f0]">Solar Arc</span> advances every
          planet and angle by the progressed-Sun's arc, a clean dating tool
          for life structures;{' '}
          <span className="text-[#e6e6f0]">Solar Return</span> is the chart
          cast at the moment the Sun returns to its natal position each
          year — read as a year-theme;{' '}
          <span className="text-[#e6e6f0]">Lunar Return</span> the same
          for the Moon, every ~27 days, for the month's feeling-tone.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setPredictiveType(t.id)}
            className={`text-[11px] px-3 py-1 rounded border ${
              predictiveType === t.id
                ? 'bg-[#f5d680]/10 border-[#f5d680]/50 text-[#f5d680]'
                : 'bg-transparent border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-[#9b9bbd]">
          <span>Year</span>
          <input
            type="number"
            value={predictiveYear}
            onChange={e => setPredictiveYear(e.target.value)}
            className="w-20 px-2 py-0.5 bg-[#0a0a14] border border-white/10 text-[#e6e6f0] rounded"
          />
        </div>
      </div>

      <div className="text-[11px] text-[#9b9bbd]">{subtitle}</div>

      {chart && chart.planets ? (
        <>
          <SimpleWheel planets={chart.planets.filter(p => p.classical !== false && !p.calculatedPoint) || chart.planets} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-[11px] mt-2">
            {chart.planets.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-[#f5d680] w-5">{PLANET_GLYPH[p.name] || '•'}</span>
                <span className="text-[#e6e6f0] w-16">{p.name}</span>
                <span className="text-[#c8c8dd]">{fmtLon(p.lonDeg)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 text-[11px] text-[#9b9bbd] max-w-2xl leading-relaxed">
            <span className="text-[#f5d680] font-serif tracking-wider">{activeInfo?.title}</span>
            <span className="text-[#6d6d88]"> — {activeInfo?.role}</span>
            <p className="mt-2 text-[#c8c8dd]">{activeInfo?.body}</p>
          </div>
        </>
      ) : (
        <div className="text-[#9b9bbd] text-[12px]">
          Compute unavailable — Swiss Ephemeris required for predictive techniques, or target date out of range.
        </div>
      )}
    </div>
  );
}
