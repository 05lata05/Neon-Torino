// Police helicopter with its searchlight.
import { t } from '../i18n/index.js';
import * as THREE from 'three';
import { scene } from '../core/render.js';
import { bustT, gtime, player, state, wanted } from '../core/state.js';
import { angDiff, boxAt, mergeGeo } from '../core/util.js';
import { garageIcon, garageMesh } from '../gameplay/garage.js';
import { tokens } from '../gameplay/tokens.js';
import { darkness, hour } from '../render/camera.js';
import { carGlassM, sm } from '../render/models.js';
import { antM } from '../world/city.js';
import { puffTex, toast } from '../world/effects.js';

export let heli, UP, hv1, hv2, spotM, beamConeM, heliGeo;

export function spawnHeli() {
  heli = {
    x: player.x + 800,
    y: player.y - 600,
    vx: 0,
    vy: 0,
    alt: 270,
    sx: player.x,
    sy: player.y,
    leaving: false,
    t: 0,
    yaw: 0,
    sees: false,
  };
  const g = new THREE.Group(),
    navy = sm('#1e2a4a'),
    white = sm('#f5f6fa'),
    dark = sm('#222222');
  const add = (geo, mat, cast) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    g.add(m);
    return m;
  };
  add(heliGeo.body, navy, true);
  add(heliGeo.nose, carGlassM);
  add(heliGeo.belly, white);
  add(heliGeo.boom, navy, true);
  add(heliGeo.fin, navy);
  add(heliGeo.skid, dark);
  const rotor = add(heliGeo.rotor, dark, true);
  rotor.position.y = 9;
  const tail = add(heliGeo.tail, dark);
  tail.position.set(-49, 8, 2.5);
  const bl = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), antM);
  bl.position.set(-52, 12, 0);
  g.add(bl);
  scene.add(g);
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(190, 190).rotateX(-Math.PI / 2), spotM);
  spot.renderOrder = 3;
  scene.add(spot);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 70, 1, 24, 1, true), beamConeM);
  scene.add(cone);
  heli.g = g;
  heli.rotor = rotor;
  heli.tailR = tail;
  heli.spot = spot;
  heli.cone = cone;
  toast(t('police.heli'));
}
export function removeHeli() {
  scene.remove(heli.g);
  scene.remove(heli.spot);
  scene.remove(heli.cone);
  heli = null;
}
export function updateHeli(dt) {
  if (state !== 'play') return;
  if (!heli && wanted.level >= 3 && bustT <= 0) spawnHeli();
  if (!heli) return;
  heli.t += dt;
  if ((wanted.level < 3 || bustT > 0) && !heli.leaving) {
    heli.leaving = true;
    heli.leaveT = 0;
    const dx = heli.x - player.x,
      dy = heli.y - player.y,
      d = Math.hypot(dx, dy) || 1;
    heli.ex = heli.x + (dx / d) * 3000;
    heli.ey = heli.y + (dy / d) * 3000;
  }
  let tx, ty;
  if (heli.leaving) {
    heli.leaveT += dt;
    tx = heli.ex;
    ty = heli.ey;
    if (heli.leaveT > 9) {
      removeHeli();
      return;
    }
  } else if (wanted.lost < 2) {
    tx = player.x + (player.car ? player.car.vx * 0.8 : 0);
    ty = player.y + (player.car ? player.car.vy * 0.8 : 0);
  } else {
    tx = wanted.lastX + Math.cos(heli.t * 0.5) * 200;
    ty = wanted.lastY + Math.sin(heli.t * 0.5) * 200;
  }
  const dx = tx - heli.x,
    dy = ty - heli.y,
    d = Math.hypot(dx, dy) || 1,
    want = Math.min(heli.leaving ? 340 : 300, d * 1.1);
  heli.vx += ((dx / d) * want - heli.vx) * Math.min(1, dt * 1.2);
  heli.vy += ((dy / d) * want - heli.vy) * Math.min(1, dt * 1.2);
  heli.x += heli.vx * dt;
  heli.y += heli.vy * dt;
  const pd = Math.hypot(player.x - heli.x, player.y - heli.y);
  let ax = heli.x + Math.cos(heli.t * 0.9) * 90,
    ay = heli.y + Math.sin(heli.t * 1.3) * 90;
  if (!heli.leaving && pd < 420) {
    ax = player.x;
    ay = player.y;
  }
  heli.sx += (ax - heli.sx) * Math.min(1, dt * 1.8);
  heli.sy += (ay - heli.sy) * Math.min(1, dt * 1.8);
  heli.sees = !heli.leaving && Math.hypot(player.x - heli.sx, player.y - heli.sy) < 80;
}
export function syncExtras(dt) {
  for (const t of tokens)
    if (t.mesh && !t.got) {
      t.coin.rotation.y = gtime * 2.6 + t.id;
      t.mesh.position.y = 12 + Math.sin(gtime * 2 + t.id) * 2.5;
    }
  garageMesh.visible = state !== 'title';
  garageIcon.position.y = 36 + Math.sin(gtime * 3) * 3;
  if (heli) {
    const h = heli,
      sp = Math.hypot(h.vx, h.vy);
    if (sp > 20) h.yaw += angDiff(Math.atan2(h.vy, h.vx), h.yaw) * Math.min(1, dt * 2);
    h.g.position.set(h.x, h.alt + Math.sin(h.t * 1.5) * 4, h.y);
    h.g.rotation.set(0, -h.yaw, -Math.min(0.28, sp / 1100));
    h.rotor.rotation.y += dt * 28;
    h.tailR.rotation.z += dt * 40;
    h.spot.position.set(h.sx, 1.3, h.sy);
    hv1.set(h.x, h.alt - 8, h.y);
    hv2.set(h.sx, 0, h.sy);
    h.cone.position.copy(hv1).add(hv2).multiplyScalar(0.5);
    const dir = hv1.sub(hv2),
      len = dir.length();
    h.cone.scale.set(1, len, 1);
    h.cone.quaternion.setFromUnitVectors(UP, dir.normalize());
    const dk = darkness(hour());
    spotM.opacity = 0.3 + dk * 0.5;
    beamConeM.opacity = 0.03 + dk * 0.1;
  }
}

