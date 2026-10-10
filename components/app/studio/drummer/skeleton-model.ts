import * as THREE from 'three';

import {
  CARPALS,
  HAMATE_HOOK,
  METATARSALS,
  TARSALS,
  TOES,
  blob,
  cavities,
  clavicle,
  cranium,
  femur,
  fibula,
  handBone,
  hipBone,
  humerus,
  mandible,
  mirrored,
  patella,
  radius,
  rib,
  sacrum,
  scapula,
  sternum,
  teeth,
  tibia,
  ulna,
  vertebra,
} from '@/components/app/studio/drummer/bones';
import {
  BEAD_RADIUS,
  type DrummerModel,
  headTurn,
  stickGeometry,
} from '@/components/app/studio/drummer/drummer-model';
import { bendFingers, placeStick } from '@/components/app/studio/drummer/hand-pose';
import { ball, place, segment } from '@/components/app/studio/drummer/parts';
import { armAngles } from '@/lib/app/breaks/drummer/anatomy/arm';
import { ROM, scapularRotation } from '@/lib/app/breaks/drummer/anatomy/rom';
import {
  DIGITS,
  KNUCKLE_Y,
  KNUCKLE_Z,
  PULP,
  SPLAY,
  THUMB_BASE,
  handSetOf,
  thumbTurn,
} from '@/lib/app/breaks/drummer/anatomy/hand';
import {
  HIP_MID,
  SACRUM_TOP,
  SKULL_REST,
  SPINE,
  neckTurns,
  spineAt,
} from '@/lib/app/breaks/drummer/anatomy/spine';
import { BODY, type Foot, type Hand } from '@/lib/app/breaks/drummer/kit-layout';
import type { Persona } from '@/lib/app/breaks/drummer/personas';
import type { ArmPose, LegPose, Pose } from '@/lib/app/breaks/drummer/pose';

/**
 * The skeleton drummer (experiment: the drummer view): every bone a seated
 * drummer plays with, posed from the same `Pose` as the dressed drummers.
 *
 * The joints are where the pose puts them — the shoulders, elbows, wrists,
 * hips, knees and ankles the stroke planner solved — and the skeleton is
 * the bones between: the humerus from the shoulder to the elbow, the ulna
 * hinged there, and the radius rolling over it as the forearm pronates; the
 * eight carpals, five metacarpals and fourteen phalanges of each hand, bent
 * by the same grip tables as everyone's (`anatomy/hand.ts`); the clavicle
 * and scapula following the arm; a spine of twenty-four vertebrae sharing the
 * torso's lean and turn out between them (`anatomy/spine.ts`), twelve pairs
 * of ribs on them, a sternum and the cartilage joining them; the pelvis
 * rocking on the seat; femur, patella, tibia and fibula; and the twenty-six
 * bones of each foot. The skull nods on the atlas and its jaw drops to count.
 *
 * Every bone is rigid and its own real size, placed whole each frame.
 */

/** The cartilage, a little bluer and glossier than the bone. */
const CARTILAGE = '#cdd6d0';
/** The dark inside the skull's openings. */
const HOLLOW = '#100b09';
const TEETH = '#efe7d3';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, name?: string): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  if (name) o.name = name;
  return o;
}

/** A frame from its `x` and (near-) `y` axes: `y` made square to `x`, `z = x × y`. */
function basis(x: THREE.Vector3, y: THREE.Vector3): THREE.Quaternion {
  const xx = x.clone().normalize();
  const yy = y.clone().addScaledVector(xx, -y.dot(xx)).normalize();
  const zz = new THREE.Vector3().crossVectors(xx, yy);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
}

/** A frame from its `y` axis and (near-) `x`: `x` made square to `y`, `z = x × y`. */
function along(y: THREE.Vector3, x: THREE.Vector3): THREE.Quaternion {
  const yy = y.clone().normalize();
  const xx = x.clone().addScaledVector(yy, -x.dot(yy)).normalize();
  const zz = new THREE.Vector3().crossVectors(xx, yy);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
}

/** A right-side shape for `side` (1 right, -1 left): the left is its mirror. */
function sided(geo: THREE.BufferGeometry, side: 1 | -1): THREE.BufferGeometry {
  return side === 1 ? geo : mirrored(geo);
}

