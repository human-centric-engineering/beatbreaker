import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import type {
  ProfileReportReason,
  ReportReason,
  SpeedReportReason,
} from '@/lib/app/breaks/community/report-reasons';
import { prisma } from '@/lib/db/client';

/**
 * Reporting a shared or published pattern, and the moderation queue that
 * reads the reports (Phase 6, tasks 6.10 and 6.11); reporting a drummer's
 * profile, and its place in the same queue (Phase 7B, tasks 7B.5 and 7B.6);
 * reporting a row on a speed table, and its place there too (Phase 7C).
 * **Server-side only.**
 */

export {
  PROFILE_REPORT_REASONS,
  PROFILE_REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  SPEED_REPORT_REASONS,
  SPEED_REPORT_REASON_LABELS,
  type ProfileReportReason,
  type ReportReason,
  type SpeedReportReason,
} from '@/lib/app/breaks/community/report-reasons';

/** Reports one person may file in 24 hours — patterns, profiles and speeds together. */
export const REPORT_DAILY_CAP = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * File a report. One open report per person per pattern: reporting it again
 * updates the reason and note rather than stacking duplicates in the queue.
 * You cannot report your own pattern, or one that is not shared.
 */
export async function fileReport(
  reporterId: string,
  slug: string,
  input: { reason: ReportReason; note?: string },
  now = new Date()
): Promise<{ id: string; status: 'open' }> {
  const target = await prisma.break.findFirst({
    where: { slug, visibility: { in: ['link', 'published'] } },
    select: { id: true, userId: true },
  });
  if (!target) throw new NotFoundError('Pattern not found');
  if (target.userId === reporterId) {
    throw new ValidationError('You cannot report your own pattern', { slug: ['yours'] });
  }

  const note = input.note?.trim() || null;
  const existing = await prisma.breakReport.findFirst({
    where: { breakId: target.id, reporterId, status: 'open' },
    select: { id: true },
  });
  if (existing) {
    await prisma.breakReport.update({
      where: { id: existing.id },
      data: { reason: input.reason, note },
    });
    return { id: existing.id, status: 'open' };
  }

  await checkDailyCap(reporterId, now);

  const created = await prisma.breakReport.create({
    data: { breakId: target.id, reporterId, reason: input.reason, note },
    select: { id: true },
  });
  return { id: created.id, status: 'open' };
}

/**
 * The daily cap, counted over every kind of report, so reporting profiles or
 * speeds does not open a second allowance beside patterns'.
 */
async function checkDailyCap(reporterId: string, now: Date): Promise<void> {
  const since = { gte: new Date(now.getTime() - DAY_MS) };
  const [patterns, profiles, speeds] = await Promise.all([
    prisma.breakReport.count({ where: { reporterId, createdAt: since } }),
    prisma.drummerReport.count({ where: { reporterId, createdAt: since } }),
    prisma.speedReport.count({ where: { reporterId, createdAt: since } }),
  ]);
  if (patterns + profiles + speeds >= REPORT_DAILY_CAP) {
    throw new APIError(
      "That's a lot of reports in one day — thank you. Try again tomorrow.",
      'REPORT_LIMIT',
      429
    );
  }
}

/**
 * Report a drummer's profile (Phase 7B, task 7B.5). The same rules as a
 * pattern: one open report per person per profile, updated rather than
 * stacked; not your own; the daily cap. An unknown username is a 404.
 */
export async function fileProfileReport(
  reporterId: string,
  username: string,
  input: { reason: ProfileReportReason; note?: string },
  now = new Date()
): Promise<{ id: string; status: 'open' }> {
  const target = await prisma.drummerProfile.findUnique({
    where: { username: username.toLowerCase() },
    select: { userId: true },
  });
  if (!target) throw new NotFoundError('Drummer not found');
  if (target.userId === reporterId) {
    throw new ValidationError('You cannot report your own profile', { username: ['yours'] });
  }

  const note = input.note?.trim() || null;
  const existing = await prisma.drummerReport.findFirst({
    where: { subjectId: target.userId, reporterId, status: 'open' },
    select: { id: true },
  });
  if (existing) {
    await prisma.drummerReport.update({
      where: { id: existing.id },
      data: { reason: input.reason, note },
    });
    return { id: existing.id, status: 'open' };
  }

  await checkDailyCap(reporterId, now);

  const created = await prisma.drummerReport.create({
    data: { subjectId: target.userId, reporterId, reason: input.reason, note },
    select: { id: true },
  });
  return { id: created.id, status: 'open' };
}

