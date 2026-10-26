/**
 * App owner classification seam — which of your models are private to one
 * person inside an org.
 *
 * **Fork-owned scaffold** — Sunrise ships this empty and does NOT change it
 * after release, so your edits here merge cleanly on upgrade (the stable
 * contract is this file's `initAppOwnerClassification` export, not its body).
 * Treat it like the other `lib/app/*` seams.
 *
 * Core classifies its own models in `lib/db/owner-classification.ts`, and the
 * owner layer (`lib/db/owner-extension.ts`) refuses a narrowed caller's read of
 * another member's rows on the ones marked `enforced`. It cannot see your
 * models. Classify them here and they are read exactly as core's are — by the
 * owner layer, and by the coverage guard
 * (`tests/unit/lib/db/owner-classification.test.ts`), which fails naming any
 * model in your schema file that links to a user, or to a personal model, and
 * that no tier has classified.
 *
 * Auto-wired: `lib/db/owner-classification.ts` runs this once, lazily, before
 * its first read — in whichever runtime builds the Prisma client — so there is
 * no registration step to remember.
 *
 * Full guide: .context/auth/authorization.md "Owner classification"
 */

/**
 * Classify your tier's user-linked models.
 *
 * ```ts
 * import { registerAppOwnerClassification } from '@/lib/db/owner-classification';
 *
 * export function initAppOwnerClassification(): void {
 *   registerAppOwnerClassification({
 *     tier: 'app',
 *     models: {
 *       // A row is its owner's, and the data layer checks it.
 *       AppJournalEntry: { kind: 'personal', owner: { column: 'userId' }, enforced: true },
 *       // Private through its parent; the parent must be enforced first.
 *       AppJournalAttachment: {
 *         kind: 'personal',
 *         owner: { through: { field: 'entry', parent: 'AppJournalEntry' } },
 *         enforced: true,
 *       },
 *       // The user link records who did something, not whose the row is.
 *       AppInvoice: { kind: 'not-personal', because: 'Org billing record; userId is who raised it.' },
 *     },
 *   });
 * }
 * ```
 *
 * A framework tier registers with `tier: 'framework'`, from a function the
 * leaf's `initAppOwnerClassification()` calls — not from `initFramework()` at
 * boot, which runs in a different runtime from the one that reads this.
 *
 * Do not import the Prisma client (`@/lib/db`) from here: this runs while that
 * client is being built.
 */
import { registerAppOwnerClassification } from '@/lib/db/owner-classification';

/**
 * BeatBreaker's user-linked models (Sunrise 0.15.0, §115).
 *
 * None is `enforced`: the routes scope these reads, as they did before the
 * owner layer existed. Three personal models could not be enforced as they
 * stand, because the product reads other people's rows on purpose — a
 * published or link-shared `Break`, a link-shared `PracticeSession`, and the
 * fields a drummer switched public on `DrummerAbout` — and the owner layer's
 * only visibility arm is a conversation share.
 */
export function initAppOwnerClassification(): void {
  const mine = { kind: 'personal', owner: { column: 'userId' } } as const;
  registerAppOwnerClassification({
    tier: 'app',
    models: {
      Break: mine,
      Take: mine,
      Pin: mine,
      PracticeVisit: mine,
      SpeedRecord: mine,
      PracticeSession: mine,
      PracticeRun: mine,
      StudioSettings: mine,
      BuddyWorkspace: mine,
      Sample: mine,
      DrummerAbout: mine,
      PracticeSessionItem: {
        kind: 'personal',
        owner: { through: { field: 'session', parent: 'PracticeSession' } },
      },
      BreakReport: {
        kind: 'not-personal',
        because:
          "A moderation report, read by the admins who resolve it; reporterId and resolvedById record who acted, and the pattern it names is the owner's.",
      },
      SpeedReport: {
        kind: 'not-personal',
        because:
          'A moderation report on a leaderboard speed, read by the admins who resolve it; reporterId and resolvedById record who acted.',
      },
      DrummerProfile: {
        kind: 'not-personal',
        because:
          'The public name everything a drummer publishes goes out under, read by anyone at /u/<username>; userId is whose name it is.',
      },
      Style: {
        kind: 'not-personal',
        because:
          'Catalogue: a null ownerId is a system style everyone reads; ownerId names who authored a user style (D16), read by its visibility.',
      },
      PatternLibrary: {
        kind: 'not-personal',
        because:
          'Catalogue: a null ownerId is a system library everyone reads; ownerId names who authored a user library, read by its visibility.',
      },
      Kit: {
        kind: 'not-personal',
        because:
          'Catalogue: a null ownerId is a system kit everyone reads; ownerId names who authored a user kit, read by its visibility.',
      },
    },
  });
}
