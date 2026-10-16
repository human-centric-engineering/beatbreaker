/**
 * Doubles (Phase 13-a): two 32nds in one step, a span of two over one step
 * of the grid. A closed roll is written so: the chart draws each as one note
 * with a slash through its stem, the hand written on the step plays both, the
 * editor makes one from a note and gives the note back, and MIDI import reads
 * a pair as a double rather than rounding it into one cell.
 */

import { describe, expect, it } from 'vitest';

import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import { groupsOf, meterOf, stepSeconds } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { performStep } from '@/lib/app/breaks/perform';
import { toText } from '@/lib/app/breaks/text';
import { FLAM, TOM_FLAM } from '@/lib/app/breaks/lanes';
import {
  addDouble,
  joinDoubles,
  removeTuplet,
  tupletHands,
  tupletStrokes,
  tupletValue,
  twoAStep,
  unornamented,
} from '@/lib/app/breaks/tuplets';
import type { Bar, Pattern, TupletSpan } from '@/lib/app/breaks/types';

function pattern(over: Partial<Pattern> = {}, bars: Bar[] = [emptyBar(16)]): Pattern {
  return {
    name: 'doubles',
    style: 'rudiment',
    styleVersionId: null,
    attrs: {},
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['s'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars,
    ...over,
  };
}

const double = (start: number, notes: [number, number] = [2, 2]): TupletSpan => ({
  bar: 0,
  start,
  span: 1,
  n: 2,
  notes: { s: notes },
});

/** A closed five-stroke roll into beat 2: RR LL on the & and a of 1, the accent R on 2. */
function fiveStroke(): Pattern {
  const bar = emptyBar(16);
  bar.s[4] = 3;
  return pattern({ tuplets: [double(2), double(3)], sticking: ['..RLR...........'] }, [bar]);
}

/** Every SVG node an engraving draws, flattened. */
function flat(nodes: SvgNode[]): SvgNode[] {
  return nodes.flatMap((n) => [n, ...flat(n.children ?? [])]);
}

describe('what a double is', () => {
  it('is two to a step, written as 32nds with no bracket', () => {
    expect(twoAStep({ span: 1, n: 2 })).toBe(true);
    expect(twoAStep({ span: 4, n: 8 })).toBe(true);
    expect(twoAStep({ span: 4, n: 5 })).toBe(false);
    expect(tupletValue({ span: 1, n: 2 })).toEqual({ steps: 0.5, bracket: false });
  });
});

describe('the hands', () => {
  it('play both notes of a step with the hand written on it', () => {
    const pat = fiveStroke();
    const [rr, ll] = pat.tuplets ?? [];
    expect([0, 1].map((j) => tupletHands(pat, rr, j).s)).toEqual(['R', 'R']);
    expect([0, 1].map((j) => tupletHands(pat, ll, j).s)).toEqual(['L', 'L']);
    expect(tupletStrokes(pat, 0).map((s) => `${s.pos}${s.hand}`)).toEqual([
      '2R',
      '2.5R',
      '3L',
      '3.5L',
    ]);
  });

  it('go hand to hand where nothing is written: two 32nd singles', () => {
    const pat = fiveStroke();
    delete pat.sticking;
    expect([0, 1].map((j) => tupletHands(pat, double(2), j).s)).toEqual(['R', 'L']);
  });

  it('follow a change to the sticking, not a remembered answer', () => {
    const pat = fiveStroke();
    expect(tupletStrokes(pat, 0)[0].hand).toBe('R');
    const swapped = { ...pat, sticking: ['..LRL...........'] };
    expect(tupletStrokes(swapped, 0)[0].hand).toBe('L');
  });

  it('a lane that names its hand keeps it (D60)', () => {
    const pat = fiveStroke();
    pat.poly = {
      device: 'cross-rhythm',
      ratio: '3:2',
      pulse: ['k'],
      cross: ['s'],
      beat: 4,
      count: 3,
      hands: { s: 'L' },
    };
    expect(tupletHands(pat, double(2), 0).s).toBe('L');
  });
});

describe('playing them', () => {
  it('sounds each 32nd at its place, half a step apart', () => {
    const pat = fiveStroke();
    const dur = stepSeconds(meterOf('4/4'), 80);
    const at: number[] = [];
    pat.bars[0].s.forEach((_, i) => {
      for (const v of performStep(pat, pat.bars[0], i, { bpm: 80, swing: 0, feel: 0, hats: 100 }))
        at.push((i + v.offset) * dur);
    });
    expect(at.map((t) => Math.round((t / dur) * 2) / 2)).toEqual([2, 2.5, 3, 3.5, 4]);
  });
});

describe('the chart', () => {
  it('writes each double as one note with a slash, and its hands twice', () => {
    const e = engrave(fiveStroke(), null, { scale: 1, perSystem: 1, sticking: true });
    const nodes = flat(e.nodes);
    // a slash is a filled path on each of the two stems; nothing numbered
    const slashes = nodes.filter((n) => n.tag === 'path' && n.attrs.d.toString().endsWith('Z'));
    expect(slashes).toHaveLength(2);
    const text = nodes.filter((n) => n.text !== undefined).map((n) => n.text);
    expect(text).not.toContain('2');
    expect(text).toEqual(expect.arrayContaining(['RR', 'LL', 'R']));
  });

  it('draws a double that would be longer than a sixteenth as the 32nds it is', () => {
    // a double alone in its beat: a slash on an eighth would mean sixteenths
    const pat = pattern({ tuplets: [double(0)] });
    const nodes = flat(engrave(pat, null, { scale: 1, perSystem: 1 }).nodes);
    const slashes = nodes.filter((n) => n.tag === 'path' && n.attrs.d.toString().endsWith('Z'));
    expect(slashes).toHaveLength(0);
  });

  it('does not slash a stem another note of the voice shares: the kick is played once', () => {
    const pat = fiveStroke();
    pat.bars[0].k[2] = 1;
    const nodes = flat(engrave(pat, null, { scale: 1, perSystem: 1 }).nodes);
    const slashes = nodes.filter((n) => n.tag === 'path' && n.attrs.d.toString().endsWith('Z'));
    // the double on 3 is still slashed; the one over the kick on 2 is drawn as its 32nds
    expect(slashes).toHaveLength(1);
  });

  it('draws two unlike notes as two 32nds, not a double', () => {
    const bar = emptyBar(16);
    bar.s[1] = 2;
    const pat = pattern({ tuplets: [double(0, [3, 1])] }, [bar]);
    const nodes = flat(engrave(pat, null, { scale: 1, perSystem: 1 }).nodes);
    expect(nodes.filter((n) => n.tag === 'path' && n.attrs.d.toString().endsWith('Z'))).toEqual([]);
  });
});

describe('writing one by hand', () => {
  it('doubles a note into two of itself, and undoing it gives the note back', () => {
    const bar = emptyBar(16);
    bar.s[2] = 3;
    const pat = pattern({}, [bar]);
    expect(addDouble(pat, 0, 's', 2)).toBe(true);
    expect(pat.tuplets).toEqual([double(2, [3, 3])]);
    expect(pat.bars[0].s[2]).toBe(0);
    // a step already doubled is not doubled again
    expect(addDouble(pat, 0, 's', 2)).toBe(false);

    expect(removeTuplet(pat, 0, 's', 2)).toBe(true);
    expect(pat.tuplets).toBeUndefined();
    expect(pat.bars[0].s[2]).toBe(3);
  });

  it('doubles an empty step into two empty notes', () => {
    const pat = pattern();
    expect(addDouble(pat, 0, 's', 5)).toBe(true);
    expect(pat.tuplets).toEqual([double(5, [0, 0])]);
  });

  it('keeps a flam on the first stroke only: a flam and a tap, not two flams', () => {
    const bar = emptyBar(16);
    bar.s[2] = FLAM;
    const pat = pattern({}, [bar]);
    addDouble(pat, 0, 's', 2);
    expect(pat.tuplets?.[0].notes.s).toEqual([FLAM, 2]);
    expect(unornamented('t1', TOM_FLAM)).toBe(1);
    expect(unornamented('s', 3)).toBe(3);
  });

  it('joins doubles side by side in a beat into one span, and undoes one step of it', () => {
    const bar = emptyBar(16);
    for (const i of [0, 1, 2, 3, 4]) bar.s[i] = 2;
    const pat = pattern({}, [bar]);
    for (const i of [0, 1, 2, 3, 4]) expect(addDouble(pat, 0, 's', i)).toBe(true);
    // a beat's four are one span of eight; the next beat's is its own
    expect(pat.tuplets?.map((t) => [t.start, t.span, t.n])).toEqual([
      [0, 4, 8],
      [4, 1, 2],
    ]);
    expect(removeTuplet(pat, 0, 's', 1)).toBe(true);
    expect(pat.bars[0].s[1]).toBe(2);
    expect(pat.tuplets?.map((t) => [t.start, t.span])).toEqual([
      [0, 1],
      [2, 2],
      [4, 1],
    ]);
  });

  it('keeps a long run within the most a span holds: six in a sextuplet beat are two spans', () => {
    const spans = joinDoubles(
      [0, 1, 2, 3, 4, 5].map((i) => double(i)),
      () => groupsOf(meterOf('4/4-6'))
    );
    expect(spans.map((t) => [t.start, t.n])).toEqual([
      [0, 6],
      [3, 6],
    ]);
  });
});

describe('MIDI', () => {
  const roundTrip = (pat: Pattern) => {
    const bytes = buildMidi([{ pattern: pat, barIdx: 0 }], {
      bpm: 80,
      swing: 0,
      feel: 0,
      hats: 100,
    }).bytes;
    const r = readMidi(new Uint8Array(bytes));
    if (!r.ok) throw new Error(r.error);
    return r.pattern;
  };

  it('a closed roll comes back as its doubles, not rounded into sixteenths', () => {
    const back = roundTrip(fiveStroke());
    // the two doubles side by side in the beat come back as one span
    expect(back.tuplets).toEqual([{ bar: 0, start: 2, span: 2, n: 4, notes: { s: [2, 2, 2, 2] } }]);
    expect(back.bars[0].s[4]).toBe(3);
    expect(back.notes.join(' ')).toMatch(/2 steps have two notes in a sixteenth, read as doubles/);
  });

  it('a beat of doubles is one span of eight', () => {
    const pat = pattern({ tuplets: [0, 1, 2, 3].map((i) => double(i)) });
    pat.bars[0].s[4] = 3;
    expect(roundTrip(pat).tuplets).toEqual([
      { bar: 0, start: 0, span: 4, n: 8, notes: { s: [2, 2, 2, 2, 2, 2, 2, 2] } },
    ]);
  });

  it('a run of 32nds with lone ones is read whole, not rounded onto its neighbours', () => {
    // 32nds on 0, ½, 1½, 2, 2½ and 3½ of the beat: some halves have no partner on their step
    const pat = pattern({
      tuplets: [{ bar: 0, start: 0, span: 4, n: 8, notes: { s: [2, 2, 0, 1, 2, 2, 0, 1] } }],
    });
    pat.bars[0].s[4] = 3;
    expect(roundTrip(pat).tuplets).toEqual(pat.tuplets);
  });

  it('rounds the pairs past the most a pattern holds, and says so', () => {
    // 65 steps of doubles a step apart in their beats: 65 spans, one past the cap
    const bars = Array.from({ length: 17 }, () => emptyBar(16));
    const pat = pattern({}, bars);
    const tuplets: TupletSpan[] = [];
    for (let k = 0; k < 65; k++) {
      const bi = Math.floor(k / 4);
      tuplets.push({ ...double((k % 4) * 4), bar: bi });
    }
    pat.tuplets = tuplets;
    const bytes = buildMidi(
      pat.bars.map((_, barIdx) => ({ pattern: pat, barIdx })),
      { bpm: 80, swing: 0, feel: 0, hats: 100 }
    ).bytes;
    const r = readMidi(new Uint8Array(bytes));
    if (!r.ok) throw new Error(r.error);
    expect(r.pattern.notes.join(' ')).toMatch(
      /pairs? of 32nds (was|were) rounded into one note each/
    );
  });
});

describe('BeatBuddy’s text', () => {
  it('says a double is doubled', () => {
    expect(toText(fiveStroke())).toMatch(
      /2 in the time of 1 step, step 3 \(.*\), doubled: two to a step/
    );
  });
});
