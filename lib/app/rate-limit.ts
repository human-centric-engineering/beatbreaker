/**
 * App rate-limit registrations.
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's export, not its body). Treat it like the landing
 * page: a starting point you're expected to modify.
 *
 * Auto-wired: the rate-limit middleware imports and calls this once at module
 * load (middleware runtime). Add `registerRateLimitTier()` /
 * `registerRateLimitKeyResolver()` / `registerRateLimitRule()` calls —
 * registration is namespace-scoped and fails fast (it throws if a rule could
 * shadow a Sunrise-protected surface, or names a custom key whose resolver
 * hasn't been registered yet — resolvers first, then rules).
 *
 * Full guide + example: CUSTOMIZATION.md §4 · .context/security/rate-limiting.md
 */
import { createRateLimiter, registerRateLimitTier } from '@/lib/security/rate-limit';
import { registerRateLimitRule } from '@/lib/security/rate-limit-policy';
import { SECURITY_CONSTANTS } from '@/lib/security/constants';

export function registerAppRateLimits(): void {
  /* The catalogue is the one part of `/api/v1` that answers without a session:
     the signed-out `/p/` player and the marketing pages read it (D2), and a
     native client (D14) reads it before anyone has signed in. So the section
     cap's `session-user` keying would collapse every anonymous caller onto
     their IP anyway — this names that explicitly, and gives the surface a cap
     of its own because it is cached, cheap and read on every page load.

     240/min per IP: generous enough that a shared NAT behind one address does
     not throttle real readers, tight enough to be a cap. It applies only to
     GET — the admin writes live under `/api/v1/admin/catalogue/` and keep the
     admin tier, which is Sunrise's and which an app rule may not shadow. */
  registerRateLimitTier(
    'catalogue',
    createRateLimiter({
      interval: SECURITY_CONSTANTS.RATE_LIMIT.DEFAULT_INTERVAL,
      maxRequests: 240,
      uniqueTokenPerInterval: SECURITY_CONSTANTS.RATE_LIMIT.MAX_UNIQUE_TOKENS,
    })
  );
  registerRateLimitRule({
    match: /^\/api\/v1\/catalogue\//,
    tier: 'catalogue',
    key: 'ip',
  });
}
