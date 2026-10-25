import * as THREE from 'three';

import { ball, kickLogoTexture, type Materials, rod } from '@/components/app/studio/drummer/parts';
import {
  BOARD_LENGTH,
  BELL,
  DOUBLE_PEDAL,
  HAT_PEDAL,
  HOOP,
  KICK_PEDAL,
  type Piece,
  type PieceId,
  PIECES,
  type V3,
  hatShift,
  cymbalY,
} from '@/lib/app/breaks/drummer/kit-layout';
import type { FrontHead, KitStyle } from '@/lib/app/breaks/drummer/personas';
import { HAT_CLOSED_GAP, type Pose } from '@/lib/app/breaks/drummer/pose';
import { makeRng } from '@/lib/app/breaks/rng';

/**
 * The kit, built from primitives and laid out by `kit-layout.ts`
 * (experiment: the drummer view): shells with hoops and lugs, lathed cymbals
 * on stands, both pedals. `update` moves what a performance moves — the
 * beater, the boards, the top hat — and swings each cymbal after it is struck.
 */

export interface KitModel {
  root: THREE.Group;
  /**
   * `percussion`: which percussion pieces to put up; `percInst`: what each
   * sounds as, so a cowbell looks like one in either slot; `doublePedal`:
   * whether to put the second kick pedal in.
   */
  update: (
    pose: Pose,
    percussion: ReadonlySet<PieceId>,
    doublePedal?: boolean,
    percInst?: ReadonlyMap<PieceId, string>
  ) => void;
  /** Put up what a player's kit has beyond the usual (Copeland's octobans, their own front head), and take down what it does not. */
  dress: (kit: KitStyle) => void;
  /** Lay a strip of leather over the snare head, for a sound kit whose snare is deadened with one. */
  setLeather: (on: boolean) => void;
  /**
   * Draw the name on the front head the other way round, for a kit seen in a
   * mirror: a left-handed kit is the right-handed one mirrored, and the name
   * must still read forwards from out front.
   */
  mirrorLogo: (mirrored: boolean) => void;
}

const vec = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

/** A front head's identity, every field of it: two heads alike in all of them paint the same. */
const headKey = (head: FrontHead | undefined) => JSON.stringify(head ?? null);

/**
 * How fast the kick's front head is drawn shivering, Hz. Its real fundamental
 * is about 52 Hz (a 22-inch reso tuned low), but drawn at 60 frames a second
 * that aliases into a slow, random-looking drift; slowed to well under half
 * the frame rate, the shiver reads as one.
 */
const RESO_HZ = 18;
/** How fast it dies, seconds to 1/e: a ported head, felt or a pillow inside. */
const RESO_DECAY = 0.15;
/** How far a full-strength kick pushes the head's middle out, metres. */
const RESO_OUT = 0.004;
/** And how far it shakes across its face, metres: enough for the name to be seen to shiver. */
const RESO_ACROSS = 0.005;

/**
 * How the kick's front head is moved at its middle, metres, `since` seconds
 * after a kick of `strength` (0–1): `out` of the drum, and `x`, `y` across
 * its face. The beater drives the batter head in, the air in the shell pushes
 * the front one out, and it rings, dying away.
 */
export function resoShake(since: number, strength: number): { out: number; x: number; y: number } {
  if (since < 0 || since > 8 * RESO_DECAY) return { out: 0, x: 0, y: 0 };
  const a = strength * Math.exp(-since / RESO_DECAY);
  const w = 2 * Math.PI * RESO_HZ * since;
  return {
    out: RESO_OUT * a * Math.sin(w),
    // (across at a different rate, so it shivers rather than slides)
    x: RESO_ACROSS * a * Math.sin(w * 1.3 + 0.6),
    y: RESO_ACROSS * a * 0.7 * Math.sin(w * 0.8 + 1.9),
  };
}

/** How much of the shake across the face a point `u` of the way from the middle to the rim takes: the hoop holds the edge. */
export function resoAcross(u: number): number {
  return 1 - u ** 4;
}

/**
 * A struck head, per drum: `hz` how fast it is drawn ringing, `decay` seconds
 * to 1/e, and `dip` how far a full-velocity stroke drives its middle in,
 * metres. The real fundamentals — a snare's about 200 Hz, the toms' 150 down
 * to the floor tom's 80 — would alias at 60 frames a second, so each is drawn
 * at under half that, in the same order; the snare is tightest and dies
 * fastest (its wires damp it), the floor tom gives most and rings longest.
 */
const HEADS = {
  snare: { hz: 26, decay: 0.09, dip: 0.004 },
  tom1: { hz: 23, decay: 0.2, dip: 0.0055 },
  tom2: { hz: 21, decay: 0.24, dip: 0.006 },
  floor: { hz: 17, decay: 0.3, dip: 0.007 },
} as const;

/**
 * A struck drum moving on whatever holds it, per drum: `hz` how fast it rocks,
 * `decay` seconds to 1/e, `bob` how far a full-velocity stroke drives it down,
 * metres, and `rock` how far it tips, radians, the near edge (the drummer's
 * side, where the stick lands) going down first. The toms, hung on arms off
 * the kick, wobble most and longest; the snare, gripped in its basket, and the
 * floor tom, on three rubber feet, give less and settle sooner.
 */
