// Browser-side Swiss WASM loader. The 71 KB Emscripten glue is bundled via
// Vite (alias `swisseph-glue`) — this guarantees the browser receives it
// with a correct JavaScript MIME type. Python's http.server, some Nginx
// configs, and a few edge/CDN setups serve `.js` files under a static
// directory as `application/octet-stream`, and module scripts MUST have
// a JS MIME per the HTML spec — so a dynamic import from
// `public/swephfiles/swisseph.js` fails on those environments.
//
// The .wasm (531 KB) and .data (12 MB) blobs stay in public/swephfiles/
// where they're runtime-fetched (and Service-Worker cached) by the glue
// itself — plain fetch doesn't care about MIME.
import WasmSwissEph from 'swisseph-glue';

export async function swissBrowserInit() {
  const base = import.meta.env.BASE_URL || '/';
  const SweModule = await WasmSwissEph({
    locateFile: (path) => {
      if (path.endsWith('.wasm') || path.endsWith('.data')) {
        return base + 'swephfiles/' + path;
      }
      return path;
    },
  });
  return SweModule;
}
