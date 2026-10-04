import { LANES } from '@/lib/app/breaks/lanes';
import { type Rng, clamp, makeRng } from '@/lib/app/breaks/rng';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';

/**
 * Humanise (Phase 9, `sound-plan.md` §4) — a drummer's small, unrepeated
 * differences in when each hit lands and how hard, on top of the style's feel.
 *
 * **Pure and seeded.** The same seed gives the same performance, note for
 * note, wherever it is played: the speakers, the MIDI port and the MIDI file
 * each make a {@link Humaniser} from the same seed and draw from it in the
 * same order (`performStep` voices notes lane by lane, step by step), so they
 * agree. Nothing here reads the clock or `Math.random`.
 *
 * **A stream per limb.** The right foot plays the kick; the left foot the
 * hi-hat pedal; the right hand the hats, ride and crash; the left hand the
 * snare, toms and percussion. When the hat and snare land together they spread
 * by a few milliseconds, as two hands do, and the kick does not follow them.
 *
 * **Timing** is `σ_t × (0.7·pink[n] + 0.7·(w[n] − 0.5·w[n−1]))`, scaled so
 * the whole has σ exactly σ_t, and clamped at ±25 ms. The pink term is a slow
 * drift (listeners prefer it to plain noise at the same size); the differenced
 * white term makes each interval correct the one before, as Porcaro's
 * sixteenths do. **Velocity** is `v × (1 + σ_v·pink[n])`, from a pink stream
 * of its own; `performStep` holds the result inside the written value's band.
 */

/** The three positions of the switch. */
export const HUMANISE_MODES = ['off', 'subtle', 'loose'] as const;
export type HumaniseMode = (typeof HUMANISE_MODES)[number];

/** The Amount each position sets. Off is 0, which is the grid. */
export const HUMANISE_AMOUNT: Record<HumaniseMode, number> = { off: 0, subtle: 35, loose: 75 };

/** The setting as it is stored (`StudioSettings.humanise`). */
export interface HumaniseSetting {
  mode: HumaniseMode;
  /** 0–100. Ignored while Off. */
  amount: number;
  /** Which roll of the dice: 🎲 _New take_ counts it up. */
  take: number;
}

/** How much humanising a setting asks for: its Amount, or 0 when it is Off. */
export function humaniseAmount(h: HumaniseSetting): number {
  return h.mode === 'off' ? 0 : h.amount;
}

/** The furthest a note moves off its feel, either way. */
export const MAX_NUDGE_MS = 25;

export type Limb = 'rightFoot' | 'leftFoot' | 'rightHand' | 'leftHand';

const LIMB: Record<LaneKey, Limb> = {
  k: 'rightFoot',
  hf: 'leftFoot',
  h: 'rightHand',
  r: 'rightHand',
  c: 'rightHand',
  s: 'leftHand',
  t1: 'leftHand',
  t2: 'leftHand',
  t3: 'leftHand',
  p1: 'leftHand',
  p2: 'leftHand',
};

export function limbOf(lane: LaneKey): Limb {
  return LIMB[lane];
}

/** The hand that is not this one — where a flam's grace comes from. A foot is its own. */
export function otherHand(limb: Limb): Limb {
  if (limb === 'leftHand') return 'rightHand';
  if (limb === 'rightHand') return 'leftHand';
  return limb;
}

/** σ_t at Amount 100, in ms: hands a little looser than feet. */
const SIGMA_MS: Record<Limb, number> = {
  rightFoot: 8,
  leftFoot: 8,
  rightHand: 10,
  leftHand: 10,
};

/** σ_v at Amount 100, as a fraction of the velocity: cymbals and percussion move more than drums. */
const SIGMA_VEL: Record<LaneKey, number> = {
  k: 0.06,
  s: 0.06,
  t1: 0.06,
  t2: 0.06,
  t3: 0.06,
  h: 0.12,
  hf: 0.12,
  r: 0.12,
  c: 0.12,
  p1: 0.12,
  p2: 0.12,
};

/** One note's difference from the performance as written. */
export interface Nudge {
  /** How far off its feel the note lands, in ms. Negative is early. */
  ms: number;
  /** What its velocity is multiplied by, before the band. */
  gain: number;
}

/** A uniform draw rescaled to mean 0 and variance 1. */
function unit(rng: Rng): number {
  return (rng() * 2 - 1) * Math.sqrt(3);
}

