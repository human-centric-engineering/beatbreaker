/**
 * `lib/app/breaks/community/public.ts` — the one data layer behind
 * `/api/v1/public/patterns`, `/p/[slug]`, `/explore` and `/u/[username]`.
 *
 * The rules under test: a link share is never listed; an unknown username is
 * an empty page with no break query at all; usernames are one query per page,
 * never one per row; and nothing here ever answers with a user id, an
 * account name or an email — checked by asserting the shape AND by scanning
 * the serialised output for the raw id string.
 *
 * @see lib/app/breaks/community/public.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findMany: vi.fn(), findFirst: vi.fn() },
    drummerProfile: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import {
  TEMPO_BANDS,
  getPublicPattern,
  getPublicProfile,
  listPublished,
  openableIdForSlug,
  publishedForSitemap,
  readCursor,
  writeCursor,
  type PublicListQuery,
} from '@/lib/app/breaks/community/public';
import { critique, playability } from '@/lib/app/breaks/critic';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { breakPayload } from '@/lib/app/breaks/share';
import { prisma } from '@/lib/db/client';
import { testStyle } from '@/tests/helpers/catalogue';

const OWNER_ID = 'cuser0000000000000000001';
const OWNER_2_ID = 'cuser0000000000000000002';
const PARENT_OWNER_ID = 'cuser0000000000000000003';
const BREAK_ID = 'cbrk00000000000000000001';
const BREAK_2_ID = 'cbrk00000000000000000002';
const PARENT_ID = 'cbrk00000000000000000009';

/** A real, valid share payload — not a hand-shaped fake, so `storedPayloadSchema` accepts it. */
function payload(overrides: Record<string, unknown> = {}) {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 5,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return {
    ...breakPayload({
      bpm: 90,
      swing: 10,
      level: 5,
      arrangement: ['A', 'B'],
      A,
      B: deriveB(A, funk.params),
    }),
    ...overrides,
  };
}

function cardRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BREAK_ID,
    slug: 'abc1234567',
    title: 'Cold Carpet',
    description: null,
    style: 'funk',
    meter: '4/4',
    bpm: 90,
    level: 5,
    difficulty: 2,
    links: [],
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    userId: OWNER_ID,
    _count: { children: 3 },
    ...overrides,
  };
}

function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    ...cardRow(),
    visibility: 'published',
    doc: payload(),
    parentId: null,
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  };
}

const query = (overrides: Partial<PublicListQuery> = {}): PublicListQuery => ({
  sort: 'newest',
  limit: 24,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
});

