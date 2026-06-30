// Ology — shared keyboard shortcuts.
// Mount once from a system's App.jsx with a config describing that
// system's modes + store. Bindings are stable across systems:
//
//   ⌘1..⌘N  switch to mode index N (1-based)
//   ⌘,      toggle settings drawer
//   ⌘D      trigger PNG download of the active chart
//   Esc     close drawer / popover / dialog (handled by store-specific
//           closeSettings + closeInfo)
//
// Usage:
//   <KeyboardShortcuts
//     getStore={() => useVedic.getState()}
//     modes={['rashi','nakshatras','vargas','strength','dasha','yogas','gochara','sadeSati']}
//     onDownload={() => downloadVedicChart(useVedic.getState().chart, ...)}
//   />

import { useEffect } from 'react';

export default function KeyboardShortcuts({
  getStore,        // () => current store state (with setMode, closeSettings, toggleSettings, info?, closeInfo?)
  modes,           // array of mode-id strings, position N (1-based) ↔ ⌘N
  onDownload,      // () => trigger chart download
  extraBindings,   // optional: { 'Shift+A': () => ..., 'Shift+T': () => ... }
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (!getStore) return;

      // Esc handled WITHOUT modifier — close drawers/popovers.
      if (e.key === 'Escape') {
        const s = getStore();
        if (s.settingsOpen && s.closeSettings) {
          e.preventDefault(); s.closeSettings(); return;
        }
        if (s.info && s.closeInfo) {
          e.preventDefault(); s.closeInfo(); return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Extra bindings (Shift+A, Shift+T, etc.)
      if (extraBindings) {
        const key = (e.shiftKey ? 'Shift+' : '') + e.key.toLowerCase();
        const handler = extraBindings[key];
        if (handler) {
          e.preventDefault();
          handler(getStore());
          return;
        }
      }

      // ⌘, → settings drawer
      if (e.key === ',') {
        e.preventDefault();
        const s = getStore();
        if (s.toggleSettings) s.toggleSettings();
        return;
      }

      // ⌘D → download chart
      if (!e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        try { onDownload && onDownload(getStore()); } catch {}
        return;
      }

      // ⌘1..⌘N → mode switching
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= (modes?.length || 0)) {
        e.preventDefault();
        const s = getStore();
        if (s.setMode) s.setMode(modes[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [getStore, modes, onDownload, extraBindings]);

  return null;
}
