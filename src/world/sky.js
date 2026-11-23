// Sky dome: zenith-to-horizon gradient, sun (or moon) glow and the horizon haze that the distance fog blends into.
// Invented details (not from data): the colours are chosen by eye for the hazy Po valley sky (pale, milky horizon
// by day), and the warm glow low on the horizon at night stands for the light pollution of the city.
import * as THREE from 'three';
import { camera, scene } from '../core/render.js';
import { SUN_OFF } from './lights.js';
import { fogW, rain } from './weather.js';

export let skyDome, skyU, horizon, zenith;
let C;

// dk: darkness 0 (day) … 1 (night); tn: sunset/sunrise tint 0 … 1
export function updateSky(dk, tn) {
  const dusk = tn * (1 - dk);
  zenith
    .copy(C.zDay)
    .lerp(C.zDusk, dusk * 0.7)
    .lerp(C.zNight, dk);
  horizon
    .copy(C.hDay)
    .lerp(C.hDusk, dusk * 0.85)
    .lerp(C.hNight, dk);
  if (rain > 0.01) {
    const k = rain * (1 - dk * 0.5);
    zenith.lerp(C.zRain, k * 0.8);
    horizon.lerp(C.hRain, k * 0.7);
  }
  if (fogW > 0.01) {
    const k = fogW * (1 - dk * 0.7);
    zenith.lerp(C.fog, k * 0.85);
    horizon.lerp(C.fog, k * 0.9);
  }
  skyU.zenith.value.copy(zenith);
  skyU.horizon.value.copy(horizon);
  skyU.sunCol.value.copy(C.sun).lerp(C.sunDusk, dusk).lerp(C.moon, dk);
  const clear = (1 - rain) * (1 - fogW);
  skyU.glow.value = clear * (0.55 * (1 - dk) + 0.12 * dk);
  skyU.disc.value = clear * (1 - dk * 0.6);
  skyDome.position.copy(camera.position);
}

export function init() {
  // ---------------- sky dome ----------------
  C = {
    zDay: new THREE.Color('#4f8fd8'),
    hDay: new THREE.Color('#c6dcec'),
    zDusk: new THREE.Color('#4d5d92'),
    hDusk: new THREE.Color('#ff9f6e'),
    zNight: new THREE.Color('#03071a'),
    hNight: new THREE.Color('#1d1d3c'),
    zRain: new THREE.Color('#646f7c'),
    hRain: new THREE.Color('#8c96a1'),
    fog: new THREE.Color('#c3c7cb'),
    sun: new THREE.Color('#fff1d6'),
    sunDusk: new THREE.Color('#ffb070'),
    moon: new THREE.Color('#b8c6ff'),
  };
  zenith = C.zDay.clone();
  horizon = C.hDay.clone();
  skyU = {
    zenith: { value: zenith.clone() },
    horizon: { value: horizon.clone() },
    sunDir: { value: SUN_OFF.clone().normalize() },
    sunCol: { value: C.sun.clone() },
    glow: { value: 0.55 },
    disc: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: skyU,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith, horizon, sunCol, sunDir;
      uniform float glow, disc;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        // milky haze band just above the horizon, deep colour towards the zenith
        vec3 c = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.5));
        // below the horizon (past the edge of the map): the haze, slightly darker
        c = mix(c, horizon * 0.92, smoothstep(0.0, -0.06, h));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (glow * (0.3 * pow(s, 10.0) + 0.5 * pow(s, 160.0)) + disc * smoothstep(0.9993, 0.9996, s));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  // inside the camera far plane (9000), outside the Alps (7000)
  skyDome = new THREE.Mesh(new THREE.SphereGeometry(8600, 32, 16), mat);
  skyDome.renderOrder = -100;
  skyDome.frustumCulled = false;
  scene.add(skyDome);
}
