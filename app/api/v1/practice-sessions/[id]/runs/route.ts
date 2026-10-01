/**
 * Practice sessions — runs of one of yours (Phase 7D)
 *
 * GET  /api/v1/practice-sessions/:id/runs — your runs of it, newest first,
 *      up to 50: when, and the tempo each pattern reached.
 * POST /api/v1/practice-sessions/:id/runs — `{ startedAt, items: [{ title,
 *      level, targetBpm, reachedBpm, seconds }] }`, a run that has ended,
 *      with the slots played. 201 with the run. The end is the server's time;
 *      a start more than a day ago or in the future is a 400; past 50 runs in
 *      a day is a 429.
 *
 * Someone else's session is a 404, the same as one that does not exist.
 *
 * Authentication: any authenticated user. Rate limiting: the `/api/v1`
 * section cap from `proxy.ts`, and the daily cap above.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { listRuns, recordRun } from '@/lib/app/breaks/saved/runs';
import { cuidSchema } from '@/lib/validations/common';
import { createRunSchema } from '@/lib/validations/practice-sessions';

async function sessionId(params: Promise<{ id: string }>): Promise<string> {
  const id = cuidSchema.safeParse((await params).id);
  if (!id.success) {
    throw new ValidationError('Invalid session id', { id: ['Must be a valid CUID'] });
  }
  return id.data;
}

const OWNED = {
  ownership: {
    decidedBy: 'self',
    because:
      'Reads and writes only runs of a session whose `userId` is `session.user.id`; a miss is a 404.',
  },
} as const;

export const GET = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  const runs = await listRuns(session.user.id, id);
  if (!runs) throw new NotFoundError(`Practice session ${id} not found`);
  log.info('Practice runs read', { sessionId: id, runs: runs.length });
  return successResponse(runs);
}, OWNED);

export const POST = withAuth<{ id: string }>(async (request, session, { params }) => {
  const log = await getRouteLogger(request);
  const id = await sessionId(params);
  const input = await validateRequestBody(request, createRunSchema);
  const run = await recordRun(session.user.id, id, input);
  if (!run) throw new NotFoundError(`Practice session ${id} not found`);
  log.info('Practice run logged', { sessionId: id, runId: run.id, slots: run.items.length });
  return successResponse(run, undefined, { status: 201 });
}, OWNED);
