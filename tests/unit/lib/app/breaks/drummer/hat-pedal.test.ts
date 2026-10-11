import { describe, expect, it } from 'vitest';

import { chickLiftAt } from '@/lib/app/breaks/drummer/hat-foot';
import { hatPedalAt } from '@/lib/app/breaks/drummer/hat-pedal';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

/**
 * The hi-hat pedal moving under the foot. No mocks: the numbers are the
 * simulation's, against the foot's real chick curve and plain step inputs.
 */

function chick(time: number, strength = 0.9): Hit {
  return {
    time,
    step: time,
    limb: 'hatFoot',
    lane: 'hf',
    piece: 'hat',
    contact: 'centre',
    strength,
    hat: 'closed',
    sure: true,
  };
}

const chicks = [chick(1), chick(2)];
const toe = (t: number) => chickLiftAt(chicks, t);

describe('hatPedalAt', () => {
  it('holds the hats shut under a foot pressing them, and fully open under one off them', () => {
    expect(hatPedalAt(() => 0, 5)).toBe(0);
    expect(hatPedalAt(() => 1, 5)).toBeCloseTo(1, 3);
  });

  it('sits where the foot means it part way open', () => {
    expect(hatPedalAt(() => 0.4, 5)).toBeCloseTo(0.4, 1);
  });

  it('shuts the hats on the chick, within a millisecond of it', () => {
    expect(hatPedalAt(toe, 1.99)).toBeGreaterThan(0.1);
    let shut = Infinity;
    for (let t = 1.95; t < 2.05; t += 0.0002) {
      if (hatPedalAt(toe, t) < 1e-3) {
        shut = t;
        break;
      }
    }
    expect(Math.abs(shut - 2)).toBeLessThan(0.001);
  });

  it('throws the top cymbal back off the bottom a little after the chick, then shuts it again', () => {
    const after = [0.004, 0.008, 0.012, 0.016].map((dt) => hatPedalAt(toe, 2 + dt));
    expect(Math.max(...after)).toBeGreaterThan(0.005);
    expect(Math.max(...after)).toBeLessThan(0.1);
    expect(hatPedalAt(toe, 2.06)).toBeLessThan(1e-3);
  });

  it('leaves the board behind a toe snatched up, and lets it catch up at the top', () => {
    // rising: the spring lifts the board after the toe
    expect(hatPedalAt(toe, 1.9)).toBeLessThan(toe(1.9) - 0.03);
    // (the board can bump a little past a sole slowing at the top, never far)
    for (let t = 1.85; t < 2; t += 0.005) expect(hatPedalAt(toe, t)).toBeLessThan(toe(t) + 0.1);
  });

  it('opens after the foot, not at once', () => {
    const off = (t: number) => (t > 3 ? 1 : 0);
    expect(hatPedalAt(off, 3.01)).toBeLessThan(0.2);
    expect(hatPedalAt(off, 3.04)).toBeGreaterThan(0.4);
    expect(hatPedalAt(off, 3.2)).toBeGreaterThan(0.9);
  });

  it('is a function of the time: the same answer asked twice', () => {
    expect(hatPedalAt(toe, 1.93)).toBe(hatPedalAt(toe, 1.93));
  });
});