/* ---- the hand -------------------------------------------------------- */

interface HandRig {
  group: THREE.Group;
  /** Each finger's joints, knuckle out. */
  fingers: THREE.Group[][];
  thumb: THREE.Group;
  /** The thumb's three joints, base out: the CMC's flexion, the MCP and the IP. */
  thumbJoints: [THREE.Group, THREE.Group, THREE.Group];
  side: 1 | -1;
}

/** The thumb's bones, base out: metacarpal, proximal and distal phalanx (Buryanov & Kotiuk 2010, ×1.05). */
const THUMB_BONES = [0.0485, 0.0331, 0.0228] as const;
/**
 * The dressed thumb the grip tables were fitted to: one bone from the base,
 * then the end bone, bent at the joint between (`drummer-model.ts`). A real
 * thumb — this one — is a metacarpal and two phalanges, three centimetres
 * longer all told.
 */
const DRESSED_THUMB = [0.042, 0.032] as const;
/** The IP's bend against the MCP's as the thumb flexes: a little more (Hume et al. 1990's postures). */
const IP_OF_MCP = 1.15;

/** Where the thumb's three bones put its tip, in its base's `y`–`z` plane, for CMC, MCP and IP bends. */
function thumbEnd(cmc: number, mcp: number, ip: number): [number, number] {
  let y = 0;
  let z = 0;
  let a = cmc;
  [THUMB_BONES[0], THUMB_BONES[1], THUMB_BONES[2]].forEach((len, k) => {
    y -= len * Math.sin(a);
    z += len * Math.cos(a);
    a += k === 0 ? mcp : ip;
  });
  return [y, z];
}

/**
 * The real thumb's bends that put its tip where the dressed thumb's is, for
 * an end-joint bend of `tip`: flexed at the CMC and the MCP, the IP a little
 * more than the MCP, each inside its range (`ROM.thumbMcp`, `ROM.thumbIp`) —
 * the nearest it can get where the dressed thumb asks more than a thumb has.
 * Found by a few Gauss–Newton steps from a half-bent thumb.
 */
export function fitThumb(tip: number): { cmc: number; mcp: number; ip: number } {
  const want: [number, number] = [
    -DRESSED_THUMB[1] * Math.sin(tip),
    DRESSED_THUMB[0] + DRESSED_THUMB[1] * Math.cos(tip),
  ];
  const ipOf = (m: number) => Math.min(ROM.thumbIp.hard.max, IP_OF_MCP * m);
  const clampM = (m: number) => Math.max(0, Math.min(ROM.thumbMcp.hard.max, m));
  let c = 0;
  let m = 0.5;
  for (let step = 0; step < 8; step++) {
    const [y, z] = thumbEnd(c, m, ipOf(m));
    const ry = want[0] - y;
    const rz = want[1] - z;
    const h = 1e-4;
    const [yc, zc] = thumbEnd(c + h, m, ipOf(m));
    const [ym, zm] = thumbEnd(c, m + h, ipOf(m + h));
    const j = [(yc - y) / h, (ym - y) / h, (zc - z) / h, (zm - z) / h];
    const det = j[0] * j[3] - j[1] * j[2];
    if (Math.abs(det) < 1e-12) break;
    c += (j[3] * ry - j[1] * rz) / det;
    m = clampM(m + (-j[2] * ry + j[0] * rz) / det);
    c = Math.max(ROM.thumbCmc.hard.min, Math.min(ROM.thumbCmc.hard.max, c));
  }
  return { cmc: c, mcp: m, ip: ipOf(m) };
}

/** Where each metacarpal's base sits on the distal carpals (lead side), metres. */
const MC_BASE: [number, number, number][] = [
  [0.012, -0.001, 0.026],
  [0.0, -0.002, 0.026],
  [-0.01, -0.003, 0.024],
  [-0.018, -0.004, 0.023],
];

