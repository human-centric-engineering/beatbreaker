/**
 * A loop over a range of bars (16-b-vi): when a loop the Studio holds still
 * holds, where a new one starts, what it says, and which bar of the chart a
 * point is over.
 */

import { describe, expect, it } from 'vitest';

import {
  type HeldLoop,
  barAt,
  barBoxes,
  loopBars,
  loopHas,
  loopIn,
  loopOver,
  loopSpan,
  loopSpot,
  loopTo,
  loopWords,
  loopedBarsOf,
} from '@/lib/app/breaks/bar-loop';
import { emptyBar, styleAttrs } from '@/lib/app/breaks/pattern';
import type { MaybeSections } from '@/lib/app/breaks/sections';
import type { Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

function sectionOf(bars: number): Pattern {
  return {
    name: 't',
    style: 'rock',
    styleVersionId: null,
    attrs: styleAttrs(testStyle('rock').params),
    meter: '4/4',
    seed: 1,
    voice: 'hat',
    lanes: ['k', 's', 'h'],
    perc: {},
    backbeats: [],
    bbLane: 's',
    hasRide: false,
    hasHat: false,
    pins: null,
    bars: Array.from({ length: bars }, () => emptyBar(16)),
  };
}

describe('loopIn', () => {
  const patterns: MaybeSections = { A: sectionOf(32), B: sectionOf(4) };
  const arrangement = ['A', 'B', 'A'] as const;
  const held = (over: Partial<HeldLoop> = {}): HeldLoop => ({
    slot: 2,
    from: 4,
    to: 5,
    letters: ['A'],
    ...over,
  });

  it('holds a loop whose slot still plays its section', () => {
    expect(loopIn(held(), arrangement, patterns, null)).toEqual({ slot: 2, from: 4, to: 5 });
  });

  it('holds under a solo of its own section, and not under another’s', () => {
    expect(loopIn(held(), arrangement, patterns, 'A')).not.toBeNull();
    expect(loopIn(held(), arrangement, patterns, 'B')).toBeNull();
  });

  it('is no loop once its slot plays another section, or is gone', () => {
    expect(loopIn(held({ slot: 1, letters: ['A'] }), arrangement, patterns, null)).toBeNull();
    expect(loopIn(held({ slot: 3 }), arrangement, patterns, null)).toBeNull();
    expect(loopIn(null, arrangement, patterns, null)).toBeNull();
  });

  it('is held to the bars the section has since an edit took some away', () => {
    expect(loopIn(held({ from: 30, to: 40 }), arrangement, patterns, null)).toEqual({
      slot: 2,
      from: 30,
      to: 31,
    });
    expect(loopIn(held({ from: 40, to: 45 }), arrangement, patterns, null)).toEqual({
      slot: 2,
      from: 31,
      to: 31,
    });
  });
});

describe('loopOver and loopWords', () => {
  it('takes two bars in either order, first to last', () => {
    expect(loopOver(1, 6, 4)).toEqual({ slot: 1, from: 4, to: 6 });
  });

  it('names a bar, or bars, counted from 1', () => {
    expect(loopWords({ slot: 0, from: 4, to: 4 })).toBe('Bar 5');
    expect(loopWords({ slot: 0, from: 4, to: 5 })).toBe('Bars 5–6');
  });
});

describe('loopSpot', () => {
  it('starts at the bar the playhead is in, or a Pause left', () => {
    expect(loopSpot({ slot: 2, barIdx: 7 }, 1, [0, 1, 2])).toEqual({ slot: 2, barIdx: 7 });
  });

  it('has nowhere to start on a section the arrangement never calls', () => {
    expect(loopSpot({ slot: -1, barIdx: 0 }, null, [0])).toBeNull();
  });

  it('starts at the top of a cued slot, else of the first that plays', () => {
    expect(loopSpot(null, 1, [0, 1])).toEqual({ slot: 1, barIdx: 0 });
    expect(loopSpot(null, null, [2, 3])).toEqual({ slot: 2, barIdx: 0 });
    expect(loopSpot(null, null, [])).toBeNull();
  });
});

describe('barBoxes and barAt', () => {
  /* Two bars of four steps on one line, then a third on the next line. */
  const map = [
    ...[0, 1, 2, 3].map((i) => ({ x: 10 + i * 10, y: 0, w: 10, h: 50 })),
    ...[0, 1, 2, 3].map((i) => ({ x: 60 + i * 10, y: 0, w: 10, h: 50 })),
    ...[0, 1, 2, 3].map((i) => ({ x: 10 + i * 10, y: 80, w: 10, h: 50 })),
  ];

  it('boxes each bar round its steps', () => {
    expect(barBoxes(map, 4, 3)).toEqual([
      { x: 10, y: 0, w: 40, h: 50 },
      { x: 60, y: 0, w: 40, h: 50 },
      { x: 10, y: 80, w: 40, h: 50 },
    ]);
  });

  it('gives a bar with no steps drawn no box', () => {
    expect(barBoxes(map.slice(0, 4), 4, 2)).toEqual([{ x: 10, y: 0, w: 40, h: 50 }, null]);
  });

  it('finds the bar a point is over, line by line, and none between them', () => {
    const boxes = barBoxes(map, 4, 3);
    expect(barAt(boxes, 25, 20)).toBe(0);
    expect(barAt(boxes, 75, 20)).toBe(1);
    expect(barAt(boxes, 25, 100)).toBe(2);
    expect(barAt(boxes, 25, 65)).toBe(-1);
    expect(barAt(boxes, 55, 20)).toBe(-1);
  });
});

describe('a loop across slots', () => {
  const patterns: MaybeSections = { A: sectionOf(8), B: sectionOf(2), C: sectionOf(4) };
  const arrangement = ['A', 'B', 'C', 'A'] as const;

  it('plays from its first bar to the end of its slot, the slots between whole, then to its last bar', () => {
    const bars = loopBars({ slot: 0, from: 6, to: 1, toSlot: 2 }, arrangement, patterns);
    expect(bars.map((b) => `${b.slot}${b.letter}${b.barIdx}`)).toEqual([
      '0A6',
      '0A7',
      '1B0',
      '1B1',
      '2C0',
      '2C1',
    ]);
  });

  it('holds while its slots play the sections they did, and not under a solo of one of them', () => {
    const loop: HeldLoop = { slot: 1, from: 0, to: 3, toSlot: 2, letters: ['B', 'C'] };
    expect(loopIn(loop, arrangement, patterns, null)).toEqual({
      slot: 1,
      from: 0,
      to: 3,
      toSlot: 2,
    });
    expect(loopIn(loop, ['A', 'B', 'A', 'A'], patterns, null)).toBeNull();
    expect(loopIn(loop, arrangement, patterns, 'B')).toBeNull();
    // past the end of the arrangement, it is no loop
    expect(
      loopIn(
        { ...loop, toSlot: 5, letters: ['B', 'C', 'A', 'X', 'Y'] },
        arrangement,
        patterns,
        null
      )
    ).toBeNull();
  });

  it('is a span from the earlier place to the later, in either order', () => {
    expect(loopSpan({ slot: 2, barIdx: 1 }, { slot: 0, barIdx: 5 })).toEqual({
      slot: 0,
      from: 5,
      to: 1,
      toSlot: 2,
    });
    expect(loopSpan({ slot: 1, barIdx: 3 }, { slot: 1, barIdx: 0 })).toEqual({
      slot: 1,
      from: 0,
      to: 3,
    });
  });

  it('stretches to a slot Shift-clicked, either way, or loops the slots to it whole', () => {
    const lastBar = (slot: number) => (patterns[arrangement[slot]]?.bars.length ?? 1) - 1;
    const loop = { slot: 1, from: 1, to: 1 };
    expect(loopTo(loop, 0, 3, lastBar)).toEqual({ slot: 1, from: 1, to: 7, toSlot: 3 });
    expect(loopTo(loop, 0, 0, lastBar)).toEqual({ slot: 0, from: 0, to: 1, toSlot: 1 });
    expect(loopTo(loop, 0, 1, lastBar)).toBe(loop);
    expect(loopTo(null, 2, 0, lastBar)).toEqual({ slot: 0, from: 0, to: 3, toSlot: 2 });
  });

  it('says which slots, and which slots it plays', () => {
    const loop = { slot: 1, from: 0, to: 3, toSlot: 2 };
    expect(loopWords(loop)).toBe('Slots 2–3');
    expect([0, 1, 2, 3].map((sl) => loopHas(loop, sl))).toEqual([false, true, true, false]);
    expect(loopHas(null, 0)).toBe(false);
  });

  it('bands every bar of a section the loop plays, in any of its slots', () => {
    const loop = { slot: 0, from: 6, to: 2, toSlot: 3 };
    expect(loopedBarsOf(loop, arrangement, patterns, 'A')).toEqual({ from: 0, to: 7 });
    expect(loopedBarsOf(loop, arrangement, patterns, 'C')).toEqual({ from: 0, to: 3 });
    expect(loopedBarsOf({ slot: 0, from: 0, to: 1 }, arrangement, patterns, 'C')).toBeNull();
    expect(loopedBarsOf(null, arrangement, patterns, 'A')).toBeNull();
  });
});