const BODIES = {
  snare: { hz: 9, decay: 0.12, bob: 0.0032, rock: 0.02 },
  tom1: { hz: 6, decay: 0.38, bob: 0.005, rock: 0.041 },
  tom2: { hz: 5.5, decay: 0.4, bob: 0.005, rock: 0.038 },
  floor: { hz: 7, decay: 0.22, bob: 0.004, rock: 0.022 },
} as const;

/**
 * How one stroke differs from the next, from its seed (none without one): the
 * stick lands a little nearer or further, harder or softer, off to one side
 * or the other, and the drum answers a little differently each time.
 */
function strokeVariety(seed: number | undefined) {
  if (seed === undefined) return { size: 1, turn: 0, rate: 1, ring: 1, side: 1.3 };
  const rng = makeRng(seed ^ 0x5bd1e995);
  const between = (lo: number, hi: number) => lo + (hi - lo) * rng();
  return {
    /** How much harder or softer it lands than its velocity alone says. */
    size: between(0.75, 1.25),
    /** Which way the drum tips, radians off straight toward the drummer: where the stick met it. */
    turn: between(-0.6, 0.6),
    /** How fast it rocks, and how long it rings, against the drum's own. */
    rate: between(0.9, 1.1),
    ring: between(0.85, 1.15),
    /** How far out of step its side-to-side wobble is. */
    side: between(1.15, 1.45),
  };
}

/**
 * How a struck drum has moved on its mount `since` seconds after a stroke of
 * `strength` (the note's velocity, 0–1): `y` up, metres, and `rx`, `rz` its
 * tip, radians, about its own across and front-to-back axes. Driven down and
 * tipped toward the drummer by the stick, it rocks back and settles.
 */
export function drumShake(
  id: StruckHead,
  since: number,
  strength: number,
  seed?: number
): { y: number; rx: number; rz: number } {
  const b = BODIES[id];
  const v = strokeVariety(seed);
  const decay = b.decay * v.ring;
  if (since < 0 || since > 8 * decay) return { y: 0, rx: 0, rz: 0 };
  const a = strength * v.size * Math.exp(-since / decay);
  const w = 2 * Math.PI * b.hz * v.rate * since;
  const tip = b.rock * a * Math.sin(w);
  // (and a little side to side, out of step: it wobbles rather than nods)
  const wobble = 0.3 * b.rock * a * Math.sin(v.side * w);
  return {
    y: -b.bob * a * Math.sin(w),
    rx: tip * Math.cos(v.turn) - wobble * Math.sin(v.turn),
    rz: tip * Math.sin(v.turn) + wobble * Math.cos(v.turn),
  };
}
export type StruckHead = keyof typeof HEADS;

function isStruckHead(id: PieceId): id is StruckHead {
  return id in HEADS;
}

/**
 * How far a struck head's middle is moved out of the drum, metres (negative
 * in), `since` seconds after a stroke of `strength` (the note's velocity,
 * 0–1): driven in by the stick, then ringing, dying away.
 */
export function headDip(id: StruckHead, since: number, strength: number, seed?: number): number {
  const h = HEADS[id];
  const v = strokeVariety(seed);
  const decay = h.decay * v.ring;
  if (since < 0 || since > 8 * decay) return 0;
  const w = 2 * Math.PI * h.hz * v.rate * since;
  return -h.dip * strength * v.size * Math.exp(-since / decay) * Math.cos(w);
}

/**
 * A struck hi-hat. Shut, the clutch holds the pair as one, and the two tip a
 * little together on the stand and settle quickly. Apart, the top cymbal rocks
 * on its clutch on its own: the edge the stick met goes down until it meets the
 * bottom cymbal and is thrown back off it. Half-open, that is not far, so a
 * half-open hat sloshes and chatters; open, it rocks clear. Each `amp` is
 * radians per unit of strength, `hz` how fast it rocks and `decay` seconds.
 */
const HAT_PAIR = { amp: 0.014, hz: 8, decay: 0.09 };
const HAT_TOP = { amp: 0.07, hz: 3.5, decay: 0.3 };
/** How far apart, metres past shut, the hats are before the top cymbal rocks freely. */
const HAT_FREE = 0.004;
/** How much of its swing the top cymbal keeps coming back off the bottom one. */
const HAT_CLASH = 0.3;

/**
 * How a struck hi-hat has moved `since` seconds after a stroke of `strength`
 * (0–1) with the hats `gap` metres apart at the edge (`Pose.hatGap`): `top`
 * the top cymbal's tip and `bottom` the bottom one's, radians about their
 * across (`rx`, the near edge down) and front-to-back (`rz`) axes.
 */
