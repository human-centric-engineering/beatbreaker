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
  build: 'slim',
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

/**
 * John Bonham playing "Moby Dick" at Madison Square Garden, July 1973 (the
 * concerts filmed for The Song Remains the Same, not the 1974 Shepperton
 * inserts): stocky and barrel-chested, thick dark wavy hair to the collarbone
 * with a heavy fringe, a short scruffy beard, an orange-red scoop-necked tank
 * top and blue flares. His Ludwig Amber Vistalite, see-through amber acrylic.
 */
const BONHAM: Persona = {
  id: 'bonham',
  name: 'John Bonham',
  figure: 'male',
  build: 'muscular',
  skin: '#e6b89c',
  hair: '#2a1d16',
  hairStyle: 'mane',
  beard: 'short',
  top: 'vest',
  shirt: '#e8613c',
  trousers: '#28307a',
  shoes: '#2a2420',
  footwear: 'boots',
  accent: '#e8613c',
  headphones: false,
  kit: { shell: '#d9a04a', finish: 'acrylic', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Ringo Starr on The Ed Sullivan Show, 9 February 1964: slight, a thick dark
 * brown mop-top with its fringe at the eyebrows, clean-shaven, a near-black
 * slim suit buttoned high over a white shirt and a skinny black tie, Cuban-
 * heeled boots. His Ludwig Downbeat in black oyster pearl.
 */
const RINGO: Persona = {
  id: 'ringo',
  name: 'Ringo Starr',
  figure: 'male',
  build: 'slim',
  skin: '#ebc2a4',
  hair: '#3b2818',
  hairStyle: 'mop',
  beard: 'none',
  top: 'jacket',
  shirt: '#1f1f24',
  under: '#f2f2ee',
  tie: '#141414',
  trousers: '#1f1f24',
  shoes: '#111111',
  footwear: 'boots',
  accent: '#1f1f24',
  headphones: false,
  kit: { shell: '#5a5c62', finish: 'oyster', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Clyde Stubblefield with the James Brown Revue on The Hollywood Palace,
 * aired 3 February 1968 (the "Cold Sweat" medley, the only colour close-ups
 * of him at the kit in the 60s): slim, a close natural crop, a pencil
 * moustache, the band's uniform — a bright blue jacket with lapels of its own
 * cloth, a white shirt and a black bow tie. A small red sparkle kit.
 */
const STUBBLEFIELD: Persona = {
  id: 'stubblefield',
  name: 'Clyde Stubblefield',
  figure: 'male',
  build: 'slim',
  skin: '#5c3a26',
  hair: '#141010',
  hairStyle: 'natural',
  beard: 'pencil',
  top: 'jacket',
  shirt: '#2f6fbf',
  under: '#f2f0ea',
  neckwear: 'bow',
  tie: '#111111',
  trousers: '#2a5aa0',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#2f6fbf',
  headphones: false,
  kit: { shell: '#b3202a', finish: 'sparkle', hardware: 'chrome', rug: '#3a2f2a' },
};

/**
 * Tony Williams with the Miles Davis Quintet in Europe, autumn 1967 (the TV
 * concerts in Stockholm and Karlsruhe), aged 21: slight, a short rounded
 * natural crop, a thin moustache, a black dinner jacket with satin lapels, a
 * white shirt and a black bow tie. His Gretsch in black.
 */
const TONY_WILLIAMS: Persona = {
  id: 'tonywilliams',
  name: 'Tony Williams',
  figure: 'male',
  build: 'slim',
  skin: '#6e4630',
  hair: '#18130f',
  hairStyle: 'natural',
  beard: 'pencil',
  top: 'tuxedo',
  shirt: '#141414',
  under: '#f2f0ea',
  trousers: '#141414',
  shoes: '#0f0f0f',
  footwear: 'shoes',
  accent: '#141414',
  headphones: false,
  kit: { shell: '#111111', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Ginger Baker at Cream's farewell, the Royal Albert Hall, 26 November 1968
 * ("Toad"): lean and wiry, very pale, ginger hair swept straight back off a
 * high, receding forehead and flipping out at the collar, a short scraggly
 * ginger beard, a loose bottle-green kaftan embroidered in gold, red and black
 * down the front and round the cuffs. His Ludwig in silver sparkle.
 */
const BAKER: Persona = {
  id: 'baker',
  name: 'Ginger Baker',
  figure: 'male',
  build: 'slim',
  skin: '#efd3be',
  hair: '#a8784a',
  hairStyle: 'swept',
  beard: 'short',
  top: 'kaftan',
  shirt: '#1e5b3a',
  trousers: '#2a2a2e',
  shoes: '#2a2420',
  footwear: 'boots',
  accent: '#c79a3a',
  headphones: false,
  kit: { shell: '#c9cdd2', finish: 'sparkle', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Phil Collins singing "In the Air Tonight" from the drum stool, Perkins
 * Palace, Pasadena, 1982 (the Hello, I Must Be Going! tour, filmed): short and
 * a little stocky, mid-brown hair receding deep at the temples and thin on
 * top, clean-shaven, the band's "office" look — a white shirt with its sleeves
 * rolled and its collar open under a loosened tie, dark braces, khaki
 * trousers. His Pearl in natural lacquered birch.
 */
const COLLINS: Persona = {
  id: 'collins',
  name: 'Phil Collins',
  figure: 'male',
  build: 'average',
  skin: '#ebc1a3',
  hair: '#5a4430',
  hairStyle: 'receding',
  beard: 'none',
  top: 'button-up',
  shirt: '#f1f1ee',
  neckwear: 'loose',
  tie: '#8a7048',
  rolled: true,
  braces: '#1e1a18',
  trousers: '#b7a27c',
  shoes: '#2a2420',
  footwear: 'shoes',
  accent: '#8a7048',
  headphones: false,
  kit: { shell: '#c99a5b', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Elvin Jones with the John Coltrane Quartet on Ralph J. Gleason's "Jazz
 * Casual", filmed 7 December 1963: powerfully built through the shoulders and
 * arms, a very short natural crop, clean-shaven, a loose long-sleeved shirt in
 * a large check, open at the neck. The film is black and white, so the
 * check's colours are a guess. His Gretsch in white satin flame.
 */
const ELVIN_JONES: Persona = {
  id: 'elvinjones',
  name: 'Elvin Jones',
  figure: 'male',
  build: 'muscular',
  skin: '#4a2e21',
  hair: '#141110',
  hairStyle: 'natural',
  beard: 'none',
  top: 'button-up',
  shirt: '#e6dcc4',
  plaid: { band: '#8a4b2e', line: '#3a2a22' },
  neckwear: 'open',
  trousers: '#2a2a2a',
  shoes: '#1a1a1a',
  footwear: 'shoes',
  accent: '#8a4b2e',
  headphones: false,
  kit: { shell: '#e4ddd0', finish: 'satin', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Jabo Starks with James Brown on Soul Train, taped January 1973: stocky and
 * round-faced, a short rounded afro, clean-shaven, the band's navy two-piece —
 * a shirt with a big spear-point collar open at the neck over matching flares.
 * A kit of clear acrylic.
 */
const JABO_STARKS: Persona = {
  id: 'jabostarks',
  name: 'Jabo Starks',
  figure: 'male',
  build: 'heavy',
  skin: '#5a3a26',
  hair: '#151111',
  hairStyle: 'rounded',
  beard: 'none',
  top: 'button-up',
  shirt: '#26285e',
  neckwear: 'open',
  collar: 'spear',
  trousers: '#26285e',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#26285e',
  headphones: false,
  kit: { shell: '#d8dde2', finish: 'acrylic', hardware: 'chrome', rug: '#5a2a2a' },
};

/**
 * Max Roach with his quintet, filmed in Paris in 1960 (the look he kept from
 * the Clifford Brown–Max Roach years on): slim and square-shouldered, short
 * dense hair brushed straight back from a high M of a hairline, a pencil
 * moustache, a black dinner jacket buttoned over a white shirt and a bow tie.
 * His Gretsch in silver sparkle.
 */
const ROACH: Persona = {
  id: 'roach',
  name: 'Max Roach',
  figure: 'male',
  build: 'slim',
  skin: '#7a5034',
  hair: '#15110e',
  hairStyle: 'slick',
  beard: 'pencil',
  top: 'tuxedo',
  shirt: '#141414',
  under: '#f2f0ea',
  trousers: '#121212',
  shoes: '#0e0e0e',
  footwear: 'shoes',
  accent: '#141414',
  headphones: false,
  kit: { shell: '#c9c9c4', finish: 'sparkle', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Roy Haynes with his quartet at Lennie's on the Turnpike, Peabody,
 * Massachusetts, February 1964 (the dapper look he kept from the Parker years
 * to Now He Sings, Now He Sobs): short and wiry, short dense hair brushed back,
 * a neat moustache, a flecked grey tweed sport coat over a white shirt and a
 * narrow dark tie. His Slingerland in white.
 */
const HAYNES: Persona = {
  id: 'haynes',
  name: 'Roy Haynes',
  figure: 'male',
  build: 'slim',
  skin: '#6f4630',
  hair: '#16120f',
  hairStyle: 'slick',
  beard: 'moustache',
  top: 'jacket',
  shirt: '#6e6b64',
  fleck: '#b9b4a8',
  under: '#f2f0ea',
  tie: '#1e1e22',
  trousers: '#2b2b2e',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#1e1e22',
  headphones: false,
  kit: { shell: '#ecebe6', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Jack DeJohnette with Miles Davis at the Isle of Wight Festival, 29 August
 * 1970 (filmed in colour, in daylight): lean, a medium afro, a full moustache,
 * gold aviators with amber lenses, a loose white collarless tunic slit open at
 * the neck, scarlet trousers. A kit in blue pearl.
 */
const DEJOHNETTE: Persona = {
  id: 'dejohnette',
  name: 'Jack DeJohnette',
  figure: 'male',
  build: 'slim',
  skin: '#8a5a3c',
  hair: '#17120f',
  hairStyle: 'fro',
  beard: 'moustache',
  glasses: { shape: 'aviator', frame: '#c9a24a', tint: '#b07a3a' },
  top: 'tunic',
  shirt: '#f2efe8',
  trousers: '#c0262a',
  shoes: '#3a2a20',
  footwear: 'boots',
  accent: '#c0262a',
  headphones: false,
  kit: { shell: '#3b4f7a', finish: 'oyster', hardware: 'chrome', rug: '#3a2f2a' },
};

/**
 * Dave Lombardo with Slayer on the Clash of the Titans tour, Lakeland,
 * Florida, July 1991 (the "Raining Blood" footage of Decade of Aggression):
 * lean and wiry, near-black hair parted in the middle and falling past the
 * shoulders, clean-shaven, a white tank top cut deep at the arms, tight black
 * leather trousers. His Tama, its shells like chrome, on two bass drums.
 */
const LOMBARDO: Persona = {
  id: 'lombardo',
  name: 'Dave Lombardo',
  figure: 'male',
  build: 'slim',
  skin: '#d7a57f',
  hair: '#2b1d15',
  hairStyle: 'curtains',
  beard: 'none',
  top: 'vest',
  shirt: '#ecede8',
  trousers: '#141414',
  shoes: '#f2f2f0',
  accent: '#c9cdd2',
  headphones: false,
  kit: { shell: '#b9bec4', finish: 'metal', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Tony Allen with Fela Kuti and Africa 70 at the Berliner Jazztage, 4
 * November 1978 (the band's best-filmed concert, and among his last with
 * Fela): tall, lean and long-necked, short natural hair, clean-shaven, a loose
 * tobacco-brown shirt open at the collar, not the band's mustard suits. A kit
 * in bright orange, a rank of toms across its bass drum.
 */
const TONY_ALLEN: Persona = {
  id: 'tonyallen',
  name: 'Tony Allen',
  figure: 'male',
  build: 'slim',
  skin: '#3b2418',
  hair: '#0f0c0b',
  hairStyle: 'natural',
  beard: 'none',
  top: 'button-up',
  shirt: '#5e3720',
  neckwear: 'open',
  trousers: '#5a3a24',
  shoes: '#2a1a10',
  footwear: 'shoes',
  accent: '#d9a21f',
  headphones: false,
  kit: { shell: '#e07a2a', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Ari Hoenig with Jean-Michel Pilc's trio at the Montreal International Jazz
 * Festival, 1 July 2011 (filmed, with close-ups): lean and long-limbed, short
 * light brown hair tousled up on top from a high forehead, clean-shaven, a
 * slim grey shirt open at the collar. His Yamaha Absolute Maple, natural
 * maple, a small four-piece.
 */
const HOENIG: Persona = {
  id: 'hoenig',
  name: 'Ari Hoenig',
  figure: 'male',
  build: 'slim',
  skin: '#e9c6aa',
  hair: '#6a4c33',
  hairStyle: 'tousled',
  beard: 'none',
  top: 'button-up',
  shirt: '#7a7a82',
  neckwear: 'open',
  trousers: '#1e1e22',
  shoes: '#1a1a1a',
  footwear: 'shoes',
  accent: '#7a7a82',
  headphones: false,
  kit: { shell: '#c48a4a', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Antonio Sánchez with the Pat Metheny Group on The Way Up tour, Seoul, 2005
 * (the tour film; Birdman's drummer on screen is not him): solid and
 * broad-chested, short dark hair brushed up and forward, a heavy dark shadow
 * of stubble, a fitted red T-shirt, dark jeans. His Yamaha in black, a stand
 * of cymbals round it.
 */
const SANCHEZ: Persona = {
  id: 'sanchez',
  name: 'Antonio Sánchez',
  figure: 'male',
  build: 'average',
  skin: '#c99a74',
  hair: '#1c1612',
  hairStyle: 'tousled',
  beard: 'stubble',
  top: 'tee',
  shirt: '#d62a2a',
  trousers: '#3c4a63',
  shoes: '#151515',
  footwear: 'shoes',
  accent: '#d62a2a',
  headphones: false,
  kit: { shell: '#15161c', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Tito Puente and his Latin Jazz Ensemble at the Montreal International Jazz
 * Festival, 3 July 1983: short and stocky, his famous thick, wavy silver-white
 * hair swept up and back, a thin grey moustache, a loose cream guayabera, cream
 * slacks. He played timbales, standing: here they are the kit's toms, in dark
 * polished steel.
 */
const PUENTE: Persona = {
  id: 'puente',
  name: 'Tito Puente',
  figure: 'male',
  build: 'heavy',
  skin: '#d8a77f',
  hair: '#dcdad3',
  hairStyle: 'pompadour',
  beard: 'moustache',
  top: 'guayabera',
  shirt: '#ecd9a6',
  trousers: '#e4dcc8',
  shoes: '#3a2a1e',
  footwear: 'shoes',
  accent: '#ecd9a6',
  headphones: false,
  kit: { shell: '#b8bcc2', finish: 'metal', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Yussef Dayes at Joshua Tree, filmed at golden hour and released in August
 * 2022 (the Experience band that made Black Classical Music): lean, his locs
 * up inside a tall, slouching crocheted tam in deep red, a short beard, an
 * aqua mesh vest over matching loose trousers. A small kit in green sparkle.
 */
const YUSSEF_DAYES: Persona = {
  id: 'yussefdayes',
  name: 'Yussef Dayes',
  figure: 'male',
  build: 'slim',
  skin: '#8c5a3a',
  hair: '#1a120d',
  // his locs are up inside the tam
  hairStyle: 'bald',
  beard: 'short',
  hat: 'tam',
  top: 'vest',
  shirt: '#3fb4c4',
  net: true,
  trousers: '#3aa6b8',
  shoes: '#e8e8e8',
  accent: '#8e2a2a',
  headphones: false,
  kit: { shell: '#a8b23a', finish: 'sparkle', hardware: 'chrome', rug: '#b9a487' },
};

/**
 * Steve Gadd with Simon & Garfunkel at The Concert in Central Park, 19
 * September 1981 ("50 Ways to Leave Your Lover"; the drummer in the red cap is
 * Grady Tate): solid through the shoulders, a big mop of dark curls over the
 * ears, a close-trimmed full beard, a red track jacket with a green yoke,
 * zipped to the chest over a red T-shirt. His Yamaha in black.
 */
const GADD: Persona = {
  id: 'gadd',
  name: 'Steve Gadd',
  figure: 'male',
  build: 'average',
  skin: '#d6a283',
  hair: '#2b1d15',
  hairStyle: 'curly',
  beard: 'short',
  top: 'track',
  shirt: '#d63a1e',
  under: '#c8301c',
  trousers: '#2a2a33',
  shoes: '#e6e6e6',
  accent: '#1f6b45',
  headphones: false,
  kit: { shell: '#15161a', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Adrienne Davies with Earth on the European tour for The Bees Made Honey in
 * the Lion's Skull, STUK, Leuven, 27 March 2009 (her look barely changed from
 * Hex on): solid, long dark-blonde hair parted and falling past the shoulders,
 * a plain black T-shirt. A small kit in black sparkle, its cymbals hung high.
 */
const DAVIES: Persona = {
  id: 'davies',
  name: 'Adrienne Davies',
  figure: 'female',
  build: 'average',
  skin: '#f0cbb1',
  hair: '#8c6b4a',
  hairStyle: 'curtains',
  beard: 'none',
  top: 'tee',
  shirt: '#141414',
  trousers: '#1e2230',
  shoes: '#1a1a1a',
  footwear: 'boots',
  accent: '#141414',
  headphones: false,
  kit: { shell: '#1c1c22', finish: 'sparkle', hardware: 'chrome', rug: '#1c1c22' },
};

/** Each likeness by the catalogue style that plays them (the drummer record's `style_key`). */
export const LIKENESSES: Readonly<Record<string, Persona>> = {
  copeland: COPELAND,
  bernardpurdie: PURDIE,
  mitchell: MITCHELL,
  klek: KLEK,
  bonham: BONHAM,
  ringo: RINGO,
  stubblefield: STUBBLEFIELD,
  tonywilliams: TONY_WILLIAMS,
  baker: BAKER,
  collins: COLLINS,
  elvinjones: ELVIN_JONES,
  jabostarks: JABO_STARKS,
  roach: ROACH,
  haynes: HAYNES,
  dejohnette: DEJOHNETTE,
  lombardo: LOMBARDO,
  tonyallen: TONY_ALLEN,
  hoenig: HOENIG,
  sanchez: SANCHEZ,
  puente: PUENTE,
  yussefdayes: YUSSEF_DAYES,
  gadd: GADD,
  davies: DAVIES,
};

/** The drummer who sits in as themselves for `style`, if it is a drummer's own with a likeness. */
export function likenessFor(style: string): Persona | undefined {
  return Object.hasOwn(LIKENESSES, style) ? LIKENESSES[style] : undefined;
}
