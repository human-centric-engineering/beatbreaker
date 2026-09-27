/**
 * Integration Test: GET/PATCH/DELETE /api/v1/breaks/:id
 *
 * The real `withAuth` guard runs over a mocked session and a mocked Prisma.
 * The rules under test: a break the caller does not own answers 404 (not 403);
 * a break that is not private is readable by anyone signed in but writable
 * only by its owner; a PATCH changes only the fields it names; no answer
 * carries the owner's id (H8).
 *
 * @see app/api/v1/breaks/[id]/route.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, PATCH } from '@/app/api/v1/breaks/[id]/route';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { encodeBreak } from '@/lib/app/breaks/share';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
// the checks themselves are tested in publish.test.ts; here, only when they run
vi.mock('@/lib/app/breaks/community/publish', () => ({ assertPublishable: vi.fn() }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    drummerProfile: { findUnique: vi.fn() },
  },
}));

import { assertPublishable } from '@/lib/app/breaks/community/publish';
import { APIError } from '@/lib/api/errors';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const BREAK_ID = 'cbrk00000000000000000001';

function wireDoc(meter = '4/4'): Record<string, unknown> {
  /* The real seed style, resolved as the catalogue resolves it — not a stub.
     The document this produces carries the style's own snapshot, which is what
     the route's critic reads, so a fixture with an empty one would be scoring
     something the app never generates. */
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

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: BREAK_ID,
    userId: USER_ID,
    title: 'Funky thing',
    style: 'funk',
    meter: '4/4',
    bpm: 88,
    swing: 30,
    seed: BigInt(9),
    bars: 2,
    visibility: 'private',
    slug: null,
    publishedAt: null,
    parentId: null,
    gridHash: 'f'.repeat(64),
    difficulty: 2,
    level: 5,
    description: null,
    links: [],
    doc: wireDoc(),
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    takes: [],
    ...overrides,
  };
}

const ctx = (id = BREAK_ID) => ({ params: Promise.resolve({ id }) });
const url = (id = BREAK_ID) => `http://localhost:3000/api/v1/breaks/${id}`;

function patch(body: unknown, id = BREAK_ID): NextRequest {
  return new NextRequest(url(id), {
    method: 'PATCH',
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

describe('GET /api/v1/breaks/:id', () => {
  it('401s without a session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await GET(new NextRequest(url()), ctx());
    expect(res.status).toBe(401);
    expect(prisma.break.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });

  it('400s on an id that is not a cuid, before any query', async () => {
    const res = await GET(new NextRequest(url('nope')), ctx('nope'));
    expect(res.status).toBe(400);
    expect(prisma.break.findFirst).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('fetches by id scoped to "mine or not private" in one query', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(row() as never);
    await GET(new NextRequest(url()), ctx());
    const args = vi.mocked(prisma.break.findFirst).mock.calls[0][0];
    expect(args?.where).toEqual({
      id: BREAK_ID,
      OR: [{ userId: USER_ID }, { visibility: { in: ['link', 'published'] } }],
    });
    // another user's takes on a shared break are never included
    expect(args?.include?.takes).toMatchObject({ where: { userId: USER_ID } });
  });

  it('404s — not 403 — when the row is someone else’s private break', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    const res = await GET(new NextRequest(url()), ctx());
    expect(res.status).toBe(404);
    const body = await json<{ success: boolean; error: { code: string } }>(res);
    expect(body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('returns the owner’s break with mine=true, the seed as a string and a derived critique', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(row() as never);
    const res = await GET(new NextRequest(url()), ctx());
    expect(res.status).toBe(200);
    const { data } = await json<{
      data: {
        mine: boolean;
        seed: string;
        critique: { score: number; playable: boolean; checks: unknown[] };
      };
    }>(res);
    expect(data.mine).toBe(true);
    expect(data.seed).toBe('9');
    expect(data.critique.checks).toHaveLength(6);
    expect(typeof data.critique.playable).toBe('boolean');
  });

  it('still opens a row saved before the share-code schema was tightened, repairing it', async () => {
    const legacy = wireDoc() as { A: Record<string, unknown>; B: Record<string, unknown> };
    // what the looser schema let a hand-written body store: a crash of 3, a
    // stray letter, an unknown instrument key and a negative seed
    legacy.A.b = ['1x00100010001000|0000100000001000|2222222222222222|0|3000'];
    legacy.A.pc = { p1: 'kazoo', zz: 'cowbell' };
    legacy.A.sd = -1;
    vi.mocked(prisma.break.findFirst).mockResolvedValue(row({ doc: legacy }) as never);

    const res = await GET(new NextRequest(url()), ctx());
    expect(res.status).toBe(200);
    const { data } = await json<{
      data: { doc: { A: { b: string[]; pc: Record<string, string>; sd: number } } };
    }>(res);
    expect(data.doc.A.b).toEqual(['1000100010001000|0000100000001000|2222222222222222|0|1000']);
    expect(data.doc.A.pc).toEqual({});
    expect(data.doc.A.sd).toBe(0xffffffff);
  });

  it('returns someone else’s link share with mine=false, and never their user id (H8)', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      row({ userId: OTHER_ID, visibility: 'link', slug: 'abcdefghjk' }) as never
    );
    const res = await GET(new NextRequest(url()), ctx());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(OTHER_ID);
    const { data } = JSON.parse(text) as { data: Record<string, unknown> };
    expect(data).toMatchObject({ mine: false, visibility: 'link', slug: 'abcdefghjk' });
    expect(data).not.toHaveProperty('userId');
    expect(data).not.toHaveProperty('parentId');
    expect(data).not.toHaveProperty('gridHash');
  });

  it('credits a copy to the published pattern it came from, by username', async () => {
    const PARENT_ID = 'cbrk00000000000000000009';
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ parentId: PARENT_ID }) as never)
      .mockResolvedValueOnce({
        title: 'The original',
        slug: 'orig000001',
        userId: OTHER_ID,
      } as never);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      username: 'ghostnotes',
    } as never);

    const res = await GET(new NextRequest(url()), ctx());
    const { data } = await json<{ data: { basedOn: unknown } }>(res);
    expect(data.basedOn).toEqual({
      title: 'The original',
      username: 'ghostnotes',
      slug: 'orig000001',
    });
    // only while the parent is published
    expect(vi.mocked(prisma.break.findFirst).mock.calls[1][0]?.where).toEqual({
      id: PARENT_ID,
      visibility: 'published',
    });
  });

  it('credits nobody when the parent is no longer published', async () => {
    vi.mocked(prisma.break.findFirst)
      .mockResolvedValueOnce(row({ parentId: 'cbrk00000000000000000009' }) as never)
      .mockResolvedValueOnce(null);
    const res = await GET(new NextRequest(url()), ctx());
    const { data } = await json<{ data: { basedOn: unknown } }>(res);
    expect(data.basedOn).toBeNull();
    expect(prisma.drummerProfile.findUnique).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no parent, no lookup
  });

  it('drops a stored link that no longer passes the allowlist, and keeps the pattern open', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      row({
        links: [
          { kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s' },
          { kind: 'video', url: 'javascript:alert(1)' },
          'not even an object',
        ],
      }) as never
    );
    const res = await GET(new NextRequest(url()), ctx());
    expect(res.status).toBe(200);
    const { data } = await json<{ data: { links: unknown[] } }>(res);
    expect(data.links).toEqual([
      { kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s' },
    ]);
  });
});

