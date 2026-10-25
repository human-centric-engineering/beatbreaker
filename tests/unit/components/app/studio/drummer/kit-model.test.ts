/**
 * `buildKit()` — the 3D drum kit built from primitives, and the one thing it
 * does every frame: move the beater, the pedal boards and the top hat to
 * match a `Pose`, swing a cymbal after it is struck, and show/hide the
 * percussion pieces a pattern has actually called for.
 *
 * Poses are never hand-built here: every one comes from a real
 * `StrokeTimeline` fed a hand-built `ScheduledStep` (`tests/helpers/
 * drummer-fixtures.ts`) through the real `poseAt()`. That is the only path
 * `drummer-stage.ts`'s render loop ever uses, so a pose this file drives the
 * kit with is one the kit will actually be handed in the browser.
 *
 * `buildKit()` exposes nothing by id — every mesh and group it builds is an
 * anonymous child of `root`. Rather than reach into the closure, these tests
 * find scene nodes the way the task allows: by the one child a piece's frame
 * group has (`onlyGroupChildAt`), or by which objects' `.visible` flag
 * actually changes across an `update()` call (percussion).
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  buildKit,
  drumShake,
  hatRock,
  headDip,
  resoAcross,
  resoShake,
  resoShape,
} from '@/components/app/studio/drummer/kit-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import {
  DOUBLE_PEDAL,
  HAT_PEDAL,
  HAT_PEDAL_BESIDE_DOUBLE,
  HAT_SHIFT_DOUBLE,
  PIECES,
  type PieceId,
  type V3,
} from '@/lib/app/breaks/drummer/kit-layout';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';
import { poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import { stepWithHit } from '@/tests/helpers/drummer-fixtures';

/**
 * The single `Group` child of whichever node sits exactly at `centre` — a
 * piece's frame has exactly one child (the drum body, or a cymbal's swing
 * group), so this is how a test gets at the thing `update()` actually moves
 * without a name or an export to ask for.
 */
function onlyGroupChildAt(root: THREE.Object3D, centre: V3): THREE.Group {
  const target = new THREE.Vector3(...centre);
  const found: THREE.Group[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Group && o.parent && o.parent.position.distanceTo(target) < 1e-6) {
      found.push(o);
    }
  });
  if (found.length !== 1) {
    throw new Error(`expected exactly one group at ${centre.join(',')}, found ${found.length}`);
  }
  return found[0];
}

const idlePose = () => poseAt(new StrokeTimeline(), 0, 0);

describe('buildKit', () => {
  it('builds a named root group', () => {
    const { root } = buildKit(makeMaterials());
    expect(root.name).toBe('kit');
    expect(root).toBeInstanceOf(THREE.Group);
  });

  it('lays the mat with a band of trim round its edge', () => {
    const m = makeMaterials();
    const { root } = buildKit(m);
    const rug = root.children.find((o) => o instanceof THREE.Mesh && o.material === m.rug);
    const trim = root.children.find((o) => o instanceof THREE.Mesh && o.material === m.trim);
    expect(rug).toBeInstanceOf(THREE.Mesh);
    expect(trim).toBeInstanceOf(THREE.Mesh);
    const disc = (rug as THREE.Mesh<THREE.CircleGeometry>).geometry.parameters;
    const band = (trim as THREE.Mesh<THREE.RingGeometry>).geometry.parameters;
    // the band starts where the mat ends, flat on the floor at the same spot
    expect(band.innerRadius).toBe(disc.radius);
    expect(band.outerRadius).toBeGreaterThan(disc.radius);
    expect(trim!.position.toArray()).toEqual(rug!.position.toArray());
    expect(trim!.rotation.x).toBe(rug!.rotation.x);
  });

  it('idles with the cymbals still and the hat closed', () => {
    const { root, update } = buildKit(makeMaterials());
    const crash = onlyGroupChildAt(root, PIECES.crash.centre);
    update(idlePose(), new Set());
    expect(crash.rotation.x).toBe(0);
    expect(crash.rotation.z).toBe(0);
  });
});

