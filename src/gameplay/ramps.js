// Rampe e salti con premio.
import { num, t } from '../i18n/index.js';
import { REWARDS } from '../config.js';
import * as THREE from 'three';
import { sfx } from '../audio/sfx.js';
import { scene } from '../core/render.js';
import { money, player, saveMoney, setMoney, setShake, shake } from '../core/state.js';
import { canvasTex } from '../core/util.js';
import { damage } from '../entities/vehicles.js';
import { bigMsg } from '../world/effects.js';
import { MS, miniCv } from '../world/ground.js';
import { PARK, areasD, polyArea, tileAtPx } from '../world/map.js';

export let ramps, rampTex, rampM;

export function wedgeGeo(L, Wd, Hh) {
  const g = new THREE.BoxGeometry(L, Hh, Wd).translate(0, Hh / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getX(i) < 0 && p.getY(i) > 0.01) p.setY(i, 0.01);
  g.computeVertexNormals();
  return g;
}
export function rampAt(c) {
  for (const r of ramps) {
    const dx = c.x - r.x,
      dy = c.y - r.y;
    if (dx > 60 || dx < -60 || dy > 60 || dy < -60) continue;
    const ca = Math.cos(r.a),
      sa = Math.sin(r.a),
      al = dx * ca + dy * sa,
      lat = -dx * sa + dy * ca;
    if (Math.abs(lat) > r.w / 2 + 4 || al < -r.len / 2 || al > r.len / 2) continue;
    const vf = c.vx * ca + c.vy * sa;
    if (vf < 40) continue;
    return { h: ((al + r.len / 2) / r.len) * r.h, r, vf };
  }
  return null;
}
export function landed(c, imp) {
  if (imp > 300) damage(c, (imp - 300) * 0.05);
  if (c === player.car) {
    setShake(Math.max(shake, Math.min(10, imp / 50)));
    sfx.land(imp);
    if (c.air > 0.55) {
      const r = Math.round((c.air * REWARDS.perSecondInAir) / 10) * 10;
      setMoney(money + r);
      saveMoney();
      bigMsg(t('reward.jump'), t('reward.jumpSub', { s: num(c.air, 1), n: r }), '#00e5ff', 2.2);
      sfx.stunt();
    }
  }
  c.air = 0;
}

export function init() {
  // ---------------- rampe e salti ----------------
  ramps = [];
  {
    const cand = areasD
      .filter(a => a.t === 'g')
      .map(a => ({ a, ar: polyArea(a.outer) }))
      .sort((p, q) => q.ar - p.ar);
    for (const { a, ar } of cand) {
      if (ramps.length >= 6 || ar < 50000) break;
      let cx = 0,
        cy = 0;
      for (const p of a.outer) {
        cx += p[0];
        cy += p[1];
      }
      cx /= a.outer.length;
      cy /= a.outer.length;
      if (tileAtPx(cx, cy) !== PARK) continue;
      let best = 0,
        ang = 0;
      for (let i = 0; i < a.outer.length; i++) {
        const p = a.outer[i],
          q = a.outer[(i + 1) % a.outer.length],
          L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L > best) {
          best = L;
          ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        }
      }
      ramps.push({ x: cx, y: cy, a: ang, len: 72, w: 46, h: 24 });
    }
  }
  rampTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffd23f';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1b1e24';
    for (let i = -64; i < 64; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 8, 0);
      g.lineTo(i + 72, 64);
      g.lineTo(i + 64, 64);
      g.closePath();
      g.fill();
    }
    return canvasTex(c, true);
  })();
  rampTex.repeat.set(3, 2);
  rampM = new THREE.MeshStandardMaterial({ map: rampTex, roughness: 0.6 });
  for (const r of ramps) {
    const m = new THREE.Mesh(wedgeGeo(r.len, r.w, r.h), rampM);
    m.position.set(r.x, 0, r.y);
    m.rotation.y = -r.a;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
  {
    const g = miniCv.getContext('2d');
    g.fillStyle = '#ff9f43';
    for (const r of ramps) {
      g.save();
      g.translate(r.x * MS, r.y * MS);
      g.rotate(r.a);
      g.fillRect((-r.len * MS) / 2, (-r.w * MS) / 2, r.len * MS, r.w * MS);
      g.restore();
    }
  }
}
