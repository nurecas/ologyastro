// Ology — shared settings-drawer shell.
// Provides the chrome (overlay, slide-in panel, header, close button,
// keyboard shortcut cheatsheet, "About" panel) that every system reuses.
// Each system's own settings (Vedic ayanamsa, HD show-personality, etc.)
// goes inside via children — typically a <SettingsPanel /> component
// living next to the system's store.
//
// Props:
//   open          — controlled open/close state
//   onClose       — close callback
//   accent        — accent colour for the SETTINGS title
//   shortcuts     — array of [keys, label] pairs for the cheatsheet
//   aboutText     — short description of the system, rendered at the bottom
//   children      — system-specific settings panel(s)

import React, { useEffect, useRef } from 'react';

export default function SettingsShell({ open, onClose, accent = '#f5d680', shortcuts = [], aboutText, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside ref={ref}
        className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#0b0b15] border-l border-white/10 shadow-2xl text-[#e6e6f0] overflow-y-auto p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div className="font-serif text-[18px] tracking-[0.18em]" style={{ color: accent }}>SETTINGS</div>
          <button onClick={onClose} className="text-[#9b9bbd] hover:text-white" aria-label="Close settings">✕</button>
        </div>

        {/* Per-system settings panels */}
        {children}

        {shortcuts.length > 0 && (
          <section className="border-t border-white/10 pt-3 mt-3">
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Keyboard</div>
            <ul className="text-[11px] text-[#9b9bbd] space-y-1">
              {shortcuts.map(([k, l]) => (
                <li key={k} className="flex justify-between">
                  <span>{l}</span>
                  <kbd className="ml-2 px-1.5 py-0.5 border border-white/15 rounded text-[#fff8dd]">{k}</kbd>
                </li>
              ))}
            </ul>
          </section>
        )}

        {aboutText && (
          <section className="border-t border-white/10 pt-3 mt-3">
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">About</div>
            <p className="text-[11.5px] text-[#9b9bbd] leading-relaxed">{aboutText}</p>
          </section>
        )}
      </aside>
    </div>
  );
}

// Reusable Row helper used by per-system SettingsPanels for label/control pairs.
export function SettingsRow({ label, sub, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-[13px] text-[#e6e6f0]">{label}</div>
        {sub && <div className="text-[10px] text-[#6d6d88] mt-0.5">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Reusable Pill button — used by per-system Settings for choice toggles.
export function SettingsPill({ active, onClick, accent = '#f5d680', children }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
        active
          ? `bg-[#f5d680]/10 border-[#f5d680]/50 text-[#f5d680]`
          : 'bg-transparent border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]'
      }`}
      style={active ? { borderColor: `${accent}80`, color: accent, background: `${accent}10` } : undefined}
    >
      {children}
    </button>
  );
}
