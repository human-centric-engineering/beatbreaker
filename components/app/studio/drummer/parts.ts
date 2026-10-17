import * as THREE from 'three';

import {
  type Finish,
  type Hardware,
  PERSONAS,
  type Persona,
} from '@/lib/app/breaks/drummer/personas';

/**
 * Shared bits for building the drummer scene out of primitives
 * (experiment: the drummer view): the materials, and placing a limb between
 * two joints. Nothing is loaded from the network — the CSP's `connect-src
 * 'self'` would refuse a model or an HDRI from a CDN, and a procedural rig is
 * one the stroke planner can drive joint by joint without a skeleton to fit.
 */

export interface Materials {
  shell: THREE.MeshPhysicalMaterial;
  head: THREE.MeshStandardMaterial;
  /** The kit's hardware: chrome, unless the player's kit is blacked out or gold. */
  chrome: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  felt: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  jeans: THREE.MeshStandardMaterial;
  shoe: THREE.MeshStandardMaterial;
  sole: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  /** The whites of the eyes. */
  sclera: THREE.MeshStandardMaterial;
  /** The persona's loud colour: a headband, a mohawk's tips. */
  accent: THREE.MeshStandardMaterial;
  /** Jewellery: earrings, a chain. */
  gold: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  lips: THREE.MeshStandardMaterial;
  /** A cyborg's metal, where skin would be. */
  metal: THREE.MeshStandardMaterial;
  /** A cyborg's lights: eyes and joints, in the loud colour. */
  glow: THREE.MeshStandardMaterial;
  /** A dinner jacket's shirt, under it; the shirt's own cloth when there is no jacket. */
  under: THREE.MeshStandardMaterial;
  /** Braces over the shirt. */
  braces: THREE.MeshStandardMaterial;
  /** A smock's gold emblem: glitter. */
  emblem: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  /** The band round the mat's edge. */
  trim: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
}

/**
 * Concentric lathing for the cymbals, drawn once onto a canvas. Without it a
 * cymbal is a flat gold dish; with it the light runs round it the way it does
 * on bronze. Skipped where there is no canvas (the tests run in Node).
 */
function lathingTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = size / 2;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let r = 4; r < c; r += 1.6) {
    const shade = 110 + Math.round(40 * Math.sin(r * 1.7) + 25 * Math.sin(r * 0.31));
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * The kick's front head: black, with the name running round it in a ring
 * between two brass lines — "BEAT" in cream and "BREAKER" in brass, as the
 * wordmark sets it, twice round. Drawn once onto a canvas; skipped where
 * there is no canvas (the tests run in Node).
 */
export function kickLogoTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = size / 2;
  const cream = '#ece6d6';
  const brass = '#dba644';
  ctx.fillStyle = '#17181b';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = brass;
  ctx.lineWidth = 8;
  // (and a small one in the middle, where the head moves most)
  for (const r of [470, 330, 70]) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.font = '700 92px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyphs: { ch: string; colour: string }[] = [];
  for (let i = 0; i < 2; i++)
    for (const [word, colour] of [
      ['BEAT', cream],
      ['BREAKER', brass],
      ['•', cream],
    ] as const)
      for (const ch of word === '•' ? ` ${word} ` : word) glyphs.push({ ch, colour });
  // the letters' own widths as angles round the ring, and what is left over shared between them
  const R = 400;
  const turns = glyphs.map((g) => ctx.measureText(g.ch).width / R);
  const gap = Math.max(0, (Math.PI * 2 - turns.reduce((a, b) => a + b, 0)) / glyphs.length);
  // the first name centred at the top
  const name = 'BEATBREAKER'.length;
  const span = turns.slice(0, name).reduce((a, b) => a + b, 0) + gap * (name - 1);
  let at = -Math.PI / 2 - span / 2;
  glyphs.forEach((g, i) => {
    const a = at + turns[i] / 2;
    ctx.save();
    ctx.translate(c + R * Math.cos(a), c + R * Math.sin(a));
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = g.colour;
    ctx.fillText(g.ch, 0, 0);
    ctx.restore();
    at += turns[i] + gap;
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // the head is laid face out with its canvas upside down: turn it the right way up
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI;
  return tex;
}

/**
 * Metal flake for a sparkle finish, drawn once onto a canvas: a fine scatter
 * of specks, each catching the light at its own angle under the lacquer.
 * Skipped where there is no canvas (the tests run in Node).
 */
function flakeTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 0, size, size);
  // seeded, so every sparkle kit glitters the same way
  let seed = 0x51ab;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 2600; i++) {
    const shade = Math.round(rnd() * 255);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * Skin: soft rather than plastic — a little sheen, warm, at the edges where
 * light passes through it, the way it does on a cheek or a knuckle.
 */
function skinMaterial(color: string): THREE.MeshPhysicalMaterial {
  const skin = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.5,
    // skin reflects less than most dielectrics: its F0 is nearer 0.028 than 0.04
    specularIntensity: 0.7,
    sheen: 0.3,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#ff8a6a'),
  });
  skinDetail(skin);
  return skin;
}

