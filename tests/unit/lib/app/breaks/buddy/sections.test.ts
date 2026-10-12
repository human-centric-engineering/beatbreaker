/**
 * BeatBuddy's tools on sections A to Z (11-e-ii): every tool's schema names
 * the new letters, and each tool does the right thing on a break that has a C.
 * The tools, the critic, tidy, the doctor and the workspace module are real;
 * the database is the owner- and rev-honouring fake, the catalogue the seed data.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { SECTION_LETTERS } from '@/lib/app/breaks/sections';
import { type BreakDoc, breakDocFromPayload, breakPayload } from '@/lib/app/breaks/share';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { clonePattern, resolveLanes } from '@/lib/app/breaks/pattern';
import { styleIn } from '@/lib/app/breaks/styles';
import { buddyStreamRequestSchema } from '@/lib/validations/buddy';
import {
  dataOf,
  fakeWorkspaceTable,
  funkPayload,
  type FakeWorkspaceTable,
} from '@/tests/helpers/buddy';
import { testStyle, testStyles } from '@/tests/helpers/catalogue';

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

import { notesKey } from '@/lib/app/breaks/buddy/apply';
import { ApplyDoctorMoveCapability } from '@/lib/app/breaks/buddy/apply-doctor-move';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { SECTION_CHOICES, changedBars, sectionsFor } from '@/lib/app/breaks/buddy/describe';
import { describeEdit } from '@/lib/app/breaks/buddy/edit';
import { ExplainDifficultyCapability } from '@/lib/app/breaks/buddy/explain-difficulty';
import { GeneratePatternCapability } from '@/lib/app/breaks/buddy/generate-pattern';
import { GetPatternCapability } from '@/lib/app/breaks/buddy/get-pattern';
import { TidyPatternCapability } from '@/lib/app/breaks/buddy/tidy-pattern';
import { WriteBarsCapability } from '@/lib/app/breaks/buddy/write-bars';
import type { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';

/** A funk break with a C (a copy of A) played last: A A B A C. */
function abcPayload(): SharePayload {
  const doc = breakDocFromPayload(funkPayload());
  return breakPayload({ ...doc, C: clonePattern(doc.A), arrangement: ['A', 'A', 'B', 'A', 'C'] });
}

/** A, B, C and D of eight bars each: 32 bars, the most a break holds. */
function fullPayload(): SharePayload {
  const funk = testStyle('funk');
  const roster = resolveLanes(styleIn(funk.params, '4/4'), null);
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    bars: 8,
    density: 55,
    ghosts: 60,
    seed: 7,
    lanes: roster.lanes,
    perc: roster.perc,
  });
  return breakPayload({
    bpm: 94,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B', 'C', 'D'],
    A,
    B: deriveB(A, funk.params),
    C: clonePattern(A),
    D: clonePattern(A),
  });
}

/** One plain, playable bar of 4/4. */
const PLAIN = `
        hat    x.x.x.x.x.x.x.x.
        snare  ....S.......S...
        kick   X.......X.......`;

let fake: FakeWorkspaceTable;

function seed(doc: SharePayload): void {
  fake = fakeWorkspaceTable([{ userId: 'user-1', doc, rev: 2 }]);
  table.current = fake;
}

function decoded(doc: unknown): BreakDoc {
  return breakDocFromPayload(sharePayloadSchema.parse(doc));
}

async function runCap<A, D>(
  cap: BaseCapability<A, D>,
  args: unknown,
  userId: string | null = 'user-1'
) {
  return cap.execute(cap.validate(args), { userId, agentId: 'agent-1' });
}

beforeEach(() => {
  seed(abcPayload());
  vi.mocked(listStyles).mockResolvedValue(Object.values(testStyles()));
});

