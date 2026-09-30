import Link from 'next/link';

import { ReportButton } from '@/components/app/community/report-button';
import { SpeedVideo } from '@/components/app/community/speed-video';
import { Button } from '@/components/ui/button';
import type { SpeedTableRow } from '@/lib/app/breaks/community/speed-tables';
import { publicPath } from '@/lib/app/breaks/community/visibility';
import { LAYER_NAMES } from '@/lib/app/breaks/layers';

/**
 * The _Speeds_ section on a published pattern's page (Phase 7C): its table at
 * one layer — one row per drummer, their best — with a layer switcher and a
 * _Video only_ filter. `?speeds=` picks the layer, `?video=1` the filter and
 * `?speedsCursor=` the page, so the section works without JavaScript and a
 * link to it lands on the same rows.
 *
 * What it lists is what `GET /api/v1/public/patterns/:slug/speeds` lists —
 * the page reads the same function. The page says the speeds are
 * self-reported (D25); a signed-in reader can report a row that is not
 * theirs.
 */
export function SpeedsSection({
  slug,
  title,
  rows,
  total,
  nextCursor,
  level,
  videoOnly,
  signedIn,
  viewer,
}: {
  slug: string;
  title: string;
  rows: SpeedTableRow[];
  total: number;
  nextCursor: string | null;
  level: number;
  videoOnly: boolean;
  signedIn: boolean;
  /** The reader's username, so their own row offers no Report. */
  viewer: string | null;
}) {
  const href = (q: { level?: number; video?: boolean; cursor?: string }) => {
    const params = new URLSearchParams();
    params.set('speeds', String(q.level ?? level));
    if (q.video ?? videoOnly) params.set('video', '1');
    if (q.cursor) params.set('speedsCursor', q.cursor);
    return `${publicPath(slug)}?${params.toString()}#speeds`;
  };

  return (
    <section id="speeds" aria-labelledby="speeds-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="speeds-heading" className="text-lg font-semibold">
          Speeds
        </h2>
        <p className="text-muted-foreground text-sm">
          The fastest each drummer says they can play it well. Speeds are self-reported; a video is
          what backs one up.
        </p>
      </div>

      <nav aria-label="Layer" className="flex flex-wrap gap-2">
        {Object.entries(LAYER_NAMES).map(([n, name]) => {
          const current = Number(n) === level;
          return (
            <Link
              key={n}
              href={href({ level: Number(n) })}
              aria-current={current ? 'true' : undefined}
              className={`rounded-md border px-3 py-1 text-sm ${current ? 'bg-foreground text-background' : ''}`}
              scroll={false}
            >
              {name}
            </Link>
          );
        })}
        <Link
          href={href({ video: !videoOnly })}
          aria-pressed={videoOnly}
          className={`rounded-md border border-dashed px-3 py-1 text-sm ${videoOnly ? 'bg-foreground text-background' : ''}`}
          scroll={false}
        >
          Video only
        </Link>
      </nav>

      {rows.length ? (
        <>
          <p className="text-muted-foreground text-sm">
            {total} drummer{total === 1 ? '' : 's'} at {LAYER_NAMES[level]}
            {videoOnly ? ', with a video' : ''}.
          </p>
          <ol className="divide-y rounded-lg border">
            {rows.map((r) => (
              <li key={r.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-muted-foreground w-6 text-right font-mono">
                    {r.position}
                  </span>
                  <Link href={`/u/${r.username}`} className="font-medium">
                    @{r.username}
                  </Link>
                  <span className="font-mono font-semibold">{r.bpm} bpm</span>
                  <span className="text-muted-foreground text-sm">{r.recordedAt.slice(0, 10)}</span>
                  {r.video ? (
                    <span className="rounded border px-1.5 text-xs tracking-wide uppercase">
                      video
                    </span>
                  ) : null}
                </div>
                {r.video ? (
                  <SpeedVideo url={r.video.url} title={`@${r.username} · ${title}`} />
                ) : null}
                {signedIn && viewer !== r.username ? <ReportButton speedId={r.id} /> : null}
              </li>
            ))}
          </ol>
          {nextCursor ? (
            <Button asChild variant="outline">
              <Link href={href({ cursor: nextCursor })} scroll={false}>
                More speeds
              </Link>
            </Button>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground">
          {videoOnly
            ? `No speeds with a video at ${LAYER_NAMES[level]} yet.`
            : `Nobody has recorded a speed at ${LAYER_NAMES[level]} yet. Open it in the Studio and mark yours from the Practise drawer.`}
        </p>
      )}
    </section>
  );
}