describe('PATCH /api/v1/breaks/:id', () => {
  beforeEach(() => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({ id: BREAK_ID, slug: null } as never);
    // what the route's `select` returns — no seed, no doc
    const {
      id,
      title,
      style,
      meter,
      bpm,
      swing,
      bars,
      visibility,
      slug,
      publishedAt,
      difficulty,
      level,
      description,
      links,
      updatedAt,
    } = row();
    vi.mocked(prisma.break.update).mockResolvedValue({
      id,
      title,
      style,
      meter,
      bpm,
      swing,
      bars,
      visibility,
      slug,
      publishedAt,
      difficulty,
      level,
      description,
      links,
      updatedAt,
    } as never);
  });

  it('checks ownership — not "mine or not private" — before writing', async () => {
    await PATCH(patch({ title: 'New name' }), ctx());
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]?.where).toEqual({
      id: BREAK_ID,
      userId: USER_ID,
    });
  });

  it('404s on someone else’s break, shared or not, and writes nothing', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    const res = await PATCH(patch({ title: 'Mine now' }), ctx());
    expect(res.status).toBe(404);
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — must not write on a miss
  });

  it('renaming changes the title and nothing else — sharing is left alone', async () => {
    const res = await PATCH(patch({ title: 'New name' }), ctx());
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toEqual({ title: 'New name' });
  });

  it('saving a document leaves the title and sharing alone, and re-derives the columns', async () => {
    await PATCH(patch({ doc: wireDoc('6/8') }), ctx());
    const data = vi.mocked(prisma.break.update).mock.calls[0][0].data;
    expect(data).not.toHaveProperty('title');
    expect(data).not.toHaveProperty('visibility');
    expect(data).toMatchObject({ meter: '6/8', bpm: 88, swing: 30, bars: 2, style: 'funk' });
  });

  it('shares by link, minting a slug the first time', async () => {
    await PATCH(patch({ visibility: 'link' }), ctx());
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toEqual({
      visibility: 'link',
      slug: expect.stringMatching(/^[0-9a-z]{10}$/),
    });
  });

  it('keeps the slug it already has, so an old link works again when shared again', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      slug: 'kept000001',
    } as never);
    await PATCH(patch({ visibility: 'link' }), ctx());
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toEqual({ visibility: 'link' });
  });

  it('makes it private without touching the slug', async () => {
    await PATCH(patch({ visibility: 'private' }), ctx());
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toEqual({ visibility: 'private' });
  });

  describe('a published pattern', () => {
    const published = () =>
      vi.mocked(prisma.break.findFirst).mockResolvedValue({
        id: BREAK_ID,
        slug: 'pub0000001',
        visibility: 'published',
        title: 'Out in the world',
        description: null,
        doc: wireDoc(),
      } as never);

    it('runs the publish checks on a rename, and refuses what they refuse', async () => {
      published();
      vi.mocked(assertPublishable).mockRejectedValue(
        new APIError("That title or description can't be published.", 'NOT_ALLOWED', 422)
      );
      const res = await PATCH(patch({ title: 'Something rude' }), ctx());
      expect(res.status).toBe(422);
      expect(vi.mocked(assertPublishable).mock.calls[0]?.[1]).toMatchObject({
        title: 'Something rude',
        description: null,
      });
      expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a refused edit writes nothing
    });

    it('checks new notes as the notes, and writes the columns the check derived', async () => {
      published();
      const doc = wireDoc('6/8');
      const columns = { meter: '6/8', gridHash: 'e'.repeat(64) };
      vi.mocked(assertPublishable).mockResolvedValue({ decoded: {}, columns } as never);
      await PATCH(patch({ doc }), ctx());
      expect(vi.mocked(assertPublishable).mock.calls[0]?.[1]).toMatchObject({
        title: 'Out in the world',
        payload: doc,
      });
      expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toMatchObject(columns);
    });

    it('needs no check to unpublish it, even with other changes in the same edit', async () => {
      published();
      await PATCH(patch({ visibility: 'link', title: 'Anything' }), ctx());
      expect(assertPublishable).not.toHaveBeenCalled(); // test-review:accept no_arg_called — leaving the library is never refused
      expect(prisma.break.update).toHaveBeenCalledTimes(1);
    });

    it('needs no check for a change the library does not show — its links', async () => {
      published();
      await PATCH(patch({ links: [] }), ctx());
      expect(assertPublishable).not.toHaveBeenCalled(); // test-review:accept no_arg_called — links are moderated separately
    });
  });

  it('refuses to publish through a PATCH — publishing has its own checks', async () => {
    const res = await PATCH(patch({ visibility: 'published' }), ctx());
    expect(res.status).toBe(400);
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — must not write a refused value
  });

  it('re-derives the style version and the layer with the document, not just the list columns', async () => {
    const doc = wireDoc();
    const withLayer = { ...doc, lv: 2, A: { ...(doc.A as object), sv: 'csv00000000000000000001' } };
    await PATCH(patch({ doc: withLayer }), ctx());
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toMatchObject({
      styleVersionId: 'csv00000000000000000001',
      level: 2,
    });
  });

  it('stores an empty description as null, so clearing it clears it', async () => {
    await PATCH(patch({ description: '   ' }), ctx());
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toEqual({ description: null });
  });

  it('stores the canonical link it rebuilt, never the string that was typed', async () => {
    await PATCH(
      patch({
        links: [
          { url: 'https://youtu.be/dQw4w9WgXcQ?t=5m21s&si=tracking', label: ' The break ' },
          { url: 'https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=x' },
        ],
      }),
      ctx()
    );
    expect(vi.mocked(prisma.break.update).mock.calls[0][0].data).toEqual({
      links: [
        {
          kind: 'video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=321s',
          label: 'The break',
        },
        { kind: 'song', url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' },
      ],
    });
  });

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['plain http', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['a look-alike host', 'https://youtube.com.example.net/watch?v=dQw4w9WgXcQ'],
  ])('refuses %s with the message that names what is accepted', async (_name, bad) => {
    const res = await PATCH(patch({ links: [{ url: bad }] }), ctx());
    expect(res.status).toBe(400);
    const body = await json<{
      error: { details: { errors: Array<{ path: string; message: string }> } };
    }>(res);
    expect(body.error.details.errors).toEqual([
      {
        path: 'links.0.url',
        message:
          'Use an https link to a YouTube or Vimeo video, or a Spotify track, album or playlist.',
      },
    ]);
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('refuses a fifth link', async () => {
    const one = { url: 'https://vimeo.com/76979871' };
    const res = await PATCH(patch({ links: [one, one, one, one, one] }), ctx());
    expect(res.status).toBe(400);
    const body = await json<{ error: { details: { errors: Array<{ message: string }> } } }>(res);
    expect(body.error.details.errors[0].message).toBe('Up to 4 links');
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });

  it('refuses a malformed document', async () => {
    const res = await PATCH(patch({ doc: { ver: 3, A: {} } }), ctx());
    expect(res.status).toBe(400);
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });
});

describe('DELETE /api/v1/breaks/:id', () => {
  it('deletes only where the caller is the owner', async () => {
    vi.mocked(prisma.break.deleteMany).mockResolvedValue({ count: 1 });
    const res = await DELETE(new NextRequest(url(), { method: 'DELETE' }), ctx());
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.break.deleteMany).mock.calls[0][0]?.where).toEqual({
      id: BREAK_ID,
      userId: USER_ID,
    });
    expect((await json<{ data: unknown }>(res)).data).toEqual({ id: BREAK_ID, deleted: true });
  });

  it('404s when nothing of the caller’s matched', async () => {
    vi.mocked(prisma.break.deleteMany).mockResolvedValue({ count: 0 });
    const res = await DELETE(new NextRequest(url(), { method: 'DELETE' }), ctx());
    expect(res.status).toBe(404);
  });
});
