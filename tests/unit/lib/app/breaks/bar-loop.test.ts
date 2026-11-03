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
  loopIn,
  loopOver,
  loopSpot,
  loopWords,
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
    letter: 'A',
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
    expect(loopIn(held({ slot: 1 }), arrangement, patterns, null)).toBeNull();
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
