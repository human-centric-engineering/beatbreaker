import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `aboutContext` / `BUDDY_CONTEXT` (Phase 7B, task 7B.9): what BeatBuddy is
 * told about the drummer it is talking to.
 *
 * Both `getAbout` and `listStyles` are mocked at their module boundaries —
 * this file is about how `about-context.ts` turns a stored row into prose,
 * not about the data layer underneath it.
 *
 * @see lib/app/breaks/buddy/about-context.ts
 */

vi.mock('@/lib/app/breaks/community/about', () => ({
  getAbout: vi.fn(),
}));
vi.mock('@/lib/app/breaks/catalogue/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/app/breaks/catalogue/data')>()),
  listStyles: vi.fn(),
}));

import { aboutContext, BUDDY_CONTEXT } from '@/lib/app/breaks/buddy/about-context';
import { getAbout, type AboutView } from '@/lib/app/breaks/community/about';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { testStyle } from '@/tests/helpers/catalogue';

const EMPTY_ABOUT: AboutView = {
  purposes: [],
  styles: [],
  ability: null,
  styleAbility: {},
  channels: [],
  public: { purposes: false, styles: false, ability: false, channels: true },
  askedAt: null,
};

beforeEach(() => {
  vi.mocked(listStyles).mockResolvedValue([testStyle('funk'), testStyle('samba')]);
});

describe('BUDDY_CONTEXT', () => {
  it('is the studio/about context type BeatBuddy invalidates on save', () => {
    expect(BUDDY_CONTEXT).toEqual({ type: 'studio', id: 'about' });
  });
});

describe('aboutContext', () => {
  it('says nobody is signed in and reads nothing when there is no userId', async () => {
    const result = await aboutContext(undefined);
    expect(result).toBe('No drummer is signed in.');
    expect(getAbout).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to look up
    expect(listStyles).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing to look up
  });

  it('says the drummer has not said anything when the row is empty', async () => {
    vi.mocked(getAbout).mockResolvedValue(EMPTY_ABOUT);
    const result = await aboutContext('user-1');
    expect(result).toBe(
      'The drummer has not said what they play or how well. Ask if it matters to the request.'
    );
  });

  it('includes the private values, not only what the public switches allow', async () => {
    vi.mocked(getAbout).mockResolvedValue({
      ...EMPTY_ABOUT,
      purposes: ['learning'],
      ability: 'beginner',
      // every switch off — this is exactly the private case
      public: { purposes: false, styles: false, ability: false, channels: false },
    });

    const result = await aboutContext('user-1');

    expect(result).toContain('Uses BeatBreaker for: learning to play.');
    expect(result).toContain('Overall ability: beginner.');
  });

  it('names preferred styles by their catalogue label, with a per-style ability where one is set', async () => {
    vi.mocked(getAbout).mockResolvedValue({
      ...EMPTY_ABOUT,
      styles: ['funk', 'samba'],
      styleAbility: { funk: 'advanced' },
    });

    const result = await aboutContext('user-1');

    const funkLabel = testStyle('funk').params.label;
    const sambaLabel = testStyle('samba').params.label;
    expect(result).toContain(`Preferred styles: ${funkLabel} (advanced), ${sambaLabel}.`);
  });

  it('falls back to the raw key for a style the catalogue no longer lists', async () => {
    vi.mocked(listStyles).mockResolvedValue([testStyle('funk')]);
    vi.mocked(getAbout).mockResolvedValue({
      ...EMPTY_ABOUT,
      styles: ['funk', 'retired-style'],
    });

    const result = await aboutContext('user-1');

    expect(result).toContain('retired-style');
  });

  it('never mentions channel links', async () => {
    vi.mocked(getAbout).mockResolvedValue({
      ...EMPTY_ABOUT,
      purposes: ['teaching'],
      channels: [
        {
          kind: 'youtube',
          url: 'https://www.youtube.com/@ghostnotes',
          drumming: true,
          display: '@ghostnotes',
        },
      ],
    });

    const result = await aboutContext('user-1');

    expect(result).not.toContain('youtube');
    expect(result).not.toContain('ghostnotes');
  });
});
