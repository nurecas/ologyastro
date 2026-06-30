# Ology

A multi-system astrology web app. **Four entry points**, each fully
client-side:

| Entry | URL | Tradition |
|---|---|---|
| Western (Personal) | `personal.html` | Swiss-Ephemeris-backed natal charts, transits, astrocartography, synastry, predictive (progressions, solar arcs, returns, Davison). |
| Vedic (Jyotish) | `vedic.html` | Sidereal zodiac with Lahiri / KP / Raman / True Citra / Fagan-Bradley. Whole-sign houses, 16 vargas (D-1..D-60), Vimshottari dasha, Life Vectors, Sade Sati, yogas, doshas, argala, ashtakavarga, gochara, upagrahas. |
| Chinese (BaZi) | `chinese.html` | Four Pillars with Lichun-anchored solar year, jié-anchored months, sexagenary day cycle, Five Tigers / Five Mice rules, Ten Gods, Day Master strength, Luck Pillars. |
| Numerology | `gematria.html` | Pythagorean numerology plus Hebrew gematria, Greek isopsephy, and Arabic abjad. Name/word analysis, date numerology, comparison view. |

Every page runs entirely in the browser. **No server, no database, no
API calls at runtime** beyond the optional Open-Meteo city geocoder.
Birth data and saved profiles never leave the device.

## System registry

`src/shared/systems.js` is the single source of truth for which
traditions are active. The `ACTIVE_SYSTEMS` constant at the top of that
file gates which systems appear in the navigation bar:

```js
const DEFAULT_ACTIVE = ['western', 'vedic', 'chinese', 'gematria'];
```

Override at build time with the env var `VITE_ACTIVE_SYSTEMS`:

```bash
# Ship a single-tradition build:
VITE_ACTIVE_SYSTEMS=western npm run build:personal
```

Disabled systems still build their HTML (so direct URLs work) but are
hidden from the SystemNav.

## Cross-system birth sync

A user's birth and saved-profile list are mirrored into a shared
localStorage key (`ology-shared-v1`) by every system whenever they
change. Every store reads from that mirror first on rehydrate, so
switching from Vedic → BaZi (or any pair) carries the active birth and
saved profiles across instantly. Cross-tab `storage` events propagate
edits between open windows, and a deep-equal dedup guard prevents
unnecessary recomputes.

A one-time migration (`migrateLegacyToShared`) lifts any legacy
`ology-{personal,vedic,...}-v1` blob into the shared mirror on first
load, so users from earlier builds don't lose their data.

## Run

```
npm install
npm run dev
```

Then open `http://localhost:5173/personal.html` (or `/vedic.html`,
`/chinese.html`, etc).

## Build for deploy

```
npm run build:personal
```

Drag `dist-personal/` onto Cloudflare Pages.

## LLM JSON export

Every system has a "JSON for AI interpretation" download option that
bundles:

- `birth` — the input (name, ISO datetime, tz, lat/lon, place_name).
- `chart` — the system's full computed payload (positions, structures,
  derived values).
- `prompt` — a system-tuned instruction telling the LLM how to honour
  the tradition's frame (e.g., Vedic asks the LLM to read by
  Lagna/Janma Nakshatra/Dasha; HD asks for Type/Authority/Profile;
  BaZi for Day Master + Ten Gods; Gematria for letter-numeric meaning).
- `userFocus` — optional one-line focus the user can attach via the
  ✦ Focus button to bias the reading.

The `prompt` is baked into the JSON itself — drop the file into Claude /
ChatGPT / Gemini and it knows what to do.

## Compute sources & tolerances

| System | Backend | Tolerance |
|---|---|---|
| Western | Swiss Ephemeris WASM (sub-arcsec) → Standish/Meeus fallback | ≤ 5″ across 1200-2399 CE; degraded to ~1° outside the Swiss range |
| Vedic | Same Swiss + Lahiri/KP/Raman/TrueCitra/FaganBradley ayanamsa | ≤ 5″; sidereal year 365.25636d for dasha |
| Chinese | Same Swiss tropical; jié boundaries via Sun longitude bisection | < 0.001° on each solar-term crossing |

