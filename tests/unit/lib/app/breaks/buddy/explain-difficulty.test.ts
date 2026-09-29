/**
 * `explain_difficulty`: the critic's reading per section and per bar. The
 * critic is real; the database is the fake.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { ExplainDifficultyCapability } from '@/lib/app/breaks/buddy/explain-difficulty';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { critique } from '@/lib/app/breaks/critic';

const DOC = funkPayload();

beforeEach(() => {
  table.current = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

async function run(args: unknown, userId: string | null = 'user-1', doc: unknown = DOC) {
  table.current = fakeWorkspaceTable([{ userId: 'user-1', doc, rev: 2 }]);
  const cap = new ExplainDifficultyCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

describe('explain_difficulty', () => {
  it("gives the critic's score and dimensions, weakest first, for each section", async () => {
    const result = await run({});

    const doc = breakDocFromPayload(DOC);
    const [a, b] = dataOf(result).sections;
    expect([a.section, b.section]).toEqual(['A', 'B']);
    expect(a.score).toBe(critique(doc.A, 94).score);
    const values = a.dimensions.map((d) => d.value);
    expect(values).toEqual([...values].sort((x, y) => x - y));
    expect(a.bars).toHaveLength(doc.A.bars.length);
  });

  it('names the bar that fails on its own, and the kick doubles, by beat', async () => {
    const doc = breakDocFromPayload(DOC);
    const bar = doc.A.bars[1];
    bar.k.fill(0);
    bar.k[0] = bar.k[1] = bar.k[2] = 1; // a triple on the kick
    const result = await run({ section: 'A' }, 'user-1', breakPayload(doc));

    const [section] = dataOf(result).sections;
    expect(section.playable).toBe(false);
    expect(section.bars[0].failing).not.toContain('No triple 16ths on the kick');
    expect(section.bars[1].failing).toContain('No triple 16ths on the kick');
    expect(section.bars[1].doubles).toEqual(
      expect.arrayContaining(['kick beat 1', "kick the 'e' of 1"])
    );
  });

  it("reads only the caller's workspace", async () => {
    const result = await run({}, 'user-2');
    expect(result).toMatchObject({ success: false, error: { code: 'no_workspace' } });
  });
});
