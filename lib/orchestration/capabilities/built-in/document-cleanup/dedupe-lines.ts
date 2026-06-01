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
  consecutiveOnly: z.boolean().optional(),
});

type Args = z.infer<typeof schema>;

interface Data extends MutationSummary {
  consecutiveOnly: boolean;
  removed: number;
}

export class DedupeLinesCapability extends BaseCapability<Args, Data> {
  readonly slug = 'dedupe_lines';
  protected readonly schema = schema;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'dedupe_lines',
    description:
      'Remove duplicate lines. With consecutiveOnly=true (default), drops only adjacent repeats (e.g. transcript stutters). With consecutiveOnly=false, drops every repeat across the whole document. Comparison is case-sensitive and whitespace-sensitive. Deterministic — does not consume LLM tokens.',
    parameters: {
      type: 'object',
      properties: {
        consecutiveOnly: {
          type: 'boolean',
          description:
            'true = remove only consecutive duplicates. false = remove every duplicate across the document. Default: true.',
        },
      },
    },
  };

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<Data>> {
    const target = await resolveCleanupTarget(context);
    if (!target) return this.error('Not in a Document Clean Up session.', 'not_cleanup_session');

    const lock = await requireEditableTarget(target.documentId, context.userId);
    if (!lock.ok) {
      return this.error('The document is being edited by another admin.', 'target_locked');
    }

    const consecutiveOnly = args.consecutiveOnly ?? true;
    const lines = target.content.split('\n');
    let nextLines: string[];
    if (consecutiveOnly) {
      nextLines = [];
      for (const line of lines) {
        if (nextLines.length === 0 || nextLines[nextLines.length - 1] !== line) {
          nextLines.push(line);
        }
      }
    } else {
      const seen = new Set<string>();
      nextLines = [];
      for (const line of lines) {
        if (!seen.has(line)) {
          seen.add(line);
          nextLines.push(line);
        }
      }
    }
    const next = nextLines.join('\n');
    await writeCleanupContent(target.documentId, next);
    return this.success({
      consecutiveOnly,
      removed: lines.length - nextLines.length,
      ...summariseMutation(target.content, next),
    });
  }
}
