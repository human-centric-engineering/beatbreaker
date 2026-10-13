/**
 * Tests: the monthly spend caps and their call-time gate (§110 t-788).
 *
 * `assertWithinSpendCaps` runs before every paid vendor call (the provider
 * manager's Proxy), so it is what holds workflows, evaluations and jobs to the
 * org and global caps. These tests pin what it refuses, what it never refuses
 * (a local provider), which org it asks about, and the cached totals that keep
 * it from summing a month of cost rows on every call.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockMode = vi.hoisted(() => ({ value: 'single' }));
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>();
  return {
    ...actual,
    env: new Proxy(actual.env, {
      get: (target, key) =>
        key === 'TENANCY_MODE' ? mockMode.value : (Reflect.get(target, key) as unknown),
    }),
  };
});

const db = vi.hoisted(() => ({
  aiCostLog: { aggregate: vi.fn() },
  aiOrchestrationSettings: { findUnique: vi.fn() },
  org: { findUnique: vi.fn() },
}));
vi.mock('@/lib/db/client', () => ({ prisma: db }));
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/logging', () => ({ logger: mockLogger }));

import {
  SPEND_TOTAL_TTL_MS,
  CAP_SETTING_TTL_MS,
  SpendCapExceededError,
  assertWithinSpendCaps,
  forgetGlobalCap,
  forgetOrgCap,
  forgetSpendCaps,
  getMonthToDateGlobalSpend,
  getMonthToDateOrgSpend,
  getOrgCapState,
  noteSpend,
  utcMonthStart,
} from '@/lib/orchestration/llm/spend-caps';
import { isRequestFault } from '@/lib/orchestration/llm/provider';
import { INSTALL_ORG_ID } from '@/lib/tenancy/constants';
import { runAsOrg } from '@/lib/tenancy/context';

const ORG_A = 'cmorg0000000000000000orga';
const ORG_B = 'cmorg0000000000000000orgb';

/** Spend per org; a global total is the sum of every org's. */
let spendByOrg: Record<string, number>;
/** Each org's `Org.settings`. */
let settingsByOrg: Record<string, unknown>;
let globalCap: number | null;

beforeEach(() => {
  forgetSpendCaps();
  vi.clearAllMocks();
  mockMode.value = 'single';
  spendByOrg = {};
  settingsByOrg = {};
  globalCap = null;
  db.aiCostLog.aggregate.mockImplementation(async (args: { where: { orgId?: string } }) => {
    const total =
      args.where.orgId !== undefined
        ? (spendByOrg[args.where.orgId] ?? 0)
        : Object.values(spendByOrg).reduce((sum, v) => sum + v, 0);
    return { _sum: { totalCostUsd: total } };
  });
  db.aiOrchestrationSettings.findUnique.mockImplementation(async () => ({
    globalMonthlyBudgetUsd: globalCap,
  }));
  db.org.findUnique.mockImplementation(async (args: { where: { id: string } }) =>
    args.where.id in settingsByOrg ? { settings: settingsByOrg[args.where.id] } : null
  );
});

afterEach(() => {
  vi.useRealTimers();
});

const capOrg = (orgId: string, monthlyBudgetUsd: number) => {
  settingsByOrg[orgId] = { quotas: { monthlyBudgetUsd } };
};

/** The gate's refusal as `'org'` / `'global'`, or `null` when it let the call through. */
async function refusal(run: () => Promise<void>): Promise<'org' | 'global' | null> {
  try {
    await run();
    return null;
  } catch (err) {
    if (err instanceof SpendCapExceededError) return err.cap;
    throw err;
  }
}

describe('utcMonthStart', () => {
  it('is midnight UTC on the first of the month, whatever the time of day', () => {
    expect(utcMonthStart(new Date('2026-10-31T23:59:59.999Z')).toISOString()).toBe(
      '2026-10-01T00:00:00.000Z'
    );
    expect(utcMonthStart(new Date('2026-11-01T00:00:00.000Z')).toISOString()).toBe(
      '2026-11-01T00:00:00.000Z'
    );
  });
});