/** The attribute a bent mesh keeps each point's rest position in, for {@link skinDetail}. */
export const SKIN_REST = 'skinRest';

/** How deep the pores and fine creases of the skin are, metres. */
const PORE_DEPTH = 0.00008;

/**
 * What makes skin read as skin rather than painted plastic, added to `mat`'s
 * shader: its colour mottled a little, warmer and cooler in patches a
 * centimetre or two across; fine pores and creases catching the light; its
 * sheen broken up, oilier in places than others; and the light that goes
 * into it coming back out warm, so its shadows run toward red rather than
 * grey, the way light scattered under skin does.
 *
 * The detail is laid out in the mesh's own frame at its own scale, in
 * metres, so it is the same size on every part of the body and moves with
 * it rather than swimming over it; and it fades out where it would be finer
 * than a pixel, so it never sparkles from across the room. A mesh that is
 * bent by moving its points each frame (an arm, the neck) is `bent`: its
 * detail is laid out where each point is at rest, in its {@link SKIN_REST}
 * attribute, so it stays on the skin as it bends.
 */
export function skinDetail(mat: THREE.MeshPhysicalMaterial, bent = false): void {
  const at = bent ? SKIN_REST : 'position';
  mat.userData.skinDetail = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSkin;${bent ? `\nattribute vec3 ${SKIN_REST};` : ''}`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vSkin = ${at} * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSkin;
        float skinHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float skinNoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(skinHash(i), skinHash(i + vec3(1, 0, 0)), f.x),
                mix(skinHash(i + vec3(0, 1, 0)), skinHash(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(skinHash(i + vec3(0, 0, 1)), skinHash(i + vec3(1, 0, 1)), f.x),
                mix(skinHash(i + vec3(0, 1, 1)), skinHash(i + vec3(1, 1, 1)), f.x), f.y),
            f.z);
        }
        // how much of detail this fine (cells per metre) a pixel can show
        float skinShows(float perMetre) {
          float pixel = length(fwidth(vSkin));
          return 1.0 - smoothstep(0.25, 0.7, pixel * perMetre);
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float blotch = 0.6 * skinNoise(vSkin * 38.0) + 0.4 * skinNoise(vSkin * 120.0 + 7.0);
        diffuseColor.rgb *= mix(vec3(1.045, 0.965, 0.955), vec3(0.965, 1.01, 1.02), blotch);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(
          roughnessFactor + 0.16 * (skinNoise(vSkin * 60.0 + 3.0) - 0.5)
            + 0.1 * (skinNoise(vSkin * 400.0) - 0.5) * skinShows(400.0),
          0.0, 1.0);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float h = (0.65 * skinNoise(vSkin * 700.0) * skinShows(700.0)
            + 0.35 * skinNoise(vSkin * 1900.0 + 11.0) * skinShows(1900.0)) * ${PORE_DEPTH.toFixed(6)};
          vec3 dpx = dFdx(-vViewPosition);
          vec3 dpy = dFdy(-vViewPosition);
          vec3 r1 = cross(dpy, normal);
          vec3 r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          normal = normalize(abs(det) * normal - grad);
        }`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse *= vec3(1.12, 0.95, 0.9);`
      );
  };
  mat.customProgramCacheKey = () => (bent ? 'skin-bent' : 'skin');
}

/**
 * The skin of a mesh bent by moving its points each frame, keeping each
 * point's rest position for its detail (see {@link skinDetail}): `skin`
 * itself when it has no detail to keep still (a cyborg's metal, a beast's fur).
 */
export function bentSkin(skin: THREE.Material): THREE.Material {
  if (!(skin instanceof THREE.MeshPhysicalMaterial) || skin.userData.skinDetail !== true)
    return skin;
  const bent = skin.clone();
  skinDetail(bent, true);
  return bent;
}

/** The attribute a bent mesh keeps each point's rest normal in, for {@link printDots}. */
export const REST_NORMAL = 'restNormal';

/** Dots printed on a cloth: their colour on the ground's, `spacing` apart and `radius` round, metres. */
export interface Dots {
  ground: string;
  dot: string;
  spacing: number;
  radius: number;
}

/** A colour as a GLSL `vec3`, in the linear light the shader works in. */
const glsl = (c: string) => {
  const { r, g, b } = new THREE.Color(c);
  return `vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)})`;
};

/**
 * Print polka dots on a cloth, in `mat`'s shader: round, all one size,
 * evenly spread, and laid out in the mesh's own frame at its own scale, in
 * metres — so a dot is the same size on a sleeve as on a trouser leg, and
 * moves with the cloth rather than swimming over it.
 *
 * The dots are a lattice in space: the surface takes a dot wherever a lattice
 * point lies within half a cell of it, drawn as a disc in the surface's own
 * plane, so a dot is round however the cloth is turned, and one layer of
 * points is as many dots as a flat sheet would have. A bent mesh (an arm)
 * lays them out where each point is at rest, from its {@link SKIN_REST} and
 * {@link REST_NORMAL} attributes, so they stay on the sleeve as it bends.
 */
export function printDots(mat: THREE.MeshPhysicalMaterial, dots: Dots, bent = false): void {
  mat.userData.dots = dots;
  const at = bent ? SKIN_REST : 'position';
  const facing = bent ? REST_NORMAL : 'normal';
  const { spacing, radius } = dots;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vDotAt;
        varying vec3 vDotFacing;${bent ? `\nattribute vec3 ${SKIN_REST};\nattribute vec3 ${REST_NORMAL};` : ''}`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vDotAt = ${at} * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
        vDotFacing = ${facing};`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vDotAt;
        varying vec3 vDotFacing;
        // how far, in cells, from the centre of the nearest dot in the surface's plane
        float dotFar(vec3 p, vec3 n) {
          vec3 q = p / ${spacing.toFixed(5)};
          vec3 b = floor(q);
          float near = 1e9;
          for (int x = -1; x <= 1; x++)
            for (int y = -1; y <= 1; y++)
              for (int z = -1; z <= 1; z++) {
                vec3 d = b + vec3(float(x), float(y), float(z)) + 0.5 - q;
                float h = dot(d, n);
                if (abs(h) < 0.5) near = min(near, length(d - n * h));
              }
          return near;
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float far = dotFar(vDotAt, normalize(vDotFacing));
          float edge = max(fwidth(far), 1e-4);
          float inDot = 1.0 - smoothstep(${(radius / spacing).toFixed(4)} - edge, ${(radius / spacing).toFixed(4)} + edge, far);
          diffuseColor.rgb *= mix(${glsl(dots.ground)}, ${glsl(dots.dot)}, inDot);
        }`
      );
  };
  mat.customProgramCacheKey = () => `dots-${bent}-${spacing}-${radius}-${dots.ground}-${dots.dot}`;
}

