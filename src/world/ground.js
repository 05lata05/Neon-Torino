// Suolo, aree verdi e acqua, asfalto e segnaletica, minimappa, segni delle frenate.
import * as THREE from 'three';
import { scene } from '../core/render.js';
import { TAU, canvasTex, mergeGeo, shapeOf, tmpO } from '../core/util.js';
import { PB, WX, WY, areasD, buildingsD, roads, signals } from './map.js';

export let asphMat, AREA_COL, MS, miniCv, SKN, skidI, skidCount, skidMesh;

export function ribbon(arr, pts, w, y, discs) {
  const r = w / 2;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = pts[i][0],
      ay = pts[i][1],
      bx = pts[i + 1][0],
      by = pts[i + 1][1],
      dx = bx - ax,
      dy = by - ay,
      L = Math.hypot(dx, dy);
    if (L < 0.01) continue;
    const nx = (-dy / L) * r,
      ny = (dx / L) * r;
    arr.push(ax + nx, y, ay + ny, bx + nx, y, by + ny, bx - nx, y, by - ny, ax + nx, y, ay + ny, bx - nx, y, by - ny, ax - nx, y, ay - ny);
  }
  if (discs)
    for (const p of pts) {
      const N = 10;
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * TAU,
          a1 = ((k + 1) / N) * TAU;
        arr.push(p[0], y, p[1], p[0] + Math.cos(a1) * r, y, p[1] + Math.sin(a1) * r, p[0] + Math.cos(a0) * r, y, p[1] + Math.sin(a0) * r);
      }
    }
}
export function flatMesh(arr, color, rough) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const n = new Float32Array(arr.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: rough ?? 0.95 }));
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
export function addSkid(x0, y0, x1, y1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    L = Math.hypot(dx, dy);
  if (L < 0.5 || L > 60) return;
  tmpO.position.set((x0 + x1) / 2, 0.34, (y0 + y1) / 2);
  tmpO.rotation.set(0, -Math.atan2(dy, dx), 0);
  tmpO.scale.set(L + 1, 1, 3);
  tmpO.updateMatrix();
  skidMesh.setMatrixAt(skidI, tmpO.matrix);
  skidI = (skidI + 1) % SKN;
  skidCount = Math.min(SKN, skidCount + 1);
  skidMesh.count = skidCount;
  skidMesh.instanceMatrix.needsUpdate = true;
}
export function markSkid() {}
export function refreshChunks() {}

