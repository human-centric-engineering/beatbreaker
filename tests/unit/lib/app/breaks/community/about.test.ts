import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `lib/app/breaks/community/about.ts` (Phase 7B): About you, read field by
 * field against today's lists and catalogue, saved with the checks only the
 * database can make, and its public half.
 *
 * `prisma.drummerAbout` and `listStyles` are mocked at their module
 * boundaries; `readAboutRow` and `publicPart` are also exercised directly,
 * since they are pure and synchronous.
 *
 * @see lib/app/breaks/community/about.ts
 */

vi.mock('@/lib/db/client', () => ({
  prisma: {
    drummerAbout: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock('@/lib/app/breaks/catalogue/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/app/breaks/catalogue/data')>()),
  listStyles: vi.fn(),
}));

import { ValidationError } from '@/lib/api/errors';
import {
  getAbout,
  publicPart,
  readAboutRow,
  saveAbout,
  type AboutView,
} from '@/lib/app/breaks/community/about';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { prisma } from '@/lib/db/client';
import { testStyle } from '@/tests/helpers/catalogue';
import { DEFAULT_PUBLIC } from '@/lib/validations/drummer-about';

const USER_ID = 'user-1';
const NOW = new Date('2026-09-30T12:00:00Z');

/** A row shaped as `prisma.drummerAbout` returns it. */
function row(over: Record<string, unknown> = {}) {
  return {
    userId: USER_ID,
    purposes: [],
    styles: [],
    ability: null,
    styleAbility: {},
    channels: [],
    public: { ...DEFAULT_PUBLIC },
    askedAt: null,
    ...over,
  };
}

const EMPTY_ABOUT: AboutView = {
  purposes: [],
  styles: [],
  ability: null,
  styleAbility: {},
  channels: [],
  public: { ...DEFAULT_PUBLIC },
  askedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listStyles).mockResolvedValue([testStyle('funk'), testStyle('samba')]);
});

describe('readAboutRow', () => {
  const known = new Set(['funk', 'samba']);

  it('drops a purpose the lists no longer have', () => {
    const result = readAboutRow(row({ purposes: ['learning', 'not-a-real-purpose'] }), known);
    expect(result.purposes).toEqual(['learning']);
  });

  it('de-duplicates purposes', () => {
    const result = readAboutRow(row({ purposes: ['learning', 'learning'] }), known);
    expect(result.purposes).toEqual(['learning']);
  });

  it('reads an ability outside the scale as none set', () => {
    const result = readAboutRow(row({ ability: 'godlike' }), known);
    expect(result.ability).toBeNull();
  });

  it('keeps an ability on the scale', () => {
    const result = readAboutRow(row({ ability: 'advanced' }), known);
    expect(result.ability).toBe('advanced');
  });

  it('drops a style the catalogue no longer has', () => {
    const result = readAboutRow(row({ styles: ['funk', 'retired-style'] }), known);
    expect(result.styles).toEqual(['funk']);
  });

  it('de-duplicates styles', () => {
    const result = readAboutRow(row({ styles: ['funk', 'funk'] }), known);
    expect(result.styles).toEqual(['funk']);
  });

  it('prunes styleAbility to the styles that survived', () => {
    const result = readAboutRow(
      row({
        styles: ['funk'], // samba was dropped by the catalogue check above
        styleAbility: { funk: 'beginner', samba: 'advanced' },
      }),
      known
    );
    expect(result.styleAbility).toEqual({ funk: 'beginner' });
  });

  it('prunes styleAbility to valid ability values', () => {
    const result = readAboutRow(
      row({ styles: ['funk'], styleAbility: { funk: 'not-a-real-level' } }),
      known
    );
    expect(result.styleAbility).toEqual({});
  });

  it('drops a channel that no longer parses', () => {
    const result = readAboutRow(
      row({
        channels: [
          { url: 'https://www.twitch.tv/jodrums', drumming: true },
          { url: 'not a url at all', drumming: false },
        ],
      }),
      known
    );
    expect(result.channels).toEqual([
      { kind: 'twitch', url: 'https://www.twitch.tv/jodrums', drumming: true, display: '@jodrums' },
    ]);
  });

  it('defaults channels public and everything else private when `public` is missing or malformed', () => {
    const result = readAboutRow(row({ public: null }), known);
    expect(result.public).toEqual(DEFAULT_PUBLIC);
  });

  it('reads only stored booleans for each public switch, and only the switches it knows', () => {
    const result = readAboutRow(
      row({ public: { ability: true, styles: 'yes', channels: false, somethingElse: true } }),
      known
    );
    // ability: a real boolean, kept
    // styles: not a boolean, falls back to the default (false)
    // channels: a real boolean, overridden to false
    // somethingElse: not a recognised field, ignored entirely
    expect(result.public).toEqual({
      purposes: false,
      styles: false,
      ability: true,
      channels: false,
    });
  });

  it('reads askedAt as an ISO string when set, null when never asked', () => {
    expect(readAboutRow(row({ askedAt: new Date('2026-09-20T08:00:00Z') }), known).askedAt).toBe(
      '2026-09-20T08:00:00.000Z'
    );
    expect(readAboutRow(row({ askedAt: null }), known).askedAt).toBeNull();
  });
});