/**
 * Cloth on a mesh bent by moving its points each frame (a sleeve): a copy of
 * `mat` with its dots laid out where each point is at rest; `mat` itself when
 * it is plain.
 */
export function bentCloth(mat: THREE.Material): THREE.Material {
  const dots: unknown = mat.userData.dots;
  if (!(mat instanceof THREE.MeshPhysicalMaterial) || !isDots(dots)) return mat;
  const bent = mat.clone();
  printDots(bent, dots, true);
  return bent;
}

function isDots(x: unknown): x is Dots {
  return typeof x === 'object' && x !== null && 'spacing' in x && 'radius' in x;
}

/** A cyborg's plating: brushed gunmetal unless they say otherwise, with a lacquer the lights run along. */
function metalMaterial(color = '#9aa3ad'): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.85,
    roughness: 0.32,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
  });
}

/**
 * Fur, drawn once onto a canvas: thousands of short hairs, light and dark,
 * lying mostly one way. Skipped where there is no canvas (the tests run in Node).
 */
function furTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, size, size);
  // seeded, so every beast's coat is the same coat
  let seed = 0x2f6b;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 5 + rnd() * 12;
    const a = Math.PI / 2 + (rnd() - 0.5) * 0.7;
    const shade = 60 + Math.round(rnd() * 150);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A coat of fur: matt, shaggy to the touch of the light, soft at the edges. */
