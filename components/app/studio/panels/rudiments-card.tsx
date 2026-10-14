'use client';

import { LibraryCard } from '@/components/app/studio/panels/library-card';
import { RUDIMENTS_LIBRARY } from '@/lib/app/breaks/library';

/**
 * The rudiments, in Generate (Phase 10): the forty on their six shelves. See
 * {@link LibraryCard}.
 */
export function RudimentsCard({ onClose }: { onClose?: () => void }) {
  return (
    <LibraryCard
      libraryKey={RUDIMENTS_LIBRARY}
      title="Rudiments"
      intro="The forty International Drum Rudiments, with the sticking under every note."
      help={
        <>
          Each is on the snare, with its sticking printed under the notes and played by the drummer.
          The rolls are written open, each double as two sixteenths: add one to a practice session
          and its climb takes it towards closed. Every layer plays a rudiment whole, and a rudiment
          is not written from a style, so New, Regenerate and the doctor leave it alone.
        </>
      }
      onClose={onClose}
    />
  );
}