export function init() {
  // ---------------- police helicopter ----------------
  heli = null;
  UP = new THREE.Vector3(0, 1, 0);
  hv1 = new THREE.Vector3();
  hv2 = new THREE.Vector3();
  spotM = new THREE.MeshBasicMaterial({
    map: puffTex,
    color: '#fff6cc',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.6,
  });
  beamConeM = new THREE.MeshBasicMaterial({
    color: '#fff6cc',
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  heliGeo = {
    body: boxAt(34, 13, 16, 0, 0, 0),
    nose: boxAt(12, 9, 14, 16, 0.5, 0),
    belly: boxAt(34.4, 3, 16.4, 0, -4, 0),
    boom: boxAt(34, 4, 4, -33, 2, 0),
    fin: boxAt(7, 11, 1.5, -49, 7, 0),
    skid: mergeGeo([
      boxAt(36, 1.4, 1.4, 0, -11, -8),
      boxAt(36, 1.4, 1.4, 0, -11, 8),
      boxAt(1.2, 5, 1.2, 8, -8.5, -8),
      boxAt(1.2, 5, 1.2, -8, -8.5, -8),
      boxAt(1.2, 5, 1.2, 8, -8.5, 8),
      boxAt(1.2, 5, 1.2, -8, -8.5, 8),
    ]),
    rotor: mergeGeo([boxAt(130, 0.6, 5, 0, 0, 0), boxAt(5, 0.6, 130, 0, 0, 0)]),
    tail: boxAt(1, 16, 2.4, 0, 0, 0),
  };
}
