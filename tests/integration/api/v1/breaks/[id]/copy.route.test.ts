/**
 * Integration Test: POST /api/v1/breaks/:id/copy
 *
 * The real `withAuth` guard runs over a mocked session; Prisma is mocked at
 * the module boundary, so `openSavedBreak`, `columnsFromDoc` and `lineageOf`
 * run for real against the mocked rows.
 *
 * @see app/api/v1/breaks/[id]/copy/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/v1/breaks/[id]/copy/route';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn(), create: vi.fn() },
    drummerProfile: { findUnique: vi.fn() },
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const BREAK_ID = 'cbrk00000000000000000001';

/** A real wire-format document, built the way the console builds one. */
function wireDoc(meter = '4/4'): Record<string, unknown> {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter, seed: 9, bars: 2, density: 50, ghosts: 50 });
  const code = encodeBreak({
    bpm: 88,
    swing: 30,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
  return JSON.parse(atob(code)) as Record<string, unknown>;
}

/** What `openSavedBreak`'s query returns — the source row being copied. */
function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BREAK_ID,
    userId: USER_ID,
    title: 'Funky thing',
    description: null,
    links: [],
    doc: wireDoc(),
    takes: [],
    ...overrides,
  };
}

function createdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cbrk00000000000000000099',
    title: 'Funky thing',
    style: 'funk',
    meter: '4/4',
    bpm: 88,
    level: 5,
    visibility: 'private',
    description: null,
    links: [],
    createdAt: new Date('2026-09-27T00:00:00Z'),
    ...overrides,
  };
}

function post(body: unknown, id = BREAK_ID): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/breaks/${id}/copy`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ctx = (id = BREAK_ID) => ({ params: Promise.resolve({ id }) });

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text()) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
});

it('400s on an id that is not a cuid, before any query', async () => {
  const res = await POST(post({}, 'nope'), ctx('nope'));
  expect(res.status).toBe(400);
  expect(prisma.break.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
});

it('404s when the caller cannot open the source pattern', async () => {
  vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
  const res = await POST(post({}), ctx());
  expect(res.status).toBe(404);
  expect(prisma.break.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to copy
});

describe('copying someone else’s pattern', () => {
  beforeEach(() => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(
        sourceRow({
          userId: OTHER_ID,
          description: 'A groove from the lesson',
          links: [{ kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s' }],
        }) as never
      )
      // the second findFirst call is lineageOf's parent lookup
      .mockResolvedValueOnce({
        title: 'Funky thing',
        slug: 'orig000001',
        userId: OTHER_ID,
      } as never);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ghostnotes',
    } as never);
    vi.mocked(prisma.break.create).mockResolvedValue(createdRow() as never);
  });

  it('is private, owned by the session user, and records the source as parentId', async () => {
    const res = await POST(post({}), ctx());
    expect(res.status).toBe(201);

    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: USER_ID,
      visibility: 'private',
      parentId: BREAK_ID,
    });
  });

  it('carries the source’s description and links across, unasked', async () => {
    const res = await POST(post({}), ctx());
    expect(res.status).toBe(201);

    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data.description).toBe('A groove from the lesson');
    expect(data.links).toEqual([
      { kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s' },
    ]);
  });

  it('credits the copy to the pattern it came from, by username', async () => {
    const res = await POST(post({}), ctx());
    const { data } = await json<{ data: { basedOn: unknown } }>(res);
    expect(data.basedOn).toEqual({
      title: 'Funky thing',
      username: 'ghostnotes',
      slug: 'orig000001',
    });
    // only while the parent is published — the second query proves it
    expect(vi.mocked(prisma.break.findFirst).mock.calls[1][0]?.where).toEqual({
      id: BREAK_ID,
      visibility: 'published',
    });
  });

  it('takes a title given instead of the source’s', async () => {
    await POST(post({ title: 'My version' }), ctx());
    expect(vi.mocked(prisma.break.create).mock.calls[0][0].data.title).toBe('My version');
  });

  it('takes the source title when none is given', async () => {
    await POST(post({}), ctx());
    expect(vi.mocked(prisma.break.create).mock.calls[0][0].data.title).toBe('Funky thing');
  });
});

describe('copying your own pattern', () => {
  beforeEach(() => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(sourceRow({ userId: USER_ID }) as never);
    vi.mocked(prisma.break.create).mockResolvedValue(createdRow() as never);
  });

  it('has no parentId, and credits nobody', async () => {
    const res = await POST(post({}), ctx());
    expect(res.status).toBe(201);

    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data.parentId).toBeNull();
    expect(data.ownParentId).toBeNull();
    // lineageOf(null) never queries — one findFirst call only, for the source
    expect(prisma.break.findFirst).toHaveBeenCalledTimes(1);

    const { data: body } = await json<{ data: { basedOn: unknown } }>(res);
    expect(body.basedOn).toBeNull();
  });
});

describe('saving a variation of your own fixed pattern (7A, D26)', () => {
  it('records it as ownParentId — listed and credited, but not a save', async () => {
    vi.mocked(prisma.break.findFirst)
      // the source: yours, and fixed since its first publish
      .mockResolvedValueOnce(
        sourceRow({ userId: USER_ID, frozenAt: new Date('2026-09-20T00:00:00Z') }) as never
      )
      // lineageOf: the original, still published
      .mockResolvedValueOnce({
        title: 'Funky thing',
        slug: 'pub0000001',
        userId: USER_ID,
      } as never);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ghostnotes',
    } as never);
    vi.mocked(prisma.break.create).mockResolvedValue(createdRow() as never);

    const res = await POST(post({ doc: wireDoc('6/8') }), ctx());
    expect(res.status).toBe(201);
    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    // not parentId: that is what "most saved" counts, and this is not a save
    expect(data.parentId).toBeNull();
    expect(data.ownParentId).toBe(BREAK_ID);
    expect(data.visibility).toBe('private');
    expect(data.meter).toBe('6/8');

    const { data: body } = await json<{ data: { basedOn: unknown } }>(res);
    expect(body.basedOn).toEqual({
      title: 'Funky thing',
      username: 'ghostnotes',
      slug: 'pub0000001',
    });
  });

  it('records the original even while it is unpublished — it is still fixed', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(
        sourceRow({ userId: USER_ID, frozenAt: new Date('2026-09-20T00:00:00Z') }) as never
      )
      // lineageOf: not published now, so no credit line
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.break.create).mockResolvedValue(createdRow() as never);

    const res = await POST(post({}), ctx());
    expect(vi.mocked(prisma.break.create).mock.calls[0][0].data.ownParentId).toBe(BREAK_ID);
    const { data: body } = await json<{ data: { basedOn: unknown } }>(res);
    expect(body.basedOn).toBeNull();
  });
});

describe('the body `doc`', () => {
  beforeEach(() => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(sourceRow({ userId: USER_ID }) as never);
    vi.mocked(prisma.break.create).mockResolvedValue(createdRow({ meter: '6/8' }) as never);
  });

  it('replaces the stored document, and the columns are derived from it, not the original', async () => {
    const edited = wireDoc('6/8');
    await POST(post({ doc: edited }), ctx());

    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data.doc).toEqual(edited);
    expect(data.meter).toBe('6/8');
  });

  it('falls back to the stored document when none is sent', async () => {
    await POST(post({}), ctx());
    const data = vi.mocked(prisma.break.create).mock.calls[0][0].data;
    expect(data.doc).toEqual(sourceRow().doc);
    expect(data.meter).toBe('4/4');
  });
});
