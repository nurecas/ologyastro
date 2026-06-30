import React, { useMemo, useRef, useState, useEffect } from 'react';
import { usePersonal } from '../store.js';
import { lifeVectorSeries, majorLifeEvents } from '../astro/aspects.js';
import { LAYERS } from '../../astro/layers.js';
import { dateToDecimalYear, decimalYearToDate } from '../../astro/ephemeris.js';

// -----------------------------------------------------------------------------
// The per-chart Event Journal is temporarily hidden: its storage is local-only,
// so clearing the browser wipes it. Flip ENABLE_JOURNAL to true when we have a
// proper (exportable / portable) backing store for events.
// Every related bit of UI below is gated on this flag so bringing the feature
// back is a single-line change. Store actions (addEvent / removeEvent) remain
// wired so any existing saved events in someone's browser are preserved.
// -----------------------------------------------------------------------------
const ENABLE_JOURNAL = false;

const CATEGORIES = [
  { id: 'career',        label: 'Career',        color: '#FF8C00' },
  { id: 'relationship',  label: 'Relationship',  color: '#44FF88' },
  { id: 'health',        label: 'Health',        color: '#ff6a6a' },
  { id: 'move',          label: 'Move / Travel', color: '#4488FF' },
  { id: 'loss',          label: 'Loss / Death',  color: '#8e8fb0' },
  { id: 'insight',       label: 'Insight',       color: '#AA44FF' },
  { id: 'other',         label: 'Other',         color: '#f5d680' },
];
const CAT_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.id, c.color]));

// 100-year life vector graph — one line per vector layer, showing resonance
// between transits of that layer's planets (and axes) and the user's natal
// chart across their life span.

