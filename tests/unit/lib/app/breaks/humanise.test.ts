/**
 * The humaniser (9.5): seeded, a stream per limb, sized as `sound-plan.md` §4
 * says, and nothing at Amount 0.
 */

import { describe, expect, it } from 'vitest';

import {
  Humaniser,
  MAX_NUDGE_MS,
  humaniseAmount,
  humaniseSeed,
  limbOf,
  otherHand,
} from '@/lib/app/breaks/humanise';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';
import { generatePattern } from '@/lib/app/breaks/generate';
import { testStyle } from '@/tests/helpers/catalogue';

const N = 10_000;

function draw(h: Humaniser, lane: LaneKey, amount: number, n = N) {
  const ms: number[] = [];
  const gain: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = h.next(lane, amount);
    ms.push(x.ms);
    gain.push(x.gain);
  }
  return { ms, gain };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
function corr(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  for (let i = 0; i < a.length; i++) num += (a[i] - ma) * (b[i] - mb);
  return num / a.length / (sd(a) * sd(b));
}
const diffs = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);

function pattern(seed: number): Pattern {
  return generatePattern({
    style: testStyle('funk'),
    meter: '4/4',
    seed,
    bars: 2,
    density: 60,
    ghosts: 60,
  });
}

describe('the seed', () => {
  it('is the same for the same notes and take, and moves with either', () => {
    const a = pattern(1);
    const b = pattern(2);
    const seed = humaniseSeed([a, b], 0);
    expect(humaniseSeed([pattern(1), pattern(2)], 0)).toBe(seed);
    expect(humaniseSeed([a, b], 1)).not.toBe(seed);

    const edited = pattern(1);
    edited.bars[0].s[5] = edited.bars[0].s[5] ? 0 : 1;
    expect(humaniseSeed([edited, b], 0)).not.toBe(seed);
  });

  it('reads the notes, not the order a bar’s lanes were built in, nor the tempo or name', () => {
    const a = pattern(3);
    const shuffled: Pattern = {
      ...a,
      name: 'Another name',
      bars: a.bars.map((bar) => Object.fromEntries(Object.entries(bar).reverse()) as typeof bar),
    };
    expect(humaniseSeed([shuffled, null], 7)).toBe(humaniseSeed([a, null], 7));
  });
});

describe('the stream', () => {
  it('replays exactly from the same seed, and differs on a new take', () => {
    const seed = humaniseSeed([pattern(4), null], 0);
    const first = draw(new Humaniser(seed), 's', 60, 200);
    expect(draw(new Humaniser(seed), 's', 60, 200)).toEqual(first);

    const next = draw(new Humaniser(humaniseSeed([pattern(4), null], 1)), 's', 60, 200);
    expect(next.ms).not.toEqual(first.ms);
  });

  it('hits its σ within 10% over 10,000 notes, for timing and velocity', () => {
    const hands = draw(new Humaniser(11), 'h', 100);
    expect(sd(hands.ms) / 10).toBeGreaterThan(0.9);
    expect(sd(hands.ms) / 10).toBeLessThan(1.1);
    expect(sd(hands.gain) / 0.12).toBeGreaterThan(0.9);
    expect(sd(hands.gain) / 0.12).toBeLessThan(1.1);

    const foot = draw(new Humaniser(12), 'k', 100);
    expect(sd(foot.ms) / 8).toBeGreaterThan(0.9);
    expect(sd(foot.ms) / 8).toBeLessThan(1.1);
    expect(sd(foot.gain) / 0.06).toBeGreaterThan(0.9);
    expect(sd(foot.gain) / 0.06).toBeLessThan(1.1);

    // Subtle is about 3.5 ms
    const subtle = draw(new Humaniser(13), 's', 35);
    expect(sd(subtle.ms)).toBeCloseTo(3.5, 0);
  });

  it('makes each interval correct the one before (negative lag-1 correlation)', () => {
    const { ms } = draw(new Humaniser(21), 'h', 100);
    const intervals = diffs(ms);
    expect(corr(intervals.slice(1), intervals.slice(0, -1))).toBeLessThan(-0.3);
  });

  it('gives each limb its own stream', () => {
    const h = new Humaniser(31);
    const rightHand: number[] = [];
    const leftHand: number[] = [];
    const rightFoot: number[] = [];
    for (let i = 0; i < N; i++) {
      // a hat and a snare on the same step, and a kick under them
      rightHand.push(h.next('h', 100).ms);
      leftHand.push(h.next('s', 100).ms);
      rightFoot.push(h.next('k', 100).ms);
    }
    expect(Math.abs(corr(rightHand, leftHand))).toBeLessThan(0.05);
    expect(Math.abs(corr(rightHand, rightFoot))).toBeLessThan(0.05);
    expect(limbOf('r')).toBe(limbOf('h'));
    expect(limbOf('t2')).toBe(limbOf('s'));
  });

  it('never moves a note more than 25 ms, even past Amount 100', () => {
    const { ms } = draw(new Humaniser(41), 'r', 400);
    expect(Math.max(...ms.map(Math.abs))).toBeLessThanOrEqual(MAX_NUDGE_MS);
  });

  it('is exactly the grid at Amount 0, and keeps its place in the stream', () => {
    const h = new Humaniser(51);
    expect(draw(h, 'h', 0, 50).ms.every((x) => x === 0)).toBe(true);
    const after = h.next('h', 100);
    // the 51st draw, not the first: moving the slider is a change of size, not of take
    const fresh = new Humaniser(51);
    const fiftyFirst = draw(fresh, 'h', 100, 51);
    expect(after.ms).toBe(fiftyFirst.ms[50]);
  });
});

describe('the setting', () => {
  it('asks for nothing while Off, whatever the Amount says', () => {
    expect(humaniseAmount({ mode: 'off', amount: 75, take: 0 })).toBe(0);
    expect(humaniseAmount({ mode: 'loose', amount: 75, take: 0 })).toBe(75);
  });
});

describe('another limb’s note (9-iv)', () => {
  it('names the other hand for a hand, and a foot as its own', () => {
    expect(otherHand('leftHand')).toBe('rightHand');
    expect(otherHand('rightHand')).toBe('leftHand');
    expect(otherHand('leftFoot')).toBe('leftFoot');
    expect(otherHand(limbOf('k'))).toBe('rightFoot');
  });

  it('draws a note played by another limb from that limb’s stream', () => {
    const a = new Humaniser(12);
    const b = new Humaniser(12);
    // the right hand's timing; the gain keeps the snare's own velocity spread
    expect(a.next('s', 60, 'rightHand').ms).toBe(b.next('h', 60).ms);
    // and the snare's own hand was not touched
    expect(a.next('s', 60)).toEqual(new Humaniser(12).next('s', 60));
  });
});
