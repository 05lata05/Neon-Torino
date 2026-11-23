// Test di fumo: carica il gioco in Chromium headless, controlla che non ci siano errori
// e salva una foto di ogni landmark in tests/out/. Uso: npm test  (richiede Playwright)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'out');
fs.mkdirSync(OUT, { recursive: true });
const LOCAL_THREE = [path.join(ROOT, 'node_modules/three/build/three.module.js'), process.env.THREE_MODULE].find(
  p => p && fs.existsSync(p),
);

const port = 8000 + Math.floor(Math.random() * 900);
const srv = await serve(port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
if (LOCAL_THREE)
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ path: LOCAL_THREE, contentType: 'text/javascript' }));

await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__nr && window.__nr.landmarks, null, { timeout: 120000 });
const info = await page.evaluate(() => ({ errors: window.__nr.landmarks.errors, list: window.__nr.landmarks.list }));
console.log('landmark caricati:', info.list.join(', '));
if (info.errors.length) errors.push('landmark con errori: ' + info.errors.join(', '));

const only = process.argv.slice(2);
const views = await page.evaluate(() => {
  const L = window.__nr.L,
    toW = window.__nr.toW,
    out = [];
  const box = r => {
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9;
    for (const p of r) {
      const [x, z] = toW(p);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, s: Math.max(x1 - x0, z1 - z0) };
  };
  const st = L.stadium ? box(L.stadium.outer) : null;
  for (const id in L) {
    const o = L[id];
    const b = o.outer ? box(o.outer) : { ...(([x, z]) => ({ cx: x, cz: z }))(toW(o.pos)), s: 60 };
    // vicino allo stadio la telecamera si mette dalla parte opposta, per non finire sotto la copertura
    let dx = -0.66,
      dz = 0.75;
    if (st && id !== 'stadium') {
      const ex = b.cx - st.cx,
        ez = b.cz - st.cz,
        l = Math.hypot(ex, ez);
      if (l < 2500 && l > 1) {
        dx = ex / l;
        dz = ez / l;
      }
    }
    out.push({ id, ...b, dx, dz });
  }
  return out;
});
await page.evaluate(() => window.__nr.startGame());
for (const v of views) {
  if (only.length && !only.includes(v.id)) continue;
  const d = Math.max(260, Math.min(v.s * 1.1, 950));
  for (const [tag, hour] of [
    ['day', 12],
    ['night', 22],
  ]) {
    if (tag === 'night' && !['stadium', 'rignon', 'arena'].includes(v.id)) continue;
    await page.evaluate(
      ({ v, d, hour }) => {
        window.__nr.setHour(hour);
        window.__nr.cam = { x: v.cx + v.dx * d, y: d * 0.55, z: v.cz + v.dz * d, lx: v.cx, ly: 0, lz: v.cz, fov: 50 };
      },
      { v, d, hour },
    );
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `${v.id}-${tag}.png`) });
  }
}
await page.evaluate(() => {
  window.__nr.cam = null;
  window.__nr.setHour(12);
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'gioco.png') });

// partita simulata: tasti veri, controlli sullo stato del gioco
const st = () =>
  page.evaluate(() => {
    const n = window.__nr,
      p = n.player;
    return { x: p.x, y: p.y, car: !!p.car, state: n.state, wanted: n.wanted.level };
  });
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.evaluate(s => window.__nr.step(s), ms / 1000);
  await page.keyboard.up(key);
};
const check = (ok, msg) => {
  if (!ok) errors.push('partita: ' + msg);
  else console.log('  ✓ ' + msg);
};
console.log('partita simulata:');
await page.locator('#gl').focus();
const s0 = await st();
await hold('KeyW', 1200);
const s1 = await st();
check(Math.hypot(s1.x - s0.x, s1.y - s0.y) > 20, 'a piedi il giocatore cammina');
// auto di prova accanto al giocatore, sul marciapiede di partenza (posizione nota e libera)
const toSpawn = () =>
  page.evaluate(() => {
    const n = window.__nr;
    n.teleport(n.SPAWN.x, n.SPAWN.y);
    n.cars.splice(0, n.cars.length);
  });
