/**
 * Your samples — the audio (D20)
 *
 * GET /api/v1/samples/:id/audio — the WAV, for its owner only.
 *
 * The file is read out of private storage with `download()` and sent from
 * here; there is no public URL to it anywhere. Someone else's sample answers
 * 404, the same as one that does not exist.
 *
 * `Cache-Control: private` so a shared cache never keeps a copy, with a long
 * max-age because a sample's audio never changes under its id — a new upload
 * is a new id — so the browser fetches each one once.
 *
 * Authentication: any authenticated user. Rate limiting is applied by
 * `proxy.ts` before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { withAuth } from '@/lib/auth/guards';
import { readSampleAudio, sampleStorage } from '@/lib/app/breaks/samples/data';
import { cuidSchema } from '@/lib/validations/common';

export const GET = withAuth<{ id: string }>(
  async (request, session, { params }) => {
    const log = await getRouteLogger(request);
    const parsed = cuidSchema.safeParse((await params).id);
    if (!parsed.success) {
      throw new ValidationError('Invalid sample id', { id: ['Must be a valid CUID'] });
    }
    const id = parsed.data;

    const audio = await readSampleAudio(session.user.id, sampleStorage(), id);
    if (!audio) throw new NotFoundError(`Sample ${id} not found`);

    log.info('Sample audio served', { sampleId: id, bytes: audio.length });
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audio.length),
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
  {
    ownership: {
      decidedBy: 'self',
      because: 'Reads only a sample whose `userId` is `session.user.id`; a miss is a 404.',
    },
  }
);
