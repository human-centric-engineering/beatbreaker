'use client';

import { Dice5 } from 'lucide-react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { randomPick, type OnStage } from '@/lib/app/breaks/catalogue/random-pick';

/**
 * Random, under New break: a drummer, a style or an exercise you did not
 * choose, each in proportion to how many patterns it has (`randomPick`), and
 * never what is on the stage already. Whichever it is plays back at the top
 * with a count-in, and is said once it is on the stage — not while the
 * unsaved-changes prompt is up, nor at all if that is cancelled. A style or
 * an exercise is nobody's in particular, so somebody from the cast sits in.
 */
export function RandomPickButton() {
  const c = useStudio();
  return (
    <button
      type="button"
      className="random-pick"
      title="A drummer, a style or an exercise, at random"
      onClick={() => {
        const A = c.view.A;
        const pin = c.stagePin;
        const entryId = pin && 'libraryEntryId' in pin ? pin.libraryEntryId : undefined;
        const stage: OnStage | undefined = entryId
          ? { entryId }
          : A
            ? { style: A.style, song: A.song?.split(':')[0] }
            : undefined;
        const pick = randomPick(c.catalogue, Math.random, stage);
        if (!pick) return;
        const onLoaded = () => {
          if (pick.kind !== 'drummer') c.recast();
          c.say(`Random ${pick.kind}: ${pick.label}`);
        };
        const opts = { fromTop: true, onLoaded };
        if (pick.kind === 'exercise') c.loadLibraryEntry(pick.entryId, undefined, opts);
        else c.newBreakIn(pick.style, pick.song, opts);
      }}
    >
      <Dice5 size={15} aria-hidden="true" />
      <span>Random</span>
    </button>
  );
}
