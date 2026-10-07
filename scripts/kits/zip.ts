/**
 * Reading a zip source: the archive downloaded once into the cache, checked
 * against its pin, and its members read from the local copy through the
 * central directory. Members once extracted are served from the cache, so the
 * archive is only needed, and hashed, when a member has to be extracted.
 *
 * Our own small reader, because the zip libraries to hand hold the whole
 * archive in memory and DRSKit's is 2.8 GB. It reads what DRSKit and
 * CrocellKit need and refuses the rest: no encryption, no archive split
 * across disks, members stored or deflated. CrocellKit is 5.6 GB, past what a
 * zip's 32-bit fields hold, so its offsets are in zip64's records instead.
 */

import { closeSync, mkdirSync, openSync, readSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { crc32, inflateRawSync } from 'node:zlib';

import { z } from 'zod';

import { archiveCacheDir as cacheDir, archiveOf } from '@/scripts/kits/archive';
import { inCache, readCached } from '@/scripts/kits/fetch';
import type { ZipSource } from '@/scripts/kits/sources';

export interface Member {
  /** 0 stored, 8 deflated. */
  method: number;
  crc: number;
  compressed: number;
  size: number;
  /** Where the member's local header starts. */
  offset: number;
}

/** Read `length` bytes at `offset`. */
export type ReadAt = (offset: number, length: number) => Buffer;

const EOCD = 0x06054b50;
const EOCD64 = 0x06064b50;
const LOCATOR64 = 0x07064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
/** The extra field that holds a member's 64-bit sizes and offset (APPNOTE 4.5.3). */
const EXTRA_ZIP64 = 0x0001;
/** The end record is 22 bytes, after which a comment of up to 65 535 may follow. */
const TAIL = 22 + 0xffff;
/** In a 32-bit field, "the value is in the zip64 record". */
const MAX32 = 0xffffffff;

function u64(buf: Buffer, at: number): number {
  const n = buf.readBigUInt64LE(at);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`zip64 field at ${at} is too large`);
  return Number(n);
}

/**
 * The zip64 end record the locator points to, or undefined if these 20 bytes
 * are not a locator that points at one. In an archive that is not zip64 they
 * are the tail of the last central entry, which could start with the
 * locator's signature by chance, so a pointer that lands nowhere is not an
 * error here.
 */
function zip64End(read: ReadAt, locator: Buffer, size: number): Buffer | undefined {
  if (locator.readUInt32LE(0) !== LOCATOR64) return undefined;
  const offset = locator.readBigUInt64LE(8);
  if (offset + 56n > BigInt(size)) return undefined;
  const end = read(Number(offset), 56);
  return end.readUInt32LE(0) === EOCD64 ? end : undefined;
}

/**
 * Where the central directory is and how many entries it holds. A zip64
 * archive says so with a locator just before the end record, which points to
 * a zip64 end record holding the 64-bit values (APPNOTE 4.3.14, 4.3.15).
 */
function centralOf(
  read: ReadAt,
  size: number,
  tail: Buffer,
  tailStart: number,
  at: number
): { count: number; cdSize: number; cdOffset: number } {
  const count = tail.readUInt16LE(at + 10);
  const cdSize = tail.readUInt32LE(at + 12);
  const cdOffset = tail.readUInt32LE(at + 16);
  const marked = count === 0xffff || cdSize === MAX32 || cdOffset === MAX32;

  // the locator's 20 bytes are in the tail already, unless a long comment pushed them out
  const loc = tailStart + at - 20;
  const locator = at >= 20 ? tail.subarray(at - 20, at) : loc >= 0 ? read(loc, 20) : undefined;
  const end = locator && zip64End(read, locator, size);
  if (!locator || !end) {
    if (marked) throw new Error('zip64 markers in the end record, but no zip64 end record');
    if (tail.readUInt16LE(at + 4) !== 0 || tail.readUInt16LE(at + 6) !== 0) {
      throw new Error('archives split across disks are not read here');
    }
    return { count, cdSize, cdOffset };
  }
  // the locator's total number of disks, and the end record's own disk numbers
  if (locator.readUInt32LE(16) !== 1 || end.readUInt32LE(16) !== 0 || end.readUInt32LE(20) !== 0) {
    throw new Error('archives split across disks are not read here');
  }
  return { count: u64(end, 32), cdSize: u64(end, 40), cdOffset: u64(end, 48) };
}

/**
 * A member's sizes and offset, with any field its central entry marks as
 * 0xffffffff read from its zip64 extra field instead. The extra field holds
 * only the marked fields, in this order (APPNOTE 4.5.3).
 */
function widen(
  name: string,
  extra: Buffer,
  m: { size: number; compressed: number; offset: number }
): void {
  const keys = (['size', 'compressed', 'offset'] as const).filter((k) => m[k] === MAX32);
  if (!keys.length) return;
  for (let p = 0; p + 4 <= extra.length;) {
    const id = extra.readUInt16LE(p);
    const len = extra.readUInt16LE(p + 2);
    if (id === EXTRA_ZIP64) {
      if (len < keys.length * 8) throw new Error(`${name}: its zip64 extra field is too short`);
      keys.forEach((k, i) => (m[k] = u64(extra, p + 4 + i * 8)));
      return;
    }
    p += 4 + len;
  }
  throw new Error(`${name}: zip64 markers but no zip64 extra field`);
}