describe('tool schemas', () => {
  const sectionEnum = (cap: BaseCapability<never, unknown>): unknown => {
    const props = cap.functionDefinition.parameters.properties as Record<
      string,
      { enum?: unknown }
    >;
    return props.section.enum;
  };

  it.each([
    ['apply_doctor_move', new ApplyDoctorMoveCapability(), { move: 'ghosts-' }],
    ['tidy_pattern', new TidyPatternCapability(), {}],
    ['explain_difficulty', new ExplainDifficultyCapability(), {}],
  ] as const)('%s offers C, Z, all and both, and validates C', (_name, cap, base) => {
    const choices = sectionEnum(cap as unknown as BaseCapability<never, unknown>) as string[];
    expect(choices).toEqual(expect.arrayContaining(['A', 'C', 'Z', 'all', 'both']));
    expect(choices).toEqual([...SECTION_CHOICES]);
    expect(
      (cap as BaseCapability<{ section: string }, unknown>).validate({ ...base, section: 'C' })
        .section
    ).toBe('C');
  });

  it('write_bars offers every letter A to Z, and not all', () => {
    const cap = new WriteBarsCapability();
    const choices = sectionEnum(cap as unknown as BaseCapability<never, unknown>) as string[];
    expect(choices).toEqual([...SECTION_LETTERS]);
    expect(choices).toContain('C');
    expect(choices).toContain('Z');
    expect(choices).not.toContain('all');
    expect(cap.validate({ section: 'Z', text: `bar 1${PLAIN}` }).section).toBe('Z');
  });

  it('rejects a letter outside A to Z and a lower-case one', () => {
    const cap = new WriteBarsCapability();
    expect(() => cap.validate({ section: 'a', text: 'x' })).toThrow();
    expect(() => cap.validate({ section: 'AA', text: 'x' })).toThrow();
    expect(() => new TidyPatternCapability().validate({ section: '1' })).toThrow();
  });

  it('defaults differ by tool: tidy and explain to all, the doctor to A', () => {
    expect(new TidyPatternCapability().validate({}).section).toBe('all');
    expect(new ExplainDifficultyCapability().validate({}).section).toBe('all');
    expect(new ApplyDoctorMoveCapability().validate({ move: 'ghosts-' }).section).toBe('A');
  });

  it('the stream request accepts section C and Z, and refuses a lower-case letter', () => {
    const base = { message: 'hi', doc: funkPayload() };
    expect(buddyStreamRequestSchema.safeParse({ ...base, section: 'C' }).success).toBe(true);
    expect(buddyStreamRequestSchema.safeParse({ ...base, section: 'Z' }).success).toBe(true);
    expect(buddyStreamRequestSchema.safeParse({ ...base, section: 'c' }).success).toBe(false);
  });
});

describe('sectionsFor', () => {
  const abc = decoded(abcPayload());

  it('all and both name every section the break has, in letter order', () => {
    expect(sectionsFor(abc, 'all')).toEqual({ ok: true, sections: ['A', 'B', 'C'] });
    expect(sectionsFor(abc, 'both')).toEqual({ ok: true, sections: ['A', 'B', 'C'] });
  });

  it('all on a two-section break is A and B only', () => {
    expect(sectionsFor(decoded(funkPayload()), 'all')).toEqual({ ok: true, sections: ['A', 'B'] });
  });

  it('a letter the break has names just that section', () => {
    expect(sectionsFor(abc, 'C')).toEqual({ ok: true, sections: ['C'] });
  });

  it('a letter the break lacks is no_section, naming what it does have', () => {
    const got = sectionsFor(abc, 'D');
    expect(got).toMatchObject({ ok: false, code: 'no_section' });
    expect(got.ok === false && got.message).toContain('A, B, C');
  });
});

describe('changedBars and describeEdit', () => {
  it('a section that was not there before is every bar changed', () => {
    const doc = decoded(abcPayload());
    expect(changedBars(undefined, doc.C!)).toEqual([1, 2]);
  });

  it('describeEdit skips a section the after document no longer has', () => {
    const before = decoded(abcPayload());
    const after = decoded(funkPayload());
    const out = describeEdit(before, after, ['A', 'C']);
    expect(out.changes.map((c) => c.section)).not.toContain('C');
  });
});

describe('get_pattern', () => {
  it('lists C beside A and B, and the arrangement that plays it', async () => {
    const data = dataOf(await runCap(new GetPatternCapability(), {}));
    expect(data.sections.map((s) => s.section)).toEqual(['A', 'B', 'C']);
    expect(data.arrangement).toEqual(['A', 'A', 'B', 'A', 'C']);
    const c = data.sections[2];
    expect(c.bars).toBe(2);
    expect(c.text).toContain('C');
  });
});

