import { z } from 'zod';

import { SECTIONS } from '@/lib/app/breaks/buddy/describe';
import {
  type EditData,
  barsSummary,
  describeEdit,
  editWorkspace,
} from '@/lib/app/breaks/buddy/edit';
import { DOCTOR_MOVES, type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `apply_doctor_move` — one of the doctor's twelve named edits, on section A,
 * B or both, in the caller's own workspace.
 *
 * The same `doctor()` the Studio's Doctor panel runs, against the style's
 * current version, as the panel does. Written through `editWorkspace`, so the
 * result is held to `sharePayloadSchema` and a write that loses a race with
 * another tool call is made again on the newer pattern.
 */

const MOVES = DOCTOR_MOVES.map((m) => m.move) as [DoctorMove, ...DoctorMove[]];

const schema = z.object({
  move: z.enum(MOVES),
  section: z.enum(['A', 'B', 'both']).default('A'),
});

type Args = z.infer<typeof schema>;

const MOVE_LIST = DOCTOR_MOVES.map((m) => `"${m.move}" (${m.label})`).join(', ');

export class ApplyDoctorMoveCapability extends BaseCapability<Args, EditData> {
  readonly slug = 'apply_doctor_move';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'apply_doctor_move',
    description: `Apply one of the Studio's named edits to the open pattern, on section A, B or both. Prefer this over rewriting bars when a move does what was asked. Moves: ${MOVE_LIST}. Some moves are random within the style's rules, so applying one twice gives a different result. Returns the changed sections as text and which bars changed.`,
    parameters: {
      type: 'object',
      properties: {
        move: {
          type: 'string',
          enum: MOVES,
          description: 'Which edit to make.',
        },
        section: {
          type: 'string',
          enum: ['A', 'B', 'both'],
          description: 'Which section to change. Defaults to A.',
        },
      },
      required: ['move'],
    },
  };

  protected readonly schema = schema;

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<EditData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const targets = args.section === 'both' ? SECTIONS : [args.section];
    const outcome = await editWorkspace(context.userId, (doc, { style }) => {
      const next = { ...doc };
      for (const section of targets) {
        /* A move writes new notes, so it needs the live style rather than the
           snapshot the pattern carries — the Studio's rule too. */
        const live = style(doc[section].style);
        if (!live) {
          return {
            ok: false,
            message: `Section ${section}'s style "${doc[section].style}" is no longer in the catalogue, so it can't be doctored`,
            code: 'style_missing',
          };
        }
        next[section] = doctor(doc[section], live.params, args.move);
      }
      return { ok: true, doc: next, extra: null };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const described = describeEdit(outcome.before, outcome.after, targets);
    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary: `${moveLabel(args.move)}: ${barsSummary(described.changes)}`,
      ...described,
    });
  }
}

function moveLabel(move: DoctorMove): string {
  return DOCTOR_MOVES.find((m) => m.move === move)?.label ?? move;
}
