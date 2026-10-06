import { makeRng } from '@/lib/app/breaks/rng';
import { lastAtOrBefore, seedOf, smoothstep } from '@/lib/app/breaks/drummer/strokes';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

/**
 * How the kick foot sits on the board for each note (experiment: the drummer
 * view).
 *
 * A bass drum foot is not one motion. A drummer picks the technique by what
 * the notes ask for:
 *
 * - **heel up** — the everyday stroke. The heel is off the board and the leg
 *   lifts from the hip, then drops through the ball of the foot; the heel rises
 *   with every preparation, which is what makes the knee bob.
 * - **heel down** — a soft note on its own. The heel rests on the plate and the
 *   ankle does the work; the leg hardly moves.
 * - **slide** — a fast double. The first note is played low on the board; the
 *   rebound slides the foot up it, and the second note is played from there.
 * - **heel–toe** — a double from a rock of the foot: the heel drops onto the
 *   board, then the toes snap down as the heel comes up.
 * - **swivel** — the heel swings out and back about the ball, a stroke each
 *   way, for doubles and longer runs.
 * - **heel, forefoot, toe** — three quick notes rolled along the foot, the
 *   contact moving up the board on each.
 *
 * Which one a run of notes gets is a seeded choice — seeded from the grid time
 * of its first note, so a frame redrawn or a seek lands on the same choice,
 * but the next pass of the same bar may play it differently. Every note is
 * also nudged a little (where the ball sits, how high the heel is, which way
 * the foot points), so no two strokes are quite the same.
 *
 * Pure: a function of the kick's strokes and the time.
 */

export interface FootStance {
  /** Where the ball of the foot sits along the board: 0 the heel plate, 1 the top. */
  slide: number;
  /** The foot's angle off the board, radians: heel up positive, toe up negative. */
  pitch: number;
  /** How far the heel has swung out round the ball, radians (negative: in). */
  swivel: number;
  /** Pitch added per unit of beater lift: how much the leg lifts into a stroke. */
  drive: number;
}

export type KickTechnique = 'heelUp' | 'heelDown' | 'slide' | 'heelToe' | 'swivel' | 'heelBallToe';

export interface KickNote {
  technique: KickTechnique;
  stance: FootStance;
}

/** Notes closer than this on the grid are one run, played in one motion. */
export const RUN_GAP = 0.2;
/** How often a run of four or more is swivelled through end to end. */
const WHOLE_RUN_SWIVEL = 0.3;
/** A heel-down note wants room either side of it. */
const ISOLATED = 0.35;

/** Where the foot waits with nothing to play: heel just up, ball on the board. */
export const REST_STANCE: FootStance = { slide: 0.63, pitch: 0.16, swivel: 0, drive: 0.3 };

const s = (slide: number, pitch: number, swivel: number, drive: number): FootStance => ({
  slide,
  pitch,
  swivel,
  drive,
});

/** The stance each note of a technique is played from, in order. */
const SHAPES: Record<KickTechnique, FootStance[]> = {
  heelUp: [s(0.66, 0.36, 0, 0.5)],
  // heel on the plate: the ball sits a foot's length up the board
  heelDown: [s(0.607, 0, 0, 0)],
  slide: [s(0.54, 0.26, 0, 0.35), s(0.8, 0.5, 0, 0.15)],
  heelToe: [s(0.78, -0.3, 0, 0), s(0.8, 0.42, 0, 0.1)],
  swivel: [s(0.66, 0.34, -0.22, 0.3), s(0.68, 0.4, 0.28, 0.2)],
  heelBallToe: [s(0.7, -0.28, 0, 0), s(0.7, 0.2, 0, 0.1), s(0.87, 0.55, 0.04, 0.1)],
};

function jitter(stance: FootStance, h: Hit): FootStance {
  const rng = makeRng(seedOf(h) ^ 0x5bd1e995);
  const n = () => rng() * 2 - 1;
  return {
    slide: stance.slide + 0.025 * n(),
    // a heel on the plate stays on it
    pitch: stance.pitch === 0 && stance.drive === 0 ? 0 : stance.pitch + 0.06 * n(),
    swivel: stance.swivel + 0.05 * n(),
    drive: Math.max(0, stance.drive * (1 + 0.25 * n())),
  };
}

