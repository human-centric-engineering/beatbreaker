'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BreakConsole, PracticePlace } from '@/components/app/breaks/use-break-console';
import type { Say } from '@/components/app/studio/use-notice';
import type { OpenResult } from '@/components/app/studio/use-practice-history';
import { APIClientError, apiClient } from '@/lib/api/client';
import { effectiveClimb, slotPlan } from '@/lib/app/practice/climb';
import {
  addMinute as addMinuteTo,
  boundary,
  downbeat,
  loaded,
  pause as pauseRun,
  resume as resumeRun,
  type RunnerItem,
  type RunState,
  type SlotResult,
  skip as skipRun,
  startRun,
  stop as stopRun,
  worthLogging,
} from '@/lib/app/practice/runner';
import { logger } from '@/lib/logging';
import type { PinTarget } from '@/lib/validations/pins';
import type { SessionView } from '@/lib/validations/practice-sessions';

/**
 * A practice session running in the Studio (Phase 7D, tasks 7D.9–7D.10).
 *
 * The runner (`lib/app/practice/runner.ts`) decides; this hook does what it
 * says. It puts each slot's pattern on the stage through the provider's
 * `openTarget` — the same in-place open a shelf uses, so a session runs in
 * one page — at the item's layer and start tempo, starts the transport (with
 * the count-in that already exists), and feeds the runner the transport's
 * downbeats and loop boundaries, which are audio-clock times. While it runs,
 * the trainer's ramp and _match tempo_ are held off (`sessionHold`) and both
 * come back as they were when it ends.
 *
 * At the end of each slot it offers to record the tempo reached as a speed
 * (7C), unless the stage held a famous break you had edited or a variation
 * you had not saved: a speed there would not be a speed on the pattern the
 * session names. When the run ends, however it ends, it is posted once — if a
 * slot ran its course or was skipped after playing.
 */

/** The end-of-slot offer: "Played it well at 112? Record it". */
export interface SlotPrompt {
  result: SlotResult;
  target: PinTarget;
}

export interface SessionRun {
  session: SessionView;
  /** Null until _Start_. */
  run: RunState | null;
  items: RunnerItem[];
  /** The audio clock, refreshed a few times a second for the time shown. */
  now: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  addMinute: () => void;
  stop: () => void;
  prompt: SlotPrompt | null;
  record: () => Promise<void>;
  dismissPrompt: () => void;
}

function targetOf(item: SessionView['items'][number]): PinTarget | null {
  if (!item.target) return null;
  return item.target.kind === 'break'
    ? { breakId: item.target.id }
    : { libraryEntryId: item.target.id };
}

/** How often the time shown is refreshed. Display only: the music never reads it. */
const DISPLAY_MS = 250;

