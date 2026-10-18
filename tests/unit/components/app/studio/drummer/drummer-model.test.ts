/**
 * `buildDrummer()` — the jointed figure, posed every frame by a real `Pose`
 * from `poseAt()` (never hand-built here; see `kit-model.test.ts` for why).
 *
 * `buildDrummer()` exposes nothing by id either. Every arm/hand/leg rig is a
 * flat set of anonymous children added straight to `root` (see
 * `drummer-model.ts`'s `root.add(a.hand.group, a.stick, ...)`), so there is no
 * name to query by. These tests find the two arms' objects by **closest
 * distance to the real, distinct target the pose computes for each hand**
 * (`pose.arms.lead.tip` vs `pose.arms.other.tip`, etc.) and then assert the
 * found object's position equals that target to tight precision — which is
 * not circular: if `update()` did nothing, both candidates would sit at the
 * origin and neither would satisfy the tight equality check below.
 */

import { handSetOf } from '@/lib/app/breaks/drummer/anatomy/hand';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { BEAD_RADIUS, buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { BODY, HOOP, PIECES, onPiece } from '@/lib/app/breaks/drummer/kit-layout';
import { LIKENESSES } from '@/lib/app/breaks/drummer/likenesses';
import { type Persona, PERSONAS } from '@/lib/app/breaks/drummer/personas';
import { expressionAt } from '@/lib/app/breaks/drummer/expression';
import { gripsFor } from '@/lib/app/breaks/drummer/grips';
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

/** The two hand groups: palm, four fingers and the thumb, then the thumb's pad. */
function handGroups(root: THREE.Object3D): THREE.Group[] {
  return root.children.filter(
    (o): o is THREE.Group => o instanceof THREE.Group && o.name === 'hand'
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

  it('bends each finger as the hand is fitted to its stick: the middle holds, the back fingers ease off', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const timeline = new StrokeTimeline();

    // idle: no hits at all yet
    const idle = poseAt(timeline, 0, 0.5);
    update(idle);
    const hands = handGroups(root);
    const leadIdle = closestTo(hands, idle.arms.lead.wrist) as THREE.Group;
    const knuckles = () => [1, 2, 3].map((k) => (leadIdle.children[k] as THREE.Group).rotation.x);

    // exactly as the hand table fits them, whoever is drawing the hand
    const fit = (pose: typeof idle) => handSetOf(pose.arms.lead, 1).fingers.slice(0, 3);
    knuckles().forEach((x, n) => expect(x).toBeCloseTo(fit(idle)[n].bend[0], 9));

    // a fresh lead-hand hit: the squeeze closes the back fingers on the stick
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
    const struck = poseAt(timeline, 0.01, 0.5);
    update(struck);
    expect(struck.arms.lead.curl).toBeGreaterThan(idle.arms.lead.curl);
    knuckles().forEach((x, n) => expect(x).toBeCloseTo(fit(struck)[n].bend[0], 9));
    // the same hand on the same stick, the curl let go: the middle finger is the fulcrum and
    // holds whatever the curl; the back fingers ease off
    const open = { ...struck, arms: { ...struck.arms, lead: { ...struck.arms.lead, curl: 0 } } };
    expect(fit(open)[1]).toEqual(fit(struck)[1]);
    expect(fit(open)[2].bend[0]).toBeLessThan(fit(struck)[2].bend[0]);
  });
});

describe('buildDrummer() — a smile', () => {
  const named = (root: THREE.Object3D, name: string) => {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name === name) out.push(o);
    });
    return out;
  };
  /** How high each corner of a lip is above its middle, metres: the far end of each half. */
  const corners = (lip: THREE.Object3D) => {
    lip.updateMatrixWorld(true);
    return lip.children.map((half) => {
      const bar = half.children[0];
      // the bar runs from the middle out: its far end is twice its centre
      const end = half.localToWorld(bar.position.clone().multiplyScalar(2));
      return lip.worldToLocal(end).y;
    });
  };

  it('lifts the corners of the mouth, parts the lips over the teeth, and narrows the eyes', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const pose = { ...poseAt(new StrokeTimeline(), 0, 0), blink: 0 };
    const quiet = { ...pose, glance: { ...pose.glance, wink: 0 } };
    const lips = named(root, 'lip');
    const [teeth] = named(root, 'teeth');
    expect(lips).toHaveLength(2);
    const [upper, lower] = [...lips].sort((a, b) => b.position.y - a.position.y);

    update({ ...quiet, smile: 0 });
    const flat = corners(lower);
    expect(flat[0]).toBeCloseTo(0, 6);
    const gap = upper.position.y - lower.position.y;
    expect(teeth.visible).toBe(false);
    for (const e of named(root, 'eye')) expect(e.scale.y).toBe(1);

    update({ ...quiet, smile: 1 });
    // both corners of both lips up, by the same
    for (const lip of [upper, lower]) {
      const [a, b] = corners(lip);
      expect(a).toBeGreaterThan(0.002);
      expect(a).toBeCloseTo(b, 6);
    }
    expect(upper.position.y - lower.position.y).toBeGreaterThan(gap + 0.004);
    expect(teeth.visible).toBe(true);
    for (const e of named(root, 'eye')) {
      expect(e.scale.y).toBeLessThan(0.9);
      expect(e.scale.y).toBeGreaterThan(0.75);
    }

    // and back, all the way
    update({ ...quiet, smile: 0 });
    expect(corners(lower)).toEqual(flat);
    expect(teeth.visible).toBe(false);
  });

  it('lights up a robot’s mouth for its smile', () => {
    const robot = PERSONAS.find((p) => p.kind === 'robot')!;
    const m = makeMaterials(robot);
    const { root, update } = buildDrummer(m, robot);
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    const [lit] = named(root, 'teeth') as THREE.Mesh[];
    expect(lit.material).toBe(m.glow);
    update({ ...pose, smile: 0 });
    expect(lit.visible).toBe(false);
    update({ ...pose, smile: 1 });
    expect(lit.visible).toBe(true);
    expect(named(root, 'lip')).toHaveLength(0);
  });

  it('sculpts one nose, its tip out in front and its nostrils dark underneath', () => {
    const { root } = buildDrummer(makeMaterials());
    const noses = named(root, 'nose');
    expect(noses).toHaveLength(1);
    const geo = (noses[0] as THREE.Mesh).geometry;
    const p = geo.getAttribute('position');
    const colour = geo.getAttribute('color');
    let tip = 0;
    for (let i = 1; i < p.count; i++) if (p.getZ(i) < p.getZ(tip)) tip = i;
    // the furthest forward is on the middle line
    expect(Math.abs(p.getX(tip))).toBeLessThan(0.002);
    const dark: number[] = [];
    for (let i = 0; i < p.count; i++) if (colour.getX(i) < 0.5) dark.push(i);
    expect(dark.length).toBeGreaterThan(0);
    // either side of the middle, and all of them below the tip
    expect(dark.some((i) => p.getX(i) > 0.003)).toBe(true);
    expect(dark.some((i) => p.getX(i) < -0.003)).toBe(true);
    for (const i of dark) expect(p.getY(i)).toBeLessThan(p.getY(tip));
  });

  it('bows the top of the upper lip: a notch in the middle, a peak each side', () => {
    const { root } = buildDrummer(makeMaterials());
    const [upper] = [...named(root, 'lip')].sort((a, b) => b.position.y - a.position.y);
    for (const hinge of upper.children) {
      const half = hinge.children[0] as THREE.Mesh;
      const long = 2 * Math.abs(half.position.x);
      const p = half.geometry.getAttribute('position');
      // the top of the lip between `from` and `to` of the way out to the corner
      const top = (from: number, to: number) => {
        let y = -Infinity;
        for (let i = 0; i < p.count; i++) {
          const t = Math.abs(p.getX(i) + half.position.x) / long;
          if (t >= from && t <= to) y = Math.max(y, p.getY(i));
        }
        return y;
      };
      expect(top(0.25, 0.35)).toBeGreaterThan(top(0, 0.05) + 0.001);
      expect(top(0.25, 0.35)).toBeGreaterThan(top(0.85, 1) + 0.004);
    }
  });
});