describe('tidy_pattern', () => {
  it('all reports on C too, and the default is all', async () => {
    const a = decoded(abcPayload());
    // a ride beside a hat on one step is tidy's to remove — put one in C only
    const c = clonePattern(a.C!);
    if (!c.lanes.includes('r')) c.lanes = [...c.lanes, 'r'];
    c.bars[0].r = c.bars[0].r.map((_, i) => (i === 0 ? 1 : 0));
    c.bars[0].h = c.bars[0].h.map((_, i) => (i === 0 ? 1 : 0));
    seed(breakPayload({ ...a, C: c }));

    const data = dataOf(await runCap(new TidyPatternCapability(), {}));
    expect(data.notes.some((n) => n.startsWith('C: '))).toBe(true);
    expect(data.changes.map((x) => x.section)).toContain('C');
    const after = decoded(data.doc);
    expect(after.C!.bars[0].r[0] && after.C!.bars[0].h[0]).toBeFalsy();
  });

  it('a lone letter the break lacks is no_section and writes nothing', async () => {
    const before = fake.rows.get('user-1')!.doc;
    const result = await runCap(new TidyPatternCapability(), { section: 'D' });
    expect(result).toMatchObject({ success: false, error: { code: 'no_section' } });
    expect(fake.rows.get('user-1')).toMatchObject({ doc: before, rev: 2 });
  });
});

describe('apply_doctor_move', () => {
  it('on C changes C and leaves A and B as they were', async () => {
    const before = abcPayload();
    const result = await runCap(new ApplyDoctorMoveCapability(), {
      move: 'ghosts-',
      section: 'C',
    });

    const data = dataOf(result);
    expect(data.changes.map((c) => c.section)).toEqual(['C']);
    expect(data.doc.A).toEqual(before.A);
    expect(data.doc.B).toEqual(before.B);
    expect(data.doc.C).not.toEqual(before.C);
    expect(data.doc.arr).toEqual(['A', 'A', 'B', 'A', 'C']);
  });

  it('all reaches C as well as A and B', async () => {
    const data = dataOf(
      await runCap(new ApplyDoctorMoveCapability(), { move: 'ghosts-', section: 'all' })
    );
    expect(data.changes.map((c) => c.section)).toEqual(['A', 'B', 'C']);
  });

  it('a letter the break lacks is no_section', async () => {
    const result = await runCap(new ApplyDoctorMoveCapability(), {
      move: 'ghosts-',
      section: 'E',
    });
    expect(result).toMatchObject({ success: false, error: { code: 'no_section' } });
  });
});

describe('explain_difficulty', () => {
  it('all explains C; C alone explains only C', async () => {
    const all = dataOf(await runCap(new ExplainDifficultyCapability(), {}));
    expect(all.sections.map((s) => s.section)).toEqual(['A', 'B', 'C']);
    const one = dataOf(await runCap(new ExplainDifficultyCapability(), { section: 'C' }));
    expect(one.sections.map((s) => s.section)).toEqual(['C']);
    expect(one.sections[0].bars).toHaveLength(2);
  });

  it('a missing letter errors no_section', async () => {
    const result = await runCap(new ExplainDifficultyCapability(), { section: 'D' });
    expect(result).toMatchObject({ success: false, error: { code: 'no_section' } });
    expect(result.error?.message).toContain('no section D');
  });
});

