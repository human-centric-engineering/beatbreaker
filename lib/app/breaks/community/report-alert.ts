import { createElement } from 'react';

import ReportReceivedEmail from '@/components/app/emails/report-received';
import { humanAdminWhere } from '@/lib/auth/account';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';
import { logger } from '@/lib/logging';

/**
 * Telling the admins that something was reported (Phase 8, task 8.4).
 * **Server-side only.**
 *
 * The queue at `/admin/patterns` holds every open report, but nothing told
 * anyone a new one had arrived, so a moderation rota of one only found out
 * by looking. A new report now emails every human admin, at most once an
 * hour per reported thing, so a pile-on sends one email rather than twenty.
 *
 * The hour is anchored on the report that last sent an email, not on the
 * report before this one, so a report every 50 minutes still emails once an
 * hour rather than once ever. Only open reports count: one an admin has
 * dismissed or acted on does not hold back the next. Which report sends is
 * decided by walking the open reports in order (oldest first, id breaking a
 * tie), so two reports filed in the same instant agree on which of them
 * emails instead of each deferring to the other.
 *
 * Best-effort: the report is already saved when this runs, and a failure
 * here is logged, never thrown. Who reported it is never in the email.
 */

const HOUR_MS = 60 * 60 * 1000;

export type ReportedThing =
  | { kind: 'pattern'; breakId: string; title: string }
  | { kind: 'profile'; subjectId: string; username: string }
  | { kind: 'speed'; recordId: string; title: string; bpm: number };

type ReportTime = { id: string; createdAt: Date };

/** The thing's open reports, oldest first, id breaking a tie. */
async function openReports(thing: ReportedThing): Promise<ReportTime[]> {
  const query = {
    select: { id: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  };
  switch (thing.kind) {
    case 'pattern':
      return prisma.breakReport.findMany({
        ...query,
        where: { breakId: thing.breakId, status: 'open' },
      });
    case 'profile':
      return prisma.drummerReport.findMany({
        ...query,
        where: { subjectId: thing.subjectId, status: 'open' },
      });
    case 'speed':
      return prisma.speedReport.findMany({
        ...query,
        where: { recordId: thing.recordId, status: 'open' },
      });
  }
}

/**
 * Whether this report is one that emails: walking the open reports, one
 * emails when no earlier one emailed in the hour before it. A report that is
 * no longer open (resolved before this ran) sends nothing.
 */
export function sendsAlert(reports: readonly ReportTime[], reportId: string): boolean {
  let lastSent: number | null = null;
  for (const report of reports) {
    const at = report.createdAt.getTime();
    const sends = lastSent === null || at - lastSent >= HOUR_MS;
    if (sends) lastSent = at;
    if (report.id === reportId) return sends;
  }
  return false;
}

function describe(thing: ReportedThing): string {
  switch (thing.kind) {
    case 'pattern':
      return `The pattern “${thing.title}”`;
    case 'profile':
      return `The drummer @${thing.username}`;
    case 'speed':
      return `A speed of ${thing.bpm} bpm on “${thing.title}”`;
  }
}

export async function alertAdminsOfReport(
  thing: ReportedThing,
  reportId: string,
  reasonLabel: string
): Promise<void> {
  try {
    if (!sendsAlert(await openReports(thing), reportId)) return;

    const admins = await prisma.user.findMany({
      where: humanAdminWhere,
      select: { email: true },
    });
    const to = admins.map((a) => a.email).filter(Boolean);
    if (to.length === 0) return;

    const subject = describe(thing);
    const sent = await sendEmail({
      to,
      subject: `Reported: ${subject.charAt(0).toLowerCase()}${subject.slice(1)}`,
      react: createElement(ReportReceivedEmail, {
        kind: thing.kind,
        subject,
        reason: reasonLabel.toLowerCase(),
        queueUrl: `${env.BETTER_AUTH_URL}/admin/patterns`,
      }),
    });
    if (!sent.success) {
      logger.warn('Report alert not sent', { kind: thing.kind, reportId, status: sent.status });
    }
  } catch (error) {
    logger.error('Report alert failed', {
      kind: thing.kind,
      reportId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
