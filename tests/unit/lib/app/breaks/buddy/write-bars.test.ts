/**
 * `write_bars`: bars the model wrote in the text notation, replacing bars of a
 * section — and never reaching the workspace when one cannot be played. The
 * notation, the critic, tidy and the workspace module are real; the database
 * is the owner- and rev-honouring fake and the catalogue is the seed data.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { playability } from '@/lib/app/breaks/critic';
import { meterOf, stepsOf } from '@/lib/app/breaks/meter';
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

import { HARD_CHECKS, WriteBarsCapability } from '@/lib/app/breaks/buddy/write-bars';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

const DOC = funkPayload();
let fake: FakeWorkspaceTable;

beforeEach(() => {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc: DOC, rev: 2 }]);
  table.current = fake;
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

async function run(args: unknown, userId: string | null = 'user-1') {
  const cap = new WriteBarsCapability();
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

function decoded(doc: unknown) {
  return breakDocFromPayload(sharePayloadSchema.parse(doc));
}

/** A plain, playable bar of 4/4: 8th hats, backbeat on 2 and 4, kick on 1 and 3. */
const PLAIN = `
        hat    x.x.x.x.x.x.x.x.
        snare  ....S.......S...
        kick   X.......X.......`;

function unchanged() {
  expect(fake.rows.get('user-1')).toMatchObject({ doc: DOC, rev: 2 });
}

