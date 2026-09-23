/**
 * Admin catalogue — one style's metadata
 *
 * PATCH /api/v1/admin/catalogue/styles/[key] — the group and the position.
 *
 * **Not the parameters.** Those move by adding a version
 * (`POST …/[key]/versions`), because a saved break points at the version it was
 * generated from and rewriting that version would change breaks nobody touched.
 * There is no route here that can edit one.
 *
 * Authentication: admin. Rate limiting is already done.
 */

import { withAdminAuth } from '@/lib/auth/guards';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { patchStyle, patchStyleSchema } from '@/lib/app/breaks/catalogue/admin';
import { getClientIP } from '@/lib/security/ip';

export const PATCH = withAdminAuth<{ key: string }>(
  async (request, session, { params }) => {
    const { key } = await params;
    const input = await validateRequestBody(request, patchStyleSchema);
    const ok = await patchStyle(key, input, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    if (!ok) return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
    return successResponse({ key });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'A system catalogue row has no owner — `ownerId` is null on every one of them — so there is no subject to scope to. The admin role is the whole check.',
    },
  }
);
