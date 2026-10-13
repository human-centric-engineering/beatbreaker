/**
 * Unit Tests: the per-org request cap in applyRateLimit (§110 t-789)
 *
 * The org counter runs on top of the matched per-caller rule. These tests use
 * the real policy table, the real section limiters and the real org counter,
 * and assert on 429s from exhausted buckets — a spy on `check()` would prove
 * nothing about enforcement. The database is mocked: each org's `settings`
 * column, and the credential rows the api-key / embed-token strategies look
 * up.
 *
 * Each test uses fresh org and user ids, so the section limiters' buckets
 * (which have no reset hook here) never carry over between tests.
 *
 * @see lib/security/org-request-cap.ts
 * @see lib/security/rate-limit-middleware.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));

vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    org: { findUnique: vi.fn() },
    aiApiKey: { findFirst: vi.fn() },
    mcpApiKey: { findUnique: vi.fn() },
    aiAgentEmbedToken: { findUnique: vi.fn() },
  },
}));

const mockEnv = vi.hoisted(() => ({ TENANCY_MODE: 'multi' }));
vi.mock('@/lib/env', () => ({ env: mockEnv }));

import { auth } from '@/lib/auth/config';
import { logger } from '@/lib/logging';
import { prisma } from '@/lib/db/client';
import {
  applyRateLimit,
  assertRateLimitPolicyIntegrity,
} from '@/lib/security/rate-limit-middleware';
import { forgetOrgRequestCap, resetOrgRequestCaps } from '@/lib/security/org-request-cap';
import {
  __resetAppRateLimitKeyResolvers,
  __resetAppRateLimitRules,
  registerRateLimitKeyResolver,
  registerRateLimitRule,
} from '@/lib/security/rate-limit-policy';
import {
  resetRateLimitCredentialBudget,
  resetRateLimitCredentialCache,
} from '@/lib/security/rate-limit-credentials';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let seq = 0;
const fresh = (prefix: string) => `${prefix}_${Date.now()}_${++seq}`;

/** Each org's stored `quotas` slice; an org missing here has no settings. */
let orgQuotas: Record<string, Record<string, unknown>> = {};

/** Each user's session `activeOrgId`. */
let sessions: Record<string, string | null> = {};

function sessionRequest(path: string, userId: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { cookie: `uid=${userId}`, 'x-forwarded-for': '203.0.113.9', ...headers },
  });
}

function request(path: string, headers: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

async function statuses(make: () => NextRequest, count: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const response = await applyRateLimit(make());
    out.push(response?.status ?? 200);
  }
  return out;
}

