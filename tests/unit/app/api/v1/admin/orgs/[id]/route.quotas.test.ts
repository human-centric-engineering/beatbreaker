/**
 * Unit Tests: PATCH /api/v1/admin/orgs/[id] — the caps slice (§110 t-788)
 *
 * Real `withAdminAuth`, real tenant context. At `multi` only the install org
 * may write `settings.quotas`: a platform admin switched into a customer's
 * org is refused (else whoever administers that org could raise its own
 * monthly budget), an org's own OWNER never reaches the handler, and an
 * unbound admin API key acts as the install org. At `single` the rule has
 * nothing to separate. The lifecycle write is mocked at its module.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { INSTALL_ORG_ID } from '@/lib/tenancy/constants';
import { ORG_OWNER_ROLE } from '@/lib/tenancy/roles';
import { SHARED_SETTINGS_REFUSAL_CODE } from '@/lib/tenancy/shared-settings';

const mockEnv = vi.hoisted(() => ({ TENANCY_MODE: 'multi' }));
vi.mock('@/lib/env', () => ({ env: mockEnv }));

const mockGetSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: mockGetSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(() => Promise.resolve(new Headers())) }));

const mockResolveApiKey = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/api-keys', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/api-keys')>()),
  resolveApiKey: mockResolveApiKey,
}));

const mockMembership = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/client', () => ({
  prisma: { org: { findUnique: vi.fn() }, orgMembership: { findUnique: mockMembership } },
}));

const mockUpdateOrg = vi.hoisted(() => vi.fn());
vi.mock('@/lib/tenancy/lifecycle', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tenancy/lifecycle')>()),
  updateOrg: mockUpdateOrg,
}));
vi.mock('@/lib/privacy/erase-org', () => ({ eraseOrg: vi.fn() }));
vi.mock('@/lib/orchestration/retention-windows', () => ({ readRetentionWindows: vi.fn() }));

const mockLog = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
vi.mock('@/lib/api/context', () => ({ getRouteLogger: vi.fn(async () => mockLog) }));
vi.mock('@/lib/logging', () => ({ logger: mockLog }));

import { PATCH } from '@/app/api/v1/admin/orgs/[id]/route';
import { getTenantContext } from '@/lib/tenancy/context';

const CUSTOMER = 'cmorg000000000000000other';

function session(role: 'USER' | 'ADMIN', activeOrgId: string | null) {
  return {
    session: {
      id: 'session_1',
      userId: 'cmjbv4i3x00003wsloputgwul',
      token: 'tok',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      activeOrgId,
    },
    user: {
      id: 'cmjbv4i3x00003wsloputgwul',
      name: 'Admin',
      email: 'admin@example.com',
      emailVerified: true,
      image: null,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

/** Sign in as `role`, switched into `org` and holding `orgRole` there. */
function signedIn(role: 'USER' | 'ADMIN', org: string, orgRole: string = ORG_OWNER_ROLE) {
  mockGetSession.mockResolvedValue(session(role, org));
  mockMembership.mockResolvedValue({ role: orgRole, org: { status: 'ACTIVE' } });
}

const patch = (body: unknown, id = CUSTOMER) =>
  PATCH(
    new Request(`http://localhost/api/v1/admin/orgs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest,
    { params: Promise.resolve({ id }) }
  );

const CAP = { settings: { quotas: { monthlyBudgetUsd: 500 } } };

/** The org each `updateOrg` call ran inside, so a pass is shown to come from where we think. */
let writtenFrom: Array<string | null | undefined>;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.TENANCY_MODE = 'multi';
  mockResolveApiKey.mockResolvedValue(null);
  writtenFrom = [];
  mockUpdateOrg.mockImplementation(async (id: string) => {
    writtenFrom.push(getTenantContext()?.orgId);
    return { id, slug: 'other', name: 'Other', status: 'ACTIVE' };
  });
});

describe('PATCH /api/v1/admin/orgs/[id] — settings.quotas at multi', () => {
  it('refuses a platform admin switched into a customer org, writing nothing', async () => {
    signedIn('ADMIN', CUSTOMER);

    const res = await patch(CAP);
    const body = (await res.json()) as {
      error: { code: string; message: string; details?: { reason?: string } };
    };

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.details?.reason).toBe(SHARED_SETTINGS_REFUSAL_CODE);
    expect(body.error.message).toMatch(/install organisation/);
    expect(mockUpdateOrg).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before the write
    expect(mockLog.warn).toHaveBeenCalledWith(
      'tenancy: refused an org caps write outside the install org',
      expect.objectContaining({ orgId: CUSTOMER, activeOrgId: CUSTOMER })
    );
  });

  it('refuses clearing the caps from a customer org too', async () => {
    signedIn('ADMIN', CUSTOMER);

    const res = await patch({ settings: { quotas: null } });

    expect(res.status).toBe(403);
    expect(mockUpdateOrg).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before the write
  });

  it("refuses an org's own OWNER who is not a platform admin", async () => {
    signedIn('USER', CUSTOMER, ORG_OWNER_ROLE);

    const res = await patch(CAP);

    expect(res.status).toBe(403);
    expect(mockUpdateOrg).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused by the guard
  });

  it('lets a platform admin in the install org set a customer org’s cap', async () => {
    signedIn('ADMIN', INSTALL_ORG_ID);

    const res = await patch(CAP);

    expect(res.status).toBe(200);
    expect(mockUpdateOrg).toHaveBeenCalledWith(CUSTOMER, CAP);
    expect(writtenFrom).toEqual([INSTALL_ORG_ID]);
  });

  it('lets an unbound admin API key set it, as the install org', async () => {
    mockGetSession.mockResolvedValue(null);
    mockResolveApiKey.mockResolvedValue({
      session: session('ADMIN', null),
      scopes: ['admin'],
      rateLimitRpm: null,
      orgId: null,
      ownerAccountType: 'HUMAN',
    });

    const res = await patch(CAP);

    expect(res.status).toBe(200);
    expect(mockUpdateOrg).toHaveBeenCalledWith(CUSTOMER, CAP);
    expect(writtenFrom).toEqual([undefined]);
  });

  it('still lets a platform admin in a customer org rename it', async () => {
    signedIn('ADMIN', CUSTOMER);

    const res = await patch({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(mockUpdateOrg).toHaveBeenCalledWith(CUSTOMER, { name: 'Renamed' });
  });

  it('refuses a cap out of bounds or an unknown key with a 400', async () => {
    signedIn('ADMIN', INSTALL_ORG_ID);

    expect((await patch({ settings: { quotas: { monthlyBudgetUsd: -1 } } })).status).toBe(400);
    expect((await patch({ settings: { quotas: { monthlyBudgetUsd: 2_000_000 } } })).status).toBe(
      400
    );
    expect((await patch({ settings: { quotas: { budget: 5 } } })).status).toBe(400);
    expect(mockUpdateOrg).not.toHaveBeenCalled(); // test-review:accept no_arg_called — rejected by validation
  });
});

describe('PATCH /api/v1/admin/orgs/[id] — settings.quotas at single', () => {
  it('lets a platform admin set it, the install org being the only org', async () => {
    mockEnv.TENANCY_MODE = 'single';
    mockGetSession.mockResolvedValue(session('ADMIN', null));

    const res = await patch(CAP, INSTALL_ORG_ID);

    expect(res.status).toBe(200);
    expect(mockUpdateOrg).toHaveBeenCalledWith(INSTALL_ORG_ID, CAP);
  });
});