describe('listPublished', () => {
  it('always scopes to published rows with a slug, regardless of filters', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query({ style: 'funk', tempo: 'fast', difficulty: 2 }));
    const { where } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.visibility).toBe('published');
    expect(where.slug).toEqual({ not: null });
  });

  it('adds style and meter to the where clause only when given', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query({ style: 'funk', meter: '3/4' }));
    const { where } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.style).toBe('funk');
    expect(where.meter).toBe('3/4');
  });

  it('omits style, meter, tempo and difficulty from the where clause when not given', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query());
    const { where } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where).not.toHaveProperty('style');
    expect(where).not.toHaveProperty('meter');
    expect(where).not.toHaveProperty('bpm');
    expect(where).not.toHaveProperty('difficulty');
  });

  it.each([
    ['slow', TEMPO_BANDS.slow],
    ['medium', TEMPO_BANDS.medium],
    ['fast', TEMPO_BANDS.fast],
  ] as const)('maps the %s tempo band onto a bpm filter', async (tempo, band) => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query({ tempo }));
    const { where } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.bpm).toEqual(band);
  });

  it('narrows to a username by looking up its owner and filtering on userId', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: OWNER_ID } as never);
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query({ username: 'GhostNotes' }));
    expect(prisma.drummerProfile.findUnique).toHaveBeenCalledWith({
      where: { username: 'ghostnotes' },
      select: { userId: true },
    });
    const { where } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where.userId).toBe(OWNER_ID);
  });

  it('answers an unknown username with an empty page and never queries breaks at all', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    const result = await listPublished(query({ username: 'nobody' }));
    expect(result).toEqual({ patterns: [], nextCursor: null });
    expect(prisma.break.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — unknown username short-circuits
  });

  it('orders newest first by publishedAt then id, both descending', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query({ sort: 'newest' }));
    const { orderBy } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      orderBy: unknown;
    };
    expect(orderBy).toEqual([{ publishedAt: 'desc' }, { id: 'desc' }]);
  });

  it('orders "most saved" by the copy count, then publishedAt, then id', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]);
    await listPublished(query({ sort: 'saved' }));
    const { orderBy } = vi.mocked(prisma.break.findMany).mock.calls[0][0] as {
      orderBy: unknown;
    };
    expect(orderBy).toEqual([
      { children: { _count: 'desc' } },
      { publishedAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('asks for one extra row as a look-ahead, and returns a cursor only when there is more', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => cardRow({ id: `cbrk0000000000000000000${i}` })) as never
    );
    const result = await listPublished(query({ limit: 2 }));
    expect(vi.mocked(prisma.break.findMany).mock.calls[0][0]?.take).toBe(3);
    expect(result.patterns).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns no cursor when the page is not full', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([cardRow()] as never);
    const result = await listPublished(query({ limit: 2 }));
    expect(result.nextCursor).toBeNull();
  });

  it('fetches usernames for a page in exactly one query, never one per row', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      cardRow({ id: BREAK_ID, userId: OWNER_ID }),
      cardRow({ id: BREAK_2_ID, userId: OWNER_2_ID }),
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
      { userId: OWNER_2_ID, username: 'sidestick' },
    ] as never);
    await listPublished(query());
    expect(prisma.drummerProfile.findMany).toHaveBeenCalledTimes(1);
    const { where } = vi.mocked(prisma.drummerProfile.findMany).mock.calls[0][0] as {
      where: { userId: { in: string[] } };
    };
    expect(new Set(where.userId.in)).toEqual(new Set([OWNER_ID, OWNER_2_ID]));
  });

  it('never lets a card carry the owner user id, and includes the pattern id', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      cardRow({ id: BREAK_ID, userId: OWNER_ID }),
      cardRow({ id: BREAK_2_ID, userId: OWNER_2_ID }),
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
      { userId: OWNER_2_ID, username: 'sidestick' },
    ] as never);
    const result = await listPublished(query());
    const json = JSON.stringify(result.patterns);
    expect(json).not.toContain(OWNER_ID);
    expect(json).not.toContain(OWNER_2_ID);
    expect(result.patterns[0]).toMatchObject({ id: BREAK_ID, author: 'ghostnotes' });
    expect(result.patterns[1]).toMatchObject({ id: BREAK_2_ID, author: 'sidestick' });
  });
});

describe('readCursor / writeCursor', () => {
  it.each([1, 24, 480, 99_999])('round-trips offset %i through the opaque cursor', (n) => {
    expect(readCursor(writeCursor(n))).toBe(n);
  });

  it('reads no cursor as the first page', () => {
    expect(readCursor(undefined)).toBe(0);
  });

  it('reads garbage as the first page rather than throwing', () => {
    expect(readCursor('not even base64 !!!')).toBe(0);
    expect(readCursor(btoa('not-a-number'))).toBe(0);
  });
});

