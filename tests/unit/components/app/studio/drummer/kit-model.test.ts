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

import { buildKit } from '@/components/app/studio/drummer/kit-model';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { PIECES, type V3 } from '@/lib/app/breaks/drummer/kit-layout';
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

  it('idles with the cymbals still and the hat closed', () => {
    const { root, update } = buildKit(makeMaterials());
    const crash = onlyGroupChildAt(root, PIECES.crash.centre);
    update(idlePose(), new Set());
    expect(crash.rotation.x).toBe(0);
    expect(crash.rotation.z).toBe(0);
  });
});

describe('buildKit().update — percussion visibility', () => {
  it('keeps perc1/perc2 pieces hidden until the pattern calls for them, then shows each independently', () => {
    const { root, update } = buildKit(makeMaterials());
    const pose = idlePose();

    const snapshot = () => {
      const vis: boolean[] = [];
      root.traverse((o) => vis.push(o.visible));
      return vis;
    };

    const defaultVisible = snapshot();
    expect(defaultVisible.every(Boolean)).toBe(true); // nothing hidden before any update()

    update(pose, new Set());
    const withNone = snapshot();
    // exactly the percussion pieces (cowbell+rod, block+rod = 4 objects) went invisible
    const hiddenIdx = withNone.reduce<number[]>((acc, v, i) => (v ? acc : [...acc, i]), []);
    expect(hiddenIdx.length).toBe(4);

    update(pose, new Set(['perc1']));
    const withPerc1 = snapshot();
    const stillHidden = hiddenIdx.filter((i) => !withPerc1[i]);
    // half of the originally-hidden set (perc1's cowbell + its support rod) came back
    expect(stillHidden.length).toBe(2);

    update(pose, new Set(['perc1', 'perc2']));
    const withBoth = snapshot();
    expect(hiddenIdx.every((i) => withBoth[i])).toBe(true);

    // and it's reversible: dropping both hides all four again
    update(pose, new Set());
    const backToNone = snapshot();
    expect(hiddenIdx.every((i) => !backToNone[i])).toBe(true);
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

    // two root-level groups sit exactly on the hat's centre: the top cymbal's
    // carrier (moved by `update()`) and the bottom cymbal's frame (fixed).
    // Rather than guess which is which by structure, tell them apart by the
    // one real difference between them: only one of them actually moves.
    const candidates: THREE.Group[] = [];
    root.traverse((o) => {
      if (
        o instanceof THREE.Group &&
        o.parent === root &&
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
