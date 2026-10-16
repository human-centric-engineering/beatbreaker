/**
 * `make_cross_rhythm` (13-c): "make bar 2 a 3:2 fill", "a 5:4 study, snare
 * against kick" — the Studio card's `crossRhythm` on the caller's own
 * workspace. The transform, the critic and the workspace module are real; the
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

import { MakeCrossRhythmCapability } from '@/lib/app/breaks/buddy/make-cross-rhythm';
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
  const cap = new MakeCrossRhythmCapability();
  return cap.execute(cap.validate(args), ctx(userId));
}

const sectionOf = (doc: unknown, s: 'A' | 'B') =>
  breakDocFromPayload(sharePayloadSchema.parse(doc))[s];

describe('make_cross_rhythm', () => {
  it('writes a 5:4 study, snare against kick, the five in the right hand', async () => {
    const result = await run({
      ratio: '5:4',
      cross_lane: 'snare',
      pulse_lane: 'kick',
      cycle: 'bar',
      hand: 'right',
      as: 'study',
    });
    const A = sectionOf(dataOf(result).doc, 'A');
    expect(A.poly).toMatchObject({ ratio: '5:4', cross: ['s'], pulse: ['k'], tuplet: 5 });
    expect(A.poly?.hands).toEqual({ s: 'R' });
    expect(A.tuplets?.every((t) => t.n === 5 && t.span === 16)).toBe(true);
    // B is not touched, and the workspace moved on a revision
    expect(dataOf(result).doc.B).toEqual(DOC.B);
    expect(dataOf(result).rev).toBe(3);
    expect(dataOf(result).summary).toMatch(/^5:4 study: A bar/);
  });

  it('writes a 3:2 fill at the end of the bar named, keeping the groove before it', async () => {
    const before = breakDocFromPayload(DOC).A;
    const result = await run({
      ratio: '3:2',
      cross_lane: 'tom1',
      cycle: 'half',
      hand: 'left',
      as: 'fill',
      bar: 1,
    });
    const A = sectionOf(dataOf(result).doc, 'A');
    expect(A.polySpans?.[0]).toMatchObject({
      bar: 0,
      at: 8,
      span: 8,
      device: 'tuplet',
      hands: { t1: 'L' },
    });
    expect(A.bars[0].h.slice(0, 8)).toEqual(before.bars[0].h.slice(0, 8));
    expect(dataOf(result).changes).toEqual([{ section: 'A', bars: [1] }]);
  });

  it('puts a fill in the last bar when none is named', async () => {
    const result = await run({ ratio: '3:2', cross_lane: 'snare', as: 'fill', cycle: 'half' });
    const A = sectionOf(dataOf(result).doc, 'A');
    expect(A.polySpans?.[0].bar).toBe(A.bars.length - 1);
  });

  it('comes back with the reason when the figure cannot be written, and writes nothing', async () => {
    const result = await run({
      ratio: '2:3',
      cross_lane: 'snare',
      pulse_lane: 'kick',
      cycle: 'half',
      as: 'study',
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/Not written: 3 even notes do not fall on the grid/);
    expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
  });

  it('gives the hand to the pulse when the cross-rhythm is on a foot', async () => {
    const result = await run({
      ratio: '3:2',
      cross_lane: 'kick',
      pulse_lane: 'hat',
      cycle: 'half',
      hand: 'left',
      as: 'study',
    });
    expect(sectionOf(dataOf(result).doc, 'A').poly?.hands).toEqual({ h: 'L' });
  });

  it.each([
    [
      { ratio: '3:2', cross_lane: 'kick', pulse_lane: 'foot', hand: 'right', as: 'study' },
      /no hand to name/,
    ],
    [
      { ratio: '3:2', cross_lane: 'snare', pulse_lane: 'kick', as: 'study', bar: 2 },
      /bar is for a fill/,
    ],
  ])('refuses what it cannot do as asked: %o', async (args, message) => {
    const result = await run(args);
    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(message);
  });

  it('refuses a ratio that is not one', () => {
    const cap = new MakeCrossRhythmCapability();
    expect(() => cap.validate({ ratio: 'three', cross_lane: 'snare', as: 'study' })).toThrow();
  });

  it('needs a signed-in user', async () => {
    const result = await run({ ratio: '3:2', cross_lane: 'snare', as: 'fill' }, null);
    expect(result.success).toBe(false);
  });
});
