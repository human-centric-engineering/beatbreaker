'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { DrummerStage } from '@/components/app/studio/drummer/drummer-stage';
import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import type { CameraView } from '@/lib/app/breaks/drummer/camera';
import type { DRUMMER_GRIPS } from '@/lib/app/breaks/browser-keys';
import { pickPersona } from '@/lib/app/breaks/drummer/personas';
import { gripsFor } from '@/lib/app/breaks/drummer/pose';

/**
 * The box the 3D drummer is drawn in (experiment). Loaded only in the
 * browser, and only when the drummer view is open — `three` is not in the
 * Studio's bundle until then. The stage itself is plain `three`, made once
 * per mount; this component only hands it the props as they change.
 *
 * Each time the view opens a different player sits at the kit, picked at
 * random; they stay until the view closes or Shuffle seats someone else.
 */

export interface DrummerCanvasProps {
  lefty: boolean;
  /** Which hands hold the stick in a military grip. */
  military: (typeof DRUMMER_GRIPS)[number];
  view: CameraView;
  /** Bumped to fly back to `view` when it has not changed — the camera was dragged away. */
  viewSeq: number;
  /** Bumped to seat a different drummer at the kit. */
  shuffleSeq?: number;
  playing: boolean;
  subscribeSteps: (listener: (step: ScheduledStep) => void) => () => void;
  audioNow: () => number;
  audioLatency: () => number;
}

export default function DrummerCanvas({
  lefty,
  military,
  view,
  viewSeq,
  shuffleSeq = 0,
  playing,
  subscribeSteps,
  audioNow,
  audioLatency,
}: DrummerCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<DrummerStage | null>(null);
  // picked once per mount and on each Shuffle: a scene rebuilt meanwhile keeps its player
  const [persona, setPersona] = useState(() => pickPersona());
  const [shuffled, setShuffled] = useState(shuffleSeq);
  if (shuffled !== shuffleSeq) {
    setShuffled(shuffleSeq);
    setPersona(pickPersona());
  }
  const grips = useMemo(() => gripsFor(military), [military]);
  // what a stage made after the first mount must start from
  const latest = useRef({ lefty, grips, playing, view, persona });
  useEffect(() => {
    latest.current = { lefty, grips, playing, view, persona };
  });

  /* One stage per mount. The three callbacks must be stable (the console's
     are `useCallback`s): a new one rebuilds the whole scene. */
  useEffect(() => {
    const el = host.current;
    // the host div is always mounted before this runs; the guard is for the type
    /* v8 ignore start */
    if (!el) return;
    /* v8 ignore stop */
    const s = new DrummerStage(
      el,
      { now: audioNow, latency: audioLatency },
      latest.current.persona
    );
    s.setLefty(latest.current.lefty);
    s.setGrips(latest.current.grips);
    s.setPlaying(latest.current.playing);
    s.flyTo(latest.current.view);
    stage.current = s;
    const unsubscribe = subscribeSteps(s.ingest);
    return () => {
      unsubscribe();
      s.dispose();
      stage.current = null;
    };
  }, [subscribeSteps, audioNow, audioLatency]);

  useEffect(() => {
    stage.current?.setPersona(persona);
  }, [persona]);

  useEffect(() => {
    stage.current?.setPlaying(playing);
  }, [playing]);

  useEffect(() => {
    stage.current?.setLefty(lefty);
  }, [lefty]);

  useEffect(() => {
    stage.current?.setGrips(grips);
  }, [grips]);

  useEffect(() => {
    stage.current?.flyTo(view);
  }, [view, viewSeq]);

  return (
    <>
      <div
        ref={host}
        className="drummer-canvas"
        role="img"
        aria-label={`${persona.name}, a drummer playing the break, in 3D. Drag to turn round the kit; scroll or pinch to zoom.`}
      />
      <p className="drummer-name" aria-hidden="true">
        On the kit: {persona.name}
      </p>
    </>
  );
}
