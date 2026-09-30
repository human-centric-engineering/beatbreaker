/**
 * Report a row on a speed table (Phase 7C)
 *
 * POST /api/v1/public/speeds/:id/report — `{ reason, note? }`, where `:id` is
 *      the row's id as the table gives it and `reason` is `wrong-speed`,
 *      `bad-link` or `other`. 201 with `{ id, status: 'open' }`. Reporting the
 *      same record again while your report is open updates it rather than
 *      adding another. Your own record is a 400; one that is on no table, a
 *      404; more than 20 reports in a day (patterns, profiles and speeds
 *      together), a 429.
 *
 * Signed-in only (D2: reading needs no account, reporting does), so a report
 * has someone behind it. The reporter is never shown to the drummer.
 *
 * Rate limiting: the `public` tier (per IP) from `proxy.ts`, and the
 * per-person daily cap above.
 */

import { z } from 'zod';

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { fileSpeedReport, SPEED_REPORT_REASONS } from '@/lib/app/breaks/community/reports';
import { cuidSchema } from '@/lib/validations/common';

const reportSchema = z.object({
  reason: z.enum(SPEED_REPORT_REASONS),
  note: z.string().trim().max(500, 'Up to 500 characters').optional(),
});

export const POST = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const id = cuidSchema.safeParse((await params).id);
    if (!id.success) throw new NotFoundError('Speed not found');
    const input = await validateRequestBody(request, reportSchema);
    const report = await fileSpeedReport(session.user.id, id.data, input);
    log.info('Speed reported', { reason: input.reason });
    return successResponse(report, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Writes a report whose reporter is `session.user.id`; the target is any listed speed record, which is the point of reporting.',
    },
  }
);
