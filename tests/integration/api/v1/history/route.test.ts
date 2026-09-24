/**
 * Integration Test: /api/v1/history — the practice history
 *
 * The real `withAuth` guard and the real `lib/app/breaks/saved/history` run
 * over a mocked session and a mocked Prisma. The visit table is a small
 * in-memory store rather than a stub per call, because what is under test is
 * what the list ENDS UP holding — one row per target, newest first, at most
 * 200 — and a stub that returned canned rows would only assert itself.
 *
 * What the store cannot do is evaluate a relation filter, so the list's
 * visibility rule is asserted as the `where` it sends, as the pins test does.
 * The upsert, the cap, the CHECK constraint and the cascades were also
 * exercised against a real Postgres when this was written.
 *
 * @see app/api/v1/history/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, POST } from '@/app/api/v1/history/route';
import { HISTORY_CAP } from '@/lib/app/breaks/saved/history';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => {
  const prisma = {
    practiceVisit: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    break: { findFirst: vi.fn() },
    libraryEntry: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const BREAK_ID = 'cbrk00000000000000000001';
const ENTRY_ID = 'centry000000000000000001';

/* ---- the in-memory visit table ---------------------------------------- */

interface Row {
  id: string;
  userId: string;
  breakId: string | null;
  libraryEntryId: string | null;
  level: number;
  bpm: number;
  visitedAt: Date;
}

let rows: Row[] = [];
let nextId = 0;
/** A clock that only moves forward, one second per write. */
let tick = 0;
const now = () => new Date(Date.UTC(2026, 8, 24, 12, 0, 0) + ++tick * 1000);
const cuid = () => `cvis${String(++nextId).padStart(20, '0')}`;

type Where = Partial<Row> & { id?: string | { in: string[] } };

function matches(row: Row, where: Where): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') continue; // the visibility rule: asserted as sent, not evaluated
    if (key === 'id' && value && typeof value === 'object') {
      if (!(value as unknown as { in: string[] }).in.includes(row.id)) return false;
    } else if (row[key as keyof Row] !== value) return false;
  }
  return true;
}

/** What a row looks like through VISIT_SELECT. */
function selected(row: Row) {
  return {
    id: row.id,
    level: row.level,
    bpm: row.bpm,
    visitedAt: row.visitedAt,
    breakRef: row.breakId
      ? {
          id: row.breakId,
          userId: row.breakId === 'cbrk-theirs0000000000001' ? OTHER_ID : USER_ID,
          title: `Pattern ${row.breakId.slice(-2)}`,
          style: 'funk',
          meter: '4/4',
          bpm: 92,
          level: 5,
          updatedAt: new Date('2026-09-20T00:00:00Z'),
        }
      : null,
    libraryEntry: row.libraryEntryId
      ? {
          id: row.libraryEntryId,
          title: 'Funky Drummer',
          artist: 'Clyde Stubblefield, 1970',
          styleKey: 'funk',
          meter: '4/4',
          bpm: 100,
          library: { key: 'famous' },
        }
      : null,
  };
}

const newestFirst = (list: Row[]) =>
  [...list].sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime() || (a.id < b.id ? 1 : -1));

function install() {
  const visit = vi.mocked(prisma.practiceVisit);
  visit.findMany.mockImplementation(((args: {
    where: Where;
    select?: { breakRef?: unknown };
    skip?: number;
    take?: number;
  }) => {
    const found = newestFirst(rows.filter((r) => matches(r, args.where))).slice(
      args.skip ?? 0,
      args.take === undefined ? undefined : (args.skip ?? 0) + args.take
    );
    return Promise.resolve(args.select?.breakRef ? found.map(selected) : found);
  }) as never);
  visit.upsert.mockImplementation(((args: {
    where: Record<string, Record<string, string>>;
    create: Pick<Row, 'userId' | 'level' | 'bpm' | 'visitedAt'> & Partial<Row>;
    update: Partial<Row>;
  }) => {
    const [key] = Object.values(args.where);
    let row = rows.find((r) => matches(r, key as Where));
    if (row) Object.assign(row, args.update);
    else {
      row = {
        id: cuid(),
        breakId: null,
        libraryEntryId: null,
        ...args.create,
      };
      rows.push(row);
    }
    return Promise.resolve({ id: row.id });
  }) as never);
  visit.findUnique.mockImplementation(((args: { where: { id: string } }) => {
    const row = rows.find((r) => r.id === args.where.id);
    return Promise.resolve(row ? selected(row) : null);
  }) as never);
  visit.deleteMany.mockImplementation(((args: { where: Where }) => {
    const before = rows.length;
    rows = rows.filter((r) => !matches(r, args.where));
    return Promise.resolve({ count: before - rows.length });
  }) as never);
  vi.mocked(prisma.$transaction).mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    Promise.resolve(fn(prisma))
  );
  // targets are visible unless a test says otherwise
  vi.mocked(prisma.break.findFirst).mockResolvedValue({ id: BREAK_ID } as never);
  vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue({ id: ENTRY_ID } as never);
}

