// Copy the swisseph-wasm runtime assets from node_modules to public/swephfiles/
// so Vite serves them verbatim at /swephfiles/*. We keep public/swephfiles/
// out of git (it's a node_modules mirror, 12 MB) and refresh it on every
// install (postinstall) and before every build (prebuild / prebuild:personal).
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const src  = join(repo, 'node_modules', 'swisseph-wasm', 'wasm');
const dst  = join(repo, 'public', 'swephfiles');

if (!existsSync(src)) {
  console.warn(`[copy-swephfiles] ${src} not found — skipping (Swiss fallback will engage at runtime).`);
  process.exit(0);
}

mkdirSync(dst, { recursive: true });
// swisseph.js glue is bundled via the Vite `swisseph-glue` alias (correct
// MIME, served from assets/). We only copy the runtime-loaded binaries.
for (const f of ['swisseph.wasm', 'swisseph.data']) {
  copyFileSync(join(src, f), join(dst, f));
}
// Ship the upstream LICENSE alongside the binary it covers — Swiss
// Ephemeris is GPL-3.0; the licence text MUST travel with the binary.
const licenseSrc = join(repo, 'node_modules', 'swisseph-wasm', 'LICENSE');
if (existsSync(licenseSrc)) {
  copyFileSync(licenseSrc, join(dst, 'LICENSE.txt'));
}
console.log(`[copy-swephfiles] copied swisseph.{wasm,data,LICENSE} → public/swephfiles/`);
