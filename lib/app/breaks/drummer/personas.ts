/**
 * Who sits at the 3D drummer's kit (experiment): a cast of players, one
 * picked at random each time the drummer view opens.
 *
 * A persona is only how the figure looks — skin, build, hair, beard, clothes
 * and what they wear with them. It never moves a joint: the shoulders, hips
 * and limb lengths are the kit layout's (`BODY`), so every player reaches the
 * same drums with the same strokes and a bigger or slimmer build is girth on
 * the same skeleton.
 */

export type Figure = 'male' | 'female';

export type Build = 'slim' | 'average' | 'heavy' | 'muscular';

export type HairStyle =
  | 'bald'
  | 'crop'
  | 'mohawk'
  | 'spikes'
  | 'afro'
  | 'long'
  | 'bun'
  | 'pigtails'
  | 'dreads'
  | 'quiff'
  | 'ponytail'
  | 'bob'
  | 'mullet'
  | 'shag';

export type Beard = 'none' | 'stubble' | 'full' | 'goatee' | 'handlebar' | 'viking';

/** Something on the head, over the hair. */
export type Hat = 'beanie' | 'cap' | 'cowboy' | 'tophat' | 'bandana';

/** What's on top: a T-shirt, a vest that leaves the arms bare, or nothing at all. */
export type Top = 'tee' | 'vest' | 'bare';

/**
 * How much of a player is machine: the lead arm and that side of the face, with
 * an eye that glows, or all of them — metal from head to foot, eyes and joints
 * lit in their loud colour. Still the same skeleton: it never moves a joint.
 */
export type Cyborg = 'arm' | 'full';

/**
 * What a player is: a person (the default); a robot — a whole cyborg with no
 * person left, plated to the floor, a machine's face; or a beast, furred from
 * head to foot.
 */
export type Kind = 'human' | 'robot' | 'beast';

/** A kit's shells: gloss lacquer, a metal-flake sparkle, a satin stain, or bare polished metal. */
export type Finish = 'gloss' | 'sparkle' | 'satin' | 'metal';

/** The hoops, lugs and stands: chrome, blacked out, or gold. */
export type Hardware = 'chrome' | 'black' | 'gold';

/** The kit a player brings: its shells and hardware, and the mat it stands on. */
export interface KitStyle {
  /** Colours, as CSS hex. */
  shell: string;
  finish: Finish;
  hardware: Hardware;
  rug: string;
  /** A band round the mat's edge; the mat's own colour unless given. */
  trim?: string;
}

export interface Persona {
  id: string;
  name: string;
  figure: Figure;
  build: Build;
  /** Colours, as CSS hex. */
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard: Beard;
  top: Top;
  shirt: string;
  trousers: string;
  shoes: string;
  /** Headband, mohawk tips and the like: the loud colour. */
  accent: string;
  shades?: boolean;
  headband?: boolean;
  earrings?: boolean;
  chain?: boolean;
  lipstick?: boolean;
  hat?: Hat;
  cyborg?: Cyborg;
  /** The colour of a whole cyborg's plating; gunmetal unless given. */
  metal?: string;
  kind?: Kind;
  /** A pair of small horns, standing up out of the hair. */
  horns?: boolean;
  /** The kit they play, in their colours. */
  kit: KitStyle;
}

/** Skin, lightest to deepest. */
const SKIN = {
  porcelain: '#f2d6c4',
  fair: '#e6b896',
  olive: '#c99a70',
  tan: '#b07a55',
  brown: '#8c5a3c',
  deep: '#6a3f29',
  ebony: '#4a2b1d',
} as const;

