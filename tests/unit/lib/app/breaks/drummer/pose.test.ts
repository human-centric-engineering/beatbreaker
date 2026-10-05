import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { RIMSHOT } from '@/lib/app/breaks/lanes';
import { METERS } from '@/lib/app/breaks/meter';
import type { Voice } from '@/lib/app/breaks/perform';
import {
  BODY,
  BOARD_LENGTH,
  type Contact,
  KICK_PEDAL,
  type Hand,
  type PieceId,
  strikeTarget,
} from '@/lib/app/breaks/drummer/kit-layout';
import { HAT_CLOSED_GAP, BEATER_CONTACT, beatPhase, poseAt } from '@/lib/app/breaks/drummer/pose';
import { kickPlan } from '@/lib/app/breaks/drummer/kick-foot';
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

describe('poseAt — the kick foot', () => {
  /** A bar of kicks at `slots`, played on a pass starting at `t0`, every step ingested. */
  function kickTimeline(slots: number[], t0: number): StrokeTimeline {
    const b = bar();
    for (const i of slots) b.k[i] = 1;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) {
      tl.ingest({
        t: t0 + i * DUR,
        dur: DUR,
        slot: i,
        meter: M44,
        bar: b,
        next: null,
        notes: b.k[i] ? [{ voice: voice('k'), when: t0 + i * DUR }] : [],
      });
    }
    return tl;
  }

  /** The height of the kick board's hinge line `d` metres along it, tipped up `board`. */
  function boardY(board: number, d: number): number {
    return KICK_PEDAL.heel[1] + Math.sin(board) * d;
  }

  it('keeps the foot and leg in one piece through every frame of a busy bar', () => {
    const tl = kickTimeline([0, 4, 5, 8, 9, 10, 12, 13, 14, 15], 0);
    for (let now = 0; now < N * DUR; now += 0.01) {
      const l = poseAt(tl, now, 1).legs.kickFoot;
      expect(l.heel.distanceTo(l.ball)).toBeCloseTo(BODY.foot, 6);
      expect(l.hip.distanceTo(l.knee)).toBeCloseTo(BODY.thigh, 6);
      expect(l.knee.distanceTo(l.ankle)).toBeCloseTo(BODY.shin, 6);
    }
  });

  it('has the foot touching the board at the instant of each kick', () => {
    const tl = kickTimeline([0, 4, 5, 8, 9, 10], 0);
    for (const slot of [0, 4, 5, 8, 9, 10]) {
      const l = poseAt(tl, slot * DUR, 1).legs.kickFoot;
      // whichever end of the foot is lower is the one on the board
      const low = l.heel.y < l.ball.y ? l.heel : l.ball;
      const along = (KICK_PEDAL.heel[2] - low.z) / Math.cos(l.board);
      expect(along).toBeLessThan(BOARD_LENGTH);
      const above = low.y - boardY(l.board, along);
      expect(above).toBeGreaterThan(0.015);
      expect(above).toBeLessThan(0.04);
    }
  });

  it('lifts the leg into a heel-up stroke: the heel is higher halfway to the next note', () => {
    // a lone loud kick every half bar: heel up, the leg rising between
    const b = bar();
    b.k[0] = 2;
    b.k[8] = 2;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) {
      tl.ingest({
        t: i * DUR,
        dur: DUR,
        slot: i,
        meter: M44,
        bar: b,
        next: null,
        notes: b.k[i] ? [{ voice: voice('k'), when: i * DUR }] : [],
      });
    }
    const atHit = poseAt(tl, 8 * DUR, 1).legs.kickFoot;
    const before = poseAt(tl, 6 * DUR, 1).legs.kickFoot;
    expect(before.heel.y).toBeGreaterThan(atHit.heel.y + 0.02);
    expect(before.knee.y).toBeGreaterThan(atHit.knee.y);
  });

  it('rocks the foot on a heel–toe double: heel down for the first, ball down for the second', () => {
    let found = false;
    for (let pass = 0; pass < 60 && !found; pass++) {
      const t0 = pass * 3.3;
      const tl = kickTimeline([4, 5], t0);
      if (kickPlan(tl.forLimb('kickFoot'))[0].technique !== 'heelToe') continue;
      found = true;
      const first = poseAt(tl, t0 + 4 * DUR, 1).legs.kickFoot;
      const second = poseAt(tl, t0 + 5 * DUR, 1).legs.kickFoot;
      expect(first.heel.y).toBeLessThan(first.ball.y);
      expect(second.heel.y).toBeGreaterThan(second.ball.y);
    }
    expect(found).toBe(true);
  });

  it('swings the heel sideways on a swivelled run', () => {
    let found = false;
    for (let pass = 0; pass < 80 && !found; pass++) {
      const t0 = pass * 3.3;
      const tl = kickTimeline([4, 5, 6, 7], t0);
      if (!kickPlan(tl.forLimb('kickFoot')).every((n) => n.technique === 'swivel')) continue;
      found = true;
      const offsets = [4, 5].map((i) => {
        const l = poseAt(tl, t0 + i * DUR, 1).legs.kickFoot;
        return l.heel.x - l.ball.x;
      });
      // in on one note, out on the next: centimetres apart
      expect(Math.abs(offsets[0] - offsets[1])).toBeGreaterThan(0.04);
    }
    expect(found).toBe(true);
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

describe('poseAt — the hands', () => {
  /** A timeline of `lane` notes at the given steps, every step ingested. */
  function notes(
    plan: { step: number; lane: LaneKey; value?: number }[],
    steps = N
  ): StrokeTimeline {
    const b = bar();
    for (const { step, lane, value } of plan) b[lane][step] = value ?? 1;
    const tl = new StrokeTimeline();
    for (let i = 0; i < steps; i++) {
      const lanes = plan.filter((p) => p.step === i).map((p) => p.lane);
      tl.ingest({
        t: i * DUR,
        dur: DUR,
        slot: i % N,
        meter: M44,
        bar: b,
        next: null,
        notes: lanes.map((l) => ({ voice: voice(l), when: i * DUR })),
      });
    }
    return tl;
  }

  function wristBend(a: ReturnType<typeof poseAt>['arms']['lead']): number {
    const fore = a.wrist.clone().sub(a.elbow).normalize();
    const knuckles = new Vector3(0, 0, 1).applyQuaternion(a.hand);
    return fore.angleTo(knuckles);
  }

  it('plays the snare with the elbow hanging by the ribs and the wrist in line', () => {
    const tl = notes([{ step: 4, lane: 's', value: 2 }]);
    const a = poseAt(tl, 4 * DUR, 1).arms.other;
    expect(a.elbow.y).toBeLessThan(a.shoulder.y - 0.2);
    // behind the hand, not out to the side at shoulder height
    expect(a.elbow.z).toBeGreaterThan(a.wrist.z);
    expect(wristBend(a)).toBeLessThan(0.35);
  });

  it('strokes from the wrist: the hand turns up with the stick, the forearm hardly moves', () => {
    // plain hits: wrist strokes, below the height where the forearm joins in
    const tl = notes([
      { step: 4, lane: 's', value: 2 },
      { step: 12, lane: 's', value: 2 },
    ]);
    const atHit = poseAt(tl, 12 * DUR, 1).arms.other;
    const up = poseAt(tl, 10 * DUR, 1).arms.other;
    const knuckles = (a: typeof up) => new Vector3(0, 0, 1).applyQuaternion(a.hand);
    const forearm = (a: typeof up) => a.wrist.clone().sub(a.elbow).normalize();
    const handTurn = knuckles(up).angleTo(knuckles(atHit));
    expect(handTurn).toBeGreaterThan(0.15);
    expect(forearm(up).angleTo(forearm(atHit))).toBeLessThan(handTurn / 2);
  });

  it('lets the stick run ahead of the hand off the head, and settle back in it', () => {
    const tl = notes([{ step: 4, lane: 's', value: 2 }]);
    const relative = (a: ReturnType<typeof poseAt>['arms']['other']) =>
      a.stick.angleTo(new Vector3(0, 0, 1).applyQuaternion(a.hand));
    const rebound = relative(poseAt(tl, 4 * DUR + 0.015, 1).arms.other);
    const settled = relative(poseAt(tl, 4 * DUR + 0.6, 1).arms.other);
    expect(Math.abs(rebound - settled)).toBeGreaterThan(0.03);
  });

  it('rests both sticks over the snare before the first note', () => {
    const rest = poseAt(new StrokeTimeline(), 0, 0);
    const [sx, , sz] = strikeTarget('snare').tip;
    for (const hand of ['lead', 'other'] as const) {
      const { tip } = rest.arms[hand];
      expect(Math.hypot(tip.x - sx, tip.z - sz)).toBeLessThan(0.15);
    }
  });

  it('goes back to the snare after a floor tom, given the time', () => {
    const tl = notes([
      { step: 0, lane: 's', value: 2 },
      { step: 1, lane: 't3' },
      { step: 15, lane: 's', value: 2 },
    ]);
    const mid = poseAt(tl, 8 * DUR, 1);
    const [sx, , sz] = strikeTarget('snare').tip;
    const [fx, , fz] = strikeTarget('floor').tip;
    const hand = tl.all().find((h) => h.piece === 'floor')!.limb as Hand;
    const tip = mid.arms[hand].tip;
    expect(Math.hypot(tip.x - sx, tip.z - sz)).toBeLessThan(Math.hypot(tip.x - fx, tip.z - fz));
  });

  it('goes back to the ride, not the hats, when the ride was what it was keeping time on', () => {
    const tl = notes([
      { step: 0, lane: 'r' },
      { step: 2, lane: 'r' },
      { step: 4, lane: 't3' },
      { step: 15, lane: 'r' },
    ]);
    expect(tl.all().find((h) => h.piece === 'floor')!.limb).toBe('lead');
    const mid = poseAt(tl, 10 * DUR, 1).arms.lead.tip;
    const [rx, , rz] = strikeTarget('ride').tip;
    const [hx, , hz] = strikeTarget('hat').tip;
    const [tx, , tz] = strikeTarget('floor').tip;
    const toRide = Math.hypot(mid.x - rx, mid.z - rz);
    expect(toRide).toBeLessThan(Math.hypot(mid.x - hx, mid.z - hz));
    expect(toRide).toBeLessThan(Math.hypot(mid.x - tx, mid.z - tz));
  });
});

describe('poseAt — keeping time when not playing', () => {
  /** Hats on the eighths and a backbeat, two bars of it, every step ingested. */
  function groove(): StrokeTimeline {
    const b = bar();
    for (let i = 0; i < N; i += 2) b.h[i] = 1;
    b.s[4] = 2;
    b.s[12] = 2;
    const tl = new StrokeTimeline();
    for (let k = 0; k < 2 * N; k++) {
      const i = k % N;
      const lanes = (['h', 's'] as const).filter((l) => b[l][i]);
      tl.ingest({
        t: k * DUR,
        dur: DUR,
        slot: i,
        meter: M44,
        bar: b,
        next: b,
        notes: lanes.map((l) => ({ voice: voice(l), when: k * DUR })),
      });
    }
    return tl;
  }

  /** The other hand's samples between the backbeats of the second bar. */
  function between(tl: StrokeTimeline, g: number) {
    const out = [];
    for (let s = N + 6.5; s < N + 10.5; s += 0.25) out.push(poseAt(tl, s * DUR, g).arms.other);
    return out;
  }
  const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

  it('keeps the idle stick, elbow and shoulder moving with the pulse while grooving', () => {
    const tl = groove();
    const grooving = between(tl, 1);
    const still = between(tl, 0);
    // what the groove adds on top of the strokes themselves
    const air = grooving.map((a, i) => a.tip.y - still[i].tip.y);
    expect(spread(air)).toBeGreaterThan(0.02);
    expect(spread(grooving.map((a, i) => a.elbow.x - still[i].elbow.x))).toBeGreaterThan(0.01);
    expect(spread(grooving.map((a, i) => a.shoulder.y - still[i].shoulder.y))).toBeGreaterThan(
      0.005
    );
  });

  it('leaves the stroke itself alone: nothing added at the instant of a note', () => {
    const tl = groove();
    for (const step of [N + 4, N + 12]) {
      const g = poseAt(tl, step * DUR, 1).arms.other.tip;
      const s = poseAt(tl, step * DUR, 0).arms.other.tip;
      expect(g.distanceTo(s)).toBeLessThan(1e-9);
    }
  });

  it('keeps the idle stick clear of the head', () => {
    const sy = strikeTarget('snare').tip[1];
    for (const a of between(groove(), 1)) expect(a.tip.y).toBeGreaterThan(sy + 0.01);
  });
});
