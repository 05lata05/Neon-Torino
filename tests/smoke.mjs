// Test di fumo: carica il gioco in Chromium headless, controlla che non ci siano errori
// e salva una foto di ogni landmark in tests/out/. Uso: npm test  (richiede Playwright)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'out');
fs.mkdirSync(OUT, { recursive: true });
const LOCAL_THREE = [path.join(ROOT, 'node_modules/three/build/three.module.js'), process.env.THREE_MODULE].find(p => p && fs.existsSync(p));

const port = 8000 + Math.floor(Math.random() * 900);
const srv = await serve(port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
if (LOCAL_THREE) await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ path: LOCAL_THREE, contentType: 'text/javascript' }));

await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__nr && window.__nr.landmarks, null, { timeout: 120000 });
const info = await page.evaluate(() => ({ errors: window.__nr.landmarks.errors, list: window.__nr.landmarks.list }));
console.log('landmark caricati:', info.list.join(', '));
if (info.errors.length) errors.push('landmark con errori: ' + info.errors.join(', '));

const only = process.argv.slice(2);
const views = await page.evaluate(() => {
  const L = window.__nr.L, toW = window.__nr.toW, out = [];
  const box = r => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of r) { const [x, z] = toW(p); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, s: Math.max(x1 - x0, z1 - z0) }; };
  const st = L.stadio ? box(L.stadio.outer) : null;
  for (const id in L) {
    const o = L[id]; const b = o.outer ? box(o.outer) : { ...(([x, z]) => ({ cx: x, cz: z }))(toW(o.pos)), s: 60 };
    // vicino allo stadio la telecamera si mette dalla parte opposta, per non finire sotto la copertura
    let dx = -0.66, dz = 0.75;
    if (st && id !== 'stadio') { const ex = b.cx - st.cx, ez = b.cz - st.cz, l = Math.hypot(ex, ez); if (l < 2500 && l > 1) { dx = ex / l; dz = ez / l; } }
    out.push({ id, ...b, dx, dz });
  }
  return out;
});
await page.evaluate(() => window.__nr.startGame());
for (const v of views) {
  if (only.length && !only.includes(v.id)) continue;
  const d = Math.max(260, Math.min(v.s * 1.1, 950));
  for (const [tag, hour] of [['giorno', 12], ['notte', 22]]) {
    if (tag === 'notte' && !['stadio', 'rignon', 'arena'].includes(v.id)) continue;
    await page.evaluate(({ v, d, hour }) => { window.__nr.setHour(hour); window.__nr.cam = { x: v.cx + v.dx * d, y: d * 0.55, z: v.cz + v.dz * d, lx: v.cx, ly: 0, lz: v.cz, fov: 50 }; }, { v, d, hour });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `${v.id}-${tag}.png`) });
  }
}
await page.evaluate(() => { window.__nr.cam = null; });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'gioco.png') });
await browser.close(); srv.close();
if (errors.length) { console.error('ERRORI:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('ok — foto in tests/out/');
