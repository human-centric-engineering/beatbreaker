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
    user: { findUnique: vi.fn() },
    // the array-of-promises form the source actually calls, not the callback
    // form — cast past the client's overloaded (and much wider) real type
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

/** Re-typed to the one overload this file exercises, for call-site convenience. */
type FakeTransaction = (ops: Promise<unknown>[]) => Promise<unknown[]>;
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));

import { NotFoundError } from '@/lib/api/errors';
import { moderate } from '@/lib/app/breaks/community/moderation';
import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/send';
import { mockEmailFailure, mockEmailSuccess } from '@/tests/helpers/email';

const BREAK_ID = 'cbrk00000000000000000001';
const ADMIN_ID = 'cadmin00000000000000001';
const OWNER_ID = 'cowner000000000000000001';
const NOW = new Date('2026-09-27T00:00:00Z');

function breakRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BREAK_ID,
    title: 'Cold Carpet',
    userId: OWNER_ID,
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
