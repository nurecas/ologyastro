import React, { useEffect, useRef, useMemo, useState } from 'react';
import { usePersonal } from '../store.js';
import { PLANETS, longitudesAtDate, decimalYearToDate, dateToDecimalYear, fixStarPositionAtJD, dateToJD } from '../../astro/ephemeris.js';
import DaySummary from './DaySummary.jsx';
import Forecast from './Forecast.jsx';
import { SIGN_GLYPHS, fmtLon } from '../astro/natal.js';
import { currentAspects } from '../astro/aspects.js';
import { PLANET_INFO } from '../astro/interpretation.js';
import { FIXED_STAR_NAMES } from '../../astro/fixedStars.js';
import { secondaryProgressions } from '../astro/progressions.js';
import PlanetaryHoursStrip from './PlanetaryHoursStrip.jsx';
import RxStationsPanel from './RxStationsPanel.jsx';
import CollapsibleSection from './CollapsibleSection.jsx';

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

const PLANET_GLYPH = Object.fromEntries(
  Object.entries(PLANET_INFO).map(([k, v]) => [k, v.glyph])
);

// Angle from zodiac longitude (deg) + wheel rotation (ASC at left = 9 o'clock).
function zodAngle(lonDeg, ascDeg) {
  // Rotate so ASC is at angle π (left side).
  return ((lonDeg - ascDeg) * DEG) - Math.PI;
}

