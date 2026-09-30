/**
 * The speed tables (Phase 7C): one row per drummer — their best at a layer —
 * on a target everyone can see, a published pattern or a famous break.
 *
 * Prisma is mocked at the module boundary; `$queryRaw` is a tagged-template
 * call, so the mock receives `(strings, ...values)` and the tests assert on
 * the bound values rather than the SQL text.
 *
 * @see lib/app/breaks/community/speed-tables.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn() },
    libraryEntry: { findFirst: vi.fn() },
    drummerProfile: { findUnique: vi.fn() },
    speedRecord: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { gridHash, sectionHash } from '@/lib/app/breaks/community/grid';
import { readCursor, writeCursor } from '@/lib/app/breaks/community/public';
import {
  breakHash,
  entryHash,
  entryTableTarget,
  LISTED_BESTS_MAX,
  listedBests,
  listedBestsFor,
  patternTableTarget,
  placesOn,
  readSpeedTable,
} from '@/lib/app/breaks/community/speed-tables';
import { emptyBar } from '@/lib/app/breaks/pattern';
import {
  breakDocFromPayload,
  breakPayload,
  packPattern,
  patternFromPacked,
} from '@/lib/app/breaks/share';
import { storedPayloadSchema } from '@/lib/app/breaks/schema';
import { prisma } from '@/lib/db/client';
import type { Bar, Pattern } from '@/lib/app/breaks/types';
import type { SpeedTableQuery } from '@/lib/validations/speeds';

const BREAK_ID = 'cbrk00000000000000000001';
const ENTRY_ID = 'centr0000000000000000001';
const USER_ID = 'cuser0000000000000000001';

function bar(hits: Partial<Record<keyof Bar, number[]>> = {}): Bar {
  return { ...emptyBar(), ...hits };
}

function pattern(bars: Bar[] = [bar({ k: [1, 0, 0, 0] })]): Pattern {
  return {
    name: 'Untitled',
    style: 'funk',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h'],
    perc: {},
    backbeats: [4, 12],
    bbLane: 's',
    hasRide: false,
    hasHat: true,
    pins: null,
    bars,
  };
}

/** A whole break document, packed the way `Break.doc` stores it. */
function breakDoc() {
  const A = pattern([bar({ k: [1, 0, 0, 0] })]);
  const B = pattern([bar({ s: [0, 2, 0, 0] })]);
  return breakPayload({ bpm: 90, swing: 10, level: 5, arrangement: ['A', 'B'], A, B });
}

/** A library entry's document: one packed section. */
function entryDoc() {
  return packPattern(pattern([bar({ h: [1, 1, 1, 1] })]));
}

/** Last call's bound values (everything after the strings array). */
function lastValues(): unknown[] {
  return vi.mocked(prisma.$queryRaw).mock.calls.at(-1)?.slice(1) ?? [];
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('breakHash', () => {
  it('uses the stored column without touching doc, when it is set', async () => {
    const hash = await breakHash({ gridHash: 'stored-hash-xyz', doc: 'not-a-valid-payload' });
    expect(hash).toBe('stored-hash-xyz');
  });

  it('computes from the document when the column is null', async () => {
    const doc = breakDoc();
    const expected = await gridHash(breakDocFromPayload(storedPayloadSchema.parse(doc)));
    expect(await breakHash({ gridHash: null, doc })).toBe(expected);
  });
});

describe('entryHash', () => {
  it('equals sectionHash(patternFromPacked(doc))', async () => {
    const doc = entryDoc();
    expect(await entryHash(doc)).toBe(await sectionHash(patternFromPacked(doc)));
  });
});

describe('patternTableTarget', () => {
  it('asks only for published rows, by slug', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    await patternTableTarget('cold000001');
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]).toMatchObject({
      where: { slug: 'cold000001', visibility: 'published' },
    });
  });

  it('is the target and its hash, when found', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      gridHash: 'stored-hash',
      doc: null,
    } as never);
    expect(await patternTableTarget('cold000001')).toEqual({
      target: { breakId: BREAK_ID },
      hash: 'stored-hash',
    });
  });

  it('is null otherwise', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    expect(await patternTableTarget('nope')).toBeNull();
  });
});

