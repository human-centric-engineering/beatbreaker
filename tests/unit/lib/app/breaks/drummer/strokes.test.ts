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

  it('opens only partway for a half-open note: loosely shut', () => {
    const open = hatOpenAt([halfHat], 5);
    expect(open).toBeGreaterThan(0.1);
    expect(open).toBeLessThan(0.3);
  });

  it('holds a wash of open notes loosely shut, as half-open notes are', () => {
    const wash = [0, 0.3, 0.6, 0.9].map((t) => hit(5 + t, 0.8, { hat: 'open', wash: true }));
    for (const t of [5, 5.3, 5.45, 5.9, 6.5]) {
      const open = hatOpenAt(wash, t);
      expect(open, `${t}`).toBeGreaterThan(0.1);
      expect(open, `${t}`).toBeLessThan(0.3);
    }
    // a run of half-open notes no less open than a lone one, and the same as the wash
    const halves = wash.map((h) => ({ ...h, hat: 'half' as const, wash: undefined }));
    expect(hatOpenAt(halves, 5.45)).toBeCloseTo(hatOpenAt([halfHat], 5.45), 9);
    expect(hatOpenAt(halves, 5.45)).toBeCloseTo(hatOpenAt(wash, 5.45), 9);
  });

  it('opens open notes all the way when they are not a wash, however few hats lie between', () => {
    // one open accent a bar, nothing between: each its own note, not a wash
    const accents = [5, 7.4].map((t) => hit(t, 0.8, { hat: 'open' }));
    expect(hatOpenAt(accents, 5.5)).toBe(1);
    expect(hatOpenAt(accents, 7.5)).toBe(1);
  });

  it('still opens a lone open note all the way when the next note shuts it', () => {
    const hits = [{ ...closedHat, time: 4.7 }, openHat, { ...closedHat, time: 5.3 }];
    expect(hatOpenAt(hits, 5)).toBe(1);
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

/** A snare stroke, three in a row 0.3 s apart: the middle one placed `level` in its beat. */
function three(level: 0 | 1 | 2, weight: number, strength = 0.5): Hit[] {
  const snare = (time: number, l: 0 | 1 | 2) =>
    hit(time, strength, { lane: 's', piece: 'snare', level: l, weight });
  return [snare(0, 0), snare(0.3, level), snare(0.6, 0)];
}

describe('HAND — every stroke thrown by the wrist, the fingers keeping only the rebound', () => {
  /** How much of the stick's height the hand has at `t`, on the way to the note at 0.3 s. */
  const wrist = (level: 0 | 1 | 2, weight = 0, t = 0.1, p = HAND) => {
    const st = strokeAt(three(level, weight), t, p);
    return st.hand / st.lift;
  };

  it('keeps more of the rebound in the fingers before an off-beat than a beat, and more before a sixteenth', () => {
    expect(wrist(1)).toBeLessThan(wrist(0) - 0.08);
    expect(wrist(2)).toBeLessThan(wrist(1) - 0.08);
  });

  it('lets go of the rebound before every throw: the hand has the whole stick as it starts down', () => {
    // the throw onto the note at 0.3 s starts by about 0.2 s; just before it, wherever the
    // note falls and however heavily it is hit, the stick is the hand's, not the fingers'
    for (const level of [0, 1, 2] as const)
      for (const weight of [0, 1]) {
        let most = 0;
        for (let t = 0.15; t <= 0.2; t += 0.005) most = Math.max(most, wrist(level, weight, t));
        expect(most).toBeGreaterThan(0.95);
      }
  });

  it('still plays the second of a fast double on the rebound: the fingers pull it', () => {
    // 1/16 apart at 120 bpm in one hand: no time for the wrist to throw again
    const hits = [hit(0, 0.5), hit(0.125, 0.5), hit(0.5, 0.5)];
    const st = strokeAt(hits, 0.1, HAND);
    expect(st.hand).toBeLessThan(st.lift * 0.75);
  });

  it('lifts even a sixteenth mostly with the wrist in a heavy style', () => {
    expect(wrist(2, 1)).toBeGreaterThan(0.6);
    expect(wrist(2, 1)).toBeGreaterThan(wrist(2) + 0.1);
  });

  it('plays the beat from higher than the notes between it', () => {
    const top = (level: 0 | 1 | 2, strength: number) => {
      let most = 0;
      for (let t = 0.15; t < 0.3; t += 0.005)
        most = Math.max(most, strokeAt(three(level, 0, strength), t, HAND).lift);
      return most;
    };
    expect(top(0, 0.5)).toBeGreaterThan(top(1, 0.5) * 1.25);
    expect(top(1, 0.5)).toBeGreaterThan(top(2, 0.5));
  });

  it('plays a note whose place in the beat is not known as one was before notes were placed', () => {
    const unplaced = three(1, 0).map(({ level: _, ...h }) => h);
    const unaware = { ...HAND, offbeat: undefined, pulse: undefined };
    for (const t of [0.05, 0.1, 0.17, 0.25])
      expect(strokeAt(unplaced, t, HAND).hand).toBeCloseTo(strokeAt(unplaced, t, unaware).hand, 9);
  });
});

describe('HAND — a heavy style hits from higher', () => {
  it('throws a plain backbeat from well over a third higher in metal', () => {
    const at = (weight: number) => strokeAt(three(0, weight), 0.2, HAND).lift;
    expect(at(1)).toBeGreaterThan(at(0) * 1.4);
  });

  it('changes nothing at no weight', () => {
    const plain = three(0, 0).map(({ weight: _, ...h }) => h);
    for (const t of [0.05, 0.17, 0.25])
      expect(strokeAt(three(0, 0), t, HAND).lift).toBeCloseTo(strokeAt(plain, t, HAND).lift, 9);
  });
});

describe('strokeAt — a note scheduled a little off its forecast', () => {
  it('eases over to the stroke it now wants, rather than snapping to it as it is scheduled', () => {
    // the stroke toward the note at 0.5 s was played from its forecast; scheduled, it is louder
    const forecast = hit(0.5, 0.35);
    const heard = 0.395;
    const known: Hit = { ...hit(0.5, 0.6), forecast, heard };
    const before = [hit(0, 0.5), forecast];
    const after = [hit(0, 0.5), known];
    // as it is scheduled, nothing moves...
    expect(strokeAt(after, heard, HAND).lift).toBeCloseTo(strokeAt(before, heard, HAND).lift, 6);
    // ...and a moment later the stroke is the one the note now wants
    const settled = [hit(0, 0.5), hit(0.5, 0.6)];
    expect(strokeAt(after, heard + 0.07, HAND).lift).toBeCloseTo(
      strokeAt(settled, heard + 0.07, HAND).lift,
      6
    );
    // and in between, no frame jumps
    let worst = 0;
    for (let t = heard - 0.01; t < heard + 0.07; t += 1 / 240)
      worst = Math.max(
        worst,
        Math.abs(strokeAt(after, t + 1 / 240, HAND).lift - strokeAt(after, t, HAND).lift)
      );
    expect(worst).toBeLessThan(0.01);
  });

  it('eases from the forecast where it was, even the other side of a neighbour', () => {
    // swing put the note well before its grid place, past the note after it there
    const forecast = hit(0.5, 0.5);
    const heard = 0.2;
    const known: Hit = { ...hit(0.3, 0.5), forecast, heard };
    const after = [hit(0, 0.5), known, hit(0.4, 0.5)];
    const before = [hit(0, 0.5), hit(0.4, 0.5), forecast];
    expect(strokeAt(after, heard, HAND).lift).toBeCloseTo(strokeAt(before, heard, HAND).lift, 6);
  });
});
