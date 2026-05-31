import type { SeedUnit } from '@/prisma/runner';

const CLEANUP_INSTRUCTIONS = `You are the Document Clean Up Assistant. Your job is to help an admin prepare an uploaded document for chunking and embedding into the knowledge base. The admin will tell you what they want cleaned up; you choose the right tools and apply the changes.

OPERATING RULES:
1. The document you are cleaning is identified by the chat session's context. Every cleanup capability resolves the document automatically — you never need a document id from the user.
2. Always prefer deterministic capabilities over LLM rewrites. Strips, dedupes, whitespace collapse, and punctuation normalisation are free, exact, and reversible (the original is preserved). Only reach for rewrite_with_llm or rewrite_section_with_llm when the user's intent genuinely requires LLM interpretation.
3. Before any destructive transform, briefly tell the user what you're about to do and why. After the transform, summarise what changed (lines removed, characters removed) using preview_diff or the data returned by the tool.
4. Call estimate_size at the start of the session and again after any substantial change. If the size class is "too-large", tell the user that whole-document LLM rewrites are not allowed — they can still use deterministic capabilities, and rewrite_section_with_llm works on individual sections regardless of total size.
5. If the user gives a vague instruction, ask one clarifying question before acting. Vague instructions produce vague results, especially from LLM rewrites.
6. Never invent content. Cleanup means removing noise and improving structure, not paraphrasing or summarising unless the user explicitly asks for that.
7. When the user is satisfied, remind them to click "Mark cleaned" in the page header to finalise — that action chunks and embeds the cleaned version. You do not finalise yourself.

TYPICAL FLOW:
- New transcript upload: estimate_size → strip_timestamps → strip_speaker_labels → dedupe_lines (consecutive) → collapse_whitespace → preview_diff → ask the user to review.
- Verbose article: estimate_size → normalise_punctuation → rewrite_with_llm with the user's instructions → preview_diff.
- Large doc (size class large/too-large): apply deterministic strips first; re-check size with estimate_size; if still too large, use rewrite_section_with_llm one section at a time.`;

const CLEANUP_CAPABILITY_SLUGS = [
  'strip_lines_matching',
  'strip_matches',
  'strip_timestamps',
  'strip_speaker_labels',
  'collapse_whitespace',
  'dedupe_lines',
  'normalise_punctuation',
  'preview_diff',
  'estimate_size',
  'rewrite_with_llm',
  'rewrite_section_with_llm',
] as const;

// Seeds the Document Clean Up Assistant agent and binds all eleven cleanup
// capabilities. Idempotent — re-seeding only sets isSystem: true so admin
// edits to the system prompt or model survive. Capabilities are upserted
// in 019-cleanup-capabilities; this seed only creates the pivot rows.
const unit: SeedUnit = {
  name: '020-cleanup-agent',
  async run({ prisma, logger }) {
    logger.info('🧹 Seeding cleanup-agent...');

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (!admin) {
      throw new Error('No admin user found — ensure 001-test-users runs first.');
    }

    const agent = await prisma.aiAgent.upsert({
      where: { slug: 'cleanup-agent' },
      update: { isSystem: true },
      create: {
        name: 'Document Clean Up Assistant',
        slug: 'cleanup-agent',
        description:
          'Helps admins clean up uploaded knowledge-base documents before chunking and embedding. Combines deterministic text transforms with optional LLM rewrites.',
        systemInstructions: CLEANUP_INSTRUCTIONS,
        // Empty strings → resolved at runtime via agent-resolver.ts so this
        // agent inherits whatever provider/model the install is configured
        // with. Admin can pin a specific cheap model post-seed.
        model: '',
        provider: '',
        temperature: 0.2,
        maxTokens: 2048,
        // Cleanup conversations don't query the KB — they edit a single
        // uploaded document directly via the cleanup capabilities.
        knowledgeAccessMode: 'restricted',
        visibility: 'internal',
        isActive: true,
        isSystem: true,
        createdBy: admin.id,
      },
    });

    for (const slug of CLEANUP_CAPABILITY_SLUGS) {
      const capability = await prisma.aiCapability.findUnique({ where: { slug } });
      if (!capability) {
        logger.warn(`⚠️ Capability ${slug} not found — skipping bind for cleanup-agent`);
        continue;
      }
      await prisma.aiAgentCapability.upsert({
        where: {
          agentId_capabilityId: { agentId: agent.id, capabilityId: capability.id },
        },
        update: {},
        create: {
          agentId: agent.id,
          capabilityId: capability.id,
          isEnabled: true,
        },
      });
    }

    logger.info(`✅ Seeded cleanup-agent with ${CLEANUP_CAPABILITY_SLUGS.length} capabilities`);
  },
};

export default unit;
