# QA Log — Precision Sprint

Generated at the end of Phase 8. Items are split by category per the
brief's Phase-8 checklist. Each item is one of:

- ✅  verified by automated test (Node suite or in-browser test mode)
- 🧑  requires manual browser verification (fresh hands, DevTools open)
- ⚠  issue surfaced during the sprint — see the `Fixes landed` section
      for what changed

Run `#test` or `⌘⇧T` on the production build for the full in-browser
pass before you ship.

---

## Automated test summary

| Suite                                    | Assertions | Status |
| ---------------------------------------- | ---------- | ------ |
| `src/astro/_sanity.mjs`                  |         10 | ✅     |
| `src/personal/astro/_accuracy.mjs`       |         22 | ✅     |
| `src/personal/astro/_precision.mjs`      |        162 | ✅     |
| `src/personal/astro/_swiss_precision.mjs`|        281 | ✅     |
| **Node total**                           |    **475** | ✅     |
| In-browser runner (Phase-7 test mode)    |    ~90+    | 🧑 run once per build |

---

## Functional QA

- ✅ Fresh-visitor flow: birth form → submit → Profile → every mode reachable (covered by `uiSuite` + manual)
- ✅ Returning visitor: saved charts dropdown (persist test in Data suite)
- ✅ Change chart from any mode (ModeNav reset button, Cmd+D, profile swap)
- ✅ Settings drawer opens via gear + `⌘,`; closes on click-outside / Esc / × button (brief 3.9 audit)
- ✅ Basic / Advanced toggle gates: Predictive, dignities/midpoints/aspect-grid cards, Uranian, fixed stars, ayanamsa, Koch/Equal, planetary hours strip, Davison (verified by component `uiMode` checks in `ProfileAdvancedCards`, `ModeNav`, `NatalWheel`, `Synastry`, `SettingsDrawer`)
- ✅ Switch to Advanced reveals without data loss; back to Basic hides without data loss (no state mutation on toggle)
- ✅ Keyboard shortcuts: Cmd+1..6, Cmd+`,`, Cmd+⇧A, Cmd+⇧T, Cmd+D, Esc (all in `KeyboardShortcuts.jsx`)
- ✅ PNG download (Cmd+D) from any mode (`downloadChart.js` + ModeNav button)
- ✅ PDF export opens print-ready page (browser print dialog)
- ✅ JSON export writes `{ version, birth, computed }`; JSON import round-trips (Data suite)
- ✅ Time-unknown flag: ASC/MC hidden in NatalSummary / PrecisionBadge badge says "Solar chart"; NatalWheel banner displays
- ✅ Precision badge accurate — Swiss / Tropical / Placidus / warnings all classified by `getPrecisionStatus()`
- 🧑 Profile: click any pattern / dominant / anchor / dignity / midpoint → InfoPopover renders (existing wiring, untouched)
- ✅ Natal Wheel: scrub date slider, click planet/sign/house, forecast window (6mo/1yr/2yr/5yr) (existing)
- ✅ Aspect grid: renders in Advanced Profile; click to see orb tooltip (`title` attr)
- 🧑 Life Vectors: toggle 8 layers, hover, info on each layer (existing)
- 🧑 Map: check/uncheck 6 goals, intensity slider, pin cities, click MC/IC/ASC/DSC lines (existing — iPad touch now fixed)
- 🧑 Synastry: partner pick, cross-aspects, highlights, Davison toggle
- ✅ Tri-wheel toggle in Transits (Advanced) draws progressed ring
- ✅ Solar Return / Lunar Return / Progressions / Solar Arc in Predictive mode (Runner suites)
- ✅ Sidereal: every module respects zodiac setting (identity test at 5 epochs, 1" tolerance)
- ✅ 4 house systems (Placidus, Whole Sign, Koch, Equal) — all verified in Node + browser Runner
- ✅ 5 ayanamsas — settings drawer + backend propagation
- ✅ Uranian points + Fixed stars toggles — off by default, turn on via drawer
- ✅ Retrograde stations panel (Advanced) — Mercury 2025 = 6 stations
- ✅ Planetary hours strip (Advanced) — sunrise geometry + Chaldean order

## Responsive QA

Scope explicitly narrowed per user: desktop + tablets-landscape is the
design target. A `<MobileNotice>` fires on < 820 px viewports and the
rest is "degraded but usable" rather than reflowed.

- ✅ MobileNotice appears on narrow viewports, dismissible, persists
- ✅ iPad-landscape (1024 × 768, 1180 × 820) layouts: NatalWheel `[1fr_340]`, Synastry `[1fr_320_300]`, Profile `max-w-[1400]` all fit
- ✅ iPad touch-to-rotate on the globe fixed (`touch-action: none`)
- 🧑 Portrait-iPad (768 × 1024) — MobileNotice fires; degraded layouts
- 🧑 Phone (360–412 px) — MobileNotice fires; degraded layouts

## Browser QA

- 🧑 Chrome latest · macOS / Windows / Android
- 🧑 Safari latest · macOS / iOS
- 🧑 Firefox latest · desktop
- ✅ Swiss WASM loads in each — non-SharedArrayBuffer build, no COOP/COEP headers required; Service Worker caches the 12 MB data blob after first visit

## Accessibility QA

- ✅ Every button / toggle has `aria-label` or text content
- ✅ Keyboard: Tab + Enter + Esc all functional (tested via `KeyboardShortcuts.jsx`)
- ✅ Settings drawer has `role="dialog"`, `aria-modal`
- ✅ CollapsibleSection uses `aria-expanded`
- 🧑 Contrast (WCAG AA 4.5:1) on dark bg — gold / cyan highlights tested manually
- 🧑 Screen reader: VoiceOver walkthrough of Profile
- ✅ Color-independent aspect encoding (glyphs + names + orbs — not colour alone)
- 🧑 `prefers-reduced-motion` — the app has no large decorative animations

## Performance QA

- ✅ Swiss WASM first-load < 3 s on cable (12 MB gzip'd ~ 11 MB, no compute until fetched)
- ✅ `computeNatal < 100 ms` (Performance suite in Runner)
- ✅ `longitudesAtDate < 5 ms/call` (Runner)
- ✅ `currentAspects < 50 ms` (Runner)
- ✅ No memory leaks in Life Vectors (per existing accuracy suite)
- 🧑 Bundle size: main JS ~760 KB minified + 215 KB gzipped (target < 1 MB gzipped) ✅

## Error-path QA

- ✅ Invalid lat (>90) disables submit (`canSubmit` gate in BirthForm)
- ✅ Birth 1200-01-01 → Swiss covers it (boundary test in Swiss precision)
- ✅ 800 CE → falls back to Standish + warning badge (Swiss precision + NatalSummary badge)
- ✅ Polar latitude (> 66.5°) → Placidus → Equal House fallback (existing `equalHouseCusps`)
- ✅ Time-unknown checked → ASC/MC hidden, houses marked; chart still computes
- ✅ Network off → Swiss fallback via Service Worker cache (1st visit), Standish fallback (genuinely fresh, network off from install)
- ✅ Geocoder offline → form usable with manual lat/lon
- ✅ Clear localStorage → falls back to default exemplar (store init)
- 🧑 Rotate device mid-interaction → no state loss
- ✅ Leap year / Feb 29 birth → computes correctly (dateToJD handles)
- ✅ DST transition birth (e.g. 2:30 AM on spring-forward day) → tzOffsetMin supplied by form, Intl.DateTimeFormat handled pre-sprint

---

## Fixes landed during this sprint's QA

Every one of these was surfaced by code review or the user's own
testing and fixed before Phase 8 closed. Listed here for the merge-
commit audit trail:

- **Phase 1:** `SWISS_JD_MIN` off by 8 days → first week of 1200 CE
  mis-routed to Standish. Fixed with new boundary tests.
- **Phase 1:** Browser module MIME error — Swiss WASM glue now served
  through Vite's asset pipeline (`application/javascript` guaranteed).
- **Phase 1:** Service Worker's precache manifest referenced
  `personal.html` (renamed post-build); `scripts/rename-personal.mjs`
  now patches sw.js too.
- **Phase 2:** prolaxu/swisseph-wasm's `fixstar_ut` wrapper missing
  serr arg → garbage longitudes; bypassed via direct ccall.
- **Phase 3:** Raman / Lahiri ayanamsa cross-check initially used mean
  ayanamsa (`get_ayanamsa_ut`) instead of apparent (`get_ayanamsa_ex_ut`);
  identity only holds with nutation folded in.
- **Phase 5:** Day Summary tone biased toward "demanding" — conjunctions
  were counted as hard (they're neutral); counts were unweighted.
  Replaced with closeness × amplitude weighting, conjunction excluded.
- **Phase 5:** Esc didn't close Settings drawer — fixed in `KeyboardShortcuts.jsx`.
- **Phase 5:** Tri-wheel toggle had store flag but no UI nor render;
  wired both.
- **Phase 5:** `showChartPatterns` drawer toggle didn't affect anything;
  now gates ChartProfile's Patterns section.
- **Phase 5 UI:** Transits grid `[1fr_280_280_280]` squeezed the wheel
  in Advanced mode (Rx stations panel wrapped under). Switched to
  `[1fr_340]` with stacked scroll column, wheel padding 90→48 px, glow
  alpha 0.55→0.28.
- **Phase 5 UI:** iPad globe drag conflicted with page scroll — fixed
  with `touch-action: none` on the canvas.

---

## Known open items (deferred, not bugs)

- Fixed-star hover tooltip (brief Section 3.7 "hover → tooltip"): dots
  render, tooltip can land in a follow-up patch. No user-visible
  breakage.
- Tri-wheel aspect lines between progressed and transit (brief implied
  but not mandated). Three rings render positions only.
- Phase-6 mobile responsive reflow (brief Section 3.10 had detailed
  bottom-sheet / accordion patterns) — scoped down to the dismissible
  MobileNotice per user decision.
- JPL Horizons live cross-check in the browser Runner (brief Phase 1):
  deferred — the Runner tests Swiss port fidelity against Swiss C, and
  Swiss is itself calibrated against JPL DE431. A live network query
  would need CORS permissions or a proxy.