describe('buildDrummer() — counting along', () => {
  const named = (root: THREE.Object3D, name: string) => {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name === name) out.push(o);
    });
    return out;
  };

  it('opens the mouth on a word, rounds or spreads it with the vowel, and shuts it after', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    const [upper, lower] = [...named(root, 'lip')].sort((a, b) => b.position.y - a.position.y);
    const [inside] = named(root, 'mouth');

    update({ ...pose, smile: 0, speak: { open: 0, round: 0 } });
    const gap = upper.position.y - lower.position.y;
    const wide = lower.scale.x;
    expect(inside.visible).toBe(false);

    update({ ...pose, smile: 0, speak: { open: 1, round: 0 } });
    expect(upper.position.y - lower.position.y).toBeGreaterThan(gap + 0.008);
    expect(inside.visible).toBe(true);

    // "two": pursed, the lips drawn in; "three": drawn wide
    update({ ...pose, smile: 0, speak: { open: 0.3, round: 1 } });
    expect(lower.scale.x).toBeLessThan(wide * 0.7);
    update({ ...pose, smile: 0, speak: { open: 0.35, round: -1 } });
    expect(lower.scale.x).toBeGreaterThan(wide);

    update({ ...pose, smile: 0, speak: { open: 0, round: 0 } });
    expect(upper.position.y - lower.position.y).toBeCloseTo(gap, 9);
    expect(lower.scale.x).toBeCloseTo(wide, 9);
    expect(inside.visible).toBe(false);
  });
});

describe('buildDrummer() — one eyebrow', () => {
  it('raises the one brow and leaves the other where it was', () => {
    const { root, update } = buildDrummer(makeMaterials());
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    const brows: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name === 'brow') brows.push(o);
    });
    const [lead, other] = [...brows].sort((a, b) => b.position.x - a.position.x);
    update({ ...pose, brow: { raise: 0, side: 1 } });
    const [a, b] = [lead.position.y, other.position.y];
    update({ ...pose, brow: { raise: 1, side: 1 } });
    expect(lead.position.y).toBeGreaterThan(a + 0.008);
    expect(other.position.y).toBe(b);
  });
});

describe('buildDrummer() — hair that swishes', () => {
  const swings = (root: THREE.Object3D) => {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name === 'hair-swing') out.push(o);
    });
    return out;
  };
  const who = (hairStyle: Persona['hairStyle']): Persona => ({ ...PERSONAS[0], hairStyle });
  /** A second of frames at 60 a second, the head turned `rate` radians a second for the first quarter of it. */
  const turnHead = (style: Persona['hairStyle'], rate: number) => {
    const p = who(style);
    const { root, update } = buildDrummer(makeMaterials(p), p);
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    const swung: number[] = [];
    for (let f = 0; f <= 60; f++) {
      const yaw = (rate * Math.min(f, 15)) / 60;
      update({ ...pose, headYaw: pose.headYaw + yaw }, undefined, 1 / 60);
      swung.push(Math.max(...swings(root).map((o) => Math.abs(o.rotation.y))));
    }
    return swung;
  };

  it('hangs long and big hair to swing, and leaves short hair alone', () => {
    for (const style of [
      'long',
      'afro',
      'dreads',
      'ponytail',
      'pigtails',
      'mullet',
      'shag',
    ] as const) {
      const p = who(style);
      expect(swings(buildDrummer(makeMaterials(p), p).root).length, style).toBeGreaterThan(0);
    }
    for (const style of ['bald', 'crop', 'bun', 'quiff', 'spikes', 'mohawk'] as const) {
      const p = who(style);
      expect(swings(buildDrummer(makeMaterials(p), p).root), style).toHaveLength(0);
    }
  });

  it('grows long hair as many locks, each tapering root to tip, not one block', () => {
    const p = who('long');
    const [hangs] = swings(buildDrummer(makeMaterials(p), p).root);
    const geo = hangs.children
      .filter((o): o is THREE.Mesh => o instanceof THREE.Mesh)
      .map((o) => o.geometry)
      .find((g) => !(g instanceof THREE.CapsuleGeometry))!;
    // 34 locks of 13 rings of 7
    expect(geo.getAttribute('position').count).toBe(34 * 13 * 7);
    // the strands run along v, root (0) to tip (1)
    const v = geo.getAttribute('uv');
    expect(v.getY(0)).toBe(0);
    expect(v.getY(13 * 7 - 1)).toBe(1);
  });

  it('swishes long hair on a strong turn of the head, and lets it settle', () => {
    const swung = turnHead('long', 4);
    expect(Math.max(...swung)).toBeGreaterThan(0.15);
    expect(swung[swung.length - 1]).toBeLessThan(0.05);
  });

  it('does not whip the hair out when the head jumps — a seek or a restart is a cut, not a toss', () => {
    const p = who('long');
    const { root, update } = buildDrummer(makeMaterials(p), p);
    const pose = poseAt(new StrokeTimeline(), 0, 0);
    update(pose, undefined, 1 / 60);
    // half a turn of the head in one frame, then held there
    let most = 0;
    for (let f = 0; f < 30; f++) {
      update({ ...pose, headYaw: pose.headYaw + 0.5 }, undefined, 1 / 60);
      most = Math.max(most, ...swings(root).map((o) => Math.abs(o.rotation.y)));
    }
    expect(most).toBeLessThan(0.05);
  });

  it('leaves it hanging through a gentle move: a groove’s nod is not a toss of the head', () => {
    expect(Math.max(...turnHead('long', 0.5))).toBe(0);
  });
});

