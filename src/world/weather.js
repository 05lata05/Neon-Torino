// Meteo: pioggia e nebbia.
import { WEATHER } from '../config.js';
import { state } from '../core/state.js';
import * as THREE from 'three';
import { camera, scene } from '../core/render.js';
import { rand } from '../core/util.js';
import { toast } from './effects.js';

// stato di proprietà di questo modulo: gli altri moduli lo leggono e lo cambiano con le funzioni set…()
export let fogTarget, fogW, rain, rainA, rainTarget;
export function setFogTarget(v) {
  fogTarget = v;
}
export function setFogW(v) {
  fogW = v;
}
export function setRain(v) {
  rain = v;
}
export function setRainA(v) {
  rainA = v;
}
export function setRainTarget(v) {
  rainTarget = v;
}

export let weatherT, cRain, cFogW, asphBase, RN, rainPos, rainGeo, rainM, rainL;

export function updateWeather(dt) {
  weatherT -= dt;
  if (weatherT <= 0) {
    weatherT = rand(WEATHER.intervalMin, WEATHER.intervalMax);
    const wr = rainTarget,
      wf = fogTarget,
      r = Math.random();
    rainTarget = r < 0.3 ? 1 : 0;
    fogTarget = r >= 0.3 && r < 0.5 ? 1 : 0;
    if (state === 'play') {
      if (rainTarget && !wr) toast('Inizia a piovere: strade scivolose!', 2.5);
      else if (fogTarget && !wf) toast('Scende la nebbia: visibilità ridotta', 2.5);
      else if (!rainTarget && !fogTarget && (wr || wf)) toast(wr ? 'Smette di piovere.' : 'La nebbia si dirada.', 2.5);
    }
  }
  rain += (rainTarget - rain) * Math.min(1, dt * 0.12);
  fogW += (fogTarget - fogW) * Math.min(1, dt * 0.1);
}
export function updateRain(dt) {
  rainL.visible = rain > 0.03;
  if (!rainL.visible) return;
  rainM.opacity = 0.55 * rain;
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
  rain = 0;
  rainTarget = 0;
  weatherT = WEATHER.firstChange;
  rainA = null;
  fogW = 0;
  fogTarget = 0;
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
