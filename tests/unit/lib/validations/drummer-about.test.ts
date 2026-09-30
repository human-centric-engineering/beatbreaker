import { describe, expect, it } from 'vitest';

import { MAX_CHANNELS } from '@/lib/app/breaks/community/channels';
import {
  ABILITIES,
  ABILITY_START,
  aboutFormSchema,
  drummerAboutSchema,
  MAX_STYLES,
  PURPOSES,
} from '@/lib/validations/drummer-about';

/**
 * `drummerAboutSchema` and `aboutFormSchema` (Phase 7B) — `PUT
 * /api/v1/drummer-about` and the settings form. What a static schema can
 * check without the database: channels are canonicalised and bounded,
 * purposes and styles are each unique, and an unknown top-level key is
 * refused.
 *
 * @see lib/validations/drummer-about.ts
 */

describe('drummerAboutSchema', () => {
  it('rebuilds each channel to its canonical URL, dropping tracking parameters', () => {
    const result = drummerAboutSchema.safeParse({
      channels: [{ url: 'https://m.youtube.com/@drumtalk?si=track', drumming: true }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channels).toEqual([
        { kind: 'youtube', url: 'https://www.youtube.com/@drumtalk', drumming: true },
      ]);
    }
  });

  it('refuses a channel that is not even a shape a website URL can take', () => {
    const result = drummerAboutSchema.safeParse({
      // a single-label host — not two-or-more DNS labels, so not a website either
      channels: [{ url: 'https://localhost/jo', drumming: false }],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a channel URL that is not https', () => {
    const result = drummerAboutSchema.safeParse({
      channels: [{ url: 'http://www.youtube.com/@drumtalk', drumming: false }],
    });
    expect(result.success).toBe(false);
  });

  it('refuses a second personal website', () => {
    const result = drummerAboutSchema.safeParse({
      channels: [
        { url: 'https://jo-drums.example.com', drumming: false },
        { url: 'https://another-site.example.org', drumming: false },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'One personal website at most')).toBe(
        true
      );
    }
  });

  it('allows one personal website alongside platform channels', () => {
    const result = drummerAboutSchema.safeParse({
      channels: [
        { url: 'https://jo-drums.example.com', drumming: false },
        { url: 'https://www.twitch.tv/jodrums', drumming: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('refuses the same link listed twice', () => {
    const result = drummerAboutSchema.safeParse({
      channels: [
        { url: 'https://www.twitch.tv/jodrums', drumming: true },
        { url: 'https://www.twitch.tv/jodrums?ref=x', drumming: false },
      ],
    });
    // both parse to the same canonical URL — that is the duplicate being caught
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'The same link is in the list twice')
      ).toBe(true);
    }
  });

  it(`refuses more than ${MAX_CHANNELS} channels`, () => {
    const channels = Array.from({ length: MAX_CHANNELS + 1 }, (_, i) => ({
      url: `https://soundcloud.com/drummer-${i}`,
      drumming: false,
    }));
    const result = drummerAboutSchema.safeParse({ channels });
    expect(result.success).toBe(false);
  });

  it('refuses an unknown top-level field', () => {
    const result = drummerAboutSchema.safeParse({ notAField: true });
    expect(result.success).toBe(false);
  });

  it('refuses a duplicate purpose', () => {
    const result = drummerAboutSchema.safeParse({ purposes: ['learning', 'learning'] });
    expect(result.success).toBe(false);
  });

  it('accepts each purpose exactly once', () => {
    const result = drummerAboutSchema.safeParse({ purposes: [...PURPOSES] });
    expect(result.success).toBe(true);
  });

  it(`refuses more than ${MAX_STYLES} styles`, () => {
    const styles = Array.from({ length: MAX_STYLES + 1 }, (_, i) => `style-${i}`);
    const result = drummerAboutSchema.safeParse({ styles });
    expect(result.success).toBe(false);
  });

  it('refuses a duplicate style', () => {
    const result = drummerAboutSchema.safeParse({ styles: ['funk', 'funk'] });
    expect(result.success).toBe(false);
  });

  it('refuses a styleAbility entry naming a style beyond the cap', () => {
    const styleAbility = Object.fromEntries(
      Array.from({ length: MAX_STYLES + 1 }, (_, i) => [`style-${i}`, 'beginner'])
    );
    const result = drummerAboutSchema.safeParse({ styleAbility });
    expect(result.success).toBe(false);
  });

  it('accepts ability: null, to clear a stored value', () => {
    const result = drummerAboutSchema.safeParse({ ability: null });
    expect(result.success).toBe(true);
  });

  it('refuses an ability outside the five-step scale', () => {
    const result = drummerAboutSchema.safeParse({ ability: 'god-tier' });
    expect(result.success).toBe(false);
  });

  it('leaves every field optional, so a partial update (Home’s three-question card) parses', () => {
    const result = drummerAboutSchema.safeParse({
      purposes: ['learning'],
      styles: ['funk'],
      ability: 'beginner',
      asked: true,
    });
    expect(result.success).toBe(true);
  });

  it('refuses an unknown key inside `public`', () => {
    const result = drummerAboutSchema.safeParse({ public: { purposes: true, extra: true } });
    expect(result.success).toBe(false);
  });

  it('only accepts asked: true — not false, which would mean nothing was asked', () => {
    expect(drummerAboutSchema.safeParse({ asked: false }).success).toBe(false);
    expect(drummerAboutSchema.safeParse({ asked: true }).success).toBe(true);
  });
});

describe('ABILITY_START', () => {
  it('has an entry for every ability, lowest to highest layer and tempo', () => {
    expect(Object.keys(ABILITY_START)).toEqual([...ABILITIES]);
    const levels = ABILITIES.map((a) => ABILITY_START[a].startLevel);
    const tempos = ABILITIES.map((a) => ABILITY_START[a].startBpm);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(tempos).toEqual([...tempos].sort((a, b) => a - b));
  });
});

describe('aboutFormSchema', () => {
  it('accepts an empty ability as an empty string, not null', () => {
    const result = aboutFormSchema.safeParse({
      purposes: [],
      ability: '',
      styles: [],
      styleAbility: {},
      channels: [],
      public: { purposes: false, styles: false, ability: false, channels: true },
    });
    expect(result.success).toBe(true);
  });

  it('refuses a channel URL the parser would refuse, the same rule as the server schema', () => {
    const result = aboutFormSchema.safeParse({
      purposes: [],
      ability: '',
      styles: [],
      styleAbility: {},
      channels: [{ url: 'not a url at all', drumming: false }],
      public: { purposes: false, styles: false, ability: false, channels: true },
    });
    expect(result.success).toBe(false);
  });

  it('keeps the channel URL as typed rather than rebuilding it — the server does that', () => {
    const result = aboutFormSchema.safeParse({
      purposes: [],
      ability: '',
      styles: [],
      styleAbility: {},
      channels: [{ url: 'https://m.youtube.com/@drumtalk?si=track', drumming: true }],
      public: { purposes: false, styles: false, ability: false, channels: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channels[0].url).toBe('https://m.youtube.com/@drumtalk?si=track');
    }
  });

  it('refuses a second personal website, the same rule as the server schema', () => {
    const result = aboutFormSchema.safeParse({
      purposes: [],
      ability: '',
      styles: [],
      styleAbility: {},
      channels: [
        { url: 'https://jo-drums.example.com', drumming: false },
        { url: 'https://another-site.example.org', drumming: false },
      ],
      public: { purposes: false, styles: false, ability: false, channels: true },
    });
    expect(result.success).toBe(false);
  });

  it('requires every `public` switch — unlike the server schema, where each is optional', () => {
    const result = aboutFormSchema.safeParse({
      purposes: [],
      ability: '',
      styles: [],
      styleAbility: {},
      channels: [],
      public: { purposes: false },
    });
    expect(result.success).toBe(false);
  });
});
