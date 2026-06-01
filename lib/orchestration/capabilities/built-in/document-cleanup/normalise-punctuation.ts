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

const schema = z.object({}).strict();
type Args = z.infer<typeof schema>;

interface Data extends MutationSummary {
  substitutions: number;
}

const SUBS: Array<[RegExp, string]> = [
  [/[‘’‚‛]/g, "'"], // single quotes
  [/[“”„‟]/g, '"'], // double quotes
  [/–/g, '-'], // en dash
  [/—/g, '--'], // em dash
  [/…/g, '...'], // ellipsis
  [new RegExp('\u00A0', 'g'), ' '], // non-breaking space
];

export class NormalisePunctuationCapability extends BaseCapability<Args, Data> {
  readonly slug = 'normalise_punctuation';
  protected readonly schema = schema;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'normalise_punctuation',
    description:
      'Convert typographic punctuation to ASCII equivalents: smart quotes → straight quotes, en/em dashes → hyphens, ellipsis character → "...", non-breaking space → space. Improves chunking consistency. Deterministic — does not consume LLM tokens.',
    parameters: { type: 'object', properties: {} },
  };

  async execute(_args: Args, context: CapabilityContext): Promise<CapabilityResult<Data>> {
    const target = await resolveCleanupTarget(context);
    if (!target) return this.error('Not in a Document Clean Up session.', 'not_cleanup_session');

    const lock = await requireEditableTarget(target.documentId, context.userId);
    if (!lock.ok) {
      return this.error('The document is being edited by another admin.', 'target_locked');
    }

    let next = target.content;
    let substitutions = 0;
    for (const [pattern, replacement] of SUBS) {
      const matches = next.match(pattern);
      substitutions += matches?.length ?? 0;
      next = next.replace(pattern, replacement);
    }
    await writeCleanupContent(target.documentId, next, {
      source: 'capability:normalise_punctuation',
      actorId: context.userId,
    });
    return this.success({ substitutions, ...summariseMutation(target.content, next) });
  }
}
