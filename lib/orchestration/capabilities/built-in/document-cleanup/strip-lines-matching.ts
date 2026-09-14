import { z } from 'zod';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';
import {
  compileSafeRegex,
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
}

export class StripLinesMatchingCapability extends BaseCapability<Args, Data> {
  readonly slug = 'strip_lines_matching';
  protected readonly schema = schema;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'strip_lines_matching',
    description:
      'Remove whole lines from the document where the given regex matches anywhere in the line. Use for line-oriented noise (e.g. transcript metadata rows, repeated banners). Deterministic — does not consume LLM tokens.',
    parameters: {
      type: 'object',
      properties: {
        regex: {
          type: 'string',
          description: 'Regex pattern (no surrounding slashes). Tested against each line.',
        },
        flags: {
          type: 'string',
          description: 'Regex flags (e.g. "i" for case-insensitive). Default: "".',
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

    const compiled = compileSafeRegex(args.regex, args.flags ?? '');
    if (!compiled.ok) {
      return this.error(compiled.error, 'invalid_regex');
    }
    const pattern = compiled.regex;

    const next = target.content
      .split('\n')
      .filter((line) => !pattern.test(line))
      .join('\n');

    await writeCleanupContent(target.documentId, next, {
      source: 'capability:strip_lines_matching',
      actorId: context.userId,
    });
    return this.success({ pattern: args.regex, ...summariseMutation(target.content, next) });
  }
}
