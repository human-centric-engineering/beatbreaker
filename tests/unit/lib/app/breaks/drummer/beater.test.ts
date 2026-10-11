import { describe, expect, it } from 'vitest';

import { beaterAt, buries } from '@/lib/app/breaks/drummer/beater';
import { kickPlan } from '@/lib/app/breaks/drummer/kick-foot';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

/**
 * The kick pedal bouncing under the foot. No mocks: the numbers are the
 * simulation's, checked against what a buried and a let-off beater do.
 */

function kick(time: number, strength: number): Hit {
  return {
    time,
    step: time,
    limb: 'kickFoot',
    lane: 'k',
    piece: 'kick',
    contact: 'centre',
    strength,
    sure: true,
  };
}

/** Loud lone kicks a beat apart, from `from`. */
const quarters = (n: number, strength: number, from = 0.2) =>
  Array.from({ length: n }, (_, i) => kick(from + i * 0.5, strength));

describe('buries', () => {
  it('buries most loud lone heel-up notes, and the same ones every time', () => {
    const hits = quarters(200, 0.92);
    const plan = kickPlan(hits);
    const buried = hits.filter((h, i) => buries(h, plan[i], hits[i + 1])).length / hits.length;
    expect(buried).toBeGreaterThan(0.5);
    expect(buried).toBeLessThan(0.8);
    expect(hits.map((h, i) => buries(h, plan[i], hits[i + 1]))).toEqual(
      hits.map((h, i) => buries(h, plan[i], hits[i + 1]))
    );
  });

  it('never buries a soft note, nor one the rebound must carry into the next of a run', () => {
    const soft = quarters(40, 0.4);
    const softPlan = kickPlan(soft);
    expect(soft.some((h, i) => buries(h, softPlan[i], soft[i + 1]))).toBe(false);
    const doubles = [0.2, 0.325, 0.7, 0.825].map((t) => kick(t, 0.92));
    const plan = kickPlan(doubles);
    expect(buries(doubles[0], plan[0], doubles[1])).toBe(false);
    expect(buries(doubles[2], plan[2], doubles[3])).toBe(false);
  });
});

describe('beaterAt', () => {
  const hits = quarters(40, 0.92);
  const plan = kickPlan(hits);
  const buried = hits.findIndex((h, i) => i > 0 && buries(h, plan[i], hits[i + 1]));
  const letOff = hits.findIndex((h, i) => i > 0 && !buries(h, plan[i], hits[i + 1]));

  it('lands the beater on the head as each note sounds', () => {
    for (const h of hits.slice(1, 8)) expect(beaterAt(hits, h.time, plan).lift).toBeLessThan(0.01);
  });

  it('keeps a buried beater on the head a moment after the note', () => {
    const t = hits[buried].time;
    for (const dt of [0.02, 0.05, 0.08]) {
      expect(beaterAt(hits, t + dt, plan).lift).toBeLessThan(0.05);
    }
  });

  it('lets a let-off beater bounce back off the head straight away', () => {
    const t = hits[letOff].time;
    expect(beaterAt(hits, t + 0.05, plan).lift).toBeGreaterThan(0.2);
  });

  it('carries the foot on the board: the pedal is never far above where the foot means it', () => {
    // (the sole gives a little: the spring presses the board into it, and a board sprung
    // up under a foot slowing at the top of its rise bumps into it)
    for (let t = 0.3; t < 3; t += 0.01) {
      const st = beaterAt(hits, t, plan);
      expect(st.lift).toBeLessThan(st.hand + 0.05);
    }
  });

  it('rests where the planner has it before the first note', () => {
    const st = beaterAt(hits, 0, plan);
    expect(st.lift).toBe(st.hand);
  });
});

describe('beaterAt — long waits', () => {
  /** The most the pedal moves in a millisecond over [from, to]. */
  function worstFrame(hits: Hit[], from: number, to: number): number {
    const plan = kickPlan(hits);
    let worst = 0;
    let last = beaterAt(hits, from, plan).lift;
    for (let t = from + 0.001; t < to; t += 0.001) {
      const now = beaterAt(hits, t, plan).lift;
      worst = Math.max(worst, Math.abs(now - last));
      last = now;
    }
    return worst;
  }

  it('hands a last note over to the foot without a snap', () => {
    // (settled by then: a millisecond moves it next to nothing; a snap moved it 0.006)
    expect(worstFrame([kick(0.2, 0.92)], 0.9, 1.6)).toBeLessThan(0.001);
  });

  it('simulates a long gap all the way to the next note, landing it on time', () => {
    const hits = [kick(0.2, 0.92), kick(2.2, 0.92)];
    const plan = kickPlan(hits);
    expect(worstFrame(hits, 0.9, 1.6)).toBeLessThan(0.001);
    expect(beaterAt(hits, 2.2, plan).lift).toBeLessThan(0.01);
    expect(beaterAt(hits, 2.1, plan).lift).toBeGreaterThan(0.1);
  });
});
