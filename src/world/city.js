// Città 3D: facciate generate, palazzi, alberi, lampioni, semafori; aggancio dei landmark.
import * as THREE from 'three';
import { initLandmarks } from '../landmarks/index.js';
import { scene } from '../core/render.js';
import { STD, canvasTex, glowCanvas, labelTex, mkCv, noiseFill, rpick, tmpC, tmpO } from '../core/util.js';
import { MS, miniCv } from './ground.js';
import {
  BUILD,
  CHURCH,
  DATA,
  GH,
  GW,
  OUT,
  PAL,
  PARK,
  PB,
  ROAD,
  SPAWN,
  T,
  WATER,
  areasD,
  brnd,
  buildings,
  edges,
  fillPoly,
  grid,
  heightAt,
  hgrid,
  nearestEdge,
  offsetLine,
  polyArea,
  roads,
  signals,
  stroke,
  tileAtPx,
  toW,
} from './map.js';

export let FLOOR, GF, SHOPS, FT, FAC_M, stuccoM, glassBM, roofM, neonM, bulbM, antM, lampDecalM, tlLamps, tlAxis, envHooks, LMX;

// facciate residenziali: 4 moduli x 4 piani (512x512 px = 80 x 60 unità)
export function makeRes(kind) {
  const [c, g] = mkCv(512, 512),
    [e, ge] = mkCv(512, 512);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 512, 512);
  noiseFill(g, 512, 512, '#f3efe8', 2600);
  const SH = {
    balcony: ['#6b4a32', '#7a5a40', '#8a8a86', '#6b4a32'],
    shutters: ['#6b4a32', '#9a9890', '#e6e2da', '#7a5a40'],
    louvers: ['#3e5b3a', '#4a6640', '#35503a', '#5f4630'],
  }[kind];
  const AW = ['#2f7d4f', '#c2562c', '#2f5f9a', '#b8892f', '#8a2f3a'];
  const lit = (x, y, w, h) => {
    if (Math.random() < 0.42) {
      ge.fillStyle = rpick(['#e8b060', '#f0c47a', '#ffd89a', '#f5d0a0', '#9fc0e0']);
      ge.fillRect(x, y, w, h);
    }
  };
  for (let r = 0; r < 4; r++) {
    const y0 = r * 128,
      balcRow = kind === 'balcony' || (kind === 'shutters' && Math.random() < 0.3);
    if (kind === 'louvers') {
      g.fillStyle = 'rgba(0,0,0,0.10)';
      g.fillRect(0, y0 + 120, 512, 6);
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.fillRect(0, y0 + 117, 512, 3);
    } else {
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.fillRect(0, y0 + 124, 512, 4);
    }
    for (let k = 0; k < 4; k++) {
      const x0 = k * 128,
        door = balcRow && (kind === 'balcony' ? k % 2 === 0 : k === 1 || k === 2);
      const ww = 46,
        wh = door ? 100 : 64,
        wx = x0 + 41,
        wy = door ? y0 + 18 : y0 + 30;
      g.fillStyle = kind === 'louvers' ? '#ebe5d8' : '#ddd7cc';
      g.fillRect(wx - 5, wy - 5, ww + 10, wh + (door ? 5 : 10));
      g.fillStyle = '#2b3746';
      g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(wx + 3, wy + 3, 14, wh - 6);
      g.fillStyle = '#d8d2c6';
      g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
      if (kind === 'louvers') {
        const sc = rpick(SH);
        if (Math.random() < 0.35) {
          g.fillStyle = sc;
          g.fillRect(wx, wy, ww, wh);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          for (let yy = wy + 4; yy < wy + wh; yy += 6) g.fillRect(wx, yy, ww, 2);
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        } else {
          lit(wx, wy, ww, wh);
          g.fillStyle = sc;
          g.fillRect(wx - 27, wy, 22, wh);
          g.fillRect(wx + ww + 5, wy, 22, wh);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          for (let yy = wy + 4; yy < wy + wh; yy += 6) {
            g.fillRect(wx - 27, yy, 22, 2);
            g.fillRect(wx + ww + 5, yy, 22, 2);
          }
        }
        g.fillStyle = '#efe9dd';
        g.fillRect(wx - 8, wy + wh + 3, ww + 16, 6);
        g.fillStyle = 'rgba(0,0,0,0.15)';
        g.fillRect(wx - 8, wy + wh + 9, ww + 16, 2);
        g.fillStyle = '#e7e0d2';
        g.fillRect(wx - 8, wy - 14, ww + 16, 7);
      } else {
        const f = Math.random() < 0.15 ? 1 : Math.random() * 0.85,
          sh = Math.round(wh * f),
          sc = rpick(SH);
        if (wh - sh > 4) lit(wx, wy + sh, ww, wh - sh);
        g.fillStyle = sc;
        g.fillRect(wx, wy, ww, sh);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let yy = wy + 3; yy < wy + sh; yy += 4) g.fillRect(wx, yy, ww, 1);
        g.fillStyle = '#cfc8bb';
        g.fillRect(wx - 6, wy - 10, ww + 12, 5);
        if (!door) {
          g.fillStyle = '#e6e0d4';
          g.fillRect(wx - 7, wy + wh + 4, ww + 14, 5);
        }
      }
    }
    if (balcRow) {
      const segs = kind === 'balcony' ? [[0, 512]] : [[128, 384]];
      for (const [a, b] of segs) {
        g.fillStyle = '#ebe7de';
        g.fillRect(a, y0 + 118, b - a, 8);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(a, y0 + 126, b - a, 2);
        if (Math.random() < 0.5) {
          g.fillStyle = 'rgba(228,223,213,0.94)';
          g.fillRect(a, y0 + 84, b - a, 34);
          g.fillStyle = 'rgba(0,0,0,0.08)';
          g.fillRect(a, y0 + 84, b - a, 3);
          for (let x = a; x < b; x += 128) {
            g.fillStyle = 'rgba(0,0,0,0.06)';
            g.fillRect(x, y0 + 84, 2, 34);
          }
        } else {
          g.fillStyle = '#3b3f45';
          g.fillRect(a, y0 + 84, b - a, 3);
          for (let x = a + 3; x < b; x += 8) g.fillRect(x, y0 + 84, 2, 34);
        }
        // vasi di fiori sul balcone
        for (let x = a + 10; x < b - 10; x += 24)
          if (Math.random() < 0.25) {
            g.fillStyle = '#a0522d';
            g.fillRect(x, y0 + 76, 10, 8);
            g.fillStyle = rpick(['#3f8f3a', '#5aa04a', '#c0392b', '#e17055']);
            g.beginPath();
            g.arc(x + 5, y0 + 73, 7, 0, Math.PI * 2);
            g.fill();
          }
      }
      for (let k = 0; k < 4; k++)
        if (Math.random() < 0.3) {
          const x0 = k * 128 + 28,
            ac = rpick(AW);
          for (let s = 0; s < 72; s += 12) {
            g.fillStyle = (s / 12) % 2 ? ac : '#f1ede4';
            g.fillRect(x0 + s, y0 + 8, 12, 26);
          }
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x0, y0 + 33, 72, 3);
        }
    }
  }
  return [canvasTex(c, true), canvasTex(e, true)];
}
export function makeShops() {
  const W = 2048,
    H = 128,
    [c, g] = mkCv(W, H),
    [e, ge] = mkCv(W, H);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, W, H);
  noiseFill(g, W, H, '#ddd6c8', 4000);
  const order = [...SHOPS].sort(() => Math.random() - 0.5);
  const sign = (cx, x0, name, bg, fg, ic) => {
    cx.fillStyle = bg;
    cx.fillRect(x0 + 6, 7, 116, 29);
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    let fs = 21;
    cx.font = 'bold ' + fs + 'px system-ui,sans-serif';
    const maxW = ic ? 82 : 108;
    while (cx.measureText(name).width > maxW && fs > 9) {
      fs--;
      cx.font = 'bold ' + fs + 'px system-ui,sans-serif';
    }
    cx.fillStyle = fg;
    cx.fillText(name, ic ? x0 + 80 : x0 + 64, 22);
    if (ic === 'T') {
      cx.fillStyle = '#ffffff';
      cx.fillRect(x0 + 9, 10, 24, 23);
      cx.fillStyle = '#1d2a4f';
      cx.fillRect(x0 + 11, 12, 20, 19);
      cx.fillStyle = '#ffffff';
      cx.font = 'bold 20px serif';
      cx.fillText('T', x0 + 21, 22);
    }
    if (ic === '+') {
      cx.fillStyle = '#22a046';
      cx.fillRect(x0 + 17, 10, 9, 24);
      cx.fillRect(x0 + 9, 18, 25, 9);
    }
  };
  for (let i = 0; i < 16; i++) {
    const x0 = i * 128,
      [name, bg, fg, ic] = order[i],
      closed = Math.random() < 0.15;
    g.fillStyle = '#c9c1b2';
    g.fillRect(x0, 0, 7, 128);
    g.fillRect(x0, 38, 128, 6);
    sign(g, x0, name, bg, fg, ic);
    sign(ge, x0, name, bg === '#f4f4f0' || bg === '#f2f2f2' ? '#d8f0dc' : bg, fg, ic);
    if (closed) {
      g.fillStyle = '#a3a4a6';
      g.fillRect(x0 + 9, 46, 111, 82);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 48; y < 128; y += 5) g.fillRect(x0 + 9, y, 111, 1);
      if (Math.random() < 0.6) {
        g.strokeStyle = rpick(['#e84393', '#0984e3', '#00b894', '#2d3436']);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x0 + 20, 100);
        for (let k = 0; k < 6; k++) g.lineTo(x0 + 25 + k * 14, 85 + Math.random() * 25);
        g.stroke();
      }
    } else {
      g.fillStyle = '#26313d';
      g.fillRect(x0 + 9, 46, 111, 82);
      for (let k = 0; k < 7; k++) {
        g.fillStyle = rpick(['#c9a46a', '#d96c4f', '#7fb3d5', '#e8d9a8', '#8bc48a', '#f5f0e6']);
        g.fillRect(x0 + 14 + Math.random() * 92, 62 + Math.random() * 50, 7 + Math.random() * 14, 6 + Math.random() * 12);
      }
      g.fillStyle = 'rgba(255,255,255,0.13)';
      g.fillRect(x0 + 13, 50, 26, 74);
      g.fillStyle = '#55595f';
      g.fillRect(x0 + 78, 48, 3, 80);
      g.fillRect(x0 + 9, 46, 111, 3);
      ge.fillStyle = 'rgba(240,196,130,0.6)';
      ge.fillRect(x0 + 9, 49, 111, 79);
    }
  }
  return [canvasTex(c, true), canvasTex(e, true)];
}
// piano terra senza negozi: zoccolo in pietra, portone, finestre con inferriate, box auto
export function makePlain() {
  const [c, g] = mkCv(512, 128),
    [e, ge] = mkCv(512, 128);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 512, 128);
  noiseFill(g, 512, 128, '#e6e0d4', 1500);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 12; y < 96; y += 14) g.fillRect(0, y, 512, 2);
  g.fillStyle = '#aaa59b';
  g.fillRect(0, 98, 512, 30);
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let x = 0; x < 512; x += 42) g.fillRect(x, 98, 2, 30);
  g.fillRect(0, 98, 512, 2);
  for (let k = 0; k < 4; k++) {
    const x0 = k * 128;
    if (k === 1) {
      g.fillStyle = '#d4ccbd';
      g.fillRect(x0 + 32, 10, 64, 118);
      g.fillStyle = '#5a3b26';
      g.fillRect(x0 + 38, 16, 52, 112);
      g.fillStyle = '#2b3542';
      g.fillRect(x0 + 45, 24, 38, 42);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x0 + 63, 16, 2, 112);
      g.fillStyle = '#c9a227';
      g.fillRect(x0 + 56, 84, 4, 6);
      g.fillRect(x0 + 68, 84, 4, 6);
      ge.fillStyle = '#b08850';
      ge.fillRect(x0 + 45, 24, 38, 42);
    } else if (k === 3) {
      g.fillStyle = '#8d9095';
      g.fillRect(x0 + 18, 32, 92, 96);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      for (let y = 36; y < 128; y += 8) g.fillRect(x0 + 18, y, 92, 2);
    } else {
      g.fillStyle = '#d6cfc2';
      g.fillRect(x0 + 38, 24, 52, 62);
      g.fillStyle = '#2b3746';
      g.fillRect(x0 + 43, 29, 42, 52);
      if (Math.random() < 0.35) {
        ge.fillStyle = '#e0b070';
        ge.fillRect(x0 + 43, 29, 42, 52);
      }
      g.fillStyle = '#2a2d31';
      for (let x = x0 + 46; x < x0 + 86; x += 7) g.fillRect(x, 29, 2, 52);
      g.fillRect(x0 + 43, 42, 42, 2);
      g.fillRect(x0 + 43, 64, 42, 2);
    }
  }
  return [canvasTex(c, true), canvasTex(e, true)];
}
export function makeChurch() {
  const [c, g] = mkCv(512, 512),
    [e, ge] = mkCv(512, 512);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 512, 512);
  noiseFill(g, 512, 512, '#efe6d2', 3000);
  g.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < 512; y += 16) g.fillRect(0, y, 512, 1);
  for (let k = 0; k < 2; k++) {
    const x0 = k * 256 + 98;
    g.fillStyle = '#d9ccb2';
    g.fillRect(x0 - 8, 96, 76, 300);
    g.fillStyle = '#2c3a52';
    g.fillRect(x0, 130, 60, 258);
    g.beginPath();
    g.arc(x0 + 30, 130, 30, Math.PI, 0);
    g.fill();
    g.fillStyle = '#b84a3a';
    g.fillRect(x0 + 4, 150, 24, 90);
    g.fillStyle = '#d6a640';
    g.fillRect(x0 + 32, 150, 24, 90);
    g.fillStyle = '#3d6fb0';
    g.fillRect(x0 + 4, 250, 52, 60);
    ge.fillStyle = '#a0703a';
    ge.fillRect(x0, 130, 60, 258);
  }
  g.fillStyle = '#d9ccb2';
  g.fillRect(0, 440, 512, 14);
  return [canvasTex(c, true), canvasTex(e, true)];
}
export function makeStadium() {
  const [c, g] = mkCv(512, 512),
    [e, ge] = mkCv(512, 512);
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, 512, 512);
  noiseFill(g, 512, 512, '#c9ccd1', 2500);
  for (let x = 0; x < 512; x += 64) {
    g.fillStyle = '#aeb3ba';
    g.fillRect(x, 0, 14, 512);
  }
  g.fillStyle = '#8a2432';
  g.fillRect(0, 40, 512, 26);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 128; y < 512; y += 128) g.fillRect(0, y, 512, 6);
  return [canvasTex(c, true), canvasTex(e, true)];
}
export function inst(geo, mat, items, cast, colored) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    tmpO.position.set(it[0], it[1], it[2]);
    tmpO.scale.set(it[3] ?? 1, it[4] ?? 1, it[5] ?? 1);
    tmpO.rotation.set(it[6] || 0, it[7] || 0, it[8] || 0);
    tmpO.updateMatrix();
    m.setMatrixAt(i, tmpO.matrix);
    if (colored) m.setColorAt(i, tmpC.set(it[9] || '#ffffff'));
  });
  m.castShadow = !!cast;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
