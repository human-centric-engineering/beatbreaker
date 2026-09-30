import { z } from 'zod';

import { decodeWorkspace } from '@/lib/app/breaks/buddy/describe';
import { readWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { critique } from '@/lib/app/breaks/critic';
import { nameBreak } from '@/lib/app/breaks/generate';
import { makeRng } from '@/lib/app/breaks/rng';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `suggest_title` — what a name could be made from: the rhythm's own facts,
 * in words, and a few names from the generator's word list.
 *
 * The naming is the model's; that is the point of asking it (`nameBreak`'s
 * own comment says so). This gives it something true to name from rather
 * than the style label, and changes nothing. The user picks.
 */

const schema = z.object({});

type Args = z.infer<typeof schema>;

export interface SuggestTitleData {
  /** Short facts about the rhythm of section A, each a phrase. */
  facts: string[];
  /** Placeholder names from the word list, for when nothing better comes. */
  candidates: string[];
}

export class SuggestTitleCapability extends BaseCapability<Args, SuggestTitleData> {
  readonly slug = 'suggest_title';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'suggest_title',
    description:
      'Get material for naming the open pattern: facts about its rhythm (style, meter, tempo, feel, what the kick and ghosts do) and three placeholder names. Offer the user two or three names of your own drawn from those facts, and let them pick. Changes nothing.',
    parameters: { type: 'object', properties: {} },
  };

  protected readonly schema = schema;

  async execute(
    _args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<SuggestTitleData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const workspace = await readWorkspace(context.userId);
    if (!workspace) return this.error('No pattern is open in the Studio yet', 'no_workspace');

    const doc = await decodeWorkspace(workspace.doc);
    const A = doc.A;
    const report = critique(A, doc.bpm);
    const label = (await listStyles()).find((s) => s.key === A.style)?.params.label ?? A.style;
    const bars = A.bars.length;
    const reading = (key: string) => report.dims.find((d) => d.key === key)?.read;

    const facts = [
      `${label}, ${A.meter}, ${Math.round(doc.bpm)} bpm`,
      doc.swing >= 20 ? `swung (${Math.round(doc.swing)})` : 'straight',
      `the kick is ${reading('Syncopation') ?? 'steady'}`,
      report.stats.ghosts === 0
        ? 'no ghost notes'
        : `${(report.stats.ghosts / bars).toFixed(1)} ghost notes a bar`,
      report.stats.opens > 0 ? `${report.stats.opens} open cymbal notes` : 'no open hats',
      A.voice === 'ride' ? 'time on the ride' : 'time on the hi-hat',
      `phrasing: ${reading('Phrasing') ?? 'one bar'}`,
    ];

    const candidates = [0, 1, 2].map((n) => nameBreak(makeRng((A.seed + n * 7919) >>> 0)));
    return this.success({ facts, candidates });
  }
}
