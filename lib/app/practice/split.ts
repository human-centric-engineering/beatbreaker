/**
 * How a practice session's time is shared between its patterns (D31).
 *
 * The session has a total, in whole minutes. By default every pattern gets an
 * equal share. Changing one pattern's minutes **pins** it, and the patterns
 * that are not pinned share what is left equally, so the total always holds.
 * Every pattern gets at least one minute, which is why a session can hold no
 * more patterns than it has minutes.
 *
 * Pure: the editor runs it as you nudge, and the server runs it again on every
 * write, so a client cannot store a split that does not add up.
 */

/** One pattern's slot, as far as the split is concerned. */
export interface SplitSlot {
  minutes: number;
  pinned: boolean;
}

/**
 * Each slot's minutes, in order. Pinned slots keep theirs; the rest share what
 * is left equally, any remainder going one minute each to the first of them.
 *
 * When the pinned slots leave too little for the rest to have a minute each —
 * a pattern added to a session whose pins already fill it, or a total cut
 * below them — pins give way from the **last** one back, each down to a
 * minute, until the rest fit. When every slot is pinned and they do not add up
 * to the total, the last slots absorb the difference the same way.
 *
 * @throws RangeError when there are more slots than minutes — nothing can make
 *   that add up with a minute each.
 */
export function splitMinutes(total: number, slots: readonly SplitSlot[]): number[] {
  const n = slots.length;
  if (n === 0) return [];
  if (!Number.isInteger(total) || total < n) {
    throw new RangeError(`${n} patterns need at least ${n} minutes; the session has ${total}`);
  }

  const minutes = slots.map((s) => (s.pinned ? Math.max(1, Math.floor(s.minutes)) : 0));
  const free = slots.flatMap((s, i) => (s.pinned ? [] : [i]));
  const pinned = slots.flatMap((s, i) => (s.pinned ? [i] : []));

  // what the free slots need, at least: a minute each, or nothing when there are none
  const pinnedBudget = total - free.length;
  let over = minutes.reduce((a, b) => a + b, 0) - pinnedBudget;
  for (let k = pinned.length - 1; k >= 0 && over > 0; k--) {
    const i = pinned[k];
    const give = Math.min(over, minutes[i] - 1);
    minutes[i] -= give;
    over -= give;
  }

  const left = total - minutes.reduce((a, b) => a + b, 0);
  if (free.length === 0) {
    // every slot pinned and short of the total: the last one takes the rest
    if (left > 0) minutes[n - 1] += left;
    return minutes;
  }
  const each = Math.floor(left / free.length);
  const extra = left - each * free.length;
  free.forEach((i, k) => {
    minutes[i] = each + (k < extra ? 1 : 0);
  });
  return minutes;
}

/**
 * The most minutes one slot can be nudged to: the total, less a minute for
 * every other free slot and the minutes of every other pinned one.
 */
export function nudgeCeiling(total: number, slots: readonly SplitSlot[], index: number): number {
  let ceiling = total;
  slots.forEach((s, i) => {
    if (i !== index) ceiling -= s.pinned ? Math.max(1, Math.floor(s.minutes)) : 1;
  });
  return Math.max(1, ceiling);
}

/**
 * Set one slot's minutes and pin it; the free slots re-split around it. The
 * value is held between one minute and {@link nudgeCeiling}, so the nudge
 * never moves another pinned slot. If every other slot is pinned there is
 * nothing to take the difference, and the nudged slot stays at what fits.
 */
export function nudgeMinutes(
  total: number,
  slots: readonly SplitSlot[],
  index: number,
  to: number
): SplitSlot[] {
  if (index < 0 || index >= slots.length) throw new RangeError(`No slot ${index}`);
  const ceiling = nudgeCeiling(total, slots, index);
  const othersFree = slots.some((s, i) => i !== index && !s.pinned);
  const value = othersFree ? Math.min(ceiling, Math.max(1, Math.round(to))) : ceiling;
  const next = slots.map((s, i) => (i === index ? { minutes: value, pinned: true } : { ...s }));
  const split = splitMinutes(total, next);
  return next.map((s, i) => ({ ...s, minutes: split[i] }));
}
