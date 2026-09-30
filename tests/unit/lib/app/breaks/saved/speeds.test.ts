/**
 * Your speed records (Phase 7C): the fastest tempo you can play something
 * well, at a layer, with the date — and over time, your progress.
 *
 * Prisma, the hash helpers (`speed-tables.ts`) and `updateStudioSettings`
 * are mocked at the module boundary; `openableBy`, `maxBpm` and
 * `readStoredVideo` are real, pure functions and are left alone.
 *
 * @see lib/app/breaks/saved/speeds.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn() },
    libraryEntry: { findFirst: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    speedRecord: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    drummerProfile: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/app/breaks/community/speed-tables', () => ({
  breakHash: vi.fn(),
  entryHash: vi.fn(),
  placesOn: vi.fn(),
}));

vi.mock('@/lib/app/breaks/saved/settings', () => ({
  updateStudioSettings: vi.fn(),
}));

import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { breakHash, entryHash, placesOn } from '@/lib/app/breaks/community/speed-tables';
import { openableBy } from '@/lib/app/breaks/community/visibility';
import {
  deleteSpeed,
  recordSpeed,
  SPEED_DAILY_CAP,
  yourSpeeds,
} from '@/lib/app/breaks/saved/speeds';
import { updateStudioSettings } from '@/lib/app/breaks/saved/settings';
import { prisma } from '@/lib/db/client';
import type { CreateSpeedInput } from '@/lib/validations/speeds';

const USER_ID = 'cuser0000000000000000001';
const BREAK_ID = 'cbrk00000000000000000001';
const ENTRY_ID = 'centr0000000000000000001';
const NOW = new Date('2026-09-30T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function breakRow(over: Record<string, unknown> = {}) {
  return {
    title: 'Cold Carpet',
    meter: '4/4',
    visibility: 'published',
    slug: 'cold000001',
    gridHash: 'stored-hash',
    doc: null,
    ...over,
  };
}

function input(over: Partial<CreateSpeedInput> = {}): CreateSpeedInput {
  return {
    target: { breakId: BREAK_ID },
    level: 3,
    bpm: 120,
    ...over,
  } as CreateSpeedInput;
}

/** A row shaped like `recordSpeed`'s own `RECORD_SELECT` — for `create`'s resolved value. */
const CREATED_ROW = {
  id: 'rec1',
  level: 3,
  bpm: 120,
  videoUrl: null,
  note: null,
  listed: false,
  recordedAt: NOW,
  titleSnapshot: 'Cold Carpet',
  breakRef: { title: 'Cold Carpet' },
  libraryEntry: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.speedRecord.count).mockResolvedValue(0);
  vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue(null); // ask, by default
  vi.mocked(breakHash).mockResolvedValue('computed-hash');
  vi.mocked(entryHash).mockResolvedValue('computed-hash');
  vi.mocked(prisma.speedRecord.create).mockResolvedValue(CREATED_ROW as never);
});

describe('recordSpeed — target visibility', () => {
  it('404s a break the caller cannot see, and creates nothing', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);

    await expect(recordSpeed(USER_ID, input(), NOW)).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.speedRecord.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to record
  });

  it('looks a break up by openableBy(userId), never just by id', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    await recordSpeed(USER_ID, input(), NOW).catch(() => {});
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: BREAK_ID, ...openableBy(USER_ID) },
    });
  });

  it('404s a library entry the caller cannot see, and creates nothing', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);

    await expect(
      recordSpeed(USER_ID, input({ target: { libraryEntryId: ENTRY_ID } }), NOW)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.speedRecord.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to record
  });

  it('looks a library entry up in the public library filter', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue(null);
    await recordSpeed(USER_ID, input({ target: { libraryEntryId: ENTRY_ID } }), NOW).catch(
      () => {}
    );
    expect(vi.mocked(prisma.libraryEntry.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: ENTRY_ID, library: PUBLIC },
    });
  });
});

describe('recordSpeed — the tempo ceiling', () => {
  it('refuses a bpm below 40, in a 4/4 meter', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow({ meter: '4/4' }) as never);

    const error = await recordSpeed(USER_ID, input({ bpm: 39 }), NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe('A speed is between 40 and 190 bpm');
  });

  it("refuses a bpm above the meter's own ceiling, in a simple meter (4/4 -> 190)", async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow({ meter: '4/4' }) as never);

    const error = await recordSpeed(USER_ID, input({ bpm: 191 }), NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe('A speed is between 40 and 190 bpm');
  });

  it("refuses a bpm above the meter's own ceiling, in a compound meter (6/8 -> 300)", async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow({ meter: '6/8' }) as never);

    const error = await recordSpeed(USER_ID, input({ bpm: 301 }), NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe('A speed is between 40 and 300 bpm');
  });

  it('accepts a bpm right at a compound meter ceiling (12/8 -> 300)', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow({ meter: '12/8' }) as never);

    await expect(recordSpeed(USER_ID, input({ bpm: 300 }), NOW)).resolves.toBeDefined();
  });
});

