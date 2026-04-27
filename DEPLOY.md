# Deploying Ology to GitHub Pages

The personal chart app is a pure static site — HTML + JS + CSS + three JPEG textures + the Swiss Ephemeris runtime (glue + WASM + 12 MB data blob). Total build ~15 MB. No server code. No API calls at runtime. Works on GitHub Pages, Netlify, Cloudflare Pages, S3, or any bucket that serves files.

> **Since precision-sprint**: the `dist-personal/` bundle now ships a
> Service Worker (`sw.js`), a `swephfiles/` directory with the Swiss
> Ephemeris runtime, and a `_headers` file for Cloudflare Pages that
> guarantees the correct MIME for `/swephfiles/*.js` + `*.wasm`.
> **Do not flatten or filter these paths.**

---

## One-time GitHub setup

1. Push this repo to GitHub. Any name is fine — I'll assume `ology` below.
2. On GitHub → *Settings → Pages*:
   - **Source**: "Deploy from a branch"
   - **Branch**: `gh-pages` (or wherever you want to publish)
   - Save.

Your site will live at `https://<your-username>.github.io/ology/`.

---

## Build and deploy the personal-only site

From the project root:

```bash
# Bake in the base path that matches your GitHub Pages URL.
VITE_BASE="/ology/" npm run build:personal
```

That produces a `dist-personal/` folder containing:

```
dist-personal/
├── index.html                 ← renamed from personal.html, served at the root
├── earth_*.jpg                ← Earth textures
├── _headers                   ← Cloudflare Pages MIME + cache rules
├── .nojekyll                  ← tells GitHub Pages not to run Jekyll
├── sw.js                      ← Service Worker (precache shell, runtime-cache Swiss)
├── workbox-*.js               ← Workbox runtime
├── swephfiles/
│   ├── swisseph.wasm          ← 531 KB compiled Swiss core
│   └── swisseph.data          ← 12 MB Swiss ephemeris data (1200–2400 CE +
│                                 fixed stars + asteroids)
└── assets/
    ├── index-*.js             ← main bundle (~760 KB, ~215 KB gzipped)
    ├── swisseph-*.js          ← bundled Swiss glue (71 KB, correct MIME)
    └── index-*.css
```

The Service Worker precaches `index.html`, the JS bundle, CSS, and the
earth textures (~2.2 MB). It runtime-caches `/swephfiles/*` with
CacheFirst so after the first visit the 12 MB data blob never hits the
network again.

To publish to the `gh-pages` branch, the simplest path is the [`gh-pages`](https://github.com/tschaub/gh-pages) npm package:

```bash
npm install --save-dev gh-pages
npx gh-pages -d dist-personal -b gh-pages
```

That pushes `dist-personal/`'s contents to the `gh-pages` branch. GitHub Pages serves it within a minute or two.

**Alternative — manual:**

```bash
cd dist-personal
git init
git add -A
git commit -m "personal app"
git branch -M gh-pages
git remote add origin https://github.com/<your-username>/ology.git
git push -u origin gh-pages --force
```

---

## Base-path notes

- At `https://<user>.github.io/ology/` → set `VITE_BASE="/ology/"`.
- At a root domain like `https://chart.myname.com/` → leave default (`/`).
- At `https://<user>.github.io/` (a user-page, *not* a project page) → leave default (`/`).

If the deployed site loads `index.html` but its JS/CSS URLs 404, the base is wrong. Rebuild with the correct `VITE_BASE`.

---

## Check locally before pushing

```bash
VITE_BASE="/ology/" npm run build:personal
npx serve -p 8000 dist-personal
# open http://localhost:8000/ology/   (note the trailing slash)
```

---

## Netlify / Cloudflare Pages / Vercel

All three auto-detect Vite projects. Point the build command at `npm run build:personal` and the publish directory at `dist-personal`. Set the environment variable `VITE_BASE=/` since those platforms serve at the root.

---

