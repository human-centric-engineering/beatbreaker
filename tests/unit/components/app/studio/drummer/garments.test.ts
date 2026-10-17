/**
 * The dressed drummer's body and clothes: the trunk shaped over the
 * skeleton's bones, and what is worn over it — T-shirts and vests, trousers
 * and shorts, trainers and boots (`garments.ts`, `shoes.ts`, the trunk in
 * `drummer-model.ts`).
 *
 * The fit is checked against the skeleton drummer itself, posed upright:
 * every bone of its trunk inside the dressed trunk, and the flesh over them
 * no thicker than a body's.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { buildDrummer, trunkOf } from '@/components/app/studio/drummer/drummer-model';
import {
  TRUNK_SQUARE,
  flesh,
  ringAt,
  surface,
  vest,
} from '@/components/app/studio/drummer/garments';
import { makeMaterials } from '@/components/app/studio/drummer/parts';
import { buildSkeleton } from '@/components/app/studio/drummer/skeleton-model';
import { BODY } from '@/lib/app/breaks/drummer/kit-layout';
import { type Persona, PERSONAS } from '@/lib/app/breaks/drummer/personas';
import { poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';

const byId = (id: string) => PERSONAS.find((p) => p.id === id)!;
const ORIGINAL = byId('original');

/** A pose standing in for any: upright, unturned, so the torso's frame is the model's less the pelvis. */
function upright() {
  const pose = poseAt(new StrokeTimeline(), 1.3, 0);
  Object.assign(pose, { lean: 0, yaw: 0, roll: 0, bob: 0 });
  return pose;
}

function named(root: THREE.Object3D, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === name) out.push(o);
  });
  return out;
}

function dressed(who: Persona) {
  const m = makeMaterials(who);
  const model = buildDrummer(m, who);
  model.update(upright());
  model.root.updateMatrixWorld(true);
  return { m, root: model.root };
}

/** The top of the throne's cushion, below the pelvis (`kit-model.ts`): what is under it is in the cushion. */
const CUSHION = 0.55 - BODY.pelvis[1];

/** Each vertex of the skeleton's trunk bones, in the torso's frame. */
function trunkBones(): THREE.Vector3[] {
  const skeleton = buildSkeleton(
    new THREE.MeshStandardMaterial(),
    PERSONAS.find((p) => p.kind === 'skeleton')!
  );
  skeleton.update(upright());
  skeleton.root.updateMatrixWorld(true);
  const pelvis = new THREE.Vector3(...BODY.pelvis);
  const out: THREE.Vector3[] = [];
  const wanted = new Set(['rib', 'sternum', 'costal cartilage', 'vertebra', 'hip bone', 'sacrum']);
  skeleton.root.traverse((o) => {
    const name = o.name || o.parent?.name || '';
    if (!(o instanceof THREE.Mesh) || !wanted.has(name)) return;
    const pos = o.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 3) {
      const v = new THREE.Vector3()
        .fromBufferAttribute(pos, i)
        .applyMatrix4(o.matrixWorld)
        .sub(pelvis);
      // the neck's vertebrae are in the neck, not the trunk
      if (v.y < 0.66) out.push(v);
    }
  });
  return out;
}

/** How far out through its cross-section a point is: under 1 inside, 1 on the surface. */
function through(rings: ReturnType<typeof trunkOf>, p: THREE.Vector3): number {
  const r = ringAt(rings, p.y);
  return Math.abs(p.x / r.w) ** TRUNK_SQUARE + Math.abs((p.z - (r.z ?? 0)) / r.d) ** TRUNK_SQUARE;
}