export function furMaterial(color: string): THREE.MeshPhysicalMaterial {
  const fur = furTexture();
  return new THREE.MeshPhysicalMaterial({
    // the coat's hairs average a little under white: lift the colour back to what was asked
    color: new THREE.Color(color).multiplyScalar(fur ? 1.3 : 1),
    roughness: 1,
    map: fur,
    bumpMap: fur,
    bumpScale: 2.5,
    sheen: 0.45,
    sheenRoughness: 0.9,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.2),
  });
}

/** The strands drawn for the hair, kept: they are the same for everyone, and costly to draw. */
let hairStrands: HTMLCanvasElement | null = null;

/**
 * Hair, drawn once onto a canvas: thousands of long fine strands running up
 * and down it (along `v`, which runs root to tip on the hair's geometry),
 * light and dark, wandering a little, with darker partings between clumps.
 * Drawn the first time it is wanted and kept, each texture made from it after
 * that (a new player seated, the kit's own set of materials) sharing it.
 * Skipped where there is no canvas (the tests run in Node).
 */
function hairTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = hairStrands ?? drawHair();
  if (!canvas) return null;
  hairStrands = canvas;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawHair(): HTMLCanvasElement | null {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(0, 0, size, size);
  // seeded, so the same hair every time
  let seed = 0x51ed;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  ctx.lineCap = 'round';
  // the partings between clumps first, darker, so the strands lie over them
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    ctx.strokeStyle = `rgba(30,30,30,${0.25 + rnd() * 0.3})`;
    ctx.lineWidth = 2 + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(
      x + (rnd() - 0.5) * 30,
      size / 3,
      x + (rnd() - 0.5) * 30,
      size / 1.5,
      x,
      size + 10
    );
    ctx.stroke();
  }
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 40 + rnd() * 180;
    const bend = (rnd() - 0.5) * 10;
    const shade = 45 + Math.round(rnd() * 190);
    ctx.strokeStyle = `rgba(${shade},${shade},${shade},${0.5 + rnd() * 0.5})`;
    ctx.lineWidth = 0.5 + rnd() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + bend, y + len / 2, x + bend * 0.4, y + len);
    ctx.stroke();
    // wrapped, so the strands run on across the seam
    if (y + len > size) {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x + bend, y - size + len / 2, x + bend * 0.4, y - size + len);
      ctx.stroke();
    }
  }
  return canvas;
}

/**
 * Hair: strands drawn into it, and the long, stretched highlight hair has —
 * a band of light across the strands, not a spot — from shading it
 * anisotropically along them, with a soft sheen at the edges.
 */
export function hairMaterial(color: string): THREE.MeshPhysicalMaterial {
  const strands = hairTexture();
  return new THREE.MeshPhysicalMaterial({
    // the strands average a little under white: lift the colour back to what was asked
    color: new THREE.Color(color).multiplyScalar(strands ? 1.25 : 1),
    roughness: 0.5,
    map: strands,
    bumpMap: strands,
    bumpScale: 1.2,
    // the highlight runs across the strands, which run along `v`
    anisotropy: 0.75,
    anisotropyRotation: Math.PI / 2,
    sheen: 0.5,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35),
  });
}

/**
 * How a cloth is made: a T-shirt's knit, a shirt's poplin — a fine, tight
 * plain weave — or the diagonal twill of jeans and chinos.
 */
export type Weave = 'knit' | 'poplin' | 'twill';

/** Each weave as drawn, kept: the same for everyone. */
const weaves: Partial<Record<Weave, HTMLCanvasElement>> = {};

/**
 * A weave, drawn once onto a canvas: a knit's columns of little stitches, a
 * poplin's threads over and under one another in a fine check, or a twill's ribs running on the diagonal with the odd thicker thread (a slub)
 * across them, light and dark. Skipped where there is no canvas (the tests
 * run in Node).
 */
