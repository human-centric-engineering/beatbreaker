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
 * by looking. A new report now emails every human admin, unless the same
 * thing was already reported in the hour before, so a pile-on sends one
 * email rather than twenty.
 *
 * Best-effort: the report is already saved when this runs, and a failure
 * here is logged, never thrown. Who reported it is never in the email.
 */

const HOUR_MS = 60 * 60 * 1000;

export type ReportedThing =
  | { kind: 'pattern'; breakId: string; title: string }
  | { kind: 'profile'; subjectId: string; username: string }
  | { kind: 'speed'; recordId: string; title: string; bpm: number };

/** Another report on the same thing, made in the hour before this one. */
async function reportedWithinTheHour(
  thing: ReportedThing,
  reportId: string,
  now: Date
): Promise<boolean> {
  const where = { id: { not: reportId }, createdAt: { gte: new Date(now.getTime() - HOUR_MS) } };
  switch (thing.kind) {
    case 'pattern':
      return (await prisma.breakReport.count({ where: { ...where, breakId: thing.breakId } })) > 0;
    case 'profile':
      return (
        (await prisma.drummerReport.count({ where: { ...where, subjectId: thing.subjectId } })) > 0
      );
    case 'speed':
      return (
        (await prisma.speedReport.count({ where: { ...where, recordId: thing.recordId } })) > 0
      );
  }
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
  reasonLabel: string,
  now = new Date()
): Promise<void> {
  try {
    if (await reportedWithinTheHour(thing, reportId, now)) return;

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
