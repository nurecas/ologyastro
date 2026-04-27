import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeNatal } from './astro/natal.js';
import {
  isSwissReady, hasSwissFailed, isSwissLoading,
  onSwissStateChange, isInSwissRange, dateToJD,
  setEphemerisOptions,
} from '../astro/ephemeris.js';
import { setShared, readBestBirth, readBestProfiles, subscribeShared, birthEqual } from '../shared/lib/sharedBirth.js';

// Default "exemplar" birth so the page is never blank — user overwrites.
const DEFAULT_BIRTH = {
  name: 'Exemplar',
  year: 1990, month: 6, day: 21,
  hour: 12, minute: 0,
  tzOffsetMin: 0,        // UTC by default — user will change
  latDeg:  28.6139,      // New Delhi
  lonDeg:  77.2090,
  placeName: 'New Delhi, India',
};

// Snapshot of Swiss backend status for UI gating. Updated via the
// onSwissStateChange subscription below.
function currentSwissStatus() {
  if (isSwissReady()) return 'ready';
  if (hasSwissFailed()) return 'failed';
  if (isSwissLoading()) return 'loading';
  return 'idle'; // not started (e.g. Node test path)
}

// Per the brief's Phase-1 rule ("do not engage the Standish+Meeus fallback
// while loading — only if init fails outright"), we withhold the natal
// computation while Swiss is in flight AND the birth is inside the Swiss
// range. Out-of-range dates always compute immediately (Swiss can never
// help them). When Swiss resolves we recompute via the subscription
// further down.
function natalFromBirth(b, state) {
  if (!b) return null;
  // In the browser we also treat `'idle'` as "wait" because store.js is
  // module-evaluated before main.jsx calls initSwiss() — at that instant
  // Swiss has not yet flipped to `'loading'`. In Node the `window` guard
  // keeps tests synchronous on the Standish+Meeus path.
  const status = currentSwissStatus();
  const browser = typeof window !== 'undefined';
  if (browser && (status === 'loading' || status === 'idle')) {
    try {
      const utcMs = Date.UTC(b.year, (b.month || 1) - 1, b.day || 1,
                             b.hour || 0, b.minute || 0) - (b.tzOffsetMin || 0) * 60000;
      if (isInSwissRange(dateToJD(new Date(utcMs)))) return null;
    } catch {}
  }
  try {
    return computeNatal(b, {
      houseSystem: state?.houseSystem || 'placidus',
    });
  } catch (e) { console.error(e); return null; }
}

// Unique key for a birth profile (for deduplication in the session list).
export function profileKey(b) {
  return `${(b.name || '').trim()}|${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}|${Number(b.latDeg).toFixed(3)},${Number(b.lonDeg).toFixed(3)}`;
}

