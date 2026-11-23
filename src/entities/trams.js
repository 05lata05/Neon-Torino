// Tram GTT sui binari veri: linee, fermate, pensiline, guida e collisioni.
import * as THREE from 'three';
import { AC, sfx, tone } from '../audio/sfx.js';
import { camera, scene } from '../core/render.js';
import { cars, gtime, peds, player, setShake, shake, state } from '../core/state.js';
import { STD, canvasTex, clamp, mkCv, rand } from '../core/util.js';
import { pushCar } from './collisions.js';
import { tryMovePed } from './peds.js';
import { circles, damage } from './vehicles.js';
import { inst } from '../world/city.js';
import { say, sparks } from '../world/effects.js';
import { MS, flatMesh, miniCv, ribbon } from '../world/ground.js';
import { BUILD, DATA, PB, brnd, inPB, nearestEdge, offsetLine, sigGreen, signals, tileAtPx, toW } from '../world/map.js';

export let trams, tramRoutes, TRAM_L, TRAM_W, tramWinM;

export function tramPosAt(R, s) {
  s = clamp(s, 0, R.len);
  let lo = 0,
    hi = R.cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (R.cum[m] <= s) lo = m;
    else hi = m;
  }
  const a = R.pts[lo],
    b = R.pts[hi],
    L = R.cum[hi] - R.cum[lo] || 1,
    t = (s - R.cum[lo]) / L;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
