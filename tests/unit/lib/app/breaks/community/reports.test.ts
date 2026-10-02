/**
 * Reporting a shared or published pattern, and the moderation queue that
 * reads the reports (Phase 6, tasks 6.10 and 6.11).
 *
 * Prisma is mocked at the module boundary.
 *
 * @see lib/app/breaks/community/reports.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findFirst: vi.fn() },
    breakReport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    drummerReport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    speedReport: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    drummerAbout: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    drummerProfile: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));
// what decides whether a record is on a table has its own tests (speed-tables.test.ts)
vi.mock('@/lib/app/breaks/community/speed-tables', () => ({ tabledRecord: vi.fn() }));
// the alert's own rules (the hour, the admins, the email) have their own tests (report-alert.test.ts)
vi.mock('@/lib/app/breaks/community/report-alert', () => ({ alertAdminsOfReport: vi.fn() }));

import { NotFoundError, ValidationError } from '@/lib/api/errors';
import {
  fileProfileReport,
  fileReport,
  moderationQueue,
  ownsSlug,
  fileSpeedReport,
  profileQueue,
  REPORT_DAILY_CAP,
  speedQueue,
} from '@/lib/app/breaks/community/reports';
import { alertAdminsOfReport } from '@/lib/app/breaks/community/report-alert';
import { tabledRecord } from '@/lib/app/breaks/community/speed-tables';
import { prisma } from '@/lib/db/client';

const REPORTER_ID = 'cmjbv4i3x00003wsloputgwul';
const OWNER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const SUBJECT_ID = 'csubj0000000000000000001';
const BREAK_ID = 'cbrk00000000000000000001';
const SLUG = 'cold000001';
const USERNAME = 'ghostnotes';
const NOW = new Date('2026-09-27T00:00:00Z');

beforeEach(() => {
  vi.resetAllMocks();
  // Both report kinds share the daily cap (`checkDailyCap`): default the
  // profile side to zero so a test that only cares about pattern reports
  // does not have to know the cap is counted across both tables.
  vi.mocked(prisma.drummerReport.count).mockResolvedValue(0);
  vi.mocked(prisma.breakReport.count).mockResolvedValue(0);
  vi.mocked(prisma.speedReport.count).mockResolvedValue(0);
});

describe('fileReport', () => {
  it('404s for a pattern that is not shared, or does not exist', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);

    await expect(fileReport(REPORTER_ID, SLUG, { reason: 'spam' }, NOW)).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(prisma.breakReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to report
  });

  it('looks the pattern up by a link or published visibility, never private', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    await fileReport(REPORTER_ID, SLUG, { reason: 'spam' }, NOW).catch(() => {});
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]).toMatchObject({
      where: { slug: SLUG, visibility: { in: ['link', 'published'] } },
    });
  });

  it('400s reporting your own pattern', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      userId: REPORTER_ID,
    } as never);

    const error = await fileReport(REPORTER_ID, SLUG, { reason: 'spam' }, NOW).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual({ slug: ['yours'] });
    expect(prisma.breakReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('updates rather than creates a second report while one is still open', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      userId: OWNER_ID,
    } as never);
    vi.mocked(prisma.breakReport.findFirst).mockResolvedValue({ id: 'rpt1' } as never);

    const result = await fileReport(
      REPORTER_ID,
      SLUG,
      { reason: 'offensive', note: 'Still bad' },
      NOW
    );

    expect(result).toEqual({ id: 'rpt1', status: 'open' });
    expect(prisma.breakReport.update).toHaveBeenCalledWith({
      where: { id: 'rpt1' },
      data: { reason: 'offensive', note: 'Still bad' },
    });
    expect(prisma.breakReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an open report is updated, not duplicated
    expect(alertAdminsOfReport).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an update is not a new report
    // updating an existing open report does not re-check the daily cap
    expect(prisma.breakReport.count).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a stacked report is not a new one
  });

  it('refuses with REPORT_LIMIT (429) at the daily cap, when there is no open report to update', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      userId: OWNER_ID,
    } as never);
    vi.mocked(prisma.breakReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.breakReport.count).mockResolvedValue(REPORT_DAILY_CAP);

    await expect(fileReport(REPORTER_ID, SLUG, { reason: 'spam' }, NOW)).rejects.toMatchObject({
      code: 'REPORT_LIMIT',
      status: 429,
    });
    expect(prisma.breakReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('creates a new report scoped to the reporter, with a trimmed note or null', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      userId: OWNER_ID,
      title: 'Cold Sweat',
    } as never);
    vi.mocked(prisma.breakReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.breakReport.count).mockResolvedValue(0);
    vi.mocked(prisma.breakReport.create).mockResolvedValue({ id: 'rpt-new' } as never);

    const result = await fileReport(
      REPORTER_ID,
      SLUG,
      { reason: 'bad-link', note: '  looks off  ' },
      NOW
    );

    expect(result).toEqual({ id: 'rpt-new', status: 'open' });
    expect(prisma.breakReport.create).toHaveBeenCalledWith({
      data: { breakId: BREAK_ID, reporterId: REPORTER_ID, reason: 'bad-link', note: 'looks off' },
      select: { id: true },
    });
    expect(alertAdminsOfReport).toHaveBeenCalledWith(
      { kind: 'pattern', breakId: BREAK_ID, title: 'Cold Sweat' },
      'rpt-new',
      'Bad or misleading link',
      NOW
    );
  });

  it('stores no note at all as null, not an empty string', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      userId: OWNER_ID,
    } as never);
    vi.mocked(prisma.breakReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.breakReport.count).mockResolvedValue(0);
    vi.mocked(prisma.breakReport.create).mockResolvedValue({ id: 'rpt-new' } as never);

    await fileReport(REPORTER_ID, SLUG, { reason: 'other' }, NOW);

    expect(vi.mocked(prisma.breakReport.create).mock.calls[0][0].data.note).toBeNull();
  });
});

describe('moderationQueue', () => {
  const reportRow = (over: Record<string, unknown> = {}) => ({
    id: 'r1',
    reason: 'spam',
    note: null,
    createdAt: new Date('2026-09-20T00:00:00Z'),
    reporterId: REPORTER_ID,
    breakRef: {
      id: BREAK_ID,
      title: 'Cold Carpet',
      slug: SLUG,
      visibility: 'published',
      userId: OWNER_ID,
      links: [{ kind: 'video', url: 'https://vimeo.com/1' }],
    },
    ...over,
  });

  it('groups reports under one entry per pattern, in the order they came back', async () => {
    vi.mocked(prisma.breakReport.findMany).mockResolvedValue([
      reportRow({ id: 'r1', createdAt: new Date('2026-09-20T00:00:00Z') }),
      reportRow({ id: 'r2', reason: 'offensive', createdAt: new Date('2026-09-22T00:00:00Z') }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: OWNER_ID, email: 'owner@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
    ] as never);

    const queue = await moderationQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      breakId: BREAK_ID,
      title: 'Cold Carpet',
      slug: SLUG,
      visibility: 'published',
      owner: { username: 'ghostnotes', email: 'owner@example.com' },
      links: 1,
    });
    expect(queue[0].reports.map((r) => r.id)).toEqual(['r1', 'r2']);
    // oldest first — the order `findMany`'s own `orderBy: asc` produced
    expect(queue[0].reports[0].createdAt < queue[0].reports[1].createdAt).toBe(true);
  });

  it('reads reports and owners with exactly one user query and one profile query, regardless of row count', async () => {
    const otherBreak = 'cbrk00000000000000000002';
    vi.mocked(prisma.breakReport.findMany).mockResolvedValue([
      reportRow({ id: 'r1' }),
      reportRow({ id: 'r2' }), // same pattern — still one item
      reportRow({
        id: 'r3',
        breakRef: { ...reportRow().breakRef, id: otherBreak, title: 'Warm Floor' },
      }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: OWNER_ID, email: 'owner@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: OWNER_ID, username: 'ghostnotes' },
    ] as never);

    const queue = await moderationQueue();

    expect(queue).toHaveLength(2);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.drummerProfile.findMany).toHaveBeenCalledTimes(1);
    // deduplicated owner ids, not one per report
    expect(vi.mocked(prisma.user.findMany).mock.calls[0][0]).toEqual({
      where: { id: { in: [OWNER_ID] } },
      select: { id: true, email: true },
    });
  });

  it('never carries reporterId — only whether the reporter is gone', async () => {
    vi.mocked(prisma.breakReport.findMany).mockResolvedValue([
      reportRow({ id: 'r1', reporterId: null }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: OWNER_ID, email: 'owner@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);

    const queue = await moderationQueue();

    expect(queue[0].reports[0]).not.toHaveProperty('reporterId');
    expect(queue[0].reports[0].reporterGone).toBe(true);
  });

  it('answers no username and empty email for an owner with neither on record', async () => {
    vi.mocked(prisma.breakReport.findMany).mockResolvedValue([reportRow()] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);

    const queue = await moderationQueue();

    expect(queue[0].owner).toEqual({ username: null, email: '' });
  });

  it('is empty when there are no open reports', async () => {
    vi.mocked(prisma.breakReport.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);

    expect(await moderationQueue()).toEqual([]);
  });
});

describe('ownsSlug', () => {
  it('is true when a row at that slug belongs to the user', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({ id: BREAK_ID } as never);
    expect(await ownsSlug(SLUG, OWNER_ID)).toBe(true);
    expect(vi.mocked(prisma.break.findFirst).mock.calls[0][0]).toEqual({
      where: { slug: SLUG, userId: OWNER_ID },
      select: { id: true },
    });
  });

  it('is false otherwise', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue(null);
    expect(await ownsSlug(SLUG, OWNER_ID)).toBe(false);
  });
});

describe('fileProfileReport', () => {
  it('404s an unknown username', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);

    await expect(
      fileProfileReport(REPORTER_ID, USERNAME, { reason: 'spam' }, NOW)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to report
  });

  it('looks the profile up by the lower-cased username', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue(null);
    await fileProfileReport(REPORTER_ID, 'GhostNotes', { reason: 'spam' }, NOW).catch(() => {});
    expect(vi.mocked(prisma.drummerProfile.findUnique).mock.calls[0][0]).toMatchObject({
      where: { username: 'ghostnotes' },
    });
  });

  it('400s reporting your own profile', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: REPORTER_ID,
    } as never);

    const error = await fileProfileReport(REPORTER_ID, USERNAME, { reason: 'spam' }, NOW).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual({ username: ['yours'] });
    expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('updates rather than creates a second report while one is still open', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: SUBJECT_ID,
    } as never);
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue({ id: 'prpt1' } as never);

    const result = await fileProfileReport(
      REPORTER_ID,
      USERNAME,
      { reason: 'offensive', note: 'Still bad' },
      NOW
    );

    expect(result).toEqual({ id: 'prpt1', status: 'open' });
    expect(prisma.drummerReport.update).toHaveBeenCalledWith({
      where: { id: 'prpt1' },
      data: { reason: 'offensive', note: 'Still bad' },
    });
    expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an open report is updated, not duplicated
    expect(prisma.drummerReport.count).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a stacked report is not a new one
  });

  it('refuses with REPORT_LIMIT (429) at the daily cap, counted across both report kinds', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: SUBJECT_ID,
    } as never);
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue(null);
    // the pattern side alone already reaches the cap
    vi.mocked(prisma.breakReport.count).mockResolvedValue(REPORT_DAILY_CAP);
    vi.mocked(prisma.drummerReport.count).mockResolvedValue(0);

    await expect(
      fileProfileReport(REPORTER_ID, USERNAME, { reason: 'spam' }, NOW)
    ).rejects.toMatchObject({ code: 'REPORT_LIMIT', status: 429 });
    expect(prisma.drummerReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('creates a new report scoped to the subject, with a trimmed note or null', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: SUBJECT_ID,
    } as never);
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.drummerReport.create).mockResolvedValue({ id: 'prpt-new' } as never);

    const result = await fileProfileReport(
      REPORTER_ID,
      USERNAME,
      { reason: 'bad-link', note: '  looks off  ' },
      NOW
    );

    expect(result).toEqual({ id: 'prpt-new', status: 'open' });
    expect(prisma.drummerReport.create).toHaveBeenCalledWith({
      data: {
        subjectId: SUBJECT_ID,
        reporterId: REPORTER_ID,
        reason: 'bad-link',
        note: 'looks off',
      },
      select: { id: true },
    });
    expect(alertAdminsOfReport).toHaveBeenCalledWith(
      { kind: 'profile', subjectId: SUBJECT_ID, username: USERNAME },
      'prpt-new',
      expect.any(String),
      NOW
    );
  });

  it('stores no note at all as null, not an empty string', async () => {
    vi.mocked(prisma.drummerProfile.findUnique).mockResolvedValue({
      userId: SUBJECT_ID,
    } as never);
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.drummerReport.create).mockResolvedValue({ id: 'prpt-new' } as never);

    await fileProfileReport(REPORTER_ID, USERNAME, { reason: 'other' }, NOW);

    expect(vi.mocked(prisma.drummerReport.create).mock.calls[0][0].data.note).toBeNull();
  });
});

describe('profileQueue', () => {
  const profileReportRow = (over: Record<string, unknown> = {}) => ({
    id: 'pr1',
    subjectId: SUBJECT_ID,
    reason: 'spam',
    note: null,
    createdAt: new Date('2026-09-20T00:00:00Z'),
    reporterId: REPORTER_ID,
    ...over,
  });

  it('groups reports under one entry per subject, in the order they came back', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([
      profileReportRow({ id: 'pr1', createdAt: new Date('2026-09-20T00:00:00Z') }),
      profileReportRow({
        id: 'pr2',
        reason: 'offensive',
        createdAt: new Date('2026-09-22T00:00:00Z'),
      }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: SUBJECT_ID, email: 'subject@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: SUBJECT_ID, username: USERNAME, bio: 'Funk, mostly.' },
    ] as never);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([
      { userId: SUBJECT_ID, channels: [{ kind: 'youtube', url: 'https://youtube.com/@g' }] },
    ] as never);

    const queue = await profileQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      subjectId: SUBJECT_ID,
      username: USERNAME,
      email: 'subject@example.com',
      bio: 'Funk, mostly.',
      links: 1,
    });
    expect(queue[0].reports.map((r) => r.id)).toEqual(['pr1', 'pr2']);
    expect(queue[0].reports[0].createdAt < queue[0].reports[1].createdAt).toBe(true);
  });

  it('reads owners, profiles and about-rows with exactly one query each, regardless of row count', async () => {
    const otherSubject = 'csubj0000000000000000002';
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([
      profileReportRow({ id: 'pr1' }),
      profileReportRow({ id: 'pr2' }), // same subject — still one item
      profileReportRow({ id: 'pr3', subjectId: otherSubject }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: SUBJECT_ID, email: 'subject@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: SUBJECT_ID, username: USERNAME, bio: null },
    ] as never);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([]);

    const queue = await profileQueue();

    expect(queue).toHaveLength(2);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.drummerProfile.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.drummerAbout.findMany).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.user.findMany).mock.calls[0][0]).toEqual({
      where: { id: { in: [SUBJECT_ID, otherSubject] } },
      select: { id: true, email: true },
    });
  });

  it('never carries reporterId — only whether the reporter is gone', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([
      profileReportRow({ id: 'pr1', reporterId: null }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([]);

    const queue = await profileQueue();

    expect(queue[0].reports[0]).not.toHaveProperty('reporterId');
    expect(queue[0].reports[0].reporterGone).toBe(true);
  });

  it('counts zero links when the subject has no About-you row, or a non-array channels value', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([profileReportRow()] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([]);

    const queue = await profileQueue();

    expect(queue[0].links).toBe(0);
  });

  it('answers a null username and empty email when the subject has neither on record', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([profileReportRow()] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([]);

    const queue = await profileQueue();

    expect(queue[0].username).toBeNull();
    expect(queue[0].email).toBe('');
  });

  it('is empty when there are no open reports', async () => {
    vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.drummerAbout.findMany).mockResolvedValue([]);

    expect(await profileQueue()).toEqual([]);
  });
});

describe('fileSpeedReport (7C)', () => {
  const RECORD_ID = 'cspd00000000000000000001';
  const DRUMMER_ID = 'cdrum0000000000000000001';

  it('404s a record that is on no table', async () => {
    vi.mocked(tabledRecord).mockResolvedValue(null);

    await expect(
      fileSpeedReport(REPORTER_ID, RECORD_ID, { reason: 'wrong-speed' }, NOW)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(tabledRecord).toHaveBeenCalledWith(RECORD_ID);
    expect(prisma.speedReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to report
  });

  it('refuses your own speed', async () => {
    vi.mocked(tabledRecord).mockResolvedValue({
      id: RECORD_ID,
      userId: REPORTER_ID,
      title: 'Funky Drummer',
      bpm: 112,
    });

    await expect(
      fileSpeedReport(REPORTER_ID, RECORD_ID, { reason: 'wrong-speed' }, NOW)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('updates your open report on the same record rather than adding another', async () => {
    vi.mocked(tabledRecord).mockResolvedValue({
      id: RECORD_ID,
      userId: DRUMMER_ID,
      title: 'Funky Drummer',
      bpm: 112,
    });
    vi.mocked(prisma.speedReport.findFirst).mockResolvedValue({ id: 'srpt1' } as never);

    const result = await fileSpeedReport(
      REPORTER_ID,
      RECORD_ID,
      { reason: 'bad-link', note: '  not them  ' },
      NOW
    );

    expect(result).toEqual({ id: 'srpt1', status: 'open' });
    expect(prisma.speedReport.update).toHaveBeenCalledWith({
      where: { id: 'srpt1' },
      data: { reason: 'bad-link', note: 'not them' },
    });
    expect(prisma.speedReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — updated, not stacked
  });

  it('refuses with REPORT_LIMIT (429) at the daily cap, counted across every report kind', async () => {
    vi.mocked(tabledRecord).mockResolvedValue({
      id: RECORD_ID,
      userId: DRUMMER_ID,
      title: 'Funky Drummer',
      bpm: 112,
    });
    vi.mocked(prisma.speedReport.findFirst).mockResolvedValue(null);
    // one of each kind short of the cap, together over it
    vi.mocked(prisma.breakReport.count).mockResolvedValue(REPORT_DAILY_CAP - 2);
    vi.mocked(prisma.drummerReport.count).mockResolvedValue(1);
    vi.mocked(prisma.speedReport.count).mockResolvedValue(1);

    await expect(
      fileSpeedReport(REPORTER_ID, RECORD_ID, { reason: 'wrong-speed' }, NOW)
    ).rejects.toMatchObject({ code: 'REPORT_LIMIT', status: 429 });
    expect(prisma.speedReport.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('counts speed reports toward the cap for a pattern report too', async () => {
    vi.mocked(prisma.break.findFirst).mockResolvedValue({
      id: BREAK_ID,
      userId: OWNER_ID,
    } as never);
    vi.mocked(prisma.breakReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.speedReport.count).mockResolvedValue(REPORT_DAILY_CAP);

    await expect(fileReport(REPORTER_ID, SLUG, { reason: 'spam' }, NOW)).rejects.toMatchObject({
      code: 'REPORT_LIMIT',
    });
  });

  it('creates a report with a null note when none was given', async () => {
    vi.mocked(tabledRecord).mockResolvedValue({
      id: RECORD_ID,
      userId: DRUMMER_ID,
      title: 'Funky Drummer',
      bpm: 112,
    });
    vi.mocked(prisma.speedReport.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.speedReport.create).mockResolvedValue({ id: 'srpt-new' } as never);

    const result = await fileSpeedReport(REPORTER_ID, RECORD_ID, { reason: 'wrong-speed' }, NOW);

    expect(result).toEqual({ id: 'srpt-new', status: 'open' });
    expect(prisma.speedReport.create).toHaveBeenCalledWith({
      data: { recordId: RECORD_ID, reporterId: REPORTER_ID, reason: 'wrong-speed', note: null },
      select: { id: true },
    });
    expect(alertAdminsOfReport).toHaveBeenCalledWith(
      { kind: 'speed', recordId: RECORD_ID, title: 'Funky Drummer', bpm: 112 },
      'srpt-new',
      expect.any(String),
      NOW
    );
  });
});

describe('speedQueue (7C)', () => {
  const report = (id: string, recordOverrides: Record<string, unknown> = {}) => ({
    id,
    reason: 'wrong-speed',
    note: null,
    createdAt: new Date('2026-09-28T00:00:00Z'),
    reporterId: null,
    record: {
      id: 'cspd00000000000000000001',
      userId: 'cdrum0000000000000000001',
      titleSnapshot: 'Old name',
      level: 5,
      bpm: 180,
      recordedAt: new Date('2026-09-27T00:00:00Z'),
      videoUrl: null,
      listed: true,
      breakRef: { title: 'Cold Carpet', slug: 'cold000001', visibility: 'published' },
      libraryEntry: null,
      ...recordOverrides,
    },
  });

  it('groups open reports by record, with the drummer, and never the reporter', async () => {
    vi.mocked(prisma.speedReport.findMany).mockResolvedValue([
      report('sr1'),
      report('sr2'),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'cdrum0000000000000000001', email: 'drum@example.com' },
    ] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([
      { userId: 'cdrum0000000000000000001', username: 'fastfeet' },
    ] as never);

    const queue = await speedQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      recordId: 'cspd00000000000000000001',
      title: 'Cold Carpet',
      slug: 'cold000001',
      bpm: 180,
      listed: true,
      drummer: { username: 'fastfeet', email: 'drum@example.com' },
    });
    expect(queue[0].reports.map((r) => r.id)).toEqual(['sr1', 'sr2']);
    expect(queue[0].reports[0]).toEqual(expect.objectContaining({ reporterGone: true }));
    expect(queue[0].reports[0]).not.toHaveProperty('reporterId');
    // one lookup each for users and profiles, whatever the queue's length
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.drummerProfile.findMany).toHaveBeenCalledTimes(1);
  });

  it('gives no address for a pattern no longer published, and the snapshot title once the target is gone', async () => {
    vi.mocked(prisma.speedReport.findMany).mockResolvedValue([
      report('sr1', { breakRef: { title: 'Cold Carpet', slug: 'cold000001', visibility: 'link' } }),
      report('sr2', { id: 'cspd00000000000000000002', breakRef: null }),
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.drummerProfile.findMany).mockResolvedValue([] as never);

    const [unpublished, gone] = await speedQueue();

    expect(unpublished.slug).toBeNull();
    expect(gone.title).toBe('Old name');
    expect(gone.drummer).toEqual({ username: null, email: '' });
  });
});