function weaveTexture(kind: Weave): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = weaves[kind] ?? drawWeave(kind);
  if (!canvas) return null;
  weaves[kind] = canvas;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  const [u, v] = { knit: [22, 16], poplin: [14, 10], twill: [12, 10] }[kind];
  tex.repeat.set(u, v);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawWeave(kind: Weave): HTMLCanvasElement | null {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(0, 0, size, size);
  // seeded, so the same cloth every time
  let seed = { knit: 0x4b1d, poplin: 0x9091, twill: 0x7a11 }[kind];
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  if (kind === 'knit') {
    // columns of stitches, each a pair of little slanted loops
    for (let x = 0; x < size; x += 4) {
      for (let y = 0; y < size; y += 4) {
        const shade = 185 + Math.round(rnd() * 45);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(x, y, 2, 3);
        ctx.fillRect(x + 2, y + 1, 2, 3);
      }
    }
  } else if (kind === 'poplin') {
    // the warp over the weft and under it again, a thread at a time, each a little uneven
    for (let x = 0; x < size; x += 2) {
      for (let y = 0; y < size; y += 2) {
        const warp = 200 + Math.round(rnd() * 25);
        const weft = 185 + Math.round(rnd() * 25);
        ctx.fillStyle = `rgb(${warp},${warp},${warp})`;
        ctx.fillRect(x, y, 1, 2);
        ctx.fillStyle = `rgb(${weft},${weft},${weft})`;
        ctx.fillRect(x + 1, y, 1, 2);
      }
    }
  } else {
    // ribs on the diagonal, wrapped so they run on across the seams
    for (let k = -size; k < size; k += 3) {
      const shade = 175 + Math.round(rnd() * 55);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + size, size);
      ctx.stroke();
    }
    // slubs: the odd thicker, paler thread across the ribs
    for (let i = 0; i < 16; i++) {
      const y = rnd() * size;
      const x = rnd() * size;
      ctx.strokeStyle = `rgba(245,245,245,${0.3 + rnd() * 0.4})`;
      ctx.lineWidth = 0.8 + rnd();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + rnd() * 20, y);
      ctx.stroke();
    }
  }
  return canvas;
}

/**
 * How much each weave darkens the colour under it, undone: one over the mean
 * of its canvas in linear light. The knit's stitches (shades 185–230) cover
 * three quarters of a `#d0d0d0` ground, averaging about 208 of 255, which is
 * 0.63 in linear light; the poplin's warp (200–225) and weft (185–210) cover it
 * half each, about 205, 0.62; and the twill's ribs (175–230) and pale slubs
 * average about 205, 0.62.
 */
const WEAVE_LIFT: Record<Weave, number> = { knit: 1 / 0.63, poplin: 1 / 0.62, twill: 1 / 0.62 };

/** Cloth: matt, with a pale sheen where the weave catches light at a glancing angle. */
function cloth(color: string, roughness: number, weave?: Weave): THREE.MeshPhysicalMaterial {
  const threads = weave ? weaveTexture(weave) : null;
  return new THREE.MeshPhysicalMaterial({
    // the weave averages under white: lift the colour back to what was asked
    color: new THREE.Color(color).multiplyScalar(weave && threads ? WEAVE_LIFT[weave] : 1),
    roughness,
    map: threads,
    bumpMap: threads,
    bumpScale: 0.25,
    sheen: 0.5,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4),
  });
}

/** Leather, for boots: smoother than cloth, with a soft gloss of polish. */
export function leatherMaterial(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.5,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  });
}

/** The sticks' wood. */
export function woodMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#c8a273', roughness: 0.55 });
}

/** How far apart a print's dots are and how big, metres: on clothes, and finer on gloves. */
const CLOTH_DOTS = { spacing: 0.068, radius: 0.0125 } as const;
const GLOVE_DOTS = { spacing: 0.032, radius: 0.0055 } as const;

/** Cloth printed with polka dots: `ground` spotted `dot`, its weave kept. */
function dotted(
  ground: string,
  dot: string,
  roughness: number,
  weave: Weave,
  size: { spacing: number; radius: number } = CLOTH_DOTS
): THREE.MeshPhysicalMaterial {
  // white under the print, which colours it
  const mat = cloth('#ffffff', roughness, weave);
  mat.sheenColor.set(ground).lerp(new THREE.Color('#ffffff'), 0.4);
  printDots(mat, { ground, dot, ...size });
  return mat;
}

/** Satin: smooth, with a bright sheen running along the folds. */
function satin(color: string): THREE.MeshPhysicalMaterial {
  const mat = cloth(color, 0.42, 'poplin');
  mat.sheen = 1;
  mat.sheenRoughness = 0.35;
  mat.clearcoat = 0.15;
  mat.clearcoatRoughness = 0.4;
  return mat;
}

