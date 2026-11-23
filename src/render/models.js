// 3D models of cars, pedestrians and mission markers.
import * as THREE from 'three';
import { scene } from '../core/render.js';
import { player } from '../core/state.js';
import { TAU, boxAt, canvasTex, glowCanvas, mergeGeo, mkCv } from '../core/util.js';
import { CARS } from '../entities/vehicles.js';
import { MT } from '../gameplay/missions.js';
import { puffTex } from '../world/effects.js';

export let geoCache,
  MAT,
  carGlassM,
  tireM,
  headM,
  tailM,
  brakeM,
  charM,
  sirR,
  sirB,
  glowR,
  glowB,
  underglowM,
  headDecalGeo,
  headDecalM,
  livCache,
  plateM,
  plateCache,
  pedM,
  pm,
  legGeo,
  torsoGeo,
  armGeo,
  headGeo,
  hairGeo,
  ringGeo,
  tgt,
  tgtBeam,
  tgtRing,
  tgtArrow,
  nextRing;

export function carGeo(type) {
  if (geoCache[type]) return geoCache[type];
  const d = CARS[type],
    L = d.len,
    Wd = d.wid,
    G = {},
    wr = type === 'compact' ? 3.1 : type === 'bus' ? 4.8 : type === 'van' || type === 'armored' ? 4.2 : 3.6;
  if (type === 'bus') {
    G.body = boxAt(L, 13, Wd, 0, 9, 0);
    G.cabin = boxAt(L * 0.86, 5, Wd + 0.3, -1.5, 11.8, 0);
    G.roof = boxAt(L - 4, 0.9, Wd - 2, 0, 15.9, 0);
    G.ly = 6;
    G.wind = boxAt(1.2, 6.5, Wd - 3, L / 2 + 0.2, 11, 0);
    G.stripe = boxAt(L + 0.2, 2.2, Wd + 0.25, 0, 5, 0);
  } else if (type === 'lightning') {
    G.body = boxAt(L, 4.2, Wd, 0, 4.2, 0);
    G.cabin = boxAt(L * 0.36, 3.2, Wd - 3, -L * 0.06, 7.9, 0);
    G.roof = boxAt(L * 0.28, 0.6, Wd - 3.6, -L * 0.07, 9.7, 0);
    G.ly = 4.2;
    G.wing = mergeGeo([
      boxAt(4.5, 0.8, Wd, -L / 2 + 2.5, 10.6, 0),
      boxAt(1, 3.6, 1, -L / 2 + 2.5, 8.6, -Wd * 0.3),
      boxAt(1, 3.6, 1, -L / 2 + 2.5, 8.6, Wd * 0.3),
    ]);
  } else if (type === 'armored') {
    G.body = boxAt(L, 12, Wd, 0, 8.5, 0);
    G.cabin = boxAt(L * 0.16, 4, Wd + 0.3, L / 2 - L * 0.08 - 0.5, 11.2, 0);
    G.roof = boxAt(L - 8, 1.5, Wd - 2, -3, 15.2, 0);
    G.ly = 6;
    G.armor = mergeGeo([boxAt(2.4, 6, Wd - 2, L / 2 + 1.2, 5.5, 0), boxAt(L * 0.62, 4.5, Wd + 0.8, -2, 6.5, 0)]);
  } else if (type === 'sports') {
    G.body = boxAt(L, 5, Wd, 0, 4.6, 0);
    G.cabin = boxAt(L * 0.42, 3.6, Wd - 2.4, -L * 0.08, 8.9, 0);
    G.roof = boxAt(L * 0.34, 0.8, Wd - 3, -L * 0.09, 10.9, 0);
    G.ly = 4.8;
  } else if (type === 'van') {
    G.body = boxAt(L, 11, Wd, 0, 8, 0);
    G.cabin = boxAt(L * 0.2, 5, Wd + 0.3, L / 2 - L * 0.1 - 0.5, 10.4, 0);
    G.roof = boxAt(L - 6, 0.8, Wd - 2, -2, 13.9, 0);
    G.ly = 5.5;
  } else if (type === 'compact') {
    G.body = boxAt(L, 6, Wd, 0, 5.2, 0);
    G.cabin = boxAt(L * 0.62, 5.6, Wd - 1.4, -L * 0.04, 10.9, 0);
    G.roof = boxAt(L * 0.56, 0.8, Wd - 2, -L * 0.05, 14.1, 0);
    G.ly = 5.8;
  } else {
    G.body = boxAt(L, 6, Wd, 0, 5.5, 0);
    G.cabin = boxAt(L * 0.48, 4.6, Wd - 2, -L * 0.06, 10.8, 0);
    G.roof = boxAt(L * 0.4, 0.9, Wd - 2.6, -L * 0.07, 13.4, 0);
    G.ly = 6;
  }
  const ws = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      ws.push(new THREE.CylinderGeometry(wr, wr, 2.6, 12).rotateX(Math.PI / 2).translate(sx * L * 0.31, wr, sz * (Wd / 2 - 0.9)));
  G.wheels = mergeGeo(ws);
  G.heads = mergeGeo([boxAt(1, 1.8, 3.2, L / 2 + 0.3, G.ly, -(Wd / 2 - 2.6)), boxAt(1, 1.8, 3.2, L / 2 + 0.3, G.ly, Wd / 2 - 2.6)]);
  G.tails = mergeGeo([boxAt(1, 1.8, 3.2, -L / 2 - 0.3, G.ly, -(Wd / 2 - 2.6)), boxAt(1, 1.8, 3.2, -L / 2 - 0.3, G.ly, Wd / 2 - 2.6)]);
  if (type === 'taxi') G.extra = boxAt(5, 2.6, 7, -L * 0.07, 15.1, 0);
  if (type === 'police') {
    G.stripe = boxAt(L * 0.84, 2.8, Wd + 0.3, -0.5, 5.4, 0);
    G.red = boxAt(3, 1.8, Wd * 0.38, -L * 0.07, 14.75, -Wd * 0.21);
    G.blue = boxAt(3, 1.8, Wd * 0.38, -L * 0.07, 14.75, Wd * 0.21);
  }
  if (type === 'sports') G.stripes = mergeGeo([boxAt(L * 0.98, 0.3, 1.2, 0, 7.2, -1.3), boxAt(L * 0.98, 0.3, 1.2, 0, 7.2, 1.3)]);
  return (geoCache[type] = G);
}
export function sm(hex, o) {
  const k = hex + '|' + (o ? JSON.stringify(o) : '');
  return MAT[k] || (MAT[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.4, metalness: 0.25 }, o || {})));
}
export function livM(col) {
  if (livCache[col]) return livCache[col];
  const cc = col === '#16213e',
    [cv, g] = mkCv(512, 48);
  g.fillStyle = cc ? '#c1121f' : '#ffffff';
  g.fillRect(0, 0, 512, 48);
  g.fillStyle = cc ? '#ffffff' : '#1f4e96';
  g.font = 'bold 34px system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(cc ? 'CARABINIERI' : 'POLIZIA', 256, 26);
  return (livCache[col] = new THREE.MeshStandardMaterial({ map: canvasTex(cv), roughness: 0.4 }));
}
export function plateGeo(type) {
  if (plateCache[type] !== undefined) return plateCache[type];
  const d = CARS[type];
  if (!d) return (plateCache[type] = null);
  const pos = [],
    nor = [],
    uv = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.5, 2.2, 7).translate(sx * (d.len / 2 + 0.35), 3.6, 0).toNonIndexed();
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    uv.push(...g.attributes.uv.array);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return (plateCache[type] = o);
}
export function buildCarMesh(c) {
  const G = carGeo(c.type),
    g = new THREE.Group(),
    inner = new THREE.Group();
  g.add(inner);
  const bm = sm(c.col);
  const add = (geo, mat, cast) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    inner.add(m);
    return m;
  };
  c.m = {
    inner,
    body: add(G.body, bm, true),
    cabin: add(G.cabin, carGlassM, true),
    roof: add(G.roof, c.type === 'police' ? sm('#f4f6f8') : bm, false),
    wheels: add(G.wheels, tireM, false),
    heads: add(G.heads, headM),
    tails: add(G.tails, tailM),
    wreckDone: false,
  };
  if (G.extra) add(G.extra, sm('#fff3c4'));
  if (G.wind) add(G.wind, carGlassM);
  if (G.stripe) add(G.stripe, c.type === 'police' ? livM(c.col) : sm(c.type === 'bus' ? '#f2f2f2' : '#1e2a4a'));
  if (c.type !== 'bus') {
    const pg = plateGeo(c.type);
    if (pg) add(pg, plateM);
  }
  if (G.stripes) add(G.stripes, sm('#ffffff'));
  if (G.wing) add(G.wing, sm('#111111'));
  if (G.armor) add(G.armor, sm('#3a3f44', { metalness: 0.6, roughness: 0.5 }));
  if (c.type === 'lightning') {
    const ug = new THREE.Mesh(new THREE.PlaneGeometry(c.d.len + 20, c.d.wid + 20).rotateX(-Math.PI / 2), underglowM);
    ug.position.y = 0.7;
    ug.renderOrder = 2;
    g.add(ug);
  }
  if (G.red) {
    c.m.red = add(G.red, sirR[0]);
    c.m.blue = add(G.blue, sirB[0]);
    const s = new THREE.Sprite(glowR);
    s.scale.set(80, 80, 1);
    s.position.set(0, 18, 0);
    s.visible = false;
    g.add(s);
    c.m.glow = s;
  }
  const hd = new THREE.Mesh(headDecalGeo, headDecalM);
  hd.position.set(c.d.len / 2 + 2, 0.8, 0);
  hd.renderOrder = 2;
  g.add(hd);
  c.m.hd = hd;
  scene.add(g);
  c.mesh = g;
}
export function buildPedMesh(p) {
  const g = new THREE.Group(),
    b = new THREE.Group();
  g.add(b);
  g.scale.setScalar(0.9);
  const legs = [],
    arms = [];
  for (const s of [-1, 1]) {
    const lp = new THREE.Group();
    lp.position.set(0, 6.5, s * 1.4);
    lp.add(new THREE.Mesh(legGeo, pm('#2d3436')));
    b.add(lp);
    legs.push(lp);
    const ap = new THREE.Group();
    ap.position.set(0, 12, s * 3.9);
    ap.add(new THREE.Mesh(armGeo, pm(p.shirt)));
    b.add(ap);
    arms.push(ap);
  }
  const torso = new THREE.Mesh(torsoGeo, pm(p.shirt));
  torso.position.y = 9.4;
  torso.castShadow = true;
  b.add(torso);
  const head = new THREE.Mesh(headGeo, pm(p.skin));
  head.position.y = 14.2;
  head.castShadow = true;
  b.add(head);
  const hair = new THREE.Mesh(hairGeo, pm(p.hair));
  hair.position.set(-0.2, 16.1, 0);
  b.add(hair);
  p.m = { g, b, legs, arms };
  scene.add(g);
}
export function iconTex(ic, col) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = col;
  g.beginPath();
  g.arc(32, 32, 28, 0, TAU);
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#fff';
  g.stroke();
  g.fillStyle = '#111';
  g.font = 'bold 34px system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ic, 32, 34);
  return canvasTex(c);
}
export function beamMat(col, op) {
  return new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: op,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
}
export function buildOfferMesh(o) {
  const m = MT[o.type],
    g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 120, 24, 1, true), beamMat(m.col, 0.35));
  beam.position.y = 60;
  g.add(beam);
  const ring = new THREE.Mesh(ringGeo, beamMat(m.col, 0.8));
  ring.position.y = 1;
  g.add(ring);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(m.ic, m.col), depthWrite: false, fog: false }));
  sp.scale.set(24, 24, 1);
  sp.position.y = 34;
  g.add(sp);
  g.position.set(o.x, 0, o.y);
  scene.add(g);
  o.mesh = g;
  o.icon = sp;
}