describe('write_bars adding a section', () => {
  it("adds C whole, in the break's style, and plays it once at the end of the arrangement", async () => {
    seed(funkPayload());
    const before = funkPayload();
    const result = await runCap(new WriteBarsCapability(), {
      section: 'C',
      whole: true,
      text: `bar 1${PLAIN}\nbar 2${PLAIN}\nbar 3${PLAIN}`,
    });

    const data = dataOf(result);
    const after = decoded(data.doc);
    expect(after.C!.bars).toHaveLength(3);
    expect(after.C!.style).toBe(decoded(before).A.style);
    expect(after.C!.bars[0].k.join('')).toBe('1000000010000000');
    expect(data.doc.arr).toEqual([...(before.arr ?? []), 'C']);
    expect(data.doc.A).toEqual(before.A);
    expect(data.doc.B).toEqual(before.B);
    expect(data.summary).toBe('Added section C: 3 bars');
    expect(data.rev).toBe(3);
  });

  it('refuses a new letter without whole, naming the way to add it, and writes nothing', async () => {
    seed(funkPayload());
    const result = await runCap(new WriteBarsCapability(), {
      section: 'C',
      text: `bar 1${PLAIN}`,
    });
    expect(result).toMatchObject({ success: false, error: { code: 'no_section' } });
    expect(result.error?.message).toContain('whole: true');
    expect(fake.rows.get('user-1')).toMatchObject({ doc: funkPayload(), rev: 2 });
  });

  it('writing an existing C again does not add a second arrangement slot', async () => {
    const data = dataOf(
      await runCap(new WriteBarsCapability(), { section: 'C', text: `bar 2${PLAIN}` })
    );
    expect(data.doc.arr).toEqual(['A', 'A', 'B', 'A', 'C']);
    expect(data.summary).not.toContain('Added');
    expect(data.changes).toEqual([{ section: 'C', bars: [2] }]);
  });

  it('refuses a section that would take the break past 32 bars, and writes nothing', async () => {
    seed(fullPayload());
    const result = await runCap(new WriteBarsCapability(), {
      section: 'E',
      whole: true,
      text: `bar 1${PLAIN}`,
    });
    expect(result).toMatchObject({ success: false, error: { code: 'too_many_bars' } });
    expect(result.error?.message).toContain('33');
    expect(fake.rows.get('user-1')).toMatchObject({ doc: fullPayload(), rev: 2 });
  });

  it('still lets a full break rewrite a section it has at the same size', async () => {
    seed(fullPayload());
    const text = Array.from({ length: 8 }, (_, i) => `bar ${i + 1}${PLAIN}`).join('\n');
    const result = await runCap(new WriteBarsCapability(), { section: 'D', whole: true, text });
    expect(result.success).toBe(true);
  });

  it('adds only the next letter, as the Studio does, and writes nothing otherwise', async () => {
    seed(funkPayload());
    const result = await runCap(new WriteBarsCapability(), {
      section: 'Q',
      whole: true,
      text: `bar 1${PLAIN}`,
    });
    expect(result).toMatchObject({ success: false, error: { code: 'not_next_section' } });
    expect(result.error?.message).toContain('The next new section is C');
    expect(fake.rows.get('user-1')).toMatchObject({ doc: funkPayload(), rev: 2 });
  });

  it('brings the tempo down to the ceiling of a slower meter it adds, and says so', async () => {
    const funk = testStyle('funk');
    const A = generatePattern({
      style: funk,
      meter: '12/8',
      bars: 2,
      density: 55,
      ghosts: 0,
      seed: 3,
    });
    // 12/8 runs to 300; a section in 4/4 holds the break to 190
    seed(
      breakPayload({ bpm: 280, swing: 0, level: 5, arrangement: ['A', 'B'], A, B: clonePattern(A) })
    );
    const data = dataOf(
      await runCap(new WriteBarsCapability(), {
        section: 'C',
        whole: true,
        meter: '4/4',
        text: `bar 1${PLAIN}`,
      })
    );
    expect(data.doc.bpm).toBe(190);
    expect(decoded(data.doc).C!.meter).toBe('4/4');
    expect(data.summary).toBe('Added section C: 1 bar; tempo down to 190 bpm, the top of 4/4');
  });

  it('leaves a tempo the new section can play at alone', async () => {
    seed(funkPayload());
    const data = dataOf(
      await runCap(new WriteBarsCapability(), {
        section: 'C',
        whole: true,
        meter: '3/4',
        text: `bar 1
        hat    x.x.x.x.x.x.
        snare  ....S.......
        kick   X.......X...`,
      })
    );
    expect(data.doc.bpm).toBe(funkPayload().bpm);
    expect(data.summary).toBe('Added section C: 1 bar');
  });

  it('does not grow an arrangement that is already 16 slots', async () => {
    const doc = decoded(funkPayload());
    seed(breakPayload({ ...doc, arrangement: Array.from({ length: 16 }, () => 'A' as const) }));
    const data = dataOf(
      await runCap(new WriteBarsCapability(), {
        section: 'C',
        whole: true,
        text: `bar 1${PLAIN}`,
      })
    );
    expect(data.doc.arr).toHaveLength(16);
    expect(decoded(data.doc).C).toBeDefined();
  });
});