describe('getAbout', () => {
  it('reads an empty view for a user with no row, without a style problem to report', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(null);
    const result = await getAbout(USER_ID);
    expect(result).toEqual(EMPTY_ABOUT);
  });
});

describe('saveAbout', () => {
  beforeEach(() => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(null);
  });

  it('refuses a style the catalogue does not have, and writes nothing', async () => {
    await expect(
      saveAbout(USER_ID, { styles: ['funk', 'not-a-real-style'] }, NOW)
    ).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('names the offending styles in the ValidationError details', async () => {
    const error = await saveAbout(USER_ID, { styles: ['not-a-real-style'] }, NOW).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual({ styles: ['not-a-real-style'] });
  });

  it('refuses a styleAbility entry for a style that was not also chosen, and writes nothing', async () => {
    await expect(
      saveAbout(USER_ID, { styles: ['funk'], styleAbility: { samba: 'beginner' } }, NOW)
    ).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.drummerAbout.upsert).not.toHaveBeenCalled(); // test-review:accept no_arg_called — refused before any write
  });

  it('drops the ability of a style you let go when you choose fewer styles', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(
      row({
        styles: ['funk', 'samba'],
        styleAbility: { funk: 'beginner', samba: 'advanced' },
      }) as never
    );
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(
      row({ styles: ['funk'], styleAbility: { funk: 'beginner' } }) as never
    );

    await saveAbout(USER_ID, { styles: ['funk'] }, NOW);

    const call = vi.mocked(prisma.drummerAbout.upsert).mock.calls[0][0] as {
      update: { styleAbility: Record<string, unknown> };
    };
    expect(call.update.styleAbility).toEqual({ funk: 'beginner' });
  });

  it('leaves an omitted field at its current stored value', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(
      row({
        purposes: ['teaching'],
        styles: ['funk'],
        ability: 'advanced',
        channels: [{ url: 'https://www.twitch.tv/jodrums', drumming: true }],
        public: { purposes: true, styles: false, ability: false, channels: true },
      }) as never
    );
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(row() as never);

    await saveAbout(USER_ID, { asked: true }, NOW);

    const call = vi.mocked(prisma.drummerAbout.upsert).mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).toMatchObject({
      purposes: ['teaching'],
      styles: ['funk'],
      ability: 'advanced',
      public: { purposes: true, styles: false, ability: false, channels: true },
      askedAt: NOW,
    });
    // the channel is carried over stripped to its stored shape (kind/url/drumming)
    expect(call.update.channels).toEqual([
      { kind: 'twitch', url: 'https://www.twitch.tv/jodrums', drumming: true },
    ]);
  });

  it('sets askedAt only when asked: true is sent', async () => {
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(row() as never);

    await saveAbout(USER_ID, {}, NOW);
    const withoutAsked = vi.mocked(prisma.drummerAbout.upsert).mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(withoutAsked.update).not.toHaveProperty('askedAt');

    vi.mocked(prisma.drummerAbout.upsert).mockClear();
    await saveAbout(USER_ID, { asked: true }, NOW);
    const withAsked = vi.mocked(prisma.drummerAbout.upsert).mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(withAsked.update.askedAt).toBe(NOW);
  });

  it('reports abilityChanged: false when the ability sent matches what is stored', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(
      row({ ability: 'beginner' }) as never
    );
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(row({ ability: 'beginner' }) as never);

    const result = await saveAbout(USER_ID, { ability: 'beginner' }, NOW);
    expect(result.abilityChanged).toBe(false);
  });

  it('reports abilityChanged: false when ability is omitted, even though one is stored', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(
      row({ ability: 'beginner' }) as never
    );
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(row({ ability: 'beginner' }) as never);

    const result = await saveAbout(USER_ID, { purposes: ['learning'] }, NOW);
    expect(result.abilityChanged).toBe(false);
  });

  it('reports abilityChanged: true when the ability actually differs', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(
      row({ ability: 'beginner' }) as never
    );
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(row({ ability: 'advanced' }) as never);

    const result = await saveAbout(USER_ID, { ability: 'advanced' }, NOW);
    expect(result.abilityChanged).toBe(true);
  });

  it('reports abilityChanged: true when a stored ability is explicitly cleared to null', async () => {
    vi.mocked(prisma.drummerAbout.findUnique).mockResolvedValue(
      row({ ability: 'beginner' }) as never
    );
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(row({ ability: null }) as never);

    const result = await saveAbout(USER_ID, { ability: null }, NOW);
    expect(result.abilityChanged).toBe(true);
  });

  it('creates with the userId and the same data it would update with, for a first save', async () => {
    vi.mocked(prisma.drummerAbout.upsert).mockResolvedValue(
      row({ purposes: ['learning'] }) as never
    );

    await saveAbout(USER_ID, { purposes: ['learning'] }, NOW);

    const call = vi.mocked(prisma.drummerAbout.upsert).mock.calls[0][0] as {
      where: { userId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.where).toEqual({ userId: USER_ID });
    expect(call.create).toMatchObject({ userId: USER_ID, purposes: ['learning'] });
    expect(call.update).toMatchObject({ purposes: ['learning'] });
  });
});

