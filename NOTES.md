# Ology — Engineering Notes

Orbital math, data sources, and known limitations for all phases.

## Multi-system architecture (2026)

Ology grew from a two-surface app (Mundus + Personal) into a four-system
suite (+ Vedic + Chinese BaZi + Gematria). Each system ships as a
separate HTML entry that runs its own React app from a per-system
`main.jsx`. Source layout:

```
src/
  astro/                     # Shared ephemeris (Swiss WASM + Standish fallback)
  shared/
    design/                  # Tokens, primitives, CSS
    lib/
      sharedBirth.js         # ology-shared-v1 cross-system mirror + migration
      downloadJSON.js        # Common helpers for the LLM/raw JSON exports
    shell/
      SystemNav.jsx          # Top-of-page tradition pills + OLOGY logo
      DownloadMenu.jsx       # Universal download dropdown
      SettingsShell.jsx      # Shared settings-drawer chrome (per-system panels go inside)
      ProfilesDropdown.jsx   # Saved-profiles list, used by every BirthForm
      KeyboardShortcuts.jsx  # Generic shortcut handler (modes, ⌘1..N, ⌘D, ⌘,, Esc)
      BetaDialog.jsx         # First-load welcome / privacy / mobile notice
    systems.js               # Registry of all systems + ACTIVE_SYSTEMS feature flag
  personal/                  # Western (the original chart app)
  vedic/                     # Vedic / Jyotish
  chinese/                   # BaZi
  gematria/                  # Gematria
  components/  shaders/  store.js  App.jsx  main.jsx   # Mundus Harmonicus
```

### Cross-system state model

Birth data + saved profiles are written to a shared localStorage key
(`ology-shared-v1`) whenever they change. Every store mirrors local
mutations both to its own persist key (e.g., `ology-vedic-v1`) AND to
the shared mirror, and listens to cross-tab `storage` events to pick up
edits made in other windows.

The mirror is updated by every birth-mutating action: `setBirth`,
`setTimeUnknown`, `useProfile` (apply a saved chart), `rememberProfile`,
`forgetProfile`, `clearProfiles`. A `birthEqual()` helper does a deep
equality check on every mutating field so cross-tab dedup catches
changes to time/lat/lon/tz, not just name+date.

A one-time migration (`migrateLegacyToShared` in
`src/shared/lib/sharedBirth.js`) lifts the most recent birth +
profiles out of any legacy `ology-{personal,vedic,bazi,gematria}-v1`
blob into the shared mirror on first load, so older users don't have
to re-enter their data.

### Feature flag — `ACTIVE_SYSTEMS`

Single source of truth at the top of `src/shared/systems.js`:

```js
const DEFAULT_ACTIVE = ['western', 'vedic', 'chinese', 'gematria'];
export const ACTIVE_SYSTEMS = ENV_ACTIVE || DEFAULT_ACTIVE;
```

Override at build/dev time via `VITE_ACTIVE_SYSTEMS=…` env var. The
SystemNav filters out disabled systems but always preserves the
currently-active one (so users on a freshly-disabled URL still have a
visible breadcrumb).

### Compute precision & test inventory

| Suite | Assertions | What it covers |
|---|---|---|
| `src/personal/astro/_precision.mjs` | 162 | Standish + chart analysis + life vectors + forecast + synastry + timezones |
| `src/personal/astro/_swiss_precision.mjs` | 281 | Swiss WASM port-fidelity at 10 epochs + range guards + extras + fixed stars |
| `src/vedic/_precision.mjs` | 158 | All 11 yoga detectors + doshas + drishti + argala + ashtakavarga (BPHS bindu totals 48/49/39/54/56/52/39, SAV 337) + Vimshottari + 16 vargas + sambandha + Arudha + panchang |
| `src/chinese/_precision.mjs` | 291 | Stems × branches × elements × sexagenary cycle, day-pillar 1900-01-01 = 甲戌 anchor, Five Tigers + Five Mice, Ten Gods exhaustive for two day masters, hidden stems, luck direction |
| **Total** | **892** | All green |

### Section A — Vedic deferred topics (Phase 2 → Phase 3)

Argala (interventional houses, BPHS Ch. 27), Ashtakavarga (Parashari
bindu table per BPHS Ch. 65–72; per-planet totals 48/49/39/54/56/52/39
sum to SAV 337 by construction), Gochara (transits read against natal
Moon and Lagna with classical favourable-house lookups, Saturn override
for Sade Sati / Ashtama / Ardha-Ashtama), and Upagrahas (Gulika and
Mandi via the Yavanajataka day-/night-arc subdivision rule). Plus an
extended Yogas detector that now adds Raja Yoga (kendra-trikona lord
combinations), Dhana Yoga, Parivartana (Maha / Khala / Dainya
classification), and Neecha Bhanga Raja Yoga (5 classical cancellation
conditions). Rashi Drishti surfaced as a Yogas-mode tab.

### Section C — Chinese BaZi

