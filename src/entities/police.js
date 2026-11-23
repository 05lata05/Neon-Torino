// Police: chases, wanted level, arrests.
import { t } from '../i18n/index.js';
import { POLICE } from '../config.js';
import { sfx } from '../audio/sfx.js';
import {
  cars,
  mission,
  money,
  offerQueue,
  player,
  saveMoney,
  setBustT,
  setCars,
  setMission,
  setMoney,
  state,
  wanted,
} from '../core/state.js';
import { angDiff, clamp } from '../core/util.js';
import { heli } from './heli.js';
import { carPhysics } from './vehicles.js';
import { completeMission } from '../gameplay/missions.js';
import { updateCamera } from '../render/camera.js';
import { clearPax } from '../ui/map.js';
import { bigMsg, toast } from '../world/effects.js';
import { BUILD, SPAWN, nodes, tileAtPx } from '../world/map.js';

export let COPS_BY;

export function los(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0),
    n = Math.ceil(d / 18);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (tileAtPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) === BUILD) return false;
  }
  return true;
}
export function nearestNode(x, y) {
  let best = nodes[0],
    bd = 1e18;
  for (const n of nodes) {
    if (!n.edges.length) continue;
    const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}
export function astar(n0, n1) {
  const N = nodes.length,
    g = new Float64Array(N).fill(Infinity),
    f = new Float64Array(N).fill(Infinity),
    came = new Int32Array(N).fill(-1),
    cameE = new Array(N),
    inOpen = new Uint8Array(N),
    open = [n0.id];
  const hh = n => Math.hypot(n.x - n1.x, n.y - n1.y);
  g[n0.id] = 0;
  f[n0.id] = hh(n0);
  inOpen[n0.id] = 1;
  let it = 0;
  while (open.length && it++ < 30000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    inOpen[cur] = 0;
    if (cur === n1.id) break;
    const cn = nodes[cur];
    for (const e of cn.edges) {
      const nb = e.a === cn ? e.b : e.a,
        ng = g[cur] + e.len;
      if (ng < g[nb.id]) {
        g[nb.id] = ng;
        f[nb.id] = ng + hh(nb);
        came[nb.id] = cur;
        cameE[nb.id] = e;
        if (!inOpen[nb.id]) {
          open.push(nb.id);
          inOpen[nb.id] = 1;
        }
      }
    }
  }
  if (n0 !== n1 && came[n1.id] < 0) return null;
  const out = [];
  let c = n1.id;
  while (c !== n0.id) {
    out.push([c, cameE[c]]);
    c = came[c];
  }
  return out.reverse();
}
export function roadPath(x, y, tx, ty) {
  const n0 = nearestNode(x, y),
    n1 = nearestNode(tx, ty),
    pth = astar(n0, n1);
  const pts = [[n0.x, n0.y]];
  if (pth) {
    let prev = n0.id;
    for (const [nid, e] of pth) {
      const seq = e.a.id === prev ? e.pts : e.pts.slice().reverse();
      for (let i = 1; i < seq.length; i++) pts.push(seq[i]);
      prev = nid;
    }
  }
  pts.push([tx, ty]);
  const out = [];
  let px = x,
    py = y;
  for (const p of pts) {
    if (Math.hypot(p[0] - px, p[1] - py) > 40) {
      out.push(p);
      px = p[0];
      py = p[1];
    }
  }
  return out;
}
export function makeCop(c) {
  c.driver = 'cop';
  c.siren = true;
  c.ai = { path: [], repath: 0, stuck: 0, rev: 0, revSteer: 1 };
}
export function copNear(x, y, r) {
  for (const c of cars)
    if (!c.wreck && (c.driver === 'cop' || (c.type === 'police' && c.driver === 'npc')) && Math.hypot(c.x - x, c.y - y) < r) return true;
  return false;
}
export function addHeat(n) {
  if (state !== 'play') return;
  const before = wanted.level;
  wanted.level = Math.min(5, wanted.level + n);
  wanted.lost = 0;
  wanted.lastX = player.x;
  wanted.lastY = player.y;
  if (wanted.level > before) {
    wanted.flash = 1.2;
    sfx.heat();
    if (before === 0) toast(t('police.searching'));
  }
}
export function calmCops() {
  for (const c of cars)
    if (c.driver === 'cop') {
      c.driver = 'idle';
      c.siren = false;
      c.ai = null;
    }
}
export function copAI(c, dt) {
  const ai = c.ai,
    tg = player.car || player,
    tx = tg.x,
    ty = tg.y,
    dist = Math.hypot(tx - c.x, ty - c.y);
  let gx, gy;
  if (dist < 320 && los(c.x, c.y, tx, ty)) {
    gx = tx + (player.car ? player.car.vx * 0.3 : 0);
    gy = ty + (player.car ? player.car.vy * 0.3 : 0);
    ai.path.length = 0;
  } else {
    ai.repath -= dt;
    if (ai.repath <= 0 || !ai.path.length) {
      ai.path = roadPath(c.x, c.y, wanted.lastX, wanted.lastY);
      ai.repath = 1.2;
    }
    while (ai.path.length && Math.hypot(ai.path[0][0] - c.x, ai.path[0][1] - c.y) < 45) ai.path.shift();
    if (ai.path.length) {
      gx = ai.path[0][0];
      gy = ai.path[0][1];
    } else {
      gx = wanted.lastX;
      gy = wanted.lastY;
    }
  }
  const want = Math.atan2(gy - c.y, gx - c.x),
    diff = angDiff(want, c.a),
    sp = Math.hypot(c.vx, c.vy);
  let thr = 1,
    steer = clamp(diff * 2.4, -1, 1),
    hand = false;
  if (Math.abs(diff) > 1.2 && sp > 220) thr = -0.6;
  if (Math.abs(diff) > 1.3 && sp > 180) hand = true;
  if (Math.abs(diff) > 2.3 && sp < 60 && dist < 220) {
    thr = -1;
    steer = diff > 0 ? -1 : 1;
  }
  if (!player.car && dist < 58) thr = 0;
  if (Math.hypot(gx - c.x, gy - c.y) < 30 && dist > 320) thr = 0;
  if (ai.rev > 0) {
    ai.rev -= dt;
    thr = -1;
    steer = ai.revSteer;
    hand = false;
  } else {
    if (sp < 20 && thr > 0) ai.stuck += dt;
    else ai.stuck = Math.max(0, ai.stuck - dt);
    if (ai.stuck > 0.9) {
      ai.rev = 0.9;
      ai.revSteer = diff > 0 ? -1 : 1;
      ai.stuck = 0;
    }
  }
  carPhysics(c, thr, steer, hand, dt);
}
export function updateWanted(dt) {
  if (wanted.flash > 0) wanted.flash -= dt;
  if (wanted.level === 0) {
    wanted.bust = 0;
    return;
  }
  let seen = false;
  for (const c of cars) {
    if (c.driver !== 'cop') continue;
    if (Math.hypot(c.x - player.x, c.y - player.y) < 450 && los(c.x, c.y, player.x, player.y)) {
      seen = true;
      break;
    }
  }
  if (heli && heli.sees) seen = true;
  wanted.seen = seen;
  if (seen) {
    wanted.lost = 0;
    wanted.lastX = player.x;
    wanted.lastY = player.y;
  } else {
    wanted.lost += dt;
    if (wanted.lost > POLICE.loseBase + wanted.level * POLICE.losePerLevel) {
      wanted.level--;
      wanted.lost = 0;
      if (wanted.level === 0) {
        calmCops();
        if (mission && mission.type === 'heist') completeMission();
        else bigMsg(t('police.lost'), t('police.lostSub'), '#4da3ff', 2.5);
      } else toast(t('police.cooling'));
    }
  }
  const mySp = player.car ? Math.hypot(player.car.vx, player.car.vy) : player.moving ? 140 : 0;
  let near = false;
  const R = player.car ? 52 : 85;
  for (const c of cars)
    if (c.driver === 'cop' && Math.hypot(c.x - player.x, c.y - player.y) < R) {
      near = true;
      break;
    }
  if (near && mySp < 38) {
    wanted.bust += dt;
    if (wanted.bust > POLICE.bustSeconds) busted();
  } else wanted.bust = Math.max(0, wanted.bust - dt * 0.7);
}
export function busted() {
  const fine = Math.min(money, POLICE.fineBase + wanted.level * POLICE.finePerLevel);
  setMoney(money - fine);
  saveMoney();
  setBustT(3.2);
  bigMsg(t('police.busted'), fine > 0 ? t('police.fine', { n: fine }) : t('police.noFine'), '#4da3ff', 3.2);
  if (mission) {
    clearPax();
    offerQueue.push({ type: mission.type, t: 5 });
    setMission(null);
    toast(t('police.missionFailed'));
  }
  sfx.fail();
  wanted.level = 0;
  wanted.bust = 0;
}
export function respawnAfterBust() {
  if (player.car) {
    player.car.driver = null;
    player.car = null;
  }
  player.x = SPAWN.x;
  player.y = SPAWN.y;
  player.stun = 0;
  player.a = SPAWN.a;
  setCars(cars.filter(c => c.driver !== 'cop' && c.driver !== 'idle'));
  updateCamera(0, true);
}

export function init() {
  // ---------------- police ----------------
  COPS_BY = POLICE.carsPerLevel;
}