export function init() {
  geoCache = {};
  MAT = {};
  carGlassM = new THREE.MeshStandardMaterial({ color: 0x1b2738, roughness: 0.12, metalness: 0.6 });
  tireM = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9 });
  headM = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  tailM = new THREE.MeshBasicMaterial({ color: 0x6a0c0c });
  brakeM = new THREE.MeshBasicMaterial({ color: 0xff2424, toneMapped: false });
  charM = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 1 });
  sirR = [new THREE.MeshBasicMaterial({ color: 0x4a0a10 }), new THREE.MeshBasicMaterial({ color: 0xff2a3a, toneMapped: false })];
  sirB = [new THREE.MeshBasicMaterial({ color: 0x0a1a4a }), new THREE.MeshBasicMaterial({ color: 0x2a6bff, toneMapped: false })];
  glowR = new THREE.SpriteMaterial({
    map: canvasTex(
      glowCanvas(64, [
        [0, 'rgba(255,60,70,0.9)'],
        [1, 'rgba(255,0,0,0)'],
      ]),
    ),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  glowB = new THREE.SpriteMaterial({
    map: canvasTex(
      glowCanvas(64, [
        [0, 'rgba(60,130,255,0.9)'],
        [1, 'rgba(0,60,255,0)'],
      ]),
    ),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  underglowM = new THREE.MeshBasicMaterial({
    map: puffTex,
    color: '#00e5ff',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.9,
  });
  headDecalGeo = new THREE.PlaneGeometry(200, 120).rotateX(-Math.PI / 2).translate(100, 0, 0);
  headDecalM = new THREE.MeshBasicMaterial({
    map: canvasTex(
      (() => {
        const L = 256,
          Hh = 160,
          c = document.createElement('canvas');
        c.width = L;
        c.height = Hh;
        const g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, L, 0);
        gr.addColorStop(0, 'rgba(255,245,210,0.75)');
        gr.addColorStop(1, 'rgba(255,245,210,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(0, Hh / 2 - 10);
        g.lineTo(L, 6);
        g.lineTo(L, Hh - 6);
        g.lineTo(0, Hh / 2 + 10);
        g.closePath();
        g.fill();
        return c;
      })(),
    ),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  });
  livCache = {};
  plateM = (() => {
    const [cv, g] = mkCv(128, 28);
    g.fillStyle = '#f7f7f2';
    g.fillRect(0, 0, 128, 28);
    g.fillStyle = '#1f3fa0';
    g.fillRect(0, 0, 14, 28);
    g.fillRect(114, 0, 14, 28);
    g.fillStyle = '#fff';
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'center';
    g.fillText('I', 7, 22);
    g.fillStyle = '#111';
    g.font = 'bold 17px monospace';
    g.textBaseline = 'middle';
    g.fillText('FT 742 RA', 64, 15);
    return new THREE.MeshStandardMaterial({ map: canvasTex(cv), roughness: 0.5 });
  })();
  plateCache = {};
  pedM = {};
  pm = hex => pedM[hex] || (pedM[hex] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85 }));
  legGeo = new THREE.BoxGeometry(2.4, 6.5, 2.4).translate(0, -3.25, 0);
  torsoGeo = new THREE.BoxGeometry(3.4, 5.8, 6.2);
  armGeo = new THREE.BoxGeometry(1.8, 5.4, 1.8).translate(0, -2.7, 0);
  headGeo = new THREE.BoxGeometry(3.6, 3.6, 3.6);
  hairGeo = new THREE.BoxGeometry(3.9, 1.5, 3.9);
  ringGeo = new THREE.RingGeometry(20, 27, 40).rotateX(-Math.PI / 2);
  tgt = new THREE.Group();
  scene.add(tgt);
  tgtBeam = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 900, 32, 1, true), beamMat('#ffd32a', 0.28));
  tgtBeam.position.y = 450;
  tgt.add(tgtBeam);
  tgtRing = new THREE.Mesh(new THREE.RingGeometry(26, 36, 48).rotateX(-Math.PI / 2), beamMat('#ffd32a', 0.9));
  tgtRing.position.y = 1;
  tgt.add(tgtRing);
  tgtArrow = new THREE.Mesh(
    new THREE.ConeGeometry(10, 20, 16).rotateX(Math.PI),
    new THREE.MeshBasicMaterial({ color: '#ffd32a', toneMapped: false }),
  );
  tgt.add(tgtArrow);
  nextRing = new THREE.Mesh(new THREE.RingGeometry(22, 27, 40).rotateX(-Math.PI / 2), beamMat('#3ae374', 0.4));
  nextRing.position.y = 1;
  scene.add(nextRing);
  tgt.visible = false;
  nextRing.visible = false;
  buildPedMesh(player);
  player.m.g.visible = false;
}
