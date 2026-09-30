/**
 * Report a drummer's profile (Phase 7B, task 7B.5)
 *
 * POST /api/v1/public/drummers/:username/report — `{ reason, note? }`, where
 *      `reason` is `spam`, `offensive`, `bad-link` or `other`. 201 with
 *      `{ id, status: 'open' }`. Reporting the same profile again while your
 *      report is open updates it rather than adding another. Your own profile
 *      is a 400; an unknown username, a 404; more than 20 reports in a day
 *      (patterns and profiles together), a 429.
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
import { fileProfileReport, PROFILE_REPORT_REASONS } from '@/lib/app/breaks/community/reports';
import { usernameProblem } from '@/lib/app/breaks/community/username';

const reportSchema = z.object({
  reason: z.enum(PROFILE_REPORT_REASONS),
  note: z.string().trim().max(500, 'Up to 500 characters').optional(),
});

export const POST = withAuth<{ username: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const { username } = await params;
    if (usernameProblem(username) === 'shape') throw new NotFoundError('Drummer not found');
    const input = await validateRequestBody(request, reportSchema);
    const report = await fileProfileReport(session.user.id, username, input);
    log.info('Profile reported', { reason: input.reason });
    return successResponse(report, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Writes a report whose reporter is `session.user.id`; the target is any drummer with a public profile, which is the point of reporting.',
    },
  }
);
