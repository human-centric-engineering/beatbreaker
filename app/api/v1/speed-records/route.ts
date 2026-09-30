/**
 * Speed records — yours (Phase 7C)
 *
 * GET  /api/v1/speed-records?breakId=… or ?libraryEntryId=… — your records on
 *      one target, newest first, with where your bests place you on its
 *      public table (`places`), whether it has one (`public`), whether you
 *      have a username (tables list drummers by it), and your `listSpeeds`
 *      setting. A target you cannot see is a 404.
 * POST /api/v1/speed-records — `{ breakId | libraryEntryId, level, bpm,
 *      videoUrl?, note?, listed? }`. 201 with the record. The time is the
 *      server's. `bpm` runs from 40 to the target's meter's ceiling; past 50
 *      new records in a day is a 429. A video link is stored as the canonical
 *      URL the parser rebuilt. `listed` counts only on a published pattern or
 *      a famous break; without it, your `listSpeeds` setting decides, and the
 *      first answer on a public target becomes that setting.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting: the `/api/v1` section cap from `proxy.ts`, and the daily cap
 * above.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateQueryParams, validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { recordSpeed, yourSpeeds } from '@/lib/app/breaks/saved/speeds';
import { createSpeedSchema, yourSpeedsQuerySchema } from '@/lib/validations/speeds';

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const target = validateQueryParams(new URL(request.url).searchParams, yourSpeedsQuerySchema);
    const speeds = await yourSpeeds(session.user.id, target);
    if (!speeds) throw new NotFoundError('Pattern not found');
    log.info('Speeds read', { records: speeds.records.length, public: speeds.public });
    return successResponse(speeds);
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Reads records filtered by `session.user.id`; the target is checked visible to the caller by the rule opening it applies.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, createSpeedSchema);
    const record = await recordSpeed(session.user.id, input);
    log.info('Speed recorded', {
      recordId: record.id,
      level: record.level,
      listed: record.listed,
      video: record.video !== null,
    });
    return successResponse(record, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because:
        'Writes a record owned by `session.user.id`; the target is checked visible to the caller by the rule opening it applies.',
    },
  }
);
