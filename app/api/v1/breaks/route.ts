/**
 * Breaks — list and create
 *
 * GET  /api/v1/breaks — the caller's own saved breaks, newest first
 * POST /api/v1/breaks — save a break
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

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { critique, playability } from '@/lib/app/breaks/critic';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { prisma } from '@/lib/db/client';
import { createBreakSchema, listBreaksSchema } from '@/lib/validations/breaks';

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
  createdAt: true,
  updatedAt: true,
  _count: { select: { takes: true } },
} as const;

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const url = new URL(request.url);
    const { style, meter, limit, cursor } = listBreaksSchema.parse({
      style: url.searchParams.get('style') ?? undefined,
      meter: url.searchParams.get('meter') ?? undefined,
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
      },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const breaks = hasMore ? rows.slice(0, limit) : rows;

    log.info('Breaks listed', { count: breaks.length, style, meter });
    return successResponse(breaks, {
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
    const { title, doc, shared } = await validateRequestBody(request, createBreakSchema);

    /* The schema proves the document is well-formed; decoding proves it is
       *playable*. The critic is pure and runs here exactly as it runs in the
       browser, which is what lets a model-authored break be checked before
       anyone is shown it. A failing score is recorded, not refused — "this is
       a bad break" is the critic's opinion, and the person who wrote it is
       entitled to save it anyway. */
    const decoded = breakDocFromPayload(doc);
    const checks = playability(decoded.A, decoded.bpm);
    const score = critique(decoded.A, decoded.bpm);

    const saved = await prisma.break.create({
      data: {
        userId: session.user.id,
        title,
        style: decoded.A.style,
        /* The version the pattern was generated from, not just the style key.
           `doc` carries the snapshot either way, so playback does not need
           this — provenance does: without it "which breaks came from version 3
           of funk" has no answer, and the column's `ON DELETE SET NULL` never
           has anything to null. It arrives on the document as `sv`. */
        styleVersionId: decoded.A.styleVersionId,
        meter: decoded.A.meter,
        bpm: Math.round(decoded.bpm),
        swing: Math.round(decoded.swing),
        seed: BigInt(decoded.A.seed),
        bars: decoded.A.bars.length,
        shared,
        doc,
      },
      select: LIST_SELECT,
    });

    log.info('Break saved', {
      breakId: saved.id,
      style: saved.style,
      score: score.score,
      playable: checks.hard,
    });

    return successResponse(
      { ...saved, critique: { score: score.score, playable: checks.hard } },
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
