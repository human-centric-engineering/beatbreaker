/**
 * Running a practice session (Phase 7D, task 7D.8).
 *
 * The runner is fed loop boundaries as an engine reports them — audio-clock
 * times, one per loop — so these tests play a session the way the Studio
 * does: a fixed loop length, the downbeat after the count-in, a boundary
 * every loop.
 *
 * @see lib/app/practice/runner.ts
 */

import { describe, expect, it } from 'vitest';

import { slotPlan } from '@/lib/app/practice/climb';
import {
  addMinute,
  boundary,
  downbeat,
  elapsed,
  loaded,
  pause,
  resume,
  type RunnerItem,
  type RunState,
  skip,
  slotSeconds,
  startRun,
  stop,
  worthLogging,
} from '@/lib/app/practice/runner';

const steady = { startPct: 20, climbPct: 50, climbShape: 'steady' as const, climbSteps: 4 };

/** Two one-minute slots: 80 → 100, then 96 → 120. Each climbs for half its time. */
const two: RunnerItem[] = [
  { title: 'Cold Carpet', level: 5, plan: slotPlan(1, 100, steady) },
  { title: 'Funky Drummer', level: 3, plan: slotPlan(1, 120, steady) },
];

/** Start the slot that is loading, with its downbeat at `at`. */
function begin(state: RunState, at: number): RunState {
  return downbeat(loaded(state), at);
}

/** Feed boundaries every `loop` seconds from `from` until `until`, recording the tempo after each. */
function play(state: RunState, items: RunnerItem[], from: number, until: number, loop: number) {
  const tempos: Array<[number, number]> = [];
  let s = state;
  for (let at = from + loop; at <= until + 1e-9; at += loop) {
    s = boundary(s, items, at);
    tempos.push([at, s.bpm]);
    if (s.phase !== 'playing') break;
  }
  return { state: s, tempos };
}

describe('startRun', () => {
  it('loads the first slot at its start tempo', () => {
    const s = startRun(two);
    expect(s).toMatchObject({ phase: 'loading', index: 0, bpm: 80 });
  });

  it('skips a slot whose pattern has gone', () => {
    const s = startRun([{ title: 'Gone', level: 5, plan: null }, ...two]);
    expect(s).toMatchObject({ phase: 'loading', index: 1, bpm: 80 });
  });

  it('is done at once when nothing can be played', () => {
    expect(startRun([{ title: 'Gone', level: 5, plan: null }]).phase).toBe('done');
  });
});

describe('a two-pattern session', () => {
  it('plays each from its start, climbs to the target at the climb share, holds, and moves on', () => {
    let s = begin(startRun(two), 10);
    expect(s.phase).toBe('playing');
    expect(elapsed(s, 10)).toBe(0);

    // 4-second loops: the climb is the first 30s of the minute
    const first = play(s, two, 10, 70, 4);
    const at = (t: number) => first.tempos.find(([time]) => time === t)?.[1];
    expect(at(14)).toBe(Math.round(80 + (4 / 30) * 20));
    expect(at(38)).toBe(Math.round(80 + (28 / 30) * 20));
    expect(at(42)).toBe(100); // 32s in: past the climb, at the target
    expect(at(66)).toBe(100); // held
    // the climb never goes down
    // (the last entry is after the slot ended: the next slot's start tempo)
    const bpms = first.tempos.slice(0, -1).map(([, bpm]) => bpm);
    expect(bpms).toEqual([...bpms].sort((a, b) => a - b));

    // the minute is up at 70: the first boundary at or after it ends the slot
    s = first.state;
    expect(s).toMatchObject({ phase: 'loading', index: 1, bpm: 96 });
    expect(s.played).toEqual([
      {
        index: 0,
        title: 'Cold Carpet',
        level: 5,
        targetBpm: 100,
        reachedBpm: 100,
        seconds: 60,
        ended: 'time',
      },
    ]);

    // the second slot starts from its own start, after its count-in
    s = begin(s, 75);
    const second = play(s, two, 75, 140, 4);
    expect(second.tempos[0][1]).toBeGreaterThan(96);
    expect(second.state.phase).toBe('done');
    expect(second.state.played.map((p) => [p.title, p.reachedBpm, p.ended])).toEqual([
      ['Cold Carpet', 100, 'time'],
      ['Funky Drummer', 120, 'time'],
    ]);
    expect(worthLogging(second.state)).toBe(true);
  });

  it('moves on at the first boundary after the time is up, not before', () => {
    // 7-second loops from 0: 56 is under the minute, 63 is past it
    const s = begin(startRun(two), 0);
    const { tempos, state } = play(s, two, 0, 63, 7);
    expect(tempos.at(-2)?.[0]).toBe(56);
    expect(state.phase).toBe('loading');
    expect(state.played[0].seconds).toBe(63);
  });
});