/** Every file in the archive, by path. Directories are left out. */
export function readDirectory(read: ReadAt, size: number): Map<string, Member> {
  const start = Math.max(0, size - TAIL);
  const tail = read(start, size - start);
  let at = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tail.readUInt32LE(i) === EOCD) {
      at = i;
      break;
    }
  }
  if (at < 0) throw new Error('not a zip: no end of central directory');
  const { count, cdSize, cdOffset } = centralOf(read, size, tail, start, at);

  const cd = read(cdOffset, cdSize);
  const out = new Map<string, Member>();
  let p = 0;
  for (let n = 0; n < count; n++) {
    if (cd.readUInt32LE(p) !== CENTRAL) throw new Error(`central directory entry ${n} is corrupt`);
    const flags = cd.readUInt16LE(p + 8);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
    if (flags & 1) throw new Error(`${name}: encrypted`);
    if (!name.endsWith('/')) {
      const m: Member = {
        method: cd.readUInt16LE(p + 10),
        crc: cd.readUInt32LE(p + 16),
        compressed: cd.readUInt32LE(p + 20),
        size: cd.readUInt32LE(p + 24),
        offset: cd.readUInt32LE(p + 42),
      };
      widen(name, cd.subarray(p + 46 + nameLen, p + 46 + nameLen + extraLen), m);
      out.set(name, m);
    }
    p += 46 + nameLen + extraLen + cd.readUInt16LE(p + 32);
  }
  return out;
}

/** One member's bytes, inflated and checked against its CRC32 and length. */
export function extract(read: ReadAt, name: string, m: Member): Buffer {
  const local = read(m.offset, 30);
  if (local.readUInt32LE(0) !== LOCAL) throw new Error(`${name}: no local header`);
  const data = read(m.offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28), m.compressed);
  let out: Buffer;
  if (m.method === 0) out = data;
  else if (m.method === 8) out = inflateRawSync(data);
  else throw new Error(`${name}: compression method ${m.method} is not read here`);
  if (out.length !== m.size || crc32(out) >>> 0 !== m.crc) {
    throw new Error(`${name}: does not match its CRC32 and length in the archive`);
  }
  return out;
}

function reader(file: string): { read: ReadAt; close: () => void } {
  const fd = openSync(file, 'r');
  return {
    read: (offset, length) => {
      const buf = Buffer.alloc(length);
      let got = 0;
      while (got < length) {
        const n = readSync(fd, buf, got, length - got, offset + got);
        if (n === 0) throw new Error(`${file}: ends before ${offset + length}`);
        got += n;
      }
      return buf;
    },
    close: () => closeSync(fd),
  };
}

const memberSchema = z.object({
  method: z.number(),
  crc: z.number(),
  compressed: z.number(),
  size: z.number(),
  offset: z.number(),
});
const directorySchema = z.record(z.string(), memberSchema);

const directories = new Map<string, Map<string, Member>>();

/**
 * The archive's central directory. Read from the archive once it has passed
 * its pin, then kept as `directory.json` beside the extracted members, as a
 * git source keeps its `tree.json`. A build that needs only members already
 * extracted then reads neither the archive nor its 2.8 GB of hash.
 */
async function directoryOf(source: ZipSource): Promise<Map<string, Member>> {
  const dir = cacheDir(source);
  let members = directories.get(dir);
  if (members) return members;

  const file = join(dir, 'directory.json');
  const raw = readCached(file)?.toString('utf8');
  if (raw !== undefined) {
    members = new Map(Object.entries(directorySchema.parse(JSON.parse(raw))));
  } else {
    const r = reader(await archiveOf(source));
    try {
      members = readDirectory(r.read, source.bytes);
    } finally {
      r.close();
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(Object.fromEntries(members)));
  }
  directories.set(dir, members);
  return members;
}

/** The archive's file list: path → CRC32, as a git tree is path → blob hash. */
export async function zipTree(source: ZipSource): Promise<Map<string, string>> {
  const dir = await directoryOf(source);
  return new Map([...dir].map(([name, m]) => [name, m.crc.toString(16)]));
}

/**
 * One member, as a path in the cache. A member already extracted, and still
 * matching its CRC32 and length, is served without the archive; one that is
 * not is extracted from the archive, which is checked against its pin first.
 */
export async function zipFile(source: ZipSource, path: string): Promise<string> {
  const m = (await directoryOf(source)).get(path);
  if (!m) throw new Error(`${source.archive}: no ${path}`);
  const local = inCache(join(cacheDir(source), 'files'), path);
  const cached = readCached(local);
  if (cached && cached.length === m.size && crc32(cached) >>> 0 === m.crc) return local;

  const r = reader(await archiveOf(source));
  try {
    const bytes = extract(r.read, path, m);
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, bytes);
  } finally {
    r.close();
  }
  return local;
}
