# Third-Party Notices

Ology bundles or links to the following third-party software. Each
component retains its own copyright and licence — the relevant licence
text is preserved either in `node_modules/<package>/LICENSE` (during
development) or in the `dist-ology/swephfiles/LICENSE.txt` shipped
alongside the runtime binary it covers.

## Swiss Ephemeris (via `swisseph-wasm`)

- **Package**: [`swisseph-wasm`](https://www.npmjs.com/package/swisseph-wasm)
  v0.0.5 by prolaxu
- **Underlying library**: Swiss Ephemeris by Astrodienst AG
  (https://www.astro.com/swisseph/)
- **Licence**: GNU General Public License v3.0 (or later)
- **Commercial use**: requires a separate commercial licence from
  Astrodienst AG (see https://www.astro.com/swisseph/swephinfo_e.htm)

The full licence text ships with every build at
`/swephfiles/LICENSE.txt` (relative to the deploy root) and is
preserved in this repo at `node_modules/swisseph-wasm/LICENSE`.

When you redistribute Ology in any form (deploy, fork, mirror), you
must ship the Swiss Ephemeris licence text alongside the binaries
(`swisseph.wasm` and `swisseph.data`). The repo's
`scripts/copy-swephfiles.mjs` does this automatically on every build.

## Other dependencies

| Package | Licence |
|---|---|
| React, ReactDOM | MIT |
| Zustand | MIT |
| Three.js | MIT |
| Vite | MIT |
| `vite-plugin-pwa` | MIT |
| Tailwind CSS, PostCSS, Autoprefixer | MIT |
| Terser | BSD-2-Clause |
| `@vitejs/plugin-react` | MIT |

Full text of each MIT / BSD licence lives in the corresponding
`node_modules/<pkg>/LICENSE` file during development.

## Public-domain references

- I-Ching hexagram names — Wilhelm/Baynes 1950 translation, public
  domain in jurisdictions where the 70-year post-mortem term has
  expired.
- NASA Blue Marble texture (`earth_topo.jpg`) — NASA public-domain
  imagery.

## Optional runtime services

- **Open-Meteo Geocoder** (https://open-meteo.com/) — free, no API key
  required, used only when the user types in the city-search box.
  Disabling it does not affect chart computation; users can enter
  lat/lon manually.

## Original Ology code

Everything under `src/` (compute, components, shell, exports, tests),
`public/_headers`, `index.html`, `personal.html`, `vedic.html`,
`chinese.html`, `gematria.html`, `vite.config.js`, `package.json`,
`README.md`, `NOTES.md`, and this `NOTICE.md` are original work
licensed under the project's main LICENSE (AGPL-3.0).
