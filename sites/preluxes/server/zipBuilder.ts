import zlib from 'node:zlib';

export interface ZipEntryInput {
  name: string;
  content: Buffer | string;
  mtime?: Date;
}

function toDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

/**
 * Builds a standard PKZIP archive buffer using DEFLATE (method 8) via node:zlib.
 * Compatible with macOS Archive Utility, Windows Explorer, unzip CLI, and JSZip.
 */
export function createZipBuffer(entries: ZipEntryInput[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const cleanName = entry.name.replace(/^\/+/, '').replace(/\\/g, '/');
    const nameBuf = Buffer.from(cleanName, 'utf8');
    const rawBuf = typeof entry.content === 'string' ? Buffer.from(entry.content, 'utf8') : entry.content;
    const crc = zlib.crc32(rawBuf) >>> 0;
    const compressed = zlib.deflateRawSync(rawBuf, { level: 6 });

    // Use STORE (0) for tiny/incompressible files where deflate is larger, else DEFLATE (8)
    const useDeflate = compressed.length < rawBuf.length;
    const method = useDeflate ? 8 : 0;
    const dataBuf = useDeflate ? compressed : rawBuf;

    const { dosTime, dosDate } = toDosTimeDate(entry.mtime || new Date());

    // Local File Header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag (bit 11)
    localHeader.writeUInt16LE(method, 8); // Compression method
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuf.length, 18); // Compressed size
    localHeader.writeUInt32LE(rawBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length

    localParts.push(localHeader, nameBuf, dataBuf);

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 filename flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuf.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // Comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + dataBuf.length;
  }

  const centralDirBuffer = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  endRecord.writeUInt16LE(0, 4); // Disk number
  endRecord.writeUInt16LE(0, 6); // Central dir start disk
  endRecord.writeUInt16LE(entries.length, 8); // Entries on disk
  endRecord.writeUInt16LE(entries.length, 10); // Total entries
  endRecord.writeUInt32LE(centralDirBuffer.length, 12); // Central directory size
  endRecord.writeUInt32LE(offset, 16); // Central directory offset
  endRecord.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localParts, centralDirBuffer, endRecord]);
}
