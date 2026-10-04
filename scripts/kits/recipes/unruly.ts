/**
 * Unruly: Karoryfer's Unruly Drums, where every drum has snare wires on it,
 * the 20" kick included. It has no toms: like the source's own keymap, the
 * 13", 14" and 22" snares are played as toms, wires off. The kick is the
 * clean one; the source also has it with the wires buzzing. Its one crash is
 * a 16"; the second crash, the china and the splash are Salamander's.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';
import {
  salamanderChina,
  salamanderCrash,
  salamanderSplash,
} from '@/scripts/kits/recipes/salamander';

const un = (
  path: string,
  mics: Record<string, number>,
  layers: number,
  rr: number,
  range?: [number, number]
): Pick => ({
  source: 'unruly',
  // the take is in the folder and the name, and they always agree
  pattern: `Samples/${path}.flac`,
  mics,
  layers,
  rr,
  ...(range ? { range } : {}),
});

const KICK = { in: 1, out: 0.5, oh: 0.3 };
const SNARE = { top: 1, btm: 0.4, ohl: 0.3, ohr: 0.3 };
// played as toms, the snares have no bottom mic
const TOM = { top: 1, ohl: 0.25, ohr: 0.25 };
const HAT = { cl: 1, ohl: 0.2, ohr: 0.2 };
const CYMBAL = { cl: 0.6, oh: 1 };

const s14 = (art: string): string => `s14/{mic}/rr*/s14_${art}_vl*_rr*`;

export const unruly: Recipe = {
  pack: 'unruly',
  pieces: [
    { role: 'kick', slots: { k: un('k20/{mic}/rr*/kick_clean_vl*_rr*', KICK, 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: un(s14('center'), SNARE, 4, 3),
        // too few centre strokes lie 14 dB down for two layers of three; from 10 dB, enough do
        sGhost: un(s14('center'), SNARE, 2, 3, [10, 30]),
        sCross: un(s14('sstick'), SNARE, 3, 2),
        sRim: un(s14('rimshot'), SNARE, 3, 2),
      },
    },
    {
      role: 'hat',
      slots: {
        h: un('h14/{mic}/rr*/hh_tight_tip_vl*_rr*', HAT, 4, 3),
        hOpen: un('h14/{mic}/rr*/hh_open_tip_vl*_rr*', HAT, 3, 2),
        hFoot: un('h14/{mic}/rr*/hh_footchik_vl*_rr*', HAT, 2, 3),
        // the third of the source's six openings: tight, closed, quarter, half, loose, open
        hHalf: un('h14/{mic}/rr*/hh_half_tip_vl*_rr*', HAT, 2, 2),
      },
    },
    {
      role: 'ride',
      slots: {
        r: un('r20/{mic}/rr*/ride_bow_vl*_rr*', CYMBAL, 3, 3),
        rBell: un('r20/{mic}/rr*/ride_bell_vl*_rr*', CYMBAL, 1, 3),
      },
    },
    { role: 'crash', slots: { c: un('c16/{mic}/rr*/cr_edge_vl*_rr*', CYMBAL, 2, 2) } },
    salamanderCrash,
    salamanderChina,
    salamanderSplash,
    { role: 'tom', slots: { t1: un('s13/{mic}/rr*/s13_tom_clean_vl*_rr*', TOM, 3, 2) } },
    { role: 'tom', slots: { t2: un('s14/{mic}/rr*/s14_tom_clean_vl*_rr*', TOM, 3, 2) } },
    { role: 'tom', slots: { t3: un('s22/{mic}/rr*/s22_tom_clean_vl*_rr*', TOM, 3, 2) } },
  ],
};
