import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';

import { studioStyleHref } from '@/components/app/shell/studio-address';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getLineageProfile } from '@/lib/app/lineage/data';
import {
  CONFIDENCE_LABELS,
  DEVICE_LABELS,
  EDGE_KIND_LABELS,
  isMapEdge,
} from '@/lib/app/lineage/layout';
import { readDrummerRecord } from '@/lib/app/lineage/record';
import { type Relation, relationsOf } from '@/lib/app/lineage/relations';
import { sanitizeUrl } from '@/lib/security/sanitize';

/**
 * One person in the lineage — `/drummers/[slug]` (Phase 11-b). Public.
 *
 * A drummer with a record gets the record: who they are, what marks their
 * playing and how sure each claim is, the rhythmic devices they play with the
 * sources for each (12-b), the recordings, and who they learned
 * from and passed it on to. **Play** opens the Studio on their style. Someone
 * the records only name (a stub) gets the links that name them.
 */

const slugSchema = z.string().min(1).max(120);

/** A source address worth linking to from a public page. */
const WEB_ADDRESS = /^https?:\/\//i;

/* Read once for the metadata and the page. A genre is a node too, but not a
   person: it has no page here. */
const profileFor = cache(async (slug: string) => {
  const read = slugSchema.safeParse(slug);
  const profile = read.success ? await getLineageProfile(read.data) : null;
  return profile && profile.node.kind !== 'style' ? profile : null;
});

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await profileFor(slug);
  if (!profile) return { title: 'Not found' };
  return {
    title: profile.node.label,
    description:
      profile.node.summary ??
      `${profile.node.label} in BeatBreaker's drummer lineage: who they learned from and who learned from them.`,
    alternates: { canonical: `/drummers/${profile.node.slug}` },
  };
}