/** The cloth of a top: knit for a T-shirt or a vest, poplin for a shirt, satin, wool for a jacket. */
function topCloth(who: Persona): THREE.MeshPhysicalMaterial {
  if (who.polka) {
    const weave = who.top === 'tee' || who.top === 'vest' ? 'knit' : 'poplin';
    return dotted(who.shirt, who.polka.shirt, 0.85, weave);
  }
  switch (who.top) {
    case 'ruffled':
      return satin(who.shirt);
    case 'tuxedo':
      return cloth(who.shirt, 0.75, 'twill');
    case 'button-up':
    case 'suit':
      return cloth(who.shirt, 0.8, 'poplin');
    default:
      return cloth(who.shirt, 0.85, 'knit');
  }
}

/** The kit's materials, and the drummer's in the colours of whoever is playing. */
export function makeMaterials(who: Persona = PERSONAS[0]): Materials {
  const lathing = lathingTexture();
  const robot = who.kind === 'robot';
  const beast = who.kind === 'beast';
  const m: Materials = {
    // the shells, hardware and mat are painted in the player's kit by `styleKit`, below
    shell: new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide }),
    head: new THREE.MeshStandardMaterial({ color: '#ece6d6', roughness: 0.75 }),
    chrome: new THREE.MeshStandardMaterial(),
    black: new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.6 }),
    bronze: new THREE.MeshStandardMaterial({
      color: '#c99a4a',
      metalness: 1,
      roughness: 0.3,
      side: THREE.DoubleSide,
      roughnessMap: lathing,
      bumpMap: lathing,
      bumpScale: 0.6,
    }),
    wood: woodMaterial(),
    felt: new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.95 }),
    // all machine, the skin is metal; a beast is fur all over
    skin:
      who.cyborg === 'full'
        ? metalMaterial(who.metal)
        : beast
          ? furMaterial(who.skin)
          : who.polka
            ? // gloved, and painted where anything would show
              dotted(who.skin, who.polka.skin, 0.75, 'knit', GLOVE_DOTS)
            : skinMaterial(who.skin),
    // bare-chested, the shirt is skin
    shirt:
      who.top === 'bare'
        ? who.cyborg === 'full'
          ? metalMaterial(who.metal)
          : beast
            ? furMaterial(who.skin)
            : skinMaterial(who.skin)
        : topCloth(who),
    // a robot is plated to the floor, a beast furred to it
    jeans: robot
      ? metalMaterial(who.metal)
      : beast
        ? furMaterial(who.trousers)
        : who.polka
          ? dotted(who.trousers, who.polka.trousers, 0.9, 'twill')
          : cloth(who.trousers, 0.9, 'twill'),
    shoe: robot
      ? metalMaterial(who.metal)
      : beast
        ? furMaterial(who.shoes)
        : who.footwear === 'boots'
          ? leatherMaterial(who.shoes)
          : new THREE.MeshStandardMaterial({ color: who.shoes, roughness: 0.7 }),
    sole: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }),
    hair: beast ? furMaterial(who.hair) : hairMaterial(who.hair),
    eye: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.2 }),
    sclera: new THREE.MeshStandardMaterial({ color: '#efe9e1', roughness: 0.3 }),
    accent: new THREE.MeshStandardMaterial({ color: who.accent, roughness: 0.6 }),
    gold: new THREE.MeshStandardMaterial({ color: '#e0b24a', metalness: 1, roughness: 0.25 }),
    lens: new THREE.MeshStandardMaterial({ color: '#0a0a0c', metalness: 0.6, roughness: 0.08 }),
    lips: new THREE.MeshStandardMaterial({ color: '#b3122e', roughness: 0.35 }),
    metal: metalMaterial(who.metal),
    // lit from inside: no colour of its own for the room's light to wash out
    glow: new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: who.accent,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    }),
    // only a jacket has a shirt under it to weave
    under:
      who.top === 'tuxedo' ? cloth(who.under ?? '#ffffff', 0.8, 'poplin') : cloth(who.shirt, 0.8),
    braces: new THREE.MeshStandardMaterial({ color: who.braces ?? who.accent, roughness: 0.7 }),
    emblem: new THREE.MeshStandardMaterial({
      color: who.accent,
      metalness: 0.8,
      roughness: 0.38,
      bumpMap: flakeTexture(),
      bumpScale: 0.6,
    }),
    rug: new THREE.MeshStandardMaterial({ roughness: 1 }),
    trim: new THREE.MeshStandardMaterial({ roughness: 1 }),
    floor: new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.85 }),
  };
  styleKit(m, who);
  return m;
}

const FINISH: Record<
  Finish,
  { metalness: number; roughness: number; clearcoat: number; clearcoatRoughness: number }
