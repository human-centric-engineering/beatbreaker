/**
 * App subject-data export seam (GDPR Art. 15).
 *
 * **Fork-owned scaffold** — Sunrise ships this returning nothing and does NOT
 * change it after release, so your edits here merge cleanly on upgrade (the
 * stable contract is this file's `collectAppSubjectData` export, not its body).
 * Treat it like the other `lib/app/*` seams.
 *
 * Auto-wired: `exportUserData()` (`lib/privacy/export-user.ts`) calls this and
 * folds the result into the `app` section of the export bundle, so both the
 * self-service and admin export endpoints pick it up with no core edit.
 *
 * Declare every app-owned table that holds data about a person. Core covers its
 * own tables via `lib/privacy/export-sources.ts`; it cannot see yours.
 *
 * ```ts
 * export async function collectAppSubjectData({ userId }: AppSubjectQuery): Promise<AppSubjectData> {
 *   const [invoices, bookings] = await Promise.all([
 *     prisma.appInvoice.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
 *     prisma.appBooking.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
 *   ]);
 *   return { invoices, bookings };
 * }
 * ```
 *
 * **Why a plain function and not a registry.** The erasure sibling
 * (`lib/privacy/erasure-hooks.ts`) is a boot-time registry, and this seam
 * deliberately is not. Erasure fails loudly if a hook never registers — the
 * rows are still there afterwards. An export fails *silently*: an unregistered
 * collector yields a bundle that looks complete and is not, and neither the
 * subject nor the operator can tell. A static import cannot be missed.
 *
 * **Keep it complete — and core now checks that you did.** Declare your tables
 * in `initAppSubjectSources()` below. The core guard test
 * (`export-sources.test.ts`) diffs `prisma/schema/*.prisma` against the core
 * manifest so a new core table can't quietly narrow the export, and it holds
 * your tier's schema file to the same rule against your declarations: **every**
 * model in a schema file that is not one of Sunrise's own — `app.prisma`,
 * `framework-*.prisma`, or any other name you choose — must be declared as a
 * source or excluded with a reason, or the suite fails naming it.
 *
 * Full accounting, rather than the user-id heuristic core applies to itself,
 * because core reads its own column vocabulary and cannot read yours: a table
 * keyed `authorId` or `respondentId` is invisible to that scan, and the tables
 * it cannot see are exactly the ones nobody remembers. A lookup or join table
 * holding no personal data is an `excluded` row with a one-line reason — which
 * is the note a DPO wants anyway, and it costs you a line once per table.
 *
 * Full guide: .context/privacy/data-export.md · CUSTOMIZATION.md §4
 */

import { prisma } from '@/lib/db/client';
import { registerAppSubjectSources } from '@/lib/privacy/subject-source-registry';

/** Identity of the subject being exported. */
export interface AppSubjectQuery {
  /** Id of the data subject. */
  userId: string;
  /** The subject's email — for app tables keyed by address rather than user id. */
  email: string;
}

/**
 * App-owned subject data, keyed by section name. Each section lands under
 * `app.<section>` in the export bundle. Values must be JSON-serialisable.
 */
export type AppSubjectData = Record<string, unknown>;

/**
 * Declare which of your tier's models hold data about a person, and which
 * deliberately do not.
 *
 * **Fork-owned scaffold**, run once and lazily by
 * `lib/privacy/subject-source-registry.ts` before its first read — so the
 * coverage guard and the export both see your declarations with no wiring step.
 *
 * ```ts
 * export function initAppSubjectSources(): void {
 *   registerAppSubjectSources({
 *     tier: 'app',
 *     sources: [
 *       {
 *         model: 'AppInvoice',
 *         section: 'invoices',
 *         disposition: 'export',
 *         description: 'Invoices raised against your account.',
 *       },
 *     ],
 *     excluded: [
 *       { model: 'AppCountry', reason: 'Reference list of countries — holds no personal data.' },
 *     ],
 *   });
 * }
 * ```
 *
 * A framework tier declares from its own init with `tier: 'framework'`; both
 * tiers register independently, so filling this in does not consume the slot a
 * leaf fork is entitled to.
 *
 * **Every `section` you declare must appear in what `collectAppSubjectData()`
 * returns** — `exportUserData()` throws if one is missing. Return the key with
 * an empty array when the subject has no rows rather than omitting it: a bundle
 * short by a section reads exactly like a complete answer. `undefined` counts
 * as missing, because `JSON.stringify` drops the key — so
 * `rows.length ? rows : undefined` is the shape to avoid.
 */
