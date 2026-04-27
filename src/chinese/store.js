// Chinese BaZi — Zustand store. Mirrors birth into the shared blob;
// chart-exclusive state (gender, mode) lives in a private persist key.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeBaziChart } from './compute/chart.js';
import {
  isSwissReady, hasSwissFailed, isSwissLoading, onSwissStateChange,
} from '../astro/ephemeris.js';
import { setShared, readBestBirth, readBestProfiles, subscribeShared, birthEqual } from '../shared/lib/sharedBirth.js';

const DEFAULT_BIRTH = {
  name: '',
  year: 1990, month: 6, day: 21,
  hour: 12, minute: 0,
  tzOffsetMin: 480,
  latDeg: 31.2304, lonDeg: 121.4737,
  placeName: 'Shanghai',
};

function currentSwissStatus() {
  if (isSwissReady())   return 'ready';
  if (hasSwissFailed()) return 'failed';
  if (isSwissLoading()) return 'loading';
  return 'idle';
}

function chartFromBirth(birth, gender) {
  if (!birth || !birth.name) return null;
  try { return computeBaziChart(birth, { gender }); }
  catch (e) { console.error(e); return null; }
}

export const useBazi = create(
  persist(
    (set, get) => ({
      birth: DEFAULT_BIRTH,
      hasEntered: false,
      profiles: [],
      hintsDismissed: {},
      timeUnknown: false,
      gender: 'male',          // 'male' | 'female'

      mode: 'pillars',         // pillars | daymaster | tengods | luck
      settingsOpen: false,

      chart: null,
      swissStatus: currentSwissStatus(),

      setBirth: (b) => {
        const merged = { ...get().birth, ...b };
        set({ birth: merged, chart: chartFromBirth(merged, get().gender) });
        setShared({ birth: merged });
      },
      setGender: (g) => {
        set({ gender: g, chart: chartFromBirth(get().birth, g) });
      },
      setMode: (mode) => set({ mode }),
      openSettings:   () => set({ settingsOpen: true }),
      closeSettings:  () => set({ settingsOpen: false }),
      toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),
      setTimeUnknown: (on) => {
        const merged = { ...get().birth };
        if (on) { merged.hour = 12; merged.minute = 0; }
        set({ timeUnknown: !!on, birth: merged, chart: chartFromBirth(merged, get().gender) });
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
          chart: chartFromBirth(b, get().gender),
        });
        setShared({ birth: b });   // broadcast to other systems
      },
    }),
    {
      name: 'ology-bazi-v1',
      partialize: (s) => ({
        birth: s.birth,
        hasEntered: s.hasEntered,
        profiles: s.profiles,
        hintsDismissed: s.hintsDismissed,
        timeUnknown: s.timeUnknown,
        gender: s.gender,
        mode: s.mode,
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

onSwissStateChange(() => {
  const status = currentSwissStatus();
  const s = useBazi.getState();
  useBazi.setState({
    swissStatus: status,
    chart: chartFromBirth(s.birth, s.gender),
  });
});

subscribeShared((next) => {
  if (!next?.birth?.name) return;
  const cur = useBazi.getState();
  if (birthEqual(next.birth, cur.birth)) return;   // full deep-equal dedup
  useBazi.setState({
    birth: next.birth,
    chart: chartFromBirth(next.birth, cur.gender),
  });
});
