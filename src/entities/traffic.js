// Traffico: auto che seguono le strade, semafori, ostacoli, comparsa delle auto.
import { G } from '../core/game.js';
import { peds, player } from '../core/state.js';
import { angDiff, clamp, pick, rand } from '../core/util.js';
import { makePed } from './peds.js';
import { onScreen } from './spawn.js';
import { TRAM_L, trams } from './trams.js';
import { blockedN, carPhysics, makeCar } from './vehicles.js';
import { BUILD, CRUISE, OUT, ROAD, WATER, edgeOut, edges, sigGreen, tileAtPx } from '../world/map.js';

export let driveEdges, driveW, driveTot, walkEdges, walkW, walkTot;

// ---------------- traffico ----------------
export function lightState() {
  return 0;
}
export function canGo() {
  return true;
}
export function pickEdge(list, ws, tot) {
  let r = Math.random() * tot;
  for (let i = 0; i < list.length; i++) {
    r -= ws[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
export function setPath(c, e, dir, startI) {
  c.ai.e = e;
  c.ai.dir = dir;
  c.ai.path = dir > 0 ? e.fwd : e.rev;
  c.ai.i = startI;
  c.ai.cruise = CRUISE[e.cls] * c.ai.k;
}
export function nextEdge(c) {
  const ai = c.ai,
    e = ai.e,
    n = ai.dir > 0 ? e.b : e.a,
    pa = ai.path[ai.path.length - 2] || ai.path[0],
    pb = ai.path[ai.path.length - 1],
    ia = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
  const opts = [];
  for (const f of n.edges) {
    const d = edgeOut(n, f);
    if (!d) continue;
    if (f === e && f.a !== f.b) continue;
    const p = d > 0 ? f.fwd : f.rev;
    if (p.length < 2) continue;
    const oa = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]),
      turn = Math.abs(angDiff(oa, ia));
    opts.push([f, d, ({ P: 3, S: 2.5, T: 2, R: 1.2, V: 0.3 }[f.cls] || 1) * (turn < 0.5 ? 2.5 : turn < 2.3 ? 1 : 0.12)]);
  }
  if (!opts.length) {
    setPath(c, e, edgeOut(n, e) || -ai.dir, 1);
    return;
  }
  let tot = 0;
  for (const o of opts) tot += o[2];
  let r = Math.random() * tot,
    ch = opts[0];
  for (const o of opts) {
    r -= o[2];
    if (r <= 0) {
      ch = o;
      break;
    }
  }
  setPath(c, ch[0], ch[1], 1);
}
export function obstacleAhead(c) {
  const fx = Math.cos(c.a),
    fy = Math.sin(c.a),
    look = 110,
    hl = c.d.len / 2;
  let best = 999;
  for (const o of G.cars) {
    if (o === c) continue;
    const dx = o.x - c.x,
      dy = o.y - c.y;
    if (dx > look + 30 || dx < -look - 30 || dy > look + 30 || dy < -look - 30) continue;
    const al = dx * fx + dy * fy;
    if (al <= 0 || al > look + hl) continue;
    const lat = Math.abs(-dx * fy + dy * fx);
    const sa = Math.abs(Math.sin(o.a - c.a)),
      ca = Math.abs(Math.cos(o.a - c.a));
    if (lat < 10 + o.d.wid * 0.5 + sa * o.d.len * 0.5) {
      const g = al - hl - o.d.len * 0.5 * ca - o.d.wid * 0.5 * sa - 8;
      if (g < best) best = g;
    }
  }
  const chk = (x, y, rad) => {
    const dx = x - c.x,
      dy = y - c.y,
      al = dx * fx + dy * fy;
    if (al <= 0 || al > look + hl) return;
    if (Math.abs(-dx * fy + dy * fx) < rad) {
      const g = al - hl - rad;
      if (g < best) best = g;
    }
  };
  if (!player.car && G.state === 'play') chk(player.x, player.y, 14);
  for (const p of peds) if (tileAtPx(p.x, p.y) === ROAD) chk(p.x, p.y, 12);
  for (const t of trams)
    for (const S of t.secs) {
      const ox = Math.cos(S.a) * TRAM_L * 0.32,
        oy = Math.sin(S.a) * TRAM_L * 0.32;
      chk(S.x + ox, S.y + oy, 13);
      chk(S.x, S.y, 13);
      chk(S.x - ox, S.y - oy, 13);
    }
  return Math.max(0, best);
}
export function trafficAI(c, dt) {
  const ai = c.ai;
  let p = ai.path[ai.i];
  if (!p) {
    nextEdge(c);
    p = ai.path[ai.i] || ai.path[ai.path.length - 1];
  }
  let dist = Math.hypot(p[0] - c.x, p[1] - c.y);
  if (dist < 22) {
    ai.i++;
    if (ai.i >= ai.path.length) nextEdge(c);
    p = ai.path[ai.i] || ai.path[ai.path.length - 1];
    dist = Math.hypot(p[0] - c.x, p[1] - c.y);
  }
  {
    const q = ai.path[Math.max(0, ai.i - 1)],
      dx = p[0] - q[0],
      dy = p[1] - q[1],
      L2 = dx * dx + dy * dy || 1,
      t = clamp(((c.x - q[0]) * dx + (c.y - q[1]) * dy) / L2, 0, 1);
    if (Math.hypot(c.x - q[0] - t * dx, c.y - q[1] - t * dy) > 160) c.lost = true;
  }
  const want = Math.atan2(p[1] - c.y, p[0] - c.x),
    diff = angDiff(want, c.a),
    steer = clamp(diff * 2.6, -1, 1);
  const vf = c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
  let target = ai.cruise;
  const end = ai.path[ai.path.length - 1],
    de = Math.hypot(end[0] - c.x, end[1] - c.y);
  if (de < 100) target = Math.min(target, 75 + de * 1.1);
  {
    const sn = ai.dir > 0 ? ai.e.b : ai.e.a;
    if (sn.sig && de < sn.stop + 90 && de > sn.stop - 12) {
      const q = ai.path[ai.path.length - 2] || ai.path[0],
        sg = sigGreen(sn, Math.atan2(end[1] - q[1], end[0] - q[0]));
      if (sg === 2 || (sg === 1 && de > sn.stop + 14)) target = Math.min(target, Math.max(0, (de - sn.stop) * 1.8));
    }
  }
  if (Math.abs(diff) > 0.6) target = Math.min(target, 60);
  if (ai.ignore > 0) ai.ignore -= dt;
  else {
    const ob = obstacleAhead(c);
    if (ob < 900) target = Math.min(target, ob * 2.4);
  }
  if (vf < 4 && target < 4) {
    ai.wait += dt;
    if (ai.wait > 4) {
      ai.ignore = 1.4;
      ai.wait = 0;
    }
  } else ai.wait = 0;
  let thr = 0;
  if (target < 2) thr = vf > 1 ? -1 : 0;
  else if (vf < target - 6) thr = 1;
  else if (vf > target + 20) thr = -1;
  if (ai.rev > 0) {
    ai.rev -= dt;
    carPhysics(c, -1, ai.revS, false, dt);
    return;
  }
  if (thr > 0 && vf < 3) {
    ai.stk = (ai.stk || 0) + dt;
    if (ai.stk > 2.5) {
      ai.stk = 0;
      ai.rev = 1;
      ai.revS = diff > 0 ? -1 : 1;
      ai.tries = (ai.tries || 0) + 1;
      if (ai.tries > 3) c.lost = true;
    }
  } else ai.stk = 0;
  carPhysics(c, thr, steer, false, dt);
}
export function spawnTrafficCar(fx, fy, minD, maxD, allowVisible, forceType) {
  for (let tries = 0; tries < 25; tries++) {
    const e = pickEdge(driveEdges, driveW, driveTot);
    const dir = e.ow === 1 ? 1 : e.ow === -1 ? -1 : Math.random() < 0.5 ? 1 : -1,
      path = dir > 0 ? e.fwd : e.rev;
    if (path.length < 2) continue;
    const j = 1 + Math.floor(Math.random() * (path.length - 1)),
      a = path[j - 1],
      b = path[j],
      t = Math.random(),
      x = a[0] + (b[0] - a[0]) * t,
      y = a[1] + (b[1] - a[1]) * t,
      ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const d = Math.hypot(x - fx, y - fy);
    if (d < minD || d > maxD) continue;
    if (!allowVisible && onScreen(x, y, 80)) continue;
    if (G.cars.some(o => Math.abs(o.x - x) < 60 && Math.abs(o.y - y) < 60)) continue;
    const r = Math.random(),
      type =
        forceType ||
        ((e.cls === 'P' || e.cls === 'S') && Math.random() < (G.cars.filter(o => o.type === 'autobus').length < 3 ? 0.5 : 0.08)
          ? 'autobus'
          : r < 0.34
            ? 'utilitaria'
            : r < 0.6
              ? 'berlina'
              : r < 0.68
                ? 'taxi'
                : r < 0.8
                  ? 'furgone'
                  : r < 0.88
                    ? 'sportiva'
                    : 'polizia');
    const c = makeCar(type, x, y, ang);
    if (blockedN(c, x, y, ang) > 0) continue;
    c.driver = 'npc';
    c.ai = { k: rand(0.88, 1.1) * (type === 'autobus' ? 0.72 : 1), ignore: 0, wait: 0 };
    setPath(c, e, dir, j);
    const sp = c.ai.cruise * 0.6;
    c.vx = Math.cos(ang) * sp;
    c.vy = Math.sin(ang) * sp;
    G.cars.push(c);
    return c;
  }
  return null;
}
export function pedStart(p, e, side, dir, j) {
  p.we = e;
  p.wside = side;
  p.wdir = dir;
  p.wl =
    dir > 0
      ? side > 0
        ? e.sideR
        : e.sideL
      : side > 0
        ? e.sideRr || (e.sideRr = e.sideR.slice().reverse())
        : e.sideLr || (e.sideLr = e.sideL.slice().reverse());
  p.wi = j;
}
export function pedNext(p) {
  const e = p.we,
    n = p.wdir > 0 ? e.b : e.a,
    opts = n.edges.filter(f => f !== e && f.cls !== 'V'),
    f = opts.length ? pick(opts) : e;
  pedStart(p, f, Math.random() < 0.7 ? p.wside : -p.wside, f.a === n ? 1 : -1, 0);
}
export function spawnPed(fx, fy, minD, maxD, allowVisible) {
  for (let tries = 0; tries < 30; tries++) {
    const e = pickEdge(walkEdges, walkW, walkTot),
      side = Math.random() < 0.5 ? 1 : -1,
      dir = Math.random() < 0.5 ? 1 : -1,
      l = side > 0 ? e.sideR : e.sideL;
    if (l.length < 2) continue;
    const j = 1 + Math.floor(Math.random() * (l.length - 1)),
      a = l[j - 1],
      b = l[j],
      t = Math.random(),
      x = a[0] + (b[0] - a[0]) * t,
      y = a[1] + (b[1] - a[1]) * t;
    const d = Math.hypot(x - fx, y - fy);
    if (d < minD || d > maxD) continue;
    if (!allowVisible && onScreen(x, y, 40)) continue;
    const tt = tileAtPx(x, y);
    if (tt === BUILD || tt === OUT || tt === WATER) continue;
    const p = makePed(x, y);
    pedStart(p, e, side, dir, dir > 0 ? j : l.length - j);
    peds.push(p);
    return;
  }
}

export function init() {
  driveEdges = edges.filter(e => e.cls !== 'V');
  driveW = driveEdges.map(e => e.len * ({ P: 3, S: 2.2, T: 1.6, R: 1 }[e.cls] || 1));
  driveTot = driveW.reduce((a, b) => a + b, 0);
  walkEdges = edges.filter(e => e.cls !== 'V');
  walkW = walkEdges.map(e => e.len);
  walkTot = walkW.reduce((a, b) => a + b, 0);
}
