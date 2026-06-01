import { z } from 'zod';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';
import {
  MutationSummary,
  resolveCleanupTarget,
  summariseMutation,
  writeCleanupContent,
} from '@/lib/orchestration/capabilities/built-in/document-cleanup/context';
import { requireEditableTarget } from '@/lib/orchestration/knowledge/edit-lock';

const schema = z.object({
  regex: z.string().min(1).max(500),
  flags: z.string().max(8).optional(),
});

type Args = z.infer<typeof schema>;

interface Data extends MutationSummary {
  pattern: string;
  matchCount: number;
}

export class StripMatchesCapability extends BaseCapability<Args, Data> {
  readonly slug = 'strip_matches';
  protected readonly schema = schema;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'strip_matches',
    description:
      'Remove inline occurrences of the given regex from the document, leaving the surrounding text intact. Use for noise that appears mid-line (e.g. inline timestamps, footnote markers). Deterministic — does not consume LLM tokens. The "g" flag is forced on so all matches are removed.',
    parameters: {
      type: 'object',
      properties: {
        regex: {
          type: 'string',
          description: 'Regex pattern (no surrounding slashes).',
        },
        flags: {
          type: 'string',
          description: 'Regex flags. "g" is always added. Default: "".',
        },
      },
      required: ['regex'],
    },
  };

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<Data>> {
    const target = await resolveCleanupTarget(context);
    if (!target) return this.error('Not in a Document Clean Up session.', 'not_cleanup_session');

    const lock = await requireEditableTarget(target.documentId, context.userId);
    if (!lock.ok) {
      return this.error('The document is being edited by another admin.', 'target_locked');
    }

    const flags = (args.flags ?? '').includes('g') ? args.flags! : `${args.flags ?? ''}g`;
    let pattern: RegExp;
    try {
      pattern = new RegExp(args.regex, flags);
    } catch (err) {
      return this.error(`Invalid regex: ${(err as Error).message}`, 'invalid_regex');
    }

    const matches = target.content.match(pattern);
    const next = target.content.replace(pattern, '');
    await writeCleanupContent(target.documentId, next);
    return this.success({
      pattern: args.regex,
      matchCount: matches?.length ?? 0,
      ...summariseMutation(target.content, next),
    });
  }
}
