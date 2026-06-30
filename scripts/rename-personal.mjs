// Rename personal.html → index.html in the build output dir so GitHub
// Pages / Cloudflare Pages serve the entry app at the root URL.
//
// Usage:
//   node rename-personal.mjs                  → dist-personal/ (default)
//   node rename-personal.mjs --dist=dist-ology → dist-ology/
import { renameSync, existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
// Pick the dist directory from --dist=… (or default to dist-personal).
const distArg = process.argv.find(a => a.startsWith('--dist='));
const distName = distArg ? distArg.slice('--dist='.length) : 'dist-personal';
const dist = resolve(root, distName);
const personal = resolve(dist, 'personal.html');
const indexHtml = resolve(dist, 'index.html');

if (!existsSync(personal)) {
  console.error(`✗ ${distName}/personal.html not found — did the build run?`);
  process.exit(1);
}
renameSync(personal, indexHtml);

// vite-plugin-pwa generates sw.js during the build (before this rename
// runs) — so its precache manifest references personal.html, which no
// longer exists. Patch the SW to point at index.html instead; otherwise
// the Service Worker fails to install and silent 404s break offline
// precaching.
// Personal app only uses earth_topo.jpg — the map + blue_marble textures
// in public/ exist for the main (index.html) app. Strip them from the
// personal build so we don't ship ~1.1 MB of never-loaded images.
for (const f of ['earth_map.jpg', 'earth_blue_marble.jpg']) {
  const p = resolve(dist, f);
  if (existsSync(p)) { unlinkSync(p); console.log(`✓ stripped unused ${f}`); }
}

const swPath = resolve(dist, 'sw.js');
if (existsSync(swPath)) {
  let sw = readFileSync(swPath, 'utf8');
  sw = sw.replace(/url:"personal\.html"/g, 'url:"index.html"');
  // The NavigationRoute is also bound to "index.html" in config — already
  // correct. Only the precache entry needed rewriting.
  writeFileSync(swPath, sw);
  console.log('✓ sw.js patched: personal.html → index.html');
}

// Create a .nojekyll file so GitHub Pages serves all asset paths as-is.
const nojekyll = resolve(dist, '.nojekyll');
// (Defensive earth_blue_marble copy removed — personal build strips that
// texture above. Main-app deploy ships blue_marble through the normal
// public/ pipeline.)
try { /* already copied by vite */ } catch {}
import('fs').then(({ writeFileSync }) => writeFileSync(nojekyll, ''));

console.log('✓ personal.html → index.html');
console.log('✓ .nojekyll created');
console.log(`→ contents of ${distName}/:`);
import('fs').then(fs => {
  for (const f of fs.readdirSync(dist)) console.log('   ' + f);
});
