/**
 * App database drift-probe registrations.
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's export, not its body). Treat it like the landing
 * page: a starting point you're expected to modify.
 *
 * Auto-wired: `scripts/db/check-drift.ts` (run by `npm run db:drift-check`, in
 * CI, and by `/pre-pr`) calls this once, then probes everything you register
 * here alongside Sunrise's own A-series objects.
 *
 * Register the Prisma-*unmodelled* objects your app adds — most commonly the
 * hand-written FK constraint behind a satellite `User` table (see
 * CUSTOMIZATION.md §5). Prisma can't see those, so without a probe a future
 * `migrate dev` can silently drop one and CI won't notice.
 *
 * Example (the satellite-FK recipe from CUSTOMIZATION.md §5):
 *
 *   import {
 *     registerAppDriftProbe,
 *     constraintExists,
 *   } from '@/lib/db/drift-probes';
 *
 *   export function registerAppDriftProbes(): void {
 *     registerAppDriftProbe({
 *       name: 'AppUserProfile_userId_fkey (hand-written FK → User)',
 *       kind: 'FK constraint',
 *       table: 'AppUserProfile',
 *       // 2nd arg asserts the constraint definition text — pin the ON DELETE
 *       // action so a fork can't quietly drop the GDPR cascade.
 *       probe: constraintExists('AppUserProfile_userId_fkey', 'ON DELETE CASCADE'),
 *     });
 *   }
 *
 * Available probe factories from `@/lib/db/drift-probes`: `indexExists`,
 * `constraintExists` (optional definition-substring assertion), `columnExists`,
 * `generatedColumnExists`, and — for a multi-tenancy retrofit — `rlsEnabled`
 * (asserts ENABLE and, by default, FORCE) plus `policyExists`. Register BOTH
 * of those per RLS-protected table: a policy can exist while RLS is disabled,
 * and vice versa. For a `GENERATED ALWAYS` column use `generatedColumnExists` —
 * `columnExists` passes on a plain column of the same name, which is never
 * populated, so the check goes green while the feature is silently broken.
 *
 * Full guide: CUSTOMIZATION.md §5 · .context/database/prisma-unmodelled-objects.md
 */
import { constraintExists, registerAppDriftProbe } from '@/lib/db/drift-probes';

export function registerAppDriftProbes(): void {
  /* Break.userId and Take.userId are plain scalars in prisma/schema/app.prisma
     — a @relation would need a back-reference field on User, which is the model
     CUSTOMIZATION.md §5 tells a fork not to touch. So their FKs to `user` are
     hand-written in 20260917215110_breaks_and_takes and invisible to Prisma,
     which means a future `migrate dev` will compute desired state without them
     and emit a DROP.

     Without these probes that drop is silent, and the first symptom is either
     orphaned rows after an erasure (a retention violation nobody can see) or a
     P2003 that breaks erasure for every user. The second argument pins the
     ON DELETE action, so weakening the cascade to NO ACTION fails CI too —
     the constraint existing is not the same as the constraint still cascading.

     This is not hypothetical here: the first attempt at that migration had
     Prisma's generated DROP INDEX statements still in it, and applying it took
     out all three of Sunrise's hand-folded vector and full-text indexes. */
  registerAppDriftProbe({
    name: 'break_userId_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'break',
    probe: constraintExists('break_userId_fkey', 'ON DELETE CASCADE'),
  });
  registerAppDriftProbe({
    name: 'take_userId_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'take',
    probe: constraintExists('take_userId_fkey', 'ON DELETE CASCADE'),
  });
}
