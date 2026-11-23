// Dati OSM: griglia di collisione, strade, edifici, grafo stradale, semafori, punto di partenza.
import { lightT } from '../core/state.js';
import { angDiff, clamp } from '../core/util.js';

export let DATA,
  CL,
  S5,
  OXm,
  OYm,
  T,
  WX,
  WY,
  GW,
  GH,
  WORLD,
  PB,
  OPEN,
  ROAD,
  BUILD,
  PARK,
  SAND,
  WATER,
  OUT,
  WALK,
  DIRS,
  grid,
  hgrid,
  tileAt,
  tileAtPx,
  heightAt,
  walkable,
  NEONS,
  PAL,
  toW,
  llToW,
  RW,
  CRUISE,
  roads,
  buildingsD,
  areasD,
  bs,
  brnd,
  buildings,
  nodes,
  nodeMap,
  edges,
  keyOf,
  inPB,
  EG,
  egW,
  egH,
  egrid,
  PIAZZA,
  CHIESA,
  STADIO,
  sp0,
  SPAWN,
  gs0,
  signals,
  CLW;

export function decPoly(s, q) {
  const pts = [];
  let i = 0,
    x = 0,
    y = 0;
  const num = () => {
    let r = 0,
      sh = 0,
      b;
    do {
      b = s.charCodeAt(i++) - 63;
      r |= (b & 31) << sh;
      sh += 5;
    } while (b >= 32);
    return r & 1 ? ~(r >> 1) : r >> 1;
  };
  while (i < s.length) {
    x += num();
    y += num();
    pts.push([x * q, y * q]);
  }
  return pts;
}
export function polyArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i],
      q = r[(i + 1) % r.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a / 2);
}
export function offsetLine(pts, off) {
  if (!off) return pts.map(p => [p[0], p[1]]);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i],
      a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    out.push([p[0] - dy * off, p[1] + dx * off]);
  }
  return out;
}
export function fillPoly(rings, fn) {
  let minY = 1e9,
    maxY = -1e9;
  for (const r of rings)
    for (const p of r) {
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
  const ty0 = Math.max(0, Math.floor(minY / T)),
    ty1 = Math.min(GH - 1, Math.floor(maxY / T));
  for (let ty = ty0; ty <= ty1; ty++) {
    const yc = (ty + 0.5) * T,
      xs = [];
    for (const r of rings)
      for (let i = 0, n = r.length; i < n; i++) {
        const a = r[i],
          b = r[(i + 1) % n];
        if (a[1] <= yc !== b[1] <= yc) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const tx0 = Math.max(0, Math.ceil(xs[k] / T - 0.5)),
        tx1 = Math.min(GW - 1, Math.floor(xs[k + 1] / T - 0.5));
      for (let tx = tx0; tx <= tx1; tx++) fn(ty * GW + tx);
    }
  }
}
export function stroke(pts, w, fn) {
  const r = w / 2;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = pts[i][0],
      ay = pts[i][1],
      bx = pts[i + 1][0],
      by = pts[i + 1][1];
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - r) / T)),
      x1 = Math.min(GW - 1, Math.floor((Math.max(ax, bx) + r) / T)),
      y0 = Math.max(0, Math.floor((Math.min(ay, by) - r) / T)),
      y1 = Math.min(GH - 1, Math.floor((Math.max(ay, by) + r) / T));
    const dx = bx - ax,
      dy = by - ay,
      L2 = dx * dx + dy * dy || 1;
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const px = (tx + 0.5) * T - ax,
          py = (ty + 0.5) * T - ay;
        let t = (px * dx + py * dy) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - t * dx,
          ey = py - t * dy;
        if (ex * ex + ey * ey <= r * r) fn(ty * GW + tx);
      }
  }
}
export function edgeOut(n, e) {
  if (e.a === n && e.ow !== -1) return 1;
  if (e.b === n && e.ow !== 1) return -1;
  return 0;
}
export function nearestEdge(x, y, maxD) {
  const cx = Math.floor(x / EG),
    cy = Math.floor(y / EG);
  let best = null,
    bd = maxD;
  for (let yy = cy - 1; yy <= cy + 1; yy++)
    for (let xx = cx - 1; xx <= cx + 1; xx++) {
      if (xx < 0 || yy < 0 || xx >= egW || yy >= egH) continue;
      for (const [e, j] of egrid[yy * egW + xx]) {
        const ax = e.pts[j][0],
          ay = e.pts[j][1],
          dx = e.pts[j + 1][0] - ax,
          dy = e.pts[j + 1][1] - ay,
          L2 = dx * dx + dy * dy || 1;
        let t = ((x - ax) * dx + (y - ay) * dy) / L2;
        t = clamp(t, 0, 1);
        const px = ax + t * dx,
          py = ay + t * dy,
          d = Math.hypot(x - px, y - py);
        if (d < bd) {
          bd = d;
          best = { e, j, t, px, py, d };
        }
      }
    }
  return best;
}
export function sidewalkNear(x, y) {
  const ne = nearestEdge(x, y, 600);
  if (!ne) return [x, y, 0];
  const e = ne.e,
    a = e.pts[ne.j],
    b = e.pts[ne.j + 1],
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy) || 1;
  const s = (x - ne.px) * -dy + (y - ne.py) * dx >= 0 ? 1 : -1,
    o = s * (e.w / 2 + 7.5);
  return [ne.px - (dy / L) * o, ne.py + (dx / L) * o, Math.atan2(dy, dx)];
}
export function sigGreen(n, inAng) {
  const t = (lightT + n.phase) % 16,
    d = Math.abs(angDiff(inAng, n.axis)),
    cross = d > Math.PI / 4 && d < (Math.PI * 3) / 4;
  if (!cross) return t < 6.5 ? 0 : t < 8 ? 1 : 2;
  return t < 8 ? 2 : t < 14.5 ? 0 : 1;
}

