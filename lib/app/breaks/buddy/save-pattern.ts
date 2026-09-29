import { z } from 'zod';

import { readWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { withFreshSlug } from '@/lib/app/breaks/community/sharing';
import { breakCreateData } from '@/lib/app/breaks/saved/create';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';
import { createBreakSchema } from '@/lib/validations/breaks';

/**
 * `save_pattern` — save the workspace to the caller's account, with a title,
 * as a new private pattern.
 *
 * The row is built by `breakCreateData()`, the function `POST /api/v1/breaks`
 * builds its rows with, from input held to the same `createBreakSchema`. The
 * owner is `context.userId`. It is always private: sharing and publishing are
 * the person's to do, from Share & export.
 */

const schema = z.object({
  title: z.string().trim().min(1).max(120),
});

type Args = z.infer<typeof schema>;

export interface SavePatternData {
  id: string;
  title: string;
}

export class SavePatternCapability extends BaseCapability<Args, SavePatternData> {
  readonly slug = 'save_pattern';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'save_pattern',
    description:
      "Save the open pattern to the user's account as a new private pattern with this title. Only when the user asks to save. It cannot share or publish; that is the user's to do from Share & export.",
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title, up to 120 characters.' },
      },
      required: ['title'],
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<SavePatternData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');
    const userId = context.userId;

    const workspace = await readWorkspace(userId);
    if (!workspace) return this.error('No pattern is open in the Studio yet', 'no_workspace');

    /* The workspace was read through the lenient stored schema; a save is held
       to the strict one, as a save from the Studio is. */
    const input = createBreakSchema.safeParse({ title: args.title, doc: workspace.doc });
    if (!input.success) {
      return this.error('The open pattern cannot be saved as it stands', 'invalid_pattern');
    }

    const { withSlug } = await breakCreateData(userId, input.data);
    const saved = await withFreshSlug(() =>
      prisma.break.create({ data: withSlug(), select: { id: true, title: true } })
    );

    logger.info('BeatBuddy saved a pattern', { userId, breakId: saved.id });
    return this.success({ id: saved.id, title: saved.title });
  }
}
