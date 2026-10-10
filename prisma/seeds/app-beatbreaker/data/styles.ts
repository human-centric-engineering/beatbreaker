/**
 * The style table — seed data.
 *
 * 62 grooves and 8 famous drummers, each a set of tendencies or a handful of
 * written-out bars, so the generator can write a different break in the same
 * idiom every time. A drummer is a style marked `drummer: true`, which the
 * picker files under Drummers.
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

  /* ---- the drummers ------------------------------------------------- */
  /*
   * A famous drummer's playing, as a style: his bars, his fills, his kit and
   * how often he fills (`midFills`). `drummer: true` files them under
   * Drummers in the picker. Every song groove here is an approximation from
   * descriptions and listening, not a transcription — see
   * `.context/app/planning/drumming-research.md`, sections C and D.
   */
  mitchell: {
    label: 'Mitch Mitchell',
    drummer: true,
    hint: 'The Jimi Hendrix Experience: a jazz drummer in a rock band. A busy snare that answers the guitar, the kick following the riff, and fills two or three times as often as most, many of them in threes. Each New plays a style inspired by one of forty-five of his songs, at its own tempo and in its own time: the boogaloo of Fire, the 9/8 jazz waltz of Manic Depression, the 12/8 blues of Red House and Voodoo Chile, brushes on Up from the Skies, swung ride time on Third Stone from the Sun, the toms of I Don’t Live Today. The stage names the song. The grooves are approximations, not transcriptions.',
    toms: true,
    kit: 'smdrums',
    hats: 8,
    bpm: [56, 158],
    swing: 0,
    swingRange: [0, 20],
    swingUnit: 8,
    ghostBias: 0.6,
    ghostWeights: { 3: 0.3, 7: 0.4, 11: 0.3, 15: 0.4 },
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 10,
    rimshot: 0.3,
    buzz: 0.3,
    midFills: 0.5,
    /* From the technique research (planning/drumming-research.md, C3): his
       fills get longer through a song, the busier groove comes second, and
       a fill often lands an 8th early, crash and kick on the "and" of 4. */
    anticipate: 0.35,
    fillsGrow: true,
    build: true,
    // loose: the snare a hair late, the hats leaning, a consistent wobble
    feel: { label: 'Loose', s: 0.02, sGhost: 0.03, h: [0, 0.03], r: [0, 0.03], jitter: 0.02 },
    forceKick: [0],
    kick1: [
      ['1010', 3],
      ['1000', 3],
      ['1001', 1],
    ],
    kick: [
      ['1010', 1.5],
      ['0010', 1.5],
      ['1000', 1.2],
      ['0000', 1],
    ],
    figures: [
      // Fire: a fast boogaloo, the snare chattering after 2 and 4
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3.1.', k: '1.1.....1.1.....' }, 2],
      // Purple Haze: the ride, the kick under the riff
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.....1.' }, 1.6],
      // Purple Haze, busier on the hats
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1..1.3...', k: '1.....1.1.....1.' }, 1.2],
      // Foxey Lady: the hats opening on the last "and"
      [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3...', k: '1.....1...1.....' }, 1.4],
      // Third Stone from the Sun: jazz ride time, the foot on 2 and 4
      [
        {
          r: '1...1.1.1...1.1.',
          hf: '....1.......1...',
          s: '......1.......1.',
          k: '1.......1.......',
        },
        0.6,
      ],
      // Spanish Castle Magic: heavy, on the ride
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3...', k: '1.1.....1.....1.' }, 1.2],
      // Crosstown Traffic: snare pickups into the one
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3.11', k: '1.1...1.1.1.....' }, 1.0],
      // Voodoo Child (Slight Return), the busy verse
      [{ h: '1.1.1.1.1.1.1.3.', s: '....3..1.1..3.1.', k: '1.....1...1.....' }, 1.2],
      // Hey Joe
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3.1.', k: '1.....1.1.......' }, 1.0],
      // If 6 Was 9: slow, a jazzy ride
      [{ r: '1...1.1.1...1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 0.8],
      // Fire's chorus: on the floor tom
      [{ t3: '2.2.....2.2.....', s: '....3.......3...', k: '1.......1.......' }, 0.6],
      // a crash on the riff's accents, the ride between them
      [
        {
          c: '1.......1.......',
          r: '..1.1.1...1.1.1.',
          s: '....3.......3...',
          k: '1.....1.1.......',
        },
        0.8,
      ],
    ],
    fills: [
      /* His sextuplet cycle, floor-snare-snare-rack-floor-floor (Bonedo),
         folded onto 16ths: six-note groups that drift across the beat. The
         whole bar, opening on crash and kick. */
      [
        {
          c: '1...............',
          k: '1...............',
          s: '.22....22....22.',
          t1: '...2.....2.....2',
          t3: '....222...222...',
        },
        0.8,
      ],
      // Elvin's hand-hand-foot triplets round the toms, a 3-over-4 from beat 3
      [{ t1: '2.......', s: '.2..2...', k: '..1..1..', t2: '...2....', t3: '......22' }, 1.2],
      // the four-stroke ruff: snare, rack, floor, kick
      [{ s: '2...', t1: '.2..', t3: '..2.', k: '...1' }, 1.0],
      // nine notes from the "a" of 2, crash and kick first: the odd-placed crash
      [{ c: '1........', k: '1........', s: '.222.2...', t3: '....2.2..', t1: '.......22' }, 0.6],
      // a paradiddle, the accents on the toms, over a samba kick
      [{ k: '1..11..1', s: '.2.22.2.', t1: '3.......', t2: '....3...' }, 0.6],
      // a press roll held like a note, into an accent
      [{ s: '88.3' }, 0.8],
      // threes: snare, snare, kick, from the "and" of 3
      [{ s: '22.22.', k: '..1..1' }, 1.2],
      // threes round the toms, the kick ending it
      [
        {
          s: '2..2..2..2..',
          t1: '.2..2.......',
          t2: '..2..2.2....',
          t3: '........2.2.',
          k: '...........1',
        },
        1.0,
      ],
      // threes: rack tom, floor tom, kick
      [{ t1: '2..2..2.', t3: '.2..2..2', k: '..1..1..' }, 0.8],
      // a press roll on 4, into the crash
      [{ s: '8.8.' }, 0.8],
      // the wasp's nest: a flurry on the snare
      [{ s: '3.21.2.3' }, 1.2],
      // snare, snare, rack tom, floor tom
      [{ s: '22..', t1: '..2.', t3: '...2' }, 1.2],
      // crash and kick together on the riff's accents, either side of the 4
      [{ c: '1.....1.', k: '1.....1.', s: '....3...' }, 1.0],
    ],
    /* His songs, each with its own meter, tempo, swing and kit: one New picks
       one, and the stage names it. Tempos are from tempo databases and lessons
       (songbpm.com, Bonedo's Hey Joe); the bars are reconstructions from
       descriptions and listening, not transcriptions — see
       `.context/app/planning/drumming-research.md`, section C2. In 12/8 and
       9/8 the tempo counts quarter notes, so the beat you feel is two thirds
       of it; swing in 4/4 is a 16th lean unless the song says 8ths. */
    songs: [
      {
        key: 'fire',
        title: 'Fire',
        feel: 'a fast straight boogaloo, the snare chattering after 2 and 4',
        weight: 1.2,
        params: {
          ghostBias: 0.3,
          bpm: [146, 158],
          swing: 0,
          midFills: 0.55,
          figures: [
            // the chorus: quarter-note hats, a ghost on the "and" of 1, a crash pushed onto the "and" of 4
            [
              {
                h: '2...2...2...2...',
                s: '..1.3.......3...',
                k: '1.......1.....1.',
                c: '..............1.',
              },
              1.4,
            ],
            // the bridge, on the ride near the bell
            [{ r: '1.1.1.2.1.2.1.1.', s: '..1.3.11....3.1.', k: '1.....1.1.....1.' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3.11', k: '1.1.....1.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3.1.', k: '1.1.....1.1.....' }, 1.4],
            // the chorus, on the floor tom
            [{ t3: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '1.......1.1.....' }, 1.0],
            // the stop-start hits: crash and kick on 1 and 3
            [
              {
                c: '1.......1.......',
                h: '..1.1.1...1.1.1.',
                s: '....3.......3...',
                k: '1.......1.......',
              },
              0.8,
            ],
          ],
          fills: [
            // machine-gun 16ths from a 16th before beat 3
            [{ s: '33.33.33' }, 1.4],
            // the wasp's nest
            [{ s: '3.21.2.3' }, 1.4],
            // a press roll on 4, into the crash
            [{ s: '8.8.' }, 1.0],
            [{ s: '22.22.', k: '..1..1' }, 1.0],
            [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.0],
          ],
        },
      },
      {
        key: 'purple-haze',
        title: 'Purple Haze',
        feel: 'straight and heavy on the crash-ride, the kick under the riff',
        weight: 1.2,
        params: {
          bpm: [104, 112],
          swing: 4,
          swingRange: [0, 8],
          figures: [
            /* The verse as Cook transcribes it: no ostinato at all, a flammed
               backbeat, crash and kick on the 1, the snare echoing the guitar. */
            [{ c: '1...............', k: '1.....1.1.......', s: '....6.1..1..6.33' }, 1.4],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.....1.' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1..1.3...', k: '1.....1.1.....1.' }, 1.2],
            [
              {
                c: '1.......1.......',
                r: '..1.1.1...1.1.1.',
                s: '....3.......3...',
                k: '1.....1.1.......',
              },
              1.0,
            ],
          ],
          fills: [
            // four accented 16ths to set up the re-entry, split hand to hand
            [{ s: '33.3', t1: '..3.' }, 1.0],
            // threes round the toms, the kick ending it
            [
              {
                s: '2..2..2..2..',
                t1: '.2..2.......',
                t2: '..2..2.2....',
                t3: '........2.2.',
                k: '...........1',
              },
              1.2,
            ],
            [{ t1: '2..2..2.', t3: '.2..2..2', k: '..1..1..' }, 1.0],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'foxey-lady',
        title: 'Foxey Lady',
        feel: 'straight, the kick doubling the riff and a crash on its stabs',
        weight: 1.1,
        params: {
          bpm: [94, 102],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3...', k: '1.....1...1.....' }, 2],
            [
              {
                c: '1.......1.......',
                h: '..1.1.1...1.1.3.',
                s: '....3.......3..1',
                k: '2.....1...1.....',
              },
              1.2,
            ],
          ],
          fills: [
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.2],
            [{ c: '1.....1.', k: '1.....1.', s: '....3...' }, 1.0],
            [{ s: '3.21.2.3' }, 0.8],
          ],
        },
      },
      {
        key: 'hey-joe',
        title: 'Hey Joe',
        feel: 'a slow swung 16th groove, the hats giving way to the crash-ride as it builds',
        weight: 1.2,
        params: {
          bpm: [80, 88],
          swingUnit: 16,
          swing: 26,
          swingRange: [18, 34],
          ghostBias: 0.8,
          midFills: 0.3,
          figures: [
            // the backbeat displaced from 4 onto its "and"
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.........3.', k: '1.....1.1.......' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '..1.3..1.1..3..1', k: '2.....1.1.....1.' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3.1.', k: '1.....1.1.......' }, 1.4],
            [
              {
                c: '1.......1.......',
                r: '..1.1.1...1.1.1.',
                s: '..1.3..1.1..3..1',
                k: '2.....1.1.....1.',
              },
              1.2,
            ],
          ],
          fills: [
            // his sextuplet cycle from beat 3, folded onto 16ths
            [{ t3: '2...22..', s: '.22...2.', t1: '...2...2' }, 1.4],
            // the paradiddle over a samba kick, the accents on the toms
            [{ k: '1..11..1', s: '.2.22.2.', t1: '3.......', t2: '....3...' }, 1.0],
            // threes on the snare and the toms, his sextuplets folded onto 16ths
            [{ s: '3..3..3..3..', t1: '.2..2.......', t3: '.......2..22' }, 1.4],
            // a paradiddle, the right hand on the rack tom
            [{ t1: '2.22.2..', s: '.2..2.22' }, 1.2],
            [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.0],
            [{ s: '3.21.2.3' }, 0.8],
          ],
        },
      },
      {
        key: 'little-wing',
        title: 'Little Wing',
        feel: 'a slow ballad, barely there, then a fill that erupts round the toms',
        weight: 1.0,
        params: {
          bpm: [68, 74],
          swingUnit: 16,
          swing: 14,
          swingRange: [8, 20],
          ghostBias: 0.4,
          midFills: 0.15,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3..1', k: '1.....1.1.......' }, 1.2],
            // the solo, on the ride
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3..1....3...', k: '1.......1.1.....' }, 0.8],
          ],
          fills: [
            [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.4],
            [
              {
                s: '3..3..3..3..',
                t1: '.2..2..2....',
                t3: '..2..2..2.22',
              },
              1.2,
            ],
            [{ s: '22.22.', k: '..1..1' }, 0.8],
          ],
        },
      },
      {
        key: 'wind-cries-mary',
        title: 'The Wind Cries Mary',
        feel: 'gentle and sparse, a snare roll behind the solo',
        weight: 1.0,
        params: {
          bpm: [76, 84],
          swingUnit: 16,
          swing: 6,
          swingRange: [0, 14],
          ghostBias: 0.4,
          rimshot: 0.1,
          midFills: 0.2,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3......13...', k: '1.......1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3...', k: '1.......1.1.....' }, 1.0],
          ],
          fills: [
            [{ s: '8...8.8.' }, 1.2],
            [{ s: '1.1.2.3.' }, 1.2],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 0.8],
          ],
        },
      },
      {
        key: 'manic-depression',
        title: 'Manic Depression',
        feel: 'a fast jazz waltz in 9/8, triplets on the ride, Elvin Jones in a rock band',
        weight: 1.1,
        params: {
          meter: '9/8',
          bpm: [210, 240],
          swing: 0,
          backbeats: [6, 12],
          backbeatLane: 'hf',
          opens: 0,
          ghostBias: 0.9,
          ghostWeights: { 2: 0.3, 8: 0.35, 14: 0.35, 4: 0.2, 10: 0.2, 16: 0.2 },
          midFills: 0.5,
          figures: [
            // every triplet on the ride, the foot on 2 and 3, the snare comping
            [
              {
                r: '1.1.1.1.1.1.1.1.1.',
                hf: '......1.....1.....',
                s: '..1.2.....1...1.2.',
                k: '1.....1.....1.....',
              },
              2,
            ],
            // the jazz ride: each beat and its last triplet
            [
              {
                r: '1...1.1...1.1...1.',
                hf: '......1.....1.....',
                s: '....1.....2.......',
                k: '1...........1.....',
              },
              1.4,
            ],
            // with the riff: kick on its three notes, the ride after
            [
              {
                r: '......1.1.1.1.1.1.',
                hf: '......1.....1.....',
                s: '..............2...',
                k: '1.1.1.......1.....',
              },
              1.0,
            ],
            // comping across the kit
            [
              {
                r: '1.1.1.1.1.1.1.1.1.',
                hf: '......1.....1.....',
                s: '..1.....2.1.....2.',
                t3: '..............2...',
                k: '1.......1.........',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '2.2.3.' }, 1.4],
            // snare, snare, rack tom; snare, snare, floor tom
            [{ s: '2.2...2.2...', t1: '....2.......', t3: '..........2.' }, 1.2],
            // triplets round the kit over the last two beats
            [{ s: '2.....2.....', t1: '..2.....2...', t3: '....2.....2.' }, 1.2],
            // a flurry, louder all the way
            [{ s: '11..23', t1: '..22..' }, 0.8],
          ],
        },
      },
      {
        key: 'voodoo-child',
        title: 'Voodoo Child (Slight Return)',
        feel: 'heavy, a 16th lean, the crash-ride washing and the kick locked to the riff',
        weight: 1.2,
        params: {
          bpm: [84, 92],
          swingUnit: 16,
          swing: 14,
          swingRange: [8, 22],
          midFills: 0.5,
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3...', k: '1.....1.1.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....3..1.1..3.1.', k: '1.....1...1.....' }, 1.4],
            [
              {
                c: '1.......1.......',
                r: '..1.1.1...1.1.1.',
                s: '....3..1.1..3.1.',
                k: '1.....1...1.....',
              },
              1.2,
            ],
          ],
          fills: [
            // a long run down the toms
            [
              { s: '33..........', t1: '..2222......', t2: '......22....', t3: '........2222' },
              1.2,
            ],
            [{ t1: '2..2..2..2..', t3: '.2..2..2..2.', k: '..1..1..1..1' }, 1.2],
            [{ s: '3.21.2.3' }, 1.0],
            [{ c: '1.....1.', k: '1.....1.', s: '....3...' }, 0.8],
          ],
        },
      },
      {
        key: 'voodoo-chile',
        title: 'Voodoo Chile',
        feel: 'the long slow 12/8 blues jam, triplets on the ride and press rolls',
        weight: 0.8,
        params: {
          meter: '12/8',
          bpm: [76, 88],
          swing: 0,
          backbeats: [6, 18],
          opens: 0,
          hatDepth: 0.85,
          ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
          midFills: 0.45,
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......3...........3...1.',
                k: '1.....1.....1.....1.....',
              },
              2,
            ],
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......3.....1.1...3.1.1.',
                k: '1...........1...........',
              },
              1.2,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '..1...3.1.....1...3...1.',
                k: '1.........1.1...........',
              },
              1.0,
            ],
            // the build: crash on every beat, the ride between
            [
              {
                c: '1.....1.....1.....1.....',
                r: '..1.1...1.1...1.1...1.1.',
                s: '......3...........3.....',
                k: '1.....1.....1.....1.....',
              },
              0.8,
            ],
          ],
          fills: [
            [{ s: '8.8.3.' }, 1.2],
            [{ s: '2.2...', t3: '....2.' }, 1.2],
            [{ s: '2.2.3.' }, 1.0],
            [{ s: '21..23', t1: '..22..' }, 0.8],
          ],
        },
      },
      {
        key: 'red-house',
        title: 'Red House',
        feel: 'a spare 12/8 slow blues on the hats, triplet fills into the turnaround',
        weight: 0.8,
        params: {
          meter: '12/8',
          bpm: [86, 98],
          swing: 0,
          backbeats: [6, 18],
          opens: 0,
          ghostBias: 0.3,
          hatDepth: 0.85,
          ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
          midFills: 0.25,
          figures: [
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......3...........3.....',
                k: '1...........1...........',
              },
              2,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......3...........3.....',
                k: '1.........1.1...........',
              },
              1.2,
            ],
            // the solo, on the ride
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......3...........3...1.',
                k: '1...........1...........',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '2.2.3.' }, 1.4],
            [{ t1: '2.2...', t3: '....22' }, 1.2],
            // a stop for the guitar, on the 4
            [{ c: '1.....', s: '3.....', k: '1.....' }, 0.6],
          ],
        },
      },
      {
        key: 'up-from-the-skies',
        title: 'Up from the Skies',
        feel: 'an easy jazz shuffle on brushes, the foot on 2 and 4',
        weight: 0.9,
        params: {
          meter: '12/8',
          kit: 'drsBrush',
          bpm: [195, 225],
          swing: 0,
          backbeats: [6, 18],
          backbeatLane: 'hf',
          opens: 0,
          ghostBias: 1.0,
          ghostHit: 0.5,
          kickFeather: 0.3,
          rimshot: 0,
          buzz: 0,
          targetDensity: 6,
          hatDepth: 0.85,
          ghostWeights: { 4: 0.34, 16: 0.34, 8: 0.2, 20: 0.2 },
          fill: 'comp',
          fillComps: 2,
          midFills: 0.15,
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
            // the shuffle on the snare, a slap on 2 and 4
            [
              {
                s: '1...1.2...1.1...1.2...1.',
                k: '1.....1.....1.....1.....',
                hf: '......1...........1.....',
              },
              1.4,
            ],
            // the ride brushed instead
            [
              {
                r: '1.....1...1.1.....1...1.',
                k: '1.....1.....1.....1.....',
                hf: '......1...........1.....',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '1.1.3.' }, 1.4],
            [{ s: '3...1.3...1.' }, 1.0],
          ],
        },
      },
      {
        key: 'if-6-was-9',
        title: 'If 6 Was 9',
        feel: 'slow and loose on a jazzy ride, breaking into free time',
        weight: 0.8,
        params: {
          bpm: [56, 66],
          swingUnit: 16,
          swing: 28,
          swingRange: [18, 40],
          ghostBias: 0.8,
          midFills: 0.6,
          figures: [
            [{ r: '1...1.11....1.11', s: '....3.......3..1', k: '1.......1.1.....' }, 2],
            [{ r: '1...1.1.1...1.1.', s: '....3.......3...', k: '1.......1.1.....' }, 1.2],
            // the freak-out: broken time, the floor tom where a backbeat was
            [
              {
                r: '1.....1.....1...',
                s: '..1.3....1..2...',
                t3: '.......2.......2',
                k: '1.....1...1.....',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '3.21.2.3' }, 1.2],
            [{ t1: '2..2..2.', t3: '.2..2..2', k: '..1..1..' }, 1.2],
            [{ s: '8.8.' }, 1.0],
          ],
        },
      },
      {
        key: 'castles-made-of-sand',
        title: 'Castles Made of Sand',
        feel: 'in the pocket with a light swing, snare pick-ups and rolls',
        weight: 0.9,
        params: {
          ghostBias: 0.4,
          bpm: [90, 98],
          swingUnit: 16,
          swing: 14,
          swingRange: [8, 22],
          midFills: 0.5,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3.1.', k: '1.....1.1.......' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '..1.3..1....3.11', k: '1.....1.1.....1.' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3...8.8.3...', k: '1.....1.1.......' }, 1.0],
          ],
          fills: [
            [{ s: '8.8.8.3.' }, 1.2],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.2],
            [{ s: '3.21.2.3' }, 1.0],
          ],
        },
      },
      {
        key: 'spanish-castle-magic',
        title: 'Spanish Castle Magic',
        feel: 'heavy on the ride with a slight lean, crashes on the riff',
        weight: 1.0,
        params: {
          bpm: [94, 102],
          swingUnit: 16,
          swing: 10,
          swingRange: [5, 18],
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3..1....3...', k: '1.1.....1.....1.' }, 2],
            [
              {
                c: '1.......1.......',
                r: '..1.1.1...1.1.1.',
                s: '....3.......3...',
                k: '1.....1.1.......',
              },
              1.2,
            ],
          ],
          fills: [
            [{ s: '22.22.', k: '..1..1' }, 1.2],
            [{ c: '1.....1.', k: '1.....1.', s: '....3...' }, 1.0],
            [{ t1: '2..2..2.', t3: '.2..2..2', k: '..1..1..' }, 1.0],
          ],
        },
      },
      {
        key: 'third-stone',
        title: 'Third Stone from the Sun',
        feel: 'swung jazz ride time, the foot on 2 and 4, spacey fills floating over it',
        weight: 0.7,
        params: {
          kit: 'virtuosity',
          bpm: [112, 124],
          swingUnit: 8,
          swing: 85,
          swingRange: [75, 95],
          backbeatLane: 'hf',
          opens: 0,
          ghostBias: 1.0,
          fill: 'comp',
          fillComps: 3,
          midFills: 0.4,
          figures: [
            [
              {
                r: '1...1.1.1...1.1.',
                hf: '....1.......1...',
                s: '......1.......1.',
                k: '1.......1.......',
              },
              2,
            ],
            [
              {
                r: '1...1.1.1...1.1.',
                hf: '....1.......1...',
                s: '..1.......1.....',
                k: '1...........1...',
              },
              1.2,
            ],
            // the breakdown: a crash, the floor tom answering
            [
              {
                c: '1...............',
                r: '....1.1.1...1.1.',
                t3: '..........2...2.',
                hf: '....1.......1...',
                k: '1.......1.......',
              },
              0.8,
            ],
          ],
          fills: [
            [{ s: '2.2.', t3: '.2.2' }, 1.2],
            [{ c: '1..1..1.', k: '2..2..2.' }, 0.8],
          ],
        },
      },
      {
        key: 'crosstown-traffic',
        title: 'Crosstown Traffic',
        feel: 'chunky and straight, snare pick-ups into the one',
        weight: 0.8,
        params: {
          bpm: [109, 117],
          swing: 0,
          figures: [
            // the cross-rhythm: dotted 8ths on the snare, the pulse hidden
            [{ s: '3..3..3..3..3..3', k: '1...............' }, 0.6],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3.11', k: '1.1...1.1.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3.1.', k: '1.1...1.1.......' }, 1.2],
          ],
          fills: [
            // a flam on the "and" of 4, the crash on the next 1
            [{ s: '3.6.' }, 1.2],
            [{ s: '3.33' }, 1.2],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.0],
            [{ s: '3.21.2.3' }, 1.0],
          ],
        },
      },
      {
        key: 'stone-free',
        title: 'Stone Free',
        feel: 'straight and loping, the hats opening in the verse, the ride in the chorus',
        weight: 0.8,
        params: {
          bpm: [128, 138],
          swingUnit: 16,
          swing: 4,
          swingRange: [0, 10],
          figures: [
            [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3..1', k: '1..1..1...1.....' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1..1..1...1.....' }, 1.2],
          ],
          fills: [
            [{ s: '22.22.', k: '..1..1' }, 1.2],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'i-dont-live-today',
        title: "I Don't Live Today",
        feel: 'the toms carrying the time instead of a cymbal, tribal',
        weight: 0.7,
        params: {
          bpm: [116, 126],
          swing: 0,
          ghostBias: 0.2,
          midFills: 0.3,
          figures: [
            [{ t3: '2..1..2.2..1..2.', t1: '....1.......1...', k: '1.......1.......' }, 2],
            [{ t3: '2..1..2.2..1..2.', s: '....3.......3...', k: '1.......1.......' }, 1.2],
            // the chorus, back on the hats
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 0.8],
          ],
          fills: [
            [{ t1: '22..22..', t3: '..22..22' }, 1.2],
            [{ t1: '2..2..2.', t3: '.2..2..2', k: '..1..1..' }, 1.0],
          ],
        },
      },
      {
        key: 'merman',
        title: '1983… (A Merman I Should Turn to Be)',
        feel: 'a marching snare in a slow bolero crescendo',
        weight: 0.5,
        params: {
          bpm: [64, 74],
          swing: 0,
          ghostBias: 0.2,
          midFills: 0.2,
          figures: [
            [{ s: '2.112.1.2.112.1.', k: '1.......1.......' }, 2],
            [{ s: '3.1.2.1.3.1.2.11', k: '1.......1.......' }, 1.0],
          ],
          fills: [
            [{ s: '8.8.8.3.' }, 1.4],
            [{ s: '2.2.2.23' }, 1.0],
          ],
        },
      },
      {
        key: 'watchtower',
        title: 'All Along the Watchtower',
        feel: 'straight and driving, heavy tom fills between sections',
        weight: 0.8,
        params: {
          bpm: [109, 117],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 2],
            [
              {
                c: '1...............',
                h: '..1.1.1.1.1.1.1.',
                s: '....3.......3..1',
                k: '1.....1.1.....1.',
              },
              1.0,
            ],
          ],
          fills: [
            [
              { s: '33..........', t1: '..2222......', t2: '......22....', t3: '........2222' },
              1.2,
            ],
            [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.2],
          ],
        },
      },
      {
        key: 'little-miss-lover',
        title: 'Little Miss Lover',
        feel: 'the funk break: syncopated 16th kicks under a crash-ride',
        weight: 1.0,
        params: {
          ghostBias: 0,
          bpm: [96, 104],
          swing: 0,
          figures: [
            [{ c: '2.2.2.2.2.2.2.2.', s: '....2..2....2..2', k: '1.11.1..1.1.....' }, 2],
            // the outro, on the ride
            [{ r: '..1111.11.111..1', s: '....2..2....2..2', k: '1.11.1..1.11....' }, 1.0],
          ],
          fills: [
            [{ s: '222.' }, 1.2],
            [{ s: '..2.222.', t2: '......1.' }, 1.0],
          ],
        },
      },
      {
        key: 'gypsy-eyes',
        title: 'Gypsy Eyes',
        feel: 'a stomping tom groove, the toms where the snare would be',
        weight: 0.8,
        params: {
          bpm: [114, 122],
          swing: 10,
          swingRange: [0, 30],
          ghostBias: 0,
          figures: [
            [
              {
                h: '2.1.2.1.2.1.2.1.',
                t2: '1...1..1.1..1...',
                t3: '..........1.....',
                k: '1.......1.......',
              },
              2,
            ],
            // the intro: the floor tom on the beat, the foot on the "and"s
            [{ t3: '2...2...2...2...', hf: '..1...1...1...1.', k: '1.......1.......' }, 1.0],
          ],
          fills: [
            [{ t3: '11' }, 1.0],
            [{ t2: '2.2.', t3: '..22' }, 1.0],
          ],
        },
      },
      {
        key: 'long-hot-summer-night',
        title: 'Long Hot Summer Night',
        feel: 'a soul groove, the kick busy in 16ths, an open hat on the "and" of 3',
        weight: 0.8,
        params: {
          bpm: [82, 88],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.3.1.1.', s: '....2..2.2..2...', k: '1..1....1.1..1.1' }, 2],
            // the bridge, on the ride
            [{ r: '1.1.1.1.1.1.1.1.', s: '2.2.2..2....2...', k: '...1....1.11.1.1' }, 0.8],
          ],
          fills: [[{ s: '2...', k: '.1.1' }, 1.0]],
        },
      },
      {
        key: 'come-on',
        title: 'Come On (Let the Good Times Roll)',
        feel: 'fast R&B rock on the ride bell',
        weight: 0.8,
        params: {
          bpm: [142, 150],
          swing: 0,
          figures: [
            [{ r: '2.2.2.2.2.2.2.2.', s: '....2.......2...', k: '1.1.....1.1.....' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.2.....2...', k: '1.......1.....1.' }, 1.0],
            [{ r: '1.1.1.1.1.1.1.1.', s: '......2.......2.', k: '1.1.......1.....' }, 1.0],
          ],
        },
      },
      {
        key: 'house-burning-down',
        title: 'House Burning Down',
        feel: 'a snare-led verse, then four on the snare like a march',
        weight: 0.7,
        params: {
          bpm: [118, 126],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '2..22...2...2...', k: '......1...1...11' }, 1.4],
            // the drive: the snare on every beat
            [{ h: '1.1.1.1.1.1.1.1.', s: '2...2...2...2...', k: '1...1...1...1...' }, 1.0],
          ],
          fills: [
            [{ s: '2.22' }, 1.2],
            // the four-stroke ruff, the snare still on 4
            [{ s: '2...', t1: '.2..', t3: '..2.', k: '...1' }, 1.0],
            [{ s: '3.3.3.33' }, 1.0],
          ],
        },
      },
      {
        key: 'love-or-confusion',
        title: 'Love or Confusion',
        feel: 'the snare on every "and" over four on the floor',
        weight: 0.8,
        params: {
          ghostBias: 0.3,
          bpm: [108, 114],
          swing: 0,
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', s: '..2...2...2...2.', k: '1...1...1...1...' }, 1.6],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2..2.2..2..2', k: '1.1.....1.1.....' }, 1.4],
          ],
          fills: [
            // triplets on the snare and the rack tom over 3 and 4
            [{ s: '2..2..2..2..', t1: '.2..2..2..2.' }, 1.4],
            [{ s: '22.22.', k: '..1..1' }, 1.0],
          ],
        },
      },
      {
        key: 'highway-chile',
        title: 'Highway Chile',
        feel: 'a hard shuffle, the kick moving every few bars',
        weight: 0.9,
        params: {
          bpm: [132, 140],
          swingUnit: 8,
          swing: 92,
          swingRange: [85, 100],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.1...1.' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1...1...1.' }, 1.2],
            [{ h: '1...1...1...1...', s: '....2.......2...', k: '1.....1.1.1.....' }, 1.0],
            // the chorus: a crash on every beat
            [{ c: '1...1...1...1...', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 0.8],
          ],
        },
      },
      {
        key: 'aint-no-telling',
        title: "Ain't No Telling",
        feel: 'sloshy hats on the beat, then a quarter-note snare chorus',
        weight: 0.7,
        params: {
          bpm: [136, 144],
          swing: 0,
          figures: [
            [{ h: '4...4...4...4...', s: '....2..2....2...', k: '1.......1.1.....' }, 1.6],
            // the chorus: the snare on every beat, the kick on the "and"s
            [{ h: '1.1.1.1.1.1.1.1.', s: '2...2...2...2...', k: '..1...1...1...1.' }, 1.0],
          ],
          fills: [[{ c: '1...........', s: '2.222...2.2.' }, 1.0]],
        },
      },
      {
        key: 'wait-until-tomorrow',
        title: 'Wait Until Tomorrow',
        feel: 'a light swing, the backbeat on the rim',
        weight: 0.8,
        params: {
          bpm: [108, 116],
          swingUnit: 8,
          swing: 48,
          swingRange: [40, 56],
          rimshot: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.........1...1.' }, 2],
            // the chorus, struck and on the ride
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.........1...1.' }, 1.2],
          ],
        },
      },
      {
        key: 'can-you-see-me',
        title: 'Can You See Me',
        feel: 'the drums in unison with the riff, crash and kick on its hits',
        weight: 0.8,
        params: {
          ghostBias: 0,
          bpm: [128, 136],
          swing: 0,
          figures: [
            [
              {
                c: '1.....1.........',
                s: '..22....2.2.....',
                t2: '....11.....11...',
                t3: '............1.11',
                k: '1.....1.........',
              },
              1.4,
            ],
            [{ h: '1.1.1.1.1.1.1.1.', s: '2...2...2...2...', k: '..1...1...1...1.' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2...22..2.22', k: '1.....1...1.....' }, 1.0],
          ],
          fills: [
            [{ s: '2.22' }, 1.2],
            [{ s: '2...', t1: '.2..', t3: '..2.', k: '...1' }, 1.0],
          ],
        },
      },
      {
        key: 'little-miss-strange',
        title: 'Little Miss Strange',
        feel: 'pushed: loose hats in 8ths, the kick accenting the "and"s',
        weight: 0.6,
        params: {
          bpm: [138, 146],
          swing: 0,
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '..2...2...2...2.' }, 1.6],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3..3....3..3', k: '2..1.......1....' }, 1.0],
          ],
        },
      },
      {
        key: 'have-you-ever-been',
        title: 'Have You Ever Been (to Electric Ladyland)',
        feel: 'slow Curtis Mayfield soul, every bar a little different',
        weight: 0.6,
        params: {
          bpm: [70, 76],
          swingUnit: 16,
          swing: 4,
          swingRange: [0, 10],
          ghostBias: 0.8,
          figures: [
            [{ h: '...31.1.1.1.3...', s: '2..22.......2...', k: '1.....1...1.....' }, 1.4],
            [{ h: '1.1.1.1.1.1.3.1.', s: '....2..1....2...', k: '1.....1...1..1..' }, 1.0],
          ],
        },
      },
      {
        key: 'are-you-experienced',
        title: 'Are You Experienced?',
        feel: 'a march: snare rolls over a near-silent kit',
        weight: 0.6,
        params: {
          ghostBias: 0.2,
          bpm: [78, 86],
          swing: 0,
          figures: [
            [{ s: '2.2.2.222.2.2.22', k: '1.1.....1.......' }, 1.6],
            [{ r: '1...1...1...1...', s: '....2.......2...', k: '1.......1.....1.' }, 1.0],
          ],
          fills: [[{ s: '8.8.8.3.' }, 1.0]],
        },
      },
      {
        key: 'laughing-sams-dice',
        title: "The Stars That Play with Laughing Sam's Dice",
        feel: 'half-time psych: a crash on every beat, the snare only on 3',
        weight: 0.6,
        params: {
          bpm: [142, 150],
          swing: 0,
          figures: [
            [{ c: '1...1...1...1...', s: '........2.....2.', k: '1...1...........' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.0],
          ],
        },
      },
      {
        key: 'bold-as-love',
        title: 'Bold as Love',
        feel: 'the coda: the ride, a 16th kick, building',
        weight: 0.7,
        params: {
          ghostBias: 0.4,
          bpm: [66, 72],
          swing: 0,
          figures: [
            [
              {
                c: '2...............',
                r: '..1.1.1.1.1.1.1.',
                s: '....2..2.2..2...',
                k: '1..1....1.11..1.',
              },
              1.6,
            ],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1..1....1.1.....' }, 1.0],
          ],
        },
      },
      {
        key: 'catfish-blues',
        title: 'Catfish Blues',
        feel: 'a 12/8 blues with a rolling kick, the ride on every triplet',
        weight: 0.7,
        params: {
          meter: '12/8',
          bpm: [96, 112],
          swing: 0,
          backbeats: [6, 18],
          opens: 0,
          hatDepth: 0.85,
          ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......2...........2.....',
                k: '1...1.....1.1...1.....1.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '......2...........2.....',
                k: '1.....1.....1.....1.....',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '2.2.3.' }, 1.4],
            [{ t1: '2.2...', t3: '....22' }, 1.0],
          ],
        },
      },
      {
        key: 'straight-ahead',
        title: 'Straight Ahead',
        feel: 'R&B on the hat foot in 8ths, the hands left free',
        weight: 0.7,
        params: {
          bpm: [104, 110],
          swing: 0,
          figures: [
            [{ hf: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1......11.1.....' }, 1.6],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1......11.1.....' }, 1.0],
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                hf: '....1.......1...',
                s: '....2.......2...',
                k: '1......11.1.....',
              },
              0.8,
            ],
          ],
          fills: [[{ s: '2.22' }, 1.0]],
        },
      },
      {
        key: 'in-from-the-storm',
        title: 'In from the Storm',
        feel: 'hard rock that keeps speeding up, the snare driving on the "and"s',
        weight: 0.7,
        params: {
          bpm: [140, 160],
          swing: 0,
          figures: [
            [{ hf: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.0],
            [{ h: '3...3...3...3...', s: '....2.......2...', k: '1.......1.1.....' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.1.', s: '..2...2...2...2.', k: '1...1...1...1...' }, 1.2],
          ],
        },
      },
      {
        key: 'freedom',
        title: 'Freedom',
        feel: 'syncopated funk rock, open hats and a crash on the riff',
        weight: 0.8,
        params: {
          bpm: [108, 116],
          swing: 0,
          figures: [
            [
              {
                h: '3.3.3...3.3.3.3.',
                c: '......1.........',
                s: '....2.......2.22',
                k: '1.1...1...1.....',
              },
              1.6,
            ],
            [{ h: '1.1.1.1.1.1.1.1.', s: '......2.....2.22', k: '11..11....1.....' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....11.11.....' }, 1.0],
          ],
          fills: [[{ s: '2.22' }, 1.2]],
        },
      },
      {
        key: 'dolly-dagger',
        title: 'Dolly Dagger',
        feel: 'funk on the hats, opening and closing, the kick on 1 and 3',
        weight: 0.8,
        params: {
          bpm: [116, 124],
          swing: 0,
          figures: [
            [{ h: '3.3.1.1.33..1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.6],
            // the vamp at the end: four on the floor
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1...1...1...1.1.' }, 0.8],
          ],
        },
      },
      {
        key: 'ezy-ryder',
        title: 'Ezy Ryder',
        feel: 'driving 8ths after a ride-bell intro',
        weight: 0.7,
        params: {
          bpm: [118, 126],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.1...1.' }, 1.6],
            [{ r: '2...2...2...2...', hf: '1...1...1...1...', k: '1.......1.......' }, 0.6],
          ],
          fills: [[{ s: '2.2.2.2.' }, 1.0]],
        },
      },
      {
        key: 'angel',
        title: 'Angel',
        feel: 'a ballad on loose hats, building to a snare roll and two crashes',
        weight: 0.8,
        params: {
          bpm: [66, 70],
          swing: 0,
          midFills: 0.2,
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', s: '....2.......2...', k: '1.....1.1.1...1.' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 1.0],
          ],
          fills: [
            // the build: a whole bar on the snare, a crash at each end of it
            [{ c: '1.......2.......', s: '2.222.222.222.23' }, 1.2],
            [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.0],
          ],
        },
      },
      {
        key: 'hear-my-train',
        title: "Hear My Train A Comin'",
        feel: 'a slow 16th blues rock with ghost notes',
        weight: 0.7,
        params: {
          bpm: [70, 76],
          swingUnit: 16,
          swing: 10,
          swingRange: [4, 18],
          ghostBias: 0.8,
          figures: [
            [{ h: '111.1.1.1.1.1.1.', s: '....3..2....3..2', k: '2..1....2.11....' }, 1.6],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3...', k: '2..1....2.1.....' }, 1.0],
          ],
        },
      },
      {
        key: 'midnight',
        title: 'Midnight',
        feel: 'jazz funk: the ride on the beat, a busy 16th kick',
        weight: 0.6,
        params: {
          ghostBias: 0.3,
          bpm: [78, 84],
          swing: 0,
          figures: [
            [{ r: '1...1...1...1...', s: '....2.......2...', k: '1.1...11.1.1.1.1' }, 1.6],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2..1....2...', k: '1.1...11.1......' }, 1.0],
          ],
        },
      },
      {
        key: 'lover-man',
        title: 'Lover Man',
        feel: 'fast blues rock on the crash-ride, live',
        weight: 0.6,
        params: {
          bpm: [96, 104],
          swing: 0,
          figures: [
            // loose hats, closed only on the backbeat to cut the slosh (Cook)
            [{ h: '4.4.2.4.4.4.2.4.', s: '....3.......3...', k: '1.....1.1.......' }, 1.4],
            [{ c: '2.2.2.2.2.2.2.2.', s: '....2....2..2...', k: '1..1....1..1....' }, 1.6],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1..1....1..1....' }, 1.0],
          ],
        },
      },
    ],
  },
  bonham: {
    label: 'John Bonham',
    drummer: true,
    hint: "Led Zeppelin: a huge kick, often doubled, the hats in 8ths and a backbeat like a door slamming, sitting back on the beat. Fills in threes, hands and feet — the Bonham triplet, played as real sextuplets where the song allows. Each New plays one of his records at its own tempo and in its own grid: Good Times Bad Times' kick triplets under a cowbell, Fool in the Rain's half-time shuffle, Immigrant Song's paradiddle between kick and snare, the slow weight of When the Levee Breaks. The stage names the song. The grooves are approximations, not transcriptions.",
    toms: true,
    kit: 'bigrusty',
    hats: 8,
    bpm: [70, 178],
    swing: 0,
    swingRange: [0, 8],
    ghostBias: 0.15,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.6,
    rimshot: 0.6,
    midFills: 0.25,
    forceKick: [0],
    kick1: [
      ['1010', 4],
      ['1000', 3],
      ['1001', 1.5],
    ],
    kick: [
      ['1010', 1.5],
      ['0011', 1.2],
      ['1000', 1.2],
      ['0000', 1],
    ],
    figures: [
      // Rock and Roll: the kick doubled on 1 and 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.1.....1.1.....' }, 2],
      // When the Levee Breaks: one backbeat, on 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '........3.......', k: '1.....1.........' }, 1.0],
      // Immigrant Song: the gallop
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.11.1..1.11.1..' }, 1.0],
      // Good Times Bad Times, lightened: the doubled kick
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1......11.1.....' }, 1.2],
      // Kashmir: the kick doubled on 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......11......' }, 1.0],
      // the ride bell for the big chorus
      [{ r: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '1.1.....1.1.....' }, 0.8],
    ],
    fills: [
      // the Bonham triplet: rack tom, floor tom, kick, round and round
      [{ t1: '2..2..2..2..', t3: '.2..2..2..2.', k: '..1..1..1..1' }, 1.6],
      // the same, on the snare, over the last two beats
      [{ s: '2..2..', t3: '.2..2.', k: '..1..1' }, 1.2],
      // round the toms in 16ths
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1.2],
      // snare and floor tom together in 8ths
      [{ s: '3.3.3.3.', t3: '2.2.2.2.' }, 1.0],
    ],
    /* His records, each at its own tempo and in its own grid: one New picks
       one, and the stage names it. Three are in sextuplet 4/4 (`4/4-6`), six
       steps to the beat, so a Bonham triplet is three real sextuplets and not
       sixteenths in threes; there a straight eighth is every third step and
       the backbeats are steps 6 and 18. Tempos are from songbpm.com and
       Wikipedia; the bars follow lesson descriptions where there are any and
       are reconstructions otherwise — see
       `.context/app/planning/drumming-research.md`, section F. */
    songs: [
      {
        key: 'good-times-bad-times',
        title: 'Good Times Bad Times',
        feel: 'a cowbell on the eighths, the hats in the left foot, kick triplets on one pedal',
        weight: 1.3,
        params: {
          meter: '4/4-6',
          bpm: [90, 96],
          swing: 0,
          backbeats: [6, 18],
          forceKick: [],
          ghostWeights: {},
          opens: 0,
          perc: [{ inst: 'cowbell', every: 3, accentPulse: true }],
          figures: [
            [
              {
                hf: '1..1..1..1..1..1..1..1..',
                s: '......3...........3.....',
                k: '1........1..1...........',
              },
              1.2,
            ],
            // the cowbell on the beat, two kicks on the sextuplets after it
            [
              {
                hf: '1..1..1..1..1..1..1..1..',
                s: '......3...........3.....',
                k: '.11..........11.........',
              },
              2,
            ],
            [
              {
                hf: '1..1..1..1..1..1..1..1..',
                s: '......3...........3.....',
                k: '.11....11....11....11...',
              },
              1.0,
            ],
          ],
          fills: [
            // the Bonham triplet: two hands, then the kick, down the kit
            [
              {
                s: '22.22.......',
                t1: '......22....',
                t3: '.........22.',
                k: '..1..1..1..1',
              },
              1.4,
            ],
            // rack tom, floor tom, kick
            [{ t1: '2..2..', t3: '.2..2.', k: '..1..1' }, 1.2],
          ],
        },
      },
      {
        key: 'fool-in-the-rain',
        title: 'Fool in the Rain',
        feel: 'a half-time shuffle, the backbeat on 3, the hats barking on the shuffled "and" of 1',
        weight: 1.2,
        params: {
          meter: '4/4-6',
          bpm: [126, 134],
          swing: 0,
          backbeats: [12],
          ghostWeights: {},
          opens: 0,
          ghostBias: 0.4,
          figures: [
            [
              {
                h: '1...3.1...1.1...1.1...1.',
                s: '........1...3.......1...',
                k: '1.........1...........1.',
              },
              2,
            ],
            // on the ride bell, the ghosts filling the triplets between
            [
              {
                r: '2...2.2...2.2...2.2...2.',
                s: '..1.....1...3.1.....1...',
                k: '1.........1...........1.',
              },
              1.2,
            ],
          ],
          /* fills in eighth-note triplets, a gap between every note: sextuplet
             runs at this tempo would be fourteen notes a second */
          fills: [
            [{ s: '2.2.3.' }, 1.2],
            [{ t1: '2.2...', t3: '....2.' }, 1.0],
            [{ s: '2.2.2.2.....', t1: '........2...', t3: '..........2.' }, 0.8],
          ],
        },
      },
      {
        key: 'rock-and-roll',
        title: 'Rock and Roll',
        feel: 'fast straight eighths, the kick doubled, triplet fills round the kit',
        weight: 1.1,
        params: {
          meter: '4/4-6',
          bpm: [166, 174],
          swing: 0,
          backbeats: [6, 18],
          ghostWeights: {},
          opens: 0,
          figures: [
            [
              {
                h: '1..1..1..1..1..1..1..1..',
                s: '......3...........3.....',
                k: '1..1........1..1........',
              },
              2,
            ],
            [
              {
                h: '4..4..4..4..4..4..4..4..',
                s: '......3...........3.....',
                k: '1........1..1........1..',
              },
              1.2,
            ],
          ],
          /* eighth-note triplets round the kit, a gap between every note: at
             this tempo the sextuplets of his ending are seventeen notes a second */
          fills: [
            [{ s: '2.2.2.2.....', t1: '........2...', t3: '..........2.' }, 1.4],
            [{ s: '2.2...', t3: '....2.' }, 1.2],
            [{ t1: '2.2...2.2...', t3: '....2.....2.', k: '1.....1.....' }, 1.0],
          ],
        },
      },
      {
        key: 'immigrant-song',
        title: 'Immigrant Song',
        feel: 'a paradiddle split between kick and snare, the right hand on the kick',
        weight: 1.2,
        params: {
          bpm: [110, 114],
          swing: 0,
          ghostWeights: {},
          // the paradiddle's gaps: a kick added there by a varied bar would leave it no air
          noKick: [6, 7, 14, 15],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '.1..3....1..3...', k: '1.11.1..1.11.1..' }, 2],
            // the ghost dropped too: only the backbeats left in the left hand
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.11.1..1.11.1..' }, 1.0],
          ],
        },
      },
      {
        key: 'when-the-levee-breaks',
        title: 'When the Levee Breaks',
        feel: 'slow and enormous, behind the beat, a ghost after each backbeat',
        weight: 1.2,
        params: {
          bpm: [70, 74],
          swing: 0,
          midFills: 0.05,
          ghostWeights: {},
          opens: 0,
          feel: { label: 'Behind', k: 0.04, s: 0.07, sGhost: 0.04, h: [0.03, 0.02], jitter: 0.01 },
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....31......31..', k: '21.....11.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....31......31..', k: '2.....1.1.1.....' }, 1.4],
          ],
          fills: [[{ s: '3.33' }, 1.0]],
        },
      },
      {
        key: 'kashmir',
        title: 'Kashmir',
        feel: 'plain eighths and a huge backbeat under a riff in three, laid back',
        weight: 1.0,
        params: {
          bpm: [78, 82],
          swing: 0,
          midFills: 0.15,
          feel: { label: 'Behind', k: 0.03, s: 0.06, h: [0.02, 0.01], jitter: 0.01 },
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......11......' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.11......' }, 1.0],
          ],
        },
      },
      {
        key: 'black-dog',
        title: 'Black Dog',
        feel: 'straight 4/4 under a riff that turns over, then the ride bell, and a fill falling down the toms',
        weight: 0.8,
        params: {
          bpm: [78, 84],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3..1', k: '1.1...1...1.....' }, 2],
            [{ r: '2.2.2.2.2.2.2.2.', s: '....3.......3...', k: '1.....1...1...1.' }, 1.2],
          ],
          fills: [
            // snare, snare, rack tom, floor tom
            [{ s: '22......', t1: '..22....', t3: '....22..', k: '.......1' }, 1.4],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'trampled-under-foot',
        title: 'Trampled Under Foot',
        feel: 'funk-rock after Superstition, the hats loose and the kick doubling',
        weight: 0.7,
        params: {
          bpm: [108, 114],
          swing: 4,
          swingRange: [0, 10],
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', s: '....3..1....3...', k: '1.11......11....' }, 2],
            [{ h: '4.4.4.4.4.4.4.3.', s: '....3..1.1..3..1', k: '1..1..1...11....' }, 1.2],
          ],
        },
      },
      {
        key: 'achilles-last-stand',
        title: 'Achilles Last Stand',
        feel: 'a driving gallop on the kick, the ride and crashes washing over it',
        weight: 0.7,
        params: {
          bpm: [142, 150],
          swing: 0,
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.11....1.11....' }, 2],
            [
              {
                c: '1.......1.......',
                r: '..1.1.1...1.1.1.',
                s: '....3.......3...',
                k: '1.11....1.11....',
              },
              1.2,
            ],
          ],
        },
      },
      {
        key: 'communication-breakdown',
        title: 'Communication Breakdown',
        feel: 'flat-out eighths, the kick doubled on 1 and 3',
        weight: 0.6,
        params: {
          bpm: [170, 178],
          swing: 0,
          midFills: 0.15,
          // fills in eighths: his sixteenth-note triplets at this tempo would not leave a gap
          fills: [
            [{ s: '3.3.3.3.' }, 1.2],
            [{ s: '2.2.....', t1: '....2...', t3: '......2.' }, 1.0],
          ],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.1.....1.1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 1.0],
          ],
        },
      },
      {
        key: 'whole-lotta-love',
        title: 'Whole Lotta Love',
        feel: 'heavy straight eighths, the kick answering the riff',
        weight: 0.7,
        params: {
          bpm: [88, 92],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1......1..1.....' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.1.......1.....' }, 1.0],
          ],
        },
      },
    ],
  },
  stubblefield: {
    label: 'Clyde Stubblefield',
    drummer: true,
    hint: "James Brown's drummer, 1965–70: ghost notes so quiet they are felt, a kick that never sits where you expect, and a backbeat that moves, the hats in his right hand alone and the left on the snare. Hardly a fill: the groove is the point. Each New plays one of his records at its own tempo: Funky Drummer's one-handed sixteenths, Cold Sweat's backbeat pushed to the \"and\" of 4, I Got the Feelin's threes on the snare, Mother Popcorn's quarter-note hats. The stage names the song. The first four follow published grids; the rest are approximations.",
    kit: 'smdrums',
    mix: { h: 0.72 },
    hats: 16,
    bpm: [96, 132],
    swing: 8,
    swingRange: [4, 14],
    ghostBias: 0.4,
    // round the backbeats, never between the ghosts Funky Drummer already has
    ghostWeights: { 2: 0.25, 6: 0.3, 15: 0.3 },
    opens: 2,
    backbeats: [4, 12],
    targetDensity: 8,
    // sixteenths on the hats in the right hand, not hand to hand: the left stays on the snare
    oneHandHats: true,
    kick1: [
      ['1010', 3],
      ['1000', 2],
    ],
    kick: [
      ['0010', 2],
      ['0001', 1.6],
      ['0000', 1],
    ],
    figures: [
      // Funky Drummer: the snare's accent on the "a" of 3, the hats opening after 2
      [{ h: '1111131311111311', s: '....3..1.1.23..2', k: '1.1.......1..1..' }, 2],
      // Cold Sweat: the backbeat on 4 pushed to its "and"
      [{ h: '1.3.1.1.1.3.1.1.', s: '....3..2......3.', k: '2.......1.1.....' }, 1.0],
      // Cold Sweat's second bar: no kick on 1
      [{ h: '1.3.1.1.1.3.1.1.', s: '.2..3..2.1..3...', k: '..1.....1.1...1.' }, 1.0],
      // Mother Popcorn: the hats on the quarters, the backbeat on the "and" of 4
      [{ h: '1...1...1...1...', s: '....3..1.1....3.', k: '1.1.......1.....' }, 1.2],
      // ghosts all round the backbeat
      [{ h: '1111111111111111', s: '.1..3..1.1..3..1', k: '1.1.......1.....' }, 1.2],
    ],
    fills: [
      // the backbeat, a ghost and an accent on the "a"
      [{ s: '3.13' }, 1.5],
      // the snare on 4, the hats opening after it, a kick and the snare on the "a"
      [{ h: '..3.', s: '3..2', k: '...1' }, 1.2],
      // a run of ghosts into an accent
      [{ s: '3.1.3.11' }, 1.0],
    ],
    /* His records, each at its own tempo: one New picks one, and the stage
       names it. The first four are from Goodhertz's Funklet grids (Jack
       Stratton's transcriptions, two bars each, tempos as given there); each
       bar of a two-bar groove is a figure of its own, so a phrase plays one
       and then, often, the other. The last three are reconstructions in his
       vocabulary at the record's tempo — no grid of them exists. See
       `.context/app/planning/drumming-research.md`, section E. */
    songs: [
      {
        key: 'funky-drummer',
        title: 'Funky Drummer',
        feel: 'one-handed sixteenths on the hats, the snare accent on the "a" of 3',
        weight: 1.4,
        params: {
          bpm: [96, 104],
          swing: 8,
          swingRange: [4, 12],
          figures: [
            [{ h: '1111131311111311', s: '....3..1.1.23..2', k: '1.1.......1..1..' }, 2],
            [{ h: '1111131111111311', s: '....3..1.1.23..2', k: '1.1.......1..1..' }, 1.6],
            // the "a" of 4 let down to a ghost
            [{ h: '1111131111111311', s: '....3..1.1.23..1', k: '1.1.......1..1..' }, 1.0],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ h: '..3.', s: '3..2', k: '...1' }, 1.0],
          ],
        },
      },
      {
        key: 'cold-sweat',
        title: 'Cold Sweat',
        feel: 'eighths on the hats opening on the "and"s of 1 and 3, the backbeat pushed to the "and" of 4',
        weight: 1.3,
        params: {
          bpm: [110, 120],
          swing: 0,
          hats: 8,
          ghostBias: 0.3,
          ghostWeights: { 3: 0.2, 11: 0.2 },
          figures: [
            [{ h: '1.3.1.1.1.3.1.1.', s: '....3..2......3.', k: '2.......1.1.....' }, 2],
            // the second bar: no kick on 1, the backbeat back on 4
            [{ h: '1.3.1.1.1.3.1.1.', s: '.2..3..2.1..3...', k: '..1.....1.1...1.' }, 1.6],
          ],
          fills: [
            // the hats opening on 4, the snare on its "a"
            [{ h: '3...', s: '...3' }, 1.2],
            [{ s: '3.13' }, 1.0],
          ],
        },
      },
      {
        key: 'i-got-the-feelin',
        title: "I Got the Feelin'",
        feel: 'the backbeat on the "and"s of 2 and 4, then the left hand in threes on the snare',
        weight: 1.1,
        params: {
          bpm: [124, 132],
          swing: 0,
          hats: 8,
          // the transcription's own ghosts and no more: its second bar is busy enough
          ghostWeights: {},
          figures: [
            [{ h: '1.3.1.1.1.3.1.1.', s: '......3..1....3.', k: '1.2.......2.....' }, 2],
            /* the second bar, its two lone ghosts (the "e"s of 1 and 2) left out
               for air: the critic wants a quarter of the bar free of kick and snare */
            [{ h: '1.1.1.1.3.1.1.1.', s: '....3..2.111.111', k: '..2.....1...1.1.' }, 1.6],
          ],
          fills: [
            [{ s: '.113' }, 1.2],
            [{ s: '..13' }, 1.0],
          ],
        },
      },
      {
        key: 'mother-popcorn',
        title: 'Mother Popcorn',
        feel: 'the hats on the quarters, the backbeat on 2 and the "and" of 4, the snare busy with the horns',
        weight: 1.2,
        params: {
          bpm: [113, 121],
          swing: 0,
          hats: 8,
          // the transcription's own ghosts and no more: its second bar is busy enough
          ghostWeights: {},
          figures: [
            [{ h: '1...1...1...1...', s: '....3..1.1....3.', k: '1.1.......1.....' }, 2],
            /* the second bar: the kick on every "and", the accent on the "e" of 3;
               its three softest ghosts (the "a"s of 1, 2 and 3) left out for air:
               the critic wants a quarter of the bar free of kick and snare */
            [{ h: '1...1...1...1...', s: '.1..21...3..21.1', k: '..1...1...1...1.' }, 1.6],
          ],
          fills: [
            [{ s: '1.3.' }, 1.2],
            [{ s: '3.13' }, 1.0],
          ],
        },
      },
      {
        key: 'say-it-loud',
        title: "Say It Loud – I'm Black and I'm Proud",
        feel: 'a medium groove under the call and response, the ghosts light',
        weight: 0.7,
        params: {
          bpm: [108, 116],
          swing: 4,
          swingRange: [0, 8],
          hats: 8,
          ghostBias: 0.3,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3..1', k: '1.1.......1.....' }, 2],
            [{ h: '1.1.1.3.1.1.1.1.', s: '....3..1.1..3...', k: '1.1...1...1.....' }, 1.2],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ s: '3.1.3.11' }, 0.8],
          ],
        },
      },
      {
        key: 'give-it-up',
        title: 'Give It Up or Turnit a Loose',
        feel: 'the Sex Machine version, Bootsy on bass, the drums carrying the "clap your hands, stomp your feet" break',
        weight: 0.7,
        params: {
          bpm: [108, 114],
          swing: 0,
          hats: 8,
          ghostBias: 0.3,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3...', k: '1.1.......1..1..' }, 2],
            // the break: the snare and kick alone under the voice
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3..1', k: '1.1...1...1.....' }, 1.2],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ h: '..3.', s: '3..2', k: '...1' }, 1.0],
          ],
        },
      },
      {
        key: 'get-involved',
        title: 'Get Up, Get into It, Get Involved',
        feel: 'sixteenths on the hats in one hand, the kick pushing the "a" of 1',
        weight: 0.7,
        params: {
          bpm: [106, 112],
          swing: 4,
          swingRange: [0, 10],
          figures: [
            [{ h: '1111111111111111', s: '....3..1.1..3...', k: '1..1......1.....' }, 2],
            [{ h: '1111113111111111', s: '.1..3..1....3..1', k: '1..1......1..1..' }, 1.2],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ s: '3.1.3.11' }, 0.8],
          ],
        },
      },
    ],
  },
  tonywilliams: {
    label: 'Tony Williams',
    drummer: true,
    hint: 'With Miles, Herbie Hancock, Eric Dolphy and his own Lifetime: a ride so light it nearly straightens, swing that widens as the tempo drops, rimshot stabs, bombs, broken time and phrases in three across the bar line. In 1964–65 the hi-hat foot is mostly silent; on every beat from 1968. Each New plays a style inspired by one of thirty-two songs he played on, in its own time and feel: Seven Steps to Heaven, Nefertiti with the drums as soloist, Maiden Voyage straight, Footprints in 12/8, Emergency! as jazz-rock. The fast tunes are in eighths (4/4 in eighths) and open at a tempo you can practise; the slider goes to 380 for the record speeds. Approximations, not transcriptions.',
    toms: true,
    kit: 'virtuosity',
    hats: 8,
    bpm: [120, 190],
    swingUnit: 8,
    swing: 60,
    swingRange: [48, 72],
    ghostBias: 0.6,
    ghostHit: 0.6,
    opens: 0,
    backbeats: [4, 12],
    targetDensity: 5,
    hatDepth: 0.85,
    rimshot: 0.4,
    midFills: 0.35,
    // on top of the beat, "just a fraction above" (Miles, quoted in Goodman 2011)
    feel: { label: 'On top', r: -0.04, hf: -0.03, h: -0.02, jitter: 0.01 },
    /* No written ride, no comp ending and no foot backbeat here: a song cannot
       take a field away, only set one, and his rock and fusion songs need
       none of them. Each jazz song sets its own. */
    ghostWeights: { 2: 0.3, 6: 0.3, 10: 0.3, 14: 0.3 },
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
      // the time: the ride, the foot on every beat
      [{ r: '1...1.1.1...1.1.', hf: '1...1...1...1...' }, 1.6],
      // rimshot stabs and a bomb
      [
        {
          r: '1...1.1.1...1.1.',
          s: '......5.......5.',
          k: '..........2.....',
          hf: '1...1...1...1...',
        },
        1.4,
      ],
      // broken time: the ride in pieces, the snare and kick filling the gaps
      [
        {
          r: '1.....1...1.....',
          s: '..1.....1...1...',
          k: '....2.......2...',
          hf: '1...1...1...1...',
        },
        1.2,
      ],
      // crash and kick in bursts, then the time again
      [
        {
          c: '1..1..1.........',
          k: '2..2..2.........',
          r: '........1...1.1.',
          hf: '1...1...1...1...',
        },
        0.8,
      ],
    ],
    fills: [
      // singles between the snare and the floor tom, two and one
      [{ s: '22.2.22.', t3: '..2.2..2' }, 1.5],
      // crash and kick together, three times
      [{ c: '1..1..1.', k: '2..2..2.' }, 1.2],
      // rimshots, a bomb between them
      [{ s: '5..5', k: '.2..' }, 1.0],
      // two and two on the toms
      [{ t1: '22..', t3: '..22' }, 1.0],
    ],
    /* His songs. Tempos for Seven Steps, So What, Walkin', Agitation, Madness,
       Pee Wee, Masqualero, Prince of Darkness and Limbo are Todd Bishop's
       measurements (cruiseshipdrummer.com); Cantaloupe Island follows his
       transcription and Fred a Songsterr tab; the rest are reconstructions.
       See planning/drumming-research.md, section G. */
    songs: [
      {
        key: 'seven-steps',
        title: 'Seven Steps to Heaven',
        feel: 'up-tempo, live: the ride on the beat, the foot on all four, the band break filled in threes (record 300–356)',
        weight: 1.2,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [220, 260],
          swing: 18,
          swingRange: [10, 26],
          crossRhythm: 0.3,
          crossRhythms: [[{ every: 3, lanes: { s: 3 }, bars: 2 }, 1]],
          figures: [
            [{ r: '1.1.1.11', s: '...3...1', k: '.....2..' }, 2],
            [{ r: '1.111.11', s: '.1...5..', k: '...2....' }, 1.2],
            // now and then, the foot on every beat
            [{ r: '1.1.1.11', hf: '1.1.1.1.', s: '...3...1', k: '.....2..' }, 0.5],
          ],
          fills: [
            // the head break: linear, in threes across the bar
            [{ s: '3..3..3.', t3: '.2..2..2', k: '..1..1..' }, 1.2],
            [{ s: '3.5.', t3: '.2.2' }, 1.0],
          ],
        },
      },
      {
        key: 'so-what',
        title: 'So What',
        feel: 'live on Four & More, twice the speed of the 1959 record: chatter between the kick and the snare (record 270–324)',
        weight: 1.0,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [210, 250],
          swing: 24,
          swingRange: [16, 32],
          crossRhythm: 0.3,
          crossRhythms: [
            [{ every: 3, lanes: { s: 5 }, bars: 2 }, 1],
            [{ every: 14, lanes: { s: 3 } }, 0.6],
          ],
          figures: [
            [{ r: '1.111.11', s: '...5..1.', k: '.2......' }, 2],
            [{ r: '1.1.1.1.', s: '.1...1..', k: '...2...2' }, 1.2],
            // now and then, the foot on every beat
            [{ r: '1.111.11', hf: '1.1.1.1.', s: '...5..1.', k: '.2......' }, 0.5],
          ],
          fills: [
            // dotted-quarter rimshots, three against four
            [{ s: '5..5..5.', k: '.2..2..2' }, 1.2],
            [{ s: '3.1.', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'walkin',
        title: "Walkin'",
        feel: 'the fastest of them, speeding up all the way, swing almost even (record 292–372)',
        weight: 1.0,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [220, 260],
          swing: 12,
          swingRange: [4, 20],
          figures: [
            [{ r: '1.1.1.1.', s: '.1.1.3..', k: '.......2' }, 2],
            [{ r: '1.111.1.', s: '.....1.3', k: '..2.....' }, 1.0],
            // now and then, the foot on every beat
            [{ r: '1.1.1.1.', hf: '1.1.1.1.', s: '.1.1.3..', k: '.......2' }, 0.5],
          ],
          fills: [
            // a press roll into the next chorus
            [{ s: '8.83' }, 1.4],
            [{ s: '3.13', k: '.2..' }, 1.0],
          ],
        },
      },
      {
        key: 'one-finger-snap',
        title: 'One Finger Snap',
        feel: 'quarters on the ride, the foot on all four, rimshots kicking the breaks (record 310–340)',
        weight: 0.8,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [220, 260],
          swing: 18,
          swingRange: [10, 26],
          figures: [
            [{ r: '1.1.1.1.', s: '.1...1.5', k: '...2....' }, 2],
            // now and then, the foot on every beat
            [{ r: '1.1.1.1.', hf: '1.1.1.1.', s: '.1...1.5', k: '...2....' }, 0.5],
          ],
          fills: [
            [{ s: '5.5.', t3: '.2.2' }, 1.2],
            [{ s: '3.5.', k: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'gazzelloni',
        title: 'Gazzelloni',
        feel: 'Out to Lunch bop: the ride in quarters, kick and snare chattering in pairs (record 280–300)',
        weight: 0.7,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [210, 250],
          swing: 30,
          swingRange: [22, 38],
          figures: [
            [{ r: '1.1.1.11', s: '...1..3.', k: '.....2..' }, 2],
            // now and then, the foot on every beat
            [{ r: '1.1.1.11', hf: '1.1.1.1.', s: '...1..3.', k: '.....2..' }, 0.5],
          ],
          fills: [[{ s: '3.13', k: '.2..' }, 1.2]],
        },
      },
      {
        key: 'agitation',
        title: 'Agitation',
        feel: 'the swing after his march-like snare solo opens the record (record 250–266)',
        weight: 0.8,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [200, 240],
          swing: 30,
          swingRange: [22, 38],
          figures: [
            [{ r: '1.111.11', s: '...1..3.' }, 2],
            // now and then, the foot on every beat
            [{ r: '1.111.11', hf: '1.1.1.1.', s: '...1..3.' }, 0.5],
          ],
          fills: [
            // a drag, a flam, round the toms
            [{ s: '7.6.', t2: '.2..', t3: '...2' }, 1.2],
          ],
        },
      },
      {
        key: 'joshua',
        title: 'Joshua',
        feel: 'phrases in threes running across the bar line (record 290–310)',
        weight: 0.7,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [210, 250],
          swing: 24,
          swingRange: [16, 32],
          crossRhythm: 0.4,
          crossRhythms: [[{ every: 6, lanes: { s: 3 } }, 1]],
          figures: [
            [{ r: '1.1.1.1.', s: '3.....3.', k: '....2...' }, 2],
            // now and then, the foot on every beat
            [{ r: '1.1.1.1.', hf: '1.1.1.1.', s: '3.....3.', k: '....2...' }, 0.5],
          ],
          fills: [[{ s: '3.1.3.', t3: '.2...2' }, 1.2]],
        },
      },
      {
        key: 'autumn-leaves',
        title: 'Autumn Leaves',
        feel: 'live in Berlin: in and out of two, then implied double time (record 210–230)',
        weight: 0.7,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [190, 220],
          swing: 42,
          swingRange: [34, 50],
          figures: [
            [{ r: '1.111.11', s: '.1..1..3', k: '.....2..' }, 2],
            [{ r: '1.1.1.1.', k: '1...1...' }, 1.0],
            // now and then, the foot on every beat
            [{ r: '1.111.11', hf: '1.1.1.1.', s: '.1..1..3', k: '.....2..' }, 0.5],
          ],
          fills: [[{ s: '1.3.', t3: '.2.2' }, 1.2]],
        },
      },
      {
        key: 'madness',
        title: 'Madness',
        feel: 'broken time: the ride in pieces, the snare and the kick answering the horns (record 250–270)',
        weight: 0.9,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [200, 240],
          swing: 24,
          swingRange: [16, 32],
          figures: [
            [{ r: '1..1.1..', s: '.3...5..', k: '..2....2' }, 2],
            [{ r: '1.111.11', s: '...1..3.' }, 1.0],
            // now and then, the foot on every beat
            [{ r: '1..1.1..', hf: '1.1.1.1.', s: '.3...5..', k: '..2....2' }, 0.5],
          ],
          fills: [[{ s: '3.13', t1: '.2..' }, 1.2]],
        },
      },
      {
        key: 'limbo',
        title: 'Limbo',
        feel: 'a fast three over four: the cymbal in dotted quarters against the foot (record 236–256)',
        weight: 0.6,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [200, 236],
          swing: 18,
          swingRange: [10, 26],
          crossRhythm: 0.4,
          crossRhythms: [[{ every: 3, lanes: { c: 1 }, bars: 2 }, 1]],
          figures: [
            [{ r: '1..1..1.', k: '1...1...', s: '.1..1.4.' }, 2],
            // now and then, the foot on every beat
            [{ r: '1..1..1.', hf: '1.1.1.1.', k: '1...1...', s: '.1..1.4.' }, 0.5],
          ],
          fills: [
            // dotted quarters: the fast three
            [{ s: '3..3..3.' }, 1.2],
          ],
        },
      },
      {
        key: 'citadel',
        title: 'Citadel',
        feel: 'the 1980s quintet: hard bop, big rimshots, the foot back on 2 and 4 (record 290–310)',
        weight: 0.7,
        params: {
          swingCurve: true,
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.4,
          ghostHit: 0.6,
          bpm: [210, 250],
          swing: 30,
          swingRange: [22, 38],
          figures: [[{ r: '1.111.11', hf: '..1...1.', s: '...5..1.', k: '.2......' }, 2]],
          fills: [[{ k: '2.2.', s: '.3.3' }, 1.2]],
        },
      },
      {
        key: 'nefertiti',
        title: 'Nefertiti',
        feel: 'the horns repeat the tune and the drums are the soloist: press rolls and swells',
        weight: 1.1,
        params: {
          swingCurve: true,
          backbeats: [4, 12],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 3,
          ghostWeights: { 2: 0.3, 6: 0.3, 10: 0.3, 14: 0.3 },
          ghostBias: 0.8,
          swingUnit: 8,
          bpm: [76, 88],
          swing: 60,
          swingRange: [50, 70],
          midFills: 0.5,
          crossRhythm: 0.3,
          crossRhythms: [[{ every: 6, lanes: { c: 1, k: 2 }, bars: 2 }, 1]],
          figures: [
            [
              {
                r: '1...1.1.1...1.1.',
                hf: '....1.......1...',
                s: '..1...8.8...1.3.',
                k: '..........2.....',
              },
              2,
            ],
            [
              {
                r: '1...1.1.1...1.1.',
                hf: '....1.......1...',
                s: '......1.......1.',
                k: '1.......2.......',
              },
              1.2,
            ],
          ],
          fills: [
            // a crescendo roll across the bar
            [{ c: '...............1', s: '1.1.2.2.3.3.8.3.' }, 1.2],
            [{ s: '8.8.3.', k: '.....2' }, 1.0],
          ],
        },
      },
      {
        key: 'my-funny-valentine',
        title: 'My Funny Valentine',
        feel: 'the live ballad on brushes: whispered, then a sudden swell',
        weight: 0.8,
        params: {
          swingCurve: true,
          backbeats: [4, 12],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 3,
          ghostWeights: { 2: 0.3, 6: 0.3, 10: 0.3, 14: 0.3 },
          ghostBias: 0.4,
          swingUnit: 8,
          bpm: [56, 66],
          swing: 84,
          swingRange: [74, 94],
          kit: 'brush',
          rimshot: 0,
          figures: [
            [{ s: '1.1.1.1.1.1.1.1.', hf: '....1.......1...', k: '1...............' }, 2],
            [{ s: '1...1.1.1...1.1.', hf: '....1.......1...' }, 1.2],
          ],
          fills: [[{ s: '1.1.1.3.' }, 1.0]],
        },
      },
      {
        key: 'freedom-jazz-dance',
        title: 'Freedom Jazz Dance',
        feel: 'between swing and straight, rimshots answering a jagged line',
        weight: 0.7,
        params: {
          swingCurve: true,
          backbeats: [4, 12],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 3,
          ghostWeights: { 2: 0.3, 6: 0.3, 10: 0.3, 14: 0.3 },
          ghostBias: 0.8,
          swingUnit: 8,
          bpm: [176, 190],
          swing: 24,
          swingRange: [14, 34],
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                hf: '....1.......1...',
                s: '...1..5....1..3.',
                k: '1.......2.......',
              },
              2,
            ],
          ],
          fills: [[{ s: '5..5..3.', k: '.2..2...' }, 1.2]],
        },
      },
      {
        key: 'frankenstein',
        title: 'Frankenstein',
        feel: 'a jazz waltz with Jackie McLean: hemiolas, the ride across the bar line',
        weight: 0.6,
        params: {
          swingCurve: true,
          meter: '3/4',
          backbeats: [4, 8],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          swingUnit: 8,
          ghostWeights: { 2: 0.34, 6: 0.4, 10: 0.4 },
          ghostBias: 0.9,
          bpm: [156, 174],
          swing: 72,
          swingRange: [62, 82],
          figures: [
            [{ r: '1...1.1.1...', hf: '....1.......', s: '......1...3.', k: '1...........' }, 2],
            [{ c: '1.....1.....', k: '1.....1.....', hf: '....1...1...' }, 0.6],
          ],
          fills: [
            // two against three
            [{ s: '3.....3.....', t2: '..2.....2...', t3: '....2.....2.' }, 1.2],
          ],
        },
      },
      {
        key: 'pee-wee',
        title: 'Pee Wee',
        feel: 'his own waltz with Miles: brushes first, broad swells',
        weight: 0.6,
        params: {
          swingCurve: true,
          meter: '3/4',
          backbeats: [4, 8],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          swingUnit: 8,
          ghostWeights: { 2: 0.34, 6: 0.4, 10: 0.4 },
          ghostBias: 0.9,
          bpm: [116, 132],
          swing: 78,
          swingRange: [68, 88],
          kit: 'brush',
          figures: [
            [{ s: '1...1.1.1...', hf: '....1...1...', k: '1...........' }, 2],
            [{ r: '1...1.1.1...', hf: '....1...1...', s: '..1.......1.', k: '1...........' }, 1.2],
          ],
          fills: [[{ s: '1.3.3.', c: '.....1' }, 1.2]],
        },
      },
      {
        key: 'circle',
        title: 'Circle',
        feel: 'a soft brushed waltz ballad',
        weight: 0.5,
        params: {
          swingCurve: true,
          meter: '3/4',
          backbeats: [4, 8],
          backbeatLane: 'hf',
          fill: 'comp',
          fillComps: 2,
          swingUnit: 8,
          ghostWeights: { 2: 0.34, 6: 0.4, 10: 0.4 },
          ghostBias: 0.9,
          bpm: [92, 108],
          swing: 78,
          swingRange: [68, 88],
          kit: 'brush',
          rimshot: 0,
          figures: [[{ s: '1...1.1.1...', hf: '....1.......', k: '1...........' }, 2]],
          fills: [[{ s: '1.1.11' }, 1.0]],
        },
      },
      {
        key: 'footprints',
        title: 'Footprints',
        feel: '6/4 played as 12/8, floating between three and four',
        weight: 0.8,
        params: {
          meter: '12/8',
          backbeats: [6, 18],
          backbeatLane: 'hf',
          bpm: [140, 160],
          swing: 0,
          ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
          fill: 'comp',
          fillComps: 2,
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                k: '1.....................1.',
                s: '......4...........4.....',
                hf: '......1...........1.....',
              },
              2,
            ],
            [
              {
                r: '1...1...1...1...1...1...',
                k: '1.......................',
                hf: '......1...........1.....',
              },
              1.0,
            ],
          ],
          fills: [[{ s: '1.1.3.....3.', t3: '......2.2...' }, 1.2]],
        },
      },
      {
        key: 'cantaloupe-island',
        title: 'Cantaloupe Island',
        feel: 'a straight groove with the foot on every beat, the kick answering the piano',
        weight: 1.1,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.4,
          bpm: [110, 120],
          crossStick: true,
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                hf: '1...1...1...1...',
                k: '1.....1.1.....1.',
                s: '....4.......4...',
              },
              2,
            ],
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                hf: '1...1...1...1...',
                k: '1.....1.........',
                s: '..1.4.......4.1.',
              },
              1.0,
            ],
          ],
          fills: [
            // the tom, then the snare (on the record the tom is buzzed, which a tom here cannot be)
            [{ t1: '22..', s: '..33' }, 1.2],
            [{ s: '1.3.3.', t3: '.....2' }, 1.0],
          ],
        },
      },
      {
        key: 'maiden-voyage',
        title: 'Maiden Voyage',
        feel: 'modal and straight: the kick with the piano, a cross-stick on 4, cymbal swells',
        weight: 1.0,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.4,
          bpm: [124, 136],
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                k: '1.....1.........',
                s: '............4...',
                hf: '....1.......1...',
              },
              2,
            ],
            [
              {
                r: '1...1...1...1...',
                k: '1.....1.........',
                s: '............4...',
                hf: '....1.......1...',
              },
              1.0,
            ],
          ],
          fills: [
            // the ride swelling into the next phrase
            [{ r: '..1.1.11', t3: '1.......', s: '....4...' }, 1.2],
          ],
        },
      },
      {
        key: 'masqualero',
        title: 'Masqualero',
        feel: 'straight 8ths, Spanish and modal, the toms in fills',
        weight: 0.7,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.4,
          bpm: [126, 140],
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                k: '1.....1.........',
                s: '........4.....1.',
                hf: '....1.......1...',
              },
              2,
            ],
          ],
          fills: [[{ t1: '1.1.....', t2: '....1.1.', t3: '.......2' }, 1.2]],
        },
      },
      {
        key: 'prince-of-darkness',
        title: 'Prince of Darkness',
        feel: 'a samba played straight and open, accents on the band hits (record 230–248)',
        weight: 0.7,
        params: {
          backbeats: [2, 6],
          swing: 0,
          ghostBias: 0.4,
          bpm: [200, 236],
          meter: '4/4-8',
          figures: [[{ r: '1.1.1.1.', k: '1...1...', s: '...4..4.', hf: '..1...1.' }, 2]],
          fills: [[{ s: '1.33', c: '...1' }, 1.0]],
        },
      },
      {
        key: 'stuff',
        title: 'Stuff',
        feel: 'Miles goes electric: a straight R&B backbeat on a long vamp',
        weight: 0.7,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.4,
          bpm: [104, 116],
          figures: [[{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1...1.....' }, 2]],
          fills: [[{ s: '33..', t3: '..22' }, 1.2]],
        },
      },
      {
        key: 'frelon-brun',
        title: 'Frelon Brun',
        feel: 'straight-8th funk: a busy ride, ghosted snare, syncopated kick',
        weight: 0.7,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.6,
          bpm: [144, 156],
          figures: [[{ r: '1.1.1.1.1.1.1.1.', s: '..1.3..1..1.3...', k: '1.....1...1...1.' }, 2]],
          fills: [[{ s: '3.13' }, 1.0]],
        },
      },
      {
        key: 'in-a-silent-way',
        title: 'Shhh/Peaceful',
        feel: 'In a Silent Way: sticks on a closed hi-hat, hardly a kick',
        weight: 0.7,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0,
          bpm: [124, 136],
          midFills: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '............4...' }, 2],
            [{ h: '1111111111111111', s: '............4...' }, 1.0],
          ],
          fills: [
            // a half-open hat on the "and" of 4
            [{ h: '...4', s: '4...' }, 1.0],
          ],
        },
      },
      {
        key: 'sister-cheryl',
        title: 'Sister Cheryl',
        feel: 'the 1980s quintet: a pretty medium groove, near straight, cross-stick on 4',
        weight: 0.6,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.4,
          bpm: [114, 126],
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                s: '............4...',
                k: '1.....1.........',
                hf: '....1.......1...',
              },
              2,
            ],
          ],
          fills: [[{ s: '1.3.3.', t3: '.....2' }, 1.0]],
        },
      },
      {
        key: 'emergency',
        title: 'Emergency!',
        feel: 'Lifetime, 1969: jazz-rock, a ride and crash wash, the drums doubling the riffs',
        weight: 0.9,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.3,
          kit: 'drs',
          rimshot: 0.5,
          bpm: [150, 170],
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                s: '....3..1....3.1.',
                k: '1..1....1.1.....',
                hf: '....1.......1...',
              },
              2,
            ],
            [
              {
                c: '1.......1.......',
                r: '..1.1.1...1.1.1.',
                s: '....3.......3...',
                k: '1..1....1.1.....',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '33.33.33', t3: '...2...2' }, 1.2],
            [{ s: '3.3.', t1: '.2..', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'red-alert',
        title: 'Red Alert',
        feel: 'New Lifetime, 1975: a pounding kick like a heartbeat under the unison riff',
        weight: 0.8,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.3,
          kit: 'drs',
          rimshot: 0.5,
          bpm: [144, 156],
          figures: [
            [
              {
                c: '1...............',
                r: '..1.1.1.1.1.1.1.',
                s: '....3.......3...',
                k: '1.1.1.1.1.1.1.1.',
              },
              2,
            ],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.1.1.1.1.1.1.1.' }, 1.0],
          ],
          fills: [[{ s: '11..3.', t1: '..2...', t3: '...2..', k: '.....2' }, 1.2]],
        },
      },
      {
        key: 'fred',
        title: 'Fred',
        feel: 'New Lifetime fusion: open hats in 8ths, then the ride and a busier kick',
        weight: 0.8,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.3,
          kit: 'drs',
          rimshot: 0.5,
          bpm: [140, 150],
          halfOpen: 0.3,
          figures: [
            [{ h: '3.3.3.3.3.3.3.3.', s: '....2....2..2...', k: '1.....1...1.....' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1..1...11..1...1' }, 1.2],
          ],
          fills: [
            [{ s: '2.22' }, 1.0],
            [{ s: '33..', t1: '..2.', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'snake-oil',
        title: 'Snake Oil',
        feel: 'New Lifetime funk, with odd bars dropped in',
        weight: 0.6,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.3,
          kit: 'drs',
          rimshot: 0.5,
          bpm: [98, 108],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1......11.......' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.....1.2...', k: '1......11...1...' }, 1.0],
          ],
          fills: [
            [{ s: '....2.......2.2.', k: '1...1..11...1...' }, 0.8],
            [{ s: '2.22' }, 1.0],
          ],
        },
      },
      {
        key: 'rise',
        title: 'Rise',
        feel: 'with Public Image Ltd, 1986: a fat straight backbeat',
        weight: 0.5,
        params: {
          backbeats: [4, 12],
          swing: 0,
          ghostBias: 0.3,
          kit: 'drs',
          rimshot: 0.5,
          bpm: [112, 122],
          figures: [[{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 2]],
          fills: [[{ s: '33..', t3: '..22' }, 1.0]],
        },
      },
      {
        key: 'out-to-lunch',
        title: 'Out to Lunch',
        feel: 'time suspended: the ride drops out, press-roll swells, cymbals off the beat',
        weight: 0.6,
        params: {
          meter: '4/4-8',
          backbeats: [2, 6],
          backbeatLane: 'hf',
          bpm: [190, 210],
          swing: 24,
          swingRange: [16, 32],
          ghostBias: 0.6,
          fill: 'comp',
          fillComps: 2,
          figures: [[{ r: '1..1.1..', s: '.1.8..3.', k: '....2...', hf: '..1...1.' }, 2]],
          fills: [[{ s: '8.83', c: '...1' }, 1.2]],
        },
      },
    ],
  },
  ringo: {
    label: 'Ringo Starr',
    drummer: true,
    hint: 'The Beatles: a left-hander on a right-handed kit, so his fills come off the floor tom and start late, and a feel just behind the beat. Washy half-open hats in 1963–64, the crash-ride from 1965, tea towels over the drums by 1968, and parts so made for the song you can name it from the drums alone. Each New plays a style inspired by one of forty-four of his songs, in its own time: She Loves You, Ticket to Ride, Rain, Tomorrow Never Knows, A Day in the Life, Come Together, The End. Songs that change meter are split by section. Most grooves follow human drum transcriptions; approximations, not the records.',
    toms: true,
    kit: 'sixties',
    hats: 8,
    bpm: [70, 190],
    swing: 0,
    ghostBias: 0.3,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 8,
    halfOpen: 0.6,
    rimshot: 0.2,
    midFills: 0.35,
    anticipate: 0.2,
    // a left-hander leading from the floor tom (AP, 2024: "I can only come from the floor tom around")
    fillOrder: ['t3', 't1', 't2'],
    // just behind the beat, the band moving as one with no click
    feel: { label: 'Behind', s: 0.06, sGhost: 0.04, h: [0, 0.03], jitter: 0.03 },
    forceKick: [0],
    kick1: [
      ['1000', 3],
      ['1010', 2],
      ['1001', 1],
    ],
    kick: [
      ['1010', 1.5],
      ['0010', 1.5],
      ['1000', 1.2],
      ['0000', 1],
    ],
    figures: [
      [{ h: '4.4.4.4.4.4.4.4.', k: '1.....1.1.......', s: '....2.......2...' }, 2],
      [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1...1.', s: '....2.......2...' }, 1.4],
      [{ c: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 1.0],
      [{ t3: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 0.8],
    ],
    fills: [
      // Drumeo's Ringo formula: two 16ths, a rest, then a run, into the tom
      [{ s: '22.22...', t1: '.....11.', t3: '.......2' }, 1.4],
      // floor tom, then snare: he comes off the floor
      [{ t3: '22..', s: '..22' }, 1.2],
      // skipping a drum, in threes
      [{ t3: '2.2..2', s: '.2..2.' }, 1.0],
      // flams into the crash
      [{ s: '6.6.', t3: '...2' }, 1.0],
      // a short one that starts late
      [{ s: '22.22' }, 1.0],
    ],
    /* His songs. Grooves follow one transcriber's human Songsterr drum tabs
       (ids in planning/drumming-research.md, section H), tempos from the tabs
       and Wikipedia; the rest are reconstructions. */
    songs: [
      {
        key: 'love-me-do',
        title: 'Love Me Do',
        feel: 'the 1962 single, Ringo on it: a light swing, the hat half open on 2 and 4',
        weight: 0.7,
        params: {
          bpm: [136, 146],
          swingUnit: 8,
          swing: 60,
          swingRange: [36, 78],
          figures: [[{ h: '....4.......4...', k: '1.....1.1.......', s: '....2.......2...' }, 2]],
        },
      },
      {
        key: 'please-please-me',
        title: 'Please Please Me',
        feel: 'the ride in 8ths, the snare picking up the "and" of 2, stops where only the ride goes on',
        weight: 0.8,
        params: {
          bpm: [132, 142],
          swing: 0,
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.2.....2...' }, 2],
            // the stop bars
            [{ r: '1.....1...1.1.1.', k: '1.....1.........', s: '...22.......2.2.' }, 0.8],
          ],
          fills: [
            // a whole bar of 8ths, the floor tom under the snare
            [{ s: '..2.2.2.2.22.22.', t3: '..1.1.1.1.......' }, 1.0],
          ],
        },
      },
      {
        key: 'she-loves-you',
        title: 'She Loves You',
        feel: 'a floor-tom tumble, the floor tom driving the verse, washy hats in the chorus',
        weight: 1.2,
        params: {
          bpm: [146, 156],
          swing: 0,
          flam: 0.4,
          figures: [
            // the verse, on the floor tom
            [{ t3: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 1.6],
            // the chorus
            [{ h: '4.4.4.4.4.4.4.4.', k: '1.....1.1.......', s: '....2.......2...' }, 1.4],
          ],
          fills: [
            // the floor-tom tumble
            [{ t3: '22.22.2.' }, 1.2],
            [{ s: '6...6.6.' }, 1.0],
          ],
        },
      },
      {
        key: 'i-want-to-hold-your-hand',
        title: 'I Want to Hold Your Hand',
        feel: 'washy 8ths, the crash landing on the "and" of 4 in the stops',
        weight: 1.0,
        params: {
          bpm: [130, 138],
          swing: 0,
          anticipate: 0.6,
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', k: '1.....1.1.......', s: '....2.......2...' }, 2],
            // the stop: the crash a beat early
            [
              {
                h: '....4.4.4.......',
                k: '1.......1.....1.',
                s: '....2.....2.2...',
                c: '..............1.',
              },
              0.7,
            ],
          ],
          fills: [
            // a bar end of 8ths, everything together
            [{ h: '4.4.4.4.', k: '1.1.1.1.', s: '2.2.2.2.' }, 1.0],
          ],
        },
      },
      {
        key: 'all-my-loving',
        title: 'All My Loving',
        feel: 'a fast shuffle on washy hats, rimshots on 2, its "and" and 4',
        weight: 0.9,
        params: {
          bpm: [150, 160],
          swingUnit: 8,
          swing: 100,
          swingRange: [90, 100],
          halfOpen: 0.7,
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', k: '1.......1.......', s: '....5.5.....5...' }, 2],
            // the bridge, every beat
            [{ h: '4.4.4.4.4.4.4.4.', k: '1...1...1...1...', s: '5...5...5...5...' }, 0.7],
          ],
        },
      },
      {
        key: 'cant-buy-me-love',
        title: "Can't Buy Me Love",
        feel: 'a fast shuffle, the floor tom carrying the intro',
        weight: 0.8,
        params: {
          bpm: [166, 176],
          swingUnit: 8,
          swing: 90,
          swingRange: [82, 100],
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', k: '1.......1.......', s: '....2.......2...' }, 2],
            // the floor-tom shuffle
            [{ t3: '1...1.1.1...1.1.', k: '1...1...1...1...', s: '....2.......2...' }, 0.7],
          ],
        },
      },
      {
        key: 'a-hard-days-night',
        title: "A Hard Day's Night",
        feel: 'washy 8ths, the kick pushing the "and" of 3 and of 4',
        weight: 1.0,
        params: {
          bpm: [134, 142],
          swing: 0,
          figures: [[{ h: '4.4.4.4.4.4.4.4.', k: '1.......1.1...1.', s: '....2.......2...' }, 2]],
        },
      },
      {
        key: 'eight-days-a-week',
        title: 'Eight Days a Week',
        feel: 'washy quarter-note hats, a light swing',
        weight: 0.7,
        params: {
          bpm: [134, 142],
          swingUnit: 8,
          swing: 60,
          swingRange: [36, 78],
          figures: [[{ h: '4...4...4...4...', k: '1.......1.......', s: '....2.......2...' }, 2]],
        },
      },
      {
        key: 'ticket-to-ride',
        title: 'Ticket to Ride',
        feel: 'the broken beat: no cymbal, a flam and the high tom where the backbeat should be',
        weight: 1.2,
        params: {
          bpm: [120, 126],
          swing: 0,
          ghostBias: 0.1,
          feel: { label: 'Elastic', s: 0.1, t1: 0.12, jitter: 0.03 },
          figures: [
            // the verse
            [{ k: '1.....1.1.......', s: '....2.....6.....', t1: '............3...' }, 2],
            // the chorus
            [{ k: '1.......1.1.....', s: '....2.......6...', t1: '..............3.' }, 1.2],
            // the bridge, a plain beat
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 0.6],
          ],
        },
      },
      {
        key: 'i-feel-fine',
        title: 'I Feel Fine',
        feel: 'two bars: a Latin-ish ride and high tom, then the cross-stick answer',
        weight: 0.8,
        params: {
          bpm: [176, 186],
          swingUnit: 8,
          swing: 72,
          swingRange: [48, 90],
          figures: [
            // two bars, the second answering the first
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.',
                k: '1.......1.....1.1.......1.1.....',
                t1: '....1.1.........................',
                s: '............4.......4.......4...',
              },
              2,
            ],
            // the late verses, cross-stick
            [{ h: '4.4.4.4.4.4.4.4.', k: '1.....1.1.......', s: '....4.......4...' }, 1.0],
          ],
        },
      },
      {
        key: 'help',
        title: 'Help!',
        feel: 'the crash-ride in 8ths, the foot on the beat',
        weight: 0.9,
        params: {
          bpm: [180, 190],
          swing: 0,
          figures: [
            [
              {
                c: '1.1.1.1.1.1.1.1.',
                hf: '1...1...1...1...',
                k: '1.......1.......',
                s: '....2.......2...',
              },
              2,
            ],
            // the verse, on the hats
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 1.0],
          ],
        },
      },
      {
        key: 'day-tripper',
        title: 'Day Tripper',
        feel: 'a driving rock beat, the bridge building on quarter notes',
        weight: 0.8,
        params: {
          bpm: [134, 142],
          swing: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.1.....1.1.....', s: '....2.......2...' }, 2],
            // the build
            [{ h: '1.1.1.1.1.1.1.1.', k: '1...1...1...1...', s: '2...2...2...2...' }, 0.6],
          ],
        },
      },
      {
        key: 'drive-my-car',
        title: 'Drive My Car',
        feel: 'a solid rock beat with a cowbell overdubbed',
        weight: 0.7,
        params: {
          bpm: [118, 126],
          swing: 0,
          perc: [{ inst: 'cowbell', every: 4 }],
          figures: [[{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1...1.', s: '....2.......2...' }, 2]],
        },
      },
      {
        key: 'in-my-life',
        title: 'In My Life',
        feel: 'one hat stroke a bar, the kick and snare saying almost everything',
        weight: 0.8,
        params: {
          bpm: [100, 106],
          swing: 0,
          ghostBias: 0.2,
          figures: [
            [{ h: '..........4.....', k: '1.....1.......1.', s: '....2.......2...' }, 2],
            // the middle eight, on the bell
            [{ r: '2...2...2...2...', k: '1.....1.......1.', s: '....2.......2...' }, 0.6],
          ],
        },
      },
      {
        key: 'rain',
        title: 'Rain',
        feel: 'his favourite: loose, a fill every other bar, the snare running into the high tom',
        weight: 1.2,
        params: {
          bpm: [108, 116],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          midFills: 0.6,
          fillsGrow: true,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1...1.', s: '....2.......2...' }, 2],
            [
              {
                c: '1...............',
                h: '..1.1.1.1.1.1.1.',
                k: '1.......1.1...1.',
                s: '....2.......2...',
              },
              1.0,
            ],
          ],
          fills: [
            // snare 16ths into the high tom, a gap in them
            [{ s: '2.22.22.', t1: '.....111' }, 1.4],
            [{ s: '22.22...', t1: '.....1.1' }, 1.2],
            // the break that starts on the hi-hat
            [
              {
                h: '1.1.1.1.4..4..4.',
                hf: '.........1..1..1',
                s: '....2....22.22..',
                k: '1...............',
              },
              0.6,
            ],
          ],
        },
      },
      {
        key: 'tomorrow-never-knows',
        title: 'Tomorrow Never Knows',
        feel: 'a one-bar loop, compressed: no snare on 4, the high tom where it would be',
        weight: 1.0,
        params: {
          bpm: [122, 130],
          swing: 0,
          kit: 'teatowel',
          midFills: 0,
          ghostBias: 0,
          perc: [{ inst: 'tamb', every: 2 }],
          figures: [
            [
              {
                c: '1.1.1.1.1.1.1.1.',
                k: '1.....1.1.......',
                s: '....5...........',
                t1: '..........11....',
              },
              2,
            ],
          ],
          fills: [[{ t1: '11..' }, 1.0]],
        },
      },
      {
        key: 'taxman',
        title: 'Taxman',
        feel: 'the kick on the "a" of 2, a cowbell, the chorus on the crash-ride',
        weight: 0.8,
        params: {
          bpm: [130, 138],
          swing: 0,
          perc: [{ inst: 'cowbell', every: 4 }],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1......11.1.....', s: '....2.......2...' }, 2],
            // the chorus
            [{ c: '1.1.1.1.1.1.1.1.', k: '1.......1.1.....', s: '....2.......2...' }, 1.0],
          ],
        },
      },
      {
        key: 'a-day-in-the-life',
        title: 'A Day in the Life',
        feel: 'slack, towel-damped toms, long silences, fills in triplets running from the floor tom',
        weight: 1.2,
        params: {
          meter: '4/4-6',
          backbeats: [6, 18],
          bpm: [76, 84],
          swing: 0,
          kit: 'teatowel',
          midFills: 0.5,
          fillsGrow: true,
          ghostBias: 0,
          figures: [
            // time, almost nothing
            [
              {
                c: '1.......................',
                k: '1.......................',
                s: '......2...........2.....',
              },
              2,
            ],
            [
              {
                t3: '1.....1.....1.....1.....',
                k: '1...........1...........',
                s: '......2...........2.....',
              },
              1.0,
            ],
          ],
          fills: [
            // triplets, floor tom then snare
            [{ t3: '111...111...', s: '...222...222' }, 1.4],
            [{ t3: '11.11.', t1: '..1..1' }, 1.0],
            [{ t3: '111.11', k: '...1..' }, 0.8],
          ],
        },
      },
      {
        key: 'penny-lane',
        title: 'Penny Lane',
        feel: 'hats on 2 and 4 only, the kick bouncing under them',
        weight: 0.7,
        params: {
          bpm: [110, 116],
          swing: 0,
          figures: [
            [{ h: '....1.......1...', k: '1.......1.1...1.', s: '....2.......2...' }, 2],
            // the last verses, ride quarters
            [{ r: '1...1...1...1...', k: '1.......1.1...1.', s: '....2.......2...' }, 0.7],
          ],
        },
      },
      {
        key: 'lucy-verse',
        title: 'Lucy in the Sky with Diamonds (verse)',
        feel: 'the verses in 3/4: the ride on the beat, the kick on 1',
        weight: 0.6,
        params: {
          meter: '3/4',
          backbeats: [4, 8],
          bpm: [122, 130],
          swing: 0,
          ghostBias: 0,
          figures: [
            [{ k: '1...........', r: '1...1...1...' }, 2],
            [{ k: '1...........', r: '1...1...1...', s: '........2...' }, 1.0],
          ],
          fills: [[{ s: '2.22', t3: '....' }, 1.0]],
        },
      },
      {
        key: 'lucy-chorus',
        title: 'Lucy in the Sky with Diamonds (chorus)',
        feel: 'the chorus in 4/4: the ride in 8ths, the foot on 2 and 4',
        weight: 0.6,
        params: {
          bpm: [122, 130],
          swing: 0,
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                hf: '....1.......1...',
                k: '1.......1.1...1.',
                s: '....2.......2...',
              },
              2,
            ],
          ],
        },
      },
      {
        key: 'getting-better',
        title: 'Getting Better',
        feel: 'four on the floor, the snare only on 2, an open hat on the "and" of 3',
        weight: 0.7,
        params: {
          bpm: [116, 122],
          swing: 0,
          figures: [
            // the verse
            [{ k: '1...1...1...1...', s: '....2...........', h: '..........3.....' }, 2],
            // the chorus
            [{ h: '1...1...1...1...', k: '1...1...1...1...', s: '....2.......2...' }, 1.0],
          ],
        },
      },
      {
        key: 'sgt-pepper',
        title: "Sgt. Pepper's Lonely Hearts Club Band",
        feel: 'the kick in 8ths under washy hats, rimshots on 2 and 4',
        weight: 0.8,
        params: {
          bpm: [96, 106],
          swing: 0,
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', k: '1.1.1.1.1.1.1.1.', s: '....5.......5...' }, 2],
            // the intro, on the floor tom
            [{ t3: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....5.......5...' }, 0.6],
          ],
        },
      },
      {
        key: 'with-a-little-help',
        title: 'With a Little Help from My Friends',
        feel: 'his own vocal: a light swing, tambourine and cowbell overdubbed',
        weight: 0.9,
        params: {
          bpm: [108, 116],
          swingUnit: 8,
          swing: 72,
          swingRange: [48, 90],
          perc: [
            { inst: 'tamb', every: 2, from: 0 },
            { inst: 'cowbell', every: 4 },
          ],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1.....', s: '....2.......2...' }, 2],
            // the chorus
            [{ h: '1...1...1...1...', k: '1.......1.1.....', s: '....2.......2...' }, 0.8],
          ],
          fills: [
            [{ s: '22.22...', t1: '.....11.', t3: '.......2' }, 1.2],
            [{ t3: '22..', s: '..22' }, 1.0],
          ],
        },
      },
      {
        key: 'good-morning',
        title: 'Good Morning Good Morning (5/4)',
        feel: 'the verse bars in 5/4, the kick and snare on every beat',
        weight: 0.5,
        params: {
          meter: '5/4',
          backbeats: [4, 12],
          bpm: [116, 122],
          swing: 0,
          ghostBias: 0,
          figures: [
            [
              { h: '1.1.1.1.1.1.1.1.1.1.', k: '1...1...1...1...1...', s: '2...2...2...2...2...' },
              2,
            ],
          ],
        },
      },
      {
        key: 'all-you-need-is-love',
        title: 'All You Need Is Love (7/4)',
        feel: 'the verse in 7/4, the snare on every beat',
        weight: 0.6,
        params: {
          meter: '7/4',
          backbeats: [4, 12],
          bpm: [94, 100],
          swing: 0,
          ghostBias: 0,
          figures: [
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '2...2...2...2...2...2...2...',
                k: '1.......1.......1...........',
              },
              2,
            ],
          ],
        },
      },
      {
        key: 'i-am-the-walrus',
        title: 'I Am the Walrus',
        feel: 'a plain beat that turns into quarter notes on kick and snare',
        weight: 0.8,
        params: {
          bpm: [78, 86],
          swing: 0,
          kit: 'teatowel',
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1...1.', s: '....2.......2...' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', k: '1...1...1...1...', s: '2...2...2...2...' }, 1.0],
          ],
        },
      },
      {
        key: 'lady-madonna',
        title: 'Lady Madonna',
        feel: 'on brushes, a shuffle under the piano',
        weight: 0.8,
        params: {
          bpm: [106, 112],
          swingUnit: 8,
          swing: 84,
          swingRange: [60, 100],
          kit: 'brush',
          rimshot: 0,
          buzz: 0,
          figures: [
            [{ k: '1.1.....1.1.....', s: '....2.......2...' }, 2],
            // the sax section, on the hats
            [{ h: '1.1.3.1.1.1.3.1.', k: '1.1.....1.1.....', s: '....2.......2...' }, 0.8],
          ],
        },
      },
      {
        key: 'hey-jude',
        title: 'Hey Jude',
        feel: 'the ride in 8ths, tambourine, big tom fills into the coda',
        weight: 1.0,
        params: {
          bpm: [72, 76],
          swing: 0,
          kit: 'teatowel',
          midFills: 0.3,
          fillsGrow: true,
          perc: [{ inst: 'tamb', every: 2 }],
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 2],
            // the coda
            [{ r: '1.1.1.1.1.1.1.1.', k: '1.1.....1.......', s: '....2.......2...' }, 1.0],
          ],
          fills: [
            // round the toms
            [{ t1: '22......', t2: '..22....', t3: '....2222' }, 1.2],
            // floor tom, then snare
            [{ t3: '22..', s: '..22' }, 1.0],
          ],
        },
      },
      {
        key: 'revolution',
        title: 'Revolution',
        feel: 'the single: a driving beat, the snare double-tracked',
        weight: 0.7,
        params: {
          bpm: [118, 124],
          swing: 0,
          kit: 'teatowel',
          figures: [[{ h: '1.1.1.1.1.1.1.1.', k: '1.1...1.1.1...1.', s: '....3.......3...' }, 2]],
        },
      },
      {
        key: 'helter-skelter',
        title: 'Helter Skelter',
        feel: 'the crash-ride in 8ths, four on the floor; blisters on his fingers',
        weight: 0.8,
        params: {
          bpm: [160, 172],
          swing: 0,
          kit: 'teatowel',
          figures: [
            [{ c: '2.2.2.2.2.2.2.2.', k: '1...1...1...1...', s: '....2.......2...' }, 2],
            [{ c: '2.2.2.2.2.2.2.2.', k: '1...1...1...1...', s: '..1.2.....1.2...' }, 1.0],
          ],
        },
      },
      {
        key: 'while-my-guitar',
        title: 'While My Guitar Gently Weeps',
        feel: 'half time: the snare only on 3',
        weight: 0.8,
        params: {
          bpm: [112, 120],
          swing: 0,
          kit: 'teatowel',
          backbeats: [8],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1...1...........', s: '........2.......' }, 2],
            // the verse, the foot only
            [{ hf: '............1...', k: '1...1...........', s: '........2.......' }, 0.6],
          ],
        },
      },
      {
        key: 'birthday',
        title: 'Birthday',
        feel: 'two bars: the kick in 8ths with the snare on the beat, then a rock beat',
        weight: 0.8,
        params: {
          bpm: [136, 142],
          swing: 0,
          kit: 'teatowel',
          figures: [
            // two bars
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.',
                k: '1.1.1.1.1.1.1.1.1.......1.1.....',
                s: '2...2...2...2.......2.......2...',
              },
              2,
            ],
            // the drum break, on the floor tom
            [{ t3: '1.1.1.1.1.1.1.1.', k: '1...1...1...1...', s: '2...2...2...2...' }, 0.6],
          ],
        },
      },
      {
        key: 'yer-blues',
        title: 'Yer Blues',
        feel: 'a slow 12/8 blues on the ride',
        weight: 0.6,
        params: {
          meter: '12/8',
          backbeats: [6, 18],
          bpm: [78, 88],
          swing: 0,
          kit: 'teatowel',
          ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                hf: '......1...........1.....',
                k: '1.........1.1...........',
                s: '......2...........2.....',
              },
              2,
            ],
          ],
          fills: [
            [{ s: '2.2.3.' }, 1.2],
            [{ t3: '2.2...', s: '....2.' }, 1.0],
          ],
        },
      },
      {
        key: 'come-together',
        title: 'Come Together',
        feel: 'the floor tom in 8ths, kick and mid tom on the beat, the "shoot" lick down the toms in triplets',
        weight: 1.2,
        params: {
          meter: '4/4-6',
          backbeats: [6, 18],
          bpm: [80, 86],
          swing: 0,
          kit: 'teatowel',
          ghostBias: 0,
          midFills: 0.3,
          figures: [
            // the verse
            [
              {
                t3: '1..1..1..1..1..1..1..1..',
                t2: '1.....1.....1.....1.....',
                k: '1.....1.....1.....1.....',
              },
              2,
            ],
            // the chorus, on the crash-ride
            [
              {
                c: '1..1..1..1..1..1..1..1..',
                k: '1..1........1...........',
                s: '......2...........2.....',
              },
              1.0,
            ],
          ],
          fills: [
            // the "shoot" lick: sextuplets falling from the high tom to the floor
            [{ t1: '1111.1......', t2: '....1..1....', t3: '......1.1...' }, 1.4],
            [{ t3: '11.11.', t2: '..1..1' }, 1.0],
          ],
        },
      },
      {
        key: 'something',
        title: 'Something',
        feel: 'a ballad: rimshots on 2 and 4, fills that start late',
        weight: 0.8,
        params: {
          bpm: [64, 70],
          swing: 0,
          kit: 'teatowel',
          rimshot: 0.8,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....5.......5...' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', k: '1.......1.1.....', s: '....5.......5...' }, 1.0],
          ],
          fills: [
            [{ s: '2.22.22.', t1: '.....11.', t3: '.......2' }, 1.2],
            [{ t3: '22..', s: '..22' }, 1.0],
          ],
        },
      },
      {
        key: 'here-comes-the-sun',
        title: 'Here Comes the Sun',
        feel: 'the verse: a bright 4/4 with the kick skipping ahead',
        weight: 0.9,
        params: {
          bpm: [126, 132],
          swing: 0,
          kit: 'teatowel',
          figures: [[{ h: '1.1.1.1.1.1.1.1.', k: '1.....1...1...1.', s: '....2.......2...' }, 2]],
        },
      },
      {
        key: 'here-comes-the-sun-bridge',
        title: 'Here Comes the Sun (bridge, 11/8)',
        feel: 'the bridge in 11/8: three, three, three and two',
        weight: 0.5,
        params: {
          meter: '11/8',
          backbeats: [6, 18],
          bpm: [126, 132],
          swing: 0,
          kit: 'teatowel',
          ghostBias: 0,
          figures: [
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.',
                k: '1...........1.........',
                s: '......2...........2...',
              },
              2,
            ],
          ],
        },
      },
      {
        key: 'octopuss-garden',
        title: "Octopus's Garden",
        feel: 'his own song: a lilting 16th swing, the bridge underwater on the floor tom',
        weight: 0.8,
        params: {
          bpm: [88, 96],
          swingUnit: 16,
          swing: 30,
          swingRange: [18, 36],
          kit: 'teatowel',
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.......', s: '....2.......2...' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1...1.', s: '....2..2.2..2...' }, 1.0],
          ],
        },
      },
      {
        key: 'oh-darling',
        title: 'Oh! Darling',
        feel: 'a 12/8 doo-wop ballad, the hats filling the triplets',
        weight: 0.6,
        params: {
          meter: '12/8',
          backbeats: [6, 18],
          bpm: [84, 92],
          swing: 0,
          kit: 'teatowel',
          ghostWeights: { 4: 0.3, 10: 0.35, 16: 0.3, 22: 0.35 },
          figures: [
            [
              {
                h: '4.1.1.1.1.1.4.1.1.1.1.1.',
                k: '1.........1.1.........1.',
                s: '......2...........2.....',
              },
              2,
            ],
          ],
          fills: [[{ s: '2.2.3.' }, 1.2]],
        },
      },
      {
        key: 'i-want-you',
        title: "I Want You (She's So Heavy)",
        feel: 'the riff in 6/8, heavy, the ride and the foot',
        weight: 0.6,
        params: {
          meter: '6/8',
          backbeats: [6],
          bpm: [76, 86],
          swing: 0,
          kit: 'teatowel',
          figures: [
            [{ r: '1.1.1.1.1.1.', hf: '......1.....', k: '1...........', s: '......2.....' }, 2],
          ],
        },
      },
      {
        key: 'the-end',
        title: 'The End',
        feel: 'his only Beatles solo: the kick in 8ths under tom 16ths',
        weight: 0.8,
        params: {
          bpm: [118, 126],
          swing: 0,
          kit: 'teatowel',
          ghostBias: 0,
          figures: [
            // the solo
            [
              {
                k: '1.1.1.1.1.1.1.1.',
                t1: '1.....1.........',
                t2: '.1.11..1.11.....',
                t3: '............11.1',
                s: '....2.......2...',
              },
              1.4,
            ],
            [
              {
                k: '1.1.1.1.1.1.1.1.',
                t3: '1.......11.11...',
                t2: '.............1.1',
                s: '....2.......2...',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'get-back',
        title: 'Get Back',
        feel: 'a train beat: the snare in 16ths, ghosts between the backbeats',
        weight: 1.0,
        params: {
          bpm: [120, 128],
          swing: 0,
          kit: 'teatowel',
          ghostBias: 0,
          figures: [
            [{ k: '1...1...1...1...', s: '2.112.112.112.11', h: '................' }, 2],
            // the chorus, on the floor tom
            [{ t3: '1.1.1.1.1.1.1.1.', k: '1...1...1...1...', s: '....2.......2...' }, 1.0],
          ],
          fills: [[{ s: '2...', t3: '..2.' }, 1.2]],
        },
      },
      {
        key: 'dont-let-me-down',
        title: "Don't Let Me Down",
        feel: 'the snare picking up the "and" of 2, the chorus a crash swell',
        weight: 0.7,
        params: {
          bpm: [76, 82],
          swing: 0,
          kit: 'teatowel',
          figures: [[{ h: '1.1.1.1.1.1.1.1.', k: '1.......1.1...1.', s: '....2.2.....2...' }, 2]],
        },
      },
    ],
  },
  tonyallen: {
    label: 'Tony Allen',
    drummer: true,
    hint: 'Fela Kuti\'s drummer, who made Afrobeat: four limbs playing like four drummers. The hi-hat foot chicks every "and", the hand plays one-and-a on the hat around the snare, the kick comes in pairs and rarely marks the 1, and the snare pops in clusters with no fixed backbeat. Hardly a fill ("I play like a machine or a loop"). Each New plays a style inspired by one of thirty-four songs: Zombie, Water No Get Enemy, Expensive Shit, Lady, Gentleman, and his own later records. Built on the five patterns he demonstrated himself; the song grooves are variations of them, not transcriptions.',
    toms: true,
    kit: 'smdrums',
    hats: 16,
    bpm: [84, 136],
    swingUnit: 16,
    swing: 15,
    swingRange: [9, 21],
    ghostBias: 0,
    opens: 0,
    backbeats: [6, 14],
    foot: [2, 6, 10, 14],
    targetDensity: 9,
    hatDepth: 0.6,
    rimshot: 0,
    midFills: 0,
    // the 1 is left to the figure, and a fill ends the phrase a fifth of the time
    phraseMark: { crash: false, kick: false },
    fillChance: 0.2,
    // relaxed, a touch behind
    feel: { label: 'Relaxed', s: 0.05, sGhost: 0.03, h: [0, 0.03], hf: 0.02, jitter: 0.02 },
    kick1: [
      ['1100', 3],
      ['0001', 1.5],
      ['0011', 1.2],
    ],
    kick: [
      ['1100', 2],
      ['0000', 1.5],
      ['0011', 1],
      ['0010', 0.8],
    ],
    /* His five patterns, from his own demonstration in the Birth of Afrobeat
       footage, transcribed by Sébastien Poitevin; the first agrees with Joe
       Ospalla's transcription. See planning/drumming-research.md, section I. */
    figures: [
      // his first pattern
      [
        {
          h: '1.1.1.111.111.11',
          hf: '..1...1...1...1.',
          k: '11......11......',
          s: '...2.12.....122.',
        },
        2,
      ],
      // snare on one
      [
        {
          h: '1.1.1.111.111.11',
          hf: '..1...1...1...1.',
          k: '...1..1.......1.',
          s: '21...2..21...2..',
        },
        1.4,
      ],
      // floating
      [
        {
          h: '1.1.141.1.1.1.11',
          hf: '..1...1...1...1.',
          k: '...11......11...',
          s: '21.....2.21.....',
        },
        1.4,
      ],
      // double kicks
      [
        {
          h: '1.1.111.14111.1.',
          hf: '..1...1...1...1.',
          k: '11..1...11......',
          s: '..12..2.....12.2',
        },
        1.2,
      ],
      // the buzz
      [
        {
          h: '1.1.141.1.111.11',
          hf: '..1...1...1...1.',
          k: '11......11......',
          s: '...2..22....8..2',
        },
        1.0,
      ],
    ],
    fills: [
      // short pickups, a 16th or two on the snare
      [{ s: '.22' }, 1.2],
      [{ s: '2.12' }, 1.0],
      // a buzz into the next bar
      [{ s: '8..2' }, 0.8],
      // the toms like congas
      [{ t2: '.1.', t3: '1.1' }, 0.8],
    ],
    songs: [
      {
        key: 'jeun-ko-ku',
        title: 'Jeun Ko Ku (Chop and Quench)',
        feel: 'the early, James Brown-flavoured Afrobeat: his first pattern with a firmer 2 and 4',
        weight: 0.8,
        params: {
          bpm: [120, 128],
          swingUnit: 16,
          swing: 6,
          swingRange: [0, 12],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '....2..1....2.1.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'black-mans-cry',
        title: "Black Man's Cry",
        feel: 'live in 1971, his first pattern, a floor tom answering like a conga',
        weight: 0.7,
        params: {
          bpm: [116, 124],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
                t3: '......1.......1.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'buy-africa',
        title: 'Buy Africa',
        feel: 'slow and roomy, floating',
        weight: 0.6,
        params: {
          bpm: [84, 90],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'why-black-man-dey-suffer',
        title: 'Why Black Man Dey Suffer',
        feel: 'snare on one, the kick never there',
        weight: 0.7,
        params: {
          bpm: [90, 96],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'open-and-close',
        title: 'Open & Close',
        feel: 'his first pattern under the dance the song is named for',
        weight: 0.7,
        params: {
          bpm: [102, 110],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2..22....8..2',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'lady',
        title: 'Lady',
        feel: 'double kicks, played softly',
        weight: 0.9,
        params: {
          bpm: [104, 110],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'shakara',
        title: 'Shakara',
        feel: 'snare on one, the hat foot on every "and"',
        weight: 0.8,
        params: {
          bpm: [116, 124],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'roforofo-fight',
        title: 'Roforofo Fight',
        feel: 'his first pattern with a kick pickup on the "and" of 4',
        weight: 0.8,
        params: {
          bpm: [120, 128],
          swingUnit: 16,
          swing: 9,
          swingRange: [3, 15],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11....1.',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'go-slow',
        title: 'Go Slow',
        feel: 'the heavy traffic feel: floating, half-open hats',
        weight: 0.7,
        params: {
          bpm: [92, 98],
          swingUnit: 16,
          swing: 18,
          swingRange: [12, 24],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.141.1.1.1411',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'alu-jon-jonki-jon',
        title: 'Alu Jon Jonki Jon',
        feel: 'his first pattern with the toms talking like congas',
        weight: 0.6,
        params: {
          bpm: [108, 116],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
                t2: '.....1........1.',
                t3: '.......1...1....',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'gentleman',
        title: 'Gentleman',
        feel: 'slow and floating, the drums coming in sparse under the saxophone',
        weight: 0.9,
        params: {
          bpm: [84, 90],
          swingUnit: 16,
          swing: 21,
          swingRange: [15, 27],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              2,
            ],
            // sparer
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '.......2.2......',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'expensive-shit',
        title: 'Expensive Shit',
        feel: 'two bars: his first pattern, then the kick and snare answering it',
        weight: 1.0,
        params: {
          bpm: [121, 129],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            // two bars
            [
              {
                h: '1.1.1.111.111.111.1.1.111.111.11',
                hf: '..1...1...1...1...1...1...1...1.',
                k: '11......11......11......11.1..1.',
                s: '...2.12.....122....2.22..1..2.2.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'he-miss-road',
        title: 'He Miss Road',
        feel: 'snare on one',
        weight: 0.6,
        params: {
          bpm: [96, 102],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              2,
            ],
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'water-no-get-enemy',
        title: 'Water No Get Enemy',
        feel: 'the liquid shuffle: 8ths on the hat, the kick in pairs',
        weight: 1.1,
        params: {
          bpm: [88, 96],
          swingUnit: 16,
          swing: 36,
          swingRange: [30, 42],
          kit: 'smdrums',
          figures: [
            // from a human transcription
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                hf: '..1...1...1...1.',
                k: '11..11..11.1..1.',
                s: '...2...2.....2..',
              },
              2,
            ],
            // the intro, the foot on the beat
            [{ hf: '1...1...1...1...', k: '11..11..11.1..1.', s: '...2...2.....2..' }, 0.5],
          ],
        },
      },
      {
        key: 'upside-down',
        title: 'Upside Down',
        feel: 'snare on one',
        weight: 0.6,
        params: {
          bpm: [114, 122],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'yellow-fever',
        title: 'Yellow Fever',
        feel: 'the buzz on 4',
        weight: 0.8,
        params: {
          bpm: [100, 108],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.141.1.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2..22....8..2',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'mr-follow-follow',
        title: 'Mr Follow Follow',
        feel: 'floating',
        weight: 0.6,
        params: {
          bpm: [88, 94],
          swingUnit: 16,
          swing: 18,
          swingRange: [12, 24],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2..22....8..2',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'ikoyi-blindness',
        title: 'Ikoyi Blindness',
        feel: 'a firm kick on 1 and 3, soft ones just after 2 and 4',
        weight: 0.6,
        params: {
          bpm: [119, 127],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '2....1..2....1..',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'zombie',
        title: 'Zombie',
        feel: 'fast, two bars, the second ending in a mock military march',
        weight: 1.2,
        params: {
          bpm: [128, 136],
          swingUnit: 16,
          swing: 9,
          swingRange: [3, 15],
          kit: 'smdrums',
          figures: [
            // two bars
            [
              {
                h: '1.1.1.111.111.111.1.1.111.111.11',
                hf: '..1...1...1...1...1...1...1...1.',
                k: '11......11......11......1..1....',
                s: '...2.12.....122....2.22.....3.33',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'sorrow-tears-and-blood',
        title: 'Sorrow Tears and Blood',
        feel: 'his first pattern',
        weight: 0.7,
        params: {
          bpm: [98, 104],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'no-agreement',
        title: 'No Agreement',
        feel: 'his first pattern, the variations sparse and never where you expect',
        weight: 0.7,
        params: {
          bpm: [96, 104],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'opposite-people',
        title: 'Opposite People',
        feel: 'double kicks',
        weight: 0.6,
        params: {
          bpm: [114, 122],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'fear-not-for-man',
        title: 'Fear Not for Man',
        feel: 'the buzz',
        weight: 0.6,
        params: {
          bpm: [100, 106],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.141.1.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2..22....8..2',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'african-message',
        title: 'African Message',
        feel: "his own band, 1979: floating kicks under his first pattern's snare",
        weight: 0.6,
        params: {
          bpm: [114, 122],
          swingUnit: 16,
          swing: 15,
          swingRange: [9, 21],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'nepa',
        title: 'N.E.P.A.',
        feel: 'the electro-boogie of 1985: straighter, every 16th on the hat',
        weight: 0.6,
        params: {
          bpm: [104, 112],
          swingUnit: 16,
          swing: 6,
          swingRange: [0, 12],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1111211111112111',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.6,
            ],
          ],
        },
      },
      {
        key: 'asiko',
        title: 'Asiko (In a Hurry)',
        feel: 'Black Voices, 1999: dub, the drums skittering',
        weight: 0.6,
        params: {
          bpm: [116, 124],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'gogodze',
          figures: [
            // sparse
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '2......1.2......',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'home-cooking',
        title: 'Home Cooking',
        feel: 'snare on one, with hip-hop around it',
        weight: 0.5,
        params: {
          bpm: [114, 122],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'gogodze',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'secret-agent',
        title: 'Secret Agent',
        feel: 'double kicks',
        weight: 0.5,
        params: {
          bpm: [116, 124],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          figures: [
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2..22....8..2',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'moody-boy',
        title: 'Moody Boy',
        feel: 'The Source, 2017: a big band around snare on one',
        weight: 0.6,
        params: {
          bpm: [116, 124],
          swingUnit: 16,
          swing: 18,
          swingRange: [12, 24],
          kit: 'drs',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'moanin',
        title: "Moanin'",
        feel: 'the Art Blakey tribute: a shuffle on the hat, kick on 1 and its "e"',
        weight: 0.7,
        params: {
          bpm: [92, 98],
          swingUnit: 8,
          swing: 84,
          swingRange: [78, 90],
          kit: 'virtuosity',
          figures: [
            [
              {
                h: '1.111.111.111.11',
                hf: '..1...1...1...1.',
                k: '11..............',
                s: '.......2......2.',
              },
              2,
            ],
            [
              {
                h: '1.111.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '.......2......2.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'night-in-tunisia',
        title: 'A Night in Tunisia',
        feel: 'Blakey\'s floor-tom ostinato, the foot on every "and"',
        weight: 0.6,
        params: {
          bpm: [94, 100],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'virtuosity',
          figures: [
            [
              {
                h: '1...1...1...1...',
                hf: '..1...1...1...1.',
                k: '1.......1.......',
                t3: '1..1..1.1..1..1.',
              },
              2,
            ],
            [
              {
                hf: '..1...1...1...1.',
                k: '1.......1.......',
                s: '............2...',
                t3: '1..1..1.1..1..1.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'kingdom-of-doom',
        title: 'Kingdom of Doom',
        feel: 'The Good, the Bad & the Queen: restrained, floating, the snare on the rim',
        weight: 0.6,
        params: {
          bpm: [130, 138],
          swingUnit: 16,
          swing: 12,
          swingRange: [6, 18],
          kit: 'drs',
          figures: [
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '44.....4.44.....',
              },
              2,
            ],
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'go-back',
        title: 'Go Back',
        feel: 'Film of Life, 2014: slow and floating',
        weight: 0.5,
        params: {
          bpm: [80, 84],
          swingUnit: 16,
          swing: 18,
          swingRange: [12, 24],
          figures: [
            [
              {
                h: '1.1.141.1.1.1.11',
                hf: '..1...1...1...1.',
                k: '...11......11...',
                s: '21.....2.21.....',
              },
              2,
            ],
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '...1..1.......1.',
                s: '21...2..21...2..',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'locked-and-loaded',
        title: 'Locked & Loaded',
        feel: "with Jeff Mills, 2018: his first pattern on his own kit, Mills's 909 beside him",
        weight: 0.5,
        params: {
          bpm: [122, 128],
          swingUnit: 16,
          swing: 9,
          swingRange: [3, 15],
          kit: 'smdrums',
          figures: [
            [
              {
                h: '1.1.1.111.111.11',
                hf: '..1...1...1...1.',
                k: '11......11......',
                s: '...2.12.....122.',
              },
              2,
            ],
            [
              {
                h: '1.1.111.14111.1.',
                hf: '..1...1...1...1.',
                k: '11..1...11......',
                s: '..12..2.....12.2',
              },
              1.0,
            ],
          ],
        },
      },
    ],
  },
  copeland: {
    label: 'Stewart Copeland',
    drummer: true,
    hint: 'The Police: a reggae drummer in a punk band. The kick stays off the 1, a cross-stick drops on 3, the backbeat goes to 4 alone or nowhere, and the hi-hat does the talking: accents, little 16th bursts, a bark on the "and" of 4. Verses go sparse and choruses go to rock, often on the ride bell. Few fills, short and often over before the bar line, with a splash on the "and" of 4 instead of a crash on 1. Each New plays a style inspired by one of forty-one songs, from Fall Out to Synchronicity, most from human transcriptions, at its record tempo (some up to their live speed).',
    toms: true,
    kit: 'police',
    hats: 8,
    bpm: [80, 200],
    swingUnit: 16,
    swing: 0,
    ghostBias: 0.1,
    opens: 1,
    openSlots: [14, 6],
    backbeats: [4, 12],
    targetDensity: 9,
    hatDepth: 0.9,
    rimshot: 0.2,
    // on top of the beat: the backbeat a shade early, the hats leaning with it
    feel: { label: 'On top', s: -0.04, k: -0.02, h: [-0.02, 0], jitter: 0.01 },
    /* A verse that goes sparse and a chorus that goes to rock: the busier
       figure second, every phrase. */
    build: true,
    // a third of his 1s carry a crash, and a fill ends a phrase a third of the time
    phraseMark: { crash: 0.35 },
    fillChance: 0.35,
    midFills: 0,
    // the cymbal comes early, on a splash, and the next 1 is left bare
    anticipate: 0.3,
    anticipateCymbal: 4,
    kick1: [
      ['0010', 2],
      ['0000', 1],
      ['1010', 1],
    ],
    kick: [
      ['0010', 2],
      ['1000', 1],
      ['0000', 1],
    ],
    /* His signature grooves, from human Songsterr transcriptions checked
       against Joe Bergamini's book. See planning/drumming-research.md,
       section J. */
    figures: [
      // Roxanne, the verse: the kick on the "and" of 1, the bark on the "and" of 4
      [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '..1.............' }, 1.5],
      // King of Pain, the verse: the kick on every "and", never on 1
      [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '..1...1...1...1.' }, 1.2],
      // Walking on the Moon: kick on 2 and 4, a cross-stick on 3
      [{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '....1.......1...' }, 1.2],
      // Wrapped Around Your Finger: the backbeat on 4 alone, a rim click
      [{ h: '1.1.1.1.1...1...', s: '............4...', k: '......1.1.......' }, 1.0],
      // the rock chorus he flips to
      [{ h: '2.1.2.1.2.1.2.1.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
      // on the bell
      [{ r: '2...2...2...2...', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 0.8],
    ],
    fills: [
      // the toms in unison, in 8ths, from 3
      [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1.2],
      // Message in a Bottle: broken 16ths and a crash on the "a" of 3, then nothing
      [{ s: '2.22.2.2....', c: '.......1....' }, 1.0],
      // Spirits: the hat in unison with the snare
      [{ h: '111.111.33', s: '....2.2.22' }, 0.8],
      // Wrapped Around Your Finger: up the toms to a splash on the "and" of 4
      [{ t2: '1.1.1.1.......', t1: '........1.1...', c: '............4.' }, 1.0],
      // Roxanne: a bark, the foot, a crash on the "and" of 4
      [{ s: '2...2...', h: '..3.....', hf: '....1...', c: '......1.', k: '..1...1.' }, 1.0],
      // Synchronicity II: three 8ths on both toms with the kick
      [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 0.8],
    ],
    songs: [
      {
        key: 'fall-out',
        title: 'Fall Out',
        feel: 'the 1977 punk single, at its studio tempo up to the speed it went live',
        weight: 0.5,
        params: {
          bpm: [160, 200],
          fillChance: 0.6,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1],
            [{ r: '1...1...1...1...', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1],
          ],
          fills: [
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
          ],
        },
      },
      {
        key: 'roxanne',
        title: 'Roxanne',
        feel: 'the kick off the 1 under the verse, a bark on the "and" of 4, then a rock chorus',
        weight: 1.4,
        params: {
          bpm: [132, 136],
          figures: [
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '..1.............' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '..1.1...........' }, 1.0],
            [
              {
                r: '2.1.1.1.2.1.1...',
                s: '....2...........',
                k: '..1.............',
                t1: '............1.1.',
              },
              0.6,
            ],
            [{ h: '1.1.1.1.1.3.1.3.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
          ],
          fills: [
            [{ s: '2...2...', h: '..3.....', hf: '....1...', c: '......1.', k: '..1...1.' }, 1.4],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'cant-stand-losing-you',
        title: "Can't Stand Losing You",
        feel: 'a reggae verse with its backbeat on 4 alone, a rock chorus on the bell, a cross-stick hemiola in the bridge',
        weight: 1.1,
        params: {
          bpm: [142, 146],
          figures: [
            [
              {
                h: '1.1.1.1.1.1...3.',
                s: '............2...',
                k: '..1.1...........',
                t3: '............1...',
              },
              1.2,
            ],
            [{ h: '1.1.1.1.1.1.1.1.', s: '...4..4..4..4..4', k: '1...1...1...1...' }, 0.6],
            [{ r: '2...2...2...2...', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
          ],
          fills: [[{ t1: '1.1.1...', s: '......2.' }, 1]],
        },
      },
      {
        key: 'next-to-you',
        title: 'Next to You',
        feel: 'flat-out punk, the snare on every beat to start, a tom run every few bars',
        weight: 0.8,
        params: {
          bpm: [170, 178],
          fillChance: 0.8,
          midFills: 0.4,
          anticipate: 0,
          figures: [
            [{ s: '2...2...2...2...', k: '..1...1...1...1.' }, 0.6],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.1.....' }, 1],
            [{ c: '1.......1.......', s: '....2.....2...2.', k: '1.......1...1...' }, 1],
          ],
          fills: [
            [{ t1: '1.1.....1.11' }, 1.2],
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
          ],
        },
      },
      {
        key: 'so-lonely',
        title: 'So Lonely',
        feel: 'a half-time reggae verse, the snare on 3, then a double-time rock chorus on the ride',
        weight: 1.0,
        params: {
          bpm: [150, 156],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1.............1.' }, 1.2],
            [{ r: '1...1...1...1...', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
            [{ h: '3...3...3...3...', s: '2...2...2...2...', k: '..1...1...1...1.' }, 0.5],
          ],
          fills: [
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
            [{ s: '2...2...', h: '..3.....', hf: '....1...', c: '......1.', k: '..1...1.' }, 1],
          ],
        },
      },
      {
        key: 'peanuts',
        title: 'Peanuts',
        feel: 'fast punk 8ths',
        weight: 0.4,
        params: {
          bpm: [176, 184],
          fillChance: 0.6,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1],
            [{ h: '2.1.2.1.2.1.2.1.', s: '....2.......2...', k: '1.......1.1.....' }, 0.6],
          ],
          fills: [
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'born-in-the-50s',
        title: "Born in the 50's",
        feel: 'gappy hats with a 16th burst in the verse, the bell in the chorus',
        weight: 0.6,
        params: {
          bpm: [138, 142],
          figures: [
            [{ h: '1.....111.1...3.', s: '....2.......2...', k: '1.....1.1.....1.' }, 1],
            [{ r: '1.......2.....1.', s: '....2.......2...', k: '1.....1.1.....1.' }, 1],
          ],
          fills: [[{ h: '1.1.111.3.', s: '....222.2.' }, 1]],
        },
      },
      {
        key: 'masoko-tanga',
        title: 'Masoko Tanga',
        feel: 'four on the floor under busy 16th hats, and no backbeat at all',
        weight: 0.5,
        params: {
          bpm: [144, 150],
          figures: [
            [{ h: '1.111.11111.1.11', k: '1...1...1...1...' }, 1],
            [{ h: '1.1.111.1.1.111.', k: '1...1...1...1...' }, 0.6],
          ],
        },
      },
      {
        key: 'landlord',
        title: 'Landlord',
        feel: 'the slow section: open hats on the beat, a plain 2 and 4',
        weight: 0.3,
        params: {
          bpm: [100, 105],
          figures: [
            [{ h: '3...3...3...3...', s: '....2.......2...', k: '1.......1.......' }, 1],
            [{ h: '3.1.3.1.3.1.3.1.', s: '....2.......2...', k: '1.......1.1.....' }, 0.6],
          ],
        },
      },
      {
        key: 'landlord-fast',
        title: 'Landlord (fast section)',
        feel: 'open hats on every 8th and the snare on every "and" (the 16th kicks thinned, to keep it at tempo)',
        weight: 0.3,
        params: {
          bpm: [190, 200],
          fillChance: 0.5,
          figures: [
            [{ h: '3.3.3.3.3.3.3.3.', s: '..2...2...2...2.', k: '1...1...1.......' }, 1],
            [{ h: '3.3.3.3.3.3.3.3.', s: '....2.......2...', k: '1.1.....1.1.....' }, 0.8],
          ],
          fills: [[{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1]],
        },
      },
      {
        key: 'message-in-a-bottle',
        title: 'Message in a Bottle',
        feel: 'accented quarters on the hats, a mid and high tom answering over two bars, the bell into the outro',
        weight: 1.4,
        params: {
          bpm: [147, 150],
          figures: [
            [{ h: '2.1.2.1.2.1.2.3.', s: '....2.......2...', k: '......1.1.......' }, 1.2],
            [
              {
                h: '2.1.2.1.2.1.2.1.2.1.2.1.2.1.2.1.',
                k: '1...1...1...1...1...1...1...1...',
                t1: '......1.1.......................',
                t2: '......................1.1.......',
              },
              1.0,
            ],
            [{ h: '2.1.2.1.2.1.2.1.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.0],
            [{ h: '2.1.2.1.2.1.2.1.', k: '1...1...1...1...' }, 0.6],
            [{ r: '2.2.2.2.2.2.2.2.', s: '....2.......2...', k: '1...1...1...1...' }, 0.6],
          ],
          fills: [
            [{ s: '2.22.2.2....', c: '.......1....' }, 1.4],
            [{ h: '3.......', s: '..22..22', t1: '....11..' }, 1],
          ],
        },
      },
      {
        key: 'reggatta-de-blanc',
        title: 'Reggatta de Blanc',
        feel: 'a rim-click figure through the tape echo over the hat foot, then rock on the ride and open hats',
        weight: 1.0,
        params: {
          bpm: [146, 150],
          echo: { lanes: ['h', 's'], steps: 3, level: 0.35 },
          figures: [
            [{ h: '..1...1...1...1.', hf: '1...1...1...1...', s: '...4.4.44..4.44.' }, 1.2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.1.....1.1.....' }, 1],
            [{ h: '3.3.3.3.3.3.3.3.', s: '....2.......2...', k: '1.1.....1.1.....' }, 0.8],
          ],
          fills: [[{ s: '2.2.2.2.2.2.2.22' }, 1]],
        },
      },
      {
        key: 'bring-on-the-night',
        title: 'Bring On the Night',
        feel: '16th hats opening on the "and" of 2 and 4, the kick on 2 and 4, and no snare',
        weight: 0.9,
        params: {
          bpm: [106, 112],
          figures: [
            [{ h: '1111113.1111113.', k: '....1.......1...' }, 1.2],
            [{ h: '1111113311111133', k: '....1.......1...' }, 0.8],
            [{ h: '1.1...1.1.1...1.', c: '....1.......1...', k: '....1.......1...' }, 0.4],
          ],
        },
      },
      {
        key: 'walking-on-the-moon',
        title: 'Walking on the Moon',
        feel: 'the kick on 2 and 4, a cross-stick on 3, hats dropping out, and his tape echo; felt in half-time',
        weight: 1.3,
        params: {
          bpm: [144, 148],
          echo: { lanes: ['h', 's'], steps: 3, level: 0.35 },
          fillChance: 0,
          anticipate: 0,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '....1.......1...' }, 1.2],
            [{ h: '1.1.1...1...1.1.', s: '........4.......', k: '....1.......1...' }, 1],
            [{ h: '1.1.1.1.1.1.1.1.', s: '........4.4.....', k: '1...1...1...1...' }, 1],
          ],
        },
      },
      {
        key: 'the-beds-too-big',
        title: "The Bed's Too Big Without You",
        feel: 'a shaker keeping time, the snare skanking on the "ands"',
        weight: 0.5,
        params: {
          bpm: [88, 92],
          perc: [{ inst: 'shaker', every: 1, accents: [0, 4, 8, 12] }],
          fillChance: 0.2,
          fills: [[{ s: '..22' }, 1]],
          figures: [
            [{ s: '..2...22..2...22', k: '....1.......1...' }, 1],
            [{ s: '..2...2...2...2.', k: '....1.......1...' }, 0.6],
          ],
        },
      },
      {
        key: 'dont-stand-so-close',
        title: "Don't Stand So Close to Me",
        feel: 'a one drop in the verse, the kick on 3 alone, then a chorus on the ride',
        weight: 1.2,
        params: {
          bpm: [138, 142],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '........1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1...1...1...1...' }, 0.6],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '..1.....1.1.....' }, 1.2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '..1.....1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'driven-to-tears',
        title: 'Driven to Tears',
        feel: 'four on the floor, a cross-stick on 3, the hat foot running 8ths in the verse',
        weight: 0.9,
        params: {
          bpm: [156, 160],
          figures: [
            [{ hf: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '1...1...1...1...' }, 1],
            [{ r: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '1...1...1...1...' }, 1],
          ],
          fills: [
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'de-do-do-do',
        title: 'De Do Do Do, De Da Da Da',
        feel: 'four on the floor and a cross-stick on 3 under the verse, a 2 and 4 chorus',
        weight: 1.0,
        params: {
          bpm: [143, 148],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '1...1...1...1...' }, 1.2],
            [{ h: '1...1.......1.1.', s: '........4.......', k: '1...1...1...1...' }, 0.6],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.....1.' }, 1.2],
          ],
        },
      },
      {
        key: 'man-in-a-suitcase',
        title: 'Man in a Suitcase',
        feel: 'the kick on every "and" and never on 1, gaps in the hats',
        weight: 0.6,
        params: {
          bpm: [138, 142],
          figures: [
            [{ h: '1.1...1.1.....3.', s: '....2.......2...', k: '..1...1...1...1.' }, 1],
            [{ h: '1.1.1.1.1.111.1.', s: '....2.......2...', k: '..1...1...1...1.' }, 1],
          ],
        },
      },
      {
        key: 'voices-inside-my-head',
        title: 'Voices Inside My Head',
        feel: 'funk-reggae, a syncopated kick',
        weight: 0.4,
        params: {
          bpm: [106, 110],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1......11.....1.' }, 1],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '1......1......1.' }, 0.6],
          ],
        },
      },
      {
        key: 'bombs-away',
        title: 'Bombs Away',
        feel: '16th hats, the kick on the "ands"',
        weight: 0.4,
        params: {
          bpm: [128, 132],
          figures: [
            [{ h: '1111111111111111', s: '....2.......2...', k: '..1...1...1...1.' }, 1],
            [{ h: '1111111111111111', s: '....2.......2...', k: '1..1..1...1.....' }, 0.8],
          ],
        },
      },
      {
        key: 'behind-my-camel',
        title: 'Behind My Camel',
        feel: 'slow half-time, the snare on 3',
        weight: 0.3,
        params: {
          bpm: [85, 90],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1...............' }, 1],
            [{ h: '1.1.1.1.1.1.1.3.', s: '........2.......', k: '1.1.............' }, 0.6],
          ],
        },
      },
      {
        key: 'spirits-in-the-material-world',
        title: 'Spirits in the Material World',
        feel: 'a two-bar verse of hats around the hat foot on the "ands", kick on 2 and 4, no snare; a barking chorus',
        weight: 1.3,
        params: {
          bpm: [138, 142],
          figures: [
            [
              {
                h: '....1...1...11..3...1..111..3...',
                hf: '..1...1...1...1...1...1...1.....',
                k: '....1.......1.......1.......1...',
              },
              1.2,
            ],
            [{ h: '1.3...1.1.3...1.', s: '....2.......2...', k: '1.....1.1.......' }, 1],
            [{ h: '1.3...111.111.3.', s: '....2.......2...', k: '1.....1.1.......' }, 0.6],
          ],
          fills: [[{ h: '111.111.33', s: '....2.2.22' }, 1]],
        },
      },
      {
        key: 'every-little-thing',
        title: 'Every Little Thing She Does Is Magic',
        feel: 'written at half the felt tempo: 16th hats, cross-sticks in threes through the echo, a busy kick in the chorus',
        weight: 1.0,
        params: {
          bpm: [80, 84],
          echo: { lanes: ['h', 's'], steps: 3, level: 0.3 },
          ghostBias: 0,
          fills: [
            [{ s: '2.22' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
          figures: [
            [{ h: '1111111111111113', s: '....444.....444.', k: '....1.......1...' }, 1.2],
            [{ h: '1111113311111113', s: '....4.......4...', k: '1.......1.......' }, 0.8],
            [{ r: '1111111111111111', s: '..2...2...2...2.', k: '1...11.11.......' }, 1.2],
          ],
        },
      },
      {
        key: 'invisible-sun',
        title: 'Invisible Sun',
        feel: 'no cymbals and no snare in the verse, the kick doubled on two toms on 2 and 4',
        weight: 0.7,
        params: {
          bpm: [118, 122],
          figures: [
            [{ k: '....1.......1...', t2: '....1.......1...', t3: '....1.......1...' }, 1],
            [{ h: '2.2...2.2.3...2.', s: '....2.......2...', k: '....1.......1...' }, 1],
          ],
          fills: [
            [
              {
                k: '1.1.1.1.1...',
                t2: '1.1.1.1.....',
                t3: '1.1.1.1.....',
                c: '........1...',
                s: '........2...',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'demolition-man',
        title: 'Demolition Man',
        feel: 'straight-ahead rock 8ths',
        weight: 0.5,
        params: {
          bpm: [148, 152],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1],
            [{ h: '1.1.1.1.1.1.1.1.', k: '1...1...1...1...' }, 0.5],
          ],
          fills: [
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'omegaman',
        title: 'Omegaman',
        feel: 'fast rock on the ride',
        weight: 0.4,
        params: {
          bpm: [176, 184],
          figures: [
            [{ r: '1...1...1.1.1...', s: '....2.......2...', k: '1.......1.......' }, 1],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 0.8],
          ],
          fills: [[{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1]],
        },
      },
      {
        key: 'rehumanize-yourself',
        title: 'Rehumanize Yourself',
        feel: 'ska-punk: the hat opening on 2 and 4 with the snare',
        weight: 0.6,
        params: {
          bpm: [184, 192],
          fillChance: 0.5,
          figures: [
            [{ h: '1.1.3.1.1.1.3.1.', s: '....2.......2...', k: '1.1.....1.......' }, 1],
            [{ r: '1...1.1.1...1.1.', s: '....2.......2...', k: '1.1.....1.......' }, 1],
          ],
          fills: [
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'darkness',
        title: 'Darkness',
        feel: 'quarter-note hats and no backbeat, then the snare on 1 and 3',
        weight: 0.5,
        params: {
          bpm: [88, 92],
          figures: [
            [{ h: '1...1...1...1.1.', k: '1.1...1.1.1.....' }, 1],
            [{ h: '1.1.1.1.1.1.1.1.', s: '2.......2.......', k: '..1.1.1...1.1.1.' }, 0.8],
          ],
        },
      },
      {
        key: 'one-world',
        title: 'One World (Not Three)',
        feel: 'a reggae one drop, reconstructed: no transcription survived',
        weight: 0.3,
        params: {
          bpm: [164, 172],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '........1.......' }, 1],
            [{ h: '1.1.1.1.1.1.1.3.', s: '........4.......', k: '........1.......' }, 0.6],
          ],
          fills: [[{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1]],
        },
      },
      {
        key: 'synchronicity-i',
        title: 'Synchronicity I',
        feel: 'driving 8ths to a sequencer, transcribed in 6/4',
        weight: 0.7,
        params: {
          meter: '6/4',
          bpm: [194, 200],
          figures: [
            [
              {
                h: '2.1.2.1.2.1.2.1.2.1.2.1.',
                s: '....2.......2.......2...',
                k: '1.1.....1.1.....1.1.....',
              },
              1,
            ],
            [
              {
                r: '1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '....2.......2.......2...',
                k: '1.1.......1.......1...1.',
              },
              1,
            ],
          ],
          fills: [
            [{ s: '2.22' }, 1],
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1],
          ],
        },
      },
      {
        key: 'walking-in-your-footsteps',
        title: 'Walking in Your Footsteps',
        feel: 'tribal: open hats on the "ands" over the toms, hardly a kick on 1',
        weight: 0.3,
        params: {
          bpm: [104, 110],
          phraseMark: { crash: false, kick: false },
          figures: [
            [{ h: '..3...3...3...3.', t3: '1.....1.1.......', t2: '....1.......1...' }, 1],
            [{ h: '..3...3...3...3.', t3: '1.....1.1.....1.', k: '........1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'o-my-god',
        title: 'O My God',
        feel: 'plain rock 8ths',
        weight: 0.4,
        params: {
          bpm: [130, 134],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 1],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '1.....1.1.....1.' }, 0.6],
          ],
        },
      },
      {
        key: 'mother',
        title: 'Mother',
        feel: 'a lurching 7/4, the snare on 4 alone',
        weight: 0.4,
        params: {
          meter: '7/4',
          bpm: [196, 204],
          figures: [
            [
              {
                h: '3...1...1...1...1...1...1...',
                s: '............2...............',
                k: '1...........1...............',
              },
              1,
            ],
          ],
          fills: [[{ s: '2.2.2.2.' }, 1]],
        },
      },
      {
        key: 'miss-gradenko',
        title: 'Miss Gradenko',
        feel: '16th hats over the kick on 2 and 4, then plain rock',
        weight: 0.5,
        params: {
          bpm: [108, 112],
          figures: [
            [{ h: '1111111111111111', k: '....1.......1...' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.....1.' }, 0.6],
          ],
        },
      },
      {
        key: 'synchronicity-ii',
        title: 'Synchronicity II',
        feel: 'quarter hats driving the verse, the bow and bell of the ride in the bridge',
        weight: 0.9,
        params: {
          bpm: [156, 160],
          figures: [
            [{ h: '1...1...1...1...', s: '....2.......2...', k: '1.............1.' }, 1],
            [{ h: '1...1...1.1.1.1.', s: '....2.......2...', k: '1.............1.' }, 1],
            [{ r: '....1...1.1.1...', s: '....2.......2...', k: '1.....1.1.....1.' }, 0.8],
            [{ r: '2...2.2.2...2.2.', s: '....2.......2...', k: '1.............1.' }, 0.6],
          ],
          fills: [
            [{ t1: '1.1.1.', t2: '1.1.1.', k: '1.1.1.' }, 1.4],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'every-breath-you-take',
        title: 'Every Breath You Take',
        feel: 'straight and steady to a click, built up from overdubs',
        weight: 0.8,
        params: {
          bpm: [115, 119],
          fillChance: 0.2,
          anticipate: 0,
          figures: [
            [{ s: '....2.......2...', k: '1.....1.1.......' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 1],
            [{ r: '2...2...2...2...', s: '....2.......2...', k: '1.....1.1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'king-of-pain',
        title: 'King of Pain',
        feel: 'the kick on every "and" under the verse, barks closed by the foot, a floor-tom bridge',
        weight: 1.2,
        params: {
          bpm: [122, 128],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '..1...1...1...1.' }, 1.2],
            [
              {
                h: '1.1.1.1.3...3...',
                hf: '..........1...1.',
                s: '....2.......2...',
                k: '..1...1...1...1.',
              },
              0.8,
            ],
            [{ r: '....1...1...1...', s: '....2.......2...', k: '1.......1.......' }, 1],
            [{ h: '3.......3.......', s: '....2.......2...', t3: '1.1.1.1.1.1.1.1.' }, 0.5],
          ],
          fills: [
            [{ s: '2.22' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
      },
      {
        key: 'wrapped-around-your-finger',
        title: 'Wrapped Around Your Finger',
        feel: 'the backbeat on 4 alone, a rim click in the verse and the snare in the chorus, a fill up the toms to a splash',
        weight: 1.3,
        params: {
          bpm: [126, 130],
          anticipate: 0.5,
          figures: [
            [{ h: '1.1.1.1.1...1...', s: '............4...', k: '......1.1.......' }, 1.2],
            [{ h: '3.1.3.1.1.1.1.1.', s: '............4...', k: '......1.1.......' }, 0.6],
            [{ r: '2.1.2.1.2.1.2.1.', s: '............2...', k: '1.....1.1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 0.4],
          ],
          fills: [[{ t2: '1.1.1.1.......', t1: '........1.1...', c: '............4.' }, 1]],
        },
      },
      {
        key: 'tea-in-the-sahara',
        title: 'Tea in the Sahara',
        feel: 'sparse and floating, reconstructed from rough transcriptions',
        weight: 0.3,
        params: {
          bpm: [136, 140],
          fillChance: 0.1,
          phraseMark: { crash: false },
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', k: '..............1.' }, 1],
            [{ h: '1...1...1.1.1.1.', s: '......2.........', k: '1...............' }, 0.8],
          ],
        },
      },
      {
        key: 'murder-by-numbers',
        title: 'Murder by Numbers',
        feel: 'a jazz-blues 12/8 on the ride, the snare on the third pulse; reconstructed',
        weight: 0.4,
        params: {
          meter: '12/8',
          bpm: [68, 74],
          anticipate: 0,
          figures: [
            [
              {
                r: '1...1.1...1.1...1.1...1.',
                hf: '......1...........1.....',
                s: '............2...........',
                k: '1.......................',
              },
              1,
            ],
          ],
          fills: [
            [{ s: '2...2.2...2.' }, 1],
            [{ t1: '2...2.......', t3: '......2...2.' }, 1],
          ],
        },
      },
    ],
  },
  yussefdayes: {
    label: 'Yussef Dayes',
    drummer: true,
    hint: 'The London drummer of Yussef Kamaal, What Kinda Music and Black Classical Music: dense, linear 16ths where hat, ghosted snare and kick take turns, a backbeat that slides off 2 and 4 to the "and" or the "e", kick clusters of three on one foot, buzz strokes and flams on a snare tuned tight, rim clicks for a backbeat, and a stack for an accent. Tight inside the bar, light on the swing. Each New plays a style inspired by one of twenty-seven tracks, most from Drum Hub\'s transcriptions, at its record tempo.',
    toms: true,
    kit: 'london',
    hats: 16,
    bpm: [76, 152],
    swingUnit: 16,
    swing: 25,
    swingRange: [15, 40],
    // the ghosts are written into his figures; few more are rolled for
    ghostBias: 0.2,
    opens: 1,
    openSlots: [14, 15, 11],
    backbeats: [4, 12],
    targetDensity: 12,
    hatDepth: 0.8,
    // three 16ths on the kick with one foot: Tioga Pass's 3, 3e, 3&
    heelToe: true,
    // tight, the ghosts a touch late and every note a little alive
    feel: { label: 'Tight, ghosts late', s: 0.02, sGhost: 0.08, jitter: 0.03 },
    buzz: 0.15,
    flam: 0.08,
    drag: 0.05,
    halfOpen: 0.5,
    rimshot: 0.1,
    // a pickup at the end of most phrases, and of some pairs of bars inside them
    fillChance: 0.6,
    midFills: 0.2,
    kick1: [
      ['1001', 2],
      ['1000', 1.5],
      ['1010', 1],
    ],
    kick: [
      ['0010', 1.5],
      ['0000', 1],
      ['0101', 1],
      ['1110', 0.6],
    ],
    /* From Drum Hub's human transcriptions (Alex Richards), read off the
       notation. See planning/drumming-research.md, section K. */
    figures: [
      // What Kinda Music
      [{ h: '1.1.1.1.1.1.1.3.', s: '....21.2.2..2...', k: '1.1.......11.11.' }, 1.2],
      // Raisins Under the Sun
      [{ h: '11111113..111111', s: '....2....1..2..1', k: '1..1......1..1..' }, 1.2],
      // Love Is the Message: the snare on the "and" of 2
      [{ h: '...112.111111...', s: '......2..1..2..1', k: '1..1......1.....' }, 1.0],
      // Tioga Pass: the kick on 3, 3e, 3&
      [{ h: '1.1.1.1.1.1.1.3.', s: '...22..2....2.2.', k: '1.......111..1..' }, 1.0],
      // Woman's Touch: a rim click on 2 and 4
      [{ h: '1111111111111111', s: '....4.......4...', k: '1......11.......' }, 0.8],
    ],
    fills: [
      // Tioga Pass: a 16th pickup on the snare
      [{ s: '22' }, 1.4],
      // single strokes round the toms
      [{ s: '2...', t1: '.2..', t2: '..2.', t3: '...2' }, 1.0],
      // flammed toms (Gelato)
      [{ t1: '33..', t2: '..22', k: '..1.' }, 0.8],
      // a stack with the snare on the "and" of 4 (Cowrie Charms)
      [{ s: '2.', c: '3.' }, 0.8],
      // the floor tom building in 16ths
      [{ t3: '22222222' }, 0.5],
    ],
    songs: [
      {
        key: 'black-focus',
        title: 'Black Focus',
        feel: 'broken beat; a template built from his habits, not a transcription',
        weight: 0.6,
        params: {
          bpm: [90, 95],
          figures: [
            [{ h: '1.11.11.1.11.1.3', s: '.1..2..1.1..2..1', k: '1......1..1.....' }, 1],
            [{ h: '1.11.11.1.11.1.3', s: '.1..2..1.1..2...', k: '1..1...1..1...1.' }, 0.6],
          ],
        },
      },
      {
        key: 'strings-of-light',
        title: 'Strings of Light',
        feel: 'Yussef Kamaal: accented snares on the "a" of 1 and the "e" of 2, ghosts all round them (also heard at 145)',
        weight: 0.8,
        params: {
          bpm: [106, 112],
          swing: 15,
          swingRange: [5, 25],
          figures: [[{ h: '1...1.111.1.111.', s: '.113.3..21.1..21', k: '1.........1.....' }, 1]],
        },
      },
      {
        key: 'lowrider',
        title: 'Lowrider',
        feel: 'Yussef Kamaal funk, 16th hats; a template built from his habits, not a transcription',
        weight: 0.4,
        params: {
          bpm: [124, 128],
          figures: [
            [{ h: '1111111111111111', s: '....2..1.1..2..1', k: '1..1...1..1.....' }, 1],
            [{ h: '1111111111111113', s: '....2..1.1..2...', k: '1..1...1..1...1.' }, 0.6],
          ],
        },
      },
      {
        key: 'love-is-the-message',
        title: 'Love Is the Message',
        feel: 'the snare on the "and" of 2, ghosts and a pickup into every 1; faster live',
        weight: 1.2,
        params: {
          bpm: [83, 91],
          figures: [
            [
              {
                h: '...112.111111...111112.1111.1...',
                s: '......2..1..2..1.1....2.....2..1',
                k: '1..1......1.....1..1......1.....',
              },
              1.2,
            ],
            [{ h: '.111...1111111.1', s: '....112..1.12..1', k: '1..1......1..1..' }, 1],
          ],
        },
      },
      {
        key: 'what-kinda-music',
        title: 'What Kinda Music',
        feel: 'with Tom Misch: a slow, linear groove, kick pairs late in the bar',
        weight: 1.0,
        params: {
          bpm: [94, 98],
          figures: [
            [{ h: '1.1.1.1.1.1.1.3.', s: '....21.2.2..2...', k: '1.1.......11.11.' }, 1.2],
            [{ h: '1.1...1.1.1.14..', s: '....61.2.2..2.11', k: '1.1.......11....' }, 0.6],
          ],
        },
      },
      {
        key: 'lift-off',
        title: 'Lift Off',
        feel: 'with Tom Misch: half-time, the snare on 3, a 16th ruff into the next bar',
        weight: 0.8,
        params: {
          bpm: [138, 142],
          swing: 5,
          swingRange: [0, 12],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1.1...1.....1...' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2.....2.', k: '1.1...1.....1...' }, 0.8],
            [{ r: '1...1.2.1...1...', s: '........2.......', k: '1.1...1.....1...' }, 0.5],
          ],
          fills: [
            [{ s: '22' }, 1.4],
            [{ s: '2.22' }, 1],
          ],
        },
      },
      {
        key: 'jamaican-links',
        title: 'Jamaican Links',
        feel: 'half-time reggae, the snare on 3, near straight',
        weight: 0.6,
        params: {
          bpm: [130, 136],
          swing: 5,
          swingRange: [0, 10],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1.....1.....1...' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '........2..2..2.', k: '1.....1.........' }, 0.8],
          ],
          fills: [
            [{ s: '22' }, 1],
            [{ s: '2...', t1: '.2..', t2: '..2.', t3: '...2' }, 1],
          ],
        },
      },
      {
        key: 'encore-babylon-burning',
        title: 'Encore ~ Babylon Burning',
        feel: 'half-time, the snare on 3, the kick piling up on 4',
        weight: 0.6,
        params: {
          bpm: [146, 152],
          swing: 5,
          swingRange: [0, 12],
          figures: [[{ h: '1.1.11.11.1.11.1', s: '........2.......', k: '1.1.........11.1' }, 1]],
          fills: [[{ s: '22' }, 1]],
        },
      },
      {
        key: 'nightrider',
        title: 'Nightrider',
        feel: 'with Tom Misch: laid back, a rim click on 2 and 4; from a rough transcription',
        weight: 0.4,
        params: {
          bpm: [79, 83],
          figures: [[{ h: '1111111113131111', s: '....4.......4...', k: '1..1...1.1.1...1' }, 1]],
        },
      },
      {
        key: 'black-classical-music',
        title: 'Black Classical Music',
        feel: 'jungle-ish and linear, the hat foot on the "ands", the backbeat moved off 2 (heard double at 155)',
        weight: 1.0,
        params: {
          bpm: [76, 80],
          swing: 5,
          swingRange: [0, 12],
          figures: [
            [
              {
                h: '..1.1.11..111.11',
                hf: '..1...1...1...1.',
                s: '.....1...1.1.3.1',
                k: '1...1..1....1...',
              },
              1,
            ],
            [
              {
                c: '1.1.1.1.........',
                hf: '..1...1...1...1.',
                s: '.1...1...1.1.3.1',
                k: '1...1..1....1...',
              },
              0.5,
            ],
          ],
        },
      },
      {
        key: 'afro-cubanism',
        title: 'Afro Cubanism',
        feel: 'Afro-Cuban: a buzz on the "a" of 2, toms inside the groove, a stack over two bars',
        weight: 0.9,
        params: {
          bpm: [97, 101],
          swing: 5,
          swingRange: [0, 12],
          figures: [
            [
              {
                c: '..................3.............',
                h: '.....3...3...........3...3......',
                s: '.12....8...2..21.12....8...2..21',
                k: '1..1.1..........1..1.1..........',
                t1: '............11..............11..',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'raisins-under-the-sun',
        title: 'Raisins Under the Sun',
        feel: '16th hats, the snare on 2 and 4 with ghost pickups',
        weight: 0.8,
        params: {
          bpm: [101, 105],
          figures: [
            [{ h: '11111113..111111', s: '....2....1..2..1', k: '1..1......1..1..' }, 1.2],
            [{ h: '11111113..111111', s: '....2....8..2..1', k: '1..1......1..1..' }, 0.6],
          ],
        },
      },
      {
        key: 'rust',
        title: 'Rust',
        feel: 'with Tom Misch: the snare scattered on 2, the "and" of 2, the "e" of 3 and 4',
        weight: 1.0,
        params: {
          bpm: [95, 99],
          figures: [
            [
              {
                h: '...11.11111111113.11111111111121',
                s: '....2.2..2...2......2.8..2......',
                k: '1..1.......11..11..1.......11..1',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'turquoise-galaxy',
        title: 'Turquoise Galaxy',
        feel: 'in 8th-note triplets, half-time, a ghost on every middle triplet',
        weight: 0.8,
        params: {
          meter: '4/4-6',
          bpm: [84, 88],
          swing: 0,
          figures: [
            [
              {
                h: '....1.1...1.1...1.1...1.',
                s: '..1.....1...2.1.....1...',
                k: '1.........1.............',
              },
              1,
            ],
            [
              {
                h: '1...1.1...1.1...1.1...1.',
                s: '..1.....1...2.1.....1...',
                k: '....1.1...............1.',
              },
              1,
            ],
          ],
          fills: [
            [{ s: '1.2.2.' }, 1],
            [{ t1: '2.2...', t3: '....2.' }, 1],
          ],
        },
      },
      {
        key: 'the-light',
        title: 'The Light',
        feel: 'linear and dense, the kick never on 1 (heard double at 157)',
        weight: 0.8,
        params: {
          bpm: [76, 80],
          phraseMark: { crash: false, kick: false },
          figures: [[{ h: '1.11..1.3.113.11', s: '.1..11.1.1...1..', k: '........1..11..1' }, 1]],
        },
      },
      {
        key: 'pon-di-plaza',
        title: 'Pon di Plaza',
        feel: 'reggae: 16th hats and a rim click on dotted 8ths',
        weight: 1.0,
        params: {
          bpm: [98, 102],
          swing: 5,
          swingRange: [0, 10],
          figures: [
            [
              {
                h: '11111111111111111111111111111141',
                s: '...4..4..4..4......4..4..4..4...',
                k: '1.........1.....1.........1....1',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'chasing-the-drum',
        title: 'Chasing the Drum',
        feel: 'ghosts and a high tom woven through the groove (the COLORS version is near 91)',
        weight: 0.7,
        params: {
          bpm: [132, 138],
          figures: [
            [
              {
                h: '1.11......1.1...',
                s: '.1..11..1.2...2.',
                k: '1..1........1...',
                t1: '......11.1......',
              },
              1,
            ],
            [
              {
                h: '1.11........1..1',
                c: '..........1.....',
                s: '.1..11..1.2...2.',
                k: '1..1........1...',
                t1: '......11.1......',
              },
              0.6,
            ],
          ],
        },
      },
      {
        key: 'birds-of-paradise',
        title: 'Birds of Paradise',
        feel: 'a rim click on 2 and 4 under 8ths and bursts of 16ths',
        weight: 0.6,
        params: {
          bpm: [92, 96],
          figures: [[{ h: '1.1.1.11113...11', s: '....4.......4...', k: '1.1...1.......1.' }, 1]],
        },
      },
      {
        key: 'gelato',
        title: 'Gelato',
        feel: 'four on the floor for once, rim clicks between the ride, a flammed tom fill',
        weight: 0.6,
        params: {
          bpm: [129, 133],
          swing: 5,
          swingRange: [0, 12],
          figures: [
            [
              {
                c: '.1..............',
                r: '...1..1.1.1.1.1.',
                s: '......4...4..4..',
                k: '1...1...1...1...',
              },
              1,
            ],
          ],
          fills: [[{ t1: '33..', t2: '..22', k: '..1.' }, 1]],
        },
      },
      {
        key: 'marching-band',
        title: 'Marching Band',
        feel: 'with Masego: the snares off and the drum played as a tom, the hat foot on the "ands"',
        weight: 0.5,
        params: {
          bpm: [103, 107],
          figures: [
            [
              {
                h: '1..1.....1..1...',
                hf: '..1...1...1...1.',
                t1: '.....3.11.11.111',
                k: '1..1............',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'presidential',
        title: 'Presidential',
        feel: 'busy 16th hats, the kick walking through the first half (heard double at 164)',
        weight: 0.7,
        params: {
          bpm: [80, 84],
          figures: [
            [
              {
                h: '..11111111111111..11111111111111',
                s: '....2.......2..1....2.......2.1.',
                k: '1..1...1.1.1....1..1...1.1.1...1',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'jukebox',
        title: 'Jukebox',
        feel: 'a plain 2 and 4 for once, the kick and hats doing the talking',
        weight: 0.7,
        params: {
          bpm: [95, 99],
          figures: [
            [
              {
                h: '....1.111.1.1.1113..1.111...1.11',
                s: '....2.......2.......2.......2...',
                k: '1.........1..1..1.........11.1..',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'womans-touch',
        title: "Woman's Touch",
        feel: '16th hats and a rim click on 2 and 4, ghosts in pairs',
        weight: 0.6,
        params: {
          bpm: [90, 94],
          figures: [
            [{ h: '1111111111111111', s: '....4.......4...', k: '1......11.......' }, 1],
            [{ h: '1111111111441111', s: '....4.....114...', k: '1......11...1...' }, 0.6],
          ],
        },
      },
      {
        key: 'tioga-pass',
        title: 'Tioga Pass',
        feel: 'with Rocco Palladino: three kicks on 3, 3e, 3&, a buzz on the "and" of 4; faster live',
        weight: 1.2,
        params: {
          bpm: [91, 95],
          figures: [
            [
              {
                h: '..11111111111111111111111111114.',
                s: '....2..1....2.8....12..1....2.2.',
                k: '1.......111..1..1.......111..1..',
              },
              1.2,
            ],
            [{ h: '1.1.1.1.1.1.1.3.', s: '...22..2....2.2.', k: '1.......111..1..' }, 1],
          ],
          fills: [
            [{ s: '22' }, 1.4],
            [{ t1: '1..1......', s: '......2...', t2: '........11', k: '..1.1..1..' }, 1],
          ],
        },
      },
      {
        key: 'cowrie-charms',
        title: 'Cowrie Charms',
        feel: 'flams on the "and" of 1 and of 2, kick pairs, the stack on the "and" of 4',
        weight: 0.6,
        params: {
          bpm: [86, 90],
          figures: [
            [
              {
                h: '111.....111.....',
                c: '..............3.',
                s: '....6.6.......2.',
                k: '1.11...11.11....',
              },
              1,
            ],
          ],
        },
      },
      {
        key: 'for-my-ladies',
        title: 'For My Ladies',
        feel: 'half-time, a rim click on 3; from a rough transcription',
        weight: 0.3,
        params: {
          bpm: [128, 136],
          swing: 5,
          swingRange: [0, 12],
          figures: [[{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '1.....1.......1.' }, 1]],
        },
      },
      {
        key: 'last-100',
        title: 'Last 100',
        feel: 'with Tom Misch: 16th hats over scattered rim clicks; from a rough transcription',
        weight: 0.3,
        params: {
          bpm: [88, 92],
          figures: [[{ h: '1111111111111111', s: '.....4.4..4..4.4', k: '1..1.......1....' }, 1]],
        },
      },
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
  ['Rock drummers', ['mitchell', 'bonham', 'ringo', 'copeland']],
  ['Funk drummers', ['stubblefield']],
  ['Jazz drummers', ['tonywilliams', 'yussefdayes']],
  ['Afrobeat drummers', ['tonyallen']],
];
