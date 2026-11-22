// Garage: riparazioni e auto da comprare.
import * as THREE from 'three';
import { sfx } from '../audio/sfx.js';
import { G } from '../core/game.js';
import { H, W, ctx, scene } from '../core/render.js';
import { player, save, saveMoney, wanted } from '../core/state.js';
import { labelTex, rr } from '../core/util.js';
import { CARS, makeCar } from '../entities/vehicles.js';
import { exitCar } from './player.js';
import { updateCamera } from '../render/camera.js';
import { beamMat, iconTex, ringGeo } from '../render/models.js';
import { HUDF } from '../ui/hud.js';
import { toast } from '../world/effects.js';
import { gs0 } from '../world/map.js';

export let GARAGE, garageLatch, garageSel, SHOP, garageMesh, garageIcon;

export function updateGarage() {
  const d = Math.hypot(player.x - GARAGE.x, player.y - GARAGE.y);
  if (d > 60) garageLatch = false;
  if (d < 30 && !garageLatch) {
    garageLatch = true;
    if (wanted.level > 0) {
      toast('Il garage non apre con la polizia alle calcagna!');
      return;
    }
    G.state = 'garage';
    sfx.ui();
  }
}
export function garageKey(k) {
  if (k === 'Escape' || k === 'KeyE' || k === 'KeyF') {
    G.state = 'play';
    return;
  }
  if (k === 'ArrowUp' || k === 'KeyW') {
    garageSel = (garageSel + SHOP.length - 1) % SHOP.length;
    sfx.ui();
    return;
  }
  if (k === 'ArrowDown' || k === 'KeyS') {
    garageSel = (garageSel + 1) % SHOP.length;
    sfx.ui();
    return;
  }
  const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
  let i = map[k];
  if (k === 'Enter' || k === 'Space') i = garageSel;
  if (i === undefined) return;
  garageSel = i;
  const it = SHOP[i];
  if (it.id === 'repair') {
    const c = player.car;
    if (!c) {
      toast("Entra nel garage con l'auto da riparare");
      return;
    }
    if (c.hp >= c.d.hp) {
      toast("L'auto è già a posto");
      return;
    }
    if (G.money < it.price) {
      toast('Non hai abbastanza soldi');
      sfx.fail();
      return;
    }
    G.money -= it.price;
    c.hp = c.d.hp;
    saveMoney();
    sfx.coin();
    toast('Auto riparata come nuova!');
    return;
  }
  const owned = it.price === 0 || save.owned[it.id];
  if (!owned) {
    if (G.money < it.price) {
      toast('Ti servono €' + it.price.toLocaleString('it-IT'));
      sfx.fail();
      return;
    }
    G.money -= it.price;
    save.owned[it.id] = true;
    saveMoney();
    sfx.win();
    toast(CARS[it.id].name + ' acquistata!');
  }
  deliverCar(it.id);
  G.state = 'play';
}
export function deliverCar(type) {
  const x = GARAGE.x - Math.cos(GARAGE.a) * 70,
    y = GARAGE.y - Math.sin(GARAGE.a) * 70;
  for (let i = G.cars.length - 1; i >= 0; i--) {
    const c = G.cars[i];
    if (c !== player.car && !c.driver && Math.hypot(c.x - x, c.y - y) < 50) G.cars.splice(i, 1);
  }
  if (player.car) exitCar(true);
  const c = makeCar(type, x, y, GARAGE.a);
  if (type === 'sportiva') c.col = '#ff2e88';
  G.cars.push(c);
  player.x = x;
  player.y = y;
  c.driver = 'player';
  player.car = c;
  c.keep = true;
  if (player.lastCar && player.lastCar !== c) player.lastCar.keep = false;
  player.lastCar = c;
  updateCamera(0, true);
  toast('Ecco la tua ' + c.d.name + '!', 2);
}
export function drawGarage() {
  ctx.fillStyle = 'rgba(5,8,20,0.7)';
  ctx.fillRect(0, 0, W, H);
  const pw = Math.min(600, W - 30),
    ph = 380,
    px = (W - pw) / 2,
    py = (H - ph) / 2;
  ctx.fillStyle = 'rgba(15,18,40,0.96)';
  rr(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic bold 34px ' + HUDF;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('GARAGE NEON', W / 2, py + 42);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 15px system-ui,sans-serif';
  ctx.fillStyle = '#ffe3f1';
  ctx.fillText('Hai € ' + G.money.toLocaleString('it-IT'), W / 2, py + 78);
  SHOP.forEach((it, i) => {
    const y = py + 104 + i * 58,
      sel = i === garageSel;
    ctx.fillStyle = sel ? 'rgba(56,189,248,0.22)' : 'rgba(255,255,255,0.05)';
    rr(ctx, px + 20, y, pw - 40, 50, 10);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px system-ui,sans-serif';
    ctx.fillText(String(i + 1), px + 38, y + 25);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px system-ui,sans-serif';
    ctx.fillText(it.label, px + 64, y + 18);
    ctx.font = '13px system-ui,sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(it.desc, px + 64, y + 36);
    let right;
    if (it.id === 'repair') right = player.car ? (player.car.hp >= player.car.d.hp ? 'già a posto' : '€ ' + it.price) : "serve un'auto";
    else right = it.price === 0 || save.owned[it.id] ? 'RITIRA' : '€ ' + it.price.toLocaleString('it-IT');
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px system-ui,sans-serif';
    ctx.fillStyle = right === 'RITIRA' ? '#3ae374' : right.startsWith('€') && it.price > G.money ? '#ff6b81' : '#ffd23f';
    ctx.fillText(right, px + pw - 38, y + 25);
  });
  ctx.textAlign = 'center';
  ctx.font = '13px system-ui,sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Tasti 1–4 oppure ↑ ↓ e Invio   ·   Esc per uscire', W / 2, py + ph - 20);
}

export function init() {
  // ---------------- garage ----------------
  GARAGE = { x: gs0[0], y: gs0[1], a: gs0[2] };
  garageLatch = true;
  garageSel = 0;
  SHOP = [
    { id: 'repair', label: "Ripara l'auto", desc: 'Torna come nuova', price: 100 },
    { id: 'fulmine', label: 'Fulmine', desc: 'Supercar: la più veloce della città', price: 1500 },
    { id: 'corazzato', label: 'Corazzato', desc: 'Blindato pesante: sfonda le volanti', price: 2500 },
    { id: 'sportiva', label: 'Sportiva Neon', desc: 'La tua prima auto, sempre gratis', price: 0 },
  ];

  {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 140, 24, 1, true), beamMat('#38bdf8', 0.35));
    beam.position.y = 70;
    g.add(beam);
    const ring = new THREE.Mesh(ringGeo, beamMat('#38bdf8', 0.8));
    ring.position.y = 1;
    g.add(ring);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex('G', '#38bdf8'), depthWrite: false, fog: false }));
    sp.scale.set(26, 26, 1);
    sp.position.y = 36;
    g.add(sp);
    const lb = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex('GARAGE', '#38bdf8'), depthWrite: false, fog: false }));
    lb.scale.set(72, 18, 1);
    lb.position.y = 62;
    g.add(lb);
    g.position.set(GARAGE.x, 0, GARAGE.y);
    scene.add(g);
    garageMesh = g;
    garageIcon = sp;
  }
}
