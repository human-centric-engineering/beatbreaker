import { describe, it, expect, vi } from 'vitest';

import cleanupAgentSeed from '@/prisma/seeds/020-cleanup-agent';
import { humanAdminWhere } from '@/lib/auth/account';
import type { SeedContext } from '@/prisma/runner';

/**
 * Tests for the `020-cleanup-agent` seed.
 *
 * The contract this seed must hold:
 *  - it throws when no human admin exists, rather than seeding an agent with
 *    a dangling `createdBy` (see `#278` / `humanAdminWhere` — the query must
 *    exclude the seeded SERVICE config-owner, never a raw `role: 'ADMIN'`
 *    literal);
 *  - the agent upsert only sets `isSystem: true` on update, so an admin's
 *    edits to the prompt, model, or temperature survive re-seeding;
 *  - it binds every slug in its capability list, skipping (not throwing on)
 *    a capability that hasn't been seeded yet.
 */

const CAPABILITY_SLUGS = [
  'strip_lines_matching',
  'strip_matches',
  'strip_timestamps',
  'strip_speaker_labels',
  'collapse_whitespace',
  'dedupe_lines',
  'normalise_punctuation',
  'preview_diff',
  'estimate_size',
  'rewrite_with_llm',
  'rewrite_section_with_llm',
];

function makeCtx({ adminFound = true, missingSlugs = new Set<string>() } = {}) {
  const userFindFirst = vi.fn().mockResolvedValue(adminFound ? { id: 'admin-1' } : null);
  const agentUpsert = vi.fn().mockResolvedValue({ id: 'agent-cleanup-1' });
  const capabilityFindUnique = vi
    .fn()
    .mockImplementation(({ where: { slug } }) =>
      Promise.resolve(missingSlugs.has(slug) ? null : { id: `cap-${slug}` })
    );
  const agentCapabilityUpsert = vi.fn().mockResolvedValue({});
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

  const ctx = {
    prisma: {
      user: { findFirst: userFindFirst },
      aiAgent: { upsert: agentUpsert },
      aiCapability: { findUnique: capabilityFindUnique },
      aiAgentCapability: { upsert: agentCapabilityUpsert },
    },
    logger,
  } as unknown as SeedContext;

  return { ctx, userFindFirst, agentUpsert, capabilityFindUnique, agentCapabilityUpsert, logger };
}

describe('020-cleanup-agent seed', () => {
  it('throws when no human admin exists', async () => {
    const { ctx } = makeCtx({ adminFound: false });

    await expect(cleanupAgentSeed.run(ctx)).rejects.toThrow(/no admin user found/i);
  });

  it('looks up the admin via humanAdminWhere, not a raw role literal', async () => {
    const { ctx, userFindFirst } = makeCtx();

    await cleanupAgentSeed.run(ctx);

    expect(userFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: humanAdminWhere }));
  });

  it('upserts the agent with isSystem-only on update, attributed to the admin on create', async () => {
    const { ctx, agentUpsert } = makeCtx();

    await cleanupAgentSeed.run(ctx);

    expect(agentUpsert).toHaveBeenCalledTimes(1);
    const arg = agentUpsert.mock.calls[0][0];
    expect(arg.where).toEqual({ slug: 'cleanup-agent' });
    expect(arg.update).toEqual({ isSystem: true });
    expect(arg.create).toMatchObject({
      slug: 'cleanup-agent',
      isSystem: true,
      isActive: true,
      visibility: 'internal',
      knowledgeAccessMode: 'restricted',
      temperature: 0.2,
      createdBy: 'admin-1',
    });
  });

  it('binds every capability slug in the list', async () => {
    const { ctx, agentCapabilityUpsert } = makeCtx();

    await cleanupAgentSeed.run(ctx);

    expect(agentCapabilityUpsert).toHaveBeenCalledTimes(CAPABILITY_SLUGS.length);
    for (const call of agentCapabilityUpsert.mock.calls) {
      expect(call[0].create).toMatchObject({
        agentId: 'agent-cleanup-1',
        isEnabled: true,
      });
    }
  });

  it('skips (does not throw on) a capability that has not been seeded yet', async () => {
    const { ctx, agentCapabilityUpsert, logger } = makeCtx({
      missingSlugs: new Set(['rewrite_with_llm']),
    });

    await expect(cleanupAgentSeed.run(ctx)).resolves.toBeUndefined();

    expect(agentCapabilityUpsert).toHaveBeenCalledTimes(CAPABILITY_SLUGS.length - 1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/rewrite_with_llm/));
  });

  it('declares the expected seed unit name', () => {
    expect(cleanupAgentSeed.name).toBe('020-cleanup-agent');
  });
});
