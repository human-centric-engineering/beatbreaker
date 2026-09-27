import { createElement } from 'react';

import { NotFoundError } from '@/lib/api/errors';
import { REPORT_REASONS, REPORT_REASON_LABELS } from '@/lib/app/breaks/community/reports';
import PatternUnpublishedEmail from '@/components/app/emails/pattern-unpublished';
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
      reports: { where: { status: 'open' }, select: { reason: true }, take: 50 },
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

  /* After the write: a failed email must not leave the pattern public. The
     result is logged, not thrown — the moderation happened either way. */
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