Four Pillars (Year / Month / Day / Hour) with Lichun-anchored solar
year (sun-longitude crossing at 315°), jié-anchored month (Sun-longitude
bisection at every 30° from 315°), sexagenary day cycle anchored on
1900-01-01 = 甲戌 (offset 49 in JDN+offset arithmetic, cross-validated
against `tyme4ts`/`lunar-javascript` and CCTV ganzhi calendar), Hour
pillar via Five Mice Rule. Ten Gods derived from element-relation +
yang/yin polarity against the Day Master. Hidden stems per ren-yuan.
Luck Pillars walk the sexagenary cycle forward or backward (gender +
year-stem polarity rule) starting from a precise age computed by
birth-to-jié distance (3 days = 1 year). Mao Zedong's
癸巳/甲子/丁酉/甲辰 chart matches verbatim; Lichun crossover and
Zi-hour boundary tested.

### Section D — Polish

- **Service Worker**: precaches every entry HTML + every assets/* JS
  via `globPatterns: ['**/*.{js,css,html}']`. Swiss data stays in a
  CacheFirst runtime cache. First visit → 12 MB Swiss download once;
  every subsequent visit (any system) is offline-instant.
- **Keyboard shortcuts**: `src/shared/shell/KeyboardShortcuts.jsx` is a
  generic component that takes `getStore` + `modes` + `onDownload`
  props. ⌘1..⌘N switches modes, ⌘, opens the settings drawer, ⌘D
  triggers a chart download, Esc closes drawers/popovers. Mounted in
  Personal / Vedic / HD / Chinese.
- **Settings drawer**: shared `SettingsShell` provides the slide-in
  chrome (overlay, header, close button, keyboard cheatsheet, about
  panel). Each system mounts its own per-system panel inside (Vedic
  ayanamsa / chart format / interface mode; HD layer toggles; Chinese
  gender). One source of truth for the chrome, no duplicate visual
  states drifting apart.
- **Profiles dropdown**: shared `ProfilesDropdown` handles the
  saved-charts list (button, dropdown rows, edit/delete icons, clear
  all). Each BirthForm passes its own `useProfile` / `forgetProfile` /
  `clearProfiles` actions in.
- **JSON v1 → v2 migration**: `migrateLegacyToShared` runs once at boot
  on every entry (called from each `main.jsx`). Lifts the best birth +
  profiles from any legacy per-system blob into the shared mirror.
  Idempotent, marked done via `ology-shared-migrated-v1` flag.

### Section D — Other UI polish

- **OLOGY logo** moved to the leftmost slot of the SystemNav bar,
  clickable to root.
- **Selected tradition pill** is now solid gold-on-black for visual
  prominence (was previously a faint outlined state).
- **Beta dialog** appears on first visit (any system); discloses the
  beta status, local-only computation, and the basic Google Analytics
  metrics that ARE collected. On narrow viewports, also notes that
  Ology is densest on desktop / tablet-landscape (combining the
  previous mobile-only notice into one prompt).
- **Google Analytics** (gtag.js, `G-ZFDHDJZ6NR`) added to all 6 HTMLs.
  No birth data, names, or chart content is sent — only basic
  anonymous metrics.



---

## Timeline

- Window: **1 Jan 1500 → 1 Jan 2081** (covers through 31 Dec 2080).
- 1 162 time samples → ≈ 0.5 year resolution.
- All orbital computation is deterministic, offline, and client-side.

## Time scale

- UT is treated as TT (no ΔT). Additional error for 1500–2100 is ≤ a few
  minutes of time and well below the 1° target on ecliptic longitude.
- `T = (JD − 2451545.0) / 36525.0` (Julian centuries since J2000.0).

---

## Precision sprint — sprint summary (v2.0)

Shipped across 7 phases. Full sprint changelog in the git history;
headline deltas:

- **Accuracy**: Swiss Ephemeris WASM backend, sub-arcsec at 10+
  reference epochs (1500 → 2080). Graceful fallback to the
  Standish+Meeus path for init failure / pre-1200 / post-2399.
- **Bodies**: +Chiron, True Lunar Nodes (+ mirror South), Ceres,
  Pallas, Juno, Vesta, Part of Fortune. Advanced-only: Uranian
  (Cupido..Poseidon), Brady's 30 fixed stars.
- **Reference systems**: sidereal zodiac with 5 ayanamsas (Lahiri,
  KP, Raman, True Citrapaksha, Fagan/Bradley); 4 house systems
  (Placidus, Whole Sign, Koch, Equal).
- **Classical techniques**: Essential Dignities (Ptolemaic), Midpoints
  (Ebertin 90° dial), Aspect Grid, angle transits, retrograde
  stations calendar, planetary hours.
- **Predictive**: secondary progressions, Solar Arc directions
  (solar/Naibod), Solar Return, Lunar Return, Davison, tri-wheel.
- **UI**: Basic/Advanced toggle, Settings drawer, precision badge,
  time-unknown flag, JSON export/import, PDF export, keyboard
  shortcuts, first-visit hint, per-section collapsible drawers on
  Transits.
