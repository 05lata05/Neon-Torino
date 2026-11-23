// Missions: delivery, street race, taxi, heist.
import { num, t } from '../i18n/index.js';
import { MISSIONS } from '../config.js';
import { sfx } from '../audio/sfx.js';
import { gtime, mission, money, offerQueue, offers, peds, player, save, saveMoney, setMission, setMoney } from '../core/state.js';
import { pick } from '../core/util.js';
import { makePed } from '../entities/peds.js';
import { addHeat, nearestNode } from '../entities/police.js';
import { pickEdge } from '../entities/traffic.js';
import { clearPax } from '../ui/map.js';
import { bigMsg, say, toast } from '../world/effects.js';
import { BUILD, OUT, SPAWN, WATER, edges, tileAtPx } from '../world/map.js';

export let MT, spotEdges, spotW, spotTot;

export function randomSpot(fx, fy, minD, maxD) {
  for (let i = 0; i < 700; i++) {
    const e = pickEdge(spotEdges, spotW, spotTot),
      l = Math.random() < 0.5 ? e.sideR : e.sideL;
    if (l.length < 2) continue;
    const j = 1 + Math.floor(Math.random() * (l.length - 1)),
      a = l[j - 1],
      b = l[j],
      t = 0.2 + Math.random() * 0.6,
      x = a[0] + (b[0] - a[0]) * t,
      y = a[1] + (b[1] - a[1]) * t;
    const tt = tileAtPx(x, y);
    if (tt === BUILD || tt === OUT || tt === WATER) continue;
    const d = Math.hypot(x - fx, y - fy);
    if (d >= minD && d <= maxD) return [x, y];
  }
  return [SPAWN.x, SPAWN.y];
}
export function newOffer(type) {
  const [x, y] = randomSpot(player.x, player.y, 600, 3500);
  offers.push({ type, x, y, warn: 0, mesh: null });
}
export function startMission(o) {
  if ((o.type === 'race' || o.type === 'taxi') && !player.car) {
    if (o.warn <= 0) {
      toast(o.type === 'taxi' ? t('mission.needCarTaxi') : t('mission.needCarRace'));
      o.warn = 3;
    }
    return;
  }
  offers.splice(offers.indexOf(o), 1);
  if (o.type === 'delivery') {
    const a = randomSpot(o.x, o.y, 1200, 2600),
      b = randomSpot(a[0], a[1], 2000, 4000);
    const d = Math.hypot(a[0] - o.x, a[1] - o.y) + Math.hypot(b[0] - a[0], b[1] - a[1]);
    setMission({
      type: 'delivery',
      steps: [
        { x: a[0], y: a[1], label: 'mission.delivery.pickup' },
        { x: b[0], y: b[1], label: 'mission.delivery.dropoff' },
      ],
      idx: 0,
      time: d / MISSIONS.delivery.speed + MISSIONS.delivery.margin,
      reward: Math.round((MISSIONS.delivery.rewardBase + d * MISSIONS.delivery.rewardPerUnit) / 10) * 10,
    });
    bigMsg(t('mission.delivery.title'), t('mission.delivery.intro'), MT.delivery.col, 3.6);
  } else if (o.type === 'race') {
    let n = nearestNode(player.x, player.y),
      prevE = null,
      d = 0;
    const steps = [];
    for (let i = 0; i < 7; i++) {
      let hops = 3 + Math.floor(Math.random() * 3);
      while (hops-- > 0) {
        const opts = n.edges.filter(f => f !== prevE && f.cls !== 'V'),
          f = opts.length ? pick(opts) : prevE || n.edges[0];
        if (!f) break;
        d += f.len;
        prevE = f;
        n = f.a === n ? f.b : f.a;
      }
      steps.push({ x: n.x, y: n.y, label: 'mission.race.checkpoint', vars: { i: i + 1, n: 7 } });
    }
    setMission({ type: 'race', steps, idx: 0, time: d / MISSIONS.race.speed + MISSIONS.race.margin, reward: MISSIONS.race.reward });
    bigMsg(t('mission.race.title'), t('mission.race.intro'), MT.race.col, 3.6);
  } else if (o.type === 'taxi') {
    const a = randomSpot(o.x, o.y, 600, 1800),
      b = randomSpot(a[0], a[1], 1800, 3600);
    const d = Math.hypot(a[0] - o.x, a[1] - o.y) + Math.hypot(b[0] - a[0], b[1] - a[1]);
    const pax = makePed(a[0], a[1]);
    pax.wait = true;
    pax.keep = true;
    peds.push(pax);
    setMission({
      type: 'taxi',
      steps: [
        { x: a[0], y: a[1], label: 'mission.taxi.reach' },
        { x: b[0], y: b[1], label: 'mission.taxi.drop' },
      ],
      idx: 0,
      time: d / MISSIONS.taxi.speed + MISSIONS.taxi.margin,
      reward: Math.round((MISSIONS.taxi.rewardBase + d * MISSIONS.taxi.rewardPerUnit) / 10) * 10,
      pax,
      car: null,
      hp0: 0,
    });
    bigMsg(t('mission.taxi.title'), t('mission.taxi.intro'), MT.taxi.col, 3.6);
  } else {
    setMission({ type: 'heist', steps: [], idx: 0, time: 0, reward: MISSIONS.heist.reward });
    addHeat(MISSIONS.heist.heat);
    bigMsg(t('mission.heist.title'), t('mission.heist.intro'), MT.heist.col, 3.6);
  }
}
export function completeMission() {
  const r = mission.reward,
    ty = mission.type;
  clearPax();
  setMoney(money + r);
  save.done++;
  saveMoney();
  sfx.win();
  bigMsg(t('mission.done'), '+€' + r + (mission.tipNote || ''), '#ffd32a', 3.2);
  setMission(null);
  offerQueue.push({ type: ty, t: 4 });
}
export function failMission(reason) {
  const ty = mission.type;
  clearPax();
  sfx.fail();
  bigMsg(t('mission.failed'), reason, '#ff4d4d', 3);
  setMission(null);
  offerQueue.push({ type: ty, t: 4 });
}
export function updateMission(dt) {
  for (let i = offerQueue.length - 1; i >= 0; i--) {
    offerQueue[i].t -= dt;
    if (offerQueue[i].t <= 0) {
      newOffer(offerQueue[i].type);
      offerQueue.splice(i, 1);
    }
  }
  for (const o of offers) {
    if (o.warn > 0) o.warn -= dt;
    if (!mission && Math.hypot(o.x - player.x, o.y - player.y) < 30) {
      startMission(o);
      break;
    }
  }
  if (!mission || mission.type === 'heist') return;
  const m = mission;
  m.time -= dt;
  if (m.time <= 0) {
    failMission(t('mission.timeUp'));
    return;
  }
  if (m.type === 'taxi' && m.idx === 1 && player.car !== m.car) {
    failMission(t('mission.taxi.left'));
    return;
  }
  const s = m.steps[m.idx],
    rad = m.type === 'race' ? 55 : m.type === 'taxi' ? 50 : 34;
  if (Math.hypot(s.x - player.x, s.y - player.y) < rad && (m.type !== 'race' || player.car)) {
    if (m.type === 'taxi') {
      if (!player.car) return;
      if (Math.hypot(player.car.vx, player.car.vy) > 70) {
        if (!(m.warnT > gtime)) {
          toast(t('mission.taxi.stop'), 1.2);
          m.warnT = gtime + 1.5;
        }
        return;
      }
    }
    m.idx++;
    if (m.type === 'taxi' && m.idx === 1) {
      clearPax();
      m.car = player.car;
      m.hp0 = player.car.hp;
      say(player.car, pick(t('mission.taxi.lines')), 2.4);
      sfx.coin();
      return;
    }
    if (m.idx >= m.steps.length) {
      if (m.type === 'taxi') {
        const dmg = Math.max(0, m.hp0 - (m.car ? m.car.hp : 0)),
          pen = Math.round((dmg * MISSIONS.taxi.penaltyPerDamage) / 10) * 10;
        m.reward = Math.max(MISSIONS.taxi.rewardMin, m.reward - pen);
        m.tipNote = pen > 0 ? t('mission.taxi.penalty', { n: pen }) : t('mission.taxi.fullTip');
      }
      completeMission();
      return;
    }
    if (m.type === 'delivery') {
      toast(t('mission.delivery.picked'));
      sfx.coin();
    } else {
      m.time += MISSIONS.race.bonusCheckpoint;
      toast(t('mission.race.bonus', { s: num(MISSIONS.race.bonusCheckpoint) }), 1.2);
      sfx.coin();
    }
  }
}

export function init() {
  // ---------------- missions ----------------
  MT = {
    delivery: { name: 'mission.delivery', col: '#ffd32a', ic: 'C' },
    race: { name: 'mission.race', col: '#3ae374', ic: 'R' },
    heist: { name: 'mission.heist', col: '#ff4d6d', ic: '€' },
    taxi: { name: 'mission.taxi', col: '#ff9f43', ic: 'T' },
  };
  spotEdges = edges.filter(e => e.cls === 'R' || e.cls === 'T' || e.cls === 'S');
  spotW = spotEdges.map(e => e.len);
  spotTot = spotW.reduce((a, b) => a + b, 0);
}