describe('buildKit().setLeather', () => {
  it('lays leather over the snare head for a deadened kit, taped at its edge, and takes it off again', () => {
    const { root, setLeather } = buildKit(makeMaterials());
    const leather = root.getObjectByName('leather');
    expect(leather).toBeTruthy();
    expect(leather?.visible).toBe(false);
    // centred on the snare's head, at its height
    root.updateMatrixWorld(true);
    const at = leather?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3();
    const [x, y, z] = PIECES.snare.centre;
    expect(Math.hypot(at.x - x, at.z - z)).toBeLessThan(0.01);
    expect(at.y).toBeCloseTo(y, 1);
    // a child of the drum's body, so it rides the drum when it shakes
    expect(leather?.parent?.getObjectByName('head')).toBeTruthy();
    // the hide, nearly the head across but inside its hoop, and three pieces of tape
    const meshes = leather?.children.filter((o) => o instanceof THREE.Mesh) ?? [];
    expect(meshes.length).toBe(4);
    const hide = meshes[0] instanceof THREE.Mesh ? meshes[0].geometry : undefined;
    hide?.computeBoundingSphere();
    const across = hide?.boundingSphere?.radius ?? 0;
    expect(across).toBeGreaterThan(PIECES.snare.radius * 0.85);
    expect(across).toBeLessThan(PIECES.snare.radius);
    setLeather(true);
    expect(leather?.visible).toBe(true);
    setLeather(false);
    expect(leather?.visible).toBe(false);
  });

  it('ripples with the head under it when the snare is struck, and lies still again after', () => {
    const { root, update } = buildKit(makeMaterials());
    const hide = root.getObjectByName('leather')?.children[0];
    const geometry = hide instanceof THREE.Mesh ? hide.geometry : undefined;
    const lift = () => {
      const pos = geometry?.getAttribute('position');
      let most = 0;
      for (let j = 0; j < (pos?.count ?? 0); j++)
        most = Math.max(most, Math.abs(pos?.getZ(j) ?? 0));
      return most;
    };
    expect(lift()).toBe(0);
    update({ ...idlePose(), hits: { snare: { since: 0.002, strength: 1, seed: 1 } } }, new Set());
    expect(lift()).toBeGreaterThan(0.0005);
    update(idlePose(), new Set());
    expect(lift()).toBe(0);
  });
});