describe('buildDrummer() — a glance at the camera', () => {
  /** The two eyes, each with its lid. Their parent is the head. */
  function eyes(root: THREE.Object3D): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name === 'eye') out.push(o);
    });
    expect(out).toHaveLength(2);
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

  it('looks down at the foot it glances at, not past it at the floor', () => {
    const tl = new StrokeTimeline();
    for (const which of ['kickFoot', 'hatFoot'] as const) {
      let t = 0;
      for (; t < 600; t += 0.05) {
        const e = expressionAt([], t);
        if (e.foot.look === 1 && e.foot.which === which) break;
      }
      const pose = poseAt(tl, t, 0);
      const { root, update } = buildDrummer(makeMaterials());
      update(pose);
      root.updateMatrixWorld(true);
      const head = eyes(root)[0].parent!;
      // from between the eyes
      const from = new THREE.Vector3();
      for (const e of eyes(root))
        from.add(e.getWorldPosition(new THREE.Vector3()).multiplyScalar(0.5));
      const toFoot = pose.legs[which].ball.clone().sub(from).normalize();
      // within the reach of the neck: it drops the head so far and no further
      const f = facing(head);
      // turned to it...
      expect(Math.atan2(-f.x, -f.z), which).toBeCloseTo(Math.atan2(-toFoot.x, -toFoot.z), 1);
      // ...and dropped to it, as far as the neck goes (0.85 rad): the eyes do the rest
      expect(Math.asin(f.y), which).toBeCloseTo(Math.max(Math.asin(toFoot.y), -0.85), 1);
    }
  });

  it('keeps the neck whole as the head drops to a foot: its top goes up into the skull with it', () => {
    const tl = new StrokeTimeline();
    let t = 0;
    for (; t < 600; t += 0.05) if (expressionAt([], t).foot.look === 1) break;
    const pose = poseAt(tl, t, 0);
    const { root, update } = buildDrummer(makeMaterials());
    update(pose);
    root.updateMatrixWorld(true);
    const head = eyes(root)[0].parent!;
    const neck = root.getObjectByName('neck') as THREE.Mesh;
    const pos = neck.geometry.getAttribute('position');
    // the neck's points, in the head's frame
    const inHead = Array.from({ length: pos.count }, (_, i) =>
      head.worldToLocal(
        new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(neck.matrixWorld)
      )
    );
    // the skull, as built: an egg of radius 0.1, squashed, its centre 0.1 up the head
    const inSkull = (p: THREE.Vector3) =>
      (p.x / 0.084) ** 2 + ((p.y - 0.1) / 0.112) ** 2 + (p.z / 0.098) ** 2 < 1;
    const top = inHead.reduce((a, b) => (b.y > a.y ? b : a));
    expect(inSkull(top)).toBe(true);
    // and it is the head that dropped, a long way: the neck bent with it rather than standing
    expect(head.rotation.x).toBeLessThan(-0.4);
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
    const brows = () => eyes(root)[0].parent!.children.filter((o) => o.name === 'brow');
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

  /** Root-level shaped limbs (and sleeves) in material `mat`. */
  const segmentsIn = (root: THREE.Object3D, mat: THREE.Material) =>
    root.children.filter(
      (o): o is THREE.Mesh =>
        o instanceof THREE.Mesh && o.material === mat && o.geometry instanceof THREE.LatheGeometry
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
        ...segmentsIn(root, m.jeans).flatMap((o) =>
          (o.geometry as THREE.LatheGeometry).parameters.points.map((p) => p.x)
        )
      );
    };
    // of one figure: a woman's thigh is fuller at the hip than a man's of the same build
    const heavy = PERSONAS.find((p) => p.build === 'heavy' && p.figure === 'male')!;
    const slim = PERSONAS.find((p) => p.build === 'slim' && p.figure === 'male')!;
    expect(widest(heavy)).toBeGreaterThan(widest(slim) * 1.4);
  });

  /** The skin of a bent mesh: `m.skin`'s, its detail kept where each point is at rest. */
  const isBentSkin = (mat: unknown, m: ReturnType<typeof makeMaterials>) =>
    mat instanceof THREE.MeshPhysicalMaterial &&
    mat !== m.skin &&
    mat.color.equals(m.skin.color) &&
    mat.customProgramCacheKey() === 'skin-bent';

  it('a T-shirt’s sleeves are the arms’ own surface, standing off them to a hem; a vest leaves the arms bare', () => {
    const armsOf = (who: Persona) => {
      const m = makeMaterials(who);
      const { root } = buildDrummer(m, who);
      const out: THREE.Mesh[] = [];
      root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.name === 'arm') out.push(o);
      });
      return { m, out };
    };
    const tee = PERSONAS.find(
      (p) => p.top === 'tee' && !p.cyborg && (p.kind ?? 'human') === 'human'
    )!;
    // the arms: in the shirt from the shoulder to the sleeve's hem, and skin below it; bare out of a vest
    const teeArms = armsOf(tee);
    expect(teeArms.out).toHaveLength(2);
    for (const o of teeArms.out) {
      const [shirt, skin] = o.material as THREE.Material[];
      expect(shirt).toBe(teeArms.m.shirt);
      expect(isBentSkin(skin, teeArms.m)).toBe(true);
      expect(o.geometry.groups.map((g) => g.materialIndex)).toEqual([0, 1]);
    }
    const vestArms = armsOf({ ...tee, top: 'vest' });
    expect(vestArms.out).toHaveLength(2);
    expect(vestArms.out.every((o) => isBentSkin(o.material, vestArms.m))).toBe(true);

    // at rest, from the shoulder joint: how far down the arm a point is, and how far out from its line
    const rest = (o: THREE.Mesh) => {
      const at = o.geometry.getAttribute('skinRest');
      // the last point is the tip of the cap round the wrist, on the arm's line
      const line = new THREE.Vector3().fromBufferAttribute(at, at.count - 1).normalize();
      return (i: number) => {
        const v = new THREE.Vector3().fromBufferAttribute(at, i);
        const down = v.dot(line);
        return { down, out: v.addScaledVector(line, -down).length() };
      };
    };
    const L = BODY.upperArm;
    const vestArm = rest(vestArms.out[0]);
    const vestCount = vestArms.out[0].geometry.getAttribute('skinRest').count;
    for (const o of teeArms.out) {
      const point = rest(o);
      const index = o.geometry.getIndex()!.array;
      const [inShirt] = o.geometry.groups;
      const shirt = [...new Set(index.slice(inShirt.start, inShirt.start + inShirt.count))].map(
        point
      );
      // the hem halfway to the elbow, all the way round
      const hem = Math.max(...shirt.map((p) => p.down));
      expect(hem).toBeGreaterThan(0.4 * L);
      expect(hem).toBeLessThan(0.55 * L);
      const meanOut = (pts: { down: number; out: number }[], from: number, to: number) => {
        const band = pts.filter((p) => p.down > from && p.down < to);
        expect(band.length).toBeGreaterThan(0);
        return band.reduce((a, p) => a + p.out, 0) / band.length;
      };
      // standing off the arm just above the hem, by more than its own cloth: the same arm out of a
      // vest, there, is bare skin under it
      const vestPts = Array.from({ length: vestCount }, (_, i) => vestArm(i));
      const slack =
        meanOut(shirt, hem - 0.012, hem - 0.006) - meanOut(vestPts, hem - 0.012, hem - 0.006);
      expect(slack).toBeGreaterThan(0.005);
      expect(slack).toBeLessThan(0.02);
      // and a sharp step down to the arm below it
      const count = o.geometry.getAttribute('skinRest').count;
      const below = Array.from({ length: count }, (_, i) => point(i)).filter((p) => p.down > hem);
      expect(meanOut(shirt, hem - 0.006, hem) - meanOut(below, hem, hem + 0.01)).toBeGreaterThan(
        0.005
      );
    }
  });

  it('a button-up’s sleeves run past the elbow to a cuff short of the wrist, the hand bare below it', () => {
    const who = PERSONAS.find((p) => p.top === 'button-up' && (p.kind ?? 'human') === 'human')!;
    const m = makeMaterials(who);
    const { root } = buildDrummer(m, who);
    const arms: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name === 'arm') arms.push(o);
    });
    expect(arms).toHaveLength(2);
    const reach = BODY.upperArm + BODY.forearm;
    for (const o of arms) {
      const [shirt, skin] = o.material as THREE.Material[];
      expect(shirt).toBe(m.shirt);
      expect(isBentSkin(skin, m)).toBe(true);
      // how far down the arm, at rest, each point of the sleeve is
      const at = o.geometry.getAttribute('skinRest');
      const line = new THREE.Vector3().fromBufferAttribute(at, at.count - 1).normalize();
      const [inShirt, inSkin] = o.geometry.groups;
      const index = o.geometry.getIndex()!.array;
      const downOf = (from: number, count: number) =>
        [...new Set(index.slice(from, from + count))].map((i) =>
          new THREE.Vector3().fromBufferAttribute(at, i).dot(line)
        );
      const hem = Math.max(...downOf(inShirt.start, inShirt.count));
      expect(hem).toBeGreaterThan(BODY.upperArm + 0.85 * BODY.forearm);
      expect(hem).toBeLessThan(reach - 0.01);
      // and the skin is only the wrist below it, and the cap round it
      expect(Math.min(...downOf(inSkin.start, inSkin.count))).toBeGreaterThan(hem - 0.002);
    }
  });

  it('keeps the skin’s detail on the arms and neck as they bend: each point’s rest position is kept', () => {
    const who = PERSONAS.find((p) => p.top === 'vest' && !p.cyborg)!;
    const m = makeMaterials(who);
    const { root, update } = buildDrummer(m, who);
    const bent: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.name === 'arm' || o.name === 'neck')) bent.push(o);
    });
    expect(bent).toHaveLength(3);
    const before = bent.map((o) => ({
      rest: Float32Array.from(o.geometry.getAttribute('skinRest').array),
      at: Float32Array.from(o.geometry.getAttribute('position').array),
    }));
    update({ ...posed(), headTilt: 0.3 });
    bent.forEach((o, k) => {
      // one skin, shared, whose detail reads the rest positions
      expect(isBentSkin(o.material, m)).toBe(true);
      expect(o.material).toBe(bent[0].material);
      // the points move; where the detail is laid out does not
      expect(o.geometry.getAttribute('position').array).not.toEqual(before[k].at);
      expect(o.geometry.getAttribute('skinRest').array).toEqual(before[k].rest);
    });
  });

  it.each([
    ['a person', 'human', 4],
    ['an all-machine cyborg', 'full', 2],
  ] as const)(
    'frees the jointed arm parts %s never shows, and nothing it does',
    (_, cyborg, perArm) => {
      const base = PERSONAS.find((p) => !p.cyborg && (p.kind ?? 'human') === 'human')!;
      const who: Persona = cyborg === 'full' ? { ...base, cyborg: 'full' } : base;
      const freed = new Set<THREE.BufferGeometry>();
      const dispose = vi
        .spyOn(THREE.BufferGeometry.prototype, 'dispose')
        .mockImplementation(function (this: THREE.BufferGeometry) {
          freed.add(this);
        });
      try {
        const { root } = buildDrummer(makeMaterials(who), who);
        const shown = new Set<THREE.BufferGeometry>();
        root.traverse((o) => {
          if (o instanceof THREE.Mesh) shown.add(o.geometry as THREE.BufferGeometry);
        });
        // nothing in the scene was freed under it
        expect([...freed].filter((g) => shown.has(g))).toEqual([]);
        // each arm's upper arm and forearm, and a person's elbow and wrist too (a machine's are lit,
        // and shown); and the neck's lathe, and its copy, once merged into one surface
        const parts = [...freed].filter(
          (g) => g instanceof THREE.LatheGeometry || g instanceof THREE.SphereGeometry
        );
        expect(parts).toHaveLength(2 * perArm + 2);
      } finally {
        dispose.mockRestore();
      }
    }
  );

  it('bends each arm’s flesh to the pose: out to its elbow and wrist, in to the trunk at the top', () => {
    const pose = posed();
    const who = PERSONAS.find((p) => p.top === 'vest' && !p.cyborg)!;
    const m = makeMaterials(who);
    const { root, update } = buildDrummer(m, who);
    update(pose);
    root.updateMatrixWorld(true);
    const arms: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name === 'arm') arms.push(o);
    });
    expect(arms).toHaveLength(2);
    expect(arms.every((o) => isBentSkin(o.material, m))).toBe(true);
    // both at the origin, their points where the pose puts them: each arm is the one nearer its elbow
    const pointsOf = (arm: THREE.Mesh) => {
      const p = arm.geometry.getAttribute('position');
      return Array.from({ length: p.count }, (_, i) =>
        new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(arm.matrixWorld)
      );
    };
    const nearestOf = (points: THREE.Vector3[], to: THREE.Vector3) =>
      Math.min(...points.map((v) => v.distanceTo(to)));
    for (const hand of ['lead', 'other'] as const) {
      const { shoulder, elbow, wrist } = pose.arms[hand];
      const points = arms
        .map(pointsOf)
        .reduce((a, b) => (nearestOf(b, elbow) < nearestOf(a, elbow) ? b : a));
      const nearest = (to: THREE.Vector3) => nearestOf(points, to);
      // the elbow and the wrist inside it, a skin's depth of flesh round each
      expect(nearest(elbow)).toBeGreaterThan(0.015);
      expect(nearest(elbow)).toBeLessThan(0.06);
      expect(nearest(wrist)).toBeLessThan(0.04);
      // and in at the top past the joint, toward the neck
      const inmost = Math.min(...points.map((v) => Math.abs(v.x - BODY.pelvis[0])));
      expect(inmost).toBeLessThan(Math.abs(shoulder.x - BODY.pelvis[0]) - 0.05);
    }
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
    // afro 1; a viking beard 1 (grown out of the face, moustache and all); shades 3; earrings 2
    expect(headMeshes(dressed) - headMeshes(bald)).toBe(7);
    // a top hat: brim, crown and band
    expect(headMeshes({ ...bald, hat: 'tophat' as const }) - headMeshes(bald)).toBe(3);
  });
});