describe('pause', () => {
  it('stops the clock, and carries on from what was banked after the count-in', () => {
    let s = begin(startRun(two), 0);
    s = boundary(s, two, 12);
    s = pause(s, 15);
    expect(s.phase).toBe('paused');
    expect(elapsed(s, 500)).toBe(15); // time paused does not count

    s = resume(s);
    expect(s.phase).toBe('loading'); // the pattern starts again from its top
    s = begin(s, 600);
    expect(elapsed(s, 610)).toBe(25);
    // the tempo follows the clock, not the wall
    s = boundary(s, two, 610);
    expect(s.bpm).toBe(Math.round(80 + (25 / 30) * 20));
  });

  it('pauses while the pattern is still loading, and waits for Resume', () => {
    const s = pause(startRun(two), 3);
    expect(s.phase).toBe('paused');
    expect(resume(s)).toMatchObject({ phase: 'loading', index: 0 });
  });

  it('pauses in the count-in without starting the clock', () => {
    const s = pause(loaded(startRun(two)), 3);
    expect(s.phase).toBe('paused');
    expect(elapsed(s, 3)).toBe(0);
  });
});

describe('+1 min', () => {
  it('lengthens only this slot, and only its hold', () => {
    let s = begin(startRun(two), 0);
    s = addMinute(s);
    expect(slotSeconds(s, two)).toBe(120);

    // still at the target at 45s — the climb kept its plan
    s = boundary(s, two, 45);
    expect(s.bpm).toBe(100);
    // the old end passes and it plays on
    s = boundary(s, two, 64);
    expect(s.phase).toBe('playing');
    s = boundary(s, two, 121);
    expect(s).toMatchObject({ phase: 'loading', index: 1 });
    expect(s.played[0].seconds).toBe(121);

    // the next slot has its own minute
    expect(slotSeconds(begin(s, 130), two)).toBe(60);
  });
});

describe('skip and stop', () => {
  it('skips to the next slot, keeping what was played', () => {
    let s = begin(startRun(two), 0);
    s = boundary(s, two, 8);
    s = skip(s, two, 9);
    expect(s).toMatchObject({ phase: 'loading', index: 1 });
    expect(s.played).toEqual([
      expect.objectContaining({ title: 'Cold Carpet', seconds: 9, ended: 'skip' }),
    ]);
  });

  it('does not log a slot skipped before its music started', () => {
    const s = skip(loaded(startRun(two)), two, 2);
    expect(s.index).toBe(1);
    expect(s.played).toEqual([]);
  });

  it('is not worth logging when stopped before the first slot finished', () => {
    let s = begin(startRun(two), 0);
    s = stop(s, two, 20);
    expect(s.phase).toBe('done');
    expect(s.played).toEqual([expect.objectContaining({ seconds: 20, ended: 'stop' })]);
    expect(worthLogging(s)).toBe(false);
  });

  it('logs the slots played so far when stopped in a later one', () => {
    let s = begin(startRun(two), 0);
    s = skip(s, two, 30);
    s = begin(s, 35);
    s = stop(s, two, 45);
    expect(s.played.map((p) => [p.title, p.seconds, p.ended])).toEqual([
      ['Cold Carpet', 30, 'skip'],
      ['Funky Drummer', 10, 'stop'],
    ]);
    expect(worthLogging(s)).toBe(true);
  });

  it('ignores a boundary that is not during play', () => {
    const counting = loaded(startRun(two));
    expect(boundary(counting, two, 100)).toBe(counting);
  });
});
