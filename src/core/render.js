// Renderer Three.js, scena, telecamera e ridimensionamento della finestra.
import * as THREE from 'three';

export let glc, hud, ctx, W, H, DPR, renderer, scene, SKY, camera;

export function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  hud.width = Math.round(W * DPR);
  hud.height = Math.round(H * DPR);
}

export function init() {
  glc = document.getElementById('gl');
  hud = document.getElementById('hud');
  ctx = hud.getContext('2d');
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = 1;
  renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  SKY = new THREE.Color('#9fd0ff');
  scene.background = SKY.clone();
  scene.fog = new THREE.Fog(SKY.clone(), 1100, 2800);
  camera = new THREE.PerspectiveCamera(62, 1, 2, 9000);
  window.addEventListener('resize', resize);
  resize();
}
