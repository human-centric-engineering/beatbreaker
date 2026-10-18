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
  kit: { shell: '#4f6fa8', finish: 'oyster', hardware: 'chrome', rug: '#3a2f2a' },
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

/**
 * Tomas Haake playing "Bleed" in New York on the 2009 obZen tour (Meshuggah's
 * Alive): big and solid, dark hair pulled back off an M of a hairline into a
 * ponytail below the shoulders, a short trimmed beard, black gloves, a washed
 * charcoal T-shirt and khaki shorts. His Sonor Designer in amber-stained wood.
 */
const HAAKE: Persona = {
  id: 'haake',
  name: 'Tomas Haake',
  figure: 'male',
  build: 'heavy',
  skin: '#ebc4a9',
  hair: '#3a2a20',
  hairStyle: 'tied',
  beard: 'short',
  top: 'tee',
  shirt: '#4b4d52',
  legs: 'shorts',
  trousers: '#a89a74',
  shoes: '#1a1a1a',
  gloves: '#141414',
  accent: '#4b4d52',
  headphones: false,
  kit: { shell: '#b06a2e', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Danny Carey with Tool on the Lateralus tour, Cleveland, 2002 (the drum-cam
 * film): very tall, long-limbed and powerful, mid-brown hair parted in the
 * middle and falling past the shoulders, clean-shaven, a loose basketball
 * jersey — a gold front, purple sides and back, piped in white — purple
 * shorts and sweatbands. The kit Paiste cast for him in bronze from melted
 * cymbals.
 */
const CAREY: Persona = {
  id: 'carey',
  name: 'Danny Carey',
  figure: 'male',
  build: 'muscular',
  skin: '#e4b796',
  hair: '#6e4d33',
  hairStyle: 'curtains',
  beard: 'none',
  top: 'jersey',
  shirt: '#f3b61f',
  legs: 'shorts',
  trousers: '#55267f',
  shoes: '#f2f2f0',
  wristbands: '#7a3c8c',
  accent: '#55267f',
  headphones: false,
  kit: { shell: '#b48a55', finish: 'metal', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Omar Hakim in Sting's Bring On the Night, Paris, May 1985 ("Consider Me
 * Gone", in the gilded salon of the Château de Courson): lean, short natural
 * hair, a close-trimmed beard, a soft grey jacket worn open over a grey
 * T-shirt, a long pale blue scarf hanging down either side. A kit in royal
 * blue.
 */
const HAKIM: Persona = {
  id: 'hakim',
  name: 'Omar Hakim',
  figure: 'male',
  build: 'slim',
  skin: '#6b432c',
  hair: '#15100d',
  hairStyle: 'natural',
  beard: 'short',
  top: 'jacket',
  shirt: '#55575c',
  under: '#a4a6aa',
  neckwear: 'tee',
  scarf: '#9fb6d4',
  trousers: '#4a4c52',
  shoes: '#e8e8e8',
  accent: '#1f5fb8',
  headphones: false,
  kit: { shell: '#1f5fb8', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Billy Cobham with the Mahavishnu Orchestra at the Festival de Châteauvallon,
 * August 1972 (filmed in colour for French TV, the "One Word" solo): broad,
 * muscular shoulders and arms, a short rounded afro, a short full beard and a
 * heavy moustache, gold aviators lightly tinted, a fitted emerald long-sleeved
 * top scooped at the neck, white trousers. His huge Fibes kit in clear acrylic.
 */
const COBHAM: Persona = {
  id: 'cobham',
  name: 'Billy Cobham',
  figure: 'male',
  build: 'muscular',
  skin: '#5e3b26',
  hair: '#16100c',
  hairStyle: 'rounded',
  beard: 'short',
  glasses: { shape: 'aviator', frame: '#c9a24a', tint: '#c9a46a' },
  top: 'scoop',
  shirt: '#1f7a4a',
  trousers: '#f2efe6',
  shoes: '#e8e8e8',
  accent: '#1f7a4a',
  headphones: false,
  kit: { shell: '#dfe6ea', finish: 'acrylic', hardware: 'chrome', rug: '#5a3a2a' },
};

/**
 * Gavin Harrison with Porcupine Tree at the 013, Tilburg, October 2008 (filmed
 * as Anesthetize): lean and compact, thick dark hair cut short and pushed
 * forward, clean-shaven, a plain black T-shirt, loose white trousers. His Sonor
 * Designer in its mottled "Earth" finish, dark under the stage light.
 */
const HARRISON: Persona = {
  id: 'harrison',
  name: 'Gavin Harrison',
  figure: 'male',
  build: 'slim',
  skin: '#edc6ab',
  hair: '#3a2a1f',
  hairStyle: 'tousled',
  beard: 'none',
  top: 'tee',
  shirt: '#141414',
  trousers: '#edebe4',
  shoes: '#141414',
  accent: '#141414',
  headphones: false,
  kit: { shell: '#4a4a2e', finish: 'satin', hardware: 'chrome', rug: '#2a2a2e' },
};

/**
 * Changuito with Los Van Van on TV3's "Ángel Casas Show", Barcelona, broadcast
 * 21 August 1984 (the songo band in colour, in its uniform): wiry, a very short
 * crop off a high forehead, a thin moustache, the band's long-sleeved shirt in
 * bold zigzag stripes of brown, caramel, cream and pink, its wide collar open,
 * dark brown flares. A kit in bright metal beside his timbales.
 */
const CHANGUITO: Persona = {
  id: 'changuito',
  name: 'Changuito',
  figure: 'male',
  build: 'slim',
  skin: '#6a4430',
  hair: '#15110e',
  hairStyle: 'natural',
  beard: 'pencil',
  top: 'button-up',
  shirt: '#a8673f',
  chevron: ['#4a2c1e', '#a8673f', '#efe2cf', '#d8b4a0'],
  neckwear: 'open',
  collar: 'spear',
  trousers: '#4a3226',
  shoes: '#2a1c14',
  footwear: 'shoes',
  accent: '#a8673f',
  headphones: false,
  kit: { shell: '#b9bcc0', finish: 'metal', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Michael Shrieve with Santana at Woodstock, 16 August 1969 (the "Soul
 * Sacrifice" solo in the film), aged 20: slight and boyish, a huge frizzy mop
 * of dark brown hair over the ears and a heavy fringe on the brows,
 * clean-shaven, a near-black shirt block-printed with small cream and
 * turquoise medallions, open at the neck. His Ludwig in pink champagne
 * sparkle.
 */
const SHRIEVE: Persona = {
  id: 'shrieve',
  name: 'Michael Shrieve',
  figure: 'male',
  build: 'slim',
  skin: '#ebc3a5',
  hair: '#3b2618',
  hairStyle: 'curly',
  beard: 'none',
  top: 'button-up',
  shirt: '#14262b',
  motifs: ['#d9c08a', '#3e8fb0'],
  neckwear: 'open',
  trousers: '#1a1a1f',
  shoes: '#2a2420',
  footwear: 'boots',
  accent: '#3e8fb0',
  headphones: false,
  kit: { shell: '#d8c1b6', finish: 'sparkle', hardware: 'chrome', rug: '#8a7458' },
};

/**
 * Horacio "El Negro" Hernández with Michel Camilo's trio in Fernando Trueba's
 * Calle 54 (filmed in New York, 2000): lean, fair, thick dark hair swept
 * straight back and hanging past the shoulders, clean-shaven, a loose
 * silver-grey satin shirt open at the collar. A big dark kit, its toms black
 * cherry.
 */
const HERNANDEZ: Persona = {
  id: 'horaciohernandez',
  name: 'Horacio Hernández',
  figure: 'male',
  build: 'slim',
  skin: '#d6a988',
  hair: '#2a1c14',
  hairStyle: 'backswept',
  beard: 'none',
  top: 'button-up',
  shirt: '#8a8c93',
  satin: true,
  neckwear: 'open',
  trousers: '#1c1c1e',
  shoes: '#141414',
  footwear: 'shoes',
  accent: '#9a9ca3',
  headphones: false,
  kit: { shell: '#2a1418', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Lenny White with Return to Forever on the Romantic Warrior tour, London, 8
 * March 1976 (Michael Putland's photos, black and white, so the colours other
 * than the white kit are a guess): solid through the shoulders, a medium
 * afro, a dense full beard, a light T-shirt, jeans. A kit in white.
 */
const LENNY_WHITE: Persona = {
  id: 'lennywhite',
  name: 'Lenny White',
  figure: 'male',
  build: 'average',
  skin: '#5a3826',
  hair: '#15100c',
  hairStyle: 'fro',
  beard: 'full',
  top: 'tee',
  shirt: '#cfcfcf',
  trousers: '#3d4f7a',
  shoes: '#3a2a1e',
  footwear: 'boots',
  accent: '#cfcfcf',
  headphones: false,
  kit: { shell: '#f2f0ea', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Dafnis Prieto with his Sí o Sí Quartet at the Library of Congress's "On
 * LOCation", Washington, 2010 (filmed in colour, with close-ups): lean, a full
 * mop of loose dark ringlets half over the ears, a light, patchy beard, a crisp white
 * shirt open at the collar, black trousers. His Yamaha Maple Custom Absolute,
 * a dark bronze burl.
 */
const PRIETO: Persona = {
  id: 'prieto',
  name: 'Dafnis Prieto',
  figure: 'male',
  build: 'slim',
  skin: '#d9ab88',
  hair: '#2b1d14',
  hairStyle: 'ringlets',
  // a thin moustache and a sparse chin beard in 2010, hardly more than a shadow
  beard: 'stubble',
  top: 'button-up',
  shirt: '#f4f4f2',
  neckwear: 'open',
  trousers: '#1a1a1c',
  shoes: '#141414',
  footwear: 'shoes',
  accent: '#d8233a',
  headphones: false,
  kit: { shell: '#4f4330', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Vinnie Colaiuta with Frank Zappa's band at Circus Krone, Munich, 8 September
 * 1978 (filmed in colour by Bayerischer Rundfunk; his first tour, aged 22):
 * slim, thick wavy dark hair to the shoulders, a full beard, big square
 * tortoiseshell glasses lightly tinted, a red T-shirt with "stuff" across the
 * chest. A Gretsch in bright yellow.
 */
const COLAIUTA: Persona = {
  id: 'colaiuta',
  name: 'Vinnie Colaiuta',
  figure: 'male',
  build: 'slim',
  skin: '#dcae8f',
  hair: '#3a2416',
  hairStyle: 'curtains',
  beard: 'short',
  glasses: { shape: 'square', frame: '#3d2418', tint: '#c8906a' },
  top: 'tee',
  shirt: '#c8281e',
  logo: { text: 'stuff', colour: '#f2f2f2' },
  trousers: '#3b4a6b',
  shoes: '#e8e4dc',
  accent: '#c8281e',
  headphones: false,
  kit: { shell: '#e8c814', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Cindy Blackman in Lenny Kravitz's "Are You Gonna Go My Way" video (1993, the
 * image that made her famous; its sepia grade checked against daylight footage
 * from Pinkpop that year): slender and athletic, a round natural afro, black
 * wraparound shades, a velvet choker with a red jewel, a black top under an
 * open black waistcoat trimmed in bronze-gold brocade. A small kit in white
 * marine pearl, here a white lacquer.
 */
const CINDY_BLACKMAN: Persona = {
  id: 'cindyblackman',
  name: 'Cindy Blackman Santana',
  figure: 'female',
  build: 'slim',
  skin: '#a26a48',
  hair: '#24170f',
  hairStyle: 'fro',
  beard: 'none',
  shades: true,
  choker: '#a3121e',
  top: 'tee',
  shirt: '#141414',
  waistcoat: { cloth: '#141414', trim: '#8a6a3a' },
  trousers: '#141414',
  shoes: '#141414',
  footwear: 'boots',
  accent: '#8a6a3a',
  headphones: false,
  kit: { shell: '#ece6d6', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Brian Downey with Thin Lizzy at the Rainbow Theatre, London, 29 March 1978
 * (the concert filmed for Live and Dangerous; the "Sha La La" solo has the
 * close-ups): slim, thick dark-brown hair in layers to the shoulders, over the
 * ears, its fringe parted and pushed off the brow, clean-shaven, a dusty pink
 * long-sleeved shirt with long collar points, open at the neck, dark trousers.
 * His Rogers, which Chas. Foote rewrapped in chrome because he could not buy a
 * chrome kit in London (Downey to Mike Dolbear), on two bass drums, a gong
 * behind it.
 */
const DOWNEY: Persona = {
  id: 'downey',
  name: 'Brian Downey',
  figure: 'male',
  build: 'slim',
  skin: '#ebc0a2',
  hair: '#2e2018',
  // parted and off the brow, to the collar
  hairStyle: 'curtains',
  beard: 'none',
  top: 'button-up',
  shirt: '#c4868a',
  neckwear: 'open',
  collar: 'spear',
  trousers: '#1e1c22',
  shoes: '#141210',
  // the feet are never in shot: boots, as the band wore them that year
  footwear: 'boots',
  accent: '#c4868a',
  headphones: false,
  kit: { shell: '#c4c8ce', finish: 'metal', hardware: 'chrome', rug: '#1c1c22' },
};

/** Each likeness by the catalogue style that plays them (the drummer record's `style_key`). */
/**
 * Joey Jordison with Slipknot at the London Docklands Arena, 16 February 2002,
 * on the Iowa tour (the Disasterpieces DVD: "Joey Drum Solo", YouTube
 * tUibKh0Z--c, and the "Disasterpiece" drum cam, YouTube l4y1HPrKa8I): slight
 * and short, long straight black hair parted in the middle and hanging past
 * the shoulders over a white kabuki-style mask — black round the eyes, black
 * and dark red streaks up the brow and down the cheeks, black lips. The band's
 * jumpsuit, off-white with black bands across the shoulder blades, a black
 * band at the wrist, bare hands, black boots, no headphones. Black shells,
 * white coated heads, chrome, Paiste RUDE cymbals; the riser's ring of red
 * light round the platform as the mat's trim.
 */
const JORDISON: Persona = {
  id: 'jordison',
  name: 'Joey Jordison',
  figure: 'male',
  build: 'slim',
  // only the hands show: the face is the mask's
  skin: '#e9c3a6',
  hair: '#0d0b0c',
  // parted in the middle, straight, falling past the shoulders over the mask's edges
  hairStyle: 'curtains',
  beard: 'none',
  // the band's one-piece boiler suit, long in the sleeve and to the ankle
  top: 'coveralls',
  shirt: '#d8d3c5',
  trousers: '#d8d3c5',
  shoes: '#111111',
  footwear: 'boots',
  wristbands: '#141414',
  // the black of the jumpsuit's bands and the mask's paint
  accent: '#141414',
  headphones: false,
  mask: 'jordison',
  kit: {
    shell: '#141416',
    finish: 'gloss',
    hardware: 'chrome',
    rug: '#1c1c22',
    // the red light tubes round the riser's round platform
    trim: '#c8141e',
  },
};

/**
 * Skinny (Steve Felton) of Mushroomhead in 2002, the XX year on Universal:
 * the "Solitaire Unraveling" video (1:15–1:19 at the kit, 1:31–1:34 from
 * overhead), the Ozzfest set at Alpine Valley, 11 August 2002 (the kit in
 * daylight), and Pierre's, Fort Wayne, 21 November 2002 (the camera behind
 * him on the riser). Not a face but a mask: a close-fitting black hood over
 * the whole head with the band's X face in white, and thick dreadlocks
 * growing from its crown, hanging down his back and flicking up as he
 * plays. A
 * dark work jacket buttoned to the neck with an X-face patch on the sleeve,
 * and the band's urban-camouflage trousers (grey here: the parts have no
 * camouflage) and black boots. Bare hands. His kit black lacquer and
 * chrome, a chrome rack across its front, the bass drum's head the X face
 * in a red ring.
 */
const SKINNY: Persona = {
  id: 'skinny',
  name: 'Skinny',
  figure: 'male',
  build: 'average',
  // his hands, the only skin that shows
  skin: '#e6b896',
  // the dreads: dark under the video's sepia, mid-tone under red light; a guess between
  hair: '#3a2a1e',
  hairStyle: 'locs',
  beard: 'none',
  top: 'button-up',
  shirt: '#1c1c1f',
  trousers: '#7d8085',
  shoes: '#141414',
  footwear: 'boots',
  // the white of the X face
  accent: '#ecebe6',
  headphones: false,
  mask: 'skinny',
  kit: { shell: '#111114', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22', trim: '#b8232a' },
};

/**
 * Jizmak Da Gusha of Gwar at Marathon Music Works, Nashville, on the
 * 40th-anniversary tour of 2025 (Another Rundown's kit film, published 21
 * November 2025, shot at his kit in full costume and in good light; the band's
 * own drum-cam of "Maggots", 2019, for how he sits and how high the cymbals
 * go): not a face but a monster's head — a flayed crimson face under a
 * bone-coloured skull crown ringed with short spikes, a row of yellow fangs
 * hanging from its brow, a great underjaw of yellow tusks, black hair falling
 * from the back of it — on a body of exposed red muscle, striated, bone ribs
 * down its sides and rows of bone fins along the shoulders. His Yamaha Live
 * Custom Oak, wrapped in the comic book The Return of Gor-Gor (red, orange and
 * yellow panels), purple hoops, chrome stands, purple Paiste cymbals, two
 * 22-inch bass drums.
 */
const JIZMAK: Persona = {
  id: 'jizmak',
  name: 'Jizmak Da Gusha',
  figure: 'male',
  // a broad suit, padded with muscle: big through the chest and shoulders
  build: 'muscular',
  // the costume's skin: exposed muscle, crimson, every part of him that shows
  skin: '#b8463e',
  // the black hair hanging from under the back of the crown, to the shoulder blades (the mask's)
  hair: '#1c1612',
  hairStyle: 'bald',
  beard: 'none',
  top: 'bare',
  shirt: '#b8463e',
  // the suit's legs are never in shot behind the kit: the body's red, as the arms are
  trousers: '#a23c36',
  shoes: '#2a1c18',
  footwear: 'boots',
  // bone: the crown, the fins and the ribs
  accent: '#d8c7a0',
  // in-ear monitors under the head, no headphones
  headphones: false,
  mask: 'jizmak',
  // the suit's hands, red and nail-less
  gloves: '#b8463e',
  kit: {
    // the comic wrap reads, from the throne, as red and orange panels
    shell: '#c8402e',
    finish: 'gloss',
    hardware: 'chrome',
    rug: '#1c1c22',
    // the purple of the hoops and the Color Sound cymbals
    trim: '#7b3fb0',
  },
};

/**
 * II of Sleep Token in "An Offering From Drumeo" (filmed for Drumeo, published
 * 19 December 2023, YouTube FOQJTiIwwEA: the close-up of the mask at 6:52–6:54,
 * the kit from the front at 7:02, from overhead at 6:54 and 7:17), in the
 * Take Me Back to Eden year, with the band's own "Hypnosis — an offering from
 * II" (2022, nNZlxQmpV8g) for how he sits. Not a face but a mask: a deep black
 * hood over a black cloth face covering, and over the face a flat, pale,
 * bone-and-pewter mask cut in an open pattern — an arch over the nose with a
 * spike and rays, the eyes outlined and swept up to points at the temples, an
 * X across the mouth, tapering bars down the cheeks to the jaw ("his old
 * mask": new ones came in at Wembley that month). Black long sleeves, black
 * gloves, a silver chain with a pendant, a row of silver eyelets across the
 * chest; no skin shows anywhere. His DW Collector's Series kit in a mottled
 * amber burl, gloss, chrome lugs and stands, under a wall of Istanbul Agop
 * cymbals and stacks, a Roland pad beside the hats. Only the costume: the
 * player's identity is theirs.
 */
const SLEEPTOKEN: Persona = {
  id: 'sleeptoken',
  name: 'II',
  figure: 'male',
  // loose black cloth from hood to gloves: nothing to read a build from
  build: 'average',
  // no skin shows: the cloth's black, so a gap at a cuff or collar reads as cloth
  skin: '#141214',
  hair: '#141214',
  // the hood covers the head; no hair is seen
  hairStyle: 'bald',
  beard: 'none',
  // a long-sleeved black robe-top, closed to the throat under the cowl's drape, to the gloves
  top: 'button-up',
  shirt: '#161417',
  trousers: '#121113',
  shoes: '#0f0e0f',
  footwear: 'boots',
  // the mask's pale bone, the one light thing on him
  accent: '#d3ccbc',
  // a silver chain at the throat, its pendant on the chest
  chain: true,
  gloves: '#121113',
  // nothing over the hood: in-ears, if any, are under it
  headphones: false,
  mask: 'sleeptoken',
  kit: {
    // the burl veneer's mid-tone, amber to brown under lacquer; the figure itself is not shown
    shell: '#8a5a2e',
    finish: 'gloss',
    hardware: 'chrome',
    // Drumeo's black stage floor
    rug: '#141414',
  },
};

/**
 * The Nameless Ghoul on drums with Ghost at Hellfest, Clisson, 19 June 2016, on the Meliora tour
 * (the Arte Concert broadcast, YouTube mD0SbAPLlWE: the drummer close up at 7:52 and 28:10, two
 * ghouls in profile at 26:03), with the band's daylight set at Rockavaria, Munich, 29 May 2016
 * (Wikimedia Commons, "Ghost Rockavaria 2016", for the metal's colour and the kit) and Emo's,
 * Austin, 25 April 2016 (Commons, Ralph Arvesen, for the horns and the coats close to). Not a face
 * but a mask: a full-face mask in brushed silver, a long aquiline nose, a chin drawn down to a
 * point, deep-set almond eyes, two short horns over the brow and a ridged sweep of sculpted hair
 * over the crown curling down behind the ears, a black hood under it to the collar. A black coat
 * buttoned to a stand collar, the five elemental symbols embroidered in silver-grey on the right
 * breast; black trousers; bare hands. A black Tama kit with chrome hardware and one bass drum.
 * Only the costume: the player's identity is theirs, and more than one has worn it.
 */
const GHOUL: Persona = {
  id: 'ghoul',
  name: 'Nameless Ghoul (drums)',
  // the cut of the coat, shoulders and chest; the player is not the point
  figure: 'male',
  build: 'average',
  // the hands, the only skin that shows
  skin: '#e2b493',
  // the black hood under the mask, over the back of the head and down the neck
  hair: '#0e0e10',
  hairStyle: 'bald',
  beard: 'none',
  // the coat: black, buttoned down the front to the neck
  top: 'button-up',
  shirt: '#121214',
  trousers: '#111113',
  shoes: '#0c0c0d',
  // never in shot behind the kit
  footwear: 'boots',
  // the mask's silver, and the embroidery's
  accent: '#b9bcc2',
  // in-ear monitors under the hood, if anything: no headphones over the mask
  headphones: false,
  mask: 'ghoul',
  kit: {
    shell: '#121214',
    finish: 'gloss',
    hardware: 'chrome',
    // the black riser it stands on
    rug: '#18181c',
  },
};

/**
 * Gabe Serbian of the Locust at Hellfest 2003, touring Plague Soundscapes
 * ("Teenage Mustache (Live @ Hellfest 2003)", 0:09–0:16 and 0:34–0:38 from
 * above and beside the kit, in colour and daylight; the band's uniform as
 * L.A. Weekly saw it that September: "formfitting full-body suits colored a
 * dingy green ... rough like unfinished canvas, but skintight like spandex",
 * mesh vents at the upper arms, hoods whose "mouths and eyes are big fishnet
 * circles"; the hood front-on in the Gleis 22 photo of 2005). No face but
 * the hood: olive cloth over the whole head and down into the collar, a
 * band of black mesh across the eyes, a round mesh mouth he wore open. A sleeveless top in near
 * black, its armholes bound in olive and a red stripe across the chest; bare
 * arms, light olive skin, tattoos on the forearms; khaki trousers and black
 * boots (the boots as the guitarist's in the same clip). Bare hands. A
 * four-piece Ludwig in green lacquer with chrome and white coated heads,
 * Zildjian crashes low over it.
 */
const LOCUST: Persona = {
  id: 'locust',
  name: 'Gabe Serbian',
  figure: 'male',
  // "wiry, lean ... skinny" (L.A. Weekly, 2003); the arms are a drummer's
  build: 'slim',
  // his arms in daylight, the stage's pink taken out
  skin: '#d6a383',
  // no hair shows under the hood
  hair: '#6e6b4f',
  hairStyle: 'bald',
  beard: 'none',
  top: 'vest',
  shirt: '#2a2524',
  trousers: '#8a7c58',
  shoes: '#1a1918',
  footwear: 'boots',
  // the red stripe across the top's chest
  accent: '#a1323a',
  headphones: false,
  mask: 'locust',
  kit: { shell: '#3f6b3c', finish: 'gloss', hardware: 'chrome', rug: '#2b2a2c' },
};

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
  haake: HAAKE,
  carey: CAREY,
  hakim: HAKIM,
  cobham: COBHAM,
  harrison: HARRISON,
  changuito: CHANGUITO,
  shrieve: SHRIEVE,
  horaciohernandez: HERNANDEZ,
  lennywhite: LENNY_WHITE,
  prieto: PRIETO,
  colaiuta: COLAIUTA,
  cindyblackman: CINDY_BLACKMAN,
  downey: DOWNEY,
  jordison: JORDISON,
  skinny: SKINNY,
  jizmak: JIZMAK,
  sleeptoken: SLEEPTOKEN,
  ghoul: GHOUL,
  locust: LOCUST,
};

/** The drummer who sits in as themselves for `style`, if it is a drummer's own with a likeness. */
export function likenessFor(style: string): Persona | undefined {
  return Object.hasOwn(LIKENESSES, style) ? LIKENESSES[style] : undefined;
}