export async function init() {
  // ---------------- mondo: Torino, Santa Rita (dati OpenStreetMap) ----------------
  DATA = await (await fetch(new URL('../../data/torino.json', import.meta.url))).json();
  // la zona giocabile viene dai dati (clip, in metri): 1 m = 5 unità, 50 m di margine attorno
  CL = DATA.clip || [500, 400, 2300, 2050];
  S5 = 5;
  OXm = CL[0] - 50;
  OYm = CL[1] - 50;
  T = 10;
  WX = (CL[2] - OXm) * S5 + 250;
  WY = (CL[3] - OYm) * S5 + 250;
  GW = WX / T;
  GH = WY / T;
  WORLD = Math.max(WX, WY);
  PB = { x0: 250, y0: 250, x1: (CL[2] - OXm) * S5, y1: (CL[3] - OYm) * S5 };
  OPEN = 0;
  ROAD = 1;
  BUILD = 2;
  PARK = 3;
  SAND = 4;
  WATER = 5;
  OUT = 6;
  WALK = OPEN;
  DIRS = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  grid = new Uint8Array(GW * GH);
  hgrid = new Float32Array(GW * GH);
  tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= GW || ty >= GH ? OUT : grid[ty * GW + tx]);
  tileAtPx = (x, y) => tileAt(Math.floor(x / T), Math.floor(y / T));
  heightAt = (x, y) => {
    const tx = Math.floor(x / T),
      ty = Math.floor(y / T);
    return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? 0 : hgrid[ty * GW + tx];
  };
  walkable = t => t === OPEN || t === PARK || t === ROAD;
  NEONS = ['#ff2e88', '#00e5ff', '#b967ff', '#fffb96', '#05ffa1'];
  PAL = [
    '#e8c27e',
    '#e3b56c',
    '#efdcb5',
    '#e9d7bd',
    '#d9c3a5',
    '#e6cfb3',
    '#d8b08a',
    '#cfc6b8',
    '#bfb8ac',
    '#e2b8a0',
    '#d9a66e',
    '#c9a07a',
    '#efe6d4',
    '#b9785a',
    '#e6c9a8',
    '#d4cbbb',
  ];
  toW = p => [(p[0] - OXm) * S5, (p[1] - OYm) * S5];
  llToW = (lat, lon) => [((lon - DATA.origin[1]) * DATA.k[0] - OXm) * S5, ((DATA.origin[0] - lat) * DATA.k[1] - OYm) * S5];
  RW = { P: 15, S: 11, T: 9, R: 7.5, V: 5, X: 8 };
  CRUISE = { P: 205, S: 185, T: 165, R: 135, V: 90, X: 60 };
  roads = [];
  for (const r of DATA.R) {
    const cls = r[0];
    let wm = RW[cls];
    if (r[3] > 0 && cls !== 'X' && cls !== 'V') wm = clamp(r[3] * 3.3 + 1.5, RW[cls] * 0.6, 18);
    else if (cls === 'R' && r[1] !== 0) wm = 6;
    const raw = decPoly(r[4], 1);
    if (raw.length < 2) continue;
    roads.push({ cls, ow: r[1], name: r[2] >= 0 ? DATA.names[r[2]] : '', w: wm * S5, raw, pts: raw.map(toW) });
  }
  buildingsD = DATA.B.map(b => ({
    h: b[0],
    kind: b[1],
    outer: decPoly(b[2], DATA.qb).map(toW),
    holes: b.slice(3).map(s => decPoly(s, DATA.qb).map(toW)),
  })).filter(b => b.outer.length >= 3);
  areasD = DATA.A.map(a => ({
    t: a[0],
    outer: decPoly(a[1], DATA.qb).map(toW),
    holes: a.slice(2).map(s => decPoly(s, DATA.qb).map(toW)),
  })).filter(a => a.outer.length >= 3);
  for (let ty = 0; ty < GH; ty++)
    for (let tx = 0; tx < GW; tx++) {
      const x = (tx + 0.5) * T,
        y = (ty + 0.5) * T;
      if (x < PB.x0 || x > PB.x1 || y < PB.y0 || y > PB.y1) grid[ty * GW + tx] = OUT;
    }
  for (const a of areasD) {
    const v = a.t === 'w' ? WATER : a.t === 'g' || a.t === 'p' ? PARK : -1;
    if (v < 0) continue;
    fillPoly([a.outer, ...a.holes], i => {
      if (grid[i] !== OUT) grid[i] = v;
    });
  }
  for (const r of roads)
    stroke(r.pts, r.w, i => {
      if (grid[i] !== OUT) grid[i] = ROAD;
    });
  bs = 97531;
  brnd = () => {
    bs = (Math.imul(bs, 1664525) + 1013904223) >>> 0;
    return bs / 4294967296;
  };
  buildings = [];
  for (const b of buildingsD) {
    const am = polyArea(b.outer) / 25;
    let floors = b.h;
    if (!floors)
      floors = b.kind === 3 ? 1 : am < 60 ? 1 + Math.floor(brnd() * 2) : am < 220 ? 2 + Math.floor(brnd() * 4) : 5 + Math.floor(brnd() * 5);
    let h = floors >= 3 && b.kind === 0 ? 20 + (floors - 1) * 15 : floors * 15;
    if (b.kind === 3) h = Math.min(h, 15);
    if (b.kind === 1) h = Math.max(h, 95);
    if (b.kind === 2) h = Math.max(h, 125);
    const bb = Object.assign({}, b, {
      floors,
      h3: h,
      col: b.kind === 1 ? '#efe6d2' : b.kind === 2 ? '#c9ccd2' : PAL[Math.floor(brnd() * PAL.length)],
      style:
        b.kind === 1
          ? 'chiesa'
          : b.kind === 2
            ? 'stadio'
            : floors <= 2
              ? 'tapp'
              : floors <= 5 && brnd() < 0.45
                ? 'pers'
                : brnd() < 0.6
                  ? 'balc'
                  : 'tapp',
      neon: brnd() < 0.02 ? NEONS[Math.floor(brnd() * NEONS.length)] : null,
    });
    buildings.push(bb);
    fillPoly([b.outer, ...b.holes], i => {
      if (grid[i] !== OUT) {
        grid[i] = BUILD;
        hgrid[i] = Math.max(hgrid[i], h);
      }
    });
  }
  // grafo stradale per traffico, polizia, pedoni e GPS
  nodes = [];
  nodeMap = new Map();
  edges = [];
  keyOf = p => p[0] + ',' + p[1];
  inPB = (x, y) => x > PB.x0 + 30 && x < PB.x1 - 30 && y > PB.y0 + 30 && y < PB.y1 - 30;
  {
    const cnt = new Map();
    for (const r of roads) {
      if (r.cls === 'X') continue;
      for (const p of r.raw) {
        const k = keyOf(p);
        cnt.set(k, (cnt.get(k) || 0) + 1);
      }
    }
    const nodeAt = (raw, w) => {
      const k = keyOf(raw);
      let n = nodeMap.get(k);
      if (!n) {
        n = { id: nodes.length, x: w[0], y: w[1], edges: [] };
        nodes.push(n);
        nodeMap.set(k, n);
      }
      return n;
    };
    for (const r of roads) {
      if (r.cls === 'X') continue;
      let start = 0;
      for (let i = 1; i < r.raw.length; i++) {
        if (i === r.raw.length - 1 || cnt.get(keyOf(r.raw[i])) > 1) {
          const pts = r.pts.slice(start, i + 1);
          if (pts.length >= 2 && pts.every(p => inPB(p[0], p[1]))) {
            let len = 0;
            for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
            if (len > 4) {
              const a = nodeAt(r.raw[start], r.pts[start]),
                b = nodeAt(r.raw[i], r.pts[i]);
              const e = { id: edges.length, a, b, pts, len, cls: r.cls, ow: r.ow, w: r.w, name: r.name };
              const lo = e.ow ? 0 : e.w / 4;
              e.fwd = offsetLine(pts, lo);
              e.rev = offsetLine(pts.slice().reverse(), lo);
              const so = e.w / 2 + 7.5;
              e.sideR = offsetLine(pts, so);
              e.sideL = offsetLine(pts, -so);
              edges.push(e);
              a.edges.push(e);
              b.edges.push(e);
            }
          }
          start = i;
        }
      }
    }
  }
  EG = 200;
  egW = Math.ceil(WX / EG);
  egH = Math.ceil(WY / EG);
  egrid = Array.from({ length: egW * egH }, () => []);
  for (const e of edges)
    for (let j = 0; j + 1 < e.pts.length; j++) {
      const ax = e.pts[j][0],
        ay = e.pts[j][1],
        bx = e.pts[j + 1][0],
        by = e.pts[j + 1][1];
      const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - e.w) / EG)),
        x1 = Math.min(egW - 1, Math.floor((Math.max(ax, bx) + e.w) / EG)),
        y0 = Math.max(0, Math.floor((Math.min(ay, by) - e.w) / EG)),
        y1 = Math.min(egH - 1, Math.floor((Math.max(ay, by) + e.w) / EG));
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) egrid[cy * egW + cx].push([e, j]);
    }
  PIAZZA = llToW(45.0467, 7.6466);
  CHIESA = llToW(45.046, 7.64694);
  STADIO = llToW(45.04175, 7.65002);
  sp0 = sidewalkNear(PIAZZA[0] + 90, PIAZZA[1] + 170);
  SPAWN = { x: sp0[0], y: sp0[1], a: sp0[2] };
  gs0 = sidewalkNear(PIAZZA[0] - 260, PIAZZA[1] - 60);
  signals = [];
  CLW = { P: 3, S: 2, T: 1 };
  for (const n of nodes) {
    const big = n.edges.filter(e => CLW[e.cls]);
    n.sc = big.reduce((a, e) => a + CLW[e.cls], 0);
  }
  for (const n of [...nodes].sort((p, q) => q.sc - p.sc)) {
    const big = n.edges.filter(e => CLW[e.cls]);
    if (n.edges.length < 3 || big.length < 2 || !big.some(e => e.cls !== 'T')) continue;
    if (signals.some(m => Math.hypot(m.x - n.x, m.y - n.y) < 110)) continue;
    big.sort((p, q) => CLW[q.cls] - CLW[p.cls]);
    const ref = big[0],
      rp = ref.a === n ? ref.pts[1] : ref.pts[ref.pts.length - 2];
    n.axis = Math.atan2(rp[1] - n.y, rp[0] - n.x);
    n.sig = true;
    n.stop = Math.max(...n.edges.map(e => e.w)) / 2 + 16;
    const h = Math.imul((Math.floor(n.x / 320) * 73856093) ^ (Math.floor(n.y / 320) * 19349663), 2654435761) >>> 0;
    n.phase = (h % 1600) / 100;
    signals.push(n);
  }
}