export function initAppSubjectSources(): void {
  registerAppSubjectSources({
    tier: 'app',
    sources: [
      {
        model: 'Break',
        section: 'breaks',
        disposition: 'export',
        description: 'Drum breaks you generated, edited or saved.',
      },
      {
        model: 'Take',
        section: 'takes',
        disposition: 'export',
        description:
          'Recordings of you playing a break — the metadata and the storage key, not the video file itself.',
      },
      {
        model: 'Pin',
        section: 'pins',
        disposition: 'export',
        description:
          'What you pinned to your Practising and Later shelves — your own patterns, shared ones and library entries — and in what order.',
      },
      {
        model: 'PracticeVisit',
        section: 'practiceHistory',
        disposition: 'export',
        description:
          'What you opened in the Studio — your own patterns, shared ones and library entries — when, and the layer and tempo you left each at. The newest 200.',
      },
      {
        model: 'StudioSettings',
        section: 'studioSettings',
        disposition: 'export',
        description:
          "How you set up the Studio — your kit and its tuning, count-in, the generator's settings, and what a new pattern starts with.",
      },
      /* The catalogue. Every row is a system row today (`ownerId` null), so
         these three sections come back empty for everybody — and they are
         declared anyway, because the alternative is that the day D16 ships
         user-authored styles, the export quietly stops being complete and
         nothing says so. An empty section is a truthful answer; a missing one
         reads exactly like a complete bundle. */
      {
        model: 'Style',
        section: 'styles',
        disposition: 'export',
        description: 'Generator styles you authored, with every version of their parameters.',
      },
      {
        model: 'PatternLibrary',
        section: 'libraries',
        disposition: 'export',
        description: 'Pattern libraries you authored, and the patterns in them.',
      },
      {
        model: 'Kit',
        section: 'kits',
        disposition: 'export',
        description: 'Drum kits you authored — the settings, not the sample audio.',
      },
    ],
    excluded: [
      {
        model: 'StyleVersion',
        reason:
          "Exported as part of its Style rather than on its own — a version has no meaning apart from the style it versions. A version you authored of somebody ELSE's style carries only your user id in `createdById`, which is nulled on erasure and is not content about you.",
      },
      {
        model: 'LibraryEntry',
        reason: 'Exported inside its PatternLibrary; an entry has no owner of its own.',
      },
    ],
  });
}

/**
 * Collect this app's data about one subject. Ships empty — vanilla Sunrise has
 * no app tables, so the export's `app` section is `{}`.
 */
/*
 * `async` is the seam's contract, not an implementation detail: every real
 * collector awaits its queries, and the empty default must not force forks to
 * change the signature just to add one.
 */
export async function collectAppSubjectData({ userId }: AppSubjectQuery): Promise<AppSubjectData> {
  const [breaks, takes, pins, practiceHistory, studioSettings, styles, libraries, kits] =
    await Promise.all([
      prisma.break.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.take.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      /* The pin rows alone. A pin on someone else's shared pattern names it by
       id only: that pattern is their data, not the subject's. */
      prisma.pin.findMany({
        where: { userId },
        orderBy: [{ shelf: 'asc' }, { position: 'asc' }],
      }),
      // the visit rows alone, for the reason the pins are
      prisma.practiceVisit.findMany({ where: { userId }, orderBy: { visitedAt: 'desc' } }),
      /* At most one row. Exported as stored, not as `readStudioSettings`
       reads it: the subject is owed what is held about them, including a
       value the app would now ignore. */
      prisma.studioSettings.findMany({ where: { userId } }),
      /* `ownerId`, not `userId` — the catalogue names its owner differently, and
       that is precisely the column core's own user-id heuristic cannot see. */
      prisma.style.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
        include: { versions: { orderBy: { version: 'asc' } } },
      }),
      prisma.patternLibrary.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'asc' },
        include: { entries: { orderBy: { position: 'asc' } } },
      }),
      prisma.kit.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),
    ]);

  /* Both keys are returned unconditionally, empty arrays included. A bundle
     short by a section reads exactly like a complete answer, and the subject
     has no way to tell the difference — `rows.length ? rows : undefined` is the
     shape to avoid, because JSON.stringify drops the key entirely.

     `seed` is a BigInt column and BigInt does not survive JSON.stringify, so it
     is narrowed to a string here rather than thrown at the serialiser. */
  return {
    breaks: breaks.map((b) => ({ ...b, seed: b.seed.toString() })),
    takes,
    pins,
    practiceHistory,
    studioSettings,
    styles,
    libraries,
    kits,
  };
}
