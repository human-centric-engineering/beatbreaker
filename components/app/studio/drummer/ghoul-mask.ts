import * as THREE from 'three';

/**
 * The Nameless Ghouls' mask on Ghost's Meliora tour (2015–2017; experiment:
 * the drummer view), in the head's frame (`-z` forward, `+x` the drummer's
 * right, the skull's centre 0.1 up): a black knit hood over the whole head
 * and down the neck, and over it one casting in brushed silver — a long face
 * with deep-set almond eyes under a heavy brow, a long aquiline nose, high
 * cheekbones over hollow cheeks, a thin mouth cast shut and a chin drawn down
 * to a point; sculpted hair in heavy ridges swept back over the crown,
 * curling down behind each ear and hooking forward; two short horns at the
 * hairline. Rigid: nothing on it moves.
 */

const bell = (t: number) => Math.exp(-t * t);
const lerp = THREE.MathUtils.lerp;

/** Interpolate a table of rows (first column the key, ascending) at `k`. */
function rowAt(table: number[][], k: number): number[] {
  if (k <= table[0][0]) return table[0];
  for (let i = 1; i < table.length; i++) {
    if (k <= table[i][0]) {
      const f = (k - table[i - 1][0]) / (table[i][0] - table[i - 1][0]);
      return table[i].map((v, j) => lerp(table[i - 1][j], v, f));
    }
  }
  return table[table.length - 1];
}

/** The face's cross-sections, bottom to top: height, half-width, depth at the middle and at the edge. */
const FACE: number[][] = [
  [-0.04, 0.0, -0.09, -0.09],
  [-0.03, 0.008, -0.092, -0.082],
  [-0.01, 0.022, -0.098, -0.07],
  [0.015, 0.038, -0.102, -0.055],
  [0.04, 0.052, -0.104, -0.04],
  [0.06, 0.062, -0.104, -0.03],
  [0.09, 0.072, -0.104, -0.022],
  [0.115, 0.075, -0.103, -0.02],
  [0.135, 0.074, -0.11, -0.02],
  [0.15, 0.072, -0.104, -0.022],
  [0.18, 0.068, -0.1, -0.03],
  [0.205, 0.058, -0.092, -0.04],
];

/** The nose's ridge, bottom to top: height, how far forward its ridge stands, its half-width at the base. */
const NOSE: number[][] = [
  [0.064, -0.112, 0.012],
  [0.072, -0.138, 0.01],
  [0.085, -0.132, 0.011],
  [0.105, -0.124, 0.009],
  [0.13, -0.108, 0.008],
];

/** The eyes' sockets: centred here, sunk this far. */
const EYE: [number, number] = [0.031, 0.116];

/** How far forward the face's features stand at `(x, y)` over the plain section (negative is forward). */
function relief(x: number, y: number, base: number): number {
  const ax = Math.abs(x);
  // a heavy brow across both eyes, dipping a little between them
  let dz = -0.006 * bell((y - 0.135) / 0.012) * (1 - 0.6 * bell(x / 0.01)) * (ax < 0.062 ? 1 : 0);
  // the sockets
  dz += 0.009 * bell((ax - EYE[0]) / 0.017) * bell((y - EYE[1]) / 0.011);
  // the cheekbones, high and sharp, the cheeks hollow under them
  const t = THREE.MathUtils.clamp((ax - 0.04) / 0.028, 0, 1);
  dz -= 0.004 * bell((y - lerp(0.095, 0.11, t)) / 0.008) * (ax > 0.036 && ax < 0.07 ? 1 : 0);
  dz += 0.004 * bell((ax - 0.045) / 0.012) * bell((y - 0.06) / 0.014);
  // the lips either side of the slit
  dz -= 0.002 * bell(x / 0.016) * bell((y - 0.051) / 0.003);
  dz -= 0.002 * bell(x / 0.016) * bell((y - 0.043) / 0.0035);
  // the nose, a wedge on the middle line
  if (y >= NOSE[0][0] && y <= NOSE[NOSE.length - 1][0]) {
    const [, ridge, half] = rowAt(NOSE, y);
    const out = Math.max(0, base - ridge);
    dz -= out * Math.max(0, 1 - (ax / half) ** 2);
  }
  return dz;
}