describe('buildKit().update — percussion visibility', () => {
  it('keeps perc1/perc2 pieces hidden until the pattern calls for them, then shows each independently', () => {
    const { root, update, dress, setLeather } = buildKit(makeMaterials());
    // the octobans and the leather up, so only what the pattern puts up and takes down comes and goes
    dress({ ...PERSONAS[0].kit, octobans: true });
    setLeather(true);
    const pose = idlePose();

    const snapshot = () => {
      const vis: boolean[] = [];
      root.traverse((o) => vis.push(o.visible));
      return vis;
    };

    const defaultVisible = snapshot();
    expect(defaultVisible.every(Boolean)).toBe(true); // nothing hidden before any update()

    // (the double pedal in throughout, so only the percussion comes and goes)
    update(pose, new Set(['perc1', 'perc2']), true);
    const withAll = snapshot();
    update(pose, new Set(), true);
    const withNone = snapshot();
    // exactly the percussion pieces (cowbell+rod, block+rod = 4 objects) went invisible
    const hiddenIdx = withNone.reduce<number[]>(
      (acc, v, i) => (v || !withAll[i] ? acc : [...acc, i]),
      []
    );
    expect(hiddenIdx.length).toBe(4);

    update(pose, new Set(['perc1']), true);
    const withPerc1 = snapshot();
    const stillHidden = hiddenIdx.filter((i) => !withPerc1[i]);
    // half of the originally-hidden set (perc1's cowbell + its support rod) came back
    expect(stillHidden.length).toBe(2);

    update(pose, new Set(['perc1', 'perc2']), true);
    const withBoth = snapshot();
    expect(hiddenIdx.every((i) => withBoth[i])).toBe(true);

    // and it's reversible: dropping both hides all four again
    update(pose, new Set(), true);
    const backToNone = snapshot();
    expect(hiddenIdx.every((i) => !backToNone[i])).toBe(true);
  });

  it('puts the double pedal in only for a pattern played on one', () => {
    const { root, update, dress, setLeather } = buildKit(makeMaterials());
    dress({ ...PERSONAS[0].kit, octobans: true });
    setLeather(true);
    const pose = idlePose();
    const hidden = () => {
      let n = 0;
      root.traverse((o) => void (o.visible || n++));
      return n;
    };
    /* with it in: the hat stand where it stands without one (stand and pull rod, one group)
       is out — and on each percussion mount the piece it is not holding (a block under the
       cowbell, a bell under the block), always two */
    update(pose, new Set(['perc1', 'perc2']), true);
    expect(hidden()).toBe(1 + 2);
    /* without it: the double pedal (the second board, its plate, the drive shaft and the
       second beater, one group) and the hat stand turned to make room for it */
    update(pose, new Set(['perc1', 'perc2']));
    expect(hidden()).toBe(2 + 2);
  });

  it('shows on each mount the instrument its slot sounds as: a bell for a cowbell, a block otherwise', () => {
    const { root, update } = buildKit(makeMaterials());
    const pose = idlePose();
    /** Visible meshes by geometry: the bell is a four-sided cylinder, the block a box. */
    const shown = () => {
      const out = { bell: 0, block: 0 };
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || !o.visible) return;
        if (o.geometry instanceof THREE.BoxGeometry && o.geometry.parameters.width === 0.15)
          out.block++;
        if (
          o.geometry instanceof THREE.CylinderGeometry &&
          o.geometry.parameters.radialSegments === 4
        )
          out.bell++;
      });
      return out;
    };
    const both = new Set<PieceId>(['perc1', 'perc2']);
    // nothing heard yet: each mount holds what it always has
    update(pose, both);
    expect(shown()).toEqual({ bell: 1, block: 1 });
    // a cowbell in the second slot (Afrobeat's) is a cowbell there too
    update(pose, both, false, new Map<PieceId, string>([['perc2', 'cowbell']]));
    expect(shown()).toEqual({ bell: 2, block: 0 });
    // and a woodblock in the first is a block there
    update(
      pose,
      both,
      false,
      new Map<PieceId, string>([
        ['perc1', 'wood'],
        ['perc2', 'wood'],
      ])
    );
    expect(shown()).toEqual({ bell: 0, block: 2 });
  });

  it('moves the whole hi-hat over for the double pedal, the pedal still under the cymbals', () => {
    const { root, update } = buildKit(makeMaterials());
    const pose = idlePose();
    /** Where, in the kit, the thing first placed at `at` in the hi-hat now is. */
    const placedAt = (at: V3) => {
      let found: THREE.Object3D | null = null;
      root.traverse((o) => {
        if (
          !found &&
          o.parent?.parent === root &&
          o.position.distanceTo(new THREE.Vector3(...at)) < 1e-6
        )
          found = o;
      });
      expect(found).not.toBeNull();
      const o = found as unknown as THREE.Object3D;
      root.updateMatrixWorld(true);
      return o.getWorldPosition(new THREE.Vector3());
    };
    update(pose, new Set());
    const board = placedAt(HAT_PEDAL.heel);
    const cymbal = placedAt(PIECES.hat.centre);
    expect(board.x).toBeCloseTo(HAT_PEDAL.heel[0], 6);
    expect(cymbal.x).toBeCloseTo(PIECES.hat.centre[0], 6);

    update(pose, new Set(), true);
    const board2 = placedAt(HAT_PEDAL.heel);
    const cymbal2 = placedAt(PIECES.hat.centre);
    // the pedal and the cymbals move together, so the pedal is still under them
    expect(board2.x - board.x).toBeCloseTo(HAT_SHIFT_DOUBLE[0], 6);
    expect(cymbal2.x - cymbal.x).toBeCloseTo(HAT_SHIFT_DOUBLE[0], 6);
    expect(board2.x).toBeCloseTo(HAT_PEDAL_BESIDE_DOUBLE.heel[0], 6);
    // out past the second board, on the left
    expect(HAT_PEDAL_BESIDE_DOUBLE.heel[0]).toBeLessThan(DOUBLE_PEDAL.heel[0] - 0.12);

    // and back, for a pattern on one pedal
    update(pose, new Set());
    expect(placedAt(PIECES.hat.centre).x).toBeCloseTo(PIECES.hat.centre[0], 6);
  });
});

