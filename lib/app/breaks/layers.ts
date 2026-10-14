import { LANES, PERC_LANES, TOM_LANES, plainValue } from '@/lib/app/breaks/lanes';
import { POLYRHYTHM_STYLE } from '@/lib/app/breaks/library';
import { M44, groupsOf, isGroupStart } from '@/lib/app/breaks/meter';
import { cloneBar, clonePattern, meterOfPat } from '@/lib/app/breaks/pattern';
import type { Bar, LaneKey, Meter, Pattern, Poly } from '@/lib/app/breaks/types';

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

/** The whole break — where a library entry you have never opened starts. */
export const FULL_LAYER = 5;

export const LAYER_NAMES: Record<number, string> = {
  1: 'Skeleton',
  2: 'Groove',
  3: 'Sixteenths',
  4: 'Ghosted',
  5: 'Full break',
};

/**
 * A polyrhythm's layers (Phase 12, D54): not a groove thinned, but the figure
 * built up a stream at a time, the way it is taught — each stream alone, then
 * both, then the accents, then everything around them.
 */
export const POLY_LAYER_NAMES: Record<number, string> = {
  1: 'Pulse',
  2: 'Cross-rhythm',
  3: 'Together',
  4: 'Accented',
  5: 'Full figure',
};

export const POLY_LAYER_BLURB: Record<number, string> = {
  1: 'the pulse you count, alone',
  2: 'the rhythm set against it, alone',
  3: 'both streams together, evenly — where the accents are not the figure itself',
  4: 'both streams, each with its accents',
  5: 'the whole figure, with everything around the two streams',
};

/**
 * The devices whose accents are the figure: threes of sixteenths are only
 * threes because of where the accent falls, and a 3/4 laid over 4/4 is only
 * 3/4 by its downbeats. Their layers keep the accents from the start; levelled
 * out, there would be nothing to learn.
 */
const ACCENTS_ARE_THE_FIGURE: Poly['device'][] = ['grouping', 'polymeter', 'timeline'];

/** The layer names a pattern in `style` is read with: a polyrhythm's own, or the groove's. */
export function layerNamesFor(style?: string | null): Record<number, string> {
  return style === POLYRHYTHM_STYLE ? POLY_LAYER_NAMES : LAYER_NAMES;
}

/** What each layer adds, for a pattern in `style`. */
export function layerBlurbsFor(style?: string | null): Record<number, string> {
  return style === POLYRHYTHM_STYLE ? POLY_LAYER_BLURB : LAYER_BLURB;
}

/**
 * A layer as a player reads it: by name, not number. A level outside 1–5
 * (an old history row, say) still reads as something. Pass the pattern's
 * style where it is known, so a polyrhythm's layer reads as what it plays.
 */
export function layerName(level: number, style?: string | null): string {
  return layerNamesFor(style)[level] ?? `Layer ${level}`;
}

export const LAYER_BLURB: Record<number, string> = {
  1: 'kick on the beat, backbeat, 8th hats',
  2: 'the kick starts moving, still on 8ths',
  3: 'hats subdivide to 16ths, open hats appear — no ghosts yet',
  4: 'ghost notes, half of them, and the flams, rimshots and other articulations',
  5: "every ghost, the kick's 16ths, ride bell and doubles",
};

/**
 * Layer numbers saved or shared before the split: what was 3 (16ths + ghosts)
 * is now 4, and the full break moved from 4 to 5.
 */
export const LAYER_V1_TO_V2: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 5 };

/** The lanes with values {@link plainValue} reduces. */
const ARTICULATED: LaneKey[] = ['s', 'h', 'c', ...TOM_LANES];

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
    /* Articulations arrive with the ghosts, at L4: below it a rimshot is an
       accent, a flam a hit, a half-open hat a closed one, every cymbal on the
       crash lane the crash. One you pinned keeps what you chose. */
    if (level <= 3) {
      for (const L of ARTICULATED) if (b[L][i] && !keep(L, i)) b[L][i] = plainValue(L, b[L][i]);
    }

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

/** A value at one level: an accent as a hit, an ornament as its plain stroke. */
function evenValue(lane: LaneKey, v: number): number {
  const plain = plainValue(lane, v);
  if (lane === 's') return plain === 3 ? 2 : plain;
  if (lane === 'k' || lane === 'h' || TOM_LANES.includes(lane)) return plain === 2 ? 1 : plain;
  return plain;
}

/**
 * One bar of a polyrhythm at a layer (D54). `first` is the stream you count:
 * the pulse, or the cross-rhythm when you feel it the other way round.
 */
function reducePolyBar(
  bar: Bar,
  level: number,
  first: LaneKey[],
  second: LaneKey[],
  even: boolean,
  pins?: Partial<Record<LaneKey, number[]>>
): Bar {
  const b = cloneBar(bar);
  if (level >= 5) return b;
  const kept = level === 1 ? first : level === 2 ? second : [...first, ...second];
  // a note you placed is kept from the layer you placed it at, as in a groove
  const pinned = (L: LaneKey, i: number) => !!(pins?.[L]?.[i] && level >= pins[L][i]);
  for (const L of LANES) {
    const keep = kept.includes(L);
    b[L] = b[L].map((v, i) =>
      pinned(L, i) ? v : !keep ? 0 : even && level <= 3 ? evenValue(L, v) : v
    );
  }
  return b;
}

/** The two streams in the order they are learnt: the one counted first. */
export function streamsOf(poly: Poly, feelCross = false): [LaneKey[], LaneKey[]] {
  return feelCross ? [poly.cross, poly.pulse] : [poly.pulse, poly.cross];
}

/**
 * The whole break as it looks at one layer. A polyrhythm (Phase 12) is built
 * up a stream at a time; `feelCross` counts its cross-rhythm as the pulse, so
 * layer 1 is the three of a 3:2 rather than the two.
 */
export function reducePattern(pat: Pattern, level: number, feelCross = false): Pattern {
  const p = clonePattern(pat);
  // a rudiment is the same at every layer (D45)
  if (pat.fixed) return p;
  if (pat.poly) {
    const [first, second] = streamsOf(pat.poly, feelCross);
    const even = !ACCENTS_ARE_THE_FIGURE.includes(pat.poly.device);
    p.bars = pat.bars.map((b, i) => reducePolyBar(b, level, first, second, even, pat.pins?.[i]));
    return p;
  }
  const m = meterOfPat(pat);
  p.bars = pat.bars.map((b, i) => reduceBar(b, level, m, pat.hasRide, pat.hasHat, pat.pins?.[i]));
  return p;
}
