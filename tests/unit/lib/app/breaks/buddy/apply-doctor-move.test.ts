/**
 * `apply_doctor_move`: one of the doctor's named edits on the caller's own
 * workspace. The doctor, the critic and the workspace module are real; the
 * database is an owner-honouring fake and the catalogue is the seed data.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import {
  dataOf,
  fakeWorkspaceTable,
  funkPayload,
  type FakeWorkspaceTable,
} from '@/tests/helpers/buddy';
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

import { ApplyDoctorMoveCapability } from '@/lib/app/breaks/buddy/apply-doctor-move';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

const DOC = funkPayload();
const ctx = (userId: string | null) => ({ userId, agentId: 'agent-1' });

let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  table.current = fake;
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new ApplyDoctorMoveCapability();
  return cap.execute(cap.validate(args), ctx(userId));
}

/** Ghost notes are snare value 1. */
function ghosts(doc: unknown, section: 'A' | 'B'): number {
  const pat = breakDocFromPayload(sharePayloadSchema.parse(doc))[section];
  return pat.bars.reduce((n, b) => n + b.s.filter((v) => v === 1).length, 0);
}

describe('apply_doctor_move', () => {
  it('strips the ghosts from A only, writes the workspace and returns the new document and revision', async () => {
    expect(ghosts(DOC, 'A')).toBeGreaterThan(0);

    const result = await run({ move: 'ghosts-', section: 'A' });
    expect(ghosts(dataOf(result).doc, 'A')).toBe(0);
    expect(dataOf(result).doc.B).toEqual(DOC.B);
    expect(dataOf(result).rev).toBe(3);
    expect(fake.rows.get('user-1')).toMatchObject({ doc: dataOf(result).doc, rev: 3 });
    expect(sharePayloadSchema.safeParse(dataOf(result).doc).success).toBe(true);
  });

  it('names the bars it changed and says so in the summary', async () => {
    const result = await run({ move: 'ghosts-', section: 'A' });
    const before = breakDocFromPayload(DOC).A;
    const expected = before.bars.flatMap((b, i) => (b.s.includes(1) ? [i + 1] : []));
    expect(dataOf(result).changes).toEqual([{ section: 'A', bars: expected }]);
    expect(dataOf(result).summary).toMatch(/^Strip ghosts: A bar/);
    expect(dataOf(result).sections.map((s) => s.section)).toEqual(['A']);
  });

  it('applies to both sections when asked', async () => {
    const result = await run({ move: 'ghosts-', section: 'both' });
    expect(ghosts(dataOf(result).doc, 'A')).toBe(0);
    expect(ghosts(dataOf(result).doc, 'B')).toBe(0);
    expect(dataOf(result).changes.map((c) => c.section)).toEqual(['A', 'B']);
  });

  it('reports a move that found nothing to change rather than claiming one', async () => {
    await run({ move: 'ghosts-', section: 'A' });

    const again = await run({ move: 'ghosts-', section: 'A' });
    expect(dataOf(again).changes).toEqual([{ section: 'A', bars: [] }]);
    expect(dataOf(again).summary).toBe('Strip ghosts: nothing to change in A');
  });

  it("never touches another user's workspace — a second user gets no_workspace and the first is unchanged", async () => {
    const result = await run({ move: 'ghosts-', section: 'A' }, 'user-2');

    expect(result).toMatchObject({ success: false, error: { code: 'no_workspace' } });
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });

  it('refuses when the workspace changed after it was read, leaving the newer document', async () => {
    const newer = { ...DOC, bpm: 120 };
    /* The read sees rev 2; a manual edit lands before the write. */
    const original = fake.findUnique;
    fake.findUnique = async (q) => {
      const row = await original(q);
      fake.rows.set('user-1', { userId: 'user-1', doc: newer, rev: 3 });
      return row;
    };

    const result = await run({ move: 'ghosts-', section: 'A' });

    expect(result).toMatchObject({ success: false, error: { code: 'workspace_changed' } });
    expect(fake.rows.get('user-1')).toMatchObject({ doc: newer, rev: 3 });
  });

  it('refuses to doctor a section whose style is no longer in the catalogue', async () => {
    vi.mocked(listStyles).mockResolvedValue([]);

    const result = await run({ move: 'ghosts+', section: 'A' });

    expect(result).toMatchObject({ success: false, error: { code: 'style_missing' } });
    expect(fake.rows.get('user-1')?.rev).toBe(2);
  });

  it('rejects a move that is not one of the twelve', () => {
    expect(() => new ApplyDoctorMoveCapability().validate({ move: 'shred' })).toThrow();
  });

  it('refuses without a user rather than reading anything', async () => {
    const result = await run({ move: 'ghosts-' }, null);

    expect(result).toMatchObject({ success: false, error: { code: 'no_user' } });
  });

  it('advertises the same twelve moves the schema accepts, and no user parameter', () => {
    const def = new ApplyDoctorMoveCapability().functionDefinition;
    const props = (def.parameters as { properties: Record<string, { enum?: string[] }> })
      .properties;

    expect(Object.keys(props).sort()).toEqual(['move', 'section']);
    expect(props.move.enum).toHaveLength(12);
  });
});