export default function NatalWheel() {
  const natal       = usePersonal(s => s.natal);
  const liveNow     = usePersonal(s => s.liveNow);
  const transitT    = usePersonal(s => s.transitT);
  const setTransitT = usePersonal(s => s.setTransitT);
  const setLiveNow  = usePersonal(s => s.setLiveNow);
  const openInfo    = usePersonal(s => s.openInfo);
  const uiMode      = usePersonal(s => s.uiMode);
  const showFixedStars = usePersonal(s => s.showFixedStars);
  const showPlanetaryHours = usePersonal(s => s.showPlanetaryHours);
  const timeUnknown = usePersonal(s => s.timeUnknown);
  const triWheelOn  = usePersonal(s => s.triWheelOn);
  const setTriWheelOn = usePersonal(s => s.setTriWheelOn);

  // Fixed stars: computed once per chart, memoised. Only used in Advanced
  // mode with the toggle on. Swiss-precession-corrected.
  const fixedStarPositions = useMemo(() => {
    if (!showFixedStars || uiMode !== 'advanced' || !natal) return [];
    return FIXED_STAR_NAMES
      .map(name => {
        const pos = fixStarPositionAtJD(name, natal.jd);
        return pos ? { name, lonDeg: pos.lon } : null;
      })
      .filter(Boolean);
  }, [showFixedStars, uiMode, natal?.jd]);

  const canvasRef = useRef(null);
  const [hover, setHover] = useState(null);

  // When `liveNow` is on, refresh once a minute so a tab left open for hours
  // doesn't keep computing transits against a stale "now" (caught by a user
  // who saw "Next 7 days" straddling a month boundary because "now" was
  // from when the tab was opened).
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    if (!liveNow) return;
    const id = setInterval(() => setNowTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [liveNow]);

  const transitDate = useMemo(() => {
    if (liveNow) return new Date();
    if (transitT == null) return new Date();
    return decimalYearToDate(transitT);
  }, [liveNow, transitT, nowTick]);

  const transits = useMemo(() => {
    const L = longitudesAtDate(transitDate);
    return PLANETS.map(n => ({ name: n, lonDeg: L[n] }));
  }, [transitDate]);

  // Phase 5: Tri-wheel — when Advanced + toggle on, compute secondary
  // progressions for the current transit date so the canvas can layer
  // them as a third ring between natal and transits.
  const progressed = useMemo(() => {
    if (uiMode !== 'advanced' || !triWheelOn || !natal) return [];
    try { return secondaryProgressions(natal.birth, transitDate).planets.filter(p => p.classical !== false); }
    catch { return []; }
  }, [uiMode, triWheelOn, natal, transitDate]);

  // Phase 5: in Advanced mode, surface transit aspects to natal angles
  // (ASC/MC/DSC/IC) in the Active Transits list.
  const aspects = useMemo(
    () => currentAspects(natal, transitDate, { includeAngles: uiMode === 'advanced' }),
    [natal, transitDate, uiMode]
  );

  // Canvas redraw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const draw = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      // Ring radii, scaled proportionally so the inner disk is never
      // negative on small canvases. At Rout = 260 the layout matches the
      // original pixel offsets; at Rout < 260 everything shrinks together.
      // Padding trimmed from 90 → 48 so the wheel uses more of the box,
      // particularly helpful when the layout ships 3–4 side panels.
      const Rout    = Math.max(120, Math.min(W, H) / 2 - 48);
      const s       = Math.min(1, Rout / 260);
      const Rsigns  = Rout   - 22 * s;
      const Rhouses = Rsigns - 14 * s;
      const Rnatal  = Rhouses - 38 * s;
      const Rinner  = Rnatal  - 52 * s;   // inner disk edge (always ≥ 0)
      const Rtrans  = Rout   + 24 * s;     // transit ring outside

      const asc = natal.ascDeg;

      // Outer rim.
      ctx.strokeStyle = 'rgba(245,214,128,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, Rout, 0, TWO_PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Rsigns, 0, TWO_PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Rhouses, 0, TWO_PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Rinner, 0, TWO_PI); ctx.stroke();

      // Sign sectors (30°).
      ctx.strokeStyle = 'rgba(245,214,128,0.16)';
      for (let s = 0; s < 12; s++) {
        const a = zodAngle(s * 30, asc);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * Rsigns, cy + Math.sin(a) * Rsigns);
        ctx.lineTo(cx + Math.cos(a) * Rout, cy + Math.sin(a) * Rout);
        ctx.stroke();
      }

      // Sign glyphs, mid-sign.
      ctx.font = '17px "Cormorant Garamond", serif';
      ctx.fillStyle = '#e8e5d5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let s = 0; s < 12; s++) {
        const a = zodAngle(s * 30 + 15, asc);
        const r = (Rsigns + Rout) / 2;
        ctx.fillText(SIGN_GLYPHS[s], cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }

      // Phase 5 — fixed-star dots on the outer rim (Advanced + toggled on).
      // Tiny gold dots just outside Rout; per Section 3.7 of the brief.
      if (fixedStarPositions.length) {
        ctx.fillStyle = 'rgba(245,214,128,0.75)';
        const rStar = Rout + 4 * s;
        for (const st of fixedStarPositions) {
          const a = zodAngle(st.lonDeg, asc);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * rStar, cy + Math.sin(a) * rStar, 1.6 * s, 0, TWO_PI);
          ctx.fill();
        }
      }

      // Degree ticks (every 5°, taller every 10° and 30°).
      for (let deg = 0; deg < 360; deg += 5) {
        const a = zodAngle(deg, asc);
        const len = deg % 30 === 0 ? 10 : deg % 10 === 0 ? 6 : 3;
        ctx.strokeStyle = 'rgba(200, 200, 220, 0.30)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (Rsigns - len), cy + Math.sin(a) * (Rsigns - len));
        ctx.lineTo(cx + Math.cos(a) * Rsigns, cy + Math.sin(a) * Rsigns);
        ctx.stroke();
      }

      // House cusps.
      natal.houses.forEach((h, i) => {
        const a = zodAngle(h, asc);
        const emphasized = (i === 0 || i === 3 || i === 6 || i === 9);
        ctx.strokeStyle = emphasized ? 'rgba(245,214,128,0.7)' : 'rgba(200, 200, 220, 0.18)';
        ctx.lineWidth = emphasized ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * Rinner, cy + Math.sin(a) * Rinner);
        ctx.lineTo(cx + Math.cos(a) * Rhouses, cy + Math.sin(a) * Rhouses);
        ctx.stroke();

        // House number just inside the house cusp.
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = 'rgba(191,191,214,0.65)';
        const na = zodAngle(h + 15, asc); // mid of house (equal-ish)
        const nr = Rinner + 10;
        ctx.fillText(`${i + 1}`, cx + Math.cos(na) * nr, cy + Math.sin(na) * nr);
      });

      // Angles (AC, DC, MC, IC) big labels.
      const drawAngleLabel = (deg, text) => {
        const a = zodAngle(deg, asc);
        const r = Rhouses - 20;
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#f5d680';
        ctx.fillText(text, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      };
      drawAngleLabel(natal.ascDeg, 'ASC');
      drawAngleLabel(natal.dscDeg, 'DSC');
      drawAngleLabel(natal.mcDeg,  'MC');
      drawAngleLabel(natal.icDeg,  'IC');

      // Aspect lines (inside the inner disk) — natal × natal.
      const aspectLineOpacity = (weight, orb, maxOrb) =>
        weight * (1 - orb / maxOrb) * 0.45;
      natal.planets.forEach((p1, i) => {
        for (let j = i + 1; j < natal.planets.length; j++) {
          const p2 = natal.planets[j];
          const diff = Math.abs(((p1.lonDeg - p2.lonDeg) % 360 + 360) % 360);
          const absDiff = diff > 180 ? 360 - diff : diff;
          const aspectTable = [
            { name: 'Conjunction', angle: 0,   color: '#ffffff', maxOrb: 7 },
            { name: 'Opposition',  angle: 180, color: '#ff6a6a', maxOrb: 6 },
            { name: 'Trine',       angle: 120, color: '#44ff88', maxOrb: 5 },
            { name: 'Square',      angle: 90,  color: '#ffaa44', maxOrb: 5 },
            { name: 'Sextile',     angle: 60,  color: '#4488ff', maxOrb: 4 },
          ];
          for (const a of aspectTable) {
            const orb = Math.abs(absDiff - a.angle);
            if (orb <= a.maxOrb) {
              const x1 = cx + Math.cos(zodAngle(p1.lonDeg, asc)) * Rnatal;
              const y1 = cy + Math.sin(zodAngle(p1.lonDeg, asc)) * Rnatal;
              const x2 = cx + Math.cos(zodAngle(p2.lonDeg, asc)) * Rnatal;
              const y2 = cy + Math.sin(zodAngle(p2.lonDeg, asc)) * Rnatal;
              ctx.strokeStyle = a.color;
              ctx.globalAlpha = aspectLineOpacity(1, orb, a.maxOrb);
              ctx.lineWidth = 0.8;
              ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      });

      // Natal planet glyphs.
      ctx.font = '18px "Cormorant Garamond", serif';
      natal.planets.forEach(p => {
        const a = zodAngle(p.lonDeg, asc);
        const x = cx + Math.cos(a) * Rnatal;
        const y = cy + Math.sin(a) * Rnatal;
        // subtle halo — was 15px with 0.55 alpha (looked cloudy, especially
        // when crowded); tightened to 10px / 0.28 so glyphs read cleanly.
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 10);
        grad.addColorStop(0, 'rgba(245,214,128,0.28)');
        grad.addColorStop(1, 'rgba(245,214,128,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, TWO_PI); ctx.fill();

        ctx.fillStyle = '#fff8dd';
        ctx.fillText(PLANET_GLYPH[p.name], x, y);

        // small degree-within-sign under glyph
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(191,191,214,0.8)';
        ctx.fillText(`${(p.lonDeg % 30).toFixed(0)}°`, x, y + 15);
        ctx.font = '18px "Cormorant Garamond", serif';
      });

      // Phase 5: tri-wheel — progressed planets on a middle ring between
      // natal and transit. Violet accent.
      if (progressed.length) {
        const Rprog = (Rnatal + Rtrans) / 2;
        progressed.forEach(p => {
          const a = zodAngle(p.lonDeg, asc);
          const x = cx + Math.cos(a) * Rprog;
          const y = cy + Math.sin(a) * Rprog;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 8);
          grad.addColorStop(0, 'rgba(183,154,255,0.25)');
          grad.addColorStop(1, 'rgba(183,154,255,0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(x, y, 8, 0, TWO_PI); ctx.fill();
          ctx.font = '13px "Cormorant Garamond", serif';
          ctx.fillStyle = '#d8caff';
          ctx.fillText(PLANET_GLYPH[p.name], x, y);
        });
      }

      // Transit planets (outer ring, cyan accent).
      transits.forEach(t => {
        const a = zodAngle(t.lonDeg, asc);
        const x = cx + Math.cos(a) * Rtrans;
        const y = cy + Math.sin(a) * Rtrans;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 9);
        grad.addColorStop(0, 'rgba(120, 220, 255, 0.28)');
        grad.addColorStop(1, 'rgba(120, 220, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, TWO_PI); ctx.fill();

        ctx.font = '15px "Cormorant Garamond", serif';
        ctx.fillStyle = '#d0f0ff';
        ctx.fillText(PLANET_GLYPH[t.name], x, y);
      });

      // Centre legend.
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#8b8ba5';
      ctx.fillText('natal · gold', cx, cy - 8);
      ctx.fillStyle = '#79d0ff';
      ctx.fillText('transits · cyan', cx, cy + 8);
    };

    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [natal, transits, progressed, fixedStarPositions]);

  // Hit-test click
  const onClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const cx = W / 2, cy = H / 2;
    const dx = x - cx, dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const Rout   = Math.max(120, Math.min(W, H) / 2 - 90);
    const Rinner = Rout - 22 - 14 - 38 - 52;
    const asc = natal.ascDeg;
    // Angle (radians) with 0 at right, CCW positive.
    let a = Math.atan2(dy, dx);
    // Reverse the zodAngle transform: lon = (a + π)/DEG + asc
    const lonDeg = (((a + Math.PI) * 180 / Math.PI) + asc + 720) % 360;
    // Detect which element was clicked.
    // 1) Transit planet (outside Rout+24, within ±16).
    const Rtrans = Rout + 24;
    if (Math.abs(r - Rtrans) < 16) {
      const hit = nearestPlanet(lonDeg, transits);
      if (hit) {
        openInfo({
          kind: 'planet', id: hit.name, x: e.clientX, y: e.clientY,
          meta: `Transiting · currently at ${fmtLon(hit.lonDeg)}`,
        });
        return;
      }
    }
    // 2) Natal planet ring.
    if (r < Rout && r > Rinner) {
      const hit = nearestPlanet(lonDeg, natal.planets);
      if (hit) {
        openInfo({
          kind: 'planet', id: hit.name, x: e.clientX, y: e.clientY,
          meta: `Natal · ${fmtLon(hit.lonDeg)} · in house ${hit.house}`,
        });
        return;
      }
    }
    // 3) Sign ring (between Rsigns and Rout).
    if (r > Rout - 22 && r < Rout) {
      const signIdx = Math.floor(lonDeg / 30);
      const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                     'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      openInfo({ kind: 'sign', id: signs[signIdx], x: e.clientX, y: e.clientY });
      return;
    }
    // 4) House (click inside inner disk near a cusp = that house).
    if (r < Rinner + 20) {
      const h = natal.planets.find(() => false); // placeholder
      // Determine which house contains this longitude.
      const houses = natal.houses;
      for (let i = 0; i < 12; i++) {
        const a = houses[i], b = houses[(i + 1) % 12];
        const inside = a <= b ? (lonDeg >= a && lonDeg < b) : (lonDeg >= a || lonDeg < b);
        if (inside) {
          openInfo({ kind: 'house', id: i + 1, x: e.clientX, y: e.clientY });
          return;
        }
      }
    }
  };

  function nearestPlanet(lonDeg, planets) {
    let best = null, bestD = Infinity;
    for (const p of planets) {
      let d = Math.abs(p.lonDeg - lonDeg);
      d = Math.min(d, 360 - d);
      if (d < bestD) { bestD = d; best = p; }
    }
    return bestD < 6 ? best : null;
  }

  // Transit date controls
  const minY = Math.max(1900, natal.birth.year);
  const maxY = Math.min(2080, natal.birth.year + 100);
  const current = liveNow ? dateToDecimalYear(new Date()) : (transitT || dateToDecimalYear(new Date()));
  const onRange = (e) => setTransitT(parseFloat(e.target.value));
  const stepDays = (days) => {
    const next = new Date(transitDate.getTime() + days * 86400000);
    setTransitT(dateToDecimalYear(next));
  };

  return (
    <div className="w-full h-full flex flex-col p-6 text-[#e6e6f0]">
      {uiMode === 'advanced' && showPlanetaryHours && (
        <PlanetaryHoursStrip date={transitDate} lat={natal.birth.latDeg} lon={natal.birth.lonDeg} />
      )}
      {timeUnknown && (
        <div className="text-[11px] text-[#d79b3a] mb-2">
          ⚠ Birth time unknown — houses and Ascendant/Midheaven are not shown; the chart is a "solar chart" for noon.
        </div>
      )}
      <header className="mb-2">
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
          Natal + Transits
        </h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          Inner ring in gold: your natal planets. Outer ring in cyan: transits
          for the date you pick. House cusps radiate inward from the wheel.
          {' '}<span className="text-[#f5d680]">Click any planet, sign, or house
          for its interpretation.</span>{' '}
          Aspect lines inside the wheel are colour-coded: white conjunction,
          red opposition, orange square, green trine, blue sextile.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-2 text-[12px] tracking-[0.18em] uppercase text-[#9b9bbd]">
        <button className={`btn-ghost ${liveNow ? 'active' : ''}`} onClick={setLiveNow}>
          Now
        </button>

        {/* Exact date picker */}
        <input
          type="date"
          value={toISODate(transitDate)}
          min={`${minY}-01-01`}
          max={`${maxY}-12-31`}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const d = new Date(v + 'T12:00:00Z');
            if (isNaN(d.getTime())) return;
            setTransitT(dateToDecimalYear(d));
          }}
          className="form-input py-1 px-2 text-[12px]"
          style={{ colorScheme: 'dark', width: 150 }}
        />

        {/* ±1 day / ±1 month / ±1 year buttons */}
        <div className="flex gap-1">
          <button className="btn-ghost" onClick={() => stepDays(-365)} title="−1 year">«</button>
          <button className="btn-ghost" onClick={() => stepDays(-30)}  title="−1 month">‹‹</button>
          <button className="btn-ghost" onClick={() => stepDays(-1)}   title="−1 day">‹</button>
          <button className="btn-ghost" onClick={() => stepDays( 1)}   title="+1 day">›</button>
          <button className="btn-ghost" onClick={() => stepDays( 30)}  title="+1 month">››</button>
          <button className="btn-ghost" onClick={() => stepDays( 365)} title="+1 year">»</button>
        </div>

        <input
          type="range"
          min={minY} max={maxY} step={1/365}
          value={current}
          onChange={onRange}
          className="flex-1 spine-scrub"
          title="Drag to move the transit date"
        />
        <div className="text-[#f5d680] min-w-[150px] text-right">
          {fmtDate(transitDate)}
        </div>

        {/* Phase 5: Tri-wheel overlay — Advanced only. */}
        {uiMode === 'advanced' && (
          <label className="flex items-center gap-2 text-[11px] text-[#9b9bbd] cursor-pointer ml-3" title="Overlay secondary-progressed positions">
            <input
              type="checkbox"
              checked={triWheelOn}
              onChange={(e) => setTriWheelOn(e.target.checked)}
            />
            Tri-wheel
          </label>
        )}
      </div>

      {/* Layout: wheel takes the lion's share on the left; side panels
          stack in a scrollable column on the right. Previously the grid
          was [1fr_280_280_280] (fixed 4 columns) which squeezed the wheel
          when Advanced added a 5th child (Rx stations) — it wrapped onto
          a new row under the wheel. A 2-column layout scales cleanly to
          any number of side cards. */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_340px] gap-3">
        <div className="relative bg-[#0a0a14] border border-white/5 rounded-md overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-pointer"
            onClick={onClick}
          />
        </div>

        {/* Side column — collapsible panels. State per-section persists
            via the store's hintsDismissed map. Primary panel (Active
            Transits) opens by default; others follow. */}
        {/* All sections default closed on first visit — the pills show
            what's available, and opening one never hides the others:
            collapsed sections stay as pills above/below so the user
            always sees the full menu of what's here. */}
        <div className="min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
          <CollapsibleSection id="activeTransits" title={`Active Transits · ${aspects.length}`} defaultOpen={false}>
            <AspectsPanel aspects={aspects} />
          </CollapsibleSection>
          <CollapsibleSection id="daySummary" title="Day Summary" defaultOpen={false}>
            <DaySummary date={transitDate} />
          </CollapsibleSection>
          <CollapsibleSection id="forecast" title="Forecast" defaultOpen={false}>
            <Forecast fromDate={transitDate} />
          </CollapsibleSection>
          {uiMode === 'advanced' && (
            <CollapsibleSection id="rxStations" title="Retrograde Stations" defaultOpen={false}>
              <RxStationsPanel fromDate={transitDate} />
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}

function AspectsPanel({ aspects }) {
  const openInfo = usePersonal(s => s.openInfo);
  const top = aspects.slice(0, 20);
  return (
    <div className="bg-[#0a0a14] border border-white/5 rounded-md p-3 overflow-y-auto">
      <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">
        Active Transits · {aspects.length}
      </div>
      <div className="space-y-1">
        {top.map((a, i) => (
          <button
            key={i}
            onClick={(e) => openInfo({
              kind: 'aspect', id: a.aspect.name,
              meta: `${a.transit} ${a.aspect.glyph} natal ${a.natal} · orb ${a.orb.toFixed(2)}°`,
              x: e.clientX, y: e.clientY,
            })}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-left text-[12px]"
          >
            <span className="text-[#79d0ff] w-4">{PLANET_GLYPH[a.transit]}</span>
            <span className="text-[#f5d680]">{a.aspect.glyph}</span>
            <span className="text-[#fff8dd] w-4">{PLANET_GLYPH[a.natal]}</span>
            <span className="flex-1 text-[#bfbfd6]">{a.transit} {a.aspect.name.toLowerCase()} {a.natal}</span>
            <span className={`text-[11px] ${a.exact ? 'text-[#f5d680]' : 'text-[#6d6d88]'}`}>
              {a.orb.toFixed(1)}°
            </span>
          </button>
        ))}
        {aspects.length === 0 && (
          <div className="text-[11px] text-[#6d6d88] italic p-2">No transits within orb on this date.</div>
        )}
      </div>
    </div>
  );
}

function fmtDate(d) {
  const m = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
}

function toISODate(d) {
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
