/**
 * The style table — seed data.
 *
 * 62 grooves, each a set of tendencies or a handful of written-out bars, so the
 * generator can write a different break in the same idiom every time.
 *
 * **Content, not code** (D13). This file is the source the `001-catalogue` seed
 * unit reads, and nothing else imports it — the generator takes a resolved
 * style as an argument, and a grep test
 * (`tests/unit/lib/app/breaks/no-content-imports.test.ts`) keeps it that way.
 * Editing a style here gives a fresh database a different version 1; changing
 * one on a running installation adds a *new version* through
 * `/admin/catalogue`, because versions are immutable and a saved break has to
 * keep sounding the way it sounded.
 *
 * **Every style here is written in 4/4** (bar the seven that name their own
 * `meter`). Carrying one into another meter is `styleIn`'s job, in
 * `lib/app/breaks/styles.ts`, and it travels by pulse rather than by raw step
 * index.
 */

import type { Style } from '@/lib/app/breaks/types';

export const STYLES: Record<string, Style> = {
  funk: {
    label: 'Funk 16ths',
    mix: { h: 0.72 }, // unbroken 16ths under a kick-and-ghost conversation
    hint: 'Stubblefield and Jabo territory — unbroken 16th hats, a kick that answers the snare, ghosts everywhere.',
    hats: 16,
    bpm: [88, 106],
    swing: 8,
    swingRange: [4, 14],
    ghostBias: 1.0,
    opens: 2,
    backbeats: [4, 12],
    kick1: [
      ['1000', 5],
      ['1010', 2],
      ['1001', 1.6],
      ['1100', 1.4],
    ],
    kick: [
      ['0000', 1.1],
      ['0010', 1.9],
      ['0001', 1.6],
      ['1000', 1.3],
      ['1010', 0.9],
      ['0011', 0.7],
      ['1001', 0.9],
      ['0110', 0.5],
      ['0101', 0.35],
      ['0100', 0.5],
    ],
  },
  boombap: {
    label: 'Boom bap',
    hint: 'Sparse and heavy. Hats on 8ths, kick leaves room, the snare is the loudest thing in the bar.',
    hats: 8,
    bpm: [80, 96],
    swing: 16,
    swingRange: [10, 26],
    ghostBias: 0.45,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 10,
    kick1: [
      ['1000', 6],
      ['1001', 1.4],
      ['1010', 1.2],
    ],
    kick: [
      ['0000', 2.2],
      ['0010', 1.5],
      ['0001', 1.2],
      ['1000', 1.1],
      ['0100', 0.6],
      ['1001', 0.5],
    ],
  },
  amen: {
    label: 'Amen / jungle',
    mix: { h: 0.82 }, // ride-led once it is chopped; the hats are filler
    hint: 'Fast, ride-led, backbeat displaced late in the phrase. Built to be chopped.',
    hats: 8,
    bpm: [128, 172],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.6,
    opens: 1,
    backbeats: [4, 12],
    displace: 0.65,
    kick1: [
      ['1000', 5],
      ['1010', 2.4],
    ],
    kick: [
      ['0000', 1.6],
      ['0010', 2.2],
      ['1000', 0.8],
      ['0001', 0.9],
      ['0011', 0.5],
    ],
  },
  reggae: {
    label: 'Reggae — one drop',
    crossStick: true,
    hint: 'The one drop: nothing on beat 1, kick and rim landing together on 3. The 3 is a cross-stick and the page plays one — the stick laid across the head with its shoulder on the rim, drawn as an X on the snare line. Everything else is what you leave out.',
    hats: 8,
    bpm: [68, 88],
    swing: 8,
    swingRange: [4, 16],
    ghostBias: 0.3,
    opens: 1,
    backbeats: [8],
    targetDensity: 6,
    noKick: [0],
    forceKick: [8],
    feel: {
      label: 'One drop',
      k: 0.05,
      s: 0.09,
      sGhost: 0.06,
      h: [0, 0.06],
      r: [0, 0.06],
      c: 0.02,
      jitter: 0.015,
    },
    kick1: [
      ['0000', 9],
      ['0001', 1.2],
      ['0010', 0.8],
    ],
    kick: [
      ['0000', 3.0],
      ['0001', 1.0],
      ['0010', 0.9],
      ['1000', 0.8],
      ['0100', 0.4],
    ],
  },
  dub: {
    label: 'Dub — steppers',
    hint: 'Four on the floor under a one-drop snare, and space everywhere else. Wants the Live room kit with the Room knob up — half of dub is the return signal.',
    hats: 8,
    bpm: [60, 80],
    swing: 4,
    swingRange: [0, 10],
    ghostBias: 0.25,
    opens: 2,
    backbeats: [8],
    targetDensity: 7,
    forceKick: [0, 4, 8, 12],
    feel: {
      label: 'Dub time',
      k: 0.03,
      s: 0.12,
      sGhost: 0.08,
      h: [0, 0.08],
      r: [0, 0.08],
      c: 0.02,
      jitter: 0.02,
    },
    kick1: [['1000', 9]],
    kick: [
      ['1000', 6],
      ['1001', 1.0],
      ['1010', 0.6],
    ],
  },
  halftime: {
    label: 'Half-time heavy',
    hint: 'One backbeat, on 3. Everything hangs off how long you can leave it.',
    toms: true,
    hats: 8,
    bpm: [68, 90],
    swing: 4,
    swingRange: [0, 10],
    ghostBias: 0.35,
    opens: 1,
    backbeats: [8],
    targetDensity: 8,
    kick1: [
      ['1000', 6],
      ['1001', 1.2],
    ],
    kick: [
      ['0000', 2.6],
      ['0010', 1.4],
      ['0001', 1.3],
      ['1000', 0.8],
      ['0011', 0.4],
    ],
  },
  motown: {
    label: 'Motown',
    hint: 'Straight 8ths, a backbeat you could set a watch by, and a kick that stays out of its way. Leans a hair in front of the click rather than behind it.',
    perc: [{ inst: 'tamb', every: 2, accentPulse: true }],
    hats: 8,
    bpm: [112, 134],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.3,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.9,
    forceKick: [0],
    feel: {
      label: 'Pushed',
      k: -0.03,
      s: -0.035,
      sGhost: -0.02,
      h: [-0.02, -0.01],
      r: [-0.02, -0.01],
      c: -0.03,
      jitter: 0.012,
    },
    kick1: [
      ['1000', 7],
      ['1010', 1.2],
      ['1001', 0.8],
    ],
    kick: [
      ['0000', 1.8],
      ['1000', 2.2],
      ['0010', 1.0],
      ['0001', 0.6],
      ['1001', 0.5],
    ],
  },
  shuffle: {
    label: 'Shuffle',
    mix: { h: 0.62 }, // a swung hat repeated all bar wears out fast
    hint: 'Swung 8ths: the “and” sits two thirds of the way through the beat instead of halfway. The Swing slider moves the 8ths here, not the 16ths — 100% is a full triplet shuffle.',
    hats: 8,
    bpm: [78, 108],
    swing: 85,
    swingRange: [75, 100],
    swingUnit: 8,
    ghostBias: 0.5,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    kick1: [
      ['1000', 6],
      ['1010', 1.4],
    ],
    kick: [
      ['0000', 2.0],
      ['1000', 1.5],
      ['0010', 1.6],
      ['0001', 0.4],
    ],
  },
  twostep: {
    label: 'Two-step',
    mix: { h: 0.75 }, // skippy 16ths, but the kick is the hook
    hint: 'UK garage: swung 16ths, snare on 2 and 4, and a kick that refuses to play beat 3. Skippy on purpose.',
    hats: 16,
    bpm: [128, 140],
    swing: 26,
    swingRange: [20, 34],
    ghostBias: 0.55,
    opens: 2,
    backbeats: [4, 12],
    targetDensity: 10,
    hatDepth: 0.8,
    openSlots: [2, 6, 10, 14],
    noKick: [8],
    forceKick: [0],
    kick1: [
      ['1000', 6],
      ['1001', 1.4],
      ['1010', 1.0],
    ],
    kick: [
      ['0000', 1.6],
      ['0001', 1.8],
      ['0010', 1.4],
      ['0011', 0.8],
      ['1000', 0.6],
      ['0100', 0.5],
    ],
  },
  linearfunk: {
    label: 'Linear funk',
    mix: { h: 0.6 }, // a linear groove is one voice — no limb should lead
    hint: 'No two limbs at once. The hats are punched out wherever the kick or the snare lands, which is what makes a linear groove sound like one voice rather than three.',
    hats: 16,
    bpm: [92, 112],
    swing: 6,
    swingRange: [2, 10],
    ghostBias: 1.1,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 12,
    hatDepth: 0.95,
    linear: true,
    kick1: [
      ['1000', 4],
      ['1010', 1.6],
      ['1001', 1.4],
    ],
    kick: [
      ['0010', 1.9],
      ['0001', 1.6],
      ['0000', 1.2],
      ['1000', 1.0],
      ['0011', 0.8],
      ['1001', 0.8],
      ['0110', 0.5],
    ],
  },
  afrobeat: {
    label: 'Afrobeat',
    hint: 'Tony Allen territory — the accent sits on the “and” of 2 rather than on 2, open hats bark on every off-beat, and the kick leaves most of the bar alone.',
    perc: [
      { inst: 'shaker', every: 2, accentPulse: true },
      { inst: 'cowbell', steps: [0, 6, 8, 14] },
    ],
    hats: 16,
    bpm: [100, 118],
    swing: 14,
    swingRange: [8, 20],
    ghostBias: 1.35,
    opens: 3,
    backbeats: [6, 12],
    hatDepth: 1.15,
    openSlots: [2, 6, 10, 14],
    /* Sits a shade behind the click rather than on it. Nothing like the Dilla drag —
       this is the difference between a groove that pushes and one that rolls. */
    feel: {
      label: 'Laid back',
      k: 0.01,
      s: 0.06,
      sGhost: 0.04,
      h: [0, 0.05],
      r: [0, 0.05],
      c: 0,
      jitter: 0.018,
    },
    kick1: [
      ['1000', 3.2],
      ['1001', 1.5],
      ['1010', 1.0],
      ['0010', 1.0],
      ['0000', 0.7],
    ],
    kick: [
      ['0000', 2.0],
      ['0010', 1.9],
      ['0001', 1.5],
      ['1000', 0.8],
      ['0011', 0.7],
      ['0100', 0.6],
      ['1001', 0.6],
      ['0110', 0.4],
    ],
  },
  dilla: {
    label: 'Dilla time',
    mix: { h: 0.6 }, // the hats lean their own way and should not lead
    hint: 'Snare well behind the beat, kick just in front of it, hats leaning their own way. The page stays on the grid; the playback does not.',
    hats: 16,
    bpm: [84, 96],
    swing: 5,
    swingRange: [0, 12],
    ghostBias: 0.7,
    opens: 1,
    backbeats: [4, 12],
    hatDepth: 0.55,
    /* Offsets are fractions of a 16th, so the feel travels with the tempo. The snare
       drag is the load-bearing one: everything else is there to lean against it.
       `h` and `r` are [on-16th, off-16th] — the off-beats lag while the beats sit a
       hair early, which is the lurch, not swing. */
    feel: {
      label: 'Dilla time',
      k: -0.055,
      s: 0.175,
      sGhost: 0.09,
      h: [-0.02, 0.09],
      r: [-0.02, 0.09],
      c: -0.03,
      jitter: 0.022,
    },
    kick1: [
      ['1000', 4],
      ['1001', 2.2],
      ['1010', 1.5],
      ['1100', 1.1],
    ],
    kick: [
      ['0000', 1.5],
      ['0010', 1.9],
      ['0001', 1.7],
      ['1000', 1.2],
      ['1001', 1.1],
      ['0011', 0.9],
      ['1010', 0.7],
      ['0100', 0.5],
    ],
  },
  secondline: {
    label: 'Second line',
    mix: { h: 0.72 }, // the snare never sits still; let it through
    hint: 'New Orleans roll — the kick is conversational, the snare never sits still.',
    toms: true,
    hats: 16,
    bpm: [86, 104],
    swing: 22,
    swingRange: [16, 30],
    ghostBias: 1.2,
    opens: 2,
    backbeats: [4, 12],
    kick1: [
      ['1001', 3],
      ['1000', 3],
      ['1010', 1.6],
      ['1011', 0.8],
    ],
    kick: [
      ['0010', 2],
      ['0011', 1.2],
      ['0001', 1.6],
      ['0110', 1],
      ['1001', 1],
      ['0000', 0.9],
      ['1010', 0.8],
    ],
  },
  /* ---- soul, gospel and disco -------------------------------------- */
  disco: {
    label: 'Disco',
    hint: 'Four on the floor, clap-hard backbeat, and an open hat barking on every "and". The hats carry the 16ths; the kick never moves.',
    toms: true,
    perc: [{ inst: 'tamb', every: 4, from: 2 }],
    hats: 16,
    bpm: [110, 128],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.22,
    opens: 4,
    backbeats: [4, 12],
    targetDensity: 11,
    hatDepth: 0.7,
    openSlots: [2, 6, 10, 14],
    forceKick: [0, 4, 8, 12],
    kick1: [['1000', 9]],
    kick: [
      ['1000', 9],
      ['1001', 0.5],
    ],
  },
  soul: {
    label: 'Soul',
    hint: 'Al Jackson weight without the funk busyness — 8th hats, a backbeat you lean on, ghosts filling the gaps. Sits a hair behind the click.',
    hats: 8,
    bpm: [86, 104],
    swing: 12,
    swingRange: [8, 18],
    ghostBias: 0.8,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 10,
    feel: {
      label: 'Deep pocket',
      k: 0.01,
      s: 0.045,
      sGhost: 0.03,
      h: [0, 0.03],
      r: [0, 0.03],
      c: 0,
      jitter: 0.014,
    },
    kick1: [
      ['1000', 6],
      ['1001', 1.6],
      ['1010', 1.2],
    ],
    kick: [
      ['0000', 1.8],
      ['0010', 1.6],
      ['0001', 1.4],
      ['1000', 1.2],
      ['1001', 0.7],
      ['0011', 0.5],
    ],
  },
  neosoul: {
    label: 'Neo-soul',
    mix: { h: 0.55 }, // quiet hats are the style; the ghosts do the talking
    hint: 'Questlove and Chris Dave — snare well behind, kick syncopated against it, hats quiet and slightly swung. The ghosts do the talking.',
    hats: 16,
    bpm: [72, 92],
    swing: 18,
    swingRange: [12, 26],
    ghostBias: 1.25,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 11,
    hatDepth: 0.7,
    feel: {
      label: 'Behind',
      k: -0.02,
      s: 0.11,
      sGhost: 0.07,
      h: [-0.01, 0.05],
      r: [-0.01, 0.05],
      c: -0.02,
      jitter: 0.02,
    },
    kick1: [
      ['1000', 4],
      ['1001', 2.0],
      ['1010', 1.4],
      ['1100', 0.9],
    ],
    kick: [
      ['0000', 1.6],
      ['0010', 1.8],
      ['0001', 1.7],
      ['1000', 1.0],
      ['1001', 1.0],
      ['0011', 0.8],
      ['0110', 0.5],
    ],
  },
  purdie: {
    label: 'Purdie shuffle',
    mix: { h: 0.35 }, // six ghost notes a bar with the hats landing between them
    /* Written in 12/8, which is what it is: four pulses of three. The triplets are the
       meter rather than a swing setting, so all three partials are real positions and
       the page can draw the thing properly. The right hand shuffles the hi-hat on the
       first and third partial of every pulse; the left hand puts a ghost on the second
       — in the gap, between the hats — and the two hands together come out as an
       unbroken triplet stream. That gap is the groove, so those ghosts are written in
       rather than rolled for; the Ghost notes slider adds the extra ones around them. */
    hint: 'Half-time shuffle in 12/8 — picking it moves the time signature for you. The hi-hat shuffles the first and third triplet of every pulse and the snare ghosts sit in the gaps between them, so the two hands together read as unbroken triplets. One backbeat, on 3. Leave Swing at zero: the triplets are the meter here, not a setting. The tempo counts quarter notes, so the dotted-quarter pulse is two thirds of what the readout says.',
    kit: 'virtuosity',
    meter: '12/8',
    hats: 8,
    bpm: [126, 150],
    swing: 0,
    ghostBias: 1.1,
    opens: 0,
    backbeats: [12],
    targetDensity: 9,
    hatDepth: 0.95,
    hat: { steps: [0, 4, 6, 10, 12, 16, 18, 22], accents: [0, 6, 12, 18] },
    snareGhosts: [2, 8, 14, 20],
    ghostWeights: { 4: 0.34, 10: 0.34, 16: 0.34, 22: 0.34, 0: 0.2, 6: 0.2, 18: 0.2 },
    forceKick: [0],
    kick1: [['1000', 9]],
    kick: [
      ['0000', 3.6],
      ['1000', 1.0],
      ['0010', 0.9],
      ['0001', 0.5],
    ],
  },
  gospel: {
    label: 'Gospel',
    mix: { h: 0.7 }, // busy 16ths under a busier snare
    hint: 'Interactive and loud — a planted backbeat, a kick that answers the room, ghosts and 16ths packed in between. Busier than soul on purpose.',
    toms: true,
    perc: [{ inst: 'tamb', every: 2, accents: [4, 12] }],
    hats: 16,
    bpm: [76, 104],
    swing: 10,
    swingRange: [6, 16],
    ghostBias: 1.3,
    opens: 2,
    backbeats: [4, 12],
    targetDensity: 13,
    feel: {
      label: 'Church',
      k: -0.01,
      s: 0.03,
      sGhost: 0.02,
      h: [0, 0.02],
      r: [0, 0.02],
      c: -0.02,
      jitter: 0.016,
    },
    kick1: [
      ['1000', 5],
      ['1001', 1.8],
      ['1010', 1.4],
      ['1100', 1.0],
    ],
    kick: [
      ['0010', 1.9],
      ['0001', 1.7],
      ['0000', 1.4],
      ['1000', 1.1],
      ['1001', 1.0],
      ['0011', 0.9],
      ['0110', 0.6],
    ],
  },
  stax: {
    label: 'Stax / Memphis soul',
    hint: 'Sparse kick, huge snare, almost nothing else. The whole thing sits behind the click and stays there. If you are adding notes you are playing the wrong style.',
    hats: 8,
    bpm: [84, 102],
    swing: 6,
    swingRange: [2, 12],
    ghostBias: 0.45,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 8,
    forceKick: [0],
    feel: {
      label: 'Behind',
      k: 0.03,
      s: 0.08,
      sGhost: 0.05,
      h: [0, 0.04],
      r: [0, 0.04],
      c: 0.01,
      jitter: 0.016,
    },
    kick1: [
      ['1000', 8],
      ['1001', 1.0],
    ],
    kick: [
      ['0000', 3.2],
      ['0010', 1.0],
      ['1000', 1.0],
      ['0001', 0.7],
    ],
  },

  /* ---- rock ------------------------------------------------------------
     Rock, like metal, is a handful of known beats more than a set of
     tendencies, so these write theirs out as figures (see the metal note
     below for the notation) and the generator picks among them, a second for
     half the phrase, varying each pass: the kick picks up a push, the hats
     open on an "and", a crash lands ahead of the bar. The kick cells still
     serve any meter the figures are not written for.

     From the records: Phil Rudd's 8ths on dirty hats with the kick on 1 and 3
     (Back in Black), Bonham's kick on the last 16th of a beat, Chad Smith's
     ghosts round a 2-and-4, Earl Palmer's straight 8ths and the snare-led
     backbeat of Rock Around the Clock, the rockabilly snare shuffling in
     swung 8ths with the kick on 1, 3 and the "and" of 3, and the 12/8 slow
     rock of the doo-wop and blues ballads: triplets on the hats, 2 and 4.
     ------------------------------------------------------------------- */
  rock: {
    label: 'Rock',
    hint: 'Straight 8ths, snare on 2 and 4, a kick that lands on 1 and somewhere round 3: the and of 2, the and of 3, a 16th before. The hats open into the next bar, the chorus goes to the ride, a fill goes round the toms. No swing, few ghosts, nothing behind the beat.',
    toms: true,
    hats: 8,
    bpm: [100, 144],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.2,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.8,
    rimshot: 0.3,
    forceKick: [0],
    kick1: [
      ['1000', 7],
      ['1001', 1.2],
      ['1010', 0.8],
    ],
    kick: [
      ['0000', 1.6],
      ['1000', 1.8],
      ['0010', 1.2],
      ['0001', 0.9],
      ['1001', 0.5],
    ],
    figures: [
      // the plainest beat there is: kick on 1 and 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 1.6],
      // a push on the "and" of 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 2.4],
      // kick on the "and" of 2 leading into 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 2.2],
      // the "and" of 4 pushing into the next bar
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.....1.' }, 1.4],
      // a 16th before 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1......11.......' }, 1.2],
      // two on the 1 and one on the "and" of 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.1.......1.....' }, 1.2],
      // the hats open on the "and" of 4, into the one
      [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3...', k: '1.......1.1.....' }, 1.5],
      // quarter-note hats, every one leaned on
      [{ h: '2...2...2...2...', s: '....3.......3...', k: '1.....1.1.......' }, 1.0],
      // the ride for a chorus
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.1.....' }, 1.2],
      // eighths on the floor tom instead of the hats
      [{ t3: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 0.8],
      // four on the floor under the backbeat
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1...1...1...1...' }, 0.7],
    ],
    fills: [
      // three 16ths on the snare and the floor tom into the one
      [{ s: '222.', t3: '...2' }, 2],
      // round the toms in 16ths over 3 and 4
      [{ s: '22......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      // snare 8ths over 3 and 4, getting louder
      [{ s: '2.2.3.3.' }, 1.4],
      // snare and floor tom together on 4 and its "and"
      [{ s: '3.3.', t3: '2.2.' }, 1.2],
      // snare, tom, kick, snare
      [{ s: '2..3', t1: '.2..', k: '..1.' }, 1.1],
      // flams on 3 and 4 and the "and" of 4
      [{ s: '6...6.6.' }, 0.8],
      // a stop: everyone hits 4, then nothing
      [{ c: '1...', s: '3...', k: '1...' }, 0.6],
    ],
  },
  hardrock: {
    label: 'Hard rock',
    hint: 'AC/DC, Zeppelin, Van Halen: the same 8ths, hit harder. Hats left a little open so they wash, rimshots on 2 and 4, a crash on every 8th for the chorus, the kick pushing a 16th ahead of 3. Fills are hands and feet, or the snare and floor tom together.',
    toms: true,
    kit: 'bigrusty',
    hats: 8,
    bpm: [92, 140],
    swing: 0,
    swingRange: [0, 8],
    ghostBias: 0.12,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.6,
    rimshot: 0.7,
    forceKick: [0],
    kick1: [
      ['1000', 6],
      ['1010', 1.5],
      ['1001', 1.2],
    ],
    kick: [
      ['1000', 1.8],
      ['0000', 1.2],
      ['1010', 1.2],
      ['0001', 1.0],
      ['0010', 1.0],
    ],
    figures: [
      // dirty hats: half-open 8ths, kick on 1 and 3
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.......1.......' }, 2],
      // closed 8ths, the kick on 1, 3 and the "and" of 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 2],
      // a crash on every 8th for the chorus
      [{ c: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 1.4],
      // the kick on the last 16th of 2: a Bonham push
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1......1..1.....' }, 1.5],
      // the bell on the beat, the kick doubled on 1 and 3
      [{ r: '2...2...2...2...', s: '....3.......3...', k: '1.1.....1.1.....' }, 1.0],
      // eighths on the floor tom
      [{ t3: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '1.......1.......' }, 0.8],
      // the hats open on the "and" of 2 and of 4
      [{ h: '1.1.1.3.1.1.1.3.', s: '....3.......3...', k: '1.....1.1.......' }, 1.2],
      // half-time: the snare on 3, the hats half-open
      [{ h: '4.4.4.4.4.4.4.4.', s: '........3.......', k: '1.....1...1.....' }, 0.8],
      // the ride, the kick pushing the "and" of 4
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1...1.' }, 1.0],
    ],
    fills: [
      // round the toms in 16ths
      [{ s: '32......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      // hands, hands, feet in threes across the beat
      [{ s: '2..2..2.', t3: '.2..2..2', k: '..1..1..' }, 1.5],
      // snare and floor tom together in 8ths
      [{ s: '3.3.3.3.', t3: '2.2.2.2.' }, 1.4],
      // three on the snare, one on the floor tom
      [{ s: '223.', t3: '...2' }, 1.5],
      // a stop: crash, kick and snare on 4, then nothing till the one
      [{ c: '1...', s: '3...', k: '1...' }, 0.7],
      // flam, flam, floor tom
      [{ s: '6.6.', t3: '...2' }, 0.8],
    ],
  },
  funkrock: {
    label: 'Funk rock',
    mix: { h: 0.75 },
    hint: 'Chili Peppers, Faith No More, Living Colour: a rock backbeat with the ghosts and the syncopated kick of funk round it. The kick on the "a" of 1 or the "e" of 3, the hats opening on the "and" of 2 and 4, and now and then 16ths on the hats with one hand.',
    toms: true,
    kit: 'drs',
    hats: 8,
    bpm: [90, 120],
    swing: 4,
    swingRange: [0, 10],
    ghostBias: 0.4, // the figures write their own ghosts; this adds a few round them
    opens: 2,
    backbeats: [4, 12],
    targetDensity: 12,
    rimshot: 0.35,
    forceKick: [0],
    kick1: [
      ['1010', 3],
      ['1001', 2.5],
      ['1000', 2],
      ['1011', 1],
    ],
    kick: [
      ['0010', 1.8],
      ['0001', 1.6],
      ['1001', 1.2],
      ['0110', 0.8],
      ['0000', 0.8],
      ['0011', 0.6],
    ],
    figures: [
      // ghosts round a 2-and-4, the kick syncopated
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3..1', k: '1.1.......1..1..' }, 2],
      // the kick on the "a" of 1 and the "and" of 2
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.1..1..3.1.', k: '1..1..1...1.....' }, 2],
      // hats opening on the "and" of 2 and 4
      [{ h: '1.1.1.3.1.1.1.3.', s: '....3.....1.3...', k: '1.....1...11....' }, 1.6],
      // one-handed 16ths on the hats, accents on the beat
      [{ h: '2111211121112111', s: '....3.......3...', k: '1.1....1..1.....' }, 1.4],
      // the kick on the "e" of 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3.1.', k: '1.....1..1....1.' }, 1.2],
      // the bell for a chorus, the kick doubled
      [{ r: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '1.11..1...1.....' }, 1.0],
      // an accent off the beat, on the "a" of 2
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..3.1..3...', k: '1.1.......1.....' }, 0.8],
    ],
    fills: [
      // snare, ghost, tom, floor tom
      [{ s: '31..', t1: '..2.', t3: '...2' }, 1.6],
      // round the toms with the kick in the gaps
      [{ s: '3.......', t1: '.22.....', k: '...1....', t2: '....22..', t3: '......22' }, 1.4],
      // the hats open over the backbeat on 4, a snare pickup into the one
      [{ h: '3...', s: '3.13', k: '1...' }, 1.2],
      // flam on 4, two on the floor tom
      [{ s: '6...', t3: '..22' }, 1.0],
      // snare accents across 3 and 4, ghosts between
      [{ s: '3.13.13.' }, 1.0],
    ],
  },
  powerballad: {
    label: 'Power ballad',
    hint: 'Slow, big and patient: a kick on 1 and the "and" of 2, a snare backbeat that rings out, cross-stick for the quiet verse and the ride for the chorus. At this tempo a fill is 16ths down the toms with room in them.',
    toms: true,
    kit: 'liveroom',
    hats: 8,
    bpm: [60, 84],
    swing: 0,
    swingRange: [0, 8],
    ghostBias: 0.2,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 8,
    hatDepth: 0.85,
    rimshot: 0.5,
    forceKick: [0],
    kick1: [
      ['1000', 6],
      ['1010', 1.4],
    ],
    kick: [
      ['0000', 1.8],
      ['0010', 1.6],
      ['1000', 1.4],
      ['0001', 0.8],
    ],
    figures: [
      // kick on 1 and 3, a big 2 and 4
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 2],
      // the kick on 1, the "and" of 2 and 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 2.2],
      // a 16th after 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1..1....' }, 1.2],
      // quarter-note hats for the verse
      [{ h: '1...1...1...1...', s: '....3.......3...', k: '1.......1.1.....' }, 1.0],
      // cross-stick for the quiet verse
      [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.......1.1.....' }, 1.0],
      // the ride for the chorus, the kick pushing the "and" of 4
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.....1.' }, 1.2],
      // half-open hats washing under the big chorus
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.....1.1.......' }, 0.8],
    ],
    fills: [
      // down the toms in 16ths over 3 and 4
      [{ s: '22......', t1: '..22....', t2: '....22..', t3: '......22' }, 2.5],
      // snare, snare, tom, floor tom
      [{ s: '22..', t1: '..2.', t3: '...2' }, 1.5],
      // snare 8ths, louder each time
      [{ s: '2.2.3.3.' }, 1.0],
      // flams down the toms
      [{ t1: '3.......', t2: '..3.....', t3: '....3.3.' }, 0.8],
      // one long build on the floor tom, the snare to finish
      [{ t3: '2.2.22..', s: '......33' }, 0.8],
    ],
  },
  slowrock: {
    label: 'Slow rock (12/8)',
    hint: 'The doo-wop and blues ballad in 12/8 — picking it moves the time signature for you. Triplets on the hats or the ride, snare on 2 and 4, the kick on 1 and 3 and sometimes on the last triplet before them. The tempo counts quarter notes, so the beat you feel is two thirds of the readout.',
    toms: true,
    kit: 'studio70',
    meter: '12/8',
    hats: 8,
    bpm: [72, 100],
    swing: 0,
    ghostBias: 0.3,
    opens: 0,
    backbeats: [6, 18],
    targetDensity: 6,
    hatDepth: 0.85,
    forceKick: [0],
    hat: { steps: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22], accents: [0, 6, 12, 18] },
    ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
    kick1: [
      ['1000', 7],
      ['1001', 1.2],
    ],
    kick: [
      ['0000', 2.4],
      ['1000', 1.6],
      ['0001', 1.0],
    ],
    figures: [
      // triplets on the hats, kick on 1 and 3
      [
        {
          h: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...........3.....',
          k: '1...........1...........',
        },
        2,
      ],
      // the kick on the last triplet of 2, into 3
      [
        {
          h: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...........3.....',
          k: '1.........1.1...........',
        },
        2,
      ],
      // the kick on the last triplet of 1 and of 3
      [
        {
          h: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...........3.....',
          k: '1...1.......1...1.......',
        },
        1.2,
      ],
      // the ride in triplets
      [
        {
          r: '1.1.1.1.1.1.1.1.1.1.1.1.',
          s: '......3...........3.....',
          k: '1.........1.1...........',
        },
        1.2,
      ],
      // the bell on each beat over ride triplets
      [
        {
          r: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...........3.....',
          k: '1...........1...1.......',
        },
        1.0,
      ],
      // a ghost on the last triplet of 2 and of 4
      [
        {
          h: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...1.......3...1.',
          k: '1...........1...........',
        },
        1.0,
      ],
      // quarter-note kick, doo-wop style
      [
        {
          h: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...........3.....',
          k: '1.....1.....1.....1.....',
        },
        0.6,
      ],
    ],
    fills: [
      // a triplet on the snare on 4
      [{ s: '2.2.3.' }, 1.5],
      // triplets down the toms over 3 and 4
      [{ s: '2.2.........', t1: '....2.2.....', t2: '........2...', t3: '..........2.' }, 2],
      // sextuplets: snare, tom, floor tom
      [{ s: '22....', t1: '..22..', t3: '....22' }, 1.5],
      // stabs on 3 and 4
      [{ c: '1.....1.....', s: '3.....3.....', k: '1.....1.....' }, 0.6],
    ],
  },
  rocknroll: {
    label: 'Rock and roll',
    hint: 'The 1950s: Earl Palmer behind Little Richard, the snare playing 8ths with 2 and 4 cracked on top, or 8ths on the ride over a kick on 1 and 3. The left foot keeps 2 and 4 on the hats. A touch of swing in the 8ths; push the Swing slider for a shuffle.',
    toms: true,
    kit: 'smdrums',
    hats: 8,
    bpm: [140, 184],
    swing: 25,
    swingRange: [15, 45],
    swingUnit: 8,
    ghostBias: 0.15,
    opens: 0,
    backbeats: [4, 12],
    foot: [4, 12],
    targetDensity: 9,
    forceKick: [0],
    kick1: [['1000', 8]],
    kick: [
      ['1000', 2.4],
      ['0000', 1.4],
      ['0010', 0.6],
    ],
    figures: [
      // the snare in 8ths, 2 and 4 cracked: Rock Around the Clock
      [{ s: '2.2.3.2.2.2.3.2.', k: '1.......1.......', hf: '....1.......1...' }, 2],
      // ride 8ths, kick on 1 and 3
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 2],
      // straight 8ths on the hats, a light kick on every beat
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1...1...1...1...' }, 1.5],
      // the ride, the kick on the "and" of 2
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 1.2],
      // the snare in 8ths with the ride on the beat
      [
        {
          r: '1...1...1...1...',
          s: '2.2.3.2.2.2.3.2.',
          k: '1.......1.......',
          hf: '....1.......1...',
        },
        1.0,
      ],
    ],
    fills: [
      // snare 8ths over 3 and 4
      [{ s: '2.2.2.3.' }, 2],
      // dotted 8ths on the snare across 3 and 4
      [{ s: '3..3..3.' }, 1.0],
      // snare and floor tom, turn about
      [{ s: '2...2...', t3: '..2...2.' }, 1.2],
      // a stop on 4, the band answers
      [{ c: '1...', s: '3...', k: '1...' }, 0.8],
    ],
  },
  rockabilly: {
    label: 'Rockabilly',
    hint: 'Sun Records to the Stray Cats: a small kit, swung 8ths, the snare shuffling under a slapped 2 and 4, the kick on 1, 3 and the "and" of 3. The left foot keeps 2 and 4 on the hats. Fills are runs of 8ths on the snare, and a crash pushed ahead of the bar.',
    kit: 'smdrums',
    hats: 8,
    bpm: [150, 200],
    swing: 70,
    swingRange: [60, 90],
    swingUnit: 8,
    ghostBias: 0.2,
    opens: 0,
    backbeats: [4, 12],
    foot: [4, 12],
    targetDensity: 11,
    forceKick: [0],
    kick1: [['1000', 8]],
    kick: [
      ['1000', 2.4],
      ['1010', 1.2],
      ['0000', 0.8],
    ],
    figures: [
      // the snare shuffling in swung 8ths, 2 and 4 slapped
      [{ s: '1.1.3.1.1.1.3.1.', k: '1.......1.......', hf: '....1.......1...' }, 2.5],
      // the snare shuffle, kick on 1, 3 and the "and" of 3
      [{ s: '1.1.3.1.1.1.3.1.', k: '1.......1.1.....', hf: '....1.......1...' }, 1.8],
      // swung hats, kick on 1, 3 and the "and" of 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 2],
      // the ride swung, the kick on 1 and 3
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 1.2],
      // quarters on the ride over the snare shuffle
      [{ r: '1...1...1...1...', s: '1.1.3.1.1.1.3.1.', k: '1.......1.......' }, 1.0],
    ],
    fills: [
      // a run of 8ths on the snare: the machine gun
      [{ s: '2.2.2.3.' }, 2],
      // the snare, then a crash pushed onto the "and" of 4
      [{ s: '2.2.3...', c: '......1.', k: '......1.' }, 1.2],
      // a stop on 4, the slap bass answers
      [{ s: '3...', k: '1...' }, 0.8],
      // a whole bar of snare, building to the turn
      [{ s: '2.1.3.1.3.2.3.3.', k: '1.......1.......' }, 0.6],
    ],
  },

  /* ---- metal ----------------------------------------------------------
     Metal is a handful of known beats more than a set of tendencies — a
     gallop, a skank beat, a half-time with the kick running under it — so
     these styles write theirs out as figures (`k` kick · `s` snare 2 hit,
     3 accent · `h` hat 1 closed, 3 open, 4 half-open · `r` ride 1, 2 bell ·
     `c` 1 crash, 3 china · toms 2 accent, 3 flam; `.` is a rest) and the
     generator picks among them, a second for half the phrase, and varies each
     pass the way a riff changes: the kick picks up a push, a china lands on
     an "and". Fills are written out too, right-aligned to the bar's end.

     Who plays what, from the records: with the kick on a double pedal the
     left foot has left the hats, so the hands ride a crash, a china, the ride
     or its bell, or hats left half-open — the wash under most of Motörhead and
     thrash. Closed 8ths on the hats are the single-pedal verse. Nicko
     McBrain plays Maiden's gallop on one pedal; it is written here for two,
     which is how most drummers play it at speed.
     ------------------------------------------------------------------- */
  metal: {
    label: 'Heavy metal',
    mix: { h: 0.85 },
    hint: 'Priest, Maiden, Saxon, early Metallica: half-open 8ths or a crash on every beat, snare cracking on 2 and 4, a kick that locks to the riff — chugs, a pushed "and", a pair of 16ths. One pedal, the left foot on the hats.',
    toms: true,
    kit: 'crocell',
    hats: 8,
    bpm: [112, 168],
    swing: 0,
    ghostBias: 0.06,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.4,
    forceKick: [0],
    kick1: [
      ['1010', 3],
      ['1000', 2.4],
      ['1100', 1.6],
    ],
    kick: [
      ['1010', 2.2],
      ['0011', 1.4],
      ['1100', 1.2],
      ['0010', 1.2],
      ['1000', 1.1],
    ],
    figures: [
      // the NWOBHM drive: half-open 8ths, the kick on the riff
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.1...1.1.1...1.' }, 3],
      // a crash on every beat over 8ths on the kick: Breaking the Law
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1.1.1.1.1.1.1.1.' }, 2],
      // the bell over a chugging kick: Seek & Destroy, Enter Sandman
      [{ r: '2.1.2.1.2.1.2.1.', s: '....3.......3...', k: '1.....11..1...1.' }, 2.5],
      // pairs of 16ths on the kick, doubling the riff
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '11....1.11..1...' }, 2],
      // closed 8ths for the verse, the kick pushing the "and" of 3
      [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3...', k: '1.....1...1..1..' }, 1.5],
      // half-time: the snare on 3, ride 8ths over it
      [{ r: '1.1.1.1.1.1.1.1.', s: '........3.......', k: '1..1..1...1..1..' }, 1.4],
      // stabs with the band: crash and kick on the hits, air between
      [{ c: '1.....1.....1...', s: '....3.......3...', k: '1.....1.....1...' }, 0.8],
    ],
    fills: [
      // 16ths down the toms over the last two beats
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 3],
      // hands, hands, feet, feet: R L K K
      [{ s: '22......', t2: '....2...', t3: '.....2..', k: '..11..11' }, 2],
      // a stop: crash, kick and snare together, and nothing
      [{ c: '1..1..1.', s: '3..3..3.', k: '1..1..1.' }, 1.4],
      // snare, snare, floor tom, snare into the one
      [{ s: '22.3', t3: '..2.', k: '1...' }, 1.5],
    ],
  },
  gallop: {
    label: 'Gallop',
    mix: { h: 0.85 },
    hint: 'An 8th and two 16ths on the kick, beat after beat — Run to the Hills, The Trooper. A crash or the ride on every beat, snare on 2 and 4, and the gallop turned round (two 16ths and an 8th) or dropped under the snare for a bar. On a double pedal the two 16ths are right foot, left foot.',
    toms: true,
    kit: 'crocell',
    doubleKick: true,
    hats: 8,
    bpm: [140, 190],
    swing: 0,
    ghostBias: 0.04,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 14,
    hatDepth: 0.4,
    forceKick: [0],
    kick1: [
      ['1011', 6],
      ['1000', 0.6],
    ],
    kick: [
      ['1011', 5],
      ['0011', 0.8],
      ['1010', 0.6],
    ],
    figures: [
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1.111.111.111.11' }, 4],
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.111.111.111.11' }, 3],
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '11.111.111.111.1' }, 2],
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1.11..111.11..11' }, 2],
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.111.111.111.11' }, 2],
      [{ r: '2...2...2...2...', s: '....3.......3...', k: '1.111.111.111.11' }, 1.5],
    ],
    fills: [
      [{ t1: '2.22....', t2: '....2.22', k: '1...1...' }, 3],
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      [{ s: '22.3', t3: '..2.', k: '1111' }, 1.5],
      [{ c: '1..1..1.', s: '3..3..3.', k: '1..1..1.' }, 1],
    ],
  },
  thrash: {
    label: 'Thrash',
    mix: { h: 0.85 },
    hint: 'Slayer, early Metallica, Anthrax, Exodus. The skank beat — kick on the beat, snare on every "and" — under a crash, the ride or half-open hats; the 2-and-4 thrash drive with 8ths on the kick; Motörhead\'s 16ths under a wash of hat; a d-beat; a half-time breakdown on the china. On a double pedal.',
    toms: true,
    kit: 'crocell',
    doubleKick: true,
    hats: 8,
    bpm: [160, 230],
    swing: 0,
    ghostBias: 0,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 10,
    hatDepth: 0.3,
    forceKick: [0],
    kick1: [
      ['1010', 4],
      ['1111', 1.2],
    ],
    kick: [
      ['1010', 4],
      ['1000', 1.5],
      ['1111', 1],
    ],
    figures: [
      [{ c: '1...1...1...1...', s: '..3...3...3...3.', k: '1...1...1...1...' }, 3],
      [{ r: '1.1.1.1.1.1.1.1.', s: '..3...3...3...3.', k: '1...1...1...1...' }, 2],
      [{ h: '4.4.4.4.4.4.4.4.', s: '..3...3...3...3.', k: '1...1...1...1...' }, 1.5],
      [{ c: '1...1...1...1...', s: '..3...3...3...3.', k: '1.1.1.1.1.1.1.1.' }, 1.5],
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.1.1.1.1.1.1.1.' }, 2],
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1111111111111111' }, 1.2],
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1..1.1..1..1.1..' }, 1.4],
      [{ c: '1.1.1.1.1.1.1.1.', s: '.2.2.2.2.2.2.2.2', k: '1.1.1.1.1.1.1.1.' }, 0.6],
      [{ c: '3...3...3...3...', s: '........3.......', k: '1..1..1...1.1...' }, 1],
    ],
    fills: [
      [{ s: '22.3', t3: '..2.', k: '1111' }, 2.5],
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      [{ s: '22......', t2: '....2...', t3: '.....2..', k: '..11..11' }, 2],
      [{ c: '1..1..1.', s: '3..3..3.', k: '1..1..1.' }, 1.5],
    ],
  },
  doublekick: {
    label: 'Double kick',
    mix: { h: 0.8 },
    hint: 'A wall of 16ths on the kick, right foot and left, under a crash on every beat (Painkiller), the ride, the bell, a china, or hats left half-open; the snare on 2 and 4 or half-time on 3. The runs break up too: bursts of four, the machine-gun stops of One, a bomb blast. Start it slow: even feet matter more than speed.',
    toms: true,
    kit: 'crocell',
    doubleKick: true,
    hats: 8,
    bpm: [100, 180],
    swing: 0,
    ghostBias: 0,
    opens: 0,
    backbeats: [4, 12],
    targetDensity: 18,
    hatDepth: 0.35,
    forceKick: [0],
    kick1: [
      ['1111', 6],
      ['1110', 1],
    ],
    kick: [
      ['1111', 5],
      ['1110', 1],
      ['1011', 0.8],
    ],
    figures: [
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1111111111111111' }, 3],
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1111111111111111' }, 2.5],
      [{ c: '3...3...3...3...', s: '........3.......', k: '1111111111111111' }, 2.5],
      [{ r: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '1111111111111111' }, 1.5],
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1111111111111111' }, 1.5],
      [{ c: '1.......1.......', s: '....3.......3...', k: '1111..111111..11' }, 2],
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1111....1111....' }, 1.5],
      [{ c: '1.1.1.1.1.1.1.1.', s: '.2.2.2.2.2.2.2.2', k: '1111111111111111' }, 0.6],
    ],
    fills: [
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 3],
      [
        {
          s: '22..........',
          t1: '..22........',
          t2: '......22....',
          t3: '........22..',
          k: '....11....11',
        },
        2,
      ],
      [{ s: '22.3', t3: '..2.' }, 1.5],
      [{ c: '1..1..1.', s: '3..3..3.', k: '1..1..1.' }, 1],
    ],
  },
  groove: {
    label: 'Groove metal',
    mix: { h: 0.85 },
    hint: 'Pantera, Sepultura, Lamb of God, Gojira: mid-tempo, and the kick doubles the riff — pairs and runs of 16ths with holes where the guitar stops — under the ride bell or a china, half-time as often as not. A floor-tom groove for the tribal verse. On a double pedal.',
    toms: true,
    kit: 'crocell',
    doubleKick: true,
    hats: 8,
    bpm: [92, 140],
    swing: 0,
    ghostBias: 0.06,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 13,
    hatDepth: 0.4,
    forceKick: [0],
    kick1: [
      ['1100', 3],
      ['1011', 2],
      ['1001', 1],
    ],
    kick: [
      ['1100', 2],
      ['0111', 1.5],
      ['1011', 1.5],
      ['0010', 1],
      ['1000', 1],
    ],
    figures: [
      [{ r: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '11..11.111..1.11' }, 3],
      [{ r: '2...2...2...2...', s: '....3.......3...', k: '1.11..1.1.11.1..' }, 2.5],
      [
        {
          c: '3.3.3.3.3.3.3.3.',
          s: '........3.......',
          t3: '...............2',
          k: '1..1..1.11..1...',
        },
        2,
      ],
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.11.....1.1....' }, 1.5],
      [{ r: '1...1...1...1...', s: '........3.......', k: '1..1..1..1..1..1' }, 1.5],
      [{ s: '....3.......3...', t3: '2.1.2.1.2.1.2.1.', k: '1..1..1...1..1..' }, 1],
    ],
    fills: [
      [{ s: '22......', t2: '....2...', t3: '.....2..', k: '..11..11' }, 2.5],
      [{ s: '2..2..2.', t2: '.2..2..2', k: '..1..1..' }, 2],
      [{ c: '3..3..1.', s: '3..3..3.', k: '1..1..1.' }, 2],
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.5],
    ],
  },
  doom: {
    label: 'Doom',
    mix: { h: 0.9 },
    hint: 'Black Sabbath and everything after: slow, half-time as often as not, the hats left half-open into a wash or a crash ridden on every beat. Bill Ward came from big band — he answers the riff with the toms and big flams rather than keeping strict time. One pedal; a thick, old kit.',
    toms: true,
    kit: 'bigrusty',
    hats: 8,
    bpm: [56, 96],
    swing: 0,
    ghostBias: 0.15,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 5,
    hatDepth: 0.5,
    forceKick: [0],
    kick1: [
      ['1000', 5],
      ['1001', 1.4],
    ],
    kick: [
      ['0000', 1.6],
      ['1000', 1.8],
      ['0010', 1.2],
      ['0001', 0.9],
    ],
    figures: [
      [{ c: '1...1...1...1...', s: '........3.......', k: '1.....1...1.....' }, 3],
      [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.....1.1.......' }, 2.5],
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1..1....1.1.....' }, 2],
      [{ c: '1...1...1.....1.', s: '....3.......3...', k: '1...1...1.....1.' }, 1.5],
      [{ h: '3...3...3...3...', s: '........3.......', k: '1.......1.1.....' }, 1.5],
    ],
    fills: [
      [{ t1: '3.......', t2: '....3...', t3: '..2...22', k: '1...1...' }, 3],
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      [{ s: '2..2..2.', t1: '.2..2...', t3: '..2..2.2' }, 1.5],
      [{ c: '1...1...', s: '3...3...', k: '1...1...' }, 1],
    ],
  },
  /* ---- blues and blues rock --------------------------------------------
     Shuffles three ways — a Texas shuffle leaning on the skip note, a boogie,
     a half-time shuffle with one backbeat on 3 — the slow 12/8 blues, and the
     straight-8 blues rock of Cream and Free. Written out as figures, like rock.
     ------------------------------------------------------------------- */
  slowblues: {
    label: 'Slow blues (12/8)',
    hint: 'The slow 12/8 blues: every triplet on the hats or the ride, a heavy 2 and 4, the kick on 1 and on the last triplet before 3, ghosts on the triplets between. Fills are triplets down the kit, or a stop for the guitar. 12/8, so the triplets are the meter and Swing stays at zero; the tempo counts quarter notes, so the beat you feel is two thirds of it.',
    toms: true,
    kit: 'studio70',
    meter: '12/8',
    hats: 8,
    bpm: [68, 105],
    swing: 0,
    ghostBias: 0.3,
    opens: 0,
    backbeats: [6, 18],
    targetDensity: 6,
    hatDepth: 0.85,
    rimshot: 0.3,
    forceKick: [0],
    hat: { steps: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22], accents: [0, 6, 12, 18] },
    ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
    kick1: [['1000', 8]],
    kick: [
      ['0000', 2.4],
      ['1000', 1.6],
      ['0001', 1.0],
    ],
    figures: [
      // triplets on the hats, the kick on 1 and leading into 3
      [
        {
          h: '1.1.1.1.1.1.1.1.1.1.1.1.',
          s: '......3...........3.....',
          k: '1.........1.1...........',
        },
        2,
      ],
      // the ride, the kick picking up the last triplets
      [
        {
          r: '1.1.1.1.1.1.1.1.1.1.1.1.',
          s: '......3...........3.....',
          k: '1...1.....1.1.....1...1.',
        },
        1.5,
      ],
      // ghosts on the triplets between
      [
        {
          h: '1.1.1.1.1.1.1.1.1.1.1.1.',
          s: '..1...3.1.....1...3...1.',
          k: '1...........1...........',
        },
        1.2,
      ],
      // the hat opening on the last triplet, into the one
      [
        {
          h: '1.1.1.1.1.1.1.1.1.1.1.3.',
          s: '......3...........3.....',
          k: '1.........1.1...........',
        },
        1.0,
      ],
      // every beat leaned on
      [
        {
          h: '2.1.1.2.1.1.2.1.1.2.1.1.',
          s: '......3...........3.....',
          k: '1...........1.....1.....',
        },
        1.0,
      ],
    ],
    fills: [
      // a triplet on the snare on 4
      [{ s: '2.2.3.' }, 1.5],
      // a whole bar of triplets down the kit
      [
        {
          s: '2.2.2.2.2.2.............',
          t1: '............2.2.2.......',
          t3: '..................2.2.2.',
        },
        0.8,
      ],
      // triplets from the snare to the floor tom over 3 and 4
      [{ s: '2.2.2.......', t1: '......2.2...', t3: '..........2.' }, 1.5],
      // a stop on 4 for the guitar
      [{ c: '1.....', s: '3.....', k: '1.....' }, 0.6],
    ],
  },
  texasshuffle: {
    label: 'Texas shuffle',
    hint: 'Chris Layton behind Stevie Ray Vaughan: a hard shuffle on the ride, the kick on every beat, a fat 2 and 4, and the "rub": ghosts on the skip note of the shuffle. Or both hands shuffling — the double shuffle. Swung 8ths, pushed past a triplet; the swing changes a little each time you press New.',
    toms: true,
    kit: 'smdrums',
    hats: 8,
    bpm: [108, 132],
    swing: 92,
    swingRange: [84, 100],
    swingUnit: 8,
    ghostBias: 0.3,
    opens: 0,
    backbeats: [4, 12],
    foot: [4, 12],
    targetDensity: 9,
    rimshot: 0.4,
    forceKick: [0],
    kick1: [['1000', 8]],
    kick: [
      ['1000', 3],
      ['0000', 1],
    ],
    figures: [
      // the ride shuffling, the kick on every beat
      [
        {
          r: '1.1.1.1.1.1.1.1.',
          s: '....3.......3...',
          k: '1...1...1...1...',
          hf: '....1.......1...',
        },
        2,
      ],
      // the rub: ghosts on the skip notes
      [
        {
          r: '1.1.1.1.1.1.1.1.',
          s: '..1.3.1...1.3.1.',
          k: '1...1...1...1...',
          hf: '....1.......1...',
        },
        1.5,
      ],
      // the double shuffle: both hands
      [{ h: '1.1.1.1.1.1.1.1.', s: '1.1.3.1.1.1.3.1.', k: '1...1...1...1...' }, 1.5],
      // the bell on the skip notes
      [
        {
          r: '1.2.1.2.1.2.1.2.',
          s: '....3.......3...',
          k: '1...1...1...1...',
          hf: '....1.......1...',
        },
        1.0,
      ],
      // hats, the kick on 1 and 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 1.0],
    ],
    fills: [
      // a shuffle on the snare into the crash
      [{ s: '2.2.2.3.' }, 2],
      // hits with the band on 3 and 4
      [{ c: '1...1...', s: '3...3...', k: '1...1...' }, 1.0],
      // snare, floor tom, snare, snare
      [{ s: '2.23', t3: '.2..' }, 1.2],
    ],
  },
  bluesrock: {
    label: 'Blues rock',
    hint: 'Cream, Free, early Zeppelin: straight 8ths, a heavy 2 and 4, the kick pushing the "and" of 2. The ride for the chorus, a crash wash, and Ginger Baker\'s tom beat in place of a backbeat.',
    toms: true,
    kit: 'bigrusty',
    hats: 8,
    bpm: [96, 140],
    swing: 0,
    swingRange: [0, 10],
    ghostBias: 0.2,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    rimshot: 0.5,
    forceKick: [0],
    kick1: [
      ['1000', 6],
      ['1010', 1.2],
    ],
    kick: [
      ['0010', 1.8],
      ['1000', 1.6],
      ['0000', 1],
    ],
    figures: [
      // 8ths on the hats, the kick on 1, the "and" of 2 and 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 2],
      // the ride, the kick pushing the "and" of 4
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.....1.' }, 1.5],
      // Ginger Baker's tom beat in place of a backbeat
      [{ t1: '....2.......2...', t3: '2.......2.......', k: '1.......1.......' }, 0.8],
      // a crash on every beat for the chorus
      [{ c: '1...1...1...1...', s: '....3.......3...', k: '1.1.....1.1.....' }, 1.0],
      // the hats opening on the "and" of 4
      [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3...', k: '1.......1.1.....' }, 1.2],
    ],
    fills: [
      // round the toms in 16ths over 3 and 4
      [{ s: '22......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      // three on the snare, one on the floor tom
      [{ s: '222.', t3: '...2' }, 1.5],
      // snare and floor tom together in 8ths
      [{ s: '3.3.3.3.', t3: '2.2.2.2.' }, 1.2],
    ],
  },
  boogie: {
    label: 'Boogie shuffle',
    hint: 'La Grange and the John Lee Hooker groove under it: a swung boogie with the kick on every beat, 2 and 4 on the snare, sometimes just the hats and a rim click, and the hats opening over the backbeat when it drives. Swung 8ths; the swing changes a little each press.',
    toms: true,
    kit: 'smdrums',
    hats: 8,
    bpm: [148, 172],
    swing: 80,
    swingRange: [68, 92],
    swingUnit: 8,
    ghostBias: 0.25,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    forceKick: [0],
    kick1: [['1000', 8]],
    kick: [
      ['1000', 3],
      ['1010', 1],
    ],
    figures: [
      // the hats and a rim click, the kick on 1 and 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.......1.......' }, 1.0],
      // the full shuffle: kick on every beat
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1...1...1...1...' }, 2],
      // driving: the hats open over 2 and 4
      [{ h: '1.1.3.1.1.1.3.1.', s: '....3.......3...', k: '1.1.1...1.1.1...' }, 1.5],
      // the ride, kick on every beat
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1...1...1...1...' }, 1.0],
    ],
    fills: [
      // a shuffle on the snare
      [{ s: '2.2.2.3.' }, 2],
      // the snare on 4, a crash pushed onto its "and"
      [{ c: '..1.', s: '3...', k: '..1.' }, 1.0],
      // snare and floor tom, turn about
      [{ s: '2...2...', t3: '..2...2.' }, 1.0],
    ],
  },
  halftimeshuffle: {
    label: 'Half-time shuffle',
    hint: "The groove under Fool in the Rain and Rosanna, and Purdie's before them: triplets with the middle one left out on the hats, ghosts in the gaps, and one backbeat, on 3. Bonham plays it with no ghosts at all. 12/8, so the triplets are the meter and Swing stays at zero.",
    toms: true,
    kit: 'drs',
    meter: '12/8',
    hats: 8,
    bpm: [112, 142],
    swing: 0,
    ghostBias: 0.9,
    opens: 0,
    backbeats: [12],
    targetDensity: 9,
    hatDepth: 0.95,
    hat: { steps: [0, 4, 6, 10, 12, 16, 18, 22], accents: [0, 6, 12, 18] },
    snareGhosts: [2, 8, 14, 20],
    ghostWeights: { 4: 0.3, 10: 0.3, 16: 0.3, 22: 0.3 },
    forceKick: [0],
    kick1: [['1000', 9]],
    kick: [
      ['0000', 3],
      ['1000', 1],
      ['0010', 0.9],
    ],
    figures: [
      // Purdie: ghosts in the gaps, the kick on 1 and the last triplet of 2
      [
        {
          h: '1...1.1...1.1...1.1...1.',
          s: '..1.....1...3.1.....1...',
          k: '1.........1.............',
        },
        2,
      ],
      // Porcaro: the kick on the last triplets of 1 and of 4
      [
        {
          h: '1...1.1...1.1...1.1...1.',
          s: '..1.....1...3.1.....1...',
          k: '1...1.......1.........1.',
        },
        1.5,
      ],
      // Bonham: no ghosts, the kick doubled
      [
        {
          h: '1...1.1...1.1...1.1...1.',
          s: '............3...........',
          k: '1...1.........1.........',
        },
        1.5,
      ],
      // the ride instead of the hats
      [
        {
          r: '1...1.1...1.1...1.1...1.',
          s: '..1.....1...3.1.....1...',
          k: '1.........1.............',
        },
        1.0,
      ],
    ],
    fills: [
      // triplets from the snare to the floor tom over 3 and 4
      [{ s: '2.2.2.......', t1: '......2.2...', t3: '..........2.' }, 1.5],
      // a triplet on the snare on 4
      [{ s: '1.1.3.' }, 1.2],
      // the rack tom and the floor on 4
      [{ t1: '2.2...', t3: '....2.' }, 1.0],
    ],
  },
  /* ---- country ------------------------------------------------------ */
  country: {
    label: 'Country',
    hint: 'Boom-chick: kick on 1 and 3, snare on 2 and 4, straight 8ths above. Play the snare with brushes and it is a ballad; play the 16ths and it is a train beat, which this grid will not write for you.',
    toms: true,
    hats: 8,
    bpm: [96, 132],
    swing: 0,
    swingRange: [0, 10],
    ghostBias: 0.35,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.85,
    forceKick: [0],
    kick1: [
      ['1000', 8],
      ['1010', 0.8],
    ],
    kick: [
      ['0000', 2.0],
      ['1000', 2.4],
      ['0010', 0.7],
      ['0001', 0.5],
    ],
  },

  /* ---- Afro-Latin ---------------------------------------------------
     Every clave below is written across one bar of sixteenths — the two bars
     of a chart, compressed. That is why the tempos look half what you would
     expect: one bar here is one full cycle of the clave. Play the accented
     snare line is written as a cross-stick and played as one; the hat line is cascara,
     which you play on the shell.
     `clave:true` tells the generator the snare figure is the groove itself,
     so a closing fill is not allowed to write over it.
     ------------------------------------------------------------------- */
  son: {
    label: 'Son / Cuban',
    mix: { p2: 0.75 }, // cascara under the clave, not over it
    crossStick: true,
    hint: '3-2 son clave on the cross-stick, cascara above it, bombo on the "and" of 2 and the ponche on 4. The clave is fixed — everything else is written around it.',
    perc: [
      { inst: 'clave', follow: 'backbeats' },
      { inst: 'cascara', steps: [0, 2, 3, 6, 8, 10, 11, 14] },
    ],
    hats: 8,
    bpm: [92, 112],
    swing: 0,
    ghostBias: 0.3,
    opens: 1,
    backbeats: [0, 3, 6, 10, 12],
    clave: true,
    targetDensity: 11,
    hatDepth: 0.9,
    forceKick: [3, 12],
    kick1: [
      ['0000', 6],
      ['0001', 2.0],
      ['0010', 1.0],
    ],
    kick: [
      ['0000', 3.0],
      ['0010', 1.0],
      ['0001', 0.8],
      ['1000', 0.6],
    ],
  },
  rumba: {
    label: 'Rumba',
    crossStick: true,
    hint: 'Guaguancó — the clave with its middle stroke pushed late, which pulls the whole bar onto the offbeats. The true rumba stroke falls between two sixteenths, so this grid rounds it; the displacement is the point, the exact column is not.',
    perc: [
      { inst: 'clave', follow: 'backbeats' },
      { inst: 'conga', every: 2, accents: [3, 7, 11, 15] },
    ],
    hats: 8,
    bpm: [92, 116],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.5,
    opens: 1,
    backbeats: [0, 4, 6, 10, 12],
    clave: true,
    targetDensity: 11,
    hatDepth: 0.95,
    forceKick: [12],
    kick1: [
      ['0000', 6],
      ['0010', 1.4],
      ['0001', 1.0],
    ],
    kick: [
      ['0000', 3.4],
      ['0010', 1.1],
      ['0001', 0.9],
      ['0110', 0.4],
    ],
  },
  mambo: {
    label: 'Mambo',
    mix: { h: 0.75 }, // the bell and the clave are the front line
    crossStick: true,
    hint: '2-3 clave, bell-driven and busy, with the weight landing across the bar line rather than on beat 1. Louder and squarer than son.',
    perc: [
      { inst: 'clave', follow: 'backbeats' },
      { inst: 'cowbell', every: 2, accentPulse: true },
    ],
    hats: 16,
    bpm: [96, 116],
    swing: 0,
    ghostBias: 0.5,
    opens: 2,
    backbeats: [2, 4, 8, 11, 14],
    clave: true,
    targetDensity: 12,
    hatDepth: 0.9,
    openSlots: [2, 6, 10, 14],
    forceKick: [0, 12],
    kick1: [
      ['1000', 6],
      ['1001', 1.2],
    ],
    kick: [
      ['0000', 2.2],
      ['0010', 1.2],
      ['1000', 1.0],
      ['0001', 0.9],
    ],
  },
  songo: {
    label: 'Songo',
    mix: { h: 0.7 }, // the displaced backbeat and the congas carry it
    hint: 'Los Van Van — the backbeat is displaced onto the "and" of 2, the kick argues with it, and the 16ths never stop. Cuban roots, kit-shaped.',
    perc: [
      { inst: 'cowbell', every: 2, accentPulse: true },
      { inst: 'conga', steps: [3, 7, 10, 11, 14, 15], accents: [10, 14] },
    ],
    hats: 16,
    bpm: [96, 116],
    swing: 6,
    swingRange: [2, 10],
    ghostBias: 1.1,
    opens: 2,
    backbeats: [6, 12],
    targetDensity: 13,
    hatDepth: 1.0,
    openSlots: [2, 6, 10, 14],
    kick1: [
      ['1000', 4],
      ['1001', 1.8],
      ['0010', 1.4],
      ['0000', 1.2],
    ],
    kick: [
      ['0010', 2.0],
      ['0001', 1.6],
      ['0000', 1.4],
      ['1000', 1.0],
      ['0011', 0.8],
      ['0110', 0.6],
    ],
  },
  samba: {
    label: 'Samba',
    mix: { h: 0.65, p1: 0.55 }, // continuous 16ths on both the hat and the shaker
    hint: 'Surdo on 1 and the "a" of 1, again in the second half of the bar — that lurching kick is the whole groove. Continuous 16ths above it, shaker or hat, no let-up.',
    perc: [
      { inst: 'shaker', every: 1 },
      { inst: 'agogo', steps: [0, 3, 6, 8, 11, 14], accents: [0, 8] },
    ],
    hats: 16,
    bpm: [96, 116],
    swing: 0,
    swingRange: [0, 8],
    ghostBias: 0.7,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 13,
    hatDepth: 1.05,
    forceKick: [0, 3, 8, 11],
    kick1: [
      ['1001', 7],
      ['1000', 1.0],
    ],
    kick: [
      ['0000', 3.0],
      ['1001', 1.4],
      ['0001', 0.8],
    ],
  },
  bossa: {
    label: 'Bossa nova',
    mix: { h: 0.58, p2: 0.65 }, // understated is the whole style
    crossStick: true,
    hint: 'Everything quiet. Bossa clave on the cross-stick, the same surdo kick as samba underneath, steady 16ths on brushes or a shaker. Nothing accents; that is the style.',
    perc: [
      { inst: 'clave', follow: 'backbeats' },
      { inst: 'shaker', every: 2 },
    ],
    hats: 16,
    bpm: [124, 146],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.15,
    opens: 0,
    backbeats: [0, 3, 7, 10, 12],
    clave: true,
    targetDensity: 9,
    hatDepth: 0.55,
    forceKick: [0, 3, 8, 11],
    kick1: [['1001', 8]],
    kick: [
      ['0000', 4.0],
      ['1001', 1.2],
    ],
  },
  afrocuban: {
    label: 'Afro-Cuban 6/8',
    mix: { r: 0.85, p2: 0.68 }, // bell, clave and shaker all at once
    crossStick: true,
    hint: 'Written in 12/8 — one bar is a full cycle, and picking this style moves the time signature for you. The bell is the standard 6/8 pattern, the cross-stick and the claves play the 6/8 clave, and the foot marks the second and fourth pulse. Triplets are written into the meter, so leave Swing at zero.',
    kit: 'virtuosity',
    meter: '12/8',
    hats: 8,
    bpm: [92, 126],
    swing: 0,
    ghostBias: 0.4,
    opens: 0,
    backbeats: [0, 6, 12, 16, 20],
    clave: true,
    targetDensity: 8,
    hatDepth: 0.9,
    ride: { steps: [0, 4, 6, 10, 14, 16, 20], bell: [0] },
    foot: [6, 18],
    perc: [
      { inst: 'clave', follow: 'backbeats' },
      { inst: 'shaker', every: 2, accentPulse: true },
    ],
    kick1: [
      ['0000', 6],
      ['0010', 1.2],
    ],
    kick: [
      ['0000', 3.4],
      ['0010', 1.0],
      ['0001', 0.7],
    ],
  },
  reggaeton: {
    label: 'Reggaeton',
    hint: 'Dem bow: kick on 1 and 3, snare on the "a" of 1, the "and" of 2 and the same again in the second half. Two bars that repeat forever, machine-tight, no ghosts.',
    perc: [{ inst: 'clap', follow: 'snare' }],
    hats: 8,
    bpm: [88, 100],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.1,
    opens: 1,
    backbeats: [3, 6, 11, 14],
    clave: true,
    targetDensity: 11,
    hatDepth: 0.7,
    forceKick: [0, 8],
    kick1: [['1000', 9]],
    kick: [
      ['0000', 3.0],
      ['1000', 2.0],
      ['0010', 0.5],
    ],
  },

  /* ---- jazz -----------------------------------------------------------
     Three things here are unlike everything above. The cymbal pattern is written
     out rather than derived, because a swing ride is not eighths with an accent on
     it. There is no snare backbeat at all — the 2 and the 4 are the hi-hat foot,
     which is what `backbeatLane` says — and the snare is left free to comp. And the
     kick plays all four quarters at about a third of the volume, which is written
     as ordinary quarter notes and marked `kickFeather`, because feathering is a
     dynamic rather than a rhythm.
     --------------------------------------------------------------------- */

  neworleans: {
    label: 'New Orleans two-beat',
    hint: 'Baby Dodds and the parade bands: the kick on 1 and 3, the snare steady on the beat with press rolls buzzing on 2 and 4, rim clicks and a choked cymbal for colour. Swung 8ths; the swing changes a little each time you press New.',
    toms: true,
    kit: 'virtuosity',
    hats: 8,
    bpm: [140, 190],
    swing: 70,
    swingRange: [55, 85],
    swingUnit: 8,
    ghostBias: 0.35,
    opens: 0,
    backbeats: [4, 12],
    foot: [4, 12],
    targetDensity: 9,
    flam: 0.15,
    forceKick: [0],
    kick1: [['1000', 8]],
    kick: [
      ['1000', 3],
      ['0000', 1.2],
    ],
    figures: [
      // two-beat: kick on 1 and 3, press rolls on 2 and 4
      [{ s: '2...8...2...8...', k: '1.......1.......', hf: '....1.......1...' }, 2.5],
      // four-beat: the kick on every beat
      [{ s: '2...8...2...8...', k: '1...1...1...1...', hf: '....1.......1...' }, 1.5],
      // rim clicks in swung 8ths, the backbeat on the head
      [{ s: '4.4.3.4.4.4.3.4.', k: '1.......1.......', hf: '....1.......1...' }, 1.2],
      // a choked cymbal over the backbeat
      [{ c: '....1.......1...', s: '2.2.3...2.2.3...', k: '1.......1.......' }, 1.0],
      // swung 8ths on the snare, rolls on 2 and 4
      [{ s: '1.1.8.1.1.1.8.1.', k: '1.......1.......', hf: '....1.......1...' }, 1.0],
    ],
    fills: [
      // flam, tap, flam, tap over 3 and 4
      [{ s: '6.2.6.2.' }, 1.5],
      // swung 8ths into a press roll
      [{ s: '2.2.8.8.' }, 1.5],
      // dotted 8ths on the snare across 3 and 4
      [{ s: '3..3..3.' }, 1.0],
      // a roll on 4 and a kick on its "and"
      [{ s: '8...', k: '..1.' }, 1.0],
    ],
  },
  swingera: {
    label: 'Swing era (big band)',
    hint: 'Jo Jones and Gene Krupa: time on the hi-hats, half open and closing on 2 and 4 — the "tsss-chick" — over a kick feathering all four beats. Or the ride, the Basie shuffle, Krupa on the floor tom. Fills are big-band setups: the snare, then the kick and a crash with the horns.',
    toms: true,
    kit: 'virtuosity',
    hats: 8,
    bpm: [130, 190],
    swing: 85,
    swingRange: [70, 98],
    swingUnit: 8,
    ghostBias: 0.6,
    ghostHit: 0.3,
    opens: 0,
    backbeats: [4, 12],
    backbeatLane: 'hf',
    targetDensity: 5,
    hatDepth: 0.85,
    kickFeather: 0.34,
    forceKick: [0, 4, 8, 12],
    ghostWeights: { 6: 0.3, 14: 0.3, 2: 0.18, 10: 0.18 },
    kick1: [['1000', 9]],
    kick: [['1000', 9]],
    figures: [
      // Jo Jones: the hats half open on 1 and 3, closed on the rest
      [{ h: '4...1.1.4...1.1.', k: '1...1...1...1...', hf: '....1.......1...' }, 2.5],
      // the ride: 1, 2 and its "and", 3, 4 and its "and"
      [{ r: '1...1.1.1...1.1.', k: '1...1...1...1...', hf: '....1.......1...' }, 2],
      // the Basie shuffle: 8ths on the hats, 2 and 4 on the snare
      [
        {
          h: '1.1.1.1.1.1.1.1.',
          s: '....2.......2...',
          k: '1...1...1...1...',
          hf: '....1.......1...',
        },
        1.4,
      ],
      // Krupa on the floor tom
      [{ t3: '2...1.1.2...1.1.', k: '1...1...1...1...', hf: '....1.......1...' }, 1.0],
      // an ensemble hit on the "and" of 2
      [
        {
          c: '......1.........',
          h: '4...1...4...1.1.',
          k: '1...1.2.1...1...',
          hf: '....1.......1...',
        },
        0.8,
      ],
    ],
    fills: [
      // a big-band setup: snare on 4, kick and crash on its "and"
      [{ c: '..1.', s: '2...', k: '..2.' }, 2],
      // Krupa: 8ths round the toms over 3 and 4
      [{ t1: '2.2.....', t2: '....1...', t3: '......2.' }, 1.5],
      // dotted 8ths on the snare, the band hitting with them
      [{ s: '3..3..3.', k: '1..1..1.' }, 1.0],
      // a press roll on 4 into the next chorus
      [{ s: '2...2.8.' }, 1.0],
    ],
  },
  swing: {
    label: 'Jazz — medium swing',
    /* Written in 12/8 rather than 4/4-with-swing, for the same reason as the Purdie
       shuffle: a swing ride is a triplet figure, and on a sixteenth grid two of the
       three partials exist and the middle one does not. That middle partial is where
       half of jazz comping lives. In 12/8 every partial is a real position, the
       Swing slider goes to zero because the triplets are the meter, and the ride
       lands exactly where a drummer puts it instead of two thirds of the way there. */
    hint: 'The ride is the whole thing: 1, 2, the last triplet of 2, 3, 4, the last triplet of 4. Hi-hat foot on 2 and 4, the kick feathering all four, and the left hand comping: the Charleston, the reverse Charleston, a bomb on the last triplet of 4, a two-feel with a cross-stick for the head. Written in 12/8, so the triplets are the meter and Swing stays at zero.',
    toms: true,
    kit: 'virtuosity',
    meter: '12/8',
    hats: 8,
    bpm: [180, 270],
    swing: 0,
    ghostBias: 1.4,
    opens: 0,
    fill: 'comp',
    backbeats: [6, 18],
    backbeatLane: 'hf',
    targetDensity: 4.5,
    hatDepth: 0.9,
    ride: { steps: [0, 6, 10, 12, 18, 22] },
    forceKick: [0, 6, 12, 18],
    kickFeather: 0.34,
    ghostHit: 0.45,
    /* Weighted towards the gaps. Steps 4 and 16 are the last triplet of beats 1 and 3,
       where the ride is silent and most comping actually lives; 10 and 22 are the same
       spot on 2 and 4, where the ride is playing, so a comp there doubles it — good
       occasionally, wrong as a habit. */
    ghostWeights: {
      4: 0.4,
      16: 0.4,
      10: 0.22,
      22: 0.22,
      8: 0.22,
      20: 0.22,
      2: 0.18,
      14: 0.18,
      0: 0.08,
      12: 0.1,
    },
    kick1: [['0000', 9]],
    kick: [
      ['0000', 9],
      ['0010', 0.5],
    ],
    figures: [
      // time: the ride, the foot on 2 and 4, the kick feathering four
      [
        {
          r: '1.....1...1.1.....1...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        2,
      ],
      // ghosts on the middle triplet of 2 and of 4
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '........1...........1...',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.4,
      ],
      // the Charleston: 1 and the "and" of 2
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '2.........2.............',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.2,
      ],
      // the reverse Charleston: the "and" of 1, and 3
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '....2.......2...........',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.2,
      ],
      // skip-note comps on the "and" of 2 and of 4
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '..........1...........2.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.0,
      ],
      // a bomb on the last triplet of 4, setting up the next bar
      [
        {
          r: '1.....1...1.1.....1.....',
          s: '..................1.....',
          k: '1.....1.....1.....1...2.',
          hf: '......1...........1.....',
        },
        0.8,
      ],
      // two-feel for the head: kick on 1 and 3, cross-stick on 4
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '..................4.....',
          k: '1...........1...........',
          hf: '......1...........1.....',
        },
        1.2,
      ],
      // a lead-in on the last triplets of 4
      [
        {
          r: '1.....1...1.1.....1.....',
          s: '....................2...',
          k: '1.....1.....1.....1...2.',
          hf: '......1...........1.....',
        },
        0.8,
      ],
    ],
    fills: [
      // triplets from the snare round the toms over 3 and 4
      [{ s: '2.2.2.......', t1: '......2.....', t2: '........2...', t3: '..........2.' }, 2],
      // snare, snare, kick in triplets
      [{ s: '2.2...2.2...', k: '....1.....1.' }, 1.5],
      // klook-mop: a rimshot on the last triplet of 4
      [{ s: '1.1.5.' }, 1.0],
      // a stream of triplets on the snare, getting louder
      [{ s: '1.1.1.1.2.2.' }, 1.0],
    ],
  },
  bebop: {
    label: 'Bebop (up-tempo)',
    hint: 'Kenny Clarke and Max Roach: the time moves to the ride, the hat foot keeps 2 and 4, and the kick stops feathering and drops bombs, sometimes after a rimshot ("klook-mop"). Written two jazz bars to each bar here, so the tempo reads half the real one (140 is 280) and the swing is on the 16ths: fast bebop swings lightly, nearly straight at the top.',
    toms: true,
    kit: 'virtuosity',
    hats: 8,
    bpm: [110, 160],
    swing: 22,
    swingRange: [12, 30],
    ghostBias: 1.0,
    ghostHit: 0.6,
    opens: 0,
    fill: 'comp',
    backbeats: [2, 6, 10, 14],
    backbeatLane: 'hf',
    targetDensity: 3,
    hatDepth: 0.85,
    ride: { steps: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15] },
    ghostWeights: { 1: 0.3, 5: 0.3, 9: 0.3, 13: 0.3, 3: 0.2, 7: 0.22, 11: 0.2, 15: 0.22 },
    kick1: [
      ['0000', 9],
      ['0010', 1.0],
    ],
    kick: [
      ['0000', 9],
      ['0010', 1.0],
      ['0001', 0.6],
    ],
    figures: [
      // spang-a-lang on the ride, the foot on 2 and 4
      [{ r: '1.111.111.111.11', hf: '..1...1...1...1.' }, 2],
      // quarters on the ride, as it gets too fast to skip
      [{ r: '1.1.1.1.1.1.1.1.', hf: '..1...1...1...1.' }, 1.2],
      // a bomb on the "and" of 2, the snare on 4
      [
        {
          r: '1.111.111.111.11',
          s: '......2.........',
          k: '...2............',
          hf: '..1...1...1...1.',
        },
        1.2,
      ],
      // klook-mop: a rimshot on the "and" of 2, a bomb on 3
      [
        {
          r: '1.111.111.111.11',
          s: '...5............',
          k: '....2...........',
          hf: '..1...1...1...1.',
        },
        1.0,
      ],
      // off-beat chatter on the snare
      [{ r: '1.111.111.111.11', s: '.1...1.2...1....', hf: '..1...1...1...1.' }, 1.0],
      // setting up a band hit: snare, then a bomb on the last "and"
      [
        {
          r: '1.111.111.111...',
          s: '.............2..',
          k: '...............2',
          hf: '..1...1...1...1.',
        },
        0.8,
      ],
      // Roach: a motif on the toms, answered on the snare
      [
        {
          r: '1.1.1.1.1.1.1.1.',
          s: '.........2......',
          t1: '.2.2............',
          t3: '.............2.2',
          hf: '..1...1...1...1.',
        },
        0.6,
      ],
    ],
    fills: [
      // 8ths round the kit
      [{ s: '22......', t1: '...2....', t3: '.....22.' }, 2],
      // a Roach motif: stated, answered
      [{ s: '....2...', t1: '2.2.....', t3: '......22' }, 1.5],
      // snare and kick trading 8ths, to open a chorus of fours
      [{ s: '2.2.2.2.', k: '.1.1.1.1' }, 1.2],
      // klook-mop to end the phrase
      [{ s: '1.5.', k: '...2' }, 1.0],
    ],
  },
  hardbop: {
    label: 'Hard bop',
    hint: 'Art Blakey: the hi-hat foot loud on 2 and 4, comping kept to the right places, the "Moanin\'" shuffle with the snare ghosting the triplets round a backbeat, and a press roll to launch the next chorus. Written in 12/8, so the triplets are the meter and Swing stays at zero.',
    toms: true,
    kit: 'virtuosity',
    meter: '12/8',
    hats: 8,
    bpm: [195, 300],
    swing: 0,
    ghostBias: 1.0,
    opens: 0,
    fill: 'comp',
    backbeats: [6, 18],
    backbeatLane: 'hf',
    targetDensity: 6,
    hatDepth: 0.9,
    ride: { steps: [0, 6, 10, 12, 18, 22] },
    forceKick: [0, 6, 12, 18],
    kickFeather: 0.3,
    ghostHit: 0.4,
    ghostWeights: { 4: 0.36, 16: 0.36, 10: 0.2, 22: 0.24, 8: 0.2, 20: 0.2 },
    kick1: [['0000', 9]],
    kick: [['0000', 9]],
    figures: [
      // time: ride, a loud foot on 2 and 4, a feathered kick
      [
        {
          r: '1.....1...1.1.....1...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.5,
      ],
      // the "Moanin'" shuffle: ghosts on the triplets, 2 and 4 on the snare
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '....1.3...1.....1.3...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        2,
      ],
      // a lighter shuffle
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '......3...1.......3...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.2,
      ],
      // sparse: a bomb on 1, a comp on the last triplet of 4
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '......................2.',
          k: '2.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        0.8,
      ],
      // a press roll on 4, swelling into the next bar
      [
        {
          r: '1.....1...1.1...........',
          s: '..................1.8.8.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        0.8,
      ],
    ],
    fills: [
      // triplets down from the rack tom to the floor
      [{ t1: '2.2.2.......', t3: '......2.2.2.' }, 2],
      // a press roll on 4
      [{ s: '8.8.8.' }, 1.2],
      // shout hits on the Charleston, crash and kick together
      [{ c: '1.........1.', s: '2.........2.', k: '2.........2.' }, 1.0],
      // snare, snare, kick in triplets
      [{ s: '2.2...2.2...', k: '....1.....1.' }, 1.0],
    ],
  },
  postbop: {
    label: '60s post-bop',
    hint: 'Tony Williams with Miles: the hi-hat foot on every beat, a ride so fast and light it nearly straightens, rimshot stabs, bombs and broken time. Written two jazz bars to each bar, so the tempo reads half the real one (150 is 300) and the swing is on the 16ths.',
    toms: true,
    kit: 'virtuosity',
    hats: 8,
    bpm: [100, 160],
    swing: 18,
    swingRange: [8, 28],
    ghostBias: 1.0,
    ghostHit: 0.55,
    opens: 0,
    fill: 'comp',
    backbeats: [2, 6, 10, 14],
    backbeatLane: 'hf',
    targetDensity: 4,
    hatDepth: 0.85,
    ride: { steps: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15] },
    ghostWeights: { 1: 0.3, 5: 0.3, 9: 0.3, 13: 0.3, 3: 0.22, 7: 0.22, 11: 0.22, 15: 0.22 },
    kick1: [
      ['0000', 8],
      ['0010', 1.2],
    ],
    kick: [
      ['0000', 8],
      ['0010', 1.2],
      ['0100', 0.6],
    ],
    figures: [
      // the ride, and the foot on every beat
      [{ r: '1.111.111.111.11', hf: '1.1.1.1.1.1.1.1.' }, 2],
      // straight 8ths on the ride at the top of the tempo
      [{ r: '1111111111111111', hf: '1.1.1.1.1.1.1.1.' }, 0.8],
      // rimshot stabs and a bomb
      [
        {
          r: '1.111.111.111.11',
          s: '...5.......5....',
          k: '.....2..........',
          hf: '1.1.1.1.1.1.1.1.',
        },
        1.2,
      ],
      // broken time: the ride in pieces
      [
        {
          r: '1...11..1.1...1.',
          s: '..1...1....1....',
          k: '.2..............',
          hf: '1.1.1.1.1.1.1.1.',
        },
        1.0,
      ],
      // crash and kick in bursts, then the time again
      [
        {
          c: '1..1..1.........',
          r: '........1.111.11',
          k: '2..2..2.........',
          hf: '1.1.1.1.1.1.1.1.',
        },
        0.6,
      ],
    ],
    fills: [
      // singles between the snare and the floor tom
      [{ s: '2.2.2.2.', t3: '.2.2.2.2' }, 1.5],
      // crash and kick together, three times
      [{ c: '1..1..1.', k: '2..2..2.' }, 1.0],
      // a rimshot, and a bomb after it
      [{ s: '.5..', k: '...2' }, 1.0],
      // two and two on the toms
      [{ t1: '22..', t2: '..22' }, 1.0],
    ],
  },
  modal: {
    label: 'Modal (Elvin Jones)',
    hint: 'Coltrane-era Elvin: everything on the triplets, the left hand rolling the middle triplet under the ride, the kick on the structural notes, accents that land on 2 or 4 and phrases across the bar line — half-note triplets on the cymbals, quarter-note triplets round the toms. Written in 12/8, so the triplets are the meter.',
    toms: true,
    kit: 'virtuosity',
    meter: '12/8',
    hats: 8,
    bpm: [180, 300],
    swing: 0,
    ghostBias: 1.6,
    opens: 0,
    fill: 'comp',
    backbeats: [6, 18],
    backbeatLane: 'hf',
    targetDensity: 7,
    hatDepth: 0.9,
    ride: { steps: [0, 6, 10, 12, 18, 22] },
    ghostHit: 0.5,
    ghostWeights: { 2: 0.36, 8: 0.32, 14: 0.36, 20: 0.32, 4: 0.3, 16: 0.3, 10: 0.2, 22: 0.2 },
    kick1: [
      ['1000', 6],
      ['0000', 2],
    ],
    kick: [
      ['0000', 4],
      ['1000', 2],
      ['0010', 1],
    ],
    figures: [
      // the left hand rolling triplets under the ride
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '..1.1.....1...1.1.....1.',
          k: '1...........1...........',
          hf: '......1...........1.....',
        },
        2,
      ],
      // a chain of middle triplets, the kick answering at the end
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '..1.....1.....1.....1...',
          k: '1.....................2.',
          hf: '......1...........1.....',
        },
        1.5,
      ],
      // half-note triplets on the cymbal and kick, across the beat
      [
        {
          c: '1.......1.......1.......',
          k: '1.......1.......1.......',
          hf: '......1...........1.....',
        },
        0.8,
      ],
      // quarter-note triplets round the toms
      [
        {
          t1: '1...1...1...............',
          t3: '............1...1...1...',
          k: '1...........1...........',
          hf: '......1...........1.....',
        },
        0.8,
      ],
      // the hat foot on the triplets instead of 2 and 4
      [
        {
          r: '1.....1...1.1.....1...1.',
          s: '........1...........1...',
          k: '1...........1...........',
          hf: '....1.....1.....1.....1.',
        },
        0.6,
      ],
      // a slow ostinato: every 8th on the ride
      [
        {
          r: '1.1.1.1.1.1.1.1.1.1.1.1.',
          s: '........1...........1...',
          k: '1...........1.......2...',
          hf: '......1...........1.....',
        },
        1.0,
      ],
    ],
    fills: [
      // snare, snare, kick round the kit for a whole bar
      [
        {
          s: '..2.2.....2.2...........',
          t1: '..............2.2.......',
          t3: '....................2.2.',
          k: '1.....1...........1.....',
        },
        1.2,
      ],
      // a stream of triplets, the crash and kick a triplet early
      [
        {
          c: '......................1.',
          s: '1.1.1.1.1.1.1.1.1.1.....',
          k: '......................2.',
        },
        1.0,
      ],
      // triplets from the rack tom down to the floor
      [{ t1: '2.2.2.......', t2: '......2.2...', t3: '..........2.' }, 1.5],
    ],
  },
  ecm: {
    label: 'Broken time (ECM)',
    hint: 'Jack DeJohnette and Paul Motian: the time is implied rather than stated. The ride comes in pieces, the hat foot turns up where it likes, a tom or a snare note drops in, a cymbal washes over the bar line. Sparse on purpose; the Ghost notes slider adds more.',
    toms: true,
    kit: 'virtuosity',
    hats: 8,
    bpm: [90, 170],
    swing: 70,
    swingRange: [50, 85],
    swingUnit: 8,
    ghostBias: 0.9,
    ghostHit: 0.5,
    opens: 0,
    fill: 'comp',
    backbeats: [4, 12],
    backbeatLane: 'hf',
    targetDensity: 4,
    ride: { steps: [0, 6, 12] },
    ghostWeights: { 2: 0.24, 6: 0.24, 10: 0.24, 14: 0.24, 5: 0.12, 9: 0.12 },
    kick1: [
      ['0000', 6],
      ['1000', 2],
    ],
    kick: [
      ['0000', 8],
      ['0010', 1],
    ],
    figures: [
      // the ride in pieces, a floor tom at the end
      [
        {
          r: '1.....1.....1...',
          s: '.....1..........',
          t3: '..............2.',
          hf: '..........1.....',
        },
        1.5,
      ],
      // the foot on 2, a snare note on the "and" of 3
      [{ r: '1...1.....1...1.', s: '..........1.....', hf: '....1...........' }, 1.5],
      // a low kick on 1, the ride starting late
      [{ r: '..1...1.1.....1.', s: '.......1....1...', k: '2...............' }, 1.0],
      // a rack tom answering the ride
      [{ r: '1.......1.1.....', t2: '......2.........', hf: '....1.......1...' }, 1.0],
      // a cymbal wash over the bar line, then time
      [{ c: '1...............', r: '........1...1.1.', hf: '............1...' }, 0.7],
    ],
    fills: [
      // the rack tom, then the floor
      [{ t1: '2...', t3: '..2.' }, 1.0],
      // two soft snare notes and a floor tom
      [{ s: '1.1.', t2: '...2' }, 1.0],
      // a cymbal and kick on the "and" of 4
      [{ c: '..1.', k: '..1.' }, 0.8],
    ],
  },
  jazzwaltz: {
    label: 'Jazz waltz',
    hint: 'Written in 3/4 and it needs to stay there — picking this style moves the time signature for you. The ride on 1, 2, the "and" of 2 and 3; the hi-hat foot on 2 and 3, because there is no 4. Comps on the "and" of 1 and of 3, kick-snare-snare across the bar, and now and then a hemiola: crashes every dotted quarter, two against the three. Swung 8ths; the swing changes a little each press.',
    toms: true,
    kit: 'virtuosity',
    meter: '3/4',
    hats: 8,
    bpm: [120, 190],
    swing: 90,
    swingRange: [72, 100],
    swingUnit: 8,
    ghostBias: 1.1,
    opens: 0,
    fill: 'comp',
    backbeats: [4, 8],
    backbeatLane: 'hf',
    targetDensity: 4,
    hatDepth: 0.85,
    ride: { steps: [0, 4, 6, 8, 10] },
    forceKick: [0],
    kickFeather: 0.34,
    ghostHit: 0.42,
    ghostWeights: { 2: 0.34, 6: 0.46, 10: 0.46, 0: 0.12, 4: 0.16, 8: 0.16 },
    kick1: [['1000', 9]],
    kick: [
      ['0000', 7],
      ['0010', 0.9],
      ['0001', 0.7],
    ],
    figures: [
      // the ride on 1, 2, the "and" of 2 and 3; the foot on 2 and 3
      [{ r: '1...1.1.1...', k: '1...........', hf: '....1...1...' }, 2],
      // the ride on the "and" of 3 as well
      [{ r: '1...1.1.1.1.', k: '1...........', hf: '....1...1...' }, 1.5],
      // comps on the "and" of 1 and of 3
      [{ r: '1...1.1.1...', s: '..1.......1.', k: '1...........', hf: '....1...1...' }, 1.2],
      // kick on 2 and 3, the snare on their "and"s
      [{ r: '1...1...1...', s: '......1...1.', k: '1...1...1...', hf: '....1...1...' }, 1.0],
      // a hemiola: crash and kick every dotted quarter
      [{ c: '1.....1.....', k: '1.....1.....', hf: '....1...1...' }, 0.8],
    ],
    fills: [
      // snare, rack tom, floor tom
      [{ s: '2.2.....', t1: '....2...', t3: '......2.' }, 1.5],
      // a comp, a comp and a louder one
      [{ s: '1.1.2.' }, 1.0],
      // two on the rack tom, two on the floor
      [{ t1: '2.2.....', t3: '....2.2.' }, 1.0],
    ],
  },
  jazzballad: {
    label: 'Jazz ballad',
    hint: 'Slow, deep, almost nothing happening. On brushes: the right hand taps the ride rhythm on the snare or plays the ride, the foot keeps 2 and 4, the kick barely there on 1 and 3, an accented slap now and then. The sweep the left hand keeps going is the one thing this page cannot play. 12/8, so the triplets are the meter.',
    kit: 'brush',
    meter: '12/8',
    hats: 8,
    bpm: [84, 117],
    swing: 0,
    ghostBias: 1.2,
    opens: 0,
    fill: 'comp',
    fillComps: 1,
    backbeats: [6, 18],
    backbeatLane: 'hf',
    targetDensity: 3,
    hatDepth: 0.8,
    ride: { steps: [0, 6, 10, 12, 18, 22] },
    forceKick: [0, 12],
    kickFeather: 0.26,
    ghostHit: 0.3,
    ghostWeights: { 4: 0.26, 16: 0.26, 10: 0.16, 22: 0.16, 8: 0.12, 20: 0.12 },
    kick1: [['1000', 9]],
    kick: [['0000', 9]],
    figures: [
      // the ride brushed, the foot on 2 and 4
      [
        {
          r: '1.....1...1.1.....1...1.',
          k: '1...........1...........',
          hf: '......1...........1.....',
        },
        2,
      ],
      // brush taps on the snare in the ride rhythm
      [
        {
          s: '1.....1...1.1.....1...1.',
          k: '1...........1...........',
          hf: '......1...........1.....',
        },
        1.6,
      ],
      // half time: the ride on 1 and 3 only
      [
        {
          r: '1...........1...........',
          k: '1.......................',
          hf: '......1...........1.....',
        },
        1.0,
      ],
      // taps, and a slap on the last triplet of 2
      [
        {
          s: '1.....1...3.1.....1...1.',
          k: '1...........1...........',
          hf: '......1...........1.....',
        },
        0.8,
      ],
    ],
    fills: [
      // two soft taps into the bar line
      [{ s: '..1.1.' }, 1.0],
      // taps getting louder over 3 and 4
      [{ s: '......1.1.2.' }, 1.0],
      // a touch of cymbal on the last triplet
      [{ c: '....1.', k: '....1.' }, 0.8],
    ],
  },
  brushes: {
    label: 'Brushes — medium swing',
    hint: 'A trio on brushes: the right hand taps the ride rhythm on the snare, the foot keeps 2 and 4, the kick feathers four, and the comps are slaps — the Charleston, the last triplet of 2. Played on the DRS kit with brushes; the sweep under it is the one thing this page cannot play. 12/8, so the triplets are the meter.',
    toms: true,
    kit: 'drsBrush',
    meter: '12/8',
    hats: 8,
    bpm: [165, 255],
    swing: 0,
    ghostBias: 1.0,
    opens: 0,
    fill: 'comp',
    backbeats: [6, 18],
    backbeatLane: 'hf',
    targetDensity: 5,
    hatDepth: 0.85,
    ride: { steps: [0, 6, 10, 12, 18, 22] },
    forceKick: [0, 6, 12, 18],
    kickFeather: 0.3,
    ghostHit: 0.5,
    ghostWeights: { 4: 0.34, 16: 0.34, 8: 0.2, 20: 0.2 },
    kick1: [['0000', 9]],
    kick: [['0000', 9]],
    figures: [
      // taps on the snare in the ride rhythm
      [
        {
          s: '1.....1...1.1.....1...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        2,
      ],
      // taps, and a slap on the last triplet of 2
      [
        {
          s: '1.....1...3.1.....1...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.2,
      ],
      // the ride brushed instead
      [
        {
          r: '1.....1...1.1.....1...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        1.2,
      ],
      // a Charleston slap on 1
      [
        {
          s: '3.....1...1.1.....1...1.',
          k: '1.....1.....1.....1.....',
          hf: '......1...........1.....',
        },
        0.8,
      ],
    ],
    fills: [
      // taps building to a slap on 4
      [{ s: '1.1.1.1.2.3.' }, 1.2],
      // a slap on 4 and on its last triplet
      [{ s: '2...3.' }, 1.0],
      // brushes round the toms
      [{ s: '2.2.........', t1: '....2.2.....', t3: '........2.2.' }, 1.0],
    ],
  },
  jazzsamba: {
    label: 'Jazz samba',
    hint: 'Samba as a jazz group plays it: the kick as the surdo, straight 8ths on the ride, the hat foot on the "and"s, a cross-stick clave. One bar here is two bars of 2/4, the same way the clave styles are written, so the tempo reads half the real one.',
    toms: true,
    kit: 'drs',
    hats: 16,
    bpm: [96, 124],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.4,
    opens: 0,
    backbeats: [0, 6, 12],
    foot: [2, 6, 10, 14],
    targetDensity: 12,
    crossStick: true,
    kick1: [['1001', 9]],
    kick: [['1001', 9]],
    figures: [
      // the surdo in the kick, ride 8ths, a cross-stick clave
      [
        {
          r: '1.1.1.1.1.1.1.1.',
          s: '4.....4.....4...',
          k: '1..11..11..11..1',
          hf: '..1...1...1...1.',
        },
        2,
      ],
      // the bell on the last 16th of each beat
      [
        {
          r: '1..21..21..21..2',
          s: '4.....4.....4...',
          k: '1..11..11..11..1',
          hf: '..1...1...1...1.',
        },
        1.5,
      ],
      // partido alto on the cross-stick
      [
        {
          r: '1.1.1.1.1.1.1.1.',
          s: '4..4..4...4.4...',
          k: '1..11..11..11..1',
          hf: '..1...1...1...1.',
        },
        1,
      ],
      // a two-feel: the kick on 1 and 3
      [
        {
          r: '1.1.1.1.1.1.1.1.',
          s: '4.....4.....4...',
          k: '1.......1.......',
          hf: '..1...1...1...1.',
        },
        0.8,
      ],
    ],
    fills: [
      // two and two on the snare, a 16th late, two on the floor tom, the surdo thinned to the beat
      [{ s: '.22.22..', t3: '......22', k: '1...1...' }, 1.5],
      // two on the rack tom, two on the floor
      [{ t1: '22..', t3: '..22' }, 1.2],
      // snare 8ths over the surdo
      [{ s: '2.2.2.2.', k: '1...1...' }, 1.0],
    ],
  },
  souljazz: {
    label: 'Soul jazz',
    hint: 'Idris Muhammad and Bernard Purdie on the organ-trio records: a backbeat with ghosts round it, a kick that sits in the cracks, 16ths on the hats, and the New Orleans second line under it now and then.',
    toms: true,
    kit: 'smdrums',
    hats: 8,
    bpm: [85, 120],
    swing: 10,
    swingRange: [4, 16],
    ghostBias: 0.45,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 11,
    rimshot: 0.2,
    forceKick: [0],
    kick1: [
      ['1000', 4],
      ['1001', 2],
    ],
    kick: [
      ['0010', 1.6],
      ['0000', 1.2],
      ['1001', 1],
    ],
    figures: [
      // 8ths on the hats, a ghost after 2, the kick on the "and" of 2 and of 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.1.....3...', k: '1.....1...1.....' }, 2],
      // 16ths on the hats, ghosts round the backbeat
      [{ h: '1111111111111111', s: '.1..3..1.1..3..1', k: '1.....1...1.....' }, 1.5],
      // Idris's second line: the snare leads, the foot on the 'and's
      [{ s: '3..1..1.3.1.1..1', k: '1.......1.....1.' }, 1.0],
      // the hats opening on the "and" of 2 and of 4
      [{ h: '1.1.1.3.1.1.1.3.', s: '....3.....1.3...', k: '1.1.....1.1.....' }, 1.2],
      // the ride, the kick on the "a" of 2
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3..1....3...', k: '1......1.1......' }, 1.0],
    ],
    fills: [
      // snare, rack tom, floor tom, snare
      [{ s: '3..3', t1: '.2..', t3: '..2.' }, 1.5],
      // round the toms in 16ths
      [{ s: '22......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.2],
      // the hats open on 4, a snare pickup into the one
      [{ h: '3...', s: '3.13' }, 1.0],
    ],
  },
  fusion: {
    label: 'Jazz fusion',
    mix: { r: 0.8 }, // the ride never stops, so it cannot sit on top
    /* Electric Miles and after: straight sixteenths, not swing, so this one stays in
       4/4. What makes it jazz rather than funk is where the snare goes and a ride
       that never stops; the figures add Cobham's 16ths and double kick, Gadd's
       linear and march grooves, and a ride phrased in threes over the four. */
    hint: 'Electric Miles, Billy Cobham, Steve Gadd: straight 16ths, a ride or hats that never stop, a kick full of holes, bursts of double kick, linear patterns where no two limbs play together, and a march groove on the snare. Busy on purpose.',
    kit: 'virtuosity',
    toms: true,
    hats: 16,
    bpm: [96, 132],
    swing: 0,
    swingRange: [0, 6],
    ghostBias: 0.8,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 14,
    hatDepth: 0.75,
    ride: { steps: [0, 2, 4, 6, 8, 10, 12, 14], bell: [0, 8] },
    ghostHit: 0.42,
    ghostWeights: {
      3: 0.4,
      7: 0.44,
      11: 0.4,
      15: 0.44,
      2: 0.24,
      6: 0.26,
      10: 0.24,
      14: 0.26,
      1: 0.16,
      5: 0.18,
      9: 0.16,
      13: 0.18,
    },
    feel: {
      label: 'Pushed',
      k: -0.02,
      s: -0.015,
      sGhost: -0.01,
      h: [-0.015, -0.005],
      r: [-0.015, -0.005],
      c: -0.02,
      jitter: 0.02,
    },
    kick1: [
      ['1000', 3.4],
      ['1001', 1.8],
      ['1010', 1.4],
    ],
    kick: [
      ['0010', 1.6],
      ['0001', 1.4],
      ['0000', 1.2],
      ['0110', 0.6],
    ],
    figures: [
      // the ride in 8ths, the bell on 1 and 3, ghosts round the backbeat
      [{ r: '2.1.1.1.2.1.1.1.', s: '....3..1....3..1', k: '1..1......1.....' }, 1.5],
      // Cobham: 16ths on the hats, a burst of double kick
      [{ h: '1111111111111111', s: '....3.......3...', k: '1.11....1.11..1.' }, 1.5],
      // linear: no two limbs at once
      [{ h: '1...1...1...1...', s: '..2...1...2...1.', k: '.1...1...1...1..' }, 1.5],
      // a Gadd-style march on the snare
      [{ h: '1.1.1.1.1.1.1.1.', s: '.1.13.1..1..3.1.', k: '1.......1.......' }, 1.2],
      // the bell in threes across the four
      [{ r: '2.12..2.121.2.1.', s: '....3.......3...', k: '1..1..1...1..1..' }, 1.0],
    ],
    fills: [
      // snare to the toms in 16ths
      [{ s: '22......', t1: '..2.2...', t2: '...2....', t3: '.....222' }, 1.5],
      // crash and kick on 4, the kick again on its "a"
      [{ c: '1...', s: '3...', k: '1..1' }, 1.0],
      // linear round the kit: snare, kick, floor tom
      [{ s: '2..2..2.', t3: '..2..2..', k: '.1..1..1' }, 1.2],
    ],
  },
  takefive: {
    label: 'Jazz 5/4 (Take Five)',
    mix: { r: 0.85 }, // a bell on every group start is plenty
    /* 5/4 swung is five pulses of three, so it is written in 15/8 for the same reason
       medium swing is written in 12/8: the triplets become real positions instead of
       something the swing slider approximates. Brubeck's 5/4 is felt 3 + 2, which is a
       grouping of the five pulses rather than of the meter — so the accents say it,
       not the barline. */
    hint: 'Five in a bar, felt three then two — the ride carries the phrasing and the hi-hat foot marks where the two-group starts. Written in 15/8, so the triplets are the meter and Swing stays at zero. Morello played it with the ride pattern breaking across the group, which is what the accents on 1 and 4 are doing here.',
    meter: '15/8',
    kit: 'virtuosity',
    hats: 8,
    bpm: [210, 285],
    swing: 0,
    ghostBias: 1.3,
    opens: 0,
    fill: 'comp',
    backbeats: [18],
    backbeatLane: 'hf',
    targetDensity: 4,
    hatDepth: 0.9,
    ride: { steps: [0, 6, 10, 12, 18, 22, 24, 28], bell: [0, 18] },
    foot: [6, 18],
    forceKick: [0, 18],
    kickFeather: 0.34,
    ghostHit: 0.42,
    ghostWeights: {
      4: 0.34,
      16: 0.34,
      28: 0.3,
      10: 0.2,
      22: 0.2,
      8: 0.18,
      20: 0.18,
      26: 0.16,
      12: 0.12,
    },
    kick1: [['1000', 9]],
    kick: [
      ['0000', 7],
      ['0010', 1.0],
    ],
  },

  /* ---- more funk ----------------------------------------------------- */
  nolafunk: {
    label: 'New Orleans funk',
    mix: { h: 0.7 }, // the displaced accents are what you are meant to hear
    hint: 'Zigaboo — second-line phrasing pulled into a funk band. Loose, syncopated, accents landing where you do not expect them, and the backbeat happy to arrive late at the end of a phrase.',
    toms: true,
    hats: 16,
    bpm: [88, 104],
    swing: 18,
    swingRange: [12, 26],
    ghostBias: 1.25,
    opens: 2,
    backbeats: [4, 12],
    targetDensity: 12,
    hatDepth: 1.05,
    displace: 0.4,
    feel: {
      label: 'Loose',
      k: 0.02,
      s: 0.055,
      sGhost: 0.04,
      h: [0, 0.045],
      r: [0, 0.045],
      c: 0,
      jitter: 0.024,
    },
    kick1: [
      ['1001', 3],
      ['1000', 2.6],
      ['1010', 1.8],
      ['0010', 1.0],
    ],
    kick: [
      ['0010', 2.0],
      ['0001', 1.7],
      ['0011', 1.1],
      ['0110', 1.0],
      ['1001', 1.0],
      ['0000', 1.0],
      ['1010', 0.8],
      ['0100', 0.6],
    ],
  },
};

/**
 * Grouping for the style picker, and the order within each group.
 *
 * Presentation only — a style not named here still appears, under "Other", so
 * adding one to {@link STYLES} is enough to ship it. The seed turns this into
 * the `group` and `position` columns on each `Style` row.
 */
export const STYLE_GROUPS: Array<[string, string[]]> = [
  [
    'Funk and breaks',
    [
      'funk',
      'linearfunk',
      'nolafunk',
      'secondline',
      'boombap',
      'dilla',
      'halftime',
      'amen',
      'twostep',
    ],
  ],
  [
    'Soul, gospel, disco',
    ['motown', 'stax', 'soul', 'neosoul', 'gospel', 'disco', 'shuffle', 'purdie'],
  ],
  ['Early jazz and swing', ['neworleans', 'swingera']],
  ['Jazz', ['swing', 'bebop', 'hardbop', 'postbop', 'modal', 'ecm', 'jazzwaltz', 'takefive']],
  ['Jazz ballads and brushes', ['jazzballad', 'brushes']],
  ['Latin jazz', ['bossa', 'jazzsamba', 'afrocuban']],
  ['Jazz funk and fusion', ['souljazz', 'fusion']],
  ['Blues and blues rock', ['slowblues', 'texasshuffle', 'bluesrock', 'boogie', 'halftimeshuffle']],
  ['Rock', ['rock', 'hardrock', 'funkrock', 'powerballad', 'slowrock']],
  ['Rock and roll, country', ['rocknroll', 'rockabilly', 'country']],
  ['Metal', ['metal', 'gallop', 'thrash', 'doublekick', 'groove', 'doom']],
  ['Jamaica', ['reggae', 'dub']],
  ['Afro-Latin', ['afrobeat', 'son', 'rumba', 'mambo', 'songo', 'samba', 'reggaeton']],
];
