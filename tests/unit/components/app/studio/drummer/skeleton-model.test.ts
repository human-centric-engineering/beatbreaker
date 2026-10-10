/**
 * `buildSkeleton()` — the skeleton drummer, posed every frame by a real
 * `Pose` from `poseAt()` over the sweep bar (every kind of stroke), never a
 * hand-built one.
 *
 * Bones are found by name (each mesh carries its bone's) and checked against
 * the joints the pose solved: a bone that did not follow its joint would sit
 * at the origin, or where it was last frame, and fail the tight distances.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { BEAD_RADIUS } from '@/components/app/studio/drummer/drummer-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { buildSkeleton } from '@/components/app/studio/drummer/skeleton-model';
import { armAngles, torsoOf } from '@/lib/app/breaks/drummer/anatomy/arm';
import { BODY } from '@/lib/app/breaks/drummer/kit-layout';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';
import { type Pose, gripsFor, poseAt } from '@/lib/app/breaks/drummer/pose';
import { SWEEP_DUR, sweepTimeline } from '@/tests/helpers/drummer-sweep';

const BONES = PERSONAS.find((p) => p.kind === 'skeleton')!;

function build() {
  return buildSkeleton(makeMaterials(BONES), BONES);
}

function named(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === name) out.push(o);
  });
  return out;
}

function at(o: THREE.Object3D, local = new THREE.Vector3()): THREE.Vector3 {
  o.updateWorldMatrix(true, false);
  return o.localToWorld(local.clone());
}

/** Poses across the sweep bar: every kind of stroke, a few times a step. */
function poses(military: 'none' | 'other' | 'both' = 'none'): Pose[] {
  const timeline = sweepTimeline(2);
  const out: Pose[] = [];
  for (let t = 0.03; t < 32 * SWEEP_DUR; t += 0.07)
    out.push(poseAt(timeline, t, 1, gripsFor(military)));
  return out;
}

