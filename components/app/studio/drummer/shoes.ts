import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { ball, forwardLoft, limb, type Materials } from '@/components/app/studio/drummer/parts';
import { BODY } from '@/lib/app/breaks/drummer/kit-layout';
import type { Footwear } from '@/lib/app/breaks/drummer/personas';

/**
 * What a drummer wears on their feet (experiment: the drummer view): trainers
 * or laced leather boots, each in two pieces that bend at the ball of the
 * foot as the heel comes up, the way a shoe creases there.
 *
 * Each piece is built in the frame `poseLeg` places it in: `z` forward along
 * the foot from its origin (the heel point, or the ball), `y` up out of the
 * sole, `x` across. Both feet wear the same shoe: nothing on it is handed.
 * The heel point stands `SOLE` (2.8 cm, `pose.ts`) above whatever the foot is
 * on, so the sole is built to reach down that far.
 */

/** A cross-section of an upper: `[forward, half-width, half-height, raised]`. */
type Section = [number, number, number, number];

/** How square an upper's cross-sections are: a {@link forwardLoft}'s squareness. */
const SQUARE = 2.2;

/**
 * Heel to ball, as cross-sections forward from the heel: a rounded heel
 * counter, the collar standing highest round the ankle, the laces sloping down
 * over the instep.
 */
const HEEL_UPPER: Section[] = [
  [-0.05, 0.012, 0.012, 0.035],
  [-0.044, 0.028, 0.031, 0.037],
  [-0.03, 0.037, 0.04, 0.041],
  [0.0, 0.041, 0.044, 0.042],
  [0.05, 0.044, 0.04, 0.038],
  [0.11, 0.047, 0.032, 0.031],
  [0.17, 0.048, 0.027, 0.026],
];
/** And ball to toe: the toe box lowering and narrowing to a rounded point. */
const TOE_UPPER: Section[] = [
  [-0.012, 0.048, 0.027, 0.026],
  [0.025, 0.047, 0.025, 0.024],
  [0.055, 0.042, 0.021, 0.021],
  [0.074, 0.033, 0.017, 0.018],
  [0.084, 0.022, 0.012, 0.016],
  [0.089, 0.01, 0.006, 0.015],
];

/** The outline of a sole, in the piece's frame: `x` across, forward along `z`. */
interface SoleOutline {
  /** Width at the back and the front end. */
  back: number;
  front: number;
  /** How round each end is: the radius of its corners. */
  backRound: number;
  frontRound: number;
}

const HEEL_SOLE: SoleOutline = { back: 0.074, front: 0.092, backRound: 0.03, frontRound: 0.004 };
const TOE_SOLE: SoleOutline = { back: 0.092, front: 0.07, backRound: 0.004, frontRound: 0.04 };

/** Where the bottom of the sole is, below the heel point: on whatever the foot stands on. */
const GROUND = -0.027;

/** An upper's width, half-height and raise `f` forward, between its cross-sections. */
function upperAt(upper: Section[], f: number): { w: number; h: number; r: number } {
  for (let i = 1; i < upper.length; i++) {
    const [f1, w1, h1, r1] = upper[i];
    const [f0, w0, h0, r0] = upper[i - 1];
    if (f <= f1) {
      const k = Math.max(0, (f - f0) / (f1 - f0));
      return { w: w0 + (w1 - w0) * k, h: h0 + (h1 - h0) * k, r: r0 + (r1 - r0) * k };
    }
  }
  const [, w, h, r] = upper[upper.length - 1];
  return { w, h, r };
}

/** The height of an upper's surface `f` forward and `x` across: over the top of its cross-section. */
function topAt(upper: Section[], f: number, x: number): number {
  const { w, h, r } = upperAt(upper, f);
  const k = Math.min(1, Math.abs(x) / w);
  return r + h * (1 - k ** SQUARE) ** (1 / SQUARE);
}

/** How far across an upper's surface reaches `f` forward at height `y`, on its side. */
function sideAt(upper: Section[], f: number, y: number): number {
  const { w, h, r } = upperAt(upper, f);
  const k = Math.min(1, Math.abs(y - r) / h);
  return w * (1 - k ** SQUARE) ** (1 / SQUARE);
}

