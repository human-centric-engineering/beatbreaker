/**
 * BeatBreaker's own half of the Art. 15 export seam.
 *
 * `tests/unit/lib/app/defaults.test.ts` is Sunrise's file and asserts the
 * *declarations* — that `Break` and `Take` are accounted for at all. This is
 * ours, and asserts the behaviour that actually reaches a data subject: **both
 * sections come back as keys even when the person has no rows.**
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
 * section list: expect `['breaks', 'takes']` plus yours, and pin the new list
 * here. Do not mock the seam to make it pass — the assertion is that the real
 * collector returns every declared section as a key, and a mock cannot tell you
 * that. The two `prisma` methods are mocked instead, which is the part this
 * test genuinely does not need to be real.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = { breaks: vi.fn(), takes: vi.fn() };

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findMany: (...args: unknown[]) => findMany.breaks(...args) },
    take: { findMany: (...args: unknown[]) => findMany.takes(...args) },
  },
}));

const { collectAppSubjectData } = await import('@/lib/app/data-export');

const SUBJECT = { userId: 'user-1', email: 'user@example.com' };

describe('collectAppSubjectData', () => {
  beforeEach(() => {
    findMany.breaks.mockReset();
    findMany.takes.mockReset();
  });

  it('returns both sections as empty arrays when the subject has nothing', async () => {
    findMany.breaks.mockResolvedValue([]);
    findMany.takes.mockResolvedValue([]);

    const data = await collectAppSubjectData(SUBJECT);

    // `toHaveProperty`, not a truthiness check: the bug this guards against is
    // the key being absent, which an `expect(data.breaks).toEqual([])` would
    // also catch — but only by accident, since undefined fails that too for a
    // different reason.
    expect(Object.keys(data).sort()).toEqual(['breaks', 'takes']);
    expect(data.breaks).toEqual([]);
    expect(data.takes).toEqual([]);
  });

  it('scopes both queries to the subject', async () => {
    findMany.breaks.mockResolvedValue([]);
    findMany.takes.mockResolvedValue([]);

    await collectAppSubjectData(SUBJECT);

    for (const spy of [findMany.breaks, findMany.takes]) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
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
    findMany.takes.mockResolvedValue([]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(data.breaks).toEqual([{ id: 'b1', title: 'Cold Carpet', seed: '4294967295', bpm: 94 }]);
    expect(() => JSON.stringify(data)).not.toThrow();
  });
});
