/**
 * `generate_pattern`: a new A and derived B from a catalogue style, replacing
 * the caller's workspace. The generator, the critic and the workspace module
 * are real; the catalogue is the seed data.
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

import { GeneratePatternCapability } from '@/lib/app/breaks/buddy/generate-pattern';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { critique, generateGood, playability } from '@/lib/app/breaks/critic';
import { deriveB } from '@/lib/app/breaks/generate';
import { resolveLanes } from '@/lib/app/breaks/pattern';
import { styleIn } from '@/lib/app/breaks/styles';
import { testStyle } from '@/tests/helpers/catalogue';

const DOC = funkPayload();
let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  table.current = fake;
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new GeneratePatternCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

describe('generate_pattern', () => {
  it('writes exactly what the Studio’s generator writes for the same style, seed and settings', async () => {
    const result = await run({ style: 'bossa', seed: 77, bars: 2 });

    const bossa = testStyle('bossa');
    const meter = bossa.params.meter ?? '4/4';
    const roster = resolveLanes(styleIn(bossa.params, meter), null);
    const after = breakDocFromPayload(sharePayloadSchema.parse(dataOf(result).doc));
    const expected = generateGood(
      { style: bossa, seed: 77, meter, bars: 2, density: 55, ghosts: 60, ...roster },
      after.bpm
    ).pattern;

    expect(after.A.bars).toEqual(expected.bars);
    expect(after.B.bars).toEqual(deriveB(expected, bossa.params).bars);
    expect(after.A.style).toBe('bossa');
    expect(after.swing).toBe(bossa.params.swing);
    expect(dataOf(result).changes.map((c) => c.section)).toEqual(['A', 'B']);
    expect(fake.rows.get('user-1')?.rev).toBe(3);
  });

  it("keeps the tempo when it suits the style and moves it into the style's range when it does not", async () => {
    const funk = testStyle('funk').params.bpm;
    const kept = await run({ style: 'funk', seed: 1 });
    expect(kept.data?.doc.bpm).toBe(94);
    // precondition: 94 bpm is inside funk's range, so keeping it is the right call
    expect(94 >= funk[0] && 94 <= funk[1]).toBe(true);

    const slow = testStyles();
    const out = Object.values(slow).find((s) => 94 < s.params.bpm[0] || 94 > s.params.bpm[1]);
    if (!out) throw new Error('fixture: every style suits 94 bpm');
    const moved = await run({ style: out.key, seed: 1 });
    const [lo, hi] = out.params.bpm;
    expect(moved.data?.doc.bpm).toBe(Math.round((lo + hi) / 2));
  });

  it('writes a playable funk pattern through the rejection sampler', async () => {
    const result = await run({ style: 'funk', seed: 5 });
    const after = breakDocFromPayload(sharePayloadSchema.parse(dataOf(result).doc));
    expect(playability(after.A, after.bpm).hard).toBe(true);
    expect(critique(after.A, after.bpm).score).toBeGreaterThan(0);
  });

  it('refuses a style that is not in the catalogue, naming list_styles, and writes nothing', async () => {
    const result = await run({ style: 'polka-core' });

    expect(result).toMatchObject({ success: false, error: { code: 'unknown_style' } });
    expect(result.error?.message).toContain('list_styles');
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });

  it('writes the same pattern on a retried write, since the seed is drawn once', async () => {
    const original = fake.findUnique;
    let reads = 0;
    fake.findUnique = async (q) => {
      const row = await original(q);
      if (reads++ === 0) {
        const current = fake.rows.get('user-1');
        if (current) current.rev += 1;
      }
      return row;
    };
    const random = vi.spyOn(Math, 'random');

    const result = await run({ style: 'funk' });

    expect(reads).toBe(2);
    expect(random).toHaveBeenCalledTimes(1);
    expect(dataOf(result).rev).toBe(4);
    random.mockRestore();
  });
});
