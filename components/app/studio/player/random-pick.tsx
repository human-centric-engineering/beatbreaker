'use client';

import { Dice5 } from 'lucide-react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { randomPick } from '@/lib/app/breaks/catalogue/random-pick';

/**
 * Random, under New break: a drummer, a style or an exercise you did not
 * choose, each in proportion to how many patterns it has (`randomPick`). A
 * drummer or a style plays one of its songs or grooves, back at the top with a
 * count-in; an exercise opens as it would from its shelf.
 */
export function RandomPickButton() {
  const c = useStudio();
  return (
    <button
      type="button"
      className="random-pick"
      title="A drummer, a style or an exercise, at random"
      onClick={() => {
        const pick = randomPick(c.catalogue, Math.random);
        if (!pick) return;
        if (pick.kind === 'exercise') {
          const entry = c.catalogue.libraries
            .flatMap((l) => l.entries)
            .find((e) => e.id === pick.entryId);
          c.loadLibraryEntry(pick.entryId);
          if (entry) c.say(`Random exercise: ${entry.title}`);
          return;
        }
        const st = c.catalogue.styles[pick.style]?.params;
        const song = st?.songs?.find((sg) => sg.key === pick.song);
        c.restartFromTop();
        if (!c.newBreakIn(pick.style, pick.song)) return;
        const who = st?.label ?? pick.style;
        c.say(`Random ${pick.kind}: ${who}${song ? ` — ${song.title}` : ''}`);
      }}
    >
      <Dice5 size={15} aria-hidden="true" />
      <span>Random</span>
    </button>
  );
}
