/**
 * Generate a break.
 *
 * POST /api/v1/breaks/generate — a style, a meter and four sliders in; a whole
 * break out, with the critic's opinion of it.
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
import { critique, generateGood, playability } from '@/lib/app/breaks/critic';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { resolveLanes } from '@/lib/app/breaks/pattern';
import { packPattern } from '@/lib/app/breaks/share';
import { styleIn } from '@/lib/app/breaks/styles';
import { generateBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, generateBreakSchema);

    const style = await getStyle(input.styleKey, input.styleVersion);
    if (!style) {
      return errorResponse('No such style', { code: ErrorCodes.NOT_FOUND, status: 404 });
    }

    /* The lane roster the style asks for, in the meter it was asked for. The
       browser does exactly this before calling the generator; doing it here
       rather than making the caller do it is what keeps a native client from
       needing a second copy of `resolveLanes`. */
    const roster = resolveLanes(styleIn(style.params, input.meter), null);
    const opts = {
      style,
      meter: input.meter,
      bars: input.bars,
      density: input.density,
      ghosts: input.ghosts,
      lanes: roster.lanes,
      perc: roster.perc,
    };

    /* With a seed, one candidate. Without, the rejection sampler.
       `generateGood` draws sixteen and keeps the best, so handing it a seed
       would give a different pattern on every call — the opposite of what a
       seed is for. */
    const a =
      input.seed === undefined
        ? generateGood({ ...opts, seed: Math.floor(Math.random() * 0xffffffff) }, input.bpm)
        : { pattern: generatePattern({ ...opts, seed: input.seed }), tries: 1, rejected: 0 };

    const b = deriveB(a.pattern, style.params);
    const score = critique(a.pattern, input.bpm);
    const checks = playability(a.pattern, input.bpm);

    log.info('Break generated', {
      style: style.key,
      version: style.version,
      meter: input.meter,
      seed: a.pattern.seed,
      score: score.score,
      playable: checks.hard,
    });

    return successResponse({
      seed: a.pattern.seed,
      styleVersionId: style.versionId,
      A: packPattern(a.pattern),
      B: packPattern(b),
      critique: score,
      playability: checks,
      tries: a.tries,
      rejected: a.rejected,
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