- **Test mode**: 19 in-browser suites accessed via `#test` / ⌘⇧T.
  Existing 475-assertion Node suite retained for CI.
- **Responsive**: scoped to desktop + tablets-landscape; a polite
  dismissible notice fires on narrower viewports; iPad globe
  touch-to-rotate fixed.

## Precision sprint — Swiss Ephemeris backend (2026)

The legacy Standish+Meeus path (documented below) remains in the codebase
as a fallback. The default active backend is now **Swiss Ephemeris via
WebAssembly**.

### Port

- Package: [`swisseph-wasm`](https://www.npmjs.com/package/swisseph-wasm)
  v0.0.5 by prolaxu
- License: **GPL-3.0-or-later** (the underlying Swiss Ephemeris is dual-
  licensed GPL or commercial; any downstream distribution must honor GPL
  terms — this satisfies the brief's GPL/LGPL criterion)
- Bundle layout, served verbatim from `public/swephfiles/` after a one-time
  copy at install:
  - `swisseph.js` — 71 KB Emscripten glue
  - `swisseph.wasm` — 531 KB compiled C core
  - `swisseph.data` — **12 MB** embedded Swiss data (1200 CE → 2400 CE
    range, including `sefstars.txt` for fixed stars and all asteroid + lunar
    + planet files). This supersedes the "download 6 MB individually"
    approach in the brief — the port bundles everything into one blob, which
    simplifies Service Worker caching at the cost of a larger first-visit
    download.

### Architecture — `src/astro/ephemeris.js`

- `initSwiss({ browserInit? })` — async init. Fire-and-forget from
  `src/personal/main.jsx`; first paint never blocks. In Node the wrapper's
  built-in path resolution is used; in the browser the custom
  `swissBrowserInit` loader dynamic-imports `public/swephfiles/swisseph.js`
  and passes a `locateFile` callback pointing at the same directory.
- `isSwissReady()` / `hasSwissFailed()` / `isSwissLoading()` —
  state predicates.
- `onSwissStateChange(fn)` — subscribe once for re-render when Swiss
  comes online.
- `getPrecisionStatus(jd)` — classifies: `'swiss'` | `'loading'` |
  `'out-of-range'` | `'fallback'`. Drives the precision badge (Phase 5).
- `longitudesAtDate(date)` — routes to Swiss if ready AND JD is in range
  (1200 CE ≤ JD ≤ 2400 CE); otherwise Standish+Meeus. The signature stays
  synchronous so no caller changes.
- `longitudesAtDateStandish(date)` — explicit fallback access, used by
  precision tests.

### Fallback rules

1. **Init failure** (WASM load error, network off, unsupported browser) →
   `_swissFailed = true`, Standish+Meeus used for all calls, badge shows
   `⚠ Standish fallback`.
2. **JD out of Swiss range** (pre-1200 CE, post-2399 CE) → Standish+Meeus
   used for that chart, badge shows `⚠ reduced precision — date outside
   Swiss range`. Never crashes.
3. **iOS / no-cross-origin-isolation**: the chosen port is a non-
   SharedArrayBuffer build, so no `COOP`/`COEP` headers are required on
   Cloudflare Pages. Nothing to do.

### Time scale

- Swiss `calc_ut` is UT-based; internal ΔT is handled by Swiss. We continue
  to pass UT julian dates (same `dateToJD` function) and keep the existing
  `Intl.DateTimeFormat` path for historical timezone offsets (Swiss's
  timezone utilities have poor pre-1970 coverage).

### Accuracy — 10-epoch reference, Swiss WASM port fidelity

All 10 bodies, all 10 epochs, deviation from frozen Swiss C-library output:

| Epoch        | Worst deviation |
|--------------|-----------------|
| 1500-01-01   | ≤ 0.002 "       |
| 1700-01-01   | ≤ 0.002 "       |
| 1850-06-15   | ≤ 0.002 "       |
| 1950-01-01   | ≤ 0.002 "       |
| J2000        | ≤ 0.002 "       |
| 1999-08-11   | ≤ 0.002 "       |
| 2020-12-21   | ≤ 0.002 "       |
| 2025-06-15   | ≤ 0.002 "       |
| 2050-01-01   | ≤ 0.002 "       |
| 2080-01-01   | ≤ 0.002 "       |

Tolerance: **5 arcseconds** (0.0014°). Test: `src/personal/astro/_swiss_precision.mjs`
— 124 assertions, all green.

**Reference choice.** The frozen "gold" longitudes are the output of the
same Swiss C library, captured once via `scripts/gen-swiss-reference.mjs`.
This is a **port-fidelity test** — it proves the WASM build behaves
identically to the canonical Swiss C library across the 10 epochs. Swiss
is itself calibrated against JPL DE431 and is the industry reference that
tools like Solar Fire cross-check against; treating it as the truth for
our port test is the standard practice.

Independent JPL Horizons cross-checks (querying the NASA service directly
for ≤1" reference positions) are deferred to the Phase-7 in-browser test
mode, where the full tropical/sidereal/house-system stack is also
exercised. For a Node-only CI workflow, the port-fidelity check is what
catches regressions — if Swiss WASM stops matching Swiss C, we know
immediately.

### Test suite inventory (Node, Phase-1)

- `src/astro/_sanity.mjs` — 10 planets ≤ 0.5° at J2000 (Standish path)
- `src/personal/astro/_accuracy.mjs` — 22 assertions (Standish + chart analysis)
- `src/personal/astro/_precision.mjs` — 161 assertions (Standish + aspects + synastry + timezone)
- `src/personal/astro/_swiss_precision.mjs` — 112 assertions (Swiss port fidelity + fallback routing + date-range guards)
- **Total: 305 Node-side assertions, all green.**

### Service Worker (offline-first cache)

Configured via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) v1.2
(MIT), personal-build only. Strategy:

- **Precache** (Workbox `precacheAndRoute`): `index.html`, the JS bundle,
  CSS, `earth_*.jpg` textures, and `swephfiles/swisseph.js` (71 KB glue).
  ~2.2 MB total — well under Workbox's 2 MB-per-file default.
- **Runtime cache** (`CacheFirst` → `swiss-ephemeris-v1`): anything under
  `/swephfiles/` — the 531 KB `swisseph.wasm` and the **12 MB**
  `swisseph.data` blob. Too large to precache at install time, but
  once fetched on first calculation the browser never touches the network
  for them again. 1-year max age; 10-entry cap.
- **NavigationRoute**: `index.html` is used for every navigation, which
  makes the client-side-only app feel instant on repeat visits.

`scripts/rename-personal.mjs` runs after the SW is generated (Vite writes
SW during build, before post-processing) — it patches the precache
manifest so the `personal.html → index.html` rename doesn't leave the SW
trying to precache a URL that no longer exists.

---

## Phase 1 — Ephemeris (legacy Standish+Meeus, retained as fallback)

### Planetary positions (Mercury → Pluto)

**Algorithm:** E. M. Standish (JPL) *"Keplerian Elements for Approximate
Positions of the Major Planets"* — six orbital elements at J2000 plus
linear rate per century. Heliocentric ecliptic J2000 coordinates are
computed by Newton-iterating Kepler's equation (≤ 6 iterations, tolerance
1 e-10), rotating the in-plane `(x′, y′)` via the standard `(ω, Ω, I)`
matrix, then subtracting the Earth-Moon barycenter vector to obtain the
geocentric ecliptic vector. Final longitude = `atan2(y, x)`.

**Ecliptic frame used:** J2000 mean ecliptic. We do not apply precession
to the date. For the Sun we implicitly use mean-of-date longitude
(Meeus Ch. 25 already includes the equinox drift); for other bodies the
longitude is tropical-of-J2000 which is within ≈ 1° of tropical-of-date
for the target window.

### Sun

Geocentric apparent longitude via **Meeus *Astronomical Algorithms*,
Chapter 25** (low precision): mean longitude `L₀`, mean anomaly `M`,
three-term equation-of-center `C`, then nutation + aberration via the
Moon's node `Ω`.

### Moon

Geocentric ecliptic longitude via a **reduced Meeus Chapter 47** — mean
longitude `L′` plus the leading 13 periodic terms of ELP2000 (main
evection, variation, annual equation, and the common 2D/M′/F
combinations). Moon amplitude weight is 0.15 (lowest) so residual error
is cosmetic.

### Accuracy across 1500–2100

| Body | Typical error | Worst case |
|---|---|---|
| Sun | < 0.05° | < 0.1° |
| Moon | 0.3°–1° | ≈ 2° at singular dates (perigee + equation of centre extremes) |
| Mercury | < 1° | up to ±30° at inferior conjunction (retrograde) — see note |
| Venus, Mars | < 1° | < 2° |
| Jupiter, Saturn | < 0.3° | < 0.5° |
| Uranus, Neptune | < 0.5° | < 1° |
| Pluto | < 1° inside 1800–2050 | up to 3°–5° approaching 1500 / 2100 |

The field amplitudes (Pluto 1.0 → Moon 0.15) are ordered so higher-weight
bodies are also the most accurate. Mercury's retrograde spike contributes
at amplitude 0.2 and is effectively smoothed out by the other 9 bodies.

### J2000 sanity check

At 1 Jan 2000 00:00 UT, all ten computed longitudes are within 0.5° of
almanac values. See `src/astro/_sanity.mjs`.

---

## Phase 1 — Interference field

`F(θ, t) = Σᵢ Aᵢ · cos(θ − φᵢ(t))`

- `θ` ∈ [0°, 360°] = zodiac degree.
- `φᵢ(t)` = geocentric ecliptic longitude of planet i at time t.
- **No explicit frequency term** `2π t / Tᵢ` — the ecliptic longitude
  already encodes the orbital rate.
- Amplitudes: Pluto 1.0, Neptune 0.9, Uranus 0.8, Saturn 0.7, Jupiter 0.6,
  Sun 0.5, Mars 0.4, Venus 0.3, Mercury 0.2, Moon 0.15.
- Field color normalization: `n = F / Σᵢ |Aᵢ|` ∈ [−1, 1]. The shader
  maps n → navy → indigo → violet → rose → gold.

## Phase 1 — Global Coherence Index

Root-mean-square across the zodiac at each moment, normalized to [0, 1]:

```
C(t) = √( ⟨ F(θ, t)² ⟩_θ )       with θ sampled at N_θ = 180 (2°).
C(t) ← C(t) / max_t C(t)
```

Peaks are local maxima of `C(t)`. Top-12 greedy pick with a ≥ 15-year
minimum separation so labels never overlap.

### Rendering

- Single full-screen quad, custom fragment shader
  (`src/shaders/field.frag.glsl`).
- Planet longitudes uploaded as a `10 × numTime` single-channel float
  `DataTexture` (radians). The shader loops 10 iterations per fragment.
- Coherence uploaded as a second 1-D texture; high coherence adds a
  subtle gold glow across the whole time row.
- A sub-pixel `y` drift (period 60 s) animates the field for aesthetic
  purposes; underlying data is static.

---

## Phase 2 — Vector Layers

Eight semi-transparent filtered sub-fields, each computed from a
planetary subset plus optional static zodiac-axis contributors
(`src/astro/layers.js`).

| Layer | Planets | Static axis contribution |
|---|---|---|
| Vitality / Will | Sun, Mars | — |
| Career / Structure | Jupiter, Saturn | — |
| Intellect / Communication | Mercury | Gemini–Sagittarius (60°, 240°) |
| Relational / Love | Venus | Libra (180°) |
| Emotional / Subconscious | Moon | Cancer (90°) |
| Spiritual / Dissolution | Neptune | Pisces (330°) |
| Transformation / Shadow | Pluto | Scorpio (210°) |
| Breakthrough / Rebellion | Uranus | Aquarius (300°) |

**Independent normalization.** For each layer:

```
F_L(θ, t) = Σ_{i∈L} A_i cos(θ − φ_i(t)) + Σ_{a∈axes(L)} 0.6 · cos(θ − a)
n_L      = F_L / ( Σ_{i∈L} A_i + 0.6·|axes(L)| )   ∈ [−1, 1]
```

Only the constructive lobe (`smoothstep(0.05, 1, n_L)`) contributes. The
shader additively blends each layer's colour by `mix × intensity`
(optionally × `C(t)` if **Master Coherence** is on).

### UI

- Right panel: one colored toggle and 0–100% mix slider per layer, plus
  **Master Coherence** checkbox.
- Toggle fade ≈ 300 ms (CSS transition).

---

## Phase 2 — Zodiac Wheel

Polar rendering of the current-time interference field. Angle θ is mapped
counter-clockwise from the 12-o'clock position (Aries top) through all
twelve signs. The ring interior is coloured by `F(θ, t_now)` using the
same colormap as the field. Enabled layers additively tint the ring in
their colour, weighted by layer mix and (optionally) global coherence.

Planets are plotted as dots at their geocentric longitudes just outside
the outer rim, each with a 30-day retrograde-aware trail (15 samples over
the previous 30 days; seam crossings are broken into separate polylines).

Sign glyphs sit at exact 15° mid-sign positions so visible boundaries are
at 0°, 30°, 60°, … 330° (matching the Phase-2 checklist).

---

## Phase 3 — Population data

Historical population table for seven regions, in millions, at
`1500, 1600, 1700, 1800, 1850, 1900, 1950, 1970, 1990, 2000, 2010,
2020, 2025, 2030, 2050, 2070, 2080` (17 time points × 7 regions = 119
data points).

**Sources.** Historical values (≤ 2020) derive from McEvedy & Jones,
*Atlas of World Population History* (Penguin, 1978) merged with the
UN Department of Economic and Social Affairs *World Population Prospects*
historical series. Projections for 2030–2080 are UN WPP 2022
medium-variant. Specifically reflected:

- **Americas collapse 1500 → 1600** (≈ 39 → 15 M, a 62% drop) reflects
  post-contact disease mortality.
- **Africa rise 2020 → 2080** (≈ 1 100 → 3 050 M) reflects WPP medium.
- **Europe decline after 2050** reflects sub-replacement fertility
  convergence.

Each region has a representative lat/lon centroid used for MC mapping
(`src/astro/population.js`).

## Phase 3 — Population-weighted coherence

Each region experiences the zodiac at its **Midheaven (MC)** degree —
the ecliptic point on its local meridian — which depends on its
longitude and Greenwich Mean Sidereal Time:

```
LST(λ, t)     = GMST(t) + λ                 (λ east-positive, radians)
θ_MC(λ, t)    = atan2( sin(LST),
                       cos(LST) · cos(ε) )  (mod 2π)
C_weighted(t) = √( Σ_r  w(r, t) · F(θ_MC(λ_r, t), t)² )
```

where `ε` is the mean obliquity (Meeus 22.2), `w(r, t)` is region r's
population share at time t, and `F` is the full interference field. The
result is normalized to [0, 1] against its maximum.

**Why MC.** Using the same zodiac degree for every region regardless of
longitude would be astrologically meaningless. MC encodes
"what-culminates-overhead" at that location *right now* — the standard
AstroCartography mapping from geography to zodiac.

The weighted line and raw line diverge most visibly in 1500–1700 when
Asia held ~50% and Europe ~15% of world population — exactly where the
checklist predicts.

---

## Phase 3 — Globe view

### Earth rendering

A real NASA Blue Marble-style equirectangular texture is fetched at
runtime from `threejs.org/examples/textures/planets/earth_atmos_2048.jpg`
(with a jsDelivr mirror of the same Three.js-bundled asset as a fallback
if the primary URL fails). The fragment shader samples this via a
normal-derived UV (`u = 0.5 − lon/2π, v = 0.5 − lat/π`) so the meridian
at u = 0.5 aligns with lon = 0. A placeholder 1×1 ocean-blue texture is
used until the image loads — usually imperceptible.

On top of the base texture we apply simple Lambert lighting, the
per-fragment AstroCartography amplitude tint (gold), and a camera-facing
rim atmosphere. `colorSpace = SRGBColorSpace` so the texture decodes
correctly.

### AstroCartography lines

For each of the 10 bodies, compute right ascension and declination from
the geocentric ecliptic longitude (β = 0 assumed) via Meeus 13.3, then
build four loci (`src/astro/astrocartography.js`):

- **MC line:** longitude = α − Θ, drawn as a meridian from −90° to +90°.
- **IC line:** the antipodal meridian (α − Θ + π).
- **ASC line:** for each latitude φ solve `cos H = −tan δ · tan φ`; where
  |·| ≤ 1 the planet rises at longitude `α − Θ − H`. No iteration needed
  — the solution is analytical per latitude.
- **DSC line:** mirror, `+H`.

MC/IC render as straight meridians; ASC/DSC are curves (they are drawn
as polylines over a 180-point latitude grid).

**Known limitation:** close to the poles, ASC/DSC latitudes where
`|tan δ · tan φ| > 1` have no solution (the planet is circumpolar or
never rises) — the polyline simply terminates there.

**Jupiter + Saturn 21 Dec 2020:** their RA values differ by < 0.1°, so
their MC meridians render within ≈ 0.1° of longitude. ✓

### Local coherence shading

Implemented directly in the fragment shader. For each surface fragment
the shader computes, per planet, the angular distance from the fragment
to each of the four AstroCartography lines at that location, and
aggregates `exp(−k d²)`-falloffs weighted by the planet's amplitude. The
result is added as a gold tint on top of the base Earth shading. The
pattern evolves continuously with GMST and planetary motion.

### Population nodes

20 historical cities embedded with founding year, optional abandonment
year, and population series (1500–2080, interpolated linearly).
Placement within ± 0.1° of standard geographic coordinates (London,
Beijing, Cairo, Delhi, Rome/Venice, etc.). Dot radius ∝ √pop, so the
visual scale remains readable across a 4-order-of-magnitude population
range. Each dot is recoloured each frame by the dominant vector layer
at that location (using the location's MC zodiac degree).

### Hover tooltip

On hover, raycast the sphere to get the cursor's lat/lon, then:
1. Scan all 40 planet-line loci (10 planets × 4 lines), pick minimum
   angular distance → "nearest line".
2. Evaluate `F(θ_MC, t)` at the hover point → local coherence.
3. Evaluate each of the 8 layer sub-fields → strongest layer.

Tooltip shows lat/lon, nearest line, local coherence, and strongest
layer. No NaN / undefined paths — all values always populated.

---

## Phase 3 — Event overlay

Simple JSON import on the coherence spine. Expected schema:

```json
[
  { "year": 1347, "label": "Black Death begins", "kind": "pandemic" },
  { "year": 1789, "label": "French Revolution",  "kind": "political" }
]
```

`kind` is a free-form string; the UI colors three recognised families
(`conflict` red, `idea` cyan, `shift` violet) and falls back to violet.
Events render as thin dashed vertical marks with a glyph at the top of
the spine. They never affect the coherence computation.

Twelve seed events are pre-loaded for context (Copernicus 1543 through
COVID 2020). Importing a JSON file replaces the list.

---

## Known limitations

- Outer-planet accuracy (especially Pluto) degrades near the window
  edges (1500 and 2081). Field-level effects are negligible.
- Procedural Earth is stylised rather than photographic.
- Globe FPS target is 40+; 60 on typical M-series laptops at 1080p.
- Layer shader unrolls an 8×10 inner loop — further layers would require
  refactoring to texture-packed masks. Eight is the current hard ceiling.

---

## Files

```
src/
  App.jsx                        — three-view shell
  main.jsx                       — React entry
  store.js                       — Zustand state + field build
  index.css                      — Tailwind + small custom styles
  astro/
    ephemeris.js                 — Planet/Sun/Moon longitudes, RA/Dec, GMST, MC
    coherence.js                 — Global Coherence Index + peak picker
    layers.js                    — 8 vector-layer definitions
    population.js                — Regional populations + historical cities
    astrocartography.js          — MC/IC/ASC/DSC line geometry
    _sanity.mjs                  — Ephemeris cross-check against almanac
  components/
    FieldView.jsx                — WebGL interference field + layer overlays
    WheelView.jsx                — Canvas polar wheel
    GlobeView.jsx                — Three.js globe + hover tooltip
    CoherenceSpine.jsx           — Timeline, raw + weighted + events
    Scrubber.jsx                 — Play/pause + 1/10/100 yr/s
    HUD.jsx                      — Title, date, live planet glyphs
    LayerPanel.jsx               — Right-side layer controls
    ViewToggle.jsx               — Field / Wheel / Globe
  shaders/
    field.vert.glsl              — Full-screen quad vertex
    field.frag.glsl              — Field + 8 layer overlays
```

---

# Personal App — Engineering Notes

A second entry (`personal.html`) opens a natal-chart companion. It shares
the main ephemeris but adds five domain modules and five UI modes. This
section documents the math, the tolerances, and the precision-audit
coverage for every piece.

## Scope

Five modes after the birth form:

| Mode       | Question it answers                                                   |
|------------|------------------------------------------------------------------------|
| Profile    | Who is this chart? (structure, balance, patterns)                      |
| Life       | How does each vector layer resonate across 100 years?                  |
| Transits   | What's the sky doing to this chart right now and soon?                 |
| Map        | Where on Earth is each planet on an angle? Which places serve goals?   |
| Synastry   | How do two charts relate?                                              |

## Natal chart (`astro/natal.js`)

- **Midheaven** `MC = atan2(sin θ, cos θ · cos ε)` where θ = local sidereal
  time, ε = obliquity. Four-quadrant resolved.
- **Ascendant** `ASC = atan2(−cos θ, sin ε · tan φ + cos ε · sin θ) + π`
  where φ = geographic latitude. Standard Placidus-framework formula.
- **Placidus cusps** — classical semi-arc iteration (Hoskings; widely
  published). Accurate to ≪ 0.01° for |φ| ≤ 60°.
- **Equal-House fallback** at |φ| > 66.5° where Placidus diverges; house N
  cusp = ASC + (N−1)·30°.
- **Timezone offset for the birth date** is derived from IANA zone names
  (`Asia/Kolkata`, `America/New_York`) via `Intl.DateTimeFormat` —
  historical DST is handled by the runtime's ICU tables.

## Chart analysis (`astro/chartAnalysis.js`)

- **Element / mode / hemisphere distributions** — amplitude-weighted sums
  normalised to 1.
- **Pattern detection** with traditional orbs:
  - Stellium: ≥ 3 planets in same sign
  - Grand Trine: three planets mutually 120°±6° AND in the same element
    (out-of-sign geometric trines rejected)
  - T-Square: opposition (180°±6°) + two squares (90°±6°); modality tag
    if all three sign modalities match
  - Grand Cross: two oppositions + four squares, with modality tag
  - Yod: two in sextile (60°±4°) + both quincunx (150°±4°) a third
  - Kite: grand trine + fourth planet opposing (180°±6°) one vertex
- **Chart shape** — Jones' seven types (Splash, Bundle, Bowl, Locomotive,
  Seesaw, Bucket, Splay) classified from the sorted gap sequence around
  the wheel. Bucket detected by explicit singleton-plus-bowl check.

## Life vectors (`astro/aspects.js`)

Aspect-strength function:

```
aspectStrength(Δ°) = Σ_k  w_k · exp(−(Δ − a_k)² / (2 σ_k²))
  a_k ∈ {0, 60, 90, 120, 180}   w_k ∈ {1.0, 0.4, 0.7, 0.6, 0.9}
  σ_k ∈ {7, 4, 6, 6, 6}   (degrees)
```

Always ≥ 0, so the resulting series are always non-negative (no
signed cancellation between conjunctions and oppositions).

For each layer L at time t:

```
V_L(t) = (1/norm) ·
  ( Σ_{i∈L.planets} Σ_{j∈natal} A_i · A_j · aspectStrength(|φ_i(t) − λ_j|)
  + onlyFast(L) · Σ_{i∈SLOW} Σ_{j∈L.planets∩natal} A_i · A_j · aspectStrength(...) )
```

The second term is added only for layers built on fast-cycling planets
(Moon, Mercury, Venus) — those smooth to a flat line on a life-scale, so
we instead show slow-transit activation of the layer's natal bodies.

Normaliser is `ampA · sumNatalAmp · 1 + ampB · layerNatalAmp · 1`, keeping
every chart on the same scale — values for any chart sit in roughly [0, 1].

## Forecast (`astro/forecast.js`)

For each (slow transit planet × natal planet × aspect) triple, sample the
orb daily and locate **local minima** of `|angDist(tLon, nLon) − a|` that
fall within the aspect's orb. Parabolic refinement across the three
samples at the minimum gives sub-day accuracy.

Local-minimum detection (not sign-change) is essential — for
conjunction (a = 0°) and opposition (a = 180°), the folded angular
distance dips to zero then re-widens, never changing sign. Earlier
sign-change implementations missed Saturn returns outright; this was
caught by the precision test and fixed.

Retrograde flag is determined by comparing the transit planet's
longitude on the hit date against one day earlier.

## Synastry (`astro/synastry.js`)

- **Cross-aspects** — every A-planet × every B-planet, keep those in orb.
  Score = `(A_a + A_b) · weight · (1 − orb/maxOrb)`.
- **Composite (midpoint) chart** — circular mean of longitudes via
  `atan2(sin a + sin b, cos a + cos b)`. Antipodal pairs (0°, 180°)
  return 0 — a known mathematical limitation of the midpoint formula.
- **Compatibility highlights** — classical astrology's key pairs filtered
  from the full cross list: Sun-Moon, Venus-Mars, Moon-Moon, Saturn
  contacts to inner planets, outer-planet contacts to inner.
- **Tone** — `(harmonious − tense) / total` → flowing / mixed /
  challenging.

## AstroCartography (`astro/astrocartography.js`)

- **MC line**: meridian at longitude α − GMST, polyline from −85° to +85°
  latitude.
- **IC line**: antipodal meridian.
- **ASC/DSC**: locus where `cos H = −tan δ · tan φ`. Latitudes beyond the
  circumpolar limit are skipped (the planet neither rises nor sets
  there).
- **Lat/lon → XYZ**: `z = −r · cos(lat) · sin(lon)` — sign flipped to
  match Three.js SphereGeometry's UV convention (east = −Z axis). An
  earlier east-west bug placed Delhi near Cuba; fixed and verified.
- **Polar truncation at ±85°** avoids mesh-pinch artefacts where all
  planets' MC/IC lines converge.

## Goal-weighted map + Compare

- Shader computes `exp(−k · d²)` Gaussian falloff from each fragment to
  each of 40 (planet, line) loci. k = 16 for MC/IC, 14 for ASC/DSC.
- Per-goal weight vectors sum over active goals with their colours. JS
  (sweet-spots + Location Compare) uses the identical formula so
  numeric scores match the on-screen glow.
- Sweet spots: 72 × 36 grid (5°×5°), local-maxima scan, ≥ 35° separation.

## Geocoding (`astro/geocode.js`)

Optional city search. Endpoint: Open-Meteo Geocoding (free, no API key,
CORS-friendly). Timezone offset at the birth date is computed via
`Intl.DateTimeFormat` on the IANA zone string — so historical DST and
pre-standardisation offsets are handled by the runtime's ICU data.

## Precision test suites

Two suites kept in the repo:

```
src/astro/_sanity.mjs                  — 10 planets vs almanac at J2000 (0.5°)
src/personal/astro/_accuracy.mjs       — natal, houses, aspects, life vectors
src/personal/astro/_precision.mjs      — comprehensive multi-module audit
```

Current status:

- `_sanity.mjs` — all 10 J2000 positions within 0.5°
- `_accuracy.mjs` — 22/22 green
- `_precision.mjs` — **161/161 green** across:
  - Ephemeris at J2000, 1700, 1850, 1950, 2050, 2080 (range + validity)
  - Obliquity, `eclipticToEquatorial`, GMST baseline
  - Natal angle invariants (ASC ⟂ DSC, MC ⟂ IC)
  - Placidus cusp positions on all four angles
  - Equal-House fallback at polar latitudes
  - MC shift under geographic longitude shift
  - Element / mode distributions sum to 1
  - Grand Trine same-element enforcement (out-of-sign rejected)
  - T-square modality classification
  - Stellium detection
  - Chart shape: Bundle / Splash / Bowl / Bucket correctly identified
  - Life vectors: non-negative, bounded, smooth
  - Life vectors: fast-only layers now show multi-decade variation
  - Forecast: Saturn return detected (triple-pass, exact dates)
  - AstroCartography: MC/IC longitude math, pole truncation, ASC/DSC
    circumpolar limit
  - Synastry: self-synastry = 10 exact self-conjunctions
  - Composite midpoint = self-identity
  - Midpoint handles 350°/10° wrap correctly
  - Timezone offset: India UTC+5:30, NY winter −300, NY summer −240,
    historical dates produce finite offsets

Run: `node src/personal/astro/_precision.mjs`

## Known limitations

- Outer-planet ephemeris degrades near 1500 and 2100 window edges
  (Standish elements validity). For 1800–2050 all planets ≤ 1°.
- Midpoint of antipodes (exactly 180° apart) is mathematically
  undefined; the composite-chart formula returns 0 in that case.
- `Intl.DateTimeFormat` historical timezone data depends on the
  browser's ICU tables. Pre-1900 dates are best-effort.
- Chart-shape classification is a fuzzy typology — edge cases between
  e.g. Locomotive and Bucket can go either way.
- Placidus cusps are not computed at |lat| > 66.5°; Equal-House
  substitutes automatically.

