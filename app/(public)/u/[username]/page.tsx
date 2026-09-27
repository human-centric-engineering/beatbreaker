import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { PatternCard } from '@/components/app/community/pattern-card';
import { Button } from '@/components/ui/button';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { getPublicProfile, listPublished } from '@/lib/app/breaks/community/public';

/**
 * A drummer's public page — `/u/[username]` (Phase 6, task 6.8): the
 * username, what they wrote about themselves, and what they have published.
 *
 * The username and bio are all there is about the person: never the account
 * name or email (D3). Only published patterns are listed; link shares are
 * never on it. An unknown username is a 404.
 */

const readProfile = cache((username: string) => getPublicProfile(username));

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await readProfile((await params).username);
  if (!profile) return { title: 'Not found', robots: { index: false } };
  return {
    title: `@${profile.username}`,
    description: profile.bio ?? `Drum patterns published by @${profile.username} on BeatBreaker.`,
    alternates: { canonical: `/u/${profile.username}` },
  };
}

export default async function DrummerPage({ params, searchParams }: Props) {
  const profile = await readProfile((await params).username);
  if (!profile) notFound();
  const raw = (await searchParams).cursor;
  const cursor = typeof raw === 'string' ? raw : undefined;

  const [{ patterns, nextCursor }, catalogue] = await Promise.all([
    listPublished({ username: profile.username, sort: 'newest', limit: 24, cursor }),
    studioCatalogue(),
  ]);

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">@{profile.username}</h1>
        {profile.bio ? <p className="whitespace-pre-line">{profile.bio}</p> : null}
      </header>

      {patterns.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((p) => (
            <PatternCard
              key={p.slug}
              pattern={p}
              styleLabel={catalogue.styles[p.style]?.params.label ?? p.style}
              showAuthor={false}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nothing published yet.</p>
      )}

      {nextCursor ? (
        <Button asChild variant="outline">
          <Link href={`/u/${profile.username}?cursor=${encodeURIComponent(nextCursor)}`}>
            More patterns
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
