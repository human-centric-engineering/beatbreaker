import { z } from 'zod';

import {
  SECTIONS,
  type SectionView,
  decodeWorkspace,
  viewSection,
} from '@/lib/app/breaks/buddy/describe';
import { readWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { layerName } from '@/lib/app/breaks/layers';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `get_pattern` — the pattern the person has open, as text, with the
 * playback settings and the critic's reading of each section.
 *
 * Reads the caller's own workspace and nothing else: the user comes from
 * `context.userId`, and the tool takes no arguments at all, so there is no
 * argument a model could use to name somebody else's.
 */

const schema = z.object({});

type Args = z.infer<typeof schema>;

export interface GetPatternData {
  rev: number;
  bpm: number;
  swing: number;
  /** 1–5: how much of the pattern is showing. 5 is the full break. */
  layer: number;
  layerName: string;
  /** The order the sections play in, e.g. A A B A. */
  arrangement: Array<'A' | 'B'>;
  sections: SectionView[];
}

export class GetPatternCapability extends BaseCapability<Args, GetPatternData> {
  readonly slug = 'get_pattern';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'get_pattern',
    description:
      "Read the drum pattern the user has open in the Studio. Returns each section (A and B) as text — one row per lane per bar, with a count row — plus the tempo, swing, the layer being shown, the arrangement, and the critic's score and any playability problems. Call this before changing anything unless the user wants something brand new.",
    parameters: { type: 'object', properties: {} },
  };

  protected readonly schema = schema;

  async execute(
    _args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<GetPatternData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const workspace = await readWorkspace(context.userId);
    if (!workspace) {
      return this.error('No pattern is open in the Studio yet', 'no_workspace');
    }

    const doc = await decodeWorkspace(workspace.doc);
    return this.success({
      rev: workspace.rev,
      bpm: doc.bpm,
      swing: doc.swing,
      layer: doc.level,
      layerName: layerName(doc.level),
      arrangement: doc.arrangement,
      sections: SECTIONS.map((s) => viewSection(doc[s], s, doc.bpm, doc.swing)),
    });
  }
}
