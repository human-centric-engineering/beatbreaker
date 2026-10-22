'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';

import { studioStyleHref } from '@/components/app/shell/studio-address';
import { notScoredLine } from '@/lib/app/lineage/search';

/**
 * What the style picker says when nothing in the crate matches (D75): the
 * index's answer for the same words, so a search for a song the Studio does
 * not play yet names the drummer and says it is not scored, rather than
 * finding nothing; a scored song the crate's search missed opens in the
 * Studio from here. Asked of `GET /api/v1/catalogue/index` a moment after the
 * typing stops; three characters or more.
 */

const person = z.object({ slug: z.string(), label: z.string(), candidate: z.boolean() });
const resultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    drummers: z.array(person),
    bands: z.array(z.object({ name: z.string(), drummers: z.array(person) })),
    songs: z.array(
      z.object({
        title: z.string(),
        artist: z.string(),
        year: z.number(),
        drummers: z.array(person),
        scored: z.object({ styleKey: z.string(), songKey: z.string() }).nullable(),
      })
    ),
  }),
});
type IndexAnswer = z.infer<typeof resultSchema>['data'];

/** How long after the last key the index is asked. */
const SETTLE_MS = 250;
/** The most lines of each kind shown. */
const SHOWN = 5;

function names(people: z.infer<typeof person>[]): string {
  return people.map((p) => p.label).join(', ');
}

export function IndexFallback({ query }: { query: string }) {
  const typed = query.trim();
  const [answer, setAnswer] = useState<{ for: string; data: IndexAnswer } | null>(null);

  useEffect(() => {
    if (typed.length < 3) return;
    const ask = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/v1/catalogue/index?${new URLSearchParams({ q: typed }).toString()}`, {
        signal: ask.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: unknown) => {
          const read = resultSchema.safeParse(json);
          if (read.success) setAnswer({ for: typed, data: read.data.data });
        })
        // nothing to add to "nothing matches" when the index cannot be asked
        .catch(() => undefined);
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      ask.abort();
    };
  }, [typed]);

  if (typed.length < 3 || answer?.for !== typed) return null;
  const { songs, drummers, bands } = answer.data;
  const unbuilt = drummers.filter((d) => d.candidate);
  if (songs.length + unbuilt.length + bands.length === 0) return null;

  return (
    <ul className="pick-index" aria-label="In the index">
      {songs.slice(0, SHOWN).map((s, i) => (
        // by position: the index answers one hit per song, but a key need not trust that
        <li key={`song/${i}`}>
          {s.scored ? (
            <a href={studioStyleHref(s.scored.styleKey, s.scored.songKey)}>
              {s.artist}: {s.title}
            </a>
          ) : (
            notScoredLine(s)
          )}
          {s.drummers.length > 0 && <> — {names(s.drummers)}</>}
        </li>
      ))}
      {bands.slice(0, SHOWN).map((b, i) => (
        <li key={`band/${i}`}>
          {b.name}: {names(b.drummers)}
        </li>
      ))}
      {unbuilt.slice(0, SHOWN).map((d) => (
        <li key={`drummer/${d.slug}`}>{d.label} is on the long list, not built yet</li>
      ))}
    </ul>
  );
}