describe('buildDrummer — facial hair', () => {
  /**
   * Every point of the beard with hair on it, in the head's frame, for a bald player
   * with `beard` (a grown beard's colour alpha is how much hair there is: the bare
   * edge round it is tucked under the skin).
   */
  const beardPoints = (beard: Persona['beard']) => {
    const who = { ...PERSONAS[0], hairStyle: 'bald' as const, beard };
    const { root } = buildDrummer(makeMaterials(who), who);
    const out: THREE.Vector3[] = [];
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.name !== 'beard') return;
      const geo = o.geometry as THREE.BufferGeometry;
      const p = geo.getAttribute('position');
      const hair = geo.getAttribute('color');
      for (const i of new Set(geo.getIndex()?.array ?? [])) {
        if (hair.getW(i) > 0.05) out.push(new THREE.Vector3().fromBufferAttribute(p, i));
      }
    });
    return out;
  };

  it('grows a full beard below the eyes, clear of the lips, and hanging under the chin', () => {
    const pts = beardPoints('full');
    expect(pts.length).toBeGreaterThan(500);
    // nothing up by the eyes (they sit at 0.115, 0.032 either side): only the sideburns,
    // out by the ears, come that high
    const face = pts.filter((p) => Math.abs(p.x) < 0.05 && p.z < -0.05);
    expect(Math.max(...face.map((p) => p.y))).toBeLessThan(0.085);
    // the mouth bare: no hair in front of the lower lip (the moustache may overhang the upper)
    const overLips = pts.filter(
      (p) => Math.abs(p.x) < 0.01 && p.y > 0.038 && p.y < 0.049 && p.z < -0.085
    );
    expect(overLips).toHaveLength(0);
    // below the chin, where a beardless jaw stops
    expect(Math.min(...pts.map((p) => p.y))).toBeLessThan(-0.03);
  });

  it('hangs a viking beard well below a full one, and keeps stubble to the skin', () => {
    const low = (pts: THREE.Vector3[]) => Math.min(...pts.map((p) => p.y));
    expect(low(beardPoints('viking'))).toBeLessThan(low(beardPoints('full')) - 0.06);
    // stubble is a shade on the jaw, nothing hanging off it
    expect(low(beardPoints('stubble'))).toBeGreaterThan(low(beardPoints('full')) + 0.02);
  });
});

