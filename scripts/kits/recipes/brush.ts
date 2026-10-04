/**
 * Brush: Swirly Drums, played with wire brushes. The snare is its top mic
 * alone, as the pack has always been; everything else has one mic. The kick
 * is Swirly's marching kick on its beater mic. The pack's middle tom used to
 * be a copy of the floor tom; it is Swirly's own mid-low tom now.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';

const sw = (pattern: string, layers: number, rr: number, range?: [number, number]): Pick => ({
  source: 'swirly',
  pattern: `Samples/${pattern}.wav`,
  mics: { '': 1 },
  layers,
  rr,
  ...(range ? { range } : {}),
});

export const brush: Recipe = {
  pack: 'brush',
  pieces: [
    { role: 'kick', slots: { k: sw('marching_kick/marching_kick_vl*_rr*_beater', 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: sw('snare_main/snare_hit_vl*_rr*_top', 4, 3),
        sGhost: sw('snare_main/snare_hit_vl*_rr*_top', 2, 3, [14, 40]),
        sCross: sw('snare_edge/snare_edge_vl*_rr*_top', 3, 2),
      },
    },
    {
      role: 'hat',
      slots: {
        h: sw('hat_closed/hh_closed_vl*_rr*', 4, 3),
        hOpen: sw('hat_open/hh_open_vl*_rr*', 3, 2),
        hFoot: sw('hat_foot/hh_foot_vl*_rr*', 2, 3),
      },
    },
    { role: 'ride', slots: { r: sw('ride/ride_vl*_rr*', 3, 3) } },
    { role: 'crash', slots: { c: sw('crash/crash_vl*_rr*', 2, 2) } },
    { role: 'tom', slots: { t1: sw('tom_mhi/tom_mhi_vl*_rr*', 3, 2) } },
    { role: 'tom', slots: { t2: sw('tom_mlow/tom_mlow_vl*_rr*', 3, 2) } },
    { role: 'tom', slots: { t3: sw('tom_floor/tom_floor_vl*_rr*', 3, 2) } },
  ],
};
