/**
 * The tar source (`scripts/kits/tar.ts`): an archive unpacked whole once it
 * passes its pin, and its files served from the cache only while they still
 * match the hashes taken when it was unpacked.
 *
 * The archives here are made by the system `tar`, as the build's is read by
 * it, uncompressed so the test needs no bzip2.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import type { TarSource } from '@/scripts/kits/sources';
import { tarFile, tarTree } from '@/scripts/kits/tar';

// the cache, in a directory of the test's own rather than the repo's .kit-sources/
const { cache } = vi.hoisted(() => ({
  cache: `${process.env.TMPDIR ?? '/tmp'}/kits-tar-test-${process.pid}`,
}));
vi.mock('@/scripts/kits/fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scripts/kits/fetch')>()),
  CACHE: cache,
}));

const sha = (b: Buffer | string): string => createHash('sha256').update(b).digest('hex');

const wav = Buffer.from('RIFF....WAVEfmt '.repeat(200));
const readme = Buffer.from('Licence: CC-by-sa\n');

/**
 * A tarball of `files` in the cache, as a download would leave it, and a
 * source pinned to it. `link` adds a symlink member pointing out of the tree.
 */
function cached(name: string, opts: { pin?: string; link?: boolean } = {}): TarSource {
  const stage = join(cache, 'stage', name);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(join(stage, 'OH'), { recursive: true });
  writeFileSync(join(stage, 'REAMDE'), readme);
  writeFileSync(join(stage, 'OH', 'splash1_OH_F_1.wav'), wav);
  if (opts.link) symlinkSync('/etc/hosts', join(stage, 'OH', 'hosts.wav'));
  mkdirSync(join(cache, 'archives'), { recursive: true });
  const file = join(cache, 'archives', name);
  execFileSync('tar', ['-cf', file, '-C', stage, 'REAMDE', 'OH']);
  const bytes = readFileSync(file);
  return {
    kind: 'tar',
    archive: `https://example.test/kits/${name}`,
    bytes: bytes.length,
    sha256: opts.pin ?? sha(bytes),
    title: 'Test kit',
    author: 'Nobody',
    url: 'https://example.test/',
    licence: 'public-domain',
    licenceFile: 'REAMDE',
    checked: '2026-10-04',
    usedFor: 'tests',
  };
}

describe('tarTree() and tarFile()', () => {
  afterAll(() => rmSync(cache, { recursive: true, force: true }));

  it('unpacks the archive and lists every file with its sha256', async () => {
    const source = cached('first.tar');
    const tree = await tarTree(source);
    expect(Object.fromEntries(tree)).toEqual({
      'OH/splash1_OH_F_1.wav': sha(wav),
      REAMDE: sha(readme),
    });
    const local = await tarFile(source, 'OH/splash1_OH_F_1.wav');
    expect(local.startsWith(join(cache, '/'))).toBe(true);
    expect(readFileSync(local).equals(wav)).toBe(true);
  });

  it('serves files already unpacked without reading or hashing the archive', async () => {
    const source = cached('second.tar');
    await tarTree(source);
    // the archive replaced by something that fails its pin on any read
    writeFileSync(join(cache, 'archives', 'second.tar'), 'not the archive');
    vi.resetModules();
    const fresh = await import('@/scripts/kits/tar');
    expect((await fresh.tarTree(source)).size).toBe(2);
    expect(readFileSync(await fresh.tarFile(source, 'REAMDE')).equals(readme)).toBe(true);
  });

  it('extracts again a cached file that no longer matches its hash', async () => {
    const source = cached('third.tar');
    const local = await tarFile(source, 'REAMDE');
    writeFileSync(local, 'tampered');
    expect(readFileSync(await tarFile(source, 'REAMDE')).equals(readme)).toBe(true);
  });

  it('repairs a stale file once for many callers, and leaves the other files in place', async () => {
    const source = cached('seventh.tar');
    const other = await tarFile(source, 'OH/splash1_OH_F_1.wav');
    const before = statSync(other).ino;
    writeFileSync(await tarFile(source, 'REAMDE'), 'tampered');

    // eight at once, as the build's decodes are
    const got = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        tarFile(source, i % 2 ? 'REAMDE' : 'OH/splash1_OH_F_1.wav')
      )
    );
    for (const [i, local] of got.entries()) {
      expect(readFileSync(local).equals(i % 2 ? readme : wav)).toBe(true);
    }
    // the file a decode might be reading was never replaced
    expect(statSync(other).ino).toBe(before);
  });

  it('unpacks the archive once for callers that ask for its tree together', async () => {
    const source = cached('eighth.tar');
    const [a, b] = await Promise.all([tarTree(source), tarTree(source)]);
    expect(a).toBe(b);
  });

  it('needs the archive, and its pin, to replace a file that changed', async () => {
    const source = cached('fourth.tar');
    const local = await tarFile(source, 'REAMDE');
    writeFileSync(local, 'tampered');
    writeFileSync(join(cache, 'archives', 'fourth.tar'), 'not the archive');
    vi.resetModules();
    const fresh = await import('@/scripts/kits/tar');
    await expect(fresh.tarFile(source, 'REAMDE')).rejects.toThrow(
      `sources.ts pins ${source.bytes}`
    );
  });

  it('refuses an archive that is not the one pinned, before unpacking it', async () => {
    const source = cached('fifth.tar', { pin: 'f'.repeat(64) });
    await expect(tarTree(source)).rejects.toThrow('sha256');
  });

  it('refuses an archive with a link in it', async () => {
    const source = cached('sixth.tar', { link: true });
    await expect(tarTree(source)).rejects.toThrow('links are not unpacked');
  });

  it('refuses a file the archive does not have', async () => {
    const source = cached('first.tar');
    await expect(tarFile(source, 'OH/china1_OH_FF_1.wav')).rejects.toThrow(
      'no OH/china1_OH_FF_1.wav'
    );
  });
});
