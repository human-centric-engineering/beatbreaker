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
  prisma: { break: { findMany: vi.fn(), create: vi.fn() } },
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
    expect(args?.orderBy).toEqual({ createdAt: 'desc' });
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
