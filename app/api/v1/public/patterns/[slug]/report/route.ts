/**
 * Report a shared or published pattern (Phase 6, task 6.10)
 *
 * POST /api/v1/public/patterns/:slug/report — `{ reason, note? }`, where
 *      `reason` is `spam`, `not-theirs`, `offensive`, `bad-link` or `other`.
 *      201 with `{ id, status: 'open' }`. Reporting the same pattern again
 *      while your report is open updates it rather than adding another. Your
 *      own pattern is a 400; one that is not shared, a 404; more than 20 in a
 *      day, a 429.
 *
 * Signed-in only (D2: reading needs no account, reporting does), so a report
 * has someone behind it. The reporter is never shown to the owner.
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
import { fileReport, REPORT_REASONS } from '@/lib/app/breaks/community/reports';
import { slugSchema } from '@/lib/app/breaks/community/visibility';

const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500, 'Up to 500 characters').optional(),
});

export const POST = withAuth<{ slug: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const slug = slugSchema.safeParse((await params).slug);
    if (!slug.success) throw new NotFoundError('Pattern not found');
    const input = await validateRequestBody(request, reportSchema);
    const report = await fileReport(session.user.id, slug.data, input);
    log.info('Pattern reported', { reason: input.reason });
    return successResponse(report, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Writes a report whose reporter is `session.user.id`; the target is any shared pattern, which is the point of reporting.',
    },
  }
);
