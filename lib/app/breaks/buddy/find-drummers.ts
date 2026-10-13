import { z } from 'zod';

import { type DrummerEntry, listDrummers } from '@/lib/app/lineage/data';
import { readDrummerRecord } from '@/lib/app/lineage/record';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `find_drummers` — the drummers BeatBreaker has a record of (Phase 11-f).
 *
 * Read from the lineage tables the `/drummers` pages read, so what BeatBuddy
 * says about a drummer is what the record says, and it can point at the page.
 * With no query it lists every modelled drummer, short enough for the model to
 * compare them ("who plays like Purdie but busier?"); a query narrows that,
 * and also finds the people the records only name (stubs), so it can say
 * there is no record rather than make one up.
 */

const schema = z.object({
  query: z.string().trim().max(80).optional(),
});

type Args = z.infer<typeof schema>;

/** Words a drummer is described by, at most this many, so the full list stays short. */
const DESCRIPTORS = 8;

/** Stubs a query may return: they are names only. */
const STUBS = 10;

export interface DrummerSummary {
  slug: string;
  name: string;
  /** The page holding the record: what BeatBuddy cites. */
  page: string;
  /** False for someone the records only name: there is no record to read. */
  modelled: boolean;
  /** `1958–`, `1966–2019`; null when the record has no year. */
  active: string | null;
  /** The style key `generate_pattern` takes to play like them; null if none. */
  style: string | null;
  genres: string[];
  /** The first sentence; get_drummer has the rest. */
  summary: string | null;
  descriptors: string[];
}

export interface FindDrummersData {
  drummers: DrummerSummary[];
  /** Set when a query matched nothing: where to look instead. */
  note?: string;
}

function activeSpan(from: number | null, to: number | null): string | null {
  if (from === null) return null;
  return to === null ? `${from}–` : `${from}–${to}`;
}

/** A summary's first sentence: twenty whole summaries cost a turn more than its cap. */
function firstSentence(text: string | null): string | null {
  if (text === null) return null;
  const end = text.search(/[.!?](\s|$)/);
  return end === -1 ? text : text.slice(0, end + 1);
}

function summarise({ node, record }: DrummerEntry): DrummerSummary {
  const read = node.modelled ? readDrummerRecord(record) : null;
  return {
    slug: node.slug,
    name: node.label,
    page: `/drummers/${node.slug}`,
    modelled: node.modelled,
    active: activeSpan(node.activeFrom, node.activeTo),
    style: node.styleKey,
    genres: node.genres.map((g) => g.replace(/^style:/, '')),
    summary: firstSentence(node.summary),
    descriptors: (read?.descriptors ?? []).slice(0, DESCRIPTORS),
  };
}

/** Everything a query word may match: the name, the style, the genres, the words and traits. */
function haystack({ node, record }: DrummerEntry): string {
  const read = node.modelled ? readDrummerRecord(record) : null;
  return [
    node.label,
    node.styleKey ?? '',
    ...node.genres,
    ...node.tags,
    node.summary ?? '',
    ...(read?.descriptors ?? []),
    ...(read?.traits.map((t) => t.label) ?? []),
    ...(read?.from ?? []),
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function words(query: string): string[] {
  return query
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export class FindDrummersCapability extends BaseCapability<Args, FindDrummersData> {
  readonly slug = 'find_drummers';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'find_drummers',
    description:
      "Find drummers in BeatBreaker's records. With no query, lists every drummer with a record: name, years, the style key to play like them, genres, a summary and the words their record describes them by. Use that, with no query, to compare drummers (who plays like whom, who is busier, who came first). A query (a name, or a word like 'shuffle') narrows the list to drummers matching every word, and also finds people the records only mention, marked modelled: false. Then call get_drummer for one drummer's record.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Optional. Words to match in the name, genres, style, summary and traits. Leave it out to list every drummer with a record.',
        },
      },
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    _context: CapabilityContext
  ): Promise<CapabilityResult<FindDrummersData>> {
    const all = await listDrummers();
    const terms = words(args.query ?? '');
    if (terms.length === 0) {
      return this.success({ drummers: all.filter((d) => d.node.modelled).map(summarise) });
    }
    const hits = all.filter((d) => {
      const text = haystack(d);
      return terms.every((t) => text.includes(t));
    });
    const modelled = hits.filter((d) => d.node.modelled);
    const stubs = hits.filter((d) => !d.node.modelled).slice(0, STUBS);
    if (hits.length === 0) {
      return this.success({
        drummers: [],
        note: `Nothing matched "${args.query}". Call find_drummers with no query to see every drummer with a record.`,
      });
    }
    return this.success({ drummers: [...modelled, ...stubs].map(summarise) });
  }
}
