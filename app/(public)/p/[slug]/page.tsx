import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { PatternActions } from '@/components/app/community/pattern-actions';
import { PatternPlayer } from '@/components/app/community/pattern-player';
import { PublicChart } from '@/components/app/community/public-chart';
import { ReferenceEmbeds } from '@/components/app/community/reference-embeds';
import { Button } from '@/components/ui/button';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { difficultyLabel } from '@/lib/app/breaks/community/grid';
import { getPublicPattern, openableIdForSlug } from '@/lib/app/breaks/community/public';
import { publicPath, slugSchema } from '@/lib/app/breaks/community/visibility';
import { meterOf } from '@/lib/app/breaks/meter';
import { getServerSession } from '@/lib/auth/utils';

/**
 * One shared or published pattern — `/p/[slug]` (Phase 6, task 6.6). Public:
 * a signed-out visitor reads it and plays it (D2).
 *
 * The chart is engraved on the server, so it is in the first paint and in
 * what a crawler or a chat app's link preview reads. The player is a small
 * client component over the Studio's engine. Signed in, a reader can save a
 * copy or open it in the editor; signed out, they are asked to make an
 * account for that.
 *
 * A pattern shared by link is `noindex`: it is reachable by whoever has the
 * link and nobody else, and a search engine is not one of them. Published
 * patterns are indexable and in the sitemap.
 *
 * Copy is `planning/site-copy.md` §5.
 */

const readPattern = cache(async (raw: string) => {
  const slug = slugSchema.safeParse(raw);
  return slug.success ? getPublicPattern(slug.data) : null;
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pattern = await readPattern(slug);
  if (!pattern) return { title: 'Pattern not found', robots: { index: false } };
  const by = pattern.author ? ` by @${pattern.author}` : '';
  const description =
    pattern.description ??
    `A drum pattern${by} — ${pattern.meter} at ${pattern.bpm} bpm. Read it and play it on BeatBreaker.`;
  return {
    title: `${pattern.title}${by}`,
    description,
    alternates: { canonical: publicPath(pattern.slug) },
    robots: pattern.visibility === 'published' ? undefined : { index: false, follow: false },
    openGraph: { title: `${pattern.title}${by}`, description, type: 'article' },
    twitter: { card: 'summary_large_image', title: `${pattern.title}${by}`, description },
  };
}

export default async function PublicPatternPage({ params }: Props) {
  const { slug } = await params;
  const pattern = await readPattern(slug);
  if (!pattern) notFound();

  const [session, catalogue] = await Promise.all([getServerSession(), studioCatalogue()]);
  const id = session ? await openableIdForSlug(pattern.slug) : null;
  const style = catalogue.styles[pattern.style]?.params.label ?? pattern.style;

  return (
    <article className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{pattern.title}</h1>
        <p className="text-muted-foreground">
          {pattern.author ? (
            <>
              by <Link href={`/u/${pattern.author}`}>@{pattern.author}</Link> ·{' '}
            </>
          ) : null}
          {style} · {meterOf(pattern.meter).label} · {pattern.bpm} bpm
          {difficultyLabel(pattern.difficulty) ? ` · ${difficultyLabel(pattern.difficulty)}` : ''}
        </p>
        {pattern.basedOn ? (
          <p className="text-muted-foreground text-sm italic">
            Based on <Link href={publicPath(pattern.basedOn.slug)}>“{pattern.basedOn.title}”</Link>{' '}
            by @{pattern.basedOn.username}
          </p>
        ) : null}
        {pattern.description ? <p className="whitespace-pre-line">{pattern.description}</p> : null}
      </header>

      <PatternPlayer payload={pattern.doc} kits={catalogue.kits} />

      <PublicChart payload={pattern.doc} />

      <ReferenceEmbeds links={pattern.links} />

      {id ? (
        <PatternActions id={id} />
      ) : (
        <aside className="bg-muted/50 space-y-3 rounded-lg border p-4">
          <p>
            You can read and play this pattern here. Create a free account to save a copy, slow it
            down by layers, and edit it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/signup?callbackUrl=${encodeURIComponent(publicPath(pattern.slug))}`}>
                Create a free account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/login?callbackUrl=${encodeURIComponent(publicPath(pattern.slug))}`}>
                Sign in
              </Link>
            </Button>
          </div>
        </aside>
      )}
    </article>
  );
}
