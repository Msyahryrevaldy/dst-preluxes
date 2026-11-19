import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_FILES = [
  'index.html',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'metadata.json',
  '.env.example',
  '.gitignore',
  'firebase-applet-config.json',
  'server.ts',
];

const INCLUDE_DIRS = ['src', 'server', 'dist', 'scripts', 'sites'];

const EXCLUDED_NAMES = new Set([
  'node_modules',
  '.git',
  '.aistudio',
  '.playwright-cli',
  'download',
  '.env',
  '.env.local',
  '.env.production',
  'studio-dst-store.json',
]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  archivePath: string;
  data: Buffer;
}

export function createZipArchiveBuffer(entries: ZipEntryInput[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.archivePath.replace(/\\/g, '/'), 'utf-8');
    const uncompressed = entry.data;
    const compressed = zlib.deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(8, 8); // deflate compression
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, compressed);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(8, 10); // deflate
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirBuffer, eocd]);
}

function walkDirectoryFiles(rootDir: string, relDir: string): ZipEntryInput[] {
  const fullDir = path.join(rootDir, relDir);
  if (!fs.existsSync(fullDir)) return [];

  const results: ZipEntryInput[] = [];
  const items = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const item of items) {
    if (EXCLUDED_NAMES.has(item.name) || item.name.startsWith('.env')) {
      continue;
    }
    const relPath = path.join(relDir, item.name);
    const fullPath = path.join(rootDir, relPath);
    if (item.isDirectory()) {
      results.push(...walkDirectoryFiles(rootDir, relPath));
    } else if (item.isFile()) {
      results.push({
        archivePath: `studio-dst-v10-master-package/${relPath.replace(/\\/g, '/')}`,
        data: fs.readFileSync(fullPath),
      });
    }
  }
  return results;
}

export function collectMasterPackageEntries(rootDir = process.cwd()): ZipEntryInput[] {
  const entries: ZipEntryInput[] = [];

  for (const fileName of ROOT_FILES) {
    const fullPath = path.join(rootDir, fileName);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      entries.push({
        archivePath: `studio-dst-v10-master-package/${fileName}`,
        data: fs.readFileSync(fullPath),
      });
    }
  }

  for (const dirName of INCLUDE_DIRS) {
    entries.push(...walkDirectoryFiles(rootDir, dirName));
  }

  const readmePath = path.join(rootDir, 'download', 'README-MASTER-PACKAGE.md');
  if (fs.existsSync(readmePath)) {
    entries.push({
      archivePath: 'studio-dst-v10-master-package/README-MASTER-PACKAGE.md',
      data: fs.readFileSync(readmePath),
    });
  }

  return entries.sort((a, b) => a.archivePath.localeCompare(b.archivePath));
}

export function getMasterPackagePaths(rootDir = process.cwd()) {
  const downloadDir = path.join(rootDir, 'download');
  const filename = 'studio-dst-v10-master-package.zip';
  return {
    downloadDir,
    filename,
    zipPath: path.join(downloadDir, filename),
  };
}

export function buildAndSaveMasterPackageZip(rootDir = process.cwd()): {
  zipPath: string;
  filename: string;
  sizeBytes: number;
  fileCount: number;
  buffer: Buffer;
} {
  const { downloadDir, filename, zipPath } = getMasterPackagePaths(rootDir);
  const entries = collectMasterPackageEntries(rootDir);
  const buffer = createZipArchiveBuffer(entries);

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  fs.writeFileSync(zipPath, buffer);

  return {
    zipPath,
    filename,
    sizeBytes: buffer.length,
    fileCount: entries.length,
    buffer,
  };
}

export function getOrCreateMasterPackageZip(
  rootDir = process.cwd(),
  forceRebuild = false
): {
  zipPath: string;
  filename: string;
  sizeBytes: number;
  fileCount: number;
  buffer: Buffer;
} {
  const { zipPath, filename } = getMasterPackagePaths(rootDir);
  if (!forceRebuild && fs.existsSync(zipPath)) {
    const buffer = fs.readFileSync(zipPath);
    const entries = collectMasterPackageEntries(rootDir);
    return {
      zipPath,
      filename,
      sizeBytes: buffer.length,
      fileCount: entries.length,
      buffer,
    };
  }
  return buildAndSaveMasterPackageZip(rootDir);
}
