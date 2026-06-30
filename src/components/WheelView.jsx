import React, { useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store.js';
import { AMPLITUDE_ARRAY, PLANETS, decimalYearToDate, longitudesAtDate } from '../astro/ephemeris.js';
import { LAYERS, hexToRGB } from '../astro/layers.js';

const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PLANET_GLYPH = {
  Sun:'☉', Moon:'☾', Mercury:'☿', Venus:'♀', Mars:'♂',
  Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇'
};

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const NUM_RADIAL = 720; // angular resolution

// Compute current-time interference F across θ.
function computeFrame(longsNow) {
  const out = new Float32Array(NUM_RADIAL);
  const amps = AMPLITUDE_ARRAY;
  let ampSum = 0;
  for (const a of amps) ampSum += Math.abs(a);
  for (let k = 0; k < NUM_RADIAL; k++) {
    const theta = (k / NUM_RADIAL) * TWO_PI;
    let F = 0;
    for (let i = 0; i < PLANETS.length; i++) {
      F += amps[i] * Math.cos(theta - longsNow[i]);
    }
    out[k] = F / ampSum;
  }
  return out;
}

function colorForN(n) {
  // Same palette as field shader.
  const t = Math.max(0, Math.min(1, (n + 1) * 0.5));
  const stops = [
    [0.00, [0.020, 0.025, 0.090]],
    [0.33, [0.110, 0.060, 0.360]],
    [0.66, [0.490, 0.180, 0.780]],
    [0.88, [0.980, 0.420, 0.620]],
    [1.00, [1.000, 0.820, 0.420]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (t >= a && t <= b) {
      const f = (t - a) / (b - a);
      return [
        ca[0] + f * (cb[0] - ca[0]),
        ca[1] + f * (cb[1] - ca[1]),
        ca[2] + f * (cb[2] - ca[2]),
      ];
    }
  }
  return [1, 1, 1];
}

export default function WheelView() {
  const canvasRef = useRef(null);
  const t         = useStore(s => s.t);
  const startYear = useStore(s => s.startYear);
  const endYear   = useStore(s => s.endYear);
  const layers    = useStore(s => s.layers);
  const coherence = useStore(s => s.coherence);
  const numTime   = useStore(s => s.numTime);
  const masterCoh = useStore(s => s.masterCoherence);

  const year = startYear + (endYear - startYear) * t;
  const date = useMemo(() => decimalYearToDate(year), [year]);
  const longsDeg = useMemo(() => longitudesAtDate(date), [date]);
  const longsRad = useMemo(
    () => PLANETS.map(p => longsDeg[p] * DEG),
    [longsDeg]
  );
  const fField = useMemo(() => computeFrame(longsRad), [longsRad]);

  // Trails: last ~30 days of motion for each planet.
  const trails = useMemo(() => {
    const days = 30;
    const steps = 15;
    const pts = PLANETS.map(() => []);
    for (let s = steps; s >= 0; s--) {
      const d = new Date(date.getTime() - s * (days / steps) * 86400000);
      const L = longitudesAtDate(d);
      PLANETS.forEach((p, i) => pts[i].push(L[p]));
    }
    return pts;
  }, [date]);

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
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      // Reserve ≥ 70 px for the outer planet ring (40 px) + glyph height
      // (~18 px) + margin, so the wheel always fits the viewport.
      const Rout = Math.max(80, Math.min(W, H) / 2 - 80);
      const Rin  = Rout * 0.20;

      // 1) Radial color fill: θ → F(θ) color, interpolated over angle.
      const sliceCount = NUM_RADIAL;
      for (let k = 0; k < sliceCount; k++) {
        const a0 = (k / sliceCount) * TWO_PI - Math.PI / 2;
        const a1 = ((k + 1) / sliceCount) * TWO_PI - Math.PI / 2;
        const n = fField[k];
        const [r, g, b] = colorForN(n);
        // base intensity
        let alpha = 0.95;
        ctx.fillStyle = `rgba(${(r*255)|0}, ${(g*255)|0}, ${(b*255)|0}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a0) * Rin, cy + Math.sin(a0) * Rin);
        ctx.arc(cx, cy, Rout, a0, a1, false);
        ctx.lineTo(cx + Math.cos(a1) * Rin, cy + Math.sin(a1) * Rin);
        ctx.arc(cx, cy, Rin, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }

      // 2) Layer overlays — compute per-layer sub-field, additively tint.
      const cohIdx = Math.round(t * (coherence.length - 1));
      const cNow = coherence[cohIdx] || 0;
      for (const L of layers) {
        if (!L.enabled) continue;
        const layerDef = LAYERS.find(x => x.id === L.id);
        const planetIdx = layerDef.planets;
        const axes = layerDef.axes.map(a => a * DEG);
        const amps = AMPLITUDE_ARRAY;
        let amp = 0;
        for (const pi of planetIdx) amp += amps[pi];
        for (const ax of axes) amp += 0.6;
        const [cr, cg, cb] = hexToRGB(layerDef.color);
        for (let k = 0; k < sliceCount; k++) {
          const theta = (k / sliceCount) * TWO_PI;
          let Fl = 0;
          for (const pi of planetIdx) Fl += amps[pi] * Math.cos(theta - longsRad[pi]);
          for (const ax of axes) Fl += 0.6 * Math.cos(theta - ax);
          const n = Fl / Math.max(amp, 0.0001);
          const intensity = Math.max(0, (n - 0.05) / 0.95);
          if (intensity <= 0) continue;
          let w = L.mix * intensity * 0.6;
          if (masterCoh) w *= cNow;
          const a0 = (k / sliceCount) * TWO_PI - Math.PI / 2;
          const a1 = ((k + 1) / sliceCount) * TWO_PI - Math.PI / 2;
          ctx.fillStyle = `rgba(${(cr*255)|0}, ${(cg*255)|0}, ${(cb*255)|0}, ${w})`;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a0) * Rin, cy + Math.sin(a0) * Rin);
          ctx.arc(cx, cy, Rout, a0, a1, false);
          ctx.lineTo(cx + Math.cos(a1) * Rin, cy + Math.sin(a1) * Rin);
          ctx.arc(cx, cy, Rin, a1, a0, true);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3) Zodiac rim & sign dividers.
      ctx.strokeStyle = 'rgba(245, 214, 128, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, Rout, 0, TWO_PI); ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, Rin, 0, TWO_PI); ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 214, 128, 0.18)';
      for (let s = 0; s < 12; s++) {
        const a = (s * 30) * DEG - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * Rin, cy + Math.sin(a) * Rin);
        ctx.lineTo(cx + Math.cos(a) * Rout, cy + Math.sin(a) * Rout);
        ctx.stroke();
      }

      // 4) Sign glyphs just outside the outer rim.
      ctx.font = '16px "Cormorant Garamond", serif';
      ctx.fillStyle = 'rgba(232, 229, 213, 0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let s = 0; s < 12; s++) {
        const a = (s * 30 + 15) * DEG - Math.PI / 2;
        const r = Rout + 20;
        ctx.fillText(SIGN_GLYPHS[s], cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }

      // 5) Degree ticks every 10° (short tick) and 30° (long).
      for (let deg = 0; deg < 360; deg += 5) {
        const a = deg * DEG - Math.PI / 2;
        const len = deg % 30 === 0 ? 8 : deg % 10 === 0 ? 5 : 2.5;
        ctx.strokeStyle = 'rgba(200, 200, 220, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (Rout - len), cy + Math.sin(a) * (Rout - len));
        ctx.lineTo(cx + Math.cos(a) * Rout, cy + Math.sin(a) * Rout);
        ctx.stroke();
      }

      // 6) Planet trails.
      const trailR = Rout + 40;
      PLANETS.forEach((p, i) => {
        const trail = trails[i];
        ctx.strokeStyle = 'rgba(245, 214, 128, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach((deg, j) => {
          const a = deg * DEG - Math.PI / 2;
          const x = cx + Math.cos(a) * trailR;
          const y = cy + Math.sin(a) * trailR;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });

      // 7) Planet dots + glyphs.
      PLANETS.forEach((p, i) => {
        const deg = longsDeg[p];
        const a = deg * DEG - Math.PI / 2;
        const r = Rout + 40;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 18);
        grad.addColorStop(0, 'rgba(245, 214, 128, 0.85)');
        grad.addColorStop(1, 'rgba(245, 214, 128, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 18, 0, TWO_PI); ctx.fill();

        ctx.fillStyle = '#f5d680';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, TWO_PI); ctx.fill();

        ctx.font = '15px "Cormorant Garamond", serif';
        ctx.fillStyle = '#fff8dd';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(PLANET_GLYPH[p], x, y - 15);
      });

      // 8) Center mark: coherence value.
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = 'rgba(245, 214, 128, 0.85)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`coh ${cNow.toFixed(3)}`, cx, cy);
    };
    draw();

    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fField, longsDeg, longsRad, layers, trails, coherence, numTime, t, masterCoh]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
