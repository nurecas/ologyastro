// Chinese BaZi App — root component.

import React, { useEffect, useState } from 'react';
import { useBazi } from './store.js';
import SystemNav from '../shared/shell/SystemNav.jsx';
import DownloadMenu from '../shared/shell/DownloadMenu.jsx';
import BirthForm from './components/BirthForm.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import BetaDialog from '../shared/shell/BetaDialog.jsx';
import KeyboardShortcuts from '../shared/shell/KeyboardShortcuts.jsx';
import {
  PillarsPane, DayMasterPane, TenGodsPane, LuckPillarsPane,
} from './components/Panes.jsx';
import { exportBaziForLLM, exportBaziRaw } from './lib/llmExport.js';
import { downloadBaziChart } from './lib/downloadChart.js';

const MODES = [
  { id: 'pillars',    label: 'Four Pillars',  hint: 'Year · Month · Day · Hour' },
  { id: 'daymaster',  label: 'Day Master',    hint: 'Day stem archetype + strength' },
  { id: 'tengods',    label: 'Ten Gods',      hint: 'Distribution + reference' },
  { id: 'luck',       label: 'Luck Pillars',  hint: 'Decadal cycles' },
];

export default function App() {
  const hasEntered  = useBazi(s => s.hasEntered);
  const chart       = useBazi(s => s.chart);
  const mode        = useBazi(s => s.mode);
  const setMode     = useBazi(s => s.setMode);
  const reset       = useBazi(s => s.reset);
  const swissStatus = useBazi(s => s.swissStatus);
  const toggleSet   = useBazi(s => s.toggleSettings);

  const [focus, setFocus] = useState('');
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const s = useBazi.getState();
      if (s.settingsOpen) { e.preventDefault(); s.closeSettings(); }
      else if (focusOpen) { setFocusOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusOpen]);

  const downloadOptions = [
    { id: 'png', label: 'PNG · Four Pillars chart',
      sub: 'High-resolution chart with pillars, elements, luck',
      onClick: () => downloadBaziChart(useBazi.getState().chart) },
    { id: 'llm', label: 'JSON · for AI interpretation',
      sub: 'Drop into Claude / ChatGPT / Gemini for a BaZi reading',
      onClick: () => exportBaziForLLM(useBazi.getState(), focus.trim() || null) },
    { id: 'raw', label: 'JSON · raw chart data',
      sub: 'Bare pillars + ten gods + luck',
      onClick: () => exportBaziRaw(useBazi.getState()) },
  ];

  if (hasEntered && !chart && (swissStatus === 'loading' || swissStatus === 'idle')) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#080810] text-[#e6e6f0]">
        <div className="text-sm tracking-wide text-[#ff6a6a] animate-pulse">
          Loading solar-term ephemeris…
        </div>
      </div>
    );
  }
  if (!hasEntered || !chart) return <><BirthForm /><SettingsDrawer /><BetaDialog /></>;

  return (
    <div className="w-screen min-h-screen flex flex-col bg-[#080810] text-[#e6e6f0]">
      <SystemNav activeId="chinese" />

      <nav className="bg-[#0b0b15] border-b border-white/5 px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 min-w-0">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
                    className={`btn-ghost shrink-0 whitespace-nowrap ${mode === m.id ? 'active' : ''}`}
                    title={m.hint}>{m.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative">
            <button onClick={() => setFocusOpen(v => !v)}
                    className="btn-ghost text-[10px] tracking-[0.2em] uppercase"
                    title="Optional one-line focus added to the AI export"
                    aria-expanded={focusOpen}>
              {focus ? '✦ Focus set' : '✦ Focus'}
            </button>
            {focusOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-[#0b0b15] border border-white/10 rounded-md shadow-2xl p-3">
                <div className="text-[10px] tracking-[0.22em] uppercase text-[#9b9bbd] mb-1">Focus for AI reading</div>
                <input type="text" value={focus}
                       onChange={e => setFocus(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && setFocusOpen(false)}
                       placeholder='e.g. "career direction this decade?"'
                       className="form-input text-[12px] py-1.5"
                       autoFocus />
              </div>
            )}
          </div>
          <DownloadMenu options={downloadOptions} />
          <button onClick={reset} className="btn-ghost flex items-center gap-1.5" title="Edit chart">
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
        {mode === 'pillars'   && <PillarsPane />}
        {mode === 'daymaster' && <DayMasterPane />}
        {mode === 'tengods'   && <TenGodsPane />}
        {mode === 'luck'      && <LuckPillarsPane />}
      </main>

      <SettingsDrawer />
      <BetaDialog />
      <KeyboardShortcuts
        getStore={() => useBazi.getState()}
        modes={MODES.map(m => m.id)}
        onDownload={(s) => downloadBaziChart(s.chart)}
      />
    </div>
  );
}
