import type { Metadata } from 'next';
import Link from 'next/link';

import { PatternCard } from '@/components/app/community/pattern-card';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { DIFFICULTY_LABELS } from '@/lib/app/breaks/community/grid';
import { listPublished } from '@/lib/app/breaks/community/public';
import { METERS, METER_KEYS } from '@/lib/app/breaks/meter';
import { readPublicListQuery } from '@/lib/validations/public-patterns';

/**
 * The community library — `/explore` (Phase 6, task 6.8). Public (D2).
 *
 * Reads the same `listPublished` the public API does, with the same query
 * schema, so a filter here and a filter on `GET /api/v1/public/patterns`
 * agree. The filters are a plain GET form: it works before any script loads,
 * and every filtered view has a URL to share. Copy is site-copy §4.
 */

export const metadata: Metadata = {
  title: 'Community library',
  description:
    'Drum patterns written and published by BeatBreaker users. Open one to read it, play it and practise it.',
  alternates: { canonical: '/explore' },
};

const TEMPO_LABELS = {
  slow: 'Slow (under 90)',
  medium: 'Medium (90–120)',
  fast: 'Fast (over 120)',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  const query = readPublicListQuery(await searchParams);
  const [{ patterns, nextCursor }, catalogue] = await Promise.all([
    listPublished(query),
    studioCatalogue(),
  ]);
  const label = (key: string) => catalogue.styles[key]?.params.label ?? key;

  const more = new URLSearchParams(
    Object.entries({ ...query, limit: undefined, cursor: nextCursor ?? undefined }).flatMap(
      ([k, v]) => (v === undefined ? [] : [[k, String(v)]])
    )
  );
  const select = 'min-w-40';

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Community library</h1>
        <p className="text-muted-foreground">
          Patterns published by people who use BeatBreaker. Open one to read it and play it. Sign in
          to save a copy and practise it properly.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-4" aria-label="Filter patterns">
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-style">Style</Label>
          <SelectMenu
            id="f-style"
            name="style"
            className={select}
            defaultValue={query.style ?? ''}
            groups={[
              { label: '', options: [{ value: '', label: 'Any' }] },
              ...catalogue.styleGroups.map(([group, keys]) => ({
                label: group,
                options: keys.map((k) => ({ value: k, label: label(k) })),
              })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-meter">Time signature</Label>
          <SelectMenu
            id="f-meter"
            name="meter"
            className={select}
            defaultValue={query.meter ?? ''}
            options={[
              { value: '', label: 'Any' },
              ...METER_KEYS.map((k) => ({ value: k, label: METERS[k].label })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-tempo">Tempo</Label>
          <SelectMenu
            id="f-tempo"
            name="tempo"
            className={select}
            defaultValue={query.tempo ?? ''}
            options={[
              { value: '', label: 'Any' },
              ...Object.entries(TEMPO_LABELS).map(([k, v]) => ({ value: k, label: v })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-difficulty">Difficulty</Label>
          <SelectMenu
            id="f-difficulty"
            name="difficulty"
            className={select}
            defaultValue={query.difficulty ? String(query.difficulty) : ''}
            options={[
              { value: '', label: 'Any' },
              ...Object.entries(DIFFICULTY_LABELS).map(([k, v]) => ({ value: k, label: v })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-sort">Sort by</Label>
          <SelectMenu
            id="f-sort"
            name="sort"
            className={select}
            defaultValue={query.sort}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'saved', label: 'Most saved' },
            ]}
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {patterns.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((p) => (
            <PatternCard key={p.slug} pattern={p} styleLabel={label(p.style)} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Nothing matches those filters yet. Try a different style — or write one and publish it.
        </p>
      )}

      {nextCursor ? (
        <Button asChild variant="outline">
          <Link href={`/explore?${more.toString()}`}>More patterns</Link>
        </Button>
      ) : null}
    </div>
  );
}
