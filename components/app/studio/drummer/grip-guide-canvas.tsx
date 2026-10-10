'use client';

import { useEffect, useRef } from 'react';

import { GripGuideStage } from '@/components/app/studio/drummer/grip-guide-stage';
import type { GuideGrip } from '@/lib/app/breaks/drummer/grip-guide';

/**
 * The grip guide's film (experiment), loaded only in the browser when the
 * guide opens: it mounts a {@link GripGuideStage} into a box and hands it
 * the guide's controls as they change.
 */

export interface GripGuideCanvasProps {
  grip: GuideGrip;
  playing: boolean;
  /** Where to go in the lesson, seconds, and a count bumped each time it is asked (a step chosen again). */
  seekTo: number;
  seekSeq: number;
  /** Called each frame with the time into the lesson, seconds. */
  onTime: (seconds: number) => void;
}

export default function GripGuideCanvas({
  grip,
  playing,
  seekTo,
  seekSeq,
  onTime,
}: GripGuideCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<GripGuideStage | null>(null);
  // what a stage made after the first mount must start from, and the latest listener
  const latest = useRef({ grip, playing, onTime });
  useEffect(() => {
    latest.current = { grip, playing, onTime };
  });

  useEffect(() => {
    const el = host.current;
    // the host div is always mounted before this runs; the guard is for the type
    /* v8 ignore start */
    if (!el) return;
    /* v8 ignore stop */
    const s = new GripGuideStage(el, {
      grip: latest.current.grip,
      onTime: (t) => latest.current.onTime(t),
    });
    s.setPlaying(latest.current.playing);
    stage.current = s;
    return () => {
      s.dispose();
      stage.current = null;
    };
  }, []);

  useEffect(() => {
    stage.current?.setGrip(grip);
  }, [grip]);

  useEffect(() => {
    stage.current?.setPlaying(playing);
  }, [playing]);

  useEffect(() => {
    stage.current?.seek(seekTo);
  }, [seekTo, seekSeq]);

  return (
    <div
      ref={host}
      className="h-full w-full"
      role="img"
      aria-label="Two hands holding drumsticks over a snare, in 3D, showing the grip step by step. Drag to turn round them."
    />
  );
}
