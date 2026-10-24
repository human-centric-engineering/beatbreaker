'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { DrummerStage } from '@/components/app/studio/drummer/drummer-stage';
import type { ScheduledStep } from '@/lib/app/breaks/audio/transport';
import type { CameraView } from '@/lib/app/breaks/drummer/camera';
import { noteSeated, openingPersona, otherThan } from '@/lib/app/breaks/drummer/personas';
import { type GripChoice, gripsFor } from '@/lib/app/breaks/drummer/grips';
import { likenessFor } from '@/lib/app/breaks/drummer/likenesses';

/**
 * The box the 3D drummer is drawn in (experiment). Loaded only in the
 * browser, and only when the drummer view is open — `three` is not in the
 * Studio's bundle until then. The stage itself is plain `three`, made once
 * per mount; this component only hands it the props as they change.
 *
 * Each time the view opens a different player sits at the kit, picked at
 * random; they stay until the view closes or Shuffle seats someone else.
 * A style that is a drummer with a likeness (Copeland, Purdie…) seats that
 * drummer instead, for as long as it is the style — unless Shuffle is
 * pressed, which stands them down for the cast until the style changes.
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
  /** A different drummer sat down — not the first, on opening the view. */
  onNewDrummer?: () => void;
  /** The chart is up in the corner: move the drummer left, out from under it. */
  aside?: boolean;
  /** Every kit in see-through acrylic in its own colour. */
  seeThrough?: boolean;
  /** The kit is played with brushes: wire brushes in the hands rather than sticks. */
  brushes?: boolean;
  /** The kit's snare is deadened with a strip of leather over its head. */
  leather?: boolean;
  /** The Studio's style: a drummer's own seats their likeness, if they have one. */
  style?: string;
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
  onNewDrummer,
  aside = false,
  seeThrough = false,
  brushes = false,
  leather = false,
  style,
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
  // the style whose likeness Shuffle stood down, until the style changes
  const [waived, setWaived] = useState<string | undefined>(undefined);
  const [lastStyle, setLastStyle] = useState(style);
  if (lastStyle !== style) {
    setLastStyle(style);
    setWaived(undefined);
  }
  const likeness = style === undefined ? undefined : likenessFor(style);
  if (shuffled !== shuffleSeq) {
    setShuffled(shuffleSeq);
    if (likeness && waived !== style) setWaived(style);
    setPersona(otherThan(persona.id));
  }
  const who = likeness && waived !== style ? likeness : persona;
  // only the cast is noted: a likeness is not in the shuffle, and sitting in for the cast
  // leaves who sat last, and The Original's first seat in a tab, as they were
  useEffect(() => {
    if (who === persona) noteSeated(persona.id);
  }, [who, persona]);
  const grips = useMemo(() => gripsFor(grip), [grip]);
  // what a stage made after the first mount must start from
  const latest = useRef({
    lefty,
    grips,
    playing,
    view,
    persona: who,
    aside,
    seeThrough,
    brushes,
    leather,
  });
  useEffect(() => {
    latest.current = {
      lefty,
      grips,
      playing,
      view,
      persona: who,
      aside,
      seeThrough,
      brushes,
      leather,
    };
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
    s.setSeeThrough(latest.current.seeThrough);
    s.setBrushes(latest.current.brushes);
    s.setLeather(latest.current.leather);
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
    stage.current?.setPersona(who);
  }, [who]);

  // a new drummer is a new shot: the view starts again from the front
  const seated = useRef(who.id);
  const newDrummer = useRef(onNewDrummer);
  useEffect(() => {
    newDrummer.current = onNewDrummer;
  });
  useEffect(() => {
    if (seated.current === who.id) return;
    seated.current = who.id;
    newDrummer.current?.();
  }, [who.id]);

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

  useEffect(() => {
    stage.current?.setSeeThrough(seeThrough);
  }, [seeThrough]);

  useEffect(() => {
    stage.current?.setBrushes(brushes);
  }, [brushes]);

  useEffect(() => {
    stage.current?.setLeather(leather);
  }, [leather]);

  return (
    <>
      <div
        ref={host}
        className="drummer-canvas"
        role="img"
        aria-label={`${who.name}, a drummer playing the break, in 3D. Drag to turn round the kit; scroll or pinch to zoom.`}
      />
      <p className="drummer-name" aria-hidden="true">
        <span>On the kit:</span> <b>{who.name}</b>
      </p>
    </>
  );
}
