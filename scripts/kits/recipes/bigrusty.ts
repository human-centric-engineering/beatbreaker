/**
 * Big Rusty: Karoryfer's Big Rusty Drums, a 1980s Polish kit: a damped 24"
 * kick, a 14×8 wooden snare, a 14" hat, a 22" ride, a 17" crash, a 17"
 * sizzle crash as its second and an 18" china. It has no splash; that is
 * Salamander's (`salamander.ts`). Every
 * piece has its close mic and the overheads, mixed the way the source's own
 * default blend leans; the snare's bottom mic is under its top.
 *
 * Its cymbals are also the Gogodze kit's (`gogodze.ts`), which has none.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';
import { salamanderSplash } from '@/scripts/kits/recipes/salamander';

const br = (
  path: string,
  mics: Record<string, number>,
  layers: number,
  rr: number,
  range?: [number, number]
): Pick => ({
  source: 'bigrusty',
  pattern: `Samples/${path}.flac`,
  mics,
  layers,
  rr,
  ...(range ? { range } : {}),
});

const KICK = { kick: 1, oh: 0.3 };
const SNARE = { top: 1, btm: 0.4, oh: 0.5 };
const TOM = { cl: 1, oh: 0.4 };
const HAT = { cl: 1, oh: 0.4 };
const CYMBAL = { cl: 0.6, oh: 1 };

/** Big Rusty's cymbals on the close mic alone, drier, for a kit that borrows them. */
export const bigRustyCymbals = {
  r: br('ride_22/rd/{mic}/rd_*', { cl: 1 }, 3, 3),
  rBell: br('ride_22/bl/{mic}/rd_bl_*', { cl: 1 }, 1, 3),
  c: br('crash_17/cr/{mic}/cr_*', { cl: 1 }, 2, 2),
  c2: br('crash_sizzle_17/cr/{mic}/crs_*', { cl: 1 }, 2, 1),
  cChina: br('china_18/cn/{mic}/cn_*', { cl: 1 }, 1, 2),
};

export const bigrusty: Recipe = {
  pack: 'bigrusty',
  pieces: [
    { role: 'kick', slots: { k: br('kick_24/kick/{mic}/k_vl*', KICK, 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: br('snare_14/center/{mic}/sn_center_*', SNARE, 4, 3),
        // no rest strokes in this kit: the centre strokes' soft end
        sGhost: br('snare_14/center/{mic}/sn_center_*', SNARE, 2, 3, [14, 30]),
        sCross: br('snare_14/sidestick/{mic}/sn_ss_*', SNARE, 3, 2),
        sRim: br('snare_14/rimshot/{mic}/sn_rims_*', SNARE, 3, 2),
      },
    },
    {
      role: 'hat',
      slots: {
        // `tc` is the tight hat, the pedal down hard: what a closed hat on the grid wants
        h: br('hihat_14/tc/{mic}/ht_tc_*', HAT, 4, 3),
        hOpen: br('hihat_14/open/{mic}/ht_open_*', HAT, 3, 2),
        hFoot: br('hihat_14/chik/{mic}/ht_chik_*', HAT, 2, 3),
        // `ho` is the source's half-open; `qo`, a quarter, is too near closed
        hHalf: br('hihat_14/ho/{mic}/ht_ho_*', HAT, 2, 2),
      },
    },
    {
      role: 'ride',
      slots: {
        r: br('ride_22/rd/{mic}/rd_*', CYMBAL, 3, 3),
        rBell: br('ride_22/bl/{mic}/rd_bl_*', CYMBAL, 1, 3),
      },
    },
    {
      role: 'crash',
      // one piece, so the second crash and the china keep their level against the first
      slots: {
        c: br('crash_17/cr/{mic}/cr_*', CYMBAL, 2, 2),
        c2: br('crash_sizzle_17/cr/{mic}/crs_*', CYMBAL, 2, 1),
        cChina: br('china_18/cn/{mic}/cn_*', CYMBAL, 1, 2),
      },
    },
    salamanderSplash,
    // the source's basic program plays the 14", 15" and 18"; the 22" is lower still
    { role: 'tom', slots: { t1: br('tom_14/center/{mic}/t14_*', TOM, 3, 2) } },
    { role: 'tom', slots: { t2: br('tom_15/center/{mic}/t15_*', TOM, 3, 2) } },
    { role: 'tom', slots: { t3: br('tom_18/center/{mic}/t18_*', TOM, 3, 2) } },
  ],
};
