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
import { prisma } from '@/lib/db/client';
import { constraintExists, registerAppDriftProbe, type Probe } from '@/lib/db/drift-probes';

/**
 * A partial unique index, asserted *with* its predicate.
 *
 * `indexExists` would pass on an index of the same name recreated without the
 * `WHERE "ownerId" IS NULL` clause. That is not a harmless difference: without
 * the predicate the constraint covers user rows too, and the first two people
 * to write a style called `funk` collide. With the predicate dropped the other
 * way — the index gone entirely — two *system* rows can share a key and
 * `getStyle('funk')` starts returning whichever the planner picked.
 */
function partialUniqueIndexExists(indexName: string, predicate: string): Probe {
  return async () => {
    const rows = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes WHERE indexname = ${indexName}
    `;
    const def = rows[0]?.indexdef;
    if (!def) return { ok: false };
    if (!def.includes('UNIQUE')) return { ok: false, note: `not unique — saw: ${def}` };
    if (!def.includes(predicate)) {
      return { ok: false, note: `predicate missing "${predicate}" — saw: ${def}` };
    }
    return { ok: true };
  };
}

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

  /* The catalogue's own hand-written FKs, added in 20260923102558_catalogue and
     invisible to Prisma for the same reason.

     No row has an owner yet — the seed writes system rows with ownerId NULL —
     so a dropped cascade here would break nothing today and everything on the
     day D16 ships user-authored styles. That is exactly the drift a probe is
     for: the constraint is unexercised, so nothing else would notice it go. */
  for (const table of ['style', 'pattern_library', 'kit']) {
    registerAppDriftProbe({
      name: `${table}_ownerId_fkey (hand-written FK → user)`,
      kind: 'FK constraint',
      table,
      probe: constraintExists(`${table}_ownerId_fkey`, 'ON DELETE CASCADE'),
    });
    registerAppDriftProbe({
      name: `${table}_system_key_key (partial unique on the system rows)`,
      kind: 'partial unique index',
      table,
      probe: partialUniqueIndexExists(`${table}_system_key_key`, 'WHERE ("ownerId" IS NULL)'),
    });
  }

  /* Practice shelves (20260924130455_practice_shelves). The FK to `user` is
     hand-written for the reason the ones above are. The CHECK is what makes a
     pin point at exactly one thing: without it a row with neither target is a
     pin on nothing that the list silently drops, and a row with both is
     counted by both unique indexes — so the same pin could never be moved. */
  registerAppDriftProbe({
    name: 'pin_userId_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'pin',
    probe: constraintExists('pin_userId_fkey', 'ON DELETE CASCADE'),
  });
  registerAppDriftProbe({
    name: 'pin_one_target (CHECK: exactly one of breakId, libraryEntryId)',
    kind: 'CHECK constraint',
    table: 'pin',
    probe: constraintExists('pin_one_target', 'num_nonnulls("breakId", "libraryEntryId") = 1'),
  });

  /* Practice history (20260924200000_practice_history) — the same two, for
     the same reasons: a visit points at exactly one thing, and goes with you. */
  registerAppDriftProbe({
    name: 'practice_visit_userId_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'practice_visit',
    probe: constraintExists('practice_visit_userId_fkey', 'ON DELETE CASCADE'),
  });
  registerAppDriftProbe({
    name: 'practice_visit_one_target (CHECK: exactly one of breakId, libraryEntryId)',
    kind: 'CHECK constraint',
    table: 'practice_visit',
    probe: constraintExists(
      'practice_visit_one_target',
      'num_nonnulls("breakId", "libraryEntryId") = 1'
    ),
  });

  /* Studio settings (20260926120000_studio_settings). The one unmodelled
     object is the FK, hand-written for the reason the ones above are; it is
     the whole of what makes your settings go when you do. */
  registerAppDriftProbe({
    name: 'studio_settings_userId_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'studio_settings',
    probe: constraintExists('studio_settings_userId_fkey', 'ON DELETE CASCADE'),
  });

  /* Your samples (20260926180000_samples). The FK is what makes the rows go
     when you do; the files go by the erasure hook in `initApp()`. */
  registerAppDriftProbe({
    name: 'sample_userId_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'sample',
    probe: constraintExists('sample_userId_fkey', 'ON DELETE CASCADE'),
  });

  /* SET NULL, not CASCADE, and the difference is the point: a style version
     outlives its author because other people's patterns point at it and carry
     its id as provenance. Erasing the author erases the link, not the row. A
     migration that "fixed" this to CASCADE would delete rows that are not only
     about the person being erased. */
  registerAppDriftProbe({
    name: 'style_version_createdById_fkey (hand-written FK → user)',
    kind: 'FK constraint',
    table: 'style_version',
    probe: constraintExists('style_version_createdById_fkey', 'ON DELETE SET NULL'),
  });
}
