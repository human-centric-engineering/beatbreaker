/**
 * BeatBreaker's own half of the Art. 15 export seam.
 *
 * `tests/unit/lib/app/defaults.test.ts` is Sunrise's file and asserts the
 * *declarations* — that every app model is accounted for at all. This is ours,
 * and asserts the behaviour that actually reaches a data subject: **every
 * section comes back as a key even when the person has no rows.**
 *
 * That is the failure worth a test of its own. A bundle short by a section
 * reads exactly like a complete answer, and neither the subject nor the
 * operator can tell the difference — `rows.length ? rows : undefined` would
 * pass every type check and ship a silently short response, because
 * `JSON.stringify` drops an undefined key.
 *
 * FORK NOTE — this file reads `@/lib/app/data-export` for real, with no
 * `vi.mock`, because the collector's behaviour IS what it is testing. A fork of
 * BeatBreaker that adds its own tables to that seam will see this fail on the
 * section list: expect the eighteen below plus yours, and pin the new list here. Do not mock the seam to make it pass — the assertion is that the real
 * collector returns every declared section as a key, and a mock cannot tell you
 * that. The `prisma` methods are mocked instead, which is the part this test
 * genuinely does not need to be real.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = {
  breaks: vi.fn(),
  takes: vi.fn(),
  pins: vi.fn(),
  visits: vi.fn(),
  settings: vi.fn(),
  samples: vi.fn(),
  workspaces: vi.fn(),
  profiles: vi.fn(),
  about: vi.fn(),
  reports: vi.fn(),
  profileReports: vi.fn(),
  speedRecords: vi.fn(),
  speedReports: vi.fn(),
  practiceSessions: vi.fn(),
  practiceRuns: vi.fn(),
  styles: vi.fn(),
  libraries: vi.fn(),
  kits: vi.fn(),
};

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findMany: (...args: unknown[]) => findMany.breaks(...args) },
    take: { findMany: (...args: unknown[]) => findMany.takes(...args) },
    pin: { findMany: (...args: unknown[]) => findMany.pins(...args) },
    practiceVisit: { findMany: (...args: unknown[]) => findMany.visits(...args) },
    studioSettings: { findMany: (...args: unknown[]) => findMany.settings(...args) },
    sample: { findMany: (...args: unknown[]) => findMany.samples(...args) },
    buddyWorkspace: { findMany: (...args: unknown[]) => findMany.workspaces(...args) },
    drummerProfile: { findMany: (...args: unknown[]) => findMany.profiles(...args) },
    drummerAbout: { findMany: (...args: unknown[]) => findMany.about(...args) },
    breakReport: { findMany: (...args: unknown[]) => findMany.reports(...args) },
    drummerReport: { findMany: (...args: unknown[]) => findMany.profileReports(...args) },
    speedRecord: { findMany: (...args: unknown[]) => findMany.speedRecords(...args) },
    speedReport: { findMany: (...args: unknown[]) => findMany.speedReports(...args) },
    practiceSession: { findMany: (...args: unknown[]) => findMany.practiceSessions(...args) },
    practiceRun: { findMany: (...args: unknown[]) => findMany.practiceRuns(...args) },
    style: { findMany: (...args: unknown[]) => findMany.styles(...args) },
    patternLibrary: { findMany: (...args: unknown[]) => findMany.libraries(...args) },
    kit: { findMany: (...args: unknown[]) => findMany.kits(...args) },
  },
}));

/** Every spy, reset together and defaulted together. */
const ALL = Object.values(findMany);
const OWNED = [findMany.styles, findMany.libraries, findMany.kits];

const { collectAppSubjectData } = await import('@/lib/app/data-export');

const SUBJECT = { userId: 'user-1', email: 'user@example.com' };

