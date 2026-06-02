/**
 * Vow — Capacitor build script
 *
 * Copies `Vow — Retention Tracker v3.html` → `www/index.html`
 * and writes a minimal `www/manifest.webmanifest` so Capacitor
 * can find the entry point.
 *
 * Run:  node scripts/build.js
 * Or:   npm run build
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '..', 'Vow — Retention Tracker v3.html');
const DEST_DIR = path.resolve(__dirname, '..', 'www');
const DEST = path.join(DEST_DIR, 'index.html');

// ── 1. Make sure www/ exists ──────────────────────────────────
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log('Created www/');
}

// ── 2. Copy the HTML file ────────────────────────────────────
if (!fs.existsSync(SRC)) {
  console.error(`ERROR: Source file not found: ${SRC}`);
  console.error('Make sure "Vow — Retention Tracker v3.html" is in the project root.');
  process.exit(1);
}

let html = fs.readFileSync(SRC, 'utf8');

// ── 3. Inject Capacitor bridge script (must be first in <head>) ─
const capBridge = `\n  <!-- Capacitor bridge — injected by build.js -->\n  <script src="capacitor.js"></script>\n`;
if (!html.includes('capacitor.js')) {
  html = html.replace('<head>', `<head>${capBridge}`);
  console.log('Injected capacitor.js bridge into <head>');
}

// ── 4. Remove the inline PWA blob-manifest (Capacitor handles this) ─
html = html.replace(
  /(\/\/ ═+\s*\/\/ PWA MANIFEST[\s\S]*?\}\)\(\);)/,
  '/* PWA manifest removed — Capacitor supplies the native manifest */'
);

fs.writeFileSync(DEST, html, 'utf8');
console.log(`Copied → www/index.html  (${Math.round(fs.statSync(DEST).size / 1024)} KB)`);

// ── 5. Write a real web manifest for browser fallback ────────
const manifest = {
  name: 'Vow — Retention Tracker',
  short_name: 'Vow',
  description: 'Daily retention streak tracker with gamification and AI insights.',
  start_url: '.',
  display: 'standalone',
  background_color: '#1A1A1C',
  theme_color: '#3B8E5E',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
};
fs.writeFileSync(
  path.join(DEST_DIR, 'manifest.webmanifest'),
  JSON.stringify(manifest, null, 2)
);
console.log('Written  → www/manifest.webmanifest');

console.log('\nBuild complete. Run `npx cap sync` to push to iOS/Android.');
