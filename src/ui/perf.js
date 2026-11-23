// Indicatore delle prestazioni (tasto I): fps reali, chiamate di disegno, triangoli, qualità grafica.
import { t } from '../i18n/index.js';
// Serve a controllare il gioco su un dispositivo vero, per esempio un telefono.
import { renderer } from '../core/render.js';
import { quality } from '../render/quality.js';

export let visible = false;
const times = [];

export function togglePerf() {
  visible = !visible;
}

// da chiamare a ogni frame con la durata reale del frame precedente (secondi)
export function recordFrame(raw) {
  if (raw > 0 && raw < 2) times.push(raw);
  if (times.length > 60) times.shift();
}

// valori del frame appena disegnato (renderer.info si azzera a ogni render)
export function stats() {
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    r = renderer.info.render,
    m = renderer.info.memory;
  return { fps: avg ? 1 / avg : 0, calls: r.calls, triangles: r.triangles, geometries: m.geometries, textures: m.textures, quality };
}

export function drawPerf(ctx, W) {
  if (!visible) return;
  const s = stats(),
    lines = [
      `${s.fps.toFixed(0)} fps`,
      t('perf.calls', { n: s.calls }),
      t('perf.tris', { n: (s.triangles / 1000).toFixed(0) }),
      t('perf.gfx', { q: t(s.quality ? 'hud.gfx.high' : 'hud.gfx.low') }),
    ];
  ctx.save();
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W / 2 - 90, 6, 180, lines.length * 15 + 8);
  ctx.fillStyle = s.fps >= 30 || !s.fps ? '#7CFC9A' : '#ff6b6b';
  lines.forEach((l, i) => ctx.fillText(l, W / 2 - 82, 10 + i * 15));
  ctx.restore();
}
