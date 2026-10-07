/**
 * The drummer's cast: who can sit at the kit, and how one is picked for a
 * new session.
 */

import { describe, expect, it, vi } from 'vitest';

import { PERSONAS, otherThan } from '@/lib/app/breaks/drummer/personas';

describe('PERSONAS', () => {
  it('gives every player their own id and name', () => {
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    expect(new Set(PERSONAS.map((p) => p.name)).size).toBe(PERSONAS.length);
  });

  it('casts men and women, every build, and a spread of skin tones, hair and beards', () => {
    expect(new Set(PERSONAS.map((p) => p.figure))).toEqual(new Set(['male', 'female']));
    expect(new Set(PERSONAS.map((p) => p.build))).toEqual(
      new Set(['slim', 'average', 'heavy', 'muscular'])
    );
    expect(new Set(PERSONAS.map((p) => p.skin)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(PERSONAS.map((p) => p.hairStyle)).size).toBe(14);
    expect(PERSONAS.filter((p) => p.beard !== 'none').length).toBeGreaterThanOrEqual(5);
  });

  it('keeps the original drummer, exactly as he looked before the cast', () => {
    expect(PERSONAS[0]).toMatchObject({
      id: 'original',
      figure: 'male',
      build: 'average',
      skin: '#c58c6a',
      hair: '#2a1c14',
      hairStyle: 'crop',
      beard: 'none',
      top: 'tee',
      shirt: '#2c4f6b',
      trousers: '#2a2f3a',
      shoes: '#202124',
    });
    const o = PERSONAS[0];
    expect(o.hat ?? o.shades ?? o.headband ?? o.earrings ?? o.chain ?? o.lipstick).toBeUndefined();
  });

  it('casts a robot, plated whole, and a horned, shaggy beast', () => {
    const robot = PERSONAS.find((p) => p.kind === 'robot')!;
    expect(robot.cyborg).toBe('full');
    expect(robot.metal).toMatch(/^#[0-9a-f]{6}$/i);
    const beast = PERSONAS.find((p) => p.kind === 'beast')!;
    expect(beast).toMatchObject({ hairStyle: 'shag', horns: true, beard: 'none' });
  });

  it("keeps the original drummer's kit: red gloss shells, chrome, a plain brown mat", () => {
    expect(PERSONAS[0].kit).toEqual({
      shell: '#7a1f1a',
      finish: 'gloss',
      hardware: 'chrome',
      rug: '#3a2f2a',
    });
  });

  it('brings every finish and every kind of hardware to the stage', () => {
    expect(new Set(PERSONAS.map((p) => p.kit.finish))).toEqual(
      new Set(['gloss', 'sparkle', 'satin', 'metal'])
    );
    expect(new Set(PERSONAS.map((p) => p.kit.hardware))).toEqual(
      new Set(['chrome', 'black', 'gold'])
    );
    expect(new Set(PERSONAS.map((p) => p.kit.shell)).size).toBeGreaterThanOrEqual(20);
  });

  it('puts every hat on somebody', () => {
    expect(new Set(PERSONAS.map((p) => p.hat).filter(Boolean))).toEqual(
      new Set(['beanie', 'cap', 'cowboy', 'tophat', 'bandana'])
    );
  });

  it('writes every colour as a CSS hex', () => {
    for (const p of PERSONAS) {
      const { kit } = p;
      for (const c of [
        p.skin,
        p.hair,
        p.shirt,
        p.trousers,
        p.shoes,
        p.accent,
        kit.shell,
        kit.rug,
        kit.trim ?? kit.rug,
      ]) {
        expect(c, `${p.id}: ${c}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('openingPersona, otherThan and noteSeated', () => {
  it('seats The Original first in a tab, then somebody other than whoever sat last', async () => {
    vi.resetModules();
    const fresh = await import('@/lib/app/breaks/drummer/personas');
    expect(fresh.openingPersona(() => 0.5).id).toBe('original');
    // only reading: asked again before anyone is seated, still The Original
    expect(fresh.openingPersona(() => 0).id).toBe('original');
    fresh.noteSeated('original');
    for (const r of [0, 0.5, 0.999]) expect(fresh.openingPersona(() => r).id).not.toBe('original');
    fresh.noteSeated('roxy');
    expect(fresh.openingPersona(() => 0).id).toBe('original');
  });

  it('never picks the player it is told to skip, and may pick anyone else', () => {
    const seen = new Set<string>();
    for (let i = 0; i < PERSONAS.length * 4; i++) {
      const r = (i % PERSONAS.length) / PERSONAS.length;
      const p = otherThan('original', () => r);
      expect(p.id).not.toBe('original');
      seen.add(p.id);
    }
    expect(seen.size).toBe(PERSONAS.length - 1);
    // with nobody to skip, anyone
    expect(otherThan(undefined, () => 0).id).toBe(PERSONAS[0].id);
  });

  it('picks the same player for the same random number: calling it twice changes nothing', () => {
    expect(otherThan('vex', () => 0.42)).toBe(otherThan('vex', () => 0.42));
  });
});
