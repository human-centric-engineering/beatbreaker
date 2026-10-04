/**
 * Gogodze: Karoryfer's Gogodze Phu Vol II, a damped kit recorded on seven
 * mics, one of them a deliberately poor "retro" mic. This is the source's own
 * lo-fi blend, its "13 mix": the retro mic first, a little of the window mic
 * and the overhead.
 *
 * It has no cymbals at all. The ride, its bell, the crash, the second crash
 * and the china are Big Rusty's close mic, so they are recordings rather than
 * the synthesised voice; the splash is Salamander's. It has no rimshot, which
 * its synthesised voice plays.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';
import { bigRustyCymbals } from '@/scripts/kits/recipes/bigrusty';
import { salamanderSplash } from '@/scripts/kits/recipes/salamander';

const MIX = { retro_mic: 1, wndw_mic: 0.35, oh_mic: 0.25 };

const gz = (art: string, layers: number, rr: number, range?: [number, number]): Pick => ({
  source: 'gogodze',
  // the prefixes are two letters; the underscore keeps `s` from matching `sc`, `se` and `ss`
  pattern: `Samples/{mic}/${art}_*.wav`,
  mics: MIX,
  layers,
  rr,
  ...(range ? { range } : {}),
});

export const gogodze: Recipe = {
  pack: 'gogodze',
  pieces: [
    { role: 'kick', slots: { k: gz('ks', 4, 3) } },
    {
      role: 'snare',
      slots: { s: gz('sc', 4, 3), sGhost: gz('sc', 2, 3, [14, 30]), sCross: gz('ss', 3, 2) },
    },
    {
      role: 'hat',
      slots: {
        // `ht` is the tight hat, on the source's closed-hat key
        h: gz('ht', 4, 3),
        hOpen: gz('ho', 3, 2),
        hFoot: gz('hf', 2, 3),
        // `hh` is the source's half-open, between `hl` (loose) and `ho`
        hHalf: gz('hh', 2, 2),
      },
    },
    {
      role: 'ride',
      label: 'Big Rusty ride, close mic',
      slots: { r: bigRustyCymbals.r, rBell: bigRustyCymbals.rBell },
    },
    {
      role: 'crash',
      label: 'Big Rusty crashes and china, close mic',
      slots: { c: bigRustyCymbals.c, c2: bigRustyCymbals.c2, cChina: bigRustyCymbals.cChina },
    },
    salamanderSplash,
    { role: 'tom', slots: { t1: gz('th', 3, 2) } },
    { role: 'tom', slots: { t2: gz('tm', 3, 2) } },
    { role: 'tom', slots: { t3: gz('tl', 3, 2) } },
  ],
};
