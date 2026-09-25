import Link from 'next/link';
import { Plus } from 'lucide-react';

import { EngravedThumbnail } from '@/components/app/home/engraved-thumbnail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientDate } from '@/components/ui/client-date';
import { LAYER_NAMES } from '@/lib/app/breaks/layers';
import type { HomeCard, HomeView as HomeData } from '@/lib/app/breaks/saved/home';
import type { TargetView } from '@/lib/app/breaks/saved/targets';

/**
 * Home (task 4.9) — the signed-in landing page's body.
 *
 * A server component drawing what `readHome()` returned: nothing here fetches.
 * Copy is `site-copy.md` §6. The Published section and the community library
 * link wait for Phase 6.
 */

/** Where a target opens: a saved pattern at its address, a library entry through `?entry=`. */
export function studioHref(target: TargetView): string {
  return target.kind === 'break'
    ? `/studio/${target.id}`
    : `/studio?entry=${encodeURIComponent(target.id)}`;
}

function NewPattern() {
  return (
    <Button asChild>
      <Link href="/studio">
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        New pattern
      </Link>
    </Button>
  );
}

function PractisingCard({
  card,
  styleLabel,
}: {
  card: HomeCard;
  styleLabel: (key: string) => string;
}) {
  const { target } = card;
  const style = styleLabel(target.kind === 'break' ? target.style : target.styleKey);
  return (
    <li>
      <Card className="flex h-full flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{target.title}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {target.kind === 'entry' ? target.artist : style}
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <div className="bg-background rounded-md border p-2">
            {card.thumbnail ? (
              <EngravedThumbnail engraving={card.thumbnail} />
            ) : (
              <p className="text-muted-foreground py-6 text-center text-xs">No preview</p>
            )}
          </div>
          <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            {target.kind === 'entry' ? (
              <>
                <dt>Style</dt>
                <dd>{style}</dd>
              </>
            ) : null}
            <dt>Tempo</dt>
            <dd>
              {card.bpm} BPM · {LAYER_NAMES[card.level] ?? `Layer ${card.level}`}
            </dd>
            <dt>Last opened</dt>
            <dd>{card.lastOpenedAt ? <ClientDate date={card.lastOpenedAt} /> : 'Not yet'}</dd>
          </dl>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" size="sm">
            <Link href={studioHref(target)} aria-label={`Continue ${target.title}`}>
              Continue
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </li>
  );
}

export function HomeView({
  home,
  styleLabel,
}: {
  home: HomeData;
  /** A style key as the picker names it; the key itself for one not in the catalogue. */
  styleLabel: (key: string) => string;
}) {
  const { practising, recent, savedCount } = home;

  if (practising.length === 0 && recent.length === 0 && savedCount === 0) {
    return (
      <section className="space-y-4" aria-labelledby="home-welcome">
        <h1 id="home-welcome" className="text-3xl font-bold">
          Welcome to BeatBreaker
        </h1>
        <p className="text-muted-foreground max-w-prose">
          Nothing here yet. Press <strong>New pattern</strong>, pick a style, and save the first one
          you like. It will show up here.
        </p>
        <NewPattern />
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Home</h1>
        <NewPattern />
      </div>

      <section className="space-y-3" aria-labelledby="home-practising">
        <h2 id="home-practising" className="text-xl font-semibold">
          Practising
        </h2>
        {practising.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {practising.map((card) => (
              <PractisingCard key={card.pinId} card={card} styleLabel={styleLabel} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Pin the patterns you are practising this week and they will stay at the top.
          </p>
        )}
      </section>

      {recent.length ? (
        <section className="space-y-3" aria-labelledby="home-recent">
          <h2 id="home-recent" className="text-xl font-semibold">
            Recent
          </h2>
          <ul className="divide-y rounded-md border">
            {recent.map((visit) => (
              <li key={visit.id}>
                <Link
                  href={studioHref(visit.target)}
                  className="hover:bg-muted flex min-h-11 items-center justify-between gap-4 px-4 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{visit.target.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {visit.target.kind === 'entry'
                        ? visit.target.artist
                        : styleLabel(visit.target.style)}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {visit.bpm} BPM · <ClientDate date={visit.visitedAt} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
