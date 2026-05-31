import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { logger } from '@/lib/logging';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';
import { getProvider } from '@/lib/orchestration/llm/provider-manager';
import {
  MutationSummary,
  resolveCleanupTarget,
  summariseMutation,
  writeCleanupContent,
} from '@/lib/orchestration/capabilities/built-in/document-cleanup/context';
import { getDocumentSizeReport } from '@/lib/orchestration/knowledge/size-report';

const schema = z.object({
  instructions: z.string().min(1).max(2000),
});

type Args = z.infer<typeof schema>;

interface Data extends MutationSummary {
  instructions: string;
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM_PROMPT = `You are a document cleanup assistant. The user will give you a document and instructions for how to clean it up. Apply the instructions faithfully and return ONLY the cleaned document — no preamble, no commentary, no markdown code fences. Preserve the document's meaning and factual content. Remove only what the instructions specify or clear noise (filler words, repetition, formatting artefacts) the instructions imply.`;

export class RewriteWithLlmCapability extends BaseCapability<Args, Data> {
  readonly slug = 'rewrite_with_llm';
  protected readonly schema = schema;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'rewrite_with_llm',
    description:
      'Use an LLM to rewrite the entire document according to natural-language instructions (e.g. "remove filler words and tighten verbose sentences"). Expensive — consumes tokens proportional to document length. Refuses when document is too large (size class "too-large"); run deterministic strips first or use rewrite_section_with_llm.',
    parameters: {
      type: 'object',
      properties: {
        instructions: {
          type: 'string',
          description:
            'What to do with the document. Plain natural language. Be specific (e.g. "remove all filler words like um, uh, you know") — vague instructions produce vague results.',
        },
      },
      required: ['instructions'],
    },
  };

  async execute(args: Args, context: CapabilityContext): Promise<CapabilityResult<Data>> {
    const target = await resolveCleanupTarget(context);
    if (!target) return this.error('Not in a Document Clean Up session.', 'not_cleanup_session');

    const size = getDocumentSizeReport(target.content);
    if (!size.llmRewriteAllowed) {
      return this.error(
        `Document is too large for whole-doc LLM rewrite (${size.tokenCount} tokens, class ${size.sizeClass}). Use deterministic capabilities or rewrite_section_with_llm on individual sections.`,
        'document_too_large'
      );
    }

    const agent = await prisma.aiAgent.findUnique({
      where: { id: context.agentId },
      select: { provider: true, model: true, temperature: true },
    });
    if (!agent?.provider || !agent.model) {
      return this.error('Agent has no provider or model configured.', 'agent_misconfigured');
    }

    let provider;
    try {
      provider = await getProvider(agent.provider);
    } catch (err) {
      logger.error('rewrite_with_llm: provider load failed', { err, slug: agent.provider });
      return this.error(`Provider "${agent.provider}" unavailable.`, 'provider_unavailable');
    }

    const response = await provider.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `INSTRUCTIONS:\n${args.instructions}\n\n---\nDOCUMENT:\n${target.content}`,
        },
      ],
      { model: agent.model, temperature: agent.temperature ?? 0.2 }
    );

    const next = response.content.trim();
    if (next.length === 0) {
      return this.error('LLM returned empty content.', 'empty_response');
    }
    await writeCleanupContent(target.documentId, next);
    return this.success({
      instructions: args.instructions,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      ...summariseMutation(target.content, next),
    });
  }
}