/** One pattern in the moderation queue, with its open reports. */
export interface QueueItem {
  breakId: string;
  title: string;
  slug: string | null;
  visibility: string;
  owner: { username: string | null; email: string };
  links: number;
  reports: Array<{
    id: string;
    reason: string;
    note: string | null;
    createdAt: string;
    /** Whether the reporter's account still exists — never who it is. */
    reporterGone: boolean;
  }>;
}

/**
 * The queue: every pattern with an open report, oldest report first. Two
 * queries and a lookup, never one per row. The owner's email is here because
 * this is the admin's view and unpublishing emails them; it never leaves
 * `/admin`.
 */
export async function moderationQueue(): Promise<QueueItem[]> {
  const reports = await prisma.breakReport.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      reason: true,
      note: true,
      createdAt: true,
      reporterId: true,
      breakRef: {
        select: { id: true, title: true, slug: true, visibility: true, userId: true, links: true },
      },
    },
  });
  const owners = [...new Set(reports.map((r) => r.breakRef.userId))];
  const [users, profiles] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: owners } }, select: { id: true, email: true } }),
    prisma.drummerProfile.findMany({
      where: { userId: { in: owners } },
      select: { userId: true, username: true },
    }),
  ]);
  const email = new Map(users.map((u) => [u.id, u.email]));
  const username = new Map(profiles.map((p) => [p.userId, p.username]));

  const byBreak = new Map<string, QueueItem>();
  for (const r of reports) {
    const b = r.breakRef;
    let item = byBreak.get(b.id);
    if (!item) {
      item = {
        breakId: b.id,
        title: b.title,
        slug: b.slug,
        visibility: b.visibility,
        owner: { username: username.get(b.userId) ?? null, email: email.get(b.userId) ?? '' },
        links: Array.isArray(b.links) ? b.links.length : 0,
        reports: [],
      };
      byBreak.set(b.id, item);
    }
    item.reports.push({
      id: r.id,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reporterGone: r.reporterId === null,
    });
  }
  return [...byBreak.values()];
}

/** Whether the pattern at this address is the reader's own — they cannot report it. */
export async function ownsSlug(slug: string, userId: string): Promise<boolean> {
  const row = await prisma.break.findFirst({ where: { slug, userId }, select: { id: true } });
  return row !== null;
}

/** One drummer in the moderation queue, with the open reports on their profile. */
export interface ProfileQueueItem {
  subjectId: string;
  /** Null once the owner has dropped their username; the reports still stand. */
  username: string | null;
  email: string;
  bio: string | null;
  /** How many channel links the profile lists — what _Strip links_ would remove. */
  links: number;
  reports: QueueItem['reports'];
}

/**
 * The profile half of the queue (Phase 7B, task 7B.6): every drummer with an
 * open report on their profile, oldest report first. Two queries and lookups,
 * never one per row. The owner's email is here for the reason the pattern
 * queue gives, and never leaves `/admin`.
 */
export async function profileQueue(): Promise<ProfileQueueItem[]> {
  const reports = await prisma.drummerReport.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      subjectId: true,
      reason: true,
      note: true,
      createdAt: true,
      reporterId: true,
    },
  });
  const subjects = [...new Set(reports.map((r) => r.subjectId))];
  const [users, profiles, abouts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: subjects } }, select: { id: true, email: true } }),
    prisma.drummerProfile.findMany({
      where: { userId: { in: subjects } },
      select: { userId: true, username: true, bio: true },
    }),
    prisma.drummerAbout.findMany({
      where: { userId: { in: subjects } },
      select: { userId: true, channels: true },
    }),
  ]);
  const email = new Map(users.map((u) => [u.id, u.email]));
  const profile = new Map(profiles.map((p) => [p.userId, p]));
  const links = new Map(
    abouts.map((a) => [a.userId, Array.isArray(a.channels) ? a.channels.length : 0])
  );

  const bySubject = new Map<string, ProfileQueueItem>();
  for (const r of reports) {
    let item = bySubject.get(r.subjectId);
    if (!item) {
      item = {
        subjectId: r.subjectId,
        username: profile.get(r.subjectId)?.username ?? null,
        email: email.get(r.subjectId) ?? '',
        bio: profile.get(r.subjectId)?.bio ?? null,
        links: links.get(r.subjectId) ?? 0,
        reports: [],
      };
      bySubject.set(r.subjectId, item);
    }
    item.reports.push({
      id: r.id,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reporterGone: r.reporterId === null,
    });
  }
  return [...bySubject.values()];
}