/** Voss–McCartney pink noise: row `k` is redrawn every 2^k notes. */
const PINK_ROWS = 6;

class Pink {
  private readonly rows: number[];
  private n = 0;

  constructor(private readonly rng: Rng) {
    this.rows = Array.from({ length: PINK_ROWS }, () => unit(rng));
  }

  /** The next value, variance 1. */
  next(): number {
    for (let k = 0; k < PINK_ROWS; k++) {
      if (this.n % 2 ** k === 0) this.rows[k] = unit(this.rng);
    }
    this.n++;
    let sum = 0;
    for (const r of this.rows) sum += r;
    return sum / Math.sqrt(PINK_ROWS);
  }
}

/**
 * The pink and differenced-white terms each have variance 1 and 1.25, so
 * `0.7·a + 0.7·b` has σ 1.05. Dividing by it makes σ_t the σ you get.
 */
const TIMING_NORM = Math.sqrt(0.49 * 1 + 0.49 * 1.25);

class LimbStream {
  private readonly timing: Pink;
  private readonly white: Rng;
  private readonly vel: Pink;
  private lastWhite: number;

  constructor(seed: number) {
    this.timing = new Pink(makeRng(mix(seed, 1)));
    this.white = makeRng(mix(seed, 2));
    this.vel = new Pink(makeRng(mix(seed, 3)));
    this.lastWhite = unit(this.white);
  }

  /** The next note's raw timing (σ 1) and velocity (σ 1) draws. */
  next(): { t: number; v: number } {
    const w = unit(this.white);
    const t = (0.7 * this.timing.next() + 0.7 * (w - 0.5 * this.lastWhite)) / TIMING_NORM;
    this.lastWhite = w;
    return { t, v: this.vel.next() };
  }
}

/**
 * One performance's worth of humanising. Make one at Play (or at the start of
 * a file) and ask it for every note in order; `n` counts notes per limb from
 * there, so each pass of a loop differs, but pressing Play again repeats it.
 *
 * The streams advance whatever the Amount, so moving the slider mid-pass
 * changes the size of the differences rather than which ones they are.
 */
export class Humaniser {
  private readonly limbs = new Map<Limb, LimbStream>();

  constructor(readonly seed: number) {}

  /**
   * The next note on `lane`'s limb, at `amount` (0–100). Amount 0 is exactly
   * the grid. `limb` names another limb for a note on that lane played by it —
   * a flam's grace, which is the other hand's: it draws from that limb's
   * stream, and keeps the lane's velocity spread.
   */
  next(lane: LaneKey, amount: number, limb: Limb = limbOf(lane)): Nudge {
    let stream = this.limbs.get(limb);
    if (!stream) {
      stream = new LimbStream(mix(this.seed, LIMB_SALT[limb]));
      this.limbs.set(limb, stream);
    }
    const { t, v } = stream.next();
    const a = clamp(amount, 0, 100) / 100;
    if (a === 0) return { ms: 0, gain: 1 };
    return {
      ms: clamp(SIGMA_MS[limb] * a * t, -MAX_NUDGE_MS, MAX_NUDGE_MS),
      gain: 1 + SIGMA_VEL[lane] * a * v,
    };
  }
}

const LIMB_SALT: Record<Limb, number> = {
  rightFoot: 0x1001,
  leftFoot: 0x2002,
  rightHand: 0x3003,
  leftHand: 0x4004,
};

/** Two numbers into one well-spread 32-bit seed (murmur3's finaliser). */
function mix(a: number, b: number): number {
  let h = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * The seed for a break's performance: its notes and the take.
 *
 * The notes, not the share code or the row id. The code carries the tempo,
 * swing and layer, so moving the tempo would re-roll the performance, and
 * `/p/` and the API have no id. Hash the full sections (not the layer being
 * played) and the Studio, `/p/` and the API play the same performance of the
 * same break. Lanes are read in a fixed order, so it does not matter how a
 * bar's keys were built.
 */
export function humaniseSeed(sections: ReadonlyArray<Pattern | null>, take: number): number {
  let h = 0x811c9dc5; // FNV-1a
  const eat = (n: number): void => {
    h ^= n & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  for (const pat of sections) {
    eat(0xfe);
    for (const bar of pat?.bars ?? []) {
      eat(0xfd);
      for (const lane of LANES) {
        eat(0xfc);
        for (const v of bar[lane] ?? []) eat(v);
      }
    }
  }
  return mix(h >>> 0, take);
}
