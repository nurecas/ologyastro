// Vedic — Life Vectors graph.
// A 100-year activation chart driven by Vimśottarī Daśā (the dominant
// signal), gochara of the slow grahas, aṣṭakavarga strength, and Sade
// Sati. Each line is a life-domain (bhāva cluster + kāraka) plus two
// generic composites. Mirrors the Western Life Vectors UX but reads from
// classical Jyotiṣa timing.

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useVedic } from '../store.js';
import { lifeVectorSeriesVedic, VEDIC_VECTORS } from '../compute/lifeVectors.js';
import { currentMaha, currentAntar } from '../compute/dasha.js';
import { decimalYearToDate, dateToDecimalYear } from '../../astro/ephemeris.js';

export default function LifeVectors() {
  const chart = useVedic(s => s.chart);
  const birth = useVedic(s => s.birth);

  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(VEDIC_VECTORS.map(v => [v.id, !v.composite]))   // composites off by default
  );
  const [info, setInfo] = useState(null);     // { vector, x, y }
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const [w, setW] = useState(1200);

  useEffect(() => {
    const handle = () => { if (svgRef.current) setW(svgRef.current.clientWidth); };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const startYear = birth.year;
  const endYear   = Math.min(birth.year + 100, 2080);

  const { years, series, events } = useMemo(
    () => chart
      ? lifeVectorSeriesVedic({ chart, startYear, endYear, samplesPerYear: 12 })
      : { years: new Float64Array(0), series: [], events: [] },
    [chart, startYear, endYear]
  );

  const H = 380;
  const padL = 46, padR = 18, padT = 26, padB = 44;
  const W_plot = w - padL - padR;
  const H_plot = H - padT - padB;

  const xOfYear = (y) => padL + ((y - startYear) / (endYear - startYear)) * W_plot;
  const yOfVal  = (v) => padT + H_plot - v * H_plot;   // values already in [0,1]

  const paths = series.map((s) => {
    if (!enabled[s.vector.id]) return { vector: s.vector, path: '' };
    let d = '';
    for (let t = 0; t < s.values.length; t++) {
      const x = xOfYear(years[t]);
      const y = yOfVal(s.values[t]);
      d += (t === 0 ? 'M' : 'L') + ` ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return { vector: s.vector, path: d };
  });

  const decades = [];
  const startDecade = Math.ceil(startYear / 10) * 10;
  for (let y = startDecade; y <= endYear; y += 10) decades.push(y);

  const ageAt = (yr) => {
    const birthYear = dateToDecimalYear(new Date(Date.UTC(birth.year, birth.month - 1, birth.day)));
    return yr - birthYear;
  };

  const onMove = (e) => {
    if (!svgRef.current || !years.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padL || x > padL + W_plot) { setHover(null); return; }
    const frac = (x - padL) / W_plot;
    const yr = startYear + frac * (endYear - startYear);
    const idx = Math.max(0, Math.min(years.length - 1, Math.round(frac * (years.length - 1))));
    // Running daśā at this year — the headline Vedic context.
    let maha = null, antar = null;
    if (chart?.dasha?.sequence) {
      maha = currentMaha(chart.dasha.sequence, decimalYearToDate(yr));
      antar = maha ? currentAntar(maha, decimalYearToDate(yr)) : null;
    }
    const data = series.map(s => ({ vector: s.vector, value: s.values[idx] }));
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, year: yr, data, maha, antar });
  };
  const onLeave = () => setHover(null);

  if (!chart) return null;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto">
      <header className="mb-4">
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Life Vectors</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          How strongly each domain of life is activated across your years,
          read from classical Jyotiṣa timing. The dominant signal is your{' '}
          <em className="text-[#f5d680] font-serif">Vimśottarī Daśā</em> — a domain
          lights up when the running Mahādaśā / Antardaśā lord rules it,
          signifies it (kāraka), occupies it, or aspects it, scaled by that
          lord's natal strength. Layered on top is the{' '}
          <em className="text-[#f5d680] font-serif">gochara</em> of the slow grahas
          (Jupiter, Saturn, Rāhu, Ketu), tempered by the{' '}
          <em className="text-[#f5d680] font-serif">aṣṭakavarga</em> bindus of the
          sign they transit, with a Sade Sati lift on Self & Health. Gold
          ticks on the ribbon mark Mahādaśā changes — your big life
          chapters. Each line is scaled to its own lifetime peak, so it
          shows that domain's arc through your life.
        </p>
      </header>

      {/* Toggle badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {VEDIC_VECTORS.map(v => (
          <span
            key={v.id}
            className="inline-flex items-center rounded-full border transition-colors overflow-hidden"
            style={{
              borderColor: enabled[v.id] ? v.color : 'rgba(255,255,255,0.15)',
              background: enabled[v.id] ? `${v.color}14` : 'transparent',
            }}
          >
            <button
              onClick={() => setEnabled(e => ({ ...e, [v.id]: !e[v.id] }))}
              className="flex items-center gap-1.5 pl-2.5 pr-2 py-1"
              title="Show or hide this line"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: v.color, opacity: enabled[v.id] ? 1 : 0.3 }} />
              <span className="text-[12px]" style={{ color: enabled[v.id] ? v.color : '#8b8ba5' }}>
                {v.name}{v.composite ? ' ·' : ''}
              </span>
            </button>
            <button
              onClick={(e) => setInfo({ vector: v, x: e.clientX, y: e.clientY })}
              className="text-[11px] px-1.5 py-1 text-[#6d6d88] hover:text-white border-l border-white/10"
              aria-label="What this line means"
              title="What this line means"
            >ℹ</button>
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={H}
          viewBox={`0 0 ${w} ${H}`}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="block"
        >
          <defs>
            <filter id="vLifeGlow" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="1.1" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Decade grid + age */}
          {decades.map(y => (
            <g key={y}>
              <line x1={xOfYear(y)} x2={xOfYear(y)} y1={padT} y2={padT + H_plot}
                    stroke="#d8d8e8" strokeWidth={0.4} opacity={0.12} />
              <text x={xOfYear(y)} y={H - 26} fontSize={10} fill="#8b8ba5" textAnchor="middle">{y}</text>
              <text x={xOfYear(y)} y={H - 12} fontSize={9.5} fill="#6d6d88" textAnchor="middle">age {Math.round(ageAt(y))}</text>
            </g>
          ))}

          {/* Mahādaśā ribbon — span bands + change ticks */}
          {events.map((ev, i) => {
            if (ev.year < startYear || ev.year > endYear) return null;
            const x = xOfYear(ev.year);
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={padT} y2={padT + H_plot}
                      stroke="#f5d680" strokeWidth={0.5} opacity={0.22} strokeDasharray="2 4" />
                <circle cx={x} cy={padT + 3} r={2.4} fill="#f5d680" opacity={0.85} />
                <text x={x + 3} y={padT + 6} fontSize={9} fill="#d79b3a" opacity={0.85}>{ev.lord}</text>
                <title>{`${Math.round(ev.year)} — ${ev.label}`}</title>
              </g>
            );
          })}

          {/* Vector lines */}
          {paths.map(({ vector, path }) =>
            path ? (
              <path key={vector.id} d={path}
                    stroke={vector.color}
                    strokeWidth={vector.composite ? 1.6 : 1.3}
                    strokeDasharray={vector.composite ? '5 4' : ''}
                    fill="none" opacity={0.9} filter="url(#vLifeGlow)" />
            ) : null
          )}

          {/* Hover line */}
          {hover && (
            <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + H_plot}
                  stroke="#f5d680" strokeWidth={0.8} opacity={0.9} />
          )}

          {/* Y axis */}
          <g>
            {[1, 0.5, 0].map((v, i) => (
              <text key={i} x={padL - 6} y={yOfVal(v) + 3} fontSize={10} fill="#6d6d88" textAnchor="end">
                {v.toFixed(1)}
              </text>
            ))}
          </g>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute bg-[#0b0b15]/96 border border-white/10 rounded-md px-2.5 py-2 text-[11px] z-10"
            style={{ left: Math.min(hover.x + 12, w - 220), top: hover.y + 12, minWidth: 196 }}
          >
            <div className="text-[#f5d680] text-[12px] mb-0.5">
              {Math.round(hover.year)} · age {Math.round(ageAt(hover.year))}
            </div>
            {hover.maha && (
              <div className="text-[10px] text-[#9b9bbd] mb-1.5 border-b border-white/10 pb-1">
                {hover.maha.lord} Mahādaśā{hover.antar ? ` · ${hover.antar.lord} Antar` : ''}
              </div>
            )}
            {hover.data.filter(d => enabled[d.vector.id])
              .sort((a, b) => b.value - a.value)
              .map(d => (
                <div key={d.vector.id} className="flex items-center justify-between gap-3">
                  <span style={{ color: d.vector.color }}>{d.vector.name}</span>
                  <span className="text-[#d8d8e8]">{(d.value * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-[#6d6d88]">
        {events.length} Mahādaśā chapters across the window. Hover the chart
        for the running daśā and each domain's activation at any year.
      </div>

      {/* Info popover */}
      {info && (
        <div className="fixed inset-0 z-40" onClick={() => setInfo(null)}>
          <div
            className="absolute bg-[#0c0c18] border border-white/15 rounded-md shadow-2xl p-4 max-w-[320px]"
            style={{ left: Math.min(info.x, window.innerWidth - 340), top: Math.min(info.y, window.innerHeight - 180) }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: info.vector.color }} />
              <span className="font-serif text-[15px]" style={{ color: info.vector.color }}>{info.vector.name}</span>
            </div>
            <p className="text-[12.5px] text-[#c8c8dd] italic font-serif leading-relaxed">{info.vector.blurb}</p>
            <button onClick={() => setInfo(null)} className="mt-3 text-[10.5px] tracking-[0.2em] uppercase text-[#9b9bbd] hover:text-white">close</button>
          </div>
        </div>
      )}
    </div>
  );
}
