// Vedic App — root component.
// Renders BirthForm if not entered; otherwise the active mode (Rashi / Nakshatras / Dasha)
// with shared SystemNav + DownloadMenu chrome.

import React, { useEffect, useState } from 'react';
import { useVedic } from './store.js';
import SystemNav from '../shared/shell/SystemNav.jsx';
import DownloadMenu from '../shared/shell/DownloadMenu.jsx';
import BirthForm from './components/BirthForm.jsx';
import Rashi from './components/Rashi.jsx';
import Nakshatras from './components/Nakshatras.jsx';
import Dasha from './components/Dasha.jsx';
import Yogas from './components/Yogas.jsx';
import SadeSati from './components/SadeSati.jsx';
import Vargas from './components/Vargas.jsx';
import Strength from './components/Strength.jsx';
import Gochara from './components/Gochara.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import PrecisionBadge from './components/PrecisionBadge.jsx';
import BetaDialog from '../shared/shell/BetaDialog.jsx';
import KeyboardShortcuts from '../shared/shell/KeyboardShortcuts.jsx';
import { exportVedicForLLM, exportVedicRaw } from './lib/llmExport.js';
import { downloadVedicChart } from './lib/downloadChart.js';

const MODES = [
  { id: 'rashi',      label: 'Rashi',       hint: 'Lagna · planets · panchang · arudha · upagrahas' },
  { id: 'nakshatras', label: 'Nakshatras',  hint: 'Lunar mansions · pada · janma nakshatra' },
  { id: 'vargas',     label: 'Vargas',      hint: 'Divisional charts D-1 through D-60' },
  { id: 'strength',   label: 'Strength',    hint: 'Ashtakavarga bindu table' },
  { id: 'dasha',      label: 'Dasha',       hint: 'Vimshottari periods + date probe' },
  { id: 'yogas',      label: 'Yogas',       hint: 'Combinations · doshas · argala · rashi drishti' },
  { id: 'gochara',    label: 'Transits',    hint: 'Live gochara from natal Moon and Lagna' },
  { id: 'sadeSati',   label: 'Sade Sati',   hint: 'Saturn periods over the lifetime' },
];

export default function App() {
  const hasEntered  = useVedic(s => s.hasEntered);
  const chart       = useVedic(s => s.chart);
  const mode        = useVedic(s => s.mode);
  const setMode     = useVedic(s => s.setMode);
  const reset       = useVedic(s => s.reset);
  const swissStatus = useVedic(s => s.swissStatus);
  const toggleSet   = useVedic(s => s.toggleSettings);

  const [focus, setFocus] = useState('');
  const [focusOpen, setFocusOpen] = useState(false);

  // Esc handlers (settings drawer; focus dropdown).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const s = useVedic.getState();
      if (s.settingsOpen) { e.preventDefault(); s.closeSettings(); }
      else if (focusOpen) { setFocusOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusOpen]);

  const downloadOptions = [
    {
      id: 'png',
      label: 'PNG · Rashi (D-1) chart',
      sub: 'Janma kundali in your preferred format with planets and dignities',
      onClick: () => {
        const s = useVedic.getState();
        downloadVedicChart(s.chart, s.chartFormat);
      },
    },
    {
      id: 'llm',
      label: 'JSON · for AI interpretation',
      sub: 'Drop into Claude / ChatGPT / Gemini for a Jyotish reading',
      onClick: () => exportVedicForLLM(useVedic.getState(), focus.trim() || null),
    },
    {
      id: 'raw',
      label: 'JSON · raw chart data',
      sub: 'Bare sidereal positions + dasha tree for portability',
      onClick: () => exportVedicRaw(useVedic.getState()),
    },
  ];

  // Loading state — the chart needs Swiss before it can compute.
  if (hasEntered && !chart && (swissStatus === 'loading' || swissStatus === 'idle')) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#080810] text-[#e6e6f0]">
        <div className="text-sm tracking-wide text-[#d79b3a] animate-pulse">
          Loading sidereal ephemeris…
        </div>
      </div>
    );
  }

  if (!hasEntered || !chart) return <><BirthForm /><SettingsDrawer /><BetaDialog /></>;

  return (
    <div className="w-screen min-h-screen flex flex-col bg-[#080810] text-[#e6e6f0]">
      <SystemNav activeId="vedic" />

      <nav className="bg-[#0b0b15] border-b border-white/5 px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 min-w-0">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`btn-ghost shrink-0 whitespace-nowrap ${mode === m.id ? 'active' : ''}`}
              title={m.hint}
            >{m.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative">
            <button
              onClick={() => setFocusOpen(v => !v)}
              className="btn-ghost text-[10px] tracking-[0.2em] uppercase"
              title="Optional one-line focus added to the AI export"
              aria-expanded={focusOpen}
            >{focus ? '✦ Focus set' : '✦ Focus'}</button>
            {focusOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-[#0b0b15] border border-white/10 rounded-md shadow-2xl p-3">
                <div className="text-[10px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Focus for AI reading</div>
                <input
                  type="text"
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setFocusOpen(false)}
                  placeholder='e.g. "what does the running dasha bring?"'
                  className="form-input text-[12px] py-1.5"
                  autoFocus
                />
                <div className="text-[10px] text-[#6d6d88] mt-1.5 leading-snug">
                  Optional. Added to the JSON so the AI weights its reading toward this.
                </div>
              </div>
            )}
          </div>
          <DownloadMenu options={downloadOptions} />
          <button onClick={reset} className="btn-ghost flex items-center gap-1.5" title="Edit chart or load another saved one">
            <span>↻ Birth</span>
          </button>
          <button onClick={toggleSet} className="btn-ghost flex items-center justify-center w-8 h-8" title="Settings (⌘,)" aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-auto">
        {mode === 'rashi'      && <Rashi />}
        {mode === 'nakshatras' && <Nakshatras />}
        {mode === 'vargas'     && <Vargas />}
        {mode === 'strength'   && <Strength />}
        {mode === 'dasha'      && <Dasha />}
        {mode === 'yogas'      && <Yogas />}
        {mode === 'gochara'    && <Gochara />}
        {mode === 'sadeSati'   && <SadeSati />}
      </main>

      <SettingsDrawer />
      <PrecisionBadge />
      <BetaDialog />
      <KeyboardShortcuts
        getStore={() => useVedic.getState()}
        modes={MODES.map(m => m.id)}
        onDownload={(s) => downloadVedicChart(s.chart, s.chartFormat)}
      />
    </div>
  );
}
