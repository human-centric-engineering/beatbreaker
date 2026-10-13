/**
 * Per-org request cap (§110 t-789).
 *
 * Every rule in the rate-limit policy is keyed by the caller: an IP, a user,
 * an API key or an embed token. At `multi` that leaves an org with many users
 * or keys free to use as much shared capacity as all of them together, and
 * the operator with no single number to cap a tenant with. An org's
 * `Org.settings.quotas.requestsPerMinute` is that number, and
 * {@link checkOrgRequestCap} is the counter `applyRateLimit` runs **on top
 * of** the matched rule: both must pass, so per-caller fairness inside the
 * org stays as it was.
 *
 * **Outside the key registry on purpose.** The documented fork recipe used to
 * register a custom `'org'` key resolver, and `registerRateLimitKeyResolver`
 * rejects built-in key names, so claiming `'org'` as one would fail every fork
 * that followed it at boot. This is a second counter, not a key strategy.
 *
 * **The caps are cached** for {@link ORG_REQUEST_CAP_TTL_MS}, an org with no
 * cap included, so a request makes no database read while its org's entry is
 * warm. `PATCH /api/v1/admin/orgs/[id]` clears the entry with
 * {@link forgetOrgRequestCap}. The cache is held on `globalThis` because that
 * route runs in the server bundle and this counter in the proxy's, and a
 * module-level map would give each its own copy; within one process the route
 * then reaches the copy the proxy reads. Another instance sees the change when
 * its entry expires, so it can enforce the old cap for up to one TTL.
 *
 * **The counters are per process**, like every section tier
 * (`createDynamicLimiter`'s in-memory window). An install running N instances
 * behind a load balancer lets an org through up to N times its cap.
 *
 * Tenancy posture: row-keyed — both the cap cache and the counter are keyed by
 * org id, filled by a `findUnique` on that id (lib/tenancy/process-state.ts).
 */

import { logger } from '@/lib/logging';
import { createDynamicLimiter, type RateLimitResult } from '@/lib/security/rate-limit';
import { loadOrgQuotas } from '@/lib/tenancy/org-settings';

/** How long an org's request cap is served from the cache. */
export const ORG_REQUEST_CAP_TTL_MS = 30_000;

/** A cached cap: the lookup, so concurrent misses share one read. */
interface CapEntry {
  cachedAt: number;
  value: Promise<number | null>;
}

const globalForOrgCaps = globalThis as unknown as {
  sunriseOrgRequestCaps?: Map<string, CapEntry>;
};

const capEntries: Map<string, CapEntry> = (globalForOrgCaps.sunriseOrgRequestCaps ??= new Map<
  string,
  CapEntry
>());

// Every check passes the org's own cap; the default is never used.
const orgRequestLimiter = createDynamicLimiter('org', 1);

/**
 * The org's `quotas.requestsPerMinute`, cached; `null` when it has none. A
 * failed read is dropped rather than kept as an answer.
 */
function orgRequestCap(orgId: string): Promise<number | null> {
  const current = capEntries.get(orgId);
  if (current && Date.now() - current.cachedAt < ORG_REQUEST_CAP_TTL_MS) return current.value;
  const entry: CapEntry = {
    cachedAt: Date.now(),
    value: loadOrgQuotas(orgId).then((quotas) => quotas.requestsPerMinute ?? null),
  };
  capEntries.set(orgId, entry);
  entry.value.catch(() => {
    if (capEntries.get(orgId) === entry) capEntries.delete(orgId);
  });
  return entry.value;
}

/**
 * Count one request against its org's cap.
 *
 * @param orgId The org a verified principal acts for — never one a client
 *   header named.
 * @returns the limiter's answer, or `null` when the org has no cap (nothing
 *   was counted). A cap that cannot be read is also `null`, logged: the org
 *   counter is defence in depth over the per-caller limits, which still
 *   applied, and a database fault must not refuse every request.
 */
export async function checkOrgRequestCap(orgId: string): Promise<RateLimitResult | null> {
  let cap: number | null;
  try {
    cap = await orgRequestCap(orgId);
  } catch (error) {
    logger.warn('rate-limit middleware: could not read the org request cap; not applied', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  if (cap === null) return null;
  return orgRequestLimiter.check(`mw:org:${orgId}`, cap);
}

/** Drop one org's cached cap after a write, so this process enforces the new one at once. */
export function forgetOrgRequestCap(orgId: string): void {
  capEntries.delete(orgId);
}

/** Test-only: drop every cached cap and every org's window. */
export function resetOrgRequestCaps(): void {
  for (const orgId of capEntries.keys()) orgRequestLimiter.reset(`mw:org:${orgId}`);
  capEntries.clear();
}