> = {
  gloss: { metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 },
  sparkle: { metalness: 0.7, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04 },
  satin: { metalness: 0, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45 },
  metal: { metalness: 1, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.12 },
  oyster: { metalness: 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
};

/**
 * An oyster pearl wrap, drawn once onto a canvas: dark ground under bands of
 * pale shimmer swirling round the shell, the way the pearl's layers lie in a
 * wrap. Skipped where there is no canvas (the tests run in Node).
 */
function oysterTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (x / w) * Math.PI * 2;
      const v = (y / h) * Math.PI * 2;
      // a few waves bent across each other, whole numbers of them round, so the seam is not seen
      const swirl =
        Math.sin(3 * u + 2.2 * Math.sin(2 * v + Math.sin(5 * u))) +
        0.6 * Math.sin(7 * u - 3 * v + 1.7 * Math.cos(4 * u)) +
        0.3 * Math.sin(13 * u + 9 * v);
      const band = (0.5 + 0.5 * Math.sin(swirl * 2.6)) ** 3;
      const shade = Math.round(70 + 185 * band);
      img.data.set([shade, shade, Math.min(255, shade + 8), 255], (y * w + x) * 4);
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const HARDWARE: Record<Hardware, { color: string; metalness: number; roughness: number }> = {
  chrome: { color: '#d9dde2', metalness: 1, roughness: 0.16 },
  black: { color: '#2a2b30', metalness: 0.9, roughness: 0.38 },
  gold: { color: '#e0b24a', metalness: 1, roughness: 0.22 },
};

/**
 * Paint the kit's shells, hardware and mat in a player's kit — in place, so a
 * new player can sit down at the same kit without it being rebuilt.
 */
export function styleKit(m: Materials, who: Persona): void {
  const { kit } = who;
  m.shell.color.set(kit.shell);
  Object.assign(m.shell, FINISH[kit.finish]);
  const old = m.shell.bumpMap;
  const flakes = kit.finish === 'sparkle' ? (old ?? flakeTexture()) : null;
  if (old && old !== flakes) old.dispose();
  m.shell.bumpMap = flakes;
  m.shell.roughnessMap = flakes;
  m.shell.bumpScale = 0.4;
  // an oyster wrap is its pattern: the ground's colour lifted, so the pale bands come through
  const oldMap = m.shell.map;
  const pearl = kit.finish === 'oyster' ? (oldMap ?? oysterTexture()) : null;
  if (oldMap && oldMap !== pearl) oldMap.dispose();
  m.shell.map = pearl;
  if (pearl) m.shell.color.set(kit.shell).lerp(new THREE.Color('#9a9aa8'), 0.55);
  // and polka dots, if the kit has them
  if (kit.dots) {
    // the print colours it, ground and dots both
    printDots(m.shell, { ground: kit.shell, dot: kit.dots, spacing: 0.06, radius: 0.011 });
    m.shell.color.set('#ffffff');
  } else {
    delete m.shell.userData.dots;
    // back to the plain shader every material starts with: its own hooks, not the print's
    Reflect.deleteProperty(m.shell, 'onBeforeCompile');
    Reflect.deleteProperty(m.shell, 'customProgramCacheKey');
  }
  // a map coming or going changes the shader
  m.shell.needsUpdate = true;
  const hw = HARDWARE[kit.hardware];
  m.chrome.color.set(hw.color);
  m.chrome.metalness = hw.metalness;
  m.chrome.roughness = hw.roughness;
  m.rug.color.set(kit.rug);
  m.trim.color.set(kit.trim ?? kit.rug);
}

const Y = new THREE.Vector3(0, 1, 0);

/**
 * A unit-height cylinder along `y`, centred — scaled and turned each frame to
 * span two joints. The ends are covered by the joints' spheres, so the
 * stretch never shows.
 */
export function segment(
  rTop: number,
  rBottom: number,
  mat: THREE.Material,
  radial = 14
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, 1, radial, 1, true), mat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * A limb shaped along its length: a lathe of `profile` — `[radius, y]` from
 * one joint (`y` −0.5) to the next (+0.5), radius in metres — stretched and
 * turned by {@link place} like a {@link segment}. A muscle is thicker where
 * it bellies and thins to the tendon; the joints' spheres cover the ends.
 */
export function limb(profile: [number, number][], mat: THREE.Material, radial = 18): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      radial
    ),
    mat
  );
  mesh.castShadow = true;
  return mesh;
}

