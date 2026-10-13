import { z } from 'zod';

import { findLineageSlug, getLineageProfile } from '@/lib/app/lineage/data';
import { type DrummerRecord, readDrummerRecord } from '@/lib/app/lineage/record';
import { type Relation, relationsOf } from '@/lib/app/lineage/relations';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `get_drummer` — one drummer's record, as the `/drummers/[slug]` page shows
 * it (Phase 11-f).
 *
 * Read through the same `readDrummerRecord` the page uses, so a masked
 * performer's real identity is withheld here exactly as it is there. Each
 * trait and relation carries the record's confidence, and `cite` names the
 * record and its page, which is what BeatBuddy's answer points at. A person
 * the records only mention comes back with their relations and no record, so
 * the model can say so rather than fill the gap.
 */

const schema = z.object({
  drummer: z.string().trim().min(1).max(120),
});

type Args = z.infer<typeof schema>;

/** Recordings listed, oldest first; the page has the rest. */
const RECORDINGS = 12;

export interface DrummerRecordData {
  name: string;
  page: string;
  /** False for someone the records only mention: no record, relations only. */
  modelled: boolean;
  /** What to cite: the record, how far it has been checked, and its page. */
  cite: string;
  /** The style key `generate_pattern` takes to play like them; null if none. */
  style: string | null;
  record: Omit<DrummerRecord, 'name'> | null;
  /**
   * One line each, `Name (relation, confidence)` — the record's own word for
   * the relation (`cites_as_influence`, `studied_with`…). Short, because a
   * comparison reads several records in one turn under its cost cap.
   */
  learnedFrom: string[];
  passedOnTo: string[];
  /** Bandmates, family, and the chairs they took or handed on. */
  around: string[];
  recordings: Array<{ title: string; artist: string; year: number }>;
}

function relation({ node, edge }: Relation): string {
  const how = [edge.relation, edge.confidence].filter(Boolean).join(', ');
  return `${node.label} (${how})`;
}

export class GetDrummerCapability extends BaseCapability<Args, DrummerRecordData> {
  readonly slug = 'get_drummer';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'get_drummer',
    description:
      "Read one drummer's record in BeatBreaker: who they are, their eras, how they play (descriptors, signature traits, techniques), who they learned from and passed it on to, their key recordings, and the style key to play like them. Each trait and relation says how sure the record is. Base what you say about a drummer on this and cite it with `cite`.",
    parameters: {
      type: 'object',
      properties: {
        drummer: {
          type: 'string',
          description:
            "The drummer's name as written ('Bernard Purdie') or the slug find_drummers gave ('bernard-purdie').",
        },
      },
      required: ['drummer'],
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    _context: CapabilityContext
  ): Promise<CapabilityResult<DrummerRecordData>> {
    const slug = await findLineageSlug(args.drummer);
    const profile = slug === null ? null : await getLineageProfile(slug);
    if (!profile) {
      return this.error(
        `BeatBreaker has no record of "${args.drummer}". Try find_drummers with part of the name.`,
        'unknown_drummer'
      );
    }

    const { node } = profile;
    const read = node.modelled ? readDrummerRecord(profile.record) : null;
    const nodes = new Map(profile.neighbours.map((n) => [n.id, n]));
    const relations = relationsOf(node.id, profile.edges, nodes);
    const around = relations.around.filter((r) => r.edge.kind !== 'recording');
    const page = `/drummers/${node.slug}`;

    let record: DrummerRecordData['record'] = null;
    if (read) {
      const { name: _name, ...rest } = read;
      record = rest;
    }
    const status = read?.status ? `, ${read.status}` : '';

    return this.success({
      name: node.label,
      page,
      modelled: read !== null,
      cite:
        read !== null
          ? `BeatBreaker's record of ${node.label}${status} (${page})`
          : `BeatBreaker has no record of ${node.label}: only other drummers' records name them (${page})`,
      style: node.styleKey,
      record,
      learnedFrom: relations.learnedFrom.map(relation),
      passedOnTo: relations.passedOnTo.map(relation),
      around: around.map(relation),
      recordings: profile.recordings
        .slice(0, RECORDINGS)
        .map((r) => ({ title: r.title, artist: r.artist, year: r.year })),
    });
  }
}
