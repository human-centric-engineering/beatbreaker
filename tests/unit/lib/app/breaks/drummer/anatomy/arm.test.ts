/**
 * `armAngles()` — an arm's points and hand frame read back as joint angles.
 *
 * Each pose here is built by hand where the clinical answer is known (an arm
 * hanging, the elbow bent square, the hand thumb-up, palm down, palm up, the
 * wrist bent), in the pose's own conventions: model space has `+x` to the
 * drummer's right, `y` up, `-z` forward; the lead hand's frame has `x` toward
 * the thumb and the other's toward the little finger (see `ArmPose.hand`).
 */

import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { armAngles, torsoOf, twistAbout } from '@/lib/app/breaks/drummer/anatomy/arm';
import type { Hand } from '@/lib/app/breaks/drummer/kit-layout';
import type { ArmPose } from '@/lib/app/breaks/drummer/pose';

const D = Math.PI / 180;
const NONE = new Quaternion();

/** A hand frame from where its back faces and where its knuckles point. */
function handFrame(back: Vector3, knuckles: Vector3): Quaternion {
  const y = back.clone().normalize();
  // knuckles square to the back of the hand, as a real frame's are
  const z = knuckles.clone().addScaledVector(y, -knuckles.dot(y)).normalize();
  // x = y × z: the thumb on the lead hand, the little finger on the other
  const x = new Vector3().crossVectors(y, z);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

/** An arm on `hand`'s side: shoulder, elbow and wrist, and the hand's back and knuckles. */
function arm(
  hand: Hand,
  elbow: Vector3,
  wrist: Vector3,
  back: Vector3,
  knuckles: Vector3
): ArmPose {
  const side = hand === 'lead' ? 1 : -1;
  const mirror = (v: Vector3) => new Vector3(v.x * side, v.y, v.z);
  const shoulder = new Vector3(0.2 * side, 1.2, 0);
  return {
    shoulder,
    elbow: shoulder.clone().add(mirror(elbow)),
    wrist: shoulder.clone().add(mirror(elbow)).add(mirror(wrist)),
    hand: handFrame(mirror(back), mirror(knuckles)),
    grip: new Vector3(),
    stick: new Vector3(0, 0, -1),
    tip: new Vector3(),
    lift: 0,
    curl: 0.6,
    held: 'matched',
    ready: 1,
    cross: 0,
  };
}

const DOWN = new Vector3(0, -0.3, 0);
const FORWARD = new Vector3(0, 0, -0.27);
const OUT = new Vector3(1, 0, 0);
const UP = new Vector3(0, 1, 0);
const AHEAD = new Vector3(0, 0, -1);

describe('armAngles', () => {
  for (const hand of ['lead', 'other'] as const) {
    describe(`the ${hand} arm`, () => {
      it('reads an arm at the side, elbow bent square, hand thumb-up, as all zeros but the elbow', () => {
        // thumb up: the back of the hand faces out to the side
        const a = armAngles(arm(hand, DOWN, FORWARD, OUT, AHEAD), NONE, hand);
        expect(a.elevation).toBeCloseTo(0, 6);
        expect(a.flexion).toBeCloseTo(Math.PI / 2, 6);
        expect(a.rotation).toBeCloseTo(0, 6);
        expect(a.pronation).toBeCloseTo(0, 6);
        expect(a.wristFlexion).toBeCloseTo(0, 6);
        expect(a.deviation).toBeCloseTo(0, 6);
      });

      it('reads palm down as pronation, palm up as supination', () => {
        expect(armAngles(arm(hand, DOWN, FORWARD, UP, AHEAD), NONE, hand).pronation).toBeCloseTo(
          Math.PI / 2,
          6
        );
        const up = UP.clone().negate();
        expect(armAngles(arm(hand, DOWN, FORWARD, up, AHEAD), NONE, hand).pronation).toBeCloseTo(
          -Math.PI / 2,
          6
        );
      });

      it('reads the knuckles dropped toward the palm as wrist flexion, raised as extension', () => {
        // palm down: the palm faces -y; knuckles 30° down toward it
        const down = new Vector3(0, -Math.sin(30 * D), -Math.cos(30 * D));
        const flexed = armAngles(
          arm(hand, DOWN, FORWARD, new Vector3(0, Math.cos(30 * D), -Math.sin(30 * D)), down),
          NONE,
          hand
        );
        expect(flexed.wristFlexion).toBeCloseTo(30 * D, 6);
        expect(flexed.pronation).toBeCloseTo(Math.PI / 2, 6);
        const raised = new Vector3(0, Math.sin(20 * D), -Math.cos(20 * D));
        const extended = armAngles(
          arm(hand, DOWN, FORWARD, new Vector3(0, Math.cos(20 * D), Math.sin(20 * D)), raised),
          NONE,
          hand
        );
        expect(extended.wristFlexion).toBeCloseTo(-20 * D, 6);
      });

      it('reads the knuckles turned toward the thumb as radial deviation', () => {
        // thumb up, so the thumb's side is up: knuckles 15° up is toward the thumb
        const k = new Vector3(0, Math.sin(15 * D), -Math.cos(15 * D));
        const back = OUT.clone();
        const a = armAngles(arm(hand, DOWN, FORWARD, back, k), NONE, hand);
        expect(a.deviation).toBeCloseTo(15 * D, 6);
        expect(a.wristFlexion).toBeCloseTo(0, 6);
      });

      it('reads the forearm swung in toward the belly as internal rotation of the humerus', () => {
        // arm hanging, forearm pointing across the body (medial)
        const across = new Vector3(-0.27, 0, 0);
        const a = armAngles(arm(hand, DOWN, across, UP, new Vector3(-1, 0, 0)), NONE, hand);
        expect(a.rotation).toBeCloseTo(Math.PI / 2, 6);
      });

      it('reads the arm raised straight forward as 90° elevation in the forward plane', () => {
        const forward = new Vector3(0, 0, -0.3);
        const a = armAngles(arm(hand, forward, new Vector3(0, 0.27, 0), OUT, UP), NONE, hand);
        expect(a.elevation).toBeCloseTo(Math.PI / 2, 6);
        expect(a.plane).toBeCloseTo(Math.PI / 2, 6);
      });
    });
  }

  it('reads the same angles whichever way the torso has turned the whole arm', () => {
    const torso = torsoOf({ lean: 0.25, yaw: -0.3, roll: 0.05 });
    for (const hand of ['lead', 'other'] as const) {
      const a = arm(
        hand,
        new Vector3(0.05, -0.25, -0.12),
        new Vector3(-0.08, 0.05, -0.25),
        new Vector3(0.3, 1, 0.1),
        new Vector3(-0.2, -0.1, -1)
      );
      const flat = armAngles(a, NONE, hand);
      const turned: ArmPose = {
        ...a,
        shoulder: a.shoulder.clone().applyQuaternion(torso),
        elbow: a.elbow.clone().applyQuaternion(torso),
        wrist: a.wrist.clone().applyQuaternion(torso),
        hand: torso.clone().multiply(a.hand),
      };
      const read = armAngles(turned, torso, hand);
      for (const k of Object.keys(flat) as (keyof typeof flat)[]) {
        expect(read[k]).toBeCloseTo(flat[k], 6);
      }
    }
  });

  it('reads a right arm and its mirror, the left, the same', () => {
    const lead = armAngles(
      arm('lead', new Vector3(0.05, -0.25, -0.12), FORWARD, UP, AHEAD),
      NONE,
      'lead'
    );
    const other = armAngles(
      arm('other', new Vector3(0.05, -0.25, -0.12), FORWARD, UP, AHEAD),
      NONE,
      'other'
    );
    for (const k of Object.keys(lead) as (keyof typeof lead)[]) {
      expect(other[k]).toBeCloseTo(lead[k], 6);
    }
  });
});

describe('twistAbout', () => {
  it('finds the turn about an axis in a turn that also swings off it', () => {
    const q = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 0, 1), 0.7)
      .multiply(new Quaternion().setFromEuler(new Euler(0.3, -0.2, 0)));
    // the swing part (x then y, no z) has no twist about z of its own to first order
    expect(twistAbout(q, new Vector3(0, 0, 1))).toBeCloseTo(0.7, 1);
    expect(
      twistAbout(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -1.2),
        new Vector3(0, 0, 1)
      )
    ).toBeCloseTo(-1.2, 9);
  });
});