/** An upper a little proud of `upper`, from `from` forward to `to`: an overlay stitched onto it. */
function overlay(
  upper: Section[],
  from: number,
  to: number,
  mat: THREE.Material,
  proud = 0.0016
): THREE.Mesh {
  const fs = [from, ...upper.map(([f]) => f).filter((f) => f > from && f < to), to];
  const sections = fs.map((f): Section => {
    const { w, h, r } = upperAt(upper, f);
    return [f, w + proud, h + proud, r];
  });
  return forwardLoft(sections, mat, SQUARE);
}

/**
 * A sole the shape of the shoe above it — narrow at the heel, widest at the
 * ball, round at the toe — `wider` than the outline all round and `depth`
 * deep from its top down.
 */
function soleGeometry(
  length: number,
  back: number,
  o: SoleOutline,
  depth: number,
  wider = 0
): THREE.ExtrudeGeometry {
  const [hb, hf] = [o.back / 2 + wider, o.front / 2 + wider];
  const [z0, z1] = [-back - wider, length + wider];
  const shape = new THREE.Shape();
  shape.moveTo(0, z0);
  shape.quadraticCurveTo(hb, z0, hb, z0 + o.backRound);
  shape.lineTo(hf, z1 - o.frontRound);
  shape.quadraticCurveTo(hf, z1, 0, z1);
  shape.quadraticCurveTo(-hf, z1, -hf, z1 - o.frontRound);
  shape.lineTo(-hb, z0 + o.backRound);
  shape.quadraticCurveTo(-hb, z0, 0, z0);
  const bevel = Math.min(0.003, depth / 3);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  });
  // the outline's y runs forward, and the sole hangs down from its top
  geo.rotateX(Math.PI / 2);
  geo.translate(0, -bevel, 0);
  return geo;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, name?: string): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  if (name) o.name = name;
  return o;
}

/** A capsule from `a` to `b`, `r` thick: a lace, a stitch. */
function strand(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(b, a);
  const o = mesh(new THREE.CapsuleGeometry(r, Math.max(1e-4, d.length()), 3, 6), mat, 'lace');
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
}

/** The eyelet rows, forward from the heel point: up the instep from the toe box to the collar. */
const EYELETS = [0.135, 0.11, 0.085, 0.06];
/** How far out from the middle the eyelets are, as a share of the upper's half-width. */
const EYELET_OUT = 0.5;

/**
 * Laces criss-crossing up the instep between two rows of eyelets, a bar
 * across the bottom pair, and a bow tied at the top with its ends hanging.
 */
function laced(upper: Section[], lace: THREE.Material, eyelet: THREE.Material): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const at = (f: number, side: number, lift = 0.0018) => {
    const x = side * EYELET_OUT * upperAt(upper, f).w;
    return new THREE.Vector3(x, topAt(upper, f, x) + lift, f);
  };
  for (const f of EYELETS) {
    for (const side of [-1, 1]) {
      const e = ball(0.0032, eyelet, 8);
      e.scale.set(1, 0.45, 1);
      e.position.copy(at(f, side, 0.0006));
      out.push(e);
    }
  }
  out.push(strand(at(EYELETS[0], -1), at(EYELETS[0], 1), 0.0024, lace));
  for (let i = 0; i < EYELETS.length - 1; i++) {
    for (const side of [-1, 1]) {
      // over the middle of the tongue, standing a little proud of it
      const a = at(EYELETS[i], side);
      const b = at(EYELETS[i + 1], -side);
      const mid = a.clone().lerp(b, 0.5);
      mid.y = Math.max(a.y, b.y) + 0.0035;
      out.push(strand(a, mid, 0.0024, lace), strand(mid, b, 0.0024, lace));
    }
  }
  // the bow: two loops lying back over the collar, two ends hanging down the sides
  const knot = at(EYELETS[EYELETS.length - 1], 0, 0.006);
  for (const side of [-1, 1]) {
    const loop = mesh(new THREE.TorusGeometry(0.012, 0.0022, 6, 16), lace, 'lace');
    loop.position.copy(knot).add(new THREE.Vector3(side * 0.011, 0.002, -0.004));
    loop.rotation.set(-1.1, side * 0.5, 0);
    loop.scale.set(1, 0.7, 1);
    out.push(loop);
    const end = knot.clone().add(new THREE.Vector3(side * 0.016, -0.008, 0.012));
    out.push(strand(knot, end, 0.0021, lace));
  }
  return out;
}

