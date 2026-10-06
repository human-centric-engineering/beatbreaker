/**
 * The drummer's cast: who can sit at the kit, and how one is picked for a
 * new session.
 */

import { describe, expect, it, vi } from 'vitest';

import { PERSONAS, pickPersona } from '@/lib/app/breaks/drummer/personas';

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
    expect(new Set(PERSONAS.map((p) => p.hairStyle)).size).toBe(13);
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

  it('puts every hat on somebody', () => {
    expect(new Set(PERSONAS.map((p) => p.hat).filter(Boolean))).toEqual(
      new Set(['beanie', 'cap', 'cowboy', 'tophat', 'bandana'])
    );
  });

  it('writes every colour as a CSS hex', () => {
    for (const p of PERSONAS) {
      for (const c of [p.skin, p.hair, p.shirt, p.trousers, p.shoes, p.accent]) {
        expect(c, `${p.id}: ${c}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('pickPersona', () => {
  it('seats The Original first in a tab, then somebody else', async () => {
    vi.resetModules();
    const fresh = await import('@/lib/app/breaks/drummer/personas');
    expect(fresh.pickPersona(() => 0.5).id).toBe('original');
    expect(fresh.pickPersona(() => 0).id).not.toBe('original');
  });

  it('picks from the roster by the random number it is given', () => {
    const p = pickPersona(() => 0.999);
    expect(PERSONAS).toContain(p);
  });

  it('never seats the same player twice running', () => {
    const first = pickPersona(() => 0);
    const second = pickPersona(() => 0);
    expect(second.id).not.toBe(first.id);
    // and the third may be the first again: only the last one is skipped
    expect(pickPersona(() => 0).id).toBe(first.id);
  });

  it('can seat every player', () => {
    const seen = new Set<string>();
    for (let i = 0; i < PERSONAS.length * 4; i++) {
      const r = (i % PERSONAS.length) / PERSONAS.length;
      seen.add(pickPersona(() => r).id);
    }
    expect(seen.size).toBe(PERSONAS.length);
  });
});