export function buildCity() {
  const WA = {},
    roofA = { p: [], n: [], c: [] };
  for (const k in FAC_M) WA[k] = { p: [], n: [], u: [], c: [] };
  const ac = [],
    neon = [],
    ant = [],
    antL = [],
    torr = [],
    tvp = [],
    tvx = [];
  // vicinanza alle strade (2 = corso/via principale, 1 = via residenziale): decide dove ci sono i negozi
  const nearMain = new Uint8Array(GW * GH);
  for (const r of roads) {
    const lv = r.cls === 'P' || r.cls === 'S' || r.cls === 'T' ? 2 : r.cls === 'R' ? 1 : 0;
    if (lv)
      stroke(r.pts, r.w + 90, i => {
        if (nearMain[i] < lv) nearMain[i] = lv;
      });
  }
  const tIdx = (x, y) => {
    const tx = Math.floor(x / T),
      ty = Math.floor(y / T);
    return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx;
  };
  const wall = (o, ax, ay, bx, by, y0, y1, u0, u1, v0, v1, nx, ny, col, left) => {
    const P = [
        [ax, y0, ay],
        [bx, y0, by],
        [bx, y1, by],
        [ax, y1, ay],
      ],
      U = [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ];
    for (const i of left ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) {
      o.p.push(P[i][0], P[i][1], P[i][2]);
      o.n.push(nx, 0, ny);
      o.u.push(U[i][0], U[i][1]);
      o.c.push(col.r, col.g, col.b);
    }
  };
  const ringArea = r => {
    let a = 0;
    for (let i = 0; i < r.length; i++) {
      const p = r[i],
        q = r[(i + 1) % r.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a / 2;
  };
  const WHITE = new THREE.Color('#ffffff');
  // pareti di un anello (esterno o cortile): piano terra (negozi/portoni) + piani superiori
  function addWalls(ring, isHole, h, style, col, base, off, streetFn) {
    const A = ringArea(ring),
      n = ring.length;
    let u = off;
    for (let i = 0; i < n; i++) {
      const p = ring[i],
        q = ring[(i + 1) % n],
        dx = q[0] - p[0],
        dy = q[1] - p[1],
        L = Math.hypot(dx, dy);
      if (L < 0.5) continue;
      const left = isHole ? A > 0 : A <= 0,
        nx = left ? -dy / L : dy / L,
        ny = left ? dx / L : -dx / L,
        u1 = u + L,
        ua = left ? u : -u,
        ub = left ? u1 : -u1;
      if (!base) {
        const V = style === 'church' ? h : 60;
        wall(WA[style], p[0], p[1], q[0], q[1], 0, h, ua / 80, ub / 80, 0, h / V, nx, ny, col, left);
      } else {
        const lv = isHole ? 0 : streetFn((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, nx, ny),
          sh = (lv === 2 && base.s2) || (lv === 1 && base.s1) ? 'shop' : 'plain';
        if (sh === 'shop') wall(WA.shop, p[0], p[1], q[0], q[1], 0, GF, ua / 640, ub / 640, 0, 1, nx, ny, WHITE, left);
        else wall(WA.plain, p[0], p[1], q[0], q[1], 0, GF, ua / 80, ub / 80, 0, 1, nx, ny, base.col, left);
        wall(WA[style], p[0], p[1], q[0], q[1], GF, h, ua / 80, ub / 80, 0, (h - GF) / 60, nx, ny, col, left);
      }
      u = u1;
    }
  }
  function addRoof(outer, holes, h, rc) {
    const c2 = outer.map(p => new THREE.Vector2(p[0], p[1])),
      h2 = holes.map(r => r.map(p => new THREE.Vector2(p[0], p[1])));
    let tris;
    try {
      tris = THREE.ShapeUtils.triangulateShape(c2, h2);
    } catch (e) {
      return;
    }
    const all = [...outer];
    for (const r of holes) all.push(...r);
    for (const t of tris) {
      const a = all[t[0]],
        b = all[t[1]],
        c = all[t[2]];
      if (!a || !b || !c) continue;
      const up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      for (const v of up >= 0 ? [a, b, c] : [a, c, b]) {
        roofA.p.push(v[0], h, v[1]);
        roofA.n.push(0, 1, 0);
        roofA.c.push(rc.r, rc.g, rc.b);
      }
    }
  }
  const clean = r => {
    const o = [];
    for (const p of r) {
      const l = o[o.length - 1];
      if (!l || Math.abs(l[0] - p[0]) > 0.01 || Math.abs(l[1] - p[1]) > 0.01) o.push(p);
    }
    if (o.length > 2 && Math.abs(o[0][0] - o[o.length - 1][0]) < 0.01 && Math.abs(o[0][1] - o[o.length - 1][1]) < 0.01) o.pop();
    return o;
  };
  const gridStreet = (mx, my, nx, ny) => {
    for (const d of [22, 40, 60]) {
      const i = tIdx(mx + nx * d, my + ny * d);
      if (i < 0) return 0;
      if (grid[i] === ROAD) return nearMain[i] || 1;
      if (grid[i] === BUILD) return 0;
    }
    return 0;
  };
  const ROOFC = ['#8b8c90', '#7d7f84', '#9b978e', '#85878a'];
  for (const b of buildings) {
    const outer = clean(b.outer),
      holes = b.holes.map(clean).filter(h => h.length >= 3);
    if (outer.length < 3) continue;
    const col = new THREE.Color(b.col),
      hasBase = b.style !== 'church' && b.style !== 'stadium' && b.floors >= 3;
    const base = hasBase ? { col: col.clone().multiplyScalar(0.84), s2: brnd() < 0.88, s1: brnd() < 0.38 } : null,
      off = brnd() * 640;
    addWalls(outer, false, b.h3, b.style, col, base, off, gridStreet);
    for (const h of holes) addWalls(h, true, b.h3, b.style, col, base, off, gridStreet);
    const rc = new THREE.Color(
      b.kind === 1
        ? '#a65a3e'
        : b.kind === 2
          ? '#9aa0a8'
          : b.floors <= 5 && brnd() < 0.35
            ? '#a35b40'
            : ROOFC[Math.floor(brnd() * ROOFC.length)],
    );
    addRoof(outer, holes, b.h3, rc);
    const ar = polyArea(b.outer);
    let cx = 0,
      cy = 0;
    for (const p of outer) {
      cx += p[0];
      cy += p[1];
    }
    cx /= outer.length;
    cy /= outer.length;
    const onRoof = (x, y) => tileAtPx(x, y) === BUILD && Math.abs(heightAt(x, y) - b.h3) < 1;
    let la = 0,
      ll = 0;
    for (let i = 0; i < outer.length; i++) {
      const p = outer[i],
        q = outer[(i + 1) % outer.length],
        L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L > ll) {
        ll = L;
        la = Math.atan2(q[1] - p[1], q[0] - p[0]);
      }
    }
    if (b.kind === 0 && b.floors >= 5 && onRoof(cx, cy)) torr.push([cx, b.h3 + 9, cy, 26, 18, 18, 0, -la, 0]);
    if (ar > 6000 && b.kind === 0) {
      const n = 1 + Math.floor(brnd() * 2);
      for (let i = 0; i < n; i++) {
        const x = cx + (brnd() - 0.5) * 40,
          y = cy + (brnd() - 0.5) * 40;
        if (onRoof(x, y)) ac.push([x, b.h3 + 4, y, 14, 8, 12]);
      }
    }
    if (b.kind === 0 && b.floors >= 3) {
      const n = 1 + Math.floor(brnd() * 3);
      for (let i = 0; i < n; i++) {
        const x = cx + (brnd() - 0.5) * 50,
          y = cy + (brnd() - 0.5) * 50;
        if (!onRoof(x, y)) continue;
        const hh = 10 + brnd() * 6,
          ra = brnd() * 3;
        tvp.push([x, b.h3 + hh / 2, y, 1, hh, 1]);
        tvx.push([x, b.h3 + hh - 1, y, 9, 0.5, 0.5, 0, ra, 0]);
        tvx.push([x, b.h3 + hh - 4, y, 6, 0.5, 0.5, 0, ra, 0]);
      }
    }
    if (b.floors >= 11) {
      ant.push([cx, b.h3 + 22, cy]);
      antL.push([cx, b.h3 + 44, cy]);
    }
    if (b.neon) {
      const r = b.outer;
      for (let i = 0; i < r.length; i++) {
        const p = r[i],
          q = r[(i + 1) % r.length],
          L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L < 8) continue;
        neon.push([(p[0] + q[0]) / 2, b.h3 + 1, (p[1] + q[1]) / 2, L, 1.6, 1.6, 0, -Math.atan2(q[1] - p[1], q[0] - p[0]), 0, b.neon]);
      }
    }
  }
  // la città continua oltre il bordo: isolati a corte orientati come la griglia di Santa Rita
  {
    const hist = new Float64Array(90);
    for (const e of edges)
      for (let j = 0; j + 1 < e.pts.length; j++) {
        const a = e.pts[j],
          c = e.pts[j + 1],
          L = Math.hypot(c[0] - a[0], c[1] - a[1]);
        let ang = (Math.atan2(c[1] - a[1], c[0] - a[0]) * 180) / Math.PI;
        ang = ((ang % 90) + 90) % 90;
        hist[Math.floor(ang) % 90] += L;
      }
    let ba = 0,
      bv = -1;
    for (let i = 0; i < 90; i++) {
      let v = 0;
      for (let k = -3; k <= 3; k++) v += hist[(i + k + 90) % 90];
      if (v > bv) {
        bv = v;
        ba = i;
      }
    }
    const th = (ba * Math.PI) / 180,
      cs = Math.cos(th),
      sn = Math.sin(th),
      cx0 = (PB.x0 + PB.x1) / 2,
      cy0 = (PB.y0 + PB.y1) / 2,
      BS = 560,
      HB = 230,
      TK = 74,
      M = 70;
    const inM = (x, y) => x > PB.x0 - M && x < PB.x1 + M && y > PB.y0 - M && y < PB.y1 + M,
      dPB = (x, y) => Math.hypot(Math.max(PB.x0 - x, 0, x - PB.x1), Math.max(PB.y0 - y, 0, y - PB.y1));
    const toXY = (u, v) => [cx0 + u * cs - v * sn, cy0 + u * sn + v * cs];
    const N = Math.ceil((Math.hypot(PB.x1 - PB.x0, PB.y1 - PB.y0) / 2 + 2200) / BS);
    for (let i = -N; i < N; i++)
      for (let j = -N; j < N; j++) {
        const uc = (i + 0.5) * BS,
          vc = (j + 0.5) * BS,
          [bx, by] = toXY(uc, vc);
        if (dPB(bx, by) > 1900) continue;
        const slabs = [
          [-HB, -HB, HB, -HB + TK, 0],
          [-HB, HB - TK, HB, HB, 0],
          [-HB, -HB + TK, -HB + TK, HB - TK, 1],
          [HB - TK, -HB + TK, HB, HB - TK, 1],
        ];
        for (const [u0, v0, u1, v1, ax] of slabs) {
          const parts = 1 + Math.floor(brnd() * 3),
            len = ax === 0 ? u1 - u0 : v1 - v0;
          let t0 = 0;
          for (let k = 0; k < parts; k++) {
            const t1 = k === parts - 1 ? len : t0 + (len / parts) * (0.7 + brnd() * 0.6);
            const a0 = ax === 0 ? [u0 + t0, v0] : [u0, v0 + t0],
              a1 = ax === 0 ? [u0 + t1, v1] : [u1, v0 + t1];
            t0 = t1;
            const ring = [
              [a0[0], a0[1]],
              [a1[0], a0[1]],
              [a1[0], a1[1]],
              [a0[0], a1[1]],
            ].map(p => toXY(uc + p[0], vc + p[1]));
            if (ring.some(p => inM(p[0], p[1]))) continue;
            const fl = 5 + Math.floor(brnd() * 5),
              h = GF + (fl - 1) * FLOOR,
              col = new THREE.Color(PAL[Math.floor(brnd() * PAL.length)]),
              st = brnd() < 0.55 ? 'balcony' : brnd() < 0.5 ? 'shutters' : 'louvers';
            const base = { col: col.clone().multiplyScalar(0.84), s2: brnd() < 0.55, s1: false };
            addWalls(ring, false, h, st, col, base, brnd() * 640, (mx, my, nx, ny) => ((mx - bx) * nx + (my - by) * ny > 100 ? 2 : 0));
            addRoof(ring, [], h, new THREE.Color(ROOFC[Math.floor(brnd() * ROOFC.length)]));
          }
        }
      }
  }
  const mk = (o, mat) => {
    if (!o.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
    if (o.u) g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  for (const k in WA) mk(WA[k], FAC_M[k]);
  mk(roofA, roofM);
  inst(new THREE.BoxGeometry(1, 1, 1), STD('#c9c4ba'), torr, true);
  inst(new THREE.CylinderGeometry(0.35, 0.35, 1, 4), STD('#9aa0a6', { metalness: 0.6, roughness: 0.4 }), tvp, false);
  inst(new THREE.BoxGeometry(1, 1, 1), STD('#9aa0a6', { metalness: 0.6, roughness: 0.4 }), tvx, false);
  const box = new THREE.BoxGeometry(1, 1, 1);
  inst(box, STD('#bfc4cc', { roughness: 0.6, metalness: 0.3 }), ac, true);
  inst(new THREE.CylinderGeometry(0.8, 1.2, 44, 6), STD('#9aa3ad', { metalness: 0.5 }), ant, false);
  inst(new THREE.SphereGeometry(2, 8, 6), antM, antL, false);
  inst(box, neonM, neon, false, true);
  // alberi: viali alberati lungo i corsi e alberi nei parchi
  const trunks = [],
    crowns = [],
    TC = ['#2e7d32', '#388e3c', '#43a047', '#2f6f3a'];
  const addTree = (x, y) => {
    const r = 11 + brnd() * 6;
    trunks.push([x, 8, y, 1, 1, 1]);
    crowns.push([x, 16 + r * 0.6, y, r, r * 0.95, r, 0, brnd() * 3, 0, TC[Math.floor(brnd() * 4)]]);
  };
  for (const e of edges) {
    if (!(e.cls === 'P' || e.cls === 'S' || (e.cls === 'T' && e.ow === 0))) continue;
    for (const sd of [1, -1]) {
      const line = offsetLine(e.pts, sd * (e.w / 2 + 12));
      let acc = 30;
      for (let j = 0; j + 1 < line.length; j++) {
        const ax = line[j][0],
          ay = line[j][1],
          bx = line[j + 1][0],
          by = line[j + 1][1],
          L = Math.hypot(bx - ax, by - ay);
        while (acc < L) {
          const t = acc / L,
            x = ax + (bx - ax) * t,
            y = ay + (by - ay) * t;
          acc += 55;
          const tt = tileAtPx(x, y);
          if (tt === BUILD || tt === ROAD || tt === OUT) continue;
          if (Math.hypot(x - e.a.x, y - e.a.y) < 50 || Math.hypot(x - e.b.x, y - e.b.y) < 50) continue;
          addTree(x, y);
        }
        acc -= L;
      }
    }
  }
  for (const a of areasD) {
    if (a.t !== 'g') continue;
    {
      let ax = 0,
        az = 0;
      for (const p of a.outer) {
        ax += p[0];
        az += p[1];
      }
      if (LMX.ownsTrees(ax / a.outer.length, az / a.outer.length)) continue;
    }
    const n = Math.min(60, Math.floor(polyArea(a.outer) / 9000));
    let minX = 1e9,
      minY = 1e9,
      maxX = -1e9,
      maxY = -1e9;
    for (const p of a.outer) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const x = minX + brnd() * (maxX - minX),
        y = minY + brnd() * (maxY - minY);
      if (tileAtPx(x, y) !== PARK) continue;
      addTree(x, y);
      i++;
    }
  }
  inst(new THREE.CylinderGeometry(2, 2.6, 16, 7), STD('#6d4c41'), trunks, true);
  inst(new THREE.IcosahedronGeometry(1, 1), STD('#ffffff'), crowns, true, true);
  // lampioni
  const posts = [],
    heads = [],
    decals = [];
  for (const e of edges) {
    if (e.cls === 'V') continue;
    let acc = 60,
      sd = 1;
    for (let j = 0; j + 1 < e.pts.length; j++) {
      const ax = e.pts[j][0],
        ay = e.pts[j][1],
        bx = e.pts[j + 1][0],
        by = e.pts[j + 1][1],
        L = Math.hypot(bx - ax, by - ay);
      if (L < 1) continue;
      const nx = -(by - ay) / L,
        ny = (bx - ax) / L;
      while (acc < L) {
        const t = acc / L,
          o = sd * (e.w / 2 + 5),
          x = ax + (bx - ax) * t + nx * o,
          y = ay + (by - ay) * t + ny * o;
        acc += 170;
        sd = -sd;
        const tt = tileAtPx(x, y);
        if (tt === BUILD || tt === OUT || Math.hypot(x - SPAWN.x, y - SPAWN.y) < 110) continue;
        posts.push([x, 22, y, 1, 1, 1]);
        heads.push([x, 44.5, y, 7, 2.4, 7]);
        decals.push([x, 0.9, y, 1, 1, 1]);
      }
      acc -= L;
    }
  }
  inst(new THREE.CylinderGeometry(1, 1.4, 44, 6), STD('#3f4652', { metalness: 0.5, roughness: 0.5 }), posts, true);
  inst(box, bulbM, heads, false);
  const lt = canvasTex(
    glowCanvas(64, [
      [0, 'rgba(255,205,140,0.9)'],
      [0.35, 'rgba(255,175,95,0.35)'],
      [1, 'rgba(255,160,80,0)'],
    ]),
  );
  lampDecalM = new THREE.MeshBasicMaterial({
    map: lt,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
    fog: false,
  });
  const ld = inst(new THREE.PlaneGeometry(170, 170).rotateX(-Math.PI / 2), lampDecalM, decals, false);
  if (ld) {
    ld.receiveShadow = false;
    ld.renderOrder = 1;
  }
  // semafori
  const tp = [],
    th = [],
    tl = [];
  for (const n of signals)
    for (const e of n.edges) {
      if (e.cls === 'V' || e.cls === 'X' || e.len < n.stop + 20) continue;
      if (!((e.b === n && e.ow !== -1) || (e.a === n && e.ow !== 1))) continue;
      const far = e.a === n ? e.pts[1] : e.pts[e.pts.length - 2];
      let dx = n.x - far[0],
        dy = n.y - far[1];
      const L = Math.hypot(dx, dy) || 1;
      dx /= L;
      dy /= L;
      const bx = n.x - dx * n.stop,
        by = n.y - dy * n.stop,
        o = e.w / 2 + 6,
        x = bx - dy * o,
        y = by + dx * o;
      if (tileAtPx(x, y) === BUILD) continue;
      tp.push([x, 13, y, 1, 1, 1]);
      th.push([x, 27, y, 4, 9, 4]);
      tl.push([x - dx * 2.3, 27, y - dy * 2.3, 1, 1, 1, 0, 0, 0, '#2ecc71']);
      tlAxis.push([n, Math.atan2(dy, dx)]);
    }
  inst(new THREE.CylinderGeometry(0.9, 0.9, 26, 6), STD('#2b2f36'), tp, true);
  inst(box, STD('#1b1e24'), th, true);
  tlLamps = inst(
    new THREE.SphereGeometry(1.9, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    tl,
    false,
    true,
  );
  // etichette dei luoghi
  const label = (text, x, y, h, col) => {
    const tx = labelTex(text, col),
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false, fog: false }));
    sp.scale.set((30 * tx.image.width) / 64, 30, 1);
    sp.position.set(x, h, y);
    scene.add(sp);
  };
  label('Santa Rita', CHURCH[0], CHURCH[1], 150, '#ffd166'); // le etichette dei landmark le mettono i moduli in src/landmarks/
}

