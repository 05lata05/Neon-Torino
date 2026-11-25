// Roof shapes for the Unreal export: turns the OSM roof tags of a building (data/torino.json → BR) into a roof model
// that tools/export_gltf.mjs can mesh.
//
// The roof is built on the building's minimum-area bounding rectangle: the ridge runs along its long side
// (`roof:orientation=across` turns it), the slopes come down to the eaves on the long sides and, for hipped and
// pyramidal roofs, at the ends too. The footprint is cut by the roof's planes, so every piece stays flat and the
// walls are raised to meet the roof (gables).
//
// Invented details (not from data): OSM gives no roof heights here, so a roof rises 30° (0.577 m per metre of
// half-width, between 1.5 and 6 m) unless `roof:height` or `roof:levels` say otherwise; mansard, gambrel, round and
// saltbox roofs are drawn as gabled, half-hipped as hipped, dome and onion as pyramidal. Buildings with courtyards or
// far from rectangular (less than 70% of their rectangle) keep a flat roof. Small buildings without roof tags (up to
// 3 levels and 300 m², no courtyard, almost rectangular) get a gabled roof, common on Santa Rita's older houses.

const SHAPE = {
  gabled: 'gabled',
  mansard: 'gabled',
  gambrel: 'gabled',
  round: 'gabled',
  saltbox: 'gabled',
  hipped: 'hipped',
  'half-hipped': 'hipped',
  pyramidal: 'pyramidal',
  dome: 'pyramidal',
  onion: 'pyramidal',
  skillion: 'skillion',
};
const SLOPE = Math.tan(Math.PI / 6);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const signedArea = r => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i],
      q = r[(i + 1) % r.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};

function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [],
    upper = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// minimum-area bounding rectangle: centre, unit axis u along the long side, half-length A (along u), half-width B
export function boundingRect(ring) {
  const h = hull(ring);
  let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i],
      b = h[(i + 1) % h.length],
      l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    const ux = [(b[0] - a[0]) / l, (b[1] - a[1]) / l],
      vy = [-ux[1], ux[0]];
    let u0 = Infinity,
      u1 = -Infinity,
      v0 = Infinity,
      v1 = -Infinity;
    for (const p of h) {
      const u = p[0] * ux[0] + p[1] * ux[1],
        v = p[0] * vy[0] + p[1] * vy[1];
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area - 1e-9) {
      const cu = (u0 + u1) / 2,
        cv = (v0 + v1) / 2;
      best = { area, c: [cu * ux[0] + cv * vy[0], cu * ux[1] + cv * vy[1]], ux, A: (u1 - u0) / 2, B: (v1 - v0) / 2 };
    }
  }
  if (best && best.A < best.B) best = { ...best, ux: [-best.ux[1], best.ux[0]], A: best.B, B: best.A };
  return best;
}

