import { APIError, NotFoundError } from '@/lib/api/errors';
import { PUBLIC } from '@/lib/app/breaks/catalogue/data';
import { columnsFromDoc } from '@/lib/app/breaks/columns';
import { sectionHash } from '@/lib/app/breaks/community/grid';
import { usernameOf } from '@/lib/app/breaks/community/profile';
import { visibilityData, withFreshSlug } from '@/lib/app/breaks/community/sharing';
import { textIsBlocked } from '@/lib/app/breaks/community/words';
import {
  packedPatternSchema,
  type SharePayload,
  storedPayloadSchema,
} from '@/lib/app/breaks/schema';
import { patternFromPacked } from '@/lib/app/breaks/share';
import { prisma } from '@/lib/db/client';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * Publishing a pattern to the community library (Phase 6, task 6.9) — the one
 * place a row becomes `published`. **Server-side only.**
 *
 * In order, each refusal with its own code and the words to show:
 *
 * 1. `PUBLISHING_PAUSED` (403) — the `PATTERN_PUBLISHING` flag is off. A
 *    missing flag reads as off, so the switch fails closed.
 * 2. Not yours, or not saved — 404, as every other write.
 * 3. `USERNAME_REQUIRED` (409) — public work is credited to a username (D3).
 * 4. `NOT_ALLOWED` (422) — the title or description has a blocked word.
 * 5. `DUPLICATE` (409) — the notes are the same as another person's published
 *    pattern, or as a section of a famous break: publishing it would credit
 *    it to the wrong person. Your own earlier publication is not a duplicate.
 * 6. `PUBLISH_LIMIT` (429) — more than `PUBLISH_DAILY_CAP` first publications
 *    in 24 hours. Republishing a pattern keeps its first `publishedAt`, so it
 *    neither counts again nor jumps back to the top of Newest.
 *
 * Checks 4 and 5 are `assertPublishable`, which the PATCH route also runs on
 * any edit to a published pattern's title, description or notes.
 *
 * The title and description need no HTML sanitising: every surface renders
 * them as text through React, and nothing puts them in markup by hand (the Open
 * Graph image's SVG escapes its own text).
 */

export const PUBLISHING_FLAG = 'PATTERN_PUBLISHING';
/** First publications per person per 24 hours. */
export const PUBLISH_DAILY_CAP = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

function refuse(code: string, status: number, message: string): never {
  throw new APIError(message, code, status);
}

/** The famous breaks' section hashes, with what to call each. */
async function libraryHashes(): Promise<Map<string, string>> {
  const entries = await prisma.libraryEntry.findMany({
    where: { library: PUBLIC },
    select: { title: true, artist: true, doc: true },
  });
  const out = new Map<string, string>();
  for (const e of entries) {
    const packed = packedPatternSchema.safeParse(e.doc);
    if (!packed.success) continue;
    out.set(await sectionHash(patternFromPacked(packed.data)), `${e.title} (${e.artist})`);
  }
  return out;
}

export interface Published {
  id: string;
  visibility: 'published';
  slug: string;
  publishedAt: Date;
}

/**
 * The content checks every published pattern must pass — at publish, and
 * again whenever a published pattern's title, description or notes change
 * (`PATCH /api/v1/breaks/:id`), so an edit after publishing cannot put into
 * the library what publishing refuses. In order: a blocked word in the title
 * or description (`NOT_ALLOWED`, 422), then the same notes as someone else's
 * published pattern or as a section of a famous break (`DUPLICATE`, 409).
 * Returns the columns derived on the way, so the caller need not derive them
 * again.
 */
export async function assertPublishable(
  userId: string,
  content: { title: string; description: string | null; payload: SharePayload }
): Promise<Awaited<ReturnType<typeof columnsFromDoc>>> {
  if (textIsBlocked(content.title) || (content.description && textIsBlocked(content.description))) {
    refuse(
      'NOT_ALLOWED',
      422,
      "That title or description can't be published. Change the wording and try again."
    );
  }

  /* The hash is taken from the document now rather than trusted from the
     column: a row written before Phase 6 has none. */
  const derived = await columnsFromDoc(content.payload);
  const { decoded, columns } = derived;

  const copied = await prisma.break.findFirst({
    where: {
      gridHash: columns.gridHash,
      visibility: 'published',
      userId: { not: userId },
    },
    select: { title: true },
  });
  if (copied) {
    refuse(
      'DUPLICATE',
      409,
      `Those notes are the same as “${copied.title}”, which someone else has already published. Change something first — or, if you built on theirs, save a copy from their page so it is credited.`
    );
  }

  const famous = await libraryHashes();
  for (const section of [decoded.A, decoded.B]) {
    const match = famous.get(await sectionHash(section));
    if (match) {
      refuse(
        'DUPLICATE',
        409,
        `Those notes are the famous break ${match} from the library, so they can't be published as yours. Change something first.`
      );
    }
  }

  return derived;
}

export async function publishBreak(
  userId: string,
  breakId: string,
  now = new Date()
): Promise<Published> {
  if (!(await isFeatureEnabled(PUBLISHING_FLAG))) {
    refuse('PUBLISHING_PAUSED', 403, 'Publishing is paused for now. Your pattern is still saved.');
  }

  const row = await prisma.break.findFirst({
    where: { id: breakId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      doc: true,
      slug: true,
      publishedAt: true,
    },
  });
  if (!row) throw new NotFoundError(`Break ${breakId} not found`);

  if (!(await usernameOf(userId))) {
    refuse(
      'USERNAME_REQUIRED',
      409,
      'Choose a username first — it is the name other drummers will see on your patterns.'
    );
  }

  const { columns } = await assertPublishable(userId, {
    title: row.title,
    description: row.description,
    payload: storedPayloadSchema.parse(row.doc),
  });

  /* A pattern published before keeps its first date: republishing it after an
     unpublish does not put it back at the top of Newest, and does not count
     against the cap a second time. Only a first publication is counted. */
  if (!row.publishedAt) {
    const recent = await prisma.break.count({
      where: { userId, publishedAt: { gte: new Date(now.getTime() - DAY_MS) } },
    });
    if (recent >= PUBLISH_DAILY_CAP) {
      refuse(
        'PUBLISH_LIMIT',
        429,
        `That's ${PUBLISH_DAILY_CAP} published in a day — the limit. Try again tomorrow.`
      );
    }
  }

  const saved = await withFreshSlug(() =>
    prisma.break.update({
      where: { id: row.id },
      data: {
        // a slug if it has none yet; published is set over the top
        ...visibilityData(row, 'link'),
        visibility: 'published',
        publishedAt: row.publishedAt ?? now,
        gridHash: columns.gridHash,
        difficulty: columns.difficulty,
      },
      select: { id: true, slug: true, publishedAt: true },
    })
  );

  return {
    id: saved.id,
    visibility: 'published',
    slug: saved.slug ?? '',
    publishedAt: saved.publishedAt ?? now,
  };
}
