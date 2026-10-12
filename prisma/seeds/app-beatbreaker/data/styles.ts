/**
 * The style table — seed data.
 *
 * 62 grooves and 20 famous drummers, each a set of tendencies or a handful of
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
          fills: [
            [{ s: '22.22.', k: '..1..1' }, 1.2],
            [{ s: '22..', t1: '..2.', t3: '...2' }, 1.0],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.3.', s: '....3.......3..1', k: '1..1..1...1.....' }, 2],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the chorus',
            params: {
              figures: [
                [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1..1..1...1.....' }, 1.2],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
          fills: [[{ s: '8.8.8.3.' }, 1.0]],
        },
        sections: [
          {
            letter: 'A',
            label: 'the march',
            params: {
              figures: [[{ s: '2.2.2.222.2.2.22', k: '1.1.....1.......' }, 1.6]],
            },
          },
          {
            letter: 'B',
            label: 'the ride section',
            params: {
              figures: [
                [{ r: '1...1...1...1...', s: '....2.......2...', k: '1.......1.....1.' }, 1.0],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
          fills: [[{ s: '1.3.', t3: '.2.2' }, 1.2]],
        },
        sections: [
          {
            letter: 'A',
            label: 'in two',
            params: {
              figures: [[{ r: '1.1.1.1.', k: '1...1...' }, 1.0]],
            },
          },
          {
            letter: 'B',
            label: 'the double time',
            params: {
              figures: [
                [{ r: '1.111.11', s: '.1..1..3', k: '.....2..' }, 2],
                // now and then, the foot on every beat
                [{ r: '1.111.11', hf: '1.1.1.1.', s: '.1..1..3', k: '.....2..' }, 0.5],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
        key: 'lucy-in-the-sky',
        title: 'Lucy in the Sky with Diamonds',
        feel: 'the verses in 3/4, the ride on the beat; the chorus in 4/4, the ride in 8ths and the foot on 2 and 4',
        weight: 0.8,
        params: {
          bpm: [122, 130],
          swing: 0,
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse, in 3/4',
            aliases: ['lucy-verse'],
            params: {
              meter: '3/4',
              backbeats: [4, 8],
              ghostBias: 0,
              figures: [
                [{ k: '1...........', r: '1...1...1...' }, 2],
                [{ k: '1...........', r: '1...1...1...', s: '........2...' }, 1.0],
              ],
              fills: [[{ s: '2.22', t3: '....' }, 1.0]],
            },
          },
          {
            letter: 'B',
            label: 'the chorus, in 4/4',
            aliases: ['lucy-chorus'],
            params: {
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
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
        title: 'All You Need Is Love',
        feel: 'the verse in 7/4, the snare on every beat; then the chorus in 4/4',
        weight: 0.6,
        params: {
          bpm: [94, 100],
          swing: 0,
          ghostBias: 0,
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse, in 7/4',
            params: {
              meter: '7/4',
              backbeats: [4, 12],
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
            letter: 'B',
            label: 'the chorus, in 4/4',
            /* A reconstruction: the chorus's plain 2 and 4 under 8ths, the kick
               on 1 and 3. Not checked against a transcription. */
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 2],
                [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.1.....' }, 1.0],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
          fills: [
            [{ s: '2...2...', h: '..3.....', hf: '....1...', c: '......1.', k: '..1...1.' }, 1.4],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
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
              ],
            },
          },
          {
            letter: 'B',
            label: 'the chorus',
            params: {
              figures: [
                [{ h: '1.1.1.1.1.3.1.3.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
          fills: [
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
            [{ s: '2...2...', h: '..3.....', hf: '....1...', c: '......1.', k: '..1...1.' }, 1],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the half-time reggae verse',
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.1.', s: '........2.......', k: '1.............1.' }, 1.2],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the double-time chorus',
            params: {
              figures: [
                [{ r: '1...1...1...1...', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
                [{ h: '3...3...3...3...', s: '2...2...2...2...', k: '..1...1...1...1.' }, 0.5],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '....1.......1...' }, 1.2],
                [{ h: '1.1.1...1...1.1.', s: '........4.......', k: '....1.......1...' }, 1],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the chorus',
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.1.', s: '........4.4.....', k: '1...1...1...1...' }, 1],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
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
          fills: [
            [{ s: '2.22' }, 1],
            [{ t1: '1.1.1.1.', t2: '1.1.1.1.', k: '1.......' }, 1],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
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
              ],
            },
          },
          {
            letter: 'B',
            label: 'the chorus',
            params: {
              figures: [
                [{ r: '....1...1...1...', s: '....2.......2...', k: '1.......1.......' }, 1],
              ],
            },
          },
          {
            letter: 'C',
            label: 'the floor-tom bridge',
            params: {
              figures: [
                [{ h: '3.......3.......', s: '....2.......2...', t3: '1.1.1.1.1.1.1.1.' }, 0.5],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B', 'C', 'C'],
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
  jabostarks: {
    label: 'Jabo Starks',
    drummer: true,
    hint: "James Brown's other drummer, 1965–76, and Bobby Bland's before that: lean, crisp and steady, a blues and gospel man who never tried to outplay anyone. The hats carry a light swing with a sixteenth slipped in before 3, the kick goes for the 1 and the upbeats, and a section lifts by moving the right hand to the ride, not by a fill. Hardly any fills at all. Each New plays one of nine of his records at its own tempo: Sex Machine's swinging hats, Super Bad's snare on the 1 and the bell in the bridge, The Payback's kick on every beat, Licking Stick's cross-stick. The stage names the song. Six follow published grids; Soul Power, Think (About It) and Turn On Your Love Light are approximations.",
    kit: 'smdrums',
    mix: { h: 0.72 },
    hats: 8,
    bpm: [95, 132],
    swing: 12,
    swingRange: [6, 22],
    // light ghosts, and few of them: just before 3 and just before the 1
    ghostBias: 0.25,
    ghostWeights: { 7: 0.25, 15: 0.25 },
    opens: 1,
    openSlots: [2, 10],
    backbeats: [4, 12],
    targetDensity: 8,
    // the hats in the right hand, the left on the snare: Sex Machine's ghosts fall with the hats' sixteenths
    oneHandHats: true,
    // a fill ends a phrase a third of the time, and never inside it
    fillChance: 0.35,
    midFills: 0,
    kick1: [
      ['1000', 3],
      ['1010', 1],
    ],
    kick: [
      ['0010', 2],
      ['0000', 1.4],
      ['0001', 1.2],
    ],
    figures: [
      // Sex Machine: the hats opening on the "and"s of 1 and 3, a sixteenth before 3
      [{ h: '1.3.1.111.3.1.11', s: '....3.11.1..3..1', k: '2.........1...1.' }, 2],
      // Super Bad: the snare on the 1 and the "and" of 2, as if the groove started in the middle
      [{ h: '1.3.1.1.113.1.1.', s: '3.....3..1..2...', k: '1.........1...1.' }, 1.2],
      // The Payback: the kick on every beat and the "a" of 4
      [{ h: '1.3.1...1...1...', s: '....3..1....3...', k: '1...1...1...1..1' }, 1.2],
      // the B section on the ride, the bell on 2 and 4, the foot with it
      [
        {
          r: '1.1.2.1.1.1.2.1.',
          s: '....3.......3...',
          k: '1......1..1.....',
          hf: '....1.......1...',
        },
        1.0,
      ],
    ],
    fills: [
      // the backbeat, the hats opening on its "and", a ghost on the "a"
      [{ h: '..3.', s: '3..1' }, 1.4],
      // a ghost and an accent on the "a" of 4, the backbeat left standing
      [{ s: '13' }, 1.2],
      // unison accents on 3, its "and" and 4, the kick under each
      [{ s: '3.3.3...', k: '1.1.1...' }, 0.8],
    ],
    /* His records, each at its own tempo: one New picks one, and the stage
       names it. Sex Machine is Goodhertz's Funklet grid (Jack Stratton's
       transcription), which a human Songsterr tab matches bar for bar; Super
       Bad is Joseph Connell's Modern Drummer transcription, checked against
       two human Songsterr tabs; The Payback is Cruise Ship Drummer's three
       grooves; Hot Pants, Pass the Peas and Licking Stick are human Songsterr
       tabs. Soul Power, Think (About It) and Turn On Your Love Light are
       reconstructions in his vocabulary at the record's tempo — no grid of
       them was found. See `.context/app/planning/drumming-research.md`,
       section M. */
    songs: [
      {
        key: 'sex-machine',
        title: 'Get Up (I Feel Like Being a) Sex Machine',
        feel: 'swinging hats opening on the "and"s of 1 and 3, a sixteenth slipped in before 3',
        weight: 1.4,
        params: {
          bpm: [105, 110],
          swing: 22,
          swingRange: [16, 30],
          figures: [
            [{ h: '1.3.1.111.3.1.11', s: '....3.11.1..3..1', k: '2.........1...1.' }, 2],
            // the second bar: no sixteenth on the hats before the 1
            [{ h: '1.3.1.111.3.1.1.', s: '....3.11.1..3..1', k: '2.........1...1.' }, 1.6],
          ],
          fills: [
            [{ h: '..3.', s: '3..1' }, 1.2],
            [{ s: '13' }, 1.0],
          ],
        },
      },
      {
        key: 'super-bad',
        title: 'Super Bad',
        feel: 'the snare on the 1 and the "and" of 2, then a bridge on the ride bell with the foot on every beat',
        weight: 1.3,
        params: {
          bpm: [124, 132],
          swing: 8,
          swingRange: [4, 14],
          ghostWeights: {},
          figures: [
            [{ h: '1.3.1.1.113.1.1.', s: '3.....3..1..2...', k: '1.........1...1.' }, 2],
            // the kick opening up on 3 and its "and"
            [{ h: '1.3.1.1.113.1.1.', s: '3.....3..1..2...', k: '1.......1.1...1.' }, 1.2],
            // the bridge: the bell and the snare together on 2, 3 and 4
            [
              {
                r: '2...2...2...2.22',
                s: '....3...3...3...',
                k: '1...............',
                hf: '1...1...1...1...',
              },
              0.9,
            ],
            // the bridge's second bar: the snare on the "and"s of 1 and 3
            [
              {
                r: '2.222.2.2.222.2.',
                s: '..2.......2..1.1',
                k: '1.............1.',
                hf: '1...1...1...1...',
              },
              0.9,
            ],
          ],
          fills: [
            [{ s: '13' }, 1.2],
            [{ s: '3.3.3...', k: '1.1.1...' }, 0.8],
          ],
        },
      },
      {
        key: 'the-payback',
        title: 'The Payback',
        feel: 'cooled right down: the kick on every beat, the snare on 2 alone, then 2 and 4, the ghosts creeping in',
        weight: 1.3,
        params: {
          bpm: [95, 100],
          swing: 12,
          swingRange: [6, 18],
          ghostWeights: {},
          figures: [
            [{ h: '1.3.1...1...1...', s: '....3..1....3...', k: '1...1...1...1..1' }, 2],
            // the same embellishments on the other half of the bar
            [{ h: '1...1...1.3.1...', s: '....3.......3..1', k: '1...1..11...1...' }, 1.4],
            // the intro: the snare on 2 only
            [{ h: '1...1...1...1...', s: '....3...........', k: '1...1...1...1...' }, 0.7],
            // towards the end: ghosts after every beat
            [{ h: '1...1...1...1...', s: '..1.3.11.11.3.11', k: '1...1...1...1...' }, 1.0],
          ],
          fills: [
            [{ h: '..3.', s: '3..1' }, 1.0],
            [{ s: '13' }, 1.0],
          ],
        },
      },
      {
        key: 'hot-pants',
        title: 'Hot Pants (She Got to Use What She Got to Get What She Wants)',
        feel: 'eighths on the hats with sixteenths before 3 and the 1, the kick on 1 and 3, and long stops where the band drops out',
        weight: 1.0,
        params: {
          bpm: [96, 100],
          swing: 10,
          swingRange: [4, 16],
          figures: [
            [{ h: '1.1.1.111.1.1.11', s: '....2.......2...', k: '1.......1.......' }, 2],
            [{ h: '1.1.1.111.1.1.11', s: '....2....2..2...', k: '1.......1.......' }, 1.4],
            // the stop: the 1 and the backbeat on 2, then nothing
            [{ h: '1.1.1...........', s: '....2...........', k: '1...............' }, 0.8],
          ],
          fills: [
            [{ h: '..3.', s: '2..1' }, 1.0],
            [{ s: '12' }, 1.0],
          ],
        },
      },
      {
        key: 'pass-the-peas',
        title: 'Pass the Peas',
        feel: "the J.B.'s: straight eighths, the kick on 1 and 3, the snare answering the horns",
        weight: 0.9,
        params: {
          bpm: [99, 104],
          swing: 6,
          swingRange: [2, 10],
          ghostWeights: {},
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2..2.2..2...', k: '1...............' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2..2.2..2..2', k: '1.......1.......' }, 1.0],
          ],
          fills: [
            [{ s: '2..2' }, 1.0],
            [{ s: '2.2.2...', k: '1.1.1...' }, 0.8],
          ],
        },
      },
      {
        key: 'licking-stick',
        title: 'Licking Stick – Licking Stick',
        feel: 'the backbeat a cross-stick, with rim clicks on the "a" of 2 and the "e" of 3, the hats opening after 3',
        weight: 0.8,
        params: {
          bpm: [104, 112],
          swing: 6,
          swingRange: [2, 12],
          ghostWeights: {},
          figures: [
            [{ h: '1.1.1.1.1.3.1.1.', s: '....4..4.4..4...', k: '1.........1...1.' }, 2],
            [{ h: '1.3.1.1.1.3.1.1.', s: '....4..4.4..4...', k: '1.........1...1.' }, 1.4],
            [{ h: '1.3.1.1.1.3.1.1.', s: '....4..4.4..4...', k: '1.1.......1...1.' }, 0.8],
            // the struck snare where the band lifts
            [{ h: '1.1.1.1.1.3.1.1.', s: '....2..2.2..2...', k: '1.........1...1.' }, 0.8],
          ],
          fills: [[{ h: '..3.', s: '4..4' }, 1.0]],
        },
      },
      {
        key: 'soul-power',
        title: 'Soul Power',
        feel: 'shuffling verses on the hats, a B section on the ride with the bell on 2 and 4 (an approximation)',
        weight: 0.8,
        params: {
          bpm: [102, 108],
          swing: 24,
          swingRange: [16, 30],
          figures: [
            [{ h: '1.1.1.111.1.1.11', s: '....3..1....3...', k: '1.....1...1.....' }, 2],
            [
              {
                r: '1.1.2.1.1.1.2.1.',
                s: '....3.......3...',
                k: '1......1..1.....',
                hf: '....1.......1...',
              },
              1.4,
            ],
          ],
          fills: [
            [{ h: '..3.', s: '3..1' }, 1.0],
            [{ s: '13' }, 1.0],
          ],
        },
      },
      {
        key: 'think-about-it',
        title: 'Think (About It)',
        feel: 'Lyn Collins: the "yeah! woo!" break, loose and raw, plenty of shuffle in the hats (an approximation)',
        weight: 0.8,
        params: {
          bpm: [110, 116],
          swing: 26,
          swingRange: [18, 32],
          figures: [
            [{ h: '1.1.111.1.1.111.', s: '....3..1.1..3...', k: '1.......1.1.....' }, 2],
            [{ h: '1.1.111.1.1.111.', s: '....3.......3..1', k: '1.1.......1.....' }, 1.4],
          ],
          fills: [[{ s: '13' }, 1.0]],
        },
      },
      {
        key: 'love-light',
        title: 'Turn On Your Love Light',
        feel: 'Bobby Bland, 1961: gospel R&B in swung eighths, moving to the ride to lift it (an approximation)',
        weight: 0.6,
        params: {
          bpm: [102, 110],
          kit: 'sixties',
          swingUnit: 8,
          swing: 45,
          swingRange: [30, 60],
          ghostWeights: {},
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.....1.1.......' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3..1', k: '1.....1.1.....1.' }, 1.4],
          ],
          fills: [
            [{ s: '3.3.3...', k: '1.1.1...' }, 1.0],
            [{ s: '13' }, 1.0],
          ],
        },
      },
    ],
  },
  bernardpurdie: {
    label: 'Bernard Purdie',
    drummer: true,
    hint: "Aretha Franklin's musical director and Steely Dan's drummer: strict time, dead in the pocket, a hard backbeat with soft ghosts all round it, and hats that open a crack just before the beat. His shuffle is the half-time one: triplets on the hats, the ghosts on the middle one, the backbeat on 3. Few fills, short and inside the groove. Each New plays a style inspired by one of twelve of his songs, from O-o-h Child and Rock Steady to Home at Last and Babylon Sisters, at its record tempo. The stage names the song. Seven follow Funklet's published grids and four human drum transcriptions; Memphis Soul Stew is an approximation, not a transcription.",
    kit: 'smdrums',
    mix: { h: 0.8 },
    hats: 8,
    bpm: [72, 130],
    swing: 4,
    swingRange: [0, 10],
    ghostBias: 0.5,
    // either side of the backbeats, as his ghosts sit
    ghostWeights: { 1: 0.2, 7: 0.3, 9: 0.3, 15: 0.25 },
    opens: 1,
    openSlots: [2, 10],
    backbeats: [4, 12],
    targetDensity: 10,
    hatDepth: 0.8,
    toms: true,
    // strict time: everything on the grid, the ghosts a hair behind
    feel: { label: 'Dead centre', k: 0, s: 0.01, sGhost: 0.03, h: [0, 0.02], jitter: 0.006 },
    // few fills, and only at the end of a phrase
    fillChance: 0.6,
    midFills: 0,
    kick1: [
      ['1000', 3],
      ['1010', 2],
      ['1001', 1],
    ],
    kick: [
      ['0010', 2],
      ['0000', 1.5],
      ['1000', 1],
      ['0001', 1],
    ],
    figures: [
      // Rock Steady: the hats open on the "and"s of 1 and 3 and a crack on the "a"s of 2 and 4
      [
        {
          h: '1.3.1.141.3.1.14',
          hf: '1...1...1...1...',
          s: '.1..31.1.1..31.1',
          k: '..1.1..1..1.1...',
        },
        2,
      ],
      // Kid Charlemagne: four on the floor under the ghosts
      [{ h: '1.3.1.1.1.3.1.1.', s: '.1..21.1.1..21.1', k: '1...1...1...1...' }, 1.5],
      // The Fez: linear, the hats on the "and"s and the snare in the gaps
      [{ h: '..1...1...1...1.', s: '.1.131...1.131..', k: '2.......2.......' }, 1.0],
      // Synthetic Substitution: the fast-footed kick under a plain backbeat
      [{ h: '2.2.1.2.2.1.1.2.', s: '....3.......3...', k: '1.2....2..22...1' }, 1.0],
    ],
    fills: [
      // the backbeat, a ghost and an accent on the "a"
      [{ s: '3.13' }, 1.5],
      // a ghost and a hit into the 1
      [{ s: '12.' }, 1.2],
      // the snare on 4, the hats opening a crack after it, the snare on the "a"
      [{ h: '..4.', s: '3..3' }, 1.0],
    ],
    /* His records, each at its own tempo: one New picks one, and the stage
       names it. Seven are from Goodhertz's Funklet grids (Jack Stratton's
       transcriptions, two bars each, tempos as given there), its five levels
       mapped onto this file's values: Funklet's snare 4 is our accent (3), its
       3 our hit (2), its 2 and 1 our ghost (1); its kick 4 our accent; its
       accented hats our `h` 2, the opens 3 and the half-opens 4. Kid Charlemagne, Deacon Blues, Home at Last and Babylon
       Sisters are the commonest bars of human Songsterr transcriptions; the
       two shuffles' tabs leave out the ghosts, which every lesson on the
       Purdie shuffle puts on the middle triplet, so they are written in.
       Memphis Soul Stew is built from a lesson's description. The shuffles
       are in sextuplet 4/4 (`4/4-6`), so the tempo reads as the record's
       quarter and the backbeat on 3 is step 12. See
       `.context/app/planning/drumming-research.md`, section L. */
    songs: [
      {
        key: 'o-o-h-child',
        title: 'O-o-h Child',
        feel: 'disco hats opening on every "and", the snare cracking under the key changes',
        weight: 1.1,
        params: {
          bpm: [87, 91],
          swing: 0,
          ghostWeights: {},
          figures: [
            /* the first bar, three of its ghosts (the "a" of 2 and the "e" and
               "a" of 4) left out for air: the critic wants a quarter of the bar
               free of kick and snare, and the kick takes five steps */
            [{ h: '213.213.213.213.', s: '.2.131...2.13...', k: '2.2.....2.12....' }, 2],
            // the second bar: accents on the "e" of 3 and on 4 and its "and"; three ghosts left out
            [{ h: '213.213.213.213.', s: '.1.13....3..3.3.', k: '2.12....2.12....' }, 1.6],
          ],
          fills: [
            // cracking every beat on the snare, as he does near the end
            [{ s: '3...3.3.' }, 1.2],
            [{ s: '3...3...' }, 1.0],
          ],
        },
      },
      {
        key: 'rock-steady',
        title: 'Rock Steady',
        feel: 'the foot on the quarters, the hats opening on the "and"s and a crack before 2 and 4, no kick on 1',
        weight: 1.5,
        params: {
          bpm: [101, 105],
          swing: 8,
          swingRange: [4, 12],
          ghostWeights: {},
          // the kick never lands on the 1 in this groove
          phraseMark: { kick: false },
          figures: [
            [
              {
                h: '1.3.1.141.3.1.14',
                hf: '1...1...1...1...',
                s: '.1..31.1.1..31.1',
                k: '..1.1..1..1.1...',
              },
              2,
            ],
            // the second bar: the "a"s left closed
            [
              {
                h: '1.3.1.111.3.1.11',
                hf: '1...1...1...1...',
                s: '.1..31.1.1..31.1',
                k: '..1.1..1..1.1...',
              },
              1.6,
            ],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ h: '..4.', s: '3..3' }, 1.0],
          ],
        },
      },
      {
        key: 'memphis-soul-stew',
        title: 'Memphis Soul Stew',
        feel: 'King Curtis live: the "pound of fatback drums", the hats opening a crack before every beat; reconstructed',
        weight: 0.6,
        params: {
          bpm: [108, 116],
          swing: 4,
          swingRange: [0, 8],
          ghostWeights: {},
          figures: [
            // the left hand on the "e"s, the right on the hats but for the backbeat
            [{ h: '1.14..141.14..14', s: '.1..31...1..31..', k: '1.....1...1.....' }, 2],
            [{ h: '1.14..141.14..14', s: '.1..31...1..31..', k: '1..1..1...1.....' }, 1.2],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ s: '12.' }, 1.0],
          ],
        },
      },
      {
        key: 'use-me',
        title: 'Use Me',
        feel: 'Esther Phillips\'s cover: a busy snare of even hits, the hats opening on the "and"s of 1 and 3',
        weight: 0.8,
        params: {
          bpm: [80, 84],
          swing: 14,
          swingRange: [10, 18],
          ghostWeights: {},
          figures: [
            [{ h: '1.3.1111113.1111', s: '..2.2.22.12.2.22', k: '1...1.......1...' }, 2],
            [{ h: '113.1111113.1111', s: '.12.2.22.12.2.22', k: '....1..1..1.1...' }, 1.6],
          ],
          fills: [
            [{ s: '2.22' }, 1.2],
            [{ h: '3.1.', s: '.2.2' }, 1.0],
          ],
        },
      },
      {
        key: 'synthetic-substitution',
        title: 'Synthetic Substitution',
        feel: 'the much-sampled break: a plain backbeat over a fast-footed kick, the foot swinging a little',
        weight: 1.1,
        params: {
          bpm: [91, 95],
          swing: 8,
          swingRange: [4, 12],
          ghostWeights: {},
          figures: [
            /* the kick's softest note, on the "e" of 3, left out: three 16ths in
               a row on one foot is a run the critic will not pass */
            [{ h: '2.2.1.2.2.1.1.2.', s: '....3.......3...', k: '1.2....2..22...1' }, 2],
            [{ h: '1.3.1.2.2.1.1.2.', s: '....3.......3...', k: '2.2....2..22...1' }, 1.6],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ s: '3..3', k: '.1..' }, 1.0],
          ],
        },
      },
      {
        key: 'kid-charlemagne',
        title: 'Kid Charlemagne',
        feel: 'four on the floor under ghosted sixteenths, the hats opening on the "and"s of 1 and 3',
        weight: 1.2,
        params: {
          kit: 'teatowel',
          bpm: [95, 100],
          swing: 4,
          swingRange: [0, 8],
          ghostWeights: {},
          figures: [
            [{ h: '1.3.1.1.1.3.1.1.', s: '.1..21.1.1..21.1', k: '1...1...1...1...' }, 2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '.1..21...1..21..', k: '1...1...1...1...' }, 1.0],
            // the solo: sixteenths in pairs on the hats, the ghosts thinned
            [{ h: '1.111.111.111.11', s: '.1..2....1..2...', k: '1...1...1...1...' }, 0.8],
          ],
          fills: [
            [{ s: '12.' }, 1.2],
            // eighths on the snare, a crash and the kick on the "e" and the "a" of 4
            [{ s: '2.2.2...', c: '.....1.1', k: '.....1.1' }, 1.0],
          ],
        },
      },
      {
        key: 'the-fez',
        title: 'The Fez',
        feel: 'linear: the hats on the "and"s, the snare in every gap, the kick on 1 and 3',
        weight: 1.0,
        params: {
          kit: 'teatowel',
          bpm: [97, 101],
          swing: 0,
          ghostWeights: {},
          /* the two softest ghosts of each bar (the "a"s of 2 and 4) left out for
             air: the critic wants a quarter of the bar free of kick and snare */
          figures: [
            [{ h: '..1...1...1...1.', s: '.1.131...1.131..', k: '2.......2.......' }, 2],
            // the second bar: an accent on the "e" of 3, the kick walking
            [{ h: '..1...1...1...1.', s: '.1.131...3.131..', k: '2.......2..2..2.' }, 1.6],
          ],
          fills: [
            // the backbeat kept, the ghosts round it
            [{ s: '3.13' }, 1.2],
            [{ s: '31.1' }, 1.0],
          ],
        },
      },
      {
        key: 'haitian-divorce',
        title: 'Haitian Divorce',
        feel: 'slow and light, the kick on the "and"s of 1 and 3 and on 2 and 4, ghosts round the backbeat',
        weight: 0.9,
        params: {
          kit: 'teatowel',
          bpm: [72, 76],
          swing: 0,
          ghostWeights: {},
          figures: [[{ h: '113.1111113.1111', s: '.1..3.11.1..3.11', k: '..1.1.....1.1...' }, 2]],
          fills: [
            [{ s: '3.11' }, 1.2],
            [{ h: '3...', s: '3..3' }, 1.0],
          ],
        },
      },
      {
        key: 'deacon-blues',
        title: 'Deacon Blues',
        feel: 'plain eighths and a backbeat, the kick on 1, the "and" of 2, 3 and the "and" of 4; the ride in the choruses',
        weight: 1.0,
        params: {
          kit: 'teatowel',
          bpm: [114, 118],
          swing: 4,
          swingRange: [0, 8],
          ghostBias: 0.1,
          ghostWeights: {},
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.....1.' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.....1.' }, 1.0],
          ],
          fills: [
            // the snare on the "and" of 3, the floor tom twice and the rack tom
            [{ s: '2.....', t3: '..11..', t2: '....1.' }, 1.2],
            [{ s: '2.2.' }, 0.8],
          ],
        },
      },
      {
        key: 'home-at-last',
        title: 'Home at Last',
        feel: 'the Purdie shuffle: triplets on the hats, ghosts on the middle one, the backbeat on 3, the kick moving under it',
        weight: 1.5,
        params: {
          kit: 'teatowel',
          meter: '4/4-6',
          bpm: [125, 129],
          swing: 0,
          backbeats: [12],
          ghostWeights: {},
          opens: 0,
          figures: [
            // the kick on 1, the last triplets of 1 and 2, and the last of 4
            [
              {
                h: '2...1.2...1.2...1.2...1.',
                s: '..1.....1...3.1.....1...',
                k: '1...1.....1...........1.',
              },
              1.4,
            ],
            // the kick on 1 and the last triplet of 2
            [
              {
                h: '2...1.2...1.2...1.2...1.',
                s: '..1.....1...3.1.....1...',
                k: '1.........1.............',
              },
              1.4,
            ],
            [
              {
                h: '2...1.2...1.2...1.2...1.',
                s: '..1.....1...3.1.....1...',
                k: '1...1.....1.............',
              },
              1.0,
            ],
            // the verse: the hats on the beats alone
            [
              {
                h: '2.....2.....2.....2.....',
                s: '..1.....1...3.1.....1...',
                k: '1.........1...........1.',
              },
              1.0,
            ],
          ],
          // triplets inside the shuffle, a gap between every note
          fills: [
            [{ s: '1.1.3.' }, 1.2],
            [{ s: '2.2...', t3: '....2.' }, 1.0],
          ],
        },
      },
      {
        key: 'babylon-sisters',
        title: 'Babylon Sisters',
        feel: 'the Purdie shuffle slower and with more space, the kick on 1 and the last triplet of 4, a cross-stick on 3 to start',
        weight: 1.3,
        params: {
          kit: 'teatowel',
          meter: '4/4-6',
          bpm: [119, 123],
          swing: 0,
          backbeats: [12],
          ghostWeights: {},
          opens: 0,
          figures: [
            [
              {
                h: '2...1.2...1.2...1.2...1.',
                s: '..1.....1...3.1.....1...',
                k: '1.....................1.',
              },
              2,
            ],
            [
              {
                h: '2...1.2...1.2...1.2...1.',
                s: '..1.....1...3.1.....1...',
                k: '1.........1.............',
              },
              1.0,
            ],
            [
              {
                h: '2...1.2...1.2...1.2...1.',
                s: '..1.....1...3.1.....1...',
                k: '1.........1...........1.',
              },
              0.8,
            ],
            // the intro: the hats on the beats and the last triplet of 2, a rim click on 3
            [
              {
                h: '2.....2...1.2.....2.....',
                s: '............4...........',
                k: '1.....................1.',
              },
              0.6,
            ],
          ],
          fills: [
            [{ s: '1.1.3.' }, 1.2],
            [{ s: '2.2...', t3: '....2.' }, 1.0],
          ],
        },
      },
      {
        key: 'hot-sweat',
        title: 'Hot Sweat',
        feel: 'his solo take on Cold Sweat: the backbeat on 2 and the "and" of 4, then on 2 and 4 with the kick doubled',
        weight: 0.5,
        params: {
          bpm: [112, 116],
          swing: 0,
          ghostWeights: {},
          figures: [
            [{ h: '1.2.2.1.2.1.1.1.', s: '....3..111..1.31', k: '2.........2.....' }, 2],
            // the second bar, its two softest ghosts (the "a" of 2 and the "e" of 3) left out for air
            [{ h: '1.111.2.2.111.1.', s: '.1.131.....131..', k: '..12......12..2.' }, 1.6],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ h: '3...', s: '...3' }, 1.0],
          ],
        },
      },
    ],
  },
  gadd: {
    label: 'Steve Gadd',
    drummer: true,
    hint: "The New York session drummer of the 1970s, with Paul Simon, Steely Dan and Chick Corea, later Eric Clapton and James Taylor: drum corps rudiments split across the kit, ghosts felt more than heard, a firm backbeat a hair behind, and a groove that becomes the song's hook. Short fills at the end of a phrase: flams, drags, hand-hand-foot runs round the toms. A dead 1970s studio kit. Each New plays one of fifteen of his songs at its record tempo: 50 Ways to Leave Your Lover's march, Late in the Evening's mozambique, Aja's verse, Chuck E.'s in Love's half-time shuffle, Lenore's displaced backbeat. The stage names the song. Eight follow human transcriptions; the rest are approximations.",
    toms: true,
    kit: 'teatowel',
    mix: { h: 0.7 },
    hats: 8,
    bpm: [76, 138],
    swing: 0,
    ghostBias: 0.5,
    ghostWeights: { 3: 0.2, 7: 0.25, 11: 0.2, 15: 0.25 },
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 8,
    hatDepth: 0.85,
    // rudiments: a fill accent often a flam, the ghost before a backbeat a drag
    flam: 0.3,
    drag: 0.2,
    rimshot: 0.05,
    // behind: the snare a shade late, the kick nearly with it, the hats on the grid
    feel: { label: 'Behind', s: 0.04, sGhost: 0.02, k: 0.01, jitter: 0.01 },
    /* Fills at the end of a phrase and nowhere else: two beats is usual, a
       bar the most. The crash marks a section, not every half of one. */
    fillChance: 0.6,
    midFills: 0,
    phraseMark: { crash: 0.5 },
    kick1: [
      ['1000', 3],
      ['1010', 1.5],
      ['1001', 1],
    ],
    kick: [
      ['0000', 2],
      ['0010', 1.5],
      ['1000', 1],
    ],
    figures: [
      // 50 Ways: hat, snare and hat foot taken in turn, a rest on 3, a drag into 4
      [
        {
          h: '.1.1..1.........',
          s: '..1.3..1....7.1.',
          k: '1.......1.......',
          hf: '.....1..........',
        },
        1.4,
      ],
      // the backbeat, ghosts either side of it, the kick on the "a" of 2
      [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3...', k: '1......1..1.....' }, 1.2],
      // Lenore: the hands in turn, the kick always with the hat
      [{ h: '1.1.1.1.1.1.1.1.', s: '.1.1.3.1...1.3.1', k: '1.....1.1.....1.' }, 0.8],
      // a smooth sixteenth, the accents on the beat
      [{ h: '2121212121212121', s: '....3.......3...', k: '1.....1..1......' }, 1.0],
    ],
    fills: [
      // hand, hand, foot: the snare, then the toms, the kick every third note
      [{ s: '31......', k: '..1..1..', t1: '...21...', t3: '......21' }, 1.4],
      // flams on 3 and 4, a ghost after each
      [{ s: '6.1.6.1.' }, 1.0],
      // a drag, a tap and an accent
      [{ s: '7.13' }, 1.2],
      // a paradiddle-diddle across the snare and the toms
      [{ s: '2.11....', t1: '.2..11..', t3: '......22' }, 1.0],
    ],
    /* His records: one New picks one, and the stage names it. Tempos are
       songbpm's unless the Steve Gadd section of
       `.context/app/planning/drumming-research.md` gives another source. Eight
       follow human Songsterr transcriptions, read bar by bar: 50 Ways, Late
       in the Evening (the hands; the feet are from lessons), Aja, Chuck E.'s
       in Love, The Hustle, Glamour Profession, Just the Two of Us and When
       You Got a Good Friend. Lenore is built from a lesson that describes it,
       and the rest are reconstructions in his vocabulary. */
    songs: [
      {
        key: 'fifty-ways',
        title: '50 Ways to Leave Your Lover',
        feel: 'a march across hat, snare and hat foot, the kick on the "a" of 2 and on 3, a roll into 4',
        weight: 1.6,
        params: {
          bpm: [100, 106],
          swing: 0,
          swingRange: [0, 6],
          hats: 16,
          // the verse has no backbeat on 2: the 4 is the one it marks
          backbeats: [12],
          // the groove is written out to the last ghost
          ghostWeights: {},
          /* From a human Songsterr transcription (234652), bar by bar. The
             roll into 4 is 32nds there; on this grid its first stroke and the
             32nd after it are a buzz, and the 16ths after it ghosts. */
          figures: [
            // the verse's first bar: the rack tom on 3 with the kick, a roll into 4
            [
              {
                h: '.1..1.1.........',
                hf: '1..1............',
                k: '1......11.......',
                s: '..1..1......8.11',
                t1: '........1.......',
              },
              2,
            ],
            // its answer: the floor tom on 4, two double strokes after it
            [
              {
                h: '.1..1.1.........',
                hf: '1..1............',
                k: '1......11.......',
                s: '..1..1........88',
                t1: '........1.......',
                t3: '............1...',
              },
              1.8,
            ],
            // the chorus: eighths, the hats opening on every "and"
            [{ h: '1.3.1.3.1.3.1.3.', s: '....2.......2...', k: '1.......1.......' }, 0.8],
          ],
          fills: [
            // the verse's roll, as a phrase ending
            [{ s: '8.11' }, 1.4],
            [{ t3: '2...', s: '..88' }, 1.0],
          ],
        },
      },
      {
        key: 'late-in-the-evening',
        title: 'Late in the Evening',
        feel: 'his mozambique: the bell pattern in the right hand, the left on the low tom, the foot on every beat',
        weight: 1.5,
        params: {
          bpm: [116, 122],
          swing: 0,
          // the left hand's tom, not a snare, carries the 2 and the "a" of 3
          backbeats: [6, 12],
          mix: { h: 0.7, p1: 0.8 },
          /* The hands are from a human Songsterr transcription (424011): the
             right hand's bell pattern, which the tab splits between hat and
             ride, and the left hand on the low tom on the "and" of 2 and the
             "a" of 3. The tab writes no feet; the kick on the "and"s of 2 and
             4 and the foot on every beat are from the lessons that describe
             his mozambique. */
          perc: [{ inst: 'cowbell', steps: [0, 2, 4, 5, 7, 9, 10, 12, 13, 15], accents: [0, 8] }],
          ghostWeights: {},
          figures: [
            [
              {
                t2: '......2....2....',
                k: '......1.......1.',
                hf: '1...1...1...1...',
              },
              2,
            ],
            // the left hand once more, on the "a" of 4
            [
              {
                t2: '......2....2.2..',
                k: '......1.......1.',
                hf: '1...1...1...1...',
              },
              1.2,
            ],
          ],
          fills: [
            // the tab's fill: down the toms in threes, the foot between them
            [
              {
                t1: '222........',
                hf: '...1...1...',
                t2: '....222....',
                t3: '........222',
              },
              1.4,
            ],
            [{ t2: '2.2.', t3: '.2.2' }, 1.0],
          ],
        },
      },
      {
        key: 'aja',
        title: 'Aja',
        feel: 'the verse: hats opening on the "and"s of 1 and 3, a cross-stick on 2 and 4',
        weight: 1.4,
        params: {
          bpm: [116, 122],
          swing: 0,
          swingRange: [0, 6],
          /* From a human Songsterr transcription whose drum track is named
             for him (54438). Its ride sections, the floor tom on 3 and no
             backbeat at all, and the solo are left out: the critic wants a
             backbeat in every bar. */
          figures: [
            [{ h: '1.3.1.1.1.3.1.1.', s: '....4.......4...', k: '1.....1.1.....1.' }, 2],
            [{ h: '1.3.1.1.1.3.1.1.', s: '....4.......4...', k: '1.....1.1.......' }, 1.2],
            // the hats open on the "and" of 4 as well
            [{ h: '1.3.1.1.1.3.1.3.', s: '....4.......4...', k: '1.....1.1.....1.' }, 0.8],
          ],
          fills: [
            [{ s: '31......', k: '..1..1..', t1: '...21...', t3: '......21' }, 1.4],
            [{ s: '7.13' }, 1.0],
          ],
        },
      },
      {
        key: 'nite-sprite',
        title: 'Nite Sprite',
        feel: 'a rollicking funk sixteenth on the hats, the small rack tom answering the backbeat',
        weight: 1.1,
        params: {
          bpm: [116, 124],
          swing: 0,
          swingRange: [0, 6],
          hats: 16,
          figures: [
            [{ h: '1111111111111111', s: '....3..1.1..3...', k: '1..1......1..1..' }, 2],
            [
              {
                h: '1111111111111...',
                s: '....3..1.1..3...',
                k: '1..1......1.....',
                t1: '.............22.',
              },
              1.2,
            ],
          ],
          fills: [
            [{ s: '31..', t1: '..21' }, 1.2],
            [{ s: '31......', k: '..1..1..', t1: '...21...', t3: '......21' }, 1.0],
          ],
        },
      },
      {
        key: 'lenore',
        title: 'Lenore',
        feel: 'funk-samba: the backbeat on 2 pushed a sixteenth early, the floor tom on 1, then the hands in turn',
        weight: 1.1,
        params: {
          bpm: [126, 134],
          swing: 0,
          swingRange: [0, 6],
          ghostWeights: {},
          // the floor tom has the 1: the phrase's crash, but no kick under it
          phraseMark: { kick: false },
          figures: [
            // the A section: the floor tom on 1, the backbeat on the "a" of 1
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                t3: '2...............',
                s: '...3...1....3...',
                k: '......1.1.....1.',
              },
              1.6,
            ],
            // the B section: the backbeats a sixteenth late, the kick always with the hat
            [{ h: '1.1.1.1.1.1.1.1.', s: '.1.1.3.1...1.3.1', k: '1.....1.1.....1.' }, 1.4],
          ],
          fills: [
            [{ s: '3.1.', t3: '.2.2' }, 1.2],
            [{ s: '6..1', t1: '.2..', t3: '..2.' }, 1.0],
          ],
        },
      },
      {
        key: 'samba-song',
        title: 'Samba Song',
        feel: 'a samba on the kit: eighths on the ride, the clave on the rim, the surdo in the kick',
        weight: 0.9,
        params: {
          bpm: [132, 138],
          swing: 0,
          ghostWeights: {},
          figures: [
            [
              {
                r: '1.1.1.1.1.1.1.1.',
                s: '4..4..4...4..4..',
                k: '1..1....1..1....',
                hf: '....1.......1...',
              },
              1.6,
            ],
            [{ h: '1.1.1.1.1.1.1.1.', s: '4..4..4...4..4..', k: '1..1....1..1....' }, 1.0],
          ],
          fills: [
            // the clave's last two notes kept, accented
            [{ s: '3.2..3.3' }, 1.2],
            [{ t1: '2...2...', t3: '..2...22' }, 1.0],
          ],
        },
      },
      {
        key: 'chuck-es-in-love',
        title: "Chuck E.'s in Love",
        feel: 'a lazy half-time shuffle, the snare on 3, the kick in pairs; the tempo is the half-time beat',
        weight: 1.2,
        params: {
          meter: '4/4-6',
          bpm: [56, 60],
          swing: 0,
          backbeats: [12],
          ghostWeights: {},
          opens: 0,
          /* From a human Songsterr transcription (385456), written at 116
             with the snare once every two bars and a triplet feel: two of its
             bars are one bar here, its eighths are our shuffled sixteenths
             (the first and third of each triplet), and the snare lands on 3. */
          figures: [
            [
              {
                h: '......1..1.....1.....1..',
                k: '..11.............11.1..1',
                s: '............2...........',
              },
              1.6,
            ],
            [
              {
                h: '...1.......1...1.....1..',
                k: '.....11.................',
                s: '............2.....2.....',
              },
              1.2,
            ],
            [
              {
                h: '...1.......1...1.....1..',
                k: '.....11...........1.....',
                s: '............2...........',
              },
              1.0,
            ],
            [
              {
                h: '...1.......1...1.....1..',
                k: '1....11...........1.....',
                s: '............2...........',
              },
              0.6,
            ],
            // the later choruses: the snare on 1 as well as 3
            [
              {
                h: '...1.....1.....1.....1..',
                k: '......1...........1.....',
                s: '2...........2...........',
              },
              1.0,
            ],
          ],
          // the tab has no fills to speak of: a backbeat and two ghosts
          fills: [[{ s: '2.1.1.' }, 1.0]],
        },
      },
      {
        key: 'the-hustle',
        title: 'The Hustle',
        feel: 'sixteenths on the hats, opening through the bar, the kick on 1 and the "and" of 2',
        weight: 0.8,
        params: {
          bpm: [107, 113],
          swing: 0,
          swingRange: [0, 6],
          hats: 16,
          ghostWeights: {},
          /* From a human Songsterr transcription (57585). The percussion
             (tambourine, congas, cabasa) is the percussionist's, and is left
             out; so is the intro, which has no backbeat. */
          figures: [
            [{ h: '1113111..13.1131', s: '....2.......2...', k: '1.....1.........' }, 2],
            // the break: crash and kick on 1 and 3, the snare either side of 2 and 4
            [
              {
                c: '........2.......',
                h: '3...............',
                s: '...2.2.....2.2..',
                k: '1.......1.......',
              },
              0.4,
            ],
          ],
          fills: [
            // crash, kick and snare together, then the toms in pairs
            [
              {
                c: '1.......',
                k: '1.......',
                s: '2.......',
                t1: '..11....',
                t2: '....11..',
                t3: '......11',
              },
              1.2,
            ],
            [{ s: '2.22' }, 1.0],
          ],
        },
      },
      {
        key: 'glamour-profession',
        title: 'Glamour Profession',
        feel: 'Steely Dan\'s disco: the kick on every beat, eighths on the hats\' "and"s, opening on the last',
        weight: 0.9,
        params: {
          bpm: [114, 120],
          swing: 0,
          swingRange: [0, 6],
          ghostWeights: {},
          // from a human Songsterr transcription (64450), the fills its own
          figures: [
            [
              {
                h: '..1...1...1...3.',
                hf: '1...............',
                s: '....2.......2...',
                k: '1...1...1...1...',
              },
              2,
            ],
          ],
          fills: [
            [{ s: '2.......', t2: '...12.2.', k: '1...1...' }, 1.2],
            [{ t1: '1.1.....', t2: '...1..1.', s: '....2...', k: '1...1...' }, 1.0],
          ],
        },
      },
      {
        key: 'third-world-man',
        title: 'Third World Man',
        feel: 'slow and dark, eighths on the hats, ghosts round the backbeat',
        weight: 0.6,
        params: {
          bpm: [104, 110],
          swing: 0,
          swingRange: [0, 8],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3...', k: '1.........1.....' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.1.', s: '.1..3..1....3..1', k: '1.....1...1.....' }, 1.0],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ s: '31......', k: '..1..1..', t1: '...21...', t3: '......21' }, 0.8],
          ],
        },
      },
      {
        key: 'slip-slidin-away',
        title: "Slip Slidin' Away",
        feel: 'quiet eighths on the hats, a cross-stick on 2 and 4, under the voices',
        weight: 0.6,
        params: {
          bpm: [118, 124],
          swing: 0,
          swingRange: [0, 6],
          ghostBias: 0.3,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.......1.1.....' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4..1....4...', k: '1.......1..1....' }, 1.0],
          ],
          fills: [
            [{ s: '4.13' }, 1.2],
            [{ t1: '2.1.', t3: '..2.' }, 0.8],
          ],
        },
      },
      {
        key: 'just-the-two-of-us',
        title: 'Just the Two of Us',
        feel: 'eighths on the hats, the kick on 1, the "a" of 2 and 3, a plain backbeat',
        weight: 1.0,
        params: {
          bpm: [93, 99],
          swing: 0,
          swingRange: [0, 6],
          ghostWeights: {},
          /* From a human Songsterr transcription whose drum track is named for
             him (597061). The bridge, ride on the beats and no snare, is left
             out: the critic wants a backbeat in every bar. */
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1......11.......' }, 1.6],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '1......11.......' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1......11......1' }, 0.8],
          ],
          fills: [
            [{ s: '3.13' }, 1.2],
            [{ s: '6...', t1: '..2.', t3: '...2' }, 0.8],
          ],
        },
      },
      {
        key: 'were-in-this-love-together',
        title: "We're in This Love Together",
        feel: 'a slow sixteenth shuffle under the voice, ghosts in the gaps',
        weight: 0.9,
        params: {
          bpm: [75, 82],
          swing: 70,
          swingRange: [55, 85],
          hats: 16,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1.1..3..1', k: '1..1..1...1.....' }, 1.4],
            [{ h: '1.111.111.111.11', s: '....3.......3...', k: '1.....1.1.......' }, 1.0],
          ],
          fills: [
            [{ s: '3.1.3.11' }, 1.0],
            [{ s: '7.13' }, 1.0],
          ],
        },
      },
      {
        key: 'good-friend',
        title: 'When You Got a Good Friend',
        feel: 'a light shuffle with Clapton, the kick on every beat, a ghost on the "and" of 4, on a warmer kit',
        weight: 0.8,
        params: {
          bpm: [92, 98],
          kit: 'osdk',
          swingUnit: 8,
          swing: 85,
          swingRange: [75, 100],
          ghostWeights: {},
          // from a human Songsterr transcription (5009), its triplet feel the swing
          figures: [
            [{ h: '2.1.2.1.2.1.2.1.', s: '....2.......2.1.', k: '1...1...1...1...' }, 1.6],
            [{ h: '2.1.2.1.2.1.2.1.', s: '....2.......2...', k: '1...1...1...1...' }, 0.8],
          ],
          fills: [[{ s: '2.11' }, 1.0]],
        },
      },
      {
        key: 'stretch-of-the-highway',
        title: 'Stretch of the Highway',
        feel: 'with James Taylor: a rolling groove, a cross-stick in the verse, on a warmer kit',
        weight: 0.6,
        params: {
          bpm: [107, 113],
          kit: 'osdk',
          swing: 0,
          swingRange: [0, 8],
          hats: 16,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.....1.1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....3..1....3...', k: '1.....1.1.1.....' }, 1.0],
          ],
          fills: [
            [{ s: '4.13' }, 1.2],
            [{ t1: '2.1.', t3: '..2.' }, 0.8],
          ],
        },
      },
    ],
  },
  hakim: {
    label: 'Omar Hakim',
    drummer: true,
    hint: "The session drummer who was in Weather Report while he made Let's Dance, then played Brothers in Arms, Sting's first solo album and Get Lucky: dead on the grid, the pop records big and simple, a kick that moves in 16ths under quarter-note or eighth-note hats, few fills and short ones, and the fusion dense and conversational. Each New plays one of seventeen of his songs, from Let's Dance to Beyond, at its record tempo. The stage names the song. Twelve follow human transcriptions; the rest are approximations and say so.",
    toms: true,
    kit: 'drs',
    hats: 8,
    bpm: [72, 162],
    swingUnit: 16,
    // straight, with the faintest lilt on the 16ths
    swing: 4,
    swingRange: [0, 8],
    ghostBias: 0.1,
    ghostHit: 0.5,
    opens: 1,
    openSlots: [14, 6],
    backbeats: [4, 12],
    targetDensity: 6,
    hatDepth: 0.7,
    rimshot: 0.15,
    // impeccable timing, Bowie said: on the grid, and the same every time
    feel: { label: 'Dead on the grid', jitter: 0.005 },
    // a fill to end most phrases, short, and hardly ever one inside them
    fillChance: 0.6,
    midFills: 0.05,
    kick1: [
      ['1001', 2],
      ['1000', 2],
      ['1010', 1],
    ],
    kick: [
      ['0010', 2],
      ['1000', 1.5],
      ['1010', 1],
    ],
    /* His grooves, from human Songsterr transcriptions, each one credited to
       him on the record. See planning/drumming-research.md, section O. */
    figures: [
      // Let's Dance: quarter-note hats, the kick on 1, the "a" of 1 and the "and" of 2
      [{ h: '1...1...1...1...', s: '....2.......2...', k: '1..1..1.1.......' }, 1.4],
      // Money for Nothing: eighths, the kick on 1, 3 and the "and" of 4
      [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.....1.' }, 1.2],
      // So Far Away: the kick on 1 and the "and" of 2
      [{ h: '1.1.1.1.1.1.1.4.', s: '....2.......2...', k: '1.....1.........' }, 1.0],
      // Get Lucky: an open hat on every beat, three closed 16ths after it
      [{ h: '3111311131113111', s: '....2.......2...', k: '1.......1.......' }, 1.0],
      // Beyond: 16th hats over a kick in dotted 8ths
      [{ h: '1111111111111111', s: '....2.......2...', k: '..1..1..1..1..1.' }, 0.8],
    ],
    fills: [
      // Let's Dance: three 16ths into the backbeat, two after it
      [{ h: '1...3...', s: '..222.22' }, 1.2],
      // Let's Dance: the backbeat, then two 16ths into the next 1
      [{ h: '3...', s: '2.22' }, 1.2],
      // Money for Nothing: ghosts into the 4, and the kick on its "and"
      [{ h: '1.......', s: '..123...', k: '1.....1.' }, 1.0],
      // So Far Away: two on the floor tom after the backbeat
      [{ h: '1...', s: '2...', t3: '..11' }, 1.0],
      // Contact: down the toms from 4
      [{ t2: '111.', t3: '...1' }, 0.8],
    ],
    /* His records, each at its own tempo: one New picks one, and the stage
       names it. Twelve are read off human Songsterr transcriptions (each
       tab's aiGenerated flag checked); Fortress Around Your Heart, If You Love
       Somebody Set Them Free, Consider Me Gone and Corner Pocket follow AI
       tabs or a regenerated one, and Predator is a reconstruction. Their feel
       says so. */
    songs: [
      {
        key: 'lets-dance',
        title: "Let's Dance",
        feel: 'quarter-note hats, the kick moving in 16ths under them, a big gated snare',
        weight: 1.4,
        params: {
          bpm: [114, 116],
          kit: 'bigrusty',
          figures: [
            [{ h: '1...1...1...1...', s: '....2.......2...', k: '1..1..1.1.......' }, 1.6],
            [{ h: '1...1...1...1...', s: '....2.......2...', k: '1.....1.1.......' }, 1.0],
            [{ h: '1...1...1...3...', s: '....2.......2...', k: '1.......1.......' }, 0.8],
            [{ h: '1...1...1...3...', s: '....2.......2...', k: '1..1..1.1.......' }, 0.6],
          ],
          fills: [
            [{ h: '1...3...', s: '..222.22' }, 1.2],
            [{ h: '3...', s: '2.22' }, 1.2],
            // the crescendo's 8ths, the kick doubling after them
            [{ s: '22..2...', k: '..11..1.' }, 0.8],
          ],
        },
      },
      {
        key: 'money-for-nothing',
        title: 'Money for Nothing',
        feel: 'big, straight eighths, the kick on the "and" of 4; the tom fills on the record are Terry Williams\'s',
        weight: 1.3,
        params: {
          bpm: [132, 136],
          kit: 'bigrusty',
          fillChance: 0.4,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.....1.' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '1.......1.....1.' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '1.......1.......' }, 0.6],
          ],
          fills: [
            [{ h: '1.......', s: '..123...', k: '1.....1.' }, 1.2],
            [{ h: '1.3.3...', s: '..2.2...', k: '1.....1.' }, 1.0],
          ],
        },
      },
      {
        key: 'so-far-away',
        title: 'So Far Away',
        feel: 'eighths, the kick on 1 and the "and" of 2, the hat opening a crack on the "and" of 4',
        weight: 1.0,
        params: {
          bpm: [112, 116],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.........' }, 1.6],
            [{ h: '1.1.1.1.1.1.1.4.', s: '....2.......2...', k: '1.....1.........' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.11', s: '....2.......2...', k: '1.....1.........' }, 0.8],
          ],
          fills: [
            [{ h: '1.4.1.1.', s: '..2.2..2' }, 1.0],
            [{ h: '1...', s: '2...', t3: '..11' }, 1.0],
          ],
        },
      },
      {
        key: 'your-latest-trick',
        title: 'Your Latest Trick',
        feel: 'a late-night cross-stick that moves between 2 and its "and", the kick on 1 and the "and" of 4',
        weight: 0.8,
        params: {
          bpm: [121, 125],
          fillChance: 0.3,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4.....4.....', k: '1.............1.' }, 1.4],
            [{ h: '1.111.1.1.1.1.3.', s: '......4.....4...', k: '1.............1.' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.3.', s: '......4.....4...', k: '1.............1.' }, 1.0],
          ],
          fills: [[{ h: '1.1.1.3.', s: '..4.4...' }, 1]],
        },
      },
      {
        key: 'one-world',
        title: 'One World',
        feel: 'a plain 1 and 3, 2 and 4, and a snare pickup at the end of the bar',
        weight: 0.6,
        params: {
          bpm: [106, 110],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2.2.', k: '1.......1.......' }, 0.6],
          ],
          fills: [
            [{ s: '2.22' }, 1.2],
            [{ s: '2...', t1: '..11' }, 1.0],
            [{ t1: '1.....', s: '..2.22' }, 0.8],
          ],
        },
      },
      {
        key: 'slave-to-love',
        title: 'Slave to Love',
        feel: 'slow and floating: the foot on every other 16th, the kick on the beats and doubled on 3',
        weight: 0.7,
        params: {
          bpm: [72, 76],
          hats: 16,
          fillChance: 0.2,
          figures: [
            [
              {
                h: '....1....1..1...',
                hf: '.1.1.1.1.1.1.1.1',
                s: '....2.......2...',
                k: '1...1...11..1...',
              },
              1.2,
            ],
            // before the snare comes in
            [{ h: '....1....1..1...', hf: '.1.1.1.1.1.1.1.1', k: '1...1...11..1...' }, 0.8],
          ],
          fills: [[{ hf: '.1.1', s: '2...', k: '1...' }, 1]],
        },
      },
      {
        key: 'if-you-love-somebody-set-them-free',
        title: 'If You Love Somebody Set Them Free',
        feel: 'bright pop eighths, the kick pushing into 3; from an AI tab, not a human transcription',
        weight: 0.8,
        params: {
          bpm: [123, 127],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.1...1.1.......' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.3.', s: '....2.......2...', k: '1......11.1.....' }, 0.8],
          ],
        },
      },
      {
        key: 'love-is-the-seventh-wave',
        title: 'Love Is the Seventh Wave',
        feel: 'a reggae one drop, the kick on 3, the hat barking on the "and" of 4; the cross-stick is added, the tab has none',
        weight: 0.8,
        params: {
          bpm: [158, 162],
          fillChance: 0.2,
          // a one drop: nothing on the 1, not even the phrase's kick
          noKick: [0],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........4.......', k: '........1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.1.3.', s: '........4.......', k: '........1.......' }, 1.2],
            [{ h: '1.1.1.1.1.1.3.1.', s: '........4.......', k: '........1.......' }, 0.6],
          ],
          fills: [[{ h: '1.3.', s: '..4.' }, 1]],
        },
      },
      {
        key: 'fortress-around-your-heart',
        title: 'Fortress Around Your Heart',
        feel: 'a cross-stick verse and a struck chorus over the same kick; from a regenerated tab, an approximation',
        weight: 0.7,
        params: {
          bpm: [118, 122],
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.....1.1.......' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....4.......4...', k: '1.....1.1.1.....' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 1.0],
          ],
        },
      },
      {
        key: 'consider-me-gone',
        title: 'Consider Me Gone',
        feel: 'swung, on the ride, a rim click on 4 alone; from an AI tab, an approximation',
        weight: 0.6,
        params: {
          bpm: [122, 127],
          swingUnit: 8,
          swing: 70,
          swingRange: [60, 80],
          fillChance: 0.3,
          figures: [
            [
              {
                r: '1...1.1.1...1.1.',
                hf: '....1.......1...',
                s: '............4...',
                k: '1...............',
              },
              1.2,
            ],
            [{ h: '1...1...1...1...', s: '............4...', k: '1.....1.........' }, 0.8],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.0],
          ],
          fills: [[{ s: '4..2', k: '.1..' }, 1]],
        },
      },
      {
        key: 'get-lucky',
        title: 'Get Lucky',
        feel: 'four on the floor without the floor: an open hat on every beat, claps on 2 and 4',
        weight: 1.4,
        params: {
          bpm: [115, 117],
          hats: 16,
          perc: [{ inst: 'clap', follow: 'backbeats' }],
          fillChance: 0.4,
          figures: [
            [{ h: '1.1.1.1.1.1.1.11', s: '....2.......2...', k: '1.......1.......' }, 1.4],
            [{ h: '3111311131113111', s: '....2.......2...', k: '1.......1.......' }, 1.2],
            [{ h: '1.1.1.1.111.1.3.', s: '....2.......2...', k: '1.......1.......' }, 0.8],
            [{ h: '1.1.1.1.1.3..13.', s: '....2.......2...', k: '1.......1.......' }, 0.6],
          ],
          fills: [[{ h: '113.113.', s: '....2...' }, 1]],
        },
      },
      {
        key: 'giorgio-by-moroder',
        title: 'Giorgio by Moroder',
        feel: 'four on the floor under the click, then the climax: crashes on the beat and the kick in dotted 8ths',
        weight: 0.9,
        params: {
          bpm: [111, 115],
          build: true,
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1...1...1...1...' }, 1.4],
            [{ h: '3.1.1.1.3.1.1.1.', s: '....2.......2...', k: '1.......1.......' }, 1.0],
            [{ h: '1.1.3.1.1.1.3.1.', s: '....2.......2...', k: '1.......1.......' }, 0.5],
            [
              {
                c: '1...1...1...1...',
                hf: '1.1.1.1.1.1.1.1.',
                s: '....2..2..2.....',
                k: '1..1..1..1..1.1.',
              },
              0.8,
            ],
          ],
          fills: [[{ s: '1.......', t2: '..1.1.1.' }, 1]],
        },
      },
      {
        key: 'contact',
        title: 'Contact',
        feel: 'open hats on the beat, then a ride and the snare answering the riff as it climbs',
        weight: 0.7,
        params: {
          bpm: [120, 124],
          build: true,
          figures: [
            [{ h: '3...3...3...3...', s: '....2.......2...', k: '1.......1.......' }, 1.4],
            [
              {
                r: '1.1.1.1.1...1.1.',
                c: '..........1.....',
                s: '....22.2..2..2..',
                k: '1........1....1.',
              },
              0.8,
            ],
          ],
          fills: [
            [{ t2: '111.', t3: '...1' }, 1.0],
            // the snare build, in 8ths and pairs: the record's run of 16ths, broken
            [{ s: '2.22.22.' }, 1.0],
          ],
        },
      },
      {
        key: 'fragments-of-time',
        title: 'Fragments of Time',
        feel: 'a soft-rock shuffle of kick patterns, the hats now on the beat, now in 16ths',
        weight: 0.8,
        params: {
          bpm: [129, 132],
          hats: 16,
          figures: [
            [{ h: '1...1...1...1.3.', s: '....2.......2...', k: '1.1...1.1.1...1.' }, 1.2],
            [{ h: '....1...1...1...', s: '....2.......2...', k: '..1.....1.......' }, 1.0],
            [{ h: '1.1.1...1...1.3.', s: '....2.......2...', k: '1.......1.1...1.' }, 0.8],
            [{ h: '1111111111111111', s: '....2.......2...', k: '........1.......' }, 0.8],
            [{ h: '....1...1...1...', s: '....2.......2...', k: '..1...1.1.......' }, 0.6],
          ],
          fills: [[{ h: '....1...', s: '2...2...', k: '..1...1.', c: '......1.' }, 1]],
        },
      },
      {
        key: 'beyond',
        title: 'Beyond',
        feel: '16th hats over a kick in dotted 8ths',
        weight: 0.8,
        params: {
          bpm: [100, 104],
          hats: 16,
          figures: [
            [{ h: '1111111111111111', s: '....2.......2...', k: '1......11.......' }, 1.2],
            [{ h: '111111111111113.', s: '....2.......2...', k: '..1..1..1.....1.' }, 1.0],
            [{ h: '1111111111111111', s: '....2.......2...', k: '..1..1..1..1..1.' }, 1.0],
            [{ h: '1111111111113...', s: '....2.......2...', k: '1.1..1..1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'predator',
        title: 'Predator',
        feel: 'dense fusion 16ths with clean ghosts; a reconstruction in his vocabulary, no transcription',
        weight: 0.6,
        params: {
          bpm: [104, 108],
          kit: 'police',
          hats: 16,
          targetDensity: 10,
          figures: [
            [{ h: '1111113111111131', s: '....2.1..1..2.1.', k: '1..1...1..1.....' }, 1.2],
            [{ h: '1111113111111111', s: '.1..2.1..1..2.11', k: '1..1...1..1.1...' }, 1.0],
          ],
          fills: [
            [{ s: '2.1.', t1: '.2..', t3: '...2' }, 1.0],
            [{ t1: '22..', t2: '..22', k: '1.1.' }, 0.8],
          ],
        },
      },
      {
        key: 'corner-pocket',
        title: 'Corner Pocket',
        feel: 'Weather Report funk, the kick on 1, the "a" of 1 and the "and" of 2; from an AI tab, an approximation',
        weight: 0.6,
        params: {
          bpm: [105, 108],
          kit: 'police',
          hats: 16,
          targetDensity: 8,
          figures: [
            [{ h: '11111111113.1111', s: '............2...', k: '1..1..1.........' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2....2..2...', k: '1..1..1.........' }, 1.0],
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2....2..2...', k: '1..1..1....1.1..' }, 0.6],
          ],
          fills: [[{ h: '111.', s: '2...', t2: '...1' }, 1]],
        },
      },
    ],
  },
  elvinjones: {
    label: 'Elvin Jones',
    drummer: true,
    hint: "Coltrane's drummer 1960–66, then with McCoy Tyner, Wayne Shorter and his own Jazz Machine: a broad, legato ride leaning on the skip note, the hi-hat foot on 2 and 4, and the snare, toms and kick filling the triplets round it in groups of two and four that run across the bar line. Never a loop: the comping changes every bar. An open 1960s jazz kit. Each New plays one of thirteen of his songs in its own time: My Favorite Things and Juju as waltzes over a 6/8 foot part, Afro Blue two against three, Resolution in triplets, Chasin' the Trane and Impressions in fast eighths (the slider goes to 380). The stage names the song. Four follow Todd Bishop's transcriptions; the rest are reconstructions.",
    toms: true,
    kit: 'virtuosity',
    meter: '4/4-6',
    hats: 8,
    bpm: [120, 190],
    // the triplets are the meter in most of his songs; the fast ones set their own
    swing: 0,
    ghostBias: 1.2,
    ghostHit: 0.55,
    // the left hand on the middle triplet, which he stressed and landed phrases on
    ghostWeights: { 2: 0.36, 8: 0.32, 14: 0.36, 20: 0.32, 4: 0.2, 16: 0.2 },
    opens: 0,
    // no backbeat: in jazz the 2 and the 4 are the hi-hat foot
    backbeats: [6, 18],
    backbeatLane: 'hf',
    targetDensity: 8,
    hatDepth: 0.9,
    // broad and a little behind on the ride (the record's estimate; to be measured from stems)
    feel: { label: 'Broad, behind', r: 0.03, s: 0.02, k: 0.01, jitter: 0.02 },
    /* Constant commentary: a phrase ends by saying a little more rather than
       with a fill, and he comments inside the phrase too. The crash is part of
       the wave, not a marker on every 1. */
    fill: 'comp',
    fillComps: 2,
    midFills: 0.4,
    phraseMark: { crash: 0.4 },
    crossRhythm: 0.35,
    kick1: [
      ['1000', 4],
      ['0000', 3],
    ],
    kick: [
      ['0000', 5],
      ['0010', 1.2],
      ['1000', 1],
    ],
    /* His records: one New picks one, and the stage names it. Credits checked
       on Wikipedia for every song. Tempos are the Weimar Jazz Database's
       (jazzomat) and AllSolos's measurements of the solos on each record; Your
       Lady and the Jazz Machine's A Love Supreme have no measured tempo, and
       their ranges are estimates. Four follow Todd Bishop's transcriptions
       (cruiseshipdrummer.com): Chasin' the Trane (the first six choruses), Your
       Lady (intro and head), Juju (his page built from the record's groove)
       and the Jazz Machine's A Love Supreme (its groove). My Favorite Things is
       built from his "Assembling a basic Elvin waltz", which names it; the rest
       are reconstructions in his vocabulary. The waltzes are in 9/8, a beat to
       each dotted quarter, so the tempo reads half again the waltz's quarter
       (268 is 179); the medium tunes are in sextuplet 4/4 (`4/4-6`), so the
       tempo is the record's; those over 200 are in eighths (`4/4-8`), because
       the triplet meters stop at 190 (4/4-6) and 300 (9/8 and 12/8), which is
       a quarter of 200. See the Elvin Jones section of
       `.context/app/planning/drumming-research.md`. */
    songs: [
      {
        key: 'my-favorite-things',
        title: 'My Favorite Things',
        feel: 'the 1960 waltz in 9/8: the "and" of 1 leaned on, triplets under the ride (record 179)',
        weight: 1.6,
        params: {
          meter: '9/8',
          bpm: [258, 279],
          swing: 0,
          backbeats: [12],
          ghostWeights: { 2: 0.3, 8: 0.35, 14: 0.35 },
          crossRhythms: [
            // four triplets at a time, across the bar line
            [{ every: 8, lanes: { s: 3 } }, 1],
            // the 6/8 hemiola: two dotted quarters a bar
            [{ every: 9, lanes: { c: 1, k: 2 }, bars: 2 }, 0.6],
          ],
          figures: [
            // the ride on 1, 2, the "and" of 2 and 3; the snare on the "and" of 1
            [
              {
                r: '1.....1...1.1.....',
                hf: '......1.....1.....',
                s: '....3...........1.',
                k: '1.........1.......',
              },
              2,
            ],
            // a triplet on 1 and on 3, the left hand rolling
            [
              {
                r: '1.....1...1.1.....',
                hf: '......1.....1.....',
                s: '..1.1.........1.1.',
                k: '1.........1.......',
              },
              1.4,
            ],
            // the foot on the "and" of 1, a tom on the "and" of 3
            [
              {
                r: '1.....1...1.1...1.',
                hf: '....1.......1.....',
                s: '......1...........',
                t1: '................2.',
                k: '1.........1.......',
              },
              1.2,
            ],
            // the hemiola: crash and kick every dotted quarter
            [
              {
                c: '1........1........',
                k: '1........1........',
                hf: '......1.....1.....',
                s: '....1.........1...',
              },
              0.6,
            ],
          ],
          fills: [
            // snare, then down the toms in triplets
            [{ s: '3.1.1.......', t1: '......2.2...', t3: '..........2.' }, 1.2],
            // triplets through the bar, the kick on each beat
            [{ s: '..1.1...1.1...1.1.', k: '2.....2.....2.....' }, 1.0],
          ],
        },
      },
      {
        key: 'afro-blue',
        title: 'Afro Blue',
        feel: 'live at Birdland, 1963: a fast 3/4 swing with two cross-beats in every bar (record about 200)',
        weight: 1.3,
        params: {
          meter: '9/8',
          bpm: [282, 300],
          swing: 0,
          backbeats: [12],
          ghostWeights: { 2: 0.3, 8: 0.35, 14: 0.35 },
          crossRhythm: 0.45,
          crossRhythms: [
            // two against three: the cross-beats on the cymbal and the kick
            [{ every: 9, lanes: { c: 1, k: 2 } }, 1],
            [{ every: 8, lanes: { t3: 2 }, bars: 2 }, 0.6],
          ],
          figures: [
            // the waltz ride, the kick on the two cross-beats
            [
              {
                r: '1.....1...1.1...1.',
                hf: '............1.....',
                s: '..1.....1.....1...',
                k: '1........1........',
              },
              2,
            ],
            // the cross-beats on the crash, the snare and floor tom answering
            [
              {
                c: '1........1........',
                k: '1........1........',
                hf: '............1.....',
                s: '....1.3.......1...',
                t3: '................1.',
              },
              1.2,
            ],
            // the ride on the beat, every other triplet filled by the left hand
            [
              {
                r: '1.....1.....1.....',
                hf: '............1.....',
                s: '..1.1...1.1...1.1.',
                k: '1.................',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '3.1.1.......', t1: '......2.2...', t3: '..........2.' }, 1.2],
            // the bar's second cross-beat, snare and kick together, then air into the 1
            [{ s: '3........', k: '2........' }, 0.8],
          ],
        },
      },
      {
        key: 'juju',
        title: 'Juju',
        feel: "Wayne Shorter's 1964 waltz: a 6/8 kick and hi-hat part under the waltz ride, a rim click on 2 (record 177)",
        weight: 1.0,
        params: {
          meter: '9/8',
          bpm: [256, 273],
          swing: 0,
          backbeats: [12],
          ghostWeights: { 2: 0.3, 8: 0.35, 14: 0.35 },
          /* Bishop's Page o' coordination: the record's groove is two bars, the
             cymbal on every eighth but the "and" of 1, the feet in 6/8 (kick on
             1 and the "and" of 2, the foot on the "and" of 1 and 3; then the
             foot on 2 and 3, the kick on the "and" of 3), the left hand on 2.
             A figure row holds 32 steps, so each bar is its own figure, the
             first weighted a little higher. */
          crossRhythms: [[{ every: 8, lanes: { s: 3 } }, 1]],
          figures: [
            [
              {
                r: '1.....1...1.1...1.',
                hf: '....1.......1.....',
                s: '......4...........',
                k: '1.........1.......',
              },
              2,
            ],
            [
              {
                r: '1.....1...1.1...1.',
                hf: '......1.....1.....',
                s: '......4...........',
                k: '................1.',
              },
              1.6,
            ],
            // a tom on the "and" of 3; in the second bar a low tom on the last triplet of 3
            [
              {
                r: '1.....1...1.1...1.',
                hf: '....1.......1.....',
                s: '......4...........',
                t1: '................2.',
                k: '1.........1.......',
              },
              1.2,
            ],
            [
              {
                r: '1.....1...1.1...1.',
                hf: '......1.....1.....',
                t3: '..............2...',
                k: '................1.',
              },
              0.96,
            ],
            // the left hand on the middle triplets
            [
              {
                r: '1.....1...1.1...1.',
                hf: '....1.......1.....',
                s: '..1.....4.....1...',
                k: '1.........1.......',
              },
              1.0,
            ],
            [
              {
                r: '1.....1...1.1...1.',
                hf: '......1.....1.....',
                s: '..1.....1.....1...',
                k: '................1.',
              },
              0.8,
            ],
          ],
          fills: [
            [{ s: '3.1.1.......', t1: '......2.2...', t3: '..........2.' }, 1.2],
            [{ s: '..1.1...1.1...1.1.', k: '2.....2.....2.....' }, 0.8],
          ],
        },
      },
      {
        key: 'your-lady',
        title: 'Your Lady',
        feel: 'the Afro waltz: kick, hi-hat and left hand taking the six eighths in turn under the ride',
        weight: 0.9,
        params: {
          meter: '9/8',
          // no measured tempo found: an estimate between the quartet's other waltzes and a ballad
          bpm: [225, 255],
          swing: 0,
          backbeats: [12],
          ghostWeights: { 2: 0.3, 8: 0.35, 14: 0.35 },
          /* Bishop's transcription of the intro and head: one bar of 3/4 is
             kick, foot, snare, kick, foot, tom on the six eighths (the snare a
             ghost, the tom on the "and" of 3 accented), then foot, foot, snare,
             kick, foot, tom; later in the head the left hand fills the
             triplets. One bar a figure, as for Juju. */
          crossRhythms: [[{ every: 8, lanes: { t1: 2 } }, 1]],
          figures: [
            [
              {
                r: '1.....1...1.1.....',
                hf: '....1.......1.....',
                s: '......1...........',
                t1: '................2.',
                k: '1.........1.......',
              },
              2,
            ],
            [
              {
                r: '1.....1...1.1.....',
                hf: '1...1.......1.....',
                s: '......1...........',
                t1: '................2.',
                k: '..........1.......',
              },
              1.6,
            ],
            [
              {
                r: '1.....1...1.1...1.',
                hf: '....1.......1.....',
                s: '..1.....1.....1...',
                k: '1.........1.......',
              },
              1.2,
            ],
            [
              {
                r: '1.....1...1.1...1.',
                hf: '....1.......1.....',
                s: '..1.....3.....1...',
                k: '..........1.......',
              },
              0.96,
            ],
          ],
          fills: [
            // the head's last bars: triplets round the snare and toms
            [{ s: '3.1.1.......', t1: '......2.2...', t3: '..........2.' }, 1.2],
            // in triplet eighths, the tom on the last of them
            [{ s: '2.1.2...', t1: '......2.' }, 0.8],
          ],
        },
      },
      {
        key: 'resolution',
        title: 'Resolution',
        feel: 'A Love Supreme, part 2: medium-up, every triplet filled under the ride (record 178–182)',
        weight: 1.2,
        params: {
          bpm: [174, 186],
          crossRhythms: [
            // accents every four triplets: three against four, over three bars
            [{ every: 8, lanes: { s: 3 } }, 1],
            [{ every: 8, lanes: { k: 2, c: 1 }, bars: 2 }, 0.6],
          ],
          figures: [
            // the ride and the foot, the left hand on the middle triplets
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '..1.1.........1.3.......',
                k: '1...................2...',
              },
              2,
            ],
            // a continuous stream: the ride on the beat, the snare on the other two
            [
              {
                r: '1.....1.....1.....1.....',
                hf: '......1...........1.....',
                s: '..1.1...1.1...1.1...1.1.',
                k: '1...........2...........',
              },
              1.4,
            ],
            // four against three: accents every fourth triplet on snare, tom and kick
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '........3...............',
                t1: '................2.......',
                k: '2.......................',
              },
              1.2,
            ],
            // half-note triplets on the crash and kick
            [
              {
                c: '1.......1.......1.......',
                k: '1.......1.......1.......',
                hf: '......1...........1.....',
              },
              0.6,
            ],
          ],
          fills: [
            // triplets, the accents on the kick and cymbal (right hand), the rest soft on the snare
            [{ r: '1.....1.....', k: '2.....2.....', s: '..1.1...1.1.' }, 1.2],
            [{ s: '2.2.........', t1: '....2.2.....', t3: '........2.2.' }, 1.2],
            // a whole bar in fours across the triplets
            [{ s: '3.1.1.1.3.1.1.1.3.1.1.1.', k: '2.......2.......2.......' }, 0.6],
          ],
        },
      },
      {
        key: 'acknowledgement',
        title: 'Acknowledgement',
        feel: 'A Love Supreme, part 1: a Latin-tinged triplet groove round the toms over the four-note bass figure (record 126)',
        weight: 1.0,
        params: {
          bpm: [120, 132],
          crossRhythms: [[{ every: 4, lanes: { t3: 2 }, bars: 1 }, 1]],
          figures: [
            // the ride on the beat, the toms on the triplets
            [
              {
                r: '1.....1.....1.....1.....',
                hf: '......1...........1.....',
                t2: '....1...................',
                t3: '..........2.....1.......',
                s: '......................1.',
                k: '1...........1...........',
              },
              2,
            ],
            // the ride on the beat and the last triplet, a rim click
            [
              {
                r: '1...1.1...1.1...1.1...1.',
                hf: '......1...........1.....',
                s: '........4...............',
                t3: '....................2...',
                k: '1...........1...........',
              },
              1.2,
            ],
            // the left hand round the kit
            [
              {
                r: '1.....1.....1.....1.....',
                hf: '......1...........1.....',
                s: '..1.1...1.1...1.........',
                t1: '................1.......',
                t3: '....................2.1.',
                k: '1.......................',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '2.2.........', t1: '....2.2.....', t3: '........2.2.' }, 1.2],
            [{ t1: '2.2.', t3: '..22' }, 0.4],
          ],
        },
      },
      {
        key: 'bessies-blues',
        title: "Bessie's Blues",
        feel: 'Crescent, 1964: a short blues at a gallop, snare comps on the "ands", the kick dropping bombs (record 184)',
        weight: 0.8,
        params: {
          bpm: [178, 190],
          crossRhythms: [[{ every: 8, lanes: { s: 3 } }, 1]],
          figures: [
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '....3...........1.....3.',
                k: '1...................1...',
              },
              2,
            ],
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '..........3...1.3.......',
                k: '............2.........1.',
              },
              1.4,
            ],
            [
              {
                r: '1.....1.....1.....1.....',
                hf: '......1...........1.....',
                s: '..1.1...1.1...3.1...1...',
                k: '......................2.',
              },
              1.0,
            ],
          ],
          fills: [
            [{ r: '1.....1.....', k: '2.....2.....', s: '..1.1...1.1.' }, 1.2],
            [{ s: '3.1.3.', t3: '.....2' }, 1.0],
          ],
        },
      },
      {
        key: 'speak-no-evil',
        title: 'Speak No Evil',
        feel: "Wayne Shorter's 1964 record: medium-up, the ride broad and open, a few hard comps (record 142)",
        weight: 0.9,
        params: {
          bpm: [138, 148],
          ghostBias: 0.8,
          crossRhythms: [[{ every: 8, lanes: { t3: 2 } }, 1]],
          figures: [
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '..........3.............',
                k: '................2.......',
              },
              2,
            ],
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '..1.............3.......',
                k: '1.....................1.',
              },
              1.4,
            ],
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '........3...............',
                t3: '................2.......',
                k: '1.......................',
              },
              1.0,
            ],
          ],
          fills: [
            [{ s: '3.1.1.......', t1: '......2.2...', t3: '..........2.' }, 1.2],
            [{ s: '1.1.3.', k: '.....2' }, 1.0],
          ],
        },
      },
      {
        key: 'witch-hunt',
        title: 'Witch Hunt',
        feel: 'the opener of Speak No Evil: medium swing, the horn calls answered on the snare and kick (record 136–139)',
        weight: 0.8,
        params: {
          bpm: [132, 142],
          crossRhythms: [[{ every: 8, lanes: { s: 3, k: 2 }, bars: 2 }, 1]],
          figures: [
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '....3...........3.......',
                k: '..........2.............',
              },
              2,
            ],
            [
              {
                r: '1.....1...1.1.....1...1.',
                hf: '......1...........1.....',
                s: '..1.....1.....3.....1...',
                k: '1.....................2.',
              },
              1.4,
            ],
            // the call: crash and kick every fourth triplet
            [
              {
                c: '1.......1.......1.......',
                k: '1.......1.......1.......',
                hf: '......1...........1.....',
                s: '......................1.',
              },
              0.6,
            ],
          ],
          fills: [
            [{ r: '1.....1.....', k: '2.....2.....', s: '..1.1...1.1.' }, 1.2],
            [{ s: '2.2.........', t1: '....2.2.....', t3: '........2.2.' }, 1.0],
          ],
        },
      },
      {
        key: 'chasin-the-trane',
        title: "Chasin' the Trane",
        feel: 'the Vanguard, 1961: a fast blues, no piano, the snare on the "ands", the foot on 2 and 4 (record 235–244)',
        weight: 1.2,
        params: {
          meter: '4/4-8',
          swingCurve: true,
          bpm: [226, 246],
          swing: 30,
          swingRange: [22, 38],
          backbeats: [2, 6],
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.6,
          /* Bishop's transcription of the first six choruses, read bar by bar:
             the foot on every 2 and 4, the ride in quarters with the skip
             note, the snare on the "and" of 4 or 2 and accented, a buzz on 4;
             the kick on a downbeat, often with a ghost on the "and" before it.
             His triplet streams (the snare on the second and third triplets)
             have no place in eighths. */
          crossRhythms: [[{ every: 3, lanes: { s: 3 }, bars: 2 }, 1]],
          figures: [
            [{ r: '1.1.1.11', hf: '..1...1.', s: '.......3', k: '1.......' }, 2],
            [{ r: '1.11111.', hf: '..1...1.', s: '.....3..', k: '..1.....' }, 1.4],
            [{ r: '1.111111', hf: '..1...1.', s: '...3.18.' }, 1.2],
            [{ r: '11111.11', hf: '..1...1.', s: '.31.....', k: '.....12.' }, 1.0],
            [{ r: '111.1111', hf: '..1...1.', s: '.3...1.3' }, 1.0],
          ],
          fills: [
            [{ s: '3..3..3.', k: '.2..2..2' }, 1.0],
            [{ s: '3.13', k: '.2..' }, 1.0],
          ],
        },
      },
      {
        key: 'impressions',
        title: 'Impressions',
        feel: 'live at the Vanguard, 1961: a gallop with the swing nearly even, phrases in three across the bar (record 272–293)',
        weight: 1.2,
        params: {
          meter: '4/4-8',
          swingCurve: true,
          bpm: [240, 280],
          swing: 12,
          swingRange: [4, 20],
          backbeats: [2, 6],
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.5,
          crossRhythm: 0.45,
          crossRhythms: [
            // 3/4 over 4/4: an accent every three beats
            [{ every: 6, lanes: { s: 3 } }, 1],
            // dotted quarters on the kick
            [{ every: 3, lanes: { k: 2 }, bars: 2 }, 0.8],
          ],
          figures: [
            [{ r: '1.111.11', hf: '..1...1.', s: '...1..3.', k: '.....2..' }, 2],
            [{ r: '1.1.1.11', hf: '..1...1.', s: '.1...3.1', k: '...2....' }, 1.4],
            // dotted quarters on the crash and kick, three against four
            [{ c: '1..1..1.', k: '1..1..1.', hf: '..1...1.' }, 0.6],
          ],
          fills: [
            [{ s: '3..3..3.', t3: '.2..2..2' }, 1.2],
            [{ s: '3.1.', t3: '...2' }, 1.0],
          ],
        },
      },
      {
        key: 'pursuance',
        title: 'Pursuance',
        feel: 'A Love Supreme, part 3: his solo opens it, then the fastest swing on the record, the toms rolling (record 277–300)',
        weight: 1.1,
        params: {
          meter: '4/4-8',
          swingCurve: true,
          bpm: [240, 280],
          swing: 18,
          swingRange: [10, 26],
          backbeats: [2, 6],
          ghostWeights: { 3: 0.3, 7: 0.3 },
          ghostBias: 0.5,
          midFills: 0.5,
          crossRhythms: [
            [{ every: 6, lanes: { t3: 2 } }, 1],
            [{ every: 3, lanes: { s: 3 }, bars: 2 }, 0.8],
          ],
          figures: [
            [{ r: '1.111.11', hf: '..1...1.', s: '...3...1', t3: '.....2..' }, 2],
            [{ r: '1.1.1.11', hf: '..1...1.', s: '.1.1..3.', k: '....2...' }, 1.4],
            [{ r: '1.111.11', hf: '..1...1.', t1: '...2....', t3: '......2.', k: '.2......' }, 1.0],
          ],
          fills: [
            // the solo's language: snare, toms and kick in turn
            [{ s: '3.....3.', t1: '.2......', t3: '..2..2..', k: '...2...2' }, 1.2],
            [{ s: '3..3..3.', k: '.2..2..2' }, 1.0],
          ],
        },
      },
      {
        key: 'a-love-supreme-live',
        title: 'A Love Supreme (Jazz Machine)',
        feel: 'the Jazz Machine live in Japan, 1978: a mozambique on the cymbal bell, the kick on 1 and the foot on 3',
        weight: 0.6,
        params: {
          meter: '4/4-8',
          // no measured tempo found: an estimate
          bpm: [180, 220],
          swing: 0,
          backbeats: [4],
          ghostWeights: {},
          ghostBias: 0.3,
          crossRhythm: 0,
          /* Bishop's groove from the record, written as he writes it in two bars
             of eighths: the bell's mozambique, a rim click on the "and" of 2,
             the high tom on 4 and its "and", the kick on 1 and the foot on 3.
             On the record it is one bar of sixteenths, double time over the
             feet. */
          figures: [
            [
              {
                r: '2.2.22.2.22.22.2',
                s: '...4.......4....',
                t1: '......22......22',
                k: '1.......1.......',
                hf: '....1.......1...',
              },
              2,
            ],
          ],
          fills: [[{ t1: '2.2.', t3: '.2.2' }, 1.0]],
        },
      },
    ],
  },
  puente: {
    label: 'Tito Puente',
    drummer: true,
    hint: "The King of the Timbales, leading his own orchestra from the Palladium mambo of the 1950s to the Latin jazz of the 1980s: always in clave, the right hand on the timbale's shell for the verse or the mambo bell for the montuno, the left on the low drum, a roll into a rimshot to open a section. He played timbales, not a kit, so this is a translation: the timbales on the toms, the shell or bell a percussion slot, the claves the percussionist's, the bass's anticipated note on the kick. Each New plays one of eleven of his songs at its record tempo: Oye Como Va's cha-cha-chá, Ran Kan Kan and Picadillo on the bell, El Cayuco and Complicación on the shell. The stage names the song. None follows a transcription; all are reconstructions.",
    toms: true,
    // a tight, high snare that cracks like metal: the nearest these kits have to a steel timbale and its rimshot
    kit: 'police',
    // the bell or the shell and the claves are the front line
    mix: { p1: 0.7, p2: 0.9 },
    hats: 8,
    bpm: [60, 136],
    // "Swing 8ths" is on his record's avoid list: the clave's eighths are even
    swing: 0,
    // no ghosts: the left hand plays the low drum, not the snare
    ghostBias: 0,
    ghostWeights: {},
    opens: 0,
    /* The left hand's low drum on the 2 and the 4 of each bar of the clave:
       one 4/4 bar here holds two of the record's bars in eighths, so those
       are steps 2, 6, 10 and 14. The open stroke on each 4 is the one the
       critic looks for, and a tom counts. */
    backbeats: [6, 14],
    targetDensity: 9,
    hatDepth: 0.8,
    // on top: a bandleader cueing the band from the front
    feel: { label: 'On top', t1: -0.02, t2: -0.02, jitter: 0.01 },
    /* Fills open a section: an abanico, a roll into a rimshot, on the last
       eighth of the clave, and the timbales answering each other. The crash
       marks a section; there is no kick on the 1, which is the bass's to leave
       empty. */
    fillChance: 0.8,
    midFills: 0,
    phraseMark: { crash: 0.4, kick: false },
    /* The kick: a timbalero has no bass drum, but his early playing "combined
       the cascara patterns of the timbales with bass drum and cymbals" (jazz.com),
       so the translation keeps one note, the bass tumbao's bombo, the anticipated
       "and" of 2 in each bar of the clave (the last step of a beat here). Never
       on the 1. */
    kick1: [
      ['0000', 3],
      ['0001', 1],
    ],
    kick: [
      ['0000', 3],
      ['0001', 1],
    ],
    // claves on the 2-3 son clave (the percussionist's), and the shell of the timbale over it
    perc: [
      { inst: 'clave', steps: [2, 4, 8, 11, 14] },
      { inst: 'cascara', steps: [0, 2, 3, 5, 7, 8, 10, 12, 13, 15] },
    ],
    figures: [
      // the verse: the left hand's open stroke on the low drum on each 4, the bombo on the kick
      [{ t2: '......2.......2.', k: '...1.......1....' }, 1.4],
      // the same with a muffled stroke on each 2
      [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.0],
    ],
    fills: [
      // the abanico: a press roll into a rimshot on the last eighth, into the 1
      [{ s: '885' }, 1.6],
      // the timbales answering each other, high and low, into the abanico's rimshot
      [{ t1: '2...2..', t2: '..2..2.', s: '......5' }, 1.0],
    ],
    /* His records: one New picks one, and the stage names it. Credits are
       Wikipedia's and Discogs's: he is on timbales on all of them, as leader.
       Tempos are songbpm's, which for the mambos is the half note (the
       charts are in cut time, and one 4/4 bar here is two of their bars, so
       the half note is this grid's quarter); Oye Como Va's is half the
       cha-cha-chá's quarter, as in a forum post quoting his book with Jim
       Payne ("half-tone = 64"). The clave is the 2-3 son clave his record
       gives for the mambo bell and the shell on every song, not checked chart
       by chart. No human transcription of his playing on any of them was
       found (Songsterr's tabs are all machine-made), so every song is a
       reconstruction: the bell or the shell in the right hand, the low drum
       in the left. A song has one percussion slot for the right hand, so it
       plays either the shell (the vocal guarachas: the verse) or the bell
       (the instrumental mambos: the montuno), never both. */
    songs: [
      {
        key: 'oye-como-va',
        title: 'Oye Como Va',
        feel: 'a cha-cha-chá: the small bell on every beat, the low drum on 4; the tempo is the half note',
        weight: 2,
        params: {
          bpm: [60, 66],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            // the cha-cha bell on the beat, its mouth on 1 and 3
            { inst: 'cowbell', steps: [0, 2, 4, 6, 8, 10, 12, 14], accents: [0, 4, 8, 12] },
          ],
          // the bass's own tumbao, the ostinato under the chorus: no kick
          figures: [
            [{ t2: '......2.......2.' }, 1.6],
            [{ t2: '..1...2...1...2.' }, 1.0],
          ],
          fills: [
            [{ s: '885' }, 1.4],
            // the "cha-cha-chá" on 4 and its "and", on the timbales
            [{ t1: '.2.', t2: '2.2' }, 1.0],
          ],
        },
      },
      {
        key: 'ran-kan-kan',
        title: 'Ran Kan Kan',
        feel: 'a mambo on the bell, the low drum on the 2 and the 4, the bombo on the kick',
        weight: 1.4,
        params: {
          bpm: [102, 108],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', steps: [0, 2, 4, 5, 7, 8, 10, 11, 13, 15], accents: [0, 4, 8, 12] },
          ],
          figures: [
            [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.6],
            // the macho on the last eighth, pushing into the 1
            [{ t2: '..1...2...1...2.', t1: '...............2', k: '...1.......1....' }, 1.0],
          ],
        },
      },
      {
        key: 'el-cayuco',
        title: 'El Cayuco',
        feel: 'Dance Mania: the shell under the voice, the low drum open on each 4',
        weight: 1.1,
        params: {
          bpm: [125, 131],
          swing: 0,
        },
      },
      {
        key: 'complicacion',
        title: 'Complicación',
        feel: 'Dance Mania: the shell under the voice, the bombo on the kick',
        weight: 0.9,
        params: {
          bpm: [92, 98],
          swing: 0,
        },
      },
      {
        key: '3-d-mambo',
        title: '3-D Mambo',
        feel: 'Dance Mania: the mambo bell, the low drum on the 2 and the 4',
        weight: 1.0,
        params: {
          bpm: [97, 103],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', steps: [0, 2, 4, 5, 7, 8, 10, 11, 13, 15], accents: [0, 4, 8, 12] },
          ],
          figures: [
            [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.6],
            [{ t2: '..1...2...1...2.', t1: '...............2', k: '...1.......1....' }, 0.8],
          ],
        },
      },
      {
        key: 'hong-kong-mambo',
        title: 'Hong Kong Mambo',
        feel: 'Dance Mania: a slower mambo on the bell, the low drum on the 2 and the 4',
        weight: 0.8,
        params: {
          bpm: [88, 94],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', steps: [0, 2, 4, 5, 7, 8, 10, 11, 13, 15], accents: [0, 4, 8, 12] },
          ],
          figures: [
            [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.6],
            [{ t2: '..1...2...1...2.' }, 0.8],
          ],
        },
      },
      {
        key: 'mambo-gozon',
        title: 'Mambo Gozón',
        feel: 'Dance Mania: the mambo bell, the macho pushing into the 1',
        weight: 0.9,
        params: {
          bpm: [102, 108],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', steps: [0, 2, 4, 5, 7, 8, 10, 11, 13, 15], accents: [0, 4, 8, 12] },
          ],
          figures: [
            [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.2],
            [{ t2: '..1...2...1...2.', t1: '...............2', k: '...1.......1....' }, 1.2],
          ],
        },
      },
      {
        key: 'babarabatiri',
        title: 'Babarabatiri',
        feel: 'the shell under the voice, the low drum open on each 4',
        weight: 1.0,
        params: {
          bpm: [98, 104],
          swing: 0,
        },
      },
      {
        key: 'picadillo',
        title: 'Picadillo',
        feel: 'an early mambo on the bell, the low drum on the 2 and the 4',
        weight: 0.9,
        params: {
          bpm: [94, 100],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', steps: [0, 2, 4, 5, 7, 8, 10, 11, 13, 15], accents: [0, 4, 8, 12] },
          ],
          figures: [
            [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.6],
            [{ t2: '..1...2...1...2.', t1: '...............2', k: '...1.......1....' }, 0.8],
          ],
        },
      },
      {
        key: 'para-los-rumberos',
        title: 'Para Los Rumberos',
        feel: 'the 1972 remake at a mambo tempo: the bell, a timbale break to end it',
        weight: 0.9,
        params: {
          bpm: [130, 136],
          swing: 0,
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', steps: [0, 2, 4, 5, 7, 8, 10, 11, 13, 15], accents: [0, 4, 8, 12] },
          ],
          figures: [
            [{ t2: '..1...2...1...2.', k: '...1.......1....' }, 1.4],
            [{ t2: '..1...2...1...2.', t1: '...............2', k: '...1.......1....' }, 1.0],
          ],
          fills: [
            [{ s: '885' }, 1.2],
            // the short timbale break: the macho and the hembra in turn
            [{ t1: '2.2.2...', t2: '.2.2.22.', s: '.......5' }, 1.2],
          ],
        },
      },
      {
        key: 'mambo-diablo',
        title: 'Mambo Diablo',
        feel: 'with his Latin Ensemble, 1985: the shell, the low drum open on each 4, an octet in no hurry',
        weight: 0.8,
        params: {
          bpm: [75, 80],
          swing: 0,
        },
      },
    ],
  },
  changuito: {
    label: 'Changuito',
    drummer: true,
    hint: "José Luis Quintana, Los Van Van's drummer from 1970 to 1993, who built Blas Egües' first songo beat into a style with Juan Formell. One 2-3 rumba clave to a bar: the right hand on the four main beats, the left on the rim and toms between them, the kick on the bombos, the snare off the backbeat. A kit with cymbals in the 1970s; from 1982 timbales and bells beside it, the bell keeping the pulse while the timbales move. Each New plays one of twelve of his songs at its record tempo: Chirrín chirrán, La Habana joven's slow double time, Te traigo's two-clave kick, Tu decisión in 3-2, Sandunguera, El baile del buey cansao. The stage names the song. Ten take their kick, some their snare, from Kevin Moore's transcriptions; Sandunguera and Buey cansao are reconstructions.",
    toms: true,
    kit: 'sixties',
    mix: { h: 0.75, p1: 0.7, p2: 0.75 }, // the clave and the congas are the front line
    hats: 8,
    bpm: [88, 118],
    swing: 0,
    ghostBias: 0.3,
    // the left hand is written out: no ghosts rolled on top of it
    ghostWeights: {},
    opens: 0,
    targetDensity: 11,
    hatDepth: 0.8,
    // rudiments on the drums: a fill accent sometimes a flam, now and then a drag
    flam: 0.2,
    drag: 0.1,
    // on top: the snare and kick a shade early, the hands on the grid
    feel: { label: 'On top', s: -0.02, k: -0.01, jitter: 0.01 },
    fillChance: 0.6,
    midFills: 0,
    phraseMark: { crash: 0.5 },
    kick1: [
      ['0001', 3],
      ['1001', 1],
    ],
    kick: [
      ['0000', 2],
      ['0001', 1.5],
      ['0100', 0.6],
    ],
    /* The percussionists' parts, which take none of his hands: El Yulo's
       congas as Changuito plays them in La historia del songo (high tones on
       the "and" of 2, 3 and the end of the bar, low tones through the 3-side),
       and the 2-3 rumba clave every early Van Van song is in. */
    perc: [
      { inst: 'conga', steps: [3, 4, 6, 7, 8, 9, 10, 11, 14, 15], accents: [3, 4, 14, 15] },
      { inst: 'clave', steps: [2, 4, 8, 11, 15] },
    ],
    figures: [
      // his songo as he shows it: the hat on the beats, the rim between, the toms at the end, the kick on the bombos
      [
        {
          h: '1...1...1...1...',
          s: '.44..4.4.44.....',
          t1: '............2...',
          t2: '..............2.',
          k: '...1.......1....',
        },
        1.4,
      ],
      // the snare on the ponche of the 3-side, in place of the low tom
      [
        {
          h: '1...1...1...1...',
          s: '.44..4.4.44...2.',
          t1: '............2...',
          k: '...1.......1....',
        },
        0.8,
      ],
    ],
    fills: [
      // the timbale player's turn: the two drums in turn
      [{ t1: '2.2.', t2: '.2.2' }, 1.2],
      // a flam, a ghost, the low drum
      [{ s: '6.1.', t2: '...2' }, 1.0],
      // two snare accents, then down the toms
      [{ s: '3.3.....', t1: '....2.2.', t2: '.....2.2' }, 0.8],
      // the press roll that brings a coro down
      [{ s: '8.8.' }, 0.6],
    ],
    /* His records: one New picks one, and the stage names it. The grid is
       Kevin Moore's (timba.com, The Roots of Timba, Part II): sixteen steps
       are one clave, two bars of eighths, and the tempo counts four of them a
       beat, as his and songbpm's do. Ten songs take the kick, and La Habana
       joven, Tu decisión and No digas que no the snare, from his
       transcriptions; Moore writes no hands, so theirs are the songo
       Changuito demonstrates in La historia del songo (via Moore) and
       Wikipedia's basic songo stick pattern. El baile del buey cansao and
       Sandunguera, the timbales years, are reconstructions from the drummer
       record and Wikipedia's "Changuito Special". Tempos are Moore's where he
       gives one, otherwise songbpm's. */
    songs: [
      {
        key: 'chirrin-chirran',
        title: 'Chirrín chirrán',
        feel: 'songo as he first altered it: the kick on both bombos, the rim between the beats, 1974',
        weight: 1.4,
        params: {
          bpm: [107, 109],
          // the kick is Moore's (Los Van Van, Vol. II); the hands are the songo he demonstrates
          figures: [
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1.......1....',
              },
              2,
            ],
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44...2.',
                t1: '............2...',
                k: '...1.......1....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'la-habana-joven',
        title: 'La Habana joven',
        feel: 'a slow songo: double-time hats, the snare on the backbeat of the 2-side, the kick in pairs',
        weight: 1.1,
        params: {
          // Moore: the base tempo of a slow son montuno; songbpm's 120 is the double time
          bpm: [58, 62],
          hats: 16,
          /* Moore's two tumbaos and the variation kick, read bar by bar. The
             sixteenths on the hats are the double time he hears; the snare
             stays on the 2-side's backbeat and moves on the 3-side. */
          figures: [
            [{ h: '2111211121112111', s: '....2......2....', k: '11.......11.....' }, 1.6],
            [{ h: '2111211121112111', s: '....2.......2...', k: '11.....1...1....' }, 1.2],
            [{ h: '2111211121112111', s: '....2...........', k: '1......1........' }, 0.8],
          ],
        },
      },
      {
        key: 'llegue-llegue',
        title: 'Llegué llegué (Guararey)',
        feel: 'the Guararey section at double the opening tempo: eighths on the hat, a kick that never repeats',
        weight: 1.0,
        params: {
          // Moore: the opening at 59, the songo at exactly double; songbpm 113 for the track
          bpm: [113, 118],
          /* The kick is Moore's tumbao 3 (Two Styles of Kick Drum Playing):
             twelve claves, no two alike, the most common kept. The hat in
             eighths is his note on the interlude; the left hand is the songo
             Changuito demonstrates. */
          figures: [
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1.1.....1....',
              },
              1.6,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1.......1....',
              },
              1.4,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '.1.......1...1..',
              },
              0.6,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1.1.....1.1..',
              },
              0.8,
            ],
            [
              {
                h: '1.1.1.1.1.1.1.1.',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1......11....',
              },
              0.6,
            ],
          ],
        },
      },
      {
        key: 'mi-ritmo-caliente',
        title: 'Mi ritmo caliente',
        feel: 'a slower songo: the kick on 1, both bombos and the offbeat after the first',
        weight: 0.7,
        params: {
          // Moore: 94, "quite a bit slower than a typical songo track"
          bpm: [92, 96],
          figures: [
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '1..1.1.....1....',
              },
              2,
            ],
          ],
        },
      },
      {
        key: 'y-que-se-sepa',
        title: 'Y que se sepa',
        feel: 'a slow songo single: both bombos, often the offbeat after the first',
        weight: 0.7,
        params: {
          // Moore 102, songbpm 104
          bpm: [100, 104],
          // Moore: "plays both bombos and frequently (but not always) adds the next offbeat"
          figures: [
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1.1.....1....',
              },
              1.4,
            ],
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1.......1....',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'te-traigo',
        title: 'Te traigo',
        feel: 'a minor-key songo whose kick takes two claves to repeat',
        weight: 0.9,
        params: {
          bpm: [88, 92],
          // Moore: the kick "keeps returning to a pattern which lasts two claves before repeating"
          figures: [
            [
              {
                h: '1...1...1...1...1...1...1...1...',
                s: '.44..4.4.44......44..4.4.44.....',
                t1: '............2...............2...',
                t2: '..............2...............2.',
                k: '1..1.......1....11.1.......1....',
              },
              2,
            ],
          ],
        },
      },
      {
        key: 'dale-dos',
        title: 'Dale dos',
        feel: 'the closing songo: the kick on the 2-side bombo and nowhere else',
        weight: 1.1,
        params: {
          // Moore 96 for this section; songbpm 94 to 98
          bpm: [94, 98],
          figures: [
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '...1............',
              },
              2,
            ],
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44...2.',
                t1: '............2...',
                k: '...1............',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'tu-decision',
        title: 'Tu decisión, ¿cuál es?',
        feel: 'a rare 3-2 songo, very fast: the drums in half time until they join the rumba',
        weight: 0.7,
        params: {
          // Moore 153 at the end, songbpm 146 for the track; a run of four holds it at 150
          bpm: [146, 150],
          perc: [
            // El Yulo does not turn his figure round for 3-2 (Moore)
            { inst: 'conga', steps: [3, 4, 6, 7, 8, 9, 10, 11, 14, 15], accents: [3, 4, 14, 15] },
            { inst: 'clave', steps: [0, 3, 7, 10, 12] },
          ],
          /* Tumbaos 1 and 2: Moore's snare on the downbeat of the 2-side,
             a half-time backbeat; the kick under the bass is a reconstruction.
             Tumbao 3 is normal songo, his songo turned round to 3-2. */
          figures: [
            [{ h: '1...1...1...1...', s: '........3.......', k: '1.....1.........' }, 1.4],
            [
              {
                h: '1...1...1...1...',
                s: '.44......44..4.4',
                t1: '....2...........',
                t2: '......2.........',
                k: '...1.......1....',
              },
              1.2,
            ],
          ],
        },
      },
      {
        key: 'por-que-lo-haces',
        title: 'Por qué lo haces',
        feel: 'a rollicking songo, the kick on 1 and both bombos and different every time',
        weight: 0.8,
        params: {
          // Moore 115, songbpm 110
          bpm: [110, 115],
          // Moore's "basic part", and two of the ways it changes
          figures: [
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '1..1.1.....1....',
              },
              1.6,
            ],
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44.....',
                t1: '............2...',
                t2: '..............2.',
                k: '1..1.......1....',
              },
              1.0,
            ],
            [
              {
                h: '1...1...1...1...',
                s: '.44..4.4.44...2.',
                t1: '............2...',
                k: '...1.1.....1....',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'no-digas-que-no',
        title: 'No digas que no, compadre',
        feel: 'kick and snare as a half-time R&B figure: the snare on the downbeat of the 3-side',
        weight: 0.8,
        params: {
          // Moore: 102, "slow songo, or fast timba"
          bpm: [100, 104],
          // Moore's snare and kick; the hats are a reconstruction
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '........3.......', k: '1......1......1.' }, 1.6],
            [{ h: '1...1...1...1...', s: '........3.......', k: '1......1......1.' }, 0.8],
          ],
        },
      },
      {
        key: 'buey-cansao',
        title: 'El baile del buey cansao',
        feel: 'the timbales arrive: the bell on the beats, the timbales between, the kick on one bombo',
        weight: 1.3,
        params: {
          // songbpm 174 to 176 is the double time; one entry has it at 87
          bpm: [85, 89],
          mix: { p1: 0.8, p2: 0.75 },
          perc: [
            // the bell on the kit, the right hand's: the four main beats
            { inst: 'cowbell', steps: [0, 4, 8, 12], accents: [0, 8] },
            { inst: 'clave', steps: [2, 4, 8, 11, 15] },
          ],
          /* A reconstruction: the left hand of Wikipedia's basic songo stick
             pattern on the timbales, the kick on the 2-side bombo alone (the
             "later alteration" Changuito shows), and a displaced ghost or two
             on the snare, because there was still a kit there. */
          figures: [
            [{ t1: '.1...1.......1.1', t2: '..2....2..2.....', k: '...1............' }, 1.6],
            [
              {
                t1: '.1...1.......1.1',
                t2: '..2....2..2.....',
                s: '......1.......1.',
                k: '...1.......1....',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'sandunguera',
        title: 'Sandunguera (Por encima del nivel)',
        feel: 'his biggest hit: the bongó bell in the right hand, timbale accents in the left, Pedrito calling his name',
        weight: 1.6,
        params: {
          // songbpm 95 to 100 for the 1983 recording
          bpm: [95, 100],
          mix: { p1: 0.8, p2: 0.75 },
          perc: [
            /* The bongó bell half of the "Changuito Special" (Wikipedia):
               the mouth on the four beats, the neck between, with the extra
               sixteenths his version adds. */
            {
              inst: 'cowbell',
              steps: [0, 2, 4, 6, 7, 8, 10, 11, 12, 14, 15],
              accents: [0, 4, 8, 12],
            },
            { inst: 'clave', steps: [2, 4, 8, 11, 15] },
          ],
          /* A reconstruction. The other bell of the Special has no slot left;
             the left hand keeps the two strokes it plays alone, on the low
             timbale, and a ghost either side on the snare. */
          figures: [
            [{ t2: '.....2...2......', s: '.1...........1..', k: '...1.......1....' }, 1.6],
            [{ t2: '.....2...2......', s: '.1...........1..', k: '...1............' }, 1.0],
          ],
        },
      },
    ],
  },
  horaciohernandez: {
    label: 'Horacio "El Negro" Hernández',
    drummer: true,
    hint: "The Havana drummer of Rubalcaba's Proyecto, then Hargrove's Habana, Michel Camilo's trios and Santana: four limbs, four Cuban parts. The left foot plays the clave on a pedal block, the right foot the tumbao, the right hand a bell or the cáscara, the left hand conga and timbale figures on snare and toms. Each Latin song keeps one clave and one direction, and its accents stay with it. A bright, tight kit. Each New plays one of eight of his songs at its record tempo: Mambo for Roy's bell, Afrodisia's cáscara, Afro Blue in 6/8, La Comparsa's gallop, his own songo, and Santana's Africa Bamba with a plain backbeat. The stage names the song. Two follow human transcriptions; the rest are reconstructions from his book's grooves.",
    toms: true,
    kit: 'police',
    mix: { h: 0.7 },
    hats: 8,
    bpm: [93, 140],
    // straight Cuban eighths and sixteenths: never swung
    swing: 0,
    ghostBias: 0.4,
    opens: 0,
    backbeats: [6, 14],
    targetDensity: 10,
    hatDepth: 0.8,
    // on top of the beat, and the same every pass
    feel: { label: 'On top', s: -0.02, k: -0.01, jitter: 0.01 },
    /* Fills at phrase ends only, short, in clave: the crash marks a section,
       not every half of one. */
    fillChance: 0.6,
    midFills: 0,
    phraseMark: { crash: 0.5 },
    // the kick follows the bass: the "and" of 2 and the 4
    kick1: [
      ['0001', 2],
      ['1000', 1],
    ],
    kick: [
      ['0010', 2],
      ['1000', 1],
      ['0000', 1],
    ],
    /* His records: one New picks one, and the stage names it. Credits are
       Wikipedia's personnel lists (Habana, Supernatural, Shaman, Live at the
       Blue Note, the Dutch one for For Hamp, Red, Bags, and Cal) and reviews
       for Triangulo and Italuba. Two songs follow human Songsterr transcriptions read bar by
       bar: Africa Bamba (717963) and You Are My Kind (3770724), at the tabs'
       tempos. The Latin songs are reconstructions: the grooves are the ones
       his book Conversations in Clave transcribes (mambo, cáscara, 6/8,
       conga de comparsa, songo), laid out as his record's two patterns lay
       them, and their tempos are machine estimates (Deezer; La Comparsa's
       from a machine-made Songsterr tab), read so that one bar holds one
       clave. Every Latin song keeps the clave on the left foot
       (the clave slot, no hand) and leaves the hat foot silent. See the
       Horacio Hernández section of `.context/app/planning/drumming-research.md`. */
    songs: [
      {
        key: 'africa-bamba',
        title: 'Africa Bamba',
        feel: 'Santana: sixteenths on the hats, the kick on 1, the "a" of 1, 2, 3, the "a" of 3 and 4',
        weight: 1.4,
        params: {
          kit: 'drs',
          bpm: [98, 101],
          swing: 0,
          hats: 16,
          backbeats: [4, 12],
          ghostWeights: {},
          /* From a human Songsterr transcription (717963), at its 100. Most
             of its bars have no snare at all, only the kick under the hats;
             the critic wants a backbeat in every bar, so the bars with one are
             kept. The maracas are the percussionist's and are left out. */
          figures: [
            [{ h: '1111111111111111', s: '....2.......2...', k: '1..11...1..11...' }, 2],
            // the chorus: the kick on every beat
            [{ h: '1111111111111111', s: '....2.......2...', k: '1...1...1...1...' }, 1.2],
            // the hats with a gap after each beat
            [{ h: '1.111.111.111.11', s: '....2.......2...', k: '1...1...1...1...' }, 0.6],
          ],
          fills: [
            // the tab's way in: two toms, then the floor tom
            [{ t1: '.22.', t3: '...2', s: '2...' }, 1.2],
            [{ s: '2.11', t3: '..2.' }, 1.0],
          ],
        },
      },
      {
        key: 'you-are-my-kind',
        title: 'You Are My Kind',
        feel: 'Santana with Seal: eighths on the hats, the kick on 1, the "a" of 1 and the "and"s of 2 and 3, a plain backbeat',
        weight: 1.0,
        params: {
          kit: 'drs',
          bpm: [103, 107],
          swing: 0,
          backbeats: [4, 12],
          ghostWeights: {},
          /* From a human Songsterr transcription (3770724), at its 105: the
             kick figure two bars long, the second with the "and" of 4. Its
             interlude has a cross-stick figure and four strokes the tab writes
             as crashes, which are left out. */
          figures: [
            // the verse
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '....2.......2.......2.......2...',
                k: '1..1..1...1.....1..1..1...1...1.',
              },
              2,
            ],
            // the intro: the hats open on every eighth
            [
              {
                h: '3.3.3.3.3.3.3.3.3.3.3.3.3.3.3.3.',
                s: '....2.......2.......2.......2...',
                k: '1..1..1...1.....1..1..1...1...1.',
              },
              0.8,
            ],
            // the interlude: a cross-stick figure over the same kick
            [
              {
                s: '4.4..4..4...4...4.4..4..4...4...',
                k: '1..1..1...1.....1..1..1...1...1.',
              },
              0.6,
            ],
            // the last chorus: sixteenths on the hats
            [
              {
                h: '11111111111111111111111111111111',
                s: '....2.......2.......2.......2...',
                k: '1..1..1...1.....1..1..1...1...1.',
              },
              0.8,
            ],
          ],
          fills: [
            // the tab's: the kick in pairs round a snare on 4
            [{ k: '.11..11.', s: '....2...' }, 1.2],
            [{ s: '2.11', t3: '..2.' }, 1.0],
          ],
        },
      },
      {
        key: 'mambo-for-roy',
        title: 'Mambo for Roy',
        feel: "Hargrove's Crisol: son clave 2-3 on the foot, the bell on the beats, the tumbao in the kick",
        weight: 1.4,
        params: {
          bpm: [133, 139],
          swing: 0,
          backbeats: [6, 14],
          ghostWeights: {},
          mix: { h: 0.7, p1: 0.75, p2: 0.85 },
          /* A reconstruction: Chucho Valdés's mambo, with Changuito on
             timbales and Angá on congas beside him. Son clave 2-3 on the left
             foot; the right hand on the bell, every pulse with the beats
             accented; the kick on the bass's "and" of 2 and 4 in each half; the
             left hand's ghosts and the two strokes into the ponche. */
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 14] },
            { inst: 'cowbell', every: 2, accentPulse: true },
          ],
          figures: [
            [{ s: '..1...32..1...32', k: '...1..1....1..1.' }, 2],
            // the left hand to the low tom on the ponche
            [{ s: '..1....1..1....1', t2: '......2.......2.', k: '...1..1....1..1.' }, 1.2],
          ],
          fills: [
            // the three side of the clave, accented on the toms
            [{ t1: '2..2..2.', s: '.11.11.1' }, 1.4],
            [{ t1: '2...', t2: '..2.', t3: '...2' }, 0.6],
            [{ t2: '.2.2', s: '1.1.' }, 1.0],
          ],
        },
      },
      {
        key: 'afrodisia',
        title: 'Afrodisia',
        feel: "Kenny Dorham's tune on Habana: the cáscara in the right hand over rumba clave 2-3 on the foot",
        weight: 1.0,
        params: {
          bpm: [109, 115],
          swing: 0,
          backbeats: [6, 14],
          ghostWeights: {},
          mix: { h: 0.7, p1: 0.75, p2: 0.85 },
          /* A reconstruction on his record's cáscara pattern: rumba clave 2-3
             on the left foot, the cáscara over it in the right hand, the kick
             on the tumbao's "and" of 2 and 4 in each half, and the left hand's
             ghost and the two strokes before the bar's middle and its end. */
          perc: [
            { inst: 'clave', steps: [2, 4, 8, 11, 15] },
            { inst: 'cascara', steps: [0, 2, 3, 5, 7, 8, 10, 12, 13, 15], accents: [0, 8] },
          ],
          figures: [
            [{ s: '..1...22..1...22', k: '...1..1....1..1.' }, 2],
            // the left hand on the low tom for the second stroke
            [{ s: '..1...2...1...2.', t3: '.......2.......2', k: '...1..1....1..1.' }, 1.2],
          ],
          fills: [
            // the three side of the clave on the toms
            [{ t1: '2..2...2', s: '.1..11..' }, 1.4],
            [{ t2: '.2.2', s: '1.1.' }, 1.0],
          ],
        },
      },
      {
        key: 'afro-blue',
        title: 'Afro Blue',
        feel: "Gary Burton's Cal Tjader tribute: 6/8, the bell in the right hand, the 6/8 clave on the foot",
        weight: 1.1,
        params: {
          kit: 'virtuosity',
          meter: '12/8',
          bpm: [93, 100],
          swing: 0,
          backbeats: [6, 18],
          ghostWeights: {},
          mix: { r: 0.85, p1: 0.75, p2: 0.85 },
          /* A reconstruction of his book's 6/8: the standard bell in the right
             hand, the 6/8 clave inside it on the left foot, the kick on the
             first and third pulse, and the left hand's open tones on the second
             and fourth on the low tom, conga-fashion. */
          perc: [
            { inst: 'clave', steps: [0, 4, 8, 14, 18] },
            { inst: 'cowbell', steps: [0, 4, 8, 10, 14, 18, 22], accents: [0] },
          ],
          figures: [
            // no ghost under the second open tone: the bell has the other hand
            [
              {
                s: '..1.......1.............',
                t2: '......2...........2.....',
                k: '1...........1...........',
              },
              2,
            ],
            // the kick answers on the "and" of the fourth pulse
            [
              {
                s: '..1.......1.....1.......',
                t2: '......2...........2.....',
                k: '1...........1.........1.',
              },
              1.2,
            ],
          ],
          fills: [
            // the bell's last notes on the toms
            [{ t1: '2...2.', t3: '..2..2' }, 1.2],
            [{ t2: '2.2.2.', t3: '.....2', s: '.1.1..' }, 1.0],
          ],
        },
      },
      {
        key: 'la-comparsa',
        title: 'La Comparsa',
        feel: "Lecuona's carnival piece with Michel Camilo: son clave 2-3 on the foot, the hands galloping like a conga line",
        weight: 1.0,
        params: {
          bpm: [97, 103],
          swing: 0,
          backbeats: [6, 14],
          ghostWeights: {},
          mix: { h: 0.7, p1: 0.75 },
          /* A reconstruction: the reviewer heard "subtle, galloping work". The
             conga de comparsa his book transcribes, son clave 2-3 on the left
             foot, both hands on the snare and the toms, two quick strokes into
             each accent, the low tom on the ponche with the kick. */
          perc: [{ inst: 'clave', steps: [2, 4, 8, 11, 14] }],
          figures: [
            [{ s: '.11.2..1.11.2...', t2: '......2.......2.', k: '......1.......1.' }, 2],
            [{ s: '.11.2....11.2...', t2: '......2.......2.', k: '...1..1....1..1.' }, 1.2],
          ],
          fills: [
            [{ t1: '2..2..2.', s: '.11.11.1' }, 1.2],
            [{ s: '11.2', t2: '..2.' }, 1.0],
          ],
        },
      },
      {
        key: 'night-in-torino',
        title: 'A Night in Torino (Tunisia)',
        feel: "Italuba's A Night in Tunisia: rumba clave 2-3 on the foot, the ride bell, the left hand on the toms",
        weight: 0.8,
        params: {
          bpm: [121, 127],
          swing: 0,
          backbeats: [6, 14],
          ghostWeights: {},
          mix: { r: 0.8, p1: 0.75 },
          /* A reconstruction of the tune's Latin A section with his own band:
             rumba clave 2-3 on the left foot, the right hand on the ride bell,
             the left on the toms where a conga player's open tones go, the kick
             on the tumbao. */
          perc: [{ inst: 'clave', steps: [2, 4, 8, 11, 15] }],
          figures: [
            [
              {
                r: '2.2.2.2.2.2.2.2.',
                s: '..1.......1.....',
                t3: '......2.......2.',
                k: '...1..1....1..1.',
              },
              2,
            ],
            [
              {
                r: '2.2.2.2.2.2.2.2.',
                s: '..1.......1.....',
                t2: '.......2.......2',
                t3: '......2.......2.',
                k: '...1..1....1..1.',
              },
              1.2,
            ],
          ],
          fills: [
            [{ t1: '2..2...2', s: '.1..11..' }, 1.2],
            [{ t2: '.2.2', s: '1.1.' }, 1.0],
          ],
        },
      },
      {
        key: 'que-negro-esta',
        title: 'Que Negro Está',
        feel: 'his own songo with Italuba: son clave 3-2 on the foot, the bell in the right hand, snare accents on the "and"s',
        weight: 0.9,
        params: {
          bpm: [114, 120],
          swing: 0,
          backbeats: [7, 15],
          ghostWeights: {},
          mix: { h: 0.7, p1: 0.75, p2: 0.85 },
          /* A reconstruction on his record's songo, read as every other Latin
             song is: one bar holds one clave. The record writes it over two
             bars of sixteenths; here every other step is kept, so the bell's
             eighths are every step, the snare's accents (the record's "and"s of
             2 and 4) on steps 3, 7, 11 and 15, the kick (its "and" of 3) on 5
             and 13, and the record's ghosts and tom
             stroke (its odd steps) drop out. The tempo is Deezer's 117.5 in
             this reading, a songo tempo with one clave a bar; its other entry,
             156.6, would be far too quick. */
          perc: [
            { inst: 'clave', steps: [0, 3, 6, 10, 12] },
            { inst: 'cowbell', every: 1, accents: [0, 8] },
          ],
          figures: [
            [{ s: '...3...3...3...3', k: '.....1.......1..' }, 2],
            // the record's variation: the tom on the last "and", the kick on 3
            [{ s: '...3...3...3....', t2: '...............2', k: '.....1..1....1..' }, 1.2],
          ],
          fills: [
            [{ s: '3.1.1.', t2: '.1.1.2' }, 1.2],
            [{ t1: '2..2', t2: '..2.' }, 1.0],
          ],
        },
      },
    ],
  },
  lombardo: {
    label: 'Dave Lombardo',
    drummer: true,
    hint: 'Slayer from Show No Mercy to World Painted Blood: the skank beat, kick on the beat and snare on every "and", under the ride, a crash or a wash of open hat at 180 to 250; the snare on 2 and 4 or on every beat over a wall of double bass; half-time on the ride for the heavy riffs, and tom figures over the feet that he hears as Cuban. Two bass drums, not a double pedal, on a dry, punchy kit. Each New plays one of fourteen of his songs in its own time: the fast ones, Angel of Death and Raining Blood among them, in eighths at the speed of the record (the slider goes to 380); the heavy ones, South of Heaven and Seasons in the Abyss among them, in sixteenths. The stage names the song. All fourteen follow human transcriptions; the tom figure of the break is a reconstruction.',
    toms: true,
    kit: 'crocell',
    // two bass drums, alternating the feet in a run (his record's rule)
    doubleKick: true,
    hats: 8,
    // the double-bass figures below run, so a sixteenth grid stops at 150
    bpm: [100, 150],
    // his record's avoid list: no swing, no ghost-note funk
    swing: 0,
    ghostBias: 0,
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 14,
    hatDepth: 0.3,
    mix: { h: 0.85 },
    rimshot: 0.3,
    // the flammed toms of the Angel of Death break
    flam: 0.1,
    /* On top, never quantised: a small repeating wobble rather than a grid
       ("controlled chaos"; his record's 3–4 ms of jitter, not triggered kicks) */
    feel: { label: 'On top', s: -0.02, k: -0.01, jitter: 0.03 },
    forceKick: [0],
    kick1: [
      ['1010', 4],
      ['1111', 2],
    ],
    kick: [
      ['1010', 3],
      ['1111', 2],
      ['1000', 1.5],
      ['1011', 0.8],
    ],
    /* His mid-tempo and heavy vocabulary, from the songs below: the double
       bass under the ride or under a snare on every beat, the dotted-eighth
       china of South of Heaven, the tom figure of World Painted Blood over
       eighths on the feet, the half-time ride, the gallop under crashes. */
    figures: [
      [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1111111111111111' }, 3],
      [{ s: '3...3...3...3...', k: '1111111111111111' }, 2],
      [{ c: '3..3..3.....3.3.', s: '3..3..3..3..3.3.', k: '1111111111111111' }, 1.2],
      [{ t2: '222.2.222.2.222.', s: '....3.......3...', k: '1.1.1.1.1.1.1.1.' }, 1],
      [{ r: '1.1.1.1.1.1.1.1.', s: '........3.......', k: '1.1...........1.' }, 1.5],
      [{ c: '1.1.1.1.1.1.1.1.', k: '1.11....1.11....' }, 1],
    ],
    fills: [
      // snare and toms in turn, the feet carrying on under them
      [{ s: '333..3..', t1: '...2..2.', t2: '....2..2' }, 2],
      [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 2],
      // the tresillo on the floor tom, a crash on each stroke
      [{ c: '1..1..1.', t3: '2..2..2.' }, 1.4],
      [{ s: '3.3.3.3.', k: '........' }, 1],
    ],
    /* His songs. Every groove is read from a human Songsterr transcription
       (each tab's aiGenerated flag checked), the commonest bars kept, and the
       tempo is the tab's, checked against songbpm.com, which counts most of
       them in half time. Past 190 they are in eighths (4/4-8): there the
       sixteenths of the tabs' kicks fall on the eighths, and a run of
       sixteenth double bass at 175 and over is left out. The Angel of Death
       break is counted as he counts it, at 105, its 32nds written as
       sixteenths. See planning/drumming-research.md, section U. */
    songs: [
      {
        key: 'angel-of-death',
        title: 'Angel of Death',
        feel: 'the skank beat at full speed under the ride or open hats, the rock beat and half-time between (record 206–220)',
        weight: 1.4,
        params: {
          meter: '4/4-8',
          bpm: [205, 220],
          backbeats: [2, 6],
          figures: [
            [{ r: '11111111', s: '.3.3.3.3', k: '1.1.1.1.' }, 2],
            [{ h: '44444444', s: '.3.3.3.3', k: '1.1.1.1.' }, 2],
            [{ h: '44444444', s: '..3...3.', k: '1...1...' }, 1.5],
            [{ r: '11111111', s: '..3...3.', k: '1...1...' }, 1],
            [{ r: '11111111', s: '....3...', k: '1.......' }, 1],
          ],
          fills: [
            // crash and kick together twice, the snare answering
            [{ c: '11..11..', s: '..33..33', k: '11..11..' }, 1.4],
            [{ s: '33..', t1: '..22' }, 1.2],
            [{ s: '.333....', t1: '....22..', t2: '......22' }, 1],
            [{ s: '.3.333..', t2: '......22' }, 1],
          ],
        },
      },
      {
        key: 'angel-of-death-break',
        title: 'Angel of Death (the break)',
        feel: 'the break as he counts it: his 32nds on the feet as sixteenths, a tresillo on the toms (record 103–110)',
        weight: 1.2,
        params: {
          bpm: [100, 110],
          figures: [
            // the break: both feet throughout, the toms in threes and threes and two
            [{ t1: '2..2..2.........', t2: '........3..2..2.', k: '1111111111111111' }, 2],
            // either side of it: the ride on the record's eighths, the snare on its quarters
            [{ r: '1111111111111111', s: '3.3.3.3.3.3.3.3.', k: '1111111111111111' }, 2],
            // the skank going into it, in the same count
            [{ r: '1111111111111111', s: '.3.3.3.3.3.3.3.3', k: '1.1.1.1.1.1.1.1.' }, 1],
          ],
          fills: [
            [{ s: '33..33..', t1: '..22....', t2: '......22' }, 1.4],
            [{ c: '1..1..1.', t3: '2..2..2.' }, 1.2],
            [{ s: '3.3.3.3.3.3.33..', t1: '..............22' }, 1],
          ],
        },
      },
      {
        key: 'raining-blood',
        title: 'Raining Blood',
        feel: 'the skank beat from 214 to the 250 of the ending, crashes on every beat at the end, the intro toms (record 211–251)',
        weight: 1.3,
        params: {
          meter: '4/4-8',
          bpm: [212, 250],
          backbeats: [2, 6],
          fills: [
            // the intro: floor and mid toms together, three times
            [{ t2: '222.', t3: '222.' }, 1.4],
            [{ s: '.3.3.333' }, 1.2],
            [{ t1: '22......', t2: '..2222..', t3: '......22' }, 1],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the half-time riff',
            params: {
              figures: [
                // the half-time riff: hats on the beat, the snare on 3
                [{ h: '4.4.4.4.', s: '....3...', k: '11......' }, 1],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the skank beat',
            params: {
              figures: [
                [{ r: '11111111', s: '.3.3.3.3', k: '1.1.1.1.' }, 2],
                [{ h: '44444444', s: '.3.3.3.3', k: '1.1.1.1.' }, 1.2],
              ],
            },
          },
          {
            letter: 'C',
            label: 'the ending',
            params: {
              figures: [
                // the ending: a crash on every beat
                [{ c: '1.1.1.1.', s: '.3.3.3.3', k: '1.1.1.1.' }, 1.4],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B', 'C', 'C'],
      },
      {
        key: 'necrophobic',
        title: 'Necrophobic',
        feel: 'the fastest on Reign in Blood: the skank beat on open hats and ride, a half-time bar now and then (record 241–259)',
        weight: 0.9,
        params: {
          meter: '4/4-8',
          bpm: [240, 250],
          backbeats: [2, 6],
          figures: [
            [{ h: '44444444', s: '.3.3.3.3', k: '1.1.1.1.' }, 2],
            [{ r: '11111111', s: '.3.3.3.3', k: '1.1.1.1.' }, 1.6],
            [{ r: '11111111', s: '....3...', k: '1.......' }, 0.6],
          ],
          fills: [
            [{ s: '.3.3.333' }, 1.4],
            [{ s: '33..', t1: '..2.', t3: '...2' }, 1.2],
            [{ s: '.3.3', t3: '...2' }, 1],
          ],
        },
      },
      {
        key: 'war-ensemble',
        title: 'War Ensemble',
        feel: 'eighths on both feet under the snare on every beat, the skank beat, the two-bar march (record 195–207)',
        weight: 1.1,
        params: {
          meter: '4/4-8',
          bpm: [198, 207],
          backbeats: [2, 6],
          figures: [
            [{ r: '11111111', s: '3.3.3.3.', k: '11111111' }, 2],
            [{ h: '44444444', s: '.3.3.3.3', k: '1.1.1.1.' }, 1.6],
            [{ r: '11111111', s: '3...3...', k: '11111111' }, 1.2],
            // the march: snare and floor tom on the riff, crashes on the pushes
            [
              {
                c: '....1.1.1.......',
                h: '4.4.......4...4.',
                s: '3...3.3.3...3...',
                t3: '............2...',
                k: '1111111111111111',
              },
              1.2,
            ],
          ],
          fills: [
            [{ s: '.33.....', t1: '...22...', t2: '.....22.' }, 1.4],
            [{ s: '3.3.', t3: '.2.2' }, 1],
            [{ c: '1..1..1.', s: '3..3..3.', k: '1..1..1.' }, 0.8],
          ],
        },
      },
      {
        key: 'jesus-saves',
        title: 'Jesus Saves',
        feel: 'the skank beat on the ride bell after a splash, then on open hats; the bell over a snare on every beat (record 210–228)',
        weight: 0.8,
        params: {
          meter: '4/4-8',
          bpm: [210, 228],
          backbeats: [2, 6],
          figures: [
            [{ c: '4.......', r: '.2222222', s: '.3.3.3.3', k: '1.1.1.1.' }, 2],
            [{ h: '44444444', s: '.3.3.3.3', k: '1.1.1.1.' }, 1.4],
            [{ r: '22222222', s: '3.3.3.3.', k: '1.1.1.1.' }, 1],
          ],
          fills: [
            [{ s: '.3.3.333' }, 1.2],
            [{ s: '33..', t1: '..22' }, 1],
            [{ r: '2...', s: '..33', t2: '.2..' }, 0.8],
          ],
        },
      },
      {
        key: 'cult',
        title: 'Cult',
        feel: 'Christ Illusion: the skank beat, the ride over eighths on the feet, a tom groove under the riff (record 200–210)',
        weight: 0.8,
        params: {
          meter: '4/4-8',
          bpm: [200, 210],
          backbeats: [2, 6],
          figures: [
            [{ h: '44444444', s: '.3.3.3.3', k: '1.1.1.1.' }, 2],
            [{ r: '11111111', s: '.3.3.3.3', k: '1.1.1.1.' }, 1.4],
            [{ r: '1.1.1.1.', s: '3...3...', k: '11111111' }, 1.2],
            [{ t3: '2.2...2.', s: '....3...', t2: '....2...', k: '1.1.1.1.' }, 1],
          ],
          fills: [
            [{ s: '.33.3...', t2: '...2.22.', t3: '.......2' }, 1.4],
            [{ s: '33..', t2: '..22' }, 1],
            [{ s: '.3.3', t2: '..2.', t3: '...2' }, 1],
          ],
        },
      },
      {
        key: 'south-of-heaven',
        title: 'South of Heaven',
        feel: 'open hats over 2 and 4, then the snare on every beat over double bass, the dotted-eighth china (record 134–146)',
        weight: 1.2,
        params: {
          bpm: [134, 146],
          fills: [
            [{ s: '333..3..33..3.3.', t1: '...2..2...2.....', t2: '....2..2...2....' }, 1.4],
            [
              {
                s: '333..3..333.....',
                t1: '...2........2...',
                t2: '....2......2.2..',
                t3: '......22......2.',
              },
              1,
            ],
            [{ s: '3.3.3.3.', k: '........' }, 1],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
              figures: [
                [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.......1.......' }, 2],
                [{ c: '....4...3.......', s: '....3.......3...', k: '1.1.....1.....1.' }, 1.2],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the double bass',
            params: {
              figures: [
                [{ s: '3...3...3...3...', k: '1111111111111111' }, 2],
                // threes across the bar on the china and snare, the feet underneath
                [{ c: '3..3..3.....3.3.', s: '3..3..3..3..3.3.', k: '1111111111111111' }, 0.8],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'mandatory-suicide',
        title: 'Mandatory Suicide',
        feel: 'open hats on the beat, the snare on 2 and 4, the feet in sixteenths or on 1 and 3; a half-time bar (record 148)',
        weight: 1.0,
        params: {
          bpm: [142, 150],
          figures: [
            [{ h: '4...4...4...4...', s: '....3.......3...', k: '1111111111111111' }, 2],
            [{ h: '4...4...4...4...', s: '....3.......3...', k: '1.......1.....1.' }, 1.6],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1111111111111111' }, 1.2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '........3.......', k: '1.....11..1.1...' }, 0.8],
          ],
          fills: [
            [{ s: '3.3.', t3: '2.2.' }, 1.2],
            [{ s: '33..', t1: '..2.', t3: '...2' }, 1.2],
            [{ s: '33......', t1: '..22....', t2: '....22..', t3: '......22' }, 1],
          ],
        },
      },
      {
        key: 'seasons-in-the-abyss',
        title: 'Seasons in the Abyss',
        feel: 'a straight rock beat at 152 on the ride or open hats, the snare doubling at the end of the bar, the mid tom answering',
        weight: 1.1,
        params: {
          bpm: [146, 156],
          /* past 150 on a sixteenth grid a run of double bass is past RUN_RATE,
             and these figures have none, so the fallback kick cells drop it too */
          kick1: [['1010', 1]],
          kick: [
            ['1010', 3],
            ['1000', 1.5],
            ['1011', 0.8],
          ],
          figures: [
            [{ r: '....1.1.1.1.1...', s: '....3.......3.33', k: '1.......1.......' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 1.6],
            [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.......1.......' }, 1.4],
            [
              {
                r: '....1.1.1.1.1...',
                s: '....3.......3...',
                t2: '..............2.',
                k: '1.......1.......',
              },
              1,
            ],
          ],
          fills: [
            [{ s: '3.3.3...', t2: '......2.', t3: '.......2' }, 1.4],
            [{ s: '3...3.33', t3: '..2.....' }, 1],
            // the backbeat on 4 kept, the snare on its "and", the mid tom last
            [{ s: '3.3.', t2: '...2' }, 1],
          ],
        },
      },
      {
        key: 'dead-skin-mask',
        title: 'Dead Skin Mask',
        feel: 'no snare: floor tom and bell on 2 and 4 over the hat foot, then double bass under the ride, a gallop (record 110)',
        weight: 1.0,
        params: {
          bpm: [106, 114],
          fills: [
            [{ t3: '22......', t1: '.....222' }, 1.2],
            [{ t3: '22......', t1: '.....2..', t2: '......22' }, 1],
            [{ t2: '...22..22.22....', t3: '..............22' }, 0.8],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the intro',
            params: {
              /* the intro has no kick on 1: the style's forced one is lifted, and the
                 crash that starts each half goes without one */
              forceKick: [],
              phraseMark: { kick: false },
              figures: [
                [{ r: '....2.......2...', t3: '....2.......2...', hf: '1.......1.......' }, 1],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the groove',
            params: {
              figures: [
                [{ r: '1.1.1.1.1.1.1.2.', k: '1111111111111111' }, 2],
                [{ c: '1.1.1.1.1.1.1.1.', k: '1.11....1.11....' }, 1.4],
                [{ h: '4...4...4...4...', k: '1.11....1.11....' }, 1.2],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'hell-awaits',
        title: 'Hell Awaits',
        feel: 'the intro: toms and kick on 2 and 4, then double bass under the snare, the toms on 1 and 3 (record 103–106)',
        weight: 1.0,
        params: {
          bpm: [100, 108],
          fills: [
            [{ s: '33....', t1: '..22..', t2: '....22' }, 1.4],
            [{ s: '..3.3.', k: '11....' }, 1],
            [{ s: '....3...', t1: '......2.', t2: '2.....2.', t3: '2.......', k: '11111.1.' }, 1],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the intro',
            params: {
              /* the intro has no kick on 1: the style's forced one is lifted, and the
                 crash that starts each half goes without one */
              forceKick: [],
              phraseMark: { kick: false },
              figures: [
                [{ t2: '....2.......2...', t3: '....2.......2...', k: '....1.......1...' }, 1],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the main groove',
            params: {
              figures: [
                // the floor tom alone on the 1, under the crash; both toms on 3
                [
                  {
                    s: '....3.......3...',
                    t2: '........2.......',
                    t3: '2.......2.......',
                    k: '1111111111111111',
                  },
                  2,
                ],
                [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1111111111111111' }, 1.6],
                [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 1],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'world-painted-blood',
        title: 'World Painted Blood',
        feel: '2009: eighths on both feet under crashes, open hats or a tom figure in threes; then the skank beat (record 180–182)',
        weight: 1.0,
        params: {
          bpm: [176, 186],
          /* past 150 on a sixteenth grid a run of double bass is past RUN_RATE,
             and these figures have none, so the fallback kick cells drop it too */
          kick1: [['1010', 1]],
          kick: [
            ['1010', 3],
            ['1000', 1.5],
            ['1011', 0.8],
          ],
          figures: [
            // the toms in threes and ones over eighths on the feet: a bar on the mid tom, a bar on
            // the floor
            [{ t2: '222.2.222.2.222.', k: '1.1.1.1.1.1.1.1.' }, 1.4],
            [{ c: '1...1...1...1...', s: '3.......3.......', k: '1.1.1.1.1.1.1.1.' }, 1.2],
            [{ c: '1...1...1...1...', s: '3...3...3...3...', k: '1.1.1.1.1.1.1.1.' }, 1.2],
            [{ h: '4...4...4...4...', s: '....3.......3...', k: '1.1.1.1.1.1.1.1.' }, 1.6],
            [{ h: '4.4.4.4.4.4.4.4.', s: '..3...3...3...3.', k: '1...1...1...1...' }, 2],
          ],
          fills: [
            [{ s: '3.33.33.' }, 1.2],
            [{ t2: '222.2.22', s: '........' }, 1],
            [{ t2: '2.2.....', t3: '....2.2.' }, 1],
          ],
        },
      },
      {
        key: 'black-magic',
        title: 'Black Magic',
        feel: 'Show No Mercy, 1983: the skank beat on open hats at 177–190, a bar of 2 and 4 now and then',
        weight: 0.8,
        params: {
          bpm: [177, 188],
          /* past 150 on a sixteenth grid a run of double bass is past RUN_RATE,
             and these figures have none, so the fallback kick cells drop it too */
          kick1: [['1010', 1]],
          kick: [
            ['1010', 3],
            ['1000', 1.5],
            ['1011', 0.8],
          ],
          figures: [
            [{ h: '4.4.4.4.4.4.4.4.', s: '..3...3...3...3.', k: '1...1...1...1...' }, 2.4],
            [{ h: '4.4.4.4.4.4.4.4.', s: '....3.......3...', k: '1.......1.......' }, 0.8],
            [{ r: '1.1.1.1.1.1.1.1.', s: '..3...3...3...3.', k: '1...1...1...1...' }, 0.8],
          ],
          fills: [
            [{ s: '333.333.' }, 1.4],
            [{ s: '33......', t1: '..2.....', t2: '....2.2.' }, 1],
            [{ c: '1...1...', s: '..3...3.' }, 1],
          ],
        },
      },
    ],
  },
  davies: {
    label: 'Adrienne Davies',
    drummer: true,
    hint: "Earth's drummer from Hex (2005) on, half of the band with Dylan Carlson: the slowest drummer you will meet. A ride she prefers to the hats, a heavy, relaxed backbeat, the kick placed rarely, every cymbal left to ring, and almost never a fill: a crash left to swell over the bar instead. A ringing 1960s Ludwig, or a big, rough kit on the heavier Primitive and Deadly. Each New plays one of fifteen of her songs at its record tempo: Hex's half-time, the 12/8 of The Bees Made Honey in the Lion's Skull, the slow shuffles of Angels of Darkness, Demons of Light. The tempo stops at 50, so a song slower than that is counted in eighths: Rise to Glory, at 43 on the record, plays at 87. The stage names the song. One follows a human transcription; the rest are reconstructions.",
    toms: true,
    kit: 'smdrums',
    mix: { h: 0.7 },
    meter: '4/4-8',
    hats: 8,
    // the record: 35–60, and the Studio stops at 50; the slower songs set their own count
    bpm: [50, 60],
    swingUnit: 8,
    swing: 0,
    // no ghosts: two to eight notes a bar (the record's generation rules)
    ghostBias: 0,
    opens: 0,
    backbeats: [4],
    targetDensity: 5,
    hatDepth: 0.3,
    // heavy and a little behind (the record's "laid back", inferred: to be measured from stems)
    feel: { label: 'Heavy, behind', s: 0.03, k: 0.02, jitter: 0.01 },
    /* Fills almost never: swells and dynamic shifts instead (the record).
       The crash that marks a phrase is the swell, on about a third of them
       ("replace the ride with a long crash swell", 0.3 in the record). */
    fillChance: 0.15,
    midFills: 0,
    phraseMark: { crash: 0.3 },
    kick1: [
      ['1000', 4],
      ['0000', 1],
    ],
    kick: [
      ['0000', 5],
      ['0010', 1],
    ],
    // no busy kick (the record's avoid list): none on the "and"s of 1, 2 and 3
    noKick: [1, 3, 5],
    /* The record's glacial half-time backbeat (an archetype): the ride on 1
       and 3, the snare on 3, the kick on 1 and now and then the "and" of 4.
       Bars of eighths, nothing finer; the cymbals ring. */
    figures: [
      [{ r: '1...1...', s: '....3...', k: '1.......' }, 2],
      [{ r: '1...1...', s: '....3...', k: '1......1' }, 1.4],
      // the kick left out for a phrase (0.2 in the record)
      [{ r: '1...1...', s: '....3...' }, 0.6],
      // a crash on 1 in place of the ride, left to ring through the bar
      [{ c: '1.......', s: '....3...', k: '1.......' }, 0.8],
      // the ride on every beat
      [{ r: '1.1.1.1.', s: '....3...', k: '1.......' }, 1],
    ],
    fills: [
      // two floor-tom strokes on 3 and 4
      [{ t3: '2.2.' }, 1],
      // the snare on 3, the floor tom on 4
      [{ s: '3...', t3: '..2.' }, 0.8],
      // the swell: a crash and the kick on 1, left to ring, one floor-tom stroke on 3
      [{ c: '1.......', k: '1.......', t3: '....2...' }, 1],
    ],
    /* Her records: one New picks one, and the stage names it. Credits checked
       on Wikipedia (drums on every Earth record from Hex; Full Upon Her
       Burning Lips is the duo). No published tempo exists for these songs:
       each is the beat measured from the record's Deezer preview, checked
       against the Spotify figure on songbpm and Deezer's own, which are
       often doubled or tripled (see the Adrienne Davies section of
       `.context/app/planning/drumming-research.md`). The Bees Made Honey in
       the Lion's Skull follows a human Songsterr transcription (609341); the
       rest are reconstructions from the record's patterns and what she has
       said about her playing. A song under 50 is counted in eighths: one bar
       here is half a bar of the record's, at twice the number, so a quarter
       here is the record's eighth, and nothing is written between. */
    songs: [
      {
        key: 'land-of-some-other-order',
        title: 'Land of Some Other Order',
        feel: 'Hex: the ride on every beat, the snare on 3, the kick on 1 (record about 65)',
        weight: 1.4,
        params: {
          bpm: [63, 67],
          swing: 0,
          figures: [
            [{ r: '1.1.1.1.', s: '....3...', k: '1.......' }, 2],
            [{ r: '1.1.1.1.', s: '....3...', k: '1......1' }, 1.2],
            // the floor tom answering on 4
            [{ r: '1.1.1.1.', s: '....3...', t3: '......2.', k: '1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'lens-of-unrectified-night',
        title: 'Lens of Unrectified Night',
        feel: 'Hex at its slowest: the ride on 1 and 3, the snare once a bar on 3 (record about 53)',
        weight: 1.2,
        params: {
          bpm: [52, 55],
          swing: 0,
          figures: [
            [{ r: '1...1...', s: '....3...', k: '1.......' }, 2],
            [{ r: '1...1...', s: '....3...', k: '1......1' }, 1],
            [{ c: '1.......', s: '....3...', k: '1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'an-inquest-concerning-teeth',
        title: 'An Inquest Concerning Teeth',
        feel: 'Hex, counted in eighths: the record beats about 41, so it plays at twice that, the snare on its 2 and 4',
        weight: 1.0,
        params: {
          /* The record's beat is about 41.5, under the Studio's 50, so it is
             counted in eighths: one bar here is half a bar of the record's,
             at twice the number. The ride on the record's eighths (our
             quarters), the snare on its 2 and 4 (our 3, every bar), the kick
             on its 1. */
          bpm: [82, 84],
          swing: 0,
          targetDensity: 3,
          // nothing between the record's eighths: no kick off our quarters
          noKick: [1, 3, 5, 7],
          figures: [
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1...............' }, 2],
            [{ r: '1...1...', s: '....3...', k: '1.......' }, 1.2],
          ],
          fills: [
            [{ t3: '2...' }, 1],
            [{ c: '1.......', k: '1.......', s: '....3...' }, 0.6],
          ],
        },
      },
      {
        key: 'raiford',
        title: 'Raiford (The Felon Wind)',
        feel: 'Hex in 12/8: the ride on each of four slow pulses, the snare on the third (record pulse about 36)',
        weight: 1.0,
        params: {
          /* 12/8: the pulse is a dotted quarter of about 36, and the tempo
             counts quarters, so it reads half again (54). Notes on the
             eighths only, the even steps. */
          meter: '12/8',
          bpm: [52, 55],
          swing: 0,
          backbeats: [12],
          // the style's noKick is for eighths of 4/4; here the kick keeps to the eighths, the even steps
          noKick: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
          figures: [
            [
              {
                r: '1.....1.....1.....1.....',
                s: '............3...........',
                k: '1.......................',
              },
              2,
            ],
            [
              {
                r: '1.....1.....1.....1.....',
                s: '............3...........',
                k: '1.........1.............',
              },
              1,
            ],
            [
              {
                c: '1.......................',
                s: '............3...........',
                k: '1.......................',
              },
              0.6,
            ],
          ],
          fills: [
            [{ t3: '2.....2.....' }, 1],
            [{ c: '1.....', k: '1.....' }, 0.6],
          ],
        },
      },
      {
        key: 'bees-made-honey',
        title: "The Bees Made Honey in the Lion's Skull",
        feel: 'in 12/8: the ride on the four pulses, the kick on 1 and the last eighth of 2 and 4, the snare on 3 (record 82)',
        weight: 1.4,
        params: {
          /* From a human Songsterr transcription whose drum track is named
             for her (609341), at its tempo of 82 (the preview measures a
             dotted quarter of 55, which is 83). Its bars of 15/8, the
             cymbal stopping for two pulses, are left out. */
          meter: '12/8',
          bpm: [80, 84],
          swing: 0,
          backbeats: [12],
          // the style's noKick is for eighths of 4/4; here the kick keeps to the eighths, the even steps
          noKick: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
          figures: [
            [
              {
                r: '1.....1.....1.....1.....',
                s: '............2...........',
                k: '1.........1...........1.',
              },
              2,
            ],
            // the last kick a snare
            [
              {
                r: '1.....1.....1.....1.....',
                s: '............2.........2.',
                k: '1.........1.............',
              },
              1.2,
            ],
          ],
          fills: [
            // the tab's one variation: the snare on 3 and 4, the kick after each
            [{ s: '2.....2.....', k: '....1.....1.' }, 1],
            [{ t3: '2.....2.....' }, 0.6],
          ],
        },
      },
      {
        key: 'rise-to-glory',
        title: 'Rise to Glory',
        feel: 'Bees, counted in eighths: the record beats about 43, the ride on its eighths, the snare on its 2 and 4',
        weight: 1.0,
        params: {
          /* The record's beat is about 43.5, under the Studio's 50, so it is
             counted in eighths: one bar here is half a bar of the record's,
             at twice the number. The ride on its eighths (our quarters), the
             snare on its 2 and 4 (our 3). */
          bpm: [86, 88],
          swing: 0,
          targetDensity: 3,
          // nothing between the record's eighths: no kick off our quarters
          noKick: [1, 3, 5, 7],
          figures: [
            [{ r: '1.1.1.1.', s: '....3...', k: '1.......' }, 2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1.......1.......' }, 1],
            [{ c: '1.......', s: '....3...', k: '1.......' }, 0.5],
          ],
          fills: [
            [{ t3: '2...' }, 1],
            [{ c: '1.......', k: '1.......', s: '....3...' }, 0.6],
          ],
        },
      },
      {
        key: 'engine-of-ruin',
        title: 'Engine of Ruin',
        feel: 'Bees in 12/8: a slow shuffle, the snare on 2 and 4 (record pulse about 45)',
        weight: 0.8,
        params: {
          /* 12/8: a dotted quarter of about 45.5, so the tempo reads 68.
             The record's slow swampy shuffle, thinned to its rule of eight
             notes a bar. */
          meter: '12/8',
          bpm: [67, 70],
          swing: 0,
          backbeats: [6, 18],
          // the style's noKick is for eighths of 4/4; here the kick keeps to the eighths, the even steps
          noKick: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
          figures: [
            [
              {
                r: '1.....1.....1.....1.....',
                s: '......3...........3.....',
                k: '1...........1...........',
              },
              2,
            ],
            // the ride on the last triplet of 4, into the bar line
            [
              {
                r: '1.....1.....1.....1...1.',
                s: '......3...........3.....',
                k: '1.......................',
              },
              1,
            ],
          ],
          fills: [
            [{ t3: '2.....' }, 1],
            [{ c: '1.....', k: '1.....', s: '3.....' }, 0.6],
          ],
        },
      },
      {
        key: 'old-black',
        title: 'Old Black',
        feel: 'Angels of Darkness: a ponderous dirge, the ride on every beat, the snare on 3 (record about 59)',
        weight: 1.4,
        params: {
          bpm: [58, 60],
          swing: 0,
          figures: [
            [{ r: '1.1.1.1.', s: '....3...', k: '1.......' }, 2],
            // the kick on the "and" of 4 every second bar
            [{ r: '1.1.1.1.1.1.1.1.', s: '....3.......3...', k: '1..............1' }, 1.2],
            [{ c: '1.......', s: '....3...', k: '1.......' }, 0.6],
          ],
        },
      },
      {
        key: 'father-midnight',
        title: 'Father Midnight',
        feel: 'Angels of Darkness: swung eighths on the ride, a swampy kick on the "and" of 4 (record about 66)',
        weight: 1.0,
        params: {
          bpm: [64, 68],
          // the preview's eighths split two to one: a triplet swing
          swing: 80,
          swingRange: [70, 90],
          figures: [
            [{ r: '1.1.1.11', s: '....3...', k: '1.......' }, 2],
            [{ r: '1.1.1.1.', s: '....3...', k: '1......1' }, 1.2],
          ],
        },
      },
      {
        key: 'hells-winter',
        title: "Hell's Winter",
        feel: 'Angels of Darkness: a crash ridden on 1 and 3 and left to wash, the snare on 3 (record about 53)',
        weight: 0.8,
        params: {
          bpm: [52, 54],
          swing: 0,
          figures: [
            [{ c: '1...1...', s: '....3...', k: '1.......' }, 1.6],
            [{ r: '1.1.1.1.', s: '....3...', k: '1.......' }, 1.2],
          ],
        },
      },
      {
        key: 'his-teeth-did-brightly-shine',
        title: 'His Teeth Did Brightly Shine',
        feel: 'Angels of Darkness II in 12/8: a slow, swampy shuffle, the snare on 2 and 4 (record pulse about 47)',
        weight: 1.0,
        params: {
          /* 12/8: a dotted quarter of about 47, so the tempo reads 70. The
             record's slow swampy shuffle, thinned to eight notes a bar. */
          meter: '12/8',
          bpm: [69, 72],
          swing: 0,
          backbeats: [6, 18],
          // the style's noKick is for eighths of 4/4; here the kick keeps to the eighths, the even steps
          noKick: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
          targetDensity: 7,
          figures: [
            [
              {
                r: '1.....1.....1.....1...1.',
                s: '......3...........3.....',
                k: '1.......................',
              },
              2,
            ],
            [
              {
                r: '1.....1.....1.....1.....',
                s: '......3...........3.....',
                k: '1...........1...........',
              },
              1.2,
            ],
          ],
          fills: [
            [{ t3: '2.....' }, 1],
            [{ c: '1.....', k: '1.....', s: '3.....' }, 0.6],
          ],
        },
      },
      {
        key: 'there-is-a-serpent-coming',
        title: 'There Is a Serpent Coming',
        feel: 'Primitive and Deadly, the rock record: a heavy backbeat on 2 and 4 under Mark Lanegan (record about 62)',
        weight: 1.0,
        params: {
          bpm: [60, 63],
          kit: 'bigrusty',
          swing: 0,
          backbeats: [2, 6],
          figures: [
            [{ r: '1.1.1.1.', s: '..3...3.', k: '1...1...' }, 2],
            [{ h: '4.4.4.4.', s: '..3...3.', k: '1.....1.' }, 1],
            [{ c: '1.......', r: '....1...', s: '..3...3.', k: '1...1...' }, 0.6],
          ],
          fills: [
            [{ s: '3.3.', t3: '..2.' }, 1],
            [{ t1: '2.', t3: '.2' }, 0.8],
            [{ c: '1.......', k: '1.......', s: '..3...3.' }, 0.6],
          ],
        },
      },
      {
        key: 'torn-by-the-fox',
        title: 'Torn by the Fox of the Crescent Moon',
        feel: 'Primitive and Deadly: the backbeat on 2 and 4, the crash ridden in the heavy sections (record about 73)',
        weight: 0.9,
        params: {
          bpm: [72, 75],
          kit: 'bigrusty',
          swing: 0,
          backbeats: [2, 6],
          fills: [
            // three eighths into the bar line: floor tom, then the snare twice
            [{ t3: '2..', s: '.33' }, 1],
            [{ c: '1.......', k: '1.......', s: '..3...3.' }, 0.6],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
              figures: [[{ r: '1.1.1.1.', s: '..3...3.', k: '1...1...' }, 2]],
            },
          },
          {
            letter: 'B',
            label: 'the heavy section',
            params: {
              figures: [[{ c: '1.1.1.1.', s: '..3...3.', k: '1...1...' }, 1]],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'rooks-across-the-gate',
        title: 'Rooks Across the Gate',
        feel: 'Primitive and Deadly, counted in eighths: the record beats about 48, a crash on its beats, the snare on 2 and 4',
        weight: 0.7,
        params: {
          /* The record's beat is about 48, under the Studio's 50, so it is
             counted in eighths: one bar here is half a bar of the record's,
             at twice the number. The crash on its beats (our 1 and 3), the
             snare on its 2 and 4 (our 3, every bar). */
          bpm: [94, 98],
          kit: 'bigrusty',
          swing: 0,
          targetDensity: 3,
          // nothing between the record's eighths: no kick off our quarters
          noKick: [1, 3, 5, 7],
          figures: [
            [{ c: '1...1...', s: '....3...', k: '1.......' }, 1.6],
            [{ r: '1.1.1.1.', s: '....3...', k: '1.......' }, 1.2],
          ],
          fills: [
            [{ t3: '2...' }, 1],
            [{ c: '1.......', k: '1.......', s: '....3...' }, 0.6],
          ],
        },
      },
      {
        key: 'cats-on-the-briar',
        title: 'Cats on the Briar',
        feel: 'Full Upon Her Burning Lips, the duo: soft and placid, a cross-stick on 3 under the ride (record 65)',
        weight: 1.0,
        params: {
          bpm: [64, 66],
          swing: 0,
          figures: [
            [{ r: '1.1.1.1.', s: '....4...', k: '1.......' }, 2],
            [{ r: '1.1.1.1.', s: '....4...', k: '1......1' }, 1.2],
            // the hats for once, closed
            [{ h: '1.1.1.1.', s: '....4...', k: '1.......' }, 0.8],
          ],
          fills: [
            [{ t3: '2.2.' }, 1],
            [{ c: '1.......', k: '1.......', s: '....4...' }, 0.6],
          ],
        },
      },
    ],
  },
  klek: {
    label: 'Klek de Poitrine',
    drummer: true,
    hint: "The masked drummer of the Quebec duo Angine de Poitrine, under Khn de Poitrine's live loops: one groove held for a long time, built up an element at a time and changed rarely and all at once, on a dry, damped kit kept tight to the loop. Odd meters (7/8, 5/8, 12/8) and the drummer's metric modulation: in Fabienk and Tohogd a 4/4 groove runs across the loop's 7/8 bar lines, and in Sherpa and Sarniezz the pulse moves to a new tempo on a note value both share. Dotted-quarter accents run three against four for a build. No swing, few fills. Each New plays one of twelve songs from Vol. 1, Vol. II and the KEXP set; ten follow human Songsterr tabs read bar by bar, two are reconstructions from tabs a machine began.",
    toms: true,
    // "la batterie au timbre mat" (Vol. 1's notes); "dampened and close-miked" (MusicRadar)
    kit: 'teatowel',
    hats: 8,
    bpm: [94, 182],
    // the record's avoid list: no swing
    swing: 0,
    ghostBias: 0.1,
    ghostHit: 0.3,
    opens: 1,
    openSlots: [14],
    backbeats: [4, 12],
    targetDensity: 11,
    hatDepth: 0.5,
    rimshot: 0.15,
    // tight to the loops: the record's 2 ms of jitter, about 0.015 of a 16th at 130
    feel: { label: 'Locked to the loop', jitter: 0.015 },
    /* The record's rules: long repetition with rare, abrupt changes, and the
       loop built up an element at a time ("l'ajout progressif et calculé
       d'éléments", Vol. 1's notes), so the busier figure goes second. Few
       fills and none inside the phrase: no busy fills during a build. */
    build: true,
    fillChance: 0.4,
    midFills: 0,
    anticipate: 0,
    // the record's polymetric accent cycles for builds
    crossRhythm: 0.25,
    crossRhythms: [
      // Sherpa: kick and snare on every dotted quarter, three bars of three against four
      [{ every: 6, lanes: { s: 3, k: 1 }, bars: 3 }, 1],
      // the record's archetype: a dotted-8th accent across the bar line (not from a tab)
      [{ every: 3, lanes: { s: 3 }, bars: 2 }, 0.5],
    ],
    kick1: [
      ['1000', 3],
      ['1010', 1],
    ],
    kick: [
      ['0000', 1.5],
      ['1010', 1],
      ['1000', 1],
      ['0010', 0.6],
    ],
    /* The 4/4 grooves of Sherpa and Sarniezz, from the human Songsterr tabs.
       See planning/drumming-research.md, section W. */
    figures: [
      // Sherpa: open hats on the beat, the kick on 1, 3 and the "and" of 3
      [{ h: '3...3...3...3...', s: '....2.......2...', k: '1.......1.1.....' }, 1.2],
      // Sherpa: the crash ridden on the beat
      [{ c: '1...1...1...1...', s: '....2.......2...', k: '1.....1...1.....' }, 1.0],
      // Sherpa: closed 8ths, the kick on the "and" of 1
      [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.1.....1.....1.' }, 1.0],
      // Sarniezz after the modulation: the crash on the beat, the hat foot under it
      [
        {
          c: '1...1...1...1...',
          hf: '1...1...1...1...',
          s: '....2.......2...',
          k: '1.1...1...1...1.',
        },
        0.8,
      ],
    ],
    fills: [
      // Sherpa: three on the snare, three on the tom
      [{ s: '2...222.....', t2: '........111.' }, 1.2],
      // a unison stop with the riff: crash, kick and snare on 3 and 4
      [{ c: '1...1...', k: '1...1...', s: '3...3...' }, 1.0],
      // Sarniezz: floor tom, snare and kick in unison 8ths
      [{ t3: '1.1.1.1.', s: '2.2.2.2.', k: '1.1.1.1.' }, 0.8],
    ],
    /* The songs: one New picks one, and the stage names it. Credits from the
       albums' own Bandcamp notes (Klek on drums on both). Tempos from songbpm
       where it lists the song, otherwise from the tabs' own markings. Grooves
       from human Songsterr tabs (each tab's revisions checked: several began as
       a machine import and were rewritten by hand); Ababa Hotel and Utzp come
       from tabs a machine began and one person revised, so they are labelled
       reconstructions. Every groove is an approximation. See
       planning/drumming-research.md, section W. */
    songs: [
      {
        key: 'sherpa',
        title: 'Sherpa',
        feel: 'triplets in 12/8, a four-bar kick cycle under 2 and 4, then dotted quarters for the build (record and tabs 180)',
        weight: 1.2,
        params: {
          bpm: [178, 182],
          crossRhythms: [[{ every: 6, lanes: { s: 3, k: 1 }, bars: 3 }, 1]],
          figures: [
            // the cycle's first two bars, open hats on the beat
            [
              {
                h: '3...3...3...3...3...3...3...3...',
                s: '....2.......2.......2.......2...',
                k: '1.......1.1.....1.....1...1.....',
              },
              1.4,
            ],
            // its last two, the snare doubling at the end
            [
              {
                h: '3...3...3...3...3...3...3...3...',
                s: '....2.......2.......2.......2.2.',
                k: '1.1.....1.....1...1.....1.1.....',
              },
              1.2,
            ],
            // the same kicks with the crash ridden on the beat
            [
              {
                c: '1...1...1...1...1...1...1...1...',
                s: '....2.......2.......2.......2...',
                k: '1.......1.1.....1.....1...1.....',
              },
              1.0,
            ],
            // closed 8ths
            [
              {
                h: '1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.',
                s: '....2.......2.......2.......2...',
                k: '1.......1.1.....1.....1...1.....',
              },
              0.8,
            ],
          ],
          fills: [
            [{ s: '2...222.....', t2: '........111.' }, 1.4],
            [{ c: '1...1...', k: '1...1...', s: '3...3...' }, 1.0],
            // hat, kick and snare together on 2, the "and" of 2, 3 and the "and" of 3
            [{ h: '1.1.1.1.....', k: '1.1.1.1.....', s: '3.3.3.3.....' }, 0.8],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the triplet section, in 12/8',
            aliases: ['sherpa-triplets'],
            params: {
              /* The tab's 120 in triplets is the record's 180 in 12/8: the eighth
                 is the same speed either side of the change, so the section holds
                 the song's tempo and its 24 steps sit where they did. */
              meter: '12/8',
              // the style's 4/4 step lists do not carry into this meter
              backbeats: [4, 10, 16, 22],
              openSlots: [22],
              crossRhythm: 0,
              /* triplet eighths only, the even steps: the kick never on the odd ones,
                 and no ghosts, which the defaults would put there */
              noKick: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
              ghostWeights: {},
              figures: [
                [
                  {
                    h: '1.1.1.1.1.1.1.1.1.1.1.1.',
                    s: '....2.....2.....2.....2.',
                    k: '....1.....1.....1.....1.',
                  },
                  1.4,
                ],
                // the plain bars between: hats on the beat, kick on 1 and 3
                [
                  {
                    h: '1.....1.....1.....1.....',
                    s: '......2...........2.....',
                    k: '1...........1...........',
                  },
                  0.8,
                ],
              ],
              fills: [[{ c: '1.....1.....', k: '1.....1.....', s: '3.....3.....' }, 1]],
            },
          },
          {
            letter: 'B',
            label: 'the kick cycle',
            aliases: ['sherpa'],
            params: { crossRhythm: 0 },
          },
          {
            letter: 'C',
            label: 'the build, in dotted quarters',
            bars: 4,
            // kick and snare on every dotted quarter, three bars of three against four
            params: { crossRhythm: 1 },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B', 'C', 'B'],
      },
      {
        key: 'tohogd',
        title: 'Tohogd',
        feel: 'Vol. 1 in 7/8, built a loop at a time, then a 4/4 groove across the 7/8 bar lines (tab 172)',
        weight: 1.0,
        params: {
          meter: '7/8',
          bpm: [170, 174],
          // the style's 4/4 step lists do not carry into this meter
          backbeats: [8],
          openSlots: [12],
          crossRhythm: 0,
          fills: [[{ h: '..1...1.......', k: '1.1...1.......', s: '....2...222...' }, 1]],
        },
        sections: [
          {
            letter: 'A',
            label: 'the loops',
            params: {
              figures: [
                // loop 2: the kick on 1 and 2, the snare on 3 with the hat open
                [{ h: '1...1...3...1.', s: '........2.....', k: '1...1.........' }, 1],
                // loop 3
                [{ h: '1...1...1.1...', s: '........2.2...', k: '1...1.........' }, 1],
                // loop 4: kick and snare together through the bar
                [{ h: '1...1...3.1.1.', s: '2...2...2.2.2.', k: '1...1...1.1.1.' }, 1.4],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the 4/4 across the 7/8',
            params: {
              figures: [
                // the bass loop in: a 4/4 groove over two bars of 7/8, hats on its quarters
                [
                  {
                    h: '....3...1...1...1...1...1...',
                    s: '....2..2....2.......2..2....',
                    k: '1.1.....1.1...1...1.....1.1.',
                  },
                  1.4,
                ],
                [
                  {
                    h: '1...1...1...1...1...1...1...',
                    s: '2..2....2.......2..2....2..2',
                    k: '....1.1...1...1.....1.1.....',
                  },
                  1.2,
                ],
                // the loops stop: kick and snare alone, the same 4/4 underneath
                [
                  {
                    s: '....2.22....2.......2.22....',
                    k: '1.......1.1...1...1.....1.1.',
                  },
                  0.6,
                ],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'tamebsz',
        title: 'Tamebsz',
        feel: 'hats on the beat, the kick on 1 and the "and" of 2, a snare pickup into the bar (tab 125, the intro only)',
        weight: 0.5,
        params: {
          bpm: [123, 127],
          crossRhythm: 0,
          figures: [
            [{ h: '1...1...1...1...', s: '....2.......2.22', k: '1.....1.1.......' }, 1.2],
            [{ h: '1...1...1...1...', s: '....2.......2...', k: '1.....1.1.....1.' }, 1.0],
          ],
          fills: [[{ s: '2.22', k: '1...' }, 1]],
        },
      },
      {
        key: 'ababa-hotel',
        title: 'Ababa Hotel',
        feel: '7/8: 8ths on the ride, the snare on the third 8th and the "and" of the last two (record 122). A reconstruction',
        weight: 0.6,
        params: {
          meter: '7/8',
          bpm: [120, 124],
          // the style's 4/4 step lists do not carry into this meter
          backbeats: [4, 11, 13],
          openSlots: [12],
          crossRhythm: 0,
          figures: [
            [{ r: '1.1.1.1.1.1.1.', s: '....2......2.2', k: '1.....1.1.....' }, 1.4],
            [{ h: '1.1.1.1.1.1.1.', s: '....2......2.2', k: '1.....1.1.....' }, 0.8],
            [{ h: '3.3.3.3.3.3.3.', s: '....2......2.2', k: '1.....1.1.....' }, 0.8],
            // the kick on a quarter pulse that runs across the 7/8
            [{ h: '3.3.3.3.3.3.3.', s: '..2...2...2...', k: '1...1...1...1.' }, 0.5],
          ],
          fills: [[{ t1: '11....', t2: '..11..', s: '....22' }, 1]],
        },
      },
      {
        key: 'fabienk',
        title: 'Fabienk',
        feel: '7/8 with hat and snare in unison with the riff, a busier 7/8, then four on the floor in 4/4 (record 128)',
        weight: 1.4,
        params: {
          bpm: [126, 130],
          crossRhythm: 0,
        },
        sections: [
          {
            letter: 'A',
            label: 'the first groove, in 7/8',
            params: {
              meter: '7/8',
              // the style's 4/4 step lists do not carry into this meter
              backbeats: [1, 8, 12],
              openSlots: [12],
              figures: [
                // groove 1: hat and snare together, the kick alone on the third 8th
                [{ h: '.1......1.1.1.', s: '.2......2.2.2.', k: '....1.........' }, 1.2],
                [{ h: '.1........1.1.', s: '.2........2.2.', k: '....1.........' }, 0.6],
                // the other tab's groove: the kick on 1 alone
                [{ h: '1...1.1.1..1..', s: '....2.2.2..2..', k: '1.............' }, 0.6],
              ],
              fills: [[{ t1: '......11......', t2: '.........2....', s: '.2.1.3..3..3.3' }, 1]],
            },
          },
          {
            letter: 'B',
            label: 'the busier groove, in 7/8',
            params: {
              meter: '7/8',
              backbeats: [1, 8, 12],
              openSlots: [12],
              figures: [
                // groove 2: the half-open hat on 1 and the third 8th, a ghost before the end
                [{ h: '4.114.111.1.1.', s: '.2..2....1.2.2', k: '1..1....1.1...' }, 1],
              ],
              fills: [[{ t1: '......11......', t2: '.........2....', s: '.2.1.3..3..3.3' }, 1]],
            },
          },
          {
            letter: 'C',
            label: 'the second part, in 4/4',
            aliases: ['fabienk-part-2'],
            params: {
              /* The drums' own 4/4 over the loop's 7/8: three bars of 4/4 and one of
                 2/4 make 14 beats, four bars of the loop. A section has one meter
                 and a figure two bars at most, so the 2/4 bar is not written. */
              figures: [
                // the kick alone while the loop goes down
                [{ k: '1...1...1...1...' }, 0.4],
                // hats on the beat and the backbeat
                [
                  {
                    h: '1...1...1...1...',
                    s: '....2.......2...',
                    k: '1...1...1...1...',
                  },
                  1.0,
                ],
                // 8ths
                [
                  {
                    h: '1.1.1.1.1.1.1.1.',
                    s: '....2.......2...',
                    k: '1...1...1...1...',
                  },
                  1.0,
                ],
                // 16ths, the hat foot closing on the backbeat
                [
                  {
                    h: '1111.1111111.111',
                    hf: '....1.......1...',
                    s: '....2.......2...',
                    k: '1...1...1...1...',
                  },
                  1.2,
                ],
                // the top of the build: the crash on the beat, the kick on 8ths
                [
                  {
                    c: '1...1...1...1...',
                    s: '....2.......2...',
                    k: '1.1.1.1.1.1.1.1.',
                  },
                  0.8,
                ],
              ],
              fills: [
                [{ s: '2.22', k: '1...' }, 1.2],
                [{ c: '1...', k: '1...', s: '3.33' }, 0.8],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B', 'C', 'C'],
      },
      {
        key: 'mata-zyklek',
        title: 'Mata Zyklek',
        feel: '5/8: 8ths on the hats over a kick in pairs, the ride and the hat foot in the pre-chorus (record 94)',
        weight: 1.0,
        params: {
          meter: '5/8',
          bpm: [92, 96],
          // the style's 4/4 step lists do not carry into this meter
          backbeats: [2, 6],
          openSlots: [8],
          crossRhythm: 0,
          fills: [
            [{ s: '.222..', t1: '....11' }, 1.0],
            // floor tom and kick together on the 8ths
            [{ t3: '1.1.1.1.1.', k: '1.1.1.1.1.' }, 0.8],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the pre-chorus',
            params: {
              figures: [
                // the pre-chorus: the ride and the hat foot on the 8ths, a third snare at the end
                [{ r: '..1.1.1.1.', hf: '..1.1.1.1.', s: '..2...2..2', k: '1...11..1.' }, 1.0],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the chorus',
            params: {
              figures: [
                /* The chorus and post-chorus bars, the snare on the second and fourth
                 8ths. The main riff (kicks on six of its ten 16ths, the snare on three
                 more) leaves no air the critic will pass, and is left out. */
                [{ h: '1.1.1.1.1.', hf: '1.1.1.1.1.', s: '..2...2...', k: '1...11.11.' }, 1.2],
                [{ h: '1.1.1..3..', hf: '1.1.1.1.1.', s: '..2...2...', k: '1...11.1.1' }, 0.8],
                [{ h: '..3.3.3.3.', s: '..2...2...', k: '1...11.1.1' }, 1.2],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'sarniezz',
        title: 'Sarniezz',
        feel: '12/8 with the snare on pulses 2 and 4, then the pulse moved from three to two (record 116 to the dotted quarter)',
        weight: 1.2,
        params: {
          bpm: [172, 176],
          crossRhythm: 0,
        },
        sections: [
          {
            letter: 'A',
            label: 'the first part, in 12/8',
            params: {
              meter: '12/8',
              // the style's 4/4 step lists do not carry into this meter
              backbeats: [6, 18],
              openSlots: [22],
              figures: [
                [
                  {
                    h: '2.1.1.2.1.1.2.1.1.2.1.1.',
                    s: '......2...........2.....',
                    k: '1...........1...........',
                  },
                  1.2,
                ],
                [
                  {
                    h: '1.1.1.1.1.1.1.1.1.1.1.1.',
                    s: '......2...........2.....',
                    k: '1.....1.....1.....1.....',
                  },
                  1.2,
                ],
                // hat, kick and snare together: three, three, two and a rest
                [
                  {
                    h: '1.....1.....1...1.......',
                    s: '2.....2.....2...2.......',
                    k: '1.....1.....1...1.......',
                  },
                  0.6,
                ],
              ],
              fills: [
                [{ t3: '1.1.1.1.1.', s: '2.2.2.2.2.', k: '1.1.1.1.1.' }, 1.0],
                [{ c: '1...1.....', k: '1...1.....', s: '3...3.....' }, 0.8],
              ],
            },
          },
          {
            letter: 'B',
            label: 'after the modulation, in 4/4',
            aliases: ['sarniezz-modulation'],
            /* the 8th held and the pulse moved from three to two: 4/4 at 174, the
               crash ridden on the beat */
            params: {
              figures: [
                [{ c: '1...1...1...1...', s: '....2.......2...', k: '1.1...1...1.....' }, 1.2],
                [{ c: '1...1...1...1...', s: '....2.......2...', k: '1.1...1...1...1.' }, 1.0],
                [{ c: '1...1...1...1...', s: '....2..1....2...', k: '1.......1.1...1.' }, 1.0],
                [
                  {
                    c: '1...1...1...1...',
                    hf: '1...1...1...1...',
                    s: '....2.......2...',
                    k: '1.1...1...1...1.',
                  },
                  0.8,
                ],
              ],
              fills: [[{ s: '22..2...', k: '..1...1.' }, 1]],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'utzp',
        title: 'Utzp',
        feel: 'four on the floor, the snare on every "and", the kick in pairs as it builds (tab 129). A reconstruction',
        weight: 0.6,
        params: {
          bpm: [127, 131],
          crossRhythm: 0,
          figures: [
            // the snare alone on the beat while the loop builds
            [{ s: '2...2...2...2...' }, 0.3],
            [{ h: '1.1.1.1.1.1.1.1.', s: '..2...2...2...2.', k: '1...1...1...1...' }, 1.0],
            [{ h: '3.3.3.3.3.3.3.3.', s: '..2...2...2...2.', k: '1...11..11..11..' }, 1.0],
            [{ c: '1.1.1.1.1.1.1.1.', s: '..2...2...2...2.', k: '1...11..11..11..' }, 1.0],
            [{ t3: '1.1.1.1.1.1.1.1.', s: '..2...2...2...2.', k: '11..11..11..11..' }, 0.6],
          ],
          fills: [[{ s: '2.2.2.22', k: '1...1...' }, 1]],
        },
      },
      {
        key: 'yor-zarad',
        title: 'Yor Zarad',
        feel: 'Vol. II in 7/8: 16ths on the hat with the 8ths accented, the snare on four of them (tab 214 to the 8th, so 107)',
        weight: 0.8,
        params: {
          meter: '7/8',
          bpm: [105, 109],
          // the style's 4/4 step lists do not carry into this meter
          backbeats: [2, 6, 10, 13],
          openSlots: [12],
          // the riff's last kick is on 11: one on 12 too runs into the snare on 13
          noKick: [12],
          crossRhythm: 0,
          // the snare falls on hat strokes, so the 16ths are one hand's
          oneHandHats: true,
          figures: [
            // the second of the last two kicks thinned, to leave the critic its air
            [{ h: '.1212121212121', s: '..2...2...2..2', k: '1...11.1.1.1..' }, 1.4],
            // the half-open hat on the 8ths
            [{ h: '4.4.4.4.4.4.4.', s: '..2...2...2..2', k: '1...11.1.1.1..' }, 1.0],
            // the loop alone: the hat and nothing else
            [{ h: '1...1..1.1.1.1' }, 0.3],
          ],
          fills: [
            // the pickup: kick and open hat together, the foot between, the backbeat kept
            [{ h: '3.3.3..', hf: '.1.1.1.', k: '1.1.1..', s: '...2..3' }, 1.0],
            // the tab's fill, off its grid in places, brought onto the 16ths
            [{ s: '2..3', t1: '.1..' }, 0.8],
          ],
        },
      },
    ],
  },
  baker: {
    label: 'Ginger Baker',
    drummer: true,
    hint: "Cream, Blind Faith, Air Force and Fela's Lagos: a jazz drummer, taught by Phil Seamen, who played rock on two bass drums. The toms carry the groove as often as the snare does, the two kicks run ostinatos under tom phrases, and the backbeat may sit on 1 and 3. An open, ringing 1960s Ludwig. Each New plays one of eleven of his songs at its record tempo: Sunshine of Your Love's tom pattern, White Room's 5/4 opening, Crossroads with the floor tom on 1, I Feel Free fast and open, Toad's two-bass-drum triplets and Do What You Like in 5/4. The stage names the song. Ten follow human transcriptions; Toad is a reconstruction.",
    toms: true,
    kit: 'sixties',
    // two bass drums, not a double pedal: the same thing to the generator, the critic and the 3D drummer
    doubleKick: true,
    hats: 8,
    // the 4/4 songs; the hand-hand-foot-foot fill, a run of eight, holds the style itself at 150
    bpm: [72, 150],
    swing: 0,
    swingRange: [0, 8],
    // the record's `avoid`: no ghost-note funk
    ghostBias: 0.1,
    ghostWeights: {},
    opens: 1,
    backbeats: [4, 12],
    targetDensity: 10,
    hatDepth: 0.6,
    rimshot: 0.2,
    flam: 0.15,
    midFills: 0.25,
    // the record's `avoid`: not tight, quantised rock. On top of the beat (the record's estimate) and loose
    feel: {
      label: 'On top, loose',
      k: -0.01,
      s: -0.01,
      t1: -0.01,
      t2: -0.01,
      t3: -0.01,
      jitter: 0.02,
    },
    // the jazz drummer's three against four: a floor-tom accent every dotted eighth, across the bar line
    crossRhythm: 0.2,
    crossRhythms: [[{ every: 6, lanes: { t3: 2 } }, 1]],
    kick1: [
      ['1010', 3],
      ['1000', 2],
      ['1011', 1],
    ],
    kick: [
      ['0000', 2],
      ['0010', 1.5],
      ['1010', 1],
      ['0011', 0.6],
    ],
    /* The record's rules: let the toms carry the groove; the two kicks under
       tom phrases; triplet and 12/8 feels (the songs). Every bar is from one
       of the human transcriptions below. */
    figures: [
      // Sunshine of Your Love: rack and floor tom together on 1 and 3, the kick with the mid tom
      [
        {
          t1: '1.......1.......',
          t2: '....1.1.....1.1.',
          t3: '1.1.....1.1.....',
          k: '....1.1.....1.1.',
        },
        2,
      ],
      // its solo: crash and snare on 1 and 3, the toms on 2 and 4
      [
        {
          c: '1.......1.......',
          s: '2.......2.......',
          t1: '....1.......1...',
          t3: '....1.1.....1.1.',
          k: '1.....1.1.....1.',
        },
        1.2,
      ],
      // Tales of Brave Ulysses: floor tom and both kicks in eighths, the ride on the beat
      [{ r: '....1...1...1...', t3: '1.1.1.1.1.1.1...', k: '1.1.1.1.1.1.1.1.' }, 1.0],
      // Crossroads: the floor tom on 1, the snare on 2, 3 and 4, the foot on the "and"s
      [
        {
          hf: '......1.......1.',
          s: '....2...2...2...',
          t3: '1...............',
          k: '..1...1.......1.',
        },
        1.0,
      ],
      // SWLABR: eighths on the hats, a 16th after the backbeat on 2
      [{ h: '1.1.1.1.1.1.1.1.', s: '....2..2....2...', k: '1.......1.1...1.' }, 0.8],
      // Sunshine's solo: eighths on the two kicks under threes round the toms
      [
        {
          c: '1...............',
          s: '2...............',
          t1: '....111.........',
          t2: '........111.111.',
          k: '1.1.1.1.1.1.1.1.',
        },
        0.8,
      ],
    ],
    fills: [
      // Sunshine and SWLABR: snare, rack, mid, floor, three strokes each
      [
        {
          s: '222.............',
          t1: '....111.........',
          t2: '........111.....',
          t3: '............111.',
        },
        1.4,
      ],
      // Tales of Brave Ulysses: two toms in 16ths, both kicks on the eighths between
      [{ t1: '11.11....', t2: '.....1.1.', k: '.1.1.1.1.' }, 1.2],
      // hand, hand, foot, foot round the toms: what he took from Sam Woodyard
      [{ t1: '2...2...', t3: '.2...2..', k: '..11..11' }, 1.0],
      // Crossroads' ending: rack and mid tom in threes
      [{ t1: '2..2..2.', t2: '.2..2..2' }, 1.0],
    ],
    /* His records: one New picks one, and the stage names it. Credits checked
       on Wikipedia: Cream's and Blind Faith's drums are all his; on Fela's
       Live! he plays three tracks beside Tony Allen. Tempos are the tab's and
       songbpm's, which agree, and each tab's length matches the record at its
       tempo. Ten follow human Songsterr transcriptions (each tab's
       `aiGenerated` flag checked), read bar by bar with the most common bars
       kept; Toad is a reconstruction from his record's ostinato. No
       record of his West African playing has a meter any source gives, so
       his record's Afro 12/8 is not a song. See the Ginger Baker section of
       `.context/app/planning/drumming-research.md`. */
    songs: [
      {
        key: 'sunshine-of-your-love',
        title: 'Sunshine of Your Love',
        feel: 'the toms, not the snare: rack and floor together on 1 and 3, the kick with the mid tom on 2 and 4',
        weight: 1.6,
        params: {
          bpm: [112, 118],
          swing: 0,
          // Songsterr 256 (human), bar by bar
          figures: [
            // the verse, thirty bars of it
            [
              {
                t1: '1.......1.......',
                t2: '....1.1.....1.1.',
                t3: '1.1.....1.1.....',
                k: '....1.1.....1.1.',
              },
              2,
            ],
            // the chorus: crash on 1 and 3, the toms answering the riff
            [
              {
                c: '1.......1.......',
                t1: '............1...',
                t2: '....1.......1...',
                t3: '......1.......1.',
                k: '1.....1.1.....1.',
              },
              1.2,
            ],
            // the solo: crash and snare on 1 and 3
            [
              {
                c: '1.......1.......',
                s: '2.......2.......',
                t1: '....1.......1...',
                t3: '....1.1.....1.1.',
                k: '1.....1.1.....1.',
              },
              1.0,
            ],
            // the last verse: the snare joins the crash on 1 and 3
            [
              {
                c: '1.......1.......',
                s: '2.......2.......',
                t2: '....1.1.....1.1.',
                t3: '..1.......1.....',
                k: '1...1.1.....1.1.',
              },
              0.8,
            ],
          ],
          fills: [
            [
              {
                s: '222.............',
                t1: '....111.........',
                t2: '........111.....',
                t3: '............111.',
              },
              1.4,
            ],
            // the verse's turnaround: down the toms in threes from 2
            [
              {
                t1: '1...111.........',
                t2: '........111.....',
                t3: '1.1.........111.',
              },
              1.0,
            ],
            [{ t1: '11..', t3: '..1.' }, 0.8],
          ],
        },
      },
      {
        key: 'white-room',
        title: 'White Room',
        feel: 'the 5/4 opening: crash and snare on 1, then both floor toms together; then the 4/4 verse',
        weight: 1.3,
        params: {
          bpm: [106, 112],
          swing: 0,
          fills: [
            // the verse's fill: the snare on 2, then rack, mid and floor in threes
            [
              {
                s: '2...........',
                t1: '..111.......',
                t2: '......111...',
                t3: '..........11',
              },
              1.0,
            ],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the 5/4 opening',
            params: {
              meter: '5/4',
              /* Songsterr 4455 (human): the 5/4 bar that opens the record and
                 comes back before the third verse and after it, 23 of its 131
                 bars. Both floor toms (or Baker's timpani) struck together: a
                 triplet on 2, which this grid of sixteenths holds as the nearest
                 steps, 4, 5 and 7; then 3, 4, the "and" of 4 and 5. */
              figures: [
                [
                  {
                    c: '2...................',
                    s: '2...................',
                    t2: '....11.11...1.1.1...',
                    t3: '....11.11...1.1.1...',
                    k: '1...................',
                  },
                  2,
                ],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the verse, in 4/4',
            /* A reconstruction, not from the tab: a plain 2 and 4 on the snare
               under 8ths on the hat, the kick on 1 and the "and" of 2 and 3. */
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 2],
                [{ r: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 1.0],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'crossroads',
        title: 'Crossroads',
        feel: 'live at Winterland, 1968: the floor tom on 1, the snare on 2, 3 and 4, the hat foot on the "and"s',
        weight: 1.2,
        params: {
          bpm: [128, 134],
          swing: 0,
          // Songsterr 242 (human): no cymbal under the verse, only the hat foot
          figures: [
            [
              {
                hf: '......1.......1.',
                s: '....2...2...2...',
                t3: '1...............',
                k: '..1...1.......1.',
              },
              2,
            ],
            // under the solos: the snare pushing the "a" of 2 and the "e" of 3
            [{ hf: '......1...1.....', s: '....2..2.2..2...', k: '1.....1...1.....' }, 1.4],
            // the crash on the "and"s for the third section
            [
              {
                c: '......1.......1.',
                s: '....2...2...2...',
                t3: '1...............',
                k: '..1...1.......1.',
              },
              1.0,
            ],
          ],
          fills: [
            // the last bar: mid and floor tom across the bar
            [
              {
                s: '2.............2.',
                t2: '..1...1.1.1.....',
                t3: '....1.......1...',
                k: '1...............',
              },
              1.0,
            ],
            // rack and mid tom in threes
            [{ t1: '2..2..2.', t2: '.2..2..2' }, 1.2],
          ],
        },
      },
      {
        key: 'i-feel-free',
        title: 'I Feel Free',
        feel: 'fast and open: the hats open on the beat and the "and"s, the kick pushing the "and" of 2',
        weight: 1.0,
        params: {
          bpm: [170, 178],
          swing: 0,
          // Songsterr 4746 (human): the verse is a two-bar phrase, each bar its own figure
          figures: [
            [{ h: '3...3.3.3...3.3.', s: '....2.......2...', k: '1.....1.1.....1.' }, 2],
            [{ h: '..3.3.3.3...3...', s: '....2.......2...', k: '..1...1.1.......' }, 1.6],
            [
              {
                c: '2...............',
                h: '....3.3.3...3.3.',
                s: '....2.......2...',
                k: '1.....1.1.....1.',
              },
              0.8,
            ],
          ],
          // the tab's own fills; no run of four notes, which at this tempo would be too quick to play
          fills: [
            [{ t1: '1.111.11........', t2: '........1.111.1.' }, 1.2],
            [{ t1: '1.1...', t2: '....1.' }, 1.0],
          ],
        },
      },
      {
        key: 'badge',
        title: 'Badge',
        feel: 'plain eighths on the hats for the verse, then the ride and a crash on the "and" of 4 for the bridge',
        weight: 1.0,
        params: {
          bpm: [104, 108],
          swing: 0,
          // Songsterr 4135 (human)
          fills: [
            // mid tom, then the floor tom in threes, a crash on the "and" of 4
            [{ c: '..............1.', t2: '111.............', t3: '....111.111.1...' }, 1.2],
            [{ s: '2.......', t3: '..1.1...', c: '......1.' }, 1.0],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the verse',
            params: {
              figures: [
                [{ h: '1.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.....1.1.......' }, 2],
                [{ r: '1.1.1.1.1.1.1.1.', s: '....2..2....2...', k: '1.......1.......' }, 1.2],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the bridge',
            params: {
              figures: [
                // the bridge: the snare on 2, 3, the "and" of 3 and 4
                [
                  {
                    c: '1.............1.',
                    r: '..1.1.1.1.1.1...',
                    s: '....2...2.2.2...',
                    k: '1.............1.',
                  },
                  1.0,
                ],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'B'],
      },
      {
        key: 'tales-of-brave-ulysses',
        title: 'Tales of Brave Ulysses',
        feel: 'the snare on every beat under accented hats, then the floor tom and both kicks in eighths',
        weight: 1.0,
        params: {
          bpm: [104, 108],
          swing: 0,
          // Songsterr 4922 (human)
          figures: [
            [
              {
                h: '3...2.1.2.1.2.1.',
                hf: '....1...........',
                s: '2...2...2...2...',
                k: '1.......1.1...1.',
              },
              2,
            ],
            [
              {
                c: '1...............',
                h: '....2.1.2.1.2.1.',
                s: '2...2...2...2...',
                k: '1.1...1.1.1...1.',
              },
              1.4,
            ],
            // the middle section: floor tom and both kicks in eighths, the ride on the beat
            [{ r: '....1...1...1...', t3: '1.1.1.1.1.1.1...', k: '1.1.1.1.1.1.1.1.' }, 1.0],
          ],
          fills: [
            [{ t1: '11.11....', t2: '.....1.1.', k: '.1.1.1.1.' }, 1.2],
            [{ t1: '111.....', t2: '....111.', k: '1.1.1.1.' }, 1.0],
          ],
        },
      },
      {
        key: 'swlabr',
        title: 'SWLABR',
        feel: 'eighths on the hats for the verse, crash and snare on every beat for the chorus, a run down the toms',
        weight: 0.9,
        params: {
          bpm: [120, 126],
          swing: 0,
          // Songsterr 4888 (human)
          figures: [
            [{ h: '1.1.1.1.1.1.1.1.', s: '....2..2....2...', k: '1.......1.1...1.' }, 2],
            // the chorus: crash and snare together on the beat, the kick on the "and"s
            [{ c: '1...1...1...1...', s: '2...2...2...2...', k: '..1...1...1...1.' }, 1.2],
            [{ r: '1.1.1.1.1.1.1.1.', s: '....2..2.2..2...', k: '1.1...1.1.1...1.' }, 1.0],
          ],
          fills: [
            /* The intro's run, a bar of 16ths down the kit: the tab starts it
               with four on the snare, which the critic will not pass, so the
               last two of them go to the rack tom. */
            [
              {
                s: '22..............',
                t1: '..111111........',
                t2: '........1111....',
                t3: '............111.',
              },
              1.2,
            ],
            [
              {
                s: '222.............',
                t1: '....111.........',
                t2: '........111.....',
                t3: '............111.',
              },
              1.0,
            ],
          ],
        },
      },
      {
        key: 'strange-brew',
        title: 'Strange Brew',
        feel: 'eighths on the hats, opening on 1, the kick on 3, the "and" of 3 and the "and" of 4',
        weight: 0.9,
        params: {
          bpm: [102, 106],
          swing: 0,
          // Songsterr 4216 (human)
          figures: [
            [{ h: '3.1.1.1.1.1.1.1.', s: '....2.......2...', k: '1.......1.1...1.' }, 2],
            [{ h: '3.1.3.1.3.1.1.1.', s: '....2.......2...', k: '1.......1.1...1.' }, 1.2],
            [{ h: '3.1.1.1.3.1.3.1.', s: '....2.......2...', k: '1.....1.1.1...1.' }, 1.0],
          ],
          fills: [
            // the mid tom in eighths through 3 and 4
            [{ t2: '2.2.2.2.' }, 1.2],
            [
              {
                s: '222.............',
                t1: '....111.........',
                t2: '........111.....',
                t3: '............111.',
              },
              0.8,
            ],
          ],
        },
      },
      {
        key: 'born-under-a-bad-sign',
        title: 'Born Under a Bad Sign',
        feel: 'the ride in eighths with the bell on the "and"s, the snare with the riff, the two kicks doubled on 3 and 4',
        weight: 0.9,
        params: {
          bpm: [90, 94],
          swing: 0,
          // the snare follows the riff: 2, the "a" of 2, the "and" of 3 and the "and" of 4
          backbeats: [4, 10],
          // Songsterr 62912 (human)
          figures: [
            [{ r: '1.2.1.2.1.2.1.2.', s: '....2..2..2...2.', k: '1.......11..11..' }, 2],
            [{ r: '1.2.1.2.1.2.2.2.', s: '....2..2..2...2.', k: '1.......11...1..' }, 1.0],
          ],
        },
      },
      {
        key: 'toad',
        title: 'Toad',
        feel: 'the drum solo: the two kicks in triplets under tom phrases, then rudiments on the snare and jazz time on the ride',
        weight: 1.4,
        params: {
          meter: '4/4-6',
          bpm: [128, 141],
          swing: 0,
          // a dotted eighth here would land on the beat: no cross-rhythm
          crossRhythm: 0,
          // the toms on the last triplet of 1 and 3 carry the backbeat here
          backbeats: [4, 16],
          // eighth-note triplets only, the even steps: the kick never on the odd ones
          noKick: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
          /* A reconstruction: no human transcription of Toad was found (the
             one Songsterr tab has no drum part). The bars follow his record's
             ostinato (the right foot on the beat, the left on the second
             triplet, the toms on the third) and Wikipedia's account of the
             solo: tom phrases, rudimental snare, two-bass-drum ostinatos and
             jazz ride time. In eighth-note triplets, a gap between every
             note. */
          fills: [
            [{ t1: '2.2.........', t2: '....2.2.....', t3: '........2.2.' }, 1.4],
            // hand, hand, foot, foot in triplets
            [{ t1: '2.......2.......', t3: '..2.......2.....', k: '....1.1.....1.1.' }, 1.2],
            [{ s: '3.2.2.......', t3: '......2.2.2.' }, 1.0],
          ],
        },
        sections: [
          {
            letter: 'A',
            label: 'the tom phrases over the two kicks',
            params: {
              figures: [
                [
                  {
                    t1: '....2...........2.......',
                    t3: '..........2...........2.',
                    k: '1.1...1.1...1.1...1.1...',
                  },
                  2,
                ],
                // the tom melody moves: rack, mid, floor, mid
                [
                  {
                    t1: '....2...................',
                    t2: '..........2...........2.',
                    t3: '................2.......',
                    k: '1.1...1.1...1.1...1.1...',
                  },
                  1.4,
                ],
              ],
            },
          },
          {
            letter: 'B',
            label: 'the rudiments',
            params: {
              figures: [
                // snare triplets, accent on the beat, the kick under it
                [{ s: '3.1.2.3.1.2.3.1.2.3.1.2.', k: '1.....1.....1.....1.....' }, 1],
              ],
            },
          },
          {
            letter: 'C',
            label: 'jazz time on the ride',
            params: {
              figures: [
                // the ride's skip beat, the foot back on the hat on 2 and 4
                [
                  {
                    r: '1.....1...1.1.....1...1.',
                    hf: '......1...........1.....',
                    s: '....2...........2.......',
                    k: '1...........1...........',
                  },
                  1,
                ],
              ],
            },
          },
        ],
        arrangement: ['A', 'A', 'B', 'C'],
      },
      {
        key: 'do-what-you-like',
        title: 'Do What You Like',
        feel: 'Blind Faith\'s 5/4 jam: the hat foot on every eighth, the toms answering on the "and" of 2, the "and" of 3, 4 and 5',
        weight: 1.0,
        params: {
          meter: '5/4',
          bpm: [150, 158],
          swing: 0,
          // no snare: the toms carry the 2 and the 4
          backbeats: [6, 12],
          /* Songsterr 3491, the whole Blind Faith album in one human tab; its
             Do What You Like section. The cabasa in 16ths over it is left
             out: no credit says it is Baker's. */
          figures: [
            [
              {
                c: '1...................',
                hf: '1.1.1.1.1.1.1.1.1.1.',
                t2: '......1.....1.......',
                t3: '..........1.....1...',
                k: '1...................',
              },
              2,
            ],
            [
              {
                c: '1...................',
                hf: '1.1.1.1.1.1.1.1.1.1.',
                t1: '......1.............',
                t3: '..........1.1...1...',
                k: '1...................',
              },
              1.2,
            ],
          ],
          // reconstructions, in eighths: the tab writes no fill in this section
          fills: [
            [{ t1: '2.2.....', t2: '....2...', t3: '......2.' }, 1.2],
            [{ t2: '2...2...', t3: '..2...2.', k: '1...1...' }, 1.0],
          ],
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
  ['Rock drummers', ['mitchell', 'bonham', 'ringo', 'copeland', 'baker', 'klek']],
  ['Metal drummers', ['lombardo', 'davies']],
  ['Funk drummers', ['stubblefield', 'jabostarks', 'bernardpurdie']],
  ['Session drummers', ['gadd', 'hakim']],
  ['Jazz drummers', ['tonywilliams', 'yussefdayes', 'elvinjones']],
  ['Latin drummers', ['puente', 'changuito', 'horaciohernandez']],
  ['Afrobeat drummers', ['tonyallen']],
];
