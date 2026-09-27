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
    user: { findMany: vi.fn() },
    drummerProfile: { findMany: vi.fn() },
  },
}));

import { NotFoundError, ValidationError } from '@/lib/api/errors';
import {
  fileReport,
  moderationQueue,
  ownsSlug,
  REPORT_DAILY_CAP,
} from '@/lib/app/breaks/community/reports';
import { prisma } from '@/lib/db/client';

const REPORTER_ID = 'cmjbv4i3x00003wsloputgwul';
const OWNER_ID = 'clzx9k8p40000x8c2g3h5m7b1';
const BREAK_ID = 'cbrk00000000000000000001';
const SLUG = 'cold000001';
const NOW = new Date('2026-09-27T00:00:00Z');

beforeEach(() => {
  vi.resetAllMocks();
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