describe('recordSpeed — the daily cap', () => {
  it('refuses with SPEED_LIMIT (429) at the cap, and creates nothing', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.speedRecord.count).mockResolvedValue(SPEED_DAILY_CAP);

    const error = await recordSpeed(USER_ID, input(), NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'SPEED_LIMIT', status: 429 });
    expect(prisma.speedRecord.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('counts over the 24 hours before `now`', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    await recordSpeed(USER_ID, input(), NOW);
    expect(vi.mocked(prisma.speedRecord.count).mock.calls[0][0]).toEqual({
      where: { userId: USER_ID, recordedAt: { gte: new Date(NOW.getTime() - DAY_MS) } },
    });
  });
});

describe('recordSpeed — the created row', () => {
  it("takes the hash, the title and the tempo from the target, never the client's own", async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ title: 'Cold Carpet' }) as never
    );
    vi.mocked(breakHash).mockResolvedValue('computed-hash-1');

    await recordSpeed(
      USER_ID,
      input({ level: 3, bpm: 120, videoUrl: 'https://vimeo.com/123', note: undefined }),
      NOW
    );

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0]).toMatchObject({
      data: {
        userId: USER_ID,
        breakId: BREAK_ID,
        titleSnapshot: 'Cold Carpet',
        level: 3,
        bpm: 120,
        gridHash: 'computed-hash-1',
        videoUrl: 'https://vimeo.com/123',
        note: null,
        recordedAt: NOW,
      },
    });
  });

  it('holds titleSnapshot to 160 characters', async () => {
    const longTitle = 'x'.repeat(200);
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow({ title: longTitle }) as never);

    await recordSpeed(USER_ID, input(), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.titleSnapshot).toBe(
      longTitle.slice(0, 160)
    );
  });

  it('stores no note as null, and no video as null', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);

    await recordSpeed(USER_ID, input({ note: undefined, videoUrl: undefined }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data).toMatchObject({
      note: null,
      videoUrl: null,
    });
  });

  it("returns the view built from what create answered, the target's live title included", async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.speedRecord.create).mockResolvedValue({
      ...CREATED_ROW,
      videoUrl: 'https://vimeo.com/123',
    } as never);

    const result = await recordSpeed(USER_ID, input({ videoUrl: 'https://vimeo.com/123' }), NOW);

    expect(result).toEqual({
      id: 'rec1',
      level: 3,
      bpm: 120,
      video: {
        platform: 'vimeo',
        url: 'https://vimeo.com/123',
        embedUrl: 'https://player.vimeo.com/video/123',
      },
      note: null,
      listed: false,
      recordedAt: NOW.toISOString(),
      title: 'Cold Carpet',
    });
  });
});

