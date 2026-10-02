/**
 * Sharing a practice session with a link (Phase 7D, D32): `shareSession`,
 * `unshareSession`, `getPublicSession`, `copySharedSession`,
 * `ownSharedSessionId`.
 *
 * Prisma is mocked at the module boundary, the same convention
 * `tests/unit/lib/app/breaks/saved/sessions.test.ts` uses for the session
 * data layer this file builds on. `yourBests` (Phase 7C's own data layer) and
 * `usernameOf` (Phase 6's own data layer) are mocked at their module
 * boundaries too. Everything this reaches through `sessions.ts` —
 * `readableTarget`, `toView`, `slotTarget`, `withSplit`, `assertRoom` — and
 * the pure `effectiveClimb` / `slotPlan` / `maxBpm` / `splitMinutes` /
 * `mintSlug` are left real.
 *
 * @see lib/app/breaks/saved/session-sharing.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma: mockPrisma } = vi.hoisted(() => {
  const mock = {
    practiceSession: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return { prisma: mock };
});

vi.mock('@/lib/db/client', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/app/breaks/saved/speeds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/app/breaks/saved/speeds')>();
  return { ...actual, yourBests: vi.fn() };
});

vi.mock('@/lib/app/breaks/community/profile', () => ({ usernameOf: vi.fn() }));

import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { usernameOf } from '@/lib/app/breaks/community/profile';
import {
  copySharedSession,
  getPublicSession,
  ownSharedSessionId,
  shareSession,
  unshareSession,
} from '@/lib/app/breaks/saved/session-sharing';
import { SESSIONS_MAX } from '@/lib/app/breaks/saved/sessions';
import { bestKey, yourBests } from '@/lib/app/breaks/saved/speeds';
import { assertDefined } from '@/tests/helpers/assertions';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cuser0000000000000000001';
const OTHER_ID = 'cuser0000000000000000002';
const SESSION_ID = 'csess0000000000000000001';
const SOURCE_ID = 'csess0000000000000000099';
const COPY_ID = 'csess0000000000000000100';
const BREAK_ID = 'cbrk00000000000000000001';
const BREAK_ID_2 = 'cbrk00000000000000000002';
const ENTRY_ID = 'centr0000000000000000001';
const SLUG = 'shrd000001';
const NOW = new Date('2026-10-02T12:00:00Z');

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: 'citm00000000000000000001',
    position: 0,
    breakId: BREAK_ID,
    libraryEntryId: null,
    titleSnapshot: 'Cold Carpet',
    level: 3,
    goalBpm: null,
    minutes: 5,
    minutesPinned: false,
    startPct: null,
    climbPct: null,
    climbShape: null,
    climbSteps: null,
    breakRef: {
      id: BREAK_ID,
      userId: USER_ID,
      title: 'Cold Carpet',
      meter: '4/4',
      bpm: 120,
      visibility: 'published',
      slug: 'cold0001',
    },
    libraryEntry: null,
    ...over,
  };
}

/** The shape `shareSession` reads with its own narrow `select`. */
function shareRow(over: Record<string, unknown> = {}) {
  return { slug: null, items: [itemRow()], ...over };
}

/** The shape `getPublicSession` / `copySharedSession` read with their own `select`. */
function sourceRow(over: Record<string, unknown> = {}) {
  return {
    id: SOURCE_ID,
    userId: OTHER_ID,
    slug: SLUG,
    name: 'Their session',
    description: null,
    totalMinutes: 10,
    startPct: 20,
    climbPct: 67,
    climbShape: 'steady',
    climbSteps: 4,
    countIn: 1,
    items: [itemRow()],
    ...over,
  };
}

/** What `practiceSession.create` answers, shaped like `SESSION_SELECT` so `toView` can run on it. */
function copyRow(over: Record<string, unknown> = {}) {
  return {
    id: COPY_ID,
    name: 'Their session',
    description: null,
    totalMinutes: 10,
    startPct: 20,
    climbPct: 67,
    climbShape: 'steady',
    climbSteps: 4,
    countIn: 1,
    visibility: 'private',
    slug: null,
    createdAt: NOW,
    updatedAt: NOW,
    items: [],
    parent: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(yourBests).mockResolvedValue(new Map());
  vi.mocked(usernameOf).mockResolvedValue(null);
  vi.mocked(prisma.practiceSession.count).mockResolvedValue(0);
});

