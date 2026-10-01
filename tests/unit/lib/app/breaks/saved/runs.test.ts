/**
 * Runs of your practice sessions (Phase 7D): when you ran one, and the tempo
 * each pattern reached.
 *
 * Prisma is mocked at the module boundary; the schemas it reads and writes
 * through (`runSlotSchema`) are real and are left alone.
 *
 * @see lib/app/breaks/saved/runs.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  prisma: {
    practiceSession: { findFirst: vi.fn() },
    practiceRun: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { APIError, ValidationError } from '@/lib/api/errors';
import { listRuns, recordRun, RUN_DAILY_CAP } from '@/lib/app/breaks/saved/runs';
import { prisma } from '@/lib/db/client';
import type { CreateRunInput } from '@/lib/validations/practice-sessions';

const USER_ID = 'cuser0000000000000000001';
const SESSION_ID = 'csess0000000000000000001';
const RUN_ID = 'crun00000000000000000001';
const NOW = new Date('2026-09-30T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function slot(over: Record<string, unknown> = {}) {
  return {
    title: 'Funky Drummer',
    level: 3,
    targetBpm: 120,
    reachedBpm: 118,
    seconds: 90,
    ...over,
  };
}

function input(over: Partial<CreateRunInput> = {}): CreateRunInput {
  return {
    startedAt: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
    items: [slot()],
    ...over,
  };
}

function runRow(over: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    sessionId: SESSION_ID,
    sessionName: 'Warmup',
    startedAt: new Date(NOW.getTime() - 30 * 60 * 1000),
    endedAt: NOW,
    items: [slot()],
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.practiceRun.count).mockResolvedValue(0);
});

describe('recordRun — ownership', () => {
  it('is null for a session that is not yours, and creates nothing', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);

    expect(await recordRun(USER_ID, SESSION_ID, input(), NOW)).toBeNull();
    expect(prisma.practiceRun.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — not this user's session
  });

  it('looks the session up scoped by id and userId', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);
    await recordRun(USER_ID, SESSION_ID, input(), NOW);
    expect(vi.mocked(prisma.practiceSession.findFirst).mock.calls[0][0]).toMatchObject({
      where: { id: SESSION_ID, userId: USER_ID },
    });
  });
});

describe('recordRun — startedAt window', () => {
  beforeEach(() => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({ name: 'Warmup' } as never);
  });

  it('refuses a startedAt in the future', async () => {
    const future = new Date(NOW.getTime() + 60_000).toISOString();
    const error = await recordRun(USER_ID, SESSION_ID, input({ startedAt: future }), NOW).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(prisma.practiceRun.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('refuses a startedAt more than 24 hours ago', async () => {
    const tooOld = new Date(NOW.getTime() - DAY_MS - 60_000).toISOString();
    const error = await recordRun(USER_ID, SESSION_ID, input({ startedAt: tooOld }), NOW).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(ValidationError);
  });

  it('accepts a startedAt right at the 24-hour boundary', async () => {
    vi.mocked(prisma.practiceRun.create).mockResolvedValue(runRow() as never);
    const atBoundary = new Date(NOW.getTime() - DAY_MS).toISOString();

    await expect(
      recordRun(USER_ID, SESSION_ID, input({ startedAt: atBoundary }), NOW)
    ).resolves.toBeDefined();
  });

  it('accepts a startedAt right now', async () => {
    vi.mocked(prisma.practiceRun.create).mockResolvedValue(runRow() as never);

    await expect(
      recordRun(USER_ID, SESSION_ID, input({ startedAt: NOW.toISOString() }), NOW)
    ).resolves.toBeDefined();
  });
});

describe('recordRun — the daily cap', () => {
  beforeEach(() => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({ name: 'Warmup' } as never);
  });

  it(`refuses with RUN_LIMIT (429) at ${RUN_DAILY_CAP} runs, and creates nothing`, async () => {
    vi.mocked(prisma.practiceRun.count).mockResolvedValue(RUN_DAILY_CAP);

    const error = await recordRun(USER_ID, SESSION_ID, input(), NOW).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ code: 'RUN_LIMIT', status: 429 });
    expect(prisma.practiceRun.create).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('counts over the 24 hours before `now`', async () => {
    vi.mocked(prisma.practiceRun.create).mockResolvedValue(runRow() as never);
    await recordRun(USER_ID, SESSION_ID, input(), NOW);
    expect(vi.mocked(prisma.practiceRun.count).mock.calls[0][0]).toEqual({
      where: { userId: USER_ID, endedAt: { gte: new Date(NOW.getTime() - DAY_MS) } },
    });
  });
});

describe('recordRun — the stored and returned row', () => {
  beforeEach(() => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({
      name: 'Evening practice',
    } as never);
  });

  it("ends the run at the server's `now`, and snapshots the session's name", async () => {
    vi.mocked(prisma.practiceRun.create).mockResolvedValue(
      runRow({ sessionName: 'Evening practice', endedAt: NOW }) as never
    );

    await recordRun(USER_ID, SESSION_ID, input(), NOW);

    expect(vi.mocked(prisma.practiceRun.create).mock.calls[0][0]).toMatchObject({
      data: {
        userId: USER_ID,
        sessionId: SESSION_ID,
        sessionName: 'Evening practice',
        endedAt: NOW,
      },
    });
  });

  it("returns the view's endedAt and sessionName from what create answered", async () => {
    vi.mocked(prisma.practiceRun.create).mockResolvedValue(
      runRow({ sessionName: 'Evening practice', endedAt: NOW }) as never
    );

    const result = await recordRun(USER_ID, SESSION_ID, input(), NOW);

    expect(result?.sessionName).toBe('Evening practice');
    expect(result?.endedAt).toBe(NOW.toISOString());
  });
});

describe('listRuns', () => {
  it('is null for a session that is not yours', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue(null);
    expect(await listRuns(USER_ID, SESSION_ID)).toBeNull();
    expect(prisma.practiceRun.findMany).not.toHaveBeenCalled(); // test-review:accept no_arg_called — not this user's session
  });

  it('queries newest first, scoped by userId and sessionId, up to RUNS_MAX', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({ id: SESSION_ID } as never);
    vi.mocked(prisma.practiceRun.findMany).mockResolvedValue([]);

    await listRuns(USER_ID, SESSION_ID);

    expect(vi.mocked(prisma.practiceRun.findMany).mock.calls[0][0]).toMatchObject({
      where: { userId: USER_ID, sessionId: SESSION_ID },
      orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
  });

  it('reads unparseable stored items as an empty list, rather than failing the whole run', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({ id: SESSION_ID } as never);
    vi.mocked(prisma.practiceRun.findMany).mockResolvedValue([
      runRow({ items: [{ title: 'missing bpm fields' }] }), // fails runSlotSchema
    ] as never);

    const result = await listRuns(USER_ID, SESSION_ID);

    expect(result?.[0].items).toEqual([]);
  });

  it('passes well-formed stored items through unchanged', async () => {
    vi.mocked(prisma.practiceSession.findFirst).mockResolvedValue({ id: SESSION_ID } as never);
    vi.mocked(prisma.practiceRun.findMany).mockResolvedValue([runRow()] as never);

    const result = await listRuns(USER_ID, SESSION_ID);

    expect(result?.[0].items).toEqual([slot()]);
  });
});