describe('recordSpeed — listing', () => {
  it('is never listed on a private or link-shared target, and the setting is never written, even though listed was asked', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ visibility: 'link', slug: null }) as never
    );

    await recordSpeed(USER_ID, input({ listed: true }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(false);
    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing public to ask about
  });

  it('a published pattern with no slug yet is not public either', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ visibility: 'published', slug: null }) as never
    );

    await recordSpeed(USER_ID, input({ listed: true }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(false);
    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no address to list under
  });

  it('on a public target, listed follows the request, and the first "list" answer while ask becomes the setting', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue(null); // ask

    await recordSpeed(USER_ID, input({ listed: true }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(true);
    expect(updateStudioSettings).toHaveBeenCalledWith(USER_ID, { listSpeeds: 'list' });
  });

  it('on a public target, listed follows the request, and the first "off" answer while ask becomes the setting', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue(null); // ask

    await recordSpeed(USER_ID, input({ listed: false }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(false);
    expect(updateStudioSettings).toHaveBeenCalledWith(USER_ID, { listSpeeds: 'keep' });
  });

  it('with no listed in the request, a stored "list" setting decides, and is not rewritten', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue({
      prefs: { listSpeeds: 'list' },
    } as never);

    await recordSpeed(USER_ID, input({ listed: undefined }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(true);
    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing asked, nothing to rewrite
  });

  it('with no listed in the request, a stored "keep" setting decides, and is not rewritten', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue({
      prefs: { listSpeeds: 'keep' },
    } as never);

    await recordSpeed(USER_ID, input({ listed: undefined }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(false);
    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing asked, nothing to rewrite
  });

  it('with no listed in the request, "ask" counts as not listed, and does not write the setting', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue(null); // ask

    await recordSpeed(USER_ID, input({ listed: undefined }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(false);
    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing was asked
  });

  it('a malformed stored prefs value reads as "ask"', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue({
      prefs: { listSpeeds: 'not-a-real-value' },
    } as never);

    await recordSpeed(USER_ID, input({ listed: true }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(true);
    expect(updateStudioSettings).toHaveBeenCalledWith(USER_ID, { listSpeeds: 'list' });
  });

  it('does not re-ask when the setting is already "list" or "keep", even though listed was given', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue({
      prefs: { listSpeeds: 'list' },
    } as never);

    await recordSpeed(USER_ID, input({ listed: true }), NOW);

    expect(updateStudioSettings).not.toHaveBeenCalled(); // test-review:accept no_arg_called — already answered once
  });

  it('a famous break (a library entry target) follows the same listing rules', async () => {
    vi.mocked(prisma.libraryEntry.findFirst).mockResolvedValue({
      title: 'Funky Drummer',
      meter: '4/4',
      doc: null,
    } as never);
    vi.mocked(prisma.studioSettings.findUnique).mockResolvedValue(null); // ask

    await recordSpeed(USER_ID, input({ target: { libraryEntryId: ENTRY_ID }, listed: true }), NOW);

    expect(vi.mocked(prisma.speedRecord.create).mock.calls[0][0].data.listed).toBe(true);
    expect(updateStudioSettings).toHaveBeenCalledWith(USER_ID, { listSpeeds: 'list' });
  });
});

describe('yourSpeeds', () => {
  it('is null for a target the caller cannot see', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);

    expect(await yourSpeeds(USER_ID, { breakId: BREAK_ID })).toBeNull();
    expect(prisma.speedRecord.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to list
  });

  it('reads your records on the target, newest first, up to 200', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ visibility: 'link', slug: null }) as never // public: false, skips placesOn
    );
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);

    await yourSpeeds(USER_ID, { breakId: BREAK_ID });

    expect(vi.mocked(prisma.speedRecord.findMany).mock.calls[0][0]).toMatchObject({
      where: { userId: USER_ID, breakId: BREAK_ID },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  });

  it('asks for places only on a public target', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(breakRow() as never); // public: true
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(placesOn).mockResolvedValue([{ level: 3, position: 2, of: 9 }]);

    const result = await yourSpeeds(USER_ID, { breakId: BREAK_ID });

    expect(placesOn).toHaveBeenCalledWith(
      { target: { breakId: BREAK_ID }, hash: 'computed-hash' },
      USER_ID
    );
    expect(result?.places).toEqual([{ level: 3, position: 2, of: 9 }]);
  });

  it('does not ask for places on a target with no public table', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ visibility: 'link', slug: null }) as never
    );
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);

    const result = await yourSpeeds(USER_ID, { breakId: BREAK_ID });

    expect(placesOn).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing public to place on
    expect(result?.places).toEqual([]);
  });

  it('reads hasUsername from whether a drummer profile exists', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ visibility: 'link', slug: null }) as never
    );
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([]);

    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    expect((await yourSpeeds(USER_ID, { breakId: BREAK_ID }))?.hasUsername).toBe(false);

    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({ userId: USER_ID } as never);
    expect((await yourSpeeds(USER_ID, { breakId: BREAK_ID }))?.hasUsername).toBe(true);
  });

  it("prefers the live target's title over the snapshot, and falls back to the snapshot once it is gone", async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(
      breakRow({ visibility: 'link', slug: null }) as never
    );
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.speedRecord.findMany).mockResolvedValue([
      { ...CREATED_ROW, id: 'r1', titleSnapshot: 'Old name', breakRef: { title: 'Live name' } },
      { ...CREATED_ROW, id: 'r2', titleSnapshot: 'Gone now', breakRef: null, libraryEntry: null },
    ] as never);

    const result = await yourSpeeds(USER_ID, { breakId: BREAK_ID });

    expect(result?.records.map((r) => r.title)).toEqual(['Live name', 'Gone now']);
  });
});

describe('deleteSpeed', () => {
  it("deletes, scoped by id and the caller's own userId", async () => {
    vi.mocked(prisma.speedRecord.deleteMany).mockResolvedValue({ count: 1 });
    await deleteSpeed(USER_ID, 'rec1');
    expect(vi.mocked(prisma.speedRecord.deleteMany).mock.calls[0][0]).toEqual({
      where: { id: 'rec1', userId: USER_ID },
    });
  });

  it('is true when a row was deleted', async () => {
    vi.mocked(prisma.speedRecord.deleteMany).mockResolvedValue({ count: 1 });
    expect(await deleteSpeed(USER_ID, 'rec1')).toBe(true);
  });

  it('is false when there is no such record of yours', async () => {
    vi.mocked(prisma.speedRecord.deleteMany).mockResolvedValue({ count: 0 });
    expect(await deleteSpeed(USER_ID, 'rec1')).toBe(false);
  });
});
