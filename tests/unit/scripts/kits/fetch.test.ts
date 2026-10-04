/**
 * The fetcher's pure parts (`scripts/kits/fetch.ts`). Every source file is
 * checked against its git blob hash before it is used, so that hash has to be
 * git's own — a wrong one would reject every file, or worse, accept any.
 */

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { gitBlobSha, inCache, mapLimit, sha256 } from '@/scripts/kits/fetch';

describe('gitBlobSha()', () => {
  it('is the hash git gives the same bytes', () => {
    // `printf 'hello\n' | git hash-object --stdin`
    expect(gitBlobSha(Buffer.from('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
    // the empty blob, which every git knows
    expect(gitBlobSha(Buffer.alloc(0))).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  });
});

describe('sha256()', () => {
  it('is the standard digest', () => {
    expect(sha256(Buffer.from('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

describe('inCache()', () => {
  const dir = join('/tmp', 'cache', 'files');

  it('places a tree path under the cache directory', () => {
    expect(inCache(dir, 'Kits/808/kick.wav')).toBe(join(dir, 'Kits', '808', 'kick.wav'));
    // a `..` that stays inside is still inside
    expect(inCache(dir, 'a/../b.wav')).toBe(join(dir, 'b.wav'));
  });

  it('refuses a path that climbs out of it', () => {
    expect(() => inCache(dir, '../escape.wav')).toThrow('outside the cache');
    expect(() => inCache(dir, 'a/../../../etc/passwd')).toThrow('outside the cache');
  });

  it('refuses an absolute path, and the directory itself', () => {
    expect(() => inCache(dir, '/etc/passwd')).toThrow('outside the cache');
    expect(() => inCache(dir, '.')).toThrow('outside the cache');
  });
});

describe('mapLimit()', () => {
  it('keeps the input order whatever order the work finishes in', async () => {
    const out = await mapLimit([30, 10, 20], 3, async (ms) => {
      await new Promise((r) => setTimeout(r, ms));
      return ms;
    });
    expect(out).toEqual([30, 10, 20]);
  });

  it('never runs more than `limit` at once', async () => {
    let running = 0;
    let most = 0;
    await mapLimit([1, 2, 3, 4, 5, 6, 7], 2, async () => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 1));
      running--;
    });
    expect(most).toBe(2);
  });

  it('returns nothing for nothing', async () => {
    expect(await mapLimit([], 4, async () => 1)).toEqual([]);
  });
});
