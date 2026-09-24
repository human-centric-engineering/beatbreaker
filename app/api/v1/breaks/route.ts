/**
 * Breaks — list and create
 *
 * GET  /api/v1/breaks — the caller's own saved breaks. `sort=created` (the
 *      default, newest first) or `updated`; `q` searches titles; `style`,
 *      `meter`.
 * POST /api/v1/breaks — save a break, or `{ breaks: [...] }` to save up to 30
 *      in one transaction (the one-time import of browser favourites)
 *
 * API-first, in the sense that matters: the generator, the critic and the
 * engraver are reachable without the UI, and everything the page can do to a
 * break it does by sending one of these documents. A saved break and a pasted
 * share code are the same shape, checked by the same schema.
 *
 * Authentication: any authenticated user. Scoped to the caller's own rows by
 * construction — `userId` comes from the session and is never read from the
 * body, so there is no subject a caller can name but themselves.
 *
 * Rate limiting is already done: `proxy.ts` applies the `/api/v1/**` section
 * cap (100/min, keyed on the session user) before this handler runs. Do not
 * call a section limiter here.
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { critique, playability } from '@/lib/app/breaks/critic';
import { columnsFromDoc } from '@/lib/app/breaks/columns';
import { readStoredLinks } from '@/lib/app/breaks/links';
import { prisma } from '@/lib/db/client';
import {
  bulkCreateBreaksSchema,
  createBreakSchema,
  type CreateBreakInput,
  listBreaksSchema,
} from '@/lib/validations/breaks';

/** What a list row carries — never the whole document. */
const LIST_SELECT = {
  id: true,
  title: true,
  style: true,
  meter: true,
  bpm: true,
  swing: true,
  bars: true,
  shared: true,
  level: true,
  description: true,
  links: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { takes: true } },
} as const;

/** `links` is a JSON column, so it is external data on the way out too (H9). */
function withLinks<T extends { links: unknown }>(row: T) {
  return { ...row, links: readStoredLinks(row.links) };
}

/*
 * Every sort ends on `id`, so rows that tie — two breaks created in the same
 * millisecond by the bulk import — come back in one fixed order, and the id cursor lands where the last page
 * ended rather than skipping or repeating a tied row.
 */
const ORDER = {
  created: [{ createdAt: 'desc' }, { id: 'desc' }],
  updated: [{ updatedAt: 'desc' }, { id: 'desc' }],
} as const;

/** One create's row data — the owner from the session, the columns from the document. */
function createData(userId: string, input: CreateBreakInput) {
  const { decoded, columns } = columnsFromDoc(input.doc);
  return {
    decoded,
    data: {
      userId,
      title: input.title,
      shared: input.shared,
      ...(input.description ? { description: input.description } : {}),
      links: input.links,
      ...columns,
      doc: input.doc,
    },
  };
}

/* The body is read once to see which form it is, and validated in full by the
   schema for that form. A bulk body is recognised by its `breaks` key alone, so
   a malformed one is reported against the bulk schema — not as "title is
   required", which is what trying the single form first would say. */
const bulkShape = z.object({ breaks: z.unknown() });

async function isBulk(request: NextRequest): Promise<boolean> {
  const body: unknown = await request
    .clone()
    .json()
    .catch(() => undefined);
  return bulkShape.safeParse(body).success;
}

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const url = new URL(request.url);
    const { style, meter, q, sort, limit, cursor } = listBreaksSchema.parse({
      style: url.searchParams.get('style') ?? undefined,
      meter: url.searchParams.get('meter') ?? undefined,
      q: url.searchParams.get('q') || undefined,
      sort: url.searchParams.get('sort') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });

    /* One extra row tells us whether there is a next page without a second
       count query — the row itself is dropped before it reaches the client. */
    const rows = await prisma.break.findMany({
      where: {
        userId: session.user.id,
        ...(style ? { style } : {}),
        ...(meter ? { meter } : {}),
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      select: LIST_SELECT,
      orderBy: [...ORDER[sort]],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const breaks = hasMore ? rows.slice(0, limit) : rows;

    log.info('Breaks listed', { count: breaks.length, style, meter, sort });
    return successResponse(breaks.map(withLinks), {
      nextCursor: hasMore ? breaks[breaks.length - 1].id : null,
    });
  },
  {
    // Ownership: self-scoped by construction — see RouteOwnership in lib/auth/guards.ts.
    ownership: {
      decidedBy: 'self',
      because: 'Lists rows filtered by `session.user.id`; the query names no other subject.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);

    if (await isBulk(request)) {
      const { breaks } = await validateRequestBody(request, bulkCreateBreaksSchema);
      /* Every document is decoded before anything is written, and the writes
         are one transaction: an import that fails halfway would leave the
         caller not knowing which favourites made it, and the client clears
         `bb.favs` only on success — so it must be all of them or none. */
      const rows = breaks.map((input) => createData(session.user.id, input).data);
      const saved = await prisma.$transaction(
        rows.map((data) => prisma.break.create({ data, select: LIST_SELECT }))
      );
      log.info('Breaks saved in bulk', { count: saved.length });
      return successResponse(saved.map(withLinks), { count: saved.length }, { status: 201 });
    }

    const input = await validateRequestBody(request, createBreakSchema);

    /* The schema proves the document is well-formed; decoding proves it is
       *playable*. The critic is pure and runs here exactly as it runs in the
       browser, which is what lets a model-authored break be checked before
       anyone is shown it. A failing score is recorded, not refused — "this is
       a bad break" is the critic's opinion, and the person who wrote it is
       entitled to save it anyway.

       `styleVersionId` among the derived columns is the version the pattern
       was generated from, not just the style key. `doc` carries the snapshot
       either way, so playback does not need it — provenance does: without it
       "which breaks came from version 3 of funk" has no answer, and the
       column's `ON DELETE SET NULL` never has anything to null. */
    const { decoded, data } = createData(session.user.id, input);
    const checks = playability(decoded.A, decoded.bpm);
    const score = critique(decoded.A, decoded.bpm);

    const saved = await prisma.break.create({ data, select: LIST_SELECT });

    log.info('Break saved', {
      breakId: saved.id,
      style: saved.style,
      score: score.score,
      playable: checks.hard,
    });

    return successResponse(
      { ...withLinks(saved), critique: { score: score.score, playable: checks.hard } },
      undefined,
      { status: 201 }
    );
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Writes a row owned by `session.user.id`; the body cannot name an owner.',
    },
  }
);
