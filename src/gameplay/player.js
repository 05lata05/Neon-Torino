// Giocatore: salire e scendere dalle auto, clacson, movimento a piedi, confini della mappa.
import { sfx } from '../audio/sfx.js';
import { keys } from '../core/input.js';
import { cars, gtime, peds, player, setShake, shake } from '../core/state.js';
import { pick, rand } from '../core/util.js';
import { pedSolidAt, tryMovePed } from '../entities/peds.js';
import { addHeat, copNear } from '../entities/police.js';
import { carPhysics, circles, ejectDriver } from '../entities/vehicles.js';
import { puff, say, toast } from '../world/effects.js';
import { OUT, tileAtPx } from '../world/map.js';

export let edgeWarnT;

// ---------------- giocatore ----------------
export function tryEnterCar() {
  let best = null,
    bd = 50;
  for (const c of cars) {
    if (c.wreck) continue;
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  if (!best) return;
  const c = best;
  if (c.driver === 'npc' || c.driver === 'cop' || c.driver === 'idle') {
    const p = ejectDriver(c);
    say(p, c.type === 'polizia' ? 'Ehi! Quella è dello Stato!' : pick(['La mia macchina!', 'Al ladro!', 'Mamma mia!', 'Ma che fai?!']));
    if (c.type === 'polizia') addHeat(2);
    else if (copNear(c.x, c.y, 450)) addHeat(1);
  } else if (c.type === 'polizia') addHeat(2);
  c.driver = 'player';
  c.ai = null;
  c.siren = false;
  c.lost = false;
  player.car = c;
  if (player.lastCar && player.lastCar !== c) player.lastCar.keep = false;
  player.lastCar = c;
  c.keep = true;
  toast((c.type === 'polizia' && c.col === '#16213e' ? 'Carabinieri' : c.d.name) + (c.type === 'polizia' ? ' — ottima idea…?' : ''), 1.6);
}
export function exitCar(forced) {
  const c = player.car;
  if (!c) return;
  if (!forced && (Math.hypot(c.vx, c.vy) > 70 || c.z > 1)) {
    toast('Rallenta per scendere', 1.4);
    return;
  }
  const fx = Math.cos(c.a),
    fy = Math.sin(c.a);
  const spots = [
    [fy, -fx, c.d.wid / 2 + 9],
    [-fy, fx, c.d.wid / 2 + 9],
    [fx, fy, c.d.len / 2 + 9],
    [-fx, -fy, c.d.len / 2 + 9],
  ];
  for (const [ox, oy, d] of spots) {
    const x = c.x + ox * d,
      y = c.y + oy * d;
    if (!pedSolidAt(x, y, 5)) {
      player.x = x;
      player.y = y;
      break;
    }
  }
  if (!c.wreck) c.driver = null;
  player.car = null;
  player.a = c.a;
}
export function honk() {
  const c = player.car;
  say(c, 'BEEP BEEP!', 1);
  sfx.horn();
  for (const p of peds)
    if (p.down <= 0 && Math.hypot(p.x - c.x, p.y - c.y) < 120) {
      p.flee = 1;
      p.fleeFrom = [c.x, c.y];
    }
  for (const o of cars)
    if (o !== c && o.driver === 'npc' && Math.hypot(o.x - c.x, o.y - c.y) < 130 && Math.random() < 0.5)
      say(o, pick(['Ehi!', 'Calma!', "Ma va' là!", 'Che fretta!']), 1.5);
}
export function updatePlayer(dt) {
  const up = keys.KeyW || keys.ArrowUp,
    dn = keys.KeyS || keys.ArrowDown,
    lf = keys.KeyA || keys.ArrowLeft,
    rt = keys.KeyD || keys.ArrowRight;
  if (player.car) {
    const c = player.car,
      thr = (up ? 1 : 0) - (dn ? 1 : 0);
    const boost = (keys.ShiftLeft || keys.ShiftRight || keys.KeyN) && thr > 0 && !c.wreck && c.nitro > 0.02 && c.z < 1;
    if (boost && !player.boosting) sfx.nitro();
    player.boosting = boost;
    if (boost) {
      c.nitro = Math.max(0, c.nitro - dt / 3.2);
      if (Math.random() < 0.85) {
        const bx = c.x - (Math.cos(c.a) * c.d.len) / 2,
          by = c.y - (Math.sin(c.a) * c.d.len) / 2;
        puff(
          bx,
          by,
          Math.random() < 0.5 ? '#66ccff' : '#ff9f43',
          rand(3, 5),
          rand(0.15, 0.3),
          -c.vx * 0.2,
          -c.vy * 0.2,
          10,
          0.9,
          5,
          rand(0, 10),
        );
      }
    } else c.nitro = Math.min(1, c.nitro + dt / 9);
    carPhysics(c, thr, (rt ? 1 : 0) - (lf ? 1 : 0), !!keys.Space, dt, boost);
    if (player.car) {
      player.x = c.x;
      player.y = c.y;
      player.a = c.a;
    }
    return;
  }
  player.boosting = false;
  if (player.stun > 0) {
    player.stun -= dt;
    player.moving = false;
    return;
  }
  const turn = (rt ? 1 : 0) - (lf ? 1 : 0),
    fwd = (up ? 1 : 0) - (dn ? 1 : 0);
  player.a += turn * 3.2 * dt;
  if (fwd) {
    const run = keys.ShiftLeft || keys.ShiftRight,
      sp = (run ? 235 : 130) * (fwd < 0 ? 0.6 : 1);
    tryMovePed(player, Math.cos(player.a) * sp * fwd * dt, Math.sin(player.a) * sp * fwd * dt);
    player.t += dt * (sp / 130);
    player.moving = true;
  } else {
    player.moving = !!turn;
    if (turn) player.t += dt * 0.7;
  }
}
export function playerCarCollide() {
  for (const c of cars) {
    const dx = player.x - c.x,
      dy = player.y - c.y;
    if (dx * dx + dy * dy > 2500 || c.z > 8) continue;
    const sp = Math.hypot(c.vx, c.vy);
    for (const [px, py] of circles(c)) {
      let ex = player.x - px,
        ey = player.y - py,
        d = Math.hypot(ex, ey);
      const md = c.d.wid / 2 + 7;
      if (d < md) {
        if (d < 0.01) {
          ex = 1;
          ey = 0;
          d = 1;
        }
        const nx = ex / d,
          ny = ey / d,
          ov = md - d;
        if (!pedSolidAt(player.x + nx * ov, player.y + ny * ov, 5)) {
          player.x += nx * ov;
          player.y += ny * ov;
        } else {
          c.x -= nx * ov;
          c.y -= ny * ov;
        }
        if (sp > 110 && player.stun <= 0) {
          player.stun = 0.9;
          tryMovePed(player, c.vx * 0.05, c.vy * 0.05);
          say(player, 'Ahi!', 1.2);
          setShake(Math.max(shake, 5));
        }
      }
    }
  }
}
export function boundaryCheck() {
  const c = player.car || player,
    a = player.a;
  const x = c.x + Math.cos(a) * 40,
    y = c.y + Math.sin(a) * 40;
  if (tileAtPx(x, y) === OUT && !(edgeWarnT > gtime)) {
    edgeWarnT = gtime + 6;
    toast('Confine della mappa: per ora Torino finisce qui!', 2.5);
  }
}

export function init() {
  edgeWarnT = 0;
}
