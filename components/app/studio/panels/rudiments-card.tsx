'use client';

import { Row, tempo } from '@/components/app/studio/panels/patterns-panel';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { libraryGroups } from '@/lib/app/breaks/catalogue/types';
import { RUDIMENTS_LIBRARY } from '@/lib/app/breaks/library';

/**
 * The rudiments, in Generate (Phase 10): the forty on their six shelves, each
 * shelf folded until opened. A row opens the rudiment on the stage and closes
 * the drawer, as picking a style does; its menu adds it to a practice
 * session, as a drawer row's does. Nothing shows without the library.
 */
export function RudimentsCard({ onClose }: { onClose?: () => void }) {
  const c = useStudio();
  const library = c.catalogue.libraries.find((l) => l.key === RUDIMENTS_LIBRARY);
  if (!library?.entries.length) return null;

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Rudiments</h3>
      </div>
      <div className="card-bd">
        <div className="hint">
          The forty International Drum Rudiments, with the sticking under every note.{' '}
          <StudioHelp title="Rudiments">
            Each is on the snare, with its sticking printed under the notes and played by the
            drummer. The rolls are written open, each double as two sixteenths: add one to a
            practice session and its climb takes it towards closed. Every layer plays a rudiment
            whole, and a rudiment is not written from a style, so New, Regenerate and the doctor
            leave it alone.
          </StudioHelp>
        </div>
        {libraryGroups(library).map(([group, items]) => (
          <details key={group} className="rudiment-shelf">
            <summary>
              {group} <span className="hint">· {items.length}</span>
            </summary>
            <div className="list">
              {items.map((item) => (
                <Row
                  key={item.id}
                  target={{ libraryEntryId: item.id }}
                  title={item.title}
                  sub={item.artist}
                  right={tempo(item.bpm, item.meter)}
                  hint={item.note ?? undefined}
                  onOpen={() => {
                    c.loadLibraryEntry(item.id);
                    c.say(item.note ? `${item.title} — ${item.note}` : `${item.title} loaded`);
                    onClose?.();
                  }}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
