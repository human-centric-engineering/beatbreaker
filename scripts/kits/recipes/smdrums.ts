/**
 * SM Drums: Scott McLean's 1960s Ludwig in Oyster Blue Pearl, from the
 * Sforzando set mirrored in git. Only its stereo mixes are there, so every
 * piece is that mix, to mono. The snare is the 1965 5×14 with its ring left
 * on. It has no splash; that is Salamander's (`salamander.ts`).
 *
 * Its folders hold a round-robin each (`RR1`…`RR8`) and number the velocity
 * steps inside them. Where a sound has more than four round-robins, only the
 * first four are measured: three are kept, and each file is a large stereo
 * WAV.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';
import { salamanderSplash } from '@/scripts/kits/recipes/salamander';

const DRUMS = 'Samples/SMDrum Stereo (Samples)';
const CYMBALS = 'Samples/SMD Cymbals Stereo (Samples)';
const FIRST_FOUR = /\/RR[5-8]\//;

const sm = (folder: string, layers: number, rr: number, range?: [number, number]): Pick => ({
  source: 'smdrums',
  pattern: `${folder}/RR*/*.wav`,
  mics: { '': 1 },
  layers,
  rr,
  exclude: FIRST_FOUR,
  ...(range ? { range } : {}),
});

export const smdrums: Recipe = {
  pack: 'smdrums',
  pieces: [
    { role: 'kick', slots: { k: sm(`${DRUMS}/Kik_Stereo`, 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: sm(`${DRUMS}/Snare65_Reg_Stereo`, 4, 3),
        sGhost: sm(`${DRUMS}/Snare65_Reg_Stereo`, 2, 3, [14, 30]),
        sCross: sm(`${DRUMS}/SideStick_Stereo`, 3, 2),
        sRim: sm(`${DRUMS}/RimShot_Stereo`, 3, 2),
      },
    },
    {
      role: 'hat',
      slots: {
        h: sm(`${CYMBALS}/Hi-Hat (Samples)/01 Hat Tight 1`, 4, 3),
        hOpen: sm(`${CYMBALS}/Hi-Hat (Samples)/03 Hat, Open`, 3, 2),
        hFoot: sm(`${CYMBALS}/Hi-Hat (Samples)/05 Hat, Foot`, 2, 3),
        hHalf: sm(`${CYMBALS}/Hi-Hat (Samples)/02 Hat, Loose`, 2, 2),
      },
    },
    {
      role: 'ride',
      slots: {
        r: sm(`${CYMBALS}/Ride (Samples)/Ride 20 (Samples)`, 3, 3),
        rBell: sm(`${CYMBALS}/Ride (Samples)/Ride 20 Bell (Samples)`, 1, 3),
      },
    },
    {
      role: 'crash',
      // one piece, so the second crash and the china keep their level against the first
      slots: {
        c: sm(`${CYMBALS}/Crash (Samples)/Crash 16 (Samples)`, 2, 2),
        c2: sm(`${CYMBALS}/Crash (Samples)/Crash 17 (Samples)`, 2, 1),
        cChina: sm(`${CYMBALS}/Crash (Samples)/China Cymbal (Samples)`, 1, 2),
      },
    },
    salamanderSplash,
    // four toms; the third is left out, so the floor tom is the floor tom
    { role: 'tom', slots: { t1: sm(`${DRUMS}/Toms_Stereo/Tom1`, 3, 2) } },
    { role: 'tom', slots: { t2: sm(`${DRUMS}/Toms_Stereo/Tom2`, 3, 2) } },
    { role: 'tom', slots: { t3: sm(`${DRUMS}/Toms_Stereo/Tom4`, 3, 2) } },
  ],
};
