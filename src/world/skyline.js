// Orizzonte: Alpi, collina e Mole Antonelliana.
import { fogW, rain } from './weather.js';
import * as THREE from 'three';
import { camera, scene } from '../core/render.js';

export let skyline, skyM, moleM, moleDay;

export function updateSkyline(dk) {
  skyline.position.set(camera.position.x, 0, camera.position.z);
  skyM.color.setScalar(1 - 0.78 * dk);
  skyM.opacity = 0.92 * (1 - 0.7 * rain) * (1 - fogW);
  moleM.color.copy(moleDay).multiplyScalar(1 - 0.45 * dk);
  moleM.opacity = 0.95 * (1 - 0.6 * rain) * (1 - fogW);
  skyline.visible = fogW < 0.97;
}

export function init() {
  // ---------------- orizzonte: Alpi, collina e Mole ----------------
  skyline = new THREE.Group();
  scene.add(skyline);
  skyM = new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
  });
  moleM = new THREE.MeshBasicMaterial({ color: '#cdd5e4', fog: false, depthWrite: false, transparent: true, opacity: 0.95 });
  moleDay = new THREE.Color('#cdd5e4');
  {
    const pos = [],
      col = [],
      cMt = new THREE.Color('#6d82a6'),
      cSnow = new THREE.Color('#eef3fa'),
      cHill = new THREE.Color('#6f8a7a'),
      cBase = new THREE.Color('#9fb1c9');
    const arc = (R, a0, a1, N, hf, snow, c1) => {
      let prev = null;
      const tc = h => {
        const k = Math.min(1, Math.max(0, (h - snow + 160) / 320));
        return c1.clone().lerp(cSnow, k * k * (3 - 2 * k));
      };
      const quad = (px, pz, py0, py1, x, z, y0, y1, pc0, pc1, c0, cc1) => {
        pos.push(px, py0, pz, x, y0, z, x, y1, z, px, py0, pz, x, y1, z, px, py1, pz);
        for (const c of [pc0, c0, cc1, pc0, cc1, pc1]) col.push(c.r, c.g, c.b);
      };
      for (let i = 0; i <= N; i++) {
        const t = i / N,
          a = a0 + (a1 - a0) * t,
          h = hf(t),
          x = Math.cos(a) * R,
          z = Math.sin(a) * R,
          m = Math.max(0, h - 280),
          top = tc(h);
        if (prev) {
          const [px, pz, ph, pm, ptop] = prev;
          quad(px, pz, -300, pm, x, z, -300, m, cBase, c1, cBase, c1);
          quad(px, pz, pm, ph, x, z, m, h, c1, ptop, c1, top);
        }
        prev = [x, z, h, m, top];
      }
    };
    const alps = t => {
      let h = 560 + Math.sin(t * 23) * 120 + Math.sin(t * 57 + 1) * 80 + Math.sin(t * 131 + 2) * 45;
      for (const [c, k] of [
        [0.13, 1],
        [0.32, 0.55],
        [0.55, 0.7],
        [0.8, 0.6],
      ])
        h += Math.max(0, 1 - Math.abs(t - c) * 14) * 950 * k;
      return h;
    };
    arc(7000, Math.PI * 0.72, Math.PI * 1.72, 240, alps, 830, cMt);
    arc(
      6800,
      -Math.PI * 0.45,
      Math.PI * 0.08,
      100,
      t => 150 + Math.sin(t * 9) * 50 + Math.sin(t * 23) * 20 + Math.max(0, 1 - Math.abs(t - 0.3) * 8) * 90,
      9999,
      cHill,
    );
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, skyM);
    m.renderOrder = -10;
    skyline.add(m);
    const mole = new THREE.Group(),
      am = -0.6;
    const add = (geo, y) => {
      const mm = new THREE.Mesh(geo, moleM);
      mm.position.y = y;
      mm.renderOrder = -5;
      mole.add(mm);
    };
    add(new THREE.BoxGeometry(62, 150, 62), 75);
    add(new THREE.ConeGeometry(46, 120, 4).rotateY(Math.PI / 4), 210);
    add(new THREE.BoxGeometry(18, 34, 18), 287);
    add(new THREE.ConeGeometry(7, 170, 6), 389);
    mole.scale.setScalar(1.25);
    mole.position.set(Math.cos(am) * 5200, 0, Math.sin(am) * 5200);
    skyline.add(mole);
  }
}
