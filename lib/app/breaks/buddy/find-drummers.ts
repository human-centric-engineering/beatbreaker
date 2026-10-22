import { z } from 'zod';

import { type DrummerEntry, listDrummers } from '@/lib/app/lineage/data';
import { type DrummerRecord, readDrummerRecord } from '@/lib/app/lineage/record';
import type { LineageDevice } from '@/lib/app/lineage/types';
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
  /** On the long list (15-a): a record to read, but not built, so no style to play. */
  candidate: boolean;
  /** `1958–`, `1966–2019`; null when the record has no year. */
  active: string | null;
  /** The style key `generate_pattern` takes to play like them; null if none. */
  style: string | null;
  genres: string[];
  /** The first sentence; get_drummer has the rest. */
  summary: string | null;
  descriptors: string[];
  /**
   * The rhythmic devices the record names (12-b), one line each:
   * `cross-rhythm 3:2 (fills): …`. get_drummer has their sources.
   */
  devices: string[];
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

/** Words a full stop follows without ending a sentence: "Mr. Bungle", "c. 1940". */
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'vs', 'c', 'ca', 'no']);

/**
 * A summary's first sentence: twenty whole summaries cost a turn more than its
 * cap. A sentence ends at a stop followed by a capital, unless the word before
 * it is an initial ("J.R. Robinson") or an abbreviation.
 */
export function firstSentence(text: string | null): string | null {
  if (text === null) return null;
  for (const m of text.matchAll(/([\p{L}\p{N}]*)([.!?])\s+(?=\p{Lu})/gu)) {
    const [, word, stop] = m;
    if (stop === '.' && (word.length === 1 || ABBREVIATIONS.has(word.toLowerCase()))) continue;
    return text.slice(0, m.index + word.length + 1);
  }
  return text;
}

/**
 * A device in one line: its kind and ratio, where it is played, and the first
 * sentence of what it is. get_drummer has the rest, with the sources.
 */
export function deviceLine(d: LineageDevice): string {
  const name = [d.kind, d.ratio].filter(Boolean).join(' ');
  const where = d.where.length > 0 ? ` (${d.where.join(', ')})` : '';
  return `${name}${where}: ${firstSentence(d.description) ?? d.description}`;
}

/** A drummer with their record read once: both the match and the summary use it. */
interface Read {
  entry: DrummerEntry;
  record: DrummerRecord | null;
}

function summarise({ entry: { node }, record }: Read): DrummerSummary {
  return {
    slug: node.slug,
    name: node.label,
    page: `/drummers/${node.slug}`,
    modelled: node.modelled,
    candidate: node.candidate,
    active: activeSpan(node.activeFrom, node.activeTo),
    style: node.styleKey,
    genres: node.genres.map((g) => g.replace(/^style:/, '')),
    summary: firstSentence(node.summary),
    descriptors: (record?.descriptors ?? []).slice(0, DESCRIPTORS),
    devices: node.devices.map(deviceLine),
  };
}

/**
 * Accents folded, lower case, split into words. A ratio stays one word, so
 * "3:2" never matches a 2:3.
 */
function words(text: string): string[] {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .match(/\d+:\d+|[\p{L}\p{N}]+/gu) ?? []
  );
}

/**
 * Every word a query may match: the name, the style, the genres, the summary,
 * the describing words and traits, where they are from, and the rhythmic
 * devices they play ("cross", "3:2", "threes over the bar").
 */
function vocabulary({ entry: { node }, record }: Read): string[] {
  return words(
    [
      node.label,
      node.styleKey ?? '',
      ...node.genres.map((g) => g.replace(/^style:/, '')),
      ...node.tags,
      node.summary ?? '',
      ...(record?.descriptors ?? []),
      ...(record?.traits.map((t) => t.label) ?? []),
      ...(record?.from ?? []),
      ...node.devices.flatMap((d) => [
        d.kind,
        d.ratio ?? '',
        ...d.where,
        d.description,
        ...d.examples,
      ]),
    ].join(' ')
  );
}

export class FindDrummersCapability extends BaseCapability<Args, FindDrummersData> {
  readonly slug = 'find_drummers';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'find_drummers',
    description:
      "Find drummers in BeatBreaker's records. With no query, lists every built drummer (one with a style to play): name, years, the style key to play like them, genres, a summary, the words their record describes them by, and the rhythmic devices they play (cross-rhythm, hemiola, grouping, polymeter, metric modulation, displacement, timeline, ostinato independence), each with its ratio and where it is played. Use that, with no query, to compare drummers (who plays like whom, who is busier, who came first) or to find who plays a device (who plays threes over the bar, who plays 3:2). A query (a name, or a word like 'shuffle') narrows the list to drummers matching every word, and also finds drummers on the long list, marked candidate: true (researched, with a record and what they brought, but no style to play), and people the records only mention, marked modelled: false. Then call get_drummer for one drummer's record.",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Optional. Words to match in the name, genres, style, summary, traits and devices; each matches the start of a word. Leave it out to list every built drummer.',
        },
      },
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    _context: CapabilityContext
  ): Promise<CapabilityResult<FindDrummersData>> {
    const all: Read[] = (await listDrummers()).map((entry) => ({
      entry,
      record: entry.node.modelled ? readDrummerRecord(entry.record) : null,
    }));
    const query = args.query ?? '';
    if (!query) {
      return this.success({
        // the built drummers only: the long list's hundreds of candidates come back by query
        drummers: all
          .filter((d) => d.entry.node.modelled && !d.entry.node.candidate)
          .map(summarise),
      });
    }
    /* Each term starts a word: "art" finds Art Blakey, not "heart". A query
       with no word in it at all (punctuation alone) matches nothing. */
    const terms = words(query);
    const hits = all.filter((d) => {
      const vocab = vocabulary(d);
      return terms.length > 0 && terms.every((t) => vocab.some((w) => w.startsWith(t)));
    });
    if (hits.length === 0) {
      return this.success({
        drummers: [],
        note: `Nothing matched "${query}". Call find_drummers with no query to see every built drummer.`,
      });
    }
    const modelled = hits.filter((d) => d.entry.node.modelled);
    const stubs = hits.filter((d) => !d.entry.node.modelled).slice(0, STUBS);
    return this.success({ drummers: [...modelled, ...stubs].map(summarise) });
  }
}
