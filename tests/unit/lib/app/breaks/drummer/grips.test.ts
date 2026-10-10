/**
 * The grips (`grips.ts`) as the stroke planner plays them, and the stick
 * tricks the waiting drummer does with them: what each grip asks of the
 * forearm, the elbow and the fingers, as `.context/app/planning/grip-research.md`
 * gives it, and the two twirls — round the thumb, and the propeller.
 */

import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { armAngles, torsoOf } from '@/lib/app/breaks/drummer/anatomy/arm';
import {
  DIGITS,
  SHAPES,
  STICK_RADIUS,
  THUMB_BASE,
  fingerGap,
  handSetOf,
} from '@/lib/app/breaks/drummer/anatomy/hand';
import { armStrain } from '@/lib/app/breaks/drummer/anatomy/rom';
import { DRUMMER_GRIP } from '@/lib/app/breaks/browser-keys';
import {
  DEFAULT_GRIPS,
  GRIP_CHOICES,
  GRIP_STYLE,
  type GripChoice,
  gripsFor,
} from '@/lib/app/breaks/drummer/grips';
import { type Hand, STICK } from '@/lib/app/breaks/drummer/kit-layout';
import { type ArmPose, poseAt, twirlAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import { SWEEP_DUR, sweepTimeline } from '@/tests/helpers/drummer-sweep';

const D = Math.PI / 180;

describe('gripsFor', () => {
  it('holds a matched grip in both hands, or traditional in the hand off the hats, or in both', () => {
    expect(gripsFor('american')).toEqual(DEFAULT_GRIPS);
    expect(gripsFor('german')).toEqual({ lead: 'german', other: 'german' });
    expect(gripsFor('french')).toEqual({ lead: 'french', other: 'french' });
    // a traditional player's lead hand is matched, American
    expect(gripsFor('traditional')).toEqual({ lead: 'american', other: 'traditional' });
    expect(gripsFor('traditionalBoth')).toEqual({ lead: 'traditional', other: 'traditional' });
  });
});

describe('DRUMMER_GRIP', () => {
  const read = (v: unknown) => DRUMMER_GRIP.schema.safeParse(v);

  it('reads every choice', () => {
    for (const c of GRIP_CHOICES) expect(read(c)).toEqual({ success: true, data: c });
  });

  it('reads the hands-only values it once stored as the grips they were', () => {
    expect(read('none').data).toBe('american');
    expect(read('other').data).toBe('traditional');
    expect(read('both').data).toBe('traditionalBoth');
    expect(read('military').success).toBe(false);
    expect(DRUMMER_GRIP.fallback).toBe('american');
  });
});

describe('GRIP_STYLE', () => {
  it('rolls the back of the hand from flat (German) through 45° (American) to thumb-up (French)', () => {
    const { german, american, french } = GRIP_STYLE;
    expect(german.roll).toBeLessThan(25 * D);
    expect(american.roll).toBeGreaterThan(35 * D);
    expect(american.roll).toBeLessThan(50 * D);
    expect(french.roll).toBeGreaterThan(75 * D);
  });

  it('strokes German from the wrist, French from the fingers and the turn of the forearm', () => {
    const { german, american, french, traditional } = GRIP_STYLE;
    expect(german.turn).toBeLessThan(american.turn);
    expect(american.turn).toBeLessThan(french.turn);
    expect(french.turn).toBeLessThan(traditional.turn);
    expect(german.loose).toBeLessThan(french.loose);
    // elbows out with the palm down, in by the ribs with the thumb up
    expect(german.elbow).toBeGreaterThan(american.elbow);
    expect(american.elbow).toBeGreaterThan(french.elbow);
  });
});

/** Every snare and tom stroke of the sweep bar, read through the anatomy, for a grip choice. */
function atHits(choice: GripChoice, hand: Hand) {
  const tl = sweepTimeline(2);
  return tl
    .all()
    .filter(
      (h) =>
        h.limb === hand &&
        ['snare', 'tom1', 'tom2', 'floor'].includes(h.piece) &&
        h.contact !== 'cross' &&
        h.contact !== 'rim'
    )
    .map((h) => {
      const pose = poseAt(tl, h.time, 1, gripsFor(choice));
      return {
        pose,
        arm: pose.arms[hand],
        angles: armAngles(pose.arms[hand], torsoOf(pose), hand),
      };
    });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('poseAt — each grip turns the forearm as it is taught', () => {
  const pronation = (choice: GripChoice, hand: Hand = 'other') =>
    mean(atHits(choice, hand).map((x) => x.angles.pronation));

  it('pronates German most, American less, French least — near thumb-up', () => {
    const german = pronation('german');
    const american = pronation('american');
    const french = pronation('french');
    expect(german).toBeGreaterThan(american + 5 * D);
    expect(american).toBeGreaterThan(french + 15 * D);
    expect(Math.abs(french)).toBeLessThan(20 * D);
  });

  it('plays traditional with the forearm supinated, 35–60° at the head', () => {
    for (const hand of ['lead', 'other'] as const) {
      const p = pronation('traditionalBoth', hand);
      expect(p, hand).toBeLessThan(-30 * D);
      expect(p, hand).toBeGreaterThan(-60 * D);
    }
  });

  it('sets a German elbow further out from the ribs than a French one', () => {
    const out = (choice: GripChoice) =>
      mean(atHits(choice, 'other').map((x) => x.arm.shoulder.x - x.arm.elbow.x));
    expect(out('german')).toBeGreaterThan(out('french') + 0.01);
  });
});

describe('poseAt — the fingers on the stick', () => {
  /** How far a finger is off the stick's surface, metres (negative: into it). */
  function gapOf(a: ArmPose, side: 1 | -1, finger: number): number {
    const inv = a.hand.clone().invert();
    const tip = a.tip.clone().sub(a.wrist).applyQuaternion(inv);
    const butt = a.tip
      .clone()
      .addScaledVector(a.stick, -STICK.length)
      .sub(a.wrist)
      .applyQuaternion(inv);
    const f = handSetOf(a, side).fingers[finger];
    return fingerGap(DIGITS[finger], side, f.splay, f.bend, butt, tip);
  }

  it.each(['german', 'american'] as const)(
    'keeps the middle finger, the fulcrum, on the stick through every stroke (%s grip)',
    (choice) => {
      const tl = sweepTimeline(2);
      for (let t = 0; t < 32 * SWEEP_DUR; t += 0.02) {
        const pose = poseAt(tl, t, 1, gripsFor(choice));
        for (const hand of ['lead', 'other'] as const) {
          const a = pose.arms[hand];
          if (a.cross > 0) continue;
          const gap = gapOf(a, hand === 'lead' ? 1 : -1, 1);
          expect(Math.abs(gap), `${hand} at ${t.toFixed(2)}`).toBeLessThan(0.0035);
        }
      }
    }
  );
});

describe('poseAt — the thumb on the stick', () => {
  /** How far the end of the thumb is above the stick's line, metres (the dressed thumb's two bones). */
  function thumbOver(a: ArmPose, side: 1 | -1): number {
    const set = handSetOf(a, side);
    const base = new Vector3(side * THUMB_BASE[0], THUMB_BASE[1], THUMB_BASE[2]);
    const q = new Quaternion().setFromEuler(new Euler(...set.thumb, 'YXZ'));
    const joint = base.clone().add(new Vector3(0, 0, 0.042).applyQuaternion(q));
    q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), set.thumbTip));
    const end = joint
      .add(new Vector3(0, 0, 0.032).applyQuaternion(q))
      .applyQuaternion(a.hand)
      .add(a.wrist);
    const butt = a.tip.clone().addScaledVector(a.stick, -STICK.length);
    const along = Math.max(0, Math.min(STICK.length, end.clone().sub(butt).dot(a.stick)));
    return end.y - butt.clone().addScaledVector(a.stick, along).y;
  }

  it('lays the thumb over the top of the stick in traditional grip, in either hand', () => {
    const tl = sweepTimeline(1);
    for (const t of [0, 0.35, 0.95]) {
      const pose = poseAt(tl, t, 1, gripsFor('traditionalBoth'));
      for (const hand of ['lead', 'other'] as const) {
        if (pose.arms[hand].cross > 0) continue;
        expect(
          thumbOver(pose.arms[hand], hand === 'lead' ? 1 : -1),
          `${hand} at ${t}`
        ).toBeGreaterThan(STICK_RADIUS);
      }
    }
  });
});

