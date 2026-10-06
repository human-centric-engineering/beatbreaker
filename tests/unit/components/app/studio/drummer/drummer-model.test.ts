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
    expect(count(root, (o) => o.material === m.glow)).toBe(6);
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

  it('furs a beast all over, with a dark nose and a bandolier of pouches', () => {
    const { m, root } = built(beast);
    for (const mat of [m.skin, m.shirt, m.jeans, m.shoe, m.hair]) {
      expect(mat.roughness).toBe(1);
      expect(mat).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    }
    // the strap's pouches
    expect(count(root, (o) => o.material === m.chrome)).toBe(5);
    const plain = built(PERSONAS[0]);
    expect(count(plain.root, (o) => o.material === plain.m.chrome)).toBe(0);
    // nose: tip and wings, dark
    const head = root.getObjectByName('eye')!.parent!;
    expect(
      head.children.filter(
        (o) =>
          o instanceof THREE.Mesh &&
          o.material === m.black &&
          o.geometry instanceof THREE.SphereGeometry
      ).length
    ).toBe(3);
  });
});
