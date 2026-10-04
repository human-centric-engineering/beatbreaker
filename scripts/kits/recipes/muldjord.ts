/**
 * Muldjord: MuldjordKit, FreePats' stereo version. A metal and rock kit with
 * two kick drums; this is the left one, which the pack has always used. Its
 * samples are numbered softest to loudest, with no round-robins named, so
 * neighbouring strokes serve as takes — which is how FreePats' own SFZ plays
 * them.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';

const m = (
  folder: string,
  name: string,
  layers: number,
  rr: number,
  range?: [number, number]
): Pick => ({
  source: 'muldjord',
  pattern: `samples/${folder}/*-${name}.flac`,
  mics: { '': 1 },
  layers,
  rr,
  ...(range ? { range } : {}),
});

export const muldjord: Recipe = {
  pack: 'muldjord',
  pieces: [
    { role: 'kick', slots: { k: m('KdrumL', 'KdrumL', 4, 3) } },
    {
      role: 'snare',
      slots: {
        s: m('Snare1', 'Snare', 4, 3),
        // the rest strokes: the snare played from just above the head
        sGhost: m('SnareRest1', 'SnareRest', 2, 3),
      },
    },
    {
      role: 'hat',
      slots: {
        h: m('HihatClosed', 'HihatClosed', 4, 3),
        hOpen: m('HihatOpen', 'HihatOpen', 3, 2),
      },
    },
    {
      role: 'ride',
      slots: {
        r: m('RideL', 'RideL', 3, 2),
        rBell: m('RideLBell', 'RideLBell', 1, 3),
      },
    },
    { role: 'crash', slots: { c: m('CrashL', 'CrashL', 2, 2) } },
    // in the source all along, and never cut until now
    { role: 'tom', slots: { t1: m('Tom1', 'Tom1', 3, 2) } },
    { role: 'tom', slots: { t2: m('Tom2', 'Tom2', 3, 2) } },
    { role: 'tom', slots: { t3: m('Tom3', 'Tom3', 3, 2) } },
  ],
};
