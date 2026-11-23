// Veicoli: modelli di guida, fisica, danni ed esplosioni.
import { rain } from '../world/weather.js';
import { sfx } from '../audio/sfx.js';
import { camera } from '../core/render.js';
import { gtime, peds, player, setShake, shake } from '../core/state.js';
import { TAU, clamp, pick, rand } from '../core/util.js';
import { makePed, pedSolidAt } from './peds.js';
import { exitCar } from '../gameplay/player.js';
import { landed, rampAt } from '../gameplay/ramps.js';
import { bigMsg, puff, sparks } from '../world/effects.js';
import { addSkid } from '../world/ground.js';
import { BUILD, OUT, PARK, SAND, WATER, tileAtPx } from '../world/map.js';

export let CARS, CP;

export function makeCar(type, x, y, a) {
  const d = CARS[type];
  return {
    type,
    d,
    x,
    y,
    a,
    vx: 0,
    vy: 0,
    col: pick(d.cols),
    hp: d.hp,
    driver: null,
    ai: null,
    wreck: false,
    burn: 0,
    siren: false,
    brake: false,
    skid: null,
    keep: false,
    heatCd: 0,
    lost: false,
    mesh: null,
    m: null,
    tilt: 0,
    pitch: 0,
    lastVf: 0,
    z: 0,
    vz: 0,
    air: 0,
    onRamp: false,
    rampTop: 0,
    rampVf: 0,
    nitro: 1,
  };
}
export function blockedN(c, x, y, a) {
  const cs = Math.cos(a),
    sn = Math.sin(a),
    hl = c.d.len / 2 - 1,
    hw = c.d.wid / 2 - 1;
  let n = 0;
  for (const [p, q] of CP) {
    const lx = p * hl,
      ly = q * hw;
    const t = tileAtPx(x + cs * lx - sn * ly, y + sn * lx + cs * ly);
    if (t === BUILD || t === WATER || t === OUT) n++;
  }
  return n;
}
export function circles(c) {
  const o = c.d.len / 2 - c.d.wid / 2,
    cs = Math.cos(c.a) * o,
    sn = Math.sin(c.a) * o;
  return [
    [c.x + cs, c.y + sn],
    [c.x - cs, c.y - sn],
  ];
}
export function carPhysics(c, thr, steer, hand, dt, boost) {
  const d = c.d;
  let fx = Math.cos(c.a),
    fy = Math.sin(c.a);
  if (!c.onRamp && (c.z > 0.01 || c.vz > 0)) {
    c.vz -= 560 * dt;
    c.z += c.vz * dt;
    c.air += dt;
    c.brake = false;
    c.skid = null;
    c.pitch += (clamp(-c.vz / 1400, -0.25, 0.25) - c.pitch) * Math.min(1, dt * 4);
    if (c.z <= 0) {
      const imp = -c.vz;
      c.z = 0;
      c.vz = 0;
      landed(c, imp);
    }
    moveCar(c, dt);
    return;
  }
  let vf = c.vx * fx + c.vy * fy,
    vr = -c.vx * fy + c.vy * fx;
  const t = tileAtPx(c.x, c.y),
    rough = t === PARK || t === SAND ? 0.62 : 1;
  c.brake = false;
  if (c.wreck) {
    thr = 0;
    steer = 0;
    hand = true;
  }
  if (thr > 0) {
    vf += (vf < 0 ? d.acc * 2.2 : d.acc * rough) * thr * dt;
    if (boost) vf += d.acc * 1.1 * dt;
  } else if (thr < 0) {
    if (vf > 0) {
      vf = Math.max(0, vf - d.acc * 2.4 * -thr * dt);
      c.brake = true;
    } else vf -= d.acc * 0.7 * -thr * dt;
  }
  const mx = d.max * rough * (c.hp < d.hp * 0.3 ? 0.75 : 1) * (boost ? 1.35 : 1);
  if (vf > mx) vf += (mx - vf) * Math.min(1, 3 * dt);
  if (vf < -mx * 0.35) vf = -mx * 0.35;
  vf *= 1 - (thr === 0 ? 0.8 : 0.15) * dt;
  if (hand) {
    vf *= 1 - 1.4 * dt;
    c.brake = true;
  }
  const grip = (hand ? 1.3 : d.grip * (rough < 1 ? 0.7 : 1)) * (1 - 0.3 * rain);
  vr *= Math.max(0, 1 - grip * dt);
  const spf = clamp(Math.abs(vf) / 110, 0, 1) * (1 - clamp((Math.abs(vf) - 350) / 400, 0, 0.35));
  const na = c.a + steer * d.turn * spf * (vf >= 0 ? 1 : -1) * dt * (hand ? 1.4 : 1);
  if (na !== c.a) {
    const cur = blockedN(c, c.x, c.y, c.a);
    if (blockedN(c, c.x, c.y, na) <= cur) c.a = na;
  }
  fx = Math.cos(c.a);
  fy = Math.sin(c.a);
  c.vx = fx * vf - fy * vr;
  c.vy = fy * vf + fx * vr;
  c.tilt += (clamp((-steer * spf * Math.abs(vf)) / 400, -0.6, 0.6) * 0.12 - c.tilt) * Math.min(1, dt * 6);
  c.pitch += (clamp((vf - c.lastVf) / dt / 4000, -0.05, 0.05) - c.pitch) * Math.min(1, dt * 5);
  c.lastVf = vf;
  const skidding = !c.wreck && (Math.abs(vr) > 75 || (hand && Math.abs(vf) > 120));
  if (skidding && Math.abs(c.x - camera.position.x) < 1500 && Math.abs(c.y - camera.position.z) < 1500) {
    const bx = c.x - fx * (d.len / 2 - 6),
      by = c.y - fy * (d.len / 2 - 6),
      ox = -fy * (d.wid / 2 - 3),
      oy = fx * (d.wid / 2 - 3);
    const w1 = [bx + ox, by + oy],
      w2 = [bx - ox, by - oy];
    if (c.skid) {
      addSkid(c.skid[0][0], c.skid[0][1], w1[0], w1[1]);
      addSkid(c.skid[1][0], c.skid[1][1], w2[0], w2[1]);
    }
    c.skid = [w1, w2];
    if (Math.random() < 0.3)
      puff(bx + rand(-4, 4), by + rand(-4, 4), '#dddddd', rand(4, 7), rand(0.5, 0.9), rand(-10, 10), rand(-10, 10), 16, 0.4, 3, 8);
  } else c.skid = null;
  moveCar(c, dt);
  const ra = rampAt(c);
  if (ra) {
    c.onRamp = true;
    c.z = ra.h;
    c.rampTop = ra.r.h;
    c.rampVf = ra.vf;
  } else if (c.onRamp) {
    c.onRamp = false;
    if (c.z > c.rampTop * 0.6) {
      c.vz = Math.min(330, c.rampVf * 0.62);
      c.air = 0;
    } else c.z = 0;
  }
}
export function moveCar(c, dt) {
  const nx = c.x + c.vx * dt,
    ny = c.y + c.vy * dt;
  const cur = blockedN(c, c.x, c.y, c.a),
    nb = blockedN(c, nx, ny, c.a);
  if (nb === 0 || (cur > 0 && nb <= cur)) {
    c.x = nx;
    c.y = ny;
    return;
  }
  const imp = Math.hypot(c.vx, c.vy);
  if (blockedN(c, nx, c.y, c.a) === 0) {
    c.x = nx;
    c.vy *= -0.2;
    c.vx *= 0.85;
  } else if (blockedN(c, c.x, ny, c.a) === 0) {
    c.y = ny;
    c.vx *= -0.2;
    c.vy *= 0.85;
  } else {
    c.vx *= -0.3;
    c.vy *= -0.3;
  }
  if (imp > 130 && !(c.hitCd > gtime)) {
    c.hitCd = gtime + 0.3;
    sparks(c.x + (Math.cos(c.a) * c.d.len) / 2, c.y + (Math.sin(c.a) * c.d.len) / 2, imp);
    if (c === player.car) {
      setShake(Math.max(shake, Math.min(10, imp / 45)));
      sfx.crash(imp);
    }
    damage(c, (imp - 130) * 0.07);
  }
}
export function damage(c, amt) {
  if (c.wreck) return;
  c.hp -= amt;
  if (c.hp <= 0) {
    c.hp = 0;
    wreckCar(c);
  }
}
export function wreckCar(c) {
  c.wreck = true;
  c.siren = false;
  c.burn = 7;
  if (Math.hypot(c.x - player.x, c.y - player.y) < 700) sfx.boom();
  for (let i = 0; i < 22; i++) {
    const a = rand(0, TAU),
      s = rand(20, 140);
    puff(
      c.x,
      c.y,
      pick(['#ff8c1a', '#ffd23f', '#ff5a1f']),
      rand(5, 10),
      rand(0.4, 0.9),
      Math.cos(a) * s,
      Math.sin(a) * s,
      24,
      0.95,
      8,
      rand(10, 60),
    );
  }
  if (c === player.car) {
    exitCar(true);
    bigMsg('AUTO DISTRUTTA', "Trovane un'altra…", '#ff8c1a', 2.5);
    setShake(12);
  } else if (c.driver === 'npc' || c.driver === 'cop') {
    ejectDriver(c);
  }
  c.driver = null;
}
export function ejectDriver(c) {
  const lx = Math.sin(c.a),
    ly = -Math.cos(c.a);
  let x = c.x + lx * (c.d.wid / 2 + 8),
    y = c.y + ly * (c.d.wid / 2 + 8);
  if (pedSolidAt(x, y, 4)) {
    x = c.x - lx * (c.d.wid / 2 + 8);
    y = c.y - ly * (c.d.wid / 2 + 8);
  }
  const p = makePed(x, y);
  p.flee = 4;
  p.fleeFrom = [c.x, c.y];
  if (c.type === 'polizia') p.shirt = '#1e3a8a';
  peds.push(p);
  return p;
}

