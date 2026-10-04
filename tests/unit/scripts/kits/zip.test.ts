/**
 * The zip reader's pure parts (`scripts/kits/zip.ts`). DRSKit is read member
 * by member out of a 2.8 GB archive, so the reader has to find each member
 * through the central directory, inflate it, and refuse one that is not what
 * the directory says.
 *
 * The archives here are written by hand, field by field, from the zip
 * specification (APPNOTE 4.3.7, 4.3.12, 4.3.16), so the test does not lean on
 * a second zip implementation to agree with the first.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

import { afterAll, describe, expect, it, vi } from 'vitest';

import type { ZipSource } from '@/scripts/kits/sources';
import { extract, readDirectory, type ReadAt, zipFile, zipTree } from '@/scripts/kits/zip';

// the cache, in a directory of the test's own rather than the repo's .kit-sources/
const { cache } = vi.hoisted(() => ({
  cache: `${process.env.TMPDIR ?? '/tmp'}/kits-zip-test-${process.pid}`,
}));
vi.mock('@/scripts/kits/fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scripts/kits/fetch')>()),
  CACHE: cache,
}));

interface Entry {
  name: string;
  data: Buffer;
  method?: 0 | 8;
  flags?: number;
}

/** A zip archive of `entries`, with an optional archive comment after the end record. */
function zipOf(entries: Entry[], comment = ''): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, data, method = 8, flags = 0 } of entries) {
    const body = method === 8 ? deflateRawSync(data) : data;
    const nameBuf = Buffer.from(name);
    const crc = crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += 30 + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(Buffer.byteLength(comment), 20);
  return Buffer.concat([...locals, cd, end, Buffer.from(comment)]);
}

const readerOf =
  (zip: Buffer): ReadAt =>
  (offset, length) =>
    zip.subarray(offset, offset + length);

const wav = Buffer.from('RIFF....WAVEfmt '.repeat(200));
const xml = Buffer.from('<instrument version="2.0"><sample name="Snare-1"/></instrument>');

describe('readDirectory()', () => {
  it('lists every file with its method, CRC and lengths, and leaves directories out', () => {
    const zip = zipOf([
      { name: 'DRSKit/', data: Buffer.alloc(0), method: 0 },
      { name: 'DRSKit/Snare/Snare.xml', data: xml, method: 0 },
      { name: 'DRSKit/Snare/samples/1-Snare.wav', data: wav },
    ]);
    const dir = readDirectory(readerOf(zip), zip.length);

    expect([...dir.keys()]).toEqual(['DRSKit/Snare/Snare.xml', 'DRSKit/Snare/samples/1-Snare.wav']);
    expect(dir.get('DRSKit/Snare/Snare.xml')).toMatchObject({
      method: 0,
      size: xml.length,
      compressed: xml.length,
      crc: crc32(xml) >>> 0,
    });
    const member = dir.get('DRSKit/Snare/samples/1-Snare.wav');
    expect(member).toMatchObject({ method: 8, size: wav.length, crc: crc32(wav) >>> 0 });
    // repetitive bytes deflate well, so the directory is not just echoing the size
    expect(member?.compressed).toBeLessThan(wav.length);
  });

  it('finds the end record behind an archive comment', () => {
    const zip = zipOf([{ name: 'a.txt', data: xml }], 'made by hand');
    expect([...readDirectory(readerOf(zip), zip.length).keys()]).toEqual(['a.txt']);
  });

  it('refuses something that is not a zip', () => {
    const junk = Buffer.alloc(64, 7);
    expect(() => readDirectory(readerOf(junk), junk.length)).toThrow('not a zip');
  });

  it('refuses a zip64 archive rather than misreading its offsets', () => {
    const zip = zipOf([{ name: 'a.txt', data: xml }]);
    // the end record's central-directory offset, set to zip64's marker
    zip.writeUInt32LE(0xffffffff, zip.length - 22 + 16);
    expect(() => readDirectory(readerOf(zip), zip.length)).toThrow('zip64');
  });

  it('refuses an encrypted member', () => {
    const zip = zipOf([{ name: 'secret.wav', data: wav, flags: 1 }]);
    expect(() => readDirectory(readerOf(zip), zip.length)).toThrow('secret.wav: encrypted');
  });
});

