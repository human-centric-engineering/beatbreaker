import * as THREE from 'three';

/**
 * Jizmak Da Gusha's head on Gwar's 40th-anniversary tour (2025; experiment:
 * the drummer view), in the head's frame (`-z` forward, `+x` the drummer's
 * right, the skull's centre 0.1 up): one latex shell over the whole head,
 * bigger than a head each way and pushed forward below into a short snout. A
 * bone skull-cap on top, ringed with blunt spikes, a little skull's dark
 * socket set in its front and a pointed blue-grey ear at each side behind;
 * a row of yellow fangs hanging from its rim over a flayed crimson face, its
 * muscle in vertical strands, two black sockets for eyes; a wide black mouth
 * with small teeth between everted lips, and a heavy jaw of upturned tusks.
 * Rigid: nothing on it moves but the hair that hangs from under it, which is
 * the hairstyle's.
 */

/** The shell's outline, radius and height (head frame): collar, jaw, face, the crown's rim and its dome. */
const OUTLINE: [number, number][] = [
  [0.1, -0.08],
  [0.112, -0.06],
  [0.12, -0.035],
  [0.122, 0.0],
  [0.119, 0.06],
  [0.116, 0.12],
  [0.12, 0.165],
  [0.124, 0.19],
  [0.116, 0.23],
  [0.098, 0.262],
  [0.07, 0.285],
  [0.035, 0.298],
  [0.0, 0.302],
];

/** Front to back, deeper than it is wide; how far the snout stands forward, and where. */
const DEEP = 1.12;
const SNOUT = 0.05;
const SNOUT_Y = 0.03;
/** The crown's rim, where the bone meets the face and the fangs hang. */
const RIM_Y = 0.165;

const bell = (t: number) => Math.exp(-t * t);

/** The shell's radius at height `y`, metres: the outline, between its points. */
function radius(y: number): number {
  if (y <= OUTLINE[0][1]) return OUTLINE[0][0];
  for (let i = 1; i < OUTLINE.length; i++) {
    const [r1, y1] = OUTLINE[i];
    const [r0, y0] = OUTLINE[i - 1];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

/** How far the snout pushes the front forward at height `y`, `front` (0–1) round toward the face. */
const snoutAt = (y: number, front: number) => SNOUT * bell((y - SNOUT_Y) / 0.06) * front ** 2;

/** The point on the shell at height `y`, `around` radians from the front (+ to the lead side), `out` metres proud. */
function onHead(y: number, around: number, out = 0): THREE.Vector3 {
  const r = radius(y) + out;
  const front = Math.max(0, Math.cos(around));
  return new THREE.Vector3(
    r * Math.sin(around),
    y,
    -r * DEEP * Math.cos(around) - snoutAt(y, front)
  );
}

/** The shell's outward direction at `y`, `around`. */
function outward(y: number, around: number): THREE.Vector3 {
  const a = onHead(y, around);
  const b = onHead(y + 0.002, around);
  const c = onHead(y, around + 0.002);
  return new THREE.Vector3()
    .subVectors(c, a)
    .cross(new THREE.Vector3().subVectors(b, a))
    .normalize();
}

/** A small hash noise, 0–1, for the bone's mottling. */
function mottle(x: number, y: number, z: number): number {
  const s = Math.sin(x * 41.3 + y * 17.1 + z * 29.7) + Math.sin(x * 13.7 - y * 37.9 + z * 11.3);
  return 0.5 + 0.25 * s;
}

const BONE = new THREE.Color('#d8c7a0');
const BONE_SHADE = new THREE.Color('#a8956c');
const BLUE_GREY = new THREE.Color('#5b6a7a');
const MUSCLE = new THREE.Color('#b03a3a');
const MUSCLE_RIDGE = new THREE.Color('#d9706a');
const MUSCLE_GROOVE = new THREE.Color('#6e1f22');
const HAIR_ROOT = new THREE.Color('#1c1612');

/** The shell: the crown in bone, mottled blue-grey; the face and jaw crimson, in strands that stand out a little. */
function shell(): THREE.Mesh {
  const geo = new THREE.LatheGeometry(
    OUTLINE.map(([r, y]) => new THREE.Vector2(r, y)),
    160
  );
  const p = geo.getAttribute('position');
  const colour = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = Math.hypot(v.x, v.z);
    if (r === 0) {
      BONE.toArray(colour, i * 3);
      continue;
    }
    const around = Math.atan2(v.x, -v.z);
    const front = Math.max(0, Math.cos(around));
    const bone = THREE.MathUtils.smoothstep(v.y, RIM_Y - 0.004, RIM_Y + 0.004);
    // the muscle's strands, about 7 mm apart, wavering down the face: proud on the face, flat on the bone
    const strand = Math.sin((around * r) / 0.0011 + Math.sin(v.y * 90) * 0.8);
    const out = (1 - bone) * 0.0014 * strand;
    const p2 = onHead(v.y, around, out);
    p.setXYZ(i, p2.x, p2.y, p2.z);
    if (bone > 0) {
      const n = mottle(v.x, v.y, v.z);
      c.copy(BONE).lerp(BONE_SHADE, 0.6 * (1 - n));
      // blue-grey over a quarter of it: round the front socket, behind at the ears and along the rim
      const patch = Math.max(
        bell((around / 0.45) ** 2 + ((v.y - 0.205) / 0.03) ** 2),
        bell((Math.abs(around) - 2.2) / 0.35) * bell((v.y - 0.24) / 0.04),
        bell((v.y - RIM_Y - 0.006) / 0.008) * front
      );
      c.lerp(BLUE_GREY, Math.min(1, patch * (0.6 + 0.6 * n)));
      c.lerp(MUSCLE, 1 - bone);
    } else {
      c.copy(MUSCLE).lerp(strand > 0 ? MUSCLE_RIDGE : MUSCLE_GROOVE, Math.abs(strand) * 0.45);
      // behind, under the hair that hangs from the rim, the shell is the hair's own dark
      c.lerp(HAIR_ROOT, THREE.MathUtils.smoothstep(Math.abs(around), 1.5, 1.9));
    }
    c.toArray(colour, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.5,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  });
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  o.name = 'mask';
  return o;
}

/** A cone along `dir` from `root`, `r` thick there and `len` long, its tip bent `bend` toward `toward`. */
function horn(
  root: THREE.Vector3,
  dir: THREE.Vector3,
  r: number,
  len: number,
  mat: THREE.Material,
  bend?: THREE.Vector3
): THREE.Mesh {
  const geo = new THREE.ConeGeometry(r, len, 10, 6);
  geo.translate(0, len / 2, 0);
  if (bend) {
    // curve it: each ring pushed sideways by the square of how far along it is
    const p = geo.getAttribute('position');
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir).invert();
    const b = bend.clone().applyQuaternion(q);
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / len;
      p.setXYZ(i, p.getX(i) + b.x * t * t, p.getY(i) + b.y * t * t, p.getZ(i) + b.z * t * t);
    }
    geo.computeVertexNormals();
  }
  const o = new THREE.Mesh(geo, mat);
  o.position.copy(root);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  o.castShadow = true;
  return o;
}