describe('the trunk, over the skeleton', () => {
  const bones = trunkBones();

  it('holds every bone of the skeleton’s trunk inside it — ribs, spine, breastbone and pelvis', () => {
    expect(bones.length).toBeGreaterThan(500);
    const rings = trunkOf(ORIGINAL);
    // the seat bones press down into the cushion, as a sitter's do
    const out = bones.filter((p) => p.y > CUSHION && through(rings, p) > 1);
    expect(out).toEqual([]);
  });

  it.each(
    (['slim', 'average', 'heavy', 'muscular'] as const).flatMap((build) =>
      (['male', 'female'] as const).map((figure) => [build, figure] as const)
    )
  )(
    'holds every bone inside the trunk of a %s %s too: no rib through a drawn-in waist',
    (build, figure) => {
      const rings = trunkOf({ ...ORIGINAL, build, figure });
      const out = bones.filter((p) => p.y > CUSHION && through(rings, p) > 1);
      expect(out).toEqual([]);
    }
  );

  it('lays no more flesh over the ribcage than a body has: a few centimetres, front, back and sides', () => {
    const rings = trunkOf(ORIGINAL);
    // across the chest, slab by slab: the skin's reach beyond the ribs' own
    for (let y = 0.32; y <= 0.481; y += 0.04) {
      const slab = bones.filter((p) => Math.abs(p.y - y) < 0.01);
      const r = ringAt(rings, y);
      const z = r.z ?? 0;
      const ribs = {
        side: Math.max(...slab.map((p) => Math.abs(p.x))),
        front: Math.min(...slab.map((p) => p.z)),
        back: Math.max(...slab.map((p) => p.z)),
      };
      expect(r.w - ribs.side).toBeGreaterThan(0.01);
      expect(r.w - ribs.side).toBeLessThan(0.06);
      expect(ribs.front - (z - r.d)).toBeGreaterThan(0.005);
      expect(ribs.front - (z - r.d)).toBeLessThan(0.05);
      expect(z + r.d - ribs.back).toBeGreaterThan(0.005);
      expect(z + r.d - ribs.back).toBeLessThan(0.04);
    }
  });

  it('sits down into the throne’s cushion rather than floating over it', () => {
    const bottom = trunkOf(ORIGINAL)[0].y;
    expect(bottom).toBeLessThan(CUSHION);
    expect(bottom).toBeGreaterThan(CUSHION - 0.025);
  });
});

describe('body types: the trunk each build and figure has', () => {
  /** The trunk of an average man reshaped as `build` and `figure`, at height `y`: its half-width, and its front. */
  const at = (build: Persona['build'], figure: Persona['figure'], y: number) => {
    const r = ringAt(trunkOf({ ...ORIGINAL, build, figure }), y);
    return { w: r.w, front: (r.z ?? 0) - r.d };
  };
  /** How much wider than its waist a trunk is across the chest. */
  const taper = (build: Persona['build']) => at(build, 'male', 0.45).w / at(build, 'male', 0.22).w;

  it('tapers a muscular build from a broad chest to a lean waist, more than any other', () => {
    expect(taper('muscular')).toBeGreaterThan(1.35);
    for (const build of ['slim', 'average', 'heavy'] as const)
      expect(taper('muscular')).toBeGreaterThan(taper(build) + 0.15);
  });

  it('rounds a heavy build through the middle: a belly well out in front of the chest, wider than it at the love handles', () => {
    const chest = at('heavy', 'male', 0.45);
    const belly = at('heavy', 'male', 0.21);
    // the front, out of the chest's line by a hand's breadth (the front is −z)
    expect(chest.front - belly.front).toBeGreaterThan(0.06);
    expect(belly.w).toBeGreaterThan(chest.w);
    // and rounding back up under the chest, not a ledge: the front comes forward all the way down to it
    let last = chest.front;
    for (let y = 0.44; y >= 0.22; y -= 0.02) {
      const { front } = at('heavy', 'male', y);
      expect(front).toBeLessThanOrEqual(last + 1e-4);
      last = front;
    }
    // where an average man's is barely past his chest
    const avg = at('average', 'male', 0.45).front - at('average', 'male', 0.21).front;
    expect(avg).toBeLessThan(0.01);
  });

  it('carries a heavy woman’s love handles lower than a man’s, on her hips', () => {
    /** Where a heavy build is widest over an average one of the same figure, up the trunk. */
    const peak = (figure: Persona['figure']) => {
      let best = { y: 0, extra: -Infinity };
      for (let y = -0.02; y <= 0.32; y += 0.005) {
        const extra = at('heavy', figure, y).w - at('average', figure, y).w;
        if (extra > best.extra) best = { y, extra };
      }
      return best.y;
    };
    expect(peak('male')).toBeGreaterThan(0.17);
    expect(peak('female')).toBeLessThan(peak('male') - 0.06);
  });

  it.each(['slim', 'average', 'heavy', 'muscular'] as const)(
    'draws a %s woman in at the waist between her hips and her bust: an hourglass',
    (build) => {
      const hips = at(build, 'female', 0.04).w;
      const waist = at(build, 'female', 0.26).w;
      const bust = at(build, 'female', 0.42);
      expect(waist / hips).toBeLessThan(0.78);
      expect(waist / bust.w).toBeLessThan(0.97);
      // narrower at the waist against her hips than a man of the same build
      const his = at(build, 'male', 0.26).w / at(build, 'male', 0.04).w;
      expect(waist / hips).toBeLessThan(his - 0.1);
      // and her bust out in front of her chest, where his is flat
      const under = at(build, 'female', 0.3).front;
      expect(under - bust.front).toBeGreaterThan(0.02);
    }
  );
});

