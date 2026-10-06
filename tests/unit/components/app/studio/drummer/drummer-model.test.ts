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

import { BEAD_RADIUS, buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { type Persona, PERSONAS } from '@/lib/app/breaks/drummer/personas';
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

/** Every bead mesh (the stick tip) — identified by its unique radius, `BEAD_RADIUS`. */
function beadMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry) {
      if (Math.abs(o.geometry.parameters.radius - BEAD_RADIUS) < 1e-9) out.push(o);
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

  it('balances the stick on the middle finger, the first finger mostly closed, the back fingers following the curl', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const timeline = new StrokeTimeline();

    // idle: no hits at all yet
    const idle = poseAt(timeline, 0, 0.5);
    update(idle);
    const hands = handGroups(root);
    const leadIdle = closestTo(hands, idle.arms.lead.wrist) as THREE.Group;

    const first = leadIdle.children[1] as THREE.Group; // hold 0.7
    const middle = leadIdle.children[2] as THREE.Group; // hold 1: the fulcrum
    const ring = leadIdle.children[3] as THREE.Group; // hold 0: follows the curl

    const FIRST_BEND_0 = 0.95;
    const MIDDLE_BEND_0 = 1.15;
    const RING_BEND_0 = 1.45;
    const firstAt = (curl: number) => FIRST_BEND_0 * (0.7 + 0.3 * curl);

    expect(middle.rotation.x).toBeCloseTo(MIDDLE_BEND_0, 6);
    expect(first.rotation.x).toBeCloseTo(firstAt(idle.arms.lead.curl), 6);
    expect(ring.rotation.x).toBeCloseTo(RING_BEND_0 * idle.arms.lead.curl, 6);

    // a fresh lead-hand hit: the squeeze term should move curl away from idle
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    const struck = poseAt(timeline, 0.01, 0.5);
    update(struck);

    expect(struck.arms.lead.curl).not.toBeCloseTo(idle.arms.lead.curl, 6);
    // the middle finger never lets go of the stick
    expect(middle.rotation.x).toBeCloseTo(MIDDLE_BEND_0, 6);
    // the first finger gives a little, the back fingers the whole of it
    expect(first.rotation.x).toBeCloseTo(firstAt(struck.arms.lead.curl), 6);
    expect(ring.rotation.x).toBeCloseTo(RING_BEND_0 * struck.arms.lead.curl, 6);
  });
});

describe('buildDrummer() — a glance at the camera', () => {
  /** The two eyes: the only spheres of radius 0.011. Their parent is the head. */
  function eyes(root: THREE.Object3D): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry) {
        if (Math.abs(o.geometry.parameters.radius - 0.011) < 1e-9) out.push(o);
      }
    });
    return out;
  }

  const facing = (head: THREE.Object3D) =>
    new THREE.Vector3(0, 0, -1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));

  it('turns the head to the camera as the glance comes in, wherever the camera is', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const head = eyes(root)[0].parent!;
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    const camera = new THREE.Vector3(1.6, 1.5, -2.2);
    const toCamera = () =>
      camera
        .clone()
        .sub(head.getWorldPosition(new THREE.Vector3()))
        .normalize()
        .angleTo(facing(head));

    update({ ...pose, glance: { ...pose.glance, look: 0 } }, camera);
    root.updateMatrixWorld(true);
    const away = toCamera();
    update({ ...pose, glance: { ...pose.glance, look: 1 } }, camera);
    root.updateMatrixWorld(true);
    const at = toCamera();
    expect(at).toBeLessThan(away - 0.3);
    expect(at).toBeLessThan(0.2);
  });

  it('does not look round at a camera behind it', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const head = eyes(root)[0].parent!;
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    update({ ...pose, glance: { ...pose.glance, look: 0 } });
    root.updateMatrixWorld(true);
    const ahead = facing(head);
    update({ ...pose, glance: { ...pose.glance, look: 1 } }, new THREE.Vector3(0, 1.6, 2.5));
    root.updateMatrixWorld(true);
    expect(facing(head).angleTo(ahead)).toBeLessThan(0.05);
  });

  it('shuts one eye for a wink, and only that one', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    update(
      { ...pose, blink: 0, glance: { look: 1, nod: 0, tilt: 0, wink: 1, eye: 1, brows: 0 } },
      new THREE.Vector3(0, 1.5, -2.5)
    );
    const [a, b] = eyes(root)
      .map((e) => e.scale.y)
      .sort((x, y) => x - y);
    expect(a).toBeLessThan(0.2);
    expect(b).toBe(1);
  });

  it('shuts both eyes for a blink', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    update({ ...pose, blink: 1, glance: { ...pose.glance, wink: 0 } });
    for (const e of eyes(root)) expect(e.scale.y).toBeLessThan(0.2);
    update({ ...pose, blink: 0, glance: { ...pose.glance, wink: 0 } });
    for (const e of eyes(root)) expect(e.scale.y).toBe(1);
  });

  it('raises both eyebrows for a hello', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    // the brows: the head's only boxes
    const brows = () =>
      eyes(root)[0].parent!.children.filter(
        (o): o is THREE.Mesh => o instanceof THREE.Mesh && o.geometry instanceof THREE.BoxGeometry
      );
    update({ ...pose, glance: { ...pose.glance, brows: 0, wink: 0 } });
    const down = brows().map((b) => b.position.y);
    update({ ...pose, glance: { ...pose.glance, brows: 1, wink: 0 } });
    const up = brows().map((b) => b.position.y);
    expect(down).toHaveLength(2);
    up.forEach((y, i) => expect(y - down[i]).toBeGreaterThan(0.005));
  });
});

