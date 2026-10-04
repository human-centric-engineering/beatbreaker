/**
 * Reading a zip source: the archive downloaded once into the cache, checked
 * against its pin, and its members read from the local copy through the
 * central directory.
 *
 * Our own small reader, because the zip libraries to hand hold the whole
 * archive in memory and DRSKit's is 2.8 GB. It reads what DRSKit needs and
 * refuses the rest: no zip64, no encryption, members stored or deflated.
 */

import { createHash } from 'node:crypto';
import {
  closeSync,
  createReadStream,
  createWriteStream,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { crc32, inflateRawSync } from 'node:zlib';

import { CACHE, inCache, readCached } from '@/scripts/kits/fetch';
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
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
/** The end record is 22 bytes, after which a comment of up to 65 535 may follow. */
const TAIL = 22 + 0xffff;

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
  const count = tail.readUInt16LE(at + 10);
  const cdSize = tail.readUInt32LE(at + 12);
  const cdOffset = tail.readUInt32LE(at + 16);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('zip64 archives are not read here');
  }

  const cd = read(cdOffset, cdSize);
  const out = new Map<string, Member>();
  let p = 0;
  for (let n = 0; n < count; n++) {
    if (cd.readUInt32LE(p) !== CENTRAL) throw new Error(`central directory entry ${n} is corrupt`);
    const flags = cd.readUInt16LE(p + 8);
    const nameLen = cd.readUInt16LE(p + 28);
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
    if (flags & 1) throw new Error(`${name}: encrypted`);
    if (!name.endsWith('/')) {
      out.set(name, {
        method: cd.readUInt16LE(p + 10),
        crc: cd.readUInt32LE(p + 16),
        compressed: cd.readUInt32LE(p + 20),
        size: cd.readUInt32LE(p + 24),
        offset: cd.readUInt32LE(p + 42),
      });
    }
    p += 46 + nameLen + cd.readUInt16LE(p + 30) + cd.readUInt16LE(p + 32);
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

function archivePath(source: ZipSource): string {
  return join(CACHE, 'archives', basename(new URL(source.archive).pathname));
}

function cacheDir(source: ZipSource): string {
  return join(CACHE, `${basename(new URL(source.archive).pathname)}@${source.sha256.slice(0, 16)}`);
}

async function download(source: ZipSource, file: string): Promise<void> {
  console.log(`  downloading ${source.archive} (${(source.bytes / 1e9).toFixed(1)} GB, once)`);
  const res = await fetch(source.archive);
  if (!res.ok || !res.body) throw new Error(`${source.archive}: ${res.status} ${res.statusText}`);
  mkdirSync(dirname(file), { recursive: true });
  const part = `${file}.part`;
  await pipeline(Readable.fromWeb(res.body as WebReadableStream), createWriteStream(part));
  renameSync(part, file);
}

async function sha256Of(file: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

const verified = new Set<string>();

/** The archive, downloaded if it is not cached, and checked against its pin once a build. */
async function archiveOf(source: ZipSource): Promise<string> {
  const file = archivePath(source);
  if (verified.has(file)) return file;
  let size: number | undefined;
  try {
    size = statSync(file).size;
  } catch {
    await download(source, file);
    size = statSync(file).size;
  }
  if (size !== source.bytes) {
    throw new Error(
      `${file}: ${size} bytes, sources.ts pins ${source.bytes}; delete it to re-fetch`
    );
  }
  const got = await sha256Of(file);
  if (got !== source.sha256) {
    throw new Error(`${source.archive}: sha256 ${got}, sources.ts pins ${source.sha256}`);
  }
  verified.add(file);
  return file;
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

const directories = new Map<string, Map<string, Member>>();

async function directoryOf(source: ZipSource): Promise<Map<string, Member>> {
  const file = await archiveOf(source);
  let dir = directories.get(file);
  if (!dir) {
    const r = reader(file);
    try {
      dir = readDirectory(r.read, source.bytes);
    } finally {
      r.close();
    }
    directories.set(file, dir);
  }
  return dir;
}

/** The archive's file list: path → CRC32, as a git tree is path → blob hash. */
export async function zipTree(source: ZipSource): Promise<Map<string, string>> {
  const dir = await directoryOf(source);
  return new Map([...dir].map(([name, m]) => [name, m.crc.toString(16)]));
}

/** One member, as a path in the cache, extracted the first time it is asked for. */
export async function zipFile(source: ZipSource, path: string): Promise<string> {
  const m = (await directoryOf(source)).get(path);
  if (!m) throw new Error(`${source.archive}: no ${path}`);
  const local = inCache(join(cacheDir(source), 'files'), path);
  const cached = readCached(local);
  if (cached && cached.length === m.size && crc32(cached) >>> 0 === m.crc) return local;

  const r = reader(archivePath(source));
  try {
    const bytes = extract(r.read, path, m);
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, bytes);
  } finally {
    r.close();
  }
  return local;
}
