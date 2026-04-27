// Gematria — root component. Three modes (Word / Compare / Date), shared
// SystemNav above, top mode-pill row, download menu wired to the
// gematria LLM export.

import React, { useEffect, useState } from 'react';
import { useGematria } from './store.js';
import SystemNav from '../shared/shell/SystemNav.jsx';
import DownloadMenu from '../shared/shell/DownloadMenu.jsx';
import Word, { GematriaInputBar } from './components/Word.jsx';
import Compare from './components/Compare.jsx';
import DateNumerology from './components/DateNumerology.jsx';
import LetterModal from './components/LetterModal.jsx';
import { exportGematriaForLLM, exportGematriaRaw } from './lib/llmExport.js';
import BetaDialog from '../shared/shell/BetaDialog.jsx';

const MODES = [
  { id: 'word',    label: 'Single Word' },
  { id: 'compare', label: 'Compare Two' },
  { id: 'date',    label: 'Date Numerology' },
];

export default function App() {
  const mode      = useGematria(s => s.mode);
  const setMode   = useGematria(s => s.setMode);
  const lang      = useGematria(s => s.lang);
  const input     = useGematria(s => s.input);
  const setInput  = useGematria(s => s.setInput);
  const birth     = useGematria(s => s.birth);
  const [focus, setFocus]       = useState('');
  const [focusOpen, setFocusOpen] = useState(false);

  // First-mount: if the user came from Western with a birth name set and
  // hasn't yet typed anything in Gematria, pre-fill the Word input with
  // their birth name. They can clear or change it freely after.
  useEffect(() => {
    if (!input && birth?.name) setInput(birth.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadOptions = [
    {
      id: 'llm',
      label: 'JSON · for AI interpretation',
      sub: 'Drop into Claude / ChatGPT / Gemini for a number-grounded reading',
      onClick: () => exportGematriaForLLM(useGematria.getState(), focus.trim() || null),
    },
    {
      id: 'raw',
      label: 'JSON · raw values',
      sub: 'Bare export of every system value for portability',
      onClick: () => exportGematriaRaw(useGematria.getState()),
    },
  ];

  return (
    <div className={`min-h-screen bg-[#080810] text-[#e6e6f0] lang-${lang}`}>
      <SystemNav activeId="gematria" />

      {/* Top nav */}
      <nav className="bg-[#0b0b15] border-b border-white/5 px-6 py-2 flex items-center justify-between">
        <div className="flex gap-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`btn-ghost ${mode === m.id ? 'active' : ''}`}
            >{m.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setFocusOpen(v => !v)}
              className="btn-ghost text-[10px] tracking-[0.2em] uppercase"
              title="Optional one-line focus added to the AI export"
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
                  placeholder='e.g. "what does this name carry?"'
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
        </div>
      </nav>

      {/* Header */}
      <header className="text-center pt-12 pb-6 px-6">
        <div className="text-[#d79b3a]/70 text-[12px] tracking-[0.5em] uppercase font-serif mb-3">
          ✦ Mispar · Isopsephy · Abjad ✦
        </div>
        <h1 className="font-serif font-light text-[64px] leading-none tracking-tight bg-gradient-to-b from-[#fff8dd] to-[#f5d680] bg-clip-text text-transparent">
          Gematria
        </h1>
        <p className="font-serif italic text-[16px] text-[#9b9bbd] mt-2 tracking-wide">
          The sacred art of numbering the letters
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        {mode === 'word' && (
          <>
            <GematriaInputBar />
            <Word />
          </>
        )}
        {mode === 'compare' && <Compare />}
        {mode === 'date' && <DateNumerology />}
      </main>

      <footer className="text-center py-6 px-6 border-t border-white/5 font-serif italic text-[12px] text-[#6d6d88]">
        <p>Standard · Ordinal · Reduced · Hidden · Full · Atbash · Albam · Kolel</p>
        <p className="mt-1 opacity-70">Where letter becomes number, number becomes meaning.</p>
      </footer>

      <LetterModal />
      <BetaDialog />
    </div>
  );
}
