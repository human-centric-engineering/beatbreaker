/**
 * Your practice sessions (Phase 7D): a timed run through patterns, each
 * climbing from below its target to the target and holding it (D30), in a
 * total time shared between them (D31).
 *
 * Prisma is mocked at the module boundary; `$transaction` calls its callback
 * with the very same mock object, so a test that arranges `prisma.x` sees the
 * same calls whether the source reaches it as `prisma.x` or as `tx.x` inside
 * a transaction. `yourBests` is mocked (it is Phase 7C's own data layer,
 * tested on its own terms); `bestKey` is kept real via `importActual` since
 * it is a pure key function the view depends on. `openableBy`, `readVisibility`,
 * `maxBpm`, `splitMinutes`, `effectiveClimb` and `slotPlan` are real, pure
 * functions and are left alone.
 *
 * @see lib/app/breaks/saved/sessions.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma: mockPrisma } = vi.hoisted(() => {
  const mock = {
    practiceSession: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    practiceSessionItem: {
      update: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    break: { findMany: vi.fn() },
    libraryEntry: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  // the same mock object plays both `prisma` and the transaction's `tx`
  mock.$transaction.mockImplementation((cb: (tx: typeof mock) => unknown) => cb(mock));
  return { prisma: mock };
});

vi.mock('@/lib/db/client', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/app/breaks/saved/speeds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/app/breaks/saved/speeds')>();
  return { ...actual, yourBests: vi.fn() };
});

import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { bestKey, yourBests } from '@/lib/app/breaks/saved/speeds';
import { assertDefined } from '@/tests/helpers/assertions';
import {
  createSession,
  deleteSession,
  readSession,
  replaceItems,
  SESSIONS_MAX,
  updateSession,
} from '@/lib/app/breaks/saved/sessions';
import { prisma } from '@/lib/db/client';
import { type ItemInput, runSlotSchema } from '@/lib/validations/practice-sessions';

const USER_ID = 'cuser0000000000000000001';
const OTHER_ID = 'cuser0000000000000000002';
const SESSION_ID = 'csess0000000000000000001';
const BREAK_ID = 'cbrk00000000000000000001';
const BREAK_ID_2 = 'cbrk00000000000000000002';
const ENTRY_ID = 'centr0000000000000000001';
const ITEM_ID = 'citm00000000000000000001';
const ITEM_ID_2 = 'citm00000000000000000002';
const NOW = new Date('2026-09-30T12:00:00Z');

function itemRow(over: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
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

function sessionRow(over: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    name: 'Warmup',
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
    items: [itemRow()],
    ...over,
  };
}

function itemInput(over: Partial<ItemInput> = {}): ItemInput {
  return {
    target: { breakId: BREAK_ID },
    level: 3,
    goalBpm: null,
    minutes: 1,
    minutesPinned: false,
    startPct: null,
    climbPct: null,
    climbShape: null,
    climbSteps: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => unknown) =>
    cb(mockPrisma)
  );
  vi.mocked(yourBests).mockResolvedValue(new Map());
  vi.mocked(prisma.practiceSession.count).mockResolvedValue(0);
});

describe('toView (via readSession) — target defaults', () => {
  it('a goal wins over your best and the pattern tempo', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({ items: [itemRow({ goalBpm: 150 })] }) as never
    );
    vi.mocked(yourBests).mockResolvedValue(new Map([[bestKey({ breakId: BREAK_ID }, 3), 130]]));

    const result = await readSession(USER_ID, SESSION_ID);

    expect(result?.items[0].targetBpm).toBe(150);
    expect(result?.items[0].bestBpm).toBe(130);
  });

  it('falls back to your best at that layer when there is no goal', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({ items: [itemRow({ goalBpm: null })] }) as never
    );
    vi.mocked(yourBests).mockResolvedValue(new Map([[bestKey({ breakId: BREAK_ID }, 3), 130]]));

    const result = await readSession(USER_ID, SESSION_ID);

    expect(result?.items[0].targetBpm).toBe(130);
  });

  it("falls back to the pattern's own tempo with no goal and no best", async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({ items: [itemRow({ goalBpm: null })] }) as never
    );
    vi.mocked(yourBests).mockResolvedValue(new Map());

    const result = await readSession(USER_ID, SESSION_ID);

    expect(result?.items[0].targetBpm).toBe(120); // breakRef.bpm
    expect(result?.items[0].bestBpm).toBeNull();
  });

  it.each([
    { meter: '4/4', bpm: 30, expected: 40 },
    { meter: '4/4', bpm: 350, expected: 190 },
    { meter: '6/8', bpm: 350, expected: 300 },
  ])(
    'holds a $bpm bpm $meter pattern to $expected, a target a run can log',
    async ({ meter, bpm, expected }) => {
      const row = itemRow({ goalBpm: null });
      vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
        sessionRow({ items: [{ ...row, breakRef: { ...row.breakRef, meter, bpm } }] }) as never
      );

      const result = await readSession(USER_ID, SESSION_ID);
      const item = result?.items[0];
      assertDefined(item);

      expect(item.targetBpm).toBe(expected);
      const logged = runSlotSchema.safeParse({
        title: item.title,
        level: item.level,
        targetBpm: item.targetBpm,
        reachedBpm: item.startBpm,
        seconds: 60,
      });
      expect(logged.success).toBe(true);
    }
  );

  it('holds your best to the meter ceiling too', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({ items: [itemRow({ goalBpm: null })] }) as never
    );
    vi.mocked(yourBests).mockResolvedValue(new Map([[bestKey({ breakId: BREAK_ID }, 3), 250]]));

    const result = await readSession(USER_ID, SESSION_ID);

    expect(result?.items[0].targetBpm).toBe(190); // 4/4 ceiling
    expect(result?.items[0].bestBpm).toBe(250);
  });

  it('starts startPct below the target, the session setting by default', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({ startPct: 20, items: [itemRow({ goalBpm: 120 })] }) as never
    );

    const result = await readSession(USER_ID, SESSION_ID);

    // 120 * (1 - 0.2) = 96
    expect(result?.items[0].startBpm).toBe(96);
  });

  it("uses the item's own startPct override, not the session's", async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({ startPct: 20, items: [itemRow({ goalBpm: 120, startPct: 50 })] }) as never
    );

    const result = await readSession(USER_ID, SESSION_ID);

    // 120 * (1 - 0.5) = 60
    expect(result?.items[0].startBpm).toBe(60);
  });

  it("is null for a break that is someone else's and private, with the title from the snapshot", async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({
        items: [
          itemRow({
            titleSnapshot: 'Old name',
            goalBpm: 140,
            breakRef: {
              id: BREAK_ID,
              userId: OTHER_ID,
              title: 'Live name',
              meter: '4/4',
              bpm: 120,
              visibility: 'private',
              slug: 'secret01',
            },
          }),
        ],
      }) as never
    );

    const result = await readSession(USER_ID, SESSION_ID);

    expect(result?.items[0].target).toBeNull();
    expect(result?.items[0].title).toBe('Old name');
    expect(result?.items[0].targetBpm).toBeNull();
    expect(result?.items[0].startBpm).toBeNull();
  });

  it('shows no slug for your own private break, even though you can open it', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({
        items: [
          itemRow({
            breakRef: {
              id: BREAK_ID,
              userId: USER_ID,
              title: 'Mine',
              meter: '4/4',
              bpm: 120,
              visibility: 'private',
              slug: 'mine0001',
            },
          }),
        ],
      }) as never
    );

    const result = await readSession(USER_ID, SESSION_ID);
    const target = result?.items[0].target;

    expect(target?.kind).toBe('break');
    expect(target && 'mine' in target ? target.mine : undefined).toBe(true);
    expect(target && 'slug' in target ? target.slug : undefined).toBeNull();
  });

  it('shows the slug for a link-shared break that is not yours', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(
      sessionRow({
        items: [
          itemRow({
            breakRef: {
              id: BREAK_ID,
              userId: OTHER_ID,
              title: "Someone else's",
              meter: '4/4',
              bpm: 120,
              visibility: 'link',
              slug: 'shared01',
            },
          }),
        ],
      }) as never
    );

    const result = await readSession(USER_ID, SESSION_ID);
    const target = result?.items[0].target;

    expect(target?.kind).toBe('break');
    expect(target && 'mine' in target ? target.mine : undefined).toBe(false);
    expect(target && 'slug' in target ? target.slug : undefined).toBe('shared01');
  });
});

describe('readSession / updateSession / replaceItems — another user’s session', () => {
  it('readSession is null, scoped by id and userId', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await readSession(USER_ID, SESSION_ID)).toBeNull();
    expect(vi.mocked(prisma.practiceSession.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: SESSION_ID, userId: USER_ID },
    });
  });

  it('updateSession is null, and updates nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await updateSession(USER_ID, SESSION_ID, { name: 'New name' })).toBeNull();
    expect(prisma.practiceSession.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — not this user's session
  });

  it('replaceItems is null, and writes nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await replaceItems(USER_ID, SESSION_ID, [itemInput()])).toBeNull();
    expect(prisma.practiceSessionItem.deleteMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — not this user's session
  });
});

describe('createSession', () => {
  it(`refuses with SESSION_LIMIT (429) at ${SESSIONS_MAX} sessions, and creates nothing`, async () => {
    vi.mocked(prisma.practiceSession.count).mockResolvedValue(SESSIONS_MAX);

    const error = await createSession(USER_ID, {
      name: 'One too many',
      description: null,
      totalMinutes: 10,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady',
      climbSteps: 4,
      countIn: 1,
      items: [],
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'SESSION_LIMIT', status: 429 });
    expect(prisma.practiceSession.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('404s when a named target is not visible to the caller', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([]); // nothing visible

    const error = await createSession(USER_ID, {
      name: 'Session',
      description: null,
      totalMinutes: 10,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady',
      climbSteps: 4,
      countIn: 1,
      items: [itemInput({ target: { breakId: BREAK_ID } })],
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(prisma.practiceSession.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing was visible to add
  });

  it('400s when there are more items than minutes', async () => {
    const error = await createSession(USER_ID, {
      name: 'Too many patterns',
      description: null,
      totalMinutes: 1,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady',
      climbSteps: 4,
      countIn: 1,
      items: [
        itemInput({ target: { breakId: BREAK_ID } }),
        itemInput({ target: { breakId: BREAK_ID_2 } }),
      ],
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(prisma.practiceSession.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it("400s a goal over the target's own meter ceiling (4/4 -> 190)", async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      { id: BREAK_ID, title: 'Cold Carpet', meter: '4/4' },
    ] as never);

    const error = await createSession(USER_ID, {
      name: 'Session',
      description: null,
      totalMinutes: 10,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady',
      climbSteps: 4,
      countIn: 1,
      items: [itemInput({ target: { breakId: BREAK_ID }, goalBpm: 191 })],
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe(
      "A goal is at most 190 bpm in this pattern's meter"
    );
    expect(prisma.practiceSession.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('stores the minutes split, dense positions, and keeps a pinned item exactly', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      { id: BREAK_ID, title: 'Cold Carpet', meter: '4/4' },
    ] as never);
    vi.mocked(prisma.libraryEntry.findMany).mockResolvedValue([
      { id: ENTRY_ID, title: 'Funky Drummer', meter: '4/4' },
    ] as never);
    vi.mocked(prisma.practiceSession.create).mockResolvedValue(sessionRow() as never);

    await createSession(USER_ID, {
      name: 'Session',
      description: null,
      totalMinutes: 10,
      startPct: 20,
      climbPct: 67,
      climbShape: 'steady',
      climbSteps: 4,
      countIn: 1,
      items: [
        itemInput({ target: { breakId: BREAK_ID }, minutes: 3, minutesPinned: true }),
        itemInput({ target: { libraryEntryId: ENTRY_ID }, minutes: 1, minutesPinned: false }),
      ],
    });

    const data = vi.mocked(prisma.practiceSession.create).mock.calls[0][0].data as {
      items: { createMany: { data: Array<{ position: number; minutes: number }> } };
    };
    const rows = data.items.createMany.data;

    expect(rows.map((r) => r.position)).toEqual([0, 1]);
    expect(rows[0].minutes).toBe(3); // the pin, kept exactly
    expect(rows[1].minutes).toBe(7); // 10 - 3, the only free slot
    expect(rows.reduce((a, r) => a + r.minutes, 0)).toBe(10);
  });
});

describe('updateSession', () => {
  it('re-splits the items around their pins when the total changes', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [
        { id: ITEM_ID, minutes: 5, minutesPinned: false },
        { id: ITEM_ID_2, minutes: 5, minutesPinned: false },
      ],
    } as never);
    vi.mocked(prisma.practiceSession.update).mockResolvedValue(sessionRow() as never);

    await updateSession(USER_ID, SESSION_ID, { totalMinutes: 20 });

    expect(vi.mocked(prisma.practiceSessionItem.update).mock.calls).toEqual(
      expect.arrayContaining([
        [{ where: { id: ITEM_ID }, data: { minutes: 10 } }],
        [{ where: { id: ITEM_ID_2 }, data: { minutes: 10 } }],
      ])
    );
  });

  it('does not touch an item whose minutes the re-split leaves unchanged', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [{ id: ITEM_ID, minutes: 10, minutesPinned: true }],
    } as never);
    vi.mocked(prisma.practiceSession.update).mockResolvedValue(sessionRow() as never);

    // same total; the single pinned item's split value cannot change
    await updateSession(USER_ID, SESSION_ID, { totalMinutes: 10, name: 'Renamed' });

    expect(prisma.practiceSessionItem.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to re-split
  });

  it('does not re-split at all when totalMinutes is not part of the update', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [{ id: ITEM_ID, minutes: 5, minutesPinned: false }],
    } as never);
    vi.mocked(prisma.practiceSession.update).mockResolvedValue(sessionRow() as never);

    await updateSession(USER_ID, SESSION_ID, { name: 'Renamed' });

    expect(prisma.practiceSessionItem.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — total was not part of the update
  });
});

describe('replaceItems', () => {
  it("keeps a kept item's breakId, libraryEntryId and titleSnapshot even though the body named none", async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [
        itemRow({
          id: ITEM_ID,
          breakId: BREAK_ID,
          libraryEntryId: null,
          titleSnapshot: 'Cold Carpet',
        }),
      ],
    } as never);
    vi.mocked(prisma.practiceSession.update).mockResolvedValue(sessionRow() as never);

    await replaceItems(USER_ID, SESSION_ID, [{ id: ITEM_ID, level: 4 } as ItemInput]);

    const call = vi.mocked(prisma.practiceSessionItem.createMany).mock.calls[0][0];
    assertDefined(call);
    const data = call.data as Array<{
      breakId: string | null;
      libraryEntryId: string | null;
      titleSnapshot: string;
    }>;
    expect(data[0]).toMatchObject({
      breakId: BREAK_ID,
      libraryEntryId: null,
      titleSnapshot: 'Cold Carpet',
    });
  });

  it('400s an id that is not in this session', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [itemRow({ id: ITEM_ID })],
    } as never);

    const error = await replaceItems(USER_ID, SESSION_ID, [
      { id: 'cnot0000000000000000001', level: 2 } as ItemInput,
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(prisma.practiceSessionItem.deleteMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('400s the same kept id named twice', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [itemRow({ id: ITEM_ID })],
    } as never);

    const error = await replaceItems(USER_ID, SESSION_ID, [
      { id: ITEM_ID, level: 2 } as ItemInput,
      { id: ITEM_ID, level: 3 } as ItemInput,
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
  });

  it('404s a new item naming a target the caller cannot see', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [],
    } as never);
    vi.mocked(prisma.break.findMany).mockResolvedValue([]); // nothing visible

    const error = await replaceItems(USER_ID, SESSION_ID, [itemInput()]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(prisma.practiceSessionItem.deleteMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('deletes the old items, then creates the new list', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [itemRow({ id: ITEM_ID })],
    } as never);
    vi.mocked(prisma.practiceSession.update).mockResolvedValue(sessionRow() as never);

    await replaceItems(USER_ID, SESSION_ID, [{ id: ITEM_ID, level: 1 } as ItemInput]);

    expect(prisma.practiceSessionItem.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION_ID },
    });
    expect(prisma.practiceSessionItem.createMany).toHaveBeenCalled();
    const deleteOrder = vi.mocked(prisma.practiceSessionItem.deleteMany).mock
      .invocationCallOrder[0];
    const createOrder = vi.mocked(prisma.practiceSessionItem.createMany).mock
      .invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it('skips createMany for an emptied list, but still deletes', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      totalMinutes: 10,
      items: [itemRow({ id: ITEM_ID })],
    } as never);
    vi.mocked(prisma.practiceSession.update).mockResolvedValue(sessionRow({ items: [] }) as never);

    await replaceItems(USER_ID, SESSION_ID, []);

    expect(prisma.practiceSessionItem.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: SESSION_ID },
    });
    expect(prisma.practiceSessionItem.createMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing left to create
  });
});

describe('deleteSession', () => {
  it("deletes, scoped by id and the caller's own userId", async () => {
    vi.mocked(prisma.practiceSession.deleteMany).mockResolvedValue({ count: 1 });
    await deleteSession(USER_ID, SESSION_ID);
    expect(prisma.practiceSession.deleteMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, userId: USER_ID },
    });
  });

  it('is false when there is no such session of yours', async () => {
    vi.mocked(prisma.practiceSession.deleteMany).mockResolvedValue({ count: 0 });
    expect(await deleteSession(USER_ID, SESSION_ID)).toBe(false);
  });

  it('is true when a session was deleted', async () => {
    vi.mocked(prisma.practiceSession.deleteMany).mockResolvedValue({ count: 1 });
    expect(await deleteSession(USER_ID, SESSION_ID)).toBe(true);
  });
});