describe('buildKit().update — cymbal swing', () => {
  it('swings the crash after it is struck, decays, and stops once the hit is stale (>6s)', () => {
    const { root, update } = buildKit(makeMaterials());
    const crash = onlyGroupChildAt(root, PIECES.crash.centre);
    const timeline = new StrokeTimeline();

    // before any hit: still
    update(poseAt(timeline, 0, 1), timeline.percussion);
    expect(crash.rotation.x).toBe(0);
    expect(crash.rotation.z).toBe(0);

    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));

    // just after the hit: swinging
    update(poseAt(timeline, 0.05, 1), timeline.percussion);
    const early = Math.hypot(crash.rotation.x, crash.rotation.z);
    expect(early).toBeGreaterThan(0);

    // later: decayed, but still moving
    update(poseAt(timeline, 1.5, 1), timeline.percussion);
    const later = Math.hypot(crash.rotation.x, crash.rotation.z);
    expect(later).toBeGreaterThan(0);
    expect(later).toBeLessThan(early);

    // stale (> 6s since the hit): the swinger resets outright
    update(poseAt(timeline, 7, 1), timeline.percussion);
    expect(crash.rotation.x).toBe(0);
    expect(crash.rotation.z).toBe(0);
  });

  it('only swings the cymbal that was actually struck', () => {
    const { root, update } = buildKit(makeMaterials());
    const crash = onlyGroupChildAt(root, PIECES.crash.centre);
    const ride = onlyGroupChildAt(root, PIECES.ride.centre);
    const timeline = new StrokeTimeline();
    timeline.ingest(stepWithHit({ lane: 'c', value: 1, at: 0 }));

    update(poseAt(timeline, 0.05, 1), timeline.percussion);

    expect(Math.hypot(crash.rotation.x, crash.rotation.z)).toBeGreaterThan(0);
    expect(ride.rotation.x).toBe(0);
    expect(ride.rotation.z).toBe(0);
  });
});

describe('buildKit().update — top hat gap', () => {
  it('rises by exactly the pose hat-gap delta when the hat opens', () => {
    const { root, update } = buildKit(makeMaterials());
    const hatCentre = new THREE.Vector3(...PIECES.hat.centre);

    // two groups in the hi-hat sit exactly on the hat's centre: the top cymbal's
    // carrier (moved by `update()`) and the bottom cymbal's frame (fixed).
    // Rather than guess which is which by structure, tell them apart by the
    // one real difference between them: only one of them actually moves.
    const candidates: THREE.Group[] = [];
    root.traverse((o) => {
      if (
        o instanceof THREE.Group &&
        o.parent?.parent === root &&
        o.position.distanceTo(hatCentre) < 1e-6
      ) {
        candidates.push(o);
      }
    });
    expect(candidates.length).toBe(2);

    const timeline = new StrokeTimeline();
    const closedPose = poseAt(timeline, 0, 0);
    update(closedPose, timeline.percussion);
    const y0 = candidates.map((c) => c.position.y);

    timeline.ingest(stepWithHit({ lane: 'h', value: 3, at: 0 })); // 3 = open
    const openPose = poseAt(timeline, 1, 0);
    expect(openPose.hatGap).toBeGreaterThan(closedPose.hatGap);
    update(openPose, timeline.percussion);
    const y1 = candidates.map((c) => c.position.y);

    const deltas = y1.map((y, i) => y - y0[i]);
    const moved = deltas.filter((d) => Math.abs(d) > 1e-9);
    expect(moved.length).toBe(1);
    expect(moved[0]).toBeCloseTo(openPose.hatGap - closedPose.hatGap, 6);
  });
});

describe('buildKit().update — struck hats', () => {
  it('rocks both hat cymbals when the hat is struck, and leaves them on their tilt before', () => {
    const { root, update } = buildKit(makeMaterials());
    const hatCentre = new THREE.Vector3(...PIECES.hat.centre);
    // the bottom cymbal's frame sits on the hat's centre, turned by its tilt; the
    // top cymbal's frame rides inside the carrier that sits there too
    const frames: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (
        o instanceof THREE.Group &&
        o.parent?.parent === root &&
        o.position.distanceTo(hatCentre) < 1e-6
      ) {
        frames.push(o.rotation.x === PIECES.hat.tilt[0] ? o : o.children[0]);
      }
    });
    expect(frames.length).toBe(2);

    const timeline = new StrokeTimeline();
    update(poseAt(timeline, 0, 0), timeline.percussion);
    for (const f of frames) expect(f.rotation.x).toBe(PIECES.hat.tilt[0]);

    timeline.ingest(stepWithHit({ lane: 'h', value: 4, at: 0 })); // 4 = half-open
    update(poseAt(timeline, 0.02, 1), timeline.percussion);
    for (const f of frames) expect(f.rotation.x).not.toBeCloseTo(PIECES.hat.tilt[0], 6);
  });
});