describe('flesh: the bones and muscle under bare skin', () => {
  it('raises a man’s pectorals, and not a woman’s, whose chest is the trunk’s own shape', () => {
    expect(flesh(0.072, 0.47, 1, 0, 1, true)).toBeGreaterThan(0.005);
    expect(flesh(0.072, 0.47, 1, 0, 1, false)).toBeLessThan(0.001);
  });

  it('sinks the navel, the notch over the breastbone and the groove over the spine', () => {
    expect(flesh(0, 0.165, 1, 0, 1, true)).toBeLessThan(-0.004);
    expect(flesh(0, 0.652, 1, 0, 1, true)).toBeLessThan(-0.003);
    expect(flesh(0, 0.35, 0, 1, 1, true)).toBeLessThan(-0.003);
  });

  it('shows more of it on a muscular build than a heavy one', () => {
    const blades = (tone: number) => flesh(0.085, 0.53, 0, 1, tone, true);
    expect(blades(1.7)).toBeGreaterThan(blades(0.55) * 2);
  });
});

describe('what a drummer wears on top', () => {
  it('cuts a vest away round each arm and scoops it at the neck, leaving a strap over the shoulder', () => {
    // under the arm, mid-armhole: bare; the front of the chest: covered
    expect(vest(0, 0.55)).toBeLessThan(0);
    expect(vest(Math.PI, 0.55)).toBeLessThan(0);
    expect(vest(-Math.PI / 2, 0.4)).toBeGreaterThan(0);
    // the neckline, deeper in front than behind
    expect(vest(-Math.PI / 2, 0.56)).toBeLessThan(0);
    expect(vest(Math.PI / 2, 0.56)).toBeGreaterThan(0);
    // and a strap over the top of the shoulder
    expect(vest(0, 0.68)).toBeGreaterThan(0);
  });

  it('gives a T-shirt a crew neck and a hem, and leaves its sides whole', () => {
    const { root } = dressed(ORIGINAL);
    const [shirt] = named(root, 'shirt');
    expect(shirt).toBeDefined();
    // a triangle's middle on the side of the chest, at the armpit
    const pos = shirt.geometry.getAttribute('position');
    const index = shirt.geometry.getIndex()!;
    let side = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < index.count; i += 3) {
      v.fromBufferAttribute(pos, index.getX(i));
      if (Math.abs(v.y - 0.55) < 0.01 && Math.abs(v.x) > 0.14) side++;
    }
    expect(side).toBeGreaterThan(0);
    expect(named(root, 'rim')).toHaveLength(2);
  });

  it('leaves a vest’s armholes open: nothing of it under the arm', () => {
    const { root } = dressed(byId('roxy'));
    const [shirt] = named(root, 'shirt');
    const pos = shirt.geometry.getAttribute('position');
    const index = shirt.geometry.getIndex()!;
    const v = new THREE.Vector3();
    for (let i = 0; i < index.count; i++) {
      v.fromBufferAttribute(pos, index.getX(i));
      if (Math.abs(v.y - 0.55) < 0.01) expect(Math.abs(v.x)).toBeLessThan(0.14);
    }
  });

  it('belts the trousers only where no shirt hangs over the waistband', () => {
    expect(named(dressed(ORIGINAL).root, 'buckle')).toHaveLength(0);
    const bare = PERSONAS.find((p) => p.top === 'bare' && (p.kind ?? 'human') === 'human')!;
    expect(named(dressed(bare).root, 'buckle')).toHaveLength(1);
    expect(named(dressed(bare).root, 'belt loop')).toHaveLength(5);
  });

  it('gives every pair of trousers a fly and two back pockets', () => {
    const { root } = dressed(ORIGINAL);
    expect(named(root, 'fly')).toHaveLength(1);
    expect(named(root, 'pocket')).toHaveLength(2);
  });
});

