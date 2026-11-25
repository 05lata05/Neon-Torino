// Exports Santa Rita from data/torino.json to a glTF file (unreal/import/santa_rita.glb) for the Unreal Engine prototype.
// Usage: node tools/export_gltf.mjs [out.glb [gameplay.json]]. Without arguments, write both Unreal imports.
//
// What goes in (real data): roads with their widths, green areas, water, pitches, parking, buildings with their
// real footprints, courtyards and heights (OSM levels or Arpa Piemonte), the Santa Rita landmarks.
// Invented details (not from data): sidewalks are a fixed 3 m strip along every road; the stadium stands are a
// single 28 m block; buildings without any height data get levels from their size (same rule as the browser game);
// facade and roof colours are picked from a palette; the Parco Rignon trees are simple shapes.
//
// glTF coordinates: metres, x = east, y = up, z = south (Unreal converts them to centimetres and Z-up on import).
// The origin is on the street next to piazza Santa Rita, where the browser game starts: put the Player Start there.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShapeUtils, Vector2 } from 'three';
import { buildGameplayData } from './gameplay_data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || path.join(ROOT, 'unreal', 'import', 'santa_rita.glb');
const DATA_OUT = process.argv[3] || (!process.argv[2] && path.join(ROOT, 'unreal/import/santa_rita_data.json'));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'torino.json'), 'utf8'));
const TILE = 250; // metres: meshes are split in tiles, so Unreal can cull and stream them

