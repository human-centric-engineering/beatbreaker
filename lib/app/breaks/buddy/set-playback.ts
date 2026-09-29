import { z } from 'zod';

import { maxBpm } from '@/lib/app/breaks/audio/transport';
import { type EditData, editWorkspace } from '@/lib/app/breaks/buddy/edit';
import { FULL_LAYER, layerName } from '@/lib/app/breaks/layers';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `set_playback` — tempo, swing and the layer showing. Settings, not notes.
 *
 * These three travel with the pattern, so they are the workspace's to change.
 * The count-in the plan also lists does not: it is a Studio setting of the
 * person's (`StudioSettings`), not part of a pattern, and a tool that wrote
 * it would reach past the document every other tool edits.
 */

/* The Studio's own tempo floor. The ceiling depends on the meter
   (`maxBpm`), so it is checked against the pattern, not the schema. */
const MIN_BPM = 50;
const MAX_BPM = 300;

const schema = z
  .object({
    bpm: z.number().int().min(MIN_BPM).max(MAX_BPM).optional(),
    swing: z.number().int().min(0).max(100).optional(),
    layer: z.number().int().min(1).max(FULL_LAYER).optional(),
  })
  .refine((a) => a.bpm !== undefined || a.swing !== undefined || a.layer !== undefined, {
    message: 'Name at least one of bpm, swing or layer',
  });

type Args = z.infer<typeof schema>;

export class SetPlaybackCapability extends BaseCapability<Args, EditData> {
  readonly slug = 'set_playback';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'set_playback',
    description: `Change how the open pattern plays, not its notes: the tempo (${MIN_BPM}–190 bpm, or up to ${MAX_BPM} in compound meters like 6/8 and 12/8), the swing (0 straight to 100 full triplet), and the layer showing (1 Skeleton, 2 Groove, 3 Sixteenths, 4 Ghosted, 5 Full break — lower layers are simplified views for practising). Give only what should change.`,
    parameters: {
      type: 'object',
      properties: {
        bpm: { type: 'integer', minimum: MIN_BPM, maximum: MAX_BPM, description: 'Tempo.' },
        swing: { type: 'integer', minimum: 0, maximum: 100, description: 'Swing amount.' },
        layer: { type: 'integer', minimum: 1, maximum: FULL_LAYER, description: 'Layer to show.' },
      },
    },
  };

  protected readonly schema = schema;

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<EditData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const outcome = await editWorkspace(context.userId, (doc) => {
      const top = maxBpm(doc.A.meter);
      if (args.bpm !== undefined && args.bpm > top) {
        return {
          ok: false,
          message: `The Studio plays ${doc.A.meter} up to ${top} bpm`,
          code: 'tempo_out_of_range',
        };
      }
      return {
        ok: true,
        doc: {
          ...doc,
          bpm: args.bpm ?? doc.bpm,
          swing: args.swing ?? doc.swing,
          level: args.layer ?? doc.level,
        },
        extra: null,
      };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const { after } = outcome;
    const parts = [
      args.bpm !== undefined ? `${after.bpm} bpm` : null,
      args.swing !== undefined ? `swing ${after.swing}` : null,
      args.layer !== undefined ? `layer ${after.level} (${layerName(after.level)})` : null,
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