function seed(userId: string, target: string, at: { level: number; bpm: number }): Row {
  const row: Row = {
    id: cuid(),
    userId,
    breakId: target.startsWith('cbrk') ? target : null,
    libraryEntryId: target.startsWith('centry') ? target : null,
    ...at,
    visitedAt: now(),
  };
  rows.push(row);
  return row;
}

/** The caller's history as target ids, newest first. */
function history(userId = USER_ID) {
  return newestFirst(rows.filter((r) => r.userId === userId)).map(
    (r) => r.breakId ?? r.libraryEntryId
  );
}

/* ---- requests --------------------------------------------------------- */

const BASE = 'http://localhost:3000/api/v1/history';

function record(body: unknown): Promise<Response> {
  return POST(
    new NextRequest(BASE, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

interface VisitBody {
  success: boolean;
  data: { id: string; level: number; bpm: number; target: Record<string, unknown> };
  error?: { code: string; message: string };
}

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  nextId = 0;
  tick = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(Date.UTC(2026, 8, 24, 13, 0, 0)));
  install();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

/** Move the clock on, so the next visit is strictly newer than the last. */
function later() {
  vi.setSystemTime(new Date(Date.now() + 60_000));
}

/* ---- tests ------------------------------------------------------------ */

describe('auth', () => {
  it('401s every method without a session, before any query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const answers = await Promise.all([
      GET(new NextRequest(BASE)),
      record({ breakId: BREAK_ID, level: 3, bpm: 72 }),
      DELETE(new NextRequest(BASE, { method: 'DELETE' })),
    ]);
    expect(answers.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(prisma.practiceVisit.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
    expect(prisma.practiceVisit.deleteMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

describe('GET /api/v1/history', () => {
  it('lists newest first from one query, each with where it was left', async () => {
    seed(USER_ID, ENTRY_ID, { level: 2, bpm: 68 });
    seed(USER_ID, BREAK_ID, { level: 3, bpm: 72 });

    const res = await GET(new NextRequest(BASE));
    const body = await json<{ data: VisitBody['data'][] }>(res);

    expect(res.status).toBe(200);
    expect(prisma.practiceVisit.findMany).toHaveBeenCalledTimes(1);
    expect(body.data.map((v) => [v.target.kind, v.target.id, v.level, v.bpm])).toEqual([
      ['break', BREAK_ID, 3, 72],
      ['entry', ENTRY_ID, 2, 68],
    ]);
  });

  it('asks only for visits whose target the caller can still see, and no more than the cap', async () => {
    await GET(new NextRequest(BASE));
    const args = vi.mocked(prisma.practiceVisit.findMany).mock.calls[0][0];
    expect(args?.where).toEqual({
      userId: USER_ID,
      OR: [
        { breakRef: { OR: [{ userId: USER_ID }, { shared: true }] } },
        { libraryEntry: { library: { visibility: 'system' } } },
      ],
    });
    expect(args?.take).toBe(HISTORY_CAP);
  });

  it('says whether a visited pattern is yours without naming its owner', async () => {
    seed(USER_ID, 'cbrk-theirs0000000000001', { level: 3, bpm: 72 });
    const body = await json<{ data: VisitBody['data'][] }>(await GET(new NextRequest(BASE)));
    expect(body.data[0].target).toMatchObject({ kind: 'break', mine: false });
    expect(body.data[0].target).not.toHaveProperty('userId');
  });

  it('shows only the caller’s visits', async () => {
    seed(OTHER_ID, BREAK_ID, { level: 3, bpm: 72 });
    const body = await json<{ data: unknown[] }>(await GET(new NextRequest(BASE)));
    expect(body.data).toEqual([]);
  });
});

describe('POST /api/v1/history', () => {
  it.each([
    [{ breakId: BREAK_ID }, 'break'],
    [{ libraryEntryId: ENTRY_ID }, 'entry'],
  ])('records a first visit to %o with its layer and tempo', async (target, kind) => {
    const res = await record({ ...target, level: 3, bpm: 72 });
    const body = await json<VisitBody>(res);

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ level: 3, bpm: 72, target: { kind } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: USER_ID, level: 3, bpm: 72, ...target });
  });

  it('upserts on the unique index, selecting the id alone so it stays one statement', async () => {
    await record({ libraryEntryId: ENTRY_ID, level: 3, bpm: 72 });
    const args = vi.mocked(prisma.practiceVisit.upsert).mock.calls[0][0];
    expect(args.where).toEqual({
      userId_libraryEntryId: { userId: USER_ID, libraryEntryId: ENTRY_ID },
    });
    expect(args.select).toEqual({ id: true });
  });

  it('moves a second visit to the top rather than adding a row, at the new layer and tempo', async () => {
    seed(USER_ID, BREAK_ID, { level: 5, bpm: 94 });
    seed(USER_ID, ENTRY_ID, { level: 5, bpm: 100 });
    later();

    await record({ breakId: BREAK_ID, level: 3, bpm: 72 });

    expect(rows).toHaveLength(2);
    expect(history()).toEqual([BREAK_ID, ENTRY_ID]);
    expect(rows.find((r) => r.breakId === BREAK_ID)).toMatchObject({ level: 3, bpm: 72 });
  });

  it(`keeps the newest ${HISTORY_CAP}: the ${HISTORY_CAP + 1}st visit drops the oldest`, async () => {
    const oldest = seed(USER_ID, 'centry-oldest00000000001', { level: 1, bpm: 60 });
    for (let i = 1; i < HISTORY_CAP; i++) {
      seed(USER_ID, `centry${String(i).padStart(18, '0')}`, { level: 3, bpm: 80 });
    }
    seed(OTHER_ID, 'centry-other000000000001', { level: 3, bpm: 80 });
    later();

    await record({ breakId: BREAK_ID, level: 3, bpm: 72 });

    expect(history()).toHaveLength(HISTORY_CAP);
    expect(history()[0]).toBe(BREAK_ID);
    expect(rows.find((r) => r.id === oldest.id)).toBeUndefined();
    // someone else's history is not the caller's cap to spend
    expect(history(OTHER_ID)).toEqual(['centry-other000000000001']);
  });

  it('checks the pattern is yours or shared, and 404s one that is neither', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);

    const res = await record({ breakId: BREAK_ID, level: 3, bpm: 72 });

    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]?.where).toEqual({
      id: BREAK_ID,
      OR: [{ userId: USER_ID }, { shared: true }],
    });
    expect(rows).toEqual([]);
  });

  it('checks the entry is in a library the catalogue shows, and 404s one that is not', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

    const res = await record({ libraryEntryId: ENTRY_ID, level: 3, bpm: 72 });

    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.libraryEntry.findFirst).mock.calls[0][0]?.where).toEqual({
      id: ENTRY_ID,
      library: { visibility: 'system' },
    });
    expect(rows).toEqual([]);
  });

  it.each([
    ['both targets', { breakId: BREAK_ID, libraryEntryId: ENTRY_ID, level: 3, bpm: 72 }],
    ['no target', { level: 3, bpm: 72 }],
    ['layer 0', { breakId: BREAK_ID, level: 0, bpm: 72 }],
    ['layer 6', { breakId: BREAK_ID, level: 6, bpm: 72 }],
    ['a fractional tempo', { breakId: BREAK_ID, level: 3, bpm: 72.5 }],
    ['a tempo past the range', { breakId: BREAK_ID, level: 3, bpm: 401 }],
    ['no tempo', { breakId: BREAK_ID, level: 3 }],
    ['a malformed id', { breakId: 'not-a-cuid', level: 3, bpm: 72 }],
  ])('400s on %s, and records nothing', async (_, body) => {
    const res = await record(body);
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('never takes the owner from the body', async () => {
    await record({ breakId: BREAK_ID, level: 3, bpm: 72, userId: OTHER_ID });
    expect(rows[0].userId).toBe(USER_ID);
  });
});

describe('DELETE /api/v1/history', () => {
  it('empties the caller’s history and leaves everyone else’s', async () => {
    seed(USER_ID, BREAK_ID, { level: 3, bpm: 72 });
    seed(USER_ID, ENTRY_ID, { level: 3, bpm: 72 });
    seed(OTHER_ID, ENTRY_ID, { level: 3, bpm: 72 });

    const res = await DELETE(new NextRequest(BASE, { method: 'DELETE' }));
    const body = await json<{ data: { cleared: number } }>(res);

    expect(res.status).toBe(200);
    expect(body.data.cleared).toBe(2);
    expect(history()).toEqual([]);
    expect(history(OTHER_ID)).toEqual([ENTRY_ID]);
  });
});
