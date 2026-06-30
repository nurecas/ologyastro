// Thin collapsible wrapper for side-column panels on the Transits view.
// Each section gets a small bar with a label + chevron; click toggles.
// Open/closed state persists per-title in the store's `hintsDismissed`
// map (re-purposed as a generic key-value of dismissed-things) so the
// user's layout survives across navigations and reloads.

import React from 'react';
import { usePersonal } from '../store.js';

export default function CollapsibleSection({ title, id, defaultOpen = true, right = null, children }) {
  const storageKey = `section:${id}`;
  const hintsDismissed = usePersonal(s => s.hintsDismissed);
  const dismissHint    = usePersonal(s => s.dismissHint);

  // Tri-state: true=open, false=closed, undefined=default.
  const stored = hintsDismissed?.[storageKey];
  const open = stored === undefined ? defaultOpen : !!stored;
  const toggle = () => dismissHint(storageKey, !open);

  // Transparent — the wrapped panel keeps its own card. When collapsed we
  // show a thin pill with just the title + chevron so the column feels
  // cleaner.
  if (!open) {
    return (
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between bg-[#0a0a14] border border-white/5 rounded-md px-3 py-2 text-left hover:bg-white/[0.04]"
        aria-expanded={false}
        title={`Show ${title}`}
      >
        <span className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd]">
          {title}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-[#6d6d88]">
          {right}
          <span>›</span>
        </span>
      </button>
    );
  }
  // Open: render an invisible mini-collapse button on top of the panel's
  // existing header. We position it absolutely so it doesn't shift the
  // panel's layout; a row of children makes the panel card itself the
  // clickable close-toggle at its own header.
  return (
    <div className="relative group">
      <button
        onClick={toggle}
        className="absolute top-2 right-3 z-10 text-[#6d6d88] hover:text-[#e6e6f0] text-[11px] px-1 rounded"
        aria-expanded={true}
        aria-label={`Hide ${title}`}
        title={`Hide ${title}`}
      >
        ▾
      </button>
      {children}
    </div>
  );
}
