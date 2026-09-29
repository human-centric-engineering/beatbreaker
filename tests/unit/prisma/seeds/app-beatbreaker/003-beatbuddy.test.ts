import { describe, expect, it, vi } from 'vitest';

import { BEATBUDDY_CAPABILITIES } from '@/lib/app/capabilities';
import unit, {
  BEATBUDDY_CAPABILITY_ROWS,
  BEATBUDDY_SLUG,
} from '@/prisma/seeds/app-beatbreaker/003-beatbuddy';
import type { SeedContext } from '@/prisma/runner';

/**
 * The BeatBuddy seed (Phase 7, task 7.8): the agent, its tools' capability
 * rows, and the bindings.
 *
 * What matters here: the agent is provider-less (D5) and public; a re-run
 * changes nothing an admin may have edited; each tool row advertises exactly
 * the definition its class validates against; and the agent gets its `v1`,
 * since this seed runs after Sunrise's own backfill of initial versions.
 *
 * @see prisma/seeds/app-beatbreaker/003-beatbuddy.ts
 */

function makeCtx(opts: { admin?: boolean; versions?: number } = {}) {
  const agentUpsert = vi.fn().mockResolvedValue({ id: 'agent-1', slug: BEATBUDDY_SLUG });
  const capabilityUpsert = vi.fn(async (args: { where: { slug: string } }) => ({
    id: `cap-${args.where.slug}`,
  }));
  const bindingUpsert = vi.fn().mockResolvedValue({});
  const versionCount = vi.fn().mockResolvedValue(opts.versions ?? 0);
  const versionCreate = vi.fn().mockResolvedValue({});
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const ctx = {
    prisma: {
      user: {
        findFirst: vi.fn().mockResolvedValue(opts.admin === false ? null : { id: 'admin-1' }),
      },
      aiAgent: { upsert: agentUpsert },
      aiCapability: { upsert: capabilityUpsert },
      aiAgentCapability: { upsert: bindingUpsert },
      aiAgentVersion: { count: versionCount, create: versionCreate },
    },
    logger,
  } as unknown as SeedContext;
  return { ctx, agentUpsert, capabilityUpsert, bindingUpsert, versionCreate };
}

describe('app-beatbreaker/003-beatbuddy seed', () => {
  it('creates a public, provider-less agent that takes images and PDFs, with spend caps', async () => {
    const { ctx, agentUpsert } = makeCtx();

    await unit.run(ctx);

    const call = agentUpsert.mock.calls[0][0] as {
      where: unknown;
      create: Record<string, unknown>;
    };
    expect(call.where).toEqual({ slug: 'beatbuddy' });
    expect(call.create).toMatchObject({
      slug: 'beatbuddy',
      model: '',
      provider: '',
      visibility: 'public',
      enableImageInput: true,
      enableDocumentInput: true,
      isActive: true,
      createdBy: 'admin-1',
    });
    for (const cap of ['maxCostPerTurnUsd', 'monthlyBudgetUsd', 'rateLimitRpm', 'retentionDays']) {
      expect(call.create[cap]).toEqual(expect.any(Number));
    }
    expect(call.create.systemInstructions).toContain('You are BeatBuddy');
  });

  it("never overwrites an admin's edits to the agent — the update branch sets isSystem only", async () => {
    const { ctx, agentUpsert } = makeCtx();

    await unit.run(ctx);

    expect((agentUpsert.mock.calls[0][0] as { update: unknown }).update).toEqual({
      isSystem: true,
    });
  });

  it('seeds one row per registered tool, advertising the definition its class validates against', async () => {
    const { ctx, capabilityUpsert } = makeCtx();

    await unit.run(ctx);

    expect(capabilityUpsert).toHaveBeenCalledTimes(BEATBUDDY_CAPABILITIES.length);
    for (const capability of BEATBUDDY_CAPABILITIES) {
      const call = capabilityUpsert.mock.calls.find(
        ([args]) => args.where.slug === capability.slug
      )?.[0] as unknown as {
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      };
      expect(call.create.functionDefinition).toEqual(capability.functionDefinition);
      expect(call.update.functionDefinition).toEqual(capability.functionDefinition);
      expect(call.create).toMatchObject({
        slug: capability.slug,
        executionType: 'internal',
        executionHandler: capability.constructor.name,
        isActive: true,
      });
    }
  });

  it('has a seed row for every registered tool and none for a tool that is not registered', () => {
    expect(Object.keys(BEATBUDDY_CAPABILITY_ROWS).sort()).toEqual(
      BEATBUDDY_CAPABILITIES.map((c) => c.slug).sort()
    );
  });

  it('binds every tool to the agent, leaving an existing binding alone', async () => {
    const { ctx, bindingUpsert } = makeCtx();

    await unit.run(ctx);

    expect(bindingUpsert).toHaveBeenCalledTimes(BEATBUDDY_CAPABILITIES.length);
    for (const capability of BEATBUDDY_CAPABILITIES) {
      expect(bindingUpsert).toHaveBeenCalledWith({
        where: {
          agentId_capabilityId: { agentId: 'agent-1', capabilityId: `cap-${capability.slug}` },
        },
        update: {},
        create: { agentId: 'agent-1', capabilityId: `cap-${capability.slug}`, isEnabled: true },
      });
    }
  });

  it('writes v1 when the agent has no history, and nothing when it has', async () => {
    const fresh = makeCtx({ versions: 0 });
    await unit.run(fresh.ctx);
    expect(fresh.versionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ agentId: 'agent-1', version: 1, createdBy: 'admin-1' }),
    });

    const rerun = makeCtx({ versions: 2 });
    await unit.run(rerun.ctx);
    expect(rerun.versionCreate).not.toHaveBeenCalled();
  });

  it('refuses to run before the service account exists', async () => {
    const { ctx, agentUpsert } = makeCtx({ admin: false });

    await expect(unit.run(ctx)).rejects.toThrow(/001-system-owner/);
    expect(agentUpsert).not.toHaveBeenCalled();
  });
});
