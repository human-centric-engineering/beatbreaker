/**
 * The seeded RNG the generator runs from.
 *
 * Seeded rather than `Math.random()` because a break has to be reproducible:
 * the share code carries a seed, and the same seed with the same parameters has
 * to give back the same break on someone else's machine and on the server.
 */

/** A pure `() => [0, 1)` stream. */
export type Rng = () => number;

/**
 * xorshift32. Small, fast, and — the point here — identical everywhere,
 * unlike `Math.random()`, whose sequence is implementation-defined.
 *
 * Seed 0 would make xorshift degenerate (it is a fixed point), so it falls back
 * to the golden-ratio constant.
 */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0 || 0x9e3779b9;
  return function rng(): number {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Weighted pick from `[value, weight]` pairs.
 *
 * Used everywhere a style expresses a preference rather than a rule — which
 * step a ghost note wants to land on, which of a style's kick cells to write.
 * The variation pass used to draw ghosts *uniformly* out of a style's own
 * weight table, which spread flat again everything the generator had carefully
 * placed; drawing weighted is what sharpens every style with a ghost table.
 */
export function wpick<T>(rng: Rng, pairs: Array<[T, number]>): T {
  let total = 0;
  for (let i = 0; i < pairs.length; i++) total += pairs[i][1];
  let x = rng() * total;
  for (let i = 0; i < pairs.length; i++) {
    x -= pairs[i][1];
    if (x <= 0) return pairs[i][0];
  }
  return pairs[pairs.length - 1][0];
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
