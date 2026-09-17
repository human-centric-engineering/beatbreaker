import { PERC_LANES, TOM_LANES } from '@/lib/app/breaks/lanes';
import { M44, groupsOf, isGroupStart } from '@/lib/app/breaks/meter';
import { cloneBar, clonePattern, meterOfPat } from '@/lib/app/breaks/pattern';
import type { Bar, LaneKey, Meter, Pattern } from '@/lib/app/breaks/types';

/**
 * Difficulty layers. **Layer 5 is what's stored**; 1–4 are derived views of the
 * same break, which is what lets you drop to L2 and back without losing
 * anything.
 *
 * One new idea per step, and only one. The old L2→L3 step handed a player 16th
 * hats and ghost notes in the same move, which is two different problems — one
 * is what the weak hand is doing between the beats, the other is how hard it
 * hits. Hats subdivide first (L3), ghosts arrive on their own (L4), and the
 * break's own kick syncopations land with the rest at L5.
 */

export const LAYER_NAMES: Record<number, string> = {
  1: 'Skeleton',
  2: 'Groove',
  3: 'Sixteenths',
  4: 'Ghosted',
  5: 'Full break',
};

export const LAYER_BLURB: Record<number, string> = {
  1: 'kick on the beat, backbeat, 8th hats',
  2: 'the kick starts moving, still on 8ths',
  3: 'hats subdivide to 16ths, open hats appear — no ghosts yet',
  4: 'ghost notes, half of them',
  5: "every ghost, the kick's 16ths, ride bell and doubles",
};

/**
 * Layer numbers saved or shared before the split: what was 3 (16ths + ghosts)
 * is now 4, and the full break moved from 4 to 5.
 */
export const LAYER_V1_TO_V2: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 5 };

export function reduceBar(
  bar: Bar,
  level: number,
  m: Meter = M44,
  hasRide = false,
  hasHat = false,
  pins?: Partial<Record<LaneKey, number[]>>
): Bar {
  if (level >= 5) return cloneBar(bar);
  const b = cloneBar(bar);
  const n = b.k.length;

  /** A note is kept once the view reaches the layer it was placed at. */
  const keep = (L: LaneKey, i: number): boolean => {
    const a = pins?.[L];
    return !!(a?.[i] && level >= a[i]);
  };

  const thinRide =
    hasRide && level === 1 && groupsOf(m).every((g) => g.start < n && !!b.r[g.start]);
  const thinHat = hasHat && level === 1 && groupsOf(m).every((g) => g.start < n && !!b.h[g.start]);

  let ghostKeep = 0;
  for (let i = 0; i < n; i++) {
    // snare: ghosts are the whole of layer 4, so nothing below it has them
    if (b.s[i] === 1 && !keep('s', i)) {
      if (level <= 3) b.s[i] = 0;
      else {
        ghostKeep++;
        if (ghostKeep % 2 === 0) b.s[i] = 0;
      }
    }

    // kick: quarters at 1, the 8th grid from 2, its own 16ths only at 5
    if (b.k[i] && !keep('k', i)) {
      if (level === 1 && !isGroupStart(m, i)) b.k[i] = 0;
      else if (level >= 2 && i % 2 !== 0) b.k[i] = 0;
    }

    // toms and percussion are the last thing to arrive
    for (const L of TOM_LANES) if (level <= 3 && !keep(L, i)) b[L][i] = 0;
    for (const L of PERC_LANES) if (level <= 2 && !keep(L, i)) b[L][i] = 0;

    // hats: 8ths and closed below 3, 16ths and opens from 3
    if (b.h[i] && !keep('h', i)) {
      if (thinHat) {
        // a shuffle thinned to eighths is not a simpler shuffle, it is a straight beat
        if (!isGroupStart(m, i)) b.h[i] = 0;
        else if (b.h[i] === 3) b.h[i] = 1;
      } else {
        if (level <= 2) {
          if (i % 2 !== 0) b.h[i] = 0;
          else if (b.h[i] === 3) b.h[i] = 1;
        }
        if (level === 1 && b.h[i] === 3) b.h[i] = 1;
      }
    }

    // ride: 8ths below 3, and the bell is a layer 5 thing
    if (b.r[i] && !keep('r', i)) {
      if (level <= 2 && i % 2 !== 0) b.r[i] = 0;
      /* A written ride pattern is the style. Thinning it to eighths would not
         be a simpler version of a swing ride, it would be a different cymbal
         part — so layer 1 keeps the pulses and everything above it gets the
         pattern whole. Only where the pattern actually lands on every pulse,
         though: a 6/8 bell does not, and reducing that to its two on-pulse
         notes teaches nothing. */
      if (thinRide && !isGroupStart(m, i)) b.r[i] = 0;
      if (b.r[i] === 2) b.r[i] = 1;
    }
  }

  // layer 1 keeps only the plain backbeat
  if (level === 1) {
    for (let i = 0; i < n; i++) if (b.s[i] === 2 && !keep('s', i)) b.s[i] = 3;
  }
  return b;
}

/** The whole break as it looks at one layer. */
export function reducePattern(pat: Pattern, level: number): Pattern {
  const p = clonePattern(pat);
  const m = meterOfPat(pat);
  p.bars = pat.bars.map((b, i) => reduceBar(b, level, m, pat.hasRide, pat.hasHat, pat.pins?.[i]));
  return p;
}