/**
 * Report a row on a speed table (Phase 7C). Only a listed record can be
 * reported — one that is on no table is a 404, the same as one that does not
 * exist. The same rules as the other reports: one open report per person per
 * record, updated rather than stacked; not your own; the shared daily cap.
 */
export async function fileSpeedReport(
  reporterId: string,
  recordId: string,
  input: { reason: SpeedReportReason; note?: string },
  now = new Date()
): Promise<{ id: string; status: 'open' }> {
  const target = await prisma.speedRecord.findFirst({
    where: { id: recordId, listed: true },
    select: { id: true, userId: true },
  });
  if (!target) throw new NotFoundError('Speed not found');
  if (target.userId === reporterId) {
    throw new ValidationError('You cannot report your own speed', { id: ['yours'] });
  }

  const note = input.note?.trim() || null;
  const existing = await prisma.speedReport.findFirst({
    where: { recordId, reporterId, status: 'open' },
    select: { id: true },
  });
  if (existing) {
    await prisma.speedReport.update({
      where: { id: existing.id },
      data: { reason: input.reason, note },
    });
    return { id: existing.id, status: 'open' };
  }

  await checkDailyCap(reporterId, now);

  const created = await prisma.speedReport.create({
    data: { recordId, reporterId, reason: input.reason, note },
    select: { id: true },
  });
  return { id: created.id, status: 'open' };
}

/** One speed record in the moderation queue, with its open reports. */
export interface SpeedQueueItem {
  recordId: string;
  /** What the record is on; its title at the time if the target has gone. */
  title: string;
  /** The published pattern's address, for a link; null for a famous break. */
  slug: string | null;
  level: number;
  bpm: number;
  recordedAt: string;
  videoUrl: string | null;
  listed: boolean;
  drummer: { username: string | null; email: string };
  reports: QueueItem['reports'];
}

/**
 * The speed half of the queue (Phase 7C): every record with an open report,
 * oldest report first. Two queries and lookups, never one per row. The
 * drummer's email is here because unlisting emails them; it never leaves
 * `/admin`.
 */
export async function speedQueue(): Promise<SpeedQueueItem[]> {
  const reports = await prisma.speedReport.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      reason: true,
      note: true,
      createdAt: true,
      reporterId: true,
      record: {
        select: {
          id: true,
          userId: true,
          titleSnapshot: true,
          level: true,
          bpm: true,
          recordedAt: true,
          videoUrl: true,
          listed: true,
          breakRef: { select: { title: true, slug: true, visibility: true } },
          libraryEntry: { select: { title: true } },
        },
      },
    },
  });
  const drummers = [...new Set(reports.map((r) => r.record.userId))];
  const [users, profiles] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: drummers } }, select: { id: true, email: true } }),
    prisma.drummerProfile.findMany({
      where: { userId: { in: drummers } },
      select: { userId: true, username: true },
    }),
  ]);
  const email = new Map(users.map((u) => [u.id, u.email]));
  const username = new Map(profiles.map((p) => [p.userId, p.username]));

  const byRecord = new Map<string, SpeedQueueItem>();
  for (const r of reports) {
    const rec = r.record;
    let item = byRecord.get(rec.id);
    if (!item) {
      const b = rec.breakRef;
      item = {
        recordId: rec.id,
        title: b?.title ?? rec.libraryEntry?.title ?? rec.titleSnapshot,
        slug: b?.visibility === 'published' ? b.slug : null,
        level: rec.level,
        bpm: rec.bpm,
        recordedAt: rec.recordedAt.toISOString(),
        videoUrl: rec.videoUrl,
        listed: rec.listed,
        drummer: { username: username.get(rec.userId) ?? null, email: email.get(rec.userId) ?? '' },
        reports: [],
      };
      byRecord.set(rec.id, item);
    }
    item.reports.push({
      id: r.id,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reporterGone: r.reporterId === null,
    });
  }
  return [...byRecord.values()];
}