const API = '/api/v1/conversations';

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('applyRateLimit — per-org request cap', () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_BYPASS;
    vi.clearAllMocks();
    mockEnv.TENANCY_MODE = 'multi';
    orgQuotas = {};
    sessions = {};
    resetOrgRequestCaps();
    resetRateLimitCredentialCache();
    resetRateLimitCredentialBudget('203.0.113.9');

    vi.mocked(auth.api.getSession).mockImplementation((async ({
      headers,
    }: {
      headers: Headers;
    }) => {
      const userId = /uid=([^;]+)/.exec(headers.get('cookie') ?? '')?.[1];
      if (!userId) return null;
      return { user: { id: userId }, session: { activeOrgId: sessions[userId] ?? null } };
    }) as never);

    vi.mocked(prisma.org.findUnique).mockImplementation((async ({
      where,
    }: {
      where: { id: string };
    }) => {
      const quotas = orgQuotas[where.id];
      return { settings: quotas ? { quotas } : null };
    }) as never);
    vi.mocked(prisma.aiApiKey.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.mcpApiKey.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.aiAgentEmbedToken.findUnique).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.RATE_LIMIT_BYPASS = 'true';
    __resetAppRateLimitRules();
    __resetAppRateLimitKeyResolvers();
  });

  it("limits org A's callers together to its cap, and leaves org B's alone", async () => {
    const orgA = fresh('org_a');
    const orgB = fresh('org_b');
    orgQuotas[orgA] = { requestsPerMinute: 3 };
    const [a1, a2, b1] = [fresh('ua1'), fresh('ua2'), fresh('ub1')];
    sessions[a1] = orgA;
    sessions[a2] = orgA;
    sessions[b1] = orgB;

    // Two callers, each far under the api tier's 100/min, share org A's 3.
    expect(await statuses(() => sessionRequest(API, a1), 2)).toEqual([200, 200]);
    expect(await statuses(() => sessionRequest(API, a2), 2)).toEqual([200, 429]);

    const refused = await applyRateLimit(sessionRequest(API, a1));
    expect(refused?.status).toBe(429);
    expect(refused?.headers.get('X-RateLimit-Limit')).toBe('3');

    // Org B has no cap: its caller goes on past org A's number.
    expect(await statuses(() => sessionRequest(API, b1), 5)).toEqual([200, 200, 200, 200, 200]);
  });

  it("still applies each caller's own limit under the org cap", async () => {
    const org = fresh('org');
    orgQuotas[org] = { requestsPerMinute: 1000 };
    const [heavy, other] = [fresh('heavy'), fresh('other')];
    sessions[heavy] = org;
    sessions[other] = org;

    const heavyStatuses = await statuses(() => sessionRequest(API, heavy), 101);
    expect(heavyStatuses.slice(0, 100).every((s) => s === 200)).toBe(true);
    const refused = await applyRateLimit(sessionRequest(API, heavy));
    // The api tier's 100, not the org's 1000.
    expect(refused?.headers.get('X-RateLimit-Limit')).toBe('100');

    expect(await applyRateLimit(sessionRequest(API, other))).toBeNull();
  });

  it("does not spend org capacity on a request the caller's own limit refused", async () => {
    const org = fresh('org');
    orgQuotas[org] = { requestsPerMinute: 102 };
    const [heavy, other] = [fresh('heavy'), fresh('other')];
    sessions[heavy] = org;
    sessions[other] = org;

    // 100 pass and count; 5 are refused by heavy's own cap and must not count.
    await statuses(() => sessionRequest(API, heavy), 105);

    expect(await statuses(() => sessionRequest(API, other), 3)).toEqual([200, 200, 429]);
  });

  it('counts nothing at single, even with a cap stored', async () => {
    mockEnv.TENANCY_MODE = 'single';
    const org = fresh('org');
    orgQuotas[org] = { requestsPerMinute: 1 };
    const user = fresh('user');
    sessions[user] = org;

    expect(await statuses(() => sessionRequest(API, user), 3)).toEqual([200, 200, 200]);
    expect(prisma.org.findUnique).not.toHaveBeenCalled();
  });

  it('counts nothing for an org with no cap, and reads its settings once per TTL', async () => {
    const org = fresh('org');
    const user = fresh('user');
    sessions[user] = org;

    expect(await statuses(() => sessionRequest(API, user), 5)).toEqual([200, 200, 200, 200, 200]);
    expect(prisma.org.findUnique).toHaveBeenCalledTimes(1);
  });

  it('does not let a client-supplied x-sunrise-org header choose the org bucket', async () => {
    const capped = fresh('org_capped');
    const own = fresh('org_own');
    orgQuotas[capped] = { requestsPerMinute: 2 };
    const [outsider, member] = [fresh('outsider'), fresh('member')];
    sessions[outsider] = own;
    sessions[member] = capped;

    // An outsider naming the capped org is counted against their own org,
    // which has no cap — not against the capped one.
    expect(
      await statuses(() => sessionRequest(API, outsider, { 'x-sunrise-org': capped }), 4)
    ).toEqual([200, 200, 200, 200]);
    // An anonymous caller naming it is counted against no org at all.
    expect(
      await statuses(
        () => request(API, { 'x-forwarded-for': '198.51.100.77', 'x-sunrise-org': capped }),
        3
      )
    ).toEqual([200, 200, 200]);
    expect(prisma.org.findUnique).not.toHaveBeenCalledWith({
      where: { id: capped },
      select: { settings: true },
    });

    // The capped org's real member still has the whole cap.
    expect(await statuses(() => sessionRequest(API, member), 3)).toEqual([200, 200, 429]);
  });

  it("counts a user API key, an MCP key and an embed token against their row's org", async () => {
    const org = fresh('org');
    orgQuotas[org] = { requestsPerMinute: 3 };
    vi.mocked(prisma.aiApiKey.findFirst).mockResolvedValue({
      id: fresh('k'),
      expiresAt: null,
      orgId: org,
    } as never);
    vi.mocked(prisma.mcpApiKey.findUnique).mockResolvedValue({
      id: fresh('m'),
      isActive: true,
      expiresAt: null,
      orgId: org,
      org: { status: 'ACTIVE' },
    } as never);
    vi.mocked(prisma.aiAgentEmbedToken.findUnique).mockResolvedValue({
      id: fresh('t'),
      isActive: true,
      orgId: org,
      agent: { isActive: true },
      org: { status: 'ACTIVE' },
    } as never);

    const results = [
      await applyRateLimit(
        request('/api/v1/webhooks/trigger/x', { authorization: 'Bearer sk_live_1' })
      ),
      await applyRateLimit(request('/api/v1/mcp', { authorization: 'Bearer smcp_live_1' })),
      await applyRateLimit(request('/api/v1/embed/chat', { 'x-embed-token': 'tok_live_1' })),
      await applyRateLimit(request('/api/v1/mcp', { authorization: 'Bearer smcp_live_1' })),
    ];
    expect(results.map((r) => r?.status ?? 200)).toEqual([200, 200, 200, 429]);
  });

  it('never counts the platform admin surface, where a full cap is raised', async () => {
    const org = fresh('org');
    orgQuotas[org] = { requestsPerMinute: 2 };
    const admin = fresh('admin');
    sessions[admin] = org;

    expect(await statuses(() => sessionRequest(`/api/v1/admin/orgs/${org}`, admin), 5)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    // The org's own window is untouched by them.
    expect(await statuses(() => sessionRequest(API, admin), 3)).toEqual([200, 200, 429]);
  });

  it('enforces a changed cap at once after forgetOrgRequestCap', async () => {
    const org = fresh('org');
    const user = fresh('user');
    sessions[user] = org;

    expect(await statuses(() => sessionRequest(API, user), 2)).toEqual([200, 200]);
    orgQuotas[org] = { requestsPerMinute: 1 };
    forgetOrgRequestCap(org);

    expect(await statuses(() => sessionRequest(API, user), 2)).toEqual([200, 429]);
  });

  it('applies no org cap, and warns, when the cap cannot be read', async () => {
    const org = fresh('org');
    const user = fresh('user');
    sessions[user] = org;
    vi.mocked(prisma.org.findUnique).mockRejectedValue(new Error('db down'));

    expect(await statuses(() => sessionRequest(API, user), 2)).toEqual([200, 200]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('org request cap'),
      expect.objectContaining({ orgId: org, error: 'db down' })
    );
    // A failed read is not cached as an answer: the next request tries again.
    expect(prisma.org.findUnique).toHaveBeenCalledTimes(2);
  });

  it("boots a fork that registered its own 'org' key resolver, as the old recipe did", () => {
    expect(() => {
      registerRateLimitKeyResolver('org', async () => 'org:custom');
      registerRateLimitRule({ match: /^\/api\/v1\/billing\//, tier: 'api', key: 'org' });
      assertRateLimitPolicyIntegrity();
    }).not.toThrow();
  });
});
