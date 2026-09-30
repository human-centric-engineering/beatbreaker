/**
 * `set_playback`: tempo, swing and layer on the caller's workspace, never the
 * notes. The workspace module is real; the database is the fake.
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

import { SetPlaybackCapability } from '@/lib/app/breaks/buddy/set-playback';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

const DOC = funkPayload();
let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  table.current = fake;
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new SetPlaybackCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

describe('set_playback', () => {
  it('changes only what it is given, and leaves every note alone', async () => {
    const result = await run({ bpm: 120, layer: 3 });

    const after = breakDocFromPayload(sharePayloadSchema.parse(dataOf(result).doc));
    expect(after).toMatchObject({ bpm: 120, level: 3, swing: 0 });
    expect(dataOf(result).doc.A.b).toEqual(DOC.A.b);
    expect(dataOf(result).doc.B.b).toEqual(DOC.B.b);
    expect(dataOf(result).summary).toBe('Playback: 120 bpm, layer 3 (Sixteenths)');
    expect(dataOf(result).changes).toEqual([]);
    expect(fake.rows.get('user-1')?.rev).toBe(3);
  });

  it("refuses a tempo above what the Studio plays in the pattern's meter", async () => {
    const result = await run({ bpm: 250 });

    expect(result).toMatchObject({ success: false, error: { code: 'tempo_out_of_range' } });
    expect(result.error?.message).toBe('The Studio plays 4/4 up to 190 bpm');
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });

  it('rejects a call that names nothing to change, and a layer that does not exist', () => {
    const cap = new SetPlaybackCapability();
    expect(() => cap.validate({})).toThrow();
    expect(() => cap.validate({ layer: 6 })).toThrow();
    expect(() => cap.validate({ bpm: 40 })).toThrow();
  });
});