function buildHand(thumb: 1 | -1, bone: THREE.Material): HandRig {
  const group = new THREE.Group();
  group.name = 'hand';
  const flip = (p: [number, number, number]) => new THREE.Vector3(p[0] * thumb, p[1], p[2]);
  for (const c of CARPALS) {
    const b = mesh(blob(...c.size, [0, 0, 0], 10), bone, c.name);
    b.position.copy(flip(c.at));
    group.add(b);
  }
  const hook = mesh(blob(0.0025, 0.004, 0.003, [0, 0, 0], 8), bone, 'hamate hook');
  hook.position.copy(flip(HAMATE_HOOK));
  group.add(hook);

  const fingers = DIGITS.map((d, n) => {
    // the metacarpal, from its carpal to the knuckle
    const base = flip(MC_BASE[n]);
    const head = new THREE.Vector3(d.x * thumb, KNUCKLE_Y, KNUCKLE_Z);
    const mc = mesh(handBone(base.distanceTo(head), 0.0075), bone, 'metacarpal');
    mc.position.copy(base);
    mc.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      head.clone().sub(base).normalize()
    );
    group.add(mc);
    const joints: THREE.Group[] = [];
    let parent: THREE.Object3D = group;
    d.lengths.forEach((len, k) => {
      const joint = new THREE.Group();
      if (k === 0) {
        joint.position.copy(head);
        joint.rotation.y = -d.x * thumb * SPLAY;
      } else {
        joint.position.z = d.lengths[k - 1];
      }
      // the last bone stops short of the fingertip's pad
      const boneLength = k === 2 ? len - PULP : len;
      joint.add(mesh(handBone(boneLength, 0.0068 - 0.0012 * k, k === 2), bone, 'phalanx'));
      parent.add(joint);
      joints.push(joint);
      parent = joint;
    });
    return joints;
  });

  // the thumb: its metacarpal from the trapezium, then two phalanges
  const thumbBase = new THREE.Group();
  thumbBase.position.set(thumb * THUMB_BASE[0], THUMB_BASE[1], THUMB_BASE[2]);
  thumbBase.rotation.set(...thumbTurn(thumb, 'matched'), 'YXZ');
  // the trapeziometacarpal joint's flexion, under the turn the grip tables give the base
  const cmc = new THREE.Group();
  cmc.add(mesh(handBone(THUMB_BONES[0], 0.0085), bone, 'metacarpal'));
  const mcp = new THREE.Group();
  mcp.position.z = THUMB_BONES[0];
  mcp.add(mesh(handBone(THUMB_BONES[1], 0.0078), bone, 'phalanx'));
  const ip = new THREE.Group();
  ip.position.z = THUMB_BONES[1];
  ip.add(mesh(handBone(THUMB_BONES[2], 0.007, true), bone, 'phalanx'));
  mcp.add(ip);
  cmc.add(mcp);
  thumbBase.add(cmc);
  group.add(thumbBase);
  return { group, fingers, thumb: thumbBase, thumbJoints: [cmc, mcp, ip], side: thumb };
}

/* ---- the arm --------------------------------------------------------- */

interface ArmRig {
  clavicle: THREE.Mesh;
  scapula: THREE.Mesh;
  humerus: THREE.Mesh;
  ulna: THREE.Mesh;
  radius: THREE.Mesh;
  hand: HandRig;
  stick: THREE.Mesh;
  bead: THREE.Mesh;
}

const CLAVICLE = 0.15;
/** Where the radius's head turns on the capitellum, in the elbow's frame (right side). */
const RADIAL_HEAD = new THREE.Vector3(0.013, 0.002, 0.003);
/** How far the radius's wrist end is from the wrist's centre, toward the thumb, metres. */
const RADIUS_OUT = 0.016;
/** And how far it crosses in front of the ulna as the forearm pronates. */
const RADIUS_CROSS = 0.01;
/** The radius's length, head to the wrist end, as built. */
const RADIUS_LENGTH = 0.25;

function buildArm(hand: Hand, bone: THREE.Material, wood: THREE.Material): ArmRig {
  const side = hand === 'lead' ? 1 : -1;
  const stick = new THREE.Mesh(stickGeometry(), wood);
  stick.castShadow = true;
  return {
    clavicle: mesh(sided(clavicle(CLAVICLE), side), bone, 'clavicle'),
    scapula: mesh(sided(scapula(), side), bone, 'scapula'),
    humerus: mesh(sided(humerus(BODY.upperArm), side), bone, 'humerus'),
    ulna: mesh(sided(ulna(BODY.forearm), side), bone, 'ulna'),
    radius: mesh(sided(radius(RADIUS_LENGTH), side), bone, 'radius'),
    hand: buildHand(side, bone),
    stick,
    bead: ball(BEAD_RADIUS, wood, 12),
  };
}