describe('assertWithinSpendCaps', () => {
  it("refuses a paid call once the org's spend reaches its cap", async () => {
    capOrg(INSTALL_ORG_ID, 50);
    spendByOrg[INSTALL_ORG_ID] = 50;

    const err = await assertWithinSpendCaps('openai', false).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(SpendCapExceededError);
    expect(err).toMatchObject({ cap: 'org', code: 'org_budget_exceeded', retriable: false });
    // A request fault: not retried, not failed over, kept off the breaker.
    expect(isRequestFault(err)).toBe(true);
  });

  it('lets a paid call through below the cap', async () => {
    capOrg(INSTALL_ORG_ID, 50);
    spendByOrg[INSTALL_ORG_ID] = 49.99;

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();
  });

  it('never refuses a local provider, which costs nothing — not even under a cap of 0', async () => {
    capOrg(INSTALL_ORG_ID, 0);
    globalCap = 0;

    expect(await refusal(() => assertWithinSpendCaps('ollama', true))).toBeNull();
    // It does not even read the caps for one.
    expect(db.aiCostLog.aggregate).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a local call reads nothing
  });

  it('treats a cap of 0 as "no paid calls"', async () => {
    capOrg(INSTALL_ORG_ID, 0);

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('org');
  });

  it('refuses on the global cap, on every org’s combined spend', async () => {
    globalCap = 100;
    spendByOrg[ORG_A] = 60;
    spendByOrg[ORG_B] = 40;
    mockMode.value = 'multi';

    expect(await refusal(() => runAsOrg(ORG_A, () => assertWithinSpendCaps('openai', false)))).toBe(
      'global'
    );
  });

  it('names the global cap when both are reached: no admin of the org can lift it', async () => {
    globalCap = 10;
    capOrg(INSTALL_ORG_ID, 10);
    spendByOrg[INSTALL_ORG_ID] = 20;

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('global');
  });

  it('asks about the org the call is made for at multi, and no other', async () => {
    mockMode.value = 'multi';
    capOrg(ORG_A, 10);
    capOrg(ORG_B, 10);
    spendByOrg[ORG_A] = 15;
    spendByOrg[ORG_B] = 5;

    expect(await refusal(() => runAsOrg(ORG_A, () => assertWithinSpendCaps('openai', false)))).toBe(
      'org'
    );
    expect(
      await refusal(() => runAsOrg(ORG_B, () => assertWithinSpendCaps('openai', false)))
    ).toBeNull();
  });

  it('asks about the install org at single when no org was entered', async () => {
    capOrg(INSTALL_ORG_ID, 1);
    spendByOrg[INSTALL_ORG_ID] = 2;

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('org');
    expect(db.org.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: INSTALL_ORG_ID } })
    );
  });

  it('skips a cap it cannot read rather than stopping every call', async () => {
    capOrg(INSTALL_ORG_ID, 1);
    spendByOrg[INSTALL_ORG_ID] = 2;
    db.org.findUnique.mockRejectedValue(new Error('db down'));
    db.aiOrchestrationSettings.findUnique.mockRejectedValue(new Error('db down'));

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Spend gate: org cap lookup failed, skipping the org cap',
      expect.objectContaining({ orgId: INSTALL_ORG_ID })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Spend gate: global cap lookup failed, skipping the global cap',
      expect.objectContaining({ providerSlug: 'openai' })
    );
  });

  it('lets everything through when no cap is set', async () => {
    spendByOrg[INSTALL_ORG_ID] = 1_000_000;

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();
  });
});

describe('getOrgCapState', () => {
  it('is null for no org, and for an org with no cap', async () => {
    settingsByOrg[ORG_A] = null;

    await expect(getOrgCapState(null)).resolves.toBeNull();
    await expect(getOrgCapState(ORG_A)).resolves.toBeNull();
  });

  it("filters the org's spend on its id from the start of the UTC month", async () => {
    capOrg(ORG_A, 25);
    spendByOrg[ORG_A] = 30;

    await expect(getOrgCapState(ORG_A)).resolves.toEqual({
      limit: 25,
      spent: 30,
      exceeded: true,
    });
    expect(db.aiCostLog.aggregate).toHaveBeenCalledWith({
      where: { orgId: ORG_A, createdAt: { gte: utcMonthStart() } },
      _sum: { totalCostUsd: true },
    });
  });
});

