/**
 * Doubles (Phase 13-a): two 32nds in one step, a span of two over one step
 * of the grid. A closed roll is written so: the chart draws each as one note
 * with a slash through its stem, the hand written on the step plays both, the
 * editor makes one from a note and gives the note back, and MIDI import reads
 * a pair as a double rather than rounding it into one cell.
 */

import { describe, expect, it } from 'vitest';

import { type SvgNode, engrave } from '@/lib/app/breaks/engrave';
import { meterOf, stepSeconds } from '@/lib/app/breaks/meter';
import { buildMidi } from '@/lib/app/breaks/midi';
import { readMidi } from '@/lib/app/breaks/midi-read';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { performStep } from '@/lib/app/breaks/perform';
import { toText } from '@/lib/app/breaks/text';
import {
  addDouble,
  removeTuplet,
  tupletHands,
  tupletStrokes,
  tupletValue,
  twoAStep,
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
    expect(back.tuplets).toEqual(fiveStroke().tuplets);
    expect(back.bars[0].s[4]).toBe(3);
    expect(back.notes.join(' ')).toMatch(/2 steps have two notes in a sixteenth, read as doubles/);
  });

  it('a beat of 32nds is four doubles, not one span of eight', () => {
    const pat = pattern({ tuplets: [0, 1, 2, 3].map((i) => double(i)) });
    pat.bars[0].s[4] = 3;
    expect(roundTrip(pat).tuplets).toEqual(pat.tuplets);
  });
});

describe('BeatBuddy’s text', () => {
  it('says a double is doubled', () => {
    expect(toText(fiveStroke())).toMatch(/2 in the time of 1 step, .*\(doubled: two to a step\)/);
  });
});
