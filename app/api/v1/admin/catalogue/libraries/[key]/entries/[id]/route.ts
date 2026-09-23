/**
 * Admin catalogue — one library entry
 *
 * PATCH  /api/v1/admin/catalogue/libraries/[key]/entries/[id]
 * DELETE /api/v1/admin/catalogue/libraries/[key]/entries/[id]
 *
 * The delete is a real delete. An entry taken down because a credit was wrong
 * or a rights holder objected (D10) has to actually go, and patterns people
 * made from it are their own rows and are untouched.
 *
 * Authentication: admin. Rate limiting is already done.
 */

import { withAdminAuth } from '@/lib/auth/guards';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { deleteEntry, patchEntry, patchEntrySchema } from '@/lib/app/breaks/catalogue/admin';
import { getClientIP } from '@/lib/security/ip';

const OWNERSHIP = {
  decidedBy: 'nothing' as const,
  because:
    'A system catalogue row has no owner — `ownerId` is null on every one of them — so there is no subject to scope to. The admin role is the whole check.',
};

const GONE = errorResponse.bind(null, 'No such entry', {
  code: ErrorCodes.NOT_FOUND,
  status: 404,
});

export const PATCH = withAdminAuth<{ key: string; id: string }>(
  async (request, session, { params }) => {
    const { key, id } = await params;
    const input = await validateRequestBody(request, patchEntrySchema);
    const ok = await patchEntry(key, id, input, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    return ok ? successResponse({ id }) : GONE();
  },
  { ownership: OWNERSHIP }
);

export const DELETE = withAdminAuth<{ key: string; id: string }>(
  async (request, session, { params }) => {
    const { key, id } = await params;
    const ok = await deleteEntry(key, id, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    return ok ? successResponse({ id }) : GONE();
  },
  { ownership: OWNERSHIP }
);
