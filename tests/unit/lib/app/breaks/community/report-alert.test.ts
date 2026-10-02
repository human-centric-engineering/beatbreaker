/**
 * Telling the admins that something was reported (Phase 8, task 8.4).
 *
 * The email itself is mocked at `sendEmail`; what matters here is who gets
 * it, when it is held back (a report of the same thing in the hour before),
 * and that nothing here can make filing a report fail.
 *
 * @see lib/app/breaks/community/report-alert.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    breakReport: { count: vi.fn() },
    drummerReport: { count: vi.fn() },
    speedReport: { count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { alertAdminsOfReport } from '@/lib/app/breaks/community/report-alert';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';
import { logger } from '@/lib/logging';

const NOW = new Date('2026-10-02T12:00:00Z');
const PATTERN = {
  kind: 'pattern',
  breakId: 'cbrk00000000000000000001',
  title: 'Cold Sweat',
} as const;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.breakReport.count).mockResolvedValue(0);
  vi.mocked(prisma.drummerReport.count).mockResolvedValue(0);
  vi.mocked(prisma.speedReport.count).mockResolvedValue(0);
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { email: 'one@example.com' },
    { email: 'two@example.com' },
  ] as never);
  vi.mocked(sendEmail).mockResolvedValue({ success: true, status: 'sent' } as never);
});

describe('alertAdminsOfReport', () => {
  it('emails every human admin once, naming what was reported and why, with the queue’s address', async () => {
    await alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam', NOW);

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

  it('sends nothing when the same pattern was reported in the hour before, by anyone', async () => {
    vi.mocked(prisma.breakReport.count).mockResolvedValue(1);

    await alertAdminsOfReport(PATTERN, 'rpt-2', 'Spam', NOW);

    expect(prisma.breakReport.count).toHaveBeenCalledWith({
      where: {
        id: { not: 'rpt-2' },
        createdAt: { gte: new Date('2026-10-02T11:00:00Z') },
        breakId: PATTERN.breakId,
      },
    });
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — held back within the hour
  });

  it('looks for an earlier profile or speed report against that profile or record', async () => {
    await alertAdminsOfReport(
      { kind: 'profile', subjectId: 'csubj0000000000000000001', username: 'ghostnotes' },
      'prpt-1',
      'Offensive',
      NOW
    );
    await alertAdminsOfReport(
      { kind: 'speed', recordId: 'cspd00000000000000000001', title: 'Funky Drummer', bpm: 112 },
      'srpt-1',
      'Wrong speed',
      NOW
    );

    expect(vi.mocked(prisma.drummerReport.count).mock.calls[0][0]?.where).toMatchObject({
      subjectId: 'csubj0000000000000000001',
    });
    expect(vi.mocked(prisma.speedReport.count).mock.calls[0][0]?.where).toMatchObject({
      recordId: 'cspd00000000000000000001',
    });
    expect(vi.mocked(sendEmail).mock.calls.map((c) => c[0].subject)).toEqual([
      'Reported: the drummer @ghostnotes',
      'Reported: a speed of 112 bpm on “Funky Drummer”',
    ]);
  });

  it('sends nothing when there is no human admin to tell', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam', NOW);

    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nobody to send to
  });

  it('logs an email that was not sent, and returns normally', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ success: false, status: 'disabled' } as never);

    await expect(alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam', NOW)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      'Report alert not sent',
      expect.objectContaining({ kind: 'pattern', reportId: 'rpt-1', status: 'disabled' })
    );
  });

  it('never throws, so a failure here cannot fail the report that was already saved', async () => {
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('db down'));

    await expect(alertAdminsOfReport(PATTERN, 'rpt-1', 'Spam', NOW)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Report alert failed',
      expect.objectContaining({ error: 'db down' })
    );
  });
});
