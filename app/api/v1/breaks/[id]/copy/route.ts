/**
 * Save a copy (Phase 6, task 6.3)
 *
 * POST /api/v1/breaks/:id/copy — `{ title?, doc? }`. A new, private pattern
 *      of yours, made from one you can open: yours, someone's link share, or a
 *      published one. 201 with the new row and its `basedOn` credit line.
 *
 * - `doc` is the notes as you have them now — you may have edited someone
 *   else's pattern before saving it — and defaults to the stored document.
 * - `title` defaults to the original's.
 * - The description and reference links come with it: a copy keeps what its
 *   pattern said about itself.
 * - A copy of someone else's pattern records it as `parentId`, which is what
 *   the credit line ("Variation of _X_ by _Y_") and the library's "most
 *   saved" count read. A copy of your own is just a copy — unless yours is
 *   fixed (published, now or before): then it is a **variation** (D26), the
 *   only way to change a fixed pattern's notes, and it records the original
 *   as `ownParentId`, so it is listed and credited on the original's page
 *   once published without counting as a save.
 *
 * A pattern the caller cannot open answers 404, as `GET /api/v1/breaks/:id`
 * does — the same `openSavedBreak` read, so the two cannot disagree.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { columnsFromDoc } from '@/lib/app/breaks/columns';
import { lineageOf } from '@/lib/app/breaks/community/sharing';
import { readStoredLinks } from '@/lib/app/breaks/links';
import { openSavedBreak } from '@/lib/app/breaks/saved/data';
import { prisma } from '@/lib/db/client';
import { cuidSchema } from '@/lib/validations/common';
import { copyBreakSchema } from '@/lib/validations/breaks';

export const POST = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const parsed = cuidSchema.safeParse((await params).id);
    if (!parsed.success) {
      throw new ValidationError('Invalid break id', { id: ['Must be a valid CUID'] });
    }
    const id = parsed.data;
    const input = await validateRequestBody(request, copyBreakSchema);

    const opened = await openSavedBreak(id, session.user.id);
    if (!opened) throw new NotFoundError(`Break ${id} not found`);
    const { row, payload, links, mine } = opened;

    const doc = input.doc ?? payload;
    const parentId = mine ? null : row.id;
    const ownParentId = mine && row.frozenAt ? row.id : null;
    const { columns } = await columnsFromDoc(doc);

    const saved = await prisma.break.create({
      data: {
        userId: session.user.id,
        title: input.title ?? row.title,
        ...(row.description ? { description: row.description } : {}),
        // re-read links, rebuilt as plain objects for the JSON column
        links: links.map(({ kind, url, label }) => ({ kind, url, ...(label ? { label } : {}) })),
        ...columns,
        doc,
        visibility: 'private',
        parentId,
        ownParentId,
      },
      select: {
        id: true,
        title: true,
        style: true,
        meter: true,
        bpm: true,
        level: true,
        visibility: true,
        description: true,
        links: true,
        createdAt: true,
      },
    });

    log.info('Break copied', {
      breakId: saved.id,
      fromOwn: mine,
      variation: (parentId ?? ownParentId) !== null,
    });
    return successResponse(
      {
        ...saved,
        links: readStoredLinks(saved.links),
        basedOn: await lineageOf(parentId ?? ownParentId),
      },
      undefined,
      { status: 201 }
    );
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Reads the source through openSavedBreak (own or not private, else 404) and writes a row owned by `session.user.id`; the body names no owner.',
    },
  }
);