/** One cross-section of a {@link loft}: at height `y`, `w` across and `d` deep (half-widths), set back `z`. */
export interface Ring {
  y: number;
  w: number;
  d: number;
  z?: number;
}

/**
 * A body built up through cross-sections, bottom to top, each a rounded
 * rectangle (a superellipse — squarer than an ellipse, the way a ribcage or
 * a pelvis is) and closed at both ends. Smooth all the way round: the seam
 * shares its vertices.
 */
export function loft(
  rings: Ring[],
  mat: THREE.Material,
  around = 36,
  squareness = 2.6
): THREE.Mesh {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const e = 2 / squareness;
  for (const r of rings) {
    for (let i = 0; i < around; i++) {
      const a = (i / around) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      uv.push(i / around, rings.indexOf(r) / (rings.length - 1));
      pos.push(
        r.w * Math.sign(c) * Math.abs(c) ** e,
        r.y,
        (r.z ?? 0) + r.d * Math.sign(sn) * Math.abs(sn) ** e
      );
    }
  }
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < around; i++) {
      const a = k * around + i;
      const b = k * around + ((i + 1) % around);
      const c = a + around;
      const d = b + around;
      index.push(a, c, b, b, c, d);
    }
  }
  // close each end on its centre
  const ends: [number, Ring, boolean][] = [
    [0, rings[0], false],
    [(rings.length - 1) * around, rings[rings.length - 1], true],
  ];
  for (const [base, r, top] of ends) {
    const centre = pos.length / 3;
    pos.push(0, r.y, r.z ?? 0);
    uv.push(0.5, top ? 1 : 0);
    for (let i = 0; i < around; i++) {
      const a = base + i;
      const b = base + ((i + 1) % around);
      // wound to face out of the end
      if (top) index.push(b, a, centre);
      else index.push(a, b, centre);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // for a texture that wraps it, fur say: round it, and up it
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * A shape built forward along `z` through cross-sections `[forward, half-width,
 * half-height, raised]`: a {@link loft} laid on its side.
 */
export function forwardLoft(
  sections: [number, number, number, number][],
  mat: THREE.Material,
  squareness = 2.4
): THREE.Mesh {
  const o = loft(
    sections.map(([y, w, d, z]) => ({ y, w, d, z })),
    mat,
    28,
    squareness
  );
  // the loft's up becomes forward and its depth up; flipping x keeps it inside out the right way
  o.geometry.applyMatrix4(new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  o.geometry.computeVertexNormals();
  return o;
}

/** Span a {@link segment} from `a` to `b` (its top at `b`). */
export function place(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(Y, d.multiplyScalar(1 / len));
  mesh.scale.set(1, Math.max(len, 1e-4), 1);
}

/** A mesh of `geo` in `mat` that casts a shadow, named `name` if given: a piece of clothing, a shoe's. */
export function meshOf(geo: THREE.BufferGeometry, mat: THREE.Material, name?: string): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  if (name) o.name = name;
  return o;
}

export function ball(r: number, mat: THREE.Material, segments = 16): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, segments, Math.round(segments * 0.75)),
    mat
  );
  mesh.castShadow = true;
  return mesh;
}

/** A static cylinder between two fixed points — stands, rods, legs. */
export function rod(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  mat: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
  place(mesh, a, b);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Free a set of materials, used or not: a set made for one drummer has the
 * kit's in it too, which that drummer never wears.
 */
export function disposeMaterials(m: Materials): void {
  for (const mat of Object.values(m) as THREE.Material[]) {
    if (mat instanceof THREE.MeshStandardMaterial) {
      mat.map?.dispose();
      mat.roughnessMap?.dispose();
      mat.bumpMap?.dispose();
    }
    mat.dispose();
  }
}

/** Free every geometry and material under a root — the scene is built per mount. */
export function disposeTree(root: THREE.Object3D): void {
  const mats = new Set<{ dispose: () => void }>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    // a bare `Mesh` is typed with `any` geometry and material: read them as what they are
    const geo: unknown = o.geometry;
    const mat: unknown = o.material;
    if (geo instanceof THREE.BufferGeometry) geo.dispose();
    for (const x of Array.isArray(mat) ? (mat as unknown[]) : [mat]) {
      if (x instanceof THREE.Material) mats.add(x);
    }
  });
  mats.forEach((m) => {
    if (m instanceof THREE.MeshStandardMaterial) {
      m.map?.dispose();
      m.roughnessMap?.dispose();
      m.bumpMap?.dispose();
    }
    m.dispose();
  });
}
