/**
 * Frankensnare: Karoryfer's collection of snares, 10" to 22". Not a kit. Six
 * of its snares are pieces for building your own kit and for the
 * combinations (9-vi), each in a pack of its own: a pack is one slot map, and
 * all six fill `s`. No kit row names these packs.
 *
 * Every snare has a top, a bottom and an overhead mic, mixed as Big Rusty's
 * snare is: the top first, the bottom under it. The source's own default
 * leans the other way in some programs and not others, so it is not followed.
 * There are no ghost strokes, so a ghost is the hits' soft end, and each
 * snare's sidesticks are in the same folder as its hits.
 *
 * Its tambourine is the shared percussion's (`virtuosity.ts`).
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';

const SNARE = { top: 1, btm: 0.4, oh: 0.5 };

const fs = (
  folder: string,
  stroke: string,
  layers: number,
  rr: number,
  range?: [number, number]
): Pick => ({
  source: 'frankensnare',
  pattern: `Samples/${folder}/{mic}/${stroke}_vl*_rr*.flac`,
  mics: SNARE,
  layers,
  rr,
  ...(range ? { range } : {}),
});

/** One snare as a pack: its hits, their soft end, its sidesticks, and its rimshots where it has them. */
function snare(id: string, label: string, rim?: Pick): Recipe {
  const folder = `${id}_basic`;
  return {
    pack: `frankensnare-${id}`,
    pieces: [
      {
        role: 'snare',
        key: `frankensnare-${id}`,
        label: `Frankensnare ${label}`,
        slots: {
          s: fs(folder, 'sn', 4, 3),
          sGhost: fs(folder, 'sn', 2, 3, [14, 30]),
          sCross: fs(folder, 'ss', 3, 2),
          ...(rim ? { sRim: rim } : {}),
        },
      },
    ],
  };
}

export const frankensnare: Recipe[] = [
  // the guide's "fat pink little piglet": short and thumpy; its rimshots are named `sn`
  snare('13b', '13×9 birch, fat', fs('13b_rimshot', 'sn', 3, 2)),
  snare('14a', '14×8 aluminium', fs('14a_rimshot', 'sr', 3, 2)),
  snare('14p', '14×6.5 maple'),
  snare('14s', '14×8 birch, tuned low'),
  snare('10', '10" popcorn'),
  snare('20m', '20×12 alder, 808-ish'),
];
