import { describe, expect, it } from 'vitest';

import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import {
  CHICK,
  HAND,
  KICK,
  hatOpenAt,
  lastAtOrBefore,
  smoothstep,
  strokeAt,
} from '@/lib/app/breaks/drummer/strokes';

/**
 * The stroke planner: a stick's height, travel and rebound between two
 * strokes. These tests sample `strokeAt` and `hatOpenAt` at specific instants
 * and check the physical claims documented in strokes.ts — not the mock, since
 * there is no mock here: every number comes from the real motion model.
 */

function hit(time: number, strength: number, extra: Partial<Hit> = {}): Hit {
  return {
    time,
    step: time,
    limb: 'lead',
    lane: 'h',
    piece: 'hat',
    contact: 'centre',
    strength,
    sure: true,
    ...extra,
  };
}

describe('smoothstep', () => {
  it('is 0 at and before a, 1 at and after b, and monotonic in between', () => {
    expect(smoothstep(0, 1, -0.5)).toBe(0);
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 1.5)).toBe(1);
    const xs = [0, 0.25, 0.5, 0.75, 1];
    const ys = xs.map((x) => smoothstep(0, 1, x));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
  });

  it('is symmetric about the midpoint', () => {
    expect(smoothstep(0, 1, 0.3)).toBeCloseTo(1 - smoothstep(0, 1, 0.7), 9);
  });

  it('treats a degenerate interval (b <= a) as a step function at b', () => {
    expect(smoothstep(1, 1, 0.9)).toBe(0);
    expect(smoothstep(1, 1, 1)).toBe(1);
    expect(smoothstep(1, 0.5, 2)).toBe(1); // b < a
  });
});

describe('lastAtOrBefore', () => {
  const hits = [hit(0, 1), hit(1, 1), hit(2, 1)];

  it('returns -1 before the first hit', () => {
    expect(lastAtOrBefore(hits, -1)).toBe(-1);
  });

  it('returns the index of an exact match', () => {
    expect(lastAtOrBefore(hits, 1)).toBe(1);
  });

  it('returns the last index at or before `now` when `now` falls between two hits', () => {
    expect(lastAtOrBefore(hits, 1.5)).toBe(1);
  });

  it('returns the final index once `now` is past every hit', () => {
    expect(lastAtOrBefore(hits, 100)).toBe(2);
  });

  it('is correct for an empty list', () => {
    expect(lastAtOrBefore([], 0)).toBe(-1);
  });
});

