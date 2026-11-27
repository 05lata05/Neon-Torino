// Validate the committed Unreal import and reproduce it from the current map.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import validator from 'gltf-validator';
import { buildGameplayData } from '../tools/gameplay_data.mjs';
import { bays, facadeMaterial, facadeType, floorsOf, floorV } from '../tools/facades.mjs';
import { boundingRect, clipConvex, roofModel } from '../tools/roofs.mjs';

async function readExport(file) {
  const bytes = readFileSync(file);
  const { issues } = await validator.validateBytes(bytes, { format: 'glb', maxIssues: 0 });
  const firstErrors = issues.messages.filter(issue => issue.severity === 0).slice(0, 5);
  const details = firstErrors.map(issue => issue.pointer + ' ' + issue.message).join('\n');
  assert.equal(issues.numErrors, 0, file + ': ' + details);

  // A GLB starts with a 12-byte header followed by the JSON chunk's 8-byte header.
  const jsonEnd = 20 + bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.toString('utf8', 20, jsonEnd));
  for (const material of document.materials ?? []) {
    const color = material.pbrMetallicRoughness?.baseColorFactor;
    // Linear colour conversion can vary in the last decimal place across JS runtimes.
    if (color) material.pbrMetallicRoughness.baseColorFactor = color.map(c => Number(c.toFixed(12)));
  }
  return { document, remainingChunks: bytes.subarray(jsonEnd) };
}

// A shared junction, a geometry crossing without a shared vertex, and a reverse-only way.
// The current district contains no reverse-only ways, so a real-data snapshot alone cannot test that case.
const road = (pts, oneway = 0, cls = 'R', maxSpeedKmh) => ({ pts, oneway, cls, lanes: 0, name: null, maxSpeedKmh });
const junction = [10, 0];
const sample = buildGameplayData(
  { TW: [], TR: [], TS: [], BS: [] },
  [
    road([[0, 0], junction, [20, 0]], 0, 'R', 30),
    road([junction, [10, 10]], 1),
    road([[10, -10], junction], -1),
    road([
      [5, -5],
      [5, 5],
    ]),
    road([junction, [99, 99]], 0, 'X'),
  ],
  [0, 0],
  point => point,
);
assert.deepEqual(sample.roadGraph.nodes, [[0, 0], junction, [20, 0], [10, 10], [10, -10], [5, -5], [5, 5]]);
assert.deepEqual(sample.roadGraph.edges, [
  [0, 1, 0],
  [1, 0, 0],
  [1, 2, 0],
  [2, 1, 0],
  [1, 3, 1],
  [1, 4, 2],
  [5, 6, 3],
  [6, 5, 3],
]);
assert.equal(sample.roadGraph.streets[0].lanes, null);
assert.deepEqual(sample.shopSigns, []);
assert.deepEqual(sample.streetFurniture, { trees: [], streetLamps: [], benches: [], wasteBins: [] });
// Trees keep the OSM genus when it is mapped (Unreal picks the species model from it); untagged trees have none.
const trees = buildGameplayData(
  {
    TW: [],
    TR: [],
    TS: [],
    BS: [],
    SF: {
      trees: [
        ['1', 2, 3, 'Platanus'],
        ['2', 4, 5],
      ],
    },
  },
  [],
  [0, 0],
  point => point,
).streetFurniture.trees;
assert.deepEqual(trees, [
  { osmNodeId: '1', position: [2, 3], genus: 'Platanus' },
  { osmNodeId: '2', position: [4, 5] },
]);
assert.deepEqual(
  sample.roadGraph.streets.map(street => street.maxSpeedKmh),
  [30, null, null, null],
);

// Roofs: a 20 x 10 m house turned by 30°, gabled and hipped; courtyards and L shapes stay flat.
const turn = ([x, y]) => [x * Math.cos(0.5236) - y * Math.sin(0.5236) + 100, x * Math.sin(0.5236) + y * Math.cos(0.5236) + 50];
const house = [
  [-10, -5],
  [10, -5],
  [10, 5],
  [-10, 5],
].map(turn);
const rect = boundingRect(house);
assert.ok(Math.abs(rect.A - 10) < 1e-6 && Math.abs(rect.B - 5) < 1e-6, 'bounding rectangle of a turned house');
const near = (a, b) => Math.abs(a - b) < 1e-6;
const gabled = roofModel(house, [], ['gabled', 0, 0, '']);
assert.ok(near(gabled.h, 5 * Math.tan(Math.PI / 6)), 'default roof height: 30° slope');
assert.ok(near(gabled.z(turn([0, 0])), gabled.h) && near(gabled.z(turn([10, 0])), gabled.h), 'gabled: ridge reaches the gable ends');
assert.ok(near(gabled.z(turn([0, 5])), 0), 'gabled: eaves on the long sides');
const hipped = roofModel(house, [], ['hipped', 3, 0, '']);
assert.ok(near(hipped.z(turn([0, 0])), 3) && near(hipped.z(turn([10, 0])), 0), 'hipped: slopes at the ends too, roof:height used');
assert.equal(roofModel(house, [], ['gabled', 0, 2, 'across']).h, 6, 'roof:levels gives the height');
assert.equal(roofModel(house, [[turn([-2, -2]), turn([2, -2]), turn([2, 2])]], ['gabled', 0, 0, '']), null, 'courtyard: flat');
const lShape = [
  [0, 0],
  [20, 0],
  [20, 4],
  [4, 4],
  [4, 20],
  [0, 20],
];
assert.equal(roofModel(lShape, [], ['gabled', 0, 0, '']), null, 'far from rectangular: flat');
assert.equal(roofModel(house, [], 0), null, 'no tags, not small: flat');
// the roof pieces cover the footprint exactly
const tri = [house[0], house[1], house[2]];
const pieceArea = p => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2);
const covered = hipped.pieces
  .map(p => clipConvex(tri, p))
  .filter(Boolean)
  .reduce((s, p) => s + pieceArea(p), 0);