describe('entryTableTarget', () => {
  it('asks for the public library', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);
    await entryTableTarget(ENTRY_ID);
    expect(vi.mocked(prisma.libraryEntry.findFirst).mock.calls[0][0]).toEqual({
      where: { id: ENTRY_ID, library: PUBLIC },
      select: { id: true, doc: true },
    });
  });

  it('is the target and its computed hash, when found', async () => {
    const doc = entryDoc();
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue({ id: ENTRY_ID, doc } as never);
    const expected = await entryHash(doc);
    expect(await entryTableTarget(ENTRY_ID)).toEqual({
      target: { libraryEntryId: ENTRY_ID },
      hash: expected,
    });
  });

  it('is null when it is not in a library everyone can see', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);
    expect(await entryTableTarget(ENTRY_ID)).toBeNull();
  });
});

describe('readSpeedTable', () => {
  const q: SpeedTableQuery = { level: 4, video: false, limit: 25 };

  function rows(over: Array<Record<string, unknown>>, total: number) {
    return over.map((r) => ({
      id: 'rec1',
      bpm: 180,
      recordedAt: new Date('2026-09-01T00:00:00Z'),
      videoUrl: null,
      username: 'ghostnotes',
      total: BigInt(total),
      ...r,
    }));
  }

  it('binds the break id and leaves the entry id null, for a break target', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    await readSpeedTable({ target: { breakId: BREAK_ID }, hash: 'h1' }, q);
    const [breakId, entryId] = lastValues();
    expect(breakId).toBe(BREAK_ID);
    expect(entryId).toBeNull();
  });

  it('binds the entry id and leaves the break id null, for an entry target', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    await readSpeedTable({ target: { libraryEntryId: ENTRY_ID }, hash: 'h1' }, q);
    const [breakId, entryId] = lastValues();
    expect(breakId).toBeNull();
    expect(entryId).toBe(ENTRY_ID);
  });

  it('binds the level, the hash, the video flag, limit + 1 and the offset, in order', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    const cursor = writeCursor(10);
    await readSpeedTable(
      { target: { breakId: BREAK_ID }, hash: 'grid-hash-1' },
      { level: 2, video: true, limit: 25, cursor }
    );
    const [, , level, hash, video, limitPlusOne, offset] = lastValues();
    expect(level).toBe(2);
    expect(hash).toBe('grid-hash-1');
    expect(video).toBe(true);
    expect(limitPlusOne).toBe(26);
    expect(offset).toBe(readCursor(cursor));
    expect(offset).toBe(10);
  });

  it('positions continue from the cursor offset', async () => {
    const cursor = writeCursor(10);
    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows([{ id: 'a' }, { id: 'b' }], 12));
    const result = await readSpeedTable(
      { target: { breakId: BREAK_ID }, hash: 'h1' },
      { ...q, cursor }
    );
    expect(result.rows.map((r) => r.position)).toEqual([11, 12]);
  });

  it('reads total from the window count, a bigint, as a number', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows([{ id: 'a' }], 42));
    const result = await readSpeedTable({ target: { breakId: BREAK_ID }, hash: 'h1' }, q);
    expect(result.total).toBe(42);
  });

  it('gives nextCursor only when there are more rows than the limit', async () => {
    const small = { ...q, limit: 2 };
    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows([{ id: 'a' }, { id: 'b' }], 2));
    const exact = await readSpeedTable({ target: { breakId: BREAK_ID }, hash: 'h1' }, small);
    expect(exact.nextCursor).toBeNull();
    expect(exact.rows).toHaveLength(2);

    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 3));
    const more = await readSpeedTable({ target: { breakId: BREAK_ID }, hash: 'h1' }, small);
    expect(more.nextCursor).toBe(writeCursor(2));
    // the extra probe row is cut from the page
    expect(more.rows).toHaveLength(2);
  });

  it('reads a stored video URL that no longer parses as no video', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue(rows([{ id: 'a', videoUrl: 'not a url' }], 1));
    const result = await readSpeedTable({ target: { breakId: BREAK_ID }, hash: 'h1' }, q);
    expect(result.rows[0].video).toBeNull();
  });
});

