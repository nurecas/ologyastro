import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// Three deploy modes:
//   npm run dev         — dev server, both entries
//   npm run build       — full build: both index.html + personal.html
//   npm run build:personal — personal-only build for GitHub Pages
//
// For GitHub Pages at username.github.io/<repo>, set VITE_BASE=/<repo>/ in
// your environment (or in the build command).
export default defineConfig(({ mode }) => {
  const personalOnly = mode === 'personal';
  // Ology mode: clean public build that outputs to dist-ology/.
  const ologyOnly = mode === 'ology';
  const base = process.env.VITE_BASE || '/';

  const input = (ologyOnly || personalOnly)
    ? {
        index:    resolve(__dirname, 'personal.html'),
        gematria: resolve(__dirname, 'gematria.html'),
        vedic:    resolve(__dirname, 'vedic.html'),
        chinese:  resolve(__dirname, 'chinese.html'),
      }
    : {
        main:     resolve(__dirname, 'index.html'),
        personal: resolve(__dirname, 'personal.html'),
        gematria: resolve(__dirname, 'gematria.html'),
        vedic:    resolve(__dirname, 'vedic.html'),
        chinese:  resolve(__dirname, 'chinese.html'),
      };

  // Service Worker: precache the personal app shell so repeat visits start
  // offline; runtime-cache the Swiss ephemeris data blob (12 MB — too large
  // for precache) with a CacheFirst strategy so the first visit pays the
  // download once and every subsequent visit is instant. Only enabled for
  // the personal build — per brief, we do not touch the main app here.
  const pwa = (personalOnly || ologyOnly)
    ? [VitePWA({
        registerType: 'autoUpdate',
        filename: 'sw.js',
        manifest: false, // not shipping a PWA install prompt; just SW caching
        workbox: {
          globPatterns: ['**/*.{js,css,html}', 'earth_topo.jpg'],
          runtimeCaching: [
            {
              // Swiss WASM + 12 MB data blob: long-lived, content-addressed,
              // CacheFirst is the correct strategy.
              urlPattern: ({ url }) => url.pathname.includes('/swephfiles/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'swiss-ephemeris-v1',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          // The 531 KB WASM binary is under the 2 MB default; the 12 MB
          // .data blob is runtime-cached above, so default precache size
          // limit is fine.
        },
      })]
    : [];

  return {
    plugins: [react(), ...pwa],
    base,
    server: { port: 5173, host: true },
    // Phase 1 / 5 audit: the Swiss Emscripten glue (swisseph.js, 71 KB) is
    // an ES module with `export default Swisseph`. We used to dynamic-
    // import it from public/swephfiles/, but some static servers
    // (Python's http.server, misconfigured Nginx, some Cloudflare edges)
    // serve .js from static dirs as application/octet-stream which the
    // browser's strict module MIME check rejects. Aliasing it here makes
    // Vite itself bundle the glue (correct MIME guaranteed); we only keep
    // the .wasm + 12 MB .data under public/swephfiles/ where MIME doesn't
    // matter (they're fetched, not imported).
    resolve: {
      alias: {
        'swisseph-glue': resolve(__dirname, 'node_modules/swisseph-wasm/wasm/swisseph.js'),
      },
    },
    optimizeDeps: { exclude: ['swisseph-wasm'] },
    assetsInclude: ['**/*.wasm'],
    build: {
      outDir: ologyOnly ? 'dist-ology' : (personalOnly ? 'dist-personal' : 'dist'),
      rollupOptions: { input },
      // Terser with top-level name mangling + console stripping (personal /
      // ology builds). Default esbuild minification is fast but leaves
      // top-level identifiers + console calls intact. Terser goes further:
      // short names for every identifier, every `console.log/.info/.debug`
      // removed from shipped code, literal folding. We keep `console.warn`
      // + `console.error` so the Swiss-init fallback warning still fires
      // in production.
      minify: (personalOnly || ologyOnly) ? 'terser' : 'esbuild',
      terserOptions: (personalOnly || ologyOnly) ? {
        compress: {
          drop_console: false,             // keep warn/error — see pure_funcs
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
          passes: 2,
        },
        mangle: {
          toplevel: true,
          // Preserve names that are referenced by string at runtime (React
          // devtools, Swiss WASM's Module.locateFile callback arg names,
          // the emscripten glue's readyPromiseResolve, etc.).
          reserved: ['Module', 'locateFile', 'HEAPF64', 'HEAP32'],
        },
        format: { comments: false },
      } : undefined,
    },
  };
});
