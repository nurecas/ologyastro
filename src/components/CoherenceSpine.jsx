import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useStore } from '../store.js';

export default function CoherenceSpine() {
  const coherence  = useStore(s => s.coherence);
  const weighted   = useStore(s => s.weighted);
  const years      = useStore(s => s.years);
  const peaks      = useStore(s => s.peaks);
  const t          = useStore(s => s.t);
  const setT       = useStore(s => s.setT);
  const startYear  = useStore(s => s.startYear);
  const endYear    = useStore(s => s.endYear);
  const mode       = useStore(s => s.coherenceMode);
  const setMode    = useStore(s => s.setCoherenceMode);
  const events     = useStore(s => s.events);
  const setEvents  = useStore(s => s.setEvents);

  const svgRef = useRef(null);
  const [w, setW] = useState(1200);
  const H = 120;

  useEffect(() => {
    const handle = () => {
      if (svgRef.current) setW(svgRef.current.clientWidth);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const buildPath = (arr) => {
    if (!arr || arr.length === 0) return '';
    const N = arr.length;
    let d = '';
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * w;
      const y = H - 12 - arr[i] * (H - 24);
      d += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  const rawPath      = useMemo(() => buildPath(coherence), [coherence, w]);
  const weightedPath = useMemo(() => buildPath(weighted),  [weighted,  w]);
  const rawFill = useMemo(() => rawPath ? `${rawPath} L ${w} ${H} L 0 ${H} Z` : '', [rawPath, w]);

  const currentX = t * w;
  const idx = Math.round(t * (coherence.length - 1));
  const currentRaw = coherence[idx] || 0;
  const currentW   = weighted[idx]  || 0;

  const onPointerDown = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const move = (ev) => {
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
      setT(x / rect.width);
    };
    move(e);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const decades = useMemo(() => {
    const arr = [];
    const first = Math.ceil(startYear / 50) * 50;
    for (let y = first; y <= endYear; y += 50) arr.push(y);
    return arr;
  }, [startYear, endYear]);

  const showRaw = mode === 'raw' || mode === 'both';
  const showW   = mode === 'weighted' || mode === 'both';

  // Event JSON import.
  const fileRef = useRef(null);
  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const json = JSON.parse(txt);
      if (Array.isArray(json)) setEvents(json.filter(x => typeof x.year === 'number'));
    } catch (err) {
      console.error('Event JSON parse failed:', err);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="w-full select-none">
      {/* toolbar */}
      <div className="px-5 pt-2 flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-[#9b9bbd]">
        <div className="flex items-center gap-2">
          <span className="text-[#6d6d88]">Coherence:</span>
          {['raw', 'weighted', 'both'].map(k => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`btn-ghost ${mode === k ? 'active' : ''}`}
            >{k}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#6d6d88]">Events:</span>
          <label className="btn-ghost cursor-pointer">
            Import JSON
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={onImport}
              className="hidden"
            />
          </label>
          <span className="text-[#6d6d88]">{events.length} loaded</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        preserveAspectRatio="none"
        className="block cursor-crosshair mt-1"
        onPointerDown={onPointerDown}
      >
        <defs>
          <linearGradient id="cohFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#e6e6f0" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e6e6f0" stopOpacity="0.0"  />
          </linearGradient>
          <filter id="glow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {decades.map((yr) => {
          const x = ((yr - startYear) / (endYear - startYear)) * w;
          const is100 = yr % 100 === 0;
          return (
            <g key={yr} opacity={is100 ? 0.25 : 0.1}>
              <line x1={x} x2={x} y1={0} y2={H} stroke="#d8d8e8" strokeWidth={0.6} />
              {is100 && (
                <text x={x + 4} y={H - 4} fontSize="9" fontFamily="Inter, sans-serif" fill="#d8d8e8" opacity={0.55}>
                  {yr}
                </text>
              )}
            </g>
          );
        })}

        {/* Event vertical marks */}
        {events.map((ev, i) => {
          if (ev.year < startYear || ev.year > endYear) return null;
          const x = ((ev.year - startYear) / (endYear - startYear)) * w;
          const col = ev.kind === 'conflict' ? '#ff6a6a' : ev.kind === 'idea' ? '#7ad0ff' : '#b79aff';
          return (
            <g key={i} opacity={0.85}>
              <line x1={x} x2={x} y1={6} y2={H - 4} stroke={col} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.55} />
              <circle cx={x} cy={6} r={2.3} fill={col} />
              <title>{`${ev.year} — ${ev.label || ''}`}</title>
            </g>
          );
        })}

        {/* Raw coherence */}
        {showRaw && (
          <>
            <path d={rawFill} fill="url(#cohFill)" />
            <path d={rawPath} fill="none" stroke="#ffffff" strokeWidth={1.1} opacity={0.85} filter="url(#glow)" />
          </>
        )}
        {/* Weighted coherence */}
        {showW && weightedPath && (
          <path d={weightedPath} fill="none" stroke="#f5a640" strokeWidth={1.25} opacity={0.95} filter="url(#glow)" />
        )}

        {/* Peaks (raw) */}
        {showRaw && peaks.map((p, i) => {
          const x = ((p.year - startYear) / (endYear - startYear)) * w;
          const y = H - 12 - p.value * (H - 24);
          return (
            <g key={i} opacity={0.8}>
              <circle cx={x} cy={y} r={2.3} fill="#fff8dd" />
              <text x={x} y={y - 8} fontSize="9" fontFamily="Inter, sans-serif" fill="#f5d680" textAnchor="middle" opacity={0.85}>
                {Math.round(p.year)}
              </text>
            </g>
          );
        })}

        {/* Scrubber */}
        <line x1={currentX} x2={currentX} y1={0} y2={H} stroke="#f5d680" strokeWidth={1} opacity={0.9} />
        {showRaw && (
          <circle cx={currentX} cy={H - 12 - currentRaw * (H - 24)} r={3.5} fill="#ffffff" stroke="#f5d680" strokeWidth={0.7} />
        )}
        {showW && (
          <circle cx={currentX} cy={H - 12 - currentW * (H - 24)} r={3.5} fill="#f5a640" stroke="#ffcc80" strokeWidth={0.7} />
        )}
      </svg>
    </div>
  );
}
