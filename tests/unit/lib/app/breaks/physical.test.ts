/**
 * `limbProblems`: whether two hands and two feet can play a pattern at a
 * tempo. The song sweep (`song-tempo.test.ts`) holds every song to it; these
 * pin the body's limits one at a time, on bars small enough to read.
 */

import { describe, expect, it } from 'vitest';

import { generatePattern } from '@/lib/app/breaks/generate';
import { emptyBar } from '@/lib/app/breaks/pattern';
import { limbProblems } from '@/lib/app/breaks/physical';
import type { Bar, LaneKey, Pattern } from '@/lib/app/breaks/types';
import { testStyle } from '@/tests/helpers/catalogue';

/** A pattern of one bar, its lanes written as strings (`.` a rest, a digit a note). */
function pattern(
  meter: string,
  lanes: Partial<Record<LaneKey, string>>,
  more: Partial<Pattern> = {}
): Pattern {
  const p = generatePattern({
    style: testStyle('funk'),
    meter,
    seed: 1,
    bars: 1,
    density: 50,
    ghosts: 0,
  });
  const n = Object.values(lanes)[0].length;
  const bar: Bar = emptyBar(n);
  for (const [L, row] of Object.entries(lanes) as Array<[LaneKey, string]>)
    bar[L] = [...row].map((c) => (c === '.' ? 0 : Number(c)));
  return { ...p, attrs: {}, sticking: undefined, ...more, bars: [bar] };
}

const groove = {
  h: '1.1.1.1.1.1.1.1.',
  s: '....2.......2...',
  k: '1.......1.1.....',
};

describe('the hands', () => {
  it('find nothing wrong with a groove at a working tempo', () => {
    expect(limbProblems(pattern('4/4', groove), 100)).toEqual([]);
  });

  it('keep up sixteenths in one hand to about 210, and not past it', () => {
    const allRight = { h: '1111111111111111', s: '....2.......2...' };
    const right = { sticking: ['RRRRRRRRRRRRRRRR'] };
    expect(limbProblems(pattern('4/4', allRight, right), 200)).toEqual([]);
    // past it the right hand cannot take them all, and handing one to the left breaks the sticking
    const past = limbProblems(pattern('4/4', allRight, right), 240);
    expect(past.length).toBeGreaterThan(0);
    expect(past.every((p) => p.limbs === 'hands')).toBe(true);
  });

  it('take a sticking letter on a step with both hands down as naming one of them', () => {
    // 3:2 under the hands: the floor tom's three and the snare's two meet on 1, written L
    const threeTwo = pattern(
      '4/4-6',
      { s: '3.....2.....3.....2.....', t3: '2...1...1...2...1...1...' },
      { sticking: ['L...R.L.R...L...R.L.R...'] }
    );
    expect(limbProblems(threeTwo, 60)).toEqual([]);
  });

  it('still hold a lone note to the hand its sticking writes', () => {
    // the ride is out of the left hand's reach
    const leftRide = pattern('4/4', { r: '1...............' }, { sticking: ['L...............'] });
    expect(limbProblems(leftRide, 100)).toContainEqual(
      expect.objectContaining({ bar: 0, step: 0, limbs: 'hands' })
    );
  });

  it('cannot get from a crash to the snare in one sextuplet at 188 with the other hand on the ride', () => {
    const stab = {
      c: '.........1..............',
      s: '..........1.............',
      r: '..........1.............',
    };
    expect(limbProblems(pattern('4/4-6', stab), 188)).toContainEqual(
      expect.objectContaining({ bar: 0, step: 10, limbs: 'hands' })
    );
    // at half the tempo there is time
    expect(limbProblems(pattern('4/4-6', stab), 94)).toEqual([]);
  });
});

describe('the feet', () => {
  const run = { s: '....2.......2...', k: '1111111111111111' };

  it('keep up sixteenths on one pedal to about 185, and not past it', () => {
    expect(limbProblems(pattern('4/4', run), 150)).toEqual([]);
    expect(limbProblems(pattern('4/4', run), 190)).toContainEqual(
      expect.objectContaining({ limbs: 'feet', why: 'a foot playing faster than a foot can' })
    );
  });

  it('go faster heel and toe, and faster again on a double pedal', () => {
    expect(limbProblems(pattern('4/4', run, { attrs: { singlePedalRuns: true } }), 190)).toEqual(
      []
    );
    expect(
      limbProblems(pattern('4/4', run, { attrs: { singlePedalRuns: true } }), 240)
    ).not.toEqual([]);
    expect(limbProblems(pattern('4/4', run, { attrs: { doubleKick: true } }), 240)).toEqual([]);
  });
});
