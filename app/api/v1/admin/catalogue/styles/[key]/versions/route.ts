/**
 * Admin catalogue — a style's versions
 *
 * GET  /api/v1/admin/catalogue/styles/[key]/versions — every version, newest first
 * POST /api/v1/admin/catalogue/styles/[key]/versions — a new one
 *
 * **This is how a style is edited.** Versions are immutable; saving a change
 * writes version n+1 and moves the style's pointer at it. Everything generated
 * from an older version keeps sounding the way it sounded, which is the whole
 * reason the table is shaped like this.
 *
 * Authentication: admin. Rate limiting is already done.
 */

import { withAdminAuth } from '@/lib/auth/guards';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { addStyleVersion, addStyleVersionSchema } from '@/lib/app/breaks/catalogue/admin';
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
    const style = await prisma.style.findFirst({
      where: { key, ownerId: null },
      select: {
        id: true,
        currentVersion: true,
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, note: true, params: true, createdAt: true },
        },
      },
    });
    if (!style) return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
    return successResponse(style);
  },
  { ownership: OWNERSHIP }
);

export const POST = withAdminAuth<{ key: string }>(
  async (request, session, { params }) => {
    const { key } = await params;
    const input = await validateRequestBody(request, addStyleVersionSchema);
    const result = await addStyleVersion(key, input, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    if (!result) return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
    return successResponse(result, undefined, { status: 201 });
  },
  { ownership: OWNERSHIP }
);