/** Split a run into the twos and threes a foot plays it in. */
function chunks(n: number): number[] {
  if (n <= 3) return [n];
  const out: number[] = [];
  let left = n;
  while (left > 0) {
    const take = left === 3 || left === 5 ? 3 : 2;
    out.push(take);
    left -= take;
  }
  return out;
}

/** `i` is the group's first note in `hits`; `r` a seeded roll in [0, 1). */
function techniqueFor(size: number, hits: readonly Hit[], i: number, r: number): KickTechnique {
  if (size === 1) {
    const h = hits[i];
    const before = i > 0 ? h.step - hits[i - 1].step : Infinity;
    const after = i < hits.length - 1 ? hits[i + 1].step - h.step : Infinity;
    const quiet = h.strength < 0.7 && before >= ISOLATED && after >= ISOLATED;
    return quiet && r < 0.35 ? 'heelDown' : 'heelUp';
  }
  if (size === 2) return r < 0.5 ? 'slide' : r < 0.78 ? 'heelToe' : 'swivel';
  return r < 0.6 ? 'heelBallToe' : r < 0.85 ? 'slide' : 'swivel';
}

/** The stance of note `k` of a group of `size` played with `t`. */
function shapeOf(t: KickTechnique, k: number, size: number): FootStance {
  const shape = SHAPES[t];
  if (t === 'swivel') return shape[k % 2];
  if (t === 'slide' && size === 3) {
    // three slid up the board
    return s(0.52 + 0.14 * k, 0.24 + 0.14 * k, 0, 0.3 - 0.08 * k);
  }
  return shape[Math.min(k, shape.length - 1)];
}

/**
 * How each of the kick's notes (in time order) is played.
 *
 * Long runs are taken in twos and threes, each group picking its own
 * technique — or, now and then, swivelled through end to end.
 */
export function kickPlan(hits: readonly Hit[]): KickNote[] {
  const out: KickNote[] = [];
  let i = 0;
  while (i < hits.length) {
    let j = i + 1;
    while (j < hits.length && hits[j].step - hits[j - 1].step <= RUN_GAP) j++;
    const run = hits.slice(i, j);
    const r = makeRng(seedOf(run[0]))();
    if (run.length >= 4 && r < WHOLE_RUN_SWIVEL) {
      run.forEach((h, k) =>
        out.push({ technique: 'swivel', stance: jitter(shapeOf('swivel', k, 2), h) })
      );
    } else {
      let k = 0;
      for (const size of chunks(run.length)) {
        const first = run[k];
        // a chunk after the first rolls its own technique
        const rr =
          k === 0
            ? run.length >= 4
              ? (r - WHOLE_RUN_SWIVEL) / (1 - WHOLE_RUN_SWIVEL)
              : r
            : makeRng(seedOf(first))();
        const technique = techniqueFor(size, hits, i + k, rr);
        for (let m = 0; m < size; m++) {
          const h = run[k + m];
          out.push({ technique, stance: jitter(shapeOf(technique, m, size), h) });
        }
        k += size;
      }
    }
    i = j;
  }
  return out;
}

function mix(a: FootStance, b: FootStance, w: number): FootStance {
  return {
    slide: a.slide + (b.slide - a.slide) * w,
    pitch: a.pitch + (b.pitch - a.pitch) * w,
    swivel: a.swivel + (b.swivel - a.swivel) * w,
    drive: a.drive + (b.drive - a.drive) * w,
  };
}

/**
 * The foot's stance at `now`: the last note's, moving to the next note's in
 * the time between them, so it arrives a moment before the beater lands.
 */
export function kickStanceAt(
  hits: readonly Hit[],
  now: number,
  plan: readonly KickNote[] = kickPlan(hits)
): FootStance {
  const i = lastAtOrBefore(hits, now);
  const prev = i >= 0 ? hits[i] : undefined;
  const next = hits[i + 1];
  const from = prev ? plan[i].stance : REST_STANCE;
  const to = next ? plan[i + 1].stance : REST_STANCE;

  if (prev && next) {
    const gap = next.time - prev.time;
    const end = next.time - Math.min(0.015, gap * 0.15);
    const start = Math.max(prev.time + gap * 0.12, end - 0.3);
    return mix(from, to, smoothstep(start, end, now));
  }
  if (next) return mix(from, to, smoothstep(next.time - 0.4, next.time - 0.03, now));
  if (prev) return mix(from, to, smoothstep(prev.time + 0.2, prev.time + 0.9, now));
  return REST_STANCE;
}
