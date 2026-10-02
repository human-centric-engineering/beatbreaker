import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { SignUpStrip } from '@/components/app/community/sign-up-strip';
import { SharedSessionActions } from '@/components/app/practice/shared-session-actions';
import { Button } from '@/components/ui/button';
import { layerName } from '@/lib/app/breaks/layers';
import { publicPath, slugSchema } from '@/lib/app/breaks/community/visibility';
import { getPublicSession, ownSharedSessionId } from '@/lib/app/breaks/saved/session-sharing';
import { SHAPE_LABEL } from '@/lib/app/practice/climb';
import { sharedSessionPath } from '@/lib/app/practice/items';
import { getServerSession } from '@/lib/auth/utils';
import type { PublicSessionItem } from '@/lib/validations/practice-sessions';

/**
 * One shared practice session — `/s/[slug]` (Phase 7D, D32). Public: a
 * signed-out visitor reads it; running it needs an account.
 *
 * Each pattern links to where it opens — its `/p/` page, or a famous break in
 * the Studio, which asks a signed-out visitor to sign in and then opens it. A
 * pattern its owner has made private since is _No longer shared_, with its
 * minutes and nothing else.
 *
 * Signed in, the session's owner gets _Edit_ and _Run it_ — _Run it_ even when
 * every pattern has gone private since, because a private pattern is still
 * theirs to play, as it is in the editor. Anyone else gets _Save to my
 * sessions_ and _Run it_, both of which make a copy of their own first (its
 * targets their own speeds). Signed out, the sign-up strip.
 *
 * Always `noindex`: a session is shared by link and never listed (D34).
 */

const readSession = cache(async (raw: string) => {
  const slug = slugSchema.safeParse(raw);
  return slug.success ? getPublicSession(slug.data) : null;
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await readSession((await params).slug);
  if (!found) return { title: 'Practice session not found', robots: { index: false } };
  const by = found.author ? ` by @${found.author}` : '';
  const description =
    found.description ??
    `A ${found.totalMinutes}-minute drum practice session${by}: each pattern climbs to its target tempo and holds it.`;
  return {
    title: `${found.name}${by}`,
    description,
    alternates: { canonical: sharedSessionPath(found.slug) },
    robots: { index: false, follow: false },
    openGraph: { title: `${found.name}${by}`, description, type: 'article' },
  };
}

/** How a slot climbs, in words: "Steady climb for 67% of the time, then holds". */
function climbWords(item: Extract<PublicSessionItem, { available: true }>): string {
  const shape =
    item.climbShape === 'steps'
      ? `${SHAPE_LABEL.steps} climb, ${item.climbSteps} of them`
      : `${SHAPE_LABEL[item.climbShape]} climb`;
  return item.climbPct >= 100
    ? `${shape} for the whole time`
    : `${shape} for ${item.climbPct}% of the time, then holds`;
}

export default async function SharedSessionPage({ params }: Props) {
  const { slug } = await params;
  const found = await readSession(slug);
  if (!found) notFound();

  const session = await getServerSession();
  const ownId = session ? await ownSharedSessionId(found.slug, session.user.id) : null;
  const runnable = found.items.some((i) => i.available);
  const count = found.items.length;

  return (
    <article className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Practice session
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{found.name}</h1>
        <p className="text-muted-foreground">
          {found.author ? (
            <>
              by <Link href={`/u/${found.author}`}>@{found.author}</Link> ·{' '}
            </>
          ) : null}
          {found.totalMinutes} minutes · {count} {count === 1 ? 'pattern' : 'patterns'}
          {found.countIn > 0
            ? ` · ${found.countIn === 1 ? 'a bar' : `${found.countIn} bars`} of count-in before each`
            : ''}
        </p>
        {found.description ? <p className="whitespace-pre-line">{found.description}</p> : null}
      </header>

      <ol className="space-y-3">
        {found.items.map((item, index) => (
          <li key={item.position} className="rounded-lg border p-4">
            {item.available ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                    <Link
                      href={
                        item.link.kind === 'pattern'
                          ? publicPath(item.link.slug)
                          : `/studio?entry=${item.link.id}`
                      }
                    >
                      {item.title}
                    </Link>
                  </h2>
                  <span className="text-muted-foreground text-sm">
                    {item.minutes} min · {layerName(item.level)}
                  </span>
                </div>
                <p>
                  {item.startBpm} → <strong>{item.targetBpm} bpm</strong>
                </p>
                <p className="text-muted-foreground text-sm">{climbWords(item)}</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-muted-foreground">
                  <span className="mr-2">{index + 1}.</span>
                  <em>No longer shared</em>
                </p>
                <span className="text-muted-foreground text-sm">
                  {item.minutes} min · skipped when it runs
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>

      {!session ? (
        <SignUpStrip path={sharedSessionPath(found.slug)}>
          You can read this session here. Create a free account to save it and run it: each pattern
          starts below its target, climbs to it and holds it, with the targets set from your own
          speeds.
        </SignUpStrip>
      ) : ownId ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground w-full text-sm">This is your session.</p>
          <Button asChild variant="outline">
            <Link href={`/practice/${ownId}`}>Edit it</Link>
          </Button>
          <Button asChild>
            <Link href={`/studio?session=${ownId}`}>Run it</Link>
          </Button>
        </div>
      ) : (
        <SharedSessionActions slug={found.slug} runnable={runnable} />
      )}
    </article>
  );
}
