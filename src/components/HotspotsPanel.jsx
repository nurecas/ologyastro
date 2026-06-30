import React, { useMemo, useState } from 'react';
import { useStore } from '../store.js';
import {
  decimalYearToDate, dateToJD, gmst, equatorialAtDate, PLANETS,
} from '../astro/ephemeris.js';
import { locationLabel } from '../astro/geolabel.js';
import { LAYERS, hexToRGB } from '../astro/layers.js';

const PLANET_GLYPH = {
  Sun:'☉', Moon:'☾', Mercury:'☿', Venus:'♀', Mars:'♂',
  Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇'
};

// Planet → layer color (for dot tinting). Matches GlobeView.
const PLANET_COLOR = (() => {
  const m = {};
  for (const p of PLANETS) m[p] = '#e8e5d5';
  LAYERS.forEach(L => {
    if (L.planets.length > 0) m[PLANETS[L.planets[0]]] = L.color;
  });
  return m;
})();

function lonDeg(rad) {
  let d = (rad * 180) / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// Format: "42.1° E" / "15.3° W".
function fmtLon(d) {
  return `${Math.abs(d).toFixed(1)}° ${d >= 0 ? 'E' : 'W'}`;
}

export default function HotspotsPanel() {
  const t         = useStore(s => s.t);
  const startYear = useStore(s => s.startYear);
  const endYear   = useStore(s => s.endYear);
  const view      = useStore(s => s.view);
  const [open, setOpen] = useState(true);

  const date = useMemo(
    () => decimalYearToDate(startYear + (endYear - startYear) * t),
    [t, startYear, endYear]
  );

  // For every planet, compute MC/IC longitudes on Earth's surface and the
  // corresponding location labels at three reference latitudes (0°, ±40°).
  const hotspots = useMemo(() => {
    const jd = dateToJD(date);
    const G = gmst(jd);
    const eqs = equatorialAtDate(date);
    return eqs.map((e, i) => {
      const mcLon = lonDeg(e.ra - G);
      const icLon = lonDeg(e.ra - G + Math.PI);
      // Probe labels at latitudes 40°N, 0°, 40°S. Prefer "near City" hits.
      const probe = (lon) => {
        const candidates = [40, 0, -40].map(lat => ({
          lat, label: locationLabel(lat, lon),
        }));
        const preferred = candidates.find(c => c.label.startsWith('near '));
        return preferred || candidates[1];
      };
      const mc = probe(mcLon);
      const ic = probe(icLon);
      return {
        planet: PLANETS[i],
        color: PLANET_COLOR[PLANETS[i]],
        mcLon, icLon,
        mcLabel: mc.label, mcLat: mc.lat,
        icLabel: ic.label, icLat: ic.lat,
      };
    });
  }, [date]);

  if (view !== 'globe') return null;

  return (
    <div
      className="absolute top-16 right-3 bg-[#0b0b15]/90 backdrop-blur-md border border-white/5 rounded-md text-[#d8d8e8] transition-all duration-300"
      style={{ width: open ? 320 : 42 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] hover:text-white"
      >
        <span>{open ? 'Hotspots' : '◉'}</span>
        {open && <span className="text-[#6d6d88]">{open ? '–' : '+'}</span>}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1 max-h-[72vh] overflow-y-auto">
          <div className="grid grid-cols-[18px_1fr_1fr] gap-x-2 text-[9px] tracking-[0.18em] uppercase text-[#6d6d88] pb-1 border-b border-white/5">
            <div></div>
            <div>MC (overhead)</div>
            <div>IC (underfoot)</div>
          </div>
          {hotspots.map((h) => (
            <div key={h.planet} className="grid grid-cols-[18px_1fr_1fr] gap-x-2 items-start pt-1.5">
              <div
                className="text-[15px] leading-tight text-center"
                style={{ color: h.color }}
                title={h.planet}
              >
                {PLANET_GLYPH[h.planet]}
              </div>
              <div className="text-[11px] leading-tight">
                <div style={{ color: h.color }}>{h.mcLabel}</div>
                <div className="text-[#6d6d88] text-[9px]">{fmtLon(h.mcLon)}</div>
              </div>
              <div className="text-[11px] leading-tight">
                <div className="text-[#c8c8dd]">{h.icLabel}</div>
                <div className="text-[#6d6d88] text-[9px]">{fmtLon(h.icLon)}</div>
              </div>
            </div>
          ))}

          <div className="pt-2 mt-2 border-t border-white/5 text-[9px] text-[#6d6d88] leading-snug">
            Each planet's line runs north–south on Earth at these longitudes.
            Labels show the nearest recognizable place.
          </div>
        </div>
      )}
    </div>
  );
}
