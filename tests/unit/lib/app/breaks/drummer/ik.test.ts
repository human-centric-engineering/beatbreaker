import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { solveTwoBone } from '@/lib/app/breaks/drummer/ik';

/**
 * Analytic two-bone IK: the law of cosines, done once per call. These tests
 * check the geometric guarantees the module promises — bone lengths held
 * exactly, a reachable target actually reached, the bend following the pole
 * to the correct side, and a graceful (short, straight) failure out of reach.
 */

describe('solveTwoBone', () => {
  it('preserves both bone lengths for a reachable, bent target', () => {
    const root = new Vector3(0, 0, 0);
    const target = new Vector3(0, -0.7, 0);
    const pole = new Vector3(0, 0, 1);
    const { joint, end } = solveTwoBone(root, target, 0.5, 0.5, pole);
    expect(root.distanceTo(joint)).toBeCloseTo(0.5, 6);
    expect(joint.distanceTo(end)).toBeCloseTo(0.5, 6);
  });

  it('reaches a target that is genuinely within range, exactly', () => {
    const root = new Vector3(1, 2, 3);
    const target = new Vector3(1, 2 - 0.7, 3); // distance 0.7, well inside (0, 1) for 0.5+0.5 bones
    const { end } = solveTwoBone(root, target, 0.5, 0.5, new Vector3(0, 0, 1));
    expect(end.distanceTo(target)).toBeCloseTo(0, 6);
  });

  it('bends the joint toward whichever side the pole points to', () => {
    const root = new Vector3(0, 0, 0);
    const target = new Vector3(0, -0.7, 0);
    const towardPositiveZ = solveTwoBone(root, target, 0.5, 0.5, new Vector3(0, 0, 1)).joint;
    const towardNegativeZ = solveTwoBone(root, target, 0.5, 0.5, new Vector3(0, 0, -1)).joint;

    expect(towardPositiveZ.z).toBeGreaterThan(0);
    expect(towardNegativeZ.z).toBeLessThan(0);
    // the bend is otherwise symmetric: same magnitude, opposite side
    expect(towardPositiveZ.z).toBeCloseTo(-towardNegativeZ.z, 6);
    expect(towardPositiveZ.y).toBeCloseTo(towardNegativeZ.y, 6);
  });

  it('bends further for a target closer in than for one near full extension', () => {
    const root = new Vector3(0, 0, 0);
    const pole = new Vector3(0, 0, 1);
    const bentMore = solveTwoBone(root, new Vector3(0, -0.6, 0), 0.5, 0.5, pole).joint;
    const bentLess = solveTwoBone(root, new Vector3(0, -0.95, 0), 0.5, 0.5, pole).joint;
    expect(bentMore.z).toBeGreaterThan(bentLess.z);
  });

  it('goes straight and comes up short of an unreachable target, rather than stretching', () => {
    const root = new Vector3(0, 0, 0);
    const target = new Vector3(0, -2, 0); // far beyond upper + lower
    const upper = 0.3;
    const lower = 0.3;
    const { joint, end } = solveTwoBone(root, target, upper, lower, new Vector3(0, 0, 1));

    // bone lengths are still honoured
    expect(root.distanceTo(joint)).toBeCloseTo(upper, 6);
    expect(joint.distanceTo(end)).toBeCloseTo(lower, 6);

    // short of the target, not stretched to it
    expect(end.distanceTo(root)).toBeLessThan(target.distanceTo(root));
    expect(end.distanceTo(root)).toBeCloseTo(upper + lower, 3);

    // essentially straight: the joint lies almost exactly on the root-target line
    const dir = target.clone().sub(root).normalize();
    const toJoint = joint.clone().sub(root);
    const along = toJoint.dot(dir);
    const perp = toJoint.clone().sub(dir.clone().multiplyScalar(along));
    expect(perp.length()).toBeLessThan(0.02);
  });

  it('falls back to a default direction and still preserves bone lengths when root and target coincide', () => {
    const root = new Vector3(0, 0, 0);
    const target = new Vector3(0, 0, 0);
    const { joint, end } = solveTwoBone(root, target, 0.5, 0.3, new Vector3(0, 0, 1));
    expect(root.distanceTo(joint)).toBeCloseTo(0.5, 6);
    expect(joint.distanceTo(end)).toBeCloseTo(0.3, 6);
    // a degenerate target folds the arm to the minimum reach (|upper - lower|)
    expect(end.distanceTo(root)).toBeCloseTo(0.2, 3);
  });

  it('does not mutate the root or target vectors passed in', () => {
    const root = new Vector3(1, 2, 3);
    const target = new Vector3(1, 1.5, 3);
    const rootCopy = root.clone();
    const targetCopy = target.clone();
    solveTwoBone(root, target, 0.4, 0.3, new Vector3(1, 0, 0));
    expect(root.equals(rootCopy)).toBe(true);
    expect(target.equals(targetCopy)).toBe(true);
  });
});
