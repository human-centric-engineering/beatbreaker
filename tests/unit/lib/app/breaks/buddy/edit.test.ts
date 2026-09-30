/**
 * `editWorkspace`: the read → change → validate → conditional write every
 * mutating BeatBuddy tool goes through, and the retry Spike B called for when
 * two tool calls in one batch race. The workspace module is real; the database
 * is the owner- and rev-honouring fake.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeWorkspaceTable, funkPayload, type FakeWorkspaceTable } from '@/tests/helpers/buddy';
import { testStyles } from '@/tests/helpers/catalogue';

const table = vi.hoisted(() => ({ current: null as FakeWorkspaceTable | null }));

vi.mock('@/lib/db/client', () => ({
  prisma: {
    get buddyWorkspace() {
      return table.current;
    },
  },
}));
vi.mock('@/lib/app/breaks/catalogue/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/app/breaks/catalogue/data')>()),
  listStyles: vi.fn(),
}));

import { WRITE_ATTEMPTS, barsSummary, editWorkspace } from '@/lib/app/breaks/buddy/edit';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

const DOC = funkPayload();
let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  table.current = fake;
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

/** Every read lands another write first, so every write from the read's rev loses. */
function alwaysRaced(): { reads: () => number } {
  const original = fake.findUnique;
  let n = 0;
  fake.findUnique = async (q) => {
    const row = await original(q);
    n++;
    const current = fake.rows.get('user-1');
    if (current) current.rev += 1;
    return row;
  };
  return { reads: () => n };
}

describe('editWorkspace', () => {
  it('writes the changed document at the next rev and returns before, after and the payload', async () => {
    const outcome = await editWorkspace('user-1', (doc) => ({
      ok: true,
      doc: { ...doc, bpm: 101 },
      extra: 'x',
    }));

    expect(outcome).toMatchObject({ ok: true, rev: 3, extra: 'x' });
    if (!outcome.ok) throw new Error('expected ok');
    expect(outcome.before.bpm).toBe(94);
    expect(outcome.after.bpm).toBe(101);
    expect(outcome.payload.bpm).toBe(101);
    expect(fake.rows.get('user-1')).toMatchObject({ doc: outcome.payload, rev: 3 });
  });

  it('hands the edit the live catalogue style by key', async () => {
    let seen: string | undefined;
    await editWorkspace('user-1', (doc, { style }) => {
      seen = style(doc.A.style)?.key;
      return { ok: true, doc, extra: null };
    });
    expect(seen).toBe('funk');
  });

  it('gives up after WRITE_ATTEMPTS lost races, leaving the other writer’s document', async () => {
    const race = alwaysRaced();
    const edit = vi.fn((doc) => ({ ok: true as const, doc: { ...doc, bpm: 150 }, extra: null }));

    const outcome = await editWorkspace('user-1', edit);

    expect(outcome).toMatchObject({ ok: false, code: 'workspace_changed' });
    expect(race.reads()).toBe(WRITE_ATTEMPTS);
    expect(edit).toHaveBeenCalledTimes(WRITE_ATTEMPTS);
    expect(fake.rows.get('user-1')?.doc).toEqual(DOC);
  });

  it('writes nothing when the edit refuses, and passes its reason through', async () => {
    const outcome = await editWorkspace('user-1', () => ({
      ok: false,
      message: 'no',
      code: 'nope',
    }));

    expect(outcome).toEqual({ ok: false, message: 'no', code: 'nope' });
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });

  it('refuses a result the wire format rejects, without writing it', async () => {
    const outcome = await editWorkspace('user-1', (doc) => ({
      ok: true,
      doc: { ...doc, bpm: 9000 },
      extra: null,
    }));

    expect(outcome).toMatchObject({ ok: false, code: 'invalid_result' });
    expect(fake.rows.get('user-1')?.rev).toBe(2);
  });

  it("reads only the caller's own workspace: another user has none", async () => {
    const edit = vi.fn();
    const outcome = await editWorkspace('user-2', edit);

    expect(outcome).toMatchObject({ ok: false, code: 'no_workspace' });
    expect(edit).not.toHaveBeenCalled();
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });
});

describe('barsSummary', () => {
  it('names the bars per section and says when a section had nothing to change', () => {
    expect(
      barsSummary([
        { section: 'A', bars: [1, 2] },
        { section: 'B', bars: [] },
      ])
    ).toBe('A bars 1, 2; nothing to change in B');
    expect(barsSummary([{ section: 'B', bars: [3] }])).toBe('B bar 3');
  });
});