describe('the cached month-to-date totals', () => {
  it('serves repeat reads from the cache within the TTL, and reads again after it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    spendByOrg[ORG_A] = 5;

    expect(await getMonthToDateGlobalSpend()).toBe(5);
    spendByOrg[ORG_A] = 9; // another process's spend
    expect(await getMonthToDateGlobalSpend()).toBe(5);
    expect(db.aiCostLog.aggregate).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(Date.now() + SPEND_TOTAL_TTL_MS));
    expect(await getMonthToDateGlobalSpend()).toBe(9);
    expect(db.aiCostLog.aggregate).toHaveBeenCalledTimes(2);
  });

  it('shares one query between concurrent misses', async () => {
    spendByOrg[ORG_A] = 3;

    const totals = await Promise.all([
      getMonthToDateOrgSpend(ORG_A),
      getMonthToDateOrgSpend(ORG_A),
      getMonthToDateOrgSpend(ORG_A),
    ]);

    expect(totals).toEqual([3, 3, 3]);
    expect(db.aiCostLog.aggregate).toHaveBeenCalledTimes(1);
  });

  it("adds this process's own spend at once, to its org and to the global total", async () => {
    spendByOrg[ORG_A] = 10;
    await getMonthToDateGlobalSpend();
    await getMonthToDateOrgSpend(ORG_A);
    await getMonthToDateOrgSpend(ORG_B);

    noteSpend(ORG_A, 2.5);

    expect(await getMonthToDateGlobalSpend()).toBe(12.5);
    expect(await getMonthToDateOrgSpend(ORG_A)).toBe(12.5);
    expect(await getMonthToDateOrgSpend(ORG_B)).toBe(0);
    // Still from the cache: the row was counted without a query.
    expect(db.aiCostLog.aggregate).toHaveBeenCalledTimes(3);
  });

  it('counts a NULL-org row towards the global total only, and ignores a free one', async () => {
    await getMonthToDateGlobalSpend();
    await getMonthToDateOrgSpend(ORG_A);

    noteSpend(null, 4);
    noteSpend(ORG_A, 0);

    expect(await getMonthToDateGlobalSpend()).toBe(4);
    expect(await getMonthToDateOrgSpend(ORG_A)).toBe(0);
  });

  it('lets the gate refuse on spend this process has just made', async () => {
    capOrg(INSTALL_ORG_ID, 10);
    spendByOrg[INSTALL_ORG_ID] = 9;
    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();

    noteSpend(INSTALL_ORG_ID, 1);

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('org');
  });

  it('starts again at a new month rather than carrying last month’s total', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T23:59:59Z'));
    spendByOrg[ORG_A] = 50;
    expect(await getMonthToDateOrgSpend(ORG_A)).toBe(50);

    vi.setSystemTime(new Date('2026-11-01T00:00:01Z'));
    spendByOrg[ORG_A] = 0;
    expect(await getMonthToDateOrgSpend(ORG_A)).toBe(0);
    expect(db.aiCostLog.aggregate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { orgId: ORG_A, createdAt: { gte: new Date('2026-11-01T00:00:00Z') } },
      })
    );
  });

  it('does not keep a failed read: the next caller asks again', async () => {
    db.aiCostLog.aggregate.mockRejectedValueOnce(new Error('timeout'));

    await expect(getMonthToDateOrgSpend(ORG_A)).rejects.toThrow('timeout');
    spendByOrg[ORG_A] = 7;
    await expect(getMonthToDateOrgSpend(ORG_A)).resolves.toBe(7);
  });
});

describe('the cached caps', () => {
  it('reads each cap once while warm, so a gated call makes no database read', async () => {
    capOrg(INSTALL_ORG_ID, 100);
    globalCap = 1000;

    await assertWithinSpendCaps('openai', false);
    await assertWithinSpendCaps('openai', false);
    await assertWithinSpendCaps('openai', false);

    expect(db.org.findUnique).toHaveBeenCalledTimes(1);
    expect(db.aiOrchestrationSettings.findUnique).toHaveBeenCalledTimes(1);
    // One org total and one global total, both still within their TTL.
    expect(db.aiCostLog.aggregate).toHaveBeenCalledTimes(2);
  });

  it("enforces an org's new cap at once after forgetOrgCap", async () => {
    capOrg(INSTALL_ORG_ID, 100);
    spendByOrg[INSTALL_ORG_ID] = 50;
    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();

    capOrg(INSTALL_ORG_ID, 40); // lowered by an admin
    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();
    forgetOrgCap(INSTALL_ORG_ID);

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('org');
  });

  it('enforces a new global cap at once after forgetGlobalCap', async () => {
    spendByOrg[INSTALL_ORG_ID] = 50;
    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();

    globalCap = 10;
    forgetGlobalCap();

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('global');
  });

  it('reads a cap again once its TTL has passed, for a write made in another process', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    spendByOrg[INSTALL_ORG_ID] = 50;
    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBeNull();

    capOrg(INSTALL_ORG_ID, 40);
    vi.setSystemTime(new Date(Date.now() + CAP_SETTING_TTL_MS));

    expect(await refusal(() => assertWithinSpendCaps('openai', false))).toBe('org');
  });
});
