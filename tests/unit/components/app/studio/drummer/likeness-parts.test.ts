/**
 * The parts the likenesses are dressed in (`drummer-model.ts`, `garments.ts`,
 * `parts.ts`, `shoes.ts`): a suit's jacket over a tie, a bow tie or an open
 * collar; a button-up open at the neck, under a loosened tie, with spear
 * points or its sleeves rolled; a kaftan and a tunic; plaid and tweed; dress
 * shoes; glasses; the hair and beards cut as the drummers' were; and a kit
 * of see-through acrylic.
 *
 * Each is built on the cast's first player with only that part changed, so
 * what a test sees is the part and nothing else.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { buildDrummer } from '@/components/app/studio/drummer/drummer-model';
import {
  bentCloth,
  hairSheen,
  makeMaterials,
  styleKit,
} from '@/components/app/studio/drummer/parts';
import { LIKENESSES } from '@/lib/app/breaks/drummer/likenesses';
import { type Persona, PERSONAS } from '@/lib/app/breaks/drummer/personas';
import { poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';

const BASE = PERSONAS[0];

function dressed(changes: Partial<Persona>) {
  const who: Persona = { ...BASE, ...changes };
  const m = makeMaterials(who);
  const model = buildDrummer(m, who);
  const pose = poseAt(new StrokeTimeline(), 1.3, 0);
  Object.assign(pose, { lean: 0, yaw: 0, roll: 0, bob: 0 });
  model.update(pose);
  model.root.updateMatrixWorld(true);
  return { m, root: model.root };
}

function named(root: THREE.Object3D, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === name) out.push(o);
  });
  return out;
}

/** Every vertex of a mesh, in its parent's frame. */
function points(o: THREE.Mesh): THREE.Vector3[] {
  o.updateMatrix();
  const p = o.geometry.getAttribute('position');
  const used = o.geometry.getIndex() ? new Set(o.geometry.getIndex()!.array) : null;
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < p.count; i++) {
    if (used && !used.has(i)) continue;
    out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrix));
  }
  return out;
}

const JACKET: Partial<Persona> = {
  top: 'jacket',
  shirt: '#1f1f24',
  under: '#f2f2ee',
  tie: '#141414',
};