describe('hatRock — a struck hi-hat', () => {
  const SHUT = 0.003;
  const HALF = SHUT + 0.024 * 0.22;
  const OPEN = SHUT + 0.024;
  const times = Array.from({ length: 300 }, (_, i) => i / 1000);
  /** How far the top cymbal's near edge goes down past the bottom one's, at its deepest. */
  const deepest = (gap: number, strength = 1) =>
    Math.max(
      ...times.map((t) => hatRock(t, strength, gap).top.rx - hatRock(t, strength, gap).bottom.rx)
    );

  it('is still before the stroke and once it has died', () => {
    const still = { top: { rx: 0, rz: 0 }, bottom: { rx: 0, rz: 0 } };
    expect(hatRock(-0.01, 1, HALF)).toEqual(still);
    expect(hatRock(10, 1, HALF)).toEqual(still);
  });

  it('tips a shut pair a little, together, and settles them quickly', () => {
    const r = hatRock(0.01, 1, SHUT);
    expect(r.top).toEqual(r.bottom);
    expect(Math.abs(r.top.rx)).toBeGreaterThan(0.005);
    for (const t of times) expect(Math.abs(hatRock(t, 1, SHUT).top.rx)).toBeLessThan(0.02);
    expect(Math.abs(hatRock(0.5, 1, SHUT).top.rx)).toBeLessThan(1e-3);
  });

  it('rocks a half-open top cymbal on its own, down onto the bottom one and no further', () => {
    const down = deepest(HALF);
    expect(down).toBeGreaterThan(0.03);
    expect(down).toBeLessThanOrEqual(HALF / PIECES.hat.radius + 1e-9);
  });

  it('rocks an open top cymbal clear, further than a half-open one', () => {
    expect(deepest(OPEN)).toBeGreaterThan(deepest(HALF));
  });

  it('rocks less for a softer stroke', () => {
    expect(deepest(HALF, 0.3)).toBeLessThan(deepest(HALF));
  });
});

describe('buildKit().update — pedals and beater', () => {
  it('turns the kick beater and the pedal boards from the pose, not from nowhere', () => {
    const { root, update } = buildKit(makeMaterials());
    // the beater group sits at KICK_PEDAL.axle, with the shaft/felt as children
    const timeline = new StrokeTimeline();
    timeline.ingest(stepWithHit({ lane: 'k', value: 2, at: 0 }));
    const struck = poseAt(timeline, 0.01, 1);
    const idle = idlePose();

    expect(struck.beater).not.toBeCloseTo(idle.beater, 4);

    // find the beater group: the only Group directly under root with a
    // CylinderGeometry shaft child and a felt-cylinder child, both Meshes
    let beaterGroup: THREE.Object3D | undefined;
    root.children.forEach((o) => {
      if (
        o instanceof THREE.Group &&
        o.children.length === 2 &&
        o.children.every((c) => c instanceof THREE.Mesh)
      ) {
        beaterGroup = o;
      }
    });
    expect(beaterGroup).toBeDefined();

    update(idle, timeline.percussion);
    const idleRotation = beaterGroup!.rotation.x;
    update(struck, timeline.percussion);
    expect(beaterGroup!.rotation.x).not.toBeCloseTo(idleRotation, 4);
    expect(beaterGroup!.rotation.x).toBeCloseTo(struck.beater, 6);
  });
});

describe("resoShake — the kick's front head shivering", () => {
  const still = { out: 0, x: 0, y: 0 };
  const size = (s: { out: number; x: number; y: number }) => Math.hypot(s.out, s.x, s.y);
  const across = (t: number) => Math.hypot(resoShake(t, 1).x, resoShake(t, 1).y);

  it('is still before a kick and once the shiver has died', () => {
    expect(resoShake(-0.01, 1)).toEqual(still);
    expect(resoShake(2, 1)).toEqual(still);
    expect(resoShake(0, 1).out).toBe(0);
  });

  it('is pushed out first, by a few millimetres, and shakes across its face as much', () => {
    // a quarter of an 18 Hz cycle out
    const s = resoShake(1 / 72, 1);
    expect(s.out).toBeGreaterThan(0.002);
    expect(s.out).toBeLessThan(0.005);
    const most = Math.max(...Array.from({ length: 20 }, (_, i) => across(i / 400)));
    expect(most).toBeGreaterThan(0.002);
    expect(most).toBeLessThan(0.007);
  });

  it('shivers slowly enough for a 60 fps frame to catch: frames a sixtieth apart change sign', () => {
    const outs = Array.from({ length: 8 }, (_, f) => resoShake(f / 60 + 0.001, 1).out);
    const flips = outs.slice(1).filter((o, i) => Math.sign(o) !== Math.sign(outs[i])).length;
    expect(flips).toBeGreaterThanOrEqual(3);
  });

  it('shakes less for a softer kick, and dies away', () => {
    expect(resoShake(1 / 72, 0.3).out).toBeCloseTo(0.3 * resoShake(1 / 72, 1).out, 9);
    expect(size(resoShake(1 / 72 + 0.5, 1))).toBeLessThan(size(resoShake(1 / 72, 1)) * 0.1);
  });
});

