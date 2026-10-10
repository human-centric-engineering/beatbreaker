/**
 * A bar that plays every lane and articulation — crash, ride and its bell,
 * the hat's three contacts, snare plain, rimshot and cross-stick, the toms,
 * both percussion slots and the feet — fed through the real timeline, for
 * tests that sweep `poseAt()` across everything the drummer does.
 */

import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import { RIMSHOT } from '@/lib/app/breaks/lanes';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import type { LaneKey } from '@/lib/app/breaks/types';
import { M44, emptyBar } from '@/tests/helpers/drummer-fixtures';

/** Seconds a step. */
export const SWEEP_DUR = 0.1;

const PLAN: { step: number; lane: LaneKey; value: number }[] = [
  { step: 0, lane: 'c', value: 1 },
  { step: 0, lane: 'k', value: 1 },
  { step: 1, lane: 'r', value: 1 },
  { step: 2, lane: 'r', value: 2 },
  { step: 3, lane: 'h', value: 1 },
  { step: 4, lane: 'h', value: 3 },
  { step: 4, lane: 's', value: 2 },
  { step: 5, lane: 's', value: RIMSHOT },
  { step: 6, lane: 'h', value: 1 },
  { step: 7, lane: 's', value: 4 },
  { step: 8, lane: 't1', value: 1 },
  { step: 9, lane: 't2', value: 1 },
  { step: 10, lane: 't3', value: 1 },
  { step: 11, lane: 'k', value: 1 },
  { step: 12, lane: 'p1', value: 1 },
  { step: 13, lane: 'hf', value: 1 },
  { step: 14, lane: 'p2', value: 1 },
  { step: 15, lane: 'h', value: 2 },
];

/** The bar above, played `bars` times from time 0. */
export function sweepTimeline(bars = 2): StrokeTimeline {
  const bar = emptyBar(16);
  for (const { step, lane, value } of PLAN) bar[lane][step] = value;
  const timeline = new StrokeTimeline();
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < 16; i++) {
      const at = (b * 16 + i) * SWEEP_DUR;
      const step: ScheduledStep = {
        t: at,
        dur: SWEEP_DUR,
        slot: i,
        meter: M44,
        bar,
        next: bar,
        notes: PLAN.filter((p) => p.step === i).map((p) => ({
          voice: { lane: p.lane, note: 60, velocity: 0.9, offset: 0 },
          when: at,
        })),
      };
      timeline.ingest(step);
    }
  }
  return timeline;
}