describe('shareSession', () => {
  it('refuses 409 ITEMS_NOT_SHARED, naming a private own pattern and a gone one, and writes nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      shareRow({
        items: [
          itemRow({
            position: 0,
            breakRef: {
              id: BREAK_ID,
              userId: USER_ID,
              title: 'My secret',
              meter: '4/4',
              bpm: 100,
              visibility: 'private',
              slug: null,
            },
          }),
          itemRow({
            id: 'citm00000000000000000002',
            position: 1,
            breakId: null,
            breakRef: null,
            titleSnapshot: 'Deleted pattern',
          }),
        ],
      }) as never
    );

    const error = await shareSession(USER_ID, SESSION_ID).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'ITEMS_NOT_SHARED', status: 409 });
    expect((error as APIError).details).toEqual({
      items: [
        { position: 0, title: 'My secret', reason: 'private' },
        { position: 1, title: 'Deleted pattern', reason: 'gone' },
      ],
    });
    expect(prisma.practiceSession.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('shares when every item is link-shared, published, or a PUBLIC library entry', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      shareRow({
        items: [
          itemRow({
            position: 0,
            breakRef: {
              id: BREAK_ID,
              userId: OTHER_ID,
              title: 'Shared',
              meter: '4/4',
              bpm: 100,
              visibility: 'link',
              slug: 'shared01',
            },
          }),
          itemRow({
            id: 'citm00000000000000000002',
            position: 1,
            breakId: null,
            breakRef: null,
            libraryEntryId: ENTRY_ID,
            libraryEntry: {
              id: ENTRY_ID,
              title: 'Funky Drummer',
              meter: '4/4',
              bpm: 96,
              library: { visibility: 'system' },
            },
          }),
          itemRow({
            id: 'citm00000000000000000003',
            position: 2,
            breakRef: {
              id: BREAK_ID_2,
              userId: OTHER_ID,
              title: 'Published',
              meter: '4/4',
              bpm: 100,
              visibility: 'published',
              slug: 'pub00001x',
            },
          }),
        ],
      }) as never
    );
    vi.mocked(prisma.practiceSession.update).mockResolvedValue({ slug: 'newslug01' } as never);

    const result = await shareSession(USER_ID, SESSION_ID);

    expect(result).toEqual({ visibility: 'link', slug: 'newslug01' });
  });

  it('400s a session with no patterns, and writes nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(shareRow({ items: [] }) as never);

    const error = await shareSession(USER_ID, SESSION_ID).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(prisma.practiceSession.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('is null when the session is not the caller’s', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await shareSession(USER_ID, SESSION_ID)).toBeNull();
    expect(prisma.practiceSession.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — not this user's session
  });

  it('keeps the slug already minted', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      shareRow({ slug: 'existing1' }) as never
    );
    vi.mocked(prisma.practiceSession.update).mockResolvedValue({ slug: 'existing1' } as never);

    await shareSession(USER_ID, SESSION_ID);

    expect(prisma.practiceSession.update).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: { visibility: 'link', slug: 'existing1' },
      select: { slug: true },
    });
  });

  it('mints a fresh slug the first time', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      shareRow({ slug: null }) as never
    );
    vi.mocked(prisma.practiceSession.update).mockResolvedValue({ slug: 'whatever01' } as never);

    await shareSession(USER_ID, SESSION_ID);

    const call = vi.mocked(prisma.practiceSession.update).mock.calls[0][0] as {
      data: { slug: string };
    };
    expect(call.data.slug).toMatch(/^[0-9a-hj-km-np-tv-z]{10}$/);
  });
});

describe('unshareSession', () => {
  it('sets visibility to private, scoped by id and userId, and is true when something matched', async () => {
    vi.mocked(prisma.practiceSession.updateMany).mockResolvedValue({ count: 1 });

    expect(await unshareSession(USER_ID, SESSION_ID)).toBe(true);
    expect(prisma.practiceSession.updateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, userId: USER_ID },
      data: { visibility: 'private' },
    });
  });

  it('is false when nothing of the caller’s matched', async () => {
    vi.mocked(prisma.practiceSession.updateMany).mockResolvedValue({ count: 0 });

    expect(await unshareSession(USER_ID, SESSION_ID)).toBe(false);
  });
});

describe('getPublicSession', () => {
  it('is null when nothing is link-shared at that slug', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await getPublicSession(SLUG)).toBeNull();
  });

  it('shows an item whose pattern went private as unavailable, with no title', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({
        items: [
          itemRow({
            breakRef: {
              id: BREAK_ID,
              userId: OTHER_ID,
              title: 'Now private',
              meter: '4/4',
              bpm: 100,
              visibility: 'private',
              slug: null,
            },
          }),
        ],
      }) as never
    );

    const result = await getPublicSession(SLUG);

    expect(result?.items[0]).toEqual({ available: false, position: 0, minutes: 5 });
    expect(result?.items[0]).not.toHaveProperty('title');
  });

  it('carries no trace of the owner’s user id', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(sourceRow() as never);
    vi.mocked(usernameOf).mockResolvedValue('ghostnotes');

    const result = await getPublicSession(SLUG);

    const json = JSON.stringify(result);
    expect(json).not.toContain(OTHER_ID);
    expect(json.toLowerCase()).not.toContain('userid');
  });

  it('targets the goal first, clamped to the meter ceiling', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({ items: [itemRow({ goalBpm: 300 })] }) as never // 4/4 ceiling is 190
    );

    const result = await getPublicSession(SLUG);
    const item = result?.items[0];
    assertDefined(item);

    expect(item.available).toBe(true);
    if (item.available) expect(item.targetBpm).toBe(190);
  });

  it('falls back to the owner’s own best when there is no goal', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({ items: [itemRow({ goalBpm: null })] }) as never
    );
    vi.mocked(yourBests).mockResolvedValue(new Map([[bestKey({ breakId: BREAK_ID }, 3), 150]]));

    const result = await getPublicSession(SLUG);
    const item = result?.items[0];
    assertDefined(item);

    if (item.available) expect(item.targetBpm).toBe(150);
  });

  it('falls back to the pattern’s own tempo with neither a goal nor a best', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({ items: [itemRow({ goalBpm: null })] }) as never
    );

    const result = await getPublicSession(SLUG);
    const item = result?.items[0];
    assertDefined(item);

    if (item.available) expect(item.targetBpm).toBe(120); // breakRef.bpm
  });

  it('is the owner’s username when they have one', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(sourceRow() as never);
    vi.mocked(usernameOf).mockResolvedValue('ghostnotes');

    expect((await getPublicSession(SLUG))?.author).toBe('ghostnotes');
  });

  it('is null when the owner has no username', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(sourceRow() as never);
    vi.mocked(usernameOf).mockResolvedValue(null);

    expect((await getPublicSession(SLUG))?.author).toBeNull();
  });
});

