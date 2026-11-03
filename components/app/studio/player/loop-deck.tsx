'use client';

import { Repeat } from 'lucide-react';
import { useState } from 'react';

import { Slider } from '@/components/app/studio/panels/controls';
import { PlayerPop } from '@/components/app/studio/player/player-pop';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { playableSlots } from '@/lib/app/breaks/audio/transport';
import { type BarLoop, lastSlot, loopSpan, loopSpot, loopWords } from '@/lib/app/breaks/bar-loop';
import { cn } from '@/lib/utils';

/**
 * A loop over a range of bars (16-b-vi): which bars of a slot play, round
 * and round, so two bars of a 32-bar verse can be drilled without the rest.
 *
 * The slot is the loop's, where one is on; else the one the playhead is in,
 * a Pause left or a skip cued, else the first that plays. While a loop is on
 * the bars move it as they are dragged; while it is off they say what
 * _Loop_ will loop: the bar you are in, as it plays, until they are moved.
 * _To slot_ runs it on into a later slot, its bars between played whole. R loops the bar you are in from
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
     until a slider is moved; then the bars moved to, from that slot. */
  const [draft, setDraft] = useState<BarLoop | null>(null);

  if (!spot || !letter || !bars) {
    return <p className="hint">Nothing is playing that has bars to loop.</p>;
  }
  const mine = draft && draft.slot === spot.slot ? draft : null;
  const range = c.barLoop ?? mine ?? { slot: spot.slot, from: spot.barIdx, to: spot.barIdx };
  const slots = c.arrangement.length;
  const end = Math.min(Math.max(lastSlot(range), spot.slot), slots - 1);
  const endLetter = c.arrangement[end];
  const endBars = c.view[endLetter]?.bars.length || 1;
  const one = end === spot.slot;
  const from = Math.min(range.from, bars - 1);
  const to = Math.min(one ? Math.max(range.to, from) : range.to, endBars - 1);
  /** The loop the panel shows, moved: on the Studio while one is on, else the draft. */
  const put = (next: { from: number; to: number; end: number }) => {
    const loop = loopSpan(
      { slot: spot.slot, barIdx: next.from },
      { slot: next.end, barIdx: next.to }
    );
    if (c.barLoop) c.setBarLoop(loop);
    else setDraft(loop);
  };
  const shown = loopSpan({ slot: spot.slot, barIdx: from }, { slot: end, barIdx: to });

  return (
    <div className="loop-deck">
      <p className="hint mono">
        {one
          ? `${letter} · slot ${spot.slot + 1} · ${loopWords(shown)} of ${bars}`
          : `${letter} bar ${from + 1} · slot ${spot.slot + 1} → ${endLetter} bar ${to + 1} · slot ${end + 1}`}
      </p>
      <Slider
        label="From bar"
        value={from + 1}
        min={1}
        max={bars}
        onChange={(n) => put({ from: n - 1, to: one ? Math.max(n - 1, to) : to, end })}
      />
      {slots > 1 ? (
        <Slider
          label="To slot"
          value={end + 1}
          min={spot.slot + 1}
          max={slots}
          onChange={(n) => {
            const next = n - 1;
            const nBars = c.view[c.arrangement[next]]?.bars.length || 1;
            // into another slot, the loop runs to its end; back to its own, to the bar it starts on
            const last = next === spot.slot ? from : nBars - 1;
            put({ from, to: last, end: next });
          }}
        />
      ) : null}
      <Slider
        label="To bar"
        value={to + 1}
        min={1}
        max={endBars}
        onChange={(n) => put({ from: one ? Math.min(from, n - 1) : from, to: n - 1, end })}
      />
      {/* One name whether it is on or not (E19): lit while these bars loop. */}
      <Toggle
        className={drawer ? 'mini' : 'player-chip'}
        pressed={!!c.barLoop}
        onPressedChange={(on) => c.setBarLoop(on ? shown : null)}
        label="Loop these bars"
        keyshortcuts="R"
      >
        Loop
      </Toggle>
      <p className="hint">
        R loops the bar you are in. On the chart, drag across bars to loop them; Shift-click a
        chapter to loop on to it. A skip or a plain click on a chapter goes back to the whole break.
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