function RelationList({ title, relations }: { title: string; relations: Relation[] }) {
  if (relations.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="space-y-1">
        {relations.map(({ node, edge }) => (
          <li key={edge.id} className="text-sm">
            <Link
              href={`/drummers/${node.slug}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {node.label}
            </Link>
            <span className="text-muted-foreground">
              {' '}
              · {isMapEdge(edge) ? EDGE_KIND_LABELS[edge.kind] : edge.kind}
              {edge.scope === 'band' && ' (through the band)'}
              {edge.confidence && ` · ${CONFIDENCE_LABELS[edge.confidence]}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function years(from: number | null, to: number | null, ongoing: boolean): string | null {
  if (from === null) return null;
  if (ongoing) return `${from}–`;
  return to === null || to === from ? String(from) : `${from}–${to}`;
}

export default async function DrummerPage({ params }: { params: Params }) {
  const { slug } = await params;
  const profile = await profileFor(slug);
  if (!profile) notFound();

  const { node } = profile;
  const record = node.modelled ? readDrummerRecord(profile.record) : null;
  const people = new Map(
    profile.neighbours.filter((n) => n.kind !== 'style').map((n) => [n.id, n])
  );
  const rel = relationsOf(node.id, profile.edges, people);
  /* On the map as `layoutLineage` places people: a record, or a link to a person. */
  const onMap =
    node.modelled ||
    profile.edges.some((e) => isMapEdge(e) && people.has(e.from === node.id ? e.to : e.from));
  const active = record
    ? years(record.activeFrom, record.activeTo, record.ongoing)
    : years(node.activeFrom, node.activeTo, false);

  return (
    <article className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-sm">
          <Link
            href="/drummers"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Drummers
          </Link>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{node.label}</h1>
        {record?.fullName && record.fullName !== node.label && (
          <p className="text-muted-foreground">{record.fullName}</p>
        )}
        <p className="text-muted-foreground text-sm">
          {[active && `Active ${active}`, record?.from.join(', '), record?.roles.join(', ')]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {record && record.descriptors.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="How they play">
            {record.descriptors.map((d) => (
              <li key={d}>
                <Badge variant="secondary">{d}</Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {node.styleKey ? (
            <Button asChild>
              <Link href={studioStyleHref(node.styleKey)}>Play in their style</Link>
            </Button>
          ) : node.modelled ? (
            <p className="text-muted-foreground text-sm">Their style is not in the Studio yet.</p>
          ) : null}
          {onMap && (
            <Button asChild variant="outline">
              <Link href={`/drummers?trace=${encodeURIComponent(node.slug)}`}>
                See them on the map
              </Link>
            </Button>
          )}
        </div>
      </header>

      {record?.summary && <p className="text-lg leading-relaxed">{record.summary}</p>}
      {record?.persona && (
        <p className="text-muted-foreground text-sm">
          Performs as a masked character: {record.persona} Their real identity is not part of the
          record.
        </p>
      )}
      {!record && (
        <p className="text-muted-foreground">
          {node.modelled
            ? 'This record could not be read.'
            : `${node.label} has no record of their own yet. They are here because the records below name them.`}
        </p>
      )}

      {record && record.traits.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What marks their playing</h2>
          <ul className="space-y-3">
            {record.traits.map((t) => (
              <li key={t.label}>
                <p className="font-medium">
                  {t.label}
                  {t.confidence && (
                    <span className="text-muted-foreground text-sm font-normal">
                      {' '}
                      · {CONFIDENCE_LABELS[t.confidence]}
                    </span>
                  )}
                </p>
                {t.description && <p className="text-muted-foreground text-sm">{t.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {record && record.techniques.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Technique</h2>
          <ul className="space-y-2">
            {record.techniques.map((t) => (
              <li key={t.name} className="text-sm">
                <span className="font-medium">{t.name}</span>
                {t.description && <span className="text-muted-foreground"> — {t.description}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {record && node.devices.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rhythmic devices</h2>
          <ul className="space-y-3">
            {node.devices.map((d) => (
              <li key={`${d.kind}-${d.ratio ?? ''}-${d.description}`} className="text-sm">
                <p className="font-medium">
                  {DEVICE_LABELS[d.kind]}
                  {d.ratio && ` ${d.ratio}`}
                  {d.where.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {d.where.join(', ')}
                    </span>
                  )}
                  {d.confidence && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {CONFIDENCE_LABELS[d.confidence]}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground">{d.description}</p>
                {d.examples.length > 0 && (
                  <p className="text-muted-foreground">Heard on: {d.examples.join('; ')}</p>
                )}
                <p className="text-muted-foreground">
                  {d.sources.length === 1 ? 'Source: ' : 'Sources: '}
                  {d.sources.map((src, i) => {
                    /* Only a web address is a link: a source may name a book,
                       or a path inside the repo, which is no use to a reader. */
                    const href = src.url && WEB_ADDRESS.test(src.url) ? sanitizeUrl(src.url) : '';
                    return (
                      <span key={`${i}-${src.title}`}>
                        {i > 0 && '; '}
                        {href ? (
                          <a
                            href={href}
                            rel="noopener noreferrer"
                            className="underline underline-offset-4"
                          >
                            {src.title}
                          </a>
                        ) : (
                          src.title
                        )}
                      </span>
                    );
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {record && record.eras.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Eras</h2>
          <ol className="space-y-2">
            {record.eras.map((e) => (
              <li key={e.label} className="text-sm">
                <span className="font-medium">{e.label}</span>
                {e.from !== null && (
                  <span className="text-muted-foreground"> · {years(e.from, e.to, false)}</span>
                )}
                {e.context && <p className="text-muted-foreground">{e.context}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {profile.recordings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recordings</h2>
          <ul className="space-y-1">
            {profile.recordings.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="font-medium">{r.title}</span>
                <span className="text-muted-foreground">
                  {' '}
                  — {r.artist}, {r.year}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <RelationList title="Learned from" relations={rel.learnedFrom} />
        <RelationList title="Passed on to" relations={rel.passedOnTo} />
      </div>
      <RelationList title="Around them" relations={rel.around} />

      {record && (
        <p className="text-muted-foreground border-t pt-4 text-xs">
          Every claim here carries its evidence in the record, with how sure it is.
          {record.status && ` This record is ${record.status.replaceAll('_', ' ')}.`} The grooves
          the Studio plays in their style are approximations from descriptions and listening, not
          transcriptions.
        </p>
      )}
    </article>
  );
}
