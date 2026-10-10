/**
 * The joint limits (`rom.ts`), and every hand the drummers make held to them:
 * the grip tables in `anatomy/hand.ts` are what every figure bends its
 * fingers by, so a table that asked a joint for more than it has would put
 * that strain on every drummer at once.
 */

import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { armAngles, torsoOf } from '@/lib/app/breaks/drummer/anatomy/arm';
import { handSetOf } from '@/lib/app/breaks/drummer/anatomy/hand';
import {
  DIP_OF_PIP,
  ROM,
  armStrain,
  beyond,
  scapularRotation,
  splayLimit,
} from '@/lib/app/breaks/drummer/anatomy/rom';
import { type ArmPose, type Grip, gripsFor, poseAt } from '@/lib/app/breaks/drummer/pose';
import { SWEEP_DUR, sweepTimeline } from '@/tests/helpers/drummer-sweep';

const D = Math.PI / 180;

/** An arm pose with only what the hand tables read set. */
function handAt(held: Grip, curl: number, cross: number, ready: number, lift: number): ArmPose {
  return {
    shoulder: new Vector3(),
    elbow: new Vector3(),
    wrist: new Vector3(),
    hand: torsoOf({ lean: 0, yaw: 0, roll: 0 }),
    grip: new Vector3(),
    stick: new Vector3(0, 0, -1),
    tip: new Vector3(),
    lift,
    curl,
    held,
    cross,
    ready,
  };
}

/** Every hand the tables can make: both grips, open to closed, playing, set down for a cross-stick and ready. */
function everyHand(): ArmPose[] {
  const out: ArmPose[] = [];
  for (const held of ['matched', 'military'] as const) {
    for (const curl of [0, 0.5, 1]) {
      for (const cross of [0, 0.5, 1]) {
        for (const ready of [0, 1]) {
          for (const lift of [0, 0.05, 0.2]) out.push(handAt(held, curl, cross, ready, lift));
        }
      }
    }
  }
  return out;
}

describe('ROM', () => {
  it('has every soft range inside its hard one', () => {
    for (const [name, m] of Object.entries(ROM)) {
      expect(m.soft.min, name).toBeGreaterThanOrEqual(m.hard.min);
      expect(m.soft.max, name).toBeLessThanOrEqual(m.hard.max);
      expect(m.hard.min, name).toBeLessThan(m.hard.max);
    }
  });

  it('holds the clinical norms it cites', () => {
    expect(ROM.elbowFlexion.hard.max).toBeCloseTo(145 * D, 9);
    expect(ROM.pronation.hard.max).toBeCloseTo(80 * D, 9);
    expect(ROM.wristFlexion.hard.max).toBeCloseTo(80 * D, 9);
    expect(ROM.wristFlexion.hard.min).toBeCloseTo(-70 * D, 9);
    expect(ROM.deviation.hard.max).toBeCloseTo(20 * D, 9);
    expect(ROM.pip.hard.max).toBeCloseTo(105 * D, 9);
  });
});

describe('beyond', () => {
  it('is 0 inside a range and the overshoot outside it', () => {
    const r = { min: -1, max: 2 };
    expect(beyond(0.5, r)).toBe(0);
    expect(beyond(2.5, r)).toBeCloseTo(0.5, 9);
    expect(beyond(-1.25, r)).toBeCloseTo(0.25, 9);
    expect(beyond(NaN, r)).toBe(0);
  });
});

describe('splayLimit', () => {
  it('lets a straight knuckle fan its full 20° and a bent one less, to nothing at 90°', () => {
    expect(splayLimit(0)).toBeCloseTo(20 * D, 9);
    expect(splayLimit(45 * D)).toBeCloseTo(10 * D, 9);
    expect(splayLimit(Math.PI / 2)).toBeCloseTo(0, 9);
  });
});

describe('scapularRotation', () => {
  it('turns the scapula a little in the first 30° and 4 of every 9 degrees after, to about 50°', () => {
    expect(scapularRotation(0)).toBe(0);
    expect(scapularRotation(30 * D)).toBeCloseTo(6 * D, 9);
    expect(scapularRotation(120 * D)).toBeCloseTo(46 * D, 9);
    expect(scapularRotation(180 * D)).toBeCloseTo(55 * D, 9);
  });
});

describe('the grip tables, held to the limits', () => {
  for (const side of [1, -1] as const) {
    it(`never bends a finger joint past its range (thumb on the ${side === 1 ? 'right' : 'left'})`, () => {
      for (const a of everyHand()) {
        const set = handSetOf(a, side);
        for (const f of set.fingers) {
          expect(beyond(f.bend[0], ROM.mcp.hard)).toBe(0);
          expect(beyond(f.bend[1], ROM.pip.hard)).toBe(0);
          expect(beyond(f.bend[2], ROM.dip.hard)).toBe(0);
          // the fan closes as the knuckle bends
          expect(Math.abs(f.splay)).toBeLessThanOrEqual(splayLimit(f.bend[0]) + 1e-12);
        }
        expect(beyond(set.thumbTip, ROM.thumbIp.hard)).toBe(0);
      }
    });
  }

  it('keeps each fingertip joint following its middle joint, about two thirds of its bend', () => {
    for (const a of everyHand()) {
      // (an open finger, straight at both joints, has no ratio to keep)
      for (const f of handSetOf(a, 1).fingers.filter((g) => g.bend[1] > 0.05)) {
        const k = f.bend[2] / f.bend[1];
        expect(k).toBeGreaterThanOrEqual(DIP_OF_PIP.min - 1e-9);
        expect(k).toBeLessThanOrEqual(DIP_OF_PIP.max + 1e-9);
      }
    }
  });
});

describe('armStrain', () => {
  it('names each joint past its limit and how far', () => {
    const strain = armStrain({
      elevation: 0.4,
      plane: 1,
      rotation: 0.2,
      flexion: 160 * D,
      pronation: 0.3,
      wristFlexion: -80 * D,
      deviation: 0,
    });
    expect(Object.keys(strain).sort()).toEqual(['elbowFlexion', 'wristFlexion']);
    expect(strain.elbowFlexion).toBeCloseTo(15 * D, 9);
    expect(strain.wristFlexion).toBeCloseTo(10 * D, 9);
  });
});

/**
 * The stroke planner across every kind of stroke, read as joint angles. Its
 * shoulders and elbows stay inside the body's limits; its wrists and forearms
 * do not yet (see `.context/app/anatomy.md`, "What the sweep found") — this
 * pins what already holds, so the anatomy work can only widen it.
 */
describe('the stroke planner, read through the anatomy', () => {
  for (const military of ['none', 'other', 'both'] as const) {
    it(`keeps every elbow and shoulder inside its limits (military grip: ${military})`, () => {
      const timeline = sweepTimeline(2);
      for (let t = 0; t < 32 * SWEEP_DUR; t += 0.01) {
        const pose = poseAt(timeline, t, 1, gripsFor(military));
        const torso = torsoOf(pose);
        for (const hand of ['lead', 'other'] as const) {
          const a = armAngles(pose.arms[hand], torso, hand);
          expect(beyond(a.flexion, ROM.elbowFlexion.hard), `${hand} elbow at ${t}`).toBe(0);
          expect(beyond(a.elevation, ROM.shoulderElevation.soft), `${hand} shoulder at ${t}`).toBe(
            0
          );
        }
      }
    });
  }
});