// ---------------------------------------------------------------- data decoding (same format as src/world/map.js)
function decPoly(s, q) {
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
const area = r => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i],
      q = r[(i + 1) % r.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
const centroid = r => {
  let x = 0,
    y = 0;
  for (const p of r) {
    x += p[0];
    y += p[1];
  }
  return [x / r.length, y / r.length];
};
const inRing = (p, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if (r[i][1] > p[1] !== r[j][1] > p[1] && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};
const inPoly = (p, outer, holes) => inRing(p, outer) && !holes.some(h => inRing(p, h));
const clean = r => {
  const o = r.filter((p, i) => {
    const q = r[(i + 1) % r.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.01;
  });
  return o.length >= 3 ? o : null;
};

// origin: the street point closest to the browser game's start (piazza Santa Rita + 18 m east, 34 m south)
const llToM = (lat, lon) => [(lon - DATA.origin[1]) * DATA.k[0], (DATA.origin[0] - lat) * DATA.k[1]];
const square = llToM(45.0467, 7.6466),
  want = [square[0] + 18, square[1] + 34];
const roads = DATA.R.map(r => ({ cls: r[0], name: DATA.names[r[2]] ?? null, lanes: r[3], oneway: r[1], pts: decPoly(r[4], 1) })).filter(
  r => r.pts.length >= 2,
);
let O = null,
  best = 1e9;
for (const r of roads)
  for (const p of r.pts) {
    const d = Math.hypot(p[0] - want[0], p[1] - want[1]);
    if (d < best) {
      best = d;
      O = p;
    }
  }

// ---------------------------------------------------------------- mesh building
const MATERIALS = {
  Ground: ['#6d7a5a', 0.95],
  Asphalt: ['#3a3d42', 0.85],
  Sidewalk: ['#a9a49b', 0.9],
  Grass: ['#5f8f3e', 0.95],
  Pitch: ['#3f8f45', 0.9],
  Water: ['#3a6f8f', 0.15],
  Parking: ['#55585d', 0.9],
  Rail: ['#7a6a58', 0.95],
  Path: ['#c2b49a', 0.95],
  Facade_Ochre: ['#d9a66e', 0.9],
  Facade_Yellow: ['#e8cf8e', 0.9],
  Facade_Cream: ['#efe2c8', 0.9],
  Facade_Grey: ['#c9c4ba', 0.9],
  Facade_Brick: ['#b9785a', 0.9],
  Facade_White: ['#ece9e2', 0.9],
  Church: ['#efe6d2', 0.9],
  Concrete: ['#c9ccd2', 0.85],
  Roof: ['#77736d', 0.95],
  Roof_Tiles: ['#a3472f', 0.9],
  Tree_Trunk: ['#5b4330', 0.95],
  Tree_Leaves: ['#3f6f2e', 0.95],
};
const FACADES = ['Facade_Ochre', 'Facade_Yellow', 'Facade_Cream', 'Facade_Grey', 'Facade_Brick', 'Facade_White'];
let seed = 12345;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

// meshes[name][material] = { pos: [], nrm: [], uv: [], idx: [] }
const meshes = {};
function prim(group, cx, cz, mat) {
  const name = group === 'Ground' ? 'Ground' : `${group}_${Math.floor(cx / TILE)}_${Math.floor(cz / TILE)}`;
  const m = (meshes[name] ||= {});
  return (m[mat] ||= { pos: [], nrm: [], uv: [], idx: [] });
}
const W = p => [p[0] - O[0], p[1] - O[1]]; // map metres → glTF x, z
// adds a triangle list, flipping it if it does not face along n
function addTris(P, verts, tris, n, uvs) {
  const base = P.pos.length / 3;
  for (let i = 0; i < verts.length; i++) {
    P.pos.push(...verts[i]);
    P.nrm.push(...n);
    P.uv.push(...uvs[i]);
  }
  for (const [a, b, c] of tris) {
    const A = verts[a],
      B = verts[b],
      C = verts[c];
    const ux = B[0] - A[0],
      uy = B[1] - A[1],
      uz = B[2] - A[2],
      vx = C[0] - A[0],
      vy = C[1] - A[1],
      vz = C[2] - A[2];
    const d = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
    if (d >= 0) P.idx.push(base + a, base + b, base + c);
    else P.idx.push(base + a, base + c, base + b);
  }
}
// horizontal polygon (with holes) at height y, facing up
function flat(group, mat, outer, holes, y) {
  outer = clean(outer);
  if (!outer) return;
  holes = holes.map(clean).filter(Boolean);
  const tri = ShapeUtils.triangulateShape(
    outer.map(p => new Vector2(p[0], p[1])),
    holes.map(h => h.map(p => new Vector2(p[0], p[1]))),
  );
  const all = [...outer, ...holes.flat()];
  const [cx, cz] = centroid(outer);
  addTris(
    prim(group, cx, cz, mat),
    all.map(p => [...W(p).slice(0, 1), y, W(p)[1]]),
    tri,
    [0, 1, 0],
    all.map(p => [p[0], p[1]]),
  );
}
// extruded footprint: walls for the outer ring and the courtyards, flat roof
function extrude(group, wallMat, roofMat, outer, holes, h, y0 = 0) {
  outer = clean(outer);
  if (!outer) return;
  holes = holes.map(clean).filter(Boolean);
  const [cx, cz] = centroid(outer);
  const P = prim(group, cx, cz, wallMat);
  for (const ring of [outer, ...holes]) {
    let u = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i],
        q = ring[(i + 1) % ring.length],
        len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      // outward normal: the side whose nearby point is outside the footprint
      let nx = (q[1] - p[1]) / len,
        nz = -(q[0] - p[0]) / len;
      const mid = [(p[0] + q[0]) / 2 + nx * 0.05, (p[1] + q[1]) / 2 + nz * 0.05];
      if (inPoly(mid, outer, holes)) {
        nx = -nx;
        nz = -nz;
      }
      const a = W(p),
        b = W(q);
      addTris(
        P,
        [
          [a[0], y0, a[1]],
          [b[0], y0, b[1]],
          [b[0], y0 + h, b[1]],
          [a[0], y0 + h, a[1]],
        ],
        [
          [0, 1, 2],
          [0, 2, 3],
        ],
        [nx, 0, nz],
        [
          [u, y0],
          [u + len, y0],
          [u + len, y0 + h],
          [u, y0 + h],
        ],
      );
      u += len;
    }
  }
  flat(group, roofMat, outer, holes, y0 + h);
}
// strip along a polyline (roads, sidewalks, paths)
function ribbon(group, mat, pts, w, y) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const p = pts[i],
      q = pts[i + 1],
      len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 0.01) continue;
    const nx = (-(q[1] - p[1]) / len) * (w / 2),
      nz = ((q[0] - p[0]) / len) * (w / 2);
    // segments overlap a little at the joints (extended by half the width), so bends have no gaps
    const ex = ((q[0] - p[0]) / len) * (w / 2),
      ez = ((q[1] - p[1]) / len) * (w / 2);
    const a = W([p[0] - ex, p[1] - ez]),
      b = W([q[0] + ex, q[1] + ez]);
    const quad = [
      [a[0] + nx, y, a[1] + nz],
      [a[0] - nx, y, a[1] - nz],
      [b[0] - nx, y, b[1] - nz],
      [b[0] + nx, y, b[1] + nz],
    ];
    addTris(
      prim(group, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, mat),
      quad,
      [
        [0, 1, 2],
        [0, 2, 3],
      ],
      [0, 1, 0],
      [
        [0, 0],
        [w, 0],
        [w, len + w],
        [0, len + w],
      ],
    );
  }
}
function box(group, mat, c, sx, sy, sz, y0) {
  const r = [
    [c[0] - sx / 2, c[1] - sz / 2],
    [c[0] + sx / 2, c[1] - sz / 2],
    [c[0] + sx / 2, c[1] + sz / 2],
    [c[0] - sx / 2, c[1] + sz / 2],
  ];
  extrude(group, mat, mat, r, [], sy, y0);
}
function tree(c, h = 9) {
  box('Trees', 'Tree_Trunk', c, 0.5, h * 0.4, 0.5, 0);
  const r = h * 0.3;
  box('Trees', 'Tree_Leaves', c, r * 2, h * 0.65, r * 2, h * 0.35);
}