describe('publicPart', () => {
  const base: AboutView = {
    purposes: ['learning'],
    styles: ['funk'],
    ability: 'advanced',
    styleAbility: { funk: 'advanced' },
    channels: [
      {
        kind: 'twitch',
        url: 'https://www.twitch.tv/jodrums',
        drumming: true,
        display: '@jodrums',
      },
    ],
    public: { purposes: true, styles: true, ability: true, channels: true },
    askedAt: null,
  };

  it('includes every field when every switch is on', () => {
    expect(publicPart(base)).toEqual({
      purposes: base.purposes,
      styles: base.styles,
      ability: base.ability,
      styleAbility: base.styleAbility,
      channels: base.channels,
    });
  });

  it('omits purposes entirely when its switch is off', () => {
    const result = publicPart({ ...base, public: { ...base.public, purposes: false } });
    expect(result).not.toHaveProperty('purposes');
  });

  it('omits styles, and styleAbility with it, when the styles switch is off', () => {
    const result = publicPart({ ...base, public: { ...base.public, styles: false } });
    expect(result).not.toHaveProperty('styles');
    expect(result).not.toHaveProperty('styleAbility');
  });

  it('omits ability, and styleAbility with it, when the ability switch is off', () => {
    const result = publicPart({ ...base, public: { ...base.public, ability: false } });
    expect(result).not.toHaveProperty('ability');
    expect(result).not.toHaveProperty('styleAbility');
  });

  it('omits channels entirely when its switch is off', () => {
    const result = publicPart({ ...base, public: { ...base.public, channels: false } });
    expect(result).not.toHaveProperty('channels');
  });

  it('includes styleAbility only when both styles AND ability are public', () => {
    const stylesOnly = publicPart({
      ...base,
      public: { ...base.public, styles: true, ability: false },
    });
    expect(stylesOnly).not.toHaveProperty('styleAbility');

    const abilityOnly = publicPart({
      ...base,
      public: { ...base.public, styles: false, ability: true },
    });
    expect(abilityOnly).not.toHaveProperty('styleAbility');

    const both = publicPart({ ...base, public: { ...base.public, styles: true, ability: true } });
    expect(both.styleAbility).toEqual(base.styleAbility);
  });

  it('returns an empty object when every switch is off', () => {
    expect(
      publicPart({
        ...base,
        public: { purposes: false, styles: false, ability: false, channels: false },
      })
    ).toEqual({});
  });
});