describe('twirlAt — the two twirls', () => {
  const over = (seconds: number) =>
    Array.from({ length: seconds * 40 }, (_, i) => twirlAt(i * 0.025, 0));

  it('twirls round the thumb and as a propeller, the propeller a little slower a turn', () => {
    const t = over(800);
    const kinds = new Set(
      t.flatMap((x) => [x.lead, x.other].filter((w) => w.amount > 0)).map((w) => w.kind)
    );
    expect(kinds).toEqual(new Set(['thumb', 'propeller']));
    // the fastest a turn goes, in each: a propeller's turn takes longer
    const fastest = (kind: 'thumb' | 'propeller') => {
      let top = 0;
      for (let i = 1; i < t.length; i++)
        for (const hand of ['lead', 'other'] as const)
          if (t[i][hand].kind === kind && t[i - 1][hand].kind === kind && t[i][hand].amount > 0.99)
            top = Math.max(top, (t[i][hand].spin - t[i - 1][hand].spin) / 0.025);
      return top;
    };
    expect(fastest('thumb')).toBeGreaterThan(fastest('propeller'));
  });
});

describe('poseAt — a propeller twirl', () => {
  const idle = new StrokeTimeline();

  /** The first moment a hand is all the way into a propeller and `spin` radians into it. */
  function propellerAt(hand: Hand, spin: number): number {
    for (let t = 0; t < 600; t += 1 / 120) {
      const tw = twirlAt(t, 0)[hand];
      if (tw.kind === 'propeller' && tw.amount > 0.999 && tw.spin >= spin) return t;
    }
    throw new Error('no propeller');
  }

  it.each(['lead', 'other'] as const)(
    'spins the %s stick flat across the palm, about its middle, between the first two fingers',
    (hand) => {
      const t = propellerAt(hand, Math.PI);
      const a = poseAt(idle, t, 0).arms[hand];
      const back = new Vector3(0, 1, 0).applyQuaternion(a.hand);
      // flat across the palm
      expect(Math.abs(a.stick.dot(back))).toBeLessThan(0.05);
      // turning about its middle: the grip is half a stick from the tip
      expect(a.tip.distanceTo(a.grip)).toBeCloseTo(STICK.length / 2, 6);
      // which is between the first two fingers' knuckles, out past them
      const local = a.grip.clone().sub(a.wrist).applyQuaternion(a.hand.clone().invert());
      const side = hand === 'lead' ? 1 : -1;
      expect(local.x * side).toBeGreaterThan(DIGITS[1].x);
      expect(local.x * side).toBeLessThan(DIGITS[0].x);
      expect(local.z).toBeGreaterThan(0.1);
      // the palm turned toward the drummer, the stick's disc to whoever is watching
      expect(back.z).toBeLessThan(-0.5);
      // the fingers parted round it: the first toward the thumb, the middle away
      expect(a.shape).toEqual({ kind: 'cigar', amount: 1 });
      const set = handSetOf(a, side);
      expect(set.fingers[0].splay * side).toBeGreaterThan(set.fingers[1].splay * side + 0.2);
    }
  );

  it('turns the stick about the line out of the back of the hand as it spins', () => {
    const at = (spin: number) => {
      const a = poseAt(idle, propellerAt('lead', spin), 0).arms.lead;
      return { stick: a.stick, back: new Vector3(0, 1, 0).applyQuaternion(a.hand) };
    };
    const a = at(Math.PI);
    const b = at(1.5 * Math.PI);
    // a quarter turn later it lies square to where it was, in the same plane
    expect(Math.abs(a.stick.dot(b.stick))).toBeLessThan(0.2);
    expect(a.back.angleTo(b.back)).toBeLessThan(0.5);
  });

  it('opens the hand to the cigar grip, not a shape the joints cannot make', () => {
    for (const [m, p, d] of SHAPES.cigar.bend) {
      expect(m).toBeLessThan(0.4);
      expect(d / p).toBeCloseTo(0.6, 9);
    }
  });
});

describe('poseAt — every twirl inside the joints’ ranges', () => {
  it.each(['american', 'german', 'french', 'traditionalBoth'] as const)('%s grip', (choice) => {
    const idle = new StrokeTimeline();
    let seen = 0;
    for (let t = 0; t < 300; t += 0.05) {
      const tw = twirlAt(t, 0);
      if (tw.lead.amount === 0 && tw.other.amount === 0) continue;
      const pose = poseAt(idle, t, 0, gripsFor(choice));
      const torso = torsoOf(pose);
      for (const hand of ['lead', 'other'] as const) {
        if (tw[hand].amount === 0) continue;
        seen++;
        expect(armStrain(armAngles(pose.arms[hand], torso, hand)), `${hand} at ${t}`).toEqual({});
      }
    }
    expect(seen).toBeGreaterThan(50);
  });
});
