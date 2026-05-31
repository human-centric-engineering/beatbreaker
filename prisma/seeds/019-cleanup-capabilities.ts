import type { Prisma } from '@prisma/client';
import type { SeedUnit } from '@/prisma/runner';

interface CleanupCap {
  slug: string;
  name: string;
  description: string;
  handler: string;
  parameters: Record<string, unknown>;
  rateLimit: number;
}

const DETERMINISTIC: CleanupCap[] = [
  {
    slug: 'strip_lines_matching',
    name: 'Strip Lines Matching',
    description:
      'Remove whole lines from the cleanup document where a regex matches anywhere in the line.',
    handler: 'StripLinesMatchingCapability',
    parameters: {
      type: 'object',
      properties: {
        regex: { type: 'string', description: 'Regex pattern (no surrounding slashes).' },
        flags: { type: 'string', description: 'Optional regex flags.' },
      },
      required: ['regex'],
    },
    rateLimit: 60,
  },
  {
    slug: 'strip_matches',
    name: 'Strip Matches',
    description:
      'Remove inline regex matches from the cleanup document, leaving surrounding text intact.',
    handler: 'StripMatchesCapability',
    parameters: {
      type: 'object',
      properties: {
        regex: { type: 'string' },
        flags: { type: 'string' },
      },
      required: ['regex'],
    },
    rateLimit: 60,
  },
  {
    slug: 'strip_timestamps',
    name: 'Strip Timestamps',
    description: 'Remove timestamp markers (00:00, [12:34:56], etc.) from the cleanup document.',
    handler: 'StripTimestampsCapability',
    parameters: {
      type: 'object',
      properties: {
        formats: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['hh_mm', 'hh_mm_ss', 'bracketed', 'parenthesised'],
          },
        },
      },
    },
    rateLimit: 60,
  },
  {
    slug: 'strip_speaker_labels',
    name: 'Strip Speaker Labels',
    description: 'Remove "Name:" or "[Name]" speaker labels at the start of lines.',
    handler: 'StripSpeakerLabelsCapability',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['colon', 'bracketed', 'both'] },
      },
    },
    rateLimit: 60,
  },
  {
    slug: 'collapse_whitespace',
    name: 'Collapse Whitespace',
    description: 'Collapse runs of spaces/tabs, trim trailing whitespace, and squash blank lines.',
    handler: 'CollapseWhitespaceCapability',
    parameters: {
      type: 'object',
      properties: { keepBlankLines: { type: 'boolean' } },
    },
    rateLimit: 60,
  },
  {
    slug: 'dedupe_lines',
    name: 'Dedupe Lines',
    description: 'Remove duplicate lines (adjacent or document-wide).',
    handler: 'DedupeLinesCapability',
    parameters: {
      type: 'object',
      properties: { consecutiveOnly: { type: 'boolean' } },
    },
    rateLimit: 60,
  },
  {
    slug: 'normalise_punctuation',
    name: 'Normalise Punctuation',
    description: 'Convert typographic punctuation (smart quotes, dashes, ellipsis) to ASCII.',
    handler: 'NormalisePunctuationCapability',
    parameters: { type: 'object', properties: {} },
    rateLimit: 60,
  },
];

const READ_ONLY: CleanupCap[] = [
  {
    slug: 'preview_diff',
    name: 'Preview Diff',
    description: 'Summarise the difference between the original and current cleanup state.',
    handler: 'PreviewDiffCapability',
    parameters: { type: 'object', properties: {} },
    rateLimit: 120,
  },
  {
    slug: 'estimate_size',
    name: 'Estimate Size',
    description:
      'Report token count and size class (small/medium/large/too-large) for the current cleanup state.',
    handler: 'EstimateSizeCapability',
    parameters: { type: 'object', properties: {} },
    rateLimit: 120,
  },
];

const LLM_BACKED: CleanupCap[] = [
  {
    slug: 'rewrite_with_llm',
    name: 'Rewrite With LLM',
    description: 'LLM rewrite of the entire cleanup document per natural-language instructions.',
    handler: 'RewriteWithLlmCapability',
    parameters: {
      type: 'object',
      properties: { instructions: { type: 'string' } },
      required: ['instructions'],
    },
    rateLimit: 6,
  },
  {
    slug: 'rewrite_section_with_llm',
    name: 'Rewrite Section With LLM',
    description: 'LLM rewrite of a single matched section of the cleanup document.',
    handler: 'RewriteSectionWithLlmCapability',
    parameters: {
      type: 'object',
      properties: {
        sectionMarker: { type: 'string' },
        instructions: { type: 'string' },
      },
      required: ['sectionMarker', 'instructions'],
    },
    rateLimit: 12,
  },
];

const ALL = [...DETERMINISTIC, ...READ_ONLY, ...LLM_BACKED];

// Seeds the eleven Document Clean Up capabilities the Cleanup Agent owns.
// Idempotent — re-seeding only sets isSystem: true so admin edits (name,
// description, rate limit) survive. Agent binding lives in 020-cleanup-agent.
const unit: SeedUnit = {
  name: '019-cleanup-capabilities',
  async run({ prisma, logger }) {
    logger.info('🧼 Seeding document cleanup capabilities...');
    for (const cap of ALL) {
      const functionDefinition: Prisma.InputJsonValue = {
        name: cap.slug,
        description: cap.description,
        parameters: cap.parameters as Prisma.InputJsonValue,
      };
      await prisma.aiCapability.upsert({
        where: { slug: cap.slug },
        update: { isSystem: true },
        create: {
          slug: cap.slug,
          name: cap.name,
          description: cap.description,
          category: 'document_cleanup',
          executionType: 'internal',
          executionHandler: cap.handler,
          functionDefinition,
          rateLimit: cap.rateLimit,
          isActive: true,
          isSystem: true,
        },
      });
    }
    logger.info(`✅ Seeded ${ALL.length} document cleanup capabilities`);
  },
};

export default unit;
