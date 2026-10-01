/**
 * What a moderator can do about a reported pattern (Phase 6, task 6.11):
 * dismiss, strip links, or unpublish and email the owner.
 *
 * Prisma is mocked at the module boundary; `$transaction` here is the
 * array-of-promises form the source actually calls (`prisma.$transaction([a,
 * b])`), not the callback form — the mock runs both and waits on them, the
 * same as the real client. `sendEmail` is mocked at its own module boundary,
 * per `tests/helpers/email.ts`.
 *
 * @see lib/app/breaks/community/moderation.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    break: { findUnique: vi.fn(), update: vi.fn() },
    breakReport: { updateMany: vi.fn() },
    drummerReport: { findFirst: vi.fn(), updateMany: vi.fn() },
    drummerAbout: { updateMany: vi.fn() },
    speedRecord: { findUnique: vi.fn(), update: vi.fn() },
    speedReport: { updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    // the array-of-promises form the source actually calls, not the callback
    // form — cast past the client's overloaded (and much wider) real type
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

/** Re-typed to the one overload this file exercises, for call-site convenience. */
type FakeTransaction = (ops: Promise<unknown>[]) => Promise<unknown[]>;
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
// what decides whether a record is on a table has its own tests (speed-tables.test.ts)
vi.mock('@/lib/app/breaks/community/speed-tables', () => ({ tabledRecord: vi.fn() }));

import { NotFoundError } from '@/lib/api/errors';
import { moderate, moderateProfile, moderateSpeed } from '@/lib/app/breaks/community/moderation';
import { tabledRecord } from '@/lib/app/breaks/community/speed-tables';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { mockEmailFailure, mockEmailSuccess } from '@/tests/helpers/email';

const BREAK_ID = 'cbrk00000000000000000001';
const ADMIN_ID = 'cadmin00000000000000001';
const OWNER_ID = 'cowner000000000000000001';
const SUBJECT_ID = 'csubj0000000000000000001';
const NOW = new Date('2026-09-27T00:00:00Z');

function breakRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BREAK_ID,
    title: 'Cold Carpet',
    userId: OWNER_ID,
    visibility: 'published',
    reports: [{ reason: 'bad-link' }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction as unknown as FakeTransaction).mockImplementation((ops) =>
    Promise.all(ops)
  );
  vi.mocked(prisma.break.findUnique).mockResolvedValue(breakRow() as never);
  vi.mocked(prisma.breakReport.updateMany).mockResolvedValue({ count: 2 });
  vi.mocked(prisma.break.update).mockResolvedValue({} as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'owner@example.com' } as never);
  mockEmailSuccess(vi.mocked(sendEmail));
});

