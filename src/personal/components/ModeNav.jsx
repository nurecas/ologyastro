import React, { useRef, useState } from 'react';
import { usePersonal } from '../store.js';
import { downloadNatalChart } from '../lib/downloadChart.js';
import { downloadAstroMap } from '../lib/downloadAstroMap.js';
import { exportWesternForLLM, exportWesternRaw } from '../lib/llmExport.js';
import SystemNav from '../../shared/shell/SystemNav.jsx';
import DownloadMenu from '../../shared/shell/DownloadMenu.jsx';
import useViewportClamp from '../../shared/lib/useViewportClamp.js';
import useActiveTabInView from '../../shared/lib/useActiveTabInView.js';

// Phase 5: nav order matches brief Section 3.3 — Predictive is the 6th
// mode, inserted between Transits and Map. Hidden in Basic mode. The
// keyboard shortcut Cmd+6 maps to Predictive regardless of nav position.
const MODES_ALL = [
  { id: 'profile',    label: 'Profile',    hint: 'Chart at-a-glance: anchors, balance, patterns',         advanced: false },
  { id: 'vectors',    label: 'Life',       hint: '100-year resonance per vector layer',                    advanced: false },
  { id: 'wheel',      label: 'Transits',   hint: 'Birth chart + today + forecast',                         advanced: false },
  { id: 'predictive', label: 'Predictive', hint: 'Progressions, Solar Arcs, Solar & Lunar Returns',        advanced: true  },
  { id: 'globe',      label: 'Map',        hint: 'AstroCartography + ideal-place + compare',               advanced: false },
  { id: 'synastry',   label: 'Synastry',   hint: 'Compare two charts',                                     advanced: false },
];

export default function ModeNav() {
  const mode          = usePersonal(s => s.mode);
  const setMode       = usePersonal(s => s.setMode);
  const reset         = usePersonal(s => s.reset);
  const natal         = usePersonal(s => s.natal);
  const uiMode        = usePersonal(s => s.uiMode);
  const toggleSettings = usePersonal(s => s.toggleSettings);
  const advanced      = uiMode === 'advanced';
  const MODES         = MODES_ALL.filter(m => !m.advanced || advanced);

  const onDownloadPNG = () => {
    try { downloadNatalChart(natal); }
    catch (e) { console.error('Chart download failed:', e); }
  };

  // Optional one-line "focus" the user can add before exporting for an LLM.
  const [focus, setFocus] = useState('');
  const [focusOpen, setFocusOpen] = useState(false);
  const focusRef = useRef(null);
  useViewportClamp(focusRef, focusOpen);
  const tabsRef = useRef(null);
  useActiveTabInView(tabsRef, mode);

  const downloadOptions = [
    {
      id: 'png',
      label: 'PNG · chart image',
      sub: '1400 × 1800 px — ready to share, print or paste alongside the JSON',
      onClick: onDownloadPNG,
    },
    {
      id: 'astromap',
      label: 'PNG · astrocartography map',
      sub: '2400 × 1200 — your planet lines on a flat world map',
      onClick: () => {
        try { downloadAstroMap(natal); }
        catch (e) { console.error('Astro map download failed:', e); }
      },
    },
    {
      id: 'llm',
      label: 'JSON · for AI interpretation',
      sub: 'Drop into Claude / ChatGPT / Gemini for a grounded reading',
      // Re-read the store at click time so changes to settings, focus, or
      // recomputed natal made between render and click are honoured.
      onClick: () => exportWesternForLLM(usePersonal.getState(), focus.trim() || null),
    },
    {
      id: 'raw',
      label: 'JSON · raw chart data',
      sub: 'Bare chart export for portability',
      onClick: () => exportWesternRaw(usePersonal.getState()),
    },
  ];

  return (
    <>
    <SystemNav activeId="western" />
    {/* Below lg the two halves wrap onto separate rows: the mode pills get a
        full-width row that scrolls sideways inside itself when needed, the
        chart actions sit beneath. lg+ is the original single row. */}
    <nav className="bg-[#0b0b15] border-b border-white/5 px-3 sm:px-6 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-2">
      {/* Left: mode buttons */}
      <div ref={tabsRef} className="flex gap-1 overflow-x-auto no-scrollbar min-w-0 max-w-full">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`btn-ghost shrink-0 whitespace-nowrap ${mode === m.id ? 'active' : ''}`}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Right: chart actions + brand. Download dropdown offers PNG, JSON-
          for-AI (with optional focus line), and raw JSON. Then "Change
          chart" returns to the birth form, gear opens settings. */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <div className="relative">
          <button
            onClick={() => setFocusOpen(v => !v)}
            className="btn-ghost text-[10px] tracking-[0.2em] uppercase"
            title="Optional one-line focus added to the AI export"
            aria-expanded={focusOpen}
          >
            {focus ? '✦ Focus set' : '✦ Focus'}
          </button>
          {focusOpen && (
            <div ref={focusRef} className="absolute right-0 top-full mt-1 z-30 w-72 bg-[#0b0b15] border border-white/10 rounded-md shadow-2xl p-3">
              <div className="text-[10px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Focus for AI reading</div>
              <input
                type="text"
                value={focus}
                onChange={e => setFocus(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setFocusOpen(false)}
                placeholder='e.g. "career direction in 2026"'
                className="form-input text-[12px] py-1.5"
                autoFocus
              />
              <div className="text-[10px] text-[#6d6d88] mt-1.5 leading-snug">
                Optional. Added to the JSON export so the AI weights its reading toward this — without ignoring the rest.
              </div>
            </div>
          )}
        </div>
        <DownloadMenu options={downloadOptions} />
        <button
          onClick={reset}
          className="btn-ghost flex items-center gap-1.5"
          title="Edit this chart or switch to another saved one"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6h9l-2-2" />
            <path d="M14 10H5l2 2" />
          </svg>
          <span className="sm:hidden">Change</span>
          <span className="hidden sm:inline">Change chart</span>
        </button>
        <button
          onClick={toggleSettings}
          className="btn-ghost flex items-center justify-center w-8 h-8"
          title="Settings (⌘,)"
          aria-label="Settings"
        >
          {/* Classic cog: outer gear teeth + inner ring + hub. Unambiguous
              vs the previous radial-rays icon that read like a sun. */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
    </>
  );
}
