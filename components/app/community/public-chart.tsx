import { EngravedThumbnail } from '@/components/app/home/engraved-thumbnail';
import { engrave } from '@/lib/app/breaks/engrave';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { breakDocFromPayload } from '@/lib/app/breaks/share';

/** Bars per line on the public page — wide enough to read, narrow enough for a phone to scale. */
const PER_SYSTEM = 2;

/**
 * A shared pattern's chart, engraved on the server (Phase 6, task 6.6), so
 * the page's first paint — and a crawler, and a link preview — has the
 * notation in the HTML rather than after a script runs.
 *
 * Both sections, at the full layer, with the counting guide. The player below
 * changes what is heard, not what is drawn.
 */
export function PublicChart({ payload }: { payload: SharePayload }) {
  const doc = breakDocFromPayload(payload);
  const sections = [
    ['A', doc.A],
    ['B', doc.B],
  ] as const;
  return (
    <div className="space-y-6">
      {sections.map(([letter, pattern]) => (
        <figure key={letter} className="space-y-1">
          <figcaption className="text-muted-foreground font-mono text-xs">
            Section {letter}
          </figcaption>
          <EngravedThumbnail
            engraving={engrave(pattern, null, { scale: 1, perSystem: PER_SYSTEM, guides: true })}
          />
        </figure>
      ))}
    </div>
  );
}
