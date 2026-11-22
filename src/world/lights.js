// Luce del cielo e del sole con le ombre.
import * as THREE from 'three';
import { scene } from '../core/render.js';

export let hemi, sun, sc, SUN_OFF;

export function init() {
  // ---------------- luci ----------------
  hemi = new THREE.HemisphereLight(0xdbeeff, 0x6a6a5a, 1.0);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sc = sun.shadow.camera;
  sc.left = -700;
  sc.right = 700;
  sc.top = 700;
  sc.bottom = -700;
  sc.near = 10;
  sc.far = 3200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1.2;
  scene.add(sun);
  scene.add(sun.target);
  SUN_OFF = new THREE.Vector3(-0.55, 1, -0.38).normalize().multiplyScalar(1400);
}
