'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { DrummerStage } from '@/components/app/studio/drummer/drummer-stage';
import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import type { CameraView } from '@/lib/app/breaks/drummer/camera';
import { noteSeated, openingPersona, otherThan } from '@/lib/app/breaks/drummer/personas';
import { type GripChoice, gripsFor } from '@/lib/app/breaks/drummer/grips';

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
  /** How the sticks are held: a matched grip, or traditional in one hand or both. */
  grip: GripChoice;
  view: CameraView;
  /** Bumped to fly back to `view` when it has not changed — the camera was dragged away. */
  viewSeq: number;
  /** Bumped to seat a different drummer at the kit. */
  shuffleSeq?: number;
  /** The chart is up in the corner: move the drummer left, out from under it. */
  aside?: boolean;
  playing: boolean;
  subscribeSteps: (listener: (step: ScheduledStep) => void) => () => void;
  audioNow: () => number;
  audioLatency: () => number;
}

export default function DrummerCanvas({
  lefty,
  grip,
  view,
  viewSeq,
  shuffleSeq = 0,
  aside = false,
  playing,
  subscribeSteps,
  audioNow,
  audioLatency,
}: DrummerCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<DrummerStage | null>(null);
  // picked once per mount and on each Shuffle: a scene rebuilt meanwhile keeps its player.
  // The picks only read who sat last, and who is seated is noted once they are on screen,
  // so a render run twice (Strict Mode) cannot leave Shuffle skipping the wrong player
  const [persona, setPersona] = useState(() => openingPersona());
  const [shuffled, setShuffled] = useState(shuffleSeq);
  if (shuffled !== shuffleSeq) {
    setShuffled(shuffleSeq);
    setPersona(otherThan(persona.id));
  }
  useEffect(() => {
    noteSeated(persona.id);
  }, [persona]);
  const grips = useMemo(() => gripsFor(grip), [grip]);
  // what a stage made after the first mount must start from
  const latest = useRef({ lefty, grips, playing, view, persona, aside });
  useEffect(() => {
    latest.current = { lefty, grips, playing, view, persona, aside };
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
    // a new stage starts where the old one was, not sliding over from the middle
    s.setAside(latest.current.aside, true);
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

  useEffect(() => {
    stage.current?.setAside(aside);
  }, [aside]);

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
