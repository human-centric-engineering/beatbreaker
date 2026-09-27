/**
 * Sharing a saved pattern by link, and crediting the one a copy came from
 * (tasks 6.1 and 6.3).
 *
 * `isUniqueClash` is checked by shape (`{ code, meta: { target } }`) rather
 * than `instanceof Prisma.PrismaClientKnownRequestError` — `lib/app/**` may
 * not import `@prisma/client` — so a clash is simulated with a plain object
 * carrying that shape, exactly as Prisma's own error does.
 *
 * @see lib/app/breaks/community/sharing.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn() },
    drummerProfile: { findUnique: vi.fn() },
  },
}));

import {
  isUniqueClash,
  lineageOf,
  visibilityData,
  withFreshSlug,
} from '@/lib/app/breaks/community/sharing';
import { SLUG_LENGTH } from '@/lib/app/breaks/community/slug';
import { prisma } from '@/lib/db/client';

const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';

function slugClash(target: string | string[] = ['slug']) {
  return { code: 'P2002', meta: { target } };
}

beforeEach(() => vi.clearAllMocks());

describe('visibilityData', () => {
  it('mints a slug the first time a row leaves private with none yet', () => {
    const result = visibilityData({ slug: null }, 'link');
    expect(result.visibility).toBe('link');
    expect(result.slug).toHaveLength(SLUG_LENGTH);
  });

  it('keeps the slug a row already has, rather than minting another', () => {
    const result = visibilityData({ slug: 'kept000001' }, 'link');
    expect(result).toEqual({ visibility: 'link' });
  });

  it('never mints a slug for private, even without one yet', () => {
    const result = visibilityData({ slug: null }, 'private');
    expect(result).toEqual({ visibility: 'private' });
  });

  it('going private leaves an existing slug alone rather than clearing it', () => {
    const result = visibilityData({ slug: 'kept000001' }, 'private');
    expect(result).toEqual({ visibility: 'private' });
  });
});

describe('isUniqueClash', () => {
  it('is true for a P2002 whose target array names the column', () => {
    expect(isUniqueClash(slugClash(['slug']), 'slug')).toBe(true);
  });

  it('is true for a P2002 whose target is a string containing the column', () => {
    expect(isUniqueClash(slugClash('Break_slug_key'), 'slug')).toBe(true);
  });

  it('is false for a P2002 naming a different column', () => {
    expect(isUniqueClash(slugClash(['username']), 'slug')).toBe(false);
  });

  it('is false for any other Prisma error code', () => {
    expect(isUniqueClash({ code: 'P2025', meta: { target: ['slug'] } }, 'slug')).toBe(false);
  });

  it('is false for null, a string, or an error with no meta', () => {
    expect(isUniqueClash(null, 'slug')).toBe(false);
    expect(isUniqueClash('nope', 'slug')).toBe(false);
    expect(isUniqueClash({ code: 'P2002' }, 'slug')).toBe(false);
    expect(isUniqueClash(new Error('boom'), 'slug')).toBe(false);
  });
});

describe('withFreshSlug', () => {
  it('returns what the write returns when it succeeds first time', async () => {
    const write = vi.fn().mockResolvedValue('ok');
    await expect(withFreshSlug(write)).resolves.toBe('ok');
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('retries a slug clash and succeeds once a fresh one is tried', async () => {
    const write = vi.fn().mockRejectedValueOnce(slugClash()).mockResolvedValueOnce('minted');
    await expect(withFreshSlug(write)).resolves.toBe('minted');
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('rethrows an error that is not a slug clash, without retrying', async () => {
    const other = new Error('database is down');
    const write = vi.fn().mockRejectedValue(other);
    await expect(withFreshSlug(write)).rejects.toBe(other);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('does not retry on a unique clash naming a different column', async () => {
    const clash = slugClash(['username']);
    const write = vi.fn().mockRejectedValue(clash);
    await expect(withFreshSlug(write)).rejects.toBe(clash);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('gives up after the given number of tries, throwing the last error', async () => {
    const write = vi.fn().mockRejectedValue(slugClash());
    await expect(withFreshSlug(write, 3)).rejects.toMatchObject({ code: 'P2002' });
    expect(write).toHaveBeenCalledTimes(3);
  });
});

describe('lineageOf', () => {
  it('is null when there is no parent to credit', async () => {
    expect(await lineageOf(null)).toBeNull();
    expect(prisma.break.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to look up
  });

  it('credits the parent by its owner’s username, while it is published', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      title: 'The original',
      slug: 'orig000001',
      userId: OTHER_ID,
    } as never);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ghostnotes',
    } as never);

    const result = await lineageOf('cbrk00000000000000000009');

    expect(result).toEqual({ title: 'The original', username: 'ghostnotes', slug: 'orig000001' });
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]?.where).toEqual({
      id: 'cbrk00000000000000000009',
      visibility: 'published',
    });
  });

  it('is null when the parent no longer exists or is not published', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    expect(await lineageOf('cbrk00000000000000000009')).toBeNull();
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no parent, no lookup
  });

  it('is null when the parent has no slug', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      title: 'The original',
      slug: null,
      userId: OTHER_ID,
    } as never);
    expect(await lineageOf('cbrk00000000000000000009')).toBeNull();
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no address to credit
  });

  it('is null when the parent’s owner has no drummer profile', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      title: 'The original',
      slug: 'orig000001',
      userId: OTHER_ID,
    } as never);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    expect(await lineageOf('cbrk00000000000000000009')).toBeNull();
  });
});
