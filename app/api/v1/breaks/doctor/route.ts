/**
 * Apply one of the doctor's twelve moves.
 *
 * POST /api/v1/breaks/doctor — a pattern, a style and a named move in; the
 * patched pattern out.
 *
 * The style is required and is not optional politeness: a move writes new
 * notes — where ghosts want to land, which steps the kick may not take — and
 * that is generator knowledge, not the five attributes a pattern carries with
 * it. A pattern whose style has been deleted can still be played, scored and
 * exported; it cannot be doctored.
 *
 * Authentication: any authenticated user. Stateless. Rate limiting is already
 * done by `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { getStyle, listStyles, styleLookup } from '@/lib/app/breaks/catalogue/data';
import { critique, playability } from '@/lib/app/breaks/critic';
import { type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { packPattern, patternFromPacked } from '@/lib/app/breaks/share';
import { doctorBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, doctorBreakSchema);

    const style = await getStyle(input.styleKey, input.styleVersion);
    if (!style) {
      return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
    }

    /* The lookup is what lets a v3 document — one written before styles had
       versions — rebuild the snapshot a v4 one carries. It costs one cached
       read and means an old share code can be doctored. */
    const pattern = patternFromPacked(input.doc, styleLookup(await listStyles()));
    const patched = doctor(pattern, style.params, input.move as DoctorMove, input.entropy);

    log.info('Doctor move applied', { move: input.move, style: style.key });

    return successResponse({
      doc: packPattern(patched),
      critique: critique(patched, input.bpm),
      playability: playability(patched, input.bpm),
    });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Stateless: operates on a document in the request body. No row is read or written, so there is no subject to scope to.',
    },
  }
);
