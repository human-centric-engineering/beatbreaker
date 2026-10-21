import * as THREE from 'three';

import { STICK } from '@/lib/app/breaks/drummer/kit-layout';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * A wire brush, for a kit played with brushes (experiment: the drummer
 * view): a jazz brush as most players carry one — a rubber-gripped handle, a
 * chrome collar it is crimped into, a fan of fine steel wires opening out
 * from it, and the loop of the retracting rod at the butt.
 *
 * Built as the stick is, butt (`y` −0.5) to tip (+0.5) of a unit length that
 * `place` stretches to the stick's, so the hand holds it and the pose aims it
 * exactly as it does a stick: the wires' ends are where a stick's bead would
 * be. Across (`x`, `z`) it is in metres. The fan opens across `x` and is thin
 * through `z`: `turnFan` lies it flat toward the head.
 */

/** Where the grip ends and the collar starts, and where the wires come out of it, along the unit length. */
const GRIP_TO = 0.06;
const WIRES_FROM = 0.15;
/** How wide the fan is at its end, metres: a brush's, played out. */
export const FAN_WIDTH = 0.072;
/** How many wires: fewer than a real brush's hundred or so, each drawn a little thicker. */
export const WIRES = 72;

/** The grip and the collar, butt to the wires, as a lathe's profile. */
const HANDLE_PROFILE: [number, number][] = [
  [0, -0.5],
  [0.0068, -0.5],
  [0.0078, -0.47],
  [0.0082, -0.2],
  [0.0078, GRIP_TO - 0.01],
  [0.0064, GRIP_TO],
];
const COLLAR_PROFILE: [number, number][] = [
  [0.0062, GRIP_TO],
  [0.0062, GRIP_TO + 0.03],
  // the crimp: pinched round the wires
  [0.0055, GRIP_TO + 0.04],
  [0.0058, GRIP_TO + 0.05],
  [0.0048, WIRES_FROM],
  [0.0035, WIRES_FROM + 0.005],
];

const lathe = (profile: [number, number][]) =>
  new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    16
  );

/**
 * The wires: each a thin three-sided tube from inside the collar out to its
 * end, fanning across `x` as it goes and a little either side of the fan's
 * plane, each its own length, so the end is ragged as a played brush's is.
 */
function wiresGeometry(): THREE.BufferGeometry {
  const rng = makeRng(0xb2054);
  const SEGMENTS = 5;
  const SIDES = 3;
  const R = 0.00045;
  const positions: number[] = [];
  const index: number[] = [];
  const at = new THREE.Vector3();
  for (let w = 0; w < WIRES; w++) {
    // across the fan, evenly with a little jitter, more of them toward its middle
    const u = (w + 0.5) / WIRES;
    const across = Math.sign(u - 0.5) * Math.abs(2 * u - 1) ** 1.15 + (rng() - 0.5) * 0.02;
    const depth = (rng() - 0.5) * 0.006;
    const reach = 0.5 - 0.025 * rng();
    const base = positions.length / 3;
    for (let s = 0; s <= SEGMENTS; s++) {
      const t = s / SEGMENTS;
      const y = WIRES_FROM - 0.01 + (reach - WIRES_FROM + 0.01) * t;
      // close in the collar, opening out as it leaves it
      const open = t ** 1.25;
      at.set(across * (FAN_WIDTH / 2) * open + across * 0.0025, y, depth * open + depth * 0.15);
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2;
        positions.push(at.x + R * Math.cos(a), at.y, at.z + R * Math.sin(a));
      }
    }
    for (let s = 0; s < SEGMENTS; s++) {
      for (let k = 0; k < SIDES; k++) {
        const a = base + s * SIDES + k;
        const b = base + s * SIDES + ((k + 1) % SIDES);
        const c = a + SIDES;
        const d = b + SIDES;
        index.push(a, c, b, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * The fan's body: the wires seen from a playing distance are a grey haze
 * more than a hundred lines, which a few lines' width can never show. A thin
 * fan-shaped sheet between them, half there, carries it.
 */
function hazeGeometry(): THREE.BufferGeometry {
  const ROWS = 6;
  const positions: number[] = [];
  const index: number[] = [];
  for (let s = 0; s <= ROWS; s++) {
    const t = s / ROWS;
    const y = WIRES_FROM + (0.49 - WIRES_FROM) * t;
    const half = (FAN_WIDTH / 2) * 0.92 * t ** 1.25 + 0.002;
    positions.push(-half, y, 0, half, y, 0);
  }
  for (let s = 0; s < ROWS; s++) {
    const a = s * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/**
 * The retractor's loop at the butt, standing out past the end of the grip.
 * The brush is stretched along `y` to the stick's length, so the loop is
 * drawn squashed by as much, and comes out round.
 */
function loopGeometry(): THREE.BufferGeometry {
  const r = 0.012;
  const geo = new THREE.TorusGeometry(r, 0.0011, 6, 20);
  geo.rotateY(Math.PI / 2);
  geo.scale(1, 1 / STICK.length, 1);
  geo.translate(0, -0.5 - r / STICK.length + 0.004, 0);
  return geo;
}

/** A brush, its own materials with it, laid along `y` as `place` lays a stick. */
export function buildBrush(): THREE.Group {
  const rubber = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.82 });
  const chrome = new THREE.MeshStandardMaterial({
    color: '#d6d9de',
    metalness: 1,
    roughness: 0.24,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: '#c3c7cc',
    metalness: 0.9,
    roughness: 0.38,
  });
  const haze = new THREE.MeshStandardMaterial({
    color: '#aeb3b9',
    metalness: 0.6,
    roughness: 0.5,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string, shadow = true) => {
    const o = new THREE.Mesh(geo, mat);
    o.name = name;
    o.castShadow = shadow;
    return o;
  };
  const brush = new THREE.Group();
  brush.name = 'brush';
  brush.add(
    part(lathe(HANDLE_PROFILE), rubber, 'brush grip'),
    part(lathe(COLLAR_PROFILE), chrome, 'brush collar'),
    part(wiresGeometry(), steel, 'brush wires'),
    part(hazeGeometry(), haze, 'brush fan', false),
    part(loopGeometry(), chrome, 'brush loop')
  );
  brush.visible = false;
  return brush;
}

const UP = new THREE.Vector3(0, 1, 0);
const _face = new THREE.Vector3();
const _want = new THREE.Vector3();
const _cross = new THREE.Vector3();
const _turn = new THREE.Quaternion();

/**
 * Turn a placed brush about its own length so the fan lies flat toward the
 * head, its face (`z`) as near up as the brush's slope lets it: a brush is
 * played on the flat of its wires, never their edge. `along` is the brush's
 * direction, butt to tip, unit length, in the frame it was placed in.
 */
export function turnFan(brush: THREE.Object3D, along: THREE.Vector3): void {
  _want.copy(UP).addScaledVector(along, -UP.dot(along));
  // pointing straight up or down, any way round is as flat as another
  if (_want.lengthSq() < 1e-8) return;
  _want.normalize();
  _face.set(0, 0, 1).applyQuaternion(brush.quaternion);
  const angle = Math.atan2(_cross.crossVectors(_face, _want).dot(along), _face.dot(_want));
  brush.quaternion.premultiply(_turn.setFromAxisAngle(along, angle));
}
