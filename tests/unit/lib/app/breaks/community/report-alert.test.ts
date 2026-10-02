/**
 * Telling the admins that something was reported (Phase 8, task 8.4).
 *
 * The email itself is mocked at `sendEmail`; what matters here is who gets
 * it, when it is held back (an open report of the same thing emailed in the
 * hour before),
 * and that nothing here can make filing a report fail.
 *
 * @see lib/app/breaks/community/report-alert.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    breakReport: { findMany: vi.fn() },
    drummerReport: { findMany: vi.fn() },
    speedReport: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { alertAdminsOfReport, sendsAlert } from '@/lib/app/breaks/community/report-alert';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';
import { logger } from '@/lib/logging';

const at = (time: string) => new Date(`2026-10-02T${time}Z`);
const report = (id: string, time: string) => ({ id, createdAt: at(time) });
const PATTERN = {
  kind: 'pattern',
  breakId: 'cbrk00000000000000000001',
  title: 'Cold Sweat',
} as const;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.breakReport.findMany).mockResolvedValue([report('rpt-1', '12:00:00')] as never);
  vi.mocked(prisma.drummerReport.findMany).mockResolvedValue([
    report('prpt-1', '12:00:00'),
  ] as never);
  vi.mocked(prisma.speedReport.findMany).mockResolvedValue([report('srpt-1', '12:00:00')] as never);
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { email: 'one@example.com' },
    { email: 'two@example.com' },
  ] as never);
  vi.mocked(sendEmail).mockResolvedValue({ success: true, status: 'sent' } as never);
});

describe('alertAdminsOfReport', () => {
  it('emails every human admin once, naming what was reported and why, with the queue’s address', async () => {
    await alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam');

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'ADMIN', accountType: 'HUMAN' },
      select: { email: true },
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toEqual(['one@example.com', 'two@example.com']);
    expect(email.subject).toBe('Reported: the pattern “Cold Sweat”');
    expect(email.react.props).toMatchObject({
      kind: 'pattern',
      subject: 'The pattern “Cold Sweat”',
      reason: 'spam',
      queueUrl: `${env.BETTER_AUTH_URL}/admin/patterns`,
    });
  });

  it('sends nothing when an open report of the same pattern emailed in the hour before', async () => {
    vi.mocked(prisma.breakReport.findMany).mockResolvedValue([
      report('rpt-1', '11:30:00'),
      report('rpt-2', '12:00:00'),
    ] as never);

    await alertAdminsOfReport(PATTERN, 'rpt-2', 'Spam');

    expect(prisma.breakReport.findMany).toHaveBeenCalledWith({
      select: { id: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      where: { breakId: PATTERN.breakId, status: 'open' },
    });
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — held back within the hour
  });

  it('looks for an earlier profile or speed report against that profile or record', async () => {
    await alertAdminsOfReport(
      { kind: 'profile', subjectId: 'csubj0000000000000000001', username: 'ghostnotes' },
      'prpt-1',
      'Offensive'
    );
    await alertAdminsOfReport(
      { kind: 'speed', recordId: 'cspd00000000000000000001', title: 'Funky Drummer', bpm: 112 },
      'srpt-1',
      'Wrong speed'
    );

    expect(vi.mocked(prisma.drummerReport.findMany).mock.calls[0][0]?.where).toEqual({
      subjectId: 'csubj0000000000000000001',
      status: 'open',
    });
    expect(vi.mocked(prisma.speedReport.findMany).mock.calls[0][0]?.where).toEqual({
      recordId: 'cspd00000000000000000001',
      status: 'open',
    });
    expect(vi.mocked(sendEmail).mock.calls.map((c) => c[0].subject)).toEqual([
      'Reported: the drummer @ghostnotes',
      'Reported: a speed of 112 bpm on “Funky Drummer”',
    ]);
  });

  it('sends nothing when there is no human admin to tell', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam');

    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nobody to send to
  });

  it('logs an email that was not sent, and returns normally', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ success: false, status: 'disabled' } as never);

    await expect(alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam')).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      'Report alert not sent',
      expect.objectContaining({ kind: 'pattern', reportId: 'rpt-1', status: 'disabled' })
    );
  });

  it('never throws, so a failure here cannot fail the report that was already saved', async () => {
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('db down'));

    await expect(alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam')).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Report alert failed',
      expect.objectContaining({ error: 'db down' })
    );
  });
});

describe('sendsAlert', () => {
  it('two reports in the same instant: exactly one of them emails', () => {
    const reports = [report('rpt-a', '12:00:00'), report('rpt-b', '12:00:00')];

    expect([sendsAlert(reports, 'rpt-a'), sendsAlert(reports, 'rpt-b')]).toEqual([true, false]);
  });

  it('anchors the hour on the last report that emailed, so a report every 50 minutes emails hourly', () => {
    const reports = [
      report('r0', '10:00:00'),
      report('r1', '10:50:00'),
      report('r2', '11:40:00'),
      report('r3', '12:30:00'),
    ];

    expect(reports.map((r) => sendsAlert(reports, r.id))).toEqual([true, false, true, false]);
  });

  it('a report after a dismissed one emails, since only open reports are walked', () => {
    // The dismissed report at 11:50 is not in the open list the query returns.
    expect(sendsAlert([report('rpt-new', '12:00:00')], 'rpt-new')).toBe(true);
  });

  it('a report that is no longer open sends nothing', () => {
    expect(sendsAlert([report('rpt-other', '12:00:00')], 'rpt-gone')).toBe(false);
  });
});
