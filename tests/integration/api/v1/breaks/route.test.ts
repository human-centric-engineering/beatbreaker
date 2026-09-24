/**
 * Integration Test: GET/POST /api/v1/breaks
 *
 * The real `withAuth` guard runs; the session comes from a mocked
 * `auth.api.getSession` and Prisma is the mocked DB boundary.
 *
 * What matters here: rows are scoped to the session user and the body can never
 * name an owner; the document goes through the share-code schema; the columns
 * the list shows are derived from the document, not taken from the body.
 *
 * @see app/api/v1/breaks/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/v1/breaks/route';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';

/** A real wire-format document, built the way the console builds one. */
function wireDoc(style = 'funk', meter = '4/4'): Record<string, unknown> {
  /* The real seed style, resolved as the catalogue resolves it — not a stub.
     The document this produces carries the style's own snapshot, which is what
     the route's critic reads, so a fixture with an empty one would be scoring
     something the app never generates. */
  const resolved = testStyle(style);
  const A = generatePattern({
    style: resolved,
    meter,
    seed: 777,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  const code = encodeBreak({
    bpm: 103.6,
    swing: 12.4,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, resolved.params),
  });
  return JSON.parse(atob(code)) as Record<string, unknown>;
}

function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cbrk00000000000000000001',
    title: 'Funky thing',
    style: 'funk',
    meter: '4/4',
    bpm: 94,
    swing: 0,
    bars: 2,
    shared: false,
    level: 5,
    description: null,
    links: [],
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    _count: { takes: 0 },
    ...overrides,
  };
}

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/breaks', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

describe('GET /api/v1/breaks', () => {
  it('401s without a session and never queries', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost:3000/api/v1/breaks'));
    expect(res.status).toBe(401);
    expect(prisma.break.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('lists only the caller’s rows, newest first, with filters applied', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([listRow()] as never);
    const res = await GET(
      new NextRequest('http://localhost:3000/api/v1/breaks?style=funk&meter=7/8&limit=10')
    );
    expect(res.status).toBe(200);
    const args = vi.mocked(prisma.break.findMany).mock.calls[0][0];
    expect(args?.where).toEqual({ userId: USER_ID, style: 'funk', meter: '7/8' });
    // newest first, with the id as the tie-break the cursor needs
    expect(args?.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args?.take).toBe(11);
    // the list never carries the whole document
    expect(args?.select).not.toHaveProperty('doc');
  });

  it('drops the look-ahead row and returns a cursor when there is another page', async () => {
    const rows = [1, 2, 3].map((n) => listRow({ id: `cbrk0000000000000000000${n}` }));
    vi.mocked(prisma.break.findMany).mockResolvedValue(rows as never);
    const res = await GET(new NextRequest('http://localhost:3000/api/v1/breaks?limit=2'));
    const body = await json<{ data: Array<{ id: string }>; meta: { nextCursor: string | null } }>(
      res
    );
    expect(body.data.map((r) => r.id)).toEqual([
      'cbrk00000000000000000001',
      'cbrk00000000000000000002',
    ]);
    expect(body.meta.nextCursor).toBe('cbrk00000000000000000002');
  });

  it('passes the cursor through and skips the cursor row itself', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([] as never);
    const res = await GET(
      new NextRequest('http://localhost:3000/api/v1/breaks?cursor=cbrk00000000000000000009')
    );
    const body = await json<{ meta: { nextCursor: string | null } }>(res);
    const args = vi.mocked(prisma.break.findMany).mock.calls[0][0];
    expect(args).toMatchObject({ cursor: { id: 'cbrk00000000000000000009' }, skip: 1 });
    expect(body.meta.nextCursor).toBeNull();
  });

  /**
   * This used to refuse `?style=polka` with a 400, because the style list was
   * compiled in and the filter could be checked against it. Styles are rows
   * now, so the list is a query and the filter schema is synchronous — and,
   * more to the point, a style this installation does not have is not a bad
   * request. It is an empty page, which is the honest answer to "show me my
   * polka breaks" when there are none.
   *
   * What a style key is still held to is the width of the column it is
   * compared against, `Break.style VARCHAR(40)`.
   */
  it('takes a style key it cannot vouch for, and filters by it', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([] as never);
    const res = await GET(new NextRequest('http://localhost:3000/api/v1/breaks?style=polka'));
    expect(res.status).toBe(200);
    expect(prisma.break.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ style: 'polka' }) })
    );
  });

  it('refuses a style key wider than the column', async () => {
    const res = await GET(
      new NextRequest(`http://localhost:3000/api/v1/breaks?style=${'x'.repeat(41)}`)
    );
    expect(res.status).toBe(400);
    expect(prisma.break.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });
});

