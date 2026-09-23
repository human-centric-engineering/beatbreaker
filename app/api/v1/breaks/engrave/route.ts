/**
 * Engrave a break as notation.
 *
 * POST /api/v1/breaks/engrave — a pattern and a layer in; an SVG node tree, a
 * playhead map and the dimensions out.
 *
 * **A node tree inside the standard envelope, not an `image/svg+xml` body.**
 * `engrave` returns `SvgNode[]` rather than building DOM, which is what lets it
 * run on the server at all — and a caller that wants a file can serialise the
 * tree in three lines, while a caller that wants to draw it natively (D14) can
 * read the same structure. Handing back a string would make the second caller
 * parse XML to find out where the notes are.
 *
 * The `map` is one anchor per step, indexed `barIndex * steps + step` — what a
 * playhead moves along.
 *
 * Authentication: any authenticated user. Stateless. Rate limiting is already
 * done by `proxy.ts`.
 */

import { getRouteLogger } from '@/lib/api/context';
import { successResponse } from '@/lib/api/responses';
import { validateRequestBody } from '@/lib/api/validation';
import { withAuth } from '@/lib/auth/guards';
import { engrave } from '@/lib/app/breaks/engrave';
import { reducePattern } from '@/lib/app/breaks/layers';
import { patternFromPacked } from '@/lib/app/breaks/share';
import { engraveBreakSchema } from '@/lib/validations/break-operations';

export const POST = withAuth(
  async (request) => {
    const log = await getRouteLogger(request);
    const input = await validateRequestBody(request, engraveBreakSchema);

    /* The break is stored whole and every layer is derived, so drawing L2 means
       reducing first — the same call the Studio makes. The ghost pattern is the
       full one, which is how the chart shows what a lower layer left out. */
    const full = patternFromPacked(input.doc);
    const shown = reducePattern(full, input.layer);
    const ghost = input.layer < 5 ? full : null;

    const engraving = engrave(shown, ghost, {
      scale: input.scale,
      perSystem: input.perSystem,
      guides: input.guides,
      sticking: input.sticking,
    });

    log.info('Break engraved', {
      layer: input.layer,
      bars: full.bars.length,
      nodes: engraving.nodes.length,
    });
    return successResponse(engraving);
  },
  {
    ownership: {
      decidedBy: 'nothing',
      because:
        'Stateless: draws a document in the request body. No row is read or written, so there is no subject to scope to.',
    },
  }
);