// roof model for a building, or null for a flat roof.
// info: the BR entry (0 or [shape, roof height m, roof levels, orientation]); small: apply the untagged small-house rule
export function roofModel(outer, holes, info, small = false) {
  let shape = info ? SHAPE[info[0]] : small ? 'gabled' : null;
  if (!shape || holes.length) return null;
  const r = boundingRect(outer);
  if (!r || r.B < 1) return null;
  if (Math.abs(signedArea(outer)) / (4 * r.A * r.B) < (info ? 0.7 : 0.8)) return null;
  let { c, ux, A, B } = r;
  if (info && info[3] === 'across') {
    ux = [-ux[1], ux[0]];
    [A, B] = [B, A];
  }
  const vy = [-ux[1], ux[0]];
  const fallbackH = shape === 'skillion' ? clamp(B * 2 * 0.27, 1, 3) : clamp((shape === 'pyramidal' ? Math.min(A, B) : B) * SLOPE, 1.5, 6);
  const h = info && info[1] > 0 ? info[1] : info && info[2] > 0 ? info[2] * 3 : fallbackH;
  const toUV = p => {
    const dx = p[0] - c[0],
      dy = p[1] - c[1];
    return [dx * ux[0] + dy * ux[1], dx * vy[0] + dy * vy[1]];
  };
  const fromUV = ([u, v]) => [c[0] + u * ux[0] + v * vy[0], c[1] + u * ux[1] + v * vy[1]];
  // height above the eaves at a point
  const z = p => {
    const [u, v] = toUV(p);
    const across = 1 - Math.abs(v) / B,
      along = (A - Math.abs(u)) / B;
    let k;
    if (shape === 'gabled') k = across;
    else if (shape === 'hipped') k = Math.min(across, along);
    else if (shape === 'pyramidal') k = Math.min(across, 1 - Math.abs(u) / A);
    else k = (v + B) / (2 * B); // skillion
    return h * clamp(k, 0, 1);
  };
  // convex pieces of the bounding rectangle where the roof is a single plane (slightly padded)
  const a = A * 1.001 + 1e-3,
    b = B * 1.001 + 1e-3,
    rr = Math.max(A - B, 0);
  let pieces;
  if (shape === 'gabled')
    pieces = [
      [
        [-a, 0],
        [a, 0],
        [a, b],
        [-a, b],
      ],
      [
        [-a, -b],
        [a, -b],
        [a, 0],
        [-a, 0],
      ],
    ];
  else if (shape === 'hipped' || shape === 'pyramidal') {
    const ridge = shape === 'hipped' ? rr : 0;
    pieces = [
      [
        [-ridge, 0],
        [ridge, 0],
        [a, b],
        [-a, b],
      ],
      [
        [-a, -b],
        [a, -b],
        [ridge, 0],
        [-ridge, 0],
      ],
      [
        [ridge, 0],
        [a, -b],
        [a, b],
      ],
      [
        [-ridge, 0],
        [-a, b],
        [-a, -b],
      ],
    ];
    if (shape === 'pyramidal') {
      // pyramid: the planes meet at the centre, the "along" slope uses A instead of B
      pieces = [
        [
          [0, 0],
          [a, b],
          [-a, b],
        ],
        [
          [0, 0],
          [-a, -b],
          [a, -b],
        ],
        [
          [0, 0],
          [a, -b],
          [a, b],
        ],
        [
          [0, 0],
          [-a, b],
          [-a, -b],
        ],
      ];
    }
  } else
    pieces = [
      [
        [-a, -b],
        [a, -b],
        [a, b],
        [-a, b],
      ],
    ];
  pieces = pieces.map(p => p.map(fromUV)).map(p => (signedArea(p) < 0 ? p.reverse() : p));
  return { shape, h, z, pieces };
}

// convex polygon (counter-clockwise) ∩ polygon (Sutherland–Hodgman); the subject is a triangle or a convex piece
export function clipConvex(subject, clip) {
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i],
      b = clip[(i + 1) % clip.length];
    const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j],
        q = inp[(j + 1) % inp.length],
        sp = side(p),
        sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out.length >= 3 && Math.abs(signedArea(out)) > 1e-6 ? out : null;
}

// splits the segment p→q where it crosses the edges of the roof pieces, so the roof height is linear between points
export function splitEdge(p, q, pieces) {
  const ts = [0, 1];
  const dx = q[0] - p[0],
    dy = q[1] - p[1];
  for (const piece of pieces)
    for (let i = 0; i < piece.length; i++) {
      const a = piece[i],
        b = piece[(i + 1) % piece.length],
        ex = b[0] - a[0],
        ey = b[1] - a[1],
        den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den,
        s = ((a[0] - p[0]) * dy - (a[1] - p[1]) * dx) / den;
      if (t > 1e-6 && t < 1 - 1e-6 && s >= -1e-6 && s <= 1 + 1e-6) ts.push(t);
    }
  return [...new Set(ts.map(t => Math.round(t * 1e6) / 1e6))].sort((a, b) => a - b).map(t => [p[0] + dx * t, p[1] + dy * t]);
}
