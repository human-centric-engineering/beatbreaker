/**
 * BeatBuddy's workspace: one row per person, read and written only by the id
 * the caller passes — which every caller takes from the session or
 * `CapabilityContext.userId` — and written only if nobody got there first.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeWorkspaceTable, funkPayload, type FakeWorkspaceTable } from '@/tests/helpers/buddy';

const table = vi.hoisted(() => ({ current: null as FakeWorkspaceTable | null }));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    get buddyWorkspace() {
      return table.current;
    },
  },
}));
vi.mock('@/lib/logging', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { openWorkspace, readWorkspace, writeWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { logger } from '@/lib/logging';

const DOC = funkPayload();

let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 3 }]);
  table.current = fake;
  vi.mocked(logger.warn).mockClear();
});

describe('readWorkspace', () => {
  it('returns the document and revision of the person asked about', async () => {
    const ws = await readWorkspace('user-1');

    expect(ws?.rev).toBe(3);
    expect(ws?.doc).toEqual(DOC);
  });

  it("never returns another person's workspace — a second user with none reads null", async () => {
    expect(await readWorkspace('user-2')).toBeNull();
  });

  it('reads a row that no longer parses as no workspace, and says so in the log', async () => {
    fake.rows.set('user-3', { userId: 'user-3', doc: { ver: 4, A: 'nonsense' }, rev: 0 });

    expect(await readWorkspace('user-3')).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('does not parse'),
      expect.objectContaining({ userId: 'user-3' })
    );
  });
});

describe('writeWorkspace', () => {
  it('writes at the current revision and returns the next one', async () => {
    const next = { ...DOC, bpm: 120 };

    const written = await writeWorkspace('user-1', next, 3);

    expect(written).toEqual({ doc: next, rev: 4 });
    expect(fake.rows.get('user-1')).toMatchObject({ doc: next, rev: 4 });
  });

  it('refuses a write that names a stale revision, leaving the winner in place', async () => {
    const winner = { ...DOC, bpm: 110 };
    await writeWorkspace('user-1', winner, 3);

    const loser = await writeWorkspace('user-1', { ...DOC, bpm: 70 }, 3);

    expect(loser).toBeNull();
    expect(fake.rows.get('user-1')).toMatchObject({ doc: winner, rev: 4 });
  });

  it("cannot write another person's row — the second user's write at the first user's revision lands nowhere", async () => {
    const written = await writeWorkspace('user-2', { ...DOC, bpm: 70 }, 3);

    expect(written).toBeNull();
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 3 });
    expect(fake.rows.has('user-2')).toBe(false);
  });
});

describe('openWorkspace', () => {
  it("creates a first-timer's workspace at revision 0", async () => {
    const opened = await openWorkspace('user-2', DOC);

    expect(opened).toEqual({ doc: DOC, rev: 0 });
    expect(fake.rows.get('user-2')).toMatchObject({ doc: DOC, rev: 0 });
  });

  it('replaces whatever was there and moves the revision on, so an older rev can no longer write', async () => {
    const onScreen = { ...DOC, bpm: 132 };

    const opened = await openWorkspace('user-1', onScreen);

    expect(opened).toEqual({ doc: onScreen, rev: 4 });
    expect(await writeWorkspace('user-1', DOC, 3)).toBeNull();
    expect(fake.rows.get('user-1')).toMatchObject({ doc: onScreen, rev: 4 });
  });

  it("leaves another person's workspace alone", async () => {
    await openWorkspace('user-2', { ...DOC, bpm: 70 });

    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 3 });
  });
});
