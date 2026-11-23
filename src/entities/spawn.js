// Comparsa e rimozione di auto, pedoni e volanti attorno al giocatore.
import { TRAFFICO } from '../config.js';
import * as THREE from 'three';
import { camera } from '../core/render.js';
import { cars, peds, player, state, wanted } from '../core/state.js';
import { COPS_BY, makeCop } from './police.js';
import { spawnPed, spawnTrafficCar } from './traffic.js';

export let TRAFFIC_N, PED_N, spawnT, _v;

export function onScreen(x, y, m) {
  const dx = x - camera.position.x,
    dz = y - camera.position.z;
  if (dx * dx + dz * dz > 2700 * 2700) return false;
  _v.set(x, 8, y).project(camera);
  if (_v.z > 1 || _v.z < -1) return false;
  const k = 1 + m / 300;
  return Math.abs(_v.x) < k && Math.abs(_v.y) < k * 1.2;
}
export function populate(fx, fy) {
  for (let i = 0; i < TRAFFIC_N; i++) spawnTrafficCar(fx, fy, 60, 1500, true);
  for (let i = 0; i < PED_N; i++) spawnPed(fx, fy, 30, 1100, true);
}
export function manageSpawns(dt, fx, fy) {
  spawnT -= dt;
  if (spawnT > 0) return;
  spawnT = 0.2;
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i];
    if (c === player.car) continue;
    const d = Math.hypot(c.x - fx, c.y - fy),
      vis = onScreen(c.x, c.y, 80);
    let kill;
    if (c.keep) kill = d > 2600 && !vis;
    else if (c.driver === 'npc' || c.driver === 'cop') kill = (d > 1800 && !vis) || (c.lost && !vis && d > 500);
    else kill = d > 1200 && !vis;
    if (kill) cars.splice(i, 1);
  }
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    if (!p.keep && Math.hypot(p.x - fx, p.y - fy) > 1300 && !onScreen(p.x, p.y, 40)) peds.splice(i, 1);
  }
  let tr = 0,
    cops = 0;
  for (const c of cars) {
    if (c.driver === 'npc') tr++;
    else if (c.driver === 'cop') cops++;
  }
  if (tr < TRAFFIC_N) spawnTrafficCar(fx, fy, 500, 1500, false);
  if (peds.length < PED_N) spawnPed(fx, fy, 350, 1100, false);
  const want = state === 'play' ? COPS_BY[wanted.level] : 0;
  if (cops < want) {
    let best = null,
      bd = 800;
    for (const c of cars)
      if (c.type === 'polizia' && c.driver === 'npc' && !c.wreck) {
        const d = Math.hypot(c.x - fx, c.y - fy);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
    if (best) makeCop(best);
    else {
      const c = spawnTrafficCar(fx, fy, 600, 1250, false, 'polizia');
      if (c) makeCop(c);
    }
  }
}

export function init() {
  // ---------------- spawn ----------------
  TRAFFIC_N = TRAFFICO.auto;
  PED_N = TRAFFICO.pedoni;
  spawnT = 0;
  _v = new THREE.Vector3();
}
