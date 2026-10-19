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

  it('seats every drummer in the catalogue for their own style', () => {
    const drummers = Object.entries(STYLES)
      .filter(([, style]) => style.drummer)
      .map(([key]) => key);
    expect(drummers.length).toBeGreaterThanOrEqual(35);
    for (const key of drummers) expect(likenessFor(key), key).toBeDefined();
    // and nobody for a style that is not a drummer's
    expect(Object.keys(LIKENESSES).sort()).toEqual([...drummers].sort());
  });

  it('has no likeness for a style that is not a drummer', () => {
    expect(likenessFor('funk')).toBeUndefined();
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
    // Keith Moon wore his, taped on, for the synthesiser track
    for (const who of Object.values(LIKENESSES)) expect(who.headphones).toBe(who.id === 'moon');
  });

  it('dresses each as the footage shows them', () => {
    expect(LIKENESSES.copeland).toMatchObject({ top: 'vest', hairStyle: 'shaggy', beard: 'none' });
    expect(LIKENESSES.copeland.kit.octobans).toBe(true);
    expect(LIKENESSES.mitchell).toMatchObject({ top: 'ruffled', hairStyle: 'curly' });
    expect(LIKENESSES.mitchell.braces).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.mitchell.kit.finish).toBe('oyster');
    // Purdie now: a white flat cap, a pinstriped waistcoat buttoned over shirt and tie, a red kit
    expect(LIKENESSES.bernardpurdie).toMatchObject({
      top: 'button-up',
      neckwear: 'long',
      hat: 'flat',
      beard: 'moustache',
    });
    expect(LIKENESSES.bernardpurdie.waistcoat).toMatchObject({ buttoned: true });
    expect(LIKENESSES.bernardpurdie.waistcoat?.stripes).toMatch(/^#[0-9a-f]{6}$/i);
    // Klek is a mask and a spotted costume, spots on the kit too
    expect(LIKENESSES.klek).toMatchObject({ mask: 'klek', top: 'suit' });
    expect(LIKENESSES.klek.polka).toBeDefined();
    expect(LIKENESSES.klek.kit.dots).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('dresses the rest as their photos and footage show them', () => {
    expect(LIKENESSES.bonham).toMatchObject({ top: 'vest', hairStyle: 'mane', beard: 'short' });
    expect(LIKENESSES.bonham.kit.finish).toBe('acrylic');
    expect(LIKENESSES.ringo).toMatchObject({ top: 'jacket', hairStyle: 'mop', beard: 'none' });
    expect(LIKENESSES.ringo.kit.finish).toBe('oyster');
    expect(LIKENESSES.stubblefield).toMatchObject({ top: 'jacket', neckwear: 'bow' });
    expect(LIKENESSES.tonywilliams).toMatchObject({ top: 'tuxedo', beard: 'pencil' });
    expect(LIKENESSES.baker).toMatchObject({ hairStyle: 'tousled', beard: 'short' });
    expect(LIKENESSES.baker.kit.finish).toBe('sparkle');
    // Ulrich now: a cap on backwards, a black T-shirt, a yellow kit, and his tongue out
    expect(LIKENESSES.ulrich).toMatchObject({
      hat: 'cap',
      hairStyle: 'capped',
      beard: 'stubble',
      top: 'tee',
      tongue: true,
    });
    // Sheila E.'s hair long and swept back, big silver hoops
    expect(LIKENESSES.sheilae).toMatchObject({ hairStyle: 'flowing' });
    expect(LIKENESSES.sheilae.hoops).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.collins).toMatchObject({
      top: 'button-up',
      neckwear: 'loose',
      rolled: true,
      hairStyle: 'receding',
    });
    expect(LIKENESSES.collins.braces).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.elvinjones.plaid).toBeDefined();
    expect(LIKENESSES.jabostarks).toMatchObject({ collar: 'spear', hairStyle: 'rounded' });
    expect(LIKENESSES.jabostarks.kit.finish).toBe('acrylic');
    expect(LIKENESSES.roach).toMatchObject({ top: 'tuxedo', hairStyle: 'slick' });
    expect(LIKENESSES.haynes).toMatchObject({ top: 'jacket', hairStyle: 'slick' });
    expect(LIKENESSES.haynes.fleck).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.dejohnette).toMatchObject({ top: 'tunic', hairStyle: 'fro' });
    expect(LIKENESSES.dejohnette.glasses).toMatchObject({ shape: 'aviator' });
    expect(LIKENESSES.lombardo).toMatchObject({ top: 'vest', hairStyle: 'curtains' });
    expect(LIKENESSES.puente).toMatchObject({ top: 'guayabera', hairStyle: 'pompadour' });
    expect(LIKENESSES.yussefdayes).toMatchObject({ hat: 'tam', net: true });
    expect(LIKENESSES.gadd).toMatchObject({ top: 'track', hairStyle: 'curly' });
    expect(LIKENESSES.haake).toMatchObject({ hairStyle: 'tied', legs: 'shorts' });
    expect(LIKENESSES.haake.gloves).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.davies.figure).toBe('female');
    expect(LIKENESSES.tonyallen).toMatchObject({ top: 'button-up', neckwear: 'open' });
    expect(LIKENESSES.hoenig.hairStyle).toBe('tousled');
    expect(LIKENESSES.sanchez).toMatchObject({ top: 'tee', beard: 'stubble' });
    expect(LIKENESSES.carey).toMatchObject({ top: 'jersey', legs: 'shorts' });
    expect(LIKENESSES.hakim).toMatchObject({ top: 'jacket', neckwear: 'tee' });
    expect(LIKENESSES.hakim.scarf).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIKENESSES.cobham).toMatchObject({ top: 'scoop' });
    expect(LIKENESSES.cobham.kit.finish).toBe('acrylic');
    expect(LIKENESSES.changuito.chevron).toHaveLength(4);
    expect(LIKENESSES.shrieve.motifs).toHaveLength(2);
    expect(LIKENESSES.horaciohernandez).toMatchObject({ hairStyle: 'backswept', satin: true });
    expect(LIKENESSES.prieto.hairStyle).toBe('ringlets');
    expect(LIKENESSES.colaiuta.logo).toMatchObject({ text: 'stuff' });
    expect(LIKENESSES.colaiuta.glasses).toMatchObject({ shape: 'square' });
    expect(LIKENESSES.cindyblackman).toMatchObject({ figure: 'female', shades: true });
    expect(LIKENESSES.cindyblackman.waistcoat).toBeDefined();
    expect(LIKENESSES.downey).toMatchObject({
      hairStyle: 'curtains',
      collar: 'spear',
      neckwear: 'open',
    });
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
        who.tie,
        who.fleck,
        who.gloves,
        who.wristbands,
        who.scarf,
        who.choker,
        who.logo?.colour,
        who.waistcoat?.cloth,
        who.waistcoat?.trim,
        ...(who.chevron ?? []),
        ...(who.motifs ?? []),
        who.plaid?.band,
        who.plaid?.line,
        who.glasses?.frame,
        who.glasses?.tint,
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
