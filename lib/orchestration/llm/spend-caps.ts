/**
 * Monthly spend caps: the org's and the global one (§110 t-788).
 *
 * Two caps are not about any one agent, so they hold for every AI call, not
 * only for chat:
 *
 * - an org's `Org.settings.quotas.monthlyBudgetUsd`, on the org's combined
 *   spend;
 * - `AiOrchestrationSettings.globalMonthlyBudgetUsd`, on every org's combined
 *   spend.
 *
 * {@link assertWithinSpendCaps} is the call-time gate. The provider manager's
 * Proxy runs it before every vendor call, beside the eligibility gate, so a
 * workflow step, the orchestrator, an evaluation, a judge, knowledge ingestion
 * and a scheduled or webhook run are all held to these caps, whichever site
 * picked the provider. `checkBudget()` reads the same state for chat, which
 * refuses a turn before it starts so the user gets a message rather than a
 * failed stream, and adds the agent's own cap, which only it can know.
 *
 * **A local provider is never refused.** It costs $0 (`cost-tracker.ts`), so a
 * reached cap is no reason to stop it, and a cap of `0` means "no paid calls"
 * rather than "no calls".
 *
 * **The month-to-date totals are cached for {@link SPEND_TOTAL_TTL_MS}.**
 * Without it every vendor call would sum a month of cost rows, and the global
 * total sums every org's, so the cost of a cap check would grow with the
 * number of tenants. `logCost` adds each row it writes to the cached totals
 * ({@link noteSpend}), so this process sees its own spend at once. Another
 * process's spend is seen when the entry expires, which bounds how far a cap
 * can be overrun to what the install spends in that window. A row written
 * while the total is being read may be counted twice until the entry expires.
 * That errs towards refusing early, never towards letting spend through.
 *
 * **The caps themselves are cached for {@link CAP_SETTING_TTL_MS}**, so a gated
 * call makes no database read at all while its entries are warm. A write
 * clears them in the process that made it: `PATCH /api/v1/admin/orgs/[id]`
 * calls {@link forgetOrgCap}, and the settings PATCH calls
 * {@link forgetGlobalCap}. Another process sees the change within the TTL.
 *
 * Tenancy posture: the global total and the global cap are shared by
 * decision, since the global cap is install-wide by definition; the org
 * totals and org caps are row-keyed, by org id, and filled by queries that
 * filter on that id.
 *
 * Platform-agnostic: no Next.js imports.
 */

import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import { globalSpendSince } from '@/lib/orchestration/admin/global-config-usage';
import { ProviderError, SPEND_CAP_CODES } from '@/lib/orchestration/llm/provider';
import { loadOrgQuotas } from '@/lib/tenancy/org-settings';
import { getTenantContext, isMultiTenant } from '@/lib/tenancy/context';
import { INSTALL_ORG_ID } from '@/lib/tenancy/constants';

/** How long a month-to-date total is served from the cache. */
export const SPEND_TOTAL_TTL_MS = 10_000;

/** How long a cap's configured value is served from the cache. */
export const CAP_SETTING_TTL_MS = 30_000;

/** A cached lookup. The promise is cached, so concurrent misses share one read. */
interface CapEntry<T> {
  cachedAt: number;
  value: Promise<T>;
}

let globalCapEntry: CapEntry<number | null> | null = null;
const orgCapEntries = new Map<string, CapEntry<number | null>>();

/** `read()` through `entry`, refilling it when stale and dropping a failed read. */
function cachedCap<T>(
  current: CapEntry<T> | null | undefined,
  read: () => Promise<T>,
  store: (entry: CapEntry<T> | null) => void,
  stillCurrent: () => CapEntry<T> | null | undefined
): Promise<T> {
  if (current && Date.now() - current.cachedAt < CAP_SETTING_TTL_MS) return current.value;
  const entry: CapEntry<T> = { cachedAt: Date.now(), value: read() };
  store(entry);
  entry.value.catch(() => {
    if (stillCurrent() === entry) store(null);
  });
  return entry.value;
}

/** `AiOrchestrationSettings.globalMonthlyBudgetUsd`, cached. */
function globalCapSetting(): Promise<number | null> {
  return cachedCap(
    globalCapEntry,
    async () => {
      const settings = await prisma.aiOrchestrationSettings.findUnique({
        where: { slug: 'global' },
        select: { globalMonthlyBudgetUsd: true },
      });
      return settings?.globalMonthlyBudgetUsd ?? null;
    },
    (next) => {
      globalCapEntry = next;
    },
    () => globalCapEntry
  );
}

