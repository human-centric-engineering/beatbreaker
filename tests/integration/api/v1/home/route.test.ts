/**
 * Integration Test: GET /api/v1/home — Home (task 4.9)
 *
 * The real `withAuth` guard, the real `readHome` and the real engraver run
 * over a mocked session and a mocked Prisma. The documents are real — a
 * generated pattern as a saved row stores it, and a famous break as the
 * catalogue seeds it — so a thumbnail is what the engraver actually draws from
 * them, not a canned tree.
 *
 * What the mock cannot do is evaluate a relation filter, so which pins count
 * as visible is asserted as the `where` sent, as the pins and history tests
 * do; `visibleTarget` itself is exercised there.
 *
 * @see app/api/v1/home/route.ts
 * @see lib/app/breaks/saved/home.ts
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v1/home/route';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { HOME_RECENT } from '@/lib/app/breaks/saved/home';
import { breakPayload } from '@/lib/app/breaks/share';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import { testCatalogue, testStyle } from '@/tests/helpers/catalogue';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/db/client', () => ({
  prisma: {
    pin: { findMany: vi.fn() },
    practiceVisit: { findMany: vi.fn() },
    break: { count: vi.fn() },
  },
}));

import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';

const USER_ID = 'cmjbv4i3x00003wsloputgwul';
const OTHER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const MINE = 'cbrk00000000000000000001';
const THEIRS = 'cbrk00000000000000000002';
const BASE = 'http://localhost:3000/api/v1/home';

const ENTRY = testCatalogue().libraries[0].entries[1];

/** A four-bar pattern, stored as a saved row's `doc` is. */
function savedDoc(seed: number) {
  const funk = testStyle('funk');
  const A = generatePattern({ style: funk, meter: '4/4', seed, bars: 4, density: 60, ghosts: 60 });
  return breakPayload({
    bpm: 90,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

function breakRef(id: string, owner: string, level: number, bpm: number, doc: unknown) {
  return {
    id,
    userId: owner,
    title: `Pattern ${id.slice(-2)}`,
    style: 'funk',
    meter: '4/4',
    bpm,
    level,
    updatedAt: new Date('2026-09-20T00:00:00Z'),
    doc,
  };
}

const entryRef = {
  id: ENTRY.id,
  title: ENTRY.title,
  artist: ENTRY.artist,
  styleKey: ENTRY.styleKey,
  meter: ENTRY.meter,
  bpm: ENTRY.bpm,
  library: { key: 'famous' },
  doc: ENTRY.doc,
};

const pinRow = (id: string, target: { breakRef?: unknown; libraryEntry?: unknown }) => ({
  id,
  breakRef: null,
  libraryEntry: null,
  ...target,
});

const visitRow = (
  id: string,
  target: { breakRef?: unknown; libraryEntry?: unknown },
  level: number,
  bpm: number,
  visitedAt: string
) => ({
  id,
  level,
  bpm,
  visitedAt: new Date(visitedAt),
  breakRef: null,
  libraryEntry: null,
  ...target,
});

interface Card {
  pinId: string;
  target: Record<string, unknown>;
  level: number;
  bpm: number;
  lastOpenedAt: string | null;
  thumbnail: { nodes: unknown[]; map: unknown[]; steps: number; width: number } | null;
}
interface Home {
  practising: Card[];
  recent: Array<{ id: string; target: { id: string } }>;
  savedCount: number;
}

async function home(): Promise<{ status: number; data: Home }> {
  const res = await GET(new NextRequest(BASE));
  const body = (await res.json()) as { data: Home };
  return { status: res.status, data: body.data };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(prisma.pin.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.practiceVisit.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.break.count).mockResolvedValue(0);
});

describe('auth', () => {
  it('401s without a session, before any query', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await GET(new NextRequest(BASE));
    expect(res.status).toBe(401);
    expect(prisma.pin.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
    expect(prisma.break.count).not.toHaveBeenCalled(); // test-review:accept no_arg_called — guard must short-circuit
  });
});

describe('GET /api/v1/home', () => {
  it('answers a first visit with nothing in it, from one query per table', async () => {
    const { status, data } = await home();
    expect(status).toBe(200);
    expect(data).toEqual({ practising: [], recent: [], savedCount: 0 });
    expect(prisma.pin.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.practiceVisit.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.break.count).toHaveBeenCalledTimes(1);
  });

  it('reads only the caller’s Practising shelf, visible targets only, in shelf order', async () => {
    await home();
    const args = vi.mocked(prisma.pin.findMany).mock.calls[0][0];
    expect(args?.where).toEqual({
      userId: USER_ID,
      shelf: 'practising',
      OR: [
        { breakRef: { OR: [{ userId: USER_ID }, { shared: true }] } },
        { libraryEntry: { library: { visibility: 'system' } } },
      ],
    });
    expect(args?.orderBy).toEqual([{ position: 'asc' }, { createdAt: 'desc' }]);
    // the documents come with the shelf — no per-card read for the thumbnails
    expect(args?.select).toMatchObject({
      breakRef: { select: { doc: true } },
      libraryEntry: { select: { doc: true } },
    });
    expect(vi.mocked(prisma.break.count).mock.calls[0][0]).toEqual({ where: { userId: USER_ID } });
  });

  it('opens each card where it was left: yours as its row says, anything else as the last visit', async () => {
    vi.mocked(prisma.pin.findMany).mockResolvedValue([
      pinRow('cpin1', { breakRef: breakRef(MINE, USER_ID, 4, 88, savedDoc(3)) }),
      pinRow('cpin2', { breakRef: breakRef(THEIRS, OTHER_ID, 5, 110, savedDoc(4)) }),
      pinRow('cpin3', { libraryEntry: entryRef }),
    ] as never);
    vi.mocked(prisma.practiceVisit.findMany).mockResolvedValue([
      // yours was visited at L1 / 60, but it autosaved L4 / 88 — the row wins
      visitRow(
        'cvis1',
        { breakRef: breakRef(MINE, USER_ID, 4, 88, null) },
        1,
        60,
        '2026-09-24T10:00:00Z'
      ),
      visitRow(
        'cvis2',
        { breakRef: breakRef(THEIRS, OTHER_ID, 5, 110, null) },
        2,
        72,
        '2026-09-23T10:00:00Z'
      ),
    ] as never);

    const { data } = await home();

    expect(data.practising.map((c) => [c.pinId, c.level, c.bpm, c.lastOpenedAt])).toEqual([
      ['cpin1', 4, 88, '2026-09-24T10:00:00.000Z'],
      ['cpin2', 2, 72, '2026-09-23T10:00:00.000Z'],
      // never opened: the full break at the entry's own tempo
      ['cpin3', 5, ENTRY.bpm, null],
    ]);
    expect(data.practising[1].target).toMatchObject({ kind: 'break', mine: false });
    expect(data.practising[1].target).not.toHaveProperty('userId');
    expect(data.practising[2].target).toMatchObject({ kind: 'entry', libraryKey: 'famous' });
  });

  it('engraves at most the first two bars of each document, a saved pattern and a famous break alike', async () => {
    const oneBar = testCatalogue()
      .libraries.flatMap((l) => l.entries)
      .find((e) => e.doc.b.length === 1);
    expect(oneBar).toBeDefined();
    vi.mocked(prisma.pin.findMany).mockResolvedValue([
      // four bars stored, two drawn
      pinRow('cpin1', { breakRef: breakRef(MINE, USER_ID, 5, 90, savedDoc(3)) }),
      // a one-bar break, drawn whole
      pinRow('cpin2', { libraryEntry: { ...entryRef, id: oneBar!.id, doc: oneBar!.doc } }),
    ] as never);

    const { data } = await home();

    // one anchor per step, per bar drawn
    const bars = data.practising.map((c) => c.thumbnail!.map.length / c.thumbnail!.steps);
    expect(bars).toEqual([2, 1]);
  });

  it('draws the thumbnail at the layer the card opens at', async () => {
    const doc = savedDoc(7);
    vi.mocked(prisma.pin.findMany).mockResolvedValue([
      pinRow('cpin1', { breakRef: breakRef(MINE, USER_ID, 1, 90, doc) }),
      pinRow('cpin2', { breakRef: breakRef('cbrk00000000000000000003', USER_ID, 5, 90, doc) }),
    ] as never);

    const { data } = await home();

    const [skeleton, full] = data.practising.map((c) => JSON.stringify(c.thumbnail));
    expect(skeleton).not.toBe(full);
    // the skeleton leaves notes out, so it draws less
    expect(skeleton.length).toBeLessThan(full.length);
  });

  it('keeps a card whose document will not read, without a thumbnail', async () => {
    vi.mocked(prisma.pin.findMany).mockResolvedValue([
      pinRow('cpin1', { breakRef: breakRef(MINE, USER_ID, 5, 90, { not: 'a pattern' }) }),
    ] as never);

    const { status, data } = await home();

    expect(status).toBe(200);
    expect(data.practising).toHaveLength(1);
    expect(data.practising[0].thumbnail).toBeNull();
  });

  it(`lists the newest ${HOME_RECENT} history items and counts what you have saved`, async () => {
    vi.mocked(prisma.practiceVisit.findMany).mockResolvedValue(
      Array.from({ length: HOME_RECENT + 3 }, (_, i) =>
        visitRow(
          `cvis${i}`,
          { breakRef: breakRef(`cbrk${String(i).padStart(20, '0')}`, USER_ID, 5, 90, null) },
          5,
          90,
          `2026-09-${String(24 - i).padStart(2, '0')}T10:00:00Z`
        )
      ) as never
    );
    vi.mocked(prisma.break.count).mockResolvedValue(12);

    const { data } = await home();

    expect(data.recent.map((v) => v.id)).toEqual(
      Array.from({ length: HOME_RECENT }, (_, i) => `cvis${i}`)
    );
    expect(data.savedCount).toBe(12);
  });
});