describe('buildDrummer — cyborgs', () => {
  /** How many meshes under `root` wear each of `mats`. */
  const wearing = (who: Persona, pick: (m: ReturnType<typeof makeMaterials>) => THREE.Material) => {
    const m = makeMaterials(who);
    const { root } = buildDrummer(m, who);
    let n = 0;
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material === pick(m)) n++;
    });
    return n;
  };
  const unit = PERSONAS.find((p) => p.cyborg === 'full')!;
  const rivet = PERSONAS.find((p) => p.cyborg === 'arm')!;

  it('casts an all-machine player and a half-machine one', () => {
    expect(unit).toBeDefined();
    expect(rivet).toBeDefined();
  });

  it('lights one eye and the lead elbow and wrist on a half cyborg; both of each on a whole one', () => {
    // an eye's iris, an elbow and a wrist per machine side
    expect(wearing(rivet, (m) => m.glow)).toBe(3);
    expect(wearing(unit, (m) => m.glow)).toBe(6);
    // and nobody else glows
    expect(wearing(PERSONAS[0], (m) => m.glow)).toBe(0);
  });

  it('builds a half cyborg’s lead arm and hand in metal, and plates that side of the face', () => {
    const m = makeMaterials(rivet);
    const { root } = buildDrummer(m, rivet);
    // the lead arm's shoulder, upper arm, forearm, palm and finger joints
    let metal = 0;
    let plate = 0;
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.material === m.metal) metal++;
      if (o.name === 'plate') plate++;
    });
    expect(metal).toBeGreaterThan(10);
    expect(plate).toBe(1);
    // the other arm is still skin: only the lead side has gone over to metal
    const plain = { ...rivet, cyborg: undefined };
    expect(wearing(plain, (x) => x.skin)).toBeGreaterThan(wearing(rivet, (x) => x.skin));
  });
});

describe('buildDrummer — a robot and a beast', () => {
  const robot = PERSONAS.find((p) => p.kind === 'robot')!;
  const beast = PERSONAS.find((p) => p.kind === 'beast')!;
  const built = (who: Persona) => {
    const m = makeMaterials(who);
    return { m, ...buildDrummer(m, who) };
  };
  const count = (root: THREE.Object3D, keep: (o: THREE.Mesh) => boolean) => {
    let n = 0;
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && keep(o)) n++;
    });
    return n;
  };

  it('plates a robot to the floor in its own metal, its eyes and joints lit', () => {
    const { m, root } = built(robot);
    for (const mat of [m.skin, m.shirt, m.jeans, m.shoe]) {
      expect(mat.metalness).toBeGreaterThan(0.5);
      expect(`#${mat.color.getHexString()}`).toBe(robot.metal);
    }
    // its smile is lit too, but only while it smiles
    expect(count(root, (o) => o.material === m.glow && o.visible)).toBe(6);
  });

  it('gives a robot a machine face — no ears or brows to see, rings round the eyes — and a ribbed midriff', () => {
    const { m, root } = built(robot);
    const head = root.getObjectByName('eye')!.parent!;
    expect(head.children.filter((o) => o.name === 'brow').every((b) => !b.visible)).toBe(true);
    // the eye rings, on the face
    expect(
      head.children.filter(
        (o) =>
          o instanceof THREE.Mesh &&
          o.geometry instanceof THREE.TorusGeometry &&
          o.material === m.metal
      )
    ).toHaveLength(2);
    // a person's head has its ears; a robot's has none
    const ears = (who: Persona) => {
      const b = built(who);
      const h = b.root.getObjectByName('eye')!.parent!;
      return h.children.filter(
        (o) =>
          o instanceof THREE.Mesh &&
          o.material === b.m.skin &&
          o.geometry instanceof THREE.SphereGeometry &&
          Math.abs(o.geometry.parameters.radius - 0.026) < 1e-9
      ).length;
    };
    expect(ears(PERSONAS[0])).toBe(2);
    expect(ears(robot)).toBe(0);
    // five dark ribs round the waist
    expect(
      count(
        root,
        (o) =>
          o.material === m.black && o.geometry instanceof THREE.TorusGeometry && o.scale.z < 0.2
      )
    ).toBe(5);
  });

  it('furs a beast all over, with a paler belly and muzzle, round ears, horns and a dark nose', () => {
    const { m, root } = built(beast);
    for (const mat of [m.skin, m.shirt, m.jeans, m.shoe, m.hair]) {
      expect(mat.roughness).toBe(1);
      expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    }
    // the belly and the muzzle: fur, paler than the coat
    const coat = new THREE.Color(beast.skin);
    const paler: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.material instanceof THREE.MeshPhysicalMaterial &&
        o.material.roughness === 1 &&
        o.material.color.getHSL({ h: 0, s: 0, l: 0 }).l > coat.getHSL({ h: 0, s: 0, l: 0 }).l + 0.1
      )
        paler.push(o);
    });
    expect(paler).toHaveLength(2);
    const head = root.getObjectByName('eye')!.parent!;
    // two horns, standing up out of the crest
    const horns = head.children.filter(
      (o): o is THREE.Mesh => o instanceof THREE.Mesh && o.geometry instanceof THREE.ConeGeometry
    );
    expect(horns).toHaveLength(2);
    for (const h of horns) expect(h.position.y).toBeGreaterThan(0.2);
    expect(horns[0].position.x).toBeCloseTo(-horns[1].position.x, 6);
    // nose: tip and wings, dark
    expect(
      head.children.filter(
        (o) =>
          o instanceof THREE.Mesh &&
          o.material === m.black &&
          o.geometry instanceof THREE.SphereGeometry &&
          o.name !== 'mouth'
      ).length
    ).toBe(3);
    // nobody else has horns
    const plain = built(PERSONAS[0]);
    const plainHead = plain.root.getObjectByName('eye')!.parent!;
    expect(
      plainHead.children.filter(
        (o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.ConeGeometry
      )
    ).toHaveLength(0);
  });
});

describe('buildDrummer — hands and feet', () => {
  /** Flattened balls on the back of a fingertip: a nail is the only mesh scaled like that. */
  const nails = (root: THREE.Object3D) => {
    let n = 0;
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && Math.abs(o.scale.y - 0.32) < 1e-9) n++;
    });
    return n;
  };

  it('gives a person a nail on every finger and thumb, and a machine none', () => {
    expect(nails(buildDrummer(makeMaterials()).root)).toBe(10);
    const unit = PERSONAS.find((p) => p.cyborg === 'full')!;
    expect(nails(buildDrummer(makeMaterials(unit), unit).root)).toBe(0);
    // a half cyborg's metal hand has none; the other still does
    const rivet = PERSONAS.find((p) => p.cyborg === 'arm')!;
    expect(nails(buildDrummer(makeMaterials(rivet), rivet).root)).toBe(5);
  });

  it('laces each shoe up the instep, in a colour that shows against it', () => {
    const m = makeMaterials();
    const { root } = buildDrummer(m, PERSONAS[0]);
    // each heel piece: the one with a sole and a tongue under it
    const shoes = root.children.filter((o) => o.children.some((c) => c.name === 'tongue'));
    expect(shoes).toHaveLength(2);
    for (const shoe of shoes) {
      const laces = shoe.children.filter(
        (o): o is THREE.Mesh => o instanceof THREE.Mesh && o.name === 'lace'
      );
      expect(laces.length).toBeGreaterThanOrEqual(12);
      const lace = (laces[0].material as THREE.MeshStandardMaterial).color;
      const l = (c: THREE.Color) => c.getHSL({ h: 0, s: 0, l: 0 }).l;
      expect(Math.abs(l(lace) - l(m.shoe.color))).toBeGreaterThan(0.3);
    }
  });
});

