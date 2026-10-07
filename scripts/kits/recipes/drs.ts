/**
 * DRS kit and DRS brushes: DrumGizmo's DRSKit 2.1, one kit played with
 * sticks and with brushes ("whiskers"). Each stroke is one WAV holding all
 * thirteen mics; a pick names the ones it mixes, by the channel names in the
 * instrument's own file (`drumgizmo.ts`).
 *
 * The brushes kit keeps the stick kit's kick, cross-stick and foot hat, as
 * DrumGizmo's own `whiskers_only` kit does: there is no brushed kick, and a
 * cross-stick is a stick. It has no ride bell, so that falls back to the ride.
 *
 * DRSKit has no rimshot, china or splash, and no brushed half-open hat. The
 * rimshot is its synthesised voice; the china and splash are Salamander's;
 * the brushes kit's half-open hat is the stick kit's, as its foot hat is.
 */

import { drumgizmoPicks } from '@/scripts/kits/drumgizmo';
import type { Recipe } from '@/scripts/kits/recipe';
import { salamanderChina, salamanderSplash } from '@/scripts/kits/recipes/salamander';

const OH = { OHL: 0.4, OHR: 0.4 };
const AMB = { AmbL: 0.15, AmbR: 0.15 };

const drs = drumgizmoPicks('drskit', 'DRSKit', { ...OH, ...AMB });

const KICK = { Kdrum_back: 1, Kdrum_front: 0.6 };
const SNARE = { Snare_top: 1, Snare_bottom: 0.35 };
const HAT = { Hihat: 1 };
const RIDE = { Ride: 1 };
// the crashes have no close mic of their own; the overheads are theirs
const CRASH = { OHL: 0.8, OHR: 0.8 };

const kick = drs('Kdrum_with_contact', KICK, 4, 3);
const snare = drs('Snare', SNARE, 4, 3);
const cross = drs('Snare_rim', SNARE, 3, 2);
const closed = drs('Hihat_closed_shank', HAT, 4, 3);
const foot = drs('Hihat_foot', HAT, 2, 3);
const half = drs('Hihat_semi_open', HAT, 2, 2);

export const drsSticks: Recipe = {
  pack: 'drs',
  pieces: [
    { role: 'kick', slots: { k: kick } },
    {
      role: 'snare',
      slots: {
        s: snare,
        // the rest strokes: the stick played from just above the head
        sGhost: drs('Snare_rest', SNARE, 2, 3),
        sCross: cross,
      },
    },
    {
      role: 'hat',
      slots: {
        h: closed,
        hOpen: drs('Hihat_open', HAT, 3, 2),
        hFoot: foot,
        hHalf: half,
      },
    },
    {
      role: 'ride',
      slots: { r: drs('Ride_tip', RIDE, 3, 3), rBell: drs('Ride_shank_bell', RIDE, 1, 3) },
    },
    {
      role: 'crash',
      slots: {
        c: drs('Crash_left_shank', CRASH, 2, 2),
        c2: drs('Crash_right_shank', CRASH, 2, 1),
      },
    },
    salamanderChina,
    salamanderSplash,
    { role: 'tom', slots: { t1: drs('Tom1', { Tom1: 1 }, 3, 2) } },
    { role: 'tom', slots: { t2: drs('Tom2', { Tom2: 1 }, 3, 2) } },
    { role: 'tom', slots: { t3: drs('Tom3', { Tom3: 1 }, 3, 2) } },
  ],
};

export const drsBrushes: Recipe = {
  pack: 'drs-brush',
  pieces: [
    { role: 'kick', slots: { k: kick } },
    {
      role: 'snare',
      slots: {
        s: drs('Snare_whisker', SNARE, 4, 3),
        // not Snare_circle_whisker: that is a 3.5-second sweep, not a stroke
        sGhost: drs('Snare_whisker', SNARE, 2, 3, [14, 30]),
      },
    },
    // the stick kit's cross-stick and foot hat, at the stick kit's levels:
    // matched with the brushes, they would be turned up with them
    { role: 'snare', slots: { sCross: cross }, matchOn: snare },
    { role: 'hat', slots: { hFoot: foot, hHalf: half }, matchOn: closed },
    {
      role: 'hat',
      slots: {
        // brushed, its strokes are spread wider than 14 dB
        h: drs('Hihat_closed_whisker', HAT, 4, 3, [0, 24]),
        hOpen: drs('Hihat_open_whisker', HAT, 3, 2),
      },
    },
    { role: 'ride', slots: { r: drs('Ride_whisker', RIDE, 3, 3) } },
    {
      role: 'crash',
      slots: {
        c: drs('Crash_left_whisker', CRASH, 2, 2),
        c2: drs('Crash_right_whisker', CRASH, 2, 1),
      },
    },
    salamanderChina,
    salamanderSplash,
    { role: 'tom', slots: { t1: drs('Tom1_whisker', { Tom1: 1 }, 3, 2) } },
    { role: 'tom', slots: { t2: drs('Tom2_whisker', { Tom2: 1 }, 3, 2) } },
    { role: 'tom', slots: { t3: drs('Tom3_whisker', { Tom3: 1 }, 3, 2) } },
  ],
};
