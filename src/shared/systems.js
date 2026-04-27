// Ology — system registry.
// Metadata only (label, URL, fields, accent). Each system's compute and
// components live inside its own folder. SystemNav + BirthForm + DownloadMenu
// read from this list to render consistent chrome across systems.

// ──────────────────────────────────────────────────────────────────────────
// FEATURE FLAG — which traditions are visible / accessible.
// Single place to enable / disable systems site-wide. Disabled systems are
// hidden from the SystemNav (they still build to their HTML if the user
// has the URL, but the UI doesn't surface them).
//
// Default: every shipping system (Western · Vedic · Chinese · Gematria).
//
// Override at build/dev time via the env var:
//   VITE_ACTIVE_SYSTEMS=western,vedic,chinese
// (comma-separated list of system IDs). Empty / unset → use DEFAULT_ACTIVE.
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_ACTIVE = ['western', 'vedic', 'chinese', 'gematria'];

const ENV_ACTIVE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ACTIVE_SYSTEMS)
  ? String(import.meta.env.VITE_ACTIVE_SYSTEMS)
      .split(',').map(s => s.trim()).filter(Boolean)
  : null;

export const ACTIVE_SYSTEMS = ENV_ACTIVE || DEFAULT_ACTIVE;

const isActive = (id) => ACTIVE_SYSTEMS.includes(id);

export const SYSTEMS = [
  {
    id: 'western',
    label: 'Western',
    url: 'personal.html',
    ctaLabel: 'Cast this Western Chart',
    accent: '#f5d680',
    fields: ['name', 'date', 'time', 'place', 'tz'],
    enabled: isActive('western'),
  },
  {
    id: 'vedic',
    label: 'Vedic',
    url: 'vedic.html',
    ctaLabel: 'Cast this Vedic Chart',
    accent: '#e8a35c',
    fields: ['name', 'date', 'time', 'place', 'tz'],
    enabled: isActive('vedic'),
  },
  {
    id: 'chinese',
    label: 'Chinese',
    url: 'chinese.html',
    ctaLabel: 'Cast the Four Pillars',
    accent: '#ff6a6a',
    fields: ['name', 'date', 'time', 'place', 'tz'],
    enabled: isActive('chinese'),
  },
  {
    id: 'gematria',
    label: 'Gematria',
    url: 'gematria.html',
    ctaLabel: 'Reveal the Numbers',
    accent: '#b79aff',
    fields: ['name'],   // date is optional; place/time unused
    enabled: isActive('gematria'),
  },
];

export const SYSTEMS_BY_ID = Object.fromEntries(SYSTEMS.map(s => [s.id, s]));

// Resolve URL relative to the current base path (handles both / and /ology/).
//
// Western has a special case: in dev the file is `personal.html`, but the
// `build:personal` rename script ships it as `index.html` so it serves at
// the base root. We detect which we're in by looking at the current
// pathname (Vite dev keeps `/personal.html`; production strips it).
export function systemUrl(system) {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const baseSlash = base.replace(/\/?$/, '/');
  if (system.id === 'western') {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const inDev = /\/personal\.html$/.test(path);
    return baseSlash + (inDev ? 'personal.html' : '');
  }
  return baseSlash + system.url;
}
