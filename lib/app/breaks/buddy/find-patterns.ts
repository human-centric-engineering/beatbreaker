import { z } from 'zod';

import { listLibraries } from '@/lib/app/breaks/catalogue/data';
import { listPublished } from '@/lib/app/breaks/community/public';
import { prisma } from '@/lib/db/client';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `find_patterns` — search the caller's own saved patterns, the famous breaks,
 * and the community library.
 *
 * Three places, three rules, none of them new. The caller's own rows are
 * filtered by `context.userId`; the famous breaks are the public catalogue;
 * the community library is `listPublished()`, which only ever lists
 * `published` rows. A private pattern of anyone else's and a link share are
 * not reachable from here.
 */

export const FIND_SOURCES = ['mine', 'library', 'published'] as const;
export type FindSource = (typeof FIND_SOURCES)[number];

const schema = z.object({
  query: z.string().trim().max(80).optional(),
  source: z.enum([...FIND_SOURCES, 'all']).default('all'),
  style: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

type Args = z.infer<typeof schema>;

export interface FoundPattern {
  source: FindSource;
  /** What open_pattern takes, with the source. */
  id: string;
  title: string;
  style: string;
  meter: string;
  bpm: number;
  /** The artist for a famous break, the username for a published one. */
  by: string | null;
}

export interface FindPatternsData {
  patterns: FoundPattern[];
}

function matches(query: string | undefined, ...fields: Array<string | null>): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

async function mine(userId: string, args: Args): Promise<FoundPattern[]> {
  const rows = await prisma.break.findMany({
    where: {
      userId,
      ...(args.style ? { style: args.style } : {}),
      ...(args.query ? { title: { contains: args.query, mode: 'insensitive' as const } } : {}),
    },
    select: { id: true, title: true, style: true, meter: true, bpm: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: args.limit,
  });
  return rows.map((r) => ({ source: 'mine', ...r, by: null }));
}

async function library(args: Args): Promise<FoundPattern[]> {
  const libraries = await listLibraries();
  return libraries
    .flatMap((l) => l.entries)
    .filter((e) => !args.style || e.styleKey === args.style)
    .filter((e) => matches(args.query, e.title, e.artist, e.group, e.note))
    .slice(0, args.limit)
    .map((e) => ({
      source: 'library',
      id: e.id,
      title: e.title,
      style: e.styleKey,
      meter: e.meter,
      bpm: e.bpm,
      by: e.artist,
    }));
}

async function published(args: Args): Promise<FoundPattern[]> {
  const { patterns } = await listPublished({
    q: args.query,
    style: args.style,
    sort: 'saved',
    limit: args.limit,
  });
  return patterns.map((p) => ({
    source: 'published',
    id: p.id,
    title: p.title,
    style: p.style,
    meter: p.meter,
    bpm: p.bpm,
    by: p.author,
  }));
}

export class FindPatternsCapability extends BaseCapability<Args, FindPatternsData> {
  readonly slug = 'find_patterns';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'find_patterns',
    description:
      "Search for patterns to open: the user's own saved patterns (mine), the famous breaks (library, searchable by title, artist or group), and the community library (published). Returns up to `limit` from each source searched, each with the source and id open_pattern takes. Changes nothing.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Words to look for in the title (or artist, for famous breaks).',
        },
        source: {
          type: 'string',
          enum: [...FIND_SOURCES, 'all'],
          description: 'Where to look. Defaults to all three.',
        },
        style: { type: 'string', description: 'Only this style key.' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'At most this many from each source. Defaults to 8.',
        },
      },
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<FindPatternsData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');
    const userId = context.userId;

    const want = (s: FindSource) => args.source === 'all' || args.source === s;
    const found = await Promise.all([
      want('mine') ? mine(userId, args) : [],
      want('library') ? library(args) : [],
      want('published') ? published(args) : [],
    ]);
    return this.success({ patterns: found.flat() });
  }
}