describe('generate_pattern', () => {
  it('drops C and the arrangement slots that played it', async () => {
    const result = await runCap(new GeneratePatternCapability(), { style: 'funk', seed: 5 });
    const data = dataOf(result);
    expect(data.doc.C).toBeUndefined();
    expect(data.doc.arr).toEqual(['A', 'A', 'B', 'A']);
    expect(decoded(data.doc).C).toBeUndefined();
    expect(data.doc.ver).toBeLessThan(6);
  });
});

describe('notesKey', () => {
  it('differs when only C changes, and not when only the tempo does', () => {
    const base = abcPayload();
    const edited = decoded(base);
    const c = clonePattern(edited.C!);
    c.bars[0].k = c.bars[0].k.map((v, i) => (i === 3 ? (v ? 0 : 1) : v));
    const changed = breakPayload({ ...edited, C: c });

    expect(notesKey(changed)).not.toBe(notesKey(base));
    expect(notesKey({ ...base, bpm: 120 })).toBe(notesKey(base));
  });
});

describe('a section at a tempo ratio (11-e-ii-g)', () => {
  /** A funk break of A and B, B at the ratio given. */
  function ratioPayload(bpm: number, r: 0.5 | 2): SharePayload {
    const doc = breakDocFromPayload(funkPayload());
    return breakPayload({ ...doc, bpm, B: { ...doc.B, tempoRatio: r } });
  }

  it('get_pattern reports the ratio, and heads the section with the tempo it plays at', async () => {
    seed(ratioPayload(90, 2));
    const data = dataOf(await runCap(new GetPatternCapability(), {}));
    const [a, b] = data.sections;
    expect(a).not.toHaveProperty('tempoRatio');
    expect(b.tempoRatio).toBe(2);
    expect(a.text).toContain('90 bpm');
    expect(b.text).toContain('180 bpm');
  });

  it('write_bars keeps the ratio of a section it rewrites, and adds a new one at the break tempo', async () => {
    seed(ratioPayload(90, 2));
    const rewrote = decoded(
      dataOf(await runCap(new WriteBarsCapability(), { section: 'B', text: `bar 1${PLAIN}` })).doc
    );
    expect(rewrote.B.tempoRatio).toBe(2);

    seed(
      breakPayload({
        ...decoded(ratioPayload(90, 2)),
        A: { ...decoded(ratioPayload(90, 2)).A, tempoRatio: 0.5 },
      })
    );
    const added = decoded(
      dataOf(
        await runCap(new WriteBarsCapability(), {
          section: 'C',
          whole: true,
          text: `bar 1${PLAIN}`,
        })
      ).doc
    );
    expect(added.C).not.toHaveProperty('tempoRatio');
  });

  it("write_bars holds the tempo to a ratio's ceiling, and names the ratio", async () => {
    // B at ×2 in 4/4 holds the break to 95, rewritten whole or bar by bar
    seed(ratioPayload(95, 2));
    const data = dataOf(
      await runCap(new WriteBarsCapability(), {
        section: 'B',
        whole: true,
        meter: '4/4',
        text: `bar 1${PLAIN}`,
      })
    );
    expect(data.doc.bpm).toBe(95);
    seed(ratioPayload(150, 2));
    const slowed = dataOf(
      await runCap(new WriteBarsCapability(), { section: 'B', text: `bar 1${PLAIN}` })
    );
    expect(slowed.doc.bpm).toBe(95);
    expect(slowed.summary).toContain('tempo down to 95 bpm, the top of 4/4 at ×2');
  });
});