describe('resoAcross — the shake across the face', () => {
  it('is all of it in the middle and none at the hoop', () => {
    expect(resoAcross(0)).toBe(1);
    expect(resoAcross(1)).toBe(0);
    // (the name, round the ring at 400 of 512, still shivers)
    expect(resoAcross(0.78)).toBeGreaterThan(0.5);
  });
});

describe("resoShape — the head's fundamental", () => {
  it('is 1 at the centre and falls to nothing at the hoop', () => {
    expect(resoShape(0)).toBe(1);
    expect(resoShape(1)).toBeLessThan(0.01);
    for (let u = 0; u < 0.85; u += 0.1) expect(resoShape(u + 0.1)).toBeLessThan(resoShape(u));
  });
});

describe('headDip — a struck snare or tom head', () => {
  it('is driven in by the stick, as far as the stroke was hard, and still before and after', () => {
    expect(headDip('snare', -0.01, 1)).toBe(0);
    expect(headDip('snare', 0, 1)).toBeLessThan(-0.001);
    expect(headDip('snare', 0, 0.3)).toBeCloseTo(0.3 * headDip('snare', 0, 1), 9);
    expect(headDip('floor', 5, 1)).toBe(0);
  });

  it('gives more on the floor tom than the snare, and rings longer', () => {
    expect(headDip('floor', 0, 1)).toBeLessThan(headDip('snare', 0, 1));
    const envelope = (id: 'snare' | 'floor', t: number) =>
      Math.max(...Array.from({ length: 40 }, (_, i) => Math.abs(headDip(id, t + i / 2000, 1))));
    expect(envelope('floor', 0.25)).toBeGreaterThan(envelope('snare', 0.25) * 5);
  });

  it('rings slowly enough for a 60 fps frame to catch: frames a sixtieth apart change sign', () => {
    for (const id of ['snare', 'tom1', 'tom2', 'floor'] as const) {
      const at = Array.from({ length: 8 }, (_, f) => headDip(id, f / 60 + 0.001, 1));
      const flips = at.slice(1).filter((d, i) => Math.sign(d) !== Math.sign(at[i])).length;
      expect(flips).toBeGreaterThanOrEqual(3);
    }
  });

  it('dips the struck head in the kit, and only that one', () => {
    const { root, update } = buildKit(makeMaterials());
    const heads = (): Map<THREE.BufferGeometry, number> => {
      const out = new Map<THREE.BufferGeometry, number>();
      root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.name === 'head') {
          const z = o.geometry.getAttribute('position');
          let low = 0;
          for (let k = 0; k < z.count; k++) low = Math.min(low, z.getZ(k));
          out.set(o.geometry, low);
        }
      });
      return out;
    };
    const timeline = new StrokeTimeline();
    timeline.ingest(stepWithHit({ lane: 's', value: 1, at: 0 }));
    update(poseAt(timeline, 0.001, 1), new Set());
    // (a soft snare note, 0.17 of full velocity: a quarter of a millimetre)
    const dipped = [...heads().values()].filter((low) => low < -0.0001);
    expect(dipped).toHaveLength(1);
    update(poseAt(timeline, 3, 1), new Set());
    expect([...heads().values()].every((low) => low === 0)).toBe(true);
  });
});

