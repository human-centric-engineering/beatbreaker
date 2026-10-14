'use client';

import type { NewItem } from '@/components/app/practice/session-api';
import { LibraryCard } from '@/components/app/studio/panels/library-card';
import type { CatalogueEntry } from '@/lib/app/breaks/catalogue/types';
import { POLYRHYTHMS_LIBRARY } from '@/lib/app/breaks/library';

/** The layers a ladder climbs, an entry at a time: the pulse alone, the cross-rhythm alone, the whole figure. */
export const LADDER_LAYERS = [1, 2, 5] as const;

/**
 * A shelf as a polyrhythm ladder (Phase 12): each entry three times running,
 * at its pulse, its cross-rhythm and the whole figure, each climbing to its
 * tempo — how a polyrhythm is learnt. Every entry: the session takes as many
 * whole entries as fit, and says so (`SessionFromShelf`'s `per`).
 */
export function ladderItems(entries: readonly CatalogueEntry[]): NewItem[] {
  return entries.flatMap((entry) =>
    LADDER_LAYERS.map((level) => ({ target: { libraryEntryId: entry.id }, level }))
  );
}

/** The polyrhythms, in Generate beside the rudiments (D59). See {@link LibraryCard}. */
export function PolyrhythmsCard({ onClose }: { onClose?: () => void }) {
  return (
    <LibraryCard
      libraryKey={POLYRHYTHMS_LIBRARY}
      title="Polyrhythms"
      intro="Two rhythms at once, learnt a stream at a time."
      help={
        <>
          Each entry is two streams: the pulse you count and the rhythm set against it. Layer 1
          plays the pulse alone, layer 2 the cross-rhythm alone, 3 both together, 4 both with their
          accents, and 5 the whole figure. Where the accents are the figure — threes over four, a
          3/4 laid over 4/4 — they are there from the start. Count either one: switch the count on
          the stage and layer 1 and the click follow the cross-rhythm instead. The chart numbers
          both counts, and where an entry names its hands the drummer plays them so, with the other
          handing on the next entry. A shelf can become a ladder session: each entry at its pulse,
          its cross-rhythm and in full, each climbing to its tempo.
        </>
      }
      shelfItems={ladderItems}
      shelfLabel="Make a ladder session from this shelf"
      shelfPer={LADDER_LAYERS.length}
      onClose={onClose}
    />
  );
}
