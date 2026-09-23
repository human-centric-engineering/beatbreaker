/**
 * Admin catalogue — library entries (list and create)
 *
 * GET  /api/v1/admin/catalogue/libraries/[key]/entries
 * POST /api/v1/admin/catalogue/libraries/[key]/entries
 *
 * This is the route D10 asks for: a correction to a title, a credit or a note
 * lands without a deploy, and lands with an audit entry so the correction is
 * itself findable.
 *
 * Authentication: admin. Rate limiting is already done.
 */

import { withAdminAuth } from '@/lib/auth/guards';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { createEntry, createEntrySchema } from '@/lib/app/breaks/catalogue/admin';
import { prisma } from '@/lib/db/client';
import { getClientIP } from '@/lib/security/ip';

const OWNERSHIP = {
  decidedBy: 'nothing' as const,
  because:
    'A system catalogue row has no owner — `ownerId` is null on every one of them — so there is no subject to scope to. The admin role is the whole check.',
};

export const GET = withAdminAuth<{ key: string }>(
  async (_request, _session, { params }) => {
    const { key } = await params;
    const library = await prisma.patternLibrary.findFirst({
      where: { key, ownerId: null },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        /* Entries come back with the library rather than through a second
           call. 47 rows is one query; a list page that fetched per row would
           be the N+1 the architecture rules name. */
        entries: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            group: true,
            title: true,
            artist: true,
            note: true,
            bpm: true,
            styleKey: true,
            meter: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!library) {
      return errorResponse('No such library', { code: ErrorCodes.NOT_FOUND, status: 404 });
    }
    return successResponse(library);
  },
  { ownership: OWNERSHIP }
);

export const POST = withAdminAuth<{ key: string }>(
  async (request, session, { params }) => {
    const { key } = await params;
    const input = await validateRequestBody(request, createEntrySchema);
    const entry = await createEntry(key, input, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    if (!entry) {
      return errorResponse('No such library', { code: ErrorCodes.NOT_FOUND, status: 404 });
    }
    return successResponse(entry, undefined, { status: 201 });
  },
  { ownership: OWNERSHIP }
);