describe('collectAppSubjectData', () => {
  beforeEach(() => {
    for (const spy of ALL) {
      spy.mockReset();
      spy.mockResolvedValue([]);
    }
  });

  it('returns every section as an empty array when the subject has nothing', async () => {
    const data = await collectAppSubjectData(SUBJECT);

    // `toHaveProperty`, not a truthiness check: the bug this guards against is
    // the key being absent, which an `expect(data.breaks).toEqual([])` would
    // also catch — but only by accident, since undefined fails that too for a
    // different reason.
    expect(Object.keys(data).sort()).toEqual([
      'about',
      'breaks',
      'buddyWorkspace',
      'drummerProfile',
      'kits',
      'libraries',
      'pins',
      'practiceHistory',
      'practiceRuns',
      'practiceSessions',
      'profileReportsFiled',
      'reportsFiled',
      'samples',
      'speedRecords',
      'speedReportsFiled',
      'studioSettings',
      'styles',
      'takes',
    ]);
    for (const section of Object.values(data)) expect(section).toEqual([]);
  });

  it('scopes every query to the subject', async () => {
    await collectAppSubjectData(SUBJECT);

    for (const spy of [
      findMany.breaks,
      findMany.takes,
      findMany.pins,
      findMany.visits,
      findMany.settings,
      findMany.samples,
      findMany.workspaces,
      findMany.profiles,
      findMany.about,
      findMany.speedRecords,
      findMany.practiceSessions,
      findMany.practiceRuns,
    ]) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    }
    /* The catalogue names its owner `ownerId`, not `userId`. A copy-paste that
       left `userId` here would throw at the database rather than silently
       return everyone's rows — but a copy-paste that left the filter off
       entirely would hand one subject every other subject's styles, and that is
       what this pins. */
    for (const spy of OWNED) {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'user-1' } }));
    }
    /* Reports are scoped by `reporterId`, not `userId` — the reports the
       subject filed about OTHER people's patterns or profiles, never the
       reports filed about the subject's own. */
    expect(findMany.reports).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reporterId: 'user-1' } })
    );
    expect(findMany.profileReports).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reporterId: 'user-1' } })
    );
    expect(findMany.speedReports).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reporterId: 'user-1' } })
    );
  });

  it('exports every speed record whole, oldest first, listed or not (7C)', async () => {
    /* The history is the subject's, including what never went on a table and
       what a moderator took off one. Whole rows, as the breaks are, so a
       column added later is in the answer without this file changing. */
    const record = {
      id: 's1',
      userId: 'user-1',
      breakId: 'b-theirs',
      libraryEntryId: null,
      titleSnapshot: 'Cold Carpet',
      level: 2,
      bpm: 112,
      gridHash: 'h'.repeat(64),
      videoUrl: 'https://vimeo.com/76979871',
      note: 'Left hand gave out',
      listed: false,
      recordedAt: new Date('2026-09-30T12:00:00Z'),
    };
    findMany.speedRecords.mockResolvedValue([record]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.speedRecords.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('select');
    expect(args).not.toHaveProperty('include');
    expect(args.orderBy).toEqual({ recordedAt: 'asc' });
    expect(data.speedRecords).toEqual([record]);
  });

  it('exports each session whole with its items in order, and every run (7D)', async () => {
    /* Whole rows, as the speed records are, with the items inside their
       session — an item has no owner of its own. An item on someone else's
       pattern names it by id and the title it had, as a pin does. */
    const session = {
      id: 'ps1',
      userId: 'user-1',
      name: 'Week 1',
      totalMinutes: 10,
      items: [{ id: 'pi1', position: 0, breakId: 'b-theirs', titleSnapshot: 'Cold Carpet' }],
    };
    const run = {
      id: 'pr1',
      userId: 'user-1',
      sessionId: null,
      sessionName: 'Week 1',
      items: [{ title: 'Cold Carpet', level: 5, targetBpm: 100, reachedBpm: 96, seconds: 300 }],
    };
    findMany.practiceSessions.mockResolvedValue([session]);
    findMany.practiceRuns.mockResolvedValue([run]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.practiceSessions.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('select');
    expect(args.include).toEqual({ items: { orderBy: { position: 'asc' } } });
    expect(data.practiceSessions).toEqual([session]);
    // a run whose session was deleted is still the subject's history
    expect(data.practiceRuns).toEqual([run]);
  });

  it('exports the speed reports you filed, selecting no resolvedById (7C)', async () => {
    const report = {
      id: 'sr1',
      recordId: 's-theirs',
      reason: 'wrong-speed',
      note: null,
      status: 'open',
      resolvedAt: null,
      createdAt: new Date('2026-09-30T12:00:00Z'),
    };
    findMany.speedReports.mockResolvedValue([report]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.speedReports.mock.calls[0][0] as { select: Record<string, unknown> };
    expect(args.select).not.toHaveProperty('resolvedById');
    expect(data.speedReportsFiled).toEqual([report]);
  });

  it('exports the reports you filed, selecting no resolvedById — the admin who resolved one is never named', async () => {
    const report = {
      id: 'r1',
      breakId: 'b-theirs',
      reason: 'spam',
      note: 'Looks like an ad',
      status: 'actioned',
      resolvedAt: new Date('2026-09-20T00:00:00Z'),
      createdAt: new Date('2026-09-19T00:00:00Z'),
    };
    findMany.reports.mockResolvedValue([report]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.reports.mock.calls[0][0] as {
      select: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(args.select).not.toHaveProperty('resolvedById');
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
    expect(data.reportsFiled).toEqual([report]);
  });

  it('narrows the BigInt seed to a string, which JSON can carry', async () => {
    /* `seed` is a BigInt column. JSON.stringify throws on a BigInt rather than
       coercing it, so an export containing one real break would fail at
       serialisation — after the data had been assembled, and only for users who
       had saved something. */
    findMany.breaks.mockResolvedValue([
      { id: 'b1', title: 'Cold Carpet', seed: 4294967295n, bpm: 94 },
    ]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(data.breaks).toEqual([{ id: 'b1', title: 'Cold Carpet', seed: '4294967295', bpm: 94 }]);
    expect(() => JSON.stringify(data)).not.toThrow();
  });

  it('reads whole break rows, so Phase 4’s columns — and any later one — are in the export', async () => {
    /* A `select` here would be a second list of columns to keep in step with
       the schema, and the subject would never see the column it forgot. Whole
       rows are what makes `level`, `description` and `links` part of the answer without this file changing. */
    const row = {
      id: 'b1',
      seed: 1n,
      level: 3,
      description: 'The one from the lesson',
      links: [{ kind: 'video', url: 'https://vimeo.com/76979871' }],
    };
    findMany.breaks.mockResolvedValue([row]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(findMany.breaks.mock.calls[0][0]).not.toHaveProperty('select');
    expect(data.breaks).toEqual([{ ...row, seed: '1' }]);
  });

  it('exports the pins shelf by shelf, in order, naming each target by id alone', async () => {
    /* A pin on someone else's shared pattern is the subject's data; the
       pattern is not. So the rows go out whole and unjoined — a `breakId`, not
       the other person's title — and in the order the shelves show them. */
    const pin = {
      id: 'p1',
      userId: 'user-1',
      shelf: 'later',
      position: 0,
      breakId: 'b-theirs',
      libraryEntryId: null,
    };
    findMany.pins.mockResolvedValue([pin]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.pins.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('include');
    expect(args).not.toHaveProperty('select');
    expect(args.orderBy).toEqual([{ shelf: 'asc' }, { position: 'asc' }]);
    expect(data.pins).toEqual([pin]);
  });

  it('exports the practice history newest first, with where each was left, by id alone', async () => {
    /* The same rule as the pins: a visit to someone else's shared pattern is
       the subject's data, the pattern is not — so a `breakId`, not a title. */
    const visit = {
      id: 'v1',
      userId: 'user-1',
      breakId: null,
      libraryEntryId: 'e1',
      level: 3,
      bpm: 72,
      visitedAt: new Date('2026-09-24T12:00:00Z'),
    };
    findMany.visits.mockResolvedValue([visit]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.visits.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('include');
    expect(args).not.toHaveProperty('select');
    expect(args.orderBy).toEqual({ visitedAt: 'desc' });
    expect(data.practiceHistory).toEqual([visit]);
  });

  it('exports the settings row as stored, including a value the app would now ignore', async () => {
    /* The subject is owed what is held about them. `readStudioSettings` would
       replace an out-of-range value with its default; the export must not, or
       it answers with something that is not in the database. */
    const row = {
      userId: 'user-1',
      prefs: { countIn: 2, startBpm: 9000 },
      updatedAt: new Date('2026-09-26T12:00:00Z'),
    };
    findMany.settings.mockResolvedValue([row]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(data.studioSettings).toEqual([row]);
  });

  it('exports the drummer profile as stored — the username, the bio and when the name last changed', async () => {
    const row = {
      userId: 'user-1',
      username: 'ghostnotes',
      bio: 'Funk, mostly.',
      usernameChangedAt: new Date('2026-09-01T00:00:00Z'),
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };
    findMany.profiles.mockResolvedValue([row]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(data.drummerProfile).toEqual([row]);
  });

  it('exports each sample row whole — name, slot, size, length and storage key — not the audio', async () => {
    const row = {
      id: 's1',
      userId: 'user-1',
      name: 'kick.mp3',
      slot: 'k',
      bytes: 88_244,
      durationMs: 1000,
      storageKey: 'samples/user-1/0b6f.wav',
      createdAt: new Date('2026-09-26T12:00:00Z'),
    };
    findMany.samples.mockResolvedValue([row]);

    const data = await collectAppSubjectData(SUBJECT);

    const args = findMany.samples.mock.calls[0][0] as Record<string, unknown>;
    expect(args).not.toHaveProperty('select');
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
    expect(data.samples).toEqual([row]);
  });

  it('exports the About you row as stored — purposes, styles, ability, channels and the public switches', async () => {
    const row = {
      userId: 'user-1',
      purposes: ['learning'],
      styles: ['funk'],
      ability: 'beginner',
      styleAbility: { funk: 'beginner' },
      channels: [{ kind: 'youtube', url: 'https://youtube.com/@ghostnotes', drumming: true }],
      public: { purposes: false, styles: false, ability: false, channels: true },
      askedAt: new Date('2026-09-29T00:00:00Z'),
    };
    findMany.about.mockResolvedValue([row]);

    const data = await collectAppSubjectData(SUBJECT);

    expect(data.about).toEqual([row]);
  });

  it('names a reported profile by the subject’s username, never their internal id', async () => {
    const report = {
      id: 'pr1',
      subjectId: 'user-2',
      reason: 'spam',
      note: 'Looks like an ad',
      status: 'actioned',
      resolvedAt: new Date('2026-09-20T00:00:00Z'),
      createdAt: new Date('2026-09-19T00:00:00Z'),
    };
    findMany.profileReports.mockResolvedValue([report]);
    // First call resolves the subject's OWN profile (empty here); the second
    // resolves the username of the reported drummer named in `report`.
    findMany.profiles
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 'user-2', username: 'ghostnotes' }]);

    const data = await collectAppSubjectData(SUBJECT);

    const { subjectId: _subjectId, ...rest } = report;
    expect(data.profileReportsFiled).toEqual([{ ...rest, username: 'ghostnotes' }]);
    expect((data.profileReportsFiled as unknown[])[0]).not.toHaveProperty('subjectId');
  });

  it('reports a subject whose profile is gone as username: null, not by dropping the row', async () => {
    const report = {
      id: 'pr1',
      subjectId: 'user-2',
      reason: 'other',
      note: null,
      status: 'open',
      resolvedAt: null,
      createdAt: new Date('2026-09-19T00:00:00Z'),
    };
    findMany.profileReports.mockResolvedValue([report]);
    // Neither the subject's own profile nor the reported drummer's still exists.
    findMany.profiles.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const data = await collectAppSubjectData(SUBJECT);

    const { subjectId: _subjectId, ...rest } = report;
    expect(data.profileReportsFiled).toEqual([{ ...rest, username: null }]);
  });
});