All systems share `src/astro/ephemeris.js` and switch zodiac mode on
their `main.jsx` at boot. Sidereal-mode setting is change-gated so
re-entrant calls don't loop the chart store.

## Personal — feature summary (post precision-sprint)

### Accuracy

- **Swiss Ephemeris WASM** backend (sub-arcsec; `swisseph-wasm` 0.0.5,
  GPL-3.0). Graceful fallback to the original Standish+Meeus path on
  init failure or dates outside the Swiss window (pre-1200 CE / post-
  2399 CE).
- Service Worker precaches the app shell + runtime-caches the 12 MB
  Swiss data blob — subsequent visits are offline-capable.

### Bodies + points

- Classical 10 (Sun → Pluto)
- **Chiron**, **True Lunar Nodes** (North + mirror South), **Ceres / Pallas / Juno / Vesta**, **Part of Fortune**
- Advanced-only (off by default): **Uranian** (Cupido…Poseidon), **Fixed stars** (Brady's 30, rendered as outer-rim dots)

### Reference systems

- Zodiac: **Tropical** · **Sidereal** with 5 ayanamsas (Lahiri, KP, Raman, True Citrapaksha, Fagan/Bradley)
- Houses: **Placidus** · **Whole Sign** · **Koch** · **Equal**

### Classical techniques

- **Essential Dignities** (Ptolemaic: rulership, exaltation, fall, detriment, triplicities, Egyptian terms, faces)
- **Midpoints** (Ebertin 90° dial, 45 pairs, 1.5° activation orb)
- **Aspect Grid** (classical 5-aspect square)
- **Transit aspects to natal angles** (ASC/MC/DSC/IC, opt-in)
- **Retrograde stations** calendar (12-month window, sub-day accuracy)

### Predictive

- **Secondary progressions**
- **Solar Arc directions** (solar / Naibod variants)
- **Solar Return** + **Lunar Return**
- **Davison** (midpoint in time and space)
- **Tri-wheel** overlay (natal · progressed · transit) on Transits

### Interface

- **Basic / Advanced** toggle keeps casual users on a clean surface
  while revealing every technique one switch away.
- **Settings drawer** houses all cross-cutting preferences (zodiac,
  houses, ayanamsa, toggles, JSON export, keyboard cheatsheet).
- **Precision badge** in the corner of every chart shows the active
  configuration or warns on fallback / solar chart.
- **JSON export + import** for portable auditable charts.
- **PDF export** via the browser print dialog.
- **Planetary hours strip** (Chaldean-order day/night ruler cycle).
- **Keyboard shortcuts**: `⌘1`–`⌘6` modes · `⌘,` drawer · `⌘⇧A`
  Basic/Advanced · `⌘⇧T` test mode · `⌘D` download · Esc close.

### Testing

- **475** Node-side assertions across four `src/**/_*.mjs` suites
  (sanity / accuracy / precision / Swiss precision).
- **~90** in-browser assertions in the Phase-7 test mode —
  activate via `#test` or `⌘⇧T`.

See [NOTES.md](./NOTES.md) for the math, Swiss-port license,
tolerances, and a full sprint changelog. See [QA_LOG.md](./QA_LOG.md)
for the Phase-8 QA checklist.

## Scope guardrails

Explicitly **out of scope**: analytics, authentication, server-side
compute, AI/LLM runtime calls, Campanus/Porphyry/Regiomontanus houses,
Arabic Parts beyond Fortune, harmonics, horary/electional workflows,
heliocentric/draconic zodiacs, multi-language UI. Ology is a
desktop/tablet-landscape tool; a polite dialog informs phone visitors.