/**
 * A flash down each side of a trainer: a band sweeping up from near the ball
 * to under the collar, tapered at its front, lying on the upper.
 */
function flash(upper: Section[], mat: THREE.Material): THREE.Mesh {
  const pos: number[] = [];
  const index: number[] = [];
  const steps = 24;
  const half = 0.0075;
  for (const side of [-1, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const f = 0.125 - 0.15 * t;
      const { h, r } = upperAt(upper, f);
      const centre = r - 0.55 * h + 0.75 * h * t ** 1.3;
      const wide = half * Math.min(1, t * 2.5 + 0.15);
      for (const y of [centre - wide, centre + wide]) {
        const x = sideAt(upper, f, y) + 0.0012;
        pos.push(side * x, y, f);
      }
    }
    for (let i = 0; i < steps; i++) {
      const a = base + i * 2;
      // wound to face out of each side
      if (side > 0) index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return mesh(geo, mat, 'flash');
}

/** The padded collar round the opening the ankle comes out of, and the tab at the heel. */
function collar(mat: THREE.Material): THREE.Object3D[] {
  const ring = mesh(new THREE.TorusGeometry(1, 0.16, 10, 32), mat, 'collar');
  ring.rotation.x = Math.PI / 2 - 0.18;
  ring.scale.set(0.036, 0.046, 0.03);
  ring.position.set(0, 0.08, 0.004);
  const tab = mesh(new RoundedBoxGeometry(0.02, 0.026, 0.007, 2, 0.003), mat, 'heel tab');
  tab.position.set(0, 0.084, -0.043);
  tab.rotation.x = -0.25;
  return [ring, tab];
}

/** The tongue, rising out of the laces up the front of the ankle. */
function tongue(upper: Section[], mat: THREE.Material): THREE.Mesh {
  const from = new THREE.Vector3(0, topAt(upper, 0.105, 0) + 0.001, 0.105);
  const to = new THREE.Vector3(0, 0.103, 0.032);
  const d = new THREE.Vector3().subVectors(to, from);
  const o = mesh(new RoundedBoxGeometry(0.044, 0.007, d.length(), 2, 0.003), mat, 'tongue');
  o.position.copy(from).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
  return o;
}

/** Lightness, 0–1. */
const light = (c: THREE.Color) => c.getHSL({ h: 0, s: 0, l: 0 }).l;

/** Something that shows against `c`: light on a dark colour, dark on a light one. */
function against(c: THREE.Color): THREE.Color {
  return c.clone().lerp(new THREE.Color(light(c) > 0.6 ? '#3a3a3a' : '#f2f0ea'), 0.7);
}

/** A pair of footwear's pieces, built once and placed by `poseLeg`. */
export interface Shoe {
  /** Heel to ball, and the toe box: the shoe bends at the ball as the heel comes up. */
  shoe: THREE.Group;
  toes: THREE.Group;
  /** A boot's leg, up the shin from the ankle; a trainer has none. */
  shaft?: THREE.Mesh;
}

/** A robot's or a beast's foot: the shape of a shoe in its plate or fur, on a plain sole. */
function plain(m: Materials): Shoe {
  const heel = new THREE.Group();
  const toes = new THREE.Group();
  heel.add(forwardLoft(HEEL_UPPER, m.shoe, SQUARE));
  toes.add(forwardLoft(TOE_UPPER, m.shoe, SQUARE));
  heel.add(mesh(soleGeometry(BODY.foot, 0.045, HEEL_SOLE, 0.024), m.sole, 'sole'));
  toes.add(mesh(soleGeometry(0.08, 0.01, TOE_SOLE, 0.024), m.sole, 'sole'));
  for (const g of [heel, toes]) g.children[1].position.y = -0.003;
  return { shoe: heel, toes };
}

/** A boot's shaft, ankle up the shin: along `y`, `−0.5` at the ankle. */
const SHAFT: [number, number][] = [
  [0.045, -0.5],
  [0.047, 0],
  [0.048, 0.45],
  [0.05, 0.5],
];
/** How far a boot's shaft runs below the ankle, and up the shin, metres. */
export const SHAFT_BELOW = 0.03;
export const SHAFT_UP = 0.13;

/**
 * One foot's footwear, in `m`'s colours: trainers — a white midsole on a
 * rubber outsole, a toe cap and heel counter over the upper, a padded collar,
 * a tongue, laces criss-crossed up the eyelets and tied, and a flash down
 * each side in the player's loud colour (or one that shows) — or boots: the
 * same last in leather, on a welted dark sole, with a toe cap and a shaft up
 * the shin.
 */
export function buildShoe(m: Materials, footwear: Footwear | 'plain' = 'trainers'): Shoe {
  if (footwear === 'plain') return plain(m);
  const boot = footwear === 'boots';
  const shoe = m.shoe.color;
  const laceMat = new THREE.MeshStandardMaterial({
    color: boot ? shoe.clone().lerp(new THREE.Color('#120c08'), 0.6) : against(shoe),
    roughness: 0.8,
  });
  // the panels stitched over the upper: a shade off it
  const panel = m.shoe.clone();
  panel.color = shoe
    .clone()
    .lerp(new THREE.Color(light(shoe) > 0.5 || boot ? '#000000' : '#ffffff'), boot ? 0.3 : 0.07);
  const eyelet = boot
    ? m.gold
    : new THREE.MeshStandardMaterial({ color: '#2a2a2c', metalness: 0.6, roughness: 0.4 });
  // a trainer's midsole is white, a boot's sole and welt dark
  const midsole = new THREE.MeshStandardMaterial({
    color: boot ? '#2a1f18' : light(shoe) > 0.8 ? '#e6e2da' : '#f2f0ea',
    roughness: boot ? 0.75 : 0.6,
  });

  const heel = new THREE.Group();
  const toes = new THREE.Group();
  heel.add(forwardLoft(HEEL_UPPER, m.shoe, SQUARE), overlay(HEEL_UPPER, -0.06, 0.012, panel));
  toes.add(forwardLoft(TOE_UPPER, m.shoe, SQUARE), overlay(TOE_UPPER, 0.03, 0.095, panel));
  heel.add(...laced(HEEL_UPPER, laceMat, eyelet), tongue(HEEL_UPPER, m.shoe), ...collar(m.shoe));
  if (!boot) {
    // the loud colour if it shows on the shoe, or one that does
    const loud = Math.abs(light(m.accent.color) - light(shoe)) > 0.25;
    heel.add(flash(HEEL_UPPER, loud ? m.accent : laceMat));
  }

  const pieces: [THREE.Group, number, number, SoleOutline][] = [
    [heel, BODY.foot, 0.045, HEEL_SOLE],
    [toes, 0.08, 0.01, TOE_SOLE],
  ];
  for (const [g, length, back, outline] of pieces) {
    if (boot) {
      // a welt round the foot of the upper, then the sole
      const welt = mesh(soleGeometry(length, back, outline, 0.006, 0.004), midsole, 'welt');
      welt.position.y = 0.003;
      const sole = mesh(soleGeometry(length, back, outline, 0.024, 0.002), m.sole, 'sole');
      sole.position.y = -0.003;
      g.add(welt, sole);
    } else {
      const mid = mesh(soleGeometry(length, back, outline, 0.024, 0.003), midsole, 'midsole');
      mid.position.y = 0.002;
      const out = mesh(soleGeometry(length, back, outline, 0.006, 0.001), m.sole, 'sole');
      out.position.y = GROUND + 0.006;
      g.add(mid, out);
    }
  }
  if (!boot) return { shoe: heel, toes };
  const shaft = limb(SHAFT, m.shoe, 20);
  shaft.name = 'shaft';
  return { shoe: heel, toes, shaft };
}
