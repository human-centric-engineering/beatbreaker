import { describe, expect, it } from 'vitest';

import type { Hit } from '@/lib/app/breaks/drummer/timeline';
import { flight, impactSpeed, restitution } from '@/lib/app/breaks/drummer/rebound';
import { HAND, KICK, hatOpenAt, lastAtOrBefore, strokeAt } from '@/lib/app/breaks/drummer/strokes';

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
      hand: HAND.rest,
      grip: 0,
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

  it('on a downstroke (accent -> ghost), closes the grip and stops the rebound near the ghost’s height', () => {
    // room to let the rebound fly, but not a long wait (one far off is waited out at rest)
    const hits = [hit(0, 1), hit(0.6, 0.1)];
    // each note's height carries its own small variation (`reach`)
    const reach = (h: Hit) => HAND.reach?.(h) ?? 1;
    const target = HAND.height(0.1) * reach(hits[1]);
    // let go, the accent's rebound would carry the stick far higher than the ghost wants
    const thrown = HAND.height(1) * reach(hits[0]);
    const free = flight(restitution(hits[0], impactSpeed(thrown)) * impactSpeed(thrown));
    expect(free).toBeGreaterThan(target + HAND.stop * 3);

    let peak = 0;
    let grip = 0;
    for (let t = 0; t < 0.4; t += 0.002) {
      const st = strokeAt(hits, t, HAND);
      peak = Math.max(peak, st.lift);
      grip = Math.max(grip, st.grip);
    }
    // stopped: no higher than the next note's height and the stop, give or take a centimetre
    expect(peak).toBeLessThan(target + HAND.stop + 0.01);
    expect(grip).toBeGreaterThan(0.9);
  });

  it('on a free stroke (accent -> accent), leaves the grip open and lets the stick come back up', () => {
    const hits = [hit(0, 1), hit(2, 1)];
    let peak = 0;
    let grip = 0;
    for (let t = 0; t < 0.6; t += 0.002) {
      const st = strokeAt(hits, t, HAND);
      peak = Math.max(peak, st.lift);
      grip = Math.max(grip, st.grip);
    }
    expect(grip).toBe(0);
    expect(peak).toBeGreaterThan(HAND.height(1) * (HAND.reach?.(hits[1]) ?? 1) * 0.9);
  });

  it('on an upstroke, waits low and lifts for the accent only just before throwing it', () => {
    const hits = [hit(0, 0.1, { piece: 'snare' }), hit(1, 1, { piece: 'snare' })];
    const target = HAND.height(1) * (HAND.reach?.(hits[1]) ?? 1);
    // halfway through the gap the stick is still near the ghost note's height
    expect(strokeAt(hits, 0.5, HAND).lift).toBeLessThan(target * 0.25);
    // and most of the way up by the time it is thrown (the stick lagging the hand a little)
    const fall = HAND.fall + HAND.fallPerUnit * target;
    expect(strokeAt(hits, 1 - fall, HAND).lift).toBeGreaterThan(target * 0.8);
  });

  it('keeps fast notes low however loud they are written: the rebound is metered in the fingers', () => {
    const gap = 0.08; // one hand at 12.5 Hz
    const hits = Array.from({ length: 8 }, (_, i) => hit(i * gap, 1));
    const cap = HAND.speed * gap * 0.5;
    expect(cap).toBeLessThan(HAND.height(1)); // the cap really is the binding constraint here

    // once the run is going (the first note is thrown from full height)
    let max = 0;
    for (let t = 3 * gap; t <= 7 * gap; t += gap / 40)
      max = Math.max(max, strokeAt(hits, t, HAND).lift);
    expect(max).toBeLessThanOrEqual(cap);
  });

  it('bounces higher off a tight snare than a slack floor tom: the head gives the rebound', () => {
    const off = (piece: Hit['piece']) => {
      const hits = [hit(0, 0.6, { piece }), hit(1, 0.6, { piece })];
      let top = 0;
      for (let t = 0; t < 0.06; t += 0.002) top = Math.max(top, strokeAt(hits, t, HAND).lift);
      return top;
    };
    expect(off('snare')).toBeGreaterThan(off('floor') * 1.1);
  });

  it('plays the second note of a fast double off the rebound, the hand hardly lifting between', () => {
    // R R at sixteenths, 120 bpm, then a rest for the other hand's pair
    const hits = [hit(0, 0.5), hit(0.125, 0.5), hit(0.5, 0.5)];
    let tip = 0;
    let hand = 0;
    for (let t = 0; t < 0.125; t += 0.002) {
      const st = strokeAt(hits, t, HAND);
      tip = Math.max(tip, st.lift);
      hand = Math.max(hand, st.hand);
    }
    expect(tip).toBeGreaterThan(0.04);
    expect(hand).toBeLessThan(tip * 0.75);
  });

  it('counting in, rings the clicked stick in the fingers a moment, the arm not', () => {
    const hits = [0, 0.5, 1].map((t) => hit(t, 0.9, { piece: 'sticks' }));
    // the arm is the plan's; the stick answers the click on top of it
    const ring = (t: number) => {
      const st = strokeAt(hits, t, HAND);
      return st.lift - st.hand;
    };
    expect(ring(0.5)).toBe(0);
    expect(ring(0.515)).toBeGreaterThan(0.005);
    expect(Math.abs(ring(0.65))).toBeLessThan(0.001);
  });

  it('waits out a long gap the same whether the far note is in view yet or not, until it wakes', () => {
    // (the wait hands over to the plan as one with nothing coming does: a note coming
    // into view far off moves nothing)
    const s = (time: number) => hit(time, 0.9, { piece: 'snare', lane: 's' });
    for (const far of [1.6, 2]) {
      for (let t = 0.9; t < far - 0.45; t += 0.01) {
        const alone = strokeAt([s(0)], t, HAND).lift;
        const seen = strokeAt([s(0), s(far)], t, HAND).lift;
        expect(Math.abs(seen - alone)).toBeLessThan(0.001);
      }
    }
  });

  describe('a buzz', () => {
    /** A buzz at 0.6 s, its three repeats a quarter of a 0.125 s step apart, a hit after. */
    const step = 0.125;
    const repeats = [1, 2, 3].map((k) => 0.6 + (k * step) / 4);
    const hits = [
      hit(0.2, 0.55, { piece: 'snare' }),
      hit(0.6, 0.32, { piece: 'snare', press: true }),
      ...repeats.map((t) => hit(t, 0.03, { piece: 'snare', bounce: true })),
      hit(1.1, 0.55, { piece: 'snare' }),
    ];
    /** The tip's height through the buzz, every half millisecond. */
    const through = (from: number, to: number) => {
      const out: { t: number; lift: number; hand: number }[] = [];
      for (let t = from; t <= to; t += 0.0005) {
        const st = strokeAt(hits, t, HAND);
        out.push({ t, lift: st.lift, hand: st.hand });
      }
      return out;
    };

    it('is one stroke of the hand: the repeats are the stick bouncing, not strokes', () => {
      const st = strokeAt(hits, repeats[1] + 0.005, HAND);
      expect(st.prev?.time).toBe(0.6);
      expect(st.next?.time).toBe(1.1);
    });

    it('bounces the stick back onto the head on every repeat, each bounce lower', () => {
      const pts = through(0.6005, repeats[2] + 0.001);
      for (const r of repeats) {
        const near = pts.filter((p) => Math.abs(p.t - r) < 0.002);
        expect(Math.min(...near.map((p) => p.lift))).toBeLessThan(0.0015);
      }
      const tops = [0.6, ...repeats.slice(0, 2)].map((a, k) =>
        Math.max(...pts.filter((p) => p.t > a && p.t < repeats[k]).map((p) => p.lift))
      );
      expect(tops[0]).toBeGreaterThan(0.005);
      expect(tops[1]).toBeLessThan(tops[0]);
      expect(tops[2]).toBeLessThan(tops[1]);
    });

    it('presses with the fingers: the hand stays down on the head through it', () => {
      const pts = through(0.6005, repeats[2]);
      expect(Math.max(...pts.map((p) => Math.abs(p.hand)))).toBeLessThan(0.004);
    });

    it('dies on the head after the last repeat, then comes up for the next note', () => {
      expect(strokeAt(hits, repeats[2] + 0.03, HAND).lift).toBeLessThan(0.002);
      expect(strokeAt(hits, 1.0, HAND).lift).toBeGreaterThan(0.03);
      expect(strokeAt(hits, 1.1, HAND).lift).toBe(0);
    });
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

  it('works the same way for the kick profile (0 at the hit, non-degenerate otherwise)', () => {
    const hits = [hit(0, 1), hit(1, 1)];
    expect(strokeAt(hits, 0, KICK).lift).toBe(0);
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

/** How high the stick comes up for a lone note: the top of its lift, just as it is thrown. */
function thrownFrom(h: Hit): number {
  let top = 0;
  for (let t = h.time - 0.5; t < h.time; t += 1e-4)
    top = Math.max(top, strokeAt([h], t, HAND).lift);
  return top;
}

describe('HAND — cymbals are played from low', () => {
  const on = (piece: Hit['piece']): Hit => ({ ...hit(1, 0.95), piece });

  it('lifts a crash about half as high as a drum of the same strength, and a ride as high', () => {
    const drum = thrownFrom(on('tom1'));
    const crash = thrownFrom(on('crash'));
    const ride = thrownFrom(on('ride'));
    expect(crash).toBeCloseTo(drum * 0.5, 6);
    expect(ride).toBeCloseTo(drum, 6);
  });
});

describe('HAND — the ride bell', () => {
  it('is played from about the height of the bow beside it, though it is louder', () => {
    const bow = thrownFrom(hit(1, 0.42, { piece: 'ride' }));
    const bell = thrownFrom(hit(1, 0.7, { piece: 'ride', contact: 'bell' }));
    expect(bell).toBeGreaterThan(bow);
    expect(bell).toBeLessThan(bow * 1.7);
  });
});

describe('HAND — no two strokes quite the same', () => {
  it('varies a note’s height a little, the same every time for the same note', () => {
    const heights = Array.from({ length: 24 }, (_, i) => HAND.reach!(hit(i * 0.25, 0.4)));
    expect(new Set(heights.map((h) => h.toFixed(4))).size).toBeGreaterThan(12);
    for (const h of heights) {
      expect(h).toBeGreaterThan(0.8);
      expect(h).toBeLessThan(1.2);
    }
    expect(HAND.reach!(hit(3, 0.4))).toBe(HAND.reach!(hit(3, 0.4)));
  });
});
