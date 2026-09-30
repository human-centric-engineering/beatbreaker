/**
 * `tidy_pattern`: `tidy()` on the caller's workspace, every change reported.
 * tidy and the workspace module are real; the database is the owner- and
 * rev-honouring fake.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { breakDocFromPayload, breakPayload } from '@/lib/app/breaks/share';
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

import { TidyPatternCapability } from '@/lib/app/breaks/buddy/tidy-pattern';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

let fake: FakeWorkspaceTable;

beforeEach(() => {
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

function withWorkspace(doc: unknown) {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc, rev: 2 }]);
  table.current = fake;
}

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new TidyPatternCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

/** The funk fixture with a ghost planted right beside an accent in A bar 1. */
function messyPayload() {
  const doc = breakDocFromPayload(funkPayload());
  const s = doc.A.bars[0].s;
  s.fill(0);
  s[4] = 3;
  s[5] = 1;
  s[12] = 3;
  return breakPayload(doc);
}

describe('tidy_pattern', () => {
  it('removes a ghost beside an accent, reports it in a line, and writes the tidied document', async () => {
    withWorkspace(messyPayload());

    const result = await run({ section: 'A' });

    const after = breakDocFromPayload(sharePayloadSchema.parse(dataOf(result).doc));
    expect(after.A.bars[0].s[5]).toBe(0);
    expect(dataOf(result).notes).toContain(
      "A: bar 1, the 'e' of 2: removed the ghost — a ghost right beside an accent is lost under it"
    );
    expect(dataOf(result).changes).toEqual([{ section: 'A', bars: [1] }]);
    expect(dataOf(result).summary).toMatch(/^Tidy: \d+ changes? \(A bar 1\)$/);
    expect(fake.rows.get('user-1')).toMatchObject({ doc: dataOf(result).doc, rev: 3 });
  });

  it('changes nothing on a tidy pattern and says so', async () => {
    withWorkspace(messyPayload());
    await run({});

    const again = await run({});
    expect(dataOf(again).notes).toEqual([]);
    expect(dataOf(again).summary).toBe('Tidy: nothing to tidy');
    expect(dataOf(again).changes).toEqual([
      { section: 'A', bars: [] },
      { section: 'B', bars: [] },
    ]);
  });

  it("never reaches another user's workspace", async () => {
    withWorkspace(messyPayload());
    const result = await run({}, 'user-2');

    expect(result).toMatchObject({ success: false, error: { code: 'no_workspace' } });
    expect(fake.rows.get('user-1')?.rev).toBe(2);
  });
});
