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
      {
        model: 'Sample',
        section: 'samples',
        disposition: 'export',
        description:
          'Drum samples you uploaded — the name, kit slot, size, length and storage key of each, not the audio files themselves.',
      },
      {
        model: 'BuddyWorkspace',
        section: 'buddyWorkspace',
        disposition: 'export',
        description:
          'The pattern you had open the last time you asked BeatBuddy something, as BeatBuddy last saw or changed it.',
      },
      {
        model: 'DrummerProfile',
        section: 'drummerProfile',
        disposition: 'export',
        description:
          'The username your published patterns appear under, what you wrote about yourself, and when the username last changed.',
      },
      {
        model: 'DrummerAbout',
        section: 'about',
        disposition: 'export',
        description:
          'What you said about yourself — what you use BeatBreaker for, the styles you play and how well, your channel links, and which of these your public profile shows.',
      },
      {
        model: 'DrummerReport',
        section: 'profileReportsFiled',
        disposition: 'export',
        description:
          "Reports you filed about other drummers' profiles — whose, the reason, your note, and what became of it.",
      },
      {
        model: 'SpeedRecord',
        section: 'speedRecords',
        disposition: 'export',
        description:
          'Every speed you recorded — what it was on, the layer, the tempo, when, your video link and note, and whether it was on the public table.',
      },
      {
        model: 'SpeedReport',
        section: 'speedReportsFiled',
        disposition: 'export',
        description:
          "Reports you filed about other drummers' speeds — which record, the reason, your note, and what became of it.",
      },
      {
        model: 'PracticeSession',
        section: 'practiceSessions',
        disposition: 'export',
        description:
          'Your practice sessions — the name, description, total time, how each climbs, whether it is shared, and the patterns in each with their layer, minutes and goal.',
      },
      {
        model: 'PracticeRun',
        section: 'practiceRuns',
        disposition: 'export',
        description:
          'Every practice session you ran — when, and the tempo you reached on each pattern.',
      },
      {
        model: 'BreakReport',
        section: 'reportsFiled',
        disposition: 'export',
        description:
          'Reports you filed about shared or published patterns — which pattern, the reason, your note, and what became of it.',
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
        description:
          'Drum kits of your own — the name, the settings and which of your samples is in each slot, not the audio.',
      },
    ],
    excluded: [
      {
        model: 'ReservedUsername',
        reason:
          'A username someone gave up, held for 30 days so nobody else can take it while old links circulate. It records a name, not who held it — there is no user id on the row.',
      },
      {
        model: 'StyleVersion',
        reason:
          "Exported as part of its Style rather than on its own — a version has no meaning apart from the style it versions. A version you authored of somebody ELSE's style carries only your user id in `createdById`, which is nulled on erasure and is not content about you.",
      },
      {
        model: 'LibraryEntry',
        reason: 'Exported inside its PatternLibrary; an entry has no owner of its own.',
      },
      {
        model: 'PracticeSessionItem',
        reason: 'Exported inside its PracticeSession, in order; an item has no owner of its own.',
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
  const [
    breaks,
    takes,
    pins,
    practiceHistory,
    studioSettings,
    samples,
    buddyWorkspace,
    drummerProfile,
    about,
    reportsFiled,
    profileReports,
    speedRecords,
    speedReportsFiled,
    practiceSessions,
    practiceRuns,
    styles,
    libraries,
    kits,
  ] = await Promise.all([
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
    /* The rows, with the storage key, as takes carry theirs — not the audio,
       which is in storage and is a download of its own, not a JSON field. */
    prisma.sample.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    // at most one row, as studioSettings
    prisma.buddyWorkspace.findMany({ where: { userId } }),
    // at most one row, as studioSettings
    prisma.drummerProfile.findMany({ where: { userId } }),
    // at most one row, as studioSettings
    prisma.drummerAbout.findMany({ where: { userId } }),
    /* The reports you filed, not the ones filed about your patterns: those
       are the reporters' data. The admin who resolved one is not named. */
    prisma.breakReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        breakId: true,
        reason: true,
        note: true,
        status: true,
        resolvedAt: true,
        createdAt: true,
      },
    }),
    // as reportsFiled: the ones you filed, and never who resolved them
    prisma.drummerReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        subjectId: true,
        reason: true,
        note: true,
        status: true,
        resolvedAt: true,
        createdAt: true,
      },
    }),
    /* Every record, listed or not — the history is yours. A record on
       someone else's pattern names it by id and by the title it had, as a
       pin names its target. */
    prisma.speedRecord.findMany({ where: { userId }, orderBy: { recordedAt: 'asc' } }),
    // as reportsFiled: the ones you filed, and never who resolved them
    prisma.speedReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        recordId: true,
        reason: true,
        note: true,
        status: true,
        resolvedAt: true,
        createdAt: true,
      },
    }),
    /* Your sessions with their items. An item on someone else's pattern
       names it by id and by the title it had, as a pin names its target. */
    prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } },
    }),
    prisma.practiceRun.findMany({ where: { userId }, orderBy: { endedAt: 'asc' } }),
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

  /* A reported profile is named by its username, not its owner's user id:
     that id is somebody else's, and the username is what the reporter saw.
     A profile whose owner has since dropped their username reads as null. */
  const subjects = await prisma.drummerProfile.findMany({
    where: { userId: { in: [...new Set(profileReports.map((r) => r.subjectId))] } },
    select: { userId: true, username: true },
  });
  const usernameOf = new Map(subjects.map((p) => [p.userId, p.username]));
  const profileReportsFiled = profileReports.map(({ subjectId, ...r }) => ({
    ...r,
    username: usernameOf.get(subjectId) ?? null,
  }));

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
    samples,
    buddyWorkspace,
    drummerProfile,
    about,
    reportsFiled,
    profileReportsFiled,
    speedRecords,
    speedReportsFiled,
    practiceSessions,
    practiceRuns,
    styles,
    libraries,
    kits,
  };
}
