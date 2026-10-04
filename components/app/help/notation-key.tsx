import { EngravedThumbnail } from '@/components/app/home/engraved-thumbnail';
import { notationKey } from '@/lib/app/breaks/notation-key';

/**
 * The notation key on `/help` (9-iv): how the chart writes every value each
 * lane can hold, drawn by the same engraver as the chart. Server-rendered.
 */
export function NotationKey() {
  return (
    <div className="space-y-6">
      {notationKey().map((row) => (
        <figure key={row.title} className="space-y-1">
          <figcaption className="font-medium">{row.title}</figcaption>
          <EngravedThumbnail engraving={row.engraving} />
          <ol className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {row.names.map((name, i) => (
              <li key={name}>
                <span className="font-mono">{i + 1}</span> {name}
              </li>
            ))}
          </ol>
        </figure>
      ))}
    </div>
  );
}
