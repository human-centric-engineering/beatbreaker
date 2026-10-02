/**
 * Running a practice session (Phase 7D, task 7D.8): a pure state machine.
 *
 * It is fed what the audio engine reports — the downbeat when a slot's
 * music starts (after its count-in) and each loop boundary, both as
 * audio-clock times — and what the drummer presses: _Pause_, _Skip_,
 * _+1 min_ and _Stop_. From those it says which slot is playing, the tempo to
 * set, and when to move on. **Elapsed time comes only from those clock
 * times**, never from a timer, so a busy main thread can make the display
 * late but never the music.
 *
 * - A slot plays from its start tempo, climbs (`tempoAt`) and holds. The
 *   tempo changes only at a loop boundary, which is where the engine reports.
 * - A slot ends at the first boundary after its time is up. The next one is
 *   then loaded and started from its top, with the count-in.
 * - _Pause_ banks the time played; resuming starts the slot's pattern again,
 *   with the count-in, and the clock carries on from what was banked.
 * - _+1 min_ lengthens only this slot's hold: the climb keeps its plan, so the
 *   tempo never steps back.
 * - An item whose pattern is gone (`plan: null`) is skipped.
 *
 * Pure, so the Studio, a test and a native client (D14) run the same session.
 */

import { type SlotPlan, tempoAt } from '@/lib/app/practice/climb';

/** One slot of the session, as the runner needs it. */
export interface RunnerItem {
  title: string;
  level: number;
  /** Null when its pattern was deleted or made private: the slot is skipped. */
  plan: SlotPlan | null;
}

export type RunPhase =
  /** Waiting for the slot's pattern to be put on the stage and started. */
  | 'loading'
  /** Started, in the count-in: the clock has not begun. */
  | 'counting'
  | 'playing'
  | 'paused'
  | 'done';

/** How a slot ended. */
export type SlotEnd = 'time' | 'skip' | 'stop';

/** One slot played, as a run logs it. */
export interface SlotResult {
  index: number;
  title: string;
  level: number;
  targetBpm: number;
  /** The tempo playing when it ended. */
  reachedBpm: number;
  /** Whole seconds played, not counting the count-in or a pause. */
  seconds: number;
  ended: SlotEnd;
}

export interface RunState {
  phase: RunPhase;
  /** The slot playing, or the one being loaded. -1 when there is none. */
  index: number;
  /** The audio-clock time this slot's clock last (re)started; null while it is stopped. */
  since: number | null;
  /** Seconds played in this slot before the last pause. */
  banked: number;
  /** Seconds _+1 min_ has added to this slot. */
  extra: number;
  /** The tempo to play now. */
  bpm: number;
  played: SlotResult[];
}

function nextPlayable(items: readonly RunnerItem[], after: number): number {
  for (let i = after + 1; i < items.length; i++) if (items[i].plan) return i;
  return -1;
}

function enter(items: readonly RunnerItem[], index: number, played: SlotResult[]): RunState {
  const plan = index >= 0 ? items[index].plan : null;
  if (!plan) return { phase: 'done', index: -1, since: null, banked: 0, extra: 0, bpm: 0, played };
  return { phase: 'loading', index, since: null, banked: 0, extra: 0, bpm: plan.startBpm, played };
}

/** A run of these items, at the first one that can be played. */
export function startRun(items: readonly RunnerItem[]): RunState {
  return enter(items, nextPlayable(items, -1), []);
}

/** The slot's pattern is on the stage and the transport started: the count-in. */
export function loaded(state: RunState): RunState {
  return state.phase === 'loading' ? { ...state, phase: 'counting' } : state;
}

/** Bar 1 sounded at `at`: the slot's clock starts (or carries on, after a pause). */
export function downbeat(state: RunState, at: number): RunState {
  return state.phase === 'counting' ? { ...state, phase: 'playing', since: at } : state;
}

/** Seconds played in the current slot, at audio time `at`. */
export function elapsed(state: RunState, at: number): number {
  return state.banked + (state.since === null ? 0 : Math.max(0, at - state.since));
}

/** How long the current slot runs, with any minutes added. */
export function slotSeconds(state: RunState, items: readonly RunnerItem[]): number {
  const plan = state.index >= 0 ? items[state.index]?.plan : null;
  return plan ? plan.seconds + state.extra : 0;
}

function finish(
  state: RunState,
  items: readonly RunnerItem[],
  at: number,
  ended: SlotEnd
): SlotResult[] {
  const item = items[state.index];
  if (!item?.plan) return state.played;
  return [
    ...state.played,
    {
      index: state.index,
      title: item.title,
      level: item.level,
      targetBpm: item.plan.targetBpm,
      reachedBpm: state.bpm,
      seconds: Math.round(elapsed(state, at)),
      ended,
    },
  ];
}

/**
 * A loop came round at `at`. Past the slot's time, the slot ends and the next
 * one loads; otherwise the tempo is wherever the climb has got to.
 */
export function boundary(state: RunState, items: readonly RunnerItem[], at: number): RunState {
  if (state.phase !== 'playing') return state;
  const plan = items[state.index]?.plan;
  if (!plan) return state;
  const t = elapsed(state, at);
  if (t >= plan.seconds + state.extra) {
    return enter(items, nextPlayable(items, state.index), finish(state, items, at, 'time'));
  }
  const bpm = tempoAt(t, plan);
  return bpm === state.bpm ? state : { ...state, bpm };
}

/**
 * _Pause_ at `at`: what was played is banked, and the clock stops. Paused while
 * its pattern is still loading, the slot waits for _Resume_ to start.
 */
export function pause(state: RunState, at: number): RunState {
  if (state.phase === 'playing') {
    return { ...state, phase: 'paused', banked: elapsed(state, at), since: null };
  }
  // still loading or in the count-in: the clock has not started, so nothing to bank
  if (state.phase === 'counting' || state.phase === 'loading') return { ...state, phase: 'paused' };
  return state;
}

/** _Resume_: the slot's pattern starts again from its top, with the count-in. */
export function resume(state: RunState): RunState {
  return state.phase === 'paused' ? { ...state, phase: 'loading' } : state;
}

/**
 * _Skip_ at `at`: this slot ends now, and the next one loads. A slot skipped
 * before its music started is not logged as played.
 */
export function skip(state: RunState, items: readonly RunnerItem[], at: number): RunState {
  if (state.phase === 'done' || state.index < 0) return state;
  const played = elapsed(state, at) > 0 ? finish(state, items, at, 'skip') : state.played;
  return enter(items, nextPlayable(items, state.index), played);
}

/** _+1 min_: this slot holds its target a minute longer. Only this slot. */
export function addMinute(state: RunState): RunState {
  return state.phase === 'done' ? state : { ...state, extra: state.extra + 60 };
}

/** _Stop_ at `at`: the run ends, keeping what was played of this slot. */
export function stop(state: RunState, items: readonly RunnerItem[], at: number): RunState {
  if (state.phase === 'done') return state;
  const played =
    state.index >= 0 && elapsed(state, at) > 0 ? finish(state, items, at, 'stop') : state.played;
  return { phase: 'done', index: -1, since: null, banked: 0, extra: 0, bpm: 0, played };
}

/**
 * Whether a finished run is logged: once any slot has run its course or been
 * skipped after playing. A run stopped before its first slot finished is not.
 */
export function worthLogging(state: RunState): boolean {
  return state.phase === 'done' && state.played.some((s) => s.ended !== 'stop');
}
