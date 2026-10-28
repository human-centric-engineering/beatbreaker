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
 * headphones. His Tama in dark blue sparkle with chrome, its rank of octobans
 * over the toms, and THE POLICE in grey on its black front head under Tama's
 * name in gold, as a photograph of the kit the owner supplied shows it
 * (2026-10-27).
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
    shell: '#1d3a6c',
    finish: 'sparkle',
    hardware: 'chrome',
    rug: '#1c1c22',
    octobans: true,
    head: { art: 'the-police', ground: '#121212', ink: '#b8b8b8', accent: '#c9a24a' },
  },
};

/**
 * Bernard "Pretty" Purdie at the kit now, from a photograph the user gave
 * (2026-10-19): stocky, a big smile, a grey moustache; a white flat cap; a
 * waistcoat in charcoal with black pinstripes, buttoned under a V, over a pale
 * blue shirt and a patterned tie (blue the most of it); his kit a deep red
 * gloss, chrome hardware.
 */
const PURDIE: Persona = {
  id: 'purdie',
  name: 'Bernard Purdie',
  figure: 'male',
  build: 'heavy',
  skin: '#5a3a28',
  hair: '#6a6662',
  // cropped short under the cap
  hairStyle: 'crop',
  hairTexture: 'coily',
  beard: 'moustache',
  top: 'button-up',
  shirt: '#d4e2f0',
  neckwear: 'long',
  tie: '#34528c',
  waistcoat: { cloth: '#3c3c40', trim: '#1a1a1c', buttoned: true, stripes: '#121214' },
  trousers: '#1c1e26',
  shoes: '#0e0e0e',
  // the cap's colour
  accent: '#eeece6',
  hat: 'flat',
  headphones: false,
  kit: { shell: '#8a1218', finish: 'gloss', hardware: 'chrome', rug: '#2a2226' },
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
 * heeled boots. His Ludwig Downbeat in black oyster pearl, its silvery
 * streaks laid round the shells (from a photograph of the kit the owner
 * supplied, 2026-10-27), the band's drop-T logo on its front head under the
 * maker's name.
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
  kit: {
    shell: '#a4a6ac',
    finish: 'oyster',
    streaks: true,
    hardware: 'chrome',
    rug: '#1c1c22',
    head: { art: 'the-beatles', ground: '#f4f2ec', ink: '#141414' },
  },
};

/**
 * Ringo Starr in 1967, for Sgt. Pepper: the album cover's shoot (30 March) and
 * the promotional films of the year. His uniform in cerise satin, closed to a
 * standing collar, frogged in gold, gold-fringed epaulettes and pale blue
 * cords from the right shoulder, medals on the left breast; the mop grown
 * out and swept across, sideburns and a full moustache. His Ludwig in silver
 * sparkle, with the cover's bass drum for its front head.
 */
