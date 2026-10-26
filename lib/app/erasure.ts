/**
 * App erasure cleanup-hook registrations (GDPR Art. 17).
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's export, not its body). Treat it like the other
 * `lib/app/*` seams.
 *
 * Auto-wired: `getErasureCleanupHooks()` (`lib/privacy/erasure-hooks.ts`) calls
 * this once before its first read, in the module graph `eraseUser()` runs in.
 * Add `registerErasureCleanupHook({ name, cleanupExternal?, scrubInTransaction? })`
 * calls for app data the FK cascade cannot reach: object-storage blobs, search
 * documents, and PII left on rows your `ON DELETE SET NULL` tables keep.
 *
 * Must be synchronous — register here, do the async work inside the hook.
 *
 * Full guide + example: .context/privacy/data-erasure.md · CUSTOMIZATION.md §4
 */
import { registerErasureCleanupHook } from '@/lib/privacy/erasure-hooks';
import { deleteByPrefix, isStorageEnabled } from '@/lib/storage/upload';

/**
 * Registered here rather than from `initApp()`: this seam runs in the module
 * graph `eraseUser()` runs in, so a script or worker that erases an account
 * removes its samples too. A boot-time registration only reached the server
 * process that booted.
 */
export function initAppErasureHooks(): void {
  registerSampleErasure();
}

/**
 * Your samples' files go when you do (D20).
 *
 * The `sample` rows cascade from `user`, but no FK reaches storage, so the WAVs
 * under `samples/<userId>/` are removed here, before the erasure transaction.
 * Best-effort by the hook contract: a storage failure is logged by `eraseUser`
 * and does not block the erasure. Avatars do not come through here — core
 * `eraseUser` removes theirs itself.
 */
function registerSampleErasure(): void {
  registerErasureCleanupHook({
    name: 'beatbreaker-samples',
    cleanupExternal: async ({ userId }) => {
      if (!isStorageEnabled()) return;
      const result = await deleteByPrefix(`samples/${userId}/`);
      // thrown so `eraseUser` records it; it does not stop the erasure
      if (!result.success) throw new Error(`Could not delete samples/${userId}/`);
    },
  });
}
