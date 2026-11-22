// Utilità condivise: numeri casuali, angoli, texture su canvas, geometrie di base.
import * as THREE from 'three';
import { renderer } from './render.js';

export let TAU, clamp, rand, pick, angDiff, seed, srnd, tmpC, tmpO, rpick, STD, boxAt;

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255),
    g = clamp(((n >> 8) & 255) + amt, 0, 255),
    b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}
export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
// ---------------- suolo, strade e aree ----------------
export function canvasTex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
export function glowCanvas(r, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, cl] of stops) gr.addColorStop(o, cl);
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}
export function shapeOf(outer, holes) {
  const s = new THREE.Shape(outer.map(p => new THREE.Vector2(p[0], -p[1])));
  for (const h of holes || []) if (h.length >= 3) s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], -p[1]))));
  return s;
}
export function mkCv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
export function noiseFill(g, w, h, base, n) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)';
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}
export function mergeGeo(list) {
  const pos = [],
    nor = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  o.computeBoundingSphere();
  return o;
}
export function labelTex(text, col) {
  const c = document.createElement('canvas');
  const F = 'italic bold 40px "Arial Black",Impact,sans-serif';
  {
    const m = c.getContext('2d');
    m.font = F;
    c.width = Math.max(256, Math.ceil(m.measureText(text).width) + 48);
  }
  c.height = 64;
  const g = c.getContext('2d');
  g.font = F;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = col;
  g.shadowBlur = 14;
  g.fillStyle = '#ffffff';
  g.fillText(text, c.width / 2, 34);
  g.shadowBlur = 0;
  g.lineWidth = 2;
  g.strokeStyle = col;
  g.strokeText(text, c.width / 2, 34);
  return canvasTex(c);
}

export function init() {
  // ---------------- utilità ----------------
  TAU = Math.PI * 2;
  clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  rand = (a, b) => a + Math.random() * (b - a);
  pick = a => a[Math.floor(Math.random() * a.length)];
  angDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };
  seed = 20261119;
  srnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  tmpC = new THREE.Color();
  tmpO = new THREE.Object3D();
  rpick = a => a[Math.floor(Math.random() * a.length)];
  STD = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}));
  // ---------------- modelli 3D ----------------
  boxAt = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}
