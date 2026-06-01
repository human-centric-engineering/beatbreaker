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
  format: z.enum(['colon', 'bracketed', 'both']).optional(),
});

type Args = z.infer<typeof schema>;

interface Data extends MutationSummary {
  format: 'colon' | 'bracketed' | 'both';
  removed: number;
}

// "John:", "Mary Smith:" at start of line. Allows 1-4 capitalised words.
const COLON = /^([A-Z][A-Za-z'’-]+)(\s[A-Z][A-Za-z'’-]+){0,3}:\s?/gm;
// "[John]", "[Mary Smith]" at start of line (transcript convention).
const BRACKETED = /^\[([A-Z][A-Za-z'’-]+)(\s[A-Z][A-Za-z'’-]+){0,3}\]\s?/gm;

export class StripSpeakerLabelsCapability extends BaseCapability<Args, Data> {
  readonly slug = 'strip_speaker_labels';
  protected readonly schema = schema;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'strip_speaker_labels',
    description:
      'Remove speaker labels at the start of lines (e.g. "John:", "Mary Smith:", "[John]"). Useful for cleaning interview/podcast transcripts. Deterministic — does not consume LLM tokens.',
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['colon', 'bracketed', 'both'],
          description:
            '"colon" = "Name:" form; "bracketed" = "[Name]" form; "both" = strip either. Default: "both".',
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

    const format = args.format ?? 'both';
    let next = target.content;
    let removed = 0;
    if (format === 'colon' || format === 'both') {
      removed += (next.match(COLON) ?? []).length;
      next = next.replace(COLON, '');
    }
    if (format === 'bracketed' || format === 'both') {
      removed += (next.match(BRACKETED) ?? []).length;
      next = next.replace(BRACKETED, '');
    }
    await writeCleanupContent(target.documentId, next, {
      source: 'capability:strip_speaker_labels',
      actorId: context.userId,
    });
    return this.success({ format, removed, ...summariseMutation(target.content, next) });
  }
}
