/**
 * Minimal, hand-built `ScheduledStep`s for the 3D drummer's scene tests
 * (`components/app/studio/drummer/**`).
 *
 * The scene code (`kit-model.ts`, `drummer-model.ts`, `drummer-stage.ts`)
 * never looks at a `Bar` or a `ScheduledStep` directly — it only ever sees
 * the `Pose` that `poseAt()` (in `lib/app/breaks/drummer/pose.ts`) derives
 * from a real `StrokeTimeline`. So rather than mock the pose shape (which
 * would only prove the scene code reads the fields we typed in), these
 * fixtures build a bar with exactly one lane lit and feed it through
 * `StrokeTimeline.ingest()` → `poseAt()` for real, the same path the
 * scheduler and `drummer-stage.ts`'s render loop use.
 */

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { meterOf } from '@/lib/app/breaks/meter';
import type { Voice } from '@/lib/app/breaks/perform';
import type { Bar, LaneKey, Meter } from '@/lib/app/breaks/types';
import { LANES } from '@/lib/app/breaks/lanes';

export const M44: Meter = meterOf('4/4');

/** A bar of `len` steps, every lane present and empty — the shape `Bar` requires. */
export function emptyBar(len = 16): Bar {
  const bar = {} as Bar;
  for (const lane of LANES) bar[lane] = new Array(len).fill(0);
  return bar;
}

/** One lane lit at `slot`, the rest of the bar empty. */
export function barWithHit(lane: LaneKey, value: number, slot: number, len = 16): Bar {
  const bar = emptyBar(len);
  bar[lane][slot] = value;
  return bar;
}

/**
 * A `ScheduledStep` whose one note is a real hit: the bar carries the lane
 * value at `slot` (so `assignBar`/sticking actually assigns it a limb), and
 * the note fires at `at` on the audio clock — exactly what
 * `scheduledHits()` (`lib/app/breaks/drummer/timeline.ts`) requires to turn
 * it into a `Hit`.
 */
export function stepWithHit(opts: {
  lane: LaneKey;
  value: number;
  at: number;
  slot?: number;
  dur?: number;
  meter?: Meter;
  len?: number;
  note?: Partial<Voice>;
  next?: Bar | null;
}): ScheduledStep {
  const slot = opts.slot ?? 0;
  const len = opts.len ?? 16;
  const bar = barWithHit(opts.lane, opts.value, slot, len);
  const voice: Voice = {
    lane: opts.lane,
    note: 60,
    velocity: 0.8,
    offset: 0,
    ...opts.note,
  };
  return {
    t: opts.at,
    dur: opts.dur ?? 0.125,
    slot,
    meter: opts.meter ?? M44,
    bar,
    next: opts.next ?? null,
    notes: [{ voice, when: opts.at }],
  };
}

/** A step with no notes at all — the pulse-only shape a count-in or a silent bar sends. */
export function silentStep(opts: {
  at: number;
  slot?: number;
  dur?: number;
  meter?: Meter;
  bar?: Bar | null;
}): ScheduledStep {
  return {
    t: opts.at,
    dur: opts.dur ?? 0.125,
    slot: opts.slot ?? 0,
    meter: opts.meter ?? M44,
    bar: opts.bar ?? emptyBar(),
    next: null,
    notes: [],
  };
}