// no shirt or tie shows: the tunic closes to its collar
const { under: _under, tie: _tie, ...RINGO_1964 } = RINGO;
const RINGO_PEPPER: Persona = {
  ...RINGO_1964,
  id: 'ringo-pepper',
  hairStyle: 'pepper',
  beard: 'droop',
  top: 'military',
  satin: true,
  shirt: '#b81f78',
  trousers: '#b81f78',
  accent: '#d4a63a',
  regalia: { braid: '#d4a63a', cords: '#7fb0dc', medals: true },
  kit: {
    shell: '#c4c7cc',
    finish: 'sparkle',
    hardware: 'chrome',
    rug: '#2a1f1a',
    head: { art: 'sgt-pepper', ground: '#f1e8cf', ink: '#2a1a12' },
  },
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
 * Ginger Baker on stage in the seventies, from a photograph the user gave
 * (2026-10-19): lean, very pale; a big head of copper-ginger hair, wavy and
 * frizzing, swept up and back off a high forehead to the collar; a short,
 * scraggly ginger beard and moustache; an off-white western shirt with dark
 * topstitching, open over a white T-shirt; dark jeans. His Ludwig in silver
 * sparkle, chrome hardware.
 */
const BAKER: Persona = {
  id: 'baker',
  name: 'Ginger Baker',
  figure: 'male',
  build: 'slim',
  skin: '#efd3be',
  hair: '#a4441e',
  // swept up and back, wavy and full, to the collar
  hairStyle: 'tousled',
  beard: 'short',
  top: 'button-up',
  shirt: '#e6e0d2',
  // open at the neck (the T-shirt under it is left off: a button-up has no shirt under it)
  neckwear: 'open',
  trousers: '#283246',
  shoes: '#2a2420',
  footwear: 'boots',
  accent: '#e6e0d2',
  headphones: false,
  kit: { shell: '#d2d6dc', finish: 'sparkle', hardware: 'chrome', rug: '#2a2626' },
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
  hairTexture: 'coily',
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
  hairTexture: 'coily',
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
 * Tony Allen in his later years, from photographs the user gave (2026-10-19):
 * lean, a wide gap-toothed smile, clean-shaven; a gold sequinned trilby, its
 * brim snapped down over the brow; a loose shirt in a
 * green-and-yellow wax print with purple and gold diamonds, open at the
 * collar; a gold chain with a pendant, a small hoop in the ear. His kit a deep
 * red gloss, chrome hardware.
 */
const TONY_ALLEN: Persona = {
  id: 'tonyallen',
  name: 'Tony Allen',
  figure: 'male',
  build: 'slim',
  skin: '#3b2418',
  hair: '#3a3634',
  // cut close: none of it shows under the hat
  hairStyle: 'bald',
  beard: 'none',
  top: 'button-up',
  shirt: '#8ea232',
  neckwear: 'open',
  motifs: ['#6a3a78', '#d8a83a'],
  trousers: '#1e1c1a',
  shoes: '#14100e',
  footwear: 'shoes',
  // the trilby's sequins
  accent: '#d8ae4a',
  hat: 'trilby',
  sequins: true,
  earrings: true,
  chain: true,
  headphones: false,
  kit: { shell: '#8a1a1c', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
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

/**
 * Zigaboo Modeliste with the Meters on Soundstage, "Dr. John's New Orleans
 * Swamp" (WTTW Chicago, PBS, taped 1974, the Rejuvenation year; the Meters'
 * set, youtube.com/watch?v=p5IQ0y8wllk, the kit at 1:56–2:04, 3:00–3:18,
 * 3:52–3:58, 6:40 and 6:56): slim, light brown, straight black hair combed
 * back off the brow and behind the ears, hanging to the collar; a moustache
 * to the corners of the mouth; a pale long-sleeved shirt open at the neck,
 * its long collar points spread. A dark red-brown wood-grain kit in gloss
 * with chrome hoops and stands; the floor tom, a silver-white swirl, does
 * not match it, which the 3D kit cannot show. His feet and
 * trousers are never in shot: dark trousers and boots, as the band dressed.
 */
const ZIGABOO: Persona = {
  id: 'zigaboo',
  name: 'Zigaboo Modeliste',
  figure: 'male',
  build: 'slim',
  skin: '#a87650',
  hair: '#15100d',
  // combed straight back with no parting, behind the ears to the collar
  hairStyle: 'swept',
  beard: 'moustache',
  top: 'button-up',
  shirt: '#e4e0d8',
  neckwear: 'open',
  collar: 'spear',
  trousers: '#22201e',
  shoes: '#161412',
  footwear: 'boots',
  accent: '#e4e0d8',
  headphones: false,
  kit: { shell: '#4a2416', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Al Jackson Jr. with Booker T. & the M.G.'s behind Otis Redding at the
 * Monterey International Pop Festival, 17 June 1967 (D.A. Pennebaker's film,
 * Shake! Otis at Monterey; YouTube NuJTUpJzLOw, the close-ups at the kit at
 * 3:28–3:33 and 4:14–4:21, and AqYWfxmAStU, the wide shots): slim, close-cropped
 * natural hair, a thin moustache, a pale lime single-breasted jacket over a
 * jade-green high-necked top (Cropper and Dunn beside him in olive suits). His
 * trousers are behind the kit and never in shot: the jacket's colour, as a suit.
 * A white-wrapped kit, chrome, a script "R" on the bass drum's head; no
 * headphones.
 */
const AL_JACKSON: Persona = {
  id: 'aljackson',
  name: 'Al Jackson Jr.',
  figure: 'male',
  build: 'slim',
  skin: '#5e3b28',
  hair: '#16110e',
  hairStyle: 'natural',
  beard: 'pencil',
  top: 'jacket',
  shirt: '#c9d98f',
  // the jade top under the jacket: a polo neck on film, a T-shirt's neck here
  under: '#2e7a5e',
  neckwear: 'tee',
  trousers: '#c9d98f',
  shoes: '#1a1614',
  footwear: 'shoes',
  accent: '#2e7a5e',
  headphones: false,
  kit: { shell: '#ebe9e0', finish: 'gloss', hardware: 'chrome', rug: '#3a2a26' },
};

/**
 * Carlton Barrett with Bob Marley and the Wailers on the Uprising tour, at
 * Rockpalast in the Westfalenhalle, Dortmund, 13 June 1980 (WDR's film:
 * "Lively Up Yourself", YouTube f1ROu4mlMWI, Carly at the kit from 4:50 to
 * 4:56; "Is This Love", taEl5Gt20yA, the kit from 2:48 to 2:56): slim, a short
 * rounded afro, a moustache and a short beard along the jaw, a white
 * T-shirt with a small print on the chest, no headphones. His Yamaha 9000
 * from Japan, amber under the warm light and green under the blue (the fan
 * site's "huge yellow 9000 series kit", 1979 to 1981), single-headed toms
 * across the bass drum, chrome stands. Santa Barbara, November 1979
 * (i6cRXFs6BzI), shows the other, cobalt blue, Yamaha in daylight.
 */
const CARLTON_BARRETT: Persona = {
  id: 'carltonbarrett',
  name: 'Carlton Barrett',
  figure: 'male',
  build: 'slim',
  skin: '#4e2e1f',
  hair: '#120d0a',
  // a short afro, two or three centimetres all over and rounded
  hairStyle: 'rounded',
  beard: 'short',
  top: 'tee',
  shirt: '#ece8e0',
  trousers: '#2a2622',
  shoes: '#1e1a16',
  // the feet are never in shot
  accent: '#c8a020',
  headphones: false,
  kit: { shell: '#e2b41c', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Buddy Rich with his big band at the North Sea Jazz Festival, The Hague, 14
 * July 1978 (filmed in colour for Dutch television's "World of Jazz": the
 * Channel One Suite close-ups and the full concert): compact and wiry, short
 * thick dark hair going grey, brushed back and up, clean-shaven, a navy V-neck
 * pullover with a thin red line round the V and a white shirt's long collar
 * points spread out over it, cream trousers. No pullover is in the wardrobe
 * yet, so it is a navy jacket with the shirt open over it: the
 * same navy body and spread white collar. His kit in white marine pearl, here
 * a white lacquer (the oyster wrap renders a white shell dark), with chrome,
 * a "BR" monogram on the front head (its make cannot be read off the film),
 * a towel on the floor tom. The feet are never in shot: dress shoes, as he
 * wore with the band.
 */
const BUDDY_RICH: Persona = {
  id: 'buddyrich',
  name: 'Buddy Rich',
  figure: 'male',
  build: 'slim',
  skin: '#e2b08c',
  hair: '#3a3029',
  // short and dense, brushed back off the brow
  hairStyle: 'slick',
  beard: 'none',
  top: 'jacket',
  shirt: '#1c2238',
  under: '#f2f0ea',
  neckwear: 'open',
  trousers: '#d8cdb4',
  shoes: '#2a201a',
  footwear: 'shoes',
  accent: '#a8323a',
  headphones: false,
  kit: { shell: '#ece6d6', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Dave Grohl with Nirvana at the Paramount Theatre, Seattle, 31 October 1991
 * (Live at the Paramount, shot on 16 mm; the drum-cam cut, YouTube
 * GcuFXCKcMac, 0:38–2:18, and "Breed", YouTube tGc8jL4dzao, 1:06–1:40):
 * slim, twenty-two, long straight dark-brown hair parted in the middle and
 * hanging past the shoulders, thrown over the face on every stroke;
 * clean-shaven. A dark T-shirt for the first songs, then shirtless for the
 * rest of the set, a dark round tattoo on the left shoulder (Bonham's three
 * rings, by Wikipedia's account of it; the film is too soft to read the
 * design); off-white trousers. No headphones. His Tama Granstar II in Fire Storm Red,
 * red gloss, chrome Titan hardware, one rack tom on the bass drum and one
 * floor tom, Zildjian As (Live Nirvana's equipment guide dates this kit to
 * the US Nevermind tour from 27 October 1991). The feet are never in shot.
 */
const GROHL: Persona = {
  id: 'grohl',
  name: 'Dave Grohl',
  figure: 'male',
  build: 'slim',
  skin: '#e8b896',
  hair: '#2e2118',
  // middle-parted, straight, past the shoulders to the upper back
  hairStyle: 'curtains',
  beard: 'none',
  // shirtless for most of the set (a dark tee for the first songs)
  top: 'bare',
  shirt: '#e8b896',
  trousers: '#e2dccf',
  // the feet are never in shot: dark trainers, a guess
  shoes: '#2a2624',
  accent: '#b3161f',
  headphones: false,
  kit: { shell: '#a8141c', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Questlove with the Roots at Dave Chappelle's Block Party, Bedford-Stuyvesant,
 * Brooklyn, 18 September 2004 (the film, released 2006: "You Got Me" with Jill
 * Scott and Erykah Badu, YouTube nGRzizq4WWg, Questlove at the kit from 0:12 to
 * 0:20 from his left behind the cymbals and 1:34 to 1:38 from the front; the
 * Yamaha All Access photographs, c. 2010, for the same hair and beard in
 * daylight): big and broad, a large round black afro standing well clear of
 * the head, a full black beard, a black long-sleeved button-up shirt with its
 * collar open, no headphones. His trousers and shoes are behind the kit and
 * never in shot: dark, as the shirt. The kit is gloss black with chrome lugs
 * and stands, and brass-coloured cymbals; a polished metal drum stands to his
 * right of the snare. The film's frames show neither glasses nor a pick, but
 * he is rarely without either (the Oscars red carpet, 2019, has both): heavy
 * square black glasses and a black fist-handled afro pick in the hair over his
 * right temple, so he wears them here.
 */
const QUESTLOVE: Persona = {
  id: 'questlove',
  name: 'Questlove',
  figure: 'male',
  build: 'heavy',
  skin: '#553522',
  hair: '#120e0c',
  // a large round afro, about twice the face's width, over the tops of the ears
  hairStyle: 'afro',
  beard: 'full',
  top: 'button-up',
  shirt: '#141414',
  neckwear: 'open',
  glasses: { shape: 'square', frame: '#0e0e10', thick: true },
  pick: '#0e0e10',
  trousers: '#1e1e22',
  shoes: '#141414',
  accent: '#141414',
  headphones: false,
  kit: { shell: '#101012', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Levon Helm with the Band at The Last Waltz, Winterland, San Francisco, 25
 * November 1976 (Martin Scorsese's film, 1978: the "Up on Cripple Creek"
 * scene, YouTube JsdUzN20Sow, close-ups at 0:24, 1:06 and 1:18 and the kit at
 * 3:16; "The Night They Drove Old Dixie Down", 6dDbnwQlCek, the kit at 0:20,
 * 0:44 and 0:56): lean, wavy mid-brown hair swept back off the brow, thinning
 * at the temples and full over the ears to the collar; a short full beard; a
 * violet-blue shirt with a darker tonal print and a sheen, long collar points
 * spread open at the neck, the sleeves pushed up the forearms. No headphones.
 * A black pearl kit mottled grey (a Gretsch in Black Diamond Pearl, by a
 * transcriber's and a forum's account, not his), chrome hoops and stands, one
 * tom on the bass drum and a floor tom. His trousers and feet are never in
 * shot: dark trousers and boots, a guess.
 */
const LEVON_HELM: Persona = {
  id: 'levonhelm',
  name: 'Levon Helm',
  figure: 'male',
  build: 'slim',
  skin: '#e2b08e',
  hair: '#6a4a32',
  // swept back off a receding brow, wavy, over the ears to the collar
  hairStyle: 'swept',
  beard: 'short',
  top: 'button-up',
  shirt: '#4c3f9a',
  satin: true,
  neckwear: 'open',
  collar: 'spear',
  rolled: true,
  trousers: '#22202a',
  shoes: '#1a1612',
  footwear: 'boots',
  accent: '#4c3f9a',
  headphones: false,
  kit: { shell: '#16161c', finish: 'oyster', hardware: 'chrome', rug: '#2a2226' },
};

/**
 * Neil Peart with Rush at Maple Leaf Gardens, Toronto, 21 September 1984 (the
 * Grace Under Pressure Tour 1984 film: "Red Lenses" and the drum solo, YouTube
 * FZABIWpPMzk; "The Body Electric", IBXAPgcOqy0; "New World Man",
 * -rEhnlUGVi8, 1:40 to 1:50 has him lit from the front): tall, long-limbed and
 * lean, short dark brown hair a little wavy and pushed up on top, longer over
 * the collar, clean-shaven, a loose plain white T-shirt, no headphones. The
 * legs are never in shot behind the kit: dark trousers and trainers are a
 * guess. His Tama in candy apple red with brass-plated hardware (DRUM! 2005;
 * the Julien's auction lists this kit in this film), two bass drums, the
 * concert toms, gong drums, temple blocks, chimes and red Simmons pads behind
 * him; the 3D kit can show the red and the brass, not the rest.
 */
const PEART: Persona = {
  id: 'peart',
  name: 'Neil Peart',
  figure: 'male',
  build: 'slim',
  skin: '#e8bc9c',
  hair: '#3a2a1e',
  // short, pushed up and a little wavy on top, over the collar at the back
  hairStyle: 'tousled',
  beard: 'none',
  top: 'tee',
  shirt: '#efeeea',
  trousers: '#26262c',
  shoes: '#e8e6e0',
  accent: '#b3121c',
  headphones: false,
  kit: { shell: '#b3121c', finish: 'gloss', hardware: 'gold', rug: '#1c1c22' },
};

/**
 * Charlie Watts with the Rolling Stones at Hyde Park, London, 5 July 1969
 * (Granada's "The Stones in the Park": "Honky Tonk Women", YouTube
 * gqtJELaLG5k, close-ups of him at 0:57–0:58 and, behind the cymbals, 1:21–1:22,
 * the kit from the side at 0:22–0:25): slim, twenty-eight, long straight
 * mid-brown hair falling over the ears to the shoulders, a fringe swept to one
 * side; clean-shaven. A lime-green short-sleeved knitted shirt with a soft
 * collar and a short buttoned placket, worn as a T-shirt. No headphones. His
 * Gretsch round badge in Black Nitron (Wikipedia dates it from 1968): dark
 * shells, a white front head lettered Gretsch, chrome stands, a crash beside
 * the hats. His legs and feet are never in shot: dark trousers and shoes are a
 * guess.
 */
const WATTS: Persona = {
  id: 'watts',
  name: 'Charlie Watts',
  figure: 'male',
  build: 'slim',
  skin: '#ecc4a6',
  hair: '#5a4030',
  // straight, over the ears to the shoulders, a side-swept fringe
  hairStyle: 'long',
  beard: 'none',
  // a knitted short-sleeved shirt with a soft collar: the nearest top is the T-shirt
  top: 'tee',
  shirt: '#8fd14f',
  trousers: '#2a2a30',
  shoes: '#1a1816',
  footwear: 'shoes',
  accent: '#8fd14f',
  headphones: false,
  kit: { shell: '#16161a', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Keith Moon with the Who at Shepperton Studios, 25 May 1978, filmed for The
 * Kids Are Alright ("Won't Get Fooled Again", YouTube UDfAdHBtK_Q, Moon in
 * close-up at 1:55–2:10 and 3:00–3:20, the kit whole at 0:30 and 2:40): his
 * last show with the band. Thick-set and full in the face, short dark-brown
 * hair combed forward, clean-shaven; closed-back headphones (the synthesiser
 * track was in them) held on with dark tape round the crown. A loose
 * long-sleeved cream peasant shirt, its neck slit and laced, embroidered with
 * dark swirls down the front. His Premier kit in chromed steel ("Premier Custom
 * Built Chromed Steel", Songsterr's track name for the Who Are You tab), chrome
 * stands, a row of rack toms across the front, a big gong behind him; the 3D
 * kit can show the chrome, not the gong or the timpani. His legs are never in
 * shot: white trousers and dark boots are a guess.
 */
const MOON: Persona = {
  id: 'moon',
  name: 'Keith Moon',
  figure: 'male',
  build: 'heavy',
  skin: '#e8b898',
  hair: '#3a2618',
  // short, combed forward over the brow, a little wave on top
  hairStyle: 'tousled',
  beard: 'none',
  // a loose cream peasant shirt, laced at the neck, dark swirls embroidered down the front
  top: 'kaftan',
  shirt: '#efe6d2',
  trousers: '#ece8de',
  shoes: '#2a2018',
  footwear: 'boots',
  // the embroidery
  accent: '#5a4632',
  headphones: true,
  kit: { shell: '#c8ccd2', finish: 'metal', hardware: 'chrome', rug: '#1c1a20' },
};

/**
 * Ian Paice with Deep Purple at the California Jam, Ontario Motor Speedway, 6
 * April 1974 (ABC's In Concert film: "Burn", YouTube oxJT5PhP40k, the kit
 * from the front at 3:50 to 4:00, in daylight): slight, twenty-five, a big
 * halo of curly mid-brown hair to the shoulders thrown about on every fill,
 * small round wire glasses, a light moustache (the film is too soft to be
 * sure of it); a plain yellow T-shirt under an open black waistcoat, dark
 * blue trousers. No headphones. His Ludwig in Silver Sparkle, chrome lugs
 * and stands, white coated heads, the Ludwig script on the front head; one
 * rack tom on the bass drum and two floor toms. He is left-handed and the
 * kit is mirrored, the floor toms on his left; the 3D kit is right-handed,
 * so it cannot show that. His feet are never in shot: dark boots, a guess.
 */
const PAICE: Persona = {
  id: 'paice',
  name: 'Ian Paice',
  figure: 'male',
  build: 'slim',
  skin: '#e8bc9c',
  hair: '#6a4a30',
  // a big curly halo to the shoulders
  hairStyle: 'curly',
  beard: 'moustache',
  top: 'tee',
  shirt: '#e2c02e',
  waistcoat: { cloth: '#141414', trim: '#141414' },
  glasses: { shape: 'round', frame: '#b8a070' },
  trousers: '#26304a',
  shoes: '#2a2420',
  footwear: 'boots',
  accent: '#e2c02e',
  headphones: false,
  kit: { shell: '#c8c8cc', finish: 'sparkle', hardware: 'chrome', rug: '#2a2a2e' },
};

/**
 * Bill Bruford with King Crimson at the Arènes de Fréjus, France, 27 August 1982
 * (the concert film The Noise: "Larks' Tongues in Aspic, Part II", YouTube
 * JrwXnhAUtnk on his own channel, at the kit at 0:08, 2:40, 3:20 and 3:53): slim,
 * thirty-three, short mid-brown hair, a little tousled and swept off the brow;
 * clean-shaven. A loose white jacket worn open over a white shirt open deep at the
 * neck, the collar lit red by the stage. No headphones. His hybrid kit of the
 * Discipline and Beat years: shells and a rank of octobans that read as polished
 * metal under the lights (his equipment page lists a Tama Superstar in natural birch
 * and four low Octobans, "Dragon Drums" as he called them, for 1982–83), chrome
 * stands, Paiste cymbals, a 22-inch Tama gong drum with a white head behind the toms,
 * and Simmons pads in hexagonal frames; the 3D kit can show the metal and the
 * octobans, not the gong drum or the pads. His trousers and feet are never in shot:
 * white trousers to the jacket and dark shoes, a guess.
 */
const BRUFORD: Persona = {
  id: 'bruford',
  name: 'Bill Bruford',
  figure: 'male',
  build: 'slim',
  skin: '#e9bea0',
  hair: '#5a3e2a',
  // short, a little tousled, swept off the brow
  hairStyle: 'tousled',
  beard: 'none',
  top: 'jacket',
  shirt: '#eeece6',
  under: '#f4f2ec',
  neckwear: 'open',
  // the trousers and shoes are never in shot: a guess
  trousers: '#e6e3dc',
  shoes: '#1e1c1c',
  footwear: 'shoes',
  accent: '#b0201e',
  headphones: false,
  kit: { shell: '#c4c7cc', finish: 'metal', hardware: 'chrome', rug: '#1c1c22', octobans: true },
};

/**
 * Topper Headon with the Clash in the "London Calling" film, shot by Don Letts
 * on a cold, rainy night at the beginning of December 1979 on a boat at
 * Festival Pier, Battersea Park, by the Albert Bridge (Wikipedia; YouTube
 * EfK-WX2pa8c: the kit whole from behind the band at 0:40, 1:20
 * and 2:20; Headon in close-up at 3:13 to 3:16): slim, twenty-four,
 * clean-shaven, short light-brown hair under a dark brimmed hat with a red
 * badge at its band (no hat of that kind can be drawn; left off); a pale
 * long-sleeved shirt and a dark tie under a dark waistcoat, soaked in the
 * rain and blown out by the lights, so the cut is a guess. No headphones. His
 * silver mirror-finish Pearl ("a big silver, mirror finish Pearl kit", from
 * Henrit's on Wardour Street, Mixdown quoting the Mike Dolbear interview),
 * chrome stands, one tom on the bass drum and a floor tom, Zildjians. The legs
 * and feet are never in shot: dark trousers and boots, a guess.
 */
const HEADON: Persona = {
  id: 'headon',
  name: 'Topper Headon',
  figure: 'male',
  build: 'slim',
  skin: '#ecc4a8',
  hair: '#7a5a3a',
  // short, under the hat on film
  hairStyle: 'crop',
  beard: 'none',
  top: 'button-up',
  shirt: '#d8d6d0',
  neckwear: 'long',
  tie: '#16161a',
  waistcoat: { cloth: '#1a1a1e', trim: '#1a1a1e' },
  trousers: '#1e1e24',
  shoes: '#1a1614',
  footwear: 'boots',
  // the badge on the hat
  accent: '#b3161f',
  headphones: false,
  kit: { shell: '#c8ccd2', finish: 'metal', hardware: 'chrome', rug: '#1c1a20' },
};

/**
 * Stephen Morris with Joy Division on BBC2's Something Else, broadcast 15
 * September 1979 ("Transmission", YouTube xPlULk86oWQ: Morris side-on at
 * 1:16–1:25 and from behind at 1:51–2:00): slim, twenty-one, thick dark-brown
 * hair cut in a fringe over the brow and down over the ears, clean-shaven; an
 * off-white long-sleeved shirt with a collar, open at the neck. No headphones.
 * A dark kit, near black under the studio's blue light (the Rogers concert kit
 * of Unknown Pleasures, by Mixdown's account), chrome stands, clear heads on
 * the toms, brass-coloured cymbals. His trousers and feet are never in shot:
 * dark trousers and shoes are a guess.
 */
const STEPHEN_MORRIS: Persona = {
  id: 'stephenmorris',
  name: 'Stephen Morris',
  figure: 'male',
  build: 'slim',
  skin: '#ecc4a8',
  hair: '#2e2018',
  // a thick fringe over the brow, down over the ears, full at the back
  hairStyle: 'mop',
  beard: 'none',
  top: 'button-up',
  shirt: '#e6e2d4',
  neckwear: 'open',
  trousers: '#24242a',
  shoes: '#1a1816',
  footwear: 'shoes',
  accent: '#e6e2d4',
  headphones: false,
  kit: { shell: '#141418', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Matt Helders with Arctic Monkeys headlining Glastonbury's Pyramid Stage, 28
 * June 2013 (the BBC's film: "I Bet You Look Good on the Dancefloor", YouTube
 * c-wwK5QVv1Y, at the kit from 0:37 to 0:43 and 2:27 to 2:59): twenty-seven,
 * solid through the shoulders, short dark-brown hair cut close at the back and
 * sides and swept up and back on top, clean-shaven; a black sleeveless top with
 * a small white print on the chest, dark trousers laced up the outside of the
 * leg. In-ear monitors, no headphones. The kit reads dark grey-black and pearly
 * under the cyan lights, chrome hardware, one rack tom and a floor tom, crashes
 * high on either side. He says he toured the Union Jack Premier after the 2012
 * Olympics (as Drumhead Authority quotes him); the film, from behind and
 * beside the kit, shows no flag. His feet are never in shot: dark trainers are
 * a guess.
 */
const HELDERS: Persona = {
  id: 'helders',
  name: 'Matt Helders',
  figure: 'male',
  build: 'muscular',
  skin: '#e8b898',
  hair: '#2e2018',
  // short back and sides, swept up and back on top
  hairStyle: 'quiff',
  beard: 'none',
  // a black sleeveless top, a small white print on the chest
  top: 'vest',
  shirt: '#141416',
  trousers: '#1c1c22',
  shoes: '#18181a',
  accent: '#e8e8ea',
  headphones: false,
  kit: { shell: '#3a3a42', finish: 'oyster', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Bill Ward with Black Sabbath on film in 1970 ("Paranoid", Live in Paris 1970,
 * YouTube mYpJAqX662M, Ward at the kit at 1:39–1:43 and in close-up at
 * 2:35–2:37; the band's DVDs date the Paris film to 20 December 1970 but put
 * "Paranoid" on a Belgian TV show the same year): slim, twenty-two, long dark
 * brown hair parted in the middle, thick and wavy, falling past the shoulders
 * to the chest; a drooping moustache and a shadow of beard on the chin. A red
 * knitted top with long sleeves and a round neck, a small dark pattern all over
 * it; dark trousers. No headphones. His Ludwig in a pale blue pearl as the film
 * shows it, chrome hoops and stands, one tom on the bass drum and a floor tom.
 * His feet are never in shot: dark boots are a guess.
 */
const BILL_WARD: Persona = {
  id: 'billward',
  name: 'Bill Ward',
  figure: 'male',
  build: 'slim',
  skin: '#e6b898',
  hair: '#3a2618',
  // thick, wavy and middle-parted, past the shoulders to the chest
  hairStyle: 'mane',
  beard: 'moustache',
  // a red knit, long-sleeved and close at the neck, with a small dark print all over
  top: 'scoop',
  shirt: '#c0201c',
  motifs: ['#5c0e0e', '#24100e'],
  trousers: '#1e1c22',
  shoes: '#1a1612',
  footwear: 'boots',
  accent: '#c0201c',
  headphones: false,
  kit: { shell: '#a9bdd2', finish: 'oyster', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Art Blakey with the Jazz Messengers of Moanin' (Lee Morgan, Benny Golson, Bobby
 * Timmons, Jymie Merritt) on a concert stage in 1958, filmed in black and white
 * (Reelin' in the Years, "Moanin'" LIVE 1958, YouTube veOmmydhge0: at the
 * microphone from 0:28 to 0:52, at the kit in close-up at 3:04 to 3:12):
 * thirty-eight or thirty-nine, solid through the shoulders, his hair cropped
 * close, a thin moustache. A dark suit buttoned over a white shirt and a narrow
 * dark tie; the film has no colour, so the suit's charcoal is a guess. No
 * headphones. A Gretsch (the name on the bass drum's head, under the band's) in a
 * light sparkle that reads as silver, chrome hardware, one tom on the bass drum
 * and a floor tom. His feet are never in shot: black shoes are a guess.
 */
const BLAKEY: Persona = {
  id: 'blakey',
  name: 'Art Blakey',
  figure: 'male',
  build: 'average',
  skin: '#40261a',
  hair: '#141110',
  // cropped close, its texture showing
  hairStyle: 'rounded',
  beard: 'pencil',
  top: 'jacket',
  shirt: '#1e1e22',
  under: '#f2f0ea',
  tie: '#121214',
  trousers: '#1e1e22',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#121214',
  headphones: false,
  kit: { shell: '#cfd0cc', finish: 'sparkle', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Earl Palmer at sixty-eight in the instructional video New Orleans Drumming:
 * From R&B to Funk (DCI Music Video, 1993, with Herman Ernest; YouTube
 * SZMQSPs_l1k: in close-up at 5:00, 7:00 and 8:00, at the kit at 18:00, from
 * behind at 25:00, the kit whole with a tenor player at 10:00). No film of him at the kit
 * in the 1950s was found. Slim; short black hair, wavy and receding at the
 * temples, grey at the sides; a grey and black moustache. A pale yellow polo
 * neck (drawn as a T-shirt's neck, as Al Jackson Jr.'s is) under a grey-brown
 * tweed jacket. No headphones. A red Yamaha with chrome hardware, a metal
 * snare and Zildjians. His trousers and feet are never in shot: grey trousers
 * and dark shoes are a guess.
 */
const EARL_PALMER: Persona = {
  id: 'earlpalmer',
  name: 'Earl Palmer',
  figure: 'male',
  build: 'slim',
  skin: '#7a4e36',
  hair: '#2e2a28',
  // short and wavy, receding at the temples
  hairStyle: 'receding',
  hairTexture: 'coily',
  beard: 'moustache',
  // a grey-brown tweed jacket over a pale yellow polo neck
  top: 'jacket',
  shirt: '#655d52',
  fleck: '#a39886',
  under: '#e2cc84',
  neckwear: 'tee',
  // the trousers and shoes are never in shot: a guess
  trousers: '#4a4640',
  shoes: '#1a1614',
  footwear: 'shoes',
  accent: '#e2cc84',
  headphones: false,
  kit: { shell: '#c8141e', finish: 'gloss', hardware: 'chrome', rug: '#2a2222' },
};

/**
 * Sheila E. as Prince's drummer in the Sign o' the Times film (1987; mostly
 * reshot at Paisley Park to the tour's concert recording), her drum solo in
 * "Now's the Time" (YouTube S7Igro3y--c: at the kit side-on at 1:20–1:28,
 * from the front under green light at 1:43–1:52): slim, twenty-nine; red
 * lipstick, a silver collar with a pendant at the throat; a black
 * sleeveless top cut deep at the neck, black sleeves on the forearms (left
 * off: the figure's nearest, gloves, would cover her hands, which are bare).
 * No headphones. The kit is the tour's
 * turquoise Yamaha (Bonedo's gear history; the Paisley Park New Year's Eve
 * show, 31 December 1987, YouTube em6h7OhEdQY, shows it pale turquoise),
 * chrome stands, Paiste cymbals. Her legs and feet are never in shot; she
 * played in heels then (PAS), which the figure cannot wear: dark shoes.
 *
 * Her hair and earrings are as she wears them now, from a photograph the user
 * gave (2026-10-19): long, black and full, in big loose waves well past the
 * shoulders, swept back off the forehead with no fringe; big silver hoops,
 * beaded all round, hanging from the lobes to below the jaw.
 */
const SHEILA_E: Persona = {
  id: 'sheilae',
  name: 'Sheila E.',
  figure: 'female',
  build: 'slim',
  skin: '#c08a66',
  hair: '#1c120c',
  // long, black and full, in big loose waves past the shoulders, swept back off the face
  hairStyle: 'flowing',
  beard: 'none',
  // a black sleeveless top, deep at the neck
  top: 'vest',
  shirt: '#121214',
  trousers: '#121214',
  shoes: '#121214',
  footwear: 'shoes',
  // the silver collar and its pendant
  choker: '#d8d8de',
  // big beaded silver hoops
  hoops: '#dcdce2',
  lipstick: true,
  accent: '#c8c8cc',
  headphones: false,
  kit: { shell: '#7cc2c6', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Travis Barker alone at the kit at a blink-182 soundcheck, playing "Down"
 * (YouTube r5JbZGwVuyY, "Travis Barker Blink 182 Soundcheck 01 (Original)",
 * uploaded 27 May 2009; the soundcheck itself is undated: frames read at 0:08
 * to 3:52, his face and hair clearest at 2:28 to 2:43): lean and hard-muscled,
 * shirtless, clean-shaven, dark hair in a short mohawk with the sides shaved
 * close; grey-khaki cargo trousers. Arms, chest and back are covered in
 * tattoos, which the model cannot draw, so the skin is bare. No headphones. A
 * metal-finish OCDP kit with chrome hardware, the bass drum's white front head
 * ported three times, Zildjians. His feet are never in shot: dark trainers are
 * a guess.
 */
const BARKER: Persona = {
  id: 'barker',
  name: 'Travis Barker',
  figure: 'male',
  build: 'muscular',
  skin: '#e2b08e',
  hair: '#1c1612',
  // a short strip on top, the sides shaved
  hairStyle: 'mohawk',
  beard: 'none',
  top: 'bare',
  shirt: '#e2b08e',
  trousers: '#77746a',
  shoes: '#18181a',
  // the mohawk is dark to its tips
  accent: '#1c1612',
  headphones: false,
  kit: { shell: '#c8ccd2', finish: 'metal', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Benny Benjamin at the kit in the early 1960s. No film of him playing was
 * found: the 2002 documentary Standing in the Shadows of Motown has him only
 * in archive stills. This likeness is drawn from the one photograph of him at
 * the kit that turned up, a black-and-white still shown in "MOTOWN's Benny
 * Benjamin drumming style" (YouTube 5SShCxpUc4M, 0:26–0:34). He grins over a
 * cymbal: a full, round face, close-cut natural hair, a thin moustache, a pale
 * flecked sport coat worn open over a white shirt open at the neck (the
 * figure buttons a jacket unless it is over a T-shirt, so the coat is drawn
 * closed to keep the open collar). The photograph shows nothing of the drums but the cymbal, and nothing below his
 * chest. The coat's grey, the dark trousers and the black kit with chrome
 * hardware are guesses. Hitsville's studio set was second-hand, "a mix of
 * brands" (Modern Drummer, 1999).
 */
const BENNY_BENJAMIN: Persona = {
  id: 'bennybenjamin',
  name: 'Benny Benjamin',
  figure: 'male',
  // a full, round face in the photograph
  build: 'heavy',
  skin: '#5a3826',
  hair: '#15100d',
  hairStyle: 'natural',
  beard: 'pencil',
  // a pale tweed sport coat, open, over a white shirt open at the neck
  top: 'jacket',
  shirt: '#8f897d',
  fleck: '#5e594f',
  under: '#ece8de',
  neckwear: 'open',
  trousers: '#3a3833',
  shoes: '#161412',
  footwear: 'shoes',
  accent: '#ece8de',
  headphones: false,
  kit: { shell: '#1c1c20', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Tony Thompson with Chic on Radio Bremen's Musikladen, "Le Freak", 1979 (YouTube
 * sywMVfEn-E0, "Super CHIC 1979": at the kit in close-up at 2:42 to 2:44, behind
 * the singers at 2:30 to 2:33): twenty-four, tall and solid, short natural hair
 * and a thin moustache, large rounded glasses tinted dark brown. A white suit
 * jacket over a white shirt open at the neck. No headphones. The kit reads clear
 * and silvery, the stage's lilac light through its shells (an acrylic kit, as
 * it looks; the make cannot be read), chrome hardware, brass-coloured cymbals.
 * His trousers and feet are never in shot: white trousers to go with the
 * jacket and dark shoes are a guess.
 */
const TONY_THOMPSON: Persona = {
  id: 'tonythompson',
  name: 'Tony Thompson',
  figure: 'male',
  build: 'average',
  skin: '#5e3a28',
  hair: '#141110',
  // short and natural, close at the sides
  hairStyle: 'rounded',
  beard: 'pencil',
  // large lenses, rounded at the corners: the aviators are the nearest
  glasses: { shape: 'aviator', frame: '#1e1612', tint: '#24160f', thick: true },
  top: 'jacket',
  shirt: '#e6dccb',
  under: '#f6f4f0',
  neckwear: 'open',
  trousers: '#e6dccb',
  shoes: '#1a1614',
  footwear: 'shoes',
  accent: '#e6dccb',
  headphones: false,
  kit: { shell: '#dcd8e6', finish: 'acrylic', hardware: 'chrome', rug: '#2a2430' },
};

/**
 * Lars Ulrich with Metallica on stage now, from two photographs the user gave
 * (2026-10-19): sixty-odd, fuller in the face and the body than in the eighties;
 * a black mesh trucker cap on backwards, the band low over the brow; under it
 * light-brown hair going grey, short at the sides and curling out over the
 * collar at the back; grey-brown stubble all over the jaw; a plain black
 * T-shirt; in-ear monitors, not headphones. His Tama kit in yellow, gloss, the
 * shells' black hoops and chrome hardware. He plays with his tongue out, now
 * and then (`tongue`). His legs and feet are not in either
 * photograph: dark trousers and shoes are a guess.
 */
const ULRICH: Persona = {
  id: 'ulrich',
  name: 'Lars Ulrich',
  figure: 'male',
  build: 'average',
  skin: '#e6b294',
  hair: '#6e5a46',
  // short under the cap, curling out over the collar at the back
  hairStyle: 'capped',
  beard: 'stubble',
  top: 'tee',
  shirt: '#18181b',
  trousers: '#1c1c22',
  shoes: '#1a1816',
  // the cap's colour
  accent: '#141416',
  hat: 'cap',
  headphones: false,
  tongue: true,
  kit: { shell: '#f2cc1c', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Hal Blaine at the Good Vibrations sessions, 1966, in the studio film of the
 * Beach Boys (black and white; YouTube uVlSVkzbJDA, at the kit beside Carl
 * Wilson from 1:20 to 2:35; the film is staged for promotion, and he is named
 * from the session, not from a caption): thirty-seven, solid, dark hair combed
 * straight back and close at the sides, clean-shaven; a pale short-sleeved
 * shirt open at the neck (rolled sleeves are the nearest), a wristwatch, light
 * trousers. No headphones. His Ludwig in the blue sparkle the Wouldn't It Be
 * Nice tab's track names and Donn's Drum Vault shows under his Monster set
 * (YouTube N0KwNDEwm1Y); the film is black and white, so the colours are those
 * sources', not the film's. Chrome hardware. His shoes are never in shot: dark
 * shoes are a guess.
 */
const HAL_BLAINE: Persona = {
  id: 'halblaine',
  name: 'Hal Blaine',
  figure: 'male',
  build: 'average',
  skin: '#dcaa88',
  hair: '#1c1410',
  // combed straight back, close at the sides
  hairStyle: 'slick',
  beard: 'none',
  top: 'button-up',
  shirt: '#bdbab2',
  neckwear: 'open',
  // short sleeves on film
  rolled: true,
  trousers: '#a8a294',
  shoes: '#1e1a18',
  footwear: 'shoes',
  accent: '#bdbab2',
  headphones: false,
  kit: { shell: '#2a58b0', finish: 'sparkle', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Roger Taylor, from the image the owner supplied (2026-10-19): Taylor in the
 * mid-1980s beside a kit of his. Slim, mid-thirties; a tousled blond feathered
 * mullet, swept up off the brow and past the collar (`swept`), clean-shaven; a
 * pale cream textured blazer, its weave flecked, over a purple button-down
 * shirt open at the neck (the white T-shirt under it is not drawn). The kit in
 * the image is a recent one, not the eighties': blue sparkle shells and chrome
 * hardware. Its lighter teal snare, clear bottom heads, the face painted on
 * the bass drum head and the Paiste gong behind it cannot be drawn. Legs and
 * feet are not in the image: dark trousers and shoes are a guess.
 */
const ROGER_TAYLOR: Persona = {
  id: 'rogertaylor',
  name: 'Roger Taylor',
  figure: 'male',
  build: 'slim',
  skin: '#efc9ae',
  hair: '#c4a46e',
  // tousled and feathered, swept up off the brow and long past the collar
  hairStyle: 'swept',
  beard: 'none',
  top: 'jacket',
  shirt: '#e4e0cc',
  fleck: '#a9b4a0',
  under: '#4e2a78',
  neckwear: 'open',
  trousers: '#2a2a30',
  shoes: '#1a1816',
  footwear: 'shoes',
  accent: '#4e2a78',
  headphones: false,
  kit: { shell: '#1f4fb8', finish: 'sparkle', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Chad Smith with the Red Hot Chili Peppers on stage now, from the photograph
 * the user gave (2026-10-19), ahead of any footage: sixty-odd, broad and
 * strong in the shoulders and arms; a red baseball cap on backwards, the peak
 * at the nape; short greying hair under it; grey-flecked stubble all over the
 * jaw; a big grin. A white sleeveless shirt buttoned down the front over bare
 * skin, open at the neck, the arms bare (a white waistcoat buttoned under a V
 * is the nearest the model has); a red sweatband on each wrist. The scorpion
 * tattoo on his right upper arm the model cannot draw, so the skin is bare.
 * In-ear monitors, not headphones. His kit's shells in a purple-magenta
 * chrome finish, chrome hardware, bright cymbals. His legs and feet are not
 * in the photograph: dark trousers and grey trainers are from Drumeo's "Chad
 * Smith Plays Give It Away" (YouTube zV7tNP0H_M8, 2023).
 */
const CHAD_SMITH: Persona = {
  id: 'chadsmith',
  name: 'Chad Smith',
  figure: 'male',
  build: 'muscular',
  skin: '#d0906c',
  hair: '#6e6458',
  // short under the cap
  hairStyle: 'capped',
  beard: 'stubble',
  top: 'bare',
  shirt: '#d0906c',
  // the sleeveless shirt, buttoned over bare skin
  waistcoat: { cloth: '#f4f2ec', trim: '#e6e2da', buttoned: true },
  wristbands: '#d42a2a',
  trousers: '#24242a',
  shoes: '#5a5c62',
  // the cap's colour
  accent: '#d42a2a',
  hat: 'cap',
  headphones: false,
  kit: { shell: '#b0209a', finish: 'metal', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Jeff Porcaro in his 1988 instructional video (YouTube XDAIBPlQtyg, watched as
 * contact sheets from 2:00 to 4:00): in his mid-thirties, slim; dark brown hair to the
 * shoulders, parted in the middle and falling straight either side of the face
 * (`curtains`, chosen against `long`, `flowing`, `mane`, `backswept`, `shaggy`
 * and `swept` in headless renders); clean-shaven; large, thin gold wire-framed
 * glasses with clear lenses. A black long-sleeved shirt buttoned to the neck, a
 * sleeve pushed up the forearm. No headphones: the band is in the room. His kit
 * there is black with chrome hardware, on the rack he helped Pearl design, under
 * Paiste cymbals; the rack and its three rack toms cannot be drawn. His legs and
 * feet are behind the kit: dark trousers and shoes are a guess.
 */
const PORCARO: Persona = {
  id: 'porcaro',
  name: 'Jeff Porcaro',
  figure: 'male',
  build: 'slim',
  skin: '#dcae8c',
  hair: '#2a1d16',
  // to the shoulders, parted in the middle
  hairStyle: 'curtains',
  beard: 'none',
  top: 'button-up',
  shirt: '#17161a',
  rolled: true,
  trousers: '#1c1c22',
  shoes: '#16161a',
  footwear: 'shoes',
  accent: '#17161a',
  glasses: { shape: 'aviator', frame: '#b89b62' },
  headphones: false,
  kit: { shell: '#0c0c0e', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Taylor Hawkins with Foo Fighters at Wembley Stadium, London, 6 and 7 June
 * 2008 (Live at Wembley Stadium, released August 2008; the band's official
 * uploads of All My Life, YouTube aiy5W3z4SGE, at the kit from 0:38 to 0:50,
 * and Times Like These, cvCUXXsP5WE, at 0:05, 0:35 and 2:31 to 2:51):
 * thirty-six, lean, long straight sandy-blond hair parted in the middle and
 * hanging past the shoulders, a full beard a shade darker, grinning through
 * the set; a black sleeveless shirt, the arms bare; no headphones. His Gretsch
 * is black with chrome hardware and a white front head; brilliant Zildjian
 * cymbals. His trousers and shoes are behind the kit and never in shot: dark,
 * a guess.
 */
const TAYLOR_HAWKINS: Persona = {
  id: 'taylorhawkins',
  name: 'Taylor Hawkins',
  figure: 'male',
  build: 'slim',
  skin: '#d49c76',
  hair: '#b08a55',
  // straight, parted in the middle, past the shoulders
  hairStyle: 'curtains',
  beard: 'full',
  top: 'vest',
  shirt: '#232326',
  trousers: '#26262c',
  shoes: '#1c1a18',
  accent: '#b08a55',
  headphones: false,
  kit: { shell: '#121214', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Mike Portnoy at Radio City Music Hall, New York, 1 April 2006, filmed for
 * Score (the drum and vocal camera of that night, YouTube eUYi4GwN9sg, from
 * 15:00 to 16:00): thin-framed glasses; a white sleeveless New York Knicks
 * jersey (PORTNOY 1 on the back) and white sweatbands; his chrome Tama kit
 * under a wall of Sabian cymbals. The jersey's blue trim and NEW YORK across
 * the chest are wider than the model's chest print, so the top is a plain
 * white vest. His arms' tattoos cannot be drawn, and his legs are behind the
 * kit throughout: the dark shorts and trainers are a guess.
 *
 * His head as he plays now, from a recent concert photograph, rather than
 * that night's backwards Yankees cap over dark hair: long, light brown curls
 * out in a big frizz past the shoulders, a black paisley bandana folded into
 * a band and tied round the brow, a full greying beard dyed teal at the end,
 * and blue-tinted lenses in the same thin square frames.
 */
const PORTNOY: Persona = {
  id: 'portnoy',
  name: 'Mike Portnoy',
  figure: 'male',
  build: 'average',
  skin: '#dcaa88',
  hair: '#7d5c3a',
  // long, light brown curls, out in a big frizz past the shoulders
  hairStyle: 'frizz',
  beard: 'full',
  // greying, and dyed teal at the end
  beardColour: '#5a524a',
  beardDye: '#33a39a',
  top: 'vest',
  shirt: '#eef0f4',
  legs: 'shorts',
  trousers: '#25262c',
  shoes: '#18181a',
  wristbands: '#f2f2f0',
  // the bandana's colour
  accent: '#141416',
  hat: 'band',
  glasses: { shape: 'square', frame: '#8a8a90', tint: '#5b7fb8' },
  headphones: false,
  kit: { shell: '#c9ced6', finish: 'metal', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * David Garibaldi with Tower of Power on Soul Train, taped for the episode of
 * 17 November 1973 (YouTube kFWVFm4wPwo, the band introduced one by one; him
 * at the kit at 0:50 to 0:54 and 2:55 to 3:02): twenty-seven, slim, olive
 * skin, a full head of dark, nearly black curls to below the ears and a thick
 * dark moustache, clean-shaven otherwise; a long-sleeved button-up in a check
 * of rust red and cream on an olive-brown ground, open at the neck. His kit's
 * shells in a white pearl wrap (drawn as white satin: the model's oyster wrap
 * is a dark one), chrome lugs, brass cymbals. Don Kirshner's Rock Concert the
 * same year (YouTube 97J9uTQgb-8, 5:20 to 5:35) shows him only from behind,
 * in the same kind of check. His legs and feet are in neither film: blue
 * jeans and brown boots are a guess. No headphones.
 */
const GARIBALDI: Persona = {
  id: 'garibaldi',
  name: 'David Garibaldi',
  figure: 'male',
  build: 'slim',
  skin: '#c39468',
  hair: '#1e1612',
  // full dark curls, to below the ears
  hairStyle: 'curly',
  beard: 'moustache',
  top: 'button-up',
  shirt: '#6e5a34',
  plaid: { band: '#b0442a', line: '#e4cf9a' },
  neckwear: 'open',
  trousers: '#2e3a52',
  shoes: '#3a2a20',
  footwear: 'boots',
  accent: '#b0442a',
  headphones: false,
  kit: { shell: '#dedbd2', finish: 'satin', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Phil Rudd in AC/DC's 1979 promotional film for "Highway to Hell" (the
 * band's official video, YouTube l482T0yNkeo; the remastered upload
 * 0m1j-mr7mpQ, Rudd at the kit from 0:09 to 0:17 and 2:12 to 2:16):
 * twenty-five, slim, mid-brown hair to the shoulders with a fringe, a
 * moustache, a plain white T-shirt, no headphones. A dark kit, near black
 * under the stage lights, with chrome stands, white heads and brass
 * cymbals. A tattoo on his upper arm the figure has no way to draw. His
 * trousers and shoes are behind the kit and never in shot: jeans and dark
 * shoes are a guess.
 */
const RUDD: Persona = {
  id: 'rudd',
  name: 'Phil Rudd',
  figure: 'male',
  build: 'slim',
  skin: '#e2b08e',
  hair: '#5e4029',
  // straight, to the shoulders, a fringe over the brow
  hairStyle: 'flowing',
  beard: 'moustache',
  top: 'tee',
  shirt: '#eeeae2',
  trousers: '#34405a',
  shoes: '#1c1a18',
  footwear: 'shoes',
  accent: '#5e4029',
  headphones: false,
  kit: { shell: '#121214', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Gene Krupa at twenty-eight with Benny Goodman's band, playing Sing, Sing,
 * Sing in the film Hollywood Hotel (Warner Bros., 1937; YouTube 3mJ4dpNal_k,
 * 0:04–0:30 and 2:00–2:12): slim, clean-shaven, black hair slicked straight
 * back with a lock falling over the brow as he plays; the band's summer
 * uniform, a pale short-sleeved shirt open at the neck with a dark
 * neckerchief knotted at the throat, and pale trousers. His Slingerland is
 * white marine pearl with chrome hardware, the bass drum head lettered with
 * his and Goodman's initials. The film is black and white: every colour is a
 * guess, the shirt's short sleeves are drawn rolled, and the neckerchief is
 * left off (nothing draws one knotted at the throat).
 */
const KRUPA: Persona = {
  id: 'krupa',
  name: 'Gene Krupa',
  figure: 'male',
  build: 'slim',
  skin: '#e0b08a',
  hair: '#17130f',
  // slicked straight back, glossy
  hairStyle: 'slick',
  beard: 'none',
  top: 'button-up',
  shirt: '#ece6d4',
  rolled: true,
  neckwear: 'open',
  trousers: '#ddd4bd',
  shoes: '#2a211a',
  footwear: 'shoes',
  accent: '#1e1e24',
  headphones: false,
  kit: { shell: '#f1ece2', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Nicko McBrain at his kit now, from a photograph the user gave (2026-10-20),
 * on the Future Past tour's stage: seventy-odd, long straight hair gone a pale
 * platinum, parted in the middle and falling either side of the face past the
 * shoulders; black sunglasses, square and heavy-framed; a thin chain at the
 * neck; a black T-shirt of the band's, IRON MAIDEN in red across the chest
 * over a red disc with Senjutsu's samurai Eddie in a lunge (drawn as a
 * warrior's silhouette); blue jeans; flip-flops (he plays barefoot on one
 * pedal, so the feet are a guess at the kit: dark trainers). His Sonor as a
 * second photograph the user gave shows it (2026-10-27): the shells wrapped in
 * the tour's artwork, red over blue with Eddies in gold across them (drawn as
 * figures, not the art), the kick's front head a stained-glass rose window,
 * chrome hardware, Paiste cymbals.
 */
const MCBRAIN: Persona = {
  id: 'mcbrain',
  name: 'Nicko McBrain',
  figure: 'male',
  build: 'average',
  skin: '#e2ae88',
  hair: '#ddd0ae',
  // long and straight, parted in the middle, falling either side of the face
  hairStyle: 'curtains',
  beard: 'none',
  top: 'tee',
  shirt: '#161616',
  logo: { text: 'IRON MAIDEN', colour: '#d42a24', disc: '#c8302a', figure: '#1c1210' },
  trousers: '#33496b',
  shoes: '#2a2624',
  accent: '#c8302a',
  glasses: { shape: 'square', frame: '#101010', tint: '#141414', thick: true, dark: true },
  chain: true,
  headphones: false,
  kit: {
    shell: '#c8302a',
    finish: 'gloss',
    hardware: 'chrome',
    rug: '#22232a',
    wrap: { over: '#c8302a', under: '#2a4fa8', art: '#e3b23c' },
    head: { art: 'rose-window', ground: '#1b2340', ink: '#141414' },
  },
};

/**
 * Nick Mason at Pompeii, 4 to 7 October 1971 (Live at Pompeii, the band filmed
 * playing to an empty amphitheatre; One of These Days, mostly his solo there,
 * in the band's official upload, YouTube hDoK1Hbk0SI, at the kit from 0:40 to
 * 5:50, close up from 5:20):
 * twenty-seven, slim, long dark-brown hair in curls to the shoulders, held off
 * the brow by a rolled pale cloth headband; a heavy moustache drooping into a
 * beard on the chin, the cheeks bare; a navy long-sleeved top, a rainbow
 * butterfly printed on its chest (not drawn); a watch on the left wrist; no
 * headphones. His Ludwig kit in silver sparkle with chrome hardware, two bass
 * drums whose front heads are painted with red and green mandalas, Paiste
 * cymbals all round and a gong behind him; the band played on the arena's
 * stone floor. His legs are behind the kit throughout: the trousers and boots
 * are a guess. The hair is drawn long and straight: the hair styles that curl
 * stop at the jaw or bury the headband.
 */
const NICK_MASON: Persona = {
  id: 'nickmason',
  name: 'Nick Mason',
  figure: 'male',
  build: 'slim',
  skin: '#e8bea0',
  hair: '#3a2618',
  // long, to the shoulders, held back by the headband
  hairStyle: 'flowing',
  // the moustache drooping into the beard on his chin
  beard: 'goatee',
  // a fitted long-sleeved top
  top: 'scoop',
  shirt: '#262a5e',
  trousers: '#34405e',
  shoes: '#2a2420',
  footwear: 'boots',
  // the headband: a rolled pale cloth
  accent: '#d9d2c2',
  headband: true,
  headphones: false,
  kit: { shell: '#c9c9cc', finish: 'sparkle', hardware: 'chrome', rug: '#5e584e' },
};

/**
 * Clive Burr at the kit in Iron Maiden's early years, from a photograph the
 * owner supplied (an antaranews.com print, stage-lit, a crash cymbal in
 * the foreground; no date or source on it): in his early twenties, slim, fair
 * skin warmed by the lights, thick dark-blond hair in feathered layers past the
 * shoulders, swept back off the face from a loose parting; clean-shaven; a
 * black sleeveless vest cut low at the neck and deep at the arms; a thin chain
 * with a small pendant at the throat. His kit is white, as Wikipedia says of
 * his signature kit ("donated to the Hard Rock Cafe in London in 2005"),
 * drawn in gloss with chrome hardware. His legs are behind the kit in the
 * photograph: the trousers and trainers are a guess. The feathered layers are
 * drawn as the flowing cut, combed back from the parting.
 */
const BURR: Persona = {
  id: 'burr',
  name: 'Clive Burr',
  figure: 'male',
  build: 'slim',
  skin: '#dfa77f',
  hair: '#94703c',
  // past the shoulders in feathered layers, swept back off the face
  hairStyle: 'flowing',
  beard: 'none',
  top: 'vest',
  shirt: '#141414',
  trousers: '#1c1c22',
  shoes: '#e8e8e8',
  footwear: 'trainers',
  accent: '#141414',
  chain: true,
  headphones: false,
  kit: { shell: '#f2f0ea', finish: 'gloss', hardware: 'chrome', rug: '#2a2a30' },
};

/**
 * Philly Joe Jones in his forties on European television, late 1960s
 * (YouTube fIPIc3bkYoc, filmed in black and white, a trio with piano and
 * bass): slim, a short rounded natural, a moustache; a dark jacket over a
 * white shirt open at the neck, a patterned silk scarf round the neck,
 * hanging down the shirt front. His kit is pale, with chrome hardware.
 * Every colour is a guess: the jacket charcoal, the scarf's print (a
 * geometric pattern this page cannot draw) one cream, the kit white.
 */
const PHILLY_JOE: Persona = {
  id: 'phillyjoe',
  name: 'Philly Joe Jones',
  figure: 'male',
  build: 'slim',
  skin: '#4f2f20',
  hair: '#151210',
  // short and rounded, its texture showing
  hairStyle: 'rounded',
  beard: 'moustache',
  top: 'jacket',
  shirt: '#2b2b30',
  under: '#f2f0ea',
  neckwear: 'open',
  scarf: '#d4cab4',
  trousers: '#232327',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#d4cab4',
  headphones: false,
  kit: { shell: '#ebe8e0', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Joe Morello at thirty-five with the Dave Brubeck Quartet, playing Take Five
 * for Belgian television in 1964 (YouTube CzqkSiSNC3g, the opening still and
 * 0:00–7:00 at one frame in fifteen): a stocky man, clean-shaven, short hair
 * combed straight back from a high forehead, heavy square black-framed
 * glasses (he was born partially sighted), a dark suit, a white shirt and a
 * narrow dark tie. The film is black and white, so the hair's brown and the
 * suit's charcoal are guesses. His Ludwig was silver sparkle (Modern Drummer,
 * 2022: a Super Classic, 22-inch bass drum, 13-inch tom, 16-inch floor toms),
 * with chrome hardware.
 */
const MORELLO: Persona = {
  id: 'morello',
  name: 'Joe Morello',
  figure: 'male',
  build: 'average',
  skin: '#e2b494',
  hair: '#4a3a2c',
  // short, combed back from a high forehead
  hairStyle: 'receding',
  beard: 'none',
  top: 'jacket',
  shirt: '#2a2b30',
  under: '#f2f0ea',
  tie: '#17171b',
  trousers: '#2a2b30',
  shoes: '#121212',
  footwear: 'shoes',
  accent: '#17171b',
  glasses: { shape: 'square', frame: '#111111', thick: true },
  headphones: false,
  kit: { shell: '#c9cacb', finish: 'sparkle', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Jimmy Cobb with Miles Davis's band around 1960, from a black-and-white
 * concert photograph (Helsingin Sanomat's, republished with Towner Galaher's
 * Ah-Leu-Cha transcription by Not So Modern Drummer, 2020; no date on it):
 * about thirty, slim, his hair short and close, a thin moustache joined to a
 * small beard on the chin; a dark pinstriped suit with a white pocket square
 * over a white shirt and a narrow dark tie. No headphones. A big ride cymbal
 * in front of him and drums in a light finish with chrome lugs, drawn as white
 * gloss. The photograph has no colour, so the suit's charcoal is a guess, and
 * the pinstripes and the pocket square are not drawn. His legs and feet are
 * never in shot: dark trousers and black shoes are a guess.
 */
const JIMMY_COBB: Persona = {
  id: 'jimmycobb',
  name: 'Jimmy Cobb',
  figure: 'male',
  build: 'slim',
  skin: '#74492f',
  hair: '#16120f',
  // short and close
  hairStyle: 'rounded',
  beard: 'goatee',
  top: 'jacket',
  shirt: '#26262c',
  under: '#f2f0ea',
  tie: '#121214',
  trousers: '#26262c',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#121214',
  headphones: false,
  kit: { shell: '#efece4', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Brian Blade with the Fellowship Band at the Chicago Music Exchange (the CME
 * Sessions film of "Stoner Hill", lit indoors): lean, dark brown skin, short
 * natural hair rounded close to the head, a trimmed moustache and chin beard,
 * heavy black rectangular glasses; a navy V-neck sweater over a pale blue
 * shirt, its collar open, drawn as a navy jacket worn open over the shirt (no
 * sweater to hand). Dark trousers and shoes, a guess: the film keeps to the
 * waist. His kit is dark green, near black, in gloss with chrome hardware
 * (Wikipedia: vintage Gretsch, Ludwig, Sonor and Slingerland), on a red
 * Persian rug.
 */
const BRIAN_BLADE: Persona = {
  id: 'brianblade',
  name: 'Brian Blade',
  figure: 'male',
  build: 'slim',
  skin: '#5e3b28',
  hair: '#141110',
  hairStyle: 'rounded',
  beard: 'goatee',
  glasses: { shape: 'square', frame: '#141414', thick: true },
  top: 'jacket',
  shirt: '#1d2436',
  under: '#9db6d6',
  neckwear: 'open',
  trousers: '#23252b',
  shoes: '#2a211b',
  footwear: 'shoes',
  accent: '#1d2436',
  headphones: false,
  kit: { shell: '#1d2a22', finish: 'gloss', hardware: 'chrome', rug: '#7e2620', trim: '#1f2a40' },
};

/**
 * Sly Dunbar touring with Peter Tosh, Top Rank, Cardiff, 20 June 1979 (Tim
 * Duncan's photograph on Wikimedia Commons, the one Wikipedia's article
 * carries): twenty-seven, slim, his locks to the shoulders and falling over
 * the brow, a full short beard; a light short-sleeved T-shirt. Syndrum pads on
 * stands and a pair of timbales beside the kit, drums with bright metal-looking
 * shells. The stage light is red, so every colour here is a guess: the shirt is
 * drawn off-white and the shells silver. His legs and feet are never in shot:
 * dark trousers and shoes are a guess. No headphones.
 */
const SLY_DUNBAR: Persona = {
  id: 'slydunbar',
  name: 'Sly Dunbar',
  figure: 'male',
  build: 'slim',
  skin: '#4a2c1d',
  hair: '#16100c',
  // locks to the shoulders, a fringe of them over the brow
  hairStyle: 'dreads',
  beard: 'short',
  top: 'tee',
  shirt: '#e6dfd2',
  trousers: '#2a2622',
  shoes: '#1a1612',
  footwear: 'shoes',
  accent: '#c8c8c8',
  headphones: false,
  kit: { shell: '#c8ccd2', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * James Gadson recording Running Away with Vulfpeck (the session film, 2017),
 * in his late seventies: heavy-set, a head of tight black curls, thin dark
 * square-framed glasses, a moustache joined to a short goatee, a red and
 * black buffalo-check flannel shirt open at the neck, sage-green trousers.
 * No headphones. A copper sparkle kit, its toms under towels. Under the
 * flannel he wears a sage collar and bib like a work apron's, which is not
 * drawn; the check is drawn as broad black bands on the red.
 */
const GADSON: Persona = {
  id: 'gadson',
  name: 'James Gadson',
  figure: 'male',
  build: 'heavy',
  skin: '#5a3828',
  hair: '#1a1614',
  // tight curls, worn full
  hairStyle: 'curly',
  hairTexture: 'coily',
  beard: 'goatee',
  glasses: { shape: 'square', frame: '#2a2622' },
  top: 'button-up',
  shirt: '#a81c20',
  plaid: { band: '#121012', line: '#121012' },
  neckwear: 'open',
  trousers: '#5c6e64',
  shoes: '#1a1a1a',
  footwear: 'shoes',
  accent: '#a81c20',
  headphones: false,
  kit: { shell: '#c8977a', finish: 'sparkle', hardware: 'chrome', rug: '#3a2e2a' },
};

/**
 * Mike Clark with the Headhunters on German television, November 1974
 * (Musikladen, Bremen: Spank-A-Lee, YouTube 8fIimwo42_c): a big head of
 * dark brown curls to the collar, a thick moustache and long sideburns; a
 * long-collared shirt open at the neck in a loud print of red, orange and
 * green swirls, drawn here as orange and green motifs on red. A black gloss
 * kit with chrome hardware under brass cymbals. The trousers and shoes are
 * not in shot: guesses.
 */
const MIKE_CLARK: Persona = {
  id: 'mikeclark',
  name: 'Mike Clark',
  figure: 'male',
  build: 'average',
  skin: '#e2b28e',
  hair: '#3a2516',
  hairStyle: 'curly',
  beard: 'moustache',
  top: 'button-up',
  shirt: '#8e2f24',
  collar: 'spear',
  neckwear: 'open',
  motifs: ['#e08a2e', '#3f9a5a'],
  trousers: '#2b2a30',
  shoes: '#1a1614',
  footwear: 'boots',
  accent: '#e08a2e',
  headphones: false,
  kit: { shell: '#111114', finish: 'gloss', hardware: 'chrome', rug: '#3a2a22' },
};

/**
 * Santa Davis with Peter Tosh at the Greek Theatre, Los Angeles, in 1983, the
 * show Captured Live was taken from (the concert film, close-ups at the kit):
 * about thirty, his dreadlocks to the shoulders, a full dark beard and
 * moustache; a plain white T-shirt, a white sweatband on the left wrist. A big
 * kit of red shells with chrome rims and a chrome snare, a rack of toms and
 * several cymbals. A sweatband is drawn on both wrists or neither, so it is on
 * both wrists. His legs and feet are never in shot: dark trousers and shoes
 * are a guess.
 */
const SANTA_DAVIS: Persona = {
  id: 'santadavis',
  name: 'Santa Davis',
  figure: 'male',
  build: 'average',
  skin: '#4a2c1e',
  hair: '#17110d',
  // shoulder-length, round the sides and the back
  hairStyle: 'dreads',
  beard: 'full',
  top: 'tee',
  shirt: '#ece9e2',
  trousers: '#24221f',
  shoes: '#171411',
  footwear: 'shoes',
  accent: '#b8331f',
  wristbands: '#ece9e2',
  headphones: false,
  kit: { shell: '#b8331f', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Alan White with Oasis at Knebworth, 10 August 1996, the first of the two
 * nights (the band's own film of Don't Look Back in Anger, at 1:02 and 2:09):
 * twenty-four, his dark hair cropped close all over, clean-shaven; a navy
 * short-sleeved polo shirt (drawn as a T-shirt: there is no polo collar here).
 * The kit's shells white under the stage light, chrome hardware, the big
 * cymbals he said he needed to cut through, no headphones. His legs and feet
 * are never in shot: dark jeans and trainers are a guess.
 */
const ALAN_WHITE_OASIS: Persona = {
  id: 'alanwhite',
  name: 'Alan White (Oasis)',
  figure: 'male',
  build: 'average',
  skin: '#e6b896',
  hair: '#2a1f18',
  // cropped close all over: 'crop' is a bowl with a fringe, which his was not
  hairStyle: 'rounded',
  beard: 'none',
  top: 'tee',
  shirt: '#1f2a52',
  trousers: '#2a3140',
  shoes: '#1a1a1a',
  footwear: 'trainers',
  accent: '#c8c8c8',
  headphones: false,
  kit: { shell: '#e8e6e0', finish: 'gloss', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Woody Woodmansey with the Spiders from Mars on Top of the Pops, recorded 5
 * July 1972 and broadcast on BBC One the next night, miming to Starman (the
 * BBC's official upload, YouTube oOKWF3IHu0I, 0:34–0:50): twenty-two, solid
 * through the shoulders, a fair, pink-cheeked face, clean-shaven; light brown
 * hair in a feathered shag over the ears to the collar, long sideburns, not yet
 * peroxided. A rose-pink satin jumpsuit, long in the sleeve, buttoned up the
 * front. His legs and feet are never in shot: the jumpsuit is drawn to the
 * ankle and the boots are a guess. The bass drum in a grey marbled pearl
 * wrap, chrome, brass cymbals. No headphones.
 */
const WOODMANSEY: Persona = {
  id: 'woodmansey',
  name: 'Woody Woodmansey',
  figure: 'male',
  build: 'average',
  skin: '#ecc3a4',
  hair: '#8a6440',
  // full on top, feathered over the ears and down to the collar (the model's shag spikes on top)
  hairStyle: 'shaggy',
  beard: 'none',
  // the band's one-piece suit, in satin to the ankle (buttoned on the night; the model's has a zip and a spread collar)
  top: 'coveralls',
  satin: true,
  shirt: '#cf929e',
  trousers: '#cf929e',
  shoes: '#2a2224',
  footwear: 'boots',
  accent: '#cf929e',
  headphones: false,
  kit: { shell: '#b4b6bc', finish: 'oyster', hardware: 'chrome', rug: '#1c1a1e' },
};

/**
 * Dennis Davis on Bowie's Isolar II tour, Earls Court, London, 1 July 1978,
 * as David Hemmings's film of the shows has him (seen in a 1978 Blackout
 * compilation dedicated to him, YouTube yuqgcg1pGZM, about 0:50 and 2:30):
 * in his late twenties, short natural hair close to the head, a short full beard,
 * metal-framed glasses with a light tint, a plain white T-shirt. The kit behind its
 * cymbals reads as dark shells with chrome hardware and a white front head on
 * the bass drum; the toms' colour is a guess under blue stage light, and so
 * are the dark trousers and shoes, never in shot. No headphones.
 */
const DENNIS_DAVIS: Persona = {
  id: 'dennisdavis',
  name: 'Dennis Davis',
  figure: 'male',
  build: 'average',
  skin: '#4e3021',
  hair: '#141010',
  // short and natural, close at the sides
  hairStyle: 'rounded',
  hairTexture: 'coily',
  beard: 'short',
  // thin metal frames, the lenses lightly tinted
  glasses: { shape: 'aviator', frame: '#b8a888', tint: '#5a4a32' },
  top: 'tee',
  shirt: '#ece9e2',
  trousers: '#24242a',
  shoes: '#18161a',
  footwear: 'shoes',
  accent: '#ece9e2',
  headphones: false,
  kit: { shell: '#16161a', finish: 'gloss', hardware: 'chrome', rug: '#2a2624' },
};

/**
 * Mike Joyce in the Smiths' publicity photographs for The Smiths (Sire, 1984;
 * both in the public domain on Wikimedia Commons, "The Smiths (1984 Sire
 * publicity photo)" 001 and 002): twenty, slim, clean-shaven, his dark-brown
 * hair short at the back and sides and full on top, falling forward over the
 * brow; a dark knitted jumper in one, a black roll-neck in the other, drawn as
 * a dark knit top. The photographs stop at the chest: dark trousers and shoes
 * are a guess. On stage at Rockpalast (Hamburg, 1984) the lights are too dark to
 * read his kit. The red sparkle shells follow the Songsterr transcriber's note of
 * a Red Sparkle Ludwig for This Charming Man (1983), and the red kit he says he
 * wanted after seeing John Maher's (Far Out, 2022): a guess, not a photograph.
 * No headphones.
 */
const MIKE_JOYCE: Persona = {
  id: 'mikejoyce',
  name: 'Mike Joyce',
  figure: 'male',
  build: 'slim',
  skin: '#e9c2a6',
  hair: '#1e1612',
  // short back and sides, full on top and falling over the brow
  hairStyle: 'tousled',
  beard: 'none',
  // the dark jumper, a fitted knit with long sleeves
  top: 'scoop',
  shirt: '#26262a',
  trousers: '#1c1c22',
  shoes: '#141416',
  footwear: 'shoes',
  accent: '#26262a',
  headphones: false,
  kit: { shell: '#b3202a', finish: 'sparkle', hardware: 'chrome', rug: '#2a2624' },
};

/**
 * Rick Buckler with the Jam on Top of the Pops, broadcast 27 March 1980, the
 * week Going Underground went in at number one (the band's own upload,
 * YouTube 45uSLVE837s, the kit at 2:00–2:20): twenty-four, slim, mid-brown
 * hair in a mod's cut, its fringe over the brow and over the tops of the ears,
 * clean-shaven; a dark navy shirt buttoned to the neck. A five-piece kit with
 * chrome-wrapped shells and chrome stands, one tom on the bass drum and a floor
 * tom, under the studio's pink and blue light; the white Premier of the Malice
 * and Funeral Pyre videos (Christie's, lot 284) came later. His legs are behind
 * the kit throughout: dark trousers and shoes are a guess. No headphones.
 */
const RICK_BUCKLER: Persona = {
  id: 'buckler',
  name: 'Rick Buckler',
  figure: 'male',
  build: 'slim',
  skin: '#ecc4a8',
  hair: '#6a4c32',
  // a mod's cut: the fringe over the brow, over the tops of the ears
  hairStyle: 'mop',
  beard: 'none',
  top: 'button-up',
  shirt: '#1c2238',
  // buttoned to the neck
  neckwear: 'tee',
  trousers: '#1e1e26',
  shoes: '#1a1614',
  footwear: 'shoes',
  accent: '#c8ccd2',
  headphones: false,
  kit: { shell: '#c8ccd2', finish: 'metal', hardware: 'chrome', rug: '#1c1a20' },
};

/**
 * Dave Rowntree in the video for Song 2, 1997 (the official video, YouTube SSbBvKaM6sk: its
 * opening shots of him alone at the kit against the flock wallpaper): thirty-
 * two, his fair hair clipped to a fuzz all over, clean-shaven, a black
 * short-sleeved T-shirt with a small white print, dark trousers, black boots
 * on the pedal. A black Pearl kit, chrome hardware, its bass drum's front
 * head black with the Pearl script; the room's carpet green-grey. The film is
 * graded green, so the hair and skin are a guess toward his colouring
 * elsewhere. No headphones.
 */
const DAVE_ROWNTREE: Persona = {
  id: 'rowntree',
  name: 'Dave Rowntree',
  figure: 'male',
  build: 'average',
  skin: '#e6bfa2',
  hair: '#7d6247',
  // clipped to a fuzz all over: 'crop' draws a bowl with a fringe, 'natural' the close cap
  hairStyle: 'natural',
  beard: 'none',
  top: 'tee',
  shirt: '#1b1b1d',
  trousers: '#26262c',
  shoes: '#141414',
  footwear: 'boots',
  accent: '#d8d8d8',
  headphones: false,
  kit: { shell: '#121214', finish: 'gloss', hardware: 'chrome', rug: '#3a4a44' },
};

/**
 * Roger Taylor with Duran Duran at Live Aid, JFK Stadium, Philadelphia, 13 July
 * 1985, his last show with the band for sixteen years (MTV's broadcast of A View
 * to a Kill, watched as contact sheets): twenty-five, a black sleeveless vest, his
 * dark brown hair short and wavy, full on top; clean-shaven; black gloves on both
 * hands; headphones; blue trousers. A white Tama kit, the maker's name on the bass
 * drum's front head, chrome hardware, a rack of black Octobans beside the hi-hat.
 * His shoes are never in shot: dark is a guess.
 */
const ROGER_TAYLOR_DURAN: Persona = {
  id: 'rogertaylorduran',
  name: 'Roger Taylor (Duran Duran)',
  figure: 'male',
  build: 'average',
  skin: '#e2b393',
  hair: '#241812',
  // short and wavy, full on top, off the ears
  hairStyle: 'tousled',
  beard: 'none',
  top: 'vest',
  shirt: '#141414',
  trousers: '#2c3e7a',
  shoes: '#1a1a1a',
  footwear: 'shoes',
  accent: '#c8c8c8',
  gloves: '#151515',
  headphones: true,
  kit: { shell: '#ece6d6', finish: 'gloss', hardware: 'chrome', rug: '#2a2a2a' },
};

/**
 * Reni at the Empress Ballroom, Blackpool, 12 August 1989 (the film of the gig,
 * whose She Bangs the Drums became the single's second video): twenty-five,
 * slim and clean-shaven, singing into a boom mic over the kit, in a mustard
 * short-sleeved T-shirt with a dark ringed neck, and the white bucket hat he
 * wore all night, pulled low, the short brown Madchester cut under it.
 * His legs and the kit's colour are never clear in the footage: dark trousers
 * are a guess, and the shells, which John Squire painted Pollock-fashion
 * (Wikipedia), are drawn a plain off-white. His kit had one rack tom; the stage
 * draws its own.
 */
const RENI: Persona = {
  id: 'reni',
  name: 'Reni',
  figure: 'male',
  build: 'slim',
  skin: '#e8bfa0',
  hair: '#5a3e2a',
  // short, brown, under the hat
  hairStyle: 'crop',
  beard: 'none',
  hat: 'bucket',
  // a mustard T-shirt
  top: 'tee',
  shirt: '#d4a62a',
  trousers: '#2a2d3a',
  shoes: '#1c1c1e',
  // the hat
  accent: '#e6e4dc',
  headphones: false,
  kit: { shell: '#d8d0bc', finish: 'gloss', hardware: 'chrome', rug: '#2a2622' },
};

/**
 * Kenney Jones with the Small Faces on Beat-Club (Radio Bremen), miming Tin
 * Soldier at the turn of 1968 (Beat-Club's own upload, YouTube _w4uxZj1Q50,
 * the kit at 1:28–1:44): nineteen, slim, dark hair in a mop that covers the
 * ears and falls in a fringe to the brows, clean-shaven; a pale shirt with
 * long pointed collars, open at the neck. The film is black and white, so the
 * colours are guesses: the hair dark brown, the shirt a pale blue. The shells
 * catch the light like his silver glitter Ludwig, the kit of the Small Faces'
 * first television (his own site's list of kits). His legs are behind the
 * kit: dark trousers and shoes are a guess. No headphones.
 */
const KENNEY_JONES: Persona = {
  id: 'kenneyjones',
  name: 'Kenney Jones',
  figure: 'male',
  build: 'slim',
  skin: '#ecc6aa',
  hair: '#3a2a20',
  // the mop over the ears, the fringe to the brows
  hairStyle: 'mop',
  beard: 'none',
  top: 'button-up',
  shirt: '#b9c6d6',
  neckwear: 'open',
  trousers: '#202024',
  shoes: '#18140f',
  footwear: 'shoes',
  accent: '#c8ccd2',
  headphones: false,
  kit: { shell: '#c4c8d0', finish: 'sparkle', hardware: 'chrome', rug: '#262228' },
};

/**
 * Paul Cook in the Sex Pistols' Pretty Vacant video, filmed at ITN's studio
 * in Wells Street, London, on 12 July 1977 (the band's upload, YouTube
 * R6GDdKrQ8EI: at the kit at 0:30–0:42 and 2:45–3:10): twenty-one, fair hair
 * cut short and ragged, standing up on top and falling over the brow,
 * clean-shaven; a black sleeveless vest. A black kit with chrome hardware, one
 * tom on the bass drum and a floor tom, a leopard-print cloth over the snare.
 * The stage light is red and pink, so the hair's shade is a guess from the
 * fairest frames. His legs and feet are never in shot: dark trousers and boots
 * are a guess. No headphones.
 */
const PAUL_COOK: Persona = {
  id: 'paulcook',
  name: 'Paul Cook',
  figure: 'male',
  build: 'average',
  skin: '#ecc4a8',
  hair: '#c9a768',
  // short, ragged, up on top and over the brow
  hairStyle: 'shaggy',
  beard: 'none',
  top: 'vest',
  shirt: '#141416',
  trousers: '#1e1e24',
  shoes: '#1a1614',
  footwear: 'boots',
  accent: '#c8c8c8',
  headphones: false,
  kit: { shell: '#121214', finish: 'gloss', hardware: 'chrome', rug: '#1c1a20' },
};

/**
 * Phil Selway playing Paranoid Android on Later... with Jools Holland, BBC Two,
 * 1997 (the BBC's footage, YouTube NzPtr_n-m8A, 2:59-3:06, the one shot of him
 * under white light): thirty, his head shaved, clean-shaven, a plain black
 * short-sleeved T-shirt, a lean build. The drums are a deep wine red with a
 * gloss and chrome hardware, the cymbals brass. His legs and feet are never in
 * shot: dark trousers and shoes are a guess, and so is the eyebrows' mid-brown.
 * No headphones.
 */
const PHIL_SELWAY: Persona = {
  id: 'selway',
  name: 'Phil Selway',
  figure: 'male',
  build: 'average',
  skin: '#e6b896',
  hair: '#7a5a44',
  hairStyle: 'bald',
  beard: 'none',
  top: 'tee',
  shirt: '#161616',
  trousers: '#26262a',
  shoes: '#18181a',
  footwear: 'shoes',
  accent: '#c8c8c8',
  headphones: false,
  kit: { shell: '#4a1621', finish: 'gloss', hardware: 'chrome', rug: '#3a3a3c' },
};

/**
 * Budgie in the Spellbound video, May 1981 (the band's official upload,
 * TjvvK-Rj0WI, watched as contact sheets at 0:20-0:32 and 1:39-1:53): twenty-three,
 * slim and clean-shaven, his hair bleached platinum, full on top with a fringe
 * and falling straight over the ears to the collar; a long-sleeved shirt in
 * black and white vertical stripes, buttoned. The stripes cannot be drawn yet, so
 * the shirt is its white. A pale silver kit with chrome hardware and a
 * tambourine on a stand over the toms. His legs and feet are never in shot: dark
 * trousers and boots are a guess.
 */
const BUDGIE: Persona = {
  id: 'budgie',
  name: 'Budgie',
  figure: 'male',
  build: 'slim',
  skin: '#eccab0',
  hair: '#efe4c4',
  /* a fringe, straight to the collar: 'bob', of those rendered; 'mullet' runs past the
     shoulders, 'shaggy' and 'shag' draw curls and spikes */
  hairStyle: 'bob',
  beard: 'none',
  top: 'button-up',
  shirt: '#ecebe6',
  trousers: '#1c1c1e',
  shoes: '#141414',
  footwear: 'boots',
  accent: '#c8c8c8',
  headphones: false,
  kit: { shell: '#cfc8b4', finish: 'metal', hardware: 'chrome', rug: '#26231f' },
};

/**
 * Simon Phillips with Toto at the Varus Open Air, Osnabrück, 3 June 2004 (Wikimedia
 * Commons, "Simon Phillips on drums.jpg" and "Simon Phillips on drums 02.jpg", the same
 * kit), forty-seven: slim, clean-shaven, a head of tight copper-blond curls to the
 * collar. Behind an emerald-green gloss Tama kit on a chrome rack: two 24" bass drums
 * with clear-ported Tama heads, a row of toms, the octobans on the right, the cymbals high.
 * Only his head shows over the toms: the dark shirt, trousers and shoes are a guess.
 */
const SIMON_PHILLIPS: Persona = {
  id: 'simonphillips',
  name: 'Simon Phillips',
  figure: 'male',
  build: 'slim',
  skin: '#e6b896',
  hair: '#c7834a',
  hairStyle: 'curly',
  beard: 'none',
  top: 'tee',
  shirt: '#1d1f24',
  trousers: '#1c1c1e',
  shoes: '#141414',
  accent: '#1f7a3a',
  headphones: false,
  kit: { shell: '#1f7a3a', finish: 'gloss', hardware: 'chrome', rug: '#1a1a1a', octobans: true },
};

/**
 * Josh Freese with Devo at the Bank of America Pavilion, Boston, 27 June 2008
 * ("Josh Freese at the DEVO, Boston 6-27-08", Flickr via Wikimedia Commons,
 * CC BY-SA 2.0): thirty-five, slim, fair, clean-shaven, his light-brown hair
 * cut short and pushed up off the brow. Devo's yellow suit, its collar spread
 * and DEVO printed across the chest, drawn as the band's one-piece coveralls.
 * A DW kit in a dark gloss finish, black on the bass drum's front head, chrome
 * hardware, brass cymbals. A microphone clipped to the collar, no headphones.
 * His legs are behind the kit: dark shoes are a guess.
 */
const JOSH_FREESE: Persona = {
  id: 'joshfreese',
  name: 'Josh Freese',
  figure: 'male',
  build: 'slim',
  skin: '#ecc4a8',
  hair: '#7a5a3e',
  // cut short and pushed up off the brow
  hairStyle: 'tousled',
  beard: 'none',
  // Devo's yellow suit, one piece, its collar spread
  top: 'coveralls',
  shirt: '#e8cf3a',
  trousers: '#e8cf3a',
  shoes: '#1a1a1c',
  footwear: 'shoes',
  // the black of DEVO across the chest
  accent: '#141416',
  headphones: false,
  kit: { shell: '#15171f', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Matt Cameron with Soundgarden at the Paramount Theatre, Seattle, 5-6 March 1992,
 * on the Badmotorfinger tour (the Motorvision film; "Searching With My Good Eye
 * Closed", YouTube 8ChIpzH31gQ, the kit behind Chris Cornell at 2:22-2:31):
 * twenty-nine, slim, light-brown hair in a mop cut over the brow and the tops of
 * the ears, clean-shaven, a black T-shirt with the sleeves cut off. The copper
 * gloss Drum Workshop kit his Wikipedia page dates from the autumn of 1991 (12-
 * and 13-inch rack toms, a 15-inch floor tom, a 22-inch bass drum), chrome lugs
 * and stands, Zildjian crashes. His legs are behind the kit throughout: dark
 * trousers and shoes are a guess. No headphones.
 */
const MATT_CAMERON: Persona = {
  id: 'mattcameron',
  name: 'Matt Cameron',
  figure: 'male',
  build: 'slim',
  skin: '#e6b896',
  hair: '#6e4c30',
  // a mop: over the brow and the tops of the ears
  hairStyle: 'mop',
  beard: 'none',
  // a black T-shirt with the sleeves cut off
  top: 'vest',
  shirt: '#1a1a1c',
  trousers: '#24242a',
  shoes: '#1c1c1e',
  accent: '#1a1a1c',
  headphones: false,
  kit: { shell: '#b4582c', finish: 'gloss', hardware: 'chrome', rug: '#26221f' },
};

/**
 * D. J. Fontana at twenty-five behind Elvis Presley on The Milton Berle Show,
 * 5 June 1956, the first Hound Dog on television, the night "D.J. Fontana had
 * added a drum roll between verses" (Hound Dog's Wikipedia article; YouTube
 * 9zuhsfdTYiY: at the kit between Presley and Bill Black at 0:52 and
 * 1:52–2:00). Slim, clean-shaven, short black hair combed up and back; the
 * band's uniform, Scotty Moore's and Black's too, a dark jacket over a white
 * shirt and a black bow tie. His four-piece round-badge Gretsch in copper
 * nitron (Copper Mist) with chrome hardware, bought from Herb Brochstein's
 * shop in Houston, and one cymbal (scottymoore.net; Fontana to Modern
 * Drummer, 1985: "a small tom, floor tom, bass drum, snare drum, a cymbal, and
 * that's about it"). The broadcast is black and white: the jacket's dark
 * blue, the trousers and the shoes are a guess.
 */
const DJ_FONTANA: Persona = {
  id: 'djfontana',
  name: 'D. J. Fontana',
  figure: 'male',
  build: 'slim',
  skin: '#e2b08c',
  hair: '#18130f',
  // short, combed up off the brow and back
  hairStyle: 'slick',
  beard: 'none',
  top: 'jacket',
  shirt: '#1d2230',
  under: '#f2f0ea',
  neckwear: 'bow',
  tie: '#121214',
  trousers: '#1d2230',
  shoes: '#121212',
  footwear: 'shoes',
  accent: '#121214',
  headphones: false,
  kit: { shell: '#a8653c', finish: 'gloss', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Carl Palmer with Emerson, Lake & Palmer in 1975, at twenty-five ("Carl palmer pelo
 * 1975.jpg", from the Argentine magazine Pelo, Wikimedia Commons, public domain):
 * slim, clean-shaven, his dark-brown hair parted in the middle, straight and past the
 * shoulders, playing stripped to the waist as he did in the 1970s (Wikipedia, Carl
 * Palmer), a chain at his neck. Behind a Ludwig kit, the toms in a copper metal
 * finish, chrome hardware, the bass drum's white front head lettered Ludwig, his
 * Paiste cymbals high. His legs are behind the kit: dark trousers and boots are a
 * guess.
 */
const CARL_PALMER: Persona = {
  id: 'carlpalmer',
  name: 'Carl Palmer',
  figure: 'male',
  build: 'slim',
  skin: '#e8b996',
  hair: '#3b2a1f',
  // parted in the middle, straight, past the shoulders
  hairStyle: 'curtains',
  beard: 'none',
  // stripped to the waist for his solos in the 1970s
  top: 'bare',
  shirt: '#e8b996',
  trousers: '#1e1c1c',
  shoes: '#161412',
  footwear: 'boots',
  accent: '#c9773a',
  headphones: false,
  chain: true,
  kit: { shell: '#c9773a', finish: 'metal', hardware: 'chrome', rug: '#1c1a18' },
};

/**
 * Kenny Clarke at fifty, at the American Jazz Festival in Brussels, October
 * 1964, the Paris years of the Clarke-Boland Big Band (a photograph on
 * Wikimedia Commons, "Kenny Clarke en 1964", CC BY-SA 4.0; a 1971 Anefo
 * photograph from Loosdrecht shows the same build and moustache): a heavy-set
 * man, short close-cropped hair, a small moustache; a dark suit, a white
 * shirt, a narrow dark tie and a white pocket square. His kit is a Premier
 * (the name is on the bass drum head) in silver sparkle, with chrome
 * hardware. The photograph is black and white: the suit's charcoal and the
 * sparkle's silver are guesses, and the pocket square is not drawn.
 */
const KENNY_CLARKE: Persona = {
  id: 'kennyclarke',
  name: 'Kenny Clarke',
  figure: 'male',
  build: 'heavy',
  skin: '#4a2b1d',
  hair: '#151210',
  // short and close
  hairStyle: 'crop',
  beard: 'moustache',
  top: 'jacket',
  shirt: '#1f1f24',
  under: '#f2f0ea',
  neckwear: 'long',
  tie: '#141414',
  trousers: '#1f1f24',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#f2f0ea',
  headphones: false,
  kit: { shell: '#c9cacb', finish: 'sparkle', hardware: 'chrome', rug: '#2a2626' },
};

/**
 * Fred Below at forty-nine, on stage in France on 17 December 1975, in Lionel
 * Decoster's photograph (Wikimedia Commons, File:Fred_Below.jpg, CC BY-SA 3.0:
 * at the kit from the front, singing along). No photograph or film of him at
 * the kit in the 1950s was found. A dark beret worn level (drawn as a flat
 * cap, the nearest the figure has), a moustache, a dark knit top with long
 * sleeves. No headphones. A Ludwig in an oyster pearl wrap, two rack toms, a
 * white Ludwig front head, chrome hardware. The photograph is black and white:
 * the colours of the top and the wrap are a guess, and his trousers and feet
 * are never in shot. Decoster's second photograph, 8 December 1978, shows him
 * grey-bearded in a beret, a polo neck and a long-collared jacket at a black
 * sparkle kit.
 */
const FRED_BELOW: Persona = {
  id: 'fredbelow',
  name: 'Fred Below',
  figure: 'male',
  build: 'average',
  skin: '#4f3121',
  hair: '#1c1816',
  // cropped short under the beret
  hairStyle: 'crop',
  hairTexture: 'coily',
  beard: 'moustache',
  // a beret worn level: the flat cap is the nearest shape
  hat: 'flat',
  // a dark knit top with long sleeves, a round neck
  top: 'scoop',
  shirt: '#1d1c20',
  // the trousers and shoes are never in shot: a guess
  trousers: '#2a2826',
  shoes: '#1a1614',
  footwear: 'shoes',
  accent: '#1d1c20',
  headphones: false,
  kit: { shell: '#e4e6ea', finish: 'oyster', hardware: 'chrome', rug: '#2a2222' },
};

/**
 * Milton Banana on the cover of O Ritmo e o Som da Bossa Nova (Audio Fidelity, 1963), the
 * photograph of him at the kit the record was sold on ("o maior baterista de bossa nova"):
 * twenty-eight, solidly built, short black hair combed straight back off a high forehead,
 * heavy dark brows, clean-shaven; a charcoal suit jacket over a white shirt and a dark
 * long tie. A small four-piece in red with a plain white front head on the bass drum,
 * chrome lugs and stands, the ride on his right and the hats on his left, a stick in his
 * right hand. The trousers are the suit's; the shoes are out of shot (black, a guess).
 * No headphones. The trio's 1965 Odeon cover shows him the same way: at the kit in a white
 * shirt and a dark tie, the hair combed back.
 */
const MILTON_BANANA: Persona = {
  id: 'miltonbanana',
  name: 'Milton Banana',
  figure: 'male',
  build: 'average',
  skin: '#d4a681',
  hair: '#141110',
  // combed straight back off the forehead
  hairStyle: 'slick',
  beard: 'none',
  top: 'jacket',
  shirt: '#3a3d44',
  under: '#f2f0ea',
  tie: '#1c1c22',
  trousers: '#3a3d44',
  shoes: '#121212',
  footwear: 'shoes',
  accent: '#3a3d44',
  headphones: false,
  kit: { shell: '#b8161c', finish: 'gloss', hardware: 'chrome', rug: '#2a2226' },
};

/**
 * Terry Bozzio with Frank Zappa at the Palladium, New York, on Halloween 1977, at
 * twenty-six: the concerts filmed for Baby Snakes (1979), his drum solo in it, looked at
 * frame by frame. Slim and lean, clean-shaven, his dark-brown hair layered to the
 * shoulders, playing stripped to the waist. A black kit with chrome hardware, a row of
 * chrome Rototoms (Bishop: "his Rototom set"), and large cymbals. White below the waist:
 * shorts are a guess from the frames, as are the trainers.
 */
const TERRY_BOZZIO: Persona = {
  id: 'bozzio',
  name: 'Terry Bozzio',
  figure: 'male',
  build: 'slim',
  skin: '#e6b48f',
  hair: '#3a2a20',
  // layered, a fringe, to the shoulders
  hairStyle: 'mane',
  beard: 'none',
  // stripped to the waist, as in Baby Snakes
  top: 'bare',
  shirt: '#e6b48f',
  trousers: '#ece8e0',
  legs: 'shorts',
  shoes: '#e8e4dc',
  footwear: 'trainers',
  accent: '#2f6fd1',
  headphones: false,
  kit: { shell: '#0e0e10', finish: 'gloss', hardware: 'chrome', rug: '#1a1a1c' },
};

/**
 * El Estepario Siberiano in "NO ONE CAN PLAY THIS GROOVE." (YouTube Short, 19 July
 * 2023; Q0-t5v2OBBs, the opening frames and 0:30), about twenty-seven: muscular, a long
 * full black beard, a black cap on backwards over his dark hair, black closed-back
 * headphones, a white vest with both arms tattooed (the app draws no tattoos), black
 * jeans and grey-and-white trainers. A black kit with chrome hardware, a Meinl cowbell
 * pedal by his left foot, on a red patterned Meinl rug.
 */
const EL_ESTEPARIO: Persona = {
  id: 'estepario',
  name: 'El Estepario Siberiano',
  figure: 'male',
  build: 'muscular',
  skin: '#d29a76',
  hair: '#1c1511',
  // short, under the cap
  hairStyle: 'capped',
  beard: 'full',
  top: 'vest',
  shirt: '#ecebe6',
  trousers: '#1b1b1e',
  shoes: '#55575c',
  // the cap's colour
  accent: '#141416',
  hat: 'cap',
  headphones: true,
  kit: { shell: '#1d1d20', finish: 'gloss', hardware: 'chrome', rug: '#8f1d1f' },
};

/**
 * Clay Aeschliman in his G.O.A.T. playthrough for Meinl (YouTube, 26 November 2018;
 * N1LPPEpKveU, frames at 0:12-1:06), at about thirty, the month after New Levels New Devils:
 * long, dark brown hair in loose curls past his shoulders, a full dark beard, a black
 * sleeveless shirt with a white print on its chest (not drawn), a tattoo sleeve on his
 * arm (the app draws no tattoos). A wine-red lacquered kit with chrome hardware under a
 * crowd of Meinl stacks and chinas. Trousers and shoes are out of shot: dark ones.
 * On stage now (a recent live photograph), he wears a black cap the
 * right way round, its peak over his brow, with the curls gathered back under it
 * and tied in a loose knot low behind his head: that is how he is drawn.
 */
const CLAY_AESCHLIMAN: Persona = {
  id: 'aeschliman',
  name: 'Clay Aeschliman',
  figure: 'male',
  build: 'average',
  skin: '#e2b08f',
  hair: '#2a1a12',
  // gathered back under the cap and tied low behind the head
  hairStyle: 'knot',
  beard: 'full',
  top: 'vest',
  shirt: '#141416',
  trousers: '#1c1c20',
  shoes: '#2a2a2e',
  // the cap's colour; on dark trainers it leaves their heel flash the laces' colour, not a loud one
  accent: '#141416',
  hat: 'cap',
  forwards: true,
  headphones: false,
  kit: { shell: '#5a0f16', finish: 'gloss', hardware: 'chrome', rug: '#1c1c22' },
};

/**
 * Greg Errico with Sly and the Family Stone playing Thank You (Falettinme Be Mice Elf Agin)
 * on American television in the winter of 1969-70, at twenty-one (an upscaled upload,
 * ImDxjn8tcYY, looked at frame by frame; the owner's stills are from it): slim, his brown
 * hair long and curly to the shoulders, round tinted glasses in thin gold frames,
 * clean-shaven; a lime-green blouse with full sleeves under an open waistcoat patterned in
 * gold. His kit's front head, white, carries the band's name in stacked wavy black letters,
 * "SLY AND THE FAMILY STONE", drawn from the real head; the toms are black, studded all
 * over with rows of small white dots, the hardware chrome. The make is not named in any
 * source read. Trousers and shoes are out of shot: dark ones, a guess. No headphones.
 */
const GREG_ERRICO: Persona = {
  id: 'errico',
  name: 'Greg Errico',
  figure: 'male',
  build: 'slim',
  skin: '#e2b393',
  hair: '#5a3a22',
  // long, full and curly, to the shoulders
  hairStyle: 'frizz',
  beard: 'none',
  glasses: { shape: 'round', frame: '#c9a24a', tint: '#3a2820', dark: true },
  top: 'button-up',
  shirt: '#a6c93c',
  satin: true,
  waistcoat: { cloth: '#c9a23e', trim: '#7a5a1e' },
  trousers: '#2a2622',
  shoes: '#1c1814',
  footwear: 'boots',
  accent: '#c9a23e',
  headphones: false,
  kit: {
    shell: '#111114',
    finish: 'gloss',
    hardware: 'chrome',
    rug: '#2a2226',
    // the rows of small white dots studding the black shells
    dots: '#ecebe6',
    fineDots: true,
    head: { art: 'sly-and-the-family-stone', ground: '#f1ede4', ink: '#141414' },
  },
};

/**
 * DJ Johnson with Khruangbin at NPR Music's Tiny Desk, Washington, D.C. (YouTube,
 * vWLJeqLPfSU, uploaded 23 May 2018; frames at 1:36 and 2:00-2:12), touring Con Todo el
 * Mundo: heavily built, his head shaved, a full black beard; a black denim jacket
 * worn open over a black T-shirt with a white print (not drawn), blue jeans. A small kit, a
 * chrome piccolo snare with a strip of brown leather over its head, one floor tom, the hats on
 * his left. No headphones. The shells' colour is hidden behind the desk: a deep red with a
 * sparkle at KEXP a month later (Hl-XsneiGHo, 27 June 2018, the frames at 2:50-3:16), drawn
 * so here. His shoes are out of shot: dark ones, a guess.
 */
const DJ_JOHNSON: Persona = {
  id: 'djjohnson',
  name: 'DJ Johnson',
  figure: 'male',
  build: 'heavy',
  skin: '#4e2f20',
  hair: '#141110',
  hairStyle: 'bald',
  beard: 'full',
  // the denim jacket open over the T-shirt
  top: 'jacket',
  shirt: '#17171a',
  under: '#111113',
  neckwear: 'tee',
  trousers: '#3e5a7e',
  shoes: '#1c1c1e',
  accent: '#17171a',
  headphones: false,
  kit: { shell: '#5c1a20', finish: 'sparkle', hardware: 'chrome', rug: '#2a2422' },
};

/**
 * Andy Newmark at the Kilburn State Theatre, London, in 1974, at twenty-four, the year after
 * Fresh: Ronnie Wood's two shows for I've Got My Own Album to Do, with Keith Richards, Rod
 * Stewart, Ian McLagan and Willie Weeks (the filmed concert; DRUMMERWORLD's remaster on YouTube,
 * BPy7mfSZY5Q, frames at 0:15 and 5:50-6:35; the owner's still from the same film). Wavy light
 * brown hair over his ears, parted in the middle; round wire glasses with tinted lenses;
 * clean-shaven; a loose cream shirt, long-sleeved, open at the neck. A dark wine-red kit with
 * chrome hardware and a white front head (not drawn: BeatBreaker's own is kept). No headphones:
 * a live show. Trousers and shoes are out of shot: dark brown ones, a guess.
 */
const ANDY_NEWMARK: Persona = {
  id: 'newmark',
  name: 'Andy Newmark',
  figure: 'male',
  build: 'slim',
  skin: '#e8bc9c',
  hair: '#6e4c30',
  hairStyle: 'shaggy',
  beard: 'none',
  top: 'button-up',
  shirt: '#e2d4a8',
  neckwear: 'open',
  trousers: '#4a3a2c',
  shoes: '#2a1e18',
  accent: '#e2d4a8',
  glasses: { shape: 'round', frame: '#b89a5a', tint: '#c89a50' },
  headphones: false,
  kit: { shell: '#3a1418', finish: 'gloss', hardware: 'chrome', rug: '#2a2222' },
};

/**
 * Sol Amarfio with Osibisa on Radio Bremen's Beat-Club in 1971, playing Phallus C, at
 * thirty-two (the Beat-Club channel's upload, xEYPs3nbNJQ, captioned "Sol Amarfio dr";
 * frames at 2:44-3:08): slim, an ochre knitted cap pulled down over his hair, clean-shaven;
 * a white sleeveless smock with thin dark red stripes running down it, open at the neck,
 * over bare arms (drawn as a striped waistcoat with nothing under it); a long chain with a
 * pendant. His kit is wrapped in a black pearl, the hardware chrome, the cymbals brass; the
 * make is not named in any source read. The cap is drawn as a beanie, which adds a bobble
 * his has not got. Trousers and shoes are out of shot: dark ones, a guess. No headphones.
 */
const SOL_AMARFIO: Persona = {
  id: 'amarfio',
  name: 'Sol Amarfio',
  figure: 'male',
  build: 'slim',
  skin: '#3a2216',
  hair: '#141110',
  // cut close: none of it shows under the cap
  hairStyle: 'bald',
  hairTexture: 'coily',
  beard: 'none',
  // the striped smock, sleeveless and open at the neck
  top: 'bare',
  shirt: '#ebe5d8',
  waistcoat: { cloth: '#ebe5d8', trim: '#ebe5d8', buttoned: true, stripes: '#7a3a2a' },
  trousers: '#2a2622',
  shoes: '#1c1814',
  footwear: 'shoes',
  // the ochre cap
  accent: '#b8862e',
  hat: 'beanie',
  chain: true,
  headphones: false,
  kit: { shell: '#18181c', finish: 'oyster', hardware: 'chrome', rug: '#3a2a22' },
};

/**
 * Femi Koleoso with Ezra Collective at the Mercury Prize ceremony, 7 September 2023, the night
 * Where I'm Meant to Be won (BBC Music's film of Victory Dance, GV2w4Kvm7Oo, close-ups at 1:00):
 * heavily built, his head shaved to the scalp, clean-shaven, an in-ear monitor rather than
 * headphones, a sleeveless top in the band's tie-dyed camouflage of cream, sage green and orange.
 * His kit in silver sparkle with chrome hardware. His trousers are not seen; the band wore the
 * print as matching sets, so they are its cream.
 */
const FEMI_KOLEOSO: Persona = {
  id: 'koleoso',
  name: 'Femi Koleoso',
  figure: 'male',
  build: 'heavy',
  skin: '#4f2f20',
  hair: '#1a1210',
  // shaved to the scalp
  hairStyle: 'bald',
  beard: 'none',
  top: 'vest',
  shirt: '#d6c9a0',
  // the tie-dyed camouflage's green and orange
  motifs: ['#6f8f4e', '#d9742c'],
  trousers: '#cfc3a0',
  shoes: '#e8e8e8',
  accent: '#d9742c',
  headphones: false,
  kit: { shell: '#c9cbcc', finish: 'sparkle', hardware: 'chrome', rug: '#2a2a2e' },
};

/**
 * Max Weinberg with the E Street Band on the Born in the U.S.A. tour, 1984, at
 * thirty-three, in John Sayles's video for "Born in the U.S.A." (concert footage cut
 * with the studio recording; the official upload, EPhWR4d3FJQ, frames at 4:05-4:13):
 * slim, short dark brown hair with a wave on top, clean-shaven, thin wire-framed
 * glasses; a pale grey long-sleeved shirt, its collar open, under a dark buttoned
 * waistcoat. His kit's shells read white under the blue stage light, the hardware
 * chrome; the make is not named for this tour in any source read (Slingerland, Ludwig
 * and Pearl over the years: Wikipedia). Trousers and shoes are out of shot: dark ones,
 * a guess. No headphones.
 */
const MAX_WEINBERG: Persona = {
  id: 'maxweinberg',
  name: 'Max Weinberg',
  figure: 'male',
  build: 'slim',
  skin: '#e2b596',
  hair: '#2a1d15',
  hairStyle: 'tousled',
  beard: 'none',
  top: 'button-up',
  shirt: '#c8ccd2',
  neckwear: 'open',
  waistcoat: { cloth: '#25252a', trim: '#25252a', buttoned: true },
  glasses: { shape: 'square', frame: '#9a9894' },
  trousers: '#1c1c22',
  shoes: '#141416',
  footwear: 'shoes',
  accent: '#25252a',
  headphones: false,
  kit: { shell: '#e6e8ec', finish: 'gloss', hardware: 'chrome', rug: '#2a2622' },
};

/**
 * Clem Burke in Blondie's Heart of Glass video, filmed late in 1978 and directed by Stanley
 * Dorfman, at twenty-four (the band's official upload, WGU_4-5RaxU; frames at the kit,
 * 1:38-1:44): slim, a dark brown mod mop with a full fringe to his brows and over his ears,
 * clean-shaven; a plain pale grey T-shirt. His kit is a red sparkle Premier with chrome
 * hardware, "a Moonie-style red sparkle Premier" (MusicRadar, 2014), with two floor toms; its
 * white front head with Premier's name is not drawn (BeatBreaker's own is kept). Trousers and
 * shoes are out of shot behind the kit: black ones, a guess. No headphones: a video shoot.
 */
const CLEM_BURKE: Persona = {
  id: 'clemburke',
  name: 'Clem Burke',
  figure: 'male',
  build: 'slim',
  skin: '#ecc2a2',
  hair: '#4a3222',
  hairStyle: 'mop',
  beard: 'none',
  top: 'tee',
  shirt: '#cfd0cc',
  trousers: '#1c1c22',
  shoes: '#18181a',
  accent: '#a8121c',
  headphones: false,
  kit: { shell: '#a3141e', finish: 'sparkle', hardware: 'chrome', rug: '#26201e' },
};

/**
 * Steve Jordan at the kit in a recent concert photograph the owner supplied
 * (Getty Images; Paras Griffin): his head shaved close, a thin moustache,
 * black sunglasses with heavy square frames; a navy jacket worn open over a
 * mustard polo neck, two silver chains over it, the longer with a cross. No
 * headphones. A Gretsch, dark shells and chrome. Trousers and shoes are
 * behind the kit: dark, a guess.
 */
const STEVE_JORDAN: Persona = {
  id: 'stevejordan',
  name: 'Steve Jordan',
  figure: 'male',
  build: 'average',
  skin: '#5a3826',
  hair: '#141110',
  hairStyle: 'fade',
  hairTexture: 'coily',
  beard: 'pencil',
  glasses: { shape: 'wrap', frame: '#101010', thick: true, dark: true },
  top: 'jacket',
  shirt: '#1d2333',
  under: '#c98d34',
  neckwear: 'polo',
  chain: { metal: '#c4c4c8', cross: true },
  trousers: '#1a1c24',
  shoes: '#111111',
  accent: '#1d2333',
  headphones: false,
  kit: { shell: '#151515', finish: 'gloss', hardware: 'chrome', rug: '#3a2a24' },
};

/**
 * Pistol Allen at the kit in a black-and-white photograph from Detroit's Metro
 * Times (on Wikipedia as File:Richard Pistol Allen.jpg), outdoors, undated; the
 * clothes say the late 1960s or early 1970s, his Motown years. Slim, a long
 * face, clean-shaven, the hair cut close under a broad-brimmed cowboy hat,
 * glasses with tinted lenses; a dark shirt printed with pale flowers, open at
 * the neck, a thin chain, a dark sleeveless vest worn open over it. A silver
 * sparkle Ludwig (the name on the kick's head) and chrome. The photograph is
 * black and white: every colour is a guess, and his trousers and feet are
 * behind the kit.
 */
const PISTOL_ALLEN: Persona = {
  id: 'pistolallen',
  name: "Richard 'Pistol' Allen",
  figure: 'male',
  build: 'slim',
  skin: '#4e3022',
  hair: '#141010',
  hairStyle: 'fade',
  hairTexture: 'coily',
  beard: 'none',
  // a broad felt brim, the crown creased
  hat: 'cowboy',
  glasses: { shape: 'aviator', frame: '#1c1814', tint: '#2a1d14' },
  top: 'button-up',
  shirt: '#1e1c22',
  // pale flowers scattered over the dark shirt
  motifs: ['#ece6da', '#c9c2b4'],
  neckwear: 'open',
  waistcoat: { cloth: '#2c2622', trim: '#2c2622' },
  chain: { metal: '#c4c4c8' },
  trousers: '#24221f',
  shoes: '#141210',
  footwear: 'shoes',
  // the hat's grey-brown felt
  accent: '#5a5048',
  headphones: false,
  kit: { shell: '#c8ccd2', finish: 'sparkle', hardware: 'chrome', rug: '#2a2420' },
};

/**
 * Uriel Jones at the Funk Brothers' reunion filmed for Standing in the Shadows of Motown (2002),
 * the band showing how they played "Ain't Too Proud to Beg" (BBC Four's broadcast, YouTube
 * MIxLdY8B5l0, at the kit from 0:40 to 1:04; frames at 0:46): sixty-seven, heavy-set, a black
 * beret worn level, thin pale wire-rimmed glasses, a dark moustache greying, a black polo neck
 * under a dark ribbed cardigan. No headphones. A kit in blue sparkle with chrome hardware, a
 * cymbal over the high tom. No film of him at the kit in the 1960s was found, and the one later
 * clip labelled with his name (a drum clinic, YouTube dDSoUduxXso) shows the same heavy build in a
 * cap. The cardigan is drawn as an open jacket over the polo neck, the beret as the flat cap, the
 * nearest shapes; his trousers and feet are behind the kit, dark and a guess.
 */
const URIEL_JONES: Persona = {
  id: 'urieljones',
  name: 'Uriel Jones',
  figure: 'male',
  build: 'heavy',
  skin: '#5a3826',
  hair: '#2a2522',
  // cropped close under the beret
  hairStyle: 'crop',
  hairTexture: 'coily',
  beard: 'moustache',
  beardColour: '#3a3532',
  // thin, pale wire rims
  glasses: { shape: 'square', frame: '#b8b0a0' },
  // a beret worn level: the flat cap is the nearest shape
  hat: 'flat',
  // a dark ribbed cardigan, open over a black polo neck
  top: 'jacket',
  shirt: '#26262a',
  under: '#141416',
  neckwear: 'polo',
  trousers: '#1c1c1e',
  shoes: '#111111',
  footwear: 'shoes',
  accent: '#26262a',
  headphones: false,
  kit: { shell: '#2c4a8c', finish: 'sparkle', hardware: 'chrome', rug: '#2a2420' },
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
  zigaboo: ZIGABOO,
  aljackson: AL_JACKSON,
  carltonbarrett: CARLTON_BARRETT,
  buddyrich: BUDDY_RICH,
  grohl: GROHL,
  questlove: QUESTLOVE,
  levonhelm: LEVON_HELM,
  peart: PEART,
  watts: WATTS,
  moon: MOON,
  paice: PAICE,
  bruford: BRUFORD,
  headon: HEADON,
  stephenmorris: STEPHEN_MORRIS,
  helders: HELDERS,
  billward: BILL_WARD,
  blakey: BLAKEY,
  earlpalmer: EARL_PALMER,
  sheilae: SHEILA_E,
  barker: BARKER,
  bennybenjamin: BENNY_BENJAMIN,
  tonythompson: TONY_THOMPSON,
  ulrich: ULRICH,
  halblaine: HAL_BLAINE,
  rogertaylor: ROGER_TAYLOR,
  chadsmith: CHAD_SMITH,
  porcaro: PORCARO,
  taylorhawkins: TAYLOR_HAWKINS,
  portnoy: PORTNOY,
  garibaldi: GARIBALDI,
  rudd: RUDD,
  krupa: KRUPA,
  mcbrain: MCBRAIN,
  nickmason: NICK_MASON,
  burr: BURR,
  phillyjoe: PHILLY_JOE,
  morello: MORELLO,
  jimmycobb: JIMMY_COBB,
  brianblade: BRIAN_BLADE,
  slydunbar: SLY_DUNBAR,
  gadson: GADSON,
  mikeclark: MIKE_CLARK,
  santadavis: SANTA_DAVIS,
  alanwhite: ALAN_WHITE_OASIS,
  woodmansey: WOODMANSEY,
  dennisdavis: DENNIS_DAVIS,
  mikejoyce: MIKE_JOYCE,
  buckler: RICK_BUCKLER,
  rowntree: DAVE_ROWNTREE,
  rogertaylorduran: ROGER_TAYLOR_DURAN,
  reni: RENI,
  kenneyjones: KENNEY_JONES,
  paulcook: PAUL_COOK,
  selway: PHIL_SELWAY,
  budgie: BUDGIE,
  simonphillips: SIMON_PHILLIPS,
  joshfreese: JOSH_FREESE,
  mattcameron: MATT_CAMERON,
  djfontana: DJ_FONTANA,
  carlpalmer: CARL_PALMER,
  kennyclarke: KENNY_CLARKE,
  fredbelow: FRED_BELOW,
  miltonbanana: MILTON_BANANA,
  bozzio: TERRY_BOZZIO,
  estepario: EL_ESTEPARIO,
  aeschliman: CLAY_AESCHLIMAN,
  errico: GREG_ERRICO,
  djjohnson: DJ_JOHNSON,
  newmark: ANDY_NEWMARK,
  amarfio: SOL_AMARFIO,
  koleoso: FEMI_KOLEOSO,
  maxweinberg: MAX_WEINBERG,
  clemburke: CLEM_BURKE,
  stevejordan: STEVE_JORDAN,
  pistolallen: PISTOL_ALLEN,
  urieljones: URIEL_JONES,
};

/**
 * A drummer's other looks, by the name a song gives (`StyleSong.look`): how
 * they looked in another era. A song that names none plays the likeness.
 */
export const LOOKS: Readonly<Record<string, Readonly<Record<string, Persona>>>> = {
  ringo: { pepper: RINGO_PEPPER },
};

/**
 * The drummer who sits in as themselves for `style`, if it is a drummer's own
 * with a likeness: in the `look` the song playing gives, where they have it.
 */
export function likenessFor(style: string, look?: string): Persona | undefined {
  if (!Object.hasOwn(LIKENESSES, style)) return undefined;
  const looks = Object.hasOwn(LOOKS, style) ? LOOKS[style] : undefined;
  return look && looks && Object.hasOwn(looks, look) ? looks[look] : LIKENESSES[style];
}
