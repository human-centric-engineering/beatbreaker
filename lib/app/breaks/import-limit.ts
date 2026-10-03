import { createRateLimiter } from '@/lib/security/rate-limit';

/**
 * Imports per person per minute (Phase 8, 8.3). A per-flow cap inside the
 * handler, keyed on the session, under the `/api/v1` section cap: reading a
 * MIDI file costs CPU that a plain API call doesn't, and nobody imports thirty
 * patterns a minute by hand.
 */
export const IMPORTS_PER_MINUTE = 30;

export const importLimiter = createRateLimiter({
  interval: 60 * 1000,
  maxRequests: IMPORTS_PER_MINUTE,
});