export function placeTram(t) {
  for (let k = 0; k < 2; k++) {
    const sc = t.s - TRAM_L / 2 - k * (TRAM_L + 2),
      a = tramPosAt(t.R, sc + TRAM_L / 2),
      b = tramPosAt(t.R, sc - TRAM_L / 2),
      S = t.secs[k];
    S.x = (a[0] + b[0]) / 2;
    S.y = (a[1] + b[1]) / 2;
    S.a = Math.atan2(a[1] - b[1], a[0] - b[0]);
    S.g.position.set(S.x, 0, S.y);
    S.g.rotation.y = -S.a;
  }
}
export function updateTrams(dt) {
  for (const t of trams) {
    const R = t.R;
    let target = 130;
    if (t.dwell > 0) {
      t.dwell -= dt;
      target = 0;
    } else {
      const ns = R.stops.find(s => s > t.lastStop + 20 && s > t.s - 3);
      if (ns !== undefined) {
        const d = ns - t.s;
        if (d < 3 && t.v < 25) {
          t.dwell = rand(5, 8);
          t.lastStop = ns;
          target = 0;
        } else target = Math.min(target, Math.sqrt(Math.max(0, d) * 2 * 60) + 8);
      }
    }
    for (const q of R.sigs) {
      const d = q.s - 34 - t.s;
      if (d < -4) continue;
      if (d > 260) break;
      const p0 = tramPosAt(R, q.s - 6),
        p1 = tramPosAt(R, q.s + 6),
        sg = sigGreen(q.n, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
      if (sg === 2 || (sg === 1 && d > 30)) target = Math.min(target, Math.sqrt(Math.max(0, d) * 2 * 70));
      break;
    }
    const f = t.secs[0],
      fx = Math.cos(f.a),
      fy = Math.sin(f.a),
      hx = f.x + (fx * TRAM_L) / 2,
      hy = f.y + (fy * TRAM_L) / 2;
    let ob = 999;
    const chk = (x, y, r) => {
      const dx = x - hx,
        dy = y - hy,
        al = dx * fx + dy * fy;
      if (al < -6 || al > 170) return;
      if (Math.abs(-dx * fy + dy * fx) < TRAM_W / 2 + r) ob = Math.min(ob, al - r);
    };
    for (const c of cars) if (Math.abs(c.x - hx) < 200 && Math.abs(c.y - hy) < 200) chk(c.x, c.y, c.d.wid * 0.55);
    if (!player.car && state === 'play') chk(player.x, player.y, 5);
    for (const p of peds) if (p.down <= 0 && Math.abs(p.x - hx) < 180 && Math.abs(p.y - hy) < 180) chk(p.x, p.y, 4);
    if (ob < 999) {
      target = Math.min(target, Math.max(0, (ob - 14) * 1.5));
      if (ob < 110 && t.v > 15 && !(t.bellT > gtime)) {
        t.bellT = gtime + 2.5;
        if (AC && Math.hypot(hx - camera.position.x, hy - camera.position.z) < 700) {
          tone(1320, 0.5, 'triangle', 0.09);
          tone(1320, 0.5, 'triangle', 0.09, 0.28);
        }
      }
    }
    if (t.v < target) t.v = Math.min(target, t.v + 42 * dt);
    else t.v = Math.max(target, t.v - (ob < 45 ? 260 : 110) * dt);
    t.s += t.v * dt;
    if (t.s > R.len - 5) {
      t.s = 130;
      t.v = 60;
      t.lastStop = -1e9;
    }
    placeTram(t);
    // collisioni: il tram non si sposta, sposta tutto il resto
    for (const S of t.secs) {
      const cs = Math.cos(S.a),
        sn = Math.sin(S.a),
        tvx = cs * t.v,
        tvy = sn * t.v;
      const sep = (ex, ey, r) => {
        const lf = ex * cs + ey * sn,
          ll = -ex * sn + ey * cs,
          ox = TRAM_L / 2 + r - Math.abs(lf),
          oy = TRAM_W / 2 + r - Math.abs(ll);
        if (ox <= 0 || oy <= 0) return null;
        if (oy < ox) {
          const g = ll >= 0 ? 1 : -1;
          return [-sn * g, cs * g, oy];
        }
        const g = lf >= 0 ? 1 : -1;
        return [cs * g, sn * g, ox];
      };
      for (const c of cars) {
        const dx = c.x - S.x,
          dy = c.y - S.y;
        if (dx * dx + dy * dy > 8100) continue;
        const r = c.d.wid / 2 + 1;
        for (const p of circles(c)) {
          const h = sep(p[0] - S.x, p[1] - S.y, r);
          if (!h) continue;
          const [nx, ny, ov] = h;
          pushCar(c, nx * ov, ny * ov);
          const rv = (c.vx - tvx) * nx + (c.vy - tvy) * ny;
          if (rv < 0) {
            c.vx -= nx * rv * 1.4;
            c.vy -= ny * rv * 1.4;
            if (-rv > 60 && !(c.tramHit > gtime)) {
              c.tramHit = gtime + 0.4;
              damage(c, -rv * 0.08);
              sparks(p[0], p[1], -rv);
              if (c === player.car) {
                setShake(Math.max(shake, Math.min(9, -rv / 35)));
                sfx.crash(-rv);
              }
            }
          }
        }
      }
      if (!player.car) {
        const h = sep(player.x - S.x, player.y - S.y, 4);
        if (h) {
          tryMovePed(player, h[0] * h[2], h[1] * h[2]);
          if (t.v > 40 && player.stun <= 0) {
            player.stun = 1;
            say(player, 'Ahi!', 1.2);
            setShake(Math.max(shake, 5));
          }
        }
      }
      for (const p of peds) {
        if (Math.abs(p.x - S.x) > 60 || Math.abs(p.y - S.y) > 60) continue;
        const h = sep(p.x - S.x, p.y - S.y, 4);
        if (h) {
          tryMovePed(p, h[0] * h[2], h[1] * h[2]);
          if (t.v > 40 && p.down <= 0) {
            p.down = 2.2;
            p.hitFrom = [S.x, S.y];
          }
        }
      }
    }
  }
}

export function init() {
  // ---------------- tram GTT sui binari veri (OSM): linee 4 e 10 ----------------
  trams = [];
  tramRoutes = [];
  TRAM_L = 52;
  TRAM_W = 19;
  tramWinM = new THREE.MeshStandardMaterial({
    color: '#3a4c60',
    roughness: 0.15,
    metalness: 0.5,
    emissive: new THREE.Color('#ffe2a8'),
    emissiveIntensity: 0,
  });
  {
    const TW = (DATA.TW || []).map(w => w.map(toW));
    const bed = [],
      rails = [],
      wires = [],
      poles = [],
      arms = [];
    const samp = [];
    for (const w of TW)
      for (let i = 0; i + 1 < w.length; i++) {
        const a = w[i],
          b = w[i + 1],
          L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 0; s < L; s += 12) samp.push([a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L]);
      }
    const nearTrack = (x, y, r) => {
      for (const p of samp) if (Math.abs(p[0] - x) < r && Math.abs(p[1] - y) < r && Math.hypot(p[0] - x, p[1] - y) < r) return true;
      return false;
    };
    const EXT = 1600,
      inExt = (x, y) => x > PB.x0 - EXT && x < PB.x1 + EXT && y > PB.y0 - EXT && y < PB.y1 + EXT;
    for (const w of TW) {
      ribbon(bed, w, 22, 0.34, true);
      for (const o of [-7.2, 7.2]) ribbon(rails, offsetLine(w, o), 1.4, 0.42, false);
      let acc = 40;
      for (let i = 0; i + 1 < w.length; i++) {
        const a = w[i],
          b = w[i + 1],
          L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.5) continue;
        const ux = (b[0] - a[0]) / L,
          uy = (b[1] - a[1]) / L;
        if (inExt(a[0], a[1])) wires.push(a[0], 33, a[1], b[0], 33, b[1]);
        while (acc < L) {
          const x = a[0] + ux * acc,
            y = a[1] + uy * acc;
          acc += 150;
          if (!inExt(x, y)) continue;
          const sd = nearTrack(x - uy * 20, y + ux * 20, 10) ? -1 : 1,
            px = x - uy * 20 * sd,
            py = y + ux * 20 * sd;
          if (tileAtPx(px, py) === BUILD) continue;
          poles.push([px, 19, py]);
          arms.push([(px + x) / 2, 35, (py + y) / 2, 21, 0.8, 0.8, 0, -Math.atan2(ux * sd, -uy * sd), 0]);
        }
        acc -= L;
      }
    }
    if (bed.length) {
      flatMesh(bed, '#5e5c58', 0.95);
      const rm = flatMesh(rails, '#b3b7bd', 0.3);
      rm.material.metalness = 0.75;
    }
    if (wires.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
      scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#24262a' })));
    }
    inst(new THREE.CylinderGeometry(0.9, 1.2, 38, 6), STD('#4a5059', { metalness: 0.5, roughness: 0.5 }), poles, true);
    inst(new THREE.BoxGeometry(1, 1, 1), STD('#4a5059', { metalness: 0.5 }), arms, false);
    {
      const g = miniCv.getContext('2d');
      g.strokeStyle = 'rgba(255,140,40,0.9)';
      g.lineWidth = 1.3;
      for (const w of TW) {
        g.beginPath();
        g.moveTo(w[0][0] * MS, w[0][1] * MS);
        for (const p of w) g.lineTo(p[0] * MS, p[1] * MS);
        g.stroke();
      }
    }
    // percorsi delle linee (tratto dentro la zona estesa)
    const clipR = pts => {
      const M = 1000,
        inE = p => p[0] > PB.x0 - M && p[0] < PB.x1 + M && p[1] > PB.y0 - M && p[1] < PB.y1 + M;
      let best = [],
        cur = [];
      for (const p of pts) {
        if (inE(p)) cur.push(p);
        else {
          if (cur.length > best.length) best = cur;
          cur = [];
        }
      }
      return cur.length > best.length ? cur : best;
    };
    for (const [line, raw] of DATA.TR || []) {
      const pts = clipR(raw.map(toW));
      if (pts.length < 2) continue;
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const R = { line, pts, cum, len: cum[cum.length - 1], stops: [], sigs: [] };
      if (R.len < 600) continue;
      R.proj = (x, y) => {
        let bd = 1e9,
          bs = 0;
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i],
            b = pts[i + 1],
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            L2 = dx * dx + dy * dy || 1;
          const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1),
            d = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
          if (d < bd) {
            bd = d;
            bs = cum[i] + t * Math.sqrt(L2);
          }
        }
        return [bd, bs];
      };
      for (const s of DATA.TS || []) {
        const w = toW(s),
          [d, ss] = R.proj(w[0], w[1]);
        if (d < 40) R.stops.push(ss);
      }
      for (const n of signals) {
        const [d, ss] = R.proj(n.x, n.y);
        if (d < 70) R.sigs.push({ s: ss, n });
      }
      R.stops.sort((a, b) => a - b);
      R.sigs.sort((a, b) => a.s - b.s);
      tramRoutes.push(R);
    }
    // fermate: banchine del tram tra i binari, pali e pensiline dei bus sul marciapiede
    const plat = [],
      shRoof = [],
      shPanel = [],
      shPost = [],
      sPole = [],
      sBoard = [],
      sBoardT = [];
    const shelter = (x, y, a, nx, ny) => {
      shRoof.push([x, 17, y, 26, 1, 10, 0, -a, 0]);
      shPanel.push([x + nx * 4.5, 9, y + ny * 4.5, 26, 12, 0.6, 0, -a, 0]);
      const ux = Math.cos(a),
        uy = Math.sin(a);
      for (const k of [-12, 12]) shPost.push([x + ux * k + nx * 4.5, 8.5, y + uy * k + ny * 4.5, 0.8, 17, 0.8]);
    };
    for (const s of DATA.TS || []) {
      const [x, y] = toW(s);
      if (!inPB(x, y)) continue;
      let best = null,
        bd = 60;
      for (const R of tramRoutes) {
        const [d, ss] = R.proj(x, y);
        if (d < bd) {
          bd = d;
          best = [R, ss];
        }
      }
      if (!best) continue;
      const [R, ss] = best,
        p = tramPosAt(R, ss),
        p0 = tramPosAt(R, ss - 6),
        p1 = tramPosAt(R, ss + 6),
        a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      let nx = -Math.sin(a),
        ny = Math.cos(a);
      if (!nearTrack(p[0] + nx * 64, p[1] + ny * 64, 22) && nearTrack(p[0] - nx * 64, p[1] - ny * 64, 22)) {
        nx = -nx;
        ny = -ny;
      }
      const cx = p[0] + nx * 16,
        cy = p[1] + ny * 16;
      plat.push([cx, 1.1, cy, 80, 2.2, 10, 0, -a, 0]);
      shelter(cx + nx * 1, cy + ny * 1, a, nx, ny);
      sPole.push([cx - Math.cos(a) * 30, 10, cy - Math.sin(a) * 30]);
      sBoardT.push([cx - Math.cos(a) * 30, 21, cy - Math.sin(a) * 30, 0.6, 6, 6, 0, -a, 0]);
    }
    for (const s of DATA.BS || []) {
      const [x0, y0] = toW(s);
      if (!inPB(x0, y0)) continue;
      const ne = nearestEdge(x0, y0, 120);
      if (!ne) continue;
      const e = ne.e,
        a0 = e.pts[ne.j],
        b0 = e.pts[ne.j + 1],
        dx = b0[0] - a0[0],
        dy = b0[1] - a0[1],
        L = Math.hypot(dx, dy) || 1;
      const sd = (x0 - ne.px) * -dy + (y0 - ne.py) * dx >= 0 ? 1 : -1,
        nx = (-dy / L) * sd,
        ny = (dx / L) * sd,
        a = Math.atan2(dy, dx),
        px = ne.px + nx * (e.w / 2 + 4),
        py = ne.py + ny * (e.w / 2 + 4);
      if (tileAtPx(px, py) === BUILD) continue;
      sPole.push([px, 10, py]);
      sBoard.push([px, 21, py, 0.6, 6, 6, 0, -a, 0]);
      const qx = ne.px + nx * (e.w / 2 + 12),
        qy = ne.py + ny * (e.w / 2 + 12);
      if (brnd() < 0.45 && tileAtPx(qx + nx * 6, qy + ny * 6) !== BUILD && tileAtPx(qx + Math.cos(a) * 14, qy + Math.sin(a) * 14) !== BUILD)
        shelter(qx, qy, a, nx, ny);
    }
    const signTex = txt => {
      const [c, g] = mkCv(64, 64);
      g.fillStyle = '#f5f5f2';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#f07f1f';
      g.fillRect(0, 0, 64, 20);
      g.fillStyle = '#fff';
      g.font = 'bold 13px system-ui,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('FERMATA', 32, 11);
      g.fillStyle = '#1d2433';
      g.font = 'bold 20px system-ui,sans-serif';
      g.fillText(txt, 32, 42);
      g.strokeStyle = '#1d2433';
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, 61, 61);
      return canvasTex(c);
    };
    inst(new THREE.BoxGeometry(1, 1, 1), STD('#c2bbae'), plat, false);
    inst(new THREE.BoxGeometry(1, 1, 1), STD('#3a414a', { metalness: 0.4 }), shRoof, true);
    inst(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#a8c4d8', transparent: true, opacity: 0.45, roughness: 0.1 }),
      shPanel,
      false,
    );
    inst(new THREE.BoxGeometry(1, 1, 1), STD('#5b636d', { metalness: 0.5 }), shPost, false);
    inst(new THREE.CylinderGeometry(0.6, 0.6, 20, 5), STD('#6b737d', { metalness: 0.5 }), sPole, false);
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: signTex('BUS'), roughness: 0.6 }), sBoard, false);
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: signTex('TRAM'), roughness: 0.6 }), sBoardT, false);
    // i tram: due casse arancioni articolate, pantografo, numero di linea
    const bodyM = STD('#ff8a24', { roughness: 0.45, metalness: 0.05, emissive: new THREE.Color('#ff7a10'), emissiveIntensity: 0.12 }),
      creamM = STD('#efe7d4', { roughness: 0.6 }),
      darkM = STD('#2a2d33'),
      litM = new THREE.MeshBasicMaterial({ color: '#fff4cc' });
    const G = {
      body: new THREE.BoxGeometry(TRAM_L, 10, TRAM_W).translate(0, 8, 0),
      win: new THREE.BoxGeometry(TRAM_L - 5, 5.2, TRAM_W + 0.3).translate(0, 14.6, 0),
      band: new THREE.BoxGeometry(TRAM_L + 0.1, 1.3, TRAM_W + 0.36).translate(0, 11.4, 0),
      roof: new THREE.BoxGeometry(TRAM_L - 2, 2, TRAM_W - 1).translate(0, 18.2, 0),
      skirt: new THREE.BoxGeometry(TRAM_L - 6, 3, TRAM_W - 1.6).translate(0, 1.8, 0),
      pant: new THREE.BoxGeometry(1, 7, 1).translate(4, 22.5, 0),
      pbar: new THREE.BoxGeometry(2, 0.6, 13).translate(4, 26, 0),
      front: new THREE.BoxGeometry(0.5, 6.5, TRAM_W - 3).translate(TRAM_L / 2 + 0.1, 14, 0),
      lamps: new THREE.BoxGeometry(0.6, 1.4, TRAM_W - 5).translate(TRAM_L / 2 + 0.2, 6, 0),
    };
    const lineTex = {};
    const lineM = l => {
      if (lineTex[l]) return lineTex[l];
      const [c, g] = mkCv(128, 32);
      g.fillStyle = '#111';
      g.fillRect(0, 0, 128, 32);
      g.fillStyle = '#ffb020';
      g.font = 'bold 24px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(l + '  GTT', 64, 17);
      return (lineTex[l] = new THREE.MeshBasicMaterial({ map: canvasTex(c) }));
    };
    const mkSec = (front, line) => {
      const g = new THREE.Group();
      for (const [k, m] of [
        ['body', bodyM],
        ['win', tramWinM],
        ['band', creamM],
        ['roof', creamM],
        ['skirt', darkM],
      ]) {
        const me = new THREE.Mesh(G[k], m);
        me.castShadow = k === 'body';
        g.add(me);
      }
      if (front) {
        g.add(new THREE.Mesh(G.pant, darkM));
        g.add(new THREE.Mesh(G.pbar, darkM));
        g.add(new THREE.Mesh(G.front, tramWinM));
        g.add(new THREE.Mesh(G.lamps, litM));
        const sgn = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.6).rotateY(Math.PI / 2), lineM(line));
        sgn.position.set(TRAM_L / 2 + 0.4, 18.4, 0);
        g.add(sgn);
      }
      scene.add(g);
      return { g, x: 0, y: 0, a: 0 };
    };
    for (const R of tramRoutes) {
      const n = Math.max(1, Math.round(R.len / 5200));
      for (let i = 0; i < n; i++) {
        const t = {
          R,
          s: 130 + ((i + Math.random() * 0.85) * (R.len - 260)) / n,
          v: 0,
          dwell: 0,
          lastStop: -1e9,
          bellT: 0,
          secs: [mkSec(true, R.line), mkSec(false, R.line)],
        };
        trams.push(t);
      }
    }
  }
  for (const t of trams) placeTram(t);
}