// ---------------------------------------------------------------- the city
// ground under the play area and under every road that leaves it (tram lines, long boulevards)
const G = [...DATA.clip];
for (const r of roads)
  for (const p of r.pts) {
    G[0] = Math.min(G[0], p[0]);
    G[1] = Math.min(G[1], p[1]);
    G[2] = Math.max(G[2], p[0]);
    G[3] = Math.max(G[3], p[1]);
  }
flat(
  'Ground',
  'Ground',
  [
    [G[0] - 80, G[1] - 80],
    [G[2] + 80, G[1] - 80],
    [G[2] + 80, G[3] + 80],
    [G[0] - 80, G[3] + 80],
  ],
  [],
  0,
);

// each kind at its own height, so overlapping areas (a pitch inside a park) do not flicker
const AREA_MAT = { g: ['Grass', 0.02], k: ['Parking', 0.024], r: ['Rail', 0.028], p: ['Pitch', 0.032], w: ['Water', 0.036] };
for (const a of DATA.A) {
  const [mat, y] = AREA_MAT[a[0]] || AREA_MAT.g;
  flat(
    'Areas',
    mat,
    decPoly(a[1], DATA.qb),
    a.slice(2).map(s => decPoly(s, DATA.qb)),
    y,
  );
}

const RW = { P: 15, S: 11, T: 9, R: 7.5, V: 5, X: 8 };
for (const r of roads) {
  let w = RW[r.cls] || 7;
  if (r.lanes > 0 && r.cls !== 'X' && r.cls !== 'V') w = Math.min(18, Math.max(RW[r.cls] * 0.6, r.lanes * 3.3 + 1.5));
  else if (r.cls === 'R' && r.oneway !== 0) w = 6;
  if (r.cls !== 'V') ribbon('Sidewalks', 'Sidewalk', r.pts, w + 6, 0.05);
  ribbon('Roads', r.cls === 'V' ? 'Path' : 'Asphalt', r.pts, w, 0.08);
}

// buildings: height rule of the browser game (ground floor 4 m, then 3 m per level)
const heightOf = (levels, kind) => {
  let h = levels >= 3 && kind === 0 ? 4 + (levels - 1) * 3 : levels * 3;
  if (kind === 3) h = Math.min(h, 3);
  if (kind === 1) h = Math.max(h, 19);
  if (kind === 2) h = Math.max(h, 25);
  return h;
};
let nb = 0;
for (const b of DATA.B) {
  const outer = decPoly(b[2], DATA.qb),
    holes = b.slice(3).map(s => decPoly(s, DATA.qb));
  if (outer.length < 3) continue;
  const am = Math.abs(area(outer));
  let levels = b[0];
  if (!levels)
    levels = b[1] === 3 ? 1 : am < 60 ? 1 + Math.floor(rnd() * 2) : am < 220 ? 2 + Math.floor(rnd() * 4) : 5 + Math.floor(rnd() * 5);
  const kind = b[1],
    wall = kind === 1 ? 'Church' : kind === 2 ? 'Concrete' : FACADES[Math.floor(rnd() * FACADES.length)],
    roof = kind === 1 || levels <= 2 ? 'Roof_Tiles' : 'Roof';
  extrude('Buildings', wall, roof, outer, holes, heightOf(levels, kind));
  nb++;
}

// landmarks: real shapes from OSM (see LANDMARKS in tools/build_map.py)
const L = DATA.L;
const tagH = (t = {}, fallback) =>
  parseFloat(t.height) || (parseInt(t['building:levels'] || '0', 10) ? heightOf(parseInt(t['building:levels'], 10), 0) : fallback);
for (const [id, o] of Object.entries(L)) {
  const t = o.tags || {};
  if (id === 'stadium') {
    extrude('Landmarks', 'Concrete', 'Roof', o.outer, o.holes || [], 28);
    if (o.pitch) flat('Landmarks', 'Pitch', o.pitch, [], 0.04);
  } else if (id === 'cauldron') box('Landmarks', 'Concrete', o.pos, 4, o.h, 4, 0);
  else if (t.leisure === 'swimming_pool' && !t.building) flat('Landmarks', 'Water', o.outer, o.holes || [], 0.06);
  else if (o.buildings) {
    if (id === 'rignon') {
      flat('Landmarks', 'Grass', o.outer, o.holes || [], 0.03);
      for (const p of o.paths || []) ribbon('Landmarks', 'Path', p.pts, 3, 0.05);
      for (const r of o.treeRows || [])
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const p = r.pts[i],
            q = r.pts[i + 1],
            n = Math.max(1, Math.floor(Math.hypot(q[0] - p[0], q[1] - p[1]) / 8));
          for (let k = 0; k <= n; k++) tree([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n], 11);
        }
      for (const p of o.trees || []) tree(p, 9);
    }
    for (const b of o.buildings) {
      const bt = b.tags || {};
      extrude('Landmarks', bt['roof:shape'] === 'gabled' ? 'Facade_Ochre' : 'Facade_Cream', 'Roof', b.outer, b.holes || [], tagH(bt, 7));
    }
  } else if (o.outer) {
    const h = o.h || (o.levels ? heightOf(o.levels, 0) : tagH(t, 7));
    extrude(
      'Landmarks',
      id === 'villaAmoretti' ? 'Facade_Yellow' : 'Concrete',
      id === 'villaAmoretti' ? 'Roof_Tiles' : 'Roof',
      o.outer,
      o.holes || [],
      h,
    );
  }
}