export function useSessionRun({
  session,
  console: c,
  openTarget,
  stageUnrecordable,
  stageWillPrompt,
  say,
}: {
  session: SessionView | undefined;
  console: BreakConsole;
  openTarget: (target: PinTarget, at?: PracticePlace) => Promise<OpenResult>;
  /** The stage holds an edited famous break, or a variation not yet saved. */
  stageUnrecordable: boolean;
  /**
   * Putting another pattern on the stage would ask "Save your changes?"
   * first — the swap then waits on the answer, so the slot must too.
   */
  stageWillPrompt: boolean;
  say: Say;
}): SessionRun | null {
  const items = useMemo<RunnerItem[]>(
    () =>
      session
        ? session.items.map((item) => ({
            title: item.title,
            level: item.level,
            plan:
              item.target && item.targetBpm !== null
                ? slotPlan(item.minutes, item.targetBpm, effectiveClimb(session, item))
                : null,
          }))
        : [],
    [session]
  );
  const targets = useMemo(() => (session?.items ?? []).map(targetOf), [session]);

  const [run, setRun] = useState<RunState | null>(null);
  const [now, setNow] = useState(0);
  const [prompt, setPrompt] = useState<SlotPrompt | null>(null);
  const startedAt = useRef<Date | null>(null);
  /** The slot whose pattern is on the stage, so a resume does not open it again. */
  const onStage = useRef(-1);
  const posted = useRef(false);
  const itemsRef = useRef(items);
  /** The run as last rendered — for the effects below that act on it, and the unmount. */
  const runRef = useRef(run);
  const willPrompt = useRef(stageWillPrompt);
  /** The open still on its way, so the next slot's waits for it rather than landing under it. */
  const inFlight = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    itemsRef.current = items;
    runRef.current = run;
    willPrompt.current = stageWillPrompt;
  });

  const {
    play,
    stopPlaying,
    primeAudio,
    playAt,
    audioNow,
    setClockListener,
    setSessionHold,
    setLevel,
  } = c;

  /* The transport's clock, into the runner. */
  useEffect(() => {
    if (!run || run.phase === 'done') return;
    setClockListener({
      onLoop: (at) => setRun((s) => (s ? boundary(s, itemsRef.current, at) : s)),
      onDownbeat: (at) => setRun((s) => (s ? downbeat(s, at) : s)),
    });
    return () => setClockListener(null);
  }, [run, setClockListener]);

  /* The tempo the runner wants, at each boundary. */
  const playing = run?.phase === 'playing';
  const bpm = run?.bpm ?? 0;
  useEffect(() => {
    if (playing && bpm) playAt(bpm);
  }, [playing, bpm, playAt]);

  /* A slot that ran its course: offer to record it, while its pattern is
     still the one on the stage — this runs before the next one is opened. */
  const playedCount = run?.played.length ?? 0;
  const lastPlayed = run?.played.at(-1);
  const shownFor = useRef(0);
  useEffect(() => {
    if (playedCount <= shownFor.current) return;
    shownFor.current = playedCount;
    if (!lastPlayed || lastPlayed.ended === 'stop' || lastPlayed.seconds === 0) return;
    const target = targets[lastPlayed.index];
    if (!target || stageUnrecordable) {
      setPrompt(null);
      return;
    }
    setPrompt({ result: lastPlayed, target });
  }, [playedCount, lastPlayed, targets, stageUnrecordable]);

  /* A slot to load: open its pattern (unless it is already up — a resume),
     put it at the item's layer and start tempo, and start the transport once
     the stage has rendered it. */
  const loadingIndex = run?.phase === 'loading' ? run.index : -1;
  const startBpm = run?.phase === 'loading' ? run.bpm : 0;
  const [readyToPlay, setReadyToPlay] = useState(-1);
  useEffect(() => {
    if (loadingIndex < 0) return;
    let live = true;
    const index = loadingIndex;
    const item = itemsRef.current[index];
    const target = targets[index];
    void (async () => {
      /* An open that is still landing — a slot skipped while its pattern
         loaded — would put that pattern over this one. Wait for it. */
      await inFlight.current;
      if (!live) return;
      // a resumed slot starts again from its top, with its count-in
      stopPlaying();
      if (onStage.current !== index) {
        const opening = target
          ? openTarget(target, { level: item.level, bpm: startBpm })
          : Promise.resolve<OpenResult>('gone');
        inFlight.current = opening.catch(() => undefined);
        const result = await opening;
        if (!live) return;
        if (result !== 'opened') {
          say(`“${item.title}” would not open — skipped`, { error: true });
          setRun((s) => (s ? skipRun(s, itemsRef.current, audioNow()) : s));
          return;
        }
        /* The swap is waiting on "Save your changes?": the old pattern is
           still on the stage, so the slot waits too. */
        if (willPrompt.current) {
          setRun((s) => (s ? pauseRun(s, audioNow()) : s));
          say('Save or discard your changes, then press Resume');
          return;
        }
        onStage.current = index;
      }
      // your own pattern opens where you left it; the session plays it at the item's place
      setLevel(item.level);
      playAt(startBpm);
      setReadyToPlay(index);
    })();
    return () => {
      live = false;
    };
  }, [loadingIndex, startBpm, targets, openTarget, stopPlaying, setLevel, playAt, audioNow, say]);

  /* After the render that put the pattern on the stage, so the transport
     reads the new pattern and tempo, not the last one. The slot is marked
     started before the transport is: with no count-in, `start()` reports the
     downbeat at once, and the runner only takes one after `loaded`. */
  useEffect(() => {
    if (readyToPlay < 0) return;
    setReadyToPlay(-1);
    // paused, skipped or stopped while it loaded: nothing to start
    const now = runRef.current;
    if (now?.phase !== 'loading' || now.index !== readyToPlay) return;
    setRun((s) => (s && s.index === readyToPlay ? loaded(s) : s));
    if (!play()) {
      say('No sound in this browser — the session cannot run', { error: true });
      setRun((s) => (s ? stopRun(s, itemsRef.current, audioNow()) : s));
    }
  }, [readyToPlay, play, say, audioNow]);

  /* The transport stopped under a running slot (Space, the header's Stop):
     that is a pause, not the end. */
  const { playing: transportOn } = c;
  const phase = run?.phase;
  useEffect(() => {
    if (!transportOn && (phase === 'playing' || phase === 'counting')) {
      setRun((s) => (s ? pauseRun(s, audioNow()) : s));
    }
  }, [transportOn, phase, audioNow]);

  /** Post a finished run once, if it is worth logging. */
  const post = useCallback(
    (ended: RunState, options?: { leaving?: boolean }) => {
      if (!session || posted.current || !worthLogging(ended)) return;
      posted.current = true;
      const body = {
        startedAt: (startedAt.current ?? new Date()).toISOString(),
        items: ended.played.map(({ title, level, targetBpm, reachedBpm, seconds }) => ({
          title,
          level,
          targetBpm,
          reachedBpm,
          seconds,
        })),
      };
      void apiClient
        .post(`/api/v1/practice-sessions/${session.id}/runs`, {
          body,
          // leaving the Studio: the request outlives the page
          options: options?.leaving ? { keepalive: true } : undefined,
        })
        .then(() => {
          if (!options?.leaving) say('Session logged');
        })
        .catch((error: unknown) => {
          logger.warn('BeatBreaker: a practice run could not be logged', { error });
          if (!options?.leaving) say('The session could not be logged', { error: true });
        });
    },
    [session, say]
  );

  /* The end, however it came: let go of the transport and the holds, and
     post the run once. */
  useEffect(() => {
    if (phase !== 'done' || !run) return;
    stopPlaying();
    setSessionHold(false);
    setClockListener(null);
    post(run);
  }, [phase, run, stopPlaying, setSessionHold, setClockListener, post]);

  /* Leaving the Studio mid-session ends the run there: let go of the holds,
     and log what was played. */
  const postRef = useRef(post);
  useEffect(() => {
    postRef.current = post;
  });
  useEffect(
    () => () => {
      setSessionHold(false);
      setClockListener(null);
      const left = runRef.current;
      if (left && left.phase !== 'done') {
        postRef.current(stopRun(left, itemsRef.current, audioNow()), { leaving: true });
      }
    },
    [setSessionHold, setClockListener, audioNow]
  );

  /* The time shown. */
  const running = !!run && run.phase !== 'done';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(audioNow()), DISPLAY_MS);
    return () => clearInterval(id);
  }, [running, audioNow]);

  const start = useCallback(() => {
    if (!items.length) return;
    primeAudio();
    posted.current = false;
    shownFor.current = 0;
    onStage.current = -1;
    startedAt.current = new Date();
    setPrompt(null);
    setSessionHold(true);
    setRun(startRun(items));
  }, [items, setSessionHold, primeAudio]);

  const pause = useCallback(() => {
    setRun((s) => (s ? pauseRun(s, audioNow()) : s));
    stopPlaying();
  }, [audioNow, stopPlaying]);

  const resume = useCallback(() => {
    primeAudio();
    setRun((s) => (s ? resumeRun(s) : s));
  }, [primeAudio]);

  const skip = useCallback(() => {
    setRun((s) => (s ? skipRun(s, itemsRef.current, audioNow()) : s));
  }, [audioNow]);

  const addMinute = useCallback(() => setRun((s) => (s ? addMinuteTo(s) : s)), []);

  const stop = useCallback(() => {
    setRun((s) => (s ? stopRun(s, itemsRef.current, audioNow()) : s));
  }, [audioNow]);

  const record = useCallback(async () => {
    if (!prompt) return;
    const { result, target } = prompt;
    try {
      await apiClient.post('/api/v1/speed-records', {
        body: { ...target, level: result.level, bpm: result.reachedBpm },
      });
      say(`Recorded: ${result.reachedBpm} bpm`);
      setPrompt(null);
    } catch (error) {
      say(error instanceof APIClientError ? error.message : 'Could not record that — try again', {
        error: true,
      });
    }
  }, [prompt, say]);

  const dismissPrompt = useCallback(() => setPrompt(null), []);

  if (!session) return null;
  return {
    session,
    run,
    items,
    now,
    start,
    pause,
    resume,
    skip,
    addMinute,
    stop,
    prompt,
    record,
    dismissPrompt,
  };
}
