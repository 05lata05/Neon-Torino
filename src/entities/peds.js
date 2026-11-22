// Pedoni: camminata sui marciapiedi, fuga, schivate.
import { G } from '../core/game.js';
import { SKINS, peds, player } from '../core/state.js';
import { TAU, pick, rand } from '../core/util.js';
import { addHeat, copNear } from './police.js';
import { pedNext, pedStart } from './traffic.js';
import { circles } from './vehicles.js';
import { say } from '../world/effects.js';
import { BUILD, DIRS, OUT, WATER, nearestEdge, tileAtPx, walkable } from '../world/map.js';

export let SHIRTS, HAIRS, pedSolid;

export function makePed(x, y) {
  return {
    x,
    y,
    a: rand(0, TAU),
    sp: rand(28, 50),
    shirt: pick(SHIRTS),
    hair: pick(HAIRS),
    skin: pick(SKINS),
    t: rand(0, 10),
    dir: pick(DIRS),
    turnT: rand(2, 8),
    down: 0,
    flee: 0,
    fleeFrom: null,
    dodge: 0,
    dvx: 0,
    dvy: 0,
    moving: true,
    hitFrom: null,
    m: null,
  };
}
export function pedSolidAt(x, y, r) {
  return (
    pedSolid(tileAtPx(x - r, y - r)) ||
    pedSolid(tileAtPx(x + r, y - r)) ||
    pedSolid(tileAtPx(x - r, y + r)) ||
    pedSolid(tileAtPx(x + r, y + r))
  );
}
export function tryMovePed(p, dx, dy) {
  const r = 4;
  if (!pedSolidAt(p.x + dx, p.y, r)) p.x += dx;
  if (!pedSolidAt(p.x, p.y + dy, r)) p.y += dy;
}
export function chooseDir(p) {
  const opts = [];
  for (const d of DIRS) if (walkable(tileAtPx(p.x + d[0] * 16, p.y + d[1] * 16))) opts.push(d);
  const fwd = opts.filter(d => !(d[0] === -p.dir[0] && d[1] === -p.dir[1]));
  p.dir = fwd.length ? pick(fwd) : opts.length ? pick(opts) : pick(DIRS);
  p.turnT = rand(3, 9);
}
export function movePed(p, dt) {
  p.t += dt;
  p.moving = true;
  if (p.wait) {
    p.moving = false;
    p.a = Math.atan2(player.y - p.y, player.x - p.x);
    if (Math.random() < dt * 0.3) say(p, pick(['Taxi!', 'Ehi, taxi!', 'Di qua!']), 1.4);
    return;
  }
  if (p.flee > 0) {
    p.we = null;
    p.flee -= dt;
    let ax = p.x - p.fleeFrom[0],
      ay = p.y - p.fleeFrom[1];
    const l = Math.hypot(ax, ay) || 1;
    ax /= l;
    ay /= l;
    p.a = Math.atan2(ay, ax);
    const ox = p.x,
      oy = p.y;
    tryMovePed(p, ax * 120 * dt, ay * 120 * dt);
    if (Math.abs(p.x - ox) + Math.abs(p.y - oy) < 0.3) p.fleeFrom = [p.x + rand(-60, 60), p.y + rand(-60, 60)];
    p.t += dt;
    return;
  }
  if (p.dodge > 0) {
    p.we = null;
    p.dodge -= dt;
    tryMovePed(p, p.dvx * dt, p.dvy * dt);
    p.a = Math.atan2(p.dvy, p.dvx);
    p.t += dt;
    return;
  }
  if (!p.we) {
    const ne = nearestEdge(p.x, p.y, 200);
    if (!ne) {
      p.moving = false;
      return;
    }
    const e = ne.e,
      a = e.pts[ne.j],
      b = e.pts[ne.j + 1],
      side = (p.x - ne.px) * -(b[1] - a[1]) + (p.y - ne.py) * (b[0] - a[0]) >= 0 ? 1 : -1,
      dir = Math.random() < 0.5 ? 1 : -1,
      l = side > 0 ? e.sideR : e.sideL;
    pedStart(p, e, side, dir, dir > 0 ? ne.j + 1 : l.length - 1 - ne.j);
  }
  let tg = p.wl[p.wi];
  if (!tg) {
    pedNext(p);
    tg = p.wl[p.wi];
    if (!tg) return;
  }
  const dx = tg[0] - p.x,
    dy = tg[1] - p.y,
    d = Math.hypot(dx, dy);
  if (d < 6) {
    p.wi++;
    if (p.wi >= p.wl.length) pedNext(p);
    return;
  }
  const ox = p.x,
    oy = p.y;
  tryMovePed(p, (dx / d) * p.sp * dt, (dy / d) * p.sp * dt);
  p.a = Math.atan2(dy, dx);
  if (Math.abs(p.x - ox) + Math.abs(p.y - oy) < 0.05) {
    p.stuckT = (p.stuckT || 0) + dt;
    if (p.stuckT > 1.5) {
      p.stuckT = 0;
      p.wi++;
      if (p.wi >= p.wl.length) pedNext(p);
    }
  } else p.stuckT = 0;
}
export function updatePeds(dt) {
  for (const p of peds) {
    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0) {
        p.flee = 3;
        p.fleeFrom = p.hitFrom || [p.x + 1, p.y];
      }
      continue;
    }
    if (p.wait) {
      movePed(p, dt);
      continue;
    }
    for (const c of G.cars) {
      const dx = p.x - c.x,
        dy = p.y - c.y;
      if (dx > 70 || dx < -70 || dy > 70 || dy < -70 || c.z > 8) continue;
      const sp = Math.hypot(c.vx, c.vy),
        d = Math.hypot(dx, dy) || 1;
      let hit = false;
      for (const q of circles(c))
        if (Math.hypot(p.x - q[0], p.y - q[1]) < c.d.wid / 2 + 4) {
          hit = true;
          break;
        }
      if (hit) {
        if (sp > 95) {
          p.down = 2.2;
          p.hitFrom = [c.x, c.y];
          tryMovePed(p, c.vx * 0.06, c.vy * 0.06);
          if (Math.random() < 0.7) say(p, pick(['Ahi!', 'Ouch!', 'Mamma mia!', 'Ma che fai?!']));
          if (c === player.car) {
            G.shake = Math.max(G.shake, 3);
            if (copNear(p.x, p.y, 450)) addHeat(1);
          }
        } else tryMovePed(p, (dx / d) * 3, (dy / d) * 3);
        break;
      }
      if (sp > 70 && d < 75 && p.dodge <= 0 && p.flee <= 0) {
        const dot = (dx * c.vx + dy * c.vy) / (d * sp);
        if (dot > 0.55) {
          const side = c.vx * dy - c.vy * dx > 0 ? 1 : -1;
          p.dodge = 0.5;
          p.dvx = (-c.vy / sp) * side * 170;
          p.dvy = (c.vx / sp) * side * 170;
          if (Math.random() < 0.35) say(p, pick(['Ehi!', 'Attento!', 'Guarda dove vai!', 'Ma sei matto?!']));
        }
      }
    }
    if (p.down > 0) continue;
    movePed(p, dt);
  }
}

export function init() {
  // ---------------- pedoni ----------------
  SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#ff6b81', '#2ecc71', '#fd79a8'];
  HAIRS = ['#2d1b0e', '#5a3825', '#111111', '#c49a6c', '#e0c080', '#7f8c8d', '#a0522d'];
  pedSolid = t => t === BUILD || t === WATER || t === OUT;
}
