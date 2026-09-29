/**
 * Rules every BeatBuddy tool keeps (app-plan §6, Guardrails): the user comes
 * from `CapabilityContext.userId` and never from the arguments, and nothing
 * can publish, share or delete. Checked across the registered set, so a new
 * tool is held to them without anyone remembering to add a test.
 *
 * FORK NOTE — this reads the real `BEATBUDDY_CAPABILITIES` from
 * `@/lib/app/capabilities` on purpose: a mock would hold the guardrails to a
 * list of its own and let a new tool slip past them. A fork that adds or
 * removes a BeatBuddy tool in that seam should see "are the twelve in the
 * plan" fail until it updates the expected slugs here; the guardrail cases
 * then cover the new tool automatically.
 */

import { describe, expect, it } from 'vitest';

import { BEATBUDDY_CAPABILITIES } from '@/lib/app/capabilities';

const OWNER_WORDS = /user|owner|account|author/i;

describe('BeatBuddy tools', () => {
  it('are the twelve in the plan', () => {
    expect(BEATBUDDY_CAPABILITIES.map((c) => c.slug).sort()).toEqual(
      [
        'apply_doctor_move',
        'explain_difficulty',
        'find_patterns',
        'generate_pattern',
        'get_pattern',
        'list_styles',
        'open_pattern',
        'save_pattern',
        'set_playback',
        'suggest_title',
        'tidy_pattern',
        'write_bars',
      ].sort()
    );
  });

  it.each(BEATBUDDY_CAPABILITIES.map((c) => [c.slug, c] as const))(
    '%s advertises no parameter that could name a user',
    (_slug, cap) => {
      const props = Object.keys(
        (cap.functionDefinition.parameters as { properties?: Record<string, unknown> })
          .properties ?? {}
      );
      expect(props.filter((p) => OWNER_WORDS.test(p))).toEqual([]);
    }
  );

  it.each(BEATBUDDY_CAPABILITIES.map((c) => [c.slug, c] as const))(
    '%s drops a userId the model slips into its arguments',
    (_slug, cap) => {
      let args: unknown;
      try {
        args = cap.validate({ userId: 'user-2' });
      } catch {
        return; // its required arguments are missing — nothing reached execute
      }
      expect(args).not.toHaveProperty('userId');
    }
  );

  it('offers no way to publish, share or delete', () => {
    for (const cap of BEATBUDDY_CAPABILITIES) {
      expect(cap.slug).not.toMatch(/publish|share|delete|remove/);
    }
  });
});
