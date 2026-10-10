/**
 * `spineAt()` and `neckTurns()` — the torso's turn shared out down the spine,
 * and the head's down the neck.
 */

import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  HIP_MID,
  NECK_SHARE,
  SHARE,
  SPINE,
  neckTurns,
  spineAt,
} from '@/lib/app/breaks/drummer/anatomy/spine';
import { BODY } from '@/lib/app/breaks/drummer/kit-layout';

const ORIGIN = new Vector3(...BODY.pelvis);
const STILL = { lean: 0, yaw: 0, roll: 0, bob: 0 };

describe('SPINE', () => {
  it('has the twenty-four vertebrae, L5 at the bottom and C1 at the top', () => {
    expect(SPINE).toHaveLength(24);
    expect(SPINE.map((l) => l.name)).toEqual([
      'L5',
      'L4',
      'L3',
      'L2',
      'L1',
      'T12',
      'T11',
      'T10',
      'T9',
      'T8',
      'T7',
      'T6',
      'T5',
      'T4',
      'T3',
      'T2',
      'T1',
      'C7',
      'C6',
      'C5',
      'C4',
      'C3',
      'C2',
      'C1',
    ]);
  });

  it('rises level by level, with a gap for a disc between each body and the next', () => {
    for (let i = 1; i < SPINE.length; i++) {
      const gap = SPINE[i].y - SPINE[i].height / 2 - (SPINE[i - 1].y + SPINE[i - 1].height / 2);
      expect(gap, SPINE[i].name).toBeGreaterThan(0.002);
    }
  });

  it('puts T2 level with the shoulder joints', () => {
    const t2 = SPINE.find((l) => l.name === 'T2')!;
    expect(t2.y).toBeCloseTo(BODY.shoulder[1], 2);
  });
});

describe('SHARE and NECK_SHARE', () => {
  it('share every turn out whole', () => {
    for (const row of Object.values(SHARE)) {
      expect(row.pelvis + row.lumbar + row.thoracic).toBeCloseTo(1, 9);
    }
    for (const row of Object.values(NECK_SHARE)) {
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });

  it('gives the turn to the thoracic spine and the bend mostly below it, as the joints allow', () => {
    expect(SHARE.yaw.thoracic).toBeGreaterThan(SHARE.yaw.lumbar * 4);
    expect(SHARE.lean.lumbar).toBeGreaterThan(SHARE.lean.thoracic);
  });
});

describe('spineAt', () => {
  it('leaves a still torso at rest', () => {
    const s = spineAt(STILL);
    SPINE.forEach((l, i) => {
      expect(s.levels[i].position.distanceTo(new Vector3(0, l.y, l.z).add(ORIGIN))).toBeLessThan(
        1e-9
      );
    });
    expect(s.pelvis.position.distanceTo(HIP_MID)).toBeLessThan(1e-12);
  });

  it('lands T1 and the neck exactly where the pose’s rigid torso has them, however it leans and turns', () => {
    for (const pose of [
      { lean: 0.3, yaw: 0.25, roll: -0.05, bob: -0.02 },
      { lean: 0.05, yaw: -0.3, roll: 0.05, bob: 0.03 },
    ]) {
      const s = spineAt(pose);
      const torso = new Quaternion().setFromEuler(
        new Euler(-pose.lean, pose.yaw, pose.roll, 'YXZ')
      );
      const at = ORIGIN.clone().add(new Vector3(0, pose.bob, 0));
      SPINE.forEach((l, i) => {
        if (l.region === 'lumbar' || (l.region === 'thoracic' && l.name !== 'T1')) return;
        const rigid = new Vector3(0, l.y, l.z).applyQuaternion(torso).add(at);
        expect(s.levels[i].position.distanceTo(rigid), l.name).toBeLessThan(1e-9);
      });
    }
  });

  it('turns each vertebra by more than the one below it, never past the torso', () => {
    const s = spineAt({ lean: 0.3, yaw: 0.3, roll: 0, bob: 0 });
    const angle = (q: Quaternion) => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
    let was = angle(s.pelvis.quaternion);
    const top = angle(s.torso.quaternion);
    for (const f of s.levels) {
      const now = angle(f.quaternion);
      expect(now).toBeGreaterThanOrEqual(was - 1e-9);
      expect(now).toBeLessThanOrEqual(top + 1e-9);
      was = now;
    }
  });

  it('rolls the pelvis forward about the line through the hip joints, never turning or tilting it', () => {
    const s = spineAt({ lean: 0.3, yaw: 0, roll: 0, bob: 0 });
    expect(s.pelvis.position.distanceTo(HIP_MID)).toBeLessThan(1e-12);
    const tilt = 2 * Math.acos(Math.min(1, Math.abs(s.pelvis.quaternion.w)));
    expect(tilt).toBeCloseTo(0.3 * SHARE.lean.pelvis, 6);
    // turned and tilted as well, the pelvis still only rolls: both sockets stay where the femurs are
    const turned = spineAt({ lean: 0.3, yaw: 0.3, roll: 0.05, bob: 0 });
    for (const x of [BODY.hip[0], -BODY.hip[0]]) {
      const socket = new Vector3(x, 0, 0).applyQuaternion(turned.pelvis.quaternion).add(HIP_MID);
      expect(socket.distanceTo(new Vector3(x, BODY.hip[1], BODY.hip[2]))).toBeLessThan(1e-12);
    }
  });
});

describe('neckTurns', () => {
  it('ends with the skull turned the whole of the head’s turn, each joint adding its share', () => {
    const head = new Euler(0.2, -0.4, 0.1, 'YXZ');
    const turns = neckTurns(head);
    expect(turns).toHaveLength(NECK_SHARE.pitch.length);
    const whole = new Quaternion().setFromEuler(head);
    expect(Math.abs(turns[turns.length - 1].dot(whole))).toBeCloseTo(1, 9);
    // half the turning is at the atlas on the axis
    const yawOf = (q: Quaternion) => new Euler().setFromQuaternion(q, 'YXZ').y;
    expect(yawOf(turns[6]) - yawOf(turns[5])).toBeCloseTo(-0.4 * NECK_SHARE.yaw[6], 2);
  });
});
