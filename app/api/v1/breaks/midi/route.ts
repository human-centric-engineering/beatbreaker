/**
 * Export a break as a Standard MIDI File.
 *
 * POST /api/v1/breaks/midi — the whole break and the three sliders in; format-0
 * MIDI bytes out, `Content-Type: audio/midi`.
 *
 * **The one domain endpoint that does not answer in the JSON envelope.** A MIDI
 * file is bytes, and wrapping them in base64 inside a JSON object would make
 * every caller unwrap before saving. The error path still uses the envelope,
 * which is what `validateRequestBody` throwing gives us.
 *
 * Swing and the style's off-grid feel are written into the tick positions, so
 * the export drags where the playback drags.
 *
 * Authentication: any authenticated user. Stateless. Rate limiting is already
 * done by `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { type SequencedBar, buildMidi } from '@/lib/app/breaks/midi';
import { midiBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, midiBreakSchema);

    const doc = breakDocFromPayload(input.doc);

    /* The arrangement says which section plays when; it repeats until the
       requested bar count is filled. A break with a four-letter arrangement and
       two bars a section is eight bars of MIDI, which is the default. */
    const seq: SequencedBar[] = [];
    for (let i = 0; seq.length < input.bars; i++) {
      const letter = doc.arrangement[i % doc.arrangement.length];
      const pattern = doc[letter];
      for (let b = 0; b < pattern.bars.length && seq.length < input.bars; b++) {
        seq.push({ pattern, barIdx: b });
      }
    }

    const file = buildMidi(seq, {
      bpm: doc.bpm,
      swing: doc.swing,
      feel: input.feel,
      hats: input.hats,
    });

    log.info('Break exported as MIDI', { bars: seq.length, bytes: file.bytes.length });

    return new Response(new Uint8Array(file.bytes), {
      headers: {
        'Content-Type': 'audio/midi',
        'Content-Disposition': 'attachment; filename="break.mid"',
        /* A MIDI file built from a document in the request body is as private
           as that document. Nothing shared should cache it. */
        'Cache-Control': 'private, no-store',
      },
    });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Stateless: writes a file from a document in the request body. No row is read or written, so there is no subject to scope to.',
    },
  }
);
