// @vitest-environment happy-dom

/**
 * The textures `parts.ts` draws onto a canvas — the cymbals' lathing, a
 * sparkle kit's metal flake, a beast's fur — which only exist where there is
 * a canvas to draw on. `parts.test.ts` runs in Node and sees them fall back
 * to none; here a browser-like environment hands them a 2D context, a small
 * recording stand-in for the one a browser gives (happy-dom has none), so
 * what they draw and how the textures are set up is checked for real.
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FRONT_HEAD_ART, type FrontHeadPaths } from '@/components/app/studio/drummer/front-heads';
import {
  disposeMaterials,
  kickLogoTexture,
  makeMaterials,
  styleKit,
} from '@/components/app/studio/drummer/parts';
import { LIKENESSES } from '@/lib/app/breaks/drummer/likenesses';
import { PERSONAS } from '@/lib/app/breaks/drummer/personas';

/** What a 2D context was asked to draw: rects, arcs, lines, curves and strokes, by count. */
interface Drawn {
  rects: number;
  arcs: number;
  lines: number;
  curves: number;
  strokes: number;
  /** Each character written, with the colour it was written in. */
  text: { ch: string; colour: string }[];
  /** Each fill of a path: its colour and fill rule. */
  fills: { colour: string; rule?: string }[];
  /** Outlines closed. */
  closes: number;
  /** Rect fills' colours, in order. */
  rectColours: string[];
}

let drawn: Drawn;

