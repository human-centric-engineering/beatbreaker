import { z } from 'zod';

import {
  SECTION_CHOICES,
  SECTION_CHOICE_HELP,
  type Section,
  sectionsFor,
} from '@/lib/app/breaks/buddy/describe';
import {
  type EditData,
  barsSummary,
  describeEdit,
  editWorkspace,
} from '@/lib/app/breaks/buddy/edit';
import { tidy } from '@/lib/app/breaks/tidy';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `tidy_pattern` — `tidy()` on one section or all of the caller's workspace:
 * the uncontroversial clean-up, every change reported in a line a drummer can
 * read. Never adds a note.
 */

const schema = z.object({
  section: z.enum(SECTION_CHOICES).default('all'),
});

type Args = z.infer<typeof schema>;

export interface TidyPatternData extends EditData {
  /** Every change, section first: "A: bar 2, the 'e' of 3: removed the ghost — …". */
  notes: string[];
}

export class TidyPatternCapability extends BaseCapability<Args, TidyPatternData> {
  readonly slug = 'tidy_pattern';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'tidy_pattern',
    description:
      'Clean up the open pattern without changing its groove: drop notes in lanes the kit does not carry, a hi-hat and ride on the same step, a third hand on one step, a ghost note right beside an accent, a hat-foot chick under an open hat, and pins with no note under them. Never adds a note. Returns every change it made, one line each. Anything that is a matter of taste is a doctor move instead.',
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: SECTION_CHOICES,
          description: `Which section to tidy. ${SECTION_CHOICE_HELP} Defaults to all.`,
        },
      },
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<TidyPatternData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const outcome = await editWorkspace(context.userId, (doc) => {
      const targets = sectionsFor(doc, args.section);
      if (!targets.ok) return targets;
      const next = { ...doc };
      const notes: string[] = [];
      for (const section of targets.sections) {
        const pat = doc[section];
        if (!pat) continue;
        const result = tidy(pat);
        next[section] = result.pattern;
        notes.push(...result.changes.map((c) => `${section}: ${c.note}`));
      }
      return { ok: true, doc: next, extra: { notes, targets: targets.sections } };
    });
    if (!outcome.ok) return this.error(outcome.message, outcome.code);

    const targets: readonly Section[] = outcome.extra.targets;
    const described = describeEdit(outcome.before, outcome.after, targets);
    const notes = outcome.extra.notes;
    return this.success({
      doc: outcome.payload,
      rev: outcome.rev,
      summary:
        notes.length === 0
          ? 'Tidy: nothing to tidy'
          : `Tidy: ${notes.length} change${notes.length > 1 ? 's' : ''} (${barsSummary(described.changes)})`,
      ...described,
      notes,
    });
  }
}