export function init() {
  // ---------------- veicoli ----------------
  CARS = {
    berlina: {
      name: 'Berlina',
      len: 34,
      wid: 17,
      max: 330,
      acc: 260,
      grip: 7,
      turn: 2.7,
      hp: 100,
      cruise: 165,
      cols: ['#a9adb3', '#eceef0', '#1c1f24', '#2b4c7e', '#a3262a', '#5b6169', '#2f5d50', '#8c7b6b'],
    },
    utilitaria: {
      name: 'Utilitaria',
      len: 28,
      wid: 15,
      max: 290,
      acc: 230,
      grip: 7,
      turn: 3.0,
      hp: 90,
      cruise: 160,
      cols: ['#e9ecef', '#b3202a', '#9aa3ab', '#2d3436', '#e1b12c', '#5d7f99', '#7a8f4a', '#d9d4c7'],
    },
    sportiva: {
      name: 'Sportiva',
      len: 35,
      wid: 16,
      max: 480,
      acc: 430,
      grip: 6.5,
      turn: 3.0,
      hp: 80,
      cruise: 205,
      cols: ['#ff3f6c', '#feca57', '#00d2d3', '#ff9f43', '#1e272e'],
    },
    furgone: {
      name: 'Furgone',
      len: 44,
      wid: 20,
      max: 250,
      acc: 170,
      grip: 8,
      turn: 2.1,
      hp: 160,
      cruise: 140,
      cols: ['#dfe4ea', '#a4b0be', '#e1b12c', '#6ab04c'],
    },
    taxi: { name: 'Taxi', len: 34, wid: 17, max: 345, acc: 280, grip: 7, turn: 2.7, hp: 100, cruise: 195, cols: ['#f4f4f2'] },
    polizia: {
      name: 'Polizia',
      len: 36,
      wid: 17,
      max: 430,
      acc: 370,
      grip: 7.5,
      turn: 2.9,
      hp: 150,
      cruise: 170,
      cols: ['#1f4e96', '#16213e'],
    },
    fulmine: {
      name: 'Fulmine',
      len: 36,
      wid: 17,
      max: 600,
      acc: 560,
      grip: 7.4,
      turn: 3.1,
      hp: 90,
      cruise: 220,
      cols: ['#7c3aed', '#00e5ff', '#ff2e88', '#f8fafc'],
    },
    corazzato: {
      name: 'Corazzato',
      len: 46,
      wid: 22,
      max: 320,
      acc: 240,
      grip: 8.5,
      turn: 2.2,
      hp: 500,
      cruise: 140,
      cols: ['#2f3b2f', '#1f2937'],
      mass: 2.2,
    },
    autobus: {
      name: 'Autobus',
      len: 66,
      wid: 21,
      max: 230,
      acc: 150,
      grip: 8,
      turn: 1.7,
      hp: 320,
      cruise: 140,
      cols: ['#ff8c1a'],
      mass: 3,
    },
  };
  CP = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
}
