import { z } from 'zod';

import { SECTIONS, type Section, decodeWorkspace } from '@/lib/app/breaks/buddy/describe';
import { readWorkspace } from '@/lib/app/breaks/buddy/workspace';
import { critique, playability } from '@/lib/app/breaks/critic';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { describeStep } from '@/lib/app/breaks/text';
import type { Pattern } from '@/lib/app/breaks/types';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `explain_difficulty` — which bars and beats cost the score, and why, in the
 * critic's own terms.
 *
 * Nothing here is new judgement. The critic scores a whole section and the
 * playability check passes or fails it; this runs the same two on each bar
 * alone, so "bar 3 has no air" can be said about bar 3, and names the steps
 * where a limb is asked for twice in a row — the doubles a drummer feels.
 */

const schema = z.object({
  section: z.enum(['A', 'B', 'both']).default('both'),
});

type Args = z.infer<typeof schema>;

export interface BarReading {
  /** 1-based. */
  bar: number;
  /** Kicks, snares and ghosts — what the critic counts as density. */
  notes: number;
  /** Playability checks this bar fails on its own. */
  failing: string[];
  /** Kick or snare 16ths back to back, named as a drummer counts. */
  doubles: string[];
}

export interface SectionDifficulty {
  section: Section;
  score: number;
  verdict: string;
  /** The critic's six dimensions, weakest first, each 0–1 with its reading. */
  dimensions: Array<{ name: string; value: number; reading: string }>;
  playable: boolean;
  failing: string[];
  bars: BarReading[];
}

export interface ExplainDifficultyData {
  bpm: number;
  sections: SectionDifficulty[];
}

function readBar(pat: Pattern, index: number, bpm: number): BarReading {
  const bar = pat.bars[index];
  const m = meterOfPat(pat);
  const alone: Pattern = { ...pat, bars: [bar], pins: null };
  const doubles: string[] = [];
  for (let i = 0; i < bar.k.length - 1; i++) {
    if (bar.k[i] && bar.k[i + 1]) doubles.push(`kick ${describeStep(m, i)}`);
    if (bar.s[i] && bar.s[i + 1]) doubles.push(`snare ${describeStep(m, i)}`);
  }
  return {
    bar: index + 1,
    notes: bar.k.filter(Boolean).length + bar.s.filter(Boolean).length,
    failing: playability(alone, bpm)
      .checks.filter((c) => !c.ok)
      .map((c) => c.label),
    doubles,
  };
}

function explain(pat: Pattern, section: Section, bpm: number): SectionDifficulty {
  const score = critique(pat, bpm);
  const checks = playability(pat, bpm);
  return {
    section,
    score: score.score,
    verdict: score.verdict,
    dimensions: score.dims
      .slice()
      .sort((a, b) => a.v - b.v)
      .map((d) => ({ name: d.key, value: Math.round(d.v * 100) / 100, reading: d.read })),
    playable: checks.hard,
    failing: checks.checks.filter((c) => !c.ok).map((c) => c.label),
    bars: pat.bars.map((_, i) => readBar(pat, i, bpm)),
  };
}

export class ExplainDifficultyCapability extends BaseCapability<Args, ExplainDifficultyData> {
  readonly slug = 'explain_difficulty';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'explain_difficulty',
    description:
      "Explain what makes the open pattern hard or weak, in the critic's terms: the score and verdict per section, the six dimensions weakest first, the playability checks it fails, and for each bar its note count, the checks that bar fails on its own, and where the kick or snare plays two 16ths in a row. Changes nothing.",
    parameters: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['A', 'B', 'both'],
          description: 'Which section to explain. Defaults to both.',
        },
      },
    },
  };

  protected readonly schema = schema;

  async execute(
    args: Args,
    context: CapabilityContext
  ): Promise<CapabilityResult<ExplainDifficultyData>> {
    if (!context.userId) return this.error('BeatBuddy needs a signed-in user', 'no_user');

    const workspace = await readWorkspace(context.userId);
    if (!workspace) return this.error('No pattern is open in the Studio yet', 'no_workspace');

    const doc = await decodeWorkspace(workspace.doc);
    const targets = args.section === 'both' ? SECTIONS : [args.section];
    return this.success({
      bpm: doc.bpm,
      sections: targets.map((s) => explain(doc[s], s, doc.bpm)),
    });
  }
}