export const usePersonal = create(
  persist(
    (set, get) => ({
      birth: DEFAULT_BIRTH,
      // Phase 3 chart settings. Exposed via the Settings drawer in Phase 5;
      // stored here so every recompute picks them up and persistence
      // survives page reloads. Defaults match brief:
      //   tropical / Placidus — Basic-mode defaults.
      zodiac:       'tropical',   // 'tropical' | 'sidereal'
      ayanamsa:     'lahiri',     // only consulted when zodiac === 'sidereal'
      houseSystem:  'placidus',   // 'placidus' | 'whole-sign' | 'koch' | 'equal'
      // Phase 2 optional toggles (Advanced-only, surfaced in Settings drawer).
      includeUranian:   false,
      showFixedStars:   false,
      // Phase 5 UI mode + drawer + extras
      uiMode:           'basic',   // 'basic' | 'advanced'
      settingsOpen:     false,      // right-side settings drawer open?
      showChartPatterns: true,      // Advanced-only — on by default
      showPlanetaryHours: false,    // Advanced-only — off by default
      predictiveType:   'progressions', // which chart Predictive mode shows
      predictiveYear:   new Date().getUTCFullYear(),  // target year for Solar Return etc.
      triWheelOn:       false,      // Advanced toggle in Transits
      davisonOn:        false,      // Advanced toggle in Synastry
      hintsDismissed:   {},         // one-off UI hints the user has closed
      timeUnknown:      false,      // "I don't know the exact birth time" flag
      natal: natalFromBirth(DEFAULT_BIRTH, { houseSystem: 'placidus' }),
      // Mirrors the ephemeris backend status so components can gate UI on
      // `'loading'` (show "Loading ephemeris…") vs `'ready'` / `'failed'`.
      swissStatus: currentSwissStatus(),

      // Saved profiles for quick-swap. Local only; cleared via the UI.
      profiles: [],  // array of birth objects (see DEFAULT_BIRTH shape)

      // Per-profile life events. Keyed by profileKey(birth) → array of
      //   { id, date: 'YYYY-MM-DD', label, category }.
      // Category ∈ 'career' | 'relationship' | 'health' | 'move' |
      //            'loss' | 'insight' | 'other'
      events: {},

      // Synastry — id of the "partner" profile (from profiles list) to
      // compare against the active chart.
      partnerKey: null,

      hasEntered: false,
      mode: 'profile',  // default landing view

      transitT: null,
      liveNow: true,

      setBirth: (b) => {
        const merged = { ...get().birth, ...b };
        set({ birth: merged, natal: natalFromBirth(merged, get()) });
        // Mirror to the shared-birth blob so other systems see this update.
        setShared({ birth: merged });
      },

      // Phase 3 settings actions. Each triggers a natal recompute and
      // propagates the zodiac / ayanamsa choice to the ephemeris backend
      // so transits, progressions, etc. also see the switch.
      setZodiac: (zodiac) => {
        setEphemerisOptions({ zodiac, ayanamsa: get().ayanamsa });
        set({ zodiac, natal: natalFromBirth(get().birth, { ...get(), zodiac }) });
      },
      setAyanamsa: (ayanamsa) => {
        setEphemerisOptions({ zodiac: get().zodiac, ayanamsa });
        set({ ayanamsa, natal: natalFromBirth(get().birth, { ...get(), ayanamsa }) });
      },
      setHouseSystem: (houseSystem) => {
        set({ houseSystem, natal: natalFromBirth(get().birth, { ...get(), houseSystem }) });
      },
      setIncludeUranian: (on) => set({ includeUranian: !!on }),
      setShowFixedStars: (on) => set({ showFixedStars: !!on }),

      // Phase 5 actions
      setUIMode: (uiMode) => set({ uiMode }),
      toggleUIMode: () => set({ uiMode: get().uiMode === 'basic' ? 'advanced' : 'basic' }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),
      setShowChartPatterns: (on) => set({ showChartPatterns: !!on }),
      setShowPlanetaryHours: (on) => set({ showPlanetaryHours: !!on }),
      setPredictiveType: (t) => set({ predictiveType: t }),
      setPredictiveYear: (y) => set({ predictiveYear: Number(y) }),
      setTriWheelOn: (on) => set({ triWheelOn: !!on }),
      setDavisonOn: (on) => set({ davisonOn: !!on }),
      setTimeUnknown: (on) => {
        const merged = { ...get().birth };
        if (on) { merged.hour = 12; merged.minute = 0; }
        set({ timeUnknown: !!on, birth: merged, natal: natalFromBirth(merged, get()) });
      },
      dismissHint: (id, value = true) =>
        set({ hintsDismissed: { ...get().hintsDismissed, [id]: value } }),

      // Life-event journal -----------------------------------------------
      addEvent: (birth, event) => {
        const key = profileKey(birth);
        const current = get().events[key] || [];
        const withId = { ...event, id: (event.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6)) };
        set({ events: { ...get().events, [key]: [...current.filter(e => e.id !== withId.id), withId] } });
      },
      removeEvent: (birth, id) => {
        const key = profileKey(birth);
        const current = get().events[key] || [];
        set({ events: { ...get().events, [key]: current.filter(e => e.id !== id) } });
      },
      eventsFor: (birth) => {
        const key = profileKey(birth);
        return get().events[key] || [];
      },

      setPartnerKey: (k) => set({ partnerKey: k }),

      // Add or update a profile in the session list. Keyed by name+datetime+coords.
      rememberProfile: (b) => {
        const key = profileKey(b);
        const existing = get().profiles.filter(p => profileKey(p) !== key);
        // Most-recently-used at the front.
        const next = [{ ...b, _savedAt: Date.now() }, ...existing].slice(0, 24);
        set({ profiles: next });
        setShared({ profiles: next });
      },
      // Remove a profile by key.
      forgetProfile: (key) => {
        const next = get().profiles.filter(p => profileKey(p) !== key);
        set({ profiles: next });
        setShared({ profiles: next });
      },
      clearProfiles: () => {
        set({ profiles: [] });
        setShared({ profiles: [] });
      },

      // Load a saved profile as the active birth and enter the chart.
      // Also broadcasts the birth to other systems via the shared blob.
      useProfile: (b) => {
        set({ birth: b, natal: natalFromBirth(b, get()), hasEntered: true });
        setShared({ birth: b });
      },

      enter: () => set({ hasEntered: true }),
      reset: () => set({ hasEntered: false }),

      setMode: (m) => set({ mode: m }),
      setTransitT: (v) => set({ transitT: v, liveNow: false }),
      setLiveNow: () => set({ liveNow: true }),

      info: null,
      openInfo: (payload) => set({ info: payload }),
      closeInfo: () => set({ info: null }),
    }),
    {
      name: 'ology-personal-v1',
      partialize: (s) => ({
        birth: s.birth,
        hasEntered: s.hasEntered,
        mode: s.mode,
        profiles: s.profiles,
        events: s.events,
        partnerKey: s.partnerKey,
        zodiac: s.zodiac,
        ayanamsa: s.ayanamsa,
        houseSystem: s.houseSystem,
        includeUranian: s.includeUranian,
        showFixedStars: s.showFixedStars,
        uiMode: s.uiMode,
        showChartPatterns: s.showChartPatterns,
        showPlanetaryHours: s.showPlanetaryHours,
        hintsDismissed: s.hintsDismissed,
        timeUnknown: s.timeUnknown,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Prefer the shared mirror over our own persisted birth — another
        // system (Vedic, Gematria) may have updated it more recently.
        const shared = readBestBirth();
        if (shared?.name && (!state.birth?.name || (shared.name && shared !== state.birth))) {
          state.birth = shared;
        }
        const sharedProfiles = readBestProfiles();
        if (sharedProfiles?.length && (!state.profiles || state.profiles.length === 0)) {
          state.profiles = sharedProfiles;
        }
        // Propagate persisted zodiac/ayanamsa to the ephemeris backend
        // before the first recompute.
        setEphemerisOptions({ zodiac: state.zodiac, ayanamsa: state.ayanamsa });
        if (state.birth) state.natal = natalFromBirth(state.birth, state);
      },
    }
  )
);

// Listen for cross-tab birth updates (another open tab editing the chart in
// any system). When the shared mirror changes, replay the new birth here.
subscribeShared((next) => {
  if (!next?.birth?.name) return;
  const cur = usePersonal.getState();
  if (birthEqual(next.birth, cur.birth)) return;
  usePersonal.setState({ birth: next.birth, natal: natalFromBirth(next.birth, cur) });
});

// When Swiss finishes loading (or fails), flip swissStatus and recompute the
// active natal chart so the user never keeps seeing Standish numbers that
// briefly rendered before Swiss came online.
onSwissStateChange(() => {
  const status = currentSwissStatus();
  const state = usePersonal.getState();
  usePersonal.setState({
    swissStatus: status,
    natal: natalFromBirth(state.birth, state),
  });
});