describe('buildDrummer() — a cross-stick', () => {
  const snare = PIECES.snare;
  const centre = new THREE.Vector3(...snare.centre);
  const up = new THREE.Vector3(...onPiece(snare, [0, 1, 0])).sub(centre).normalize();

  /** The other hand's lowest point under each of its parts, metres off the snare head. */
  function heights(grips?: ReturnType<typeof gripsFor>, t = 0.5) {
    const tl = new StrokeTimeline();
    tl.ingest(stepWithHit({ lane: 's', value: 4, at: 0.5, slot: 4 }));
    const pose = poseAt(tl, t, 1, grips);
    const { root, update } = buildDrummer(makeMaterials());
    update(pose);
    root.updateMatrixWorld(true);
    const hand = root.children.find(
      (o) => o.name === 'hand' && o.position.distanceTo(pose.arms.other.wrist) < 1e-9
    )!;
    return hand.children.map((part) => {
      let low = Infinity;
      part.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const pos = (o.geometry as THREE.BufferGeometry).attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          low = Math.min(low, v.sub(centre).dot(up));
        }
      });
      return low;
    });
  }

  /**
   * The other hand set down for a cross-stick, `t` seconds in: where its first
   * finger's end and its thumb's end are from the stick — how far off its
   * surface (the shaft is about 7 mm round), and how far over to the
   * drummer's side of it (negative: the far side) — where its knuckles are
   * from the middle of the head, and which way its fingers point.
   */
  function crossHand(t: number) {
    const tl = new StrokeTimeline();
    tl.ingest(stepWithHit({ lane: 's', value: 4, at: 0.5, slot: 4 }));
    const pose = poseAt(tl, t, 1);
    const { root, update } = buildDrummer(makeMaterials());
    update(pose);
    root.updateMatrixWorld(true);
    const a = pose.arms.other;
    const hand = root.children.find(
      (o) => o.name === 'hand' && o.position.distanceTo(a.wrist) < 1e-9
    )!;
    const off = (p: THREE.Vector3) => {
      const rel = p.clone().sub(a.grip);
      return rel.addScaledVector(a.stick, -rel.dot(a.stick));
    };
    // the drummer's side of the stick, level
    const near = new THREE.Vector3(0, 0, 1).addScaledVector(a.stick, -a.stick.z).normalize();
    const end = (o: THREE.Object3D) => {
      const out: THREE.Vector3[] = [];
      o.traverse((m) => {
        if (!(m instanceof THREE.Mesh)) return;
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++)
          out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
      });
      return {
        gap: Math.min(...out.map((p) => off(p).length())) - 0.0072,
        side: out.reduce((sum, p) => sum + off(p).dot(near), 0) / out.length,
      };
    };
    // the first finger: knuckle, middle joint, end joint, each the last child of the one before
    const first = hand.children.filter((c) => c instanceof THREE.Group && c.position.z > 0.09)[0];
    let tip: THREE.Object3D = first;
    for (let k = 0; k < 2; k++) tip = tip.children[tip.children.length - 1];
    // the thumb's base sits in at the heel of the hand; its end joint hangs off the first bone
    const thumb = hand.children.find(
      (c) => c instanceof THREE.Group && Math.abs(c.position.z - 0.026) < 1e-9
    )!;
    const thumbEnd = thumb.children[0].children.find((c) => c instanceof THREE.Group)!;
    const knuckle = first.getWorldPosition(new THREE.Vector3());
    const snare = new THREE.Vector3(...PIECES.snare.centre);
    const head = new THREE.Vector3(...onPiece(PIECES.snare, [0, 1, 0])).sub(snare).normalize();
    const facing = hand.getWorldQuaternion(new THREE.Quaternion());
    const thumbFrom = thumb.getWorldPosition(new THREE.Vector3());
    const thumbTo = new THREE.Vector3(0, 0, 0.032).applyMatrix4(thumbEnd.matrixWorld);
    return {
      // which way the thumb runs, base to end, along the fingers' line (1: with them)
      thumbAlong: thumbTo
        .sub(thumbFrom)
        .normalize()
        .dot(new THREE.Vector3(0, 0, 1).applyQuaternion(facing)),
      // which way its nail faces: up (1) or down into the head (-1)
      nailUp: new THREE.Vector3(0, 1, 0).applyQuaternion(
        thumbEnd.getWorldQuaternion(new THREE.Quaternion())
      ).y,
      thumbBend: thumbEnd.rotation.x,
      finger: end(tip),
      thumb: end(thumbEnd),
      fromMiddle: Math.hypot(knuckle.x - snare.x, knuckle.z - snare.z),
      // how high the first finger's knuckle is off the head
      knuckleUp: knuckle.clone().sub(snare).dot(head),
      along: new THREE.Vector3(0, 0, 1)
        .applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()))
        .dot(a.stick),
    };
  }

  it('rests the hand in the middle of the head, arched up to the knuckles, its fingers along the stick', () => {
    for (const t of [0.53, 0.9]) {
      const h = crossHand(t);
      expect(h.fromMiddle).toBeLessThan(0.03);
      // along it, tipped up from the heel to the knuckles, not pressed flat
      expect(h.along).toBeGreaterThan(0.9);
      expect(h.along).toBeLessThan(0.97);
      expect(h.knuckleUp).toBeGreaterThan(0.045);
    }
  });

  it('lays the thumb along the side of the hand, nail up, bent at the end — not stuck out across it', () => {
    for (const t of [0.53, 0.9]) {
      const h = crossHand(t);
      expect(h.thumbAlong).toBeGreaterThan(0.7);
      expect(h.nailUp).toBeGreaterThan(0.5);
      expect(h.thumbBend).toBeGreaterThan(0.2);
    }
  });

  it('has thumb and first finger ready to pick the stick up between them, and lets go for a moment after each', () => {
    for (const t of [0.45, 0.9]) {
      const { finger, thumb } = crossHand(t);
      // the thumb's end against the drummer's side of the stick
      expect(thumb.side).toBeGreaterThan(0.005);
      expect(Math.abs(thumb.gap)).toBeLessThan(0.003);
      // the first finger's end hooked down the far side
      expect(finger.side).toBeLessThan(-0.005);
      expect(Math.abs(finger.gap)).toBeLessThan(0.002);
    }
    // just played: the thumb eased off it, still on the drummer's side
    const { thumb } = crossHand(0.53);
    expect(thumb.side).toBeGreaterThan(0.005);
    expect(thumb.gap).toBeGreaterThan(crossHand(0.9).thumb.gap + 0.0015);
  });

  it('rests the hand on the head — palm, fingers and thumb down on it, none of it through it', () => {
    for (const grips of [undefined, gripsFor('traditionalBoth')]) {
      const parts = heights(grips);
      for (const h of parts) expect(h).toBeGreaterThan(-0.002);
      // the palm itself (the first part) lies on the head, not over it
      expect(parts[0]).toBeLessThan(0.006);
      // and every finger is down near it: on the head, or the first on the stick
      expect(Math.max(...parts)).toBeLessThan(0.025);
    }
    // and ready round the stick between them, still down on it, not through it
    for (const t of [0.45, 0.9])
      for (const h of heights(undefined, t)) expect(h).toBeGreaterThan(-0.002);
  });
});

describe('buildDrummer() — a rimshot', () => {
  it('keeps the hand out past the hoop, below the head, not in the drum', () => {
    const snare = PIECES.snare;
    const centre = new THREE.Vector3(...snare.centre);
    const up = new THREE.Vector3(...onPiece(snare, [0, 1, 0])).sub(centre).normalize();
    for (const grips of [undefined, gripsFor('traditionalBoth')]) {
      const tl = new StrokeTimeline();
      tl.ingest(stepWithHit({ lane: 's', value: 5, at: 0.5, slot: 4 }));
      const limb = tl.all()[0].limb as 'lead' | 'other';
      const pose = poseAt(tl, 0.5, 1, grips);
      const { root, update } = buildDrummer(makeMaterials());
      update(pose);
      root.updateMatrixWorld(true);
      const hand = root.children.find(
        (o) => o.name === 'hand' && o.position.distanceTo(pose.arms[limb].wrist) < 1e-9
      )!;
      let inside = 0;
      hand.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const pos = (o.geometry as THREE.BufferGeometry).attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).sub(centre);
          const h = v.dot(up);
          const rho = v.addScaledVector(up, -h).length();
          // within the hoop and below its top is inside the drum
          if (rho < snare.radius + HOOP.out + HOOP.tube && h < HOOP.rise + HOOP.tube) inside++;
        }
      });
      expect(inside).toBe(0);
    }
  });
});