export function init() {
  // ---------------- città 3D ----------------
  FLOOR = 15;
  GF = 20;
  // piano terra con negozi: 16 vetrine (2048x128 px = 640 x 20 unità)
  SHOPS = [
    ['BAR', '#7a1f24', '#ffffff'],
    ['TABACCHI', '#1d2a4f', '#ffffff', 'T'],
    ['FARMACIA', '#f4f4f0', '#1f8a3c', '+'],
    ['PANETTERIA', '#8a5a2b', '#fff3d6'],
    ['PIZZERIA', '#1f6b3a', '#ffffff'],
    ['ALIMENTARI', '#c9a227', '#2a1f0a'],
    ['CAFFÈ', '#3b2a20', '#f2d7a0'],
    ['PARRUCCHIERE', '#e6d6e8', '#5a2d6a'],
    ['FERRAMENTA', '#2e4f7a', '#ffffff'],
    ['GELATERIA', '#f7e3ef', '#b0306a'],
    ['EDICOLA', '#2b2b2b', '#ffd23f'],
    ['MACELLERIA', '#9b2226', '#ffffff'],
    ['FIORI', '#2f6b3f', '#ffffff'],
    ['OTTICA', '#f2f2f2', '#1d3557'],
    ['LAVANDERIA', '#3a86c8', '#ffffff'],
    ['TRATTORIA', '#5c3a21', '#f5e6c8'],
  ];
  FT = {
    balcony: makeRes('balcony'),
    shutters: makeRes('shutters'),
    louvers: makeRes('louvers'),
    shop: makeShops(),
    plain: makePlain(),
    church: makeChurch(),
    stadium: makeStadium(),
  };
  FAC_M = {};
  for (const k in FT)
    FAC_M[k] = new THREE.MeshStandardMaterial({
      map: FT[k][0],
      emissiveMap: FT[k][1],
      emissive: new THREE.Color(k === 'shop' ? '#ffffff' : '#fff0d8'),
      emissiveIntensity: 0,
      vertexColors: true,
      roughness: 0.85,
    });
  stuccoM = FAC_M.balcony;
  glassBM = FAC_M.shutters;
  roofM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  neonM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  bulbM = new THREE.MeshBasicMaterial({ color: 0x888888, toneMapped: false });
  antM = new THREE.MeshBasicMaterial({ color: 0x550000, toneMapped: false });
  tlLamps = null;
  tlAxis = [];
  // ---------------- landmark modellati a mano (src/landmarks/) ----------------
  envHooks = [];
  LMX = initLandmarks({
    THREE,
    scene,
    DATA,
    toW,
    fillPoly,
    grid,
    hgrid,
    BUILD,
    WATER,
    OUT,
    ROAD,
    PARK,
    tileAtPx,
    miniCv,
    MS,
    canvasTex,
    labelTex,
    nearestEdge,
    edges,
    envHooks,
  });
  buildCity();
}