/**
 * The scapula's resting set on the ribs — turned up about 5° and tipped
 * forward about 10° (the research's resting values) — and how it follows the
 * arm: turned upward by the scapulohumeral rhythm ({@link scapularRotation}),
 * and drawn round the chest as the arm reaches forward across it.
 */
const SCAPULA = {
  upward: 5 * (Math.PI / 180),
  tilt: -10 * (Math.PI / 180),
  protract: 0.05,
  reach: 0.07,
} as const;

function poseArm(
  rig: ArmRig,
  a: ArmPose,
  hand: Hand,
  torso: THREE.Quaternion,
  sc: THREE.Vector3
): void {
  const side = hand === 'lead' ? 1 : -1;
  const up = Y.clone().applyQuaternion(torso);
  const across = X.clone().applyQuaternion(torso);
  const angles = armAngles(a, torso, hand);

  // the clavicle, from the sternum out to the acromion over the shoulder joint
  const ac = a.shoulder
    .clone()
    .add(new THREE.Vector3(side * 0.012, 0.03, 0.008).applyQuaternion(torso));
  const span = ac.clone().sub(sc);
  rig.clavicle.position.copy(sc);
  rig.clavicle.quaternion.copy(basis(span.clone().multiplyScalar(side), up));
  rig.clavicle.scale.set(span.length() / CLAVICLE, 1, 1);

  // the scapula: its glenoid against the head of the humerus, the blade back on the ribs
  const reach = Math.sin(Math.max(0, angles.plane)) * Math.sin(angles.elevation);
  const turn = new THREE.Euler(
    SCAPULA.tilt,
    side * (SCAPULA.protract + SCAPULA.reach * reach),
    side * (SCAPULA.upward + scapularRotation(angles.elevation)),
    'YXZ'
  );
  rig.scapula.position.copy(a.shoulder).addScaledVector(across, -side * 0.027);
  rig.scapula.quaternion.copy(torso).multiply(new THREE.Quaternion().setFromEuler(turn));

  // the humerus and the ulna hinge in the plane of the arm
  const h = a.elbow.clone().sub(a.shoulder).normalize();
  const f = a.wrist.clone().sub(a.elbow).normalize();
  const hinge = new THREE.Vector3().crossVectors(h, f);
  // (straight, the hinge is across the body: the same way for both arms, as the bent case gives)
  if (hinge.lengthSq() < 1e-8) hinge.copy(across);
  hinge.normalize();
  rig.humerus.position.copy(a.shoulder);
  rig.humerus.quaternion.copy(along(h, hinge));
  const elbowFrame = along(f, hinge);
  rig.ulna.position.copy(a.elbow);
  rig.ulna.quaternion.copy(elbowFrame);

  // the radius: its head on the capitellum, its wrist end on the thumb's side —
  // round the ulna's in front as the forearm pronates
  const p = Math.max(-1.75, Math.min(1.75, angles.pronation));
  const local = (v: THREE.Vector3) =>
    new THREE.Vector3(side * v.x, v.y, v.z).applyQuaternion(elbowFrame).add(a.elbow);
  const fore = a.wrist.distanceTo(a.elbow);
  const head = local(RADIAL_HEAD);
  const thumbward = new THREE.Vector3(-Math.sin(p), 0, Math.cos(p));
  const end = local(
    new THREE.Vector3(
      RADIUS_OUT * thumbward.x,
      fore - 0.004,
      RADIUS_OUT * thumbward.z + RADIUS_CROSS * Math.max(0, Math.sin(p))
    )
  );
  const shaft = end.clone().sub(head);
  const out = new THREE.Vector3(side * thumbward.x, 0, thumbward.z).applyQuaternion(elbowFrame);
  rig.radius.position.copy(head);
  rig.radius.quaternion.copy(along(shaft, out.multiplyScalar(side)));
  rig.radius.scale.set(1, shaft.length() / RADIUS_LENGTH, 1);

  // the hand, and its fingers bent as everyone's are for this grip
  rig.hand.group.position.copy(a.wrist);
  rig.hand.group.quaternion.copy(a.hand);
  const set = handSetOf(a, rig.hand.side);
  bendFingers(rig.hand.fingers, set);
  rig.hand.thumb.rotation.set(...set.thumb, 'YXZ');
  // holding a stick, the thumb's tip goes where the grip was fitted; made into a shape, the
  // shape's own angles
  const fit = fitThumb(set.thumbTip);
  const k = set.shaped;
  rig.hand.thumbJoints[0].rotation.x = fit.cmc * (1 - k);
  rig.hand.thumbJoints[1].rotation.x = fit.mcp + (set.thumbMcp - fit.mcp) * k;
  rig.hand.thumbJoints[2].rotation.x = fit.ip + (set.thumbTip - fit.ip) * k;
  placeStick(rig.stick, rig.bead, a);
}

