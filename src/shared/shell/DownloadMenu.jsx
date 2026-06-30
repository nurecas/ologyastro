// Ology — Download dropdown.
// Each system mounts this in its top nav and supplies the option handlers.
// Standardised options:
//   PNG         (system supplies)
//   PDF         (system supplies)
//   JSON for AI (system supplies — bakes a prompt + chart payload)
//   Raw JSON    (system supplies — bare chart export)
//
// Any option may be omitted (Gematria has no PNG/PDF in v1, for instance).

import React, { useEffect, useRef, useState } from 'react';

export default function DownloadMenu({ options }) {
  // options: [{ id, label, sub, onClick }]
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="btn-ghost flex items-center gap-1.5"
        title="Download chart"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v8" />
          <path d="M4.5 7.5L8 11l3.5-3.5" />
          <path d="M2.5 13.5h11" />
        </svg>
        <span>Download</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-64 bg-[#0b0b15] border border-white/10 rounded-md shadow-2xl overflow-hidden"
        >
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { opt.onClick(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-white/[0.04] border-b border-white/5 last:border-b-0"
              role="menuitem"
            >
              <div className="text-[12.5px] text-[#e6e6f0]">{opt.label}</div>
              {opt.sub && <div className="text-[10.5px] text-[#9b9bbd] mt-0.5">{opt.sub}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