describe('what a drummer wears on their legs and feet', () => {
  it('puts a pair of shorts over bare knees, with a sock on each foot', () => {
    const who = PERSONAS.find((p) => p.legs === 'shorts')!;
    const { m, root } = dressed(who);
    expect(named(root, 'shorts')).toHaveLength(2);
    expect(named(root, 'sock')).toHaveLength(2);
    // the shins are skin, shaped with the calf
    const shins = root.children.filter(
      (o): o is THREE.Mesh =>
        o instanceof THREE.Mesh &&
        o.material === m.skin &&
        o.geometry instanceof THREE.LatheGeometry
    );
    expect(shins.length).toBeGreaterThanOrEqual(4);
  });

  it('hangs long trousers past the ankle, over the top of the shoe', () => {
    const { m, root } = dressed(ORIGINAL);
    const pose = upright();
    const leg = pose.legs.kickFoot;
    const shins = root.children.filter(
      (o): o is THREE.Mesh =>
        o instanceof THREE.Mesh &&
        o.material === m.jeans &&
        o.geometry instanceof THREE.LatheGeometry &&
        o.position.distanceTo(leg.knee.clone().lerp(leg.ankle, 0.5)) < 0.03
    );
    expect(shins).toHaveLength(1);
    const length = shins[0].scale.y;
    expect(length).toBeGreaterThan(leg.knee.distanceTo(leg.ankle) + 0.01);
    expect(named(root, 'shorts')).toHaveLength(0);
  });

  it('laces trainers criss-cross up the eyelets on a white midsole, with a flash down each side', () => {
    const { root } = dressed(ORIGINAL);
    expect(named(root, 'midsole')).toHaveLength(4);
    expect(named(root, 'flash')).toHaveLength(2);
    expect(named(root, 'tongue')).toHaveLength(2);
    expect(named(root, 'shaft')).toHaveLength(0);
    // two criss-crossing laces between each pair of rows, a bar at the bottom, a bow at the top
    expect(named(root, 'lace').length).toBe(2 * (1 + 3 * 2 * 2 + 2 + 2));
  });

  it('puts a boot-wearer in leather boots: a welted sole, a shaft up the shin, no flash', () => {
    const who = PERSONAS.find((p) => p.footwear === 'boots')!;
    const { root } = dressed(who);
    expect(named(root, 'shaft')).toHaveLength(2);
    expect(named(root, 'welt')).toHaveLength(4);
    expect(named(root, 'flash')).toHaveLength(0);
    expect(named(root, 'midsole')).toHaveLength(0);
  });
});

describe('the novelty drummers keep their own look', () => {
  it.each(['robot', 'beast'] as const)(
    'dresses a %s in nothing: no shirt, belt, pockets or trainers',
    (kind) => {
      const who = PERSONAS.find((p) => p.kind === kind)!;
      const { root } = dressed(who);
      for (const name of [
        'shirt',
        'buckle',
        'pocket',
        'fly',
        'midsole',
        'flash',
        'lace',
        'sock',
        'shorts',
      ]) {
        expect(named(root, name)).toHaveLength(0);
      }
    }
  );
});

/** A lathed limb's radius `y` along it (`−0.5` to `0.5`), from its nearest ring of vertices. */
function radiusAt(limb: THREE.Mesh, y: number): number {
  const pos = limb.geometry.getAttribute('position');
  let best = Infinity;
  let r = 0;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.abs(pos.getY(i) - y);
    const here = Math.hypot(pos.getX(i), pos.getZ(i));
    if (d < best - 1e-9 || (Math.abs(d - best) < 1e-9 && here > r)) {
      best = d;
      r = here;
    }
  }
  return r;
}

/** The lathed shin of the kick foot's leg in `mat`: knee to ankle, or past it. */
function shinOf(root: THREE.Object3D, mat: THREE.Material): THREE.Mesh {
  const leg = upright().legs.kickFoot;
  const middle = leg.knee.clone().lerp(leg.ankle, 0.5);
  const shin = root.children.find(
    (o): o is THREE.Mesh =>
      o instanceof THREE.Mesh &&
      o.material === mat &&
      o.geometry instanceof THREE.LatheGeometry &&
      o.position.distanceTo(middle) < 0.03
  );
  if (!shin) throw new Error('no shin');
  return shin;
}

