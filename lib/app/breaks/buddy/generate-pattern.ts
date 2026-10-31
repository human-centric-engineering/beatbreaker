import { z } from 'zod';

import { TEMPO_TOP, maxBpm, maxBpmOf } from '@/lib/app/breaks/audio/transport';
import { type EditData, describeEdit, editWorkspace } from '@/lib/app/breaks/buddy/edit';
import { DEFAULT_METER, METER_KEYS } from '@/lib/app/breaks/meter';
import { lettersOf } from '@/lib/app/breaks/sections';
import { withoutExtraSections } from '@/lib/app/breaks/share';
import { songBreak, songForSeed } from '@/lib/app/breaks/song-break';
import { songPaces } from '@/lib/app/breaks/songs';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `generate_pattern` — a new A section, and the B derived from it, from a
 * style in the catalogue. What the Studio's Generate button does: the
 * rejection sampler (`generateGood`) draws sixteen and keeps the best, and
 * `deriveB` builds the chorus. A song written in sections (11-e-ii-d) is
 * every section, each in its own meter, and the song's arrangement
 * (`songBreak`).
 *
 * Replaces every section of the workspace. The tempo is kept when it suits the
 * style and moved into the style's range when it does not, unless one is given.
 */

const schema = z.object({
  style: z.string().min(1).max(40),
  meter: z
    .string()
    .refine((m) => METER_KEYS.includes(m), 'unknown meter')
    .optional(),
  bars: z.number().int().min(1).max(8).default(2),
  density: z.number().min(0).max(100).default(55),
  ghosts: z.number().min(0).max(100).default(60),
  swing: z.number().int().min(0).max(100).optional(),
  bpm: z.number().int().min(50).max(TEMPO_TOP).optional(),
  seed: z.number().int().min(0).max(0xffffffff).optional(),
});

type Args = z.infer<typeof schema>;

export class GeneratePatternCapability extends BaseCapability<Args, EditData> {
  readonly slug = 'generate_pattern';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'generate_pattern',
    description:
      "Write a brand-new pattern in a style from list_styles, replacing every section of the open pattern: the generator draws sixteen candidates and keeps the one the critic scores best, and section B is derived from A. Where the style's song is written in sections (an intro and a groove, a part in another meter), every section is written in its own meter, with the song's arrangement. Use a style key, never a label. The tempo stays where it is if it suits the style; otherwise it moves into the style's range. Returns the new sections as text.",
    parameters: {
      type: 'object',
      properties: {
        style: { type: 'string', description: 'A style key from list_styles.' },
        meter: {
          type: 'string',
          enum: METER_KEYS,
          description: "Time signature. Defaults to the style's own.",
        },
        bars: {
          type: 'integer',
          minimum: 1,
          maximum: 8,
          description: 'Bars per section. Defaults to 2.',
        },
        density: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'How busy the kick is, 0–100. Defaults to 55.',
        },
        ghosts: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'How many ghost notes, 0–100. Defaults to 60.',
        },
        swing: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          description: "Swing, 0–100. Defaults to the style's.",
        },
        bpm: {
          type: 'integer',
          minimum: 50,
          maximum: TEMPO_TOP,
          description: 'Tempo, if it should change.',
        },
        seed: {
          type: 'integer',
          minimum: 0,
          description: 'Only to reproduce an earlier pattern exactly.',
        },
      },
      required: ['style'],
    },
  };

  protected readonly schema = schema;

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<EditData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    /* Drawn once, outside the edit, so a retried write writes the same pattern. */
    const seed = args.seed ?? Math.floor(Math.random() * 0xffffffff);

    const outcome = await editWorkspace(context.userId, (doc, { style: find }) => {
      const style = find(args.style);
      if (!style) {
        return {
          ok: false,
          message: `There is no style "${args.style}". Call list_styles and use one of its keys`,
          code: 'unknown_style',
        };
      }
      const meter = args.meter ?? style.params.meter ?? DEFAULT_METER;
      /* The song the seed picks, first: a song in sections is every section
         in its own meter, so the tempo has to suit the slowest of them. */
      const song = songForSeed(style.params, seed, meter);
      const [lo, hi] = style.params.bpm;
      const wanted =
        args.bpm ?? (doc.bpm >= lo && doc.bpm <= hi ? doc.bpm : Math.round((lo + hi) / 2));
      const top = song?.sections ? maxBpmOf(songPaces(style.params, song)) : maxBpm(meter);
      const bpm = Math.min(Math.max(wanted, 50), top);

      const made = songBreak({
        style,
        // the song the tempo was set for, so the two cannot disagree
        song: song?.key,
        seed,
        meter,
        bars: args.bars,
        density: args.density,
        ghosts: args.ghosts,
        bpm,
      });
      // a brand-new pattern is an A and a B, as the Studio's New writes one, or a song's sections
      const kept = withoutExtraSections(doc);
      return {
        ok: true,
        doc: {
          ...kept,
          ...made.sections,
          arrangement: made.arrangement ?? kept.arrangement,
          bpm,
          swing: args.swing ?? style.params.swing,
        },
        extra: style.params.label,
      };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const { after } = outcome;
    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary: `New ${outcome.extra} pattern: ${after.A.bars.length} bar${after.A.bars.length > 1 ? 's' : ''} of ${after.A.meter} at ${after.bpm} bpm`,
      ...describeEdit(outcome.before, after, lettersOf(after)),
    });
  }
}
