/**
 * Your samples (D20)
 *
 * GET  /api/v1/samples — your samples, newest first, and how much of your
 *      allowance they use: `{ samples, usage }`.
 * POST /api/v1/samples — multipart: `file` (a WAV), `slot` (a kit slot) and
 *      `name` (the file name you picked). 201 with `{ sample, usage }`.
 *
 * The Studio encodes whatever you pick to mono 16-bit 44.1 kHz WAV before it
 * sends it. This route does not take that on trust: the body is capped before
 * it is read, and the WAV header is read here. Each refusal says why, with its
 * own code:
 *
 * - 413 `SAMPLE_TOO_LARGE` — the body, or the file, is over 1.5 MB;
 * - 400 `SAMPLE_NOT_WAV` — not that WAV format (`details.reason` says how);
 * - 400 `SAMPLE_TOO_LONG` — longer than 12 seconds;
 * - 409 `SAMPLE_LIMIT_COUNT` / `SAMPLE_LIMIT_BYTES` — your allowance is used;
 * - 429 — more than 60 uploads in 10 minutes, per person;
 * - 503 — storage cannot keep the file private or read it back.
 *
 * Authentication: any authenticated user. Scoped to the caller by
 * construction — `userId` comes from the session, never the body.
 *
 * Rate limiting: the section cap is applied by `proxy.ts`; uploads have a
 * per-flow cap of their own here, keyed on the session.
 */

import { getRouteLogger } from '@/lib/api/context';
import { APIError, ValidationError } from '@/lib/api/errors';
import { enforceContentLengthCap } from '@/lib/api/multipart-guard';
import { successResponse } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/guards';
import {
  createSample,
  listSamples,
  sampleStorage,
  sampleUploadLimiter,
} from '@/lib/app/breaks/samples/data';
import { MAX_SAMPLE_BYTES, MAX_SAMPLE_SECONDS, mb } from '@/lib/app/breaks/samples/limits';
import { parseWav } from '@/lib/app/breaks/samples/wav';
import { createRateLimitResponse } from '@/lib/security/rate-limit';
import { sampleUploadFieldsSchema } from '@/lib/validations/samples';

/** Room for the multipart boundaries and the two text fields around the file. */
const MULTIPART_OVERHEAD = 16 * 1024;

const TOO_LARGE = `A sample can be at most ${mb(MAX_SAMPLE_BYTES)} MB`;

export const GET = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const list = await listSamples(session.user.id);
    log.info('Samples listed', { count: list.usage.count });
    return successResponse(list);
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Lists only samples whose `userId` is `session.user.id`.',
    },
  }
);

export const POST = withAuth(
  async (request, session) => {
    const log = await getRouteLogger(request);
    const userId = session.user.id;

    const limit = sampleUploadLimiter.check(userId);
    if (!limit.success) {
      log.warn('Sample upload rate limit exceeded', { userId });
      return createRateLimitResponse(limit);
    }

    // before anything is read or written: refuse rather than store in the open
    const storage = sampleStorage();

    const oversize = enforceContentLengthCap(request, {
      maxBytes: MAX_SAMPLE_BYTES + MULTIPART_OVERHEAD,
      errorCode: 'SAMPLE_TOO_LARGE',
      errorMessage: TOO_LARGE,
    });
    if (oversize) return oversize;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ValidationError('Send the sample as multipart form data');
    }
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      throw new ValidationError('Invalid request body', {
        errors: [{ path: 'file', message: 'No file sent' }],
      });
    }
    const fields = sampleUploadFieldsSchema.safeParse({
      slot: form.get('slot'),
      name: form.get('name'),
    });
    if (!fields.success) {
      throw new ValidationError('Invalid request body', {
        errors: fields.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    // a missing or chunked Content-Length passes the cap above; this does not
    if (file.size > MAX_SAMPLE_BYTES) {
      throw new APIError(TOO_LARGE, 'SAMPLE_TOO_LARGE', 413);
    }

    const wav = Buffer.from(await file.arrayBuffer());
    const verdict = parseWav(wav);
    if (!verdict.ok) {
      throw new APIError(verdict.message, 'SAMPLE_NOT_WAV', 400, { reason: verdict.reason });
    }
    if (verdict.durationMs > MAX_SAMPLE_SECONDS * 1000) {
      const seconds = Math.round(verdict.durationMs / 100) / 10;
      throw new APIError(
        `That is ${seconds} seconds long — a sample can be at most ${MAX_SAMPLE_SECONDS}`,
        'SAMPLE_TOO_LONG',
        400,
        { durationMs: verdict.durationMs }
      );
    }

    const created = await createSample(userId, storage, {
      ...fields.data,
      wav,
      durationMs: verdict.durationMs,
    });
    log.info('Sample uploaded', {
      sampleId: created.sample.id,
      slot: created.sample.slot,
      bytes: created.sample.bytes,
    });
    return successResponse(created, undefined, { status: 201 });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Writes a sample owned by `session.user.id`; the body names no subject.',
    },
  }
);
