'use client';

import { Repeat } from 'lucide-react';
import { useState } from 'react';

import { Slider } from '@/components/app/studio/panels/controls';
import { PlayerPop } from '@/components/app/studio/player/player-pop';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { playableSlots } from '@/lib/app/breaks/audio/transport';
import { loopOver, loopSpot, loopWords } from '@/lib/app/breaks/bar-loop';
import { cn } from '@/lib/utils';

/**
 * A loop over a range of bars (16-b-vi): which bars of a slot play, round
 * and round, so two bars of a 32-bar verse can be drilled without the rest.
 *
 * The slot is the loop's, where one is on; else the one the playhead is in,
 * a Pause left or a skip cued, else the first that plays. While a loop is on
 * the bars move it as they are dragged; while it is off they say what
 * _Loop_ will loop: the bar you are in, as it plays, until they are moved. R loops the bar you are in from
 * anywhere, and on the chart a drag across bars loops them. `drawer` is the
 * phone's Practise drawer, on the paper rather than the player's dark bar.
 */
export function LoopDeck({ drawer }: { drawer?: boolean }) {
  const c = useStudio();
  const solo = c.viewMode === 'both' ? null : c.viewMode;
  const live = c.position && !c.position.count ? c.position : null;
  const at =
    live && live.secIdx !== undefined
      ? { slot: live.secIdx, barIdx: live.barIdx ?? 0 }
      : c.pausedAt
        ? { slot: c.pausedAt.slot, barIdx: c.pausedAt.barIdx }
        : null;
  const spot = c.barLoop
    ? { slot: c.barLoop.slot, barIdx: c.barLoop.from }
    : loopSpot(at, c.cue, playableSlots(c.arrangement, c.view, solo));
  const letter = spot ? c.arrangement[spot.slot] : undefined;
  const bars = (letter && c.view[letter]?.bars.length) || 0;

  /* What Loop will loop while none is on: the bar you are in, as R does,
     until a slider is moved; then the bars moved to, in that slot only. */
  const [draft, setDraft] = useState<{ slot: number; from: number; to: number } | null>(null);

  if (!spot || !letter || !bars) {
    return <p className="hint">Nothing is playing that has bars to loop.</p>;
  }
  const mine = draft && draft.slot === spot.slot ? draft : null;
  const range = c.barLoop ?? mine ?? { slot: spot.slot, from: spot.barIdx, to: spot.barIdx };
  const from = Math.min(range.from, bars - 1);
  const to = Math.min(Math.max(range.to, from), bars - 1);
  const move = (a: number, b: number) => {
    if (c.barLoop) c.setBarLoop(loopOver(spot.slot, a, b));
    else setDraft({ slot: spot.slot, from: Math.min(a, b), to: Math.max(a, b) });
  };

  return (
    <div className="loop-deck">
      <p className="hint mono">
        {letter} · slot {spot.slot + 1} · {loopWords({ slot: spot.slot, from, to })} of {bars}
      </p>
      <Slider
        label="From bar"
        value={from + 1}
        min={1}
        max={bars}
        onChange={(n) => move(n - 1, Math.max(n - 1, to))}
      />
      <Slider
        label="To bar"
        value={to + 1}
        min={1}
        max={bars}
        onChange={(n) => move(Math.min(from, n - 1), n - 1)}
      />
      {/* One name whether it is on or not (E19): lit while these bars loop. */}
      <Toggle
        className={drawer ? 'mini' : 'player-chip'}
        pressed={!!c.barLoop}
        onPressedChange={(on) => c.setBarLoop(on ? loopOver(spot.slot, from, to) : null)}
        label="Loop these bars"
        keyshortcuts="R"
      >
        Loop
      </Toggle>
      <p className="hint">
        R loops the bar you are in. On the chart, drag across bars to loop them. A skip or a chapter
        goes back to the whole break.
      </p>
    </div>
  );
}

/** The loop's button on the player's bar: its bars on its face while one is on. */
export function LoopPop() {
  const c = useStudio();
  return (
    <PlayerPop
      label="Loop bars"
      title="Loop bars"
      tip="Loop a range of bars (R)"
      icon={<Repeat size={18} />}
      face={c.barLoop ? loopWords(c.barLoop) : 'Loop'}
      className={cn('loop', c.barLoop && 'on')}
    >
      <LoopDeck />
    </PlayerPop>
  );
}
