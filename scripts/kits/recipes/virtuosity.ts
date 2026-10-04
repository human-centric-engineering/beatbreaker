/**
 * Virtuosity: Virtuosity Drums on its mid ribbon mic, and the shared
 * percussion set, from Virtuosity's percussion and VCSL.
 *
 * The cymbals and kick have named round-robins; the snare and toms are
 * single strokes in fine velocity steps, so neighbouring strokes serve as
 * takes. Virtuosity has two toms. The pack's middle tom used to be a copy of
 * one of them; it is the low tom played half-open now, a real recording.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';

const mid = (
  folder: string,
  name: string,
  layers: number,
  rr: number,
  range?: [number, number]
): Pick => ({
  source: 'virtuosity',
  pattern: `Samples/mid/${folder}/mid_${name}.flac`,
  mics: { '': 1 },
  layers,
  rr,
  ...(range ? { range } : {}),
});

/** A Virtuosity percussion stroke on its mid mic. */
const perc = (folder: string, name: string, rr: number, range?: [number, number]): Pick => ({
  source: 'virtuosity',
  pattern: `Samples/perc/mid/${folder}/${name}_Mid.wav`,
  mics: { '': 1 },
  layers: 1,
  rr,
  ...(range ? { range } : {}),
});

const vcsl = (folder: string, name: string, rr: number, range?: [number, number]): Pick => ({
  source: 'vcsl',
  pattern: `Idiophones/Struck Idiophones/${folder}/${name}.wav`,
  mics: { '': 1 },
  layers: 1,
  rr,
  ...(range ? { range } : {}),
});

/** Where a library's few velocity steps are far apart: down to 24 dB under the loudest. */
const WIDE: [number, number] = [0, 24];

/** A normal stroke a few dB under the accent, from the same strokes. */
const SOFT: [number, number] = [5, 12];

export const virtuosity: Recipe = {
  pack: 'virtuosity',
  pieces: [
    // the cymbals' and kick's four velocity steps are spread wider than 14 dB
    { role: 'kick', slots: { k: mid('kick', 'kick_snon_vl*_rr*', 4, 3, WIDE) } },
    {
      role: 'snare',
      slots: {
        s: mid('snare', 'snare_center_vl*', 4, 3),
        sGhost: mid('snare', 'snare_center_vl*', 2, 3, [14, 30]),
        sCross: mid('snare', 'snare_crossstick_vl*', 3, 2),
      },
    },
    {
      role: 'hat',
      slots: {
        h: mid('hh', 'hh_closed_vl*_rr*', 4, 3, WIDE),
        hOpen: mid('hh', 'hh_open_vl*_rr*', 3, 3, WIDE),
        hFoot: mid('hh', 'hh_pedal_vl*_rr*', 2, 3, WIDE),
      },
    },
    {
      role: 'ride',
      slots: {
        r: mid('ride', 'ride_ride_vl*_rr*', 3, 3, WIDE),
        rBell: mid('ride', 'ride_bell_vl*_rr*', 2, 3, WIDE),
      },
    },
    { role: 'crash', slots: { c: mid('crash', 'crash_crash_vl*_rr*', 2, 3, WIDE) } },
    { role: 'tom', slots: { t1: mid('htom', 'htom_center_vl*', 3, 2) } },
    { role: 'tom', slots: { t2: mid('ltom', 'ltom_halfopen_vl*', 3, 2) } },
    { role: 'tom', slots: { t3: mid('ltom', 'ltom_center_vl*', 3, 2) } },
  ],
  perc: {
    agogo: {
      stroke: perc('agogo', 'Agogo_Low_v*_rr*', 3),
      accent: perc('agogo', 'Agogo_High_v*_rr*', 3),
    },
    // no recording of a cascara in any source; the high bongo is the nearest
    cascara: {
      stroke: perc('bongoh', 'BongoH_Hit1_v*_rr*', 3, SOFT),
      accent: perc('bongoh', 'BongoH_Hit1_v*_rr*', 3),
    },
    clap: { stroke: vcsl('Claps', 'SoloClap_vl*', 2), accent: vcsl('Claps', 'Clap_rr*', 3) },
    clave: {
      stroke: perc('claves', 'Claves1_Hit_v*_rr*', 3, SOFT),
      accent: perc('claves', 'Claves1_Hit_v*_rr*', 3),
    },
    // two drums: the open tone on the 11¾", and the heel-and-muffled slap on the 11"
    conga: {
      stroke: perc('conga', 'Conga_22_HitN_*_rr*', 3),
      accent: perc('conga', 'Conga_17_HitHM1_*_rr*', 3),
    },
    cowbell: {
      stroke: perc('cowbell', 'Cowbell1_Normal_v*_rr*', 3, SOFT),
      accent: perc('cowbell', 'Cowbell1_Normal_v*_rr*', 3),
    },
    shaker: {
      stroke: perc('shaker', 'LShaker_Shake1D_rr*', 3),
      accent: perc('shaker', 'LShaker_Shake1U_rr*', 3),
    },
    tamb: {
      stroke: vcsl('Tambourine 1', 'Tamb1_Hit_v*_rr*', 1, SOFT),
      accent: vcsl('Tambourine 1', 'Tamb1_Hit_v*_rr*', 1),
    },
    wood: {
      stroke: vcsl('Woodblock', 'wood_click_pp_rr*', 2),
      accent: vcsl('Woodblock', 'wood_click_f_rr*', 2),
    },
  },
};
