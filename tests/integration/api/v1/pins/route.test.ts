/**
 * Integration Test: /api/v1/pins and /api/v1/pins/:id — the practice shelves
 *
 * The real `withAuth` guard and the real `lib/app/breaks/saved/pins` run over
 * a mocked session and a mocked Prisma. The pin table is a small in-memory
 * store rather than a stub per call, because what is under test is where pins
 * END UP — top of the shelf, after another pin, renumbered 0…n — and a stub
 * that returned canned rows would only assert itself.
 *
 * What the store cannot do is evaluate a relation filter, so the list's
 * visibility rule (yours, shared, or in the catalogue) is asserted as the
 * `where` it sends. That rule, the CHECK constraint and every cascade were
 * also exercised against a real Postgres when this was written.
 *
 * @see app/api/v1/pins/route.ts
 * @see app/api/v1/pins/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, PATCH } from '@/app/api/v1/pins/[id]/route';
import { GET, POST } from '@/app/api/v1/pins/route';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => {
  const prisma = {
    pin: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

/* ---- the in-memory pin table ------------------------------------------ */

interface Row {
  id: string;
  userId: string;
  shelf: string;
  position: number;
  breakId: string | null;
  libraryEntryId: string | null;
  createdAt: Date;
}

let rows: Row[] = [];
let nextId = 0;
/** Targets the caller can no longer see — a pattern its owner unshared. */
let hidden = new Set<string>();
const cuid = () => `cpin${String(++nextId).padStart(20, '0')}`;

type Where = Partial<Row> & { NOT?: { id: string } };

function matches(row: Row, where: Where): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'NOT') {
      if (row.id === (value as { id: string }).id) return false;
    } else if (key === 'OR') {
      /* The visibility rule. The store cannot evaluate a relation filter, so
         it stands in for the database's answer: a hidden target fails it. */
      if (hidden.has(row.breakId ?? row.libraryEntryId ?? '')) return false;
    } else if (key === 'breakRef' || key === 'libraryEntry') {
      continue; // asserted as sent, not evaluated
    } else if (row[key as keyof Row] !== value) return false;
  }
  return true;
}

