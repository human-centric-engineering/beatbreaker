import { z } from 'zod';

import {
  SECTIONS,
  type Section,
  type SectionView,
  changedBars,
  decodeWorkspace,
  viewSection,
} from '@/lib/app/breaks/buddy/describe';
import { readWorkspace, writeWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { listStyles, styleLookup } from '@/lib/app/breaks/catalogue/data';
import { DOCTOR_MOVES, type DoctorMove, doctor } from '@/lib/app/breaks/doctor';
import { type SharePayload, sharePayloadSchema } from '@/lib/app/breaks/schema';
import { breakPayload } from '@/lib/app/breaks/share';
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
 * current version, as the panel does. The new document is held to
 * `sharePayloadSchema` before it is written or returned, and is written only
 * if nobody changed the workspace since it was read.
 */

const MOVES = DOCTOR_MOVES.map((m) => m.move) as [DoctorMove, ...DoctorMove[]];

const schema = z.object({
  move: z.enum(MOVES),
  section: z.enum(['A', 'B', 'both']).default('A'),
});

type Args = z.infer<typeof schema>;

export interface SectionChange {
  section: Section;
  /** 1-based. Empty when the move found nothing to change. */
  bars: number[];
}

export interface ApplyDoctorMoveData {
  /** The whole new document, for the Studio to apply. */
  doc: SharePayload;
  rev: number;
  /** One sentence for the change chip. */
  summary: string;
  changes: SectionChange[];
  /** The sections the move touched, as they read now. */
  sections: SectionView[];
}

const MOVE_LIST = DOCTOR_MOVES.map((m) => `"${m.move}" (${m.label})`).join(', ');

export class ApplyDoctorMoveCapability extends BaseCapability<Args, ApplyDoctorMoveData> {
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

  async execute(
    args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<ApplyDoctorMoveData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const workspace = await readWorkspace(context.userId);
    if (!workspace) {
      return this.error('No pattern is open in the Studio yet', 'no_workspace');
    }

    const doc = await decodeWorkspace(workspace.doc);
    const lookup = styleLookup(await listStyles());
    const targets = args.section === 'both' ? SECTIONS : [args.section];

    const next = { ...doc };
    const changes: SectionChange[] = [];
    for (const section of targets) {
      /* A move writes new notes, so it needs the live style rather than the
         snapshot the pattern carries — the Studio's rule too. */
      const style = lookup(doc[section].style);
      if (!style) {
        return this.error(
          `Section ${section}'s style "${doc[section].style}" is no longer in the catalogue, so it can't be doctored`,
          'style_missing'
        );
      }
      next[section] = doctor(doc[section], style.params, args.move);
      changes.push({ section, bars: changedBars(doc[section], next[section]) });
    }

    const parsed = sharePayloadSchema.safeParse(breakPayload(next));
    if (!parsed.success) {
      return this.error('That move produced a pattern the Studio cannot read', 'invalid_result');
    }

    const written = await writeWorkspace(context.userId, parsed.data, workspace.rev);
    if (!written) {
      return this.error(
        'The pattern changed while this was running. Call get_pattern and try again',
        'workspace_changed'
      );
    }

    return this.success({
      doc: written.doc,
      rev: written.rev,
      summary: summarise(args.move, changes),
      changes,
      sections: targets.map((s) => viewSection(next[s], s, next.bpm, next.swing)),
    });
  }
}

function summarise(move: DoctorMove, changes: SectionChange[]): string {
  const label = DOCTOR_MOVES.find((m) => m.move === move)?.label ?? move;
  const parts = changes.map(({ section, bars }) =>
    bars.length === 0
      ? `nothing to change in ${section}`
      : `${section} bar${bars.length > 1 ? 's' : ''} ${bars.join(', ')}`
  );
  return `${label}: ${parts.join('; ')}`;
}
