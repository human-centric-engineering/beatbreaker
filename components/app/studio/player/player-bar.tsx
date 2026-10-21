'use client';

import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useEffect, useState } from 'react';

import { countInLabel, useTapTempo } from '@/components/app/shell/studio-transport';
import { FeelPop } from '@/components/app/studio/player/feel-deck';
import { MixerPop } from '@/components/app/studio/player/mixer-desk';
import { PlayerPortal, PlayerTip, PlayerTips } from '@/components/app/studio/player/player-pop';
import { SoundPop } from '@/components/app/studio/player/sound-deck';
import { useBarFit } from '@/components/app/studio/player/use-fit';
import { Segmented } from '@/components/app/studio/segmented';
import { useStudio } from '@/components/app/studio/studio-provider';
import { TempoControl } from '@/components/app/studio/tempo-control';
import { Toggle } from '@/components/app/studio/toggle';
import { beatOf, playableSlots } from '@/lib/app/breaks/audio/transport';
import { layerNamesFor } from '@/lib/app/breaks/layers';
import { meterOfPat, patSteps } from '@/lib/app/breaks/pattern';
import { ratioOf } from '@/lib/app/breaks/sections';
import { cn } from '@/lib/utils';

/**
 * The arrangement as a video's chapters: one segment per slot, as long as it
 * plays for, filling as the playhead goes through it. A segment is a place to
 * go — clicked, the break goes to the top of that slot, now if it is playing
 * and from there at the next Play if it is not.
 *
 * Under "A only" the slots that do not play are dimmed, not hidden: the
 * arrangement is still the arrangement, and skipping passes over them.
 */