/** The face: a surface of rows from the chin's point to under the sculpted hair. */
function face(mat: THREE.Material): THREE.Mesh {
  const ROWS = 90;
  const COLS = 48;
  const pos: number[] = [];
  const index: number[] = [];
  const y0 = FACE[0][0];
  const y1 = FACE[FACE.length - 1][0];
  for (let r = 0; r <= ROWS; r++) {
    const y = lerp(y0, y1, r / ROWS);
    const [, w, zc, zs] = rowAt(FACE, y);
    for (let c = 0; c <= COLS; c++) {
      const u = -1 + (2 * c) / COLS;
      const x = u * w;
      const plain = zc + (zs - zc) * Math.abs(u) ** 2.4;
      pos.push(x, y, plain + relief(x, y, zc));
    }
  }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const a = r * (COLS + 1) + c;
      const b = a + COLS + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  // the chin's underside, back from its point to the throat
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const o = new THREE.Mesh(geo, mat);
  o.name = 'mask';
  o.castShadow = true;
  return o;
}

/** A lathe of `outline` (radius, height), scaled `deep` front to back. */
function lathe(outline: [number, number][], deep: number, segments = 48): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(
    outline.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );
  g.scale(1, 1, deep);
  return g;
}

/** Keep only the triangles of `geo` with no corner `cut` says to take away. */
function trimmed(
  geo: THREE.BufferGeometry,
  cut: (v: THREE.Vector3) => boolean
): THREE.BufferGeometry {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const p = src.getAttribute('position');
  const v = new THREE.Vector3();
  const kept: number[] = [];
  for (let t = 0; t < p.count; t += 3) {
    let away = false;
    for (let i = t; i < t + 3 && !away; i++) away = cut(v.fromBufferAttribute(p, i));
    if (away) continue;
    for (let i = t; i < t + 3; i++) kept.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  out.computeVertexNormals();
  return out;
}

/** The sculpted hair's cap: radius and height. */
const CAP: [number, number][] = [
  [0.108, 0.095],
  [0.11, 0.13],
  [0.104, 0.17],
  [0.09, 0.2],
  [0.066, 0.225],
  [0.036, 0.24],
  [0.0, 0.246],
];
const CAP_DEEP = 1.08;
const CAP_BACK = 0.006;

function capRadius(y: number): number {
  const rows = CAP.map(([r, h]) => [h, r]);
  return rowAt(rows, y)[1];
}

/** The point on the cap at height `y`, `around` radians from the front, `out` proud of it. */
function onCap(y: number, around: number, out = 0): THREE.Vector3 {
  const r = capRadius(y) + out;
  return new THREE.Vector3(r * Math.sin(around), y, -r * CAP_DEEP * Math.cos(around) + CAP_BACK);
}

export function ghoulMask(): THREE.Object3D[] {
  const silver = new THREE.MeshStandardMaterial({
    color: '#b9bcc2',
    metalness: 0.85,
    roughness: 0.32,
    side: THREE.DoubleSide,
  });
  const knit = new THREE.MeshStandardMaterial({
    color: '#0e0e10',
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 1 });
  const parts: THREE.Object3D[] = [];

  // the hood: over the head and down into the collar, its front taken away where the face covers it
  const hood = new THREE.Mesh(
    trimmed(
      lathe(
        [
          [0.064, -0.11],
          [0.06, -0.06],
          [0.066, 0.0],
          [0.086, 0.05],
          [0.098, 0.1],
          [0.097, 0.15],
          [0.086, 0.19],
          [0.062, 0.215],
          [0.0, 0.228],
        ],
        1.05
      ),
      (v) => v.z < -0.03 && v.y > 0.0 && v.y < 0.21
    ),
    knit
  );
  hood.name = 'hood';
  parts.push(hood);

  const mask = face(silver);
  parts.push(mask);
  // the chin's underside, a wedge from its point back to the hood's throat
  const under = new THREE.BufferGeometry();
  const wedge: number[] = [];
  for (let c = 0; c <= 8; c++) {
    const f = c / 8;
    const y = lerp(-0.04, 0.0, f);
    const [, w] = rowAt(FACE, lerp(-0.04, 0.015, f));
    wedge.push(-w, y, lerp(-0.09, -0.05, f), w, y, lerp(-0.09, -0.05, f));
  }
  const wi: number[] = [];
  for (let c = 0; c < 8; c++) wi.push(2 * c, 2 * c + 1, 2 * c + 2, 2 * c + 1, 2 * c + 3, 2 * c + 2);
  under.setAttribute('position', new THREE.Float32BufferAttribute(wedge, 3));
  under.setIndex(wi);
  under.computeVertexNormals();
  parts.push(new THREE.Mesh(under, silver));

  // the eyes: dark gauze in an almond hole in each socket; no eye shows
  for (const s of [-1, 1]) {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 8), dark);
    hole.scale.set(1, 0.38, 0.3);
    hole.rotation.z = s * 0.12;
    const [, w, zc, zs] = rowAt(FACE, EYE[1]);
    const u = (s * EYE[0]) / w;
    hole.position.set(
      s * EYE[0],
      EYE[1],
      zc + (zs - zc) * Math.abs(u) ** 2.4 + relief(s * EYE[0], EYE[1], zc) - 0.0015
    );
    parts.push(hole);
  }
  // the mouth's dark slit, cast shut
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.0015, 0.004), dark);
  slit.position.set(0, 0.047, -0.106);
  parts.push(slit);

  // the sculpted hair: a cap over the crown, trimmed to the face at the front and up at the sides
  const cap = new THREE.Mesh(
    trimmed(
      lathe(CAP, CAP_DEEP).translate(0, 0, CAP_BACK),
      (v) => (v.z < -0.035 && v.y < 0.205) || (Math.abs(v.x) > 0.07 && v.z < 0.03 && v.y < 0.15)
    ),
    silver
  );
  cap.name = 'sculpted hair';
  parts.push(cap);
  // six ridges a side, from the hairline back over the crown and down to the nape, splaying
  for (const s of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const x0 = 0.008 + 0.0096 * i;
      const start = s * Math.asin(Math.min(1, x0 / capRadius(0.2)));
      const end = s * (Math.PI - 0.15 - 0.16 * i);
      const path: THREE.Vector3[] = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const y = 0.2 + 0.035 * Math.sin(Math.PI * t * 0.8) - (0.2 - 0.1 - 0.012 * i) * t ** 1.4;
        path.push(onCap(y, lerp(start, end, t), 0.001));
      }
      parts.push(
        new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 48, 0.006, 8),
          silver
        )
      );
    }
  // a ribbed curl down behind each ear, hooking forward
  for (const s of [-1, 1]) {
    const path = [
      [0.07, 0.175, -0.045],
      [0.098, 0.15, 0.0],
      [0.102, 0.105, 0.045],
      [0.094, 0.065, 0.055],
      [0.086, 0.045, 0.03],
      [0.084, 0.055, 0.012],
    ].map(([x, y, z]) => new THREE.Vector3(s * x, y, z));
    const curl = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 48, 0.011, 10),
      silver
    );
    curl.name = 'curl';
    parts.push(curl);
  }

  // two short horns at the hairline, up, leaning forward and out
  for (const s of [-1, 1]) {
    const geo = new THREE.ConeGeometry(0.009, 0.048, 12, 6);
    geo.translate(0, 0.024, 0);
    const p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const t = Math.max(0, (p.getY(i) / 0.048 - 0.66) / 0.34);
      p.setZ(i, p.getZ(i) - 0.006 * t * t);
    }
    geo.computeVertexNormals();
    const horn = new THREE.Mesh(geo, silver);
    horn.position.set(s * 0.028, 0.208, -0.072);
    horn.rotation.set(-0.26, 0, -s * 0.21);
    horn.name = 'horn';
    parts.push(horn);
  }
  return parts;
}
