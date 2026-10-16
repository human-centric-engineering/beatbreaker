import { z } from 'zod';

import {
  type EditData,
  barsSummary,
  describeEdit,
  editWorkspace,
} from '@/lib/app/breaks/buddy/edit';
import {
  type CrossRhythmSpec,
  STREAM_LANES,
  crossRhythm,
  cycleChoices,
  handsFor,
} from '@/lib/app/breaks/cross-rhythm';
import { bbValue } from '@/lib/app/breaks/lanes';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { SECTION_LETTERS } from '@/lib/app/breaks/sections';
import { TEXT_LANE_LABELS } from '@/lib/app/breaks/text';
import type { LaneKey } from '@/lib/app/breaks/types';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `make_cross_rhythm` — "make bar 3 a 5:4 between snare and kick" (13-c).
 *
 * The same `crossRhythm` the Studio's Cross-rhythm card runs, so the figure
 * BeatBuddy writes is the one the card would: the pulse on the grid, the
 * cross-rhythm on it where the cycle holds it and a tuplet span where it does
 * not, as a study of the whole section or a fill at the end of a bar.
 * Written through `editWorkspace`, so the result is held to the wire schema.
 */

/** The lanes a stream may be on, by the names the text notation uses. */
const LANE_NAMES = STREAM_LANES.map((L) => TEXT_LANE_LABELS[L]) as [string, ...string[]];
const laneKey = (name: string): LaneKey | undefined =>
  STREAM_LANES.find((L) => TEXT_LANE_LABELS[L] === name);

const schema = z.object({
  section: z.enum(SECTION_LETTERS).default('A'),
  ratio: z.string().regex(/^\d:\d$/, 'a ratio is written n:m, such as 3:2'),
  cross_lane: z.enum(LANE_NAMES),
  pulse_lane: z.enum(LANE_NAMES).optional(),
  cycle: z.enum(['bar', 'half', 'beat']).default('bar'),
  hand: z.enum(['right', 'left', 'any']).default('any'),
  as: z.enum(['study', 'fill']),
  bar: z.number().int().min(1).max(8).optional(),
});

type Args = z.infer<typeof schema>;

export class MakeCrossRhythmCapability extends BaseCapability<Args, EditData> {
  readonly slug = 'make_cross_rhythm';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'make_cross_rhythm',
    description:
      'Write a cross-rhythm into the open pattern from its ratio: "3:2" is three even notes on cross_lane against two on pulse_lane, starting together and landing together each cycle. The pulse is on the grid; the cross-rhythm is on the grid where the cycle holds it and a tuplet where it does not, so a 5:4 or 3:2 in plain 4/4 is exact. as "study" makes the whole section the exercise (every bar the figure and nothing else), learnt a stream a layer like the Polyrhythms library; as "fill" puts one cycle at the end of a bar of the groove, up to the bar line, the hands leaving it, the rest of the groove kept. Prefer this over write_bars for any polyrhythm the user names by its ratio. Returns the changed section as text.',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: [...SECTION_LETTERS],
          description: 'Which section to write it in. Defaults to A.',
        },
        ratio: {
          type: 'string',
          description:
            'The cross-rhythm against the pulse, n:m, each from 2 to 9 and not equal: "3:2", "4:3", "5:4". The pulse (m) must divide the cycle into steps of the grid.',
        },
        cross_lane: {
          type: 'string',
          enum: LANE_NAMES,
          description: 'The drum or cymbal the cross-rhythm (n) is played on.',
        },
        pulse_lane: {
          type: 'string',
          enum: LANE_NAMES,
          description:
            'The drum or cymbal the pulse (m) is played on. Needed for a study; for a fill, leave it out to keep the groove’s own time under the figure.',
        },
        cycle: {
          type: 'string',
          enum: ['bar', 'half', 'beat'],
          description:
            'How long one cycle of the figure is: a bar, half a bar or a beat. Defaults to the bar. A fill is one cycle.',
        },
        hand: {
          type: 'string',
          enum: ['right', 'left', 'any'],
          description:
            "The hand the cross-rhythm is played with, a pulse on a hand lane getting the other; where the cross-rhythm is on a foot, the pulse's hand. Defaults to any, which lets the drummer choose.",
        },
        as: {
          type: 'string',
          enum: ['study', 'fill'],
          description: 'A study of the whole section, or a fill at the end of one bar.',
        },
        bar: {
          type: 'integer',
          description:
            'For a fill only: the bar it ends, counting from 1. Defaults to the last bar.',
        },
      },
      required: ['ratio', 'cross_lane', 'as'],
    },
  };

  protected readonly schema = schema;

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<EditData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');
    const [cross, pulse] = args.ratio.split(':').map(Number);

    const outcome = await editWorkspace(context.userId, (doc, { style }) => {
      const pat = doc[args.section];
      if (!pat) {
        return { ok: false, message: `There is no section ${args.section}`, code: 'no_section' };
      }
      const cycles = cycleChoices(meterOfPat(pat));
      const cycle = cycles.find((c) => c.key === args.cycle);
      if (!cycle) {
        return {
          ok: false,
          message: `A bar of ${pat.meter} has no ${args.cycle === 'half' ? 'even half' : 'even beat'} to cycle over: use ${cycles.map((c) => `"${c.key}"`).join(' or ')}`,
          code: 'bad_cycle',
        };
      }
      const crossLane = laneKey(args.cross_lane);
      const pulseLane = args.pulse_lane ? laneKey(args.pulse_lane) : undefined;
      if (!crossLane || (args.pulse_lane && !pulseLane))
        return { ok: false, message: 'There is no lane by that name', code: 'bad_lane' };
      if (args.as === 'study' && args.bar !== undefined)
        return {
          ok: false,
          message: 'A study is the whole section; bar is for a fill',
          code: 'bar_on_study',
        };
      const hand = args.hand === 'right' ? 'R' : args.hand === 'left' ? 'L' : undefined;
      const hands = handsFor(crossLane, pulseLane, hand);
      if (hand && !hands)
        return {
          ok: false,
          message: 'Neither lane is played by a hand, so there is no hand to name: leave hand out',
          code: 'no_hand_lane',
        };
      const spec: CrossRhythmSpec = {
        cross,
        pulse,
        crossLane,
        ...(pulseLane ? { pulseLane } : {}),
        cycle: cycle.steps,
        ...(hands ? { hands } : {}),
        as: args.as,
        ...(args.as === 'fill' ? { bar: (args.bar ?? pat.bars.length) - 1 } : {}),
      };
      // a fill on a clave style keeps its clave, as the Studio's does
      const params = style(pat.style)?.params;
      const result = crossRhythm(
        pat,
        spec,
        params?.clave ? { clave: true, claveValue: bbValue('s', params) } : {}
      );
      if (!result.ok)
        return { ok: false, message: `Not written: ${result.reason}`, code: 'not_written' };
      return { ok: true, doc: { ...doc, [args.section]: result.pattern }, extra: [args.section] };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const described = describeEdit(outcome.before, outcome.after, outcome.extra);
    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary: `${args.ratio} ${args.as === 'study' ? 'study' : 'fill'}: ${barsSummary(described.changes)}`,
      ...described,
    });
  }
}
