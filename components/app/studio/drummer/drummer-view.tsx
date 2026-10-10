'use client';

import dynamic from 'next/dynamic';
import { useState, useSyncExternalStore } from 'react';

import { DrummerChart, useChartSections } from '@/components/app/studio/drummer/drummer-chart';
import { GripGuide } from '@/components/app/studio/drummer/grip-guide';
import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { DRUMMER_CHART, DRUMMER_GRIP, DRUMMER_HAND } from '@/lib/app/breaks/browser-keys';
import { CAMERA_LABELS, CAMERA_VIEWS, type CameraView } from '@/lib/app/breaks/drummer/camera';
import { guideFor } from '@/lib/app/breaks/drummer/grip-guide';
import { GRIP_CHOICES } from '@/lib/app/breaks/drummer/grips';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';

/* `three` and the renderer load with the view, not with the Studio. */
const DrummerCanvas = dynamic(() => import('@/components/app/studio/drummer/drummer-canvas'), {
  ssr: false,
  loading: () => <p className="hint drummer-note">Setting up the kit…</p>,
});

let webglSeen: boolean | undefined;

/** Can this browser draw WebGL? Asked once: `useSyncExternalStore` reads it on every render. */
function hasWebGL(): boolean {
  if (webglSeen === undefined) {
    try {
      const canvas = document.createElement('canvas');
      webglSeen = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      webglSeen = false;
    }
  }
  return webglSeen;
}

const noSubscribe = () => () => {};

/** Where the stylesheet starts showing the corner chart: a phone gets neither it nor the drummer moved aside. */
const CHART_WIDE = '(min-width: 640px)';

function subscribeWide(change: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(CHART_WIDE);
  query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
}

function isWide(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(CHART_WIDE).matches;
}

/**
 * The stage's other face (experiment): a drummer at a kit, in 3D, playing
 * what the transport plays as it plays it. Turn round them, zoom in on the
 * hands or the feet, set the kit up for either hand, and choose how the
 * sticks are held.
 */