describe('copySharedSession', () => {
  it('404s when nothing is link-shared at that slug, and creates nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    const error = await copySharedSession(USER_ID, SLUG).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(prisma.practiceSession.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to copy
  });

  it('keeps only the items the saver can open', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({
        items: [
          itemRow({
            position: 0,
            breakRef: {
              id: BREAK_ID,
              userId: OTHER_ID,
              title: 'Open',
              meter: '4/4',
              bpm: 100,
              visibility: 'link',
              slug: 'open0001x',
            },
          }),
          itemRow({
            id: 'citm00000000000000000002',
            position: 1,
            breakId: null,
            breakRef: null,
            titleSnapshot: 'Gone',
          }),
        ],
      }) as never
    );
    vi.mocked(prisma.practiceSession.create).mockResolvedValue(copyRow() as never);

    await copySharedSession(USER_ID, SLUG);

    const call = vi.mocked(prisma.practiceSession.create).mock.calls[0][0] as {
      data: { items?: { createMany: { data: unknown[] } } };
    };
    expect(call.data.items?.createMany.data).toHaveLength(1);
  });

  it('never copies a goal — every item lands with goalBpm null', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({
        items: [
          itemRow({ goalBpm: 150 }),
          itemRow({ id: 'citm00000000000000000002', position: 1, goalBpm: 170 }),
        ],
      }) as never
    );
    vi.mocked(prisma.practiceSession.create).mockResolvedValue(copyRow() as never);

    await copySharedSession(USER_ID, SLUG);

    const call = vi.mocked(prisma.practiceSession.create).mock.calls[0][0] as {
      data: { items?: { createMany: { data: Array<{ goalBpm: number | null }> } } };
    };
    const rows = call.data.items?.createMany.data ?? [];
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.goalBpm === null)).toBe(true);
  });

  it('credits the copy to its source when it is someone else’s', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({ userId: OTHER_ID }) as never
    );
    vi.mocked(prisma.practiceSession.create).mockResolvedValue(copyRow() as never);

    await copySharedSession(USER_ID, SLUG);

    expect(prisma.practiceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: SOURCE_ID }) })
    );
  });

  it('credits nobody when copying your own shared session', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sourceRow({ userId: USER_ID }) as never
    );
    vi.mocked(prisma.practiceSession.create).mockResolvedValue(copyRow() as never);

    await copySharedSession(USER_ID, SLUG);

    expect(prisma.practiceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: null }) })
    );
  });

  it('429s past the session cap, and creates nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(sourceRow() as never);
    vi.mocked(prisma.practiceSession.count).mockResolvedValue(SESSIONS_MAX);

    const error = await copySharedSession(USER_ID, SLUG).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'SESSION_LIMIT', status: 429 });
    expect(prisma.practiceSession.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('credits the saved copy’s view to the parent’s owner username', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(sourceRow() as never);
    vi.mocked(prisma.practiceSession.create).mockResolvedValue(
      copyRow({ parent: { userId: OTHER_ID, visibility: 'link', slug: 'open0001x' } }) as never
    );
    vi.mocked(usernameOf).mockResolvedValue('ghostnotes');

    const view = await copySharedSession(USER_ID, SLUG);

    expect(view.copiedFrom).toEqual({ username: 'ghostnotes', slug: 'open0001x' });
  });
});

describe('ownSharedSessionId', () => {
  it('is the id when the slug is the caller’s own', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({ id: SESSION_ID } as never);

    expect(await ownSharedSessionId(SLUG, USER_ID)).toBe(SESSION_ID);
    expect(prisma.practiceSession.findFirst).toHaveBeenCalledWith({
      where: { slug: SLUG, userId: USER_ID },
      select: { id: true },
    });
  });

  it('is null otherwise', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await ownSharedSessionId(SLUG, USER_ID)).toBeNull();
  });
});
