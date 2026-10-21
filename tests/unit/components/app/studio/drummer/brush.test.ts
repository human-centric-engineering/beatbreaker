/**
 * Wire brushes for a kit played with brushes: the brush itself, laid along
 * the stick's unit length; its fan turned flat toward the head; and both
 * figures swapping sticks for brushes and back, the hands posed the same.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { FAN_WIDTH, WIRES, buildBrush, turnFan } from '@/components/app/studio/drummer/brush';
import { BEAD_RADIUS, buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import { placeStick } from '@/components/app/studio/drummer/hand-pose';
import { makeMaterials, woodMaterial } from '@/components/app/studio/drummer/parts';
import { buildSkeleton } from '@/components/app/studio/drummer/skeleton-model';
import { STICK } from '@/lib/app/breaks/drummer/kit-layout';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';
import { poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import type { ArmPose } from '@/lib/app/breaks/drummer/pose';

const named = (root: THREE.Object3D, name: string) => {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === name) out.push(o);
  });
  return out;
};

/** The world-space bounding box of `o`. */
const boxOf = (o: THREE.Object3D) => {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
};

describe('buildBrush', () => {
  it('is a grip, a collar, a fan of wires and the retractor’s loop, hidden until it is played', () => {
    const brush = buildBrush();
    expect(brush.visible).toBe(false);
    for (const part of ['brush grip', 'brush collar', 'brush wires', 'brush fan', 'brush loop']) {
      expect(named(brush, part)).toHaveLength(1);
    }
    // a three-sided tube per wire, six rings of three along each
    const wires = named(brush, 'brush wires')[0] as THREE.Mesh;
    expect(wires.geometry.getAttribute('position').count).toBe(WIRES * 6 * 3);
  });

  it('lies along the stick’s unit length, butt to tip, the fan open across x and thin through z', () => {
    const box = boxOf(named(buildBrush(), 'brush wires')[0]);
    expect(box.max.y).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(box.max.y).toBeGreaterThan(0.47);
    // as wide as a played brush, and a fraction of that deep
    expect(box.max.x - box.min.x).toBeGreaterThan(FAN_WIDTH * 0.9);
    expect(box.max.x - box.min.x).toBeLessThan(FAN_WIDTH * 1.2);
    expect(box.max.z - box.min.z).toBeLessThan(0.01);
    const grip = boxOf(named(buildBrush(), 'brush grip')[0]);
    expect(grip.min.y).toBeCloseTo(-0.5, 6);
  });
});

describe('placeStick with brushes', () => {
  const pose = {
    tip: new THREE.Vector3(0.1, 0.65, -0.3),
    stick: new THREE.Vector3(0.2, -0.35, -0.9).normalize(),
  } as unknown as ArmPose;

  it('puts the brush where the stick would be, its wires’ ends on the tip, and leaves the stick', () => {
    const stick = new THREE.Object3D();
    const bead = new THREE.Object3D();
    const brush = buildBrush();
    brush.visible = true;
    placeStick(stick, bead, pose, brush);
    const butt = pose.tip.clone().addScaledVector(pose.stick, -STICK.length);
    // centred between butt and tip, stretched to the stick's length along its line
    expect(brush.position.distanceTo(butt.clone().lerp(pose.tip, 0.5))).toBeLessThan(1e-9);
    expect(brush.scale.y).toBeCloseTo(STICK.length, 9);
    const along = new THREE.Vector3(0, 1, 0).applyQuaternion(brush.quaternion);
    expect(along.dot(pose.stick)).toBeCloseTo(1, 9);
    expect(stick.position.lengthSq()).toBe(0);
    expect(bead.position.lengthSq()).toBe(0);
  });

  it('places the stick and its bead as before while the brush is put away', () => {
    const stick = new THREE.Object3D();
    const bead = new THREE.Object3D();
    const brush = buildBrush();
    placeStick(stick, bead, pose, brush);
    expect(bead.position.equals(pose.tip)).toBe(true);
    expect(stick.scale.y).toBeCloseTo(STICK.length, 9);
    expect(brush.position.lengthSq()).toBe(0);
  });

  it('lies the fan flat: its face as near up as the brush’s slope allows, whatever way it was turned', () => {
    for (const spin of [0, 0.7, 2, -2.6]) {
      const brush = new THREE.Object3D();
      brush.quaternion
        .setFromUnitVectors(new THREE.Vector3(0, 1, 0), pose.stick)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
      turnFan(brush, pose.stick);
      const face = new THREE.Vector3(0, 0, 1).applyQuaternion(brush.quaternion);
      const up = new THREE.Vector3(0, 1, 0);
      const best = up.clone().addScaledVector(pose.stick, -up.dot(pose.stick)).normalize();
      expect(face.dot(best)).toBeCloseTo(1, 6);
      // still along the stick: the turn is about its own length
      expect(
        new THREE.Vector3(0, 1, 0).applyQuaternion(brush.quaternion).dot(pose.stick)
      ).toBeCloseTo(1, 6);
    }
  });
});

describe('a figure with brushes', () => {
  const posed = () => poseAt(new StrokeTimeline(), 0, 0);

  it.each([
    [
      'dressed',
      () => {
        const m = makeMaterials(PERSONAS[0]);
        return { model: buildDrummer(m, PERSONAS[0]), wood: m.wood };
      },
    ],
    [
      'skeleton',
      () => {
        const wood = woodMaterial();
        return {
          model: buildSkeleton(
            wood,
            PERSONAS.find((p) => p.kind === 'skeleton')!
          ),
          wood,
        };
      },
    ],
  ])('swaps both sticks and their beads for brushes and back: the %s figure', (_, build) => {
    const { model, wood } = build();
    const brushes = named(model.root, 'brush');
    expect(brushes).toHaveLength(2);
    expect(brushes.every((b) => !b.visible)).toBe(true);

    model.setBrushes(true);
    model.update(posed());
    expect(brushes.every((b) => b.visible)).toBe(true);
    // each brush in its hand: stretched to the stick's length, as the stick was
    for (const b of brushes) expect(b.scale.y).toBeCloseTo(STICK.length, 6);
    // the sticks and beads: the wood on the figure's root, a lathe and a ball
    const wooden = model.root.children.filter(
      (o): o is THREE.Mesh => o instanceof THREE.Mesh && o.material === wood
    );
    const sticks = wooden.filter((o) => o.geometry instanceof THREE.LatheGeometry);
    const beads = wooden.filter((o) => {
      const geo: unknown = o.geometry;
      return geo instanceof THREE.SphereGeometry && geo.parameters.radius === BEAD_RADIUS;
    });
    expect(sticks).toHaveLength(2);
    expect(beads).toHaveLength(2);
    expect([...sticks, ...beads].every((s) => !s.visible)).toBe(true);

    model.setBrushes(false);
    expect(brushes.every((b) => !b.visible)).toBe(true);
    expect([...sticks, ...beads].every((s) => s.visible)).toBe(true);
  });
});
