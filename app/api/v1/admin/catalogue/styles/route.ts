/**
 * Admin catalogue — styles (list and create)
 *
 * GET  /api/v1/admin/catalogue/styles — every style, with its version count
 * POST /api/v1/admin/catalogue/styles — a new style, at version 1
 *
 * Authentication: admin. Rate limiting is already done — `proxy.ts` applies the
 * `admin` tier (30/min) to `/api/v1/admin/**` before this handler runs.
 *
 * Why a separate admin list when `/api/v1/catalogue/styles` exists: the public
 * one is cached under the `catalogue` tag and carries what a picker needs. This
 * one is uncached and carries what an editor needs — version counts, who wrote
 * the last one, and rows that are not `system` once D16 lands.
 */

import { withAdminAuth } from '@/lib/auth/guards';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { createStyle, createStyleSchema } from '@/lib/app/breaks/catalogue/admin';
import { prisma } from '@/lib/db/client';
import { getClientIP } from '@/lib/security/ip';

export const GET = withAdminAuth(
  async () => {
    const styles = await prisma.style.findMany({
      where: { ownerId: null },
      orderBy: [{ group: 'asc' }, { position: 'asc' }],
      select: {
        id: true,
        key: true,
        label: true,
        hint: true,
        group: true,
        meter: true,
        position: true,
        currentVersion: true,
        updatedAt: true,
        _count: { select: { versions: true } },
      },
    });
    return successResponse(styles);
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'A system catalogue row has no owner — `ownerId` is null on every one of them — so there is no subject to scope to. The admin role is the whole check, and D16 (user-authored styles) is the change that will make this a real decision.',
    },
  }
);

export const POST = withAdminAuth(
  async (request, session) => {
    const input = await validateRequestBody(request, createStyleSchema);
    const style = await createStyle(input, {
      userId: session.user.id,
      clientIp: getClientIP(request),
    });
    return successResponse(style, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Writes a system row, owned by nobody (`ownerId` null). There is no subject to scope to; the admin role is the whole check.',
    },
  }
);