// ---------------------------------------------------------------- glTF (binary) writer
const matNames = Object.keys(MATERIALS);
const gltf = {
  asset: { version: '2.0', generator: 'Neon Torino tools/export_gltf.mjs' },
  extras: { origin: { mapMetres: O, note: 'the origin is on the street next to piazza Santa Rita: put the Player Start here' } },
  scene: 0,
  scenes: [{ name: 'SantaRita', nodes: [] }],
  nodes: [],
  meshes: [],
  materials: matNames.map(n => {
    const [hex, rough] = MATERIALS[n];
    // glTF base colours are linear
    const lin = c => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const rgb = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16)));
    return { name: n, pbrMetallicRoughness: { baseColorFactor: [...rgb, 1], metallicFactor: 0, roughnessFactor: rough } };
  }),
  buffers: [{ byteLength: 0 }],
  bufferViews: [],
  accessors: [],
};
const chunks = [];
let offset = 0;
function view(typed, target) {
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (buf.length % 4)) % 4;
  gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target });
  chunks.push(buf, Buffer.alloc(pad));
  offset += buf.length + pad;
  return gltf.bufferViews.length - 1;
}
function accessor(typed, type, target, minmax) {
  const a = { bufferView: view(typed, target), componentType: typed instanceof Uint32Array ? 5125 : 5126, count: 0, type };
  const n = { VEC3: 3, VEC2: 2, SCALAR: 1 }[type];
  a.count = typed.length / n;
  if (minmax) {
    a.min = [Infinity, Infinity, Infinity];
    a.max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < typed.length; i += 3)
      for (let k = 0; k < 3; k++) {
        a.min[k] = Math.min(a.min[k], typed[i + k]);
        a.max[k] = Math.max(a.max[k], typed[i + k]);
      }
  }
  gltf.accessors.push(a);
  return gltf.accessors.length - 1;
}
let tris = 0;
for (const name of Object.keys(meshes).sort()) {
  const primitives = [];
  for (const [mat, P] of Object.entries(meshes[name])) {
    if (!P.idx.length) continue;
    primitives.push({
      attributes: {
        POSITION: accessor(new Float32Array(P.pos), 'VEC3', 34962, true),
        NORMAL: accessor(new Float32Array(P.nrm), 'VEC3', 34962),
        TEXCOORD_0: accessor(new Float32Array(P.uv), 'VEC2', 34962),
      },
      indices: accessor(new Uint32Array(P.idx), 'SCALAR', 34963),
      material: matNames.indexOf(mat),
    });
    tris += P.idx.length / 3;
  }
  if (!primitives.length) continue;
  gltf.meshes.push({ name, primitives });
  gltf.nodes.push({ name, mesh: gltf.meshes.length - 1 });
  gltf.scenes[0].nodes.push(gltf.nodes.length - 1);
}
gltf.buffers[0].byteLength = offset;
const bin = Buffer.concat(chunks);
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const ch = (len, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(len, 0);
  b.writeUInt32LE(type, 4);
  return b;
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([header, ch(json.length, 0x4e4f534a), json, ch(bin.length, 0x004e4942), bin]));
console.log(
  `wrote ${path.relative(ROOT, OUT)}: ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB, ${gltf.meshes.length} meshes, ` +
    `${(tris / 1000).toFixed(0)}k triangles, ${nb} buildings + ${Object.keys(L).length} landmarks; origin at map metres ${O}`,
);

if (DATA_OUT) {
  const gameplay = buildGameplayData(DATA, roads, O, W);
  fs.mkdirSync(path.dirname(DATA_OUT), { recursive: true });
  fs.writeFileSync(DATA_OUT, JSON.stringify(gameplay) + '\n');
  console.log(
    `wrote ${path.relative(ROOT, DATA_OUT)}: ${gameplay.roadGraph.nodes.length} road nodes, ${gameplay.roadGraph.edges.length} directed edges`,
  );
}