it('404s a break that no longer exists', async () => {
  vi.mocked(prisma.break.findUnique).mockResolvedValue(null);

  await expect(moderate(BREAK_ID, 'dismiss', ADMIN_ID, NOW)).rejects.toBeInstanceOf(NotFoundError);
  expect(prisma.breakReport.updateMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to moderate
});

describe('dismiss', () => {
  it('closes the open reports as dismissed and leaves the pattern untouched', async () => {
    const result = await moderate(BREAK_ID, 'dismiss', ADMIN_ID, NOW);

    expect(result).toEqual({
      breakId: BREAK_ID,
      title: 'Cold Carpet',
      action: 'dismiss',
      reportsClosed: 2,
    });
    expect(prisma.breakReport.updateMany).toHaveBeenCalledWith({
      where: { breakId: BREAK_ID, status: 'open' },
      data: { status: 'dismissed', resolvedById: ADMIN_ID, resolvedAt: NOW },
    });
    expect(prisma.break.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — dismiss changes no break column
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — dismiss never emails anyone
  });
});

describe('strip-links', () => {
  it('clears the links and actions only the open bad-link reports', async () => {
    const result = await moderate(BREAK_ID, 'strip-links', ADMIN_ID, NOW);

    expect(result.reportsClosed).toBe(2);
    expect(prisma.break.update).toHaveBeenCalledWith({
      where: { id: BREAK_ID },
      data: { links: [] },
    });
    expect(prisma.breakReport.updateMany).toHaveBeenCalledWith({
      where: { breakId: BREAK_ID, status: 'open', reason: 'bad-link' },
      data: { status: 'actioned', resolvedById: ADMIN_ID, resolvedAt: NOW },
    });
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — links stay published, nobody is emailed
  });
});

describe('unpublish', () => {
  it('emails nobody when the owner had already made it private — there is nothing to tell', async () => {
    vi.mocked(prisma.break.findUnique).mockResolvedValue(
      breakRow({ visibility: 'private' }) as never
    );
    const result = await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);
    expect(result.reportsClosed).toBe(2);
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — no change, no email
  });

  it('emails nobody when a second moderator got there first and closed nothing', async () => {
    vi.mocked(prisma.breakReport.updateMany).mockResolvedValue({ count: 0 });
    await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — the first moderator's email is the only one
  });

  it("names the oldest open report's reason", async () => {
    await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);
    const select = vi.mocked(prisma.break.findUnique).mock.calls[0]?.[0]?.select as {
      reports: { orderBy: unknown; take: number };
    };
    expect(select.reports).toMatchObject({ orderBy: { createdAt: 'asc' }, take: 1 });
  });

  it('makes the pattern private, actions every open report, and emails the owner naming the reason', async () => {
    const result = await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);

    expect(result).toEqual({
      breakId: BREAK_ID,
      title: 'Cold Carpet',
      action: 'unpublish',
      reportsClosed: 2,
    });
    expect(prisma.break.update).toHaveBeenCalledWith({
      where: { id: BREAK_ID },
      data: { visibility: 'private' },
    });
    expect(prisma.breakReport.updateMany).toHaveBeenCalledWith({
      where: { breakId: BREAK_ID, status: 'open' },
      data: { status: 'actioned', resolvedById: ADMIN_ID, resolvedAt: NOW },
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.to).toBe('owner@example.com');
    expect(call.subject).toContain('Cold Carpet');
    // the label read back through REPORT_REASON_LABELS, lower-cased — not the raw stored code
    expect((call.react as unknown as { props: { title: string; reason: string } }).props).toEqual({
      title: 'Cold Carpet',
      reason: 'bad or misleading link',
    });
  });

  it('reads the email after the write — a failed email must not leave the pattern public', async () => {
    // the write itself is asserted above; here the ORDER matters: if the
    // email were sent first and only then the write ran, a moderator would
    // have no way to tell "unpublished" from "email sent, write pending"
    let writeHappenedBeforeEmail = false;
    vi.mocked(prisma.$transaction as unknown as FakeTransaction).mockImplementation(async (ops) => {
      const out = await Promise.all(ops);
      writeHappenedBeforeEmail = true;
      return out;
    });
    vi.mocked(sendEmail).mockImplementation(async () => {
      expect(writeHappenedBeforeEmail).toBe(true);
      return { success: true, status: 'sent', id: 'e1' };
    });

    await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('does not throw, and still reports the moderation as done, when the email fails to send', async () => {
    mockEmailFailure(vi.mocked(sendEmail), 'Resend is down');

    const result = await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);

    expect(result.reportsClosed).toBe(2);
    expect(prisma.break.update).toHaveBeenCalledWith({
      where: { id: BREAK_ID },
      data: { visibility: 'private' },
    });
  });

  it('sends no email when the owner has no email on record', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null } as never);

    await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);

    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nowhere to send it
  });

  it('sends no email when the owner row itself is gone', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);

    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nobody to email
  });

  it('falls back to a generic reason when the pattern had no open report to read one from', async () => {
    vi.mocked(prisma.break.findUnique).mockResolvedValue(breakRow({ reports: [] }) as never);

    await moderate(BREAK_ID, 'unpublish', ADMIN_ID, NOW);

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect((call.react as unknown as { props: { reason: string } }).props.reason).toBe('a report');
  });
});