export function DrummerView() {
  const c = useStudio();
  const [hand, setHand] = useStoredSetting(DRUMMER_HAND);
  const [grip, setGrip] = useStoredSetting(DRUMMER_GRIP);
  const [chart, setChart] = useStoredSetting(DRUMMER_CHART);
  const [guide, setGuide] = useState(false);
  // the hand away from the hats: the left on a right-handed kit
  const offHand = hand === 'right' ? 'left' : 'right';
  const [view, setView] = useState<CameraView>('front');
  const [viewSeq, setViewSeq] = useState(0);
  const [shuffleSeq, setShuffleSeq] = useState(0);
  // asked once, on the client; the server renders the placeholder
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => true);
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false);
  // only where the stylesheet would show it, and only with a section to draw:
  // hidden, it would still lay out the line and follow every step
  const section = useChartSections().current;
  const chartShown = chart && wide && !!section;

  return (
    <div className="drummer">
      <div className="chart-tools">
        <span className="eyebrow">Drummer</span>
        <Segmented
          label="Kit set up for"
          small
          options={[
            {
              value: 'right' as const,
              face: 'Right-handed',
              title: 'Hats and ride on the right hand',
            },
            {
              value: 'left' as const,
              face: 'Left-handed',
              title: 'Hats and ride on the left hand — the kit mirrored',
            },
          ]}
          value={hand}
          onChange={setHand}
        />
        <SelectMenu
          className="drummer-grip"
          aria-label="Grip"
          value={grip}
          onValueChange={(v) => {
            const next = GRIP_CHOICES.find((g) => g === v);
            if (next) setGrip(next);
          }}
          groups={[
            {
              label: 'Matched',
              options: [
                { value: 'american', label: 'American', note: 'palms at 45°' },
                { value: 'german', label: 'German', note: 'palms down' },
                { value: 'french', label: 'French', note: 'thumbs up' },
              ],
            },
            {
              label: 'Traditional',
              options: [
                { value: 'traditional', label: `Traditional (${offHand})`, note: 'palm up' },
                { value: 'traditionalBoth', label: 'Traditional (both)', note: 'palms up' },
              ],
            },
          ]}
        />
        {webgl ? (
          <button
            type="button"
            className="mini"
            title="How to hold the sticks in each grip, step by step, with the drummer's own hands"
            onClick={() => setGuide(true)}
          >
            How to hold
          </button>
        ) : null}
        <Segmented
          label="Camera"
          small
          options={CAMERA_VIEWS.map((v) => ({ value: v, face: CAMERA_LABELS[v] }))}
          value={view}
          onChange={(v) => {
            setView(v);
            setViewSeq((n) => n + 1);
          }}
        />
        <button
          type="button"
          className="mini"
          title="Fly back to the camera's shot"
          onClick={() => setViewSeq((n) => n + 1)}
        >
          Re-centre
        </button>
        <button
          type="button"
          className="mini"
          title="Seat a different drummer at the kit"
          onClick={() => setShuffleSeq((n) => n + 1)}
        >
          Shuffle drummer
        </button>
        <Toggle
          className="mini drummer-chart-toggle"
          pressed={chart}
          onPressedChange={setChart}
          title="Show the chart scrolling with the drummer, with the section and the beat of the bar"
        >
          Chart
        </Toggle>
        <StudioHelp title="The drummer">
          Drag to turn round the kit, scroll or pinch to zoom in (toward the pointer), and
          right-drag or two-finger drag to slide. The drummer plays exactly what you hear — swing,
          feel and Humanise included — and chooses its own sticking: cymbals on the lead hand, quick
          sixteenths on the hats hand to hand, fills alternating with a double where that keeps the
          arms from crossing, a flam&rsquo;s grace on the other hand. While a double-kick pattern
          plays (Gallop, Thrash, Double kick, Groove metal) a second pedal goes in, the hi-hat moves
          over to make room for it, and the left foot leaves the hats to play every other kick of a
          run. Ghost notes are played from an inch, mostly with the fingers; accents from high up.
          Grip sets how the sticks are held. Matched grip holds both alike, the stick between the
          pad of the thumb and the first finger a third of the way up: German palms down, the stroke
          from the wrist and the elbows out; American at about 45°, wrist and fingers together;
          French thumbs up, the stroke in the fingers and the turn of the forearm. Traditional holds
          the stick palm up in the web of the thumb, over the ring finger, played by turning the
          forearm like a doorknob — in the hand away from the hats, or both. How to hold opens a
          guide to each grip, step by step, with the drummer&rsquo;s own hands. Waiting for Play,
          the drummer now and then spins a stick: round the thumb, or clamped between two fingers
          like a propeller. Chart puts the music in the top corner, scrolling as it is played and on
          into the start of the next section, with the section and the beat of the bar (not on a
          phone, where the corner is most of the kit). A different player sits in each time you open
          the view, and Shuffle drummer seats someone else. It is an experiment: a jointed figure,
          not a recording of a real player.
        </StudioHelp>
      </div>
      <div className="drummer-stage">
        {webgl ? (
          <DrummerCanvas
            lefty={hand === 'left'}
            grip={grip}
            view={view}
            viewSeq={viewSeq}
            shuffleSeq={shuffleSeq}
            aside={chartShown}
            playing={c.playing}
            subscribeSteps={c.subscribeSteps}
            audioNow={c.audioNow}
            audioLatency={c.audioLatency}
          />
        ) : (
          <p className="hint drummer-note">
            This browser can&rsquo;t draw 3D (WebGL is off or unavailable), so the drummer
            can&rsquo;t be shown. The chart still plays.
          </p>
        )}
        {chartShown ? <DrummerChart /> : null}
        {!c.playing ? <p className="drummer-cue">Press Play and the drummer plays along.</p> : null}
      </div>
      <GripGuide open={guide} onOpenChange={setGuide} grip={guideFor(grip)} />
    </div>
  );
}
