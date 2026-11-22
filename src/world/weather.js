// Meteo: pioggia e nebbia.
import * as THREE from 'three';
import { G } from '../core/game.js';
import { camera, scene } from '../core/render.js';
import { rand } from '../core/util.js';
import { toast } from './effects.js';

export let weatherT, cRain, cFogW, asphBase, RN, rainPos, rainGeo, rainM, rainL;

export function updateWeather(dt) {
  weatherT -= dt;
  if (weatherT <= 0) {
    weatherT = rand(80, 180);
    const wr = G.rainTarget,
      wf = G.fogTarget,
      r = Math.random();
    G.rainTarget = r < 0.3 ? 1 : 0;
    G.fogTarget = r >= 0.3 && r < 0.5 ? 1 : 0;
    if (G.state === 'play') {
      if (G.rainTarget && !wr) toast('Inizia a piovere: strade scivolose!', 2.5);
      else if (G.fogTarget && !wf) toast('Scende la nebbia: visibilità ridotta', 2.5);
      else if (!G.rainTarget && !G.fogTarget && (wr || wf)) toast(wr ? 'Smette di piovere.' : 'La nebbia si dirada.', 2.5);
    }
  }
  G.rain += (G.rainTarget - G.rain) * Math.min(1, dt * 0.12);
  G.fogW += (G.fogTarget - G.fogW) * Math.min(1, dt * 0.1);
}
export function updateRain(dt) {
  rainL.visible = G.rain > 0.03;
  if (!rainL.visible) return;
  rainM.opacity = 0.55 * G.rain;
  rainL.position.set(camera.position.x, 0, camera.position.z);
  const f = 520 * dt;
  for (let i = 0; i < RN; i++) {
    const k = i * 6;
    let y = rainPos[k + 1] - f;
    if (y < 0) y += 420;
    rainPos[k + 1] = y;
    rainPos[k + 4] = y - 9;
  }
  rainGeo.attributes.position.needsUpdate = true;
}

export function init() {
  // ---------------- meteo: pioggia ----------------
  G.rain = 0;
  G.rainTarget = 0;
  weatherT = 75;
  G.rainA = null;
  G.fogW = 0;
  G.fogTarget = 0;
  cRain = new THREE.Color('#7f8a96');
  cFogW = new THREE.Color('#c3c7cb');
  asphBase = new THREE.Color('#3b3e44');
  RN = 2200;
  rainPos = new Float32Array(RN * 6);
  rainGeo = new THREE.BufferGeometry();
  for (let i = 0; i < RN; i++) {
    const x = rand(-500, 500),
      y = rand(0, 420),
      z = rand(-500, 500);
    rainPos.set([x, y, z, x + 1, y - 9, z], i * 6);
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainM = new THREE.LineBasicMaterial({ color: '#b8c8e0', transparent: true, opacity: 0, depthWrite: false });
  rainL = new THREE.LineSegments(rainGeo, rainM);
  rainL.frustumCulled = false;
  rainL.visible = false;
  scene.add(rainL);
}
