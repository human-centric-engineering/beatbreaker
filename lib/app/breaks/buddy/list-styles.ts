import { z } from 'zod';

import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { DEFAULT_METER } from '@/lib/app/breaks/meter';
import { BaseCapability } from '@/lib/orchestration/capabilities/base-capability';
import type {
  CapabilityContext,
  CapabilityFunctionDefinition,
  CapabilityResult,
} from '@/lib/orchestration/capabilities/types';

/**
 * `list_styles` — the style catalogue, so the model can map "something like
 * Dilla" onto `dilla`.
 *
 * Read from the Phase 2 catalogue, so a style an admin adds is one BeatBuddy
 * can use without a code change. Only what the model needs to choose: the
 * generator's tables stay on the server.
 */

const schema = z.object({});

type Args = z.infer<typeof schema>;

export interface StyleSummary {
  key: string;
  label: string;
  group: string;
  hint: string;
  /** `[min, max]` beats per minute the style is written for. */
  bpm: [number, number];
  meter: string;
  /** Swing the style starts at, 0–100. */
  swing: number;
}

export interface ListStylesData {
  styles: StyleSummary[];
}

export class ListStylesCapability extends BaseCapability<Args, ListStylesData> {
  readonly slug = 'list_styles';
  readonly processesPii = false;

  readonly functionDefinition: CapabilityFunctionDefinition = {
    name: 'list_styles',
    description:
      'List the styles the generator knows: key, label, group, a one-line hint, tempo range, meter and default swing. Call this when the user names a genre, then use the closest key with generate_pattern. If nothing is close, say so and write the bars yourself with write_bars.',
    parameters: { type: 'object', properties: {} },
  };

  protected readonly schema = schema;

  async execute(
    _args: Args,
    _context: CapabilityContext
  ): Promise<CapabilityResult<ListStylesData>> {
    const styles = await listStyles();
    return this.success({
      styles: styles.map((s) => ({
        key: s.key,
        label: s.params.label,
        group: s.group,
        hint: s.params.hint,
        bpm: s.params.bpm,
        meter: s.params.meter ?? DEFAULT_METER,
        swing: s.params.swing,
      })),
    });
  }
}