describe('drumShake — a struck drum on its mount', () => {
  const tip = (id: 'snare' | 'tom1' | 'floor', t: number, v = 1) => drumShake(id, t, v).rx;
  const most = (id: 'snare' | 'tom1' | 'floor', from: number, v = 1) =>
    Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(tip(id, from + i / 1000, v))));

  it('is still before the stroke and once it has settled', () => {
    expect(drumShake('tom1', -0.01, 1)).toEqual({ y: 0, rx: 0, rz: 0 });
    const at = drumShake('tom1', 0, 1);
    expect(Math.hypot(at.y, at.rx, at.rz)).toBe(0);
    expect(drumShake('tom1', 5, 1)).toEqual({ y: 0, rx: 0, rz: 0 });
  });

  it('goes down and tips its near edge down first', () => {
    const s = drumShake('tom1', 0.02, 1);
    expect(s.y).toBeLessThan(-0.001);
    // (+x turns the drummer's side, +z, down)
    expect(s.rx).toBeGreaterThan(0.01);
  });

  it('moves as far as the stroke was hard', () => {
    expect(most('tom1', 0, 0.3)).toBeCloseTo(0.3 * most('tom1', 0, 1), 6);
  });

  it('wobbles the hung toms more and longer than the snare in its basket', () => {
    expect(most('tom1', 0)).toBeGreaterThan(most('snare', 0) * 2);
    expect(most('tom1', 0.4)).toBeGreaterThan(most('snare', 0.4) * 10);
  });

  it('lands each stroke a little differently, and the same stroke the same way every frame', () => {
    const at = (seed: number) => drumShake('tom1', 0.03, 0.8, seed);
    expect(at(17)).toEqual(at(17));
    const many = Array.from({ length: 40 }, (_, i) => at(i * 7919 + 1));
    // harder and softer, and tipped off to either side
    const tips = many.map((m) => Math.hypot(m.rx, m.rz));
    expect(Math.max(...tips)).toBeGreaterThan(Math.min(...tips) * 1.3);
    expect(many.some((m) => m.rz > 0.005)).toBe(true);
    expect(many.some((m) => m.rz < -0.005)).toBe(true);
    // never wildly: no more than a quarter past the plain stroke's
    const plain = Math.max(
      ...Array.from({ length: 200 }, (_, i) => Math.abs(drumShake('tom1', i / 1000, 0.8).rx))
    );
    for (const m of many) expect(Math.hypot(m.rx, m.rz)).toBeLessThan(plain * 1.5);
  });

  it('rocks the struck drum in the kit, and leaves the rest still', () => {
    const { root, update } = buildKit(makeMaterials());
    // every group with a drum head in it, and how it is turned
    const turns = () => {
      const out: number[] = [];
      root.traverse((o) => {
        if (o instanceof THREE.Group && o.getObjectByName('head')) out.push(o.rotation.x);
      });
      return out;
    };
    const still = turns();
    const timeline = new StrokeTimeline();
    timeline.ingest(stepWithHit({ lane: 's', value: 1, at: 0 }));
    update(poseAt(timeline, 0.03, 1), new Set());
    const moved = turns().filter((x, i) => Math.abs(x - still[i]) > 1e-4);
    expect(moved).toHaveLength(1);
    update(poseAt(timeline, 3, 1), new Set());
    expect(turns()).toEqual(still);
  });
});

describe('buildKit().dress', () => {
  /** The octobans' rank, by name: four tall narrow drums on a rack. */
  const rankOf = (root: THREE.Object3D) => root.getObjectByName('octobans')!;

  it("puts up Stewart Copeland's octobans for a kit that has them, and takes them down again", () => {
    const { root, dress } = buildKit(makeMaterials());
    const rank = rankOf(root);
    // a kit is built for a player without them
    expect(rank.visible).toBe(false);
    dress({ ...PERSONAS[0].kit, octobans: true });
    expect(rank.visible).toBe(true);
    dress(PERSONAS[0].kit);
    expect(rank.visible).toBe(false);
  });

  it('builds a rank of four, narrow and each longer than the last, over and behind the toms', () => {
    const { root } = buildKit(makeMaterials());
    const rank = rankOf(root);
    // each drum on its own frame (a group holding the drum's group); the rack's stand is rods
    const frames = rank.children.filter((f) => f.children[0] instanceof THREE.Group);
    const shells = frames.map(
      (f) => f.children[0].children[0] as THREE.Mesh<THREE.CylinderGeometry>
    );
    expect(shells).toHaveLength(4);
    const lengths = shells.map((s) => s.geometry.parameters.height);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(new Set(lengths).size).toBe(4);
    for (const s of shells) expect(s.geometry.parameters.radiusTop).toBeLessThan(0.1);
    // further from the player than the toms they sit over
    for (const f of frames) expect(f.position.z).toBeLessThan(PIECES.tom2.centre[2]);
  });
});
