/**
 * The drummers who sit in as themselves: each keyed by the catalogue style
 * that plays them, apart from the cast's shuffle, and dressed as the footage
 * shows them.
 */

import { describe, expect, it } from 'vitest';

import { LIKENESSES, likenessFor } from '@/lib/app/breaks/drummer/likenesses';
import { PERSONAS, otherThan } from '@/lib/app/breaks/drummer/personas';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { DRUMMER_MODEL_DIR, readFolder } from '@/scripts/lineage/read-corpus';

/** Each drummer record's `beatbreaker.style_key`, by its name. */
function styleKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  for (const { json } of readFolder(DRUMMER_MODEL_DIR, 'drummers')) {
    if (typeof json !== 'object' || json === null) continue;
    const record = json as { identity?: { name?: unknown }; beatbreaker?: { style_key?: unknown } };
    const name = record.identity?.name;
    const key = record.beatbreaker?.style_key;
    if (typeof name === 'string' && typeof key === 'string') keys.set(name, key);
  }
  return keys;
}

describe('LIKENESSES', () => {
  it('keys each likeness by the style its drummer record plays them as', () => {
    const keys = styleKeys();
    for (const [style, who] of Object.entries(LIKENESSES)) {
      expect(keys.get(who.name)).toBe(style);
      expect(STYLES[style]).toBeDefined();
    }
  });

  it('seats Copeland, Purdie, Mitchell and Klek for their own styles', () => {
    expect(likenessFor('copeland')?.name).toBe('Stewart Copeland');
    expect(likenessFor('bernardpurdie')?.name).toBe('Bernard Purdie');
    expect(likenessFor('mitchell')?.name).toBe('Mitch Mitchell');
    expect(likenessFor('klek')?.name).toBe('Klek de Poitrine');
  });

  it('has no likeness for a style that is not a drummer, or a drummer not yet modelled', () => {
    expect(likenessFor('funk')).toBeUndefined();
    expect(likenessFor('bonham')).toBeUndefined();
    // not fooled by what every object has
    expect(likenessFor('toString')).toBeUndefined();
    expect(likenessFor('constructor')).toBeUndefined();
  });

  it('keeps them out of the cast: Shuffle never seats a likeness', () => {
    const ids = new Set(Object.values(LIKENESSES).map((p) => p.id));
    expect(PERSONAS.some((p) => ids.has(p.id))).toBe(false);
    for (let i = 0; i < 40; i++) expect(ids.has(otherThan(undefined, () => i / 40).id)).toBe(false);
  });

  it('plays as they did on stage, without the cast’s headphones', () => {
    for (const who of Object.values(LIKENESSES)) expect(who.headphones).toBe(false);
  });

  it('dresses each as the footage shows them', () => {
    expect(LIKENESSES.copeland).toMatchObject({ top: 'vest', hairStyle: 'shaggy', beard: 'none' });
    expect(LIKENESSES.copeland.kit.octobans).toBe(true);
    expect(LIKENESSES.mitchell).toMatchObject({ top: 'ruffled', hairStyle: 'curly' });
    expect(LIKENESSES.mitchell.braces).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.mitchell.kit.finish).toBe('oyster');
    expect(LIKENESSES.bernardpurdie).toMatchObject({ top: 'tuxedo', beard: 'moustache' });
    expect(LIKENESSES.bernardpurdie.under).toMatch(/^#[0-9a-f]{6}$/i);
    // Klek is a mask and a spotted costume, spots on the kit too
    expect(LIKENESSES.klek).toMatchObject({ mask: 'klek', top: 'suit' });
    expect(LIKENESSES.klek.polka).toBeDefined();
    expect(LIKENESSES.klek.kit.dots).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('writes every colour as a CSS hex', () => {
    for (const who of Object.values(LIKENESSES)) {
      const colours = [
        who.skin,
        who.hair,
        who.shirt,
        who.trousers,
        who.shoes,
        who.accent,
        who.braces,
        who.under,
        who.polka?.shirt,
        who.polka?.trousers,
        who.polka?.skin,
        who.kit.shell,
        who.kit.rug,
        who.kit.trim,
        who.kit.dots,
      ];
      for (const c of colours.filter((c) => c !== undefined)) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
