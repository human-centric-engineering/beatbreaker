'use client';

import { Repeat } from 'lucide-react';
import { useState } from 'react';

import { Slider } from '@/components/app/studio/panels/controls';
import { PlayerPop } from '@/components/app/studio/player/player-pop';
import { useStudio } from '@/components/app/studio/studio-provider';
import { Toggle } from '@/components/app/studio/toggle';
import { playableSlots } from '@/lib/app/breaks/audio/transport';
import {
  type BarLoop,
  lastSlot,
  loopBars,
  loopReach,
  loopSpan,
  loopSpot,
  loopWords,
  slotName,
} from '@/lib/app/breaks/bar-loop';
import { cn } from '@/lib/utils';

/**
 * A loop over a range of bars (16-b-vi): which bars of a slot play, round
 * and round, so two bars of a 32-bar verse can be drilled without the rest.
 *
 * The slot is the loop's, where one is on; else the one the playhead is in,
 * a Pause left or a skip cued, else the first that plays. While a loop is on
 * the bars move it as they are dragged; while it is off they say what
 * _Loop_ will loop: the bar you are in, as it plays, until they are moved,
 * and then the bars moved to, as the music goes on, until Loop is pressed or
 * the panel shuts. _Loop to_ runs it on into a later slot, its bars between
 * played whole, as far as the slots a solo plays; back to a slot, it ends on
 * the bar it last did there. What it shows is what plays ({@link loopBars}):
 * an empty section at its end is passed over. R loops the bar you are in from
 * anywhere, and on the chart a drag across bars loops them. `drawer` is the
 * phone's Practise drawer, on the paper rather than the player's dark bar.
 */
export function LoopDeck({ drawer }: { drawer?: boolean }) {
  const c = useStudio();
  const solo = c.viewMode === 'both' ? null : c.viewMode;
  const barsIn = (slot: number) => c.view[c.arrangement[slot]]?.bars.length ?? 0;
  const plays = (slot: number) => {
    const letter = c.arrangement[slot];
    return !!c.view[letter] && (!solo || letter === solo);
  };

  /* What Loop will loop while none is on: the bar you are in, as R does,
     until a slider is moved; then the bars moved to, from that slot. */
  const [draft, setDraft] = useState<BarLoop | null>(null);
  /* The bar the loop last ended on in each slot Loop to has been to, from
     the slot it starts in, so going back to one finds it there. */
  const [ends, setEnds] = useState<{ slot: number; to: Record<number, number> } | null>(null);

  const live = c.position && !c.position.count ? c.position : null;
  const at =
    live && live.secIdx !== undefined
      ? { slot: live.secIdx, barIdx: live.barIdx ?? 0 }
      : c.pausedAt
        ? { slot: c.pausedAt.slot, barIdx: c.pausedAt.barIdx }
        : null;
  const kept = draft && plays(draft.slot) && barsIn(draft.slot) ? draft : null;
  const spot = c.barLoop
    ? { slot: c.barLoop.slot, barIdx: c.barLoop.from }
    : kept
      ? { slot: kept.slot, barIdx: kept.from }
      : loopSpot(at, c.cue, playableSlots(c.arrangement, c.view, solo));
  const letter = spot ? c.arrangement[spot.slot] : undefined;
  const bars = spot ? barsIn(spot.slot) : 0;

  if (!spot || !letter || !bars) {
    return <p className="hint">Nothing is playing that has bars to loop.</p>;
  }
  const range = c.barLoop ?? kept ?? { slot: spot.slot, from: spot.barIdx, to: spot.barIdx };
  // as far on as the loop can run unbroken: under a solo, the slots it plays
  const reach = loopReach(spot.slot, c.arrangement.length - 1, plays);
  const wanted = Math.min(Math.max(lastSlot(range), spot.slot), reach);
  const played = loopBars(
    loopSpan({ slot: spot.slot, barIdx: range.from }, { slot: wanted, barIdx: range.to }),
    c.arrangement,
    c.view
  );
  const shown = loopSpan(played[0], played[played.length - 1]);
  const { from, to } = shown;
  const end = lastSlot(shown);
  const endBars = barsIn(end);
  const one = end === spot.slot;
  const mark = (slot: number, bar: number) =>
    setEnds((was) => ({
      slot: spot.slot,
      to: { ...(was?.slot === spot.slot ? was.to : {}), [slot]: bar },
    }));
  /** The loop the panel shows, moved: on the Studio while one is on, else the draft. */
  const put = (next: { from: number; to: number; end: number }) => {
    const loop = loopSpan(
      { slot: spot.slot, barIdx: next.from },
      { slot: next.end, barIdx: next.to }
    );
    mark(next.end, next.to);
    if (c.barLoop) c.setBarLoop(loop);
    else setDraft(loop);
  };

  return (
    <div className="loop-deck">
      <p className="hint mono">
        {one
          ? `${slotName(c.arrangement, spot.slot)} · ${loopWords(shown, c.arrangement)} of ${bars}`
          : loopWords(shown, c.arrangement)}
      </p>
      <Slider
        label="From bar"
        value={from + 1}
        min={1}
        max={bars}
        onChange={(n) => put({ from: n - 1, to: one ? Math.max(n - 1, to) : to, end })}
      />
      {reach > spot.slot ? (
        <Slider
          label="Loop to"
          value={end + 1}
          min={spot.slot + 1}
          max={reach + 1}
          format={(n) => slotName(c.arrangement, n - 1)}
          onChange={(n) => {
            const next = n - 1;
            // back to a slot, the bar it ended on there; new to it, its last bar, or in its own the first
            const been = ends?.slot === spot.slot ? ends.to[next] : undefined;
            const last = been ?? (next === spot.slot ? from : Math.max(0, barsIn(next) - 1));
            mark(end, to);
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
        onPressedChange={(on) => {
          setDraft(null);
          c.setBarLoop(on ? shown : null);
        }}
        label="Loop these bars"
        keyshortcuts="R"
      >
        Loop
      </Toggle>
      <ul className="hint loop-help">
        <li>
          <b>A few bars:</b> drag across them on the chart, or press R to loop the bar you are in.
        </li>
        <li>
          <b>Whole sections, say B and C:</b> on the strip of section letters under the player,
          click B, then hold Shift and click C.
        </li>
        <li>
          <b>Exactly:</b> set From bar, Loop to and To bar above, then press Loop.
        </li>
        <li>A plain click on the strip, or a skip, plays the whole song again.</li>
      </ul>
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
      face={c.barLoop ? loopWords(c.barLoop, c.arrangement) : 'Loop'}
      className={cn('loop', c.barLoop && 'on')}
    >
      <LoopDeck />
    </PlayerPop>
  );
}
