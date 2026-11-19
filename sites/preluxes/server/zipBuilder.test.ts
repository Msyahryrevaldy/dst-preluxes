import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { createZipBuffer } from './zipBuilder.ts';

test('createZipBuffer creates valid PKZIP headers and round-trips content', () => {
  const helloText = 'Preluxes Master Package — Temukan yang berharga. Rawat lebih lama.\n'.repeat(10);
  const smallBytes = Buffer.from([1, 2, 3, 4]);

  const zip = createZipBuffer([
    { name: 'brand-kit/README.txt', content: helloText },
    { name: 'tiny.bin', content: smallBytes },
  ]);

  // Verify local file signature PK\x03\x04
  assert.equal(zip.readUInt32LE(0), 0x04034b50);

  // Verify End of Central Directory signature at tail (no comment -> last 22 bytes)
  const eocdOffset = zip.length - 22;
  assert.equal(zip.readUInt32LE(eocdOffset), 0x06054b50);
  assert.equal(zip.readUInt16LE(eocdOffset + 8), 2);
  assert.equal(zip.readUInt16LE(eocdOffset + 10), 2);

  // Parse first entry and inflate/verify CRC32
  const method = zip.readUInt16LE(8);
  const expectedCrc = zip.readUInt32LE(14);
  const compSize = zip.readUInt32LE(18);
  const uncompSize = zip.readUInt32LE(22);
  const nameLen = zip.readUInt16LE(26);
  const extraLen = zip.readUInt16LE(28);

  const fileName = zip.subarray(30, 30 + nameLen).toString('utf8');
  assert.equal(fileName, 'brand-kit/README.txt');

  const dataStart = 30 + nameLen + extraLen;
  const payload = zip.subarray(dataStart, dataStart + compSize);
  const extracted = method === 8 ? zlib.inflateRawSync(payload) : payload;

  assert.equal(extracted.length, uncompSize);
  assert.equal(extracted.toString('utf8'), helloText);
  assert.equal(zlib.crc32(extracted) >>> 0, expectedCrc);
});
