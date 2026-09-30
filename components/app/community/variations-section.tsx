import Link from 'next/link';

import { PatternCard } from '@/components/app/community/pattern-card';
import { Button } from '@/components/ui/button';
import type { PublicPatternCard, PublicSort } from '@/lib/app/breaks/community/public';
import { publicPath } from '@/lib/app/breaks/community/visibility';

/**
 * The published variations of a pattern, on its page (Phase 7A, D26). Direct
 * children only: a variation of a variation is on its own parent's page.
 * Newest first or most saved, paged by the same opaque cursor as `/explore`.
 */
export function VariationsSection({
  slug,
  variations,
  nextCursor,
  sort,
  styleLabel,
}: {
  slug: string;
  variations: PublicPatternCard[];
  nextCursor: string | null;
  sort: PublicSort;
  styleLabel: (style: string) => string;
}) {
  const href = (params: Record<string, string>) =>
    `${publicPath(slug)}?${new URLSearchParams(params).toString()}#variations`;
  const other: PublicSort = sort === 'newest' ? 'saved' : 'newest';

  return (
    <section id="variations" aria-labelledby="variations-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="variations-heading" className="text-xl font-semibold">
          Variations
        </h2>
        {variations.length ? (
          <p className="text-sm">
            {sort === 'newest' ? 'Newest first' : 'Most saved first'} ·{' '}
            <Link href={href({ sort: other })}>
              {other === 'newest' ? 'show newest first' : 'show most saved first'}
            </Link>
          </p>
        ) : null}
      </div>
      {variations.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {variations.map((v) => (
            <PatternCard key={v.slug} pattern={v} styleLabel={styleLabel(v.style)} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Nobody has published a variation of this pattern yet. Save one, change it, and publish it
          — it will be listed here, credited to this one.
        </p>
      )}
      {nextCursor ? (
        <Button asChild variant="outline">
          <Link href={href({ sort, cursor: nextCursor })}>More variations</Link>
        </Button>
      ) : null}
    </section>
  );
}
