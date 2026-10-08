'use client';

import dynamic from 'next/dynamic';
import { useState, useSyncExternalStore } from 'react';

import { DrummerChart } from '@/components/app/studio/drummer/drummer-chart';
import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { DRUMMER_CHART, DRUMMER_GRIP, DRUMMER_HAND } from '@/lib/app/breaks/browser-keys';
import { CAMERA_LABELS, CAMERA_VIEWS, type CameraView } from '@/lib/app/breaks/drummer/camera';
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
  const [military, setMilitary] = useStoredSetting(DRUMMER_GRIP);
  const [chart, setChart] = useStoredSetting(DRUMMER_CHART);
  // the hand away from the hats: the left on a right-handed kit
  const offHand = hand === 'right' ? 'left' : 'right';
  const [view, setView] = useState<CameraView>('front');
  const [viewSeq, setViewSeq] = useState(0);
  const [shuffleSeq, setShuffleSeq] = useState(0);
  // asked once, on the client; the server renders the placeholder
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => true);
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false);

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
        <Segmented
          label="Grip"
          small
          options={[
            {
              value: 'none' as const,
              face: 'Matched',
              title: 'Both hands hold the stick the same way, palms down',
            },
            {
              value: 'other' as const,
              face: `Military (${offHand})`,
              title: `Traditional (military) grip in the ${offHand} hand: palm up, the stick in the web of the thumb`,
            },
            {
              value: 'both' as const,
              face: 'Military (both)',
              title: 'Traditional (military) grip in both hands',
            },
          ]}
          value={military}
          onChange={setMilitary}
        />
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
          arms from crossing, a flam&rsquo;s grace on the other hand. Ghost notes are played from an
          inch, mostly with the fingers; accents from high up. Grip sets how the sticks are held:
          matched, or military (traditional) — palm up, the stick in the web of the thumb, played by
          turning the forearm — in the hand away from the hats or in both. Chart puts the music in
          the top corner, scrolling as it is played and on into the start of the next section, with
          the section and the beat of the bar (not on a phone, where the corner is most of the kit).
          A different player sits in each time you open the view, and Shuffle drummer seats someone
          else. It is an experiment: a jointed figure, not a recording of a real player.
        </StudioHelp>
      </div>
      <div className="drummer-stage">
        {webgl ? (
          <DrummerCanvas
            lefty={hand === 'left'}
            military={military}
            view={view}
            viewSeq={viewSeq}
            shuffleSeq={shuffleSeq}
            aside={chart && wide}
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
        {chart ? <DrummerChart /> : null}
        {!c.playing ? <p className="drummer-cue">Press Play and the drummer plays along.</p> : null}
      </div>
    </div>
  );
}
