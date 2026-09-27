import { describe, expect, it, vi } from 'vitest';

import { PUBLISHING_FLAG } from '@/lib/app/breaks/community/publish';
import unit from '@/prisma/seeds/app-beatbreaker/002-publishing-flag';
import type { SeedContext } from '@/prisma/runner';

/**
 * The publishing feature flag seed (Phase 6, task 6.9): `PATTERN_PUBLISHING`,
 * seeded **on** so a fresh install can publish. `isFeatureEnabled` reads a
 * missing flag as off, so this seed is what keeps that fail-closed default
 * from also disabling every fresh install — and `update: {}` is what stops a
 * re-run from silently re-enabling a switch an admin turned off.
 *
 * @see prisma/seeds/app-beatbreaker/002-publishing-flag.ts
 */

function makeCtx() {
  const upsert = vi.fn().mockResolvedValue({});
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const ctx = { prisma: { featureFlag: { upsert } }, logger } as unknown as SeedContext;
  return { ctx, upsert, logger };
}

describe('app-beatbreaker/002-publishing-flag seed', () => {
  it('upserts the flag by name, on for a fresh install', async () => {
    const { ctx, upsert } = makeCtx();

    await unit.run(ctx);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { name: PUBLISHING_FLAG },
      update: {},
      create: {
        name: PUBLISHING_FLAG,
        description: expect.any(String),
        enabled: true,
      },
    });
  });

  it('never re-enables a flag an admin turned off — the update branch changes nothing', async () => {
    const { ctx, upsert } = makeCtx();

    await unit.run(ctx);

    // the call's own `update` object, not a value read back from a store:
    // this is the payload Prisma would use to skip re-applying `enabled: true`
    const call = upsert.mock.calls[0][0] as { update: Record<string, unknown> };
    expect(call.update).toEqual({});
    expect(Object.keys(call.update)).toHaveLength(0);
  });

  it('logs that the flag is present', async () => {
    const { ctx, logger } = makeCtx();

    await unit.run(ctx);

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(PUBLISHING_FLAG));
  });
});
