// Ology — system selector pill row.
// Shown above per-system mode pills in every entry. Switching system is a
// page navigation (separate HTMLs); birth data persists across pages via
// localStorage so the destination computes instantly.
//
// Layout: [OLOGY logo] [Western][Vedic][HD][Chinese][Gematria]
// The OLOGY logo at left navigates to the site root. Selected system has
// a SOLID gold fill with dark text — visually unmistakable; non-selected
// systems are subtle outlined pills.

import React from 'react';
import { SYSTEMS, systemUrl } from '../systems.js';

export default function SystemNav({ activeId }) {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  return (
    <div className="flex items-center gap-2 px-3 sm:px-6 py-2 border-b border-white/5 bg-[#0a0a14]/60">
      {/* OLOGY logo — leftmost, clickable, takes the user to the site root. */}
      <a
        href={base}
        className="font-serif text-[14px] sm:text-[16px] tracking-[0.18em] sm:tracking-[0.22em] text-[#f5d680] hover:text-[#fff8dd] transition-colors mr-2 sm:mr-3 select-none shrink-0"
        title="Back to Ology home"
      >
        OLOGY
      </a>
      {/* System pills — horizontally scrollable on narrow screens. */}
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] tracking-[0.18em] sm:tracking-[0.22em] uppercase overflow-x-auto no-scrollbar -mx-1 px-1">
        {SYSTEMS.filter(s => s.enabled || s.id === activeId).map(s => {
          const active = s.id === activeId;
          const cls = active
            ? 'bg-[#f5d680] text-[#0b0b15] border-[#f5d680] font-medium shadow-[0_0_0_1px_rgba(245,214,128,0.6)]'
            : 'text-[#f5d680] border-[#f5d680]/30 hover:bg-[#f5d680]/10 hover:border-[#f5d680]/60';
          return (
            <a
              key={s.id}
              href={systemUrl(s)}
              className={`px-2.5 sm:px-3 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${cls}`}
              title={`Read this birth as ${s.label}`}
            >
              {s.label}
            </a>
          );
        })}
      </div>
      {/* GitHub source link — pushed to the right edge with ml-auto. Open
          in a new tab so the user doesn't lose their chart context. */}
      <a
        href="https://github.com/nurecas/ologyastro"
        target="_blank" rel="noopener noreferrer"
        className="ml-auto shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[10.5px] tracking-[0.18em] sm:tracking-[0.22em] uppercase text-[#9b9bbd] hover:text-[#f5d680] border border-white/10 hover:border-[#f5d680]/40 rounded px-2.5 sm:px-3 py-1 transition-colors"
        title="View source on GitHub — Ology is open source"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span className="hidden sm:inline">Source</span>
      </a>
    </div>
  );
}
