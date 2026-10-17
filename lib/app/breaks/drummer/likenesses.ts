import type { Persona } from '@/lib/app/breaks/drummer/personas';

/**
 * The drummers who sit in as themselves (experiment: the drummer view): when
 * the Studio's style is a drummer's own, that drummer is at the kit, as they
 * looked in their prime, rather than one of the cast. They are not in the
 * cast's shuffle: they come only with their style.
 *
 * Each is from footage, not memory (the frames are listed against each):
 * a likeness, built from the same parts as the cast, so it is the look —
 * hair, clothes, kit — more than the face.
 */

/**
 * Stewart Copeland on the Synchronicity tour, 1983 (the Atlanta and Montreal
 * film, "Message in a Bottle"): tall and lean, a white ribbed tank top, a
 * tousled sun-streaked shag over the ears with a fringe, clean-shaven, no
 * headphones. His blue Tama Imperialstar, near black under the lights, with
 * its rank of octobans over the toms.
 */
const COPELAND: Persona = {
  id: 'copeland',
  name: 'Stewart Copeland',
  figure: 'male',
  build: 'slim',
  skin: '#e8b898',
  hair: '#a07c50',
  hairStyle: 'shaggy',
  beard: 'none',
  top: 'vest',
  shirt: '#f2f2f0',
  trousers: '#d8d8d8',
  shoes: '#f2f2f0',
  accent: '#d8b880',
  headphones: false,
  kit: {
    shell: '#14244a',
    finish: 'gloss',
    hardware: 'chrome',
    rug: '#1c1c22',
    octobans: true,
  },
};

/**
 * Bernard "Pretty" Purdie with King Curtis and the Kingpins, 1971 (Montreux,
 * the Fillmore West year): the band's uniform — a black dinner jacket over a
 * white dress shirt, a black bow tie — on a stocky frame, short natural hair,
 * a thin moustache. The kit's make cannot be read off the film: a natural
 * wood finish and chrome, as it looks.
 */
const PURDIE: Persona = {
  id: 'purdie',
  name: 'Bernard Purdie',
  figure: 'male',
  build: 'heavy',
  skin: '#5a3a28',
  hair: '#1a1614',
  hairStyle: 'natural',
  beard: 'moustache',
  top: 'tuxedo',
  shirt: '#141414',
  under: '#f2f0ea',
  trousers: '#141414',
  shoes: '#0e0e0e',
  accent: '#141414',
  headphones: false,
  kit: { shell: '#c99a62', finish: 'satin', hardware: 'chrome', rug: '#3a2a22' },
};

/**
 * Mitch Mitchell with the Jimi Hendrix Experience at Monterey, June 1967:
 * slight and wiry, a big curly halo of ginger-brown hair over the ears, a hot
 * pink satin shirt with full sleeves and a ruffled jabot, blue-grey braces
 * over it, clean-shaven, no headphones. His Premier in black oyster pearl.
 */
const MITCHELL: Persona = {
  id: 'mitchell',
  name: 'Mitch Mitchell',
  figure: 'male',
  build: 'slim',
  skin: '#f2c8b0',
  hair: '#a8622e',
  hairStyle: 'curly',
  beard: 'none',
  top: 'ruffled',
  shirt: '#e8508c',
  trousers: '#2a2a3a',
  shoes: '#111111',
  footwear: 'boots',
  accent: '#e8508c',
  braces: '#506080',
  headphones: false,
  kit: { shell: '#1a1a22', finish: 'oyster', hardware: 'chrome', rug: '#1a1a1a' },
};

/**
 * Klek de Poitrine of Angine de Poitrine, as at the KEXP session that went
 * round the world (2026): not a face but a mask — a tall black capsule
 * spotted white, a gold pyramid on its crown, gold studs for eyes, a
 * gold-rimmed "O" of a mouth, and a long, limp, spotted nose hanging from
 * under the brow that swings as he plays. A loose white smock spotted black
 * with a gold triangle on the chest; the sleeves' ends, gloves and trousers
 * the other way round, black spotted white. The kit black, spotted white,
 * on a Persian rug. Only the costume: the player's identity is theirs.
 */
const KLEK: Persona = {
  id: 'klek',
  name: 'Klek de Poitrine',
  figure: 'male',
  build: 'average',
  skin: '#17110f',
  hair: '#17110f',
  hairStyle: 'bald',
  beard: 'none',
  top: 'suit',
  shirt: '#f3eee6',
  trousers: '#151515',
  shoes: '#151515',
  accent: '#c9a03a',
  headphones: false,
  mask: 'klek',
  polka: { shirt: '#151515', trousers: '#f2eee6', skin: '#f2eee6' },
  kit: {
    shell: '#141414',
    finish: 'gloss',
    hardware: 'chrome',
    rug: '#7a2a22',
    trim: '#c9a03a',
    dots: '#f2eee6',
  },
};

/** Each likeness by the catalogue style that plays them (the drummer record's `style_key`). */
export const LIKENESSES: Readonly<Record<string, Persona>> = {
  copeland: COPELAND,
  bernardpurdie: PURDIE,
  mitchell: MITCHELL,
  klek: KLEK,
};

/** The drummer who sits in as themselves for `style`, if it is a drummer's own with a likeness. */
export function likenessFor(style: string): Persona | undefined {
  return Object.hasOwn(LIKENESSES, style) ? LIKENESSES[style] : undefined;
}
