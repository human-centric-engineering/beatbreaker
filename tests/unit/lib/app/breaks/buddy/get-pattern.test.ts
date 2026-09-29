/**
 * `get_pattern`: the caller's own open pattern as text, with the critic's
 * reading. The domain functions and the workspace module are real; the
 * database is an owner-honouring fake and the catalogue is the seed data.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { critique, playability } from '@/lib/app/breaks/critic';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { toText } from '@/lib/app/breaks/text';
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

import { GetPatternCapability } from '@/lib/app/breaks/buddy/get-pattern';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

const DOC = funkPayload();
const ctx = (userId: string | null) => ({ userId, agentId: 'agent-1' });

beforeEach(() => {
  table.current = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 7 }]);
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

describe('get_pattern', () => {
  it('returns each section as the lane-string text, with the critic reading it at the doc tempo', async () => {
    const cap = new GetPatternCapability();

    const result = await cap.execute(cap.validate({}), ctx('user-1'));
    const doc = breakDocFromPayload(DOC);
    expect(result.data).toMatchObject({
      rev: 7,
      bpm: 94,
      swing: 0,
      layer: 5,
      arrangement: ['A', 'A', 'B', 'A'],
    });
    expect(dataOf(result).sections.map((s) => s.section)).toEqual(['A', 'B']);
    const [a] = dataOf(result).sections;
    expect(a.text).toBe(toText(doc.A, { section: 'A', bpm: 94, swing: 0 }));
    expect(a.critic.score).toBe(critique(doc.A, 94).score);
    expect(a.critic.playable).toBe(playability(doc.A, 94).hard);
    expect(a.text).toMatch(/^A · funk · 4\/4 · 94 bpm/);
  });

  it("does not read another user's workspace — a second user gets no_workspace", async () => {
    const cap = new GetPatternCapability();

    const result = await cap.execute(cap.validate({}), ctx('user-2'));

    expect(result).toEqual({
      success: false,
      error: { code: 'no_workspace', message: expect.any(String) },
    });
  });

  it('ignores a user id in the arguments — the schema drops it and the context decides', async () => {
    const cap = new GetPatternCapability();

    const args = cap.validate({ userId: 'user-1' });
    const result = await cap.execute(args, ctx('user-2'));

    expect(args).toEqual({});
    expect(result.success).toBe(false);
  });

  it('refuses without a user rather than reading anything', async () => {
    const cap = new GetPatternCapability();

    const result = await cap.execute({}, ctx(null));

    expect(result).toMatchObject({ success: false, error: { code: 'no_user' } });
  });

  it('advertises no parameters, so a model has nothing to name a user with', () => {
    expect(new GetPatternCapability().functionDefinition.parameters).toEqual({
      type: 'object',
      properties: {},
    });
  });
});
