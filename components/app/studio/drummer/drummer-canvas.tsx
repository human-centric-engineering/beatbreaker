'use client';

import { useEffect, useRef } from 'react';

import { DrummerStage } from '@/components/app/studio/drummer/drummer-stage';
import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import type { CameraView } from '@/lib/app/breaks/drummer/camera';

/**
 * The box the 3D drummer is drawn in (experiment). Loaded only in the
 * browser, and only when the drummer view is open — `three` is not in the
 * Studio's bundle until then. The stage itself is plain `three`, made once
 * per mount; this component only hands it the props as they change.
 */

export interface DrummerCanvasProps {
  lefty: boolean;
  view: CameraView;
  /** Bumped to fly back to `view` when it has not changed — the camera was dragged away. */
  viewSeq: number;
  playing: boolean;
  subscribeSteps: (listener: (step: ScheduledStep) => void) => () => void;
  audioNow: () => number;
  audioLatency: () => number;
}

export default function DrummerCanvas({
  lefty,
  view,
  viewSeq,
  playing,
  subscribeSteps,
  audioNow,
  audioLatency,
}: DrummerCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<DrummerStage | null>(null);
  // what a stage made after the first mount must start from
  const latest = useRef({ lefty, playing, view });
  useEffect(() => {
    latest.current = { lefty, playing, view };
  });

  /* One stage per mount. The three callbacks must be stable (the console's
     are `useCallback`s): a new one rebuilds the whole scene. */
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const s = new DrummerStage(el, { now: audioNow, latency: audioLatency });
    s.setLefty(latest.current.lefty);
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
    stage.current?.setPlaying(playing);
  }, [playing]);

  useEffect(() => {
    stage.current?.setLefty(lefty);
  }, [lefty]);

  useEffect(() => {
    stage.current?.flyTo(view);
  }, [view, viewSeq]);

  return (
    <div
      ref={host}
      className="drummer-canvas"
      role="img"
      aria-label="A drummer playing the break, in 3D. Drag to turn round the kit; scroll or pinch to zoom."
    />
  );
}
