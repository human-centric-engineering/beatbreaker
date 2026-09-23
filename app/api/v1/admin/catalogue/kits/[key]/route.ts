/**
 * Admin catalogue — one kit
 *
 * PATCH /api/v1/admin/catalogue/kits/[key] — label, hint, group, credit,
 * position, the voice parameters and the sample map.
 *
 * The audio files themselves are not here. A kit row says which files each slot
 * uses; the files live under `public/kits/` and are put there by the extraction
 * script, not by an HTTP request.
 *
 * Authentication: admin. Rate limiting is already done.
 */

import { withAdminAuth } from '@/lib/auth/guards';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { patchKit, patchKitSchema } from '@/lib/app/breaks/catalogue/admin';
import { getClientIP } from '@/lib/security/ip';

export const PATCH = withAdminAuth<{ key: string }>(
  async (request, session, { params }) => {
    const { key } = await params;
    const input = await validateRequestBody(request, patchKitSchema);
    const ok = await patchKit(key, input, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    if (!ok) return errorResponse('No such kit', { code: ErrorCodes.NOT_FOUND, status: 404 });
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
