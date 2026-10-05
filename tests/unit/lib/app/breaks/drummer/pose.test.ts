import { describe, expect, it } from 'vitest';

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { RIMSHOT } from '@/lib/app/breaks/lanes';
import { METERS } from '@/lib/app/breaks/meter';
import type { Voice } from '@/lib/app/breaks/perform';
import {
  BODY,
  type Contact,
  type Hand,
  type PieceId,
  strikeTarget,
} from '@/lib/app/breaks/drummer/kit-layout';
import { HAT_CLOSED_GAP, BEATER_CONTACT, beatPhase, poseAt } from '@/lib/app/breaks/drummer/pose';
import { assignBar } from '@/lib/app/breaks/drummer/sticking';
import { contactOf, StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import type { Bar, LaneKey } from '@/lib/app/breaks/types';

const N = 16;
const M44 = METERS['4/4'];
const DUR = 0.1;

function bar(): Bar {
  const zeros = () => Array<number>(N).fill(0);
  return {
    k: zeros(),
    s: zeros(),
    h: zeros(),
    r: zeros(),
    c: zeros(),
    t1: zeros(),
    t2: zeros(),
    t3: zeros(),
    hf: zeros(),
    p1: zeros(),
    p2: zeros(),
  };
}

function voice(lane: LaneKey): Voice {
  return { lane, note: 0, velocity: 1, offset: 0 };
}

function stepFor(i: number, b: Bar, lane: LaneKey, next: Bar | null = null): ScheduledStep {
  return {
    t: i * DUR,
    dur: DUR,
    slot: i,
    meter: M44,
    bar: b,
    next,
    notes: [{ voice: voice(lane), when: i * DUR }],
  };
}

/**
 * One note on every lane — crash, ride (plain and bell), all three hat
 * contacts, snare (plain, rimshot, cross-stick), every tom, both percussion
 * slots, and the two feet — spread one per step across a single 16-step bar.
 *
 * The two feet (`k`, `hf`) double as resets for the hand-alternation rule in
 * sticking.ts: a foot step carries no DRUMS entry, so the single-drum-both-
 * hands-free step right after one falls back to the drum's own side instead
 * of blindly alternating from several single-limb notes in a row. That
 * matters here specifically for p1/p2 (out at the edges of the kit, x = 0.42
 * and x = -0.66): chaining straight from the floor tom into p1 then p2 lets
 * alternation hand the far-left perc2 to the LEAD (right) hand, which the
 * body genuinely cannot reach — see the note below this fixture.
 */
const PLAN: { step: number; lane: LaneKey; value: number }[] = [
  { step: 0, lane: 'c', value: 1 },
  { step: 1, lane: 'r', value: 1 },
  { step: 2, lane: 'r', value: 2 }, // bell
  { step: 3, lane: 'h', value: 1 }, // closed
  { step: 4, lane: 'h', value: 3 }, // open
  { step: 5, lane: 's', value: 2 }, // plain hit
  { step: 6, lane: 's', value: RIMSHOT },
  { step: 7, lane: 's', value: 4 }, // cross-stick
  { step: 8, lane: 't1', value: 1 },
  { step: 9, lane: 't2', value: 1 },
  { step: 10, lane: 't3', value: 1 },
  { step: 11, lane: 'k', value: 1 }, // reset before p1
  { step: 12, lane: 'p1', value: 1 },
  { step: 13, lane: 'hf', value: 1 }, // reset before p2
  { step: 14, lane: 'p2', value: 1 },
  { step: 15, lane: 'h', value: 2 }, // accent (edge)
];

function buildBar(): Bar {
  const b = bar();
  for (const { step, lane, value } of PLAN) b[lane][step] = value;
  return b;
}

const PIECE_OF: Record<LaneKey, PieceId> = {
  k: 'kick',
  s: 'snare',
  h: 'hat',
  hf: 'hat',
  r: 'ride',
  c: 'crash',
  t1: 'tom1',
  t2: 'tom2',
  t3: 'floor',
  p1: 'perc1',
  p2: 'perc2',
};

describe('poseAt — reachability', () => {
  const bigBar = buildBar();
  const timeline = new StrokeTimeline();
  const hands = assignBar(bigBar); // the real per-step hand assignment, not re-derived by hand

  it('places the hand’s tip exactly on strikeTarget at the instant of every kind of stroke in the kit', () => {
    for (const { step: i, lane, value } of PLAN) {
      timeline.ingest(stepFor(i, bigBar, lane));
      if (lane === 'k' || lane === 'hf') continue; // feet, checked separately below

      const now = i * DUR;
      const pose = poseAt(timeline, now, 1);
      const hand = hands[i][lane] as Hand;
      const piece = PIECE_OF[lane];
      const contact: Contact = contactOf(lane, value);
      const { tip: targetTip } = strikeTarget(piece, contact);

      const [ex, ty, ez] = targetTip;
      const ey = piece === 'hat' ? ty + (pose.hatGap - HAT_CLOSED_GAP) : ty;

      const got = pose.arms[hand].tip;
      const dist = Math.hypot(got.x - ex, got.y - ey, got.z - ez);
      expect(dist).toBeLessThan(0.001); // within 1mm
    }
  });

  it('holds the beater exactly at BEATER_CONTACT at the instant of a kick hit', () => {
    const tl = new StrokeTimeline();
    const b = bar();
    b.k[2] = 1;
    tl.ingest(stepFor(2, b, 'k'));
    const pose = poseAt(tl, 2 * DUR, 1);
    expect(pose.beater).toBeCloseTo(BEATER_CONTACT, 6);
  });

  it('preserves the upper-arm and forearm segment lengths from BODY, at every stroke', () => {
    const tl = new StrokeTimeline();
    const b = bar();
    b.s[0] = 2;
    b.t1[1] = 1;
    tl.ingest(stepFor(0, b, 's'));
    tl.ingest(stepFor(1, b, 't1'));
    for (const now of [0, DUR]) {
      const pose = poseAt(tl, now, 1);
      for (const hand of ['lead', 'other'] as const) {
        const arm = pose.arms[hand];
        expect(arm.shoulder.distanceTo(arm.elbow)).toBeCloseTo(BODY.upperArm, 6);
        expect(arm.elbow.distanceTo(arm.wrist)).toBeCloseTo(BODY.forearm, 6);
      }
    }
  });
});

describe('poseAt — hi-hat gap', () => {
  it('opens after an open-hat note and closes again at the next closed note', () => {
    const tl = new StrokeTimeline();
    const b = bar();
    b.h[0] = 3; // open
    b.h[8] = 1; // closed, 8 steps (0.8s) later
    tl.ingest(stepFor(0, b, 'h'));
    tl.ingest({
      t: 8 * DUR,
      dur: DUR,
      slot: 8,
      meter: M44,
      bar: b,
      next: null,
      notes: [{ voice: voice('h'), when: 8 * DUR }],
    });

    const atOpen = poseAt(tl, 0, 1).hatGap;
    const wellOpen = poseAt(tl, 4 * DUR, 1).hatGap;
    const atClose = poseAt(tl, 8 * DUR, 1).hatGap;

    expect(wellOpen).toBeGreaterThan(HAT_CLOSED_GAP + 0.005);
    expect(atOpen).toBeLessThanOrEqual(wellOpen);
    expect(atClose).toBeCloseTo(HAT_CLOSED_GAP, 6);
  });

  it('closes on an hf chick even without a following closed hat note', () => {
    const tl = new StrokeTimeline();
    const b = bar();
    b.h[0] = 3; // open
    b.hf[8] = 1; // foot chick closes it
    tl.ingest(stepFor(0, b, 'h'));
    tl.ingest({
      t: 8 * DUR,
      dur: DUR,
      slot: 8,
      meter: M44,
      bar: b,
      next: null,
      notes: [{ voice: voice('hf'), when: 8 * DUR }],
    });
    const atChick = poseAt(tl, 8 * DUR, 1).hatGap;
    expect(atChick).toBeCloseTo(HAT_CLOSED_GAP, 6);
  });
});

describe('beatPhase', () => {
  it('is 0 with no clock', () => {
    expect(beatPhase(null, 123)).toBe(0);
  });

  it('is 0 on the pulse and sweeps 0..1 across it, in 4/4', () => {
    const clock = { t: 0, dur: 0.1, slot: 0, meter: M44 };
    expect(beatPhase(clock, 0)).toBeCloseTo(0, 9);
    expect(beatPhase(clock, 0.1)).toBeCloseTo(0.25, 9); // one of four steps into the pulse
    expect(beatPhase(clock, 0.4)).toBeCloseTo(0, 9); // a full pulse (4 steps) later, back to 0
  });

  it('wraps a time before the clock’s step into [0, 1)', () => {
    const clock = { t: 0, dur: 0.1, slot: 0, meter: M44 };
    expect(beatPhase(clock, -0.1)).toBeCloseTo(0.75, 9);
  });
});