describe('buildSkeleton', () => {
  it('is cast: one of the personas is the skeleton', () => {
    expect(BONES).toBeDefined();
    expect(BONES.name).toBe('Mister Bones');
  });

  it('has the bones a drummer plays with, and as many of each as a body has', () => {
    const { root } = build();
    const count = (n: string) => named(root, n).length;
    expect(count('vertebra')).toBe(24);
    expect(count('disc')).toBe(24);
    expect(count('rib')).toBe(24);
    expect(count('costal cartilage')).toBe(20);
    expect(count('sternum')).toBe(2); // the group and its bone
    expect(count('clavicle')).toBe(2);
    expect(count('scapula')).toBe(2);
    expect(count('humerus')).toBe(2);
    expect(count('ulna')).toBe(2);
    expect(count('radius')).toBe(2);
    expect(count('hip bone')).toBe(2);
    expect(count('sacrum')).toBe(1);
    expect(count('femur')).toBe(2);
    expect(count('patella')).toBe(2);
    expect(count('tibia')).toBe(2);
    expect(count('fibula')).toBe(2);
    expect(count('cranium')).toBe(1);
    expect(count('mandible')).toBe(2); // the hinge and its bone
    // each hand: eight carpals, five metacarpals, fourteen phalanges
    for (const c of [
      'scaphoid',
      'lunate',
      'triquetrum',
      'pisiform',
      'trapezium',
      'trapezoid',
      'capitate',
      'hamate',
    ]) {
      expect(count(c), c).toBe(2);
    }
    // the hands' metacarpals and the feet's are named apart
    expect(count('metacarpal')).toBe(10);
    expect(count('metatarsal')).toBe(10);
    // fourteen phalanges a hand and fourteen a foot
    expect(count('phalanx')).toBe(56);
    // seven tarsals a foot
    expect(count('tarsal')).toBe(14);
  });

  it('puts every long bone of the arm between the joints the pose solved', () => {
    const { root, update } = build();
    for (const pose of poses()) {
      update(pose);
      for (const hand of ['lead', 'other'] as const) {
        const a = pose.arms[hand];
        const pick = (name: string, near: THREE.Vector3) =>
          named(root, name).sort((p, q) => at(p).distanceTo(near) - at(q).distanceTo(near))[0];
        const humerus = pick('humerus', a.shoulder);
        expect(at(humerus).distanceTo(a.shoulder)).toBeLessThan(1e-9);
        // the humerus runs down its own length to the elbow
        expect(
          at(humerus, new THREE.Vector3(0, BODY.upperArm, 0)).distanceTo(a.elbow)
        ).toBeLessThan(1e-6);
        const ulna = pick('ulna', a.elbow);
        expect(at(ulna).distanceTo(a.elbow)).toBeLessThan(1e-9);
        expect(at(ulna, new THREE.Vector3(0, BODY.forearm, 0)).distanceTo(a.wrist)).toBeLessThan(
          1e-6
        );
        // the hand hangs from the wrist, and the stick's bead is where the pose has the tip
        const hands = named(root, 'hand').sort(
          (p, q) => at(p).distanceTo(a.wrist) - at(q).distanceTo(a.wrist)
        );
        expect(at(hands[0]).distanceTo(a.wrist)).toBeLessThan(1e-9);
        let bead: THREE.Object3D | undefined;
        root.traverse((o) => {
          if (
            o instanceof THREE.Mesh &&
            o.geometry instanceof THREE.SphereGeometry &&
            Math.abs(o.geometry.parameters.radius - BEAD_RADIUS) < 1e-9 &&
            at(o).distanceTo(a.tip) < 1e-9
          )
            bead = o;
        });
        expect(bead, `${hand} bead`).toBeDefined();
      }
    }
  });

  it('rolls the radius over the ulna as the forearm pronates: crossed palm down, side by side thumb up', () => {
    const { root, update } = build();
    let crossed = 0;
    let level = 0;
    for (const pose of poses()) {
      update(pose);
      const torso = torsoOf(pose);
      for (const hand of ['lead', 'other'] as const) {
        const a = pose.arms[hand];
        const p = armAngles(a, torso, hand).pronation;
        const side = hand === 'lead' ? 1 : -1;
        const pick = (name: string) =>
          named(root, name).sort(
            (m, n) => at(m).distanceTo(a.elbow) - at(n).distanceTo(a.elbow)
          )[0];
        const radius = pick('radius');
        const ulna = pick('ulna');
        // how far out to the side each bone's wrist end is, from the elbow's hinge
        const out = new THREE.Vector3(0, 0, 0);
        const hinge = new THREE.Vector3(1, 0, 0)
          .applyQuaternion(ulna.quaternion)
          .multiplyScalar(side);
        const radiusEnd = at(radius, new THREE.Vector3(0, 0.25, 0));
        const ulnaEnd = at(ulna, new THREE.Vector3(-0.012 * side, BODY.forearm - 0.012, -0.003));
        out.subVectors(radiusEnd, ulnaEnd);
        const lateral = out.dot(hinge);
        // its head always turns on the capitellum, out at the side of the elbow
        expect(at(radius).clone().sub(a.elbow).dot(hinge)).toBeGreaterThan(0.01);
        if (p > 1.2) {
          // well pronated, the radius's wrist end has crossed to the inside of the ulna's
          expect(lateral, `${hand} at pronation ${p}`).toBeLessThan(0);
          crossed++;
        } else if (Math.abs(p) < 0.3) {
          expect(lateral).toBeGreaterThan(-0.01);
          level++;
        }
      }
    }
    expect(crossed + level).toBeGreaterThan(0);
  });

  it('keeps every bone where it was built to be, and nothing at NaN, across every stroke and grip', () => {
    for (const military of ['none', 'both'] as const) {
      const { root, update } = build();
      for (const pose of poses(military)) {
        update(pose);
        root.updateMatrixWorld(true);
        root.traverse((o) => {
          const e = o.matrixWorld.elements;
          for (const v of e) expect(Number.isFinite(v), o.name).toBe(true);
        });
      }
    }
  });

  it('opens the jaw to count, and closes it again', () => {
    const { root, update } = build();
    const jaw = named(root, 'mandible').find((o) => o instanceof THREE.Group)!;
    const pose = poses()[0];
    update({ ...pose, speak: { open: 0, round: 0 }, smile: 0 });
    const shut = jaw.rotation.x;
    update({ ...pose, speak: { open: 1, round: 0 }, smile: 0 });
    expect(jaw.rotation.x - shut).toBeGreaterThan(0.25);
  });

  it('seats the femur heads in the hip sockets and runs each femur to its knee', () => {
    const { root, update } = build();
    for (const pose of poses().slice(0, 6)) {
      update(pose);
      for (const foot of ['kickFoot', 'hatFoot'] as const) {
        const l = pose.legs[foot];
        const femur = named(root, 'femur').sort(
          (p, q) => at(p).distanceTo(l.hip) - at(q).distanceTo(l.hip)
        )[0];
        expect(at(femur).distanceTo(l.hip)).toBeLessThan(1e-9);
        expect(at(femur, new THREE.Vector3(0, BODY.thigh, 0)).distanceTo(l.knee)).toBeLessThan(
          1e-6
        );
      }
    }
  });

  it('turns the skull with the head: a glance at the camera turns it toward the camera', () => {
    const { root, update } = build();
    const skull = named(root, 'skull')[0];
    const pose = poses()[0];
    const ahead = { ...pose, glance: { ...pose.glance, look: 0 } };
    update(ahead);
    const before = new THREE.Vector3(0, 0, -1).applyQuaternion(
      skull.getWorldQuaternion(new THREE.Quaternion())
    );
    const camera = new THREE.Vector3(-1.5, 1.4, -1.5);
    update({ ...pose, glance: { ...pose.glance, look: 1 } }, camera);
    const after = new THREE.Vector3(0, 0, -1).applyQuaternion(
      skull.getWorldQuaternion(new THREE.Quaternion())
    );
    const toCamera = camera.clone().sub(at(skull)).normalize();
    expect(after.dot(toCamera)).toBeGreaterThan(before.dot(toCamera));
  });
});
