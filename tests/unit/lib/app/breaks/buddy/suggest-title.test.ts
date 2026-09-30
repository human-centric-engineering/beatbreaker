/**
 * `suggest_title`: facts about the open pattern's rhythm and placeholder
 * names, for the model to name from. Changes nothing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { SuggestTitleCapability } from '@/lib/app/breaks/buddy/suggest-title';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

const DOC = funkPayload();
let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  table.current = fake;
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

describe('suggest_title', () => {
  it("states the pattern's style, meter and tempo, and gives three word-list names, changing nothing", async () => {
    const cap = new SuggestTitleCapability();
    const result = await cap.execute(cap.validate({}), { userId: 'user-1', agentId: 'agent-1' });

    const label = testStyles().funk.params.label;
    expect(dataOf(result).facts[0]).toBe(`${label}, 4/4, 94 bpm`);
    expect(dataOf(result).facts).toContain('straight');
    expect(dataOf(result).candidates).toHaveLength(3);
    for (const name of dataOf(result).candidates) expect(name).toMatch(/^\S+ .+$/);
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });

  it('gives the same names for the same pattern', async () => {
    const cap = new SuggestTitleCapability();
    const first = await cap.execute({}, { userId: 'user-1', agentId: 'agent-1' });
    const again = await cap.execute({}, { userId: 'user-1', agentId: 'agent-1' });
    expect(dataOf(again).candidates).toEqual(dataOf(first).candidates);
  });
});
