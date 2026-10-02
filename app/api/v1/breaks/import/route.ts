/**
 * Read a pattern in from outside BeatBreaker.
 *
 * POST /api/v1/breaks/import — a MIDI file (base64), a BeatBreaker code or a
 * link carrying one, or a Groove Scribe link in; a validated wire document out,
 * with the source it was read as and a sentence for everything the reader had
 * to leave out or bend to fit (`notes`).
 *
 * Deterministic, no model involved. Used by the _Share & export_ drawer's
 * Import and by BeatBuddy's composer — chat attachments cannot carry MIDI.
 *
 * **No URL is fetched.** A link is read for what its own text carries; any
 * other web address is refused with a sentence saying what can be read (422).
 * A body over the cap is refused from its `Content-Length` before it is read.
 *
 * Authentication: any authenticated user. Stateless. `proxy.ts` applies the
 * section cap; {@link importLimiter} adds 30 a minute per person, because a
 * MIDI file costs CPU to read.
 */

import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { enforceContentLengthCap } from '@/lib/api/multipart-guard';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { listStyles, styleLookup } from '@/lib/app/breaks/catalogue/data';
import { type ImportInput, readImport } from '@/lib/app/breaks/read-import';
import { importLimiter } from '@/lib/app/breaks/import-limit';
import { breakPayload } from '@/lib/app/breaks/share';
import { createRateLimitResponse } from '@/lib/security/rate-limit';
import { MAX_IMPORT_BODY_BYTES, importBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);

    const limit = importLimiter.check(session.user.id);
    if (!limit.success) {
      log.warn('Import rate limit exceeded');
      return createRateLimitResponse(limit);
    }

    const tooBig = enforceContentLengthCap(request, {
      maxBytes: MAX_IMPORT_BODY_BYTES,
      errorCode: ErrorCodes.FILE_TOO_LARGE,
      errorMessage: 'That file is too big to be a drum pattern',
    });
    if (tooBig) return tooBig;

    const body = await validateRequestBody(request, importBreakSchema);
    const input: ImportInput =
      body.kind === 'midi'
        ? { kind: 'midi', bytes: Buffer.from(body.data, 'base64'), fileName: body.fileName }
        : { kind: 'text', text: body.text };

    /* A code older than v4 names a style and carries no snapshot; the lookup
       rebuilds it, as the doctor route does. Imports from MIDI and Groove
       Scribe never need it. */
    const styles = input.kind === 'text' ? styleLookup(await listStyles()) : undefined;
    const result = readImport(input, styles);

    if (!result.ok) {
      log.info('Import refused', { kind: body.kind, reason: result.error });
      return errorResponse(result.error, { code: 'IMPORT_UNREADABLE', status: 422 });
    }

    log.info('Pattern imported', {
      source: result.source,
      bars:
        result.doc.A.bars.length +
        (result.doc.arrangement.includes('B') ? result.doc.B.bars.length : 0),
      notes: result.notes.length,
    });

    return successResponse({
      source: result.source,
      doc: breakPayload(result.doc),
      notes: result.notes,
    });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Stateless: reads a pattern out of a file or link in the request body. No row is read or written, so there is no subject to scope to.',
    },
  }
);