/** The org's `quotas.monthlyBudgetUsd`, cached; `null` when it has none. */
function orgCapSetting(orgId: string): Promise<number | null> {
  return cachedCap(
    orgCapEntries.get(orgId),
    async () => (await loadOrgQuotas(orgId)).monthlyBudgetUsd ?? null,
    (next) => {
      if (next === null) orgCapEntries.delete(orgId);
      else orgCapEntries.set(orgId, next);
    },
    () => orgCapEntries.get(orgId)
  );
}

/** Drop one org's cached cap after a write, so this process enforces the new one at once. */
export function forgetOrgCap(orgId: string): void {
  orgCapEntries.delete(orgId);
}

/** Drop the cached global cap after the settings row is written. */
export function forgetGlobalCap(): void {
  globalCapEntry = null;
}

/** Midnight UTC on the first of `now`'s month: where every monthly budget starts. */
export function utcMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * One cached total. The LOOKUP is cached, not its answer, so concurrent misses
 * share one query (the shape `org-provider-policy.ts` uses). `added` is what
 * this process has spent since the lookup started.
 */
interface SpendEntry {
  monthStart: number;
  cachedAt: number;
  value: Promise<number>;
  added: number;
}

let globalEntry: SpendEntry | null = null;
const orgEntries = new Map<string, SpendEntry>();

function freshFor(entry: SpendEntry | null | undefined, monthStart: Date): entry is SpendEntry {
  return (
    entry !== null &&
    entry !== undefined &&
    entry.monthStart === monthStart.getTime() &&
    Date.now() - entry.cachedAt < SPEND_TOTAL_TTL_MS
  );
}

/** Start a lookup, and drop the entry again if it rejects: a failed read is not an answer. */
function startEntry(
  monthStart: Date,
  read: () => Promise<number>,
  store: (entry: SpendEntry | null) => void,
  current: () => SpendEntry | null | undefined
): SpendEntry {
  const entry: SpendEntry = {
    monthStart: monthStart.getTime(),
    cachedAt: Date.now(),
    value: read(),
    added: 0,
  };
  store(entry);
  entry.value.catch(() => {
    if (current() === entry) store(null);
  });
  return entry;
}

async function totalOf(entry: SpendEntry): Promise<number> {
  return (await entry.value) + entry.added;
}

/**
 * Every org's spend since the start of the current UTC month, detached
 * `NULL`-org rows included. Cached; see the module docblock.
 *
 * Read across orgs at `multi` (`globalSpendSince`), because the caller is
 * usually inside one org's scope, where the `org_isolation` policy would hide
 * every other org's rows.
 */
export function getMonthToDateGlobalSpend(): Promise<number> {
  const monthStart = utcMonthStart();
  const entry = freshFor(globalEntry, monthStart)
    ? globalEntry
    : startEntry(
        monthStart,
        () => globalSpendSince(monthStart),
        (next) => {
          globalEntry = next;
        },
        () => globalEntry
      );
  return totalOf(entry);
}

/**
 * One org's spend since the start of the current UTC month. Cached; see the
 * module docblock.
 *
 * Filtered on `orgId` explicitly rather than left to the `org_isolation`
 * policy, so it is the org's total whatever scope the caller is in, and at
 * `single` too, where there is no policy and a total with no filter would be
 * the whole install's.
 */
export function getMonthToDateOrgSpend(orgId: string): Promise<number> {
  const monthStart = utcMonthStart();
  const cached = orgEntries.get(orgId);
  const entry = freshFor(cached, monthStart)
    ? cached
    : startEntry(
        monthStart,
        async () => {
          const aggregate = await prisma.aiCostLog.aggregate({
            where: { orgId, createdAt: { gte: monthStart } },
            _sum: { totalCostUsd: true },
          });
          return aggregate._sum.totalCostUsd ?? 0;
        },
        (next) => {
          if (next === null) orgEntries.delete(orgId);
          else orgEntries.set(orgId, next);
        },
        () => orgEntries.get(orgId)
      );
  return totalOf(entry);
}

/**
 * Add a cost row this process just wrote to the cached totals, so the caps
 * see it before the entries expire. Called by `logCost`. A `NULL`-org row
 * counts towards the global total only.
 */
export function noteSpend(orgId: string | null, costUsd: number, at: Date = new Date()): void {
  if (!(costUsd > 0)) return;
  const monthStart = utcMonthStart(at);
  if (freshFor(globalEntry, monthStart)) globalEntry.added += costUsd;
  if (orgId !== null) {
    const entry = orgEntries.get(orgId);
    if (freshFor(entry, monthStart)) entry.added += costUsd;
  }
}