describe('extract()', () => {
  const zip = zipOf([
    { name: 'DRSKit/Snare/Snare.xml', data: xml, method: 0 },
    { name: 'DRSKit/Snare/samples/1-Snare.wav', data: wav },
  ]);
  const read = readerOf(zip);
  const dir = readDirectory(read, zip.length);
  const get = (name: string) => {
    const m = dir.get(name);
    if (!m) throw new Error(`no ${name}`);
    return m;
  };

  it('gives back a deflated member byte for byte', () => {
    const name = 'DRSKit/Snare/samples/1-Snare.wav';
    expect(extract(read, name, get(name)).equals(wav)).toBe(true);
  });

  it('gives back a stored member byte for byte', () => {
    const name = 'DRSKit/Snare/Snare.xml';
    expect(extract(read, name, get(name)).equals(xml)).toBe(true);
  });

  it('refuses a member whose bytes do not match its CRC32', () => {
    const name = 'DRSKit/Snare/Snare.xml';
    const m = get(name);
    const bad = Buffer.from(zip);
    // flip one byte of the stored member's data, after its header and name
    bad[m.offset + 30 + Buffer.byteLength(name)] ^= 0xff;
    expect(() => extract(readerOf(bad), name, m)).toThrow('does not match its CRC32');
  });

  it('refuses an offset that does not land on a local header', () => {
    const name = 'DRSKit/Snare/Snare.xml';
    expect(() => extract(read, name, { ...get(name), offset: 1 })).toThrow('no local header');
  });

  it('refuses a compression method it does not read', () => {
    const name = 'DRSKit/Snare/Snare.xml';
    expect(() => extract(read, name, { ...get(name), method: 14 })).toThrow('method 14');
  });
});

describe('zipTree() and zipFile(), against a cached archive', () => {
  afterAll(() => rmSync(cache, { recursive: true, force: true }));

  /** An archive in the cache, as a download would leave it, and a source pinned to it. */
  function cached(name: string, entries: Entry[], pin?: string): ZipSource {
    const zip = zipOf(entries);
    mkdirSync(join(cache, 'archives'), { recursive: true });
    writeFileSync(join(cache, 'archives', name), zip);
    return {
      kind: 'zip',
      archive: `https://example.test/kits/${name}`,
      bytes: zip.length,
      sha256: pin ?? createHash('sha256').update(zip).digest('hex'),
      title: 'Test kit',
      author: 'Nobody',
      url: 'https://example.test/',
      licence: 'CC0-1.0',
      licenceFile: 'Kit/README.md',
      checked: '2026-10-04',
      usedFor: 'tests',
    };
  }

  const entries: Entry[] = [
    { name: 'Kit/README.md', data: xml, method: 0 },
    { name: 'Kit/Snare/samples/1-Snare.wav', data: wav },
  ];

  it('lists the members and extracts one into the cache, byte for byte', async () => {
    const source = cached('first.zip', entries);
    const tree = await zipTree(source);
    expect([...tree.keys()]).toEqual(['Kit/README.md', 'Kit/Snare/samples/1-Snare.wav']);
    const local = await zipFile(source, 'Kit/Snare/samples/1-Snare.wav');
    expect(local.startsWith(join(cache, '/'))).toBe(true);
    expect(readFileSync(local).equals(wav)).toBe(true);
  });

  it('serves members already extracted without reading or hashing the archive', async () => {
    const source = cached('second.zip', entries);
    await zipFile(source, 'Kit/README.md');
    // the archive replaced by something that fails its pin on any read: a
    // build that touched it would throw, so one that succeeds never did
    writeFileSync(join(cache, 'archives', 'second.zip'), 'not the archive');
    vi.resetModules();
    const fresh = await import('@/scripts/kits/zip');
    expect((await fresh.zipTree(source)).size).toBe(2);
    expect(readFileSync(await fresh.zipFile(source, 'Kit/README.md')).equals(xml)).toBe(true);
    // a member never extracted does need the archive, and is refused by its pin
    await expect(fresh.zipFile(source, 'Kit/Snare/samples/1-Snare.wav')).rejects.toThrow(
      `sources.ts pins ${source.bytes}`
    );
  });

  it('refuses an archive that is not the one pinned, before reading anything out of it', async () => {
    const source = cached('third.zip', entries, 'f'.repeat(64));
    await expect(zipTree(source)).rejects.toThrow(`sha256`);
  });

  it('refuses a member the archive does not have', async () => {
    const source = cached('first.zip', entries);
    await expect(zipFile(source, 'Kit/Ride/samples/1-Ride.wav')).rejects.toThrow(
      'no Kit/Ride/samples/1-Ride.wav'
    );
  });
});
