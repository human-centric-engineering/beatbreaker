import { createElement } from 'react';

import { NotFoundError } from '@/lib/api/errors';
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  SPEED_REPORT_REASONS,
  SPEED_REPORT_REASON_LABELS,
} from '@/lib/app/breaks/community/reports';
import PatternUnpublishedEmail from '@/components/app/emails/pattern-unpublished';
import SpeedUnlistedEmail from '@/components/app/emails/speed-unlisted';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logging';

/**
 * What a moderator can do about a reported pattern (Phase 6, task 6.11).
 * **Server-side only.** Each action takes effect on the next public read:
 * the public data layer reads `visibility` fresh, and its responses must
 * revalidate.
 *
 * - **unpublish** — the pattern goes back to `private` (not `link`: a link
 *   that was being passed around is exactly what a report may be about), its
 *   open reports are closed as actioned, and the owner is emailed.
 * - **strip-links** — its reference links are removed and it stays as it was;
 *   the open `bad-link` reports are closed as actioned.
 * - **dismiss** — its open reports are closed as dismissed; nothing else moves.
 */

export const MODERATION_ACTIONS = ['unpublish', 'strip-links', 'dismiss'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export async function moderate(
  breakId: string,
  action: ModerationAction,
  adminId: string,
  now = new Date()
): Promise<{ breakId: string; title: string; action: ModerationAction; reportsClosed: number }> {
  const row = await prisma.break.findUnique({
    where: { id: breakId },
    select: {
      id: true,
      title: true,
      userId: true,
      visibility: true,
      // the oldest open report's reason is the one the owner is told
      reports: {
        where: { status: 'open' },
        select: { reason: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  if (!row) throw new NotFoundError(`Break ${breakId} not found`);

  const resolved = { resolvedById: adminId, resolvedAt: now };

  if (action === 'dismiss') {
    const { count } = await prisma.breakReport.updateMany({
      where: { breakId, status: 'open' },
      data: { status: 'dismissed', ...resolved },
    });
    return { breakId, title: row.title, action, reportsClosed: count };
  }

  if (action === 'strip-links') {
    const [, { count }] = await prisma.$transaction([
      prisma.break.update({ where: { id: breakId }, data: { links: [] } }),
      prisma.breakReport.updateMany({
        where: { breakId, status: 'open', reason: 'bad-link' },
        data: { status: 'actioned', ...resolved },
      }),
    ]);
    return { breakId, title: row.title, action, reportsClosed: count };
  }

  const [, { count }] = await prisma.$transaction([
    prisma.break.update({ where: { id: breakId }, data: { visibility: 'private' } }),
    prisma.breakReport.updateMany({
      where: { breakId, status: 'open' },
      data: { status: 'actioned', ...resolved },
    }),
  ]);

  /* Only when this unpublished something: a pattern its owner had already made
     private has nothing to tell them about, and when two moderators act at
     once the second closes no reports and sends nothing. After the write: a
     failed email must not leave the pattern public. The result is logged, not
     thrown — the moderation happened either way. */
  if (row.visibility === 'private' || count === 0) {
    return { breakId, title: row.title, action, reportsClosed: count };
  }
  const owner = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { email: true },
  });
  if (owner?.email) {
    // the stored reason is read back through the list, never cast
    const reason = REPORT_REASONS.find((r) => r === row.reports[0]?.reason);
    const label = reason ? REPORT_REASON_LABELS[reason] : 'a report';
    const sent = await sendEmail({
      to: owner.email,
      subject: `“${row.title}” was unpublished`,
      react: createElement(PatternUnpublishedEmail, {
        title: row.title,
        reason: label.toLowerCase(),
      }),
    });
    if (!sent.success) {
      logger.warn('Unpublish email not sent', { breakId, status: sent.status });
    }
  }

  return { breakId, title: row.title, action, reportsClosed: count };
}

/**
 * What a moderator can do about a reported profile (Phase 7B, task 7B.6).
 * **Server-side only.** Takes effect on the next public read.
 *
 * - **strip-links** — the profile's channel links are removed; everything
 *   else stays. The open `bad-link` reports are closed as actioned.
 * - **dismiss** — its open reports are closed as dismissed; nothing else moves.
 *
 * Hiding an offensive username or bio is not an action yet (plan §10).
 */
export const PROFILE_MODERATION_ACTIONS = ['strip-links', 'dismiss'] as const;
export type ProfileModerationAction = (typeof PROFILE_MODERATION_ACTIONS)[number];

export async function moderateProfile(
  subjectId: string,
  action: ProfileModerationAction,
  adminId: string,
  now = new Date()
): Promise<{ subjectId: string; action: ProfileModerationAction; reportsClosed: number }> {
  const reported = await prisma.drummerReport.findFirst({
    where: { subjectId },
    select: { id: true },
  });
  if (!reported) throw new NotFoundError(`No reports on profile ${subjectId}`);

  const resolved = { resolvedById: adminId, resolvedAt: now };

  if (action === 'dismiss') {
    const { count } = await prisma.drummerReport.updateMany({
      where: { subjectId, status: 'open' },
      data: { status: 'dismissed', ...resolved },
    });
    return { subjectId, action, reportsClosed: count };
  }

  const [, { count }] = await prisma.$transaction([
    prisma.drummerAbout.updateMany({ where: { userId: subjectId }, data: { channels: [] } }),
    prisma.drummerReport.updateMany({
      where: { subjectId, status: 'open', reason: 'bad-link' },
      data: { status: 'actioned', ...resolved },
    }),
  ]);
  return { subjectId, action, reportsClosed: count };
}

/**
 * What a moderator can do about a reported speed (Phase 7C). **Server-side
 * only.** Takes effect on the next public read: the tables are read from live
 * rows.
 *
 * - **unlist** — the record comes off every table (`listed = false`) and is
 *   kept, in its drummer's history; its open reports are closed as actioned,
 *   and the drummer is emailed. Nothing lists it again: there is no route that
 *   sets `listed` on a record that exists.
 * - **dismiss** — its open reports are closed as dismissed; nothing else moves.
 */
export const SPEED_MODERATION_ACTIONS = ['unlist', 'dismiss'] as const;
export type SpeedModerationAction = (typeof SPEED_MODERATION_ACTIONS)[number];

export async function moderateSpeed(
  recordId: string,
  action: SpeedModerationAction,
  adminId: string,
  now = new Date()
): Promise<{ recordId: string; action: SpeedModerationAction; reportsClosed: number }> {
  const row = await prisma.speedRecord.findUnique({
    where: { id: recordId },
    select: {
      userId: true,
      listed: true,
      level: true,
      bpm: true,
      titleSnapshot: true,
      breakRef: { select: { title: true } },
      libraryEntry: { select: { title: true } },
      // the oldest open report's reason is the one the drummer is told
      reports: {
        where: { status: 'open' },
        select: { reason: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  if (!row) throw new NotFoundError(`Speed record ${recordId} not found`);

  const resolved = { resolvedById: adminId, resolvedAt: now };

  if (action === 'dismiss') {
    const { count } = await prisma.speedReport.updateMany({
      where: { recordId, status: 'open' },
      data: { status: 'dismissed', ...resolved },
    });
    return { recordId, action, reportsClosed: count };
  }

  const [, { count }] = await prisma.$transaction([
    prisma.speedRecord.update({ where: { id: recordId }, data: { listed: false } }),
    prisma.speedReport.updateMany({
      where: { recordId, status: 'open' },
      data: { status: 'actioned', ...resolved },
    }),
  ]);

  /* Only when this took it off a table, for the reasons `moderate` gives: a
     record already unlisted has nothing to tell anyone, and a second
     moderator acting at once closes nothing and sends nothing. After the
     write, and logged rather than thrown — the unlisting happened either way. */
  if (!row.listed || count === 0) return { recordId, action, reportsClosed: count };
  const drummer = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { email: true },
  });
  if (drummer?.email) {
    const title = row.breakRef?.title ?? row.libraryEntry?.title ?? row.titleSnapshot;
    // the stored reason is read back through the list, never cast
    const reason = SPEED_REPORT_REASONS.find((r) => r === row.reports[0]?.reason);
    const label = reason ? SPEED_REPORT_REASON_LABELS[reason] : 'a report';
    const sent = await sendEmail({
      to: drummer.email,
      subject: `Your ${row.bpm} bpm on “${title}” was taken off its table`,
      react: createElement(SpeedUnlistedEmail, {
        title,
        bpm: row.bpm,
        level: row.level,
        reason: label.toLowerCase(),
      }),
    });
    if (!sent.success) {
      logger.warn('Unlist email not sent', { recordId, status: sent.status });
    }
  }

  return { recordId, action, reportsClosed: count };
}
