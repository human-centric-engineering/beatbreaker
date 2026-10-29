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
 * owner layer existed. A model other people read on purpose is `not-personal`,
 * however private its unshared rows: the owner layer's only visibility arm is a
 * conversation share, so marking one personal would describe a check that,
 * once enforced, refused the published breaks, shared sessions, leaderboards
 * and public drummer pages the product exists to show. Its `because` names
 * who else reads it and what the routes check instead.
 *
 * Every user column in `prisma/schema/app.prisma` with no `@relation` is marked
 * `/// owner-classification: user-id`, so core's guard
 * (`tests/unit/lib/db/owner-classification.test.ts`) fails naming any model so
 * marked that is not classified here.
 */
export function initAppOwnerClassification(): void {
  const mine = { kind: 'personal', owner: { column: 'userId' } } as const;
  registerAppOwnerClassification({
    tier: 'app',
    models: {
      Take: mine,
      Pin: mine,
      PracticeVisit: mine,
      PracticeRun: mine,
      StudioSettings: mine,
      BuddyWorkspace: mine,
      Sample: mine,
      Break: {
        kind: 'not-personal',
        because:
          'A pattern is read by anyone at its /p/ address once link-shared or published, and remixed from; userId is whose it is, and the routes check its visibility or the owner.',
      },
      PracticeSession: {
        kind: 'not-personal',
        because:
          'A setlist anyone can open at its /s/ address once link-shared; userId is whose it is, and the routes check its visibility or the owner.',
      },
      SpeedRecord: {
        kind: 'not-personal',
        because:
          'A listed speed is on public leaderboards and the drummer’s /u/ page; userId is who played it, and the routes check listed and the target’s visibility.',
      },
      DrummerAbout: {
        kind: 'not-personal',
        because:
          'The fields a drummer switched public are read by anyone at /u/<username>; userId is whose page it is, and the routes pick the public fields.',
      },
      DrummerProfile: {
        kind: 'not-personal',
        because:
          'The public name everything a drummer publishes goes out under, read by anyone at /u/<username>; userId is whose name it is.',
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
      DrummerReport: {
        kind: 'not-personal',
        because:
          'A moderation report on a drummer page, read by the admins who resolve it; subjectId names whose page, reporterId and resolvedById record who acted.',
      },
      Style: {
        kind: 'not-personal',
        because:
          'Catalogue: a null ownerId is a system style everyone reads; ownerId names who authored a user style (D16), read by its visibility.',
      },
      StyleVersion: {
        kind: 'not-personal',
        because:
          "A style's frozen history, read by every pattern made from it; createdById records who saved the version.",
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
