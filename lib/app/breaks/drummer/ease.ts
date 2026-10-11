/** Easing shared by the stroke planner and the rebound (experiment: the drummer view). */

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 0 at and before `a`, 1 at and after `b`, eased in and out between; a step at `b` if `b <= a`. */
export function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) return x >= b ? 1 : 0;
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}