function Chapters() {
  const c = useStudio();
  const solo = c.viewMode === 'both' ? null : c.viewMode;
  const order = playableSlots(c.arrangement, c.view, solo);
  // each slot's place in the order it plays; a slot that does not play has none
  const rank = new Map(order.map((slot, n) => [slot, n]));
  const pos = c.position && !c.position.count ? c.position : null;
  const at = pos?.secIdx ?? -1;
  const here = rank.get(at) ?? -1;

  return (
    <div className="chapters" role="group" aria-label="Arrangement: go to a slot">
      {c.arrangement.map((letter, i) => {
        const pat = c.view[letter];
        const bars = pat?.bars.length ?? 1;
        // as long as it lasts: a section at double speed takes half the time
        const weight = bars / ratioOf(c.patterns[letter]);
        let fill = 0;
        if (i === at && pos && pat) {
          const steps = patSteps(pat) || 16;
          fill = ((pos.barIdx ?? 0) + (pos.slot + 1) / steps) / bars;
        } else if (here >= 0 && (rank.get(i) ?? here) < here) fill = 1;
        const cued = !c.playing && c.cue === i;
        return (
          <button
            key={i}
            type="button"
            className={cn('chapter', !rank.has(i) && 'skip', i === at && 'now', cued && 'cued')}
            style={{ flexGrow: weight }}
            onClick={() => c.seekSlot(i)}
            aria-label={`Go to slot ${i + 1}: ${letter}, ${bars} bar${bars === 1 ? '' : 's'}`}
            title={`${letter} · ${bars} bar${bars === 1 ? '' : 's'}${rank.has(i) ? '' : ' — not playing under this section'}`}
          >
            <span className="chapter-track">
              <span
                className="chapter-fill"
                style={{ transform: `scaleX(${Math.min(1, fill)})` }}
              />
            </span>
            <span className="chapter-letter" aria-hidden="true">
              {letter}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Where the playhead is, in a drummer's words: the section, the bar and the beat. */
function Readout() {
  const c = useStudio();
  const pos = c.position;
  if (pos?.count) {
    return (
      <span className="player-read mono" aria-live="off">
        <b>Count-in</b>
      </span>
    );
  }
  if (pos && pos.letter) {
    const pat = c.view[pos.letter] ?? null;
    const bars = pat?.bars.length ?? 1;
    return (
      <span className="player-read mono">
        <b>{pos.letter}</b> · bar {(pos.barIdx ?? 0) + 1}/{bars} · beat{' '}
        <b>{beatOf(pat, pos.slot)}</b>
        {pat ? <span className="player-meter"> {meterOfPat(pat).label}</span> : null}
      </span>
    );
  }
  if (c.cue !== null) {
    return (
      <span className="player-read mono">
        {/* paused, or only cued — a skip or a chapter while stopped */}
        {c.paused ? 'Paused' : 'Ready'} · from <b>{c.arrangement[c.cue]}</b>
      </span>
    );
  }
  return (
    <span className="player-read mono">
      Ready · loop <b>{c.loops}</b>
    </span>
  );
}

/** Play or pause, the two skips and stop: a media player's transport. */
export function TransportButtons() {
  const c = useStudio();
  return (
    <div className="player-transport" role="group" aria-label="Transport">
      <PlayerTip tip="Back to the top of this section — again for the one before (J)">
        <button
          type="button"
          className="player-btn"
          onClick={() => c.skip(-1)}
          aria-label="Previous section"
          aria-keyshortcuts="J"
        >
          <SkipBack size={18} fill="currentColor" />
        </button>
      </PlayerTip>
      {/* Named for what it does, with its state pressed: one name, whichever face it shows. */}
      <PlayerTip tip={c.playing ? 'Pause (Space)' : 'Play (Space)'}>
        <Toggle
          className="player-play"
          pressed={c.playing}
          onPressedChange={c.togglePlay}
          label="Play or pause"
          keyshortcuts="Space"
        >
          {c.playing ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" />
          )}
        </Toggle>
      </PlayerTip>
      <PlayerTip tip="On to the next section (L)">
        <button
          type="button"
          className="player-btn"
          onClick={() => c.skip(1)}
          aria-label="Next section"
          aria-keyshortcuts="L"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
      </PlayerTip>
      {/* disabled, with nothing to stop, it takes no pointer and shows no tip */}
      <PlayerTip tip="Stop, and back to the top">
        <button
          type="button"
          className="player-btn"
          onClick={c.stopToTop}
          disabled={!c.playing && c.cue === null}
          aria-label="Stop"
        >
          <Square size={14} fill="currentColor" />
        </button>
      </PlayerTip>
    </div>
  );
}

/** The section and the layer: what is shown, played and edited, and how much of it. */
function PatternPick() {
  const c = useStudio();
  const poly = (c.viewMode === 'both' ? c.view.A : c.view[c.viewMode])?.poly;
  const names = layerNamesFor(!!poly, c.feelCross);
  const thin = c.level < 5;
  /* Each group carries a visible name, so what the 1 to 5 are is never a
     guess. The names are hidden from a screen reader, which reads the
     group's own label instead. */
  return (
    <div className="player-pick">
      <div className="player-pick-group">
        <span className="player-pick-label" aria-hidden="true">
          Section
        </span>
        <Segmented
          label="Section"
          small
          className="player-seg"
          options={[...c.letters, 'both' as const].map((v) => ({
            value: v,
            face: v === 'both' ? 'All' : v,
            title: v === 'both' ? 'Every section, in the arrangement (V)' : `Section ${v} only`,
            keyshortcuts: v === 'both' ? 'V' : v === 'A' || v === 'B' ? v : undefined,
          }))}
          value={c.viewMode}
          onChange={c.setViewMode}
        />
      </div>
      <div className="player-pick-group">
        <span className="player-pick-label" aria-hidden="true">
          Difficulty
        </span>
        <Segmented
          label="Difficulty layer"
          small
          className="player-seg layers"
          options={[1, 2, 3, 4, 5].map((n) => ({
            value: n,
            title: `${names[n]} (${n})`,
            keyshortcuts: String(n),
            /* The number on each button, the name read out on every one. */
            face: (
              <>
                <span aria-hidden="true">{n}</span>
                <span className="sr-only">{names[n]}</span>
              </>
            ),
          }))}
          value={c.level}
          onChange={c.setLevel}
        />
        {/* The layer you are on, by name, beside the buttons rather than on
            one, so picking a layer never widens the group and shifts the bar.
            Below Full break it is lit, so a thinned break is never mistaken
            for the break. */}
        <span className={cn('player-layer-name', thin && 'thin')} aria-hidden="true">
          {names[c.level]}
        </span>
      </div>
    </div>
  );
}

/** How far over the docked bar the pointer is "coming to it". */
const NEAR_PX = 120;

/**
 * Whether the pointer is coming down to the docked bar: over it, in the band
 * above it, and moving down. Once it is, it stays so until the pointer leaves
 * the band, so the section and the layer are up by the time it gets there —
 * and reading the last line of the chart, the pointer resting, never brings
 * them up over it.
 */
function useComingTo(root: HTMLElement | null, on: boolean): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!on || !root) return;
    let lastY: number | null = null;
    const move = (e: PointerEvent) => {
      // a finger never hovers on its way anywhere
      if (e.pointerType === 'touch') return;
      const at = root.getBoundingClientRect();
      const inBand =
        e.clientX >= at.left &&
        e.clientX <= at.right &&
        e.clientY >= at.top - NEAR_PX &&
        e.clientY < at.top;
      const down = lastY !== null && e.clientY > lastY;
      lastY = e.clientY;
      setNear((was) => inBand && (was || down));
    };
    const leave = () => {
      lastY = null;
      setNear(false);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      setNear(false);
    };
  }, [root, on]);
  return near;
}

/**
 * The player's bar: the section and the layer, the chapters under them, then
 * the transport, where you are, the tempo and the tools. Over the drummer the
 * section and the layer show only while the pointer is on the bar (or focus is
 * in it), where a mouse can hover at all: the picture keeps their room. Under
 * the chart they float over the bar's top edge and come up on the same terms,
 * or as the pointer comes down to the bar, so the chart keeps their room.
 *
 * Over the drummer it is drawn on a scrim at the foot of the picture, and
 * fades with the pointer while the music plays, as a video's does. Under the
 * chart it is docked at the foot of the stage, the same bar on the same dark
 * ground, so the transport is one thing wherever it is. `extra` is the
 * view's own tools: the camera and the drummer's settings over the drummer.
 */
export function PlayerBar({
  variant,
  extra,
  view,
  hint,
}: {
  variant: 'overlay' | 'docked';
  /** Tools only this view has, before the mixer and the sound. */
  extra?: React.ReactNode;
  /** The button that changes view, last in the bar. */
  view?: React.ReactNode;
  /** A word above the bar, while it is stopped: "Press Play…". */
  hint?: React.ReactNode;
}) {
  const c = useStudio();
  const tapTempo = useTapTempo();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const fit = useBarFit(root);
  const near = useComingTo(root, variant === 'docked');

  const bar = (
    /* Docked, the bar is a `.bb` of its own, so a list it opens (the kit) is
       drawn into it, in its dark tokens, rather than onto the paper round it. */
    <div
      className={cn('player-bar', variant, variant === 'docked' && 'bb')}
      data-fit={fit ?? undefined}
      data-near={near || undefined}
      ref={setRoot}
    >
      {hint}
      <PatternPick />
      <Chapters />
      <div className="player-row">
        <TransportButtons />
        <Readout />
        <div className="player-tempo-box">
          <TempoControl className="player-tempo" />
          <button
            type="button"
            className="player-chip"
            aria-label="Tap tempo"
            title="Tap four times on the beat"
            onClick={tapTempo}
          >
            Tap
          </button>
          <button
            type="button"
            className={cn('player-chip', c.countIn > 0 && 'on')}
            aria-label={`Count-in: ${countInLabel(c.countIn)}`}
            title="Bars of click before the break: off, 1 or 2"
            onClick={() => c.setCountIn((c.countIn + 1) % 3)}
          >
            Count <span className="mono">{c.countIn || 'off'}</span>
          </button>
        </div>
        <div className="player-tools">
          {extra}
          <FeelPop />
          <MixerPop />
          <SoundPop />
          {view}
        </div>
      </div>
    </div>
  );

  // docked, its popovers open into the bar; over the drummer, into the player round it
  return (
    <PlayerTips>
      {variant === 'docked' ? (
        <PlayerPortal.Provider value={root}>{bar}</PlayerPortal.Provider>
      ) : (
        bar
      )}
    </PlayerTips>
  );
}
