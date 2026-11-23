// Urti tra auto.
import { sfx } from '../audio/sfx.js';
import { cars, player, setShake, shake } from '../core/state.js';
import { pick } from '../core/util.js';
import { addHeat, copNear, makeCop } from './police.js';
import { blockedN, circles, damage } from './vehicles.js';
import { say, sparks } from '../world/effects.js';

// ---------------- collisioni auto ----------------
export function pushCar(c, dx, dy) {
  const cur = blockedN(c, c.x, c.y, c.a);
  if (blockedN(c, c.x + dx, c.y + dy, c.a) <= cur) {
    c.x += dx;
    c.y += dy;
  }
}
export function collideCars() {
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      if (dx * dx + dy * dy > 3600) continue;
      if (Math.abs((a.z || 0) - (b.z || 0)) > 12) continue;
      const ca = circles(a),
        cb = circles(b),
        ra = a.d.wid / 2 + 1,
        rb = b.d.wid / 2 + 1;
      let hitDone = false;
      for (const p of ca)
        for (const q of cb) {
          let ex = q[0] - p[0],
            ey = q[1] - p[1],
            d = Math.hypot(ex, ey);
          const md = ra + rb;
          if (d >= md) continue;
          if (d < 0.01) {
            ex = 1;
            ey = 0;
            d = 1;
          }
          const nx = ex / d,
            ny = ey / d,
            ov = md - d;
          const ma = a.d.len * a.d.wid * (a.d.mass || 1) * (a.wreck ? 1.5 : 1),
            mb = b.d.len * b.d.wid * (b.d.mass || 1) * (b.wreck ? 1.5 : 1),
            ta = mb / (ma + mb),
            tb = ma / (ma + mb);
          pushCar(a, -nx * ov * ta, -ny * ov * ta);
          pushCar(b, nx * ov * tb, ny * ov * tb);
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const J = -1.3 * rv;
            a.vx -= nx * J * ta;
            a.vy -= ny * J * ta;
            b.vx += nx * J * tb;
            b.vy += ny * J * tb;
            if (!hitDone && -rv > 60) {
              hitDone = true;
              const imp = -rv;
              damage(a, imp * 0.07);
              damage(b, imp * 0.07);
              sparks((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, imp);
              onCrash(a, b, imp);
            }
          }
        }
    }
  }
}
export function onCrash(a, b, imp) {
  const pc = player.car;
  if (!pc || (a !== pc && b !== pc)) return;
  const o = a === pc ? b : a;
  setShake(Math.max(shake, Math.min(8, imp / 40)));
  sfx.crash(imp);
  if (o.heatCd > 0) return;
  o.heatCd = 2.5;
  if (o.type === 'polizia' && (o.driver === 'npc' || o.driver === 'cop' || o.driver === 'idle')) {
    addHeat(1);
    if (o.driver !== 'cop') makeCop(o);
    say(o, 'Accosti subito!', 1.6);
  } else if (o.driver === 'npc') {
    if (Math.random() < 0.6) say(o, pick(['Ehi!!', 'La mia fiancata!', 'Assicurazione!', 'Ma dove guardi?!']), 1.6);
    if (imp > 140 && copNear(o.x, o.y, 400)) addHeat(1);
  }
}