export function hatRock(
  since: number,
  strength: number,
  gap: number,
  seed?: number
): { top: { rx: number; rz: number }; bottom: { rx: number; rz: number } } {
  const v = strokeVariety(seed);
  const still = { rx: 0, rz: 0 };
  const tip = (b: typeof HAT_PAIR, roof = Infinity) => {
    const decay = b.decay * v.ring;
    if (since < 0 || since > 8 * decay) return still;
    const a = b.amp * strength * v.size * Math.exp(-since / decay);
    const w = 2 * Math.PI * b.hz * v.rate * since;
    let down = a * Math.cos(w);
    // the struck edge meets the bottom cymbal, and comes back off it
    if (down > roof) down = roof - HAT_CLASH * (down - roof);
    const side = 0.3 * a * Math.sin(v.side * w);
    return {
      rx: down * Math.cos(v.turn) - side * Math.sin(v.turn),
      rz: down * Math.sin(v.turn) + side * Math.cos(v.turn),
    };
  };
  const pair = tip(HAT_PAIR);
  const free = Math.min(1, Math.max(0, (gap - HAT_CLOSED_GAP) / HAT_FREE));
  if (free === 0) return { top: pair, bottom: pair };
  const rock = tip({ ...HAT_TOP, amp: HAT_TOP.amp * free }, gap / PIECES.hat.radius);
  return { top: { rx: pair.rx + rock.rx, rz: pair.rz + rock.rz }, bottom: pair };
}

/**
 * The shape of a drum head's fundamental (the (0,1) mode) at `u` of the way
 * from centre to rim: J0(2.405 u), 1 at the centre and 0 at the hoop.
 */
export function resoShape(u: number): number {
  const x = (2.405 * u) ** 2 / 4;
  return Math.max(0, 1 - x + (x * x) / 4 - (x * x * x) / 36);
}

/** A piece's frame: at its centre, turned by its tilt (`XYZ`, as `onPiece` reads it). */
function frame(p: Piece): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(vec(p.centre));
  g.rotation.set(p.tilt[0], 0, p.tilt[1], 'XYZ');
  return g;
}

/** (`headShape`: the batter head's geometry, in rings so a struck head can dip and ring: see `headDip`) */
function drum(
  p: Piece,
  m: Materials,
  lugs: number,
  hoop: THREE.Material = m.chrome,
  headShape: THREE.BufferGeometry = new THREE.CircleGeometry(p.radius * 0.99, 48)
): THREE.Group {
  const r = p.radius;
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p.depth, 48, 1, true), m.shell);
  shell.position.y = -p.depth / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  const head = new THREE.Mesh(headShape, m.head);
  head.name = 'head';
  head.rotation.x = -Math.PI / 2;
  head.position.y = 0.001;
  head.receiveShadow = true;
  g.add(head);
  const reso = new THREE.Mesh(new THREE.CircleGeometry(r * 0.99, 48), m.black);
  reso.name = 'reso';
  reso.rotation.x = Math.PI / 2;
  reso.position.y = -p.depth;
  g.add(reso);

  for (const y of [HOOP.rise, -p.depth - HOOP.rise]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + HOOP.out, HOOP.tube, 8, 64), hoop);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    g.add(ring);
  }
  const lugGeo = new THREE.BoxGeometry(0.014, Math.min(0.07, p.depth * 0.4), 0.02);
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2 + 0.3;
    const lug = new THREE.Mesh(lugGeo, m.chrome);
    lug.position.set(Math.cos(a) * (r + 0.01), -p.depth / 2, Math.sin(a) * (r + 0.01));
    lug.rotation.y = -a;
    g.add(lug);
  }
  return g;
}

function cymbal(radius: number, m: Materials): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) {
    const rho = (i / 48) * radius;
    pts.push(new THREE.Vector2(Math.max(rho, 0.0005), cymbalY(rho, radius)));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  // the lathe's u runs round the cymbal: map v to radius so the grooves ring it
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv.setXY(i, 0.5 + (x / radius) * 0.5, 0.5 + (z / radius) * 0.5);
  }
  const mesh = new THREE.Mesh(geo, m.bronze);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A tripod stand from the floor up to `top`, legs splayed. */
function stand(top: THREE.Vector3, m: Materials, spread = 0.22, turn = 0.5): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Vector3(top.x, 0.32, top.z);
  g.add(rod(base, top, 0.009, m.chrome));
  g.add(rod(new THREE.Vector3(top.x, 0, top.z), base, 0.013, m.chrome));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + turn;
    const foot = new THREE.Vector3(
      top.x + Math.cos(a) * spread,
      0.01,
      top.z + Math.sin(a) * spread
    );
    g.add(rod(new THREE.Vector3(top.x, 0.3, top.z), foot, 0.007, m.chrome));
    const f = ball(0.014, m.black, 8);
    f.position.copy(foot);
    g.add(f);
  }
  return g;
}

interface Swinger {
  id: PieceId;
  group: THREE.Group;
  /** Radians per unit of strength, how fast it dies, and how fast it rocks. */
  amp: number;
  decay: number;
  freq: number;
}

/**
 * Leather's grain, drawn once onto a canvas: a brown hide mottled lighter where
 * it has worn, pebbled with fine grain and crossed by a few creases. It is the
 * colour and the bump both. Null where there is no canvas (the tests run in Node).
 */
function leatherTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const rng = makeRng(0x1ea7);
  ctx.fillStyle = '#3f2416';
  ctx.fillRect(0, 0, size, size);
  // worn patches, lighter and warmer
  for (let i = 0; i < 14; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 40 + rng() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rng() < 0.6 ? 'rgba(112,72,46,0.3)' : 'rgba(30,16,9,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // the pebbled grain
  for (let i = 0; i < 26000; i++) {
    const light = rng() < 0.45;
    ctx.fillStyle = light ? 'rgba(110,74,50,0.14)' : 'rgba(20,10,5,0.22)';
    ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2);
  }
  // creases
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let x = rng() * size;
    let y = rng() * size;
    let a = rng() * Math.PI * 2;
    ctx.strokeStyle = 'rgba(28,14,6,0.45)';
    ctx.lineWidth = 1 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 12; j++) {
      a += (rng() - 0.5) * 0.6;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The snare alone on its stand, where the kit puts it: for the grip guide,
 * which shows only the hands and the drum they play.
 */
export function buildSnare(m: Materials): THREE.Group {
  const root = new THREE.Group();
  root.name = 'snare';
  const p = PIECES.snare;
  const f = frame(p);
  f.add(drum(p, m, 10));
  root.add(f);
  root.add(
    stand(new THREE.Vector3(p.centre[0], p.centre[1] - p.depth - 0.02, p.centre[2]), m, 0.2)
  );
  return root;
}

export function buildKit(m: Materials): KitModel {
  const root = new THREE.Group();
  root.name = 'kit';
  const shakers: { id: PieceId; group: THREE.Group }[] = [];
  const heads: {
    id: StruckHead;
    geometry: THREE.BufferGeometry;
    shape: Float32Array;
    moved: boolean;
    /** Moved only while this is shown: the leather, hidden on every kit without it. */
    on?: THREE.Object3D;
  }[] = [];
  const swingers: Swinger[] = [];

  /* ---- drums --------------------------------------------------------- */
  const lugCount: Partial<Record<PieceId, number>> = { snare: 10, tom1: 6, tom2: 6, floor: 8 };
  for (const id of ['snare', 'tom1', 'tom2', 'floor'] as const) {
    const p = PIECES[id];
    const f = frame(p);
    const geometry = new THREE.RingGeometry(0, p.radius * 0.99, 48, 8);
    const body = drum(p, m, lugCount[id] ?? 6, m.chrome, geometry);
    f.add(body);
    shakers.push({ id, group: body });
    const pos = geometry.getAttribute('position');
    const shape = new Float32Array(pos.count);
    for (let k = 0; k < pos.count; k++) {
      shape[k] = resoShape(Math.hypot(pos.getX(k), pos.getY(k)) / (p.radius * 0.99));
    }
    heads.push({ id, geometry, shape, moved: false });
    root.add(f);
  }
  /* A piece of worn brown leather laid over the whole snare head and taped
     down at its edge with black gaffer tape: DJ Johnson's at the Tiny Desk
     (2018). A head of its own, rippling with the batter head under it when
     struck, on the drum's body so it rides the drum when it shakes. */
  const snare = PIECES.snare;
  const leather = new THREE.Group();
  leather.name = 'leather';
  leather.visible = false;
  {
    const across = snare.radius * 0.93;
    const geometry = new THREE.RingGeometry(0, across, 64, 8);
    const pos = geometry.getAttribute('position');
    const shape = new Float32Array(pos.count);
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k);
      const y = pos.getY(k);
      const rho = Math.hypot(x, y);
      // a cut hide, not a pressed disc: its edge wanders a little
      if (rho > across * 0.99) {
        const a = Math.atan2(y, x);
        const out = 1 + 0.018 * Math.sin(a * 3 + 0.7) + 0.01 * Math.sin(a * 7 + 2.1);
        pos.setXY(k, x * out, y * out);
      }
      // displaced as the head under it is, at the same distance from the middle
      shape[k] = resoShape(Math.min(1, rho / (snare.radius * 0.99)));
    }
    const grain = leatherTexture();
    const hide = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: grain ? '#ffffff' : '#3f2416',
        map: grain,
        bumpMap: grain,
        bumpScale: 1,
        roughness: 0.68,
      })
    );
    hide.rotation.x = -Math.PI / 2;
    hide.position.y = 0.0025;
    hide.receiveShadow = true;
    leather.add(hide);
    heads.push({ id: 'snare', geometry, shape, moved: false, on: leather });

    // the tape across the leather's edge onto the head: by the player, out front, and to the left
    const tape = new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.55 });
    for (const [a, long] of [
      [1.2, 0.05],
      [-1.75, 0.045],
      [2.9, 0.04],
    ] as const) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(long, 0.0012, 0.024), tape);
      strip.position.set(Math.cos(a) * across, 0.0038, Math.sin(a) * across);
      strip.rotation.y = -a;
      leather.add(strip);
    }
  }
  shakers.find((s) => s.id === 'snare')?.group.add(leather);

  // snare stand, tom mounts off the kick, floor tom legs
  root.add(
    stand(
      new THREE.Vector3(snare.centre[0], snare.centre[1] - snare.depth - 0.02, snare.centre[2]),
      m,
      0.2
    )
  );
  const kick = PIECES.kick;
  const kickTop = new THREE.Vector3(
    kick.centre[0],
    kick.centre[1] + kick.radius,
    kick.centre[2] + 0.02
  );
  for (const id of ['tom1', 'tom2'] as const) {
    const p = PIECES[id];
    const under = new THREE.Vector3(
      p.centre[0] * 0.6,
      p.centre[1] - p.depth * 0.6,
      p.centre[2] - 0.05
    );
    root.add(rod(kickTop, under, 0.011, m.chrome));
  }
  const floor = PIECES.floor;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.9;
    const top = new THREE.Vector3(
      floor.centre[0] + Math.cos(a) * (floor.radius + 0.02),
      floor.centre[1] - 0.06,
      floor.centre[2] + Math.sin(a) * (floor.radius + 0.02)
    );
    const foot = new THREE.Vector3(top.x + Math.cos(a) * 0.06, 0.01, top.z + Math.sin(a) * 0.06);
    root.add(rod(top, foot, 0.008, m.chrome));
  }

  /* ---- kick ---------------------------------------------------------- */
  const kickGroup = new THREE.Group();
  kickGroup.position.copy(vec(kick.centre));
  // the drum's own frame has its batter head facing +z, toward the drummer
  const kickBody = drum({ ...kick, centre: [0, 0, 0] }, m, 10, m.wood);
  kickBody.rotation.x = Math.PI / 2;
  kickBody.position.z = kick.depth / 2;
  // a white batter head facing the drummer, a black reso out front with the name round it
  // (or the player's own head, once dressed: see `dress`)
  let logo = kickLogoTexture();
  let logoKey = headKey(undefined);
  let logoMirrored = false;
  // each head painted once, kept while the kit lives: a player picked again is not repainted
  const painted = new Map<string, THREE.Texture>();
  if (logo) painted.set(logoKey, logo);
  let frontMaterial: THREE.MeshStandardMaterial | undefined;
  // (in rings, so it can shiver, the middle most: see `resoShake`)
  let reso:
    | {
        geometry: THREE.BufferGeometry;
        base: Float32Array;
        out: Float32Array;
        across: Float32Array;
        moved: boolean;
      }
    | undefined;
  if (logo) {
    const R = kick.radius * 0.99;
    const geometry = new THREE.RingGeometry(0, R, 64, 10);
    const pos = geometry.getAttribute('position');
    const base = new Float32Array(pos.count * 2);
    const out = new Float32Array(pos.count);
    const across = new Float32Array(pos.count);
    for (let k = 0; k < pos.count; k++) {
      base[2 * k] = pos.getX(k);
      base[2 * k + 1] = pos.getY(k);
      const u = Math.hypot(pos.getX(k), pos.getY(k)) / R;
      out[k] = resoShape(u);
      across[k] = resoAcross(u);
    }
    frontMaterial = new THREE.MeshStandardMaterial({ map: logo, roughness: 0.6 });
    const front = new THREE.Mesh(geometry, frontMaterial);
    // (its +z, the way it bows, out of the front of the drum)
    front.rotation.x = Math.PI / 2;
    front.position.y = -kick.depth - 0.001;
    kickBody.add(front);
    // the plain black head behind it would show through the middle as it swings in
    kickBody.getObjectByName('reso')?.removeFromParent();
    reso = { geometry, base, out, across, moved: false };
  }
  kickGroup.add(kickBody);
  for (const side of [-1, 1]) {
    const spur = rod(
      new THREE.Vector3(side * kick.radius * 0.8, -kick.radius * 0.3, -0.05),
      new THREE.Vector3(side * (kick.radius + 0.1), -kick.centre[1] + 0.01, -0.1),
      0.007,
      m.chrome
    );
    kickGroup.add(spur);
  }
  shakers.push({ id: 'kick', group: kickBody });
  root.add(kickGroup);

  // kick pedal: base plate, board hinged at the heel, beater on its axle
  const kp = vec(KICK_PEDAL.heel);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.36), m.black);
  plate.position.set(kp.x, 0.006, kp.z - 0.16);
  root.add(plate);
  const kickBoard = new THREE.Group();
  kickBoard.position.copy(kp);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, BOARD_LENGTH), m.chrome);
  kb.position.z = -BOARD_LENGTH / 2;
  kb.castShadow = true;
  kickBoard.add(kb);
  root.add(kickBoard);
  const axle = vec(KICK_PEDAL.axle);
  for (const side of [-1, 1])
    root.add(
      rod(
        new THREE.Vector3(axle.x + side * 0.05, 0.01, axle.z),
        new THREE.Vector3(axle.x + side * 0.05, axle.y + 0.03, axle.z),
        0.008,
        m.chrome
      )
    );
  const beater = new THREE.Group();
  beater.position.copy(axle);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, KICK_PEDAL.beater, 8),
    m.chrome
  );
  shaft.position.y = KICK_PEDAL.beater / 2;
  beater.add(shaft);
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 20), m.felt);
  felt.rotation.z = Math.PI / 2;
  felt.position.y = KICK_PEDAL.beater;
  felt.castShadow = true;
  beater.add(felt);
  root.add(beater);

  /* ---- double pedal: the left foot's board, a drive shaft from its toe to a
          second beater beside the first. Only in for a double-kick pattern. */
  const double = new THREE.Group();
  const dp = vec(DOUBLE_PEDAL.heel);
  const dTurn = Math.atan2(-DOUBLE_PEDAL.toward[0], -DOUBLE_PEDAL.toward[2]);
  const dToe = dp.clone().addScaledVector(vec(DOUBLE_PEDAL.toward).normalize(), BOARD_LENGTH);
  const dPlate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.36), m.black);
  dPlate.position.copy(dp.clone().lerp(dToe, 0.55)).setY(0.006);
  dPlate.rotation.y = dTurn;
  double.add(dPlate);
  const doubleBoard = new THREE.Group();
  doubleBoard.position.copy(dp);
  doubleBoard.rotation.order = 'YXZ';
  doubleBoard.rotation.y = dTurn;
  const db = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, BOARD_LENGTH), m.chrome);
  db.position.z = -BOARD_LENGTH / 2;
  db.castShadow = true;
  doubleBoard.add(db);
  double.add(doubleBoard);
  // the shaft's bearing at the board's toe, and the shaft across to the second beater
  const dAxle = vec(DOUBLE_PEDAL.axle);
  const bearing = new THREE.Vector3(dToe.x, dAxle.y - 0.02, dToe.z - 0.04);
  double.add(rod(new THREE.Vector3(bearing.x, 0.01, bearing.z), bearing, 0.008, m.chrome));
  double.add(rod(bearing, new THREE.Vector3(dAxle.x - 0.02, dAxle.y, dAxle.z), 0.006, m.chrome));
  const beater2 = new THREE.Group();
  beater2.position.copy(dAxle);
  const shaft2 = new THREE.Mesh(shaft.geometry, m.chrome);
  shaft2.position.y = KICK_PEDAL.beater / 2;
  beater2.add(shaft2);
  const felt2 = new THREE.Mesh(felt.geometry, m.felt);
  felt2.rotation.z = Math.PI / 2;
  felt2.position.y = KICK_PEDAL.beater;
  felt2.castShadow = true;
  beater2.add(felt2);
  double.add(beater2);
  root.add(double);

  /* ---- hats: cymbals, stand and pedal in one group, which moves over to the
          left as a whole to make room for a double pedal's second board ---- */
  const hiHat = new THREE.Group();
  const hat = PIECES.hat;
  const hatCentre = vec(hat.centre);
  const hatStandTop = new THREE.Vector3(hatCentre.x, hatCentre.y - 0.03, hatCentre.z);
  // the stand, and with a double pedal in the same stand turned: one leg back beside the pedal, one by the drive shaft
  const hatStand = stand(hatStandTop, m, 0.2);
  const hatStandBesideDouble = stand(hatStandTop, m, 0.2, 1.7);
  hiHat.add(hatStand, hatStandBesideDouble);
  const hatRod = rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, 0), 0.004, m.chrome);
  const hatTop = new THREE.Group();
  const hatTopTilt = frame(hat);
  hatTopTilt.position.set(0, 0, 0);
  const topCym = cymbal(hat.radius, m);
  hatTopTilt.add(topCym);
  hatTop.add(hatTopTilt);
  hatTop.add(hatRod);
  hatTop.position.copy(hatCentre);
  hiHat.add(hatTop);
  const bottom = frame(hat);
  const bottomCym = cymbal(hat.radius, m);
  bottomCym.rotation.x = Math.PI; // the bottom cymbal faces up into the top one
  // edge to edge with the top one: each bow falls 7.5% of the radius
  bottomCym.position.y = -2 * 0.075 * hat.radius - HAT_CLOSED_GAP;
  bottom.add(bottomCym);
  hiHat.add(bottom);
  // hat pedal
  const hp = vec(HAT_PEDAL.heel);
  const hatBoard = new THREE.Group();
  hatBoard.position.copy(hp);
  hatBoard.rotation.order = 'YXZ';
  hatBoard.rotation.y = Math.atan2(-HAT_PEDAL.toward[0], -HAT_PEDAL.toward[2]);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, BOARD_LENGTH), m.chrome);
  hb.position.z = -BOARD_LENGTH / 2;
  hb.castShadow = true;
  hatBoard.add(hb);
  hiHat.add(hatBoard);
  const pedalTop = hp.clone().addScaledVector(vec(HAT_PEDAL.toward).normalize(), BOARD_LENGTH);
  hiHat.add(
    rod(
      new THREE.Vector3(pedalTop.x, 0.01, pedalTop.z),
      new THREE.Vector3(hatCentre.x, 0.05, hatCentre.z),
      0.006,
      m.chrome
    )
  );
  root.add(hiHat);

  /* ---- cymbals ------------------------------------------------------- */
  const swing: Partial<Record<PieceId, [number, number, number]>> = {
    ride: [0.05, 1.4, 1.6],
    crash: [0.16, 1.6, 2.1],
  };
  for (const id of ['ride', 'crash'] as const) {
    const p = PIECES[id];
    const f = frame(p);
    const swingGroup = new THREE.Group();
    swingGroup.add(cymbal(p.radius, m));
    const nut = ball(0.012, m.black, 10);
    nut.position.y = BELL.height + 0.008;
    swingGroup.add(nut);
    f.add(swingGroup);
    root.add(f);
    const [amp, decay, freq] = swing[id] ?? [0.05, 1.5, 2];
    swingers.push({ id, group: swingGroup, amp, decay, freq });
    // a straight stand, then a short boom out to the cymbal
    const under = new THREE.Vector3(
      p.centre[0] + 0.1 * Math.sign(p.centre[0]),
      p.centre[1] - 0.12,
      p.centre[2] - 0.12
    );
    root.add(stand(under, m));
    root.add(rod(under, vec(p.centre).add(new THREE.Vector3(0, -0.01, 0)), 0.007, m.chrome));
  }

  /* ---- percussion: a cowbell off the kick, a block off the hat stand --
     Each mount holds either, and shows the one its slot sounds as: a bell
     for a cowbell or an agogô, a block for anything else. */
  const bellAt = (c: V3, dz: number) => {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.048, 0.13, 4, 1), m.black);
    bell.rotation.set(Math.PI / 2 - 0.2, Math.PI / 4, 0);
    bell.position.set(c[0], c[1], c[2] + dz);
    bell.castShadow = true;
    return bell;
  };
  const blockAt = (c: V3) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.06), m.wood);
    block.position.set(c[0], c[1], c[2]);
    block.rotation.x = 0.2;
    block.castShadow = true;
    return block;
  };
  const pc1 = PIECES.perc1;
  const bell1 = bellAt(pc1.centre, -0.03);
  const block1 = blockAt(pc1.centre);
  const perc1 = [
    rod(vec(pc1.centre).add(new THREE.Vector3(0, -0.02, -0.08)), kickTop, 0.007, m.chrome),
  ];
  const pc2 = PIECES.perc2;
  const bell2 = bellAt(pc2.centre, 0);
  const block2 = blockAt(pc2.centre);
  const perc2 = [
    rod(
      vec(pc2.centre).add(new THREE.Vector3(0, -0.03, 0)),
      new THREE.Vector3(hatCentre.x - 0.02, 0.6, hatCentre.z),
      0.006,
      m.chrome
    ),
  ];
  root.add(...perc1, ...perc2, bell1, block1, bell2, block2);
  const BELLS = new Set(['cowbell', 'agogo']);
  /** Bell or block on a mount: what it sounds as, else what that mount has always held. */
  const isBell = (inst: string | undefined, usual: boolean) => (inst ? BELLS.has(inst) : usual);

  /* ---- throne and rug ------------------------------------------------ */
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.08, 32), m.black);
  seat.position.set(0, 0.51, 0.26);
  seat.castShadow = true;
  seat.receiveShadow = true;
  root.add(seat);
  root.add(stand(new THREE.Vector3(0, 0.47, 0.26), m, 0.26));
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.27, 64), m.rug);
  const trim = new THREE.Mesh(new THREE.RingGeometry(1.27, 1.35, 64), m.trim);
  for (const o of [rug, trim]) {
    o.rotation.x = -Math.PI / 2;
    o.position.set(0, 0.002, -0.25);
    o.receiveShadow = true;
    root.add(o);
  }

  /* ---- octobans ------------------------------------------------------ */
  // a rank of four tall, narrow tubes on a rack above and behind the toms, toward the ride
  // side, their heads tipped to the player, longest at the low end (Stewart Copeland's)
  const octobans = new THREE.Group();
  octobans.name = 'octobans';
  const OCTO_R = 0.076;
  const octoShell = new THREE.MeshPhysicalMaterial({
    color: '#0e0e10',
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const rack = [
    { x: -0.02, length: 0.24 },
    { x: 0.14, length: 0.28 },
    { x: 0.3, length: 0.32 },
    { x: 0.46, length: 0.36 },
  ];
  for (const { x, length } of rack) {
    const p: Piece = {
      id: 'tom1',
      kind: 'drum',
      centre: [x, 0.97, -0.9],
      radius: OCTO_R,
      depth: length,
      tilt: [0.42, 0],
    };
    const f = frame(p);
    f.add(drum(p, { ...m, shell: octoShell }, 4));
    octobans.add(f);
  }
  octobans.add(
    rod(new THREE.Vector3(-0.1, 0.9, -0.94), new THREE.Vector3(0.54, 0.9, -0.94), 0.008, m.chrome),
    stand(new THREE.Vector3(0.22, 0.9, -0.96), m, 0.2)
  );
  octobans.visible = false;
  root.add(octobans);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.receiveShadow = true;
  });

  return {
    root,
    mirrorLogo(mirrored: boolean) {
      if (!logo) return;
      /* u read right to left: the mirror the rig is drawn in, undone for the
         name alone. The texture already turns about its centre, so the flip is
         about the centre too, and needs no offset to land back on the head. */
      logoMirrored = mirrored;
      logo.repeat.x = mirrored ? -1 : 1;
    },
    setLeather(on: boolean) {
      leather.visible = on;
    },
    dress(kit: KitStyle) {
      octobans.visible = !!kit.octobans;
      // the front head changed only when it differs: BeatBreaker's, or the player's own
      const key = headKey(kit.head);
      if (!frontMaterial || key === logoKey) return;
      const next = painted.get(key) ?? kickLogoTexture(kit.head);
      if (!next) return;
      painted.set(key, next);
      logo = next;
      logoKey = key;
      logo.repeat.x = logoMirrored ? -1 : 1;
      frontMaterial.map = logo;
      frontMaterial.needsUpdate = true;
    },
    update(pose: Pose, percussion: ReadonlySet<PieceId>, doublePedal = false, percInst) {
      const up1 = percussion.has('perc1');
      const up2 = percussion.has('perc2');
      const bellOn1 = isBell(percInst?.get('perc1'), true);
      const bellOn2 = isBell(percInst?.get('perc2'), false);
      for (const o of perc1) o.visible = up1;
      for (const o of perc2) o.visible = up2;
      bell1.visible = up1 && bellOn1;
      block1.visible = up1 && !bellOn1;
      bell2.visible = up2 && bellOn2;
      block2.visible = up2 && !bellOn2;
      double.visible = doublePedal;
      hiHat.position.copy(vec(hatShift(doublePedal)));
      hatStand.visible = !doublePedal;
      hatStandBesideDouble.visible = doublePedal;
      doubleBoard.rotation.x = pose.double.board;
      beater2.rotation.x = pose.double.beater;
      kickBoard.rotation.x = pose.legs.kickFoot.board;
      hatBoard.rotation.x = pose.legs.hatFoot.board;
      beater.rotation.x = pose.beater;
      hatTop.position.y = hatCentre.y + pose.hatGap - HAT_CLOSED_GAP;

      for (const s of shakers) {
        const h = pose.hits[s.id];
        if (s.id === 'kick') {
          const give = h ? h.strength * Math.exp(-h.since * 28) : 0;
          s.group.scale.setScalar(1 + 0.004 * give);
          continue;
        }
        // a struck drum rocks on its mount, as hard as it was struck
        const m =
          h && isStruckHead(s.id) ? drumShake(s.id, h.since, h.strength, h.seed) : undefined;
        s.group.position.y = m?.y ?? 0;
        s.group.rotation.set(m?.rx ?? 0, 0, m?.rz ?? 0);
      }
      // a struck head dips and rings, as hard as it was struck; still again once it has died
      for (const h of heads) {
        if (h.on && !h.on.visible) continue;
        const hit = pose.hits[h.id];
        const dip = hit ? headDip(h.id, hit.since, hit.strength, hit.seed) : 0;
        if (dip === 0 && !h.moved) continue;
        const pos = h.geometry.getAttribute('position');
        for (let j = 0; j < pos.count; j++) pos.setZ(j, dip * h.shape[j]);
        pos.needsUpdate = true;
        h.geometry.computeVertexNormals();
        h.moved = dip !== 0;
      }
      // the front head shivers after a kick; still again once it has died
      if (reso) {
        const k = pose.hits.kick;
        const shake = k ? resoShake(k.since, k.strength) : { out: 0, x: 0, y: 0 };
        const moving = shake.out !== 0 || shake.x !== 0 || shake.y !== 0;
        if (moving || reso.moved) {
          const pos = reso.geometry.getAttribute('position');
          for (let j = 0; j < pos.count; j++) {
            const a = reso.across[j];
            pos.setXYZ(
              j,
              reso.base[2 * j] + shake.x * a,
              reso.base[2 * j + 1] + shake.y * a,
              shake.out * reso.out[j]
            );
          }
          pos.needsUpdate = true;
          reso.geometry.computeVertexNormals();
          reso.moved = moving;
        }
      }
      for (const s of swingers) {
        const h = pose.hits[s.id];
        if (!h || h.since > 6) {
          s.group.rotation.set(0, 0, 0);
          continue;
        }
        const e = h.strength * s.amp * Math.exp(-h.since * s.decay);
        s.group.rotation.x = -e * Math.cos(h.since * Math.PI * 2 * s.freq);
        s.group.rotation.z = 0.3 * e * Math.sin(h.since * Math.PI * 2 * s.freq * 1.3);
      }
      // a struck hat tips on its stand; apart, the top one rocks on its clutch against the bottom
      const ht = pose.hits.hat;
      const rock = ht ? hatRock(ht.since, ht.strength, pose.hatGap, ht.seed) : undefined;
      hatTopTilt.rotation.x = hat.tilt[0] + (rock?.top.rx ?? 0);
      hatTopTilt.rotation.z = hat.tilt[1] + (rock?.top.rz ?? 0);
      bottom.rotation.x = hat.tilt[0] + (rock?.bottom.rx ?? 0);
      bottom.rotation.z = hat.tilt[1] + (rock?.bottom.rz ?? 0);
    },
  };
}
