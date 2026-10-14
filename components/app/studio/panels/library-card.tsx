'use client';

import type { ReactNode } from 'react';

import type { NewItem } from '@/components/app/practice/session-api';
import { SessionFromShelf } from '@/components/app/practice/session-from-shelf';
import { Row, tempo } from '@/components/app/studio/panels/patterns-panel';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { type CatalogueEntry, libraryGroups } from '@/lib/app/breaks/catalogue/types';

/**
 * A practice library as a card of its own in Generate: the rudiments (Phase
 * 10) and the polyrhythms (Phase 12, D59), each shelf folded until opened. A
 * row opens its entry on the stage and closes the drawer, as picking a style
 * does; its menu adds it to a practice session, as a drawer row's does. A
 * library may also turn a whole shelf into a session (`shelfItems`). Nothing
 * shows without the library.
 */
export function LibraryCard({
  libraryKey,
  title,
  intro,
  help,
  shelfItems,
  shelfLabel,
  onClose,
}: {
  libraryKey: string;
  title: string;
  /** One line under the heading. */
  intro: string;
  /** What the ⓘ beside it says. */
  help: ReactNode;
  /** The session a shelf makes, where the library offers one. */
  shelfItems?: (entries: CatalogueEntry[]) => NewItem[];
  /** What that button says. */
  shelfLabel?: string;
  onClose?: () => void;
}) {
  const c = useStudio();
  const library = c.catalogue.libraries.find((l) => l.key === libraryKey);
  if (!library?.entries.length) return null;

  return (
    <div className="card">
      <div className="card-hd">
        <h3>{title}</h3>
      </div>
      <div className="card-bd">
        <div className="hint">
          {intro} <StudioHelp title={title}>{help}</StudioHelp>
        </div>
        {libraryGroups(library).map(([group, items]) => (
          <details key={group} className="practice-shelf">
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
            {shelfItems ? (
              <SessionFromShelf
                shelf={group}
                items={shelfItems(items)}
                label={shelfLabel}
                compact
              />
            ) : null}
          </details>
        ))}
      </div>
    </div>
  );
}