describe('buildDrummer() — who is playing', () => {
  const posed = () => {
    const timeline = new StrokeTimeline();
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    return poseAt(timeline, 0.02, 1);
  };

  /** Root-level cylinders (limb segments) in material `mat`, widest end first. */
  const segmentsIn = (root: THREE.Object3D, mat: THREE.Material) =>
    root.children.filter(
      (o): o is THREE.Mesh =>
        o instanceof THREE.Mesh &&
        o.material === mat &&
        o.geometry instanceof THREE.CylinderGeometry
    );

  it.each(PERSONAS.map((p) => [p.name, p] as const))(
    '%s plays from the same joints: the sticks land on the pose',
    (_name, who: Persona) => {
      const m = makeMaterials(who);
      const { root, update } = buildDrummer(m, who);
      const pose = posed();
      update(pose);
      const beads = beadMeshes(root);
      expect(beads.length).toBe(2);
      for (const tip of [pose.arms.lead.tip, pose.arms.other.tip]) {
        const bead = closestTo(beads, tip);
        expect(bead.getWorldPosition(new THREE.Vector3()).distanceTo(tip)).toBeLessThan(1e-9);
      }
      expect(handGroups(root).length).toBe(2);
    }
  );

  it('a heavy build has thicker legs than a slim one', () => {
    const widest = (who: Persona) => {
      const m = makeMaterials(who);
      const { root } = buildDrummer(m, who);
      return Math.max(
        ...segmentsIn(root, m.jeans).map(
          (o) => (o.geometry as THREE.CylinderGeometry).parameters.radiusBottom
        )
      );
    };
    const heavy = PERSONAS.find((p) => p.build === 'heavy')!;
    const slim = PERSONAS.find((p) => p.build === 'slim')!;
    expect(widest(heavy)).toBeGreaterThan(widest(slim) * 1.4);
  });

  it('a T-shirt has sleeves; a vest leaves the arms bare', () => {
    const sleeves = (who: Persona) => {
      const m = makeMaterials(who);
      const { root } = buildDrummer(m, who);
      return segmentsIn(root, m.shirt);
    };
    const tee = PERSONAS.find((p) => p.top === 'tee')!;
    const vest = PERSONAS.find((p) => p.top === 'vest')!;
    expect(sleeves(tee).length).toBe(2);
    expect(sleeves(tee).every((o) => o.visible)).toBe(true);
    expect(sleeves(vest).every((o) => !o.visible)).toBe(true);
  });

  it('dresses the head for the player: a bald head carries less than an afro and a beard', () => {
    const headMeshes = (who: Persona) => {
      const { root } = buildDrummer(makeMaterials(who), who);
      let n = 0;
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) n++;
      });
      return n;
    };
    const base = PERSONAS[0];
    const bald = { ...base, hairStyle: 'bald' as const, beard: 'none' as const };
    const dressed = {
      ...base,
      hairStyle: 'afro' as const,
      beard: 'viking' as const,
      shades: true,
      earrings: true,
    };
    // afro 1; a viking beard 4 (jaw, chin, moustache, braid); shades 3; earrings 2
    expect(headMeshes(dressed) - headMeshes(bald)).toBe(10);
    // a top hat: brim, crown and band
    expect(headMeshes({ ...bald, hat: 'tophat' as const }) - headMeshes(bald)).toBe(3);
  });
});
