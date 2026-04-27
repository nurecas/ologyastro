// Vedic — Zustand store. Mirrors birth into the shared blob so Western /
// Gematria / future systems pick up updates. Vedic-exclusive state
// (chart-format, ayanamsa, mode) lives in a private persist key.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeVedicChart } from './compute/chart.js';
import {
  isSwissReady, hasSwissFailed, isSwissLoading, onSwissStateChange,
} from '../astro/ephemeris.js';
import { setShared, readBestBirth, readBestProfiles, subscribeShared, birthEqual } from '../shared/lib/sharedBirth.js';

const DEFAULT_BIRTH = {
  name: '',
  year: 1990, month: 6, day: 21,
  hour: 12, minute: 0,
  tzOffsetMin: 0,
  latDeg: 28.6139, lonDeg: 77.2090,
  placeName: 'New Delhi, India',
};

function currentSwissStatus() {
  if (isSwissReady())   return 'ready';
  if (hasSwissFailed()) return 'failed';
  if (isSwissLoading()) return 'loading';
  return 'idle';
}

function chartFromBirth(birth, ayanamsa) {
  if (!birth || !birth.name) return null;
  try { return computeVedicChart(birth, { ayanamsa }); }
  catch (e) { console.error(e); return null; }
}

export const useVedic = create(
  persist(
    (set, get) => ({
      birth: DEFAULT_BIRTH,
      hasEntered: false,
      profiles: [],
      hintsDismissed: {},
      timeUnknown: false,
      uiMode: 'basic',      // basic | advanced

      // Vedic-specific
      mode: 'rashi',        // rashi | nakshatras | dasha | yogas | compatibility
      ayanamsa: 'lahiri',   // lahiri | kp | raman | truecitra | fagan_bradley
      chartFormat: 'north', // north | south
      settingsOpen: false,

      // Computed
      chart: null,
      swissStatus: currentSwissStatus(),

      setBirth: (b) => {
        const merged = { ...get().birth, ...b };
        set({ birth: merged, chart: chartFromBirth(merged, get().ayanamsa) });
        setShared({ birth: merged });
      },
      setAyanamsa: (ayanamsa) => set({
        ayanamsa,
        chart: chartFromBirth(get().birth, ayanamsa),
      }),
      setChartFormat: (chartFormat) => set({ chartFormat }),
      setMode:        (mode) => set({ mode }),
      setUIMode:      (uiMode) => set({ uiMode }),
      toggleUIMode:   () => set({ uiMode: get().uiMode === 'basic' ? 'advanced' : 'basic' }),
      openSettings:   () => set({ settingsOpen: true }),
      closeSettings:  () => set({ settingsOpen: false }),
      toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),
      setTimeUnknown: (on) => {
        const merged = { ...get().birth };
        if (on) { merged.hour = 12; merged.minute = 0; }
        set({ timeUnknown: !!on, birth: merged, chart: chartFromBirth(merged, get().ayanamsa) });
        setShared({ birth: merged });
      },
      dismissHint: (id, val = true) =>
        set({ hintsDismissed: { ...get().hintsDismissed, [id]: val } }),

      enter: () => set({ hasEntered: true }),
      reset: () => set({ hasEntered: false }),

      rememberProfile: (b) => {
        const k = profileKey(b);
        const others = get().profiles.filter(p => profileKey(p) !== k);
        const next = [{ ...b, _savedAt: Date.now() }, ...others].slice(0, 24);
        set({ profiles: next });
        setShared({ profiles: next });
      },
      forgetProfile: (k) => {
        const next = get().profiles.filter(p => profileKey(p) !== k);
        set({ profiles: next });
        setShared({ profiles: next });
      },
      clearProfiles: () => {
        set({ profiles: [] });
        setShared({ profiles: [] });
      },
      useProfile: (b) => {
        set({
          birth: b, hasEntered: true,
          chart: chartFromBirth(b, get().ayanamsa),
        });
        setShared({ birth: b });   // broadcast to other systems
      },
    }),
    {
      name: 'ology-vedic-v1',
      partialize: (s) => ({
        birth: s.birth,
        hasEntered: s.hasEntered,
        profiles: s.profiles,
        hintsDismissed: s.hintsDismissed,
        timeUnknown: s.timeUnknown,
        uiMode: s.uiMode,
        mode: s.mode,
        ayanamsa: s.ayanamsa,
        chartFormat: s.chartFormat,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const sharedBirth = readBestBirth();
        if (sharedBirth?.name) state.birth = sharedBirth;
        const sharedProfiles = readBestProfiles();
        if (sharedProfiles.length && (!state.profiles || state.profiles.length === 0)) {
          state.profiles = sharedProfiles;
        }
      },
    }
  )
);

export function profileKey(b) {
  return `${(b.name || '').trim()}|${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}|${Number(b.latDeg).toFixed(3)},${Number(b.lonDeg).toFixed(3)}`;
}

// Recompute Vedic chart when Swiss flips state (init complete or failed).
onSwissStateChange(() => {
  const status = currentSwissStatus();
  const s = useVedic.getState();
  useVedic.setState({
    swissStatus: status,
    chart: chartFromBirth(s.birth, s.ayanamsa),
  });
});

// Cross-tab birth sync.
subscribeShared((next) => {
  if (!next?.birth?.name) return;
  const cur = useVedic.getState();
  if (birthEqual(next.birth, cur.birth)) return;
  useVedic.setState({
    birth: next.birth,
    chart: chartFromBirth(next.birth, cur.ayanamsa),
  });
});