beforeEach(() => {
  drawn = {
    rects: 0,
    arcs: 0,
    lines: 0,
    curves: 0,
    strokes: 0,
    text: [],
    fills: [],
    closes: 0,
    rectColours: [],
  };
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    fillRect(this: { fillStyle: string }) {
      drawn.rects++;
      drawn.rectColours.push(this.fillStyle);
    },
    fill(this: { fillStyle: string }, rule?: string) {
      drawn.fills.push({ colour: this.fillStyle, rule });
    },
    closePath: () => void drawn.closes++,
    scale: () => undefined,
    beginPath: () => undefined,
    arc: () => void drawn.arcs++,
    moveTo: () => undefined,
    lineTo: () => void drawn.lines++,
    quadraticCurveTo: () => void drawn.curves++,
    bezierCurveTo: () => void drawn.curves++,
    stroke: () => void drawn.strokes++,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save: () => undefined,
    restore: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    measureText: (t: string) => ({ width: 50 * t.length }),
    fillText(ch: string) {
      drawn.text.push({ ch, colour: this.fillStyle });
    },
    strokeText: () => void drawn.strokes++,
    ellipse: () => void drawn.arcs++,
    lineJoin: 'miter',
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: () => void drawn.rects++,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const byId = (id: string) => PERSONAS.find((p) => p.id === id)!;

describe('canvas textures', () => {
  it('laths the cymbals: rings round the middle, as bump and roughness', () => {
    const m = makeMaterials(byId('original'));
    expect(m.bronze.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(m.bronze.roughnessMap).toBe(m.bronze.bumpMap);
    expect(m.bronze.bumpMap!.colorSpace).toBe(THREE.NoColorSpace);
    // a ring every pixel and a half out to the edge of a 512 canvas
    expect(drawn.arcs).toBeGreaterThan(150);
  });

  it('gives a sparkle kit a fine scatter of flake under the lacquer, tiled round the shell', () => {
    const m = makeMaterials(byId('roxy'));
    const flake = m.shell.bumpMap!;
    expect(flake).toBeInstanceOf(THREE.CanvasTexture);
    expect(m.shell.roughnessMap).toBe(flake);
    expect(flake.wrapS).toBe(THREE.RepeatWrapping);
    expect(flake.repeat.x).toBeGreaterThan(flake.repeat.y);
    expect(flake.colorSpace).toBe(THREE.NoColorSpace);
  });

  it('gives a gloss, satin or metal kit no flake', () => {
    for (const id of ['original', 'raj', 'brassbot']) {
      expect(makeMaterials(byId(id)).shell.bumpMap).toBeNull();
    }
  });

  it('keeps one flake across sparkle kits, and frees it when the next kit is not sparkle', () => {
    const m = makeMaterials(byId('roxy'));
    const flake = m.shell.bumpMap!;
    const freed = vi.fn();
    flake.addEventListener('dispose', freed);
    styleKit(m, byId('lola'));
    expect(m.shell.bumpMap).toBe(flake);
    expect(freed).not.toHaveBeenCalled();
    styleKit(m, byId('original'));
    expect(m.shell.bumpMap).toBeNull();
    expect(m.shell.roughnessMap).toBeNull();
    expect(freed).toHaveBeenCalledOnce();
    // and back to sparkle: a new one
    styleKit(m, byId('roxy'));
    expect(m.shell.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(m.shell.bumpMap).not.toBe(flake);
  });

  it('coats a beast in fur: thousands of short hairs, tiled, in its own colour', () => {
    const beast = byId('bigfuzz');
    const before = drawn.lines;
    const m = makeMaterials(beast);
    const fur = (m.skin as THREE.MeshPhysicalMaterial).map!;
    expect(fur).toBeInstanceOf(THREE.CanvasTexture);
    expect(fur.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(fur.wrapS).toBe(THREE.RepeatWrapping);
    expect((m.skin as THREE.MeshPhysicalMaterial).bumpMap).toBe(fur);
    // every furred material draws its own coat
    expect(drawn.lines - before).toBeGreaterThan(3000);
    // the coat's hairs average under white: the colour is lifted to make up for it
    expect(m.skin.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(
      new THREE.Color(beast.skin).getHSL({ h: 0, s: 0, l: 0 }).l
    );
  });

  it('draws hair as long strands running root to tip, with its highlight stretched across them', async () => {
    // a fresh copy of the module: the strands are drawn once and kept, and an earlier test
    // here may already have drawn them
    vi.resetModules();
    const fresh = await import('@/components/app/studio/drummer/parts');
    const who = { ...byId('original'), hair: '#5a3a22' };
    const before = drawn.curves;
    const m = fresh.makeMaterials(who);
    const hair = m.hair as THREE.MeshPhysicalMaterial;
    expect(hair.map).toBeInstanceOf(THREE.CanvasTexture);
    expect(hair.bumpMap).toBe(hair.map);
    expect(hair.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(drawn.curves - before).toBeGreaterThan(5000);
    // drawn once: the next player's hair is a texture of the same strands, not a redraw
    const drawnOnce = drawn.curves;
    const next = fresh.makeMaterials(byId('roxy')).hair as THREE.MeshPhysicalMaterial;
    expect(drawn.curves).toBe(drawnOnce);
    expect(next.map).not.toBe(hair.map);
    expect(next.map!.image).toBe(hair.map!.image);
    // the highlight runs across the strands, which run along v
    expect(hair.anisotropy).toBeGreaterThan(0.5);
    expect(hair.anisotropyRotation).toBeCloseTo(Math.PI / 2, 9);
    // lifted to make up for the strands averaging under white
    expect(hair.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(
      new THREE.Color(who.hair).getHSL({ h: 0, s: 0, l: 0 }).l
    );
  });

  it('weaves a T-shirt in a knit and trousers in a twill, each drawn once and shared', async () => {
    // a fresh copy of the module: the weaves are drawn once and kept
    vi.resetModules();
    const fresh = await import('@/components/app/studio/drummer/parts');
    const rects = drawn.rects;
    const lines = drawn.lines;
    const m = fresh.makeMaterials(byId('original'));
    const shirt = m.shirt as THREE.MeshPhysicalMaterial;
    const jeans = m.jeans as THREE.MeshPhysicalMaterial;
    expect(shirt.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(jeans.bumpMap).toBeInstanceOf(THREE.CanvasTexture);
    expect(shirt.bumpMap!.image).not.toBe(jeans.bumpMap!.image);
    // the knit's stitches are little rects; the twill's ribs are lines on the diagonal
    expect(drawn.rects - rects).toBeGreaterThan(1000);
    expect(drawn.lines - lines).toBeGreaterThan(80);
    // drawn once: the next player's cloth is a texture of the same weave, not a redraw
    const drawnOnce = drawn.lines;
    const next = fresh.makeMaterials(byId('roxy'));
    expect(drawn.lines).toBe(drawnOnce);
    expect((next.shirt as THREE.MeshPhysicalMaterial).bumpMap!.image).toBe(shirt.bumpMap!.image);
    expect((next.jeans as THREE.MeshPhysicalMaterial).bumpMap!.image).toBe(jeans.bumpMap!.image);
    // lifted by all the weave takes off, in linear light: its canvas averages about 0.63 of white
    const asked = new THREE.Color(byId('original').shirt);
    expect(shirt.color.r / asked.r).toBeGreaterThan(1.5);
    expect(shirt.color.r / asked.r).toBeLessThan(1.7);
    const trousers = new THREE.Color(byId('original').trousers);
    expect(jeans.color.g / trousers.g).toBeGreaterThan(1.5);
  });

  it('weaves a button-up in a fine poplin, not a T-shirt’s knit', async () => {
    vi.resetModules();
    const fresh = await import('@/components/app/studio/drummer/parts');
    const tee = fresh.makeMaterials(byId('original')).shirt as THREE.MeshPhysicalMaterial;
    const rects = drawn.rects;
    const who = PERSONAS.find((p) => p.top === 'button-up')!;
    const shirt = fresh.makeMaterials(who).shirt as THREE.MeshPhysicalMaterial;
    // a weave of its own, drawn thread by thread
    expect(shirt.bumpMap!.image).not.toBe(tee.bumpMap!.image);
    expect(drawn.rects - rects).toBeGreaterThan(8000);
    // lifted for what the weave takes off, as the knit is
    const asked = new THREE.Color(who.shirt);
    expect(shirt.color.r / asked.r).toBeGreaterThan(1.5);
    expect(shirt.color.r / asked.r).toBeLessThan(1.7);
  });

  it('makes boots of leather, with a gloss of polish', () => {
    const who = PERSONAS.find((p) => p.footwear === 'boots')!;
    const shoe = makeMaterials(who).shoe as THREE.MeshPhysicalMaterial;
    expect(shoe).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(shoe.clearcoat).toBeGreaterThan(0);
  });

  it('frees every texture it drew with the materials', () => {
    const m = makeMaterials(byId('bigfuzz'));
    const textures = [m.bronze.bumpMap, m.skin.map, m.shell.bumpMap].filter(
      (t): t is THREE.Texture => !!t
    );
    expect(textures.length).toBeGreaterThanOrEqual(3);
    const freed = textures.map((t) => {
      const f = vi.fn();
      t.addEventListener('dispose', f);
      return f;
    });
    disposeMaterials(m);
    for (const f of freed) expect(f).toHaveBeenCalled();
  });

  it('writes the name twice round the kick’s front head, BEAT in cream and BREAKER in brass', () => {
    const tex = kickLogoTexture();
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    // the two brass rings the name runs between, and a small one in the middle
    expect(drawn.arcs).toBe(3);
    const written = drawn.text.map((t) => t.ch).join('');
    expect(written).toBe('BEATBREAKER • BEATBREAKER • ');
    const colourOf = (ch: string) => drawn.text.find((t) => t.ch === ch)!.colour;
    expect(colourOf('T')).toBe('#ece6d6');
    expect(colourOf('K')).toBe('#dba644');
  });

  it("paints a player's own front head in place of the name: the art in its ink on its ground", () => {
    const head = { art: 'sly-and-the-family-stone', ground: '#f1ede4', ink: '#141414' } as const;
    const tex = kickLogoTexture(head);
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    // no BeatBreaker: no name round it, no brass rings
    expect(drawn.text).toEqual([]);
    expect(drawn.arcs).toBe(0);
    expect(drawn.rectColours).toEqual(['#f1ede4']);
    // every outline of the lettering, curved, closed and filled once, even-odd so the counters stay open
    const art = FRONT_HEAD_ART['sly-and-the-family-stone'] as FrontHeadPaths;
    expect(drawn.closes).toBe(art.paths.length);
    expect(drawn.curves).toBeGreaterThan(art.paths.length);
    expect(drawn.fills).toEqual([{ colour: '#141414', rule: 'evenodd' }]);
    // turned the right way up, as BeatBreaker's is
    expect(tex!.rotation).toBe(Math.PI);
  });

  it('paints the Sgt. Pepper drum in its own colours: the name round it, LONELY HEARTS across', () => {
    const head = { art: 'sgt-pepper', ground: '#f1e8cf', ink: '#2a1a12' } as const;
    const tex = kickLogoTexture(head);
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(drawn.rectColours[0]).toBe('#f1e8cf');
    // each letter's face is written once in yellow, over its red shading
    const faces = drawn.text
      .filter((t) => t.colour === '#f3c42f')
      .map((t) => t.ch)
      .join('');
    expect(faces).toBe('Sgt PEPPERSCLUB BAND');
    expect(drawn.text.filter((t) => t.colour === '#c3322a').length).toBeGreaterThan(100);
    expect(drawn.text.find((t) => t.ch === 'LONELY HEARTS')?.colour).toBe('#a88f2f');
    // outlined in the ink, and the ornament drawn in curves
    expect(drawn.strokes).toBeGreaterThan(20);
    expect(drawn.curves).toBeGreaterThan(10);
    expect(tex!.rotation).toBe(Math.PI);
  });

  it('draws nothing, and falls back to no texture, where the canvas gives no context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const m = makeMaterials(byId('roxy'));
    expect(m.bronze.bumpMap).toBeNull();
    expect(m.shell.bumpMap).toBeNull();
    expect(kickLogoTexture()).toBeNull();
  });
});

describe('an oyster pearl wrap', () => {
  it('swirls pale bands through a dark ground, kept across oyster kits and freed after', () => {
    const m = makeMaterials(LIKENESSES.mitchell);
    const pearl = m.shell.map!;
    expect(pearl).toBeInstanceOf(THREE.CanvasTexture);
    expect(pearl.colorSpace).toBe(THREE.SRGBColorSpace);
    // the ground lifted for the bands to show through it
    expect(m.shell.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(
      new THREE.Color(LIKENESSES.mitchell.kit.shell).getHSL({ h: 0, s: 0, l: 0 }).l
    );
    const freed = vi.fn();
    pearl.addEventListener('dispose', freed);
    styleKit(m, LIKENESSES.mitchell);
    expect(m.shell.map).toBe(pearl);
    styleKit(m, byId('original'));
    expect(m.shell.map).toBeNull();
    expect(freed).toHaveBeenCalledOnce();
    expect(m.shell.color.getHexString()).toBe(byId('original').kit.shell.slice(1));
  });
});