/** Drop every cached total and cap, so the next read of each goes to the database. */
export function forgetSpendCaps(): void {
  globalEntry = null;
  orgEntries.clear();
  globalCapEntry = null;
  orgCapEntries.clear();
}

/** The global cap and what it is checked against. */
export interface GlobalCapState {
  /** `AiOrchestrationSettings.globalMonthlyBudgetUsd`; `null` when no cap is set. */
  cap: number | null;
  /** Month-to-date spend in every org; `0` when no cap is set, since nothing reads it. */
  spent: number;
  exceeded: boolean;
}

/**
 * The global cap and whether this month's spend has reached it. Throws when
 * the settings row or the total cannot be read; each caller decides what a
 * failure means for it.
 */
export async function getGlobalCapState(): Promise<GlobalCapState> {
  const cap = await globalCapSetting();
  if (cap === null) return { cap: null, spent: 0, exceeded: false };
  const spent = await getMonthToDateGlobalSpend();
  return { cap, spent, exceeded: spent >= cap };
}

/** An org's cap and what it is checked against. */
export interface OrgCapState {
  /** `Org.settings.quotas.monthlyBudgetUsd`. */
  limit: number;
  /** The org's month-to-date spend. */
  spent: number;
  exceeded: boolean;
}

/**
 * The org's cap, if it has one, and whether its month-to-date spend has
 * reached it. `null` when there is no org or the org has set no cap. Throws
 * when the org or its total cannot be read.
 */
export async function getOrgCapState(orgId: string | null): Promise<OrgCapState | null> {
  if (!orgId) return null;
  const monthlyBudgetUsd = await orgCapSetting(orgId);
  if (monthlyBudgetUsd === null) return null;
  const spent = await getMonthToDateOrgSpend(orgId);
  return { limit: monthlyBudgetUsd, spent, exceeded: spent >= monthlyBudgetUsd };
}

/**
 * A paid vendor call refused because a monthly spend cap has been reached.
 * A request fault (`isRequestFault`): it is not retried, not failed over, and
 * never reaches a circuit breaker.
 */
export class SpendCapExceededError extends ProviderError {
  readonly cap: 'org' | 'global';
  readonly providerSlug: string;
  constructor(cap: 'org' | 'global', providerSlug: string) {
    super(
      cap === 'org'
        ? "This organisation has reached its monthly AI budget, so the call to a paid provider was refused. A platform admin can raise the organisation's cap (PATCH /api/v1/admin/orgs/[id], settings.quotas), or the work can use a local model."
        : 'This platform has reached its global monthly AI budget, so the call to a paid provider was refused. A platform admin can raise the global cap in the orchestration settings, or the work can use a local model.',
      { code: SPEND_CAP_CODES[cap], retriable: false }
    );
    this.name = 'SpendCapExceededError';
    this.cap = cap;
    this.providerSlug = providerSlug;
  }
}

/**
 * The org the current call is made for: the tenant context's, or at `single`
 * the install org, which is the one org there is. `null` at `multi` with no org
 * in context; the eligibility gate has already refused such a call.
 */
function orgOfCall(): string | null {
  const orgId = getTenantContext()?.orgId ?? null;
  if (orgId !== null) return orgId;
  return isMultiTenant() ? null : INSTALL_ORG_ID;
}

/**
 * The call-time spend gate. Throws {@link SpendCapExceededError} when the
 * global cap, or the cap of the org the call is made for, has been reached,
 * unless the provider is local.
 *
 * The global cap is checked first, as in the chat handler's refusal: it is the
 * one nobody in the org can lift. A failure reading either cap is logged and
 * that cap skipped, as `checkBudget()` does, so a settings read that fails
 * does not stop every AI call on the install.
 */
export async function assertWithinSpendCaps(providerSlug: string, isLocal: boolean): Promise<void> {
  if (isLocal) return;
  const orgId = orgOfCall();
  const [global, org] = await Promise.all([
    getGlobalCapState().catch((err: unknown) => {
      logger.warn('Spend gate: global cap lookup failed, skipping the global cap', {
        providerSlug,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }),
    getOrgCapState(orgId).catch((err: unknown) => {
      logger.warn('Spend gate: org cap lookup failed, skipping the org cap', {
        providerSlug,
        orgId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }),
  ]);

  const cap = global?.exceeded ? 'global' : org?.exceeded ? 'org' : null;
  if (cap === null) return;
  logger.warn('Refusing a paid provider call: monthly spend cap reached', {
    providerSlug,
    cap,
    orgId,
    ...(cap === 'global'
      ? { limitUsd: global?.cap, spentUsd: global?.spent }
      : { limitUsd: org?.limit, spentUsd: org?.spent }),
  });
  throw new SpendCapExceededError(cap, providerSlug);
}