describe('moderateProfile', () => {
  beforeEach(() => {
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue({ id: 'pr1' } as never);
    vi.mocked(prisma.drummerReport.updateMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.drummerAbout.updateMany).mockResolvedValue({ count: 1 });
  });

  it('404s a profile with no reports on it at all', async () => {
    vi.mocked(prisma.drummerReport.findFirst).mockResolvedValue(null);

    await expect(moderateProfile(SUBJECT_ID, 'dismiss', ADMIN_ID, NOW)).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(prisma.drummerReport.updateMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to moderate
  });

  describe('dismiss', () => {
    it('closes every open report and touches nothing else', async () => {
      const result = await moderateProfile(SUBJECT_ID, 'dismiss', ADMIN_ID, NOW);

      expect(result).toEqual({ subjectId: SUBJECT_ID, action: 'dismiss', reportsClosed: 2 });
      expect(prisma.drummerReport.updateMany).toHaveBeenCalledWith({
        where: { subjectId: SUBJECT_ID, status: 'open' },
        data: { status: 'dismissed', resolvedById: ADMIN_ID, resolvedAt: NOW },
      });
      expect(prisma.drummerAbout.updateMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — dismiss changes no profile field
    });
  });

  describe('strip-links', () => {
    it('clears the channels and closes only the open bad-link reports', async () => {
      const result = await moderateProfile(SUBJECT_ID, 'strip-links', ADMIN_ID, NOW);

      expect(result.reportsClosed).toBe(2);
      expect(prisma.drummerAbout.updateMany).toHaveBeenCalledWith({
        where: { userId: SUBJECT_ID },
        data: { channels: [] },
      });
      expect(prisma.drummerReport.updateMany).toHaveBeenCalledWith({
        where: { subjectId: SUBJECT_ID, status: 'open', reason: 'bad-link' },
        data: { status: 'actioned', resolvedById: ADMIN_ID, resolvedAt: NOW },
      });
    });
  });
});

describe('moderateSpeed (7C)', () => {
  const RECORD_ID = 'cspd00000000000000000001';

  function recordRow(overrides: Record<string, unknown> = {}) {
    return {
      userId: OWNER_ID,
      level: 2,
      bpm: 180,
      titleSnapshot: 'Old name',
      breakRef: { title: 'Cold Carpet' },
      libraryEntry: null,
      reports: [{ reason: 'wrong-speed' }],
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(prisma.speedRecord.findUnique).mockResolvedValue(recordRow() as never);
    vi.mocked(prisma.speedRecord.update).mockResolvedValue({} as never);
    vi.mocked(prisma.speedReport.updateMany).mockResolvedValue({ count: 2 });
    vi.mocked(tabledRecord).mockResolvedValue({ id: RECORD_ID, userId: OWNER_ID });
  });

  it('404s a record that no longer exists', async () => {
    vi.mocked(prisma.speedRecord.findUnique).mockResolvedValue(null);
    await expect(moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('dismiss closes the open reports as dismissed and changes nothing else', async () => {
    const result = await moderateSpeed(RECORD_ID, 'dismiss', ADMIN_ID, NOW);

    expect(result).toEqual({ recordId: RECORD_ID, action: 'dismiss', reportsClosed: 2 });
    expect(prisma.speedReport.updateMany).toHaveBeenCalledWith({
      where: { recordId: RECORD_ID, status: 'open' },
      data: { status: 'dismissed', resolvedById: ADMIN_ID, resolvedAt: NOW },
    });
    expect(prisma.speedRecord.update).not.toHaveBeenCalled(); // test-review:accept no_arg_called — dismiss moves nothing
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nobody to tell
  });

  it('unlist takes it off the table, closes the reports as actioned, and emails the drummer the reason', async () => {
    const result = await moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW);

    expect(result).toEqual({ recordId: RECORD_ID, action: 'unlist', reportsClosed: 2 });
    expect(prisma.speedRecord.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: { listed: false },
    });
    expect(prisma.speedReport.updateMany).toHaveBeenCalledWith({
      where: { recordId: RECORD_ID, status: 'open' },
      data: { status: 'actioned', resolvedById: ADMIN_ID, resolvedAt: NOW },
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toBe('owner@example.com');
    expect(email.subject).toBe('Your 180 bpm on “Cold Carpet” was taken off its table');
    expect(email.react.props).toEqual({
      title: 'Cold Carpet',
      bpm: 180,
      level: 2,
      reason: "speed doesn't look right",
    });
  });

  it('names a record whose pattern has gone by its snapshot title', async () => {
    vi.mocked(prisma.speedRecord.findUnique).mockResolvedValue(
      recordRow({ breakRef: null }) as never
    );
    await moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW);
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toContain('“Old name”');
  });

  it('emails nobody when the record was on no table — unlisted, its pattern unpublished, or its notes changed', async () => {
    vi.mocked(tabledRecord).mockResolvedValue(null);
    const result = await moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW);

    // still unlisted, and its reports still closed
    expect(result.reportsClosed).toBe(2);
    expect(prisma.speedRecord.update).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
      data: { listed: false },
    });
    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — it was on no table
  });

  it('asks whether it is on a table before taking it off', async () => {
    const order: string[] = [];
    vi.mocked(tabledRecord).mockImplementation(async () => {
      order.push('check');
      return { id: RECORD_ID, userId: OWNER_ID };
    });
    vi.mocked(prisma.speedRecord.update).mockImplementation((() => {
      order.push('unlist');
      return Promise.resolve({});
    }) as never);

    await moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW);

    expect(tabledRecord).toHaveBeenCalledWith(RECORD_ID);
    expect(order).toEqual(['check', 'unlist']);
  });

  it('emails nobody when a second moderator closed nothing', async () => {
    vi.mocked(prisma.speedReport.updateMany).mockResolvedValue({ count: 0 });
    await moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW);

    expect(sendEmail).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing newly unlisted
  });

  it('still unlists when the email fails, and says so in the log rather than throwing', async () => {
    mockEmailFailure(vi.mocked(sendEmail));
    await expect(moderateSpeed(RECORD_ID, 'unlist', ADMIN_ID, NOW)).resolves.toMatchObject({
      reportsClosed: 2,
    });
    expect(prisma.speedRecord.update).toHaveBeenCalled();
  });
});