/* ---- the leg --------------------------------------------------------- */

interface LegRig {
  femur: THREE.Mesh;
  patella: THREE.Mesh;
  tibia: THREE.Mesh;
  fibula: THREE.Mesh;
  foot: THREE.Group;
  /** Each toe's first joint, at the ball. */
  toes: THREE.Group[];
}

function buildFoot(side: 1 | -1, bone: THREE.Material): { foot: THREE.Group; toes: THREE.Group[] } {
  // the shapes are drawn for a foot whose `x` is out to the side; the foot's frame has `x` across
  // to the left (y × z), so the right foot is the mirror
  const m = (x: number) => -side * x;
  const foot = new THREE.Group();
  foot.name = 'foot';
  for (const t of TARSALS) {
    const b = mesh(blob(...t.size, [0, 0, 0], 10), bone, 'tarsal');
    b.position.set(m(t.at[0]), t.at[1], t.at[2]);
    foot.add(b);
  }
  const toes = METATARSALS.map((mt, n) => {
    const base = new THREE.Vector3(m(mt.base[0]), mt.base[1], mt.base[2]);
    const head = new THREE.Vector3(m(mt.head[0]), mt.head[1], mt.head[2]);
    const b = mesh(handBone(base.distanceTo(head), mt.w), bone, 'metatarsal');
    b.position.copy(base);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), head.clone().sub(base).normalize());
    foot.add(b);
    const first = new THREE.Group();
    first.position.copy(head);
    let parent: THREE.Object3D = first;
    TOES[n].forEach((len, k) => {
      const j = k === 0 ? first : new THREE.Group();
      if (k > 0) {
        j.position.z = TOES[n][k - 1];
        j.rotation.x = 0.25;
        parent.add(j);
      }
      j.add(
        mesh(handBone(len, mt.w * 0.85 - 0.0008 * k, k === TOES[n].length - 1), bone, 'phalanx')
      );
      parent = j;
    });
    foot.add(first);
    return first;
  });
  return { foot, toes };
}

function buildLeg(foot: Foot, bone: THREE.Material): LegRig {
  const side = foot === 'kickFoot' ? 1 : -1;
  const { foot: f, toes } = buildFoot(side, bone);
  return {
    femur: mesh(sided(femur(BODY.thigh), side), bone, 'femur'),
    patella: mesh(patella(), bone, 'patella'),
    tibia: mesh(sided(tibia(BODY.shin), side), bone, 'tibia'),
    fibula: mesh(sided(fibula(BODY.shin), side), bone, 'fibula'),
    foot: f,
    toes,
  };
}

/** The talus's centre in the foot's frame, and how far its dome is below the ankle's centre. */
const TALUS = TARSALS[0].at;
const TALUS_DOME = 0.008;

