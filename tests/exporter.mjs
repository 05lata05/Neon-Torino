// Validate the committed Unreal import and reproduce it from the current map.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import validator from 'gltf-validator';

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

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'neon-torino-export-'));
try {
  const freshFile = path.join(temporary, 'fresh.glb');
  execFileSync(process.execPath, [path.join(root, 'tools/export_gltf.mjs'), freshFile], { stdio: 'inherit' });
  const fresh = await readExport(freshFile);
  const committed = await readExport(path.join(root, 'unreal/import/santa_rita.glb'));
  const stale = 'The committed 3D export is out of date. Run npm run unreal and commit the regenerated GLB.';
  assert.ok(isDeepStrictEqual(committed.document, fresh.document), stale);
  assert.ok(committed.remainingChunks.equals(fresh.remainingChunks), stale);
  console.log('Unreal export is valid and matches the current map.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