describe('write_bars', () => {
  it('replaces the named bar and nothing else, and returns the new document at the next rev', async () => {
    const result = await run({ section: 'A', text: `bar 2${PLAIN}` });

    const before = decoded(DOC);
    const after = decoded(dataOf(result).doc);
    expect(after.A.bars[0]).toEqual(before.A.bars[0]);
    expect(after.A.bars[1].k.join('')).toBe('1000000010000000');
    expect(after.A.bars[1].s.join('')).toBe('0000300000003000');
    expect(after.A.bars[1].h.join('')).toBe('1010101010101010');
    expect(dataOf(result).doc.B).toEqual(DOC.B);
    expect(dataOf(result).rev).toBe(3);
    expect(dataOf(result).changes).toEqual([{ section: 'A', bars: [2] }]);
    expect(dataOf(result).summary).toBe('Wrote A bar 2');
    expect(fake.rows.get('user-1')).toMatchObject({ doc: dataOf(result).doc, rev: 3 });
  });

  it('adds a bar one past the end, and refuses one that would leave a gap', async () => {
    const added = await run({ section: 'A', text: `bar 3${PLAIN}` });
    expect(decoded(dataOf(added).doc).A.bars).toHaveLength(3);

    fake.rows.set('user-1', { userId: 'user-1', doc: DOC, rev: 2 });
    const gap = await run({ section: 'A', text: `bar 4${PLAIN}` });
    expect(gap).toMatchObject({ success: false, error: { code: 'bar_gap' } });
    expect(gap.error?.message).toContain('starting at bar 3');
    unchanged();
  });

  it('refuses a kick that plays three 16ths in a row, naming the bar and the rule, and writes nothing', async () => {
    const result = await run({
      section: 'A',
      text: `bar 1
        hat    x.x.x.x.x.x.x.x.
        snare  ....S.......S...
        kick   XXX.....X.......`,
    });

    expect(result).toMatchObject({ success: false, error: { code: 'unplayable' } });
    expect(result.error?.message).toContain('bar 1: fails "No triple 16ths on the kick"');
    unchanged();
  });

  it('refuses a hi-hat and ride on the same step, naming the beat', async () => {
    const result = await run({
      section: 'A',
      text: `bar 2
        ride   r...............
        hat    x.x.x.x.x.x.x.x.
        snare  ....S.......S...
        kick   X.......X.......`,
    });

    expect(result).toMatchObject({ success: false, error: { code: 'unplayable' } });
    expect(result.error?.message).toMatch(/bar 2, beat 1: removed the (closed hat|ride)/);
    unchanged();
  });

  it('refuses three hands on one step, including a lane the section did not carry before', async () => {
    const result = await run({
      section: 'A',
      text: `bar 1
        hat    x.x.x.x.x.x.x.x.
        tom1   ....X...........
        snare  ....S.......S...
        kick   X.......X.......`,
    });

    expect(result).toMatchObject({ success: false, error: { code: 'unplayable' } });
    expect(result.error?.message).toContain('there are only two hands');
    unchanged();
  });

  it('refuses a bar with no backbeat', async () => {
    const result = await run({
      section: 'A',
      text: `bar 1
        hat    x.x.x.x.x.x.x.x.
        kick   X.......X.......`,
    });

    expect(result.error?.message).toContain('fails "Every bar has a findable backbeat"');
    unchanged();
  });

  it("passes fromText's reason through for notation it cannot read", async () => {
    const result = await run({ section: 'A', text: 'bar 1\n  kick X.X.' });

    expect(result).toMatchObject({ success: false, error: { code: 'bad_notation' } });
    expect(result.error?.message).toContain('4 steps, but a bar of 4/4 has 16');
    unchanged();
  });

  it('adds a lane the writer used to the section, so the notes are on the chart', async () => {
    const result = await run({
      section: 'B',
      text: `bar 1
        hat    x.x.x.x.x.x.x.x.
        snare  ....S.......S...
        floor  ..............X.
        kick   X.......X.......`,
    });

    const after = decoded(dataOf(result).doc).B;
    expect(after.lanes).toContain('t3');
    expect(after.bars[0].t3[14]).toBe(1);
  });

  it('clears the pins of a bar it replaces', async () => {
    const doc = decoded(DOC);
    doc.A.pins = [{ s: new Array(16).fill(4) }, { k: [2, ...new Array(15).fill(0)] }];
    fake.rows.set('user-1', { userId: 'user-1', doc: breakPayload(doc), rev: 2 });

    const result = await run({ section: 'A', text: `bar 2${PLAIN}` });

    const pins = decoded(dataOf(result).doc).A.pins;
    expect(pins?.[0]?.s).toHaveLength(16);
    expect(pins?.[1]).toEqual({});
  });

  it('with whole: true, rewrites the section in a new meter and moves the backbeat to where the bars put it', async () => {
    const steps = stepsOf(meterOf('6/8'));
    const row = (hits: number[], ch: string) =>
      Array.from({ length: steps }, (_, i) => (hits.includes(i) ? ch : '.')).join('');
    const bar = (n: number) => `bar ${n}
        hat    ${row([0, 2, 4, 6, 8, 10], 'x')}
        snare  ${row([6], 'S')}
        kick   ${row([0], 'X')}`;

    const result = await run({
      section: 'A',
      whole: true,
      meter: '6/8',
      text: `${bar(1)}\n${bar(2)}\n${bar(3)}`,
    });

    const after = decoded(dataOf(result).doc).A;
    expect(after.meter).toBe('6/8');
    expect(after.bars).toHaveLength(3);
    expect(after.backbeats).toEqual([6]);
    expect(after.pins).toBeNull();
    expect(playability(after, 94).hard).toBe(true);
  });

  it('refuses a new meter without whole: true', async () => {
    const result = await run({ section: 'A', meter: '3/4', text: `bar 1${PLAIN}` });

    expect(result).toMatchObject({ success: false, error: { code: 'meter_mismatch' } });
    unchanged();
  });

  it('refuses a whole section that skips a bar number', async () => {
    const result = await run({ section: 'A', whole: true, text: `bar 1${PLAIN}\nbar 3${PLAIN}` });

    expect(result).toMatchObject({ success: false, error: { code: 'bar_gap' } });
    unchanged();
  });

  it("HARD_CHECKS points at the critic's hard rules other than hat-and-ride", () => {
    const labels = playability(decoded(DOC).A, 94).checks.map((c) => c.label);
    expect([...HARD_CHECKS].map((i) => labels[i])).toEqual([
      'No triple 16ths on the kick',
      'Snare never runs four 16ths without a break',
      'Every bar has a findable backbeat',
      'At least a quarter of every bar is air',
    ]);
  });
});
