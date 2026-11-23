// Camera, time of day, lights and fog.
import { TIME } from '../config.js';
import * as THREE from 'three';
import { SKY, camera, scene } from '../core/render.js';
import { camMode, camYaw, clockT, gtime, player, setCamYaw, shake, state } from '../core/state.js';
import { angDiff } from '../core/util.js';
import { _v } from '../entities/spawn.js';
import { tramWinM } from '../entities/trams.js';
import { headDecalM } from './models.js';
import { FAC_M, bulbM, envHooks, lampDecalM, neonM } from '../world/city.js';
import { asphMat } from '../world/ground.js';
import { SUN_OFF, hemi, sun } from '../world/lights.js';
import { SPAWN, WORLD, heightAt } from '../world/map.js';
import { updateSkyline } from '../world/skyline.js';
import { horizon, updateSky } from '../world/sky.js';
import { asphBase, fogW, rain } from '../world/weather.js';

// state owned by this module: other modules read it and change it with the set…() functions
export let camOverride;
export function setCamOverride(v) {
  camOverride = v;
}

export let camPos, camLook, tPos, tLook, hour, sDay, sDusk, sMoon, hNight, hDay;

// used by tests and tools: {x,y,z,lx,ly,lz,fov}
export function updateCamera(dt, snap) {
  if (camOverride) {
    const o = camOverride;
    camera.position.set(o.x, o.y, o.z);
    camera.fov = o.fov || 55;
    camera.updateProjectionMatrix();
    camera.lookAt(o.lx, o.ly || 0, o.lz);
    sun.position.set(o.lx + SUN_OFF.x, SUN_OFF.y, o.lz + SUN_OFF.z);
    sun.target.position.set(o.lx, 0, o.lz);
    return;
  }
  if (state === 'title') {
    const a = gtime * 0.05;
    camPos.set(SPAWN.x + Math.cos(a) * 1050, 650, SPAWN.y + Math.sin(a) * 1050);
    camLook.set(SPAWN.x, 0, SPAWN.y);
    camera.fov = 55;
  } else {
    const car = player.car,
      tg = car || player,
      sp = car ? Math.hypot(car.vx, car.vy) : 0;
    const head = car ? car.a : player.a;
    setCamYaw(snap ? head : camYaw + angDiff(head, camYaw) * (1 - Math.exp(-dt * (car ? 3.2 : 5))));
    const fx = Math.cos(camYaw),
      fy = Math.sin(camYaw);
    if (camMode === 0) {
      const dist = car ? 84 + sp * 0.06 : 50,
        hgt = car ? 40 + sp * 0.02 : 26;
      let dd = dist;
      for (let s = 6; s <= dist; s += 6) {
        if (heightAt(tg.x - fx * s, tg.y - fy * s) > hgt * 0.6) {
          dd = Math.max(12, s - 8);
          break;
        }
      }
      tPos.set(tg.x - fx * dd, hgt + (dist - dd) * 0.55 + (car ? car.z * 0.7 : 0), tg.y - fy * dd);
      tLook.set(tg.x + fx * (car ? 34 : 22), car ? 9 + car.z : 13, tg.y + fy * (car ? 34 : 22));
      camera.fov = 62 + (car ? Math.min(sp / 480, 1) * 12 : 0) + (player.boosting ? 9 : 0);
    } else {
      const lx = car ? car.vx * 0.35 : 0,
        ly = car ? car.vy * 0.35 : 0;
      tPos.set(tg.x + lx, 620 + sp * 0.4, tg.y + ly + 170 + sp * 0.15);
      tLook.set(tg.x + lx, 0, tg.y + ly);
      camera.fov = 55;
    }
    if (snap) {
      camPos.copy(tPos);
      camLook.copy(tLook);
    } else {
      camPos.lerp(tPos, 1 - Math.exp(-dt * 10));
      camLook.lerp(tLook, 1 - Math.exp(-dt * 12));
    }
  }
  camera.updateProjectionMatrix();
  camera.position.copy(camPos);
  if (shake > 0.05)
    camera.position.add(_v.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
  camera.lookAt(camLook);
  sun.position.set(camLook.x + SUN_OFF.x, SUN_OFF.y, camLook.z + SUN_OFF.z);
  sun.target.position.set(camLook.x, 0, camLook.z);
}
export function darkness(h) {
  if (h >= 7 && h < 17.5) return 0;
  if (h >= 17.5 && h < 20.5) return (h - 17.5) / 3;
  if (h >= 20.5 || h < 5) return 1;
  return 1 - (h - 5) / 2;
}
export function sunsetTint(h) {
  if (h >= 16.5 && h < 20) return Math.sin(((h - 16.5) / 3.5) * Math.PI);
  if (h >= 5 && h < 7.5) return Math.sin(((h - 5) / 2.5) * Math.PI) * 0.7;
  return 0;
}
export function updateEnv() {
  const h = hour(),
    dk = darkness(h),
    tn = sunsetTint(h);
  // the fog takes the colour of the sky's horizon haze, so the city fades into the sky
  updateSky(dk, tn);
  SKY.copy(horizon);
  scene.background.copy(SKY);
  scene.fog.color.copy(SKY);
  sun.color
    .copy(sDay)
    .lerp(sDusk, tn * (1 - dk))
    .lerp(sMoon, dk);
  sun.intensity = 2.4 * (1 - dk) + 0.4 * dk;
  hemi.color.copy(hDay).lerp(hNight, dk);
  hemi.intensity = 1.0 * (1 - dk) + 0.55 * dk;
  sun.intensity *= (1 - 0.65 * rain) * (1 - 0.45 * fogW);
  scene.fog.near = Math.max(120, 1100 - 500 * rain - 900 * fogW);
  scene.fog.far = Math.max(750, 2800 - 1100 * rain - 2000 * fogW);
  if (asphMat) {
    asphMat.roughness = 0.9 - 0.6 * rain;
    asphMat.color.copy(asphBase).multiplyScalar(1 - 0.3 * rain);
  }
  updateSkyline(dk);
  for (const k in FAC_M) FAC_M[k].emissiveIntensity = k === 'shop' ? 0.06 + dk * 1.15 : 0.02 + dk * 0.9;
  tramWinM.emissiveIntensity = dk * 0.85;
  lampDecalM.opacity = dk * 0.85;
  headDecalM.opacity = dk * 0.85;
  bulbM.color.setScalar(0.22 + dk * 1.8);
  neonM.color.setScalar(0.6 + dk * 1.3);
  for (const f of envHooks) f(dk);
}

export function init() {
  // ---------------- camera and environment ----------------
  camPos = new THREE.Vector3(WORLD / 2 + 1100, 720, WORLD / 2);
  camLook = new THREE.Vector3(WORLD / 2, 0, WORLD / 2);
  tPos = new THREE.Vector3();
  tLook = new THREE.Vector3();
  camOverride = null;
  hour = () => (TIME.startHour + clockT / TIME.secondsPerHour) % 24;
  sDay = new THREE.Color('#fff6e8');
  sDusk = new THREE.Color('#ffae70');
  sMoon = new THREE.Color('#8fa8ff');
  hNight = new THREE.Color('#5566aa');
  hDay = new THREE.Color('#dbeeff');
}