describe('placesOn', () => {
  it('binds the break id, the entry id, the hash and the user id, in order', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    await placesOn({ target: { breakId: BREAK_ID }, hash: 'h1' }, USER_ID);
    const [breakId, entryId, hash, userId] = lastValues();
    expect(breakId).toBe(BREAK_ID);
    expect(entryId).toBeNull();
    expect(hash).toBe('h1');
    expect(userId).toBe(USER_ID);
  });

  it('maps bigint position and of to numbers', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ level: 3, position: 3n, of: 41n }] as never);
    const result = await placesOn({ target: { breakId: BREAK_ID }, hash: 'h1' }, USER_ID);
    expect(result).toEqual([{ level: 3, position: 3, of: 41 }]);
  });
});

describe('listedBestsFor', () => {
  it('looks the username up lower-cased', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    await listedBestsFor('GhostNotes');
    expect(vi.mocked(prisma.drummerProfile.findUnique).mock.calls[0][0]).toEqual({
      where: { username: 'ghostnotes' },
      select: { userId: true },
    });
  });

  it('is empty for a username nobody has', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    expect(await listedBestsFor('nobody')).toEqual([]);
    expect(prisma.speedRecord.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to look up
  });

  it('delegates to listedBests for a known username', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: USER_ID } as never);
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([]);
    await listedBestsFor('ghostnotes');
    expect(vi.mocked(prisma.speedRecord.findMany).mock.calls[0][0]).toMatchObject({
      where: expect.objectContaining({ userId: USER_ID }),
    });
  });
});

describe('listedBests', () => {
  function record(over: Record<string, unknown> = {}) {
    return {
      level: 5,
      bpm: 180,
      recordedAt: new Date('2026-09-01T00:00:00Z'),
      videoUrl: null,
      gridHash: 'current-hash',
      breakRef: {
        id: BREAK_ID,
        title: 'Cold Carpet',
        slug: 'cold000001',
        gridHash: 'current-hash',
        doc: null,
      },
      libraryEntry: null,
      ...over,
    };
  }

  it('keeps the first (best) record per target and layer, and drops a later duplicate', async () => {
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([
      record({ bpm: 190 }),
      record({ bpm: 170 }), // same target, same level, already seen
    ] as never);
    const result = await listedBests(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].bpm).toBe(190);
  });

  it('drops a record whose gridHash no longer matches the target, then lets the next matching one through', async () => {
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([
      record({ bpm: 190, gridHash: 'stale-hash' }), // best, but stale — dropped
      record({ bpm: 170, gridHash: 'current-hash' }), // next best, matches — kept
    ] as never);
    const result = await listedBests(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].bpm).toBe(170);
  });

  it('computes each target hash once, however many records share it', async () => {
    const doc = entryDoc();
    const expectedHash = await entryHash(doc);
    const digestSpy = vi.spyOn(crypto.subtle, 'digest');
    digestSpy.mockClear();

    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([
      record({
        level: 1,
        bpm: 190,
        gridHash: expectedHash,
        breakRef: null,
        libraryEntry: { id: ENTRY_ID, title: 'Famous Break', doc },
      }),
      record({
        level: 2,
        bpm: 150,
        gridHash: expectedHash,
        breakRef: null,
        libraryEntry: { id: ENTRY_ID, title: 'Famous Break', doc },
      }),
    ] as never);

    const result = await listedBests(USER_ID);
    expect(result).toHaveLength(2);
    // sectionHash makes exactly one crypto.subtle.digest call; memoised per
    // target, so two records on the same entry cost one call, not two
    expect(digestSpy).toHaveBeenCalledTimes(1);
    digestSpy.mockRestore();
  });

  it('sorts newest first and caps at LISTED_BESTS_MAX', async () => {
    const many = Array.from({ length: LISTED_BESTS_MAX + 6 }, (_, i) =>
      record({
        breakRef: {
          id: `break-${i}`,
          title: `Pattern ${i}`,
          slug: `slug${i}`,
          gridHash: 'current-hash',
          doc: null,
        },
        recordedAt: new Date(2026, 0, 1 + i),
      })
    );
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue(many as never);

    const result = await listedBests(USER_ID);
    expect(result).toHaveLength(LISTED_BESTS_MAX);
    const times = result.map((r) => new Date(r.recordedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});
