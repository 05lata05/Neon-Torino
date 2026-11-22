// Particelle (fumo, scintille) e messaggi a schermo (fumetti, avvisi, titoli).
import * as THREE from 'three';
import { G } from '../core/game.js';
import { scene } from '../core/render.js';
import { parts, toasts } from '../core/state.js';
import { TAU, canvasTex, glowCanvas, rand } from '../core/util.js';
import { onScreen } from '../entities/spawn.js';

export let puffTex, freeSprites;

export function puff(x, y, col, r, life, vx, vy, grow, alpha, h, vh) {
  if (!freeSprites.length) return;
  const s = freeSprites.pop();
  s.material.color.set(col);
  s.visible = true;
  parts.push({
    x,
    y,
    vx: vx || 0,
    vy: vy || 0,
    r,
    col,
    life,
    max: life,
    grow: grow || 10,
    alpha: alpha || 0.5,
    h: h ?? 6,
    vh: vh ?? 12,
    s,
  });
}
export function sparks(x, y, imp) {
  if (!onScreen(x, y, 50)) return;
  const n = Math.min(12, 4 + ((imp / 40) | 0));
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU),
      s = rand(60, 200);
    puff(x, y, '#ffd166', 1.6, rand(0.15, 0.4), Math.cos(a) * s, Math.sin(a) * s, 0, 1, rand(4, 10), rand(20, 80));
  }
}
export function say(ent, text, dur) {
  G.bubbles = G.bubbles.filter(b => b.ent !== ent);
  G.bubbles.push({ ent, text, t: dur || 2 });
}
export function toast(s, d) {
  toasts.push({ s, t: d || 2.6 });
  if (toasts.length > 3) toasts.shift();
}
export function bigMsg(title, sub, col, d) {
  G.big = { title, sub, col: col || '#ffd32a', t: d || 3, max: d || 3 };
}

export function init() {
  // ---------------- particelle (sprite) ----------------
  puffTex = canvasTex(
    glowCanvas(32, [
      [0, 'rgba(255,255,255,1)'],
      [0.55, 'rgba(255,255,255,0.55)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  );
  freeSprites = [];
  for (let i = 0; i < 200; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false }));
    s.visible = false;
    scene.add(s);
    freeSprites.push(s);
  }
}