describe('a suit jacket', () => {
  it('buttons over a shirt and a long tie: notched lapels with a rolled edge, collar points, a knot', () => {
    const { root, m } = dressed(JACKET);
    expect(named(root, 'jacket')).toHaveLength(1);
    expect(named(root, 'lapel')).toHaveLength(2);
    expect(named(root, 'lapel edge')).toHaveLength(2);
    expect(named(root, 'collar point')).toHaveLength(2);
    const [tie] = named(root, 'tie');
    expect(tie.material).toBe(m.tie);
    expect((tie.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('141414');
    expect(named(root, 'knot')).toHaveLength(1);
    // the tie runs down the middle of the front, from the knot to under the button
    const ys = points(tie).map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.25);
    for (const p of points(tie)) expect(Math.abs(p.x)).toBeLessThan(0.03);
  });

  it('weaves its shirt in the shirt’s own colour, not the jacket’s', () => {
    const { root, m } = dressed(JACKET);
    const [shirt] = named(root, 'shirt');
    expect(shirt.material).toBe(m.under);
    expect(m.under.color.getHexString()).not.toBe(m.shirt.color.getHexString());
  });

  it('takes a bow tie, or an open collar spread over the lapels, in place of the long tie', () => {
    const bow = dressed({ ...JACKET, neckwear: 'bow' }).root;
    expect(named(bow, 'tie')).toHaveLength(0);
    expect(named(bow, 'knot')).toHaveLength(0);
    const open = dressed({ ...JACKET, neckwear: 'open' }).root;
    expect(named(open, 'tie')).toHaveLength(0);
    const spread = (root: THREE.Object3D) =>
      Math.max(
        ...named(root, 'collar point')
          .flatMap(points)
          .map((p) => Math.abs(p.x))
      );
    // laid out over the lapels, not tucked inside the V
    expect(spread(open)).toBeGreaterThan(spread(dressed(JACKET).root) + 0.02);
  });

  it('takes a loosened tie: its knot pulled down to an open neck, the collar spread over the lapels', () => {
    const { root } = dressed({ ...JACKET, neckwear: 'loose' });
    expect(named(root, 'tie')).toHaveLength(1);
    expect(named(root, 'tie band')).toHaveLength(2);
    const tied = dressed(JACKET).root;
    // a knot at the collar sits higher than one pulled down
    expect(named(tied, 'knot')[0].position.y).toBeGreaterThan(
      named(root, 'knot')[0].position.y + 0.03
    );
    expect(named(tied, 'tie band')).toHaveLength(0);
    // the shirt is open at the neck: none of it crosses the middle of the front up there
    const neck = Math.max(...points(named(root, 'shirt')[0]).map((p) => p.y));
    const top = points(named(root, 'shirt')[0]).filter((p) => p.y > neck - 0.03);
    expect(top.length).toBeGreaterThan(0);
    expect(Math.min(...top.map((p) => Math.abs(p.x)))).toBeGreaterThan(0.005);
    const spread = (r: THREE.Object3D) =>
      Math.max(
        ...named(r, 'collar point')
          .flatMap(points)
          .map((p) => Math.abs(p.x))
      );
    expect(spread(root)).toBeGreaterThan(spread(tied) + 0.01);
  });

  it('hangs open over a T-shirt: its fronts parted to the hem, a crew neck, no collar points or tie', () => {
    const { root, m } = dressed({ ...JACKET, under: '#a4a6aa', neckwear: 'tee' });
    expect(named(root, 'collar point')).toHaveLength(0);
    expect(named(root, 'tie')).toHaveLength(0);
    const [tee] = named(root, 'shirt');
    expect(tee.material).toBe(m.under);
    // the T-shirt shows all the way down the front, not only in the V above a button
    const low = (root: THREE.Object3D) =>
      Math.min(...points(named(root, 'shirt')[0]).map((p) => p.y));
    expect(low(root)).toBeLessThan(low(dressed(JACKET).root) - 0.15);
  });

  it('leaves a dinner jacket as it was: satin lapels and a bow tie, no notch, no collar points', () => {
    const { root } = dressed({ top: 'tuxedo', shirt: '#141414', under: '#f2f0ea' });
    expect(named(root, 'lapel')).toHaveLength(2);
    expect(named(root, 'lapel edge')).toHaveLength(0);
    expect(named(root, 'collar point')).toHaveLength(0);
    expect(named(root, 'tie')).toHaveLength(0);
  });

  it('gives its long sleeves to the arms', () => {
    const { root } = dressed(JACKET);
    for (const arm of named(root, 'arm')) expect(arm.geometry.groups).toHaveLength(2);
  });
});

const SHIRT: Partial<Persona> = { top: 'button-up', shirt: '#26285e' };

describe('a button-up, worn as the drummers wore it', () => {
  it('opens at the neck: two buttons undone, the collar’s points laid back along the V', () => {
    const closed = dressed(SHIRT).root;
    const open = dressed({ ...SHIRT, neckwear: 'open' }).root;
    expect(named(closed, 'button')).toHaveLength(6);
    expect(named(open, 'button')).toHaveLength(4);
    // the buttons that are done up are where they were on the closed shirt
    const ys = (root: THREE.Object3D) => named(root, 'button').map((b) => b.position.y);
    ys(open).forEach((y, i) => expect(y).toBeCloseTo(ys(closed)[i + 2], 6));
    // no point of the collar crosses the middle of the front, where the shirt is open
    const nearest = Math.min(
      ...named(open, 'collar point')
        .flatMap(points)
        .map((p) => Math.abs(p.x))
    );
    expect(nearest).toBeGreaterThan(0.01);
  });

  it('cuts spear points longer and wider than a shirt’s own', () => {
    const lowest = (root: THREE.Object3D) =>
      Math.min(
        ...named(root, 'collar point')
          .flatMap(points)
          .map((p) => p.y)
      );
    const point = dressed({ ...SHIRT, neckwear: 'open' }).root;
    const spear = dressed({ ...SHIRT, neckwear: 'open', collar: 'spear' }).root;
    expect(lowest(spear)).toBeLessThan(lowest(point) - 0.025);
  });

  it('hangs a loosened tie from a knot pulled down to the top button, its band up under the collar', () => {
    const { root } = dressed({ ...SHIRT, neckwear: 'loose', tie: '#8a7048' });
    const [knot] = named(root, 'knot');
    expect(named(root, 'tie')).toHaveLength(1);
    expect(named(root, 'tie band')).toHaveLength(2);
    const tied = dressed({ ...SHIRT, neckwear: 'long', tie: '#8a7048' }).root;
    // a knot at the collar sits higher than one pulled down
    expect(named(tied, 'knot')[0].position.y).toBeGreaterThan(knot.position.y + 0.03);
    expect(named(tied, 'tie band')).toHaveLength(0);
    expect(named(tied, 'button')).toHaveLength(6);
  });

  it('takes a bow tie at its collar, buttoned to the neck', () => {
    const { root, m } = dressed({ ...SHIRT, neckwear: 'bow', tie: '#141414' });
    const bow = named(root, 'bow tie');
    expect(bow).toHaveLength(3);
    for (const o of bow) expect(o.material).toBe(m.tie);
    expect(named(root, 'tie')).toHaveLength(0);
    expect(named(root, 'button')).toHaveLength(6);
    expect(named(dressed(SHIRT).root, 'bow tie')).toHaveLength(0);
    // at the collar, over the middle of the front
    const neck = Math.max(
      ...named(root, 'collar point')
        .flatMap(points)
        .map((p) => p.y)
    );
    for (const o of bow) {
      expect(Math.abs(o.position.x)).toBeLessThan(0.03);
      expect(o.position.y).toBeGreaterThan(neck - 0.04);
    }
  });

  it('rolls its sleeves up to a hand’s breadth below the elbow, the forearm bare under them', () => {
    const cloth = (root: THREE.Object3D) => named(root, 'arm')[0].geometry.groups[0].count;
    expect(cloth(dressed({ ...SHIRT, rolled: true }).root)).toBeLessThan(
      cloth(dressed(SHIRT).root) * 0.85
    );
  });
});

describe('a kaftan and a tunic', () => {
  const KAFTAN: Partial<Persona> = { top: 'kaftan', shirt: '#1e5b3a', accent: '#c79a3a' };

  it('embroiders a kaftan down the front and round the cuffs, slit at the throat', () => {
    const { root, m } = dressed(KAFTAN);
    // each in its own copy of the embroidery, so each can lay the motif out to fit
    const embroidered = (o: THREE.Mesh) =>
      o.material instanceof THREE.MeshStandardMaterial &&
      o.material !== m.embroidery &&
      o.material.color.equals(m.embroidery.color);
    const [placket] = named(root, 'placket');
    expect(embroidered(placket)).toBe(true);
    expect(named(root, 'slit')).toHaveLength(1);
    const cuffs = named(root, 'cuff band');
    expect(cuffs).toHaveLength(2);
    for (const c of cuffs) expect(embroidered(c)).toBe(true);
    // the band down the front ends at the middle of the chest
    const ys = points(placket).map((p) => p.y);
    expect(Math.min(...ys)).toBeGreaterThan(0.38);
  });

  it('leaves a tunic plain: open in a V at the neck, nothing embroidered', () => {
    const { root } = dressed({ ...KAFTAN, top: 'tunic' });
    expect(named(root, 'placket')).toHaveLength(0);
    expect(named(root, 'cuff band')).toHaveLength(0);
    expect(named(root, 'neckline')).toHaveLength(2);
  });

  it('gives both full sleeves to the arms', () => {
    for (const top of ['kaftan', 'tunic'] as const)
      for (const arm of named(dressed({ ...KAFTAN, top }).root, 'arm'))
        expect(arm.geometry.groups).toHaveLength(2);
  });
});

describe('a guayabera and a track jacket', () => {
  it('pleats a guayabera down the front either side of its buttons, with a pocket at each breast and hip', () => {
    const { root } = dressed({ top: 'guayabera', shirt: '#ecd9a6' });
    expect(named(root, 'pleat')).toHaveLength(4);
    expect(named(root, 'shirt pocket')).toHaveLength(4);
    // worn open at the neck
    expect(named(root, 'button')).toHaveLength(4);
    expect(named(root, 'collar point')).toHaveLength(2);
    for (const arm of named(root, 'arm')) expect(arm.geometry.groups).toHaveLength(2);
  });

  it('zips a track jacket to the chest over a T-shirt, a yoke across its shoulders in the accent colour', () => {
    const { root, m } = dressed({
      top: 'track',
      shirt: '#d63a1e',
      under: '#c8301c',
      accent: '#1f6b45',
    });
    const [yoke] = named(root, 'yoke');
    expect(yoke.material).toBe(m.accent);
    expect(Math.min(...points(yoke).map((p) => p.y))).toBeGreaterThan(0.54);
    const [tee] = named(root, 'shirt');
    expect(tee.material).toBe(m.under);
    expect(m.under.color.getHexString()).toBe('c8301c');
    expect(named(root, 'zip')).toHaveLength(1);
    expect(named(root, 'zip pull')).toHaveLength(1);
    for (const arm of named(root, 'arm')) expect(arm.geometry.groups).toHaveLength(2);
  });
});

describe('a scoop-necked top', () => {
  it('scoops its neck low in front, showing the collarbones, and gives its long sleeves to the arms', () => {
    const { root } = dressed({ top: 'scoop', shirt: '#1f7a4a' });
    const [shirt] = named(root, 'shirt');
    // nothing of it in the middle of the front above the scoop
    const front = points(shirt).filter((p) => Math.abs(p.x) < 0.02 && p.z < 0);
    expect(Math.max(...front.map((p) => p.y))).toBeLessThan(0.6);
    expect(named(root, 'neckline')).toHaveLength(1);
    for (const arm of named(root, 'arm')) expect(arm.geometry.groups).toHaveLength(2);
  });
});

describe('a basketball jersey, sweatbands and a scarf', () => {
  it('panels a jersey: the front in the shirt’s colour, the rest in the accent, piped round the neck and arms', () => {
    const { root, m } = dressed({ top: 'jersey', shirt: '#f3b61f', accent: '#55267f' });
    const [jersey] = named(root, 'jersey');
    const [panel] = named(root, 'panel');
    expect(jersey.material).toBe(m.accent);
    expect(panel.material).toBe(m.shirt);
    // the neck and both armholes
    expect(named(root, 'piping')).toHaveLength(3);
    // the panel is the front: nothing of it round the back
    for (const p of points(panel)) expect(p.z).toBeLessThan(0.06);
    // and the arms are bare, as a vest leaves them
    for (const arm of named(root, 'arm')) expect(arm.geometry.groups.length).toBeLessThan(2);
  });

  it('puts a sweatband round each wrist, in its colour', () => {
    const { root } = dressed({ wristbands: '#7a3c8c' });
    const bands = named(root, 'wristband');
    expect(bands).toHaveLength(2);
    for (const b of bands)
      expect((b.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('7a3c8c');
    expect(named(dressed({}).root, 'wristband')).toHaveLength(0);
  });

  it('drapes a scarf round the back of the neck, its ends hanging down either side of the chest', () => {
    const { root } = dressed({ ...JACKET, neckwear: 'tee', scarf: '#9fb6d4' });
    const parts = named(root, 'scarf');
    expect(parts).toHaveLength(3);
    const ends = parts.filter((o) => !(o.geometry instanceof THREE.TubeGeometry));
    expect(ends).toHaveLength(2);
    const xs = ends.map((o) => points(o).reduce((a, p) => a + p.x, 0) / points(o).length);
    expect(Math.sign(xs[0])).toBe(-Math.sign(xs[1]));
    for (const e of ends) {
      const ys = points(e).map((p) => p.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.3);
    }
  });
});

describe('a waistcoat, a choker and a word on a T-shirt', () => {
  it('opens a waistcoat over the top, cut away at the arms, trimmed down each front and round each armhole', () => {
    const { root } = dressed({ waistcoat: { cloth: '#141414', trim: '#8a6a3a' } });
    const [coat] = named(root, 'waistcoat');
    // parted down the middle of the front, from the hem to the neck
    expect(points(coat).filter((p) => Math.abs(p.x) < 0.03 && p.z < 0)).toHaveLength(0);
    const trim = named(root, 'trim');
    expect(trim).toHaveLength(4);
    for (const t of trim)
      expect((t.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('8a6a3a');
    expect(named(dressed({}).root, 'waistcoat')).toHaveLength(0);
  });

  it('buttons a waistcoat down the front under a V, pinstriped, with no trim bands', () => {
    const { root } = dressed({
      waistcoat: { cloth: '#3c3c40', trim: '#1a1a1c', buttoned: true, stripes: '#121214' },
    });
    const [coat] = named(root, 'waistcoat');
    const front = points(coat).filter((p) => Math.abs(p.x) < 0.02 && p.z < 0);
    // closed across the middle of the front low down, and open in the V at the neck
    expect(front.some((p) => p.y < 0.4)).toBe(true);
    expect(front.some((p) => p.y > 0.6)).toBe(false);
    expect(named(root, 'button')).toHaveLength(5);
    expect(named(root, 'trim')).toHaveLength(0);
  });

  it('fastens a velvet choker round the throat, a jewel in its colour at the front', () => {
    const { root } = dressed({ figure: 'female', choker: '#a3121e' });
    const [band] = named(root, 'choker');
    const [jewel] = named(root, 'jewel');
    expect((jewel.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('a3121e');
    // at the front of the band, at its height
    expect(jewel.position.z).toBeLessThan(band.position.z);
    expect(Math.abs(jewel.position.y - band.position.y)).toBeLessThan(0.01);
  });

  it('prints a word across the chest, its patch on the front of the shirt', () => {
    const { root } = dressed({ logo: { text: 'stuff', colour: '#f2f2f2' } });
    const [logo] = named(root, 'logo');
    for (const p of points(logo)) {
      expect(p.z).toBeLessThan(0);
      expect(p.y).toBeGreaterThan(0.4);
    }
    // no canvas to draw the letters on in Node: there, not seen
    expect(logo.visible).toBe(false);
  });
});

describe('a mesh vest, gloves and a tam', () => {
  it('knits a mesh vest as an open net, its holes cut out so the skin shows', () => {
    const { m } = dressed({ top: 'vest', shirt: '#3fb4c4', net: true });
    const vest = m.shirt as THREE.MeshPhysicalMaterial;
    expect(vest.alphaTest).toBeGreaterThan(0);
    expect(vest.side).toBe(THREE.DoubleSide);
    expect((dressed({ top: 'vest' }).m.shirt as THREE.MeshPhysicalMaterial).alphaTest).toBe(0);
  });

  it('gloves the hands, without nails, and leaves the arm bare to the wrist', () => {
    const meshes = (o: THREE.Object3D) => {
      let n = 0;
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) n++;
      });
      return n;
    };
    const hands = (root: THREE.Object3D) => root.children.filter((o) => o.name === 'hand');
    const { root, m } = dressed({ gloves: '#141414' });
    expect(hands(root)).toHaveLength(2);
    for (const h of hands(root)) {
      const palm = h.children.find((o): o is THREE.Mesh => o instanceof THREE.Mesh)!;
      expect((palm.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('141414');
      // one pair of gloves, made once for the drummer
      expect(palm.material).toBe(m.glove);
    }
    // a nail on every finger and thumb, bare; none gloved
    expect(meshes(hands(root)[0])).toBe(meshes(hands(dressed({}).root)[0]) - 5);
    // the arm's own surface, to the heel of the hand, is still skin
    for (const arm of named(root, 'arm')) {
      const mats = Array.isArray(arm.material) ? arm.material : [arm.material];
      expect(mats.some((x) => (x as THREE.MeshStandardMaterial).color.equals(m.skin.color))).toBe(
        true
      );
    }
  });

  it('sets a flat cap low on the head, its peak out over the brow, in the accent colour', () => {
    const { root } = dressed({ hat: 'flat', accent: '#eeece6', hairStyle: 'crop' });
    const [crown] = named(root, 'flat cap');
    expect((crown.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('eeece6');
    // over the top of the skull (0.212 up the head), but not much: it is flat
    const top = Math.max(...points(crown).map((p) => p.y));
    expect(top).toBeGreaterThan(0.212 + 0.01);
    expect(top).toBeLessThan(0.212 + 0.05);
    // and the peak is all out in front (-z), over the brow
    const [peak] = named(root, 'peak');
    expect(Math.max(...points(peak).map((p) => p.z))).toBeLessThan(0);
  });

  it('sets a tall tam on the head, its band above the brows, in the accent colour', () => {
    const { root } = dressed({ hat: 'tam', accent: '#8e2a2a', hairStyle: 'bald' });
    const [tam] = named(root, 'tam');
    expect((tam.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('8e2a2a');
    // the band sits above the brows (0.138 up the head) and the crown rises well over the scalp
    expect(tam.position.y).toBeGreaterThan(0.13);
    // the top of the skull is 0.212 up the head
    const top = Math.max(...points(tam).map((p) => p.y));
    expect(top).toBeGreaterThan(0.212 + 0.06);
    // the crochet is laid on by uv: round the crown, and up it from the band to the peak
    const uv = tam.geometry.getAttribute('uv');
    expect(uv).toBeDefined();
    const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
    const vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i));
    expect([Math.min(...us), Math.max(...us)]).toEqual([0, 1]);
    expect([Math.min(...vs), Math.max(...vs)]).toEqual([0, 1]);
  });
});

describe('plaid and tweed', () => {
  it('weaves a check into a plaid shirt, and keeps it on the sleeve as the arm bends', () => {
    const { m } = dressed({
      ...SHIRT,
      shirt: '#e6dcc4',
      plaid: { band: '#8a4b2e', line: '#3a2a22' },
    });
    const shirt = m.shirt as THREE.MeshPhysicalMaterial;
    expect(shirt.userData.check).toMatchObject({
      ground: '#e6dcc4',
      band: '#8a4b2e',
      line: '#3a2a22',
    });
    // white under the check, which colours it
    expect(shirt.color.r).toBeGreaterThan(0.95);
    const sleeve = bentCloth(shirt) as THREE.MeshPhysicalMaterial;
    expect(sleeve).not.toBe(shirt);
    expect(sleeve.userData.check).toEqual(shirt.userData.check);
    expect(sleeve.customProgramCacheKey()).toContain('check-true');
    expect(shirt.customProgramCacheKey()).toContain('check-false');
  });

  it('weaves bold zigzag stripes round a shirt in its colours in turn, and keeps them on the sleeve', () => {
    const colours = ['#4a2c1e', '#a8673f', '#efe2cf', '#d8b4a0'];
    const { m } = dressed({ ...SHIRT, chevron: colours });
    const shirt = m.shirt as THREE.MeshPhysicalMaterial;
    expect(shirt.userData.chevron).toMatchObject({ colours });
    expect(shirt.color.r).toBeGreaterThan(0.95);
    const sleeve = bentCloth(shirt) as THREE.MeshPhysicalMaterial;
    expect(sleeve).not.toBe(shirt);
    expect(sleeve.customProgramCacheKey()).toContain('chevron-true');
    // every colour is in the shader
    const shader = {
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
      uniforms: {},
    } as unknown as THREE.WebGLProgramParametersWithUniforms;
    shirt.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader.match(/if \(k < [\d.]+\) c = vec3\(/g)).toHaveLength(4);
  });

  it('cuts a satin shirt with a sheen a cotton one does not have', () => {
    const sheen = (changes: Partial<Persona>) =>
      (dressed({ ...SHIRT, ...changes }).m.shirt as THREE.MeshPhysicalMaterial).sheen;
    expect(sheen({ satin: true })).toBeGreaterThan(sheen({}));
  });

  it('block-prints a shirt with small motifs in two colours by turns', () => {
    const { m } = dressed({ ...SHIRT, shirt: '#14262b', motifs: ['#d9c08a', '#3e8fb0'] });
    const shirt = m.shirt as THREE.MeshPhysicalMaterial;
    expect(shirt.userData.dots).toMatchObject({
      ground: '#14262b',
      dot: '#d9c08a',
      alt: '#3e8fb0',
    });
    expect(shirt.customProgramCacheKey()).toContain('#3e8fb0');
    // laid out at rest on a sleeve, the second colour kept
    const sleeve = bentCloth(shirt) as THREE.MeshPhysicalMaterial;
    expect(sleeve.userData.dots).toMatchObject({ alt: '#3e8fb0' });
  });

  it('flecks a tweed jacket with specks a few millimetres apart', () => {
    const { m } = dressed({ ...JACKET, shirt: '#6e6b64', fleck: '#b9b4a8' });
    const dots = (m.shirt as THREE.MeshPhysicalMaterial).userData.dots as {
      spacing: number;
      dot: string;
    };
    expect(dots.dot).toBe('#b9b4a8');
    expect(dots.spacing).toBeLessThan(0.01);
  });

  it('keeps a tweed’s flecks on its lapels', () => {
    const { root, m } = dressed({ ...JACKET, shirt: '#6e6b64', fleck: '#b9b4a8' });
    const lapel = named(root, 'lapel')[0].material as THREE.MeshPhysicalMaterial;
    expect(lapel).not.toBe(m.shirt);
    expect(lapel.customProgramCacheKey()).toBe(m.shirt.customProgramCacheKey());
  });
});

describe('dress shoes', () => {
  it('are a boot’s leather, welt and sole cut at the ankle: no shaft up the shin, no flash', () => {
    const { root, m } = dressed({ footwear: 'shoes', shoes: '#111111' });
    expect(named(root, 'shaft')).toHaveLength(0);
    expect(named(root, 'welt')).toHaveLength(4);
    expect(named(root, 'flash')).toHaveLength(0);
    expect(named(root, 'midsole')).toHaveLength(0);
    // polished leather
    expect((m.shoe as THREE.MeshPhysicalMaterial).clearcoat).toBeGreaterThan(0);
  });
});

describe('long hair, grown and hanging', () => {
  const lowest = (o: THREE.SkinnedMesh) => {
    const p = new THREE.Vector3();
    let low = new THREE.Vector3(0, Infinity, 0);
    for (let i = 0; i < o.geometry.getAttribute('position').count; i++) {
      o.getVertexPosition(i, p);
      p.applyMatrix4(o.matrixWorld);
      if (p.y < low.y) low = p.clone();
    }
    return low;
  };

  it('grows curtains from a parting down the middle, combed away from it either side', () => {
    const { root } = dressed({ hairStyle: 'curtains' });
    const hair: THREE.SkinnedMesh[] = [];
    root.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) hair.push(o);
    });
    expect(hair.length).toBeGreaterThan(0);
    const head = root.getObjectByName('head')!;
    const points = hair.flatMap((o) => {
      const pos = o.geometry.getAttribute('position');
      const v = new THREE.Vector3();
      const out: THREE.Vector3[] = [];
      for (let i = 0; i < pos.count; i++) {
        o.getVertexPosition(i, v);
        out.push(head.worldToLocal(v.clone().applyMatrix4(o.matrixWorld)));
      }
      return out;
    });
    // over the top, in front of the crown, the hair lies either side of the parting, close to it,
    // and none on it: the scalp shows down the middle
    const top = points.filter((v) => v.y > 0.2 && v.z < 0);
    expect(top.length).toBeGreaterThan(50);
    expect(top.some((v) => v.x > 0.003 && v.x < 0.03)).toBe(true);
    expect(top.some((v) => v.x < -0.003 && v.x > -0.03)).toBe(true);
    expect(top.filter((v) => Math.abs(v.x) < 0.002)).toEqual([]);
  });

  it("grows Bonham's shag from a crown: a ragged fringe to the brows, short of the eyes", () => {
    const { root } = dressed(LIKENESSES.bonham);
    const head = root.getObjectByName('head')!;
    const v = new THREE.Vector3();
    const points: THREE.Vector3[] = [];
    root.traverse((o) => {
      if (!(o instanceof THREE.SkinnedMesh)) return;
      for (let i = 0; i < o.geometry.getAttribute('position').count; i++)
        points.push(
          head.worldToLocal(o.getVertexPosition(i, v).clone().applyMatrix4(o.matrixWorld))
        );
    });
    // in front of the face over each eye (0.032 either side, 0.115 up, 0.012 round), from the
    // cheekbones up: the locks either side falling past the jaw are not over the eyes
    const overEyes = points.filter(
      (p) => p.z < -0.075 && Math.abs(p.x) > 0.018 && Math.abs(p.x) < 0.045 && p.y > 0.09
    );
    expect(overEyes.length).toBeGreaterThan(20);
    expect(Math.min(...overEyes.map((p) => p.y))).toBeGreaterThan(0.115);
    // a fringe, not a line: its ends at many heights
    const ends = new Set(overEyes.map((p) => Math.round(p.y * 200)));
    expect(ends.size).toBeGreaterThan(5);
  });

  it('hangs onto the shoulders as the head rocks back, rather than swinging through them', () => {
    const who: Persona = { ...BASE, hairStyle: 'curtains' };
    const model = buildDrummer(makeMaterials(who), who);
    const pose = poseAt(new StrokeTimeline(), 1.3, 0);
    Object.assign(pose, { lean: 0, yaw: 0, roll: 0, bob: 0 });
    let hair: THREE.SkinnedMesh | undefined;
    model.root.traverse((o) => {
      if (
        o instanceof THREE.SkinnedMesh &&
        (!hair || o.geometry.index!.count > hair.geometry.index!.count)
      )
        hair = o;
    });
    const head = model.root.getObjectByName('head')!;
    const at = (camera?: THREE.Vector3) => {
      model.update({ ...pose, glance: { ...pose.glance, look: camera ? 1 : 0 } }, camera);
      model.root.updateMatrixWorld(true);
      const p = new THREE.Vector3();
      return Array.from({ length: hair!.geometry.getAttribute('position').count }, (_, i) =>
        hair!.getVertexPosition(i, p).clone().applyMatrix4(hair!.matrixWorld)
      );
    };
    const upright = at();
    const pitch = () => new THREE.Euler().setFromQuaternion(head.quaternion, 'YXZ').x;
    const before = pitch();
    // a camera high above in front: the head looks up at it, tipping back
    const back = at(new THREE.Vector3(0, 4, -1.5));
    expect(Math.abs(pitch() - before)).toBeGreaterThan(0.3);
    // the lengths, below the shoulders' height, stay hanging where they were: a rigid lock
    // 0.2 below the head would have swung back 0.1 or more
    const shoulders = lowest(hair!).y + 0.08;
    const moved = upright
      .map((v, i) => (v.y < shoulders ? Math.hypot(v.x - back[i].x, v.z - back[i].z) : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    expect(moved).toBeLessThan(0.04);
  });
});

describe('glasses', () => {
  it('sets two lenses in rims in front of the eyes, with a bridge and arms back to the ears', () => {
    const { root } = dressed({ glasses: { shape: 'aviator', frame: '#c9a24a', tint: '#b07a3a' } });
    const lenses = named(root, 'lens');
    expect(lenses).toHaveLength(2);
    expect(named(root, 'lens rim')).toHaveLength(2);
    // the bridge and two pieces of each arm
    expect(named(root, 'frame')).toHaveLength(5);
    const lens = lenses[0].material as THREE.MeshPhysicalMaterial;
    expect(lens.transparent).toBe(true);
    expect(lens.side).toBe(THREE.DoubleSide);
    expect(lens.color.getHexString()).toBe('b07a3a');
    // in front of the eyes, which sit 0.086 forward of the head's middle
    for (const l of lenses) expect(l.position.z).toBeLessThan(-0.105);
  });

  it("bridges the lenses across the nose, from each one's inner edge", () => {
    for (const shape of ['aviator', 'round', 'square'] as const) {
      const { root } = dressed({ glasses: { shape, frame: '#222222' } });
      const [bridge] = named(root, 'frame').filter((o) => Math.abs(o.position.x) < 1e-9);
      bridge.geometry.computeBoundingBox();
      const length = bridge.geometry.boundingBox!.max.y - bridge.geometry.boundingBox!.min.y;
      // the lenses' middles are 0.068 apart: the bridge spans only the gap between their edges,
      // not from the top of one to the top of the other
      expect(length).toBeGreaterThan(0.008);
      expect(length).toBeLessThan(0.04);
      // and meets them at or above their middles, not over their tops
      const lens = named(root, 'lens')[0];
      expect(bridge.position.y).toBeGreaterThanOrEqual(lens.position.y - 1e-9);
      expect(bridge.position.y).toBeLessThan(lens.position.y + 0.012);
    }
  });

  it('leaves clear lenses all but invisible, and makes none for a player without glasses', () => {
    const clear = dressed({ glasses: { shape: 'round', frame: '#222222' } }).root;
    const lens = named(clear, 'lens')[0].material as THREE.MeshPhysicalMaterial;
    expect(lens.opacity).toBeLessThan(0.2);
    expect(named(dressed({}).root, 'lens')).toHaveLength(0);
  });

  it.each(['aviator', 'round', 'square'] as const)('cuts a %s lens to its own outline', (shape) => {
    const { root } = dressed({ glasses: { shape, frame: '#222222' } });
    const pts = points(named(root, 'lens')[0]);
    const wide = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const tall = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    if (shape === 'round') expect(wide / tall).toBeCloseTo(1, 1);
    else expect(wide).toBeGreaterThan(tall);
  });
});

describe('hair and beards cut as the drummers wore them', () => {
  const head = (changes: Partial<Persona>) => dressed({ beard: 'none', ...changes }).root;
  const swings = (root: THREE.Object3D) => {
    let n = 0;
    root.traverse((o) => {
      if (o.name === 'hair-swing') n++;
    });
    return n;
  };

  it.each([
    ['mane', true],
    ['mop', false],
    ['swept', true],
    ['receding', false],
    ['rounded', false],
    ['slick', false],
    ['fro', true],
    ['curtains', true],
    ['tousled', false],
    ['pompadour', false],
    ['tied', true],
    ['backswept', true],
    ['ringlets', true],
    ['flowing', true],
    ['capped', true],
  ] as const)('grows %s hair out of the scalp (swinging: %s)', (style, swinging) => {
    const root = head({ hairStyle: style });
    expect(named(root, style)).toHaveLength(1);
    expect(swings(root) > 0).toBe(swinging);
  });

  it('cuts a mop-top blunt and smooth, a mane in clumps', () => {
    // how far the hair's surface wanders off a smooth shell, round its middle
    const rough = (style: Persona['hairStyle']) => {
      const pts = points(named(head({ hairStyle: style }), style)[0]).filter(
        (p) => p.y > 0.14 && p.y < 0.17
      );
      const r = pts.map((p) => Math.hypot(p.x, p.z));
      const mean = r.reduce((a, b) => a + b, 0) / r.length;
      return Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length);
    };
    expect(rough('mop')).toBeLessThan(rough('mane'));
  });

  it('recedes a receding hairline and a slicked one at the temples, and keeps a fro full there', () => {
    // the lowest hair over the temple, a little out from the middle of the brow
    const temple = (style: Persona['hairStyle']) =>
      Math.min(
        ...points(named(head({ hairStyle: style }), style)[0])
          .filter((p) => p.z < -0.06 && Math.abs(p.x) > 0.04 && Math.abs(p.x) < 0.06)
          .map((p) => p.y)
      );
    expect(temple('receding')).toBeGreaterThan(temple('fro') + 0.02);
    expect(temple('slick')).toBeGreaterThan(temple('fro') + 0.01);
  });

  const beardPoints = (beard: Persona['beard']) => {
    const out: THREE.Vector3[] = [];
    head({ hairStyle: 'bald', beard }).traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.name !== 'beard') return;
      const geo = o.geometry as THREE.BufferGeometry;
      const p = geo.getAttribute('position');
      const hair = geo.getAttribute('color');
      for (const i of new Set(geo.getIndex()?.array ?? []))
        if (hair.getW(i) > 0.05) out.push(new THREE.Vector3().fromBufferAttribute(p, i));
    });
    return out;
  };

  it('trims a short beard close: over the same jaw as a full one, hanging far less below it', () => {
    const low = (pts: THREE.Vector3[]) => Math.min(...pts.map((p) => p.y));
    const short = beardPoints('short');
    expect(short.length).toBeGreaterThan(500);
    expect(low(short)).toBeGreaterThan(low(beardPoints('full')) + 0.015);
  });

  it('draws a pencil moustache as a line over the lip, narrower than a moustache', () => {
    const tall = (pts: THREE.Vector3[]) =>
      Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    const pencil = beardPoints('pencil');
    expect(pencil.length).toBeGreaterThan(10);
    expect(tall(pencil)).toBeLessThan(tall(beardPoints('moustache')) * 0.7);
  });

  it('lifts a black hair’s sheen toward white far less than a fair one’s', () => {
    // how far toward white the sheen is lifted, as a share of the way
    const lift = (hex: string) => {
      const c = new THREE.Color(hex);
      return (hairSheen(c, 0.35).r - c.r) / (1 - c.r);
    };
    expect(lift('#c9a060')).toBeCloseTo(0.35, 5);
    expect(lift('#141010')).toBeLessThan(lift('#c9a060') / 2);
  });
});

describe('a kit of see-through acrylic', () => {
  it('lets the light through its shells, and gives it back to the next kit', () => {
    const m = makeMaterials(LIKENESSES.bonham);
    expect(m.shell.transmission).toBeGreaterThan(0.5);
    expect(m.shell.thickness).toBeGreaterThan(0);
    expect(m.shell.ior).toBeCloseTo(1.49, 5);
    styleKit(m, BASE);
    expect(m.shell.transmission).toBe(0);
    expect(m.shell.thickness).toBe(0);
  });

  it('makes any kit see-through in its own colour, and gives it its own finish back', () => {
    const m = makeMaterials(LIKENESSES.copeland);
    const own = m.shell.color.clone();
    expect(m.shell.transmission).toBe(0);
    styleKit(m, LIKENESSES.copeland, true);
    expect(m.shell.transmission).toBeGreaterThan(0.5);
    expect(m.shell.thickness).toBeGreaterThan(0);
    // the same hue, lifted from near black to a smoked acrylic that can be seen into
    const [was, now] = [
      { h: 0, s: 0, l: 0 },
      { h: 0, s: 0, l: 0 },
    ];
    own.getHSL(was);
    m.shell.color.getHSL(now);
    expect(now.h).toBeCloseTo(was.h, 2);
    expect(now.l).toBeGreaterThan(was.l);
    styleKit(m, LIKENESSES.copeland);
    expect(m.shell.transmission).toBe(0);
    expect(m.shell.color.equals(own)).toBe(true);
    // a dotted kit gives its print up for the clear shell
    const dotted = PERSONAS.find((p) => p.kit.dots);
    if (dotted) {
      const d = makeMaterials(dotted);
      styleKit(d, dotted, true);
      expect(d.shell.userData.dots).toBeUndefined();
    }
    // a Vistalite is see-through either way
    const b = makeMaterials(LIKENESSES.bonham);
    styleKit(b, LIKENESSES.bonham, true);
    expect(b.shell.transmission).toBeGreaterThan(0.5);
  });
});
