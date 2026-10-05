'use client';

import dynamic from 'next/dynamic';
import { useState, useSyncExternalStore } from 'react';

import { Segmented } from '@/components/app/studio/segmented';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { DRUMMER_HAND } from '@/lib/app/breaks/browser-keys';
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

/**
 * The stage's other face (experiment): a drummer at a kit, in 3D, playing
 * what the transport plays as it plays it. Turn round them, zoom in on the
 * hands or the feet, and set the kit up for either hand.
 */
export function DrummerView() {
  const c = useStudio();
  const [hand, setHand] = useStoredSetting(DRUMMER_HAND);
  const [view, setView] = useState<CameraView>('front');
  const [viewSeq, setViewSeq] = useState(0);
  // asked once, on the client; the server renders the placeholder
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => true);

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
        <StudioHelp title="The drummer">
          Drag to turn round the kit, scroll or pinch to zoom in (toward the pointer), and
          right-drag or two-finger drag to slide. The drummer plays exactly what you hear — swing,
          feel and Humanise included — and chooses its own sticking: cymbals on the lead hand, fills
          alternating, a flam&rsquo;s grace on the other hand. Ghost notes are played from an inch,
          accents from high up. It is an experiment: a jointed figure, not a recording of a real
          player.
        </StudioHelp>
      </div>
      <div className="drummer-stage">
        {webgl ? (
          <DrummerCanvas
            lefty={hand === 'left'}
            view={view}
            viewSeq={viewSeq}
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
        {!c.playing ? <p className="drummer-cue">Press Play and the drummer plays along.</p> : null}
      </div>
    </div>
  );
}