export function init() {
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#c6bead';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = canvasTex(c, true);
    tex.repeat.set((WX + 8000) / 320, (WY + 8000) / 320);
    const gm = new THREE.Mesh(
      new THREE.PlaneGeometry(WX + 8000, WY + 8000).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
    );
    gm.position.set(WX / 2, 0, WY / 2);
    gm.receiveShadow = true;
    scene.add(gm);
    const om = new THREE.MeshStandardMaterial({ color: '#5d5f63', roughness: 1 });
    const big = 12000;
    for (const [x0, y0, x1, y1] of [
      [-big, -big, WX + big, PB.y0],
      [-big, PB.y1, WX + big, WY + big],
      [-big, PB.y0, PB.x0, PB.y1],
      [PB.x1, PB.y0, WX + big, PB.y1],
    ]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0).rotateX(-Math.PI / 2), om);
      m.position.set((x0 + x1) / 2, 0.4, (y0 + y1) / 2);
      m.receiveShadow = true;
      scene.add(m);
    }
  }
  asphMat = null;
  AREA_COL = { g: '#5fa35a', p: '#3f8f45', w: '#3b8fd0', k: '#8d8f94', r: '#9b8f7f' };
  {
    const groups = {};
    for (const a of areasD) {
      try {
        const g = new THREE.ShapeGeometry(shapeOf(a.outer, a.holes))
          .rotateX(-Math.PI / 2)
          .translate(0, a.t === 'p' ? 0.1 : a.t === 'k' ? 0.06 : 0.08, 0);
        (groups[a.t] = groups[a.t] || []).push(g);
      } catch (e) {}
    }
    for (const t in groups) {
      const m = new THREE.Mesh(mergeGeo(groups[t]), new THREE.MeshStandardMaterial({ color: AREA_COL[t], roughness: t === 'w' ? 0.2 : 1 }));
      m.receiveShadow = true;
      scene.add(m);
    }
  }
  {
    const side = [],
      asph = [],
      ped = [],
      mark = [];
    for (const r of roads) {
      if (r.cls === 'X') {
        ribbon(ped, r.pts, r.w, 0.18, true);
        continue;
      }
      if (r.cls !== 'V') ribbon(side, r.pts, r.w + 30, 0.12, true);
      ribbon(asph, r.pts, r.w, 0.24, true);
      if ((r.cls === 'P' || r.cls === 'S' || r.cls === 'T') && r.ow === 0 && r.w >= 42) {
        let acc = -60;
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const ax = r.pts[i][0],
            ay = r.pts[i][1],
            bx = r.pts[i + 1][0],
            by = r.pts[i + 1][1],
            L = Math.hypot(bx - ax, by - ay);
          if (L < 1) continue;
          const ux = (bx - ax) / L,
            uy = (by - ay) / L;
          let s = Math.max(0, acc < 0 ? -acc : 0);
          for (; s + 30 < L - 40; s += 60) {
            if (i === 0 && s < 40) continue;
            const x0 = ax + ux * s,
              y0 = ay + uy * s,
              x1 = x0 + ux * 30,
              y1 = y0 + uy * 30;
            ribbon(
              mark,
              [
                [x0, y0],
                [x1, y1],
              ],
              2.6,
              0.32,
              false,
            );
          }
          acc = 0;
        }
      }
    }
    for (const n of signals)
      for (const e of n.edges) {
        if (e.cls === 'V' || e.cls === 'X') continue;
        const far = e.a === n ? e.pts[1] : e.pts[e.pts.length - 2];
        let dx = far[0] - n.x,
          dy = far[1] - n.y;
        const L = Math.hypot(dx, dy);
        if (L < n.stop + 10) continue;
        dx /= L;
        dy /= L;
        const cx = n.x + dx * (n.stop - 6),
          cy = n.y + dy * (n.stop - 6),
          hw = e.w / 2 - 3;
        for (let k = -hw; k <= hw; k += 9) {
          const ox = -dy * k,
            oy = dx * k;
          ribbon(
            mark,
            [
              [cx + ox - dx * 6, cy + oy - dy * 6],
              [cx + ox + dx * 6, cy + oy + dy * 6],
            ],
            4.5,
            0.33,
            false,
          );
        }
      }
    flatMesh(side, '#b8b6b0');
    asphMat = flatMesh(asph, '#3b3e44', 0.9).material;
    flatMesh(ped, '#cdbf9c');
    const mm = flatMesh(mark, '#f2f2f2');
    mm.material.roughness = 0.6;
  }
  MS = 0.08;
  miniCv = document.createElement('canvas');
  miniCv.width = Math.ceil(WX * MS);
  miniCv.height = Math.ceil(WY * MS);
  {
    const g = miniCv.getContext('2d');
    g.fillStyle = '#2b313b';
    g.fillRect(0, 0, miniCv.width, miniCv.height);
    g.fillStyle = '#3e4553';
    g.fillRect(PB.x0 * MS, PB.y0 * MS, (PB.x1 - PB.x0) * MS, (PB.y1 - PB.y0) * MS);
    const path = r => {
      g.moveTo(r[0][0] * MS, r[0][1] * MS);
      for (const p of r) g.lineTo(p[0] * MS, p[1] * MS);
      g.closePath();
    };
    for (const a of areasD) {
      g.fillStyle = { g: '#2f7a3c', p: '#2a6b35', w: '#2b6ca8', k: '#555b66', r: '#5b5348' }[a.t];
      g.beginPath();
      path(a.outer);
      for (const h of a.holes) path(h);
      g.fill('evenodd');
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of roads) {
      g.strokeStyle = r.cls === 'X' ? '#b8ab8a' : r.cls === 'P' ? '#ffffff' : '#d9dde3';
      g.lineWidth = Math.max(1.3, r.w * MS);
      g.beginPath();
      g.moveTo(r.pts[0][0] * MS, r.pts[0][1] * MS);
      for (const p of r.pts) g.lineTo(p[0] * MS, p[1] * MS);
      g.stroke();
    }
    g.fillStyle = '#22272f';
    for (const b of buildingsD) {
      g.beginPath();
      path(b.outer);
      for (const h of b.holes) path(h);
      g.fill('evenodd');
    }
  }
  SKN = 1200;
  skidI = 0;
  skidCount = 0;
  skidMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.35, depthWrite: false }),
    SKN,
  );
  skidMesh.count = 0;
  skidMesh.renderOrder = 1;
  skidMesh.frustumCulled = false;
  scene.add(skidMesh);
}
