// Shared-birth sync.
// Birth + saved profiles are common to every system. To keep them in sync
// across pages without each system writing to the same Zustand persist
// blob (which would clobber the others' exclusive keys), every system
// writes a small mirror object to a dedicated key whenever its birth
// changes, and reads the mirror on rehydrate.
//
// We also listen for the cross-tab `storage` event so a birth update in
// one open tab is reflected in another tab on the same origin without a
// reload.

const KEY = 'ology-shared-v1';
const MIGRATED_FLAG = 'ology-shared-migrated-v1';

// One-time migration: when the multi-system split landed, the original
// `ology-personal-v1` Zustand blob held a single `birth` + `profiles[]`
// pair shared across systems. We now mirror those into a dedicated
// `ology-shared-v1` blob that every new system reads first. If a user is
// arriving from an older build with no shared blob yet, this lifts the
// most recent birth/profiles out of any legacy per-system blob and
// seeds the shared mirror in one shot. Idempotent — set a flag and skip
// on subsequent loads.
export function migrateLegacyToShared() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(MIGRATED_FLAG) === '1') return;
    const existing = localStorage.getItem(KEY);
    // If the shared blob already exists, the user has been on a recent
    // build — nothing to do, just record the flag.
    if (existing) {
      localStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }
    let bestBirth = null;
    let bestProfiles = null;
    for (const k of ['ology-personal-v1', 'ology-vedic-v1', 'ology-bazi-v1', 'ology-gematria-v1']) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const b = parsed?.state?.birth;
        const p = parsed?.state?.profiles;
        if (b?.name && !bestBirth) bestBirth = b;
        if (Array.isArray(p) && p.length && !bestProfiles) bestProfiles = p;
      } catch {}
    }
    if (bestBirth || bestProfiles) {
      const next = {
        ...(bestBirth ? { birth: bestBirth } : {}),
        ...(bestProfiles ? { profiles: bestProfiles } : {}),
        updatedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(next));
    }
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch {}
}

export function getShared() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setShared(partial) {
  try {
    if (typeof localStorage === 'undefined') return;
    const cur = getShared() || {};
    const next = { ...cur, ...partial, updatedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

// Read a sensible birth: prefer the shared mirror; fall back to the
// per-system blobs we know about (so the very first load — before any
// system has written the mirror — still picks up an existing birth).
export function readBestBirth() {
  const shared = getShared();
  if (shared?.birth?.name) return shared.birth;
  // Legacy fallbacks
  for (const k of ['ology-personal-v1', 'ology-vedic-v1', 'ology-gematria-v1']) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const b = parsed?.state?.birth;
      if (b?.name) return b;
    } catch {}
  }
  return null;
}

export function readBestProfiles() {
  const shared = getShared();
  if (Array.isArray(shared?.profiles) && shared.profiles.length) return shared.profiles;
  for (const k of ['ology-personal-v1', 'ology-vedic-v1', 'ology-gematria-v1']) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const p = parsed?.state?.profiles;
      if (Array.isArray(p) && p.length) return p;
    } catch {}
  }
  return [];
}

// Subscribe to cross-tab birth changes. Returns an unsubscribe.
export function subscribeShared(fn) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (e.key !== KEY) return;
    try {
      const next = e.newValue ? JSON.parse(e.newValue) : null;
      fn(next);
    } catch {}
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

// Deep-equality check for birth objects across all stores' subscribeShared
// dedup logic. Compares every field that affects the chart so updates to
// time/place/tz are detected as changes (the previous coarse name+date
// comparison would have skipped them).
export function birthEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.name === b.name &&
         a.year === b.year &&
         a.month === b.month &&
         a.day === b.day &&
         a.hour === b.hour &&
         a.minute === b.minute &&
         a.latDeg === b.latDeg &&
         a.lonDeg === b.lonDeg &&
         a.tzOffsetMin === b.tzOffsetMin;
}
