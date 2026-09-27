import { APIError, NotFoundError, ValidationError } from '@/lib/api/errors';
import type { ReportReason } from '@/lib/app/breaks/community/report-reasons';
import { prisma } from '@/lib/db/client';

/**
 * Reporting a shared or published pattern, and the moderation queue that
 * reads the reports (Phase 6, tasks 6.10 and 6.11). **Server-side only.**
 */

export {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from '@/lib/app/breaks/community/report-reasons';

/** Reports one person may file in 24 hours. */
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

  const recent = await prisma.breakReport.count({
    where: { reporterId, createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
  });
  if (recent >= REPORT_DAILY_CAP) {
    throw new APIError(
      "That's a lot of reports in one day — thank you. Try again tomorrow.",
      'REPORT_LIMIT',
      429
    );
  }

  const created = await prisma.breakReport.create({
    data: { breakId: target.id, reporterId, reason: input.reason, note },
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