await toSpawn();
await page.evaluate(() => window.__nr.spawnCar('sports'));
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
check((await st()).car, 'sale in auto con E');
const s2 = await st();
await hold('KeyW', 2000);
const s3 = await st();
check(Math.hypot(s3.x - s2.x, s3.y - s2.y) > 40, "l'auto accelera con W");
await hold('Space', 400);
await hold('KeyS', 800);
await page.evaluate(() => {
  for (let i = 0; i < 20 && Math.hypot(window.__nr.player.car.vx, window.__nr.player.car.vy) > 40; i++) window.__nr.step(0.5);
}); // si ferma prima di scendere
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
check(!(await st()).car, "scende dall'auto con E");
await page.keyboard.press('KeyM');
await page.waitForTimeout(300);
check((await st()).state === 'map', 'apre la mappa con M');
await page.keyboard.press('KeyM');
await page.keyboard.press('KeyP');
await page.waitForTimeout(200);
check((await st()).state === 'pause', 'mette in pausa con P');
await page.keyboard.press('KeyP');
await toSpawn();
await page.evaluate(() => window.__nr.spawnCar('police'));
await page.keyboard.press('KeyE');
await page.evaluate(() => window.__nr.step(0.5));
check((await st()).wanted > 0, "rubare un'auto della polizia fa salire il livello di ricercato");
const token = await page.evaluate(() => {
  const n = window.__nr,
    t = n.tokens.find(t => !t.got);
  if (!t) return null;
  const before = n.money;
  if (n.player.car) n.player.car = null;
  n.teleport(t.x, t.y);
  n.step(0.2);
  return n.money - before;
});
check(token === null || token >= 50, 'raccogliere un gettone dà 50 €');
await page.keyboard.press('KeyC');
await page.keyboard.press('KeyR');
await page.keyboard.press('KeyH');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'partita.png') });
// ---------------- prestazioni ----------------
// Senza scheda video (qui e su GitHub) gli fps non hanno senso: misuriamo il lavoro chiesto alla scheda video
// (chiamate di disegno, triangoli) e il tempo di calcolo della simulazione. Gli fps veri si vedono nel gioco col tasto I.
// Valori di partenza (fine M1): pc 350–400 chiamate e ~640k triangoli, telefono ~200 e ~630k, simulazione ~1–1,5 ms.
// Le soglie lasciano circa il 50% di margine per Santa Rita verosimile (M2); alzarle solo con un motivo scritto qui.
const LIMITS = {
  pc: { calls: 600, triangles: 1_500_000 }, // grafica alta, 1280×760
  phone: { calls: 350, triangles: 1_000_000 }, // grafica bassa, iPhone 13 emulato
  msPerFrame: 6, // simulazione (traffico, pedoni, polizia…) per frame, sul processore
};
const VIEWS = [
  ['street', v => ({ x: v.x - 60, y: 26, z: v.y - 10, lx: v.x + 60, ly: 12, lz: v.y + 10, fov: 62 })],
  ['aerial', v => ({ x: v.x - 500, y: 420, z: v.y + 500, lx: v.x, ly: 0, lz: v.y, fov: 55 })],
];
async function measure(pg, quality, name) {
  await pg.evaluate(q => window.__nr.setQuality(q), quality);
  const out = { calls: 0, triangles: 0 };
  for (const [vista, cam] of VIEWS) {
    await pg.evaluate(src => {
      const n = window.__nr,
        f = eval(src);
      n.cam = f(n.SPAWN);
    }, cam.toString());
    await pg.waitForTimeout(600);
    const p = await pg.evaluate(() => window.__nr.perf());
    out.calls = Math.max(out.calls, p.calls);
    out.triangles = Math.max(out.triangles, p.triangles);
    await pg.screenshot({ path: path.join(OUT, `prestazioni-${name}-${vista}.png`) });
  }
  await pg.evaluate(() => {
    window.__nr.cam = null;
  });
  return out;
}
console.log('prestazioni:');
// ogni misura parte da una partita nuova, con traffico e pedoni come all'avvio
async function newGame(options, name) {
  const ctxB = await browser.newContext(options),
    pg = await ctxB.newPage();
  pg.on('pageerror', e => errors.push(`${name} pageerror: ${e.message}`));
  if (LOCAL_THREE)
    await pg.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => r.fulfill({ path: LOCAL_THREE, contentType: 'text/javascript' }));
  await pg.goto(`http://localhost:${port}/`);
  await pg.waitForFunction(() => window.__nr && window.__nr.landmarks, null, { timeout: 120000 });
  await pg.evaluate(() => window.__nr.startGame());
  return [ctxB, pg];
}
const results = {};
{
  const [c, pg] = await newGame({ viewport: { width: 1280, height: 760 } }, 'pc');
  results.pc = await measure(pg, 1, 'pc');
  results.msPerFrame = await pg.evaluate(() => {
    const n = window.__nr,
      t0 = performance.now();
    n.step(3);
    return (performance.now() - t0) / 90;
  });
  await c.close();
}
{
  const [c, pg] = await newGame({ ...devices['iPhone 13'] }, 'phone');
  results.phone = await measure(pg, 0, 'phone');
  await c.close();
}
fs.writeFileSync(path.join(OUT, 'prestazioni.json'), JSON.stringify(results, null, 2));
const row = (name, r, s) => {
  console.log(
    `  ${name.padEnd(9)} ${String(r.calls).padStart(4)} chiamate (max ${s.calls})   ${(r.triangles / 1000).toFixed(0).padStart(5)}k triangoli (max ${s.triangles / 1000}k)`,
  );
  if (r.calls > s.calls) errors.push(`prestazioni ${name}: ${r.calls} chiamate di disegno, soglia ${s.calls}`);
  if (r.triangles > s.triangles) errors.push(`prestazioni ${name}: ${r.triangles} triangoli, soglia ${s.triangles}`);
};
row('pc', results.pc, LIMITS.pc);
row('phone', results.phone, LIMITS.phone);
console.log(`  simulazione ${results.msPerFrame.toFixed(2)} ms per frame (max ${LIMITS.msPerFrame})`);
if (results.msPerFrame > LIMITS.msPerFrame)
  errors.push(`prestazioni: simulazione ${results.msPerFrame.toFixed(2)} ms per frame, soglia ${LIMITS.msPerFrame}`);

await browser.close();
srv.close();
if (errors.length) {
  console.error('ERRORI:\n' + [...new Set(errors)].join('\n'));
  process.exit(1);
}
console.log('ok — foto in tests/out/');
