/**
 * Publishing a pattern to the community library (Phase 6, task 6.9) — the one
 * place a row becomes `published`. Every refusal, in the order the source
 * checks them, and the write on success.
 *
 * Prisma is mocked at the module boundary; `isFeatureEnabled` is mocked too —
 * it belongs to a different subsystem with its own tests. `columnsFromDoc`,
 * `sectionHash`, `textIsBlocked` and `visibilityData` all run for real: the
 * duplicate checks and the slug-minting rule are exactly what this file is
 * testing.
 *
 * @see lib/app/breaks/community/publish.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/feature-flags', () => ({ isFeatureEnabled: vi.fn() }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    libraryEntry: { findMany: vi.fn() },
    drummerProfile: { findUnique: vi.fn() },
  },
}));

import { APIError, NotFoundError } from '@/lib/api/errors';
import {
  PUBLISH_DAILY_CAP,
  assertPublishable,
  publishBreak,
} from '@/lib/app/breaks/community/publish';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload, packPattern } from '@/lib/app/breaks/share';
import { prisma } from '@/lib/db/client';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { testStyle } from '@/tests/helpers/catalogue';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const BREAK_ID = 'cbrk00000000000000000001';

/** A real wire-format document, built the way the console builds one. */
function wireDoc(seed = 9): Record<string, unknown> {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 2, density: 50, ghosts: 50 });
  return breakPayload({
    bpm: 96,
    swing: 20,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

/** What `publishBreak`'s row lookup returns. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: BREAK_ID,
    title: 'Cold Carpet',
    description: 'A groove from the lesson',
    doc: wireDoc(),
    slug: null,
    publishedAt: null,
    ...overrides,
  };
}

const NOW = new Date('2026-09-27T00:00:00Z');

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  vi.mocked(prisma.break.findFirst).mockResolvedValue(row() as never);
  vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
    username: 'ghostnotes',
  } as never);
  vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([]);
  vi.mocked(prisma.break.count).mockResolvedValue(0);
  vi.mocked(prisma.break.update).mockResolvedValue({
    id: BREAK_ID,
    slug: 'freshslug1',
    publishedAt: NOW,
  } as never);
});

it('refuses with PUBLISHING_PAUSED (403) when the flag is off, before any query', async () => {
  vi.mocked(isFeatureEnabled).mockResolvedValue(false);

  await expect(publishBreak(USER_ID, BREAK_ID, NOW)).rejects.toMatchObject({
    code: 'PUBLISHING_PAUSED',
    status: 403,
  });
  expect(prisma.break.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the flag check must short-circuit
});

it('404s when the row is not the caller’s, or not saved at all', async () => {
  vi.mocked(prisma.break.findFirst).mockResolvedValue(null);

  const error = await publishBreak(USER_ID, BREAK_ID, NOW).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(NotFoundError);
  expect((error as NotFoundError).status).toBe(404);
  // scoped by both id and userId, as every other write
  expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]).toMatchObject({
    where: { id: BREAK_ID, userId: USER_ID },
  });
});

it('refuses with USERNAME_REQUIRED (409) when there is no drummer profile yet', async () => {
  vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);

  await expect(publishBreak(USER_ID, BREAK_ID, NOW)).rejects.toMatchObject({
    code: 'USERNAME_REQUIRED',
    status: 409,
  });
  expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
});

it('refuses with NOT_ALLOWED (422) for a blocked word in the title', async () => {
  vi.mocked(prisma.break.findFirst).mockResolvedValue(row({ title: 'This is shit' }) as never);

  await expect(publishBreak(USER_ID, BREAK_ID, NOW)).rejects.toMatchObject({
    code: 'NOT_ALLOWED',
    status: 422,
  });
});

it('refuses with NOT_ALLOWED (422) for a blocked word in the description', async () => {
  vi.mocked(prisma.break.findFirst).mockResolvedValue(
    row({ description: 'total shit, this one' }) as never
  );

  await expect(publishBreak(USER_ID, BREAK_ID, NOW)).rejects.toMatchObject({
    code: 'NOT_ALLOWED',
    status: 422,
  });
});

describe('duplicate notes', () => {
  it('refuses with DUPLICATE (409) naming someone else’s published pattern with the same notes', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row() as never) // the ownership lookup
      .mockResolvedValueOnce({ title: 'Funky Drummer Redux' } as never); // the duplicate query

    const error = await publishBreak(USER_ID, BREAK_ID, NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'DUPLICATE', status: 409 });
    expect((error as APIError).message).toContain('Funky Drummer Redux');

    // your own earlier publication must be excluded from the check
    const dupQuery = vi.mocked(prisma.break.findFirst).mock.calls[1][0] as {
      where: { visibility: string; userId: { not: string } };
    };
    expect(dupQuery.where.visibility).toBe('published');
    expect(dupQuery.where.userId).toEqual({ not: USER_ID });
  });

  it('refuses with DUPLICATE (409) naming the famous break when a section matches the library', async () => {
    const funk = testStyle('funk');
    const famous = generatePattern({
      style: funk,
      meter: '4/4',
      seed: 42,
      bars: 2,
      density: 60,
      ghosts: 40,
    });
    // the break's own A section is exactly the famous break's pattern
    const doc = breakPayload({
      bpm: 100,
      swing: 0,
      level: 5,
      arrangement: ['A', 'B'],
      A: famous,
      B: deriveB(famous, funk.params),
    }) as unknown as Record<string, unknown>;
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ doc }) as never) // the ownership lookup
      .mockResolvedValueOnce(null); // no OTHER person shares these notes
    vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([
      { title: 'Funky Drummer', artist: 'James Brown', doc: packPattern(famous) },
    ] as never);

    const error = await publishBreak(USER_ID, BREAK_ID, NOW).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'DUPLICATE', status: 409 });
    expect((error as APIError).message).toContain('Funky Drummer (James Brown)');
  });

  it('does not treat your own earlier publication as a duplicate', async () => {
    // the duplicate query itself excludes `userId: { not: userId }` — a match
    // here would only ever be someone else's, so a null answer is what a
    // publisher's own prior publication looks like from this check
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row() as never)
      .mockResolvedValueOnce(null); // no OTHER person's row shares the notes

    const result = await publishBreak(USER_ID, BREAK_ID, NOW);
    expect(result.visibility).toBe('published');
  });
});

it('refuses with PUBLISH_LIMIT (429) at the daily cap', async () => {
  vi.mocked(prisma.break.findFirst)
    .mockResolvedValueOnce(row() as never)
    .mockResolvedValueOnce(null); // no duplicate — the cap is what refuses this
  vi.mocked(prisma.break.count).mockResolvedValue(PUBLISH_DAILY_CAP);

  await expect(publishBreak(USER_ID, BREAK_ID, NOW)).rejects.toMatchObject({
    code: 'PUBLISH_LIMIT',
    status: 429,
  });
  expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
});

it('counts the daily cap only against publications in the last 24 hours', async () => {
  vi.mocked(prisma.break.findFirst)
    .mockResolvedValueOnce(row() as never)
    .mockResolvedValueOnce(null);
  await publishBreak(USER_ID, BREAK_ID, NOW);
  const countArgs = vi.mocked(prisma.break.count).mock.calls[0][0] as {
    where: { userId: string; publishedAt: { gte: Date } };
  };
  expect(countArgs.where.userId).toBe(USER_ID);
  expect(countArgs.where.publishedAt.gte.getTime()).toBe(NOW.getTime() - 24 * 60 * 60 * 1000);
});

it('republishes a pattern published before without counting it again, and keeps its first date', async () => {
  const first = new Date('2026-09-20T00:00:00Z');
  vi.mocked(prisma.break.findFirst)
    .mockResolvedValueOnce(row({ slug: 'kept000001', publishedAt: first }) as never)
    .mockResolvedValueOnce(null);
  // at the cap: a first publication would be refused, a republication is not
  vi.mocked(prisma.break.count).mockResolvedValue(PUBLISH_DAILY_CAP);

  await publishBreak(USER_ID, BREAK_ID, NOW);

  expect(prisma.break.count).not.toHaveBeenCalled(); // test-review:accept no_arg_called — only a first publication is counted
  const call = vi.mocked(prisma.break.update).mock.calls[0][0] as { data: Record<string, unknown> };
  // not bumped back to the top of Newest
  expect(call.data.publishedAt).toBe(first);
});

describe('fixing the notes (7A, D26)', () => {
  it('fixes them on the first publish', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row() as never)
      .mockResolvedValueOnce(null);
    await publishBreak(USER_ID, BREAK_ID, NOW);
    const call = vi.mocked(prisma.break.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.frozenAt).toBe(NOW);
  });

  it('keeps the first frozenAt when a pattern is published again', async () => {
    const first = new Date('2026-09-20T00:00:00Z');
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(
        row({ slug: 'kept000001', publishedAt: first, frozenAt: first }) as never
      )
      .mockResolvedValueOnce(null);
    await publishBreak(USER_ID, BREAK_ID, NOW);
    const call = vi.mocked(prisma.break.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.frozenAt).toBe(first);
  });
});

describe('an unchanged variation', () => {
  const PARENT_ID = 'cbrk00000000000000000002';

  it('is refused with DUPLICATE (409), naming the pattern it was saved from', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ parentId: PARENT_ID }) as never)
      .mockResolvedValueOnce(null); // nobody else's published pattern matches
    // the parent: the same notes, under its own name, tempo and swing
    vi.mocked(prisma.break.findUnique).mockResolvedValue({
      title: 'The original',
      doc: { ...wireDoc(), bpm: 120, sw: 0 },
    } as never);

    const error = await publishBreak(USER_ID, BREAK_ID, NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'DUPLICATE', status: 409 });
    expect((error as APIError).message).toContain(
      '“The original”, the pattern this was saved from'
    );
    expect(vi.mocked(prisma.break.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: PARENT_ID },
    });
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('publishes once its notes differ from the parent’s', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ parentId: PARENT_ID }) as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.break.findUnique).mockResolvedValue({
      title: 'The original',
      doc: wireDoc(3),
    } as never);

    const result = await publishBreak(USER_ID, BREAK_ID, NOW);
    expect(result.visibility).toBe('published');
  });

  it('is refused the same way when it is the author’s own variation (ownParentId)', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ parentId: null, ownParentId: PARENT_ID }) as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.break.findUnique).mockResolvedValue({
      title: 'The original',
      doc: wireDoc(),
    } as never);

    await expect(publishBreak(USER_ID, BREAK_ID, NOW)).rejects.toMatchObject({
      code: 'DUPLICATE',
      status: 409,
    });
    expect(vi.mocked(prisma.break.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: PARENT_ID },
    });
  });

  it('is checked on the first publish only — a republish is not held to its parent’s notes now', async () => {
    // a link-shared parent's notes can change later; that must not lock this one out
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(
        row({
          parentId: PARENT_ID,
          slug: 'kept000001',
          publishedAt: new Date('2026-09-20T00:00:00Z'),
        }) as never
      )
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.break.findUnique).mockResolvedValue({
      title: 'The original',
      doc: wireDoc(),
    } as never);

    const result = await publishBreak(USER_ID, BREAK_ID, NOW);
    expect(result.visibility).toBe('published');
    expect(prisma.break.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no parent comparison on a republish
  });

  it('asks about no parent when the pattern has none', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ parentId: null }) as never)
      .mockResolvedValueOnce(null);
    await publishBreak(USER_ID, BREAK_ID, NOW);
    expect(prisma.break.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to compare against
  });
});

describe('assertPublishable — the checks an edit to a published pattern also runs', () => {
  it('passes clean content and hands back the columns it derived', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    const doc = wireDoc(3);
    const { columns } = await assertPublishable(USER_ID, {
      title: 'Cold Carpet',
      description: null,
      payload: doc as never,
    });
    expect(columns.gridHash).toMatch(/^[0-9a-f]{64}$/);
    // someone else's published pattern with those notes is the query
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0]?.[0]).toMatchObject({
      where: { gridHash: columns.gridHash, visibility: 'published', userId: { not: USER_ID } },
    });
  });

  it('refuses a blocked word before looking at the notes', async () => {
    await expect(
      assertPublishable(USER_ID, {
        title: 'fuck this',
        description: null,
        payload: wireDoc() as never,
      })
    ).rejects.toMatchObject({ code: 'NOT_ALLOWED', status: 422 });
    expect(prisma.break.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any query
  });
});

describe('on success', () => {
  it('publishes, minting a slug when the row had none', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ slug: null }) as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.break.update).mockResolvedValue({
      id: BREAK_ID,
      slug: 'freshslug1',
      publishedAt: NOW,
    } as never);

    const result = await publishBreak(USER_ID, BREAK_ID, NOW);

    expect(result).toEqual({
      id: BREAK_ID,
      visibility: 'published',
      slug: 'freshslug1',
      publishedAt: NOW,
    });
    const call = vi.mocked(prisma.break.update).mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(call.where).toEqual({ id: BREAK_ID });
    expect(call.data).toMatchObject({ visibility: 'published', publishedAt: NOW });
    expect(typeof call.data.slug).toBe('string');
    expect((call.data.slug as string).length).toBeGreaterThan(0);
    expect(typeof call.data.gridHash).toBe('string');
    expect([1, 2, 3]).toContain(call.data.difficulty);
  });

  it('keeps the row’s existing slug rather than minting a second one', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ slug: 'kept000001' }) as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.break.update).mockResolvedValue({
      id: BREAK_ID,
      slug: 'kept000001',
      publishedAt: NOW,
    } as never);

    await publishBreak(USER_ID, BREAK_ID, NOW);

    const call = vi.mocked(prisma.break.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // visibilityData returns no `slug` key at all when the row already had one
    expect(call.data).not.toHaveProperty('slug');
  });
});
