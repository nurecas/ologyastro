import React, { useState } from 'react';
import { usePersonal } from '../store.js';
import { downloadNatalChart } from '../lib/downloadChart.js';
import { exportWesternForLLM, exportWesternRaw } from '../lib/llmExport.js';
import SystemNav from '../../shared/shell/SystemNav.jsx';
import DownloadMenu from '../../shared/shell/DownloadMenu.jsx';

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

  const downloadOptions = [
    {
      id: 'png',
      label: 'PNG · chart image',
      sub: '1400 × 1800 px — ready to share, print or paste alongside the JSON',
      onClick: onDownloadPNG,
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
    <nav className="bg-[#0b0b15] border-b border-white/5 px-6 py-2 flex items-center justify-between">
      {/* Left: mode buttons */}
      <div className="flex gap-1">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`btn-ghost ${mode === m.id ? 'active' : ''}`}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Right: chart actions + brand. Download dropdown offers PNG, JSON-
          for-AI (with optional focus line), and raw JSON. Then "Change
          chart" returns to the birth form, gear opens settings. */}
      <div className="flex items-center gap-3">
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
            <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-[#0b0b15] border border-white/10 rounded-md shadow-2xl p-3">
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
          <span>Change chart</span>
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