export const PERSONAS: readonly Persona[] = [
  {
    // the drummer who played before there was a cast, exactly as he was
    id: 'original',
    name: 'The Original',
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
    accent: '#2c4f6b',
    kit: { shell: '#7a1f1a', finish: 'gloss', hardware: 'chrome', rug: '#3a2f2a' },
  },
  {
    id: 'roxy',
    name: 'Roxy Riot',
    figure: 'female',
    build: 'slim',
    skin: SKIN.porcelain,
    hair: '#ff2f8e',
    hairStyle: 'mohawk',
    beard: 'none',
    top: 'vest',
    shirt: '#111111',
    trousers: '#1a1a1a',
    shoes: '#0d0d0d',
    accent: '#ff2f8e',
    kit: {
      shell: '#ff2f8e',
      finish: 'sparkle',
      hardware: 'black',
      rug: '#111111',
      trim: '#ff2f8e',
    },
    earrings: true,
    lipstick: true,
    chain: true,
  },
  {
    id: 'thor',
    name: 'Big Thor',
    figure: 'male',
    build: 'heavy',
    skin: SKIN.fair,
    hair: '#c4692b',
    hairStyle: 'long',
    beard: 'viking',
    top: 'tee',
    shirt: '#3b3b3b',
    trousers: '#23262c',
    shoes: '#3a2414',
    accent: '#c4692b',
    kit: { shell: '#6b4423', finish: 'satin', hardware: 'black', rug: '#2e2a26', trim: '#c4692b' },
  },
  {
    id: 'marcus',
    name: 'Marcus "Thunder"',
    figure: 'male',
    build: 'muscular',
    skin: SKIN.ebony,
    hair: '#0e0b09',
    hairStyle: 'bald',
    beard: 'goatee',
    top: 'bare',
    shirt: SKIN.ebony,
    trousers: '#7a1f1a',
    shoes: '#f2f2f2',
    accent: '#f2c230',
    kit: { shell: '#0e0e10', finish: 'gloss', hardware: 'gold', rug: '#7a1f1a', trim: '#f2c230' },
    shades: true,
    chain: true,
  },
  {
    id: 'nia',
    name: 'Nia Groove',
    figure: 'female',
    build: 'average',
    skin: SKIN.deep,
    hair: '#1a110b',
    hairStyle: 'afro',
    beard: 'none',
    top: 'vest',
    shirt: '#f2a71b',
    trousers: '#22305a',
    shoes: '#f4f1ea',
    accent: '#e8432f',
    kit: {
      shell: '#f2a71b',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#22305a',
      trim: '#e8432f',
    },
    headband: true,
    earrings: true,
    lipstick: true,
  },
  {
    id: 'spike',
    name: 'Spike',
    figure: 'male',
    build: 'slim',
    skin: SKIN.fair,
    hair: '#36e0ff',
    hairStyle: 'spikes',
    beard: 'stubble',
    top: 'vest',
    shirt: '#e8432f',
    trousers: '#111111',
    shoes: '#111111',
    accent: '#36e0ff',
    kit: {
      shell: '#36e0ff',
      finish: 'sparkle',
      hardware: 'black',
      rug: '#111111',
      trim: '#e8432f',
    },
    earrings: true,
  },
  {
    id: 'raj',
    name: 'Raj the Metronome',
    figure: 'male',
    build: 'average',
    skin: SKIN.tan,
    hair: '#141010',
    hairStyle: 'bun',
    beard: 'full',
    top: 'tee',
    shirt: '#5c7a3a',
    trousers: '#2b2a28',
    shoes: '#5a3a22',
    accent: '#5c7a3a',
    kit: { shell: '#5c7a3a', finish: 'satin', hardware: 'chrome', rug: '#2b2a28' },
  },
  {
    id: 'lola',
    name: 'Lola Lightning',
    figure: 'female',
    build: 'muscular',
    skin: SKIN.brown,
    hair: '#f4d03f',
    hairStyle: 'pigtails',
    beard: 'none',
    top: 'vest',
    shirt: '#9b2fff',
    trousers: '#1b1b1b',
    shoes: '#9b2fff',
    accent: '#f4d03f',
    kit: {
      shell: '#9b2fff',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#1b1b1b',
      trim: '#f4d03f',
    },
    shades: true,
    lipstick: true,
  },
  {
    id: 'bubba',
    name: 'Bubba',
    figure: 'male',
    build: 'heavy',
    skin: SKIN.brown,
    hair: '#1c140f',
    hairStyle: 'crop',
    beard: 'handlebar',
    top: 'tee',
    shirt: '#b8352a',
    trousers: '#3a4a6a',
    shoes: '#3a2414',
    accent: '#f4f1ea',
    kit: { shell: '#b8352a', finish: 'gloss', hardware: 'chrome', rug: '#3a4a6a', trim: '#f4f1ea' },
    headband: true,
  },
  {
    id: 'jah',
    name: 'Jah Rhythm',
    figure: 'male',
    build: 'slim',
    skin: SKIN.deep,
    hair: '#24170f',
    hairStyle: 'dreads',
    beard: 'stubble',
    top: 'tee',
    shirt: '#2f8f46',
    trousers: '#e1c16e',
    shoes: '#24170f',
    accent: '#e8432f',
    kit: { shell: '#2f8f46', finish: 'gloss', hardware: 'gold', rug: '#24170f', trim: '#e8432f' },
    shades: true,
  },
  {
    id: 'vex',
    name: 'Vex',
    figure: 'female',
    build: 'slim',
    skin: SKIN.olive,
    hair: '#0b0b0b',
    hairStyle: 'long',
    beard: 'none',
    top: 'vest',
    shirt: '#0b0b0b',
    trousers: '#0b0b0b',
    shoes: '#7a1f1a',
    accent: '#c40000',
    kit: { shell: '#0b0b0b', finish: 'gloss', hardware: 'black', rug: '#3a0606', trim: '#c40000' },
    earrings: true,
    chain: true,
    lipstick: true,
  },
  {
    id: 'grizz',
    name: 'Grizz',
    figure: 'male',
    build: 'muscular',
    skin: SKIN.porcelain,
    hair: '#8c8c8c',
    hairStyle: 'bald',
    beard: 'full',
    top: 'vest',
    shirt: '#1e1e1e',
    trousers: '#2a2f3a',
    shoes: '#111111',
    accent: '#d9dde2',
    kit: { shell: '#3a3d42', finish: 'satin', hardware: 'black', rug: '#1e1e1e', trim: '#d9dde2' },
    shades: true,
    earrings: true,
  },
  {
    id: 'mama',
    name: 'Mama Beats',
    figure: 'female',
    build: 'heavy',
    skin: SKIN.tan,
    hair: '#6b2a8f',
    hairStyle: 'bun',
    beard: 'none',
    top: 'tee',
    shirt: '#e86a9a',
    trousers: '#2a2f3a',
    shoes: '#f4f1ea',
    accent: '#f2c230',
    kit: { shell: '#e86a9a', finish: 'gloss', hardware: 'chrome', rug: '#6b2a8f', trim: '#f2c230' },
    earrings: true,
    lipstick: true,
  },
  {
    id: 'ziggy',
    name: 'Ziggy Flash',
    figure: 'male',
    build: 'slim',
    skin: SKIN.porcelain,
    hair: '#ff7a00',
    hairStyle: 'afro',
    beard: 'none',
    top: 'bare',
    shirt: SKIN.porcelain,
    trousers: '#d9dde2',
    shoes: '#d9dde2',
    accent: '#36e0ff',
    kit: {
      shell: '#d9dde2',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#1a1a2e',
      trim: '#36e0ff',
    },
    shades: true,
    lipstick: true,
  },
  {
    id: 'tex',
    name: 'Tex',
    figure: 'male',
    build: 'heavy',
    skin: SKIN.tan,
    hair: '#5a3a22',
    hairStyle: 'crop',
    beard: 'handlebar',
    top: 'tee',
    shirt: '#8b3a2b',
    trousers: '#34507a',
    shoes: '#6b4226',
    accent: '#8a5a2b',
    kit: { shell: '#8a5a2b', finish: 'satin', hardware: 'chrome', rug: '#5a3a22', trim: '#c9a24a' },
    hat: 'cowboy',
  },
  {
    id: 'duchess',
    name: 'The Duchess',
    figure: 'female',
    build: 'slim',
    skin: SKIN.ebony,
    hair: '#0b0b0b',
    hairStyle: 'bob',
    beard: 'none',
    top: 'vest',
    shirt: '#5b1f7a',
    trousers: '#111111',
    shoes: '#c40000',
    accent: '#c9a24a',
    kit: { shell: '#5b1f7a', finish: 'gloss', hardware: 'gold', rug: '#111111', trim: '#c9a24a' },
    hat: 'tophat',
    earrings: true,
    chain: true,
    lipstick: true,
  },
  {
    id: 'kenji',
    name: 'Kenji Kicks',
    figure: 'male',
    build: 'slim',
    skin: SKIN.fair,
    hair: '#0e0e10',
    hairStyle: 'quiff',
    beard: 'none',
    top: 'tee',
    shirt: '#f4f1ea',
    trousers: '#111111',
    shoes: '#c40000',
    accent: '#c40000',
    kit: { shell: '#f4f1ea', finish: 'gloss', hardware: 'chrome', rug: '#111111', trim: '#c40000' },
  },
  {
    id: 'brandy',
    name: 'Brandy Blast',
    figure: 'female',
    build: 'heavy',
    skin: SKIN.fair,
    hair: '#b8321e',
    hairStyle: 'long',
    beard: 'none',
    top: 'vest',
    shirt: '#1d1d1d',
    trousers: '#2a2f3a',
    shoes: '#1d1d1d',
    accent: '#f2c230',
    kit: {
      shell: '#b8321e',
      finish: 'sparkle',
      hardware: 'black',
      rug: '#1d1d1d',
      trim: '#f2c230',
    },
    hat: 'bandana',
    earrings: true,
    lipstick: true,
  },
  {
    id: 'mo',
    name: 'Mo Power',
    figure: 'male',
    build: 'muscular',
    skin: SKIN.brown,
    hair: '#1a120c',
    hairStyle: 'crop',
    beard: 'full',
    top: 'vest',
    shirt: '#3a3a3a',
    trousers: '#2a2f3a',
    shoes: '#111111',
    accent: '#e8432f',
    kit: { shell: '#3a3a3a', finish: 'satin', hardware: 'black', rug: '#2a2f3a', trim: '#e8432f' },
    hat: 'beanie',
  },
  {
    id: 'ivy',
    name: 'Ivy',
    figure: 'female',
    build: 'average',
    skin: SKIN.olive,
    hair: '#2fbf71',
    hairStyle: 'ponytail',
    beard: 'none',
    top: 'tee',
    shirt: '#1f7a8c',
    trousers: '#1b1b1b',
    shoes: '#f4f1ea',
    accent: '#2fbf71',
    kit: {
      shell: '#1f7a8c',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#1b1b1b',
      trim: '#2fbf71',
    },
    earrings: true,
  },
  {
    id: 'rex',
    name: 'Rex Mullet',
    figure: 'male',
    build: 'average',
    skin: SKIN.fair,
    hair: '#e6c35c',
    hairStyle: 'mullet',
    beard: 'stubble',
    top: 'vest',
    shirt: '#4a6fa5',
    trousers: '#34507a',
    shoes: '#f4f1ea',
    accent: '#4a6fa5',
    kit: {
      shell: '#4a6fa5',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#1f2a40',
      trim: '#f4f1ea',
    },
    shades: true,
  },
  {
    id: 'kwame',
    name: 'Kwame',
    figure: 'male',
    build: 'heavy',
    skin: SKIN.ebony,
    hair: '#0e0b09',
    hairStyle: 'crop',
    beard: 'goatee',
    top: 'tee',
    shirt: '#f2c230',
    trousers: '#22305a',
    shoes: '#f4f1ea',
    accent: '#c40000',
    kit: { shell: '#f2c230', finish: 'gloss', hardware: 'chrome', rug: '#22305a', trim: '#c40000' },
    hat: 'cap',
    chain: true,
  },
  {
    id: 'sunny',
    name: 'Sunny Smash',
    figure: 'female',
    build: 'muscular',
    skin: SKIN.tan,
    hair: '#2a1c14',
    hairStyle: 'bun',
    beard: 'none',
    top: 'vest',
    shirt: '#ff7a00',
    trousers: '#111111',
    shoes: '#ff7a00',
    accent: '#36e0ff',
    kit: {
      shell: '#ff7a00',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#111111',
      trim: '#36e0ff',
    },
    hat: 'bandana',
    shades: true,
  },
  {
    id: 'priya',
    name: 'Priya',
    figure: 'female',
    build: 'slim',
    skin: SKIN.brown,
    hair: '#100c0a',
    hairStyle: 'long',
    beard: 'none',
    top: 'tee',
    shirt: '#c40000',
    trousers: '#1b1b1b',
    shoes: '#c9a24a',
    accent: '#c9a24a',
    kit: { shell: '#c40000', finish: 'gloss', hardware: 'gold', rug: '#1b1b1b', trim: '#c9a24a' },
    earrings: true,
    lipstick: true,
  },
  {
    id: 'olaf',
    name: 'Olaf',
    figure: 'male',
    build: 'slim',
    skin: SKIN.porcelain,
    hair: '#ece8df',
    hairStyle: 'bald',
    beard: 'viking',
    top: 'tee',
    shirt: '#22305a',
    trousers: '#3a3a3a',
    shoes: '#3a2414',
    accent: '#c40000',
    kit: { shell: '#22305a', finish: 'gloss', hardware: 'chrome', rug: '#3a3a3a', trim: '#c40000' },
    hat: 'beanie',
  },
  {
    id: 'dex',
    name: 'Dex',
    figure: 'male',
    build: 'average',
    skin: SKIN.deep,
    hair: '#39d353',
    hairStyle: 'mohawk',
    beard: 'none',
    top: 'vest',
    shirt: '#111111',
    trousers: '#7a1f1a',
    shoes: '#111111',
    accent: '#39d353',
    kit: {
      shell: '#39d353',
      finish: 'sparkle',
      hardware: 'black',
      rug: '#111111',
      trim: '#39d353',
    },
    earrings: true,
    chain: true,
  },
  {
    id: 'gran',
    name: 'Granny Groove',
    figure: 'female',
    build: 'heavy',
    skin: SKIN.fair,
    hair: '#d9d9de',
    hairStyle: 'bob',
    beard: 'none',
    top: 'tee',
    shirt: '#b39ddb',
    trousers: '#3a3a4a',
    shoes: '#f4f1ea',
    accent: '#e86a9a',
    kit: { shell: '#b39ddb', finish: 'gloss', hardware: 'chrome', rug: '#3a3a4a', trim: '#e86a9a' },
    shades: true,
    earrings: true,
    lipstick: true,
  },
  {
    id: 'paco',
    name: 'Paco Paradiddle',
    figure: 'male',
    build: 'average',
    skin: SKIN.tan,
    hair: '#141010',
    hairStyle: 'quiff',
    beard: 'handlebar',
    top: 'tee',
    shirt: '#d81b60',
    trousers: '#111111',
    shoes: '#f4f1ea',
    accent: '#d81b60',
    kit: {
      shell: '#d81b60',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#111111',
      trim: '#f4f1ea',
    },
    chain: true,
  },
  {
    id: 'zara',
    name: 'Zara Gold',
    figure: 'female',
    build: 'average',
    skin: SKIN.deep,
    hair: '#e0b24a',
    hairStyle: 'spikes',
    beard: 'none',
    top: 'vest',
    shirt: '#c0c4cc',
    trousers: '#111111',
    shoes: '#e0b24a',
    accent: '#e0b24a',
    kit: { shell: '#e0b24a', finish: 'sparkle', hardware: 'gold', rug: '#111111', trim: '#c0c4cc' },
    earrings: true,
    lipstick: true,
  },
  {
    id: 'baron',
    name: 'The Baron',
    figure: 'male',
    build: 'heavy',
    skin: SKIN.porcelain,
    hair: '#8c8c8c',
    hairStyle: 'crop',
    beard: 'full',
    top: 'tee',
    shirt: '#6a1b2a',
    trousers: '#1b1b1b',
    shoes: '#111111',
    accent: '#6a1b2a',
    kit: { shell: '#6a1b2a', finish: 'gloss', hardware: 'gold', rug: '#1b1b1b', trim: '#c9a24a' },
    hat: 'tophat',
  },
  {
    id: 'skye',
    name: 'Skye',
    figure: 'female',
    build: 'slim',
    skin: SKIN.fair,
    hair: '#f4ecd8',
    hairStyle: 'ponytail',
    beard: 'none',
    top: 'vest',
    shirt: '#36a3ff',
    trousers: '#f4f1ea',
    shoes: '#36a3ff',
    accent: '#ff2f8e',
    kit: { shell: '#36a3ff', finish: 'gloss', hardware: 'chrome', rug: '#e9e4d8', trim: '#ff2f8e' },
    hat: 'cap',
    lipstick: true,
  },
  {
    id: 'ali',
    name: 'Ali Anvil',
    figure: 'male',
    build: 'muscular',
    skin: SKIN.olive,
    hair: '#1a120c',
    hairStyle: 'crop',
    beard: 'stubble',
    top: 'bare',
    shirt: SKIN.olive,
    trousers: '#3a3a3a',
    shoes: '#111111',
    accent: '#e0b24a',
    kit: { shell: '#55595f', finish: 'metal', hardware: 'black', rug: '#1a1a1a', trim: '#e0b24a' },
    chain: true,
  },
  {
    id: 'unit808',
    name: 'Unit 808',
    figure: 'male',
    build: 'muscular',
    skin: SKIN.fair,
    hair: '#2a2d33',
    hairStyle: 'bald',
    beard: 'none',
    top: 'vest',
    shirt: '#15171b',
    trousers: '#2a2d33',
    shoes: '#0d0e10',
    accent: '#12b8ff',
    kit: { shell: '#2a2d33', finish: 'metal', hardware: 'black', rug: '#0d0e10', trim: '#12b8ff' },
    cyborg: 'full',
  },
  {
    id: 'rivet',
    name: 'Rivet',
    figure: 'female',
    build: 'slim',
    skin: SKIN.tan,
    hair: '#d9dbe3',
    hairStyle: 'bob',
    beard: 'none',
    top: 'vest',
    shirt: '#3b1420',
    trousers: '#1c1c22',
    shoes: '#111111',
    accent: '#ff3340',
    kit: { shell: '#3b1420', finish: 'gloss', hardware: 'black', rug: '#1c1c22', trim: '#ff3340' },
    cyborg: 'arm',
  },
  {
    // a gold robot, polished, with glowing eyes and a ribbed midriff
    id: 'brassbot',
    name: 'Brass Bot',
    kind: 'robot',
    cyborg: 'full',
    metal: '#d6a63c',
    figure: 'male',
    build: 'slim',
    skin: '#d6a63c',
    hair: '#d6a63c',
    hairStyle: 'bald',
    beard: 'none',
    top: 'bare',
    shirt: '#d6a63c',
    trousers: '#d6a63c',
    shoes: '#d6a63c',
    accent: '#ffc53d',
    kit: { shell: '#d6a63c', finish: 'metal', hardware: 'gold', rug: '#1a1508', trim: '#ffc53d' },
  },
  {
    // a big, friendly monster of a drummer: violet fur, a lavender belly and muzzle, a wild
    // crest, round ears, two little horns, and a sweatband for the long sets
    id: 'bigfuzz',
    name: 'Big Fuzz',
    kind: 'beast',
    figure: 'male',
    build: 'heavy',
    skin: '#6a4bb0',
    hair: '#6a4bb0',
    hairStyle: 'shag',
    beard: 'none',
    top: 'bare',
    shirt: '#6a4bb0',
    trousers: '#5a3e9a',
    shoes: '#46307a',
    accent: '#ff8a1f',
    kit: {
      shell: '#ff8a1f',
      finish: 'sparkle',
      hardware: 'chrome',
      rug: '#46307a',
      trim: '#6a4bb0',
    },
    headband: true,
    horns: true,
  },
];

/** Who sat at the kit last in this tab, once the view has shown them. */
let seated: string | undefined;

/**
 * Note who is at the kit, once they are on screen (from an effect, not while
 * rendering): the next time the view opens, somebody else sits in.
 */
export function noteSeated(id: string): void {
  seated = id;
}

/**
 * Anyone but the player `id`, at random: what Shuffle seats. Pure but for
 * `random`, so it is safe to call while rendering — a render that runs twice
 * picks twice, and whichever is kept is still somebody new.
 */
export function otherThan(id: string | undefined, random: () => number = Math.random): Persona {
  const pool = PERSONAS.filter((p) => p.id !== id);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/**
 * Who sits in as the drummer view opens: The Original the first time in a
 * tab, and after that anyone but whoever sat last — so opening the view again
 * shows somebody new. It only reads who sat last (see `noteSeated`): safe to
 * call while rendering.
 */
export function openingPersona(random: () => number = Math.random): Persona {
  return seated === undefined ? PERSONAS[0] : otherThan(seated, random);
}
