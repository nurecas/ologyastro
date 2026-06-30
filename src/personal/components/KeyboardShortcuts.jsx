// -----------------------------------------------------------------------------
// Phase 5 — Keyboard shortcuts (Section 3.9)
//
// Content-stable bindings (don't shift when Advanced toggles on/off).
// Mounted once from App.jsx; no rendered output.
// -----------------------------------------------------------------------------

import { useEffect } from 'react';
import { usePersonal } from '../store.js';
import { downloadNatalChart } from '../lib/downloadChart.js';

const MODE_KEYS = { '1': 'profile', '2': 'vectors', '3': 'wheel', '4': 'globe', '5': 'synastry', '6': 'predictive' };

export default function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      // Esc — close any open drawer / popover / test mode. Non-Cmd first.
      if (e.key === 'Escape') {
        const s = usePersonal.getState();
        if (window.location.hash?.toLowerCase() === '#test') {
          e.preventDefault();
          history.replaceState(null, '', window.location.pathname + window.location.search);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          return;
        }
        if (s.settingsOpen) { e.preventDefault(); s.closeSettings(); return; }
        if (s.info)         { e.preventDefault(); s.closeInfo(); return; }
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd+Shift+A toggles Basic/Advanced
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        usePersonal.getState().toggleUIMode();
        return;
      }
      // Cmd+Shift+T opens test mode (hash route; test mode UI lands in Phase 7)
      if (e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        window.location.hash = 'test';
        return;
      }
      // Cmd+,  opens settings
      if (e.key === ',') {
        e.preventDefault();
        usePersonal.getState().toggleSettings();
        return;
      }
      // Cmd+D  downloads chart
      if (!e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const natal = usePersonal.getState().natal;
        try { downloadNatalChart(natal); } catch {}
        return;
      }
      // Cmd+1..6 switch modes
      if (MODE_KEYS[e.key]) {
        e.preventDefault();
        const target = MODE_KEYS[e.key];
        const s = usePersonal.getState();
        // Predictive only available in Advanced mode
        if (target === 'predictive' && s.uiMode !== 'advanced') return;
        s.setMode(target);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
