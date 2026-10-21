'use client';

import { Maximize, Maximize2, Minimize, Minimize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { DrummerChart, useChartSections } from '@/components/app/studio/drummer/drummer-chart';
import { GripGuide } from '@/components/app/studio/drummer/grip-guide';
import {
  CameraMenu,
  DrummerSettingsPop,
  SeeThroughTool,
} from '@/components/app/studio/player/drummer-tools';
import { PlayerBar } from '@/components/app/studio/player/player-bar';
import { PlayerPortal, PlayerTip, PlayerTips } from '@/components/app/studio/player/player-pop';
import { PLAYER_WIDE, useMedia } from '@/components/app/studio/player/use-media';
import { useStudio } from '@/components/app/studio/studio-provider';
import {
  DRUMMER_CHART,
  DRUMMER_GRIP,
  DRUMMER_HAND,
  DRUMMER_SEE_THROUGH,
} from '@/lib/app/breaks/browser-keys';
import type { CameraView } from '@/lib/app/breaks/drummer/camera';
import { guideFor } from '@/lib/app/breaks/drummer/grip-guide';
import { songPartOf } from '@/lib/app/breaks/songs';
import { useStoredSetting } from '@/lib/app/breaks/use-stored-setting';
import { cn } from '@/lib/utils';

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

/** The drum clef on a staff, as the corner chart draws it: the way to the whole chart. */
function DrumClef({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 4.5h20M2 8.25h20M2 12h20M2 15.75h20M2 19.5h20"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path d="M6.5 8.25v7.5M11 8.25v7.5" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** How long the pointer can rest over the playing drummer before the controls fade, as a video's do. */
const IDLE_MS = 2600;

/** How far the pointer goes on the corner drummer before a press is a drag, not a click. */
const DRAG_PX = 4;

/** How near its corner the dragged drummer has to be let go to go back into it. */
const HOME_PX = 48;

/**
 * The drummer, as a player (experiment): a drummer at a kit, in 3D, playing
 * what the transport plays as it plays it, with the controls on the picture
 * the way a video's are — the bar at its foot, who is on the kit at its top.
 * Turn round them, zoom in on the hands or the feet, set the kit up for
 * either hand, and choose how the sticks are held.
 *
 * `pip` is the same player kept small in the chart view's top corner, so the
 * drummer never leaves the screen: the controls go, and the whole picture is
 * one button that brings the drummer back to the middle. The Stage keeps it
 * mounted across the change, so the player seated is the one who stays. It
 * can be dragged anywhere over the chart, and stays where it is put.
 */
export function DrummerView({
  pip = false,
  onExpand,
  onChart,
}: {
  pip?: boolean;
  /** Make the drummer the main view (the picture-in-picture clicked). */
  onExpand?: () => void;
  /** Change to the chart view. */
  onChart?: () => void;
}) {
  const c = useStudio();
  const [hand, setHand] = useStoredSetting(DRUMMER_HAND);
  const [grip, setGrip] = useStoredSetting(DRUMMER_GRIP);
  const [chart, setChart] = useStoredSetting(DRUMMER_CHART);
  const [seeThrough, setSeeThrough] = useStoredSetting(DRUMMER_SEE_THROUGH);
  const [guide, setGuide] = useState(false);
  // the hand away from the hats: the left on a right-handed kit
  const offHand = hand === 'right' ? 'left' : 'right';
  const [view, setView] = useState<CameraView>('front');
  const [viewSeq, setViewSeq] = useState(0);
  const [shuffleSeq, setShuffleSeq] = useState(0);
  const [small, setSmall] = useState(false);
  // asked once, on the client; the server renders the placeholder
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => true);
  // where the player's bar and the corner chart start: a phone gets neither, nor the drummer moved aside
  const wide = useMedia(PLAYER_WIDE);
  // only where the stylesheet would show it, and only with a section to draw:
  // hidden, it would still lay out the line and follow every step
  const section = useChartSections().current;
  const chartShown = !pip && chart && wide && !!section;

  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  /* The corner drummer, dragged: how far it is from the top right corner it
     hangs in, left and down, kept on the stage and in the window. A press that
     goes nowhere is still the click that brings the drummer to the middle. */
  const [pipAt, setPipAt] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  /* In its corner, the header keeps out from under it; moved aside, the header
     has its width back. Held as it was while the drummer moves, so the header
     does not reflow under the pointer; otherwise read from where it is, so a
     resize that pushes it back into the corner, or a cancelled drag, agrees. */
  const [fromHome, setFromHome] = useState(true);
  const home = dragging ? fromHome : Math.hypot(pipAt.x, pipAt.y) < HOME_PX;
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const dragged = useRef(false);
  const keepOnStage = useCallback(
    (x: number, y: number) => {
      const dock = root?.parentElement;
      if (!root || !dock) return { x: 0, y: 0 };
      const at = dock.getBoundingClientRect();
      const stage = dock.parentElement?.getBoundingClientRect();
      const foot = Math.min(stage?.bottom ?? window.innerHeight, window.innerHeight) - 8;
      const maxX = Math.max(0, dock.clientWidth - root.offsetWidth);
      const maxY = Math.max(0, foot - Math.max(at.top, 0) - root.offsetHeight);
      return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) };
    },
    [root]
  );
  // a narrower window, the drummer made larger, or the page scrolled keeps it on the stage
  useEffect(() => {
    if (!pip || !root || typeof ResizeObserver !== 'function') return;
    const keep = () => setPipAt((p) => keepOnStage(p.x, p.y));
    const watch = new ResizeObserver(keep);
    watch.observe(root);
    window.addEventListener('resize', keep);
    // scrolled, the stage's top moves under it: the dock is sticky
    window.addEventListener('scroll', keep, { passive: true });
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', keep);
      window.removeEventListener('scroll', keep);
    };
  }, [pip, root, keepOnStage]);

  /* The chrome fades while the music plays and the pointer rests, and comes
     back with any movement or focus — a keyboard user never loses it, since
     focus inside keeps it up (the stylesheet's `:focus-within`). */
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  /* The way to the chart sits just above the bar over the picture, whatever
     its height (two rows on a narrower screen), level with the cue when stopped
     — and just above the chapters while the section and the layer are hidden. */
  useEffect(() => {
    const bar = root?.querySelector<HTMLElement>('.player-bar.overlay');
    if (!root || !bar || typeof ResizeObserver !== 'function') return;
    // from the bar's foot to the top of the bar itself, not of the cue over it when stopped
    const measure = () => {
      const top = Array.from(bar.children).find(
        (el): el is HTMLElement => el instanceof HTMLElement && !el.matches('.drummer-cue')
      );
      root.style.setProperty('--bar-h', `${bar.offsetHeight - (top?.offsetTop ?? 0)}px`);
      // and to the chapters, for while the section and the layer over them are hidden
      const chapters = bar.querySelector<HTMLElement>('.chapters');
      if (chapters) {
        root.style.setProperty('--bar-low-h', `${bar.offsetHeight - chapters.offsetTop}px`);
      }
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(bar);
    return () => watch.disconnect();
  }, [root, wide, pip]);

  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(!!root && document.fullscreenElement === root);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, [root]);
  const canFull = !!root && typeof root.requestFullscreen === 'function';
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root?.requestFullscreen?.();
  };

  /* the song the stage plays, for the caption: "Master of Puppets · the main riff"
     — the part under the playhead, so it moves on with the song */
  const stagePat = c.view[c.editing] ?? c.view.A;
  const part = stagePat
    ? songPartOf(c.catalogue?.styles[stagePat.style]?.params, stagePat.song)
    : undefined;

  /* The view's own tools — the camera, the see-through kit and the drummer's settings — before the
     mixer and the sound, which every view has. */
  const tools = (
    <>
      <CameraMenu
        view={view}
        onView={(v) => {
          setView(v);
          setViewSeq((n) => n + 1);
        }}
        onRecentre={() => setViewSeq((n) => n + 1)}
      />
      <SeeThroughTool seeThrough={seeThrough} setSeeThrough={setSeeThrough} />
      <DrummerSettingsPop
        hand={hand}
        setHand={setHand}
        grip={grip}
        setGrip={setGrip}
        offHand={offHand}
        chart={chart}
        setChart={setChart}
        chartAllowed={wide}
        onShuffle={() => setShuffleSeq((n) => n + 1)}
        onHowToHold={webgl ? () => setGuide(true) : undefined}
      />
    </>
  );
  const chartButton = onChart ? (
    <button
      type="button"
      className="player-tool player-to-chart"
      onClick={onChart}
      aria-label="Chart view"
      title="The whole chart, with the drummer kept in the corner"
    >
      <DrumClef />
      <span className="player-tool-face">Chart view</span>
    </button>
  ) : null;
  const viewTools = (
    <>
      {/* a wide screen has it over the picture, at the bottom right */}
      {onChart && !wide ? chartButton : null}
      {canFull ? (
        <PlayerTip tip={full ? 'Exit full screen' : 'Full screen'}>
          <button
            type="button"
            className="player-tool"
            onClick={toggleFull}
            aria-label={full ? 'Exit full screen' : 'Full screen'}
          >
            {full ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </PlayerTip>
      ) : null}
    </>
  );

  // no 3D, no corner: a message there would only cover the chart
  if (pip && !webgl) return null;

  const cue = c.playing ? null : (
    <p className="drummer-cue">Press Play and the drummer plays along.</p>
  );

  return (
    <div
      ref={setRoot}
      className={cn(
        'bb drummer player',
        pip && 'is-pip',
        pip && small && 'is-small',
        pip && dragging && 'is-dragging',
        pip && home && 'is-home',
        !pip && idle && c.playing && 'is-idle',
        full && 'is-full'
      )}
      style={pip ? { right: pipAt.x, top: pipAt.y } : undefined}
      onPointerMove={pip ? undefined : wake}
      onPointerDown={pip ? undefined : wake}
    >
      <PlayerPortal.Provider value={root}>
        <PlayerTips>
          <div className="drummer-stage player-screen">
            {webgl ? (
              <DrummerCanvas
                lefty={hand === 'left'}
                grip={grip}
                view={view}
                viewSeq={viewSeq}
                shuffleSeq={shuffleSeq}
                onNewDrummer={() => {
                  setView('front');
                  setViewSeq((n) => n + 1);
                }}
                seeThrough={seeThrough}
                brushes={!!c.catalogue?.kits[c.kit]?.brushes}
                aside={chartShown}
                style={c.style}
                playing={c.playing}
                subscribeSteps={c.subscribeSteps}
                audioNow={c.audioNow}
                audioLatency={c.audioLatency}
              />
            ) : (
              <p className="hint drummer-note">
                This browser can&rsquo;t draw 3D, so the drummer can&rsquo;t be shown.
              </p>
            )}
            {part && !pip ? (
              <p className="player-song" aria-hidden="true">
                ♫ {part.song.title}
              </p>
            ) : null}
            {/* The top right corner: the chart, and the part of the song under
              it — or in the corner itself while the chart is off. */}
            {chartShown || (part?.section && !pip) ? (
              <div className="player-corner">
                {chartShown ? <DrummerChart /> : null}
                {part?.section && !pip ? (
                  <p className="player-part" aria-hidden="true">
                    {part.section.label}
                  </p>
                ) : null}
              </div>
            ) : null}

            {pip ? (
              <>
                <button
                  type="button"
                  className="pip-expand"
                  onClick={() => {
                    if (dragged.current) dragged.current = false;
                    else onExpand?.();
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    drag.current = { sx: e.clientX, sy: e.clientY, ox: pipAt.x, oy: pipAt.y };
                    dragged.current = false;
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const d = drag.current;
                    if (!d) return;
                    const dx = e.clientX - d.sx;
                    const dy = e.clientY - d.sy;
                    if (!dragged.current && Math.hypot(dx, dy) < DRAG_PX) return;
                    if (!dragged.current) setFromHome(Math.hypot(d.ox, d.oy) < HOME_PX);
                    dragged.current = true;
                    setDragging(true);
                    // right to left: the drummer hangs from the right-hand corner
                    setPipAt(keepOnStage(d.ox - dx, d.oy + dy));
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                    setDragging(false);
                    if (!dragged.current) return;
                    // let go near the corner, it goes back into it
                    const back = Math.hypot(pipAt.x, pipAt.y) < HOME_PX;
                    if (back) setPipAt({ x: 0, y: 0 });
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                    dragged.current = false;
                    setDragging(false);
                  }}
                  aria-label="Watch the drummer"
                  title="Click to make the drummer the main view; drag to move it"
                >
                  <span className="pip-expand-face">
                    <Maximize2 size={16} aria-hidden="true" /> Watch the drummer
                  </span>
                </button>
                <button
                  type="button"
                  className="pip-size"
                  onClick={() => setSmall(!small)}
                  aria-label={small ? 'Larger drummer' : 'Smaller drummer'}
                  title={small ? 'Larger' : 'Smaller'}
                >
                  {small ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                </button>
              </>
            ) : (
              <>
                {wide ? (
                  <>
                    <PlayerBar variant="overlay" extra={tools} view={viewTools} hint={cue} />
                    {chartButton}
                  </>
                ) : (
                  // a phone keeps the transport in its footer: here only what the drummer view adds
                  <>
                    <div className="player-phone-tools">
                      {tools}
                      {viewTools}
                    </div>
                    {cue}
                  </>
                )}
              </>
            )}
          </div>
        </PlayerTips>
      </PlayerPortal.Provider>
      <GripGuide open={guide} onOpenChange={setGuide} grip={guideFor(grip)} />
    </div>
  );
}