assert.ok(Math.abs(covered - 100) < 1e-6, 'roof pieces cover the footprint without gaps or overlaps');

// Facades: type from use, kind and period; UVs that count floors and window bays.
assert.equal(facadeType('r', 0, 7, false), 'block', 'tall apartment building: 1950s–70s block');
assert.equal(facadeType('r', 0, 2, true), 'historic', 'low house with a pitched roof: historic');
assert.equal(facadeType('u', 0, 3, false), 'block', 'flat roof: block');
assert.equal(facadeType('I', 0, 2, false), 'industrial');
assert.equal(facadeType('r', 1, 5, false), 'church', 'the building kind wins over the use');
assert.equal(facadeType('u', 4, 3, false), 'public');
assert.equal(facadeMaterial('block', true, [10, 20]), 'Facade_Block_Brick', 'brick walls from OSM');
assert.equal(facadeMaterial('church', false, [10, 20]), 'Facade_Church');
assert.equal(facadeMaterial('historic', false, [10, 20]), facadeMaterial('historic', false, [10.2, 19.9]), 'colour stable');
assert.deepEqual(floorsOf(6, 0, 19), { g: 4, f: 3 }, 'ground floor 4 m, then 3 m');
assert.ok(near(floorV(4, { g: 4, f: 3 }), 1) && near(floorV(19, { g: 4, f: 3 }), 6), 'V counts floors');
assert.ok(near(floorsOf(1, 1, 19).f, 19) && near(floorV(9.5, floorsOf(1, 1, 19)), 0.5), 'single tall floor');
assert.equal(bays(10), 3, 'whole window bays per wall');
assert.ok(near(bays(1), 1 / 3), 'short walls keep their width');

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'neon-torino-export-'));
try {
  const freshFile = path.join(temporary, 'fresh.glb');
  const freshData = path.join(temporary, 'gameplay.json');
  execFileSync(process.execPath, [path.join(root, 'tools/export_gltf.mjs'), freshFile, freshData], { stdio: 'inherit' });
  const fresh = await readExport(freshFile);
  const committed = await readExport(path.join(root, 'unreal/import/santa_rita.glb'));
  const stale = 'The committed 3D export is out of date. Run npm run unreal and commit the regenerated GLB.';
  assert.ok(isDeepStrictEqual(committed.document, fresh.document), stale);
  assert.ok(committed.remainingChunks.equals(fresh.remainingChunks), stale);
  const data = JSON.parse(readFileSync(freshData, 'utf8'));
  assert.deepEqual(data.coordinates.originMapMetres, fresh.document.extras.origin.mapMetres);
  const map = JSON.parse(readFileSync(path.join(root, 'data/torino.json'), 'utf8'));
  const [east, south] = data.coordinates.originMapMetres;
  const local = ([x, y]) => [x - east, y - south];
  assert.deepEqual(
    data.roadGraph.streets,
    map.R.filter(([cls]) => cls !== 'X').map(([cls, oneway, name, lanes, , maxSpeedKmh]) => ({
      class: cls,
      name: map.names[name] ?? null,
      lanes: lanes || null,
      oneway,
      maxSpeedKmh: maxSpeedKmh ?? null,
    })),
  );
  assert.deepEqual(
    data.tramTracks,
    map.TW.map(points => points.map(local)),
  );
  assert.deepEqual(
    data.tramLines,
    map.TR.map(([line, points]) => ({ line, points: points.map(local) })),
  );
  const expectedStops = rows => rows.map(([x, y, name]) => ({ name, position: local([x, y]) }));
  assert.deepEqual(data.tramStops, expectedStops(map.TS));
  assert.deepEqual(data.busStops, expectedStops(map.BS));
  const expectedFurniture = rows =>
    rows.map(([osmNodeId, x, y, genus]) => ({ osmNodeId, position: local([x, y]), ...(genus ? { genus } : {}) }));
  for (const kind of ['trees', 'streetLamps', 'benches', 'wasteBins']) {
    assert.ok(map.SF[kind].length > 0, 'Missing mapped ' + kind);
    assert.deepEqual(data.streetFurniture[kind], expectedFurniture(map.SF[kind]));
  }
  const signs = JSON.parse(readFileSync(path.join(root, 'data/santa_rita_shop_signs.json'), 'utf8'));
  assert.ok(signs.length > 0, 'Missing shop and venue data');
  assert.equal(new Set(signs.map(([id]) => id)).size, signs.length);
  assert.deepEqual(
    data.shopSigns,
    signs.map(([osmId, name, category, level, point]) => ({ osmId, name, category, level, position: local(point) })),
  );
  const stored = readFileSync(path.join(root, 'unreal/import/santa_rita_data.json'), 'utf8');
  assert.ok(stored === readFileSync(freshData, 'utf8'), 'Gameplay export is stale. Run npm run unreal.');
  console.log('Unreal export is valid and matches the current map.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
