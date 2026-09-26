'use client';

import { ChevronLeft, ChevronRight, Play, Square } from 'lucide-react';
import { useRef } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { LANE_DEFS, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import type { LaneKey } from '@/lib/app/breaks/types';
import { cn } from '@/lib/utils';

/**
 * The transport, in the two shapes the frame asks for.
 *
 * Wide, it sits in the header beside the brand. On a phone it is the whole
 * footer — Play on the centre line with the tempo as one stepper cluster beside
 * it, because split either side of Play the two arrows looked like they did
 * different jobs (Spike A). Both read the same state; there is one transport,
 * drawn twice, and only one of the two is in the layout at any width.
 */

/**
 * What each lamp says when it is not lit. A strip of blank squares is a strip of
 * blank squares; the letter is how you know which limb just fired without having
 * learnt the colours first.
 */
const LED_CHAR: Record<LaneKey, string> = {
  c: 'C',
  r: 'R',
  h: 'H',
  s: 'S',
  k: 'K',
  t1: '1',
  t2: '2',
  t3: '3',
  hf: 'F',
  p1: 'P',
  p2: 'P',
};

/** Tap four times and it takes the mean of the gaps. */
export function useTapTempo(): () => void {
  const c = useStudio();
  const taps = useRef<number[]>([]);
  return () => {
    const now = performance.now();
    const recent = taps.current.filter((t) => now - t < 2400);
    recent.push(now);
    taps.current = recent.slice(-4);
    if (taps.current.length < 2) return;
    const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean > 120) c.setBpm(60000 / mean);
  };
}

/** How many bars of click come before the break: off, 1 bar or 2 bars. */
export function countInLabel(bars: number): string {
  return bars ? `${bars} bar${bars === 1 ? '' : 's'}` : 'off';
}

/** The lamps: which limb fired on this step. Decorative — the chart is the truth. */
export function TransportLeds() {
  const c = useStudio();
  if (!c.view.A) return null;
  return (
    <div className="leds" aria-hidden="true">
      {activeLanes(c.view.A.lanes).map((lane) => {
        const lit =
          c.position && !c.position.count && c.position.bar
            ? !!c.position.bar[lane][c.position.slot]
            : false;
        return (
          <i
            key={lane}
            className={cn('led', lit && 'fire')}
            style={{ ['--lit' as string]: LANE_DEFS[lane].color }}
            title={laneName(lane, c.view.A?.perc)}
          >
            {LED_CHAR[lane] ?? '·'}
          </i>
        );
      })}
    </div>
  );
}

/**
 * The header transport, from 1024px up.
 *
 * No lamps here: the plan puts the transport in the header and the read-out and
 * the lamps in the footer, and rendering `TransportLeds` in both put two strips
 * on screen at once — one more than the console ever had.
 */
export function StudioTransport() {
  const c = useStudio();
  const tapTempo = useTapTempo();

  return (
    <div className="studio-transport" role="group" aria-label="Transport">
      <Toggle
        className="tbtn play"
        pressed={c.playing}
        onPressedChange={c.togglePlay}
        label="Play or stop"
        keyshortcuts="Space"
      >
        {c.playing ? '■ Stop' : '▶ Play'}
      </Toggle>
      {/* It was a bare digit with a tooltip (E3). A header has room for a word
          and the number; the accessible name says the whole thing. */}
      <button
        type="button"
        className="tbtn"
        aria-label={`Count-in: ${countInLabel(c.countIn)}`}
        onClick={() => c.setCountIn((c.countIn + 1) % 3)}
      >
        Count-in <span className="mono">{c.countIn || 'off'}</span>
      </button>
      <div className="bpmbox">
        <div className="bpmval mono">
          {c.bpm}
          <sup>bpm</sup>
        </div>
        <input
          type="range"
          min={50}
          max={c.bpmCeiling}
          value={c.bpm}
          onChange={(e) => c.setBpm(Number(e.target.value))}
          aria-label="Tempo"
          aria-keyshortcuts="[ ]"
        />
        <button
          type="button"
          className="tbtn"
          aria-label="Tap tempo"
          title="Tap four times on the beat"
          onClick={tapTempo}
        >
          Tap
        </button>
      </div>
    </div>
  );
}

/**
 * The phone transport: the whole footer.
 *
 * A range input is no use under a thumb at this size, so tempo is a stepper —
 * and the empty third column is what keeps Play on the centre line however wide
 * the reading gets.
 */
export function PhoneTransport() {
  const c = useStudio();

  return (
    <div className="studio-transport-lg" role="group" aria-label="Transport">
      <div className="studio-tempo">
        <button
          type="button"
          className="studio-step"
          onClick={() => c.setBpm(c.bpm - 2)}
          aria-label="Slower"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="studio-bpm mono">
          {Math.round(c.bpm)} <small>bpm</small>
        </span>
        <button
          type="button"
          className="studio-step"
          onClick={() => c.setBpm(c.bpm + 2)}
          aria-label="Faster"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {/* Named for what it does, not what it is doing: the pressed state is
          the state, as on every other toggle (E19). */}
      <Toggle
        className="studio-play-lg"
        pressed={c.playing}
        onPressedChange={c.togglePlay}
        label="Play or stop"
        keyshortcuts="Space"
      >
        {c.playing ? <Square size={22} /> : <Play size={22} />}
      </Toggle>
      <div aria-hidden="true" />
    </div>
  );
}
