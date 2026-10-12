/**
 * Generate a break.
 *
 * POST /api/v1/breaks/generate — a style, a meter and four sliders in; a whole
 * break out, with the critic's opinion of its A. A song written in sections
 * comes back as every section and the song's arrangement.
 *
 * The web Studio generates in the browser, on these same functions and this
 * same catalogue data, because a regenerate should not wait on the network.
 * This exists because the web app is the first client and not the only one
 * (D14): a native app has nothing but `/api/v1`, and it must not need a second
 * implementation of the generator.
 *
 * Authentication: any authenticated user. Stateless — nothing is written.
 * Rate limiting is already done: `proxy.ts` applies the `/api/v1/**` section
 * cap before this handler runs.
 */

import { getRouteLogger } from '@/lib/api/context';
import { ErrorCodes } from '@/lib/api/errors';
import { errorResponse, successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { getStyle } from '@/lib/app/breaks/catalogue/data';
import { critique, playability } from '@/lib/app/breaks/critic';
import { lettersOf } from '@/lib/app/breaks/sections';
import { packPattern } from '@/lib/app/breaks/share';
import { songBreak } from '@/lib/app/breaks/song-break';
import { generateBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, generateBreakSchema);

    const style = await getStyle(input.styleKey, input.styleVersion);
    if (!style) {
      return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
    }

    /* With a seed, one candidate a section. Without, the rejection sampler.
       `generateGood` draws sixteen and keeps the best, so handing it a seed
       would give a different pattern on every call — the opposite of what a
       seed is for. The lane roster is the one the style asks for in each
       section's meter, as the browser resolves it. */
    const made = songBreak({
      style,
      song: input.song,
      meter: input.meter,
      bars: input.bars,
      density: input.density,
      ghosts: input.ghosts,
      bpm: input.bpm,
      seed: input.seed ?? Math.floor(Math.random() * 0xffffffff),
      exact: input.seed !== undefined,
    });
    if (input.song && !made.song) {
      return errorResponse('The style has no such song', {
        code: ErrorCodes.NOT_FOUND,
        status: 404,
      });
    }
    const a = made.sections.A;
    const score = critique(a, input.bpm);
    const checks = playability(a, input.bpm);

    log.info('Break generated', {
      style: style.key,
      version: style.version,
      meter: input.meter,
      seed: a.seed,
      song: made.song?.key,
      score: score.score,
      playable: checks.hard,
    });

    /* A and B as they always were; a song in sections adds its other
       sections beside them, and the order it plays them in. */
    const sections = Object.fromEntries(
      lettersOf(made.sections).map((L) => [L, packPattern(made.sections[L] ?? a)])
    );
    return successResponse({
      seed: a.seed,
      styleVersionId: style.versionId,
      ...sections,
      ...(made.arrangement ? { arrangement: made.arrangement } : {}),
      critique: score,
      playability: checks,
      tries: made.tries,
      rejected: made.rejected,
    });
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Stateless: reads the public catalogue and returns a computed pattern. No row is read or written, so there is no subject to scope to.',
    },
  }
);