function poseLeg(rig: LegRig, l: LegPose): void {
  const t = l.knee.clone().sub(l.hip).normalize();
  const s = l.ankle.clone().sub(l.knee).normalize();
  // the knee's hinge, out to the side for a right leg (the shapes are mirrored for the left)
  const hinge = new THREE.Vector3().crossVectors(t, s).negate();
  if (hinge.lengthSq() < 1e-8) hinge.copy(X);
  hinge.normalize();
  rig.femur.position.copy(l.hip);
  rig.femur.quaternion.copy(along(t, hinge));
  const shin = along(s, hinge);
  rig.tibia.position.copy(l.knee);
  rig.tibia.quaternion.copy(shin);
  rig.fibula.position.copy(l.knee);
  rig.fibula.quaternion.copy(shin);
  // the patella rides in front of the knee, in the groove between the condyles
  const front = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(rig.femur.quaternion)
    .add(new THREE.Vector3(0, 0, 1).applyQuaternion(shin))
    .normalize();
  rig.patella.position.copy(l.knee).addScaledVector(front, 0.042).addScaledVector(t, -0.01);
  rig.patella.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(
      hinge,
      t.clone().add(s).normalize(),
      new THREE.Vector3().crossVectors(hinge, t.clone().add(s).normalize())
    )
  );

  // the foot on the line the pose has from heel to ball, hung from the ankle: the talus under
  // the end of the tibia (bare, it sits a little higher over the board than a shod foot would)
  const length = l.ball.clone().sub(l.heel).normalize();
  const up = l.ankle.clone().sub(l.heel);
  up.addScaledVector(length, -up.dot(length)).normalize();
  const xx = new THREE.Vector3().crossVectors(up, length);
  rig.foot.position
    .copy(l.ankle)
    .addScaledVector(up, -TALUS[1] - TALUS_DOME)
    .addScaledVector(length, -TALUS[2]);
  rig.foot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, up, length));
  // the toes bend up at the ball as the heel lifts, flat along where the pose has them
  const toe = l.toe.clone().sub(l.ball).normalize();
  const bend = Math.atan2(toe.dot(up), toe.dot(length));
  for (const tg of rig.toes) tg.rotation.x = -bend;
}

/* ---- the trunk and head ---------------------------------------------- */

/** Per rib, 1–12: half-width of the chest at it, how far forward it reaches, its fall front to back, how far round it goes. */
const RIBS: [number, number, number, number][] = [
  [0.05, 0.085, 0.045, 0.86 * Math.PI],
  [0.075, 0.115, 0.06, 0.88 * Math.PI],
  [0.093, 0.13, 0.072, 0.88 * Math.PI],
  [0.106, 0.142, 0.082, 0.88 * Math.PI],
  [0.116, 0.15, 0.09, 0.87 * Math.PI],
  [0.123, 0.155, 0.098, 0.86 * Math.PI],
  [0.127, 0.158, 0.104, 0.84 * Math.PI],
  [0.128, 0.158, 0.106, 0.78 * Math.PI],
  [0.126, 0.152, 0.104, 0.72 * Math.PI],
  [0.122, 0.144, 0.1, 0.66 * Math.PI],
  [0.114, 0.12, 0.07, 0.52 * Math.PI],
  [0.098, 0.1, 0.05, 0.38 * Math.PI],
];

/** The sternum at rest, in the torso's frame: its top (the jugular notch), its length and its slope. */
const STERNUM = { at: new THREE.Vector3(0, 0.572, -0.074), length: 0.185, slope: 0.32 };
/** Where each true rib's cartilage meets the sternum, down from the notch (ribs 1–7); 8–10 join the 7th's. */
const STERNAL: number[] = [0.022, 0.045, 0.07, 0.093, 0.115, 0.135, 0.152, 0.16, 0.166, 0.17];

/**
 * Build the skeleton drummer: the bone takes its colour from `who.skin`, the
 * sticks are `wood`.
 */
