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
import {
  HAT_CLOSED_GAP,
  BEATER_CONTACT,
  beatPhase,
  STICK_CLEAR,
  overLead,
  barCueAt,
  poseAt,
  scatterOf,
  twirlAt,
} from '@/lib/app/breaks/drummer/pose';
import { kickPlan } from '@/lib/app/breaks/drummer/kick-foot';
import { assignBar } from '@/lib/app/breaks/drummer/sticking';
import { contactOf, type Hit, StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
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
      // each note lands a little off its mark, the same every time for the same note
      const played = timeline.forLimb(hand).find((h) => h.time === now && h.piece === piece);
      expect(played).toBeDefined();
      const { tip: targetTip } = strikeTarget(piece, contact, scatterOf(played!, hand));
      const mark = strikeTarget(piece, contact).tip;
      expect(Math.hypot(...mark.map((x, k) => x - targetTip[k]))).toBeLessThan(0.06);

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

describe('scatterOf — sweeping the ride', () => {
  const ride = (step: number, contact: Contact = 'centre'): Hit => ({
    time: step,
    step,
    limb: 'lead',
    lane: 'r',
    piece: 'ride',
    contact,
    strength: 0.6,
    sure: true,
  });

  it('moves eighth notes on the ride a little at a time, but across the bow over a few bars', () => {
    const sides = Array.from({ length: 64 }, (_, i) => scatterOf(ride(i * 0.15), 'lead')[0]);
    const steps = sides.slice(1).map((x, i) => Math.abs(x - sides[i]));
    // a wipe, not a scatter: neighbouring notes land close together
    expect(Math.max(...steps)).toBeLessThan(0.45);
    // and over the run, the stick has been well to both sides
    expect(Math.max(...sides) - Math.min(...sides)).toBeGreaterThan(0.8);
  });

  it('does not sweep the bell', () => {
    const bell = ride(1, 'bell');
    const a = scatterOf(bell, 'lead');
    const b = scatterOf({ ...bell, piece: 'crash' }, 'lead');
    expect(a).toEqual(b);
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
    // (the body is still dropping into the bar's one here, which lifts the elbow a touch)
    expect(a.elbow.y).toBeLessThan(a.shoulder.y - 0.19);
    // behind the hand, not out to the side at shoulder height
    expect(a.elbow.z).toBeGreaterThan(a.wrist.z);
    expect(wristBend(a)).toBeLessThan(0.35);
  });

  it('strokes from the wrist: the hand turns up with the stick, the forearm much less', () => {
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
    // the wrist starts the stroke, so the forearm moves a little with it — well under the hand
    expect(forearm(up).angleTo(forearm(atHit))).toBeLessThan(handTurn * 0.6);
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

  it.each([
    ['crash', 'c'],
    ['floor tom', 't3'],
  ] as const)('heads for the %s as soon as the snare stroke is off the head', (_, lane) => {
    // a run on the snare, so both hands come off it
    const tl = notes([
      { step: 0, lane: 's', value: 2 },
      { step: 1, lane: 's', value: 2 },
      { step: 12, lane },
    ]);
    const reach = tl.all().find((h) => h.lane === lane)!;
    const hand = reach.limb as Hand;
    const snare = tl.all().findLast((h) => h.piece === 'snare' && h.limb === hand)!;
    const [gx, , gz] = strikeTarget(reach.piece, reach.contact).tip;
    // across the kit: the stick's own lift for the next stroke is not the hand moving
    const across = (t: number) => {
      const tip = poseAt(tl, t, 1).arms[hand].tip;
      return Math.hypot(tip.x - gx, tip.z - gz);
    };
    const whole = across(snare.time);
    // a third of the way through a long gap, the hand is well on its way
    expect(across(snare.time + 4 * DUR)).toBeLessThan(whole * 0.75);
    // and it is there, waiting, before the note
    expect(across(11 * DUR)).toBeLessThan(0.06);
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

describe('poseAt — the stroke bounces in the fingers', () => {
  function snareTimeline(): StrokeTimeline {
    const b = bar();
    b.s[4] = 2;
    b.s[8] = 2;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) {
      tl.ingest({
        t: i * 0.125,
        dur: 0.125,
        slot: i,
        meter: M44,
        bar: b,
        next: null,
        notes: b.s[i] ? [{ voice: voice('s'), when: i * 0.125 }] : [],
      });
    }
    return tl;
  }

  it('sends the tip well up off the head while the hand hardly rises', () => {
    const tl = snareTimeline();
    const hit = poseAt(tl, 4 * 0.125, 1).arms.other;
    const off = poseAt(tl, 4 * 0.125 + 0.07, 1).arms.other;
    const tipUp = off.tip.y - hit.tip.y;
    expect(tipUp).toBeGreaterThan(0.08);
    // the fingers, not the hand: the tip goes several times as far
    expect(off.grip.y - hit.grip.y).toBeLessThan(tipUp / 5);
    expect(off.elbow.distanceTo(hit.elbow)).toBeLessThan(0.01);
  });

  it('cocks the wrist before the next stroke: the hand has come up to the stick', () => {
    const tl = snareTimeline();
    const hit = poseAt(tl, 4 * 0.125, 1).arms.other;
    const off = poseAt(tl, 4 * 0.125 + 0.07, 1).arms.other;
    const cocked = poseAt(tl, 4 * 0.125 + 0.38, 1).arms.other;
    expect(cocked.grip.y - hit.grip.y).toBeGreaterThan(off.grip.y - hit.grip.y + 0.01);
  });

  it('holds the stick in line with the forearm at the snare', () => {
    const tl = snareTimeline();
    const a = poseAt(tl, 4 * 0.125, 1).arms.other;
    const fore = a.wrist.clone().sub(a.elbow).normalize();
    expect(fore.angleTo(new Vector3(0, 0, 1).applyQuaternion(a.hand))).toBeLessThan(0.2);
  });
});

describe('poseAt — counting in', () => {
  function countIn(): StrokeTimeline {
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) {
      tl.ingest({
        t: i * 0.125,
        dur: 0.125,
        slot: i,
        count: true,
        meter: M44,
        bar: null,
        next: null,
        notes: [],
      });
    }
    return tl;
  }

  /** The closest the two sticks' centre lines come, metres. */
  function shaftGap(p: ReturnType<typeof poseAt>): number {
    const seg = (a: ReturnType<typeof poseAt>['arms']['lead']) => [
      a.grip.clone().addScaledVector(a.stick, -0.13),
      a.tip,
    ];
    const [p1, q1] = seg(p.arms.lead);
    const [p2, q2] = seg(p.arms.other);
    let best = Infinity;
    for (let s = 0; s <= 1; s += 0.02)
      for (let u = 0; u <= 1; u += 0.02)
        best = Math.min(best, p1.clone().lerp(q1, s).distanceTo(p2.clone().lerp(q2, u)));
    return best;
  }

  it('crosses the sticks in front of the chest and clicks them together on the pulse', () => {
    const tl = countIn();
    const click = poseAt(tl, 4 * 0.125, 1);
    const between = poseAt(tl, 6 * 0.125, 1);
    // touching on the click (two stick thicknesses), apart between
    expect(shaftGap(click)).toBeLessThan(0.022);
    expect(shaftGap(between)).toBeGreaterThan(0.03);
    // raised: both hands up at the chest, the sticks pointing up
    for (const hand of ['lead', 'other'] as const) {
      expect(click.arms[hand].wrist.y).toBeGreaterThan(0.95);
      expect(click.arms[hand].stick.y).toBeGreaterThan(0.3);
    }
  });

  it('keeps the sticks up between clicks at a slow count, not back down to the drums', () => {
    const tl = new StrokeTimeline();
    const dur = 0.3; // a quarter-note count at 50: the clicks 1.2 s apart
    let ingested = 0;
    for (let t = 0.05; t < N * dur; t += 0.05) {
      // steps arrive a little ahead of when they sound, as the transport hands them over
      for (; ingested < N && ingested * dur <= t + 0.15; ingested++)
        tl.ingest({
          t: ingested * dur,
          dur,
          slot: ingested,
          count: true,
          meter: M44,
          bar: null,
          next: null,
          notes: [],
        });
      if (t < 4 * dur || t > 12 * dur) continue; // between the first click and the last
      const { arms } = poseAt(tl, t, 1);
      // the tips stay up in front of the chest, well clear of the snare and hats below
      for (const hand of ['lead', 'other'] as const) expect(arms[hand].tip.y).toBeGreaterThan(1.0);
    }
  });

  it('counts from the arm, not the wrist: the elbow and wrist travel, the stick stays fixed in the hand', () => {
    const tl = countIn();
    const click = poseAt(tl, 4 * 0.125, 1).arms.lead;
    // the top of the stroke between two clicks
    const tops = [5, 5.5, 6, 6.5, 7].map((s) => poseAt(tl, s * 0.125, 1).arms.lead);
    const top = tops.reduce((a, b) => (b.tip.y > a.tip.y ? b : a));
    const tipUp = top.tip.y - click.tip.y;
    // big enough to be seen from the back of the room
    expect(tipUp).toBeGreaterThan(0.2);
    // most of it is the arm: the wrist rises nearly as far as the tip, and the elbow comes up and out
    expect(top.wrist.y - click.wrist.y).toBeGreaterThan(tipUp * 0.6);
    expect(top.elbow.distanceTo(click.elbow)).toBeGreaterThan(0.06);
    // the stick does not turn up in the fingers: its angle off the palm's plane holds
    const offPalm = (a: typeof top) =>
      Math.asin(a.stick.dot(new Vector3(0, 1, 0).applyQuaternion(a.hand)));
    expect(Math.abs(offPalm(top) - offPalm(click))).toBeLessThan(0.02);
    // and the wrist hardly bends: the hand goes up with the forearm
    const bend = (a: typeof top) =>
      a.wrist
        .clone()
        .sub(a.elbow)
        .normalize()
        .angleTo(new Vector3(0, 0, 1).applyQuaternion(a.hand));
    expect(Math.abs(bend(top) - bend(click))).toBeLessThan(0.15);
  });

  it('clicks with the lead stick coming down and the other coming up to meet it', () => {
    const tl = countIn();
    const click = poseAt(tl, 8 * 0.125, 1).arms;
    const before = poseAt(tl, 8 * 0.125 - 0.1, 1).arms;
    // a moment before the click: the lead stick is above where they meet, the other below
    expect(before.lead.tip.y).toBeGreaterThan(click.lead.tip.y + 0.04);
    expect(before.other.tip.y).toBeLessThan(click.other.tip.y - 0.02);
    // and the other comes up with the arm, not just the stick
    expect(before.other.wrist.y).toBeLessThan(click.other.wrist.y - 0.01);
  });
});

describe('poseAt — keeping time on the hats moves the hand', () => {
  it('rides the hand up and down with the strokes, never twice at quite the same height', () => {
    const b = bar();
    for (let i = 0; i < N; i += 2) b.h[i] = 1;
    const tl = new StrokeTimeline();
    const dur = 0.13;
    const peaks: number[] = [];
    let ingested = 0;
    for (let s = 0; s < 3 * N; s += 2) {
      while (ingested <= s + 1) {
        const i = ingested % N;
        tl.ingest({
          t: ingested * dur,
          dur,
          slot: i,
          meter: M44,
          bar: b,
          next: b,
          notes: b.h[i] ? [{ voice: voice('h'), when: ingested * dur }] : [],
        });
        ingested++;
      }
      if (s < N) continue;
      let top = -Infinity;
      for (let f = 0; f < 1; f += 0.05) {
        top = Math.max(top, poseAt(tl, (s + f * 2) * dur, 1).arms.lead.grip.y);
      }
      const atHit = poseAt(tl, s * dur, 1).arms.lead.grip.y;
      peaks.push(top - atHit);
    }
    // the hand itself rises into each stroke
    expect(Math.min(...peaks)).toBeGreaterThan(0.01);
    // and not by the same amount every time
    expect(Math.max(...peaks) - Math.min(...peaks)).toBeGreaterThan(0.004);
  });
});

describe('poseAt — crossed over', () => {
  it('never brings the snare stick up through the hat stick above it', () => {
    // eighths on the hats (one hand), a ghost-and-accent backbeat on the snare: the
    // other hand lifts for its accents under the lead hand crossed over it
    const b = bar();
    for (let i = 0; i < N; i += 2) b.h[i] = 1;
    for (const [i, v] of [
      [4, 3],
      [7, 1],
      [10, 1],
      [12, 3],
    ] as const)
      b.s[i] = v;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) {
      const lanes = (['h', 's'] as const).filter((lane) => b[lane][i]);
      if (!lanes.length) continue;
      tl.ingest({
        ...stepFor(i, b, 'h'),
        notes: lanes.map((lane) => ({ voice: voice(lane), when: i * DUR })),
      });
    }

    let crossings = 0;
    for (let now = 0; now < N * DUR; now += 0.004) {
      const { arms } = poseAt(tl, now, 1);
      const over = overLead(arms.lead, arms.other);
      if (over === undefined) continue;
      crossings++;
      expect(over).toBeLessThan(-STICK_CLEAR + 1e-3);
    }
    expect(crossings).toBeGreaterThan(50); // the sticks really do cross through the bar
  });
});

describe('poseAt — the wrist leads the stroke', () => {
  /** Snare notes a beat apart for the other hand. */
  function snares(): StrokeTimeline {
    const b = bar();
    b.s[0] = 2;
    b.s[8] = 2;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) tl.ingest(stepFor(i, b, 's'));
    return tl;
  }

  it('turns the wrist down before the tip, so the stick follows it like a whip', () => {
    const tl = snares();
    const hit = tl.all().filter((h) => h.piece === 'snare')[1];
    const hand = hit.limb as Hand;
    // the top of the stroke into the second note: when do the wrist and the tip peak?
    let wristTop = { t: 0, y: -Infinity };
    let tipTop = { t: 0, y: -Infinity };
    for (let t = hit.time - 0.3; t <= hit.time; t += 0.005) {
      const a = poseAt(tl, t, 1).arms[hand];
      if (a.wrist.y > wristTop.y) wristTop = { t, y: a.wrist.y };
      if (a.tip.y > tipTop.y) tipTop = { t, y: a.tip.y };
    }
    expect(tipTop.t - wristTop.t).toBeGreaterThan(0.01);
  });

  it('still meets the head exactly where it is aimed', () => {
    const tl = snares();
    const hit = tl.all().filter((h) => h.piece === 'snare')[1];
    const a = poseAt(tl, hit.time, 1).arms[hit.limb as Hand];
    const want = new Vector3(
      ...strikeTarget('snare', hit.contact, scatterOf(hit, hit.limb as Hand)).tip
    );
    expect(a.tip.distanceTo(want)).toBeLessThan(0.001);
  });
});

describe('poseAt — the hand rolls with the piece', () => {
  /** How far the back of a hand is turned from facing straight up, radians. */
  function rollOf(a: ReturnType<typeof poseAt>['arms']['lead']): number {
    return new Vector3(0, 1, 0).applyQuaternion(a.hand).angleTo(new Vector3(0, 1, 0));
  }

  function at(lane: LaneKey): ReturnType<typeof poseAt>['arms']['lead'] {
    const b = bar();
    b[lane][4] = 1;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) tl.ingest(stepFor(i, b, lane));
    const h = tl.all()[0];
    return poseAt(tl, h.time, 1).arms[h.limb as Hand];
  }

  it('plays the ride with the thumb further up than on a drum', () => {
    expect(rollOf(at('r'))).toBeGreaterThan(rollOf(at('t3')) + 0.15);
  });

  it('never plays a drum with the hand flat: about 40° or more', () => {
    expect(rollOf(at('t3'))).toBeGreaterThan(0.6);
    expect(rollOf(at('s'))).toBeGreaterThan(0.6);
  });
});

describe('poseAt — the ride bounces', () => {
  it('lets the stick come up off the bow between eighths, pointing up at the top', () => {
    const b = bar();
    for (let i = 0; i < N; i += 2) b.r[i] = 1;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) tl.ingest(stepFor(i, b, 'r'));
    const at = (t: number) => poseAt(tl, t, 1).arms.lead;
    const hit = at(4 * DUR);
    let top = hit;
    for (let t = 4 * DUR; t < 6 * DUR; t += 0.01) if (at(t).tip.y > top.tip.y) top = at(t);
    expect(top.tip.y - hit.tip.y).toBeGreaterThan(0.06);
    // on the bow it points down at the cymbal; at the top it points up off it
    expect(hit.stick.y).toBeLessThan(0);
    expect(top.stick.y).toBeGreaterThan(0.05);
  });
});

describe('twirlAt — a stick trick while waiting for Play', () => {
  const over = (groove: number, seconds = 150) =>
    Array.from({ length: seconds * 20 }, (_, i) => twirlAt(i * 0.05, groove));

  it('twirls now and then, with either hand and sometimes both', () => {
    const t = over(0, 600);
    const busy = t.filter((x) => x.lead.amount > 0.9 || x.other.amount > 0.9).length / t.length;
    expect(busy).toBeGreaterThan(0.02);
    expect(busy).toBeLessThan(0.2);
    expect(t.some((x) => x.lead.amount > 0.9 && x.other.amount === 0)).toBe(true);
    expect(t.some((x) => x.other.amount > 0.9 && x.lead.amount === 0)).toBe(true);
    expect(t.some((x) => x.lead.amount > 0.5 && x.other.amount > 0.5)).toBe(true);
  });

  it('lifts to a different height and spins a different number of turns from one trick to the next', () => {
    const t = over(0, 600);
    const tricks: { raise: number; turns: number }[] = [];
    for (const hand of ['lead', 'other'] as const) {
      let spun = 0;
      let raise = 0;
      for (const x of t) {
        if (x[hand].amount > 0) {
          spun = Math.max(spun, x[hand].spin);
          raise = x[hand].raise;
        } else if (spun) {
          tricks.push({ raise, turns: Math.round(spun / (2 * Math.PI)) });
          spun = 0;
        }
      }
    }
    expect(tricks.length).toBeGreaterThan(8);
    const raises = tricks.map((x) => x.raise);
    expect(Math.max(...raises) - Math.min(...raises)).toBeGreaterThan(0.08);
    expect(new Set(tricks.map((x) => x.turns))).toEqual(new Set([1, 2, 3]));
  });

  it('never while playing, nor as the groove first comes in', () => {
    for (const groove of [1, 0.999, 0.2])
      expect(over(groove).every((x) => x.lead.spin === 0 && x.other.spin === 0)).toBe(true);
  });

  it('never with a note or a count anywhere near', () => {
    // a click every half second, all the way through
    const clicks: Hit[] = Array.from({ length: 300 }, (_, i) => ({
      time: i * 0.5,
      step: i * 0.5,
      limb: 'lead',
      lane: 's',
      piece: 'sticks',
      contact: 'centre',
      strength: 0.9,
      sure: true,
    }));
    const t = Array.from({ length: 2900 }, (_, i) => twirlAt(i * 0.05, 0, clicks));
    expect(t.every((x) => x.lead.spin === 0 && x.other.spin === 0)).toBe(true);
  });

  it.each(['lead', 'other'] as const)(
    'lifts the %s hand and spins its stick in the pose',
    (hand) => {
      const t = over(0, 600);
      const i = t.findIndex(
        (x) => x[hand].amount > 0.99 && x[hand].spin > 2.5 && x[hand].spin < 3.8
      );
      expect(i).toBeGreaterThan(-1);
      const tl = new StrokeTimeline();
      const pose = poseAt(tl, i * 0.05, 0).arms[hand];
      const rest = poseAt(tl, 0, 0).arms[hand];
      expect(pose.grip.y - rest.grip.y).toBeGreaterThan(t[i][hand].raise * 0.6);
      // half-way round: the stick points back the other way
      expect(pose.stick.angleTo(rest.stick)).toBeGreaterThan(2);
    }
  );
});

describe('barCueAt — the hands come up for a new bar', () => {
  const crashAt = (time: number): Hit => ({
    time,
    step: time,
    limb: 'lead',
    lane: 'c',
    piece: 'crash',
    contact: 'centre',
    strength: 0.95,
    sure: true,
  });
  const ones = (time: number) => [{ time, change: false }];

  it('rises into every one, by a different amount each bar, and settles as it lands', () => {
    const peaks = Array.from({ length: 20 }, (_, i) =>
      barCueAt(ones(10 + i * 2), [], 10 + i * 2 - 0.05)
    );
    for (const p of peaks) {
      expect(p).toBeGreaterThan(0.06);
      expect(p).toBeLessThan(0.25);
    }
    expect(new Set(peaks.map((p) => p.toFixed(4))).size).toBe(peaks.length);
    // nothing a beat before, nothing once the one has landed
    expect(barCueAt(ones(10), [], 9.2)).toBe(0);
    expect(barCueAt(ones(10), [], 10.2)).toBe(0);
  });

  it('comes up more when the pattern changes on the one', () => {
    for (let i = 0; i < 20; i++) {
      const one = 10 + i * 2;
      const same = barCueAt([{ time: one, change: false }], [], one - 0.05);
      const change = barCueAt([{ time: one, change: true }], [], one - 0.05);
      expect(change).toBeGreaterThan(0.24);
      expect(change).toBeGreaterThan(same);
    }
  });

  it('comes up much higher for the hand bringing a crash in on the one', () => {
    for (let i = 0; i < 20; i++) {
      const one = 10 + i * 2;
      const plain = barCueAt(ones(one), [], one - 0.05);
      const crash = barCueAt(ones(one), [crashAt(one)], one - 0.05);
      expect(crash).toBeGreaterThan(0.55);
      expect(crash).toBeGreaterThan(plain * 1.5);
    }
  });

  it('still brings the crash down exactly on its mark', () => {
    const groove = bar();
    for (let i = 0; i < N; i += 2) groove.h[i] = 1;
    const into = bar();
    into.c[0] = 1;
    const tl = new StrokeTimeline();
    for (let i = 0; i < N; i++) tl.ingest({ ...stepFor(i, groove, 'h'), next: into });
    tl.ingest({ ...stepFor(N, into, 'c'), slot: 0 });
    const crash = tl.all().find((h) => h.piece === 'crash')!;
    const hand = crash.limb as Hand;
    const at = poseAt(tl, crash.time, 1).arms[hand].tip;
    const want = new Vector3(...strikeTarget('crash', crash.contact, scatterOf(crash, hand)).tip);
    expect(at.distanceTo(want)).toBeLessThan(0.001);
  });
});
