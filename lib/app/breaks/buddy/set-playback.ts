import { z } from 'zod';

import { TEMPO_FLOOR, TEMPO_TOP, maxBpmOf, minBpmOf } from '@/lib/app/breaks/audio/transport';
import { type EditData, editWorkspace } from '@/lib/app/breaks/buddy/edit';
import { FULL_LAYER, patternLayerName } from '@/lib/app/breaks/layers';
import {
  SECTION_LETTERS,
  type SectionLetter,
  hasTempoRatios,
  patternsOf,
  ratioLabel,
  TEMPO_RATIOS,
  type TempoRatio,
  isOfferedRatio,
} from '@/lib/app/breaks/sections';
import type { BreakDoc } from '@/lib/app/breaks/share';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `set_playback` — tempo, swing and the layer showing, and how fast one
 * section plays against the tempo (×½, ×1, ×2; 11-e-ii-g). Settings, not notes.
 *
 * These three travel with the pattern, so they are the workspace's to change.
 * The count-in the plan also lists does not: it is a Studio setting of the
 * person's (`StudioSettings`), not part of a pattern, and a tool that wrote
 * it would reach past the document every other tool edits.
 */

/* The Studio's own tempo floor and top. A section at a tempo ratio moves
   both (`maxBpmOf`, `minBpmOf`), so they are checked against the pattern too. */
const MIN_BPM = TEMPO_FLOOR;
const MAX_BPM = TEMPO_TOP;

const schema = z
  .object({
    bpm: z.number().int().min(MIN_BPM).max(MAX_BPM).optional(),
    swing: z.number().int().min(0).max(100).optional(),
    layer: z.number().int().min(1).max(FULL_LAYER).optional(),
    section: z.enum(SECTION_LETTERS).optional(),
    tempoRatio: z
      .custom<TempoRatio>((v) => v === 1 || isOfferedRatio(v), 'a tempo ratio the Studio offers')
      .optional(),
  })
  .refine(
    (a) =>
      a.bpm !== undefined ||
      a.swing !== undefined ||
      a.layer !== undefined ||
      a.tempoRatio !== undefined,
    { message: 'Name at least one of bpm, swing, layer or tempoRatio' }
  )
  .refine((a) => (a.tempoRatio === undefined) === (a.section === undefined), {
    message: 'tempoRatio and section go together: the section whose tempo it is',
    path: ['section'],
  });

type Args = z.infer<typeof schema>;

export class SetPlaybackCapability extends BaseCapability<Args, EditData> {
  readonly slug = 'set_playback';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'set_playback',
    description: `Change how the open pattern plays, not its notes: the tempo (${MIN_BPM}–${MAX_BPM} bpm), the swing (0 straight to 100 full triplet), and the layer showing (1 Skeleton, 2 Groove, 3 Sixteenths, 4 Ghosted, 5 Full break — lower layers are simplified views for practising). To play one section at half or double the tempo (a half-time break, a double-time chorus), give section and tempoRatio (0.5, 2, or 1 for the tempo itself). A metric modulation — the old triplet becoming the new beat — is 1.5; the old dotted eighth becoming the new beat is 4/3 (1.3333333333333333); 2/3 and 0.75 are the way back. Give only what should change.`,
    parameters: {
      type: 'object',
      properties: {
        bpm: { type: 'integer', minimum: MIN_BPM, maximum: MAX_BPM, description: 'Tempo.' },
        swing: { type: 'integer', minimum: 0, maximum: 100, description: 'Swing amount.' },
        layer: { type: 'integer', minimum: 1, maximum: FULL_LAYER, description: 'Layer to show.' },
        section: {
          type: 'string',
          enum: [...SECTION_LETTERS],
          description: 'The section tempoRatio applies to.',
        },
        tempoRatio: {
          type: 'number',
          enum: [1, ...TEMPO_RATIOS],
          description: "How fast the section plays against the break's tempo.",
        },
      },
    },
  };

  protected readonly schema = schema;

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<EditData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const outcome = await editWorkspace(context.userId, (doc0) => {
      const paced = args.section ? withRatio(doc0, args.section, args.tempoRatio ?? 1) : doc0;
      if (!paced) {
        return {
          ok: false,
          message: `The pattern has no section ${args.section}`,
          code: 'no_section',
        };
      }
      const doc = paced;
      const top = maxBpmOf(patternsOf(doc));
      if (args.bpm !== undefined && args.bpm > top) {
        // a section at double time holds the break to half its ceiling: say so
        const doubled = hasTempoRatios(doc) ? ', with every section at its tempo ratio' : '';
        return {
          ok: false,
          message: `The Studio plays up to ${top} bpm${doubled}`,
          code: 'tempo_out_of_range',
        };
      }
      // a section at half time holds the break to twice the floor, so it never plays under it
      const floor = minBpmOf(patternsOf(doc));
      if (args.bpm !== undefined && args.bpm < floor) {
        return {
          ok: false,
          message: `A section plays at half the break's tempo, so the break goes no lower than ${floor} bpm`,
          code: 'tempo_out_of_range',
        };
      }
      /* A ratio with no tempo named brings the tempo into the new range, as
         the Studio's picker does: a B at ×2 under a break at 120 holds it to 95. */
      const bpm = args.bpm ?? Math.min(Math.max(doc.bpm, floor), top);
      return {
        ok: true,
        doc: {
          ...doc,
          bpm,
          swing: args.swing ?? doc.swing,
          level: args.layer ?? doc.level,
        },
        extra: null,
      };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const { after } = outcome;
    const parts = [
      args.section && args.tempoRatio !== undefined
        ? `section ${args.section} at ${args.tempoRatio === 1 ? "the break's tempo" : ratioLabel(args.tempoRatio)}`
        : null,
      args.bpm !== undefined || after.bpm !== outcome.before.bpm ? `${after.bpm} bpm` : null,
      args.swing !== undefined ? `swing ${after.swing}` : null,
      args.layer !== undefined
        ? `layer ${after.level} (${patternLayerName(after.level, after.A)})`
        : null,
    ].filter((p): p is string => p !== null);

    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary: `Playback: ${parts.join(', ')}`,
      changes: [],
      sections: [],
    });
  }
}

/** The document with one section at a ratio (1 takes it off), or null when the section is not there. */
function withRatio(doc: BreakDoc, letter: SectionLetter, r: TempoRatio): BreakDoc | null {
  const pat = doc[letter];
  if (!pat) return null;
  const { tempoRatio: _was, ...rest } = pat;
  return { ...doc, [letter]: r === 1 ? rest : { ...rest, tempoRatio: r } };
}
