// Every frame, syncs the 3D meshes with the simulation state.
import { scene } from '../core/render.js';
import { cars, frameN, gtime, mission, offers, parts, peds, player, setFrameN, state } from '../core/state.js';
import { clamp, tmpC } from '../core/util.js';
import { syncExtras } from '../entities/heli.js';
import { MT } from '../gameplay/missions.js';
import {
  brakeM,
  buildCarMesh,
  buildOfferMesh,
  buildPedMesh,
  charM,
  glowB,
  glowR,
  nextRing,
  sirB,
  sirR,
  tailM,
  tgt,
  tgtArrow,
  tgtBeam,
  tgtRing,
} from './models.js';
import { LMX, antM, tlAxis, tlLamps } from '../world/city.js';
import { sigGreen } from '../world/map.js';
import { updateRain } from '../world/weather.js';

export let meshCars, meshPeds, meshOffers, lastLights;

export function syncScene(dt) {
  setFrameN(frameN + 1);
  const on = Math.floor(gtime * 8) % 2 === 0;
  for (const c of cars) {
    c._f = frameN;
    if (!c.mesh) {
      buildCarMesh(c);
      meshCars.push(c);
    }
    c.mesh.position.set(c.x, c.z || 0, c.y);
    c.mesh.rotation.y = -c.a;
    c.m.inner.rotation.x = c.wreck ? 0 : c.tilt;
    c.m.inner.rotation.z = c.wreck ? 0 : c.pitch;
    c.m.tails.material = c.brake ? brakeM : tailM;
    if (c.m.red) {
      c.m.red.material = sirR[c.siren && on ? 1 : 0];
      c.m.blue.material = sirB[c.siren && !on ? 1 : 0];
      c.m.glow.visible = c.siren;
      c.m.glow.material = on ? glowR : glowB;
    }
    if (c.wreck && !c.m.wreckDone) {
      c.m.wreckDone = true;
      c.m.body.material = charM;
      c.m.roof.material = charM;
      c.m.cabin.material = charM;
      c.m.heads.material = charM;
    }
    c.m.hd.visible = !c.wreck && !!c.driver && c.driver !== 'idle';
  }
  meshCars = meshCars.filter(c => {
    if (c._f !== frameN) {
      scene.remove(c.mesh);
      return false;
    }
    return true;
  });
  const all = state !== 'title' ? peds.concat([player]) : peds;
  for (const p of peds) {
    p._f = frameN;
    if (!p.m) {
      buildPedMesh(p);
      meshPeds.push(p);
    }
  }
  meshPeds = meshPeds.filter(p => {
    if (p._f !== frameN) {
      scene.remove(p.m.g);
      return false;
    }
    return true;
  });
  player.m.g.visible = state !== 'title' && !player.car;
  for (const p of all) {
    const m = p.m;
    if (!m) continue;
    m.g.position.set(p.x, 0, p.y);
    m.g.rotation.y = -p.a;
    const down = p.down > 0 || (p === player && p.stun > 0);
    if (down) {
      m.b.rotation.z = Math.PI / 2;
      m.b.position.y = 2;
    } else {
      m.b.rotation.z = 0;
      m.b.position.y = 0;
    }
    const s = p.moving && !down ? Math.sin(p.t * 11) * 0.7 : 0;
    m.legs[0].rotation.z = s;
    m.legs[1].rotation.z = -s;
    m.arms[0].rotation.z = -s * 0.8;
    m.arms[1].rotation.z = s * 0.8;
    m.arms[1].rotation.x = p.wait ? -2.6 + Math.sin(gtime * 9) * 0.4 : 0;
  }
  for (const o of offers) {
    o._f = frameN;
    if (!o.mesh) {
      buildOfferMesh(o);
      meshOffers.push(o);
    }
    o.mesh.visible = !mission && state !== 'title';
    o.icon.position.y = 34 + Math.sin(gtime * 3) * 3;
  }
  meshOffers = meshOffers.filter(o => {
    if (o._f !== frameN) {
      scene.remove(o.mesh);
      return false;
    }
    return true;
  });
  if (mission && mission.type !== 'heist' && state !== 'title') {
    const s = mission.steps[mission.idx],
      col = MT[mission.type].col;
    tgt.visible = true;
    tgt.position.set(s.x, 0, s.y);
    tgtBeam.material.color.set(col);
    tgtRing.material.color.set(col);
    tgtArrow.material.color.set(col);
    tgtArrow.position.y = 42 + Math.abs(Math.sin(gtime * 3)) * 10;
    tgtArrow.rotation.y = gtime * 2;
    const n = mission.steps[mission.idx + 1];
    nextRing.visible = mission.type === 'race' && !!n;
    if (n) nextRing.position.set(n.x, 1, n.y);
  } else {
    tgt.visible = false;
    nextRing.visible = false;
  }
  for (const p of parts) {
    p.s.position.set(p.x, p.h, p.y);
    const sc = p.r * 2;
    p.s.scale.set(sc, sc, 1);
    p.s.material.opacity = clamp(p.life / p.max, 0, 1) * p.alpha;
  }
  if (tlLamps && !(lastLights > gtime)) {
    lastLights = gtime + 0.2;
    const cols = ['#2ecc71', '#f1c40f', '#ff4136'];
    for (let i = 0; i < tlAxis.length; i++) {
      const q = tlAxis[i];
      tlLamps.setColorAt(i, tmpC.set(cols[sigGreen(q[0], q[1])]));
    }
    tlLamps.instanceColor.needsUpdate = true;
  }
  antM.color.set(Math.floor(gtime * 1.2) % 2 ? '#ff2030' : '#3a0005');
  syncExtras(dt);
  updateRain(dt);
  LMX.tick(dt, gtime);
}

export function init() {
  // ---------------- scene sync ----------------
  meshCars = [];
  meshPeds = [];
  meshOffers = [];
  lastLights = -1;
}
