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
const road = (pts, oneway = 0, cls = 'R') => ({ pts, oneway, cls, lanes: 0, name: null });
const junction = [10, 0];
const sample = buildGameplayData(
  { TW: [], TR: [], TS: [], BS: [] },
  [
    road([[0, 0], junction, [20, 0]]),
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
    map.R.filter(([cls]) => cls !== 'X').map(([cls, oneway, name, lanes]) => ({
      class: cls,
      name: map.names[name] ?? null,
      lanes: lanes || null,
      oneway,
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
  const stored = readFileSync(path.join(root, 'unreal/import/santa_rita_data.json'), 'utf8');
  assert.ok(stored === readFileSync(freshData, 'utf8'), 'Gameplay export is stale. Run npm run unreal.');
  console.log('Unreal export is valid and matches the current map.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
