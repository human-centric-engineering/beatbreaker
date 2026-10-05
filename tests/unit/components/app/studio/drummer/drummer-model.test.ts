/**
 * `buildDrummer()` — the jointed figure, posed every frame by a real `Pose`
 * from `poseAt()` (never hand-built here; see `kit-model.test.ts` for why).
 *
 * `buildDrummer()` exposes nothing by id either. Every arm/hand/leg rig is a
 * flat set of anonymous children added straight to `root` (see
 * `drummer-model.ts`'s `root.add(a.shoulder, a.sleeve, ...)`), so there is no
 * name to query by. These tests find the two arms' objects by **closest
 * distance to the real, distinct target the pose computes for each hand**
 * (`pose.arms.lead.tip` vs `pose.arms.other.tip`, etc.) and then assert the
 * found object's position equals that target to tight precision — which is
 * not circular: if `update()` did nothing, both candidates would sit at the
 * origin and neither would satisfy the tight equality check below.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import { stepWithHit } from '@/tests/helpers/drummer-fixtures';

/** The one of `candidates` closest to `target`, by world position. */
function closestTo(candidates: THREE.Object3D[], target: THREE.Vector3): THREE.Object3D {
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const p = c.getWorldPosition(new THREE.Vector3());
    const d = p.distanceTo(target);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Every bead mesh (the stick tip) — identified by its unique radius, 0.0065. */
function beadMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry) {
      if (Math.abs(o.geometry.parameters.radius - 0.0065) < 1e-9) out.push(o);
    }
  });
  return out;
}

/** The two hand groups — the only root children with a rounded-box palm and 6 children. */
function handGroups(root: THREE.Object3D): THREE.Group[] {
  return root.children.filter(
    (o): o is THREE.Group =>
      o instanceof THREE.Group &&
      o.children.length === 6 &&
      o.children[0] instanceof THREE.Mesh &&
      (o.children[0] as THREE.Mesh).geometry.type === 'RoundedBoxGeometry'
  );
}

describe('buildDrummer', () => {
  it('builds a named root group', () => {
    const { root } = buildDrummer(makeMaterials());
    expect(root.name).toBe('drummer');
  });

  it('places each stick bead exactly at its hand pose tip', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const timeline = new StrokeTimeline();
    // a lead-hand hit (crash is assigned to 'lead' by sticking) gives the
    // two arms clearly different, non-default poses to tell apart.
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    const pose = poseAt(timeline, 0.02, 1);
    update(pose);

    const beads = beadMeshes(root);
    expect(beads.length).toBe(2);

    const leadTip = pose.arms.lead.tip;
    const otherTip = pose.arms.other.tip;
    expect(leadTip.distanceTo(otherTip)).toBeGreaterThan(1e-4); // genuinely different targets

    const leadBead = closestTo(beads, leadTip);
    const otherBead = beads.find((b) => b !== leadBead)!;

    expect(leadBead.getWorldPosition(new THREE.Vector3()).distanceTo(leadTip)).toBeLessThan(1e-9);
    expect(otherBead.getWorldPosition(new THREE.Vector3()).distanceTo(otherTip)).toBeLessThan(1e-9);
  });

  it('places each hand group exactly at its wrist', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const timeline = new StrokeTimeline();
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    const pose = poseAt(timeline, 0.02, 1);
    update(pose);

    const hands = handGroups(root);
    expect(hands.length).toBe(2);

    const leadWrist = pose.arms.lead.wrist;
    const otherWrist = pose.arms.other.wrist;
    expect(leadWrist.distanceTo(otherWrist)).toBeGreaterThan(1e-4);

    const leadHand = closestTo(hands, leadWrist);
    const otherHand = hands.find((h) => h !== leadHand)!;

    expect(leadHand.getWorldPosition(new THREE.Vector3()).distanceTo(leadWrist)).toBeLessThan(1e-9);
    expect(otherHand.getWorldPosition(new THREE.Vector3()).distanceTo(otherWrist)).toBeLessThan(
      1e-9
    );
  });

  it('curls the back fingers with pose.arms.<hand>.curl, but holds the fixed first finger at full curl always', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const timeline = new StrokeTimeline();

    // idle: no hits at all yet
    const idle = poseAt(timeline, 0, 0.5);
    update(idle);
    const hands = handGroups(root);
    const leadIdle = closestTo(hands, idle.arms.lead.wrist) as THREE.Group;

    const fixedJoint = leadIdle.children[1] as THREE.Group; // finger 0: `fixed: true`
    const flexJoint = leadIdle.children[2] as THREE.Group; // finger 1: `fixed: false`

    const FIXED_BEND_0 = 0.95; // bend[0] for the fixed finger — never scaled by curl
    const FLEX_BEND_0 = 1.45; // bend[0] for a non-fixed finger — scaled by curl

    expect(fixedJoint.rotation.x).toBeCloseTo(FIXED_BEND_0 * 1, 6);
    expect(flexJoint.rotation.x).toBeCloseTo(FLEX_BEND_0 * idle.arms.lead.curl, 6);

    // a fresh lead-hand hit: the squeeze term should move curl away from idle
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    const struck = poseAt(timeline, 0.01, 0.5);
    update(struck);

    expect(struck.arms.lead.curl).not.toBeCloseTo(idle.arms.lead.curl, 6);
    // the fixed finger's joint rotation never moved off full curl
    expect(fixedJoint.rotation.x).toBeCloseTo(FIXED_BEND_0 * 1, 6);
    // the flexing finger tracked the new curl value exactly
    expect(flexJoint.rotation.x).toBeCloseTo(FLEX_BEND_0 * struck.arms.lead.curl, 6);
  });
});