export default function LifeVectorsGraph() {
  const natal    = usePersonal(s => s.natal);
  const birth    = usePersonal(s => s.birth);
  const openInfo = usePersonal(s => s.openInfo);
  const storeEvents = usePersonal(s => s.events);
  const addEvent    = usePersonal(s => s.addEvent);
  const removeEvent = usePersonal(s => s.removeEvent);

  // User-entered life events for this chart.
  const lifeEvents = useMemo(() => {
    const key = `${(birth.name || '').trim()}|${birth.year}-${birth.month}-${birth.day}T${birth.hour}:${birth.minute}|${Number(birth.latDeg).toFixed(3)},${Number(birth.lonDeg).toFixed(3)}`;
    return (storeEvents[key] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  }, [storeEvents, birth]);

  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(LAYERS.map(l => [l.id, true]))
  );
  const [hover, setHover] = useState(null); // { x, y, year, data: [{layer, value}] }
  const [journalOpen, setJournalOpen] = useState(false);
  const [draft, setDraft] = useState({ date: '', label: '', category: 'other' });
  const svgRef = useRef(null);
  const [w, setW] = useState(1200);

  useEffect(() => {
    const handle = () => { if (svgRef.current) setW(svgRef.current.clientWidth); };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  // 100-year window: from birth year to birth year + 100.
  const startYear = birth.year;
  const endYear   = Math.min(birth.year + 100, 2080);

  const { years, series } = useMemo(
    () => lifeVectorSeries({ natal, startYear, endYear, samplesPerYear: 12 }),
    [natal, startYear, endYear]
  );
  const events = useMemo(
    () => majorLifeEvents({ natal, startYear, endYear }),
    [natal, startYear, endYear]
  );

  const H = 360;
  const padL = 52, padR = 18, padT = 24, padB = 40;
  const W_plot = w - padL - padR;
  const H_plot = H - padT - padB;

  // Normalize series to [0, 1] across all enabled series for consistent scaling.
  const { yMin, yMax } = useMemo(() => {
    let mn = 0, mx = 0;
    for (const s of series) {
      if (!enabled[s.layer.id]) continue;
      for (let t = 0; t < s.values.length; t++) {
        const v = s.values[t];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }
    // Fallback to visible range if nothing enabled.
    if (mn === mx) { mn = -0.5; mx = 0.5; }
    return { yMin: mn, yMax: mx };
  }, [series, enabled]);

  const xOfYear = (y) => padL + ((y - startYear) / (endYear - startYear)) * W_plot;
  const yOfVal  = (v) => padT + H_plot - ((v - yMin) / (yMax - yMin)) * H_plot;

  const paths = series.map((s) => {
    if (!enabled[s.layer.id]) return { layer: s.layer, path: '' };
    let d = '';
    for (let t = 0; t < s.values.length; t++) {
      const x = xOfYear(years[t]);
      const y = yOfVal(s.values[t]);
      d += (t === 0 ? 'M' : 'L') + ` ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return { layer: s.layer, path: d };
  });

  const decades = [];
  const startDecade = Math.ceil(startYear / 10) * 10;
  for (let y = startDecade; y <= endYear; y += 10) decades.push(y);

  // Hover
  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padL || x > padL + W_plot) { setHover(null); return; }
    const frac = (x - padL) / W_plot;
    const yr = startYear + frac * (endYear - startYear);
    const idx = Math.round(frac * (years.length - 1));
    const data = series.map(s => ({
      layer: s.layer,
      value: s.values[idx],
    }));
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, year: yr, data });
  };
  const onLeave = () => setHover(null);

  // Click-to-add: clicking a point on the graph opens the journal
  // pre-filled to that year.
  const onChartClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padL || x > padL + W_plot) return;
    const frac = (x - padL) / W_plot;
    const yr = startYear + frac * (endYear - startYear);
    const d = new Date(Date.UTC(Math.floor(yr), 0, 1));
    const days = Math.round((yr - Math.floor(yr)) * 365);
    d.setUTCDate(d.getUTCDate() + days);
    setDraft({
      date: d.toISOString().slice(0, 10),
      label: '',
      category: 'other',
    });
    setJournalOpen(true);
  };

  const saveDraft = () => {
    if (!draft.date) return;
    addEvent(birth, {
      date: draft.date,
      label: draft.label.trim() || 'Untitled',
      category: draft.category,
    });
    setDraft({ date: '', label: '', category: 'other' });
  };

  // Age ribbon.
  const ageAt = (yr) => {
    const birthYear = dateToDecimalYear(new Date(Date.UTC(birth.year, birth.month - 1, birth.day)));
    return yr - birthYear;
  };

  return (
    <div className="w-full p-6 text-[#e6e6f0]">
      <header className="mb-4">
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">
          Life Vectors
        </h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          Each line tracks how actively one <em>vector layer</em> is aspecting
          the natal chart, sampled monthly from {startYear} to {endYear}.
          Peaks are periods when that layer is strongly activated; valleys
          are quiet. For layers built on fast-moving planets alone
          (Emotional, Intellect, Relational), the graph shows slow transits
          to your natal Moon, Mercury, or Venus instead — because fast
          transits themselves average to a flat line on a life-scale.
          Gold tick marks on the ribbon above the graph are significant
          outer-planet transits to natal bodies — classic "event" moments
          like Saturn returns and Uranus oppositions. Tap ℹ on any layer
          badge to read what that vector means.
        </p>
      </header>

      {/* Layer toggle badges — toggle + info icon as two adjacent buttons
          inside a non-interactive wrapper, to avoid nested <button>. */}
      <div className="flex flex-wrap gap-2 mb-3">
        {LAYERS.map(l => (
          <span
            key={l.id}
            className="inline-flex items-center rounded-full border transition-colors overflow-hidden"
            style={{
              borderColor: enabled[l.id] ? l.color : 'rgba(255,255,255,0.15)',
              background: enabled[l.id] ? `${l.color}14` : 'transparent',
            }}
          >
            <button
              onClick={() => setEnabled(e => ({ ...e, [l.id]: !e[l.id] }))}
              className="flex items-center gap-1.5 pl-2.5 pr-2 py-1"
              title="Show or hide this layer"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: l.color, opacity: enabled[l.id] ? 1 : 0.3 }} />
              <span className="text-[12px]" style={{ color: enabled[l.id] ? l.color : '#8b8ba5' }}>
                {l.name}
              </span>
            </button>
            <button
              onClick={(e) =>
                openInfo({ kind: 'layer', id: l.id, name: l.name, color: l.color, x: e.clientX, y: e.clientY })
              }
              className="text-[11px] px-1.5 py-1 text-[#6d6d88] hover:text-white border-l border-white/10"
              aria-label="What this layer means"
              title="What this layer means"
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
          onClick={ENABLE_JOURNAL ? onChartClick : undefined}
          className={`block ${ENABLE_JOURNAL ? 'cursor-crosshair' : ''}`}
        >
          <defs>
            <filter id="layerGlow" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Decade grid */}
          {decades.map(y => (
            <g key={y}>
              <line x1={xOfYear(y)} x2={xOfYear(y)} y1={padT} y2={padT + H_plot}
                    stroke="#d8d8e8" strokeWidth={0.4} opacity={0.12} />
              <text x={xOfYear(y)} y={H - 22} fontSize={10} fill="#8b8ba5" textAnchor="middle">
                {y}
              </text>
              <text x={xOfYear(y)} y={H - 8} fontSize={9.5} fill="#6d6d88" textAnchor="middle">
                age {Math.round(ageAt(y))}
              </text>
            </g>
          ))}

          {/* Zero line */}
          <line
            x1={padL} x2={padL + W_plot}
            y1={yOfVal(0)} y2={yOfVal(0)}
            stroke="#d8d8e8" strokeWidth={0.4} opacity={0.2}
            strokeDasharray="3 3"
          />

          {/* Layer lines */}
          {paths.map(({ layer, path }) =>
            path ? (
              <path
                key={layer.id}
                d={path}
                stroke={layer.color}
                strokeWidth={1.3}
                fill="none"
                opacity={0.85}
                filter="url(#layerGlow)"
              />
            ) : null
          )}

          {/* Major transit event ribbon */}
          {events.map((ev, i) => {
            if (ev.year < startYear || ev.year > endYear) return null;
            const x = xOfYear(ev.year);
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={padT} y2={padT + H_plot}
                      stroke="#f5d680" strokeWidth={0.5} opacity={0.2}
                      strokeDasharray="1 3" />
                <circle cx={x} cy={padT + 4} r={2.2} fill="#f5d680" opacity={0.8} />
                <title>{`${Math.round(ev.year)} — ${ev.transit} ${ev.aspect.glyph} natal ${ev.natal}`}</title>
              </g>
            );
          })}

          {/* User-entered life events (rendered only when the Event Journal
              feature is enabled — see ENABLE_JOURNAL above). */}
          {ENABLE_JOURNAL && lifeEvents.map(ev => {
            const yr = dateToDecimalYear(new Date(ev.date + 'T12:00:00Z'));
            if (yr < startYear || yr > endYear) return null;
            const x = xOfYear(yr);
            const col = CAT_COLOR[ev.category] || '#f5d680';
            return (
              <g key={ev.id}>
                <line x1={x} x2={x} y1={padT + 16} y2={padT + H_plot}
                      stroke={col} strokeWidth={1.1} opacity={0.85} />
                <circle cx={x} cy={padT + 14} r={4} fill={col} stroke="#0a0a14" strokeWidth={1} />
                <title>{`${ev.date} — ${ev.label}`}</title>
              </g>
            );
          })}

          {/* Hover line */}
          {hover && (
            <line
              x1={hover.x} x2={hover.x}
              y1={padT} y2={padT + H_plot}
              stroke="#f5d680" strokeWidth={0.8} opacity={0.9}
            />
          )}

          {/* Y-axis labels */}
          <g>
            {[yMax, (yMax + yMin) / 2, yMin].map((v, i) => (
              <g key={i}>
                <text x={padL - 6} y={yOfVal(v) + 3} fontSize={10} fill="#6d6d88" textAnchor="end">
                  {v.toFixed(2)}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute bg-[#0b0b15]/95 border border-white/10 rounded-md px-2.5 py-2 text-[11px] z-10"
            style={{ left: hover.x + 12, top: hover.y + 12, minWidth: 180 }}
          >
            <div className="text-[#f5d680] text-[12px] mb-1">
              {Math.round(hover.year)} · age {Math.round(ageAt(hover.year))}
            </div>
            {hover.data.filter(d => enabled[d.layer.id])
              .sort((a, b) => b.value - a.value)
              .map(d => (
              <div key={d.layer.id} className="flex items-center justify-between gap-2">
                <span style={{ color: d.layer.color }}>{d.layer.name}</span>
                <span className="text-[#d8d8e8]">{d.value.toFixed(3)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend / hint */}
      <div className="mt-3 flex items-baseline justify-between text-[11px] text-[#6d6d88]">
        <div>
          {events.length} outer-planet transit events on the gold ribbon.
          Hover the chart for exact values at any year.
        </div>
        {ENABLE_JOURNAL && (
          <button
            onClick={() => setJournalOpen(v => !v)}
            className="btn-ghost"
          >
            {journalOpen ? 'Hide journal' : `Event journal · ${lifeEvents.length}`}
          </button>
        )}
      </div>

      {/* Event journal panel */}
      {ENABLE_JOURNAL && journalOpen && (
        <section className="mt-4 bg-[#0c0c18] border border-white/10 rounded-md p-4">
          <div className="grid grid-cols-[1fr_1fr_160px_90px] gap-2 items-end">
            <div>
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Date</div>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))}
                className="form-input text-[13px] py-1.5"
                style={{ colorScheme: 'dark' }}
                min={`${startYear}-01-01`}
                max={`${endYear}-12-31`}
              />
            </div>
            <div>
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Event</div>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                className="form-input text-[13px] py-1.5"
                placeholder="Moved cities · Met partner · Diagnosis …"
              />
            </div>
            <div>
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Category</div>
              <select
                value={draft.category}
                onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
                className="form-input text-[13px] py-1.5"
                style={{ colorScheme: 'dark' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={saveDraft}
              disabled={!draft.date}
              className="py-1.5 rounded-md text-[11.5px] tracking-[0.18em] uppercase bg-[#f5d680] text-[#0b0b15] hover:bg-[#fff3c0] disabled:opacity-40 disabled:cursor-not-allowed"
            >Add</button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 text-[10.5px] text-[#9b9bbd]">
            {CATEGORIES.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                {c.label}
              </span>
            ))}
          </div>

          {lifeEvents.length > 0 && (
            <div className="mt-4">
              <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-2">
                Pinned events · {lifeEvents.length}
              </div>
              <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                {lifeEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: CAT_COLOR[ev.category] }}
                    />
                    <span className="text-[11.5px] text-[#9b9bbd] w-24">{ev.date}</span>
                    <span className="flex-1 text-[12.5px] text-[#e6e6f0]">{ev.label}</span>
                    <span className="text-[10.5px] text-[#6d6d88] capitalize">{ev.category}</span>
                    <button
                      onClick={() => removeEvent(birth, ev.id)}
                      className="text-[#6d6d88] hover:text-[#ff6a6a] text-[13px] leading-none px-1"
                      title="Remove event"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 text-[10.5px] text-[#6d6d88] leading-snug">
            These are yours only — stored in this browser under this chart.
            Pin a few real events, then look at the graph above: you'll start
            to notice which vector lines were peaking when things happened.
          </div>
        </section>
      )}
    </div>
  );
}