describe('getPublicPattern', () => {
  it('queries a link-or-published visibility by slug', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    await getPublicPattern('abc1234567');
    expect(prisma.break.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'abc1234567', visibility: { in: ['link', 'published'] } },
      })
    );
  });

  it('answers null on a miss', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    expect(await getPublicPattern('nope')).toBeNull();
  });

  it('repairs and parses the stored doc, and derives a real critique from it', async () => {
    const doc = payload();
    vi.mocked(prisma.break.findFirst).mockResolvedValue(fullRow({ doc }) as never);
    const result = await getPublicPattern('abc1234567');
    expect(result?.doc).toEqual(doc);

    // The same transformation the source runs, so this checks a real derivation.
    const parsedDoc = breakDocFromPayload(doc);
    const report = critique(parsedDoc.A, parsedDoc.bpm);
    const checks = playability(parsedDoc.A, parsedDoc.bpm);
    expect(result?.critique).toEqual({
      score: report.score,
      verdict: report.verdict,
      playable: checks.hard,
    });
  });

  it('credits the owner by username, or nobody when there is no profile', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(fullRow({ userId: OWNER_ID }) as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
    ] as never);
    const withAuthor = await getPublicPattern('abc1234567');
    expect(withAuthor?.author).toBe('ghostnotes');

    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
    const withoutAuthor = await getPublicPattern('abc1234567');
    expect(withoutAuthor?.author).toBeNull();
  });

  it('has no basedOn when the row has no parent', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(fullRow({ parentId: null }) as never);
    const result = await getPublicPattern('abc1234567');
    expect(result?.basedOn).toBeNull();
    // one call only: the row itself. lineageOf must not query again for a null parent.
    expect(prisma.break.findFirst).toHaveBeenCalledTimes(1);
  });

  it('credits a copy to its published parent, by the parent owner’s username', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(fullRow({ parentId: PARENT_ID }) as never)
      .mockResolvedValueOnce({
        title: 'The original',
        slug: 'orig000001',
        userId: PARENT_OWNER_ID,
      } as never);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'the-original-author',
    } as never);

    const result = await getPublicPattern('abc1234567');
    expect(result?.basedOn).toEqual({
      title: 'The original',
      username: 'the-original-author',
      slug: 'orig000001',
    });
  });

  it('never leaks userId, parentId or gridHash', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      fullRow({ userId: OWNER_ID, parentId: PARENT_ID }) as never
    );
    const result = await getPublicPattern('abc1234567');
    const json = JSON.stringify(result);
    expect(json).not.toContain(OWNER_ID);
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('parentId');
    expect(result).not.toHaveProperty('gridHash');
    expect(result).toMatchObject({ id: BREAK_ID });
  });

  it('reads an unrecognised stored visibility as a link share, never as private', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      fullRow({ visibility: 'nonsense' }) as never
    );
    const result = await getPublicPattern('abc1234567');
    expect(result?.visibility).toBe('link');
  });
});

describe('getPublicProfile', () => {
  it('lower-cases the username before querying', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ghostnotes',
      bio: null,
    } as never);
    await getPublicProfile('GhostNotes');
    expect(prisma.drummerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: 'ghostnotes' } })
    );
  });
});

describe('publishedForSitemap', () => {
  it('returns only slug and updatedAt for patterns, and the distinct set of usernames', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      { slug: 'abc1234567', updatedAt: new Date('2026-01-01T00:00:00Z'), userId: OWNER_ID },
      { slug: 'def7654321', updatedAt: new Date('2026-01-02T00:00:00Z'), userId: OWNER_ID },
      { slug: null, updatedAt: new Date('2026-01-03T00:00:00Z'), userId: OWNER_2_ID },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
      { userId: OWNER_2_ID, username: 'sidestick' },
    ] as never);

    const result = await publishedForSitemap();
    // the null-slug row is dropped
    expect(result.patterns).toEqual([
      { slug: 'abc1234567', updatedAt: new Date('2026-01-01T00:00:00Z') },
      { slug: 'def7654321', updatedAt: new Date('2026-01-02T00:00:00Z') },
    ]);
    expect(result.usernames.sort()).toEqual(['ghostnotes', 'sidestick']);
  });

  it('de-duplicates a username shared by more than one published row', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      { slug: 'abc1234567', updatedAt: new Date(), userId: OWNER_ID },
      { slug: 'def7654321', updatedAt: new Date(), userId: OWNER_ID },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
    ] as never);
    const result = await publishedForSitemap();
    expect(result.usernames).toEqual(['ghostnotes']);
  });
});

describe('openableIdForSlug', () => {
  it('returns the id behind a shared or published slug', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({ id: BREAK_ID } as never);
    expect(await openableIdForSlug('abc1234567')).toBe(BREAK_ID);
    expect(prisma.break.findFirst).toHaveBeenCalledWith({
      where: { slug: 'abc1234567', visibility: { in: ['link', 'published'] } },
      select: { id: true },
    });
  });

  it('returns null for a slug that is not openable', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    expect(await openableIdForSlug('nope')).toBeNull();
  });
});
