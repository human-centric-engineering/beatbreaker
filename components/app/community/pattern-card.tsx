import Link from 'next/link';

import { difficultyLabel } from '@/lib/app/breaks/community/grid';
import type { PublicPatternCard } from '@/lib/app/breaks/community/public';
import { publicPath } from '@/lib/app/breaks/community/visibility';
import { meterOf } from '@/lib/app/breaks/meter';

/**
 * One published pattern in the community library, `/explore` and `/u/…`.
 *
 * Reference links show as icons only (task 6.7): the card makes no request to
 * YouTube or Spotify, and the links themselves are on the pattern's page.
 */
export function PatternCard({
  pattern,
  styleLabel,
  showAuthor = true,
}: {
  pattern: PublicPatternCard;
  styleLabel: string;
  showAuthor?: boolean;
}) {
  const video = pattern.linkKinds.includes('video');
  const song = pattern.linkKinds.includes('song');
  return (
    <li className="bg-card hover:border-foreground/30 rounded-lg border p-4 transition-colors">
      <Link href={publicPath(pattern.slug)} className="block space-y-1">
        <span className="block font-semibold">{pattern.title}</span>
        {showAuthor && pattern.author ? (
          <span className="text-muted-foreground block text-sm">@{pattern.author}</span>
        ) : null}
        <span className="text-muted-foreground block text-sm">
          {styleLabel} · {meterOf(pattern.meter).label} · {pattern.bpm} bpm
          {difficultyLabel(pattern.difficulty) ? ` · ${difficultyLabel(pattern.difficulty)}` : ''}
        </span>
        <span className="text-muted-foreground flex gap-3 text-xs">
          {video ? <span aria-label="Has a video link">▶</span> : null}
          {song ? <span aria-label="Has a song link">♫</span> : null}
          {pattern.saves ? (
            <span>
              {pattern.saves} {pattern.saves === 1 ? 'save' : 'saves'}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