/** Ivory, darkening to brown at the root: a fang's or a tusk's. */
function ivory(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#d9b54a', roughness: 0.35 });
}

/**
 * The hair hanging from under the back of the crown's rim, in matted hanks to
 * the shoulder blades: each a path from its root (head frame), for the
 * hairstyle's locks to grow along and swing.
 */
export function jizmakHair(): THREE.Vector3[][] {
  const paths: THREE.Vector3[][] = [];
  for (let i = 0; i < 22; i++) {
    const a = (i % 2 ? 1 : -1) * (1.75 + (1.4 * Math.floor(i / 2)) / 10);
    const root = onHead(RIM_Y - 0.01, a, -0.004);
    const out = outward(0.1, a);
    const over = onHead(0.06, a, 0.012);
    const end = onHead(-0.06, a, 0.02).addScaledVector(out, 0.02);
    end.y = -0.22 - 0.05 * Math.abs(Math.sin(i * 2.3));
    paths.push([root, over, over.clone().lerp(end, 0.5), end]);
  }
  return paths;
}

export function jizmakHead(): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [shell()];
  const bone = new THREE.MeshStandardMaterial({ color: '#d8c7a0', roughness: 0.75 });
  const blueGrey = new THREE.MeshStandardMaterial({ color: '#4e5b6b', roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: '#140c0c', roughness: 0.95 });
  const fangMat = ivory();
  const lip = new THREE.MeshPhysicalMaterial({ color: '#c8505a', roughness: 0.45, clearcoat: 0.3 });

  // the rim's ledge round the front, over the face
  const ledge: THREE.Vector3[] = [];
  for (let a = -1.6; a <= 1.6001; a += 0.1) ledge.push(onHead(RIM_Y, a, 0.004));
  const rim = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ledge), 64, 0.008, 8),
    blueGrey
  );
  rim.scale.y = 0.8;
  rim.position.y = RIM_Y * 0.2;
  parts.push(rim);

  // nine blunt spikes round the crown, the back left clear for the hair; the front pair taller, leaning forward
  for (let i = 0; i < 9; i++) {
    const a = -2.4 + (4.8 * i) / 8;
    const tall = Math.abs(Math.abs(a) - 0.6) < 0.1;
    const dir = outward(0.24, a)
      .multiplyScalar(0.42)
      .add(new THREE.Vector3(0, 1, 0));
    if (tall) dir.add(new THREE.Vector3(0, 0, -0.35));
    const spike = horn(onHead(0.24, a, -0.003), dir.normalize(), 0.014, tall ? 0.05 : 0.035, bone);
    parts.push(spike);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), bone);
    tip.position.copy(spike.position).addScaledVector(dir, tall ? 0.05 : 0.035);
    parts.push(tip);
  }

  // the little skull set in the crown's front: a dark socket in a blue-grey rim, a lump of brow either side
  const socketAt = onHead(0.205, 0, -0.004);
  const socket = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 10), dark);
  socket.scale.set(1, 0.76, 0.35);
  socket.position.copy(socketAt);
  const socketRim = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.004, 8, 24), blueGrey);
  socketRim.scale.set(1.3, 1, 1);
  socketRim.position.copy(onHead(0.205, 0, 0.001));
  socketRim.lookAt(socketRim.position.clone().add(outward(0.205, 0)));
  parts.push(socket, socketRim);
  for (const side of [-1, 1]) {
    const lump = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), bone);
    lump.position.copy(onHead(0.228, side * 0.22, 0.002));
    parts.push(lump);
  }

  // a pointed ear at each side behind, rising up and back, blue-grey
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 4), blueGrey);
    ear.scale.set(1, 1, 0.35);
    ear.position.copy(onHead(0.255, side * 2.2, 0.01));
    ear.rotation.set(0.35, -side * 2.2, side * 0.3, 'YXZ');
    parts.push(ear);
  }

  // eleven fangs hanging from the rim, longest in the middle and at the canines
  for (let i = 0; i < 11; i++) {
    const a = -1.25 + (2.5 * i) / 10;
    const from = Math.abs(i - 5);
    const [r, len] =
      Math.abs(Math.abs(a) - 0.75) < 0.13
        ? [0.009, 0.05]
        : from <= 1
          ? [0.008, 0.04]
          : from >= 5
            ? [0.006, 0.022]
            : [0.007, 0.032];
    const root = onHead(RIM_Y - 0.002, a, 0.006);
    parts.push(
      horn(
        root,
        new THREE.Vector3(0, -1, 0),
        r,
        len,
        fangMat,
        outward(0.12, a).multiplyScalar(-0.2 * len)
      )
    );
  }

  // two deep black sockets for eyes, a heavy brow of muscle over each
  for (const side of [-1, 1]) {
    const a = side * 0.32;
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10), dark);
    hole.scale.set(1, 0.7, 0.45);
    hole.position.copy(onHead(0.115, a, -0.002));
    hole.lookAt(hole.position.clone().add(outward(0.115, a)));
    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.007, 0.04, 4, 8),
      new THREE.MeshPhysicalMaterial({ color: '#a8363a', roughness: 0.45, clearcoat: 0.3 })
    );
    brow.position.copy(onHead(0.134, a, 0.004));
    brow.rotation.set(0, -a, Math.PI / 2 - side * 0.35, 'YXZ');
    parts.push(hole, brow);
  }

  // the mouth: wide, a little open, black inside, a row of small teeth along its top, lips rolled out round it
  const mouthAt = onHead(-0.005, 0, -0.004);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.0375, 24, 12), dark);
  mouth.scale.set(1, 0.47, 0.25);
  mouth.position.copy(mouthAt);
  parts.push(mouth);
  const teeth = new THREE.MeshStandardMaterial({ color: '#e8e0cc', roughness: 0.4 });
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.075;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.012, 0.004), teeth);
    tooth.position.copy(onHead(0.005, a, 0.001));
    tooth.rotation.y = -a;
    parts.push(tooth);
  }
  for (const [y, tube, arc] of [
    [0.015, 0.01, Math.PI],
    [-0.024, 0.012, Math.PI],
  ] as const) {
    const roll = new THREE.Mesh(new THREE.TorusGeometry(0.04, tube, 8, 24, arc), lip);
    roll.scale.set(1, 0.35, 1);
    roll.position.copy(onHead(y, 0, 0.002));
    roll.rotation.z = y > 0 ? 0 : Math.PI;
    parts.push(roll);
  }

  // six upturned tusks from the lower lip, the outer pair the biggest, curving up and out beside the cheeks
  const tusks: [number, number, number, number][] = [
    [0.85, 0.013, 0.065, 0.25],
    [0.45, 0.01, 0.045, 0],
    [0.12, 0.008, 0.03, 0],
  ];
  for (const side of [-1, 1])
    for (const [a, r, len, out] of tusks) {
      const root = onHead(-0.03, side * a, 0.008);
      parts.push(
        horn(
          root,
          new THREE.Vector3(0, 1, 0),
          r,
          len,
          fangMat,
          new THREE.Vector3(side * out * len, 0, -0.1 * len)
        )
      );
    }

  // a rounded chin below them
  const chin = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 10),
    new THREE.MeshPhysicalMaterial({ color: '#a8363a', roughness: 0.5, clearcoat: 0.3 })
  );
  chin.scale.set(1.3, 0.8, 0.8);
  chin.position.copy(onHead(-0.06, 0, -0.012));
  parts.push(chin);
  return parts;
}