describe('strokeAt', () => {
  it('rests, with zero travel, when there are no hits at all', () => {
    const st = strokeAt([], 5, HAND);
    expect(st).toEqual({
      prev: undefined,
      next: undefined,
      lift: HAND.rest,
      travel: 0,
      since: Infinity,
    });
  });

  it('is exactly 0 at the instant of a hit, whatever hit comes next', () => {
    const hits = [hit(0, 1), hit(1, 0.1)];
    expect(strokeAt(hits, 0, HAND).lift).toBe(0);
    expect(strokeAt(hits, 1, HAND).lift).toBe(0);
  });

  it('is higher, well before the note, on the approach to a loud note than to a ghost', () => {
    const toAccent = [hit(0, 0.2), hit(1, 1)];
    const toGhost = [hit(0, 0.2), hit(1, 0.1)];
    const sample = 0.9; // shortly before the shared next-note time
    expect(strokeAt(toAccent, sample, HAND).lift).toBeGreaterThan(
      strokeAt(toGhost, sample, HAND).lift
    );
  });

  it('on a downstroke (accent -> ghost), holds the rebound to at most the next note’s height plus `stop`', () => {
    const hits = [hit(0, 1), hit(2, 0.1)]; // a big gap: nothing here caps the rebound by speed
    const target = HAND.height(0.1);
    const freeRebound = HAND.height(1) * HAND.rebound;
    // sanity: an unclamped rebound really would overshoot target + stop
    expect(freeRebound).toBeGreaterThan(target + HAND.stop);

    // sample at the top of the rebound (prev.time + rise), where the clamp applies
    const bounce = Math.min(freeRebound, target + HAND.stop);
    const rise = HAND.rise + HAND.risePerUnit * bounce;
    const peakLift = strokeAt(hits, rise, HAND).lift;

    expect(peakLift).toBeLessThanOrEqual(target + HAND.stop + 1e-9);
    expect(peakLift).toBeLessThan(freeRebound); // proves the clamp actually engaged
    expect(peakLift).toBeCloseTo(bounce, 6);
  });

  it('caps a fast note’s height to what the time available allows, however loud it is written', () => {
    const gap = 0.01; // two strokes 10ms apart
    const hits = [hit(0, 1), hit(gap, 1)];
    const cap = HAND.speed * gap * 0.5;
    const full = HAND.height(1);
    expect(cap).toBeLessThan(full); // the cap really is the binding constraint here

    let max = 0;
    for (let t = 0; t <= gap; t += gap / 20) max = Math.max(max, strokeAt(hits, t, HAND).lift);
    expect(max).toBeLessThanOrEqual(cap + 1e-6);
  });

  it('settles from the rebound toward rest when nothing else is coming', () => {
    const hits = [hit(0, 1)];
    const soonAfter = strokeAt(hits, 0.05, HAND).lift;
    const longAfter = strokeAt(hits, 5, HAND).lift;
    expect(longAfter).toBeCloseTo(HAND.rest, 3);
    expect(soonAfter).not.toBeCloseTo(HAND.rest, 3);
  });

  it('travels from 0 at the start of a cross-kit move to 1 just before the next stroke lands', () => {
    const hits = [hit(0, 0.5, { piece: 'hat' }), hit(1, 0.5, { piece: 'ride' })];
    // right at the start of the move, travel has not begun
    expect(strokeAt(hits, 0, HAND).travel).toBe(0);
    // shortly before the next stroke lands, the hand has fully arrived
    expect(strokeAt(hits, 0.99, HAND).travel).toBe(1);
    // the move itself is a late, short window ahead of the landing (not the whole gap) —
    // early in the gap nothing has started yet
    expect(strokeAt(hits, 0.3, HAND).travel).toBe(0);
    const mid = strokeAt(hits, 0.8, HAND).travel;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('has zero travel once a hand has struck its last known note and nothing is coming', () => {
    const hits = [hit(0, 0.5)];
    expect(strokeAt(hits, 2, HAND).travel).toBe(0);
  });

  it('reports `since` as the time elapsed since the previous stroke, and Infinity before the first', () => {
    const hits = [hit(0, 0.5), hit(1, 0.5)];
    expect(strokeAt(hits, -1, HAND).since).toBe(Infinity);
    expect(strokeAt(hits, 0.4, HAND).since).toBeCloseTo(0.4, 9);
  });

  it('works the same way for the kick and chick profiles (0 at the hit, non-degenerate otherwise)', () => {
    const hits = [hit(0, 1), hit(1, 1)];
    expect(strokeAt(hits, 0, KICK).lift).toBe(0);
    expect(strokeAt(hits, 0, CHICK).lift).toBe(0);
    expect(strokeAt(hits, 0.5, KICK).lift).toBeGreaterThan(0);
  });
});

describe('hatOpenAt', () => {
  const openHat = hit(5, 0.8, { hat: 'open' });
  const halfHat = hit(5, 0.5, { hat: 'half' });
  const closedHat = hit(5, 0.5, { hat: 'closed' });

  it('is 0 before anything has played', () => {
    expect(hatOpenAt([], 0)).toBe(0);
    expect(hatOpenAt([openHat], 0)).toBe(0);
  });

  it('rises toward 1 just ahead of an open note, and is fully open at and after it', () => {
    const justBefore = hatOpenAt([openHat], 4.98);
    const atHit = hatOpenAt([openHat], 5);
    const wellAfter = hatOpenAt([openHat], 6);
    expect(justBefore).toBeGreaterThan(0);
    expect(justBefore).toBeLessThan(1);
    expect(atHit).toBe(1);
    expect(wellAfter).toBe(1); // stays open until something closes it
  });

  it('opens only partway for a half-open note', () => {
    expect(hatOpenAt([halfHat], 5)).toBeCloseTo(0.4, 9);
  });

  it('closes back toward 0 approaching a closed note that follows an open one', () => {
    const hits = [openHat, { ...closedHat, time: 6 }];
    const stillOpen = hatOpenAt(hits, 5.5);
    const justBeforeClose = hatOpenAt(hits, 5.99);
    const atClose = hatOpenAt(hits, 6);
    expect(stillOpen).toBe(1);
    expect(justBeforeClose).toBeLessThan(1);
    expect(atClose).toBe(0);
  });
});
