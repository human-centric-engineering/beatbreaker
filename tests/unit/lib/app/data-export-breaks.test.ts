/**
 * BeatBreaker's own half of the Art. 15 export seam.
 *
 * `tests/unit/lib/app/defaults.test.ts` is Sunrise's file and asserts the
 * *declarations* — that every app model is accounted for at all. This is ours,
 * and asserts the behaviour that actually reaches a data subject: **every
 * section comes back as a key even when the person has no rows.**
 *
 * That is the failure worth a test of its own. A bundle short by a section
 * reads exactly like a complete answer, and neither the subject nor the
 * operator can tell the difference — `rows.length ? rows : undefined` would
 * pass every type check and ship a silently short response, because
 * `JSON.stringify` drops an undefined key.
 *
 * FORK NOTE — this file reads `@/lib/app/data-export` for real, with no
 * `vi.mock`, because the collector's behaviour IS what it is testing. A fork of
 * BeatBreaker that adds its own tables to that seam will see this fail on the
 * section list: expect the six below plus yours, and pin the new list here. Do not mock the seam to make it pass — the assertion is that the real
 * collector returns every declared section as a key, and a mock cannot tell you
 * that. The `prisma` methods are mocked instead, which is the part this test
 * genuinely does not need to be real.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = {
  breaks: vi.fn(),
  takes: vi.fn(),
  pins: vi.fn(),
  styles: vi.fn(),
  libraries: vi.fn(),
  kits: vi.fn(),
};

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findMany: (...args: unknown[]) => findMany.breaks(...args) },
    take: { findMany: (...args: unknown[]) => findMany.takes(...args) },
    pin: { findMany: (...args: unknown[]) => findMany.pins(...args) },
    style: { findMany: (...args: unknown[]) => findMany.styles(...args) },
    patternLibrary: { findMany: (...args: unknown[]) => findMany.libraries(...args) },
    kit: { findMany: (...args: unknown[]) => findMany.kits(...args) },
  },
}));

/** Every spy, reset together and defaulted together. */
const ALL = Object.values(findMany);
const OWNED = [findMany.styles, findMany.libraries, findMany.kits];

const { collectAppSubjectData } = await import('@/lib/app/data-export');

const SUBJECT = { userId: 'user-1', email: 'user@example.com' };

describe('collectAppSubjectData', () => {
  beforeEach(() => {
    for (const spy of ALL) {
      spy.mockReset();
      spy.mockResolvedValue([]);
    }
  });

  it('returns every section as an empty array when the subject has nothing', async () => {
    const data = await collectAppSubjectData(SUBJECT);

    // `toHaveProperty`, not a truthiness check: the bug this guards against is
    // the key being absent, which an `expect(data.breaks).toEqual([])` would
    // also catch — but only by accident, since undefined fails that too for a
    // different reason.
    expect(Object.keys(data).sort()).toEqual([
      'breaks',
      'kits',
      'libraries',
      'pins',
      'styles',
      'takes',
    ]);
    for (const section of Object.values(data)) expect(section).toEqual([]);
  });

  it('scopes every query to the subject', async () => {
    await collectAppSubjectData(SUBJECT);

    for (const spy of [findMany.breaks, findMany.takes, findMany.pins]) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    }
    /* The catalogue names its owner `ownerId`, not `userId`. A copy-paste that
       left `userId` here would throw at the database rather than silently
       return everyone's rows — but a copy-paste that left the filter off
       entirely would hand one subject every other subject's styles, and that is
       what this pins. */
    for (const spy of OWNED) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'user-1' } }));
    }
  });

  it('narrows the BigInt seed to a string, which JSON can carry', async () => {
    /* `seed` is a BigInt column. JSON.stringify throws on a BigInt rather than
       coercing it, so an export containing one real break would fail at
       serialisation — after the data had been assembled, and only for users who
       had saved something. */
    findMany.breaks.mockResolvedValue([
      { id: 'b1', title: 'Cold Carpet', seed: 4294967295n, bpm: 94 },
    ]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(data.breaks).toEqual([{ id: 'b1', title: 'Cold Carpet', seed: '4294967295', bpm: 94 }]);
    expect(() => JSON.stringify(data)).not.toThrow();
  });

  it('reads whole break rows, so Phase 4’s columns — and any later one — are in the export', async () => {
    /* A `select` here would be a second list of columns to keep in step with
       the schema, and the subject would never see the column it forgot. Whole
       rows are what makes `level`, `description` and `links` part of the answer without this file changing. */
    const row = {
      id: 'b1',
      seed: 1n,
      level: 3,
      description: 'The one from the lesson',
      links: [{ kind: 'video', url: 'https://vimeo.com/76979871' }],
    };
    findMany.breaks.mockResolvedValue([row]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(findMany.breaks.mock.calls[0][0]).not.toHaveProperty('select');
    expect(data.breaks).toEqual([{ ...row, seed: '1' }]);
  });

  it('exports the pins shelf by shelf, in order, naming each target by id alone', async () => {
    /* A pin on someone else's shared pattern is the subject's data; the
       pattern is not. So the rows go out whole and unjoined — a `breakId`, not
       the other person's title — and in the order the shelves show them. */
    const pin = {
      id: 'p1',
      userId: 'user-1',
      shelf: 'later',
      position: 0,
      breakId: 'b-theirs',
      libraryEntryId: null,
    };
    findMany.pins.mockResolvedValue([pin]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.pins.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('include');
    expect(args).not.toHaveProperty('select');
    expect(args.orderBy).toEqual([{ shelf: 'asc' }, { position: 'asc' }]);
    expect(data.pins).toEqual([pin]);
  });
});