export function buildSkeleton(wood: THREE.Material, who: Persona): DrummerModel {
  const root = new THREE.Group();
  root.name = 'drummer';
  const bone = new THREE.MeshStandardMaterial({ color: who.skin, roughness: 0.62, metalness: 0 });
  const cartilage = new THREE.MeshStandardMaterial({ color: CARTILAGE, roughness: 0.32 });
  const hollow = new THREE.MeshStandardMaterial({ color: HOLLOW, roughness: 0.9 });
  const enamel = new THREE.MeshStandardMaterial({ color: TEETH, roughness: 0.3 });

  // the torso's own frame: never drawn, but the head turns on it
  const torso = new THREE.Group();
  torso.name = 'torso';
  root.add(torso);

  // the pelvis: both hip bones and the sacrum, turning on the hip joints
  const pelvis = new THREE.Group();
  pelvis.name = 'pelvis';
  const hipAt: [number, number, number] = [BODY.hip[0], 0, 0];
  pelvis.add(
    mesh(hipBone(hipAt), bone, 'hip bone'),
    mesh(mirrored(hipBone(hipAt)), bone, 'hip bone')
  );
  const sac = mesh(sacrum(), bone, 'sacrum');
  sac.position.copy(SACRUM_TOP).sub(HIP_MID.clone().sub(new THREE.Vector3(...BODY.pelvis)));
  sac.rotation.x = -0.3;
  pelvis.add(sac);
  root.add(pelvis);

  // the vertebrae, with a disc under each and the ribs on the thoracic ones
  const ribEnds: { level: THREE.Group; end: THREE.Vector3; side: 1 | -1; n: number }[] = [];
  const levels = SPINE.map((l) => {
    const g = new THREE.Group();
    g.name = l.name;
    g.add(mesh(vertebra(l.region, l.scale, l.height), bone, 'vertebra'));
    if (l.region === 'thoracic') {
      const n = Number(l.name.slice(1));
      const [w, d, drop, sweep] = RIBS[n - 1];
      const r = rib(n, w, d, drop, sweep);
      for (const side of [1, -1] as const) {
        g.add(mesh(sided(r.geo, side), bone, 'rib'));
        ribEnds.push({ level: g, end: r.end.clone().setX(side * r.end.x), side, n });
      }
    }
    root.add(g);
    return g;
  });
  const discs = SPINE.map(() => {
    const d = segment(1, 1, cartilage, 14);
    d.name = 'disc';
    root.add(d);
    return d;
  });

  const chest = new THREE.Group();
  chest.name = 'sternum';
  const st = mesh(sternum(STERNUM.length), bone, 'sternum');
  st.rotation.x = -STERNUM.slope;
  chest.add(st);
  root.add(chest);
  const costalMeshes = ribEnds
    .filter((r) => r.n <= 10)
    .map((r) => {
      const c = segment(0.0055, 0.0045, cartilage, 8);
      c.name = 'costal cartilage';
      root.add(c);
      return { ...r, mesh: c };
    });

  // the skull, its jaw, and the openings
  const skull = new THREE.Group();
  skull.name = 'skull';
  skull.add(mesh(cranium(), bone, 'cranium'), mesh(cavities(), hollow, 'openings'));
  const upper = mesh(teeth(0.025, 0.026, 1), enamel, 'teeth');
  upper.position.set(0, -0.026, -0.06);
  skull.add(upper);
  const jaw = new THREE.Group();
  jaw.name = 'mandible';
  jaw.position.set(0, 0.018, -0.01);
  jaw.add(mesh(mandible(), bone, 'mandible'));
  const lower = mesh(teeth(0.023, 0.024, -1), enamel, 'teeth');
  lower.position.set(0, -0.06, -0.048);
  jaw.add(lower);
  skull.add(jaw);
  root.add(skull);

  const arms: Record<Hand, ArmRig> = {
    lead: buildArm('lead', bone, wood),
    other: buildArm('other', bone, wood),
  };
  for (const a of Object.values(arms)) {
    root.add(a.clavicle, a.scapula, a.humerus, a.ulna, a.radius, a.hand.group, a.stick, a.bead);
  }
  const legs: Record<Foot, LegRig> = {
    kickFoot: buildLeg('kickFoot', bone),
    hatFoot: buildLeg('hatFoot', bone),
  };
  for (const l of Object.values(legs)) root.add(l.femur, l.patella, l.tibia, l.fibula, l.foot);

  const neck = SPINE.map((l, i) => (l.region === 'cervical' ? i : -1)).filter((i) => i >= 0);
  // what the frame reads that never changes, worked out once: each step up the neck, the skull
  // on C1, the top of the sacrum on the pelvis, each disc's width, and where on the sternum each
  // cartilage and clavicle meets it (all in the torso's frame)
  const neckSteps = neck.map((i, k) =>
    k === 0
      ? new THREE.Vector3()
      : new THREE.Vector3(0, SPINE[i].y - SPINE[i - 1].y, SPINE[i].z - SPINE[i - 1].z)
  );
  const c1 = SPINE[neck[neck.length - 1]];
  const toSkull = SKULL_REST.clone().sub(new THREE.Vector3(0, c1.y, c1.z));
  const sacrumAt = SACRUM_TOP.clone().sub(HIP_MID.clone().sub(new THREE.Vector3(...BODY.pelvis)));
  const discWidth = SPINE.map(
    (l) => (l.region === 'lumbar' ? 0.022 : l.region === 'thoracic' ? 0.015 : 0.01) * l.scale
  );
  const onSternum = (local: THREE.Vector3) =>
    local.applyAxisAngle(X, -STERNUM.slope).add(STERNUM.at);
  const costal = costalMeshes.map((c) => ({
    ...c,
    onSternum: onSternum(new THREE.Vector3(c.side * 0.014, -STERNAL[c.n - 1], -0.002)),
  }));
  const SC = [1, -1].map((side) => onSternum(new THREE.Vector3(side * 0.02, -0.004, 0)));
  // scratch, so a frame makes next to nothing new
  const at = new THREE.Vector3();
  const below = new THREE.Vector3();
  const above = new THREE.Vector3();
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();

  return {
    root,
    update(pose: Pose, camera?: THREE.Vector3) {
      const spine = spineAt(pose);
      torso.position.copy(spine.torso.position);
      torso.quaternion.copy(spine.torso.quaternion);
      pelvis.position.copy(spine.pelvis.position);
      pelvis.quaternion.copy(spine.pelvis.quaternion);
      spine.levels.forEach((f, i) => {
        levels[i].position.copy(f.position);
        levels[i].quaternion.copy(f.quaternion);
      });

      // the neck shares the head's turn down it; the skull rests on the atlas
      const tq = spine.torso.quaternion;
      const turns = neckTurns(headTurn(pose, torso, SKULL_REST, camera));
      at.copy(spine.levels[neck[0]].position);
      neck.forEach((i, k) => {
        if (k > 0) at.add(v.copy(neckSteps[k]).applyQuaternion(q.copy(tq).multiply(turns[k - 1])));
        levels[i].position.copy(at);
        levels[i].quaternion.copy(tq).multiply(turns[k]);
      });
      skull.position
        .copy(at)
        .add(v.copy(toSkull).applyQuaternion(q.copy(tq).multiply(turns[turns.length - 2])));
      skull.quaternion.copy(tq).multiply(turns[turns.length - 1]);
      // the jaw drops to count, and a little for a smile
      jaw.rotation.x = 0.03 + 0.34 * pose.speak.open + 0.05 * pose.smile;

      // a disc between each vertebra and the next (the first on the sacrum)
      below.copy(sacrumAt).applyQuaternion(pelvis.quaternion).add(pelvis.position);
      SPINE.forEach((l, i) => {
        const g = levels[i];
        above
          .set(0, -l.height / 2, 0)
          .applyQuaternion(g.quaternion)
          .add(g.position);
        place(discs[i], below, above);
        discs[i].scale.x = discWidth[i];
        discs[i].scale.z = discWidth[i] * 0.8;
        // and this body's top, under the next disc
        below
          .set(0, l.height / 2, 0)
          .applyQuaternion(g.quaternion)
          .add(g.position);
      });

      // the sternum rides the chest, and the cartilage of each rib reaches it
      chest.position.copy(STERNUM.at).applyQuaternion(tq).add(spine.torso.position);
      chest.quaternion.copy(tq);
      for (const c of costal) {
        below.copy(c.end).applyQuaternion(c.level.quaternion).add(c.level.position);
        above.copy(c.onSternum).applyQuaternion(tq).add(spine.torso.position);
        place(c.mesh, below, above);
      }

      const sc = (side: 1 | -1) =>
        v
          .copy(SC[side === 1 ? 0 : 1])
          .applyQuaternion(tq)
          .add(spine.torso.position);
      poseArm(arms.lead, pose.arms.lead, 'lead', tq, sc(1));
      poseArm(arms.other, pose.arms.other, 'other', tq, sc(-1));
      poseLeg(legs.kickFoot, pose.legs.kickFoot);
      poseLeg(legs.hatFoot, pose.legs.hatFoot);
    },
  };
}