describe('fit and finish', () => {
  const builds = ['slim', 'average', 'heavy', 'muscular'] as const;

  it.each(builds)('pulls a sock up over the calf, not into it, on the %s build', (build) => {
    const who = { ...PERSONAS.find((p) => p.legs === 'shorts')!, build };
    const { m, root } = dressed(who);
    const shin = shinOf(root, m.skin);
    const [sock] = named(root, 'sock');
    // the ribbed top, a hand's width up the shin, stands outside the calf there
    const top = 0.5 - 0.07 / shin.scale.y;
    expect(radiusAt(sock, 0.45)).toBeGreaterThan(radiusAt(shin, top));
  });

  it.each(builds)('keeps a boot’s shaft inside the trouser leg on the %s build', (build) => {
    const who = { ...PERSONAS.find((p) => p.footwear === 'boots')!, build };
    const { m, root } = dressed(who);
    const trouser = shinOf(root, m.jeans);
    const [shaft] = named(root, 'shaft');
    const widest = Math.max(...[-0.5, 0, 0.5].map((y) => radiusAt(shaft, y)));
    // the narrowest the trouser leg is, knee to the turn of its hem
    let narrowest = Infinity;
    for (let y = -0.5; y <= 0.49; y += 0.01) narrowest = Math.min(narrowest, radiusAt(trouser, y));
    expect(widest).toBeLessThan(narrowest - 0.002);
  });

  it('builds the fine, sculpted skin only where skin shows: not under a T-shirt or on a whole cyborg', () => {
    const cells = (who: Persona) =>
      named(dressed(who).root, 'trunk')[0].geometry.getAttribute('position').count;
    const bare = PERSONAS.find((p) => p.top === 'bare' && (p.kind ?? 'human') === 'human')!;
    const cyborg = PERSONAS.find((p) => p.cyborg === 'full' && (p.kind ?? 'human') === 'human')!;
    expect(cyborg.top).not.toBe('tee');
    expect(cells(ORIGINAL)).toBeLessThan(cells(bare) / 4);
    expect(cells(cyborg)).toBeLessThan(cells(bare) / 4);
    expect(cells(byId('roxy'))).toBe(cells(bare));
  });

  it('buttons a button-up down the front under a collar; a T-shirt has neither', () => {
    const shirted = PERSONAS.find((p) => p.top === 'button-up')!;
    const { root } = dressed(shirted);
    const buttons = named(root, 'button');
    expect(buttons).toHaveLength(6);
    expect(named(root, 'collar point')).toHaveLength(2);
    expect(named(root, 'placket')).toHaveLength(1);
    // in a line down the middle of the front, each standing proud of the placket under it
    const torso = buttons[0].parent!;
    const [placket] = named(root, 'placket');
    const pos = placket.geometry.getAttribute('position');
    for (const b of buttons) {
      expect(b.parent).toBe(torso);
      expect(Math.abs(b.position.x)).toBeLessThan(1e-9);
      // the placket's middle at the button's height
      const under = Array.from({ length: pos.count }, (_, i) => i).filter(
        (i) => Math.abs(pos.getX(i)) < 0.004 && Math.abs(pos.getY(i) - b.position.y) < 0.004
      );
      expect(under.length).toBeGreaterThan(0);
      const cloth = Math.min(...under.map((i) => pos.getZ(i)));
      // in front of it (the front is −z), by no more than a button's own standing off
      expect(b.position.z).toBeLessThan(cloth);
      expect(b.position.z).toBeGreaterThan(cloth - 0.008);
    }
    const ys = buttons.map((b) => b.position.y);
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
    // and skin smooth under it, as under a T-shirt
    const cells = (who: Persona) =>
      named(dressed(who).root, 'trunk')[0].geometry.getAttribute('position').count;
    expect(cells(shirted)).toBe(cells(ORIGINAL));
    const tee = dressed(ORIGINAL).root;
    expect(named(tee, 'button')).toHaveLength(0);
    expect(named(tee, 'collar point')).toHaveLength(0);
  });

  it('cuts a button-up’s placket to its width across the front, and its collar points to take the weave', () => {
    const shirted = PERSONAS.find((p) => p.top === 'button-up')!;
    const { root } = dressed(shirted);
    const [placket] = named(root, 'placket');
    const pos = placket.geometry.getAttribute('position');
    // 3.2 cm across at every height, however broad the build: no wider at the chest than the waist
    for (const y of [0.15, 0.3, 0.45, 0.6]) {
      const xs = Array.from({ length: pos.count }, (_, i) => i)
        .filter((i) => Math.abs(pos.getY(i) - y) < 0.003)
        .map((i) => pos.getX(i));
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.03);
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.035);
    }
    // a strip down the front, not the whole trunk built to be thrown away
    expect(pos.count).toBeLessThan(3000);
    // the weave lies over the collar points and the placket, as over the rest of the shirt
    for (const part of [placket, ...named(root, 'collar point')])
      expect(part.geometry.getAttribute('uv')).toBeDefined();
    // the buttons, alike, are one shape
    const buttons = named(root, 'button');
    expect(new Set(buttons.map((b) => b.geometry)).size).toBe(1);
  });

  it('stitches a placket’s edges onto its cloth through the folds at the waist, not floating off it or sunk in it', () => {
    const shirted = PERSONAS.find((p) => p.top === 'button-up')!;
    const { root } = dressed(shirted);
    const [placket] = named(root, 'placket');
    const pos = placket.geometry.getAttribute('position');
    const cloth = Array.from({ length: pos.count }, (_, i) =>
      new THREE.Vector3().fromBufferAttribute(pos, i)
    );
    const edges = named(root, 'stitch').filter((s) => {
      const path = (s.geometry as THREE.TubeGeometry).parameters.path;
      return Math.abs(path.getPoint(0.5).x) < 0.02;
    });
    expect(edges).toHaveLength(2);
    for (const edge of edges) {
      const path = (edge.geometry as THREE.TubeGeometry).parameters.path;
      // down through the folds gathered over the waistband
      for (let t = 0.75; t <= 0.97; t += 0.01) {
        const p = path.getPoint(t);
        const near = cloth
          .filter((c) => Math.abs(c.x - p.x) < 0.0025 && Math.abs(c.y - p.y) < 0.0025)
          .sort((a, b) => a.distanceTo(p) - b.distanceTo(p))[0];
        // in front of the cloth (the front is −z), by less than a stitch's own thickness and a bit
        const off = near.z - p.z;
        expect(off).toBeGreaterThan(-0.0009);
        expect(off).toBeLessThan(0.003);
      }
    }
  });

  it('shades a surface smoothly across the seam where it closes round the back', () => {
    const rings = trunkOf(ORIGINAL);
    const geo = surface(rings, 0.2, 0.4, () => 0, new THREE.MeshBasicMaterial()).geometry;
    const n = geo.getAttribute('normal');
    const pos = geo.getAttribute('position');
    const rows = pos.count / 129;
    for (let j = 0; j < rows; j++) {
      const a = j * 129;
      const b = a + 128;
      // the same point, and the same normal
      expect(pos.getX(a)).toBeCloseTo(pos.getX(b), 9);
      expect(n.getX(a)).toBeCloseTo(n.getX(b), 9);
      expect(n.getY(a)).toBeCloseTo(n.getY(b), 9);
      expect(n.getZ(a)).toBeCloseTo(n.getZ(b), 9);
    }
  });

  it('cuts a vest’s edges onto the line of its cut, not short of it', () => {
    const { root } = dressed(byId('roxy'));
    const [shirt] = named(root, 'shirt');
    const pos = shirt.geometry.getAttribute('position');
    const uv = shirt.geometry.getAttribute('uv');
    const index = shirt.geometry.getIndex()!;
    for (let i = 0; i < index.count; i++) {
      const q = index.getX(i);
      expect(vest(uv.getX(q) * Math.PI * 2, pos.getY(q))).toBeGreaterThan(-1e-4);
    }
  });

  it('runs the fly down the front a thumb’s width off the middle, on the trunk’s own shape', () => {
    const [fly] = named(dressed(ORIGINAL).root, 'fly');
    expect(fly.geometry).toBeInstanceOf(THREE.TubeGeometry);
    const top = (fly.geometry as THREE.TubeGeometry).parameters.path.getPoint(0);
    expect(Math.abs(Math.abs(top.x) - 0.032)).toBeLessThan(0.0015);
  });
});
