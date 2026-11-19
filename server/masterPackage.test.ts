import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectMasterPackageEntries,
  createZipArchiveBuffer,
} from './masterPackage.ts';

test('collectMasterPackageEntries includes core website files and excludes secrets/node_modules', () => {
  const entries = collectMasterPackageEntries(process.cwd());
  const names = entries.map((e) => e.archivePath);

  assert.ok(names.includes('studio-dst-v10-master-package/package.json'));
  assert.ok(names.includes('studio-dst-v10-master-package/server.ts'));
  assert.ok(names.includes('studio-dst-v10-master-package/src/App.tsx'));
  assert.ok(names.includes('studio-dst-v10-master-package/index.html'));
  assert.ok(!names.some((n) => n.includes('node_modules')));
  assert.ok(!names.some((n) => n.endsWith('/.env') || n.includes('.env.local')));
  assert.ok(!names.some((n) => n.includes('studio-dst-store.json')));
});

test('createZipArchiveBuffer generates valid ZIP local header and EOCD signature', () => {
  const buf = createZipArchiveBuffer([
    { archivePath: 'hello.txt', data: Buffer.from('Studio DST V10+', 'utf-8') },
  ]);
  // Local file header signature PK\x03\x04
  assert.equal(buf.readUInt32LE(0), 0x04034b50);
  // EOCD signature PK\x05\x06 at the end (22 bytes)
  assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);
});
