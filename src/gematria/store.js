// Gematria — Zustand store. Birth metadata is shared with the Western app
// via the SAME persist key ('ology-personal-v1') so switching between
// systems keeps the user's birth info. Gematria-specific state
// (language, useYasVowel, mode, draft) sits alongside.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setShared, readBestBirth, readBestProfiles, subscribeShared, birthEqual } from '../shared/lib/sharedBirth.js';

const DEFAULT_BIRTH = {
  name: '',
  year: 1990, month: 6, day: 21,
  hour: 12, minute: 0,
  tzOffsetMin: 0,
  latDeg: 0,
  lonDeg: 0,
  placeName: '',
};

export const useGematria = create(
  persist(
    (set, get) => ({
      // Shared
      birth: DEFAULT_BIRTH,
      hasEntered: false,
      profiles: [],
      hintsDismissed: {},
      timeUnknown: false,

      // Gematria-specific
      mode: 'word',                  // 'word' | 'compare' | 'date'
      lang: 'english',
      input: '',                     // current word in Word mode
      compareA: '',
      compareB: '',
      compareLang: 'english',
      usePron: false,
      useYasVowel: false,
      letterModal: null,             // { letter, lang } or null
      userFocus: '',                 // optional one-line focus for LLM export

      setBirth:    (b) => {
        const merged = { ...get().birth, ...b };
        set({ birth: merged });
        setShared({ birth: merged });
      },
      enter:       () => set(s => ({
        hasEntered: true,
        // Pre-fill the Word input with the birth name on first entry.
        input: s.input || (s.birth?.name || ''),
      })),
      reset:       () => set({ hasEntered: false }),
      setMode:     (mode) => set({ mode }),
      // Switching language closes any open letter modal — the previously
      // shown letter probably doesn't belong to the new alphabet.
      setLang:     (lang) => set({ lang, letterModal: null }),
      setInput:    (input) => set({ input }),
      setCompare:  (a, b) => set({ compareA: a, compareB: b }),
      setCompareLang: (compareLang) => set({ compareLang }),
      setUsePron:  (on) => set({ usePron: !!on }),
      setUseYasVowel: (on) => set({ useYasVowel: !!on }),
      openLetterModal:  (letter, lang) => set({ letterModal: { letter, lang } }),
      closeLetterModal: () => set({ letterModal: null }),
      setUserFocus: (s) => set({ userFocus: s }),

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
        set({ birth: b, hasEntered: true, input: (b?.name || '') });
        setShared({ birth: b });
      },
      dismissHint:   (id, val = true) => set({ hintsDismissed: { ...get().hintsDismissed, [id]: val } }),
    }),
    {
      name: 'ology-gematria-v1',
      partialize: (s) => ({
        birth: s.birth,
        hasEntered: s.hasEntered,
        profiles: s.profiles,
        hintsDismissed: s.hintsDismissed,
        timeUnknown: s.timeUnknown,
        lang: s.lang,
        mode: s.mode,
        usePron: s.usePron,
        useYasVowel: s.useYasVowel,
        compareLang: s.compareLang,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Always pull the most-recent birth + profiles from the shared
        // mirror — another system may have updated them since we last ran.
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

// Cross-tab sync: pick up birth changes pushed by other systems.
subscribeShared((next) => {
  if (!next?.birth?.name) return;
  const cur = useGematria.getState();
  if (birthEqual(next.birth, cur.birth)) return;
  useGematria.setState({ birth: next.birth });
});

export function profileKey(b) {
  return `${(b.name || '').trim()}|${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}|${Number(b.latDeg).toFixed(3)},${Number(b.lonDeg).toFixed(3)}`;
}