/** What a row looks like through PIN_SELECT, with a target of either kind. */
function selected(row: Row) {
  return {
    id: row.id,
    shelf: row.shelf,
    position: row.position,
    createdAt: row.createdAt,
    breakRef: row.breakId
      ? {
          id: row.breakId,
          userId: USER_ID,
          title: `Pattern ${row.breakId.slice(-2)}`,
          style: 'funk',
          meter: '4/4',
          bpm: 92,
          level: 3,
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

const sorted = (list: Row[]) =>
  [...list].sort(
    (a, b) => a.position - b.position || b.createdAt.getTime() - a.createdAt.getTime()
  );

function install() {
  const pin = vi.mocked(prisma.pin);
  pin.findMany.mockImplementation(((args: { where: Where; select?: { breakRef?: unknown } }) => {
    const found = sorted(rows.filter((r) => matches(r, args.where)));
    return Promise.resolve(args.select?.breakRef ? found.map(selected) : found);
  }) as never);
  pin.findFirst.mockImplementation(((args: { where: Where; select?: { breakRef?: unknown } }) => {
    const found = rows.find((r) => matches(r, args.where));
    if (!found) return Promise.resolve(null);
    return Promise.resolve(args.select?.breakRef ? selected(found) : found);
  }) as never);
  pin.create.mockImplementation(((args: { data: Partial<Row> }) => {
    const data = args.data as Pick<Row, 'userId' | 'shelf' | 'position'> & Partial<Row>;
    const row: Row = {
      id: cuid(),
      userId: data.userId,
      shelf: data.shelf,
      position: data.position,
      breakId: data.breakId ?? null,
      libraryEntryId: data.libraryEntryId ?? null,
      createdAt: new Date(Date.UTC(2026, 8, 24, 0, 0, nextId)),
    };
    rows.push(row);
    return Promise.resolve({ id: row.id });
  }) as never);
  pin.update.mockImplementation(((args: { where: { id: string }; data: Partial<Row> }) => {
    const row = rows.find((r) => r.id === args.where.id);
    if (!row) return Promise.reject(new Error('P2025'));
    Object.assign(row, args.data);
    return Promise.resolve(row);
  }) as never);
  pin.deleteMany.mockImplementation(((args: { where: Where }) => {
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

/** Shelf contents as `[target id, position]`, in order. */
function shelf(name: string, userId = USER_ID) {
  return sorted(rows.filter((r) => r.userId === userId && r.shelf === name)).map((r) => [
    r.breakId ?? r.libraryEntryId,
    r.position,
  ]);
}

function seed(userId: string, shelfName: string, target: string, position: number): Row {
  const row: Row = {
    id: cuid(),
    userId,
    shelf: shelfName,
    position,
    breakId: target.startsWith('cbrk') ? target : null,
    libraryEntryId: target.startsWith('centry') ? target : null,
    createdAt: new Date(Date.UTC(2026, 8, 1, 0, 0, nextId)),
  };
  rows.push(row);
  return row;
}

/* ---- requests --------------------------------------------------------- */

const BASE = 'http://localhost:3000/api/v1/pins';

function send(method: 'POST' | 'PATCH', body: unknown, id?: string): NextRequest {
  return new NextRequest(id ? `${BASE}/${id}` : BASE, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

interface PinBody {
  success: boolean;
  data: { id: string; shelf: string; position: number; target: Record<string, unknown> };
  error?: { code: string; message: string };
}

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  nextId = 0;
  hidden = new Set();
  install();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

/* ---- tests ------------------------------------------------------------ */

describe('auth', () => {
  it('401s every method without a session, before any query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const id = 'cpin00000000000000000001';
    const answers = await Promise.all([
      GET(new NextRequest(BASE)),
      POST(send('POST', { shelf: 'later', breakId: BREAK_ID })),
      PATCH(send('PATCH', { shelf: 'later' }, id), ctx(id)),
      DELETE(new NextRequest(`${BASE}/${id}`, { method: 'DELETE' }), ctx(id)),
    ]);
    expect(answers.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    expect(prisma.pin.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

describe('GET /api/v1/pins', () => {
  it('fills both shelves from one query, each in order', async () => {
    seed(USER_ID, 'later', ENTRY_ID, 0);
    seed(USER_ID, 'practising', BREAK_ID, 0);
    seed(USER_ID, 'practising', 'centry000000000000000002', 1);

    const res = await GET(new NextRequest(BASE));
    const body = await json<{
      data: Record<string, Array<{ target: { kind: string; id: string } }>>;
    }>(res);

    expect(res.status).toBe(200);
    expect(prisma.pin.findMany).toHaveBeenCalledTimes(1);
    expect(Object.keys(body.data)).toEqual(['practising', 'later']);
    expect(body.data.practising.map((p) => [p.target.kind, p.target.id])).toEqual([
      ['break', BREAK_ID],
      ['entry', 'centry000000000000000002'],
    ]);
    expect(body.data.later.map((p) => p.target.id)).toEqual([ENTRY_ID]);
  });

  it('asks only for pins whose target the caller can still see — an unshared pattern drops out', async () => {
    await GET(new NextRequest(BASE));
    const where = vi.mocked(prisma.pin.findMany).mock.calls[0][0]?.where;
    expect(where).toEqual({
      userId: USER_ID,
      OR: [
        { breakRef: { OR: [{ userId: USER_ID }, { shared: true }] } },
        { libraryEntry: { library: { visibility: 'system' } } },
      ],
    });
  });

  it('says whether a pinned pattern is yours without naming its owner', async () => {
    seed(USER_ID, 'practising', BREAK_ID, 0);
    const body = await json<{ data: { practising: Array<{ target: Record<string, unknown> }> } }>(
      await GET(new NextRequest(BASE))
    );
    const target = body.data.practising[0].target;
    expect(target).toMatchObject({ kind: 'break', mine: true, title: 'Pattern 01', level: 3 });
    expect(target).not.toHaveProperty('userId');
  });

  it('carries the library key with an entry, so a client can open it', async () => {
    seed(USER_ID, 'later', ENTRY_ID, 0);
    const body = await json<{ data: { later: Array<{ target: Record<string, unknown> }> } }>(
      await GET(new NextRequest(BASE))
    );
    expect(body.data.later[0].target).toMatchObject({
      kind: 'entry',
      libraryKey: 'famous',
      artist: 'Clyde Stubblefield, 1970',
    });
  });
});

describe('POST /api/v1/pins', () => {
  it.each([
    ['practising', { breakId: BREAK_ID }, 'break'],
    ['later', { breakId: BREAK_ID }, 'break'],
    ['practising', { libraryEntryId: ENTRY_ID }, 'entry'],
    ['later', { libraryEntryId: ENTRY_ID }, 'entry'],
  ])('pins to %s: %o', async (shelfName, target, kind) => {
    const res = await POST(send('POST', { shelf: shelfName, ...target }));
    const body = await json<PinBody>(res);

    expect(res.status).toBe(201);
    expect(body.data).toMatchObject({ shelf: shelfName, position: 0, target: { kind } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: USER_ID, shelf: shelfName, ...target });
  });

  it('puts a new pin at the top and moves the rest down', async () => {
    seed(USER_ID, 'practising', 'centry000000000000000002', 0);
    seed(USER_ID, 'practising', 'centry000000000000000003', 1);

    await POST(send('POST', { shelf: 'practising', breakId: BREAK_ID }));

    expect(shelf('practising')).toEqual([
      [BREAK_ID, 0],
      ['centry000000000000000002', 1],
      ['centry000000000000000003', 2],
    ]);
  });

  it('checks the pattern is yours or shared, and 404s one that is neither', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);

    const res = await POST(send('POST', { shelf: 'later', breakId: BREAK_ID }));

    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]?.where).toEqual({
      id: BREAK_ID,
      OR: [{ userId: USER_ID }, { shared: true }],
    });
    expect(rows).toEqual([]);
  });

  it('checks the entry is in a library the catalogue shows, and 404s one that is not', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

    const res = await POST(send('POST', { shelf: 'later', libraryEntryId: ENTRY_ID }));

    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.libraryEntry.findFirst).mock.calls[0][0]?.where).toEqual({
      id: ENTRY_ID,
      library: { visibility: 'system' },
    });
    expect(rows).toEqual([]);
  });

  it('pinning something already on that shelf leaves it where it is — 200, not a second row', async () => {
    seed(USER_ID, 'practising', ENTRY_ID, 0);
    seed(USER_ID, 'practising', BREAK_ID, 1);

    const res = await POST(send('POST', { shelf: 'practising', breakId: BREAK_ID }));

    expect(res.status).toBe(200);
    expect(shelf('practising')).toEqual([
      [ENTRY_ID, 0],
      [BREAK_ID, 1],
    ]);
  });

  it('pinning something on the other shelf moves it to the top of this one', async () => {
    seed(USER_ID, 'later', BREAK_ID, 0);
    seed(USER_ID, 'practising', ENTRY_ID, 0);

    const res = await POST(send('POST', { shelf: 'practising', breakId: BREAK_ID }));

    expect(res.status).toBe(200);
    expect(rows).toHaveLength(2);
    expect(shelf('practising')).toEqual([
      [BREAK_ID, 0],
      [ENTRY_ID, 1],
    ]);
    expect(shelf('later')).toEqual([]);
  });

  it.each([
    ['neither target', { shelf: 'later' }],
    ['both targets', { shelf: 'later', breakId: BREAK_ID, libraryEntryId: ENTRY_ID }],
    ['an unknown shelf', { shelf: 'someday', breakId: BREAK_ID }],
    ['a target id that is not a cuid', { shelf: 'later', breakId: 'nope' }],
  ])('400s on %s, before any query', async (_, body) => {
    const res = await POST(send('POST', body));
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('never takes the owner from the body', async () => {
    await POST(send('POST', { shelf: 'later', breakId: BREAK_ID, userId: OTHER_ID }));
    expect(rows[0].userId).toBe(USER_ID);
  });
});

describe('PATCH /api/v1/pins/:id', () => {
  it('moves a pin to the other shelf, at the top, and closes the gap it left', async () => {
    const a = seed(USER_ID, 'practising', 'centry000000000000000002', 0);
    seed(USER_ID, 'practising', BREAK_ID, 1);
    seed(USER_ID, 'later', ENTRY_ID, 0);

    const res = await PATCH(send('PATCH', { shelf: 'later' }, a.id), ctx(a.id));
    const body = await json<PinBody>(res);

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ id: a.id, shelf: 'later', position: 0 });
    expect(shelf('later')).toEqual([
      ['centry000000000000000002', 0],
      [ENTRY_ID, 1],
    ]);
    // the shelf it left is renumbered when something next lands on it
    expect(shelf('practising').map(([id]) => id)).toEqual([BREAK_ID]);
  });

  it('reorders within a shelf: after another pin', async () => {
    const a = seed(USER_ID, 'practising', 'centry000000000000000002', 0);
    const b = seed(USER_ID, 'practising', 'centry000000000000000003', 1);
    seed(USER_ID, 'practising', 'centry000000000000000004', 2);

    await PATCH(send('PATCH', { after: b.id }, a.id), ctx(a.id));

    expect(shelf('practising')).toEqual([
      ['centry000000000000000003', 0],
      ['centry000000000000000002', 1],
      ['centry000000000000000004', 2],
    ]);
  });

  it('reorders within a shelf: to the top with after null', async () => {
    seed(USER_ID, 'practising', 'centry000000000000000002', 0);
    seed(USER_ID, 'practising', 'centry000000000000000003', 1);
    const c = seed(USER_ID, 'practising', 'centry000000000000000004', 2);

    await PATCH(send('PATCH', { after: null }, c.id), ctx(c.id));

    expect(shelf('practising').map(([id]) => id)).toEqual([
      'centry000000000000000004',
      'centry000000000000000002',
      'centry000000000000000003',
    ]);
  });

  it('moves and places in one request', async () => {
    const a = seed(USER_ID, 'practising', 'centry000000000000000002', 0);
    const x = seed(USER_ID, 'later', ENTRY_ID, 0);
    seed(USER_ID, 'later', BREAK_ID, 1);

    await PATCH(send('PATCH', { shelf: 'later', after: x.id }, a.id), ctx(a.id));

    expect(shelf('later').map(([id]) => id)).toEqual([
      ENTRY_ID,
      'centry000000000000000002',
      BREAK_ID,
    ]);
  });

  it('400s when `after` is not a pin on the destination shelf, and moves nothing', async () => {
    const a = seed(USER_ID, 'practising', 'centry000000000000000002', 0);
    const elsewhere = seed(USER_ID, 'practising', 'centry000000000000000003', 1);

    const res = await PATCH(
      send('PATCH', { shelf: 'later', after: elsewhere.id }, a.id),
      ctx(a.id)
    );

    expect(res.status).toBe(400);
    expect(a).toMatchObject({ shelf: 'practising', position: 0 });
  });

  it('404s on someone else’s pin — the same as one that does not exist', async () => {
    const theirs = seed(OTHER_ID, 'practising', BREAK_ID, 0);

    const res = await PATCH(send('PATCH', { shelf: 'later' }, theirs.id), ctx(theirs.id));

    expect(res.status).toBe(404);
    expect(theirs.shelf).toBe('practising');
  });

  it('404s on a pin whose pattern was unshared, moves nothing, and names nothing', async () => {
    /* The list hides such a pin; a PATCH must not be a way round that. Before
       this, the reply carried the pattern's current title and numbers — every
       rename its owner made after unsharing it. */
    const pin = seed(USER_ID, 'later', BREAK_ID, 0);
    hidden.add(BREAK_ID);

    const res = await PATCH(send('PATCH', { shelf: 'practising' }, pin.id), ctx(pin.id));
    const body = await res.text();

    expect(res.status).toBe(404);
    expect(pin).toMatchObject({ shelf: 'later', position: 0 });
    expect(body).not.toContain('Pattern');
    expect(vi.mocked(prisma.pin.findFirst).mock.calls[0][0]?.where).toMatchObject({
      id: pin.id,
      userId: USER_ID,
      OR: [
        { breakRef: { OR: [{ userId: USER_ID }, { shared: true }] } },
        { libraryEntry: { library: { visibility: 'system' } } },
      ],
    });
  });

  it('400s on an empty body and on a malformed id', async () => {
    const a = seed(USER_ID, 'practising', BREAK_ID, 0);
    expect((await PATCH(send('PATCH', {}, a.id), ctx(a.id))).status).toBe(400);
    expect((await PATCH(send('PATCH', { shelf: 'later' }, 'nope'), ctx('nope'))).status).toBe(400);
  });
});

describe('DELETE /api/v1/pins/:id', () => {
  it('unpins, scoped to the caller', async () => {
    const a = seed(USER_ID, 'later', BREAK_ID, 0);

    const res = await DELETE(new NextRequest(`${BASE}/${a.id}`, { method: 'DELETE' }), ctx(a.id));

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.pin.deleteMany).mock.calls[0][0]?.where).toEqual({
      id: a.id,
      userId: USER_ID,
    });
    expect(rows).toEqual([]);
  });

  it('404s on someone else’s pin and leaves it', async () => {
    const theirs = seed(OTHER_ID, 'later', BREAK_ID, 0);

    const res = await DELETE(
      new NextRequest(`${BASE}/${theirs.id}`, { method: 'DELETE' }),
      ctx(theirs.id)
    );

    expect(res.status).toBe(404);
    expect(rows).toEqual([theirs]);
  });
});
