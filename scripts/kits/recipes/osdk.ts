/**
 * The Open Source Drumkit: Real Music Media's kit, recorded at 96 kHz. Each
 * stroke is numbered softest to loudest, with no round-robins named, so
 * neighbouring strokes serve as takes. The snare and the toms have a file per
 * mic, top and under, mixed here; everything else is one stereo file.
 *
 * It has no open hat. Its half-open is the open hat here, and its
 * half-closed the half-open. It has one crash, so no second crash, and no
 * china or splash: those are Salamander's (`salamander.ts`). Its gong is not
 * a slot.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';
import { salamanderChina, salamanderSplash } from '@/scripts/kits/recipes/salamander';

const os = (
  path: string,
  layers: number,
  rr: number,
  mics: Record<string, number> = { '': 1 },
  range?: [number, number],
  exclude?: RegExp
): Pick => ({
  source: 'osdk',
  pattern: `${path}.wav`,
  mics,
  layers,
  rr,
  ...(range ? { range } : {}),
  ...(exclude ? { exclude } : {}),
});

/** The snare's top and bottom files of one stroke; never its butt-end or snares-off strokes. */
const SNARE = { top: 1, bottom: 0.4 };
const SNARE_ONLY = /buttend|off|alt/;
/** A tom's top and under files. */
const TOM = { '': 1, '-under': 0.5 };

export const osdk: Recipe = {
  pack: 'osdk',
  pieces: [
    { role: 'kick', slots: { k: os('kick/kick*', 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: os('snare/snare-{mic}*', 4, 3, SNARE, undefined, SNARE_ONLY),
        // its soft strokes are few, so the range reaches lower than other kits' to give each layer takes
        sGhost: os('snare/snare-{mic}*', 2, 3, SNARE, [12, 40], SNARE_ONLY),
        sCross: os('sidestick/sidestick*', 3, 2, undefined, undefined, /alt/),
        sRim: os('rimshot/rimshot*', 3, 2, undefined, undefined, /alt/),
      },
    },
    {
      role: 'hat',
      slots: {
        h: os('hihat/closed-hihat/chh*', 4, 3),
        hOpen: os('hihat/half-open-hihat/hohh*', 3, 2),
        hFoot: os('hihat/foot-hihat/fhh*', 2, 3),
        hHalf: os('hihat/half-closed-hihat/hchh*', 2, 2),
      },
    },
    {
      role: 'ride',
      slots: {
        r: os('ride/ride-mid-out*', 3, 3, undefined, undefined, /alt/),
        rBell: os('ride/ride-bell*', 1, 3),
      },
    },
    { role: 'crash', slots: { c: os('crash/crash*', 2, 2, undefined, undefined, /bell|edge/) } },
    salamanderChina,
    salamanderSplash,
    { role: 'tom', slots: { t1: os('toms/small-tom{mic}*', 3, 2, TOM) } },
    { role: 'tom', slots: { t2: os('toms/medium-tom{mic}*', 3, 2, TOM) } },
    { role: 'tom', slots: { t3: os('toms/large-tom{mic}*', 3, 2, TOM, undefined, /alt/) } },
  ],
};
