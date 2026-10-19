'use client';

import { Pause, Play, Square } from 'lucide-react';
import { useRef } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { TempoControl } from '@/components/app/studio/tempo-control';
import { Toggle } from '@/components/app/studio/toggle';
import { LANE_DEFS, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import type { LaneKey } from '@/lib/app/breaks/types';
import { cn } from '@/lib/utils';

/**
 * The phone's transport, and what the player's shares with it.
 *
 * From 640px up the transport is the player's bar (`player-bar.tsx`), over
 * the drummer or docked under the chart. On a phone it is the whole footer —
 * Play on the centre line with the tempo as one stepper cluster beside it,
 * because split either side of Play the two arrows looked like they did
 * different jobs (Spike A). Both read the same state; only one of the two is
 * in the layout at any width.
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
 * The phone transport: the whole footer.
 *
 * A range input is no use under a thumb at this size, so tempo is the stepper
 * and the number, without the slider — which is in the Practise drawer — and
 * Stop in the third column is what keeps Play on the centre line however wide
 * the reading gets. Play pauses, and Pause comes back in where it was: Stop is
 * the way back to the top, as it is on the player's bar.
 */
export function PhoneTransport() {
  const c = useStudio();

  return (
    <div className="studio-transport-lg" role="group" aria-label="Transport">
      <TempoControl className="studio-tempo" />
      {/* Named for what it does, not what it is doing: the pressed state is
          the state, as on every other toggle (E19). */}
      <Toggle
        className="studio-play-lg"
        pressed={c.playing}
        onPressedChange={c.togglePlay}
        label="Play or pause"
        keyshortcuts="Space"
      >
        {c.playing ? <Pause size={22} /> : <Play size={22} />}
      </Toggle>
      <button
        type="button"
        className="studio-stop-lg"
        onClick={c.stopToTop}
        disabled={!c.playing && c.cue === null}
        aria-label="Stop"
        title="Stop, and back to the top"
      >
        <Square size={16} fill="currentColor" />
      </button>
    </div>
  );
}
