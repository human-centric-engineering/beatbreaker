/**
 * Crocell kit: DrumGizmo's CrocellKit 1.1, the kit of the Danish metal band
 * Crocell, sampled in the studio after they recorded "Relics" (2018). Each
 * stroke is one WAV holding all fifteen mics; a pick names the ones it mixes,
 * by the channel names in the instrument's own file (`drumgizmo.ts`).
 *
 * It is a double-kick kit with two of most cymbals. The kit plays the left
 * kick and the left china and splash. The right china and splash are a pack
 * of their own, `crocell-right`, with no kit row: pieces for building your
 * own kit, since a pack is one slot map and both fill the slots the left ones
 * do. Of its four toms, the two racks and the first floor tom are kept.
 *
 * Its archive is 5.6 GB and zip64 (`zip.ts`).
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';

const OH = { OHLeft: 0.3, OHRight: 0.3, OHCenter: 0.3 };
const AMB = { AmbLeft: 0.1, AmbRight: 0.1 };

const cr = (inst: string, channels: Record<string, number>, layers: number, rr: number): Pick => ({
  source: 'crocell',
  pattern: `CrocellKit/${inst}/samples/*-${inst}.wav`,
  mics: { '': 1 },
  channels: { ...OH, ...AMB, ...channels },
  layers,
  rr,
});

const KICK = { KDrumInside: 1, KDrumOutside: 0.6 };
const SNARE = { SnareTop: 1, SnareBottom: 0.35 };
const HAT = { Hihat: 1 };
const RIDE = { Ride: 1 };
// the crashes, china and splash have no close mic of their own; the overheads are theirs
const CYMBAL = { OHLeft: 0.6, OHRight: 0.6, OHCenter: 0.6 };

export const crocell: Recipe = {
  pack: 'crocell',
  pieces: [
    { role: 'kick', slots: { k: cr('KDrumL', KICK, 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: cr('Snare', SNARE, 4, 3),
        // the rest strokes: the stick played from just above the head
        sGhost: cr('SnareRest', SNARE, 2, 3),
        sCross: cr('SnareRim', SNARE, 3, 2),
        sRim: cr('SnareRimShot', SNARE, 3, 2),
      },
    },
    {
      role: 'hat',
      slots: {
        h: cr('HihatClosed', HAT, 4, 3),
        hOpen: cr('HihatOpen', HAT, 3, 2),
        hFoot: cr('HihatPedal', HAT, 2, 3),
        hHalf: cr('HihatSemiOpen', HAT, 2, 2),
      },
    },
    {
      role: 'ride',
      slots: { r: cr('RideR', RIDE, 3, 3), rBell: cr('RideRBell', RIDE, 1, 3) },
    },
    {
      role: 'crash',
      // one piece, so the second crash, the china and the splash keep their level against the first
      slots: {
        c: cr('CrashL', CYMBAL, 2, 2),
        c2: cr('CrashR', CYMBAL, 2, 1),
        cChina: cr('ChinaL', CYMBAL, 1, 2),
        cSplash: cr('SplashL', CYMBAL, 1, 2),
      },
    },
    { role: 'tom', slots: { t1: cr('Tom1', { Tom1: 1 }, 3, 2) } },
    { role: 'tom', slots: { t2: cr('Tom2', { Tom2: 1 }, 3, 2) } },
    { role: 'tom', slots: { t3: cr('FTom1', { FTom1: 1 }, 3, 2) } },
  ],
};

/** The right-hand china and splash: pieces for the builder, matched on the kit's left crash. */
export const crocellRight: Recipe = {
  pack: 'crocell-right',
  pieces: [
    {
      role: 'crash',
      label: 'Crocell kit · China, right',
      slots: { cChina: cr('ChinaR', CYMBAL, 1, 2) },
      matchOn: cr('CrashL', CYMBAL, 2, 2),
    },
    {
      role: 'crash',
      label: 'Crocell kit · Splash, right',
      slots: { cSplash: cr('SplashR', CYMBAL, 1, 2) },
      matchOn: cr('CrashL', CYMBAL, 2, 2),
    },
  ],
};