describe('GET /api/v1/breaks — sort and search', () => {
  beforeEach(() => vi.mocked(prisma.break.findMany).mockResolvedValue([] as never));

  const argsFor = async (query: string) => {
    const res = await GET(new NextRequest(`http://localhost:3000/api/v1/breaks?${query}`));
    return { res, args: vi.mocked(prisma.break.findMany).mock.calls[0]?.[0] };
  };

  it('sorts by last edited', async () => {
    const { args } = await argsFor('sort=updated');
    expect(args?.orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'desc' }]);
  });

  it('searches titles case-insensitively, still inside the caller’s own rows', async () => {
    const { args } = await argsFor('q=%20funky%20');
    expect(args?.where).toEqual({
      userId: USER_ID,
      title: { contains: 'funky', mode: 'insensitive' },
    });
  });

  it('treats an empty search as no search', async () => {
    expect((await argsFor('q=')).args?.where).toEqual({ userId: USER_ID });
  });

  it.each([['sort=random'], ['sort=opened']])('refuses %s', async (query) => {
    const { res } = await argsFor(query);
    expect(res.status).toBe(400);
  });

  it('returns the new columns, with stored links re-checked on the way out', async () => {
    vi.mocked(prisma.break.findMany).mockResolvedValue([
      listRow({
        level: 3,
        links: [
          { kind: 'song', url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' },
          { kind: 'video', url: 'https://evil.example/watch?v=dQw4w9WgXcQ' },
        ],
      }),
    ] as never);
    const res = await GET(new NextRequest('http://localhost:3000/api/v1/breaks'));
    const { data } = await json<{ data: Array<Record<string, unknown>> }>(res);
    expect(data[0]).toMatchObject({
      level: 3,
      links: [{ kind: 'song', url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' }],
    });
    expect(vi.mocked(prisma.break.findMany).mock.calls[0][0]?.select).toMatchObject({
      level: true,
      description: true,
      links: true,
    });
  });
});

describe('POST /api/v1/breaks', () => {
  it('saves under the session user, deriving the list columns from the document', async () => {
    vi.mocked(prisma.break.create).mockResolvedValue(
      listRow({ id: 'cbrk00000000000000000042' }) as never
    );
    const doc = wireDoc('funk', '7/8');
    const res = await POST(post({ title: '  Funky thing  ', doc }));
    expect(res.status).toBe(201);

    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: USER_ID,
      title: 'Funky thing',
      style: 'funk',
      meter: '7/8',
      bpm: 104,
      swing: 12,
      bars: 2,
      shared: false,
    });
    expect(typeof data.seed).toBe('bigint');

    const body = await json<{ data: { critique: { score: number; playable: boolean } } }>(res);
    expect(body.data.critique.score).toBeGreaterThanOrEqual(0);
    expect(typeof body.data.critique.playable).toBe('boolean');
  });

  it('records the style VERSION the pattern came from, not just the style key', async () => {
    /* `Break.styleVersionId` is the provenance column, and its `ON DELETE SET
       NULL` FK only ever means anything if something writes it. The value is
       already on the decoded document (`sv` on the wire), so a save that
       denormalised `style` and left this NULL made "which breaks came from
       version 3 of funk" unanswerable while every other column said the row
       knew where it came from. */
    vi.mocked(prisma.break.create).mockResolvedValue(listRow() as never);
    await POST(post({ title: 'Provenance', doc: wireDoc() }));

    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data.styleVersionId).toBe(testStyle('funk').versionId);
    expect(data.styleVersionId).toBeTruthy();
  });

  it('ignores an owner named in the body', async () => {
    vi.mocked(prisma.break.create).mockResolvedValue(listRow() as never);
    await POST(post({ title: 'Mine', doc: wireDoc(), userId: OTHER_ID }));
    expect(vi.mocked(prisma.break.create).mock.calls[0][0].data.userId).toBe(USER_ID);
  });

  it.each([
    ['an empty title', { title: '   ' }],
    ['a document that is not a break', { title: 'x', doc: { ver: 3 } }],
    ['a tempo out of range', { title: 'x', doc: { ...wireDoc(), bpm: 9000 } }],
  ])('refuses %s', async (_label, body) => {
    const res = await POST(post({ doc: wireDoc(), ...body }));
    expect(res.status).toBe(400);
    expect(prisma.break.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });
});

describe('POST /api/v1/breaks — bulk', () => {
  beforeEach(() => {
    let n = 0;
    vi.mocked(prisma.break.create).mockImplementation(
      () => Promise.resolve(listRow({ id: `cbrk0000000000000000000${n++}` })) as never
    );
  });

  it('saves every pattern under the session user in one transaction', async () => {
    const breaks = [1, 2, 3].map((n) => ({ title: `Fav ${n}`, doc: wireDoc(), userId: OTHER_ID }));
    const res = await POST(post({ breaks }));
    expect(res.status).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(prisma.break.create).mock.calls;
    expect(calls.map((c) => c[0].data.title)).toEqual(['Fav 1', 'Fav 2', 'Fav 3']);
    // the body cannot name an owner here any more than in the single form
    expect(calls.every((c) => c[0].data.userId === USER_ID)).toBe(true);
    const body = await json<{ data: unknown[]; meta: { count: number } }>(res);
    expect(body.data).toHaveLength(3);
    expect(body.meta.count).toBe(3);
  });

  it('writes nothing when any one pattern is malformed — all of them or none', async () => {
    const breaks = [
      { title: 'Good', doc: wireDoc() },
      { title: 'Bad', doc: { ver: 3 } },
    ];
    const res = await POST(post({ breaks }));
    expect(res.status).toBe(400);
    const body = await json<{ error: { details: { errors: Array<{ path: string }> } } }>(res);
    // reported against the bulk form, pointing at the bad entry
    expect(body.error.details.errors[0].path).toMatch(/^breaks\.1\.doc/);
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
    expect(prisma.break.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it.each([
    ['an empty list', 0],
    ['more than the thirty bb.favs can hold', 31],
  ])('refuses %s', async (_label, count) => {
    const breaks = Array.from({ length: count }, (_, i) => ({ title: `Fav ${i}`, doc: wireDoc() }));
    const res = await POST(post({ breaks }));
    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('takes exactly thirty', async () => {
    const doc = wireDoc();
    const breaks = Array.from({ length: 30 }, (_, i) => ({ title: `Fav ${i}`, doc }));
    const res = await POST(post({ breaks }));
    expect(res.status).toBe(201);
    expect(prisma.break.create).toHaveBeenCalledTimes(30);
  });
});
