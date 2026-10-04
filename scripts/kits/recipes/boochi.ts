/**
 * Dusty sampler and Trap: Boochi44's one-shots, processed from TR-808
 * recordings. Each sound was recorded once, so there is one take of each
 * (`kit-packs.test.ts` exempts them from the two-takes rule); the sampler's
 * per-hit pitch and level wobble is their variation.
 *
 * The kicks and Dusty's ghost snare are the files the packs always used,
 * matched sample for sample. The rest were processed by the prototype in a
 * way that cannot be traced, so they are re-cut from the raw file each kit's
 * description names: a snare with a clap on top, the kit's own hats, and one
 * 808 cymbal doing both ride and crash.
 */

import type { Pick, Recipe } from '@/scripts/kits/recipe';

/** One file, or several layered (a snare and its clap), as a single take. */
const one = (kit: string, files: Record<string, number>, tail?: number): Pick => ({
  source: 'boochi44',
  pattern: `drum-samples/${kit}/{mic}.wav`,
  mics: files,
  layers: 1,
  rr: 1,
  ...(tail ? { tail } : {}),
});

const VINTAGE = '03-soulful-vintage';
const TRAP = '01-hard-trap';

export const vintage: Recipe = {
  pack: 'vintage',
  pieces: [
    { role: 'kick', slots: { k: one(VINTAGE, { 'kicks/vintage-kick-01': 1 }) } },
    {
      role: 'snare',
      slots: {
        s: one(VINTAGE, { 'snares/vintage-snare-01': 1, 'claps/cl-lofi': 0.6 }),
        sGhost: one(VINTAGE, { 'snares/vintage-snare-01': 1 }),
      },
    },
    {
      role: 'hat',
      slots: {
        h: one(VINTAGE, { 'hi-hats/ch-lofi': 1 }),
        hOpen: one(VINTAGE, { 'open-hats/oh00-lofi': 1 }),
      },
    },
    { role: 'ride', slots: { r: one(VINTAGE, { 'fx/cy0000-lofi': 1 }) } },
    { role: 'crash', slots: { c: one(VINTAGE, { 'fx/cy0000-lofi': 1 }) } },
  ],
};

export const trap: Recipe = {
  pack: 'trap',
  pieces: [
    // a long 808: the kick's 1.2 s cap would cut its boom short
    { role: 'kick', slots: { k: one(TRAP, { 'kicks/hard-kick-01': 1 }, 2) } },
    {
      role: 'snare',
      slots: {
        s: one(TRAP, { 'snares/hard-snare-01': 1, 'claps/clap-01': 0.6 }),
        sGhost: one(TRAP, { 'snares/hard-snare-01': 1 }),
      },
    },
    {
      role: 'hat',
      slots: {
        h: one(TRAP, { 'hi-hats/hi-hat-closed-01': 1 }),
        hOpen: one(TRAP, { 'open-hats/open-hat-01': 1 }),
      },
    },
    { role: 'ride', slots: { r: one(TRAP, { 'fx/cy5075': 1 }) } },
    { role: 'crash', slots: { c: one(TRAP, { 'fx/cy5075': 1 }) } },
  ],
};