describe('buildDrummer — the likenesses', () => {
  const named = (root: THREE.Object3D, name: string) => {
    const out: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name === name) out.push(o);
    });
    return out;
  };
  const build = (who: Persona) => buildDrummer(makeMaterials(who), who);
  /** The headphones' cups: cylinders 0.038 round. */
  const cups = (root: THREE.Object3D) => {
    let n = 0;
    root.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.geometry instanceof THREE.CylinderGeometry &&
        o.geometry.parameters.radiusTop === 0.038
      )
        n++;
    });
    return n;
  };

  it.each(Object.values(LIKENESSES).map((p) => [p.name, p] as const))(
    '%s plays from the same joints, without headphones',
    (_name, who: Persona) => {
      const { root, update } = build(who);
      const timeline = new StrokeTimeline();
      timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));
      const pose = poseAt(timeline, 0.02, 1);
      update(pose, undefined, 1 / 60);
      for (const tip of [pose.arms.lead.tip, pose.arms.other.tip]) {
        const bead = closestTo(beadMeshes(root), tip);
        expect(bead.getWorldPosition(new THREE.Vector3()).distanceTo(tip)).toBeLessThan(1e-9);
      }
      expect(cups(root)).toBe(0);
    }
  );

  it('keeps the headphones on the cast', () => {
    expect(cups(build(PERSONAS[0]).root)).toBe(2);
  });

  it('dresses Mitchell in a jabot of ruffles, ruffled cuffs and braces, and Purdie in a dinner jacket and bow tie', () => {
    const mitch = build(LIKENESSES.mitchell).root;
    // seven down the front and one round the collar
    expect(named(mitch, 'ruffle')).toHaveLength(8);
    expect(named(mitch, 'cuff ruffle')).toHaveLength(2);
    expect(named(mitch, 'braces')).toHaveLength(2);
    const purdie = build(LIKENESSES.bernardpurdie).root;
    expect(named(purdie, 'jacket')).toHaveLength(1);
    expect(named(purdie, 'lapel')).toHaveLength(2);
    // the shirt shows in the jacket's V, in its own white
    const [shirt] = named(purdie, 'shirt') as THREE.Mesh[];
    expect((shirt.material as THREE.MeshStandardMaterial).color.getHexString()).not.toBe(
      (
        (named(purdie, 'jacket')[0] as THREE.Mesh).material as THREE.MeshStandardMaterial
      ).color.getHexString()
    );
    // nobody else wears them
    expect(named(build(PERSONAS[0]).root, 'braces')).toHaveLength(0);
  });

  it("gives the long sleeves to the arms: a jacket's, a satin shirt's and a smock's", () => {
    for (const who of [LIKENESSES.mitchell, LIKENESSES.bernardpurdie, LIKENESSES.klek]) {
      const m = makeMaterials(who);
      const { root } = buildDrummer(m, who);
      const arms = named(root, 'arm') as THREE.Mesh[];
      expect(arms).toHaveLength(2);
      // cloth then skin: two groups, the sleeve first
      for (const arm of arms) expect(arm.geometry.groups).toHaveLength(2);
    }
  });

  describe("Klek de Poitrine's mask", () => {
    const klek = LIKENESSES.klek;
    const nosePoints = (root: THREE.Object3D) => {
      const nose = named(root, 'nose')[0] as THREE.Mesh;
      return nose.geometry.getAttribute('position');
    };
    /** The tip of the nose, in the head's frame. */
    const tipOf = (root: THREE.Object3D) => {
      const p = nosePoints(root);
      return new THREE.Vector3().fromBufferAttribute(p, p.count - 1);
    };

    it('wears the mask in place of a face: no skin of a head, no hair, the eyes hidden inside', () => {
      const { root } = build(klek);
      expect(named(root, 'mask')).toHaveLength(1);
      expect(named(root, 'nose')).toHaveLength(1);
      expect(named(root, 'beard')).toHaveLength(0);
      for (const eye of named(root, 'eye')) expect(eye.visible).toBe(false);
      for (const brow of named(root, 'brow')) expect(brow.visible).toBe(false);
    });

    it('hangs the nose down the face at rest, below where it hangs from', () => {
      const { root, update } = build(klek);
      const pose = poseAt(new StrokeTimeline(), 0, 0);
      for (let f = 0; f < 60; f++) update(pose, undefined, 1 / 60);
      const tip = tipOf(root);
      // down, near the middle, in front of the mask
      expect(tip.y).toBeLessThan(0.08);
      expect(Math.abs(tip.x)).toBeLessThan(0.02);
      expect(tip.z).toBeLessThan(-0.12);
    });

    it('swings the nose side to side as the head turns, and lets it settle', () => {
      const { root, update } = build(klek);
      const pose = poseAt(new StrokeTimeline(), 0, 0);
      update(pose, undefined, 1 / 60);
      const sideways: number[] = [];
      for (let f = 0; f < 240; f++) {
        // a second of the head turning to and fro, then held
        const yaw = f < 60 ? 0.2 * Math.sin((2 * Math.PI * 1.5 * f) / 60) : 0;
        update({ ...pose, headYaw: pose.headYaw + yaw }, undefined, 1 / 60);
        sideways.push(tipOf(root).x);
      }
      // it swings off the middle of the face, in the head's own frame — this way and that
      expect(Math.max(...sideways.slice(0, 90))).toBeGreaterThan(0.02);
      expect(Math.min(...sideways.slice(0, 90))).toBeLessThan(-0.02);
      // and comes back to hang
      expect(Math.abs(sideways[sideways.length - 1])).toBeLessThan(0.01);
    });

    it('keeps the nose out of the mask as it swings', () => {
      const { root, update } = build(klek);
      const pose = poseAt(new StrokeTimeline(), 0, 0);
      for (let f = 0; f < 120; f++) {
        const yaw = 0.3 * Math.sin((2 * Math.PI * 2 * f) / 60);
        update({ ...pose, headYaw: pose.headYaw + yaw }, undefined, 1 / 60);
        // the middle of every ring along it is in front of the face
        const p = nosePoints(root);
        const centre = new THREE.Vector3();
        const at = new THREE.Vector3();
        for (let ring = 2; ring < 28; ring += 5) {
          centre.set(0, 0, 0);
          for (let j = 0; j < 12; j++) centre.add(at.fromBufferAttribute(p, ring * 12 + j));
          centre.divideScalar(12);
          expect(Math.hypot(centre.x, centre.z)).toBeGreaterThan(0.11);
        }
      }
    });

    it('does not whip the nose out when the head jumps: a seek is a cut, not a toss', () => {
      const { root, update } = build(klek);
      const pose = poseAt(new StrokeTimeline(), 0, 0);
      for (let f = 0; f < 30; f++) update(pose, undefined, 1 / 60);
      let most = 0;
      for (let f = 0; f < 60; f++) {
        update({ ...pose, headYaw: pose.headYaw + 0.6 }, undefined, 1 / 60);
        most = Math.max(most, Math.abs(tipOf(root).x));
      }
      expect(most).toBeLessThan(0.01);
    });

    it('dresses him in a loose smock on shoulder pads, and gloves with no nails', () => {
      const { root } = build(klek);
      expect(named(root, 'shoulder pad')).toHaveLength(2);
      // a nail is a ball 0.78 of its finger's end: none on a glove, ten on a hand
      const nails = (r: THREE.Object3D) => {
        let n = 0;
        r.traverse((o) => {
          if (
            o instanceof THREE.Mesh &&
            o.geometry instanceof THREE.SphereGeometry &&
            o.material instanceof THREE.MeshStandardMaterial &&
            o.material.roughness === 0.3 &&
            o.parent?.name !== 'eye'
          )
            n++;
        });
        return n;
      };
      expect(nails(root)).toBe(0);
      expect(nails(build(PERSONAS[0]).root)).toBeGreaterThan(0);
    });

    it('keeps the gloves’ spots on them as the arms bend: laid out where the arm is at rest', () => {
      const { root } = build(klek);
      for (const arm of named(root, 'arm') as THREE.Mesh[]) {
        const [sleeve, glove] = arm.material as THREE.Material[];
        for (const mat of [sleeve, glove])
          expect(mat.customProgramCacheKey()).toContain('dots-true');
        expect(arm.geometry.getAttribute('restNormal')).toBeDefined();
      }
    });

    it('hides the neck under the mask, which comes down onto the shoulders', () => {
      const { root } = build(klek);
      const [mask] = named(root, 'mask') as THREE.Mesh[];
      mask.geometry.computeBoundingBox();
      // below the base of the neck, in the head's frame
      expect(mask.geometry.boundingBox!.min.y).toBeLessThan(-0.05);
    });
  });

  /** A mesh's bounds, in its own frame (the head's, for a mask). */
  const boundsOf = (o: THREE.Object3D) => {
    const g = (o as THREE.Mesh).geometry;
    g.computeBoundingBox();
    return g.boundingBox!;
  };

  describe("Joey Jordison's mask: the face alone", () => {
    const joey = LIKENESSES.jordison;

    it('covers the face from brow to chin and leaves the head, the hair and the neck', () => {
      const { root } = build(joey);
      const [mask] = named(root, 'mask');
      const box = boundsOf(mask);
      // in front of the ears only, from under the chin to the hairline
      expect(box.max.z).toBeLessThan(0);
      expect(box.min.y).toBeGreaterThan(-0.01);
      expect(box.max.y).toBeLessThan(0.22);
      expect(named(root, 'curtains')).toHaveLength(1);
      expect(named(root, 'neck')[0].visible).toBe(true);
    });

    it('builds no face under it: no nose, no lips, the eyes and brows unseen inside it', () => {
      const { root } = build(joey);
      expect(named(root, 'nose')).toHaveLength(0);
      expect(named(root, 'lip')).toHaveLength(0);
      for (const eye of named(root, 'eye')) expect(eye.visible).toBe(false);
      for (const brow of named(root, 'brow')) expect(brow.visible).toBe(false);
    });

    it('moulds a nose into it, standing out of the face', () => {
      const { root } = build(joey);
      const [mask] = named(root, 'mask');
      const p = (mask as THREE.Mesh).geometry.getAttribute('position');
      let tip = 0;
      let cheek = 0;
      for (let i = 0; i < p.count; i++) {
        const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
        if (Math.abs(x) < 0.003 && Math.abs(y - 0.085) < 0.006) tip = Math.min(tip, z);
        if (Math.abs(Math.abs(x) - 0.03) < 0.004 && Math.abs(y - 0.085) < 0.006)
          cheek = Math.min(cheek, z);
      }
      expect(cheek - tip).toBeGreaterThan(0.012);
    });

    it('zips him into a boiler suit, its sleeves to the wrist', () => {
      const { root } = build(joey);
      expect(named(root, 'zip')).toHaveLength(1);
      expect(named(root, 'shoulder pad')).toHaveLength(0);
      for (const arm of named(root, 'arm') as THREE.Mesh[])
        expect(arm.geometry.groups).toHaveLength(2);
    });
  });

  describe("Skinny's hood: the whole head", () => {
    const skinny = LIKENESSES.skinny;

    it('goes over the whole head and down the neck, with no ears and no hair of its own', () => {
      const { root } = build(skinny);
      const [mask] = named(root, 'mask');
      const box = boundsOf(mask);
      expect(box.min.z).toBeLessThan(-0.09);
      expect(box.max.z).toBeGreaterThan(0.09);
      expect(named(root, 'hood neck')).toHaveLength(1);
      expect(named(root, 'neck')[0].visible).toBe(false);
      // a head's ears are balls 0.026 round at its sides: none under the hood
      let ears = 0;
      root.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          o.geometry instanceof THREE.SphereGeometry &&
          o.geometry.parameters.radius === 0.026
        )
          ears++;
      });
      expect(ears).toBe(0);
    });

    it('grows the dreads out of its crown, hanging to the shoulder blades and swinging', () => {
      const { root } = build(skinny);
      const swings = named(root, 'hair-swing');
      expect(swings).toHaveLength(1);
      const box = new THREE.Box3().setFromObject(swings[0]);
      // from the crown to well below the chin, in the drummer's frame
      expect(box.max.y - box.min.y).toBeGreaterThan(0.4);
    });
  });

  describe("Jizmak Da Gusha's head: sculpted whole", () => {
    const jizmak = LIKENESSES.jizmak;

    it("puts a monster's head bigger than his own over it, the neck hidden, no face of his own", () => {
      const { root } = build(jizmak);
      const [mask] = named(root, 'mask');
      const box = boundsOf(mask);
      expect(box.max.x - box.min.x).toBeGreaterThan(0.22);
      expect(box.max.y).toBeGreaterThan(0.3);
      expect(named(root, 'neck')[0].visible).toBe(false);
      expect(named(root, 'nose')).toHaveLength(0);
      for (const eye of named(root, 'eye')) expect(eye.visible).toBe(false);
    });

    it('hangs his hair from under the back of it, swinging', () => {
      const { root } = build(jizmak);
      expect(named(root, 'hair-swing')).toHaveLength(1);
    });
  });

  describe("II's mask: a cut-out face on a hood, under a cowl", () => {
    const ii = LIKENESSES.sleeptoken;

    it('hoods the whole head, the neck hidden, and hangs a cowl over it open round the face', () => {
      const { root } = build(ii);
      expect(named(root, 'mask')).toHaveLength(1);
      expect(named(root, 'neck')[0].visible).toBe(false);
      const [cowl] = named(root, 'cowl');
      const box = boundsOf(cowl);
      // round the head and down over the shoulders, its crown pulled back to a point
      expect(box.min.y).toBeLessThan(-0.2);
      expect(box.max.z).toBeGreaterThan(0.12);
      // and no cloth in front of the face itself
      const p = (cowl as THREE.Mesh).geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
        if (z < 0) expect((x / 0.072) ** 2 + ((y - 0.105) / 0.118) ** 2).toBeGreaterThan(0.95);
      }
    });
  });

  describe("the Locust's hood: canvas over the whole head", () => {
    it('hoods the head and neck, the skull and ears under it unseen, and leaves the arms bare', () => {
      const { root } = build(LIKENESSES.locust);
      expect(named(root, 'mask')).toHaveLength(1);
      expect(named(root, 'hood neck')).toHaveLength(1);
      expect(named(root, 'neck')[0].visible).toBe(false);
      expect(named(root, 'nose')).toHaveLength(0);
    });
  });

  describe("the Nameless Ghoul's mask: a horned silver casting", () => {
    const ghoul = LIKENESSES.ghoul;

    it('casts the face, the hair and two horns over a black hood, and shows none of the head under it', () => {
      const { root } = build(ghoul);
      expect(named(root, 'mask')).toHaveLength(1);
      expect(named(root, 'hood')).toHaveLength(1);
      expect(named(root, 'sculpted hair')).toHaveLength(1);
      expect(named(root, 'horn')).toHaveLength(2);
      expect(named(root, 'curl')).toHaveLength(2);
      expect(named(root, 'neck')[0].visible).toBe(false);
      expect(named(root, 'nose')).toHaveLength(0);
    });

    it('draws the chin down to a point below his own, and the nose out past the face', () => {
      const { root } = build(ghoul);
      const box = boundsOf(named(root, 'mask')[0]);
      expect(box.min.y).toBeLessThan(-0.035);
      expect(box.min.z).toBeLessThan(-0.13);
    });
  });
});
