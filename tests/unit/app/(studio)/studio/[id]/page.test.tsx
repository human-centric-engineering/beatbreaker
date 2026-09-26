/**
 * `/studio/<id>` — one saved pattern, open in the Studio.
 *
 * It gates exactly as `/studio` does, sends a signed-out visitor back to the id
 * they asked for, and — from Phase 4 — opens the saved pattern behind the id
 * through `openSavedBreak`, handing it to the console as initial state. Every
 * way of not having a pattern to show is the same not-found page.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/components/app/shell/studio-frame', () => ({ StudioFrame: () => null }));
/* The catalogue is three database queries. Mocked because this file is about
   the gate and the nesting, not about what is in the catalogue — but mocked at
   the data layer rather than at Prisma, so the page's own call still has to be
   the one the Studio expects. `tests/helpers/catalogue.ts` builds the real
   shape from the seed data, so what the provider receives is not a stub. */
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ studioCatalogue: vi.fn() }));
/* The practice shelves, mocked at their own seam like the loader: their query
   and scope are tested through /api/v1/pins, which shares them. */
vi.mock('@/lib/app/breaks/saved/pins', () => ({ listPins: vi.fn() }));
// and the practice history, for the same reason (/api/v1/history)
vi.mock('@/lib/app/breaks/saved/history', () => ({ listHistory: vi.fn() }));
/* and your settings (D19): their per-field fallback and catalogue check are
   tested through /api/v1/studio-settings, which shares the reader */
vi.mock('@/lib/app/breaks/saved/settings', () => ({ readStudioSettings: vi.fn() }));
/* and your own kits (D20): their owner scope is tested through /api/v1/kits,
   which shares the reader */
vi.mock('@/lib/app/breaks/samples/kits', () => ({ listYourKits: vi.fn() }));
/* The loader is mocked at its own seam; its query, its scope and its touch are
   tested through the API route that shares it. */
vi.mock('@/lib/app/breaks/saved/data', () => ({ openSavedBreak: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import StudioPatternPage from '@/app/(studio)/studio/[id]/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { listHistory } from '@/lib/app/breaks/saved/history';
import { listPins } from '@/lib/app/breaks/saved/pins';
import { readStudioSettings } from '@/lib/app/breaks/saved/settings';
import { listYourKits } from '@/lib/app/breaks/samples/kits';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';
import { openSavedBreak } from '@/lib/app/breaks/saved/data';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testCatalogue } from '@/tests/helpers/catalogue';

const SHELVES = { practising: [], later: [] };
const HISTORY: Awaited<ReturnType<typeof listHistory>> = [];
const YOUR_KITS = [{ id: 'ckit00000000000000000001', key: 'yours-a', label: 'Mine', slots: {} }];
const SETTINGS = { ...DEFAULT_STUDIO_SETTINGS, kit: 'liveroom', countIn: 2 };

describe('/studio/[id]', () => {
  beforeEach(() => {
    vi.mocked(listPins).mockResolvedValue(SHELVES);
    vi.mocked(listHistory).mockResolvedValue(HISTORY);
    vi.mocked(readStudioSettings).mockResolvedValue(SETTINGS);
    vi.mocked(listYourKits).mockResolvedValue(YOUR_KITS);
  });

  it('sends a signed-out visitor back to the pattern they asked for', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await StudioPatternPage({ params: Promise.resolve({ id: 'abc123' }) });
    expect(el.type).toBe(SignInToOpen);
    expect(el.props).toEqual({ loginHref: '/login?callbackUrl=%2Fstudio%2Fabc123' });
  });

  it('escapes an id rather than letting it shape the callback URL', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await StudioPatternPage({ params: Promise.resolve({ id: 'a/b?c=d' }) });
    expect(el.props.loginHref).toBe('/login?callbackUrl=%2Fstudio%2Fa%2Fb%3Fc%3Dd');
  });

  const ID = 'cbrk00000000000000000001';
  const payload = { ver: 4 } as never;
  const LINK = { kind: 'song', url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' };

  function opened(overrides: Record<string, unknown> = {}) {
    return {
      row: { id: ID, title: 'Cold Carpet', description: 'From the lesson' },
      payload,
      links: [LINK],
      mine: true,
      ...overrides,
    } as never;
  }

  it('opens the saved pattern for its owner, inside the provider, with the catalogue', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    const catalogue = testCatalogue();
    vi.mocked(studioCatalogue).mockResolvedValue(catalogue);
    vi.mocked(openSavedBreak).mockResolvedValue(opened());

    const el = await StudioPatternPage({ params: Promise.resolve({ id: ID }) });

    expect(el.type).toBe(StudioProvider);
    expect(el.props.children.type).toBe(StudioFrame);
    /* The catalogue is loaded here, server-side, and handed down — not fetched
       by the client. The provider has no fallback, so a page that forgot this
       would render nothing at all; asserting identity is what says the page is
       the one doing the loading. */
    expect(el.props.catalogue).toBe(catalogue);
    // the shelves come the same way, read for the session user
    expect(listPins).toHaveBeenCalledWith(createMockAuthSession().user.id);
    expect(el.props.pins).toBe(SHELVES);
    expect(listHistory).toHaveBeenCalledWith(createMockAuthSession().user.id);
    expect(el.props.history).toBe(HISTORY);
    /* and your settings, so the Studio opens with your kit and tuning rather
       than the defaults first — handed over as read, for the session user */
    expect(readStudioSettings).toHaveBeenCalledWith(createMockAuthSession().user.id);
    expect(el.props.settings).toBe(SETTINGS);
    // and your own kits, read for the session user, never through the catalogue
    expect(listYourKits).toHaveBeenCalledWith(createMockAuthSession().user.id);
    expect(el.props.yourKits).toBe(YOUR_KITS);
    // asked for as the session user — the loader's scope is only as good as this
    expect(openSavedBreak).toHaveBeenCalledWith(ID, createMockAuthSession().user.id);
    expect(el.props.initial).toEqual({
      id: ID,
      title: 'Cold Carpet',
      payload,
      mine: true,
      details: { description: 'From the lesson', links: [LINK] },
    });
  });

  it('opens someone else’s shared pattern as not theirs', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
    vi.mocked(openSavedBreak).mockResolvedValue(opened({ mine: false }));
    const el = await StudioPatternPage({ params: Promise.resolve({ id: ID }) });
    expect(el.props.initial.mine).toBe(false);
  });

  it('is not found when there is nothing the caller may open', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
    vi.mocked(openSavedBreak).mockResolvedValue(null);
    await expect(StudioPatternPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('is not found for an id that is not an id, without asking the database', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    vi.mocked(openSavedBreak).mockClear();
    await expect(
      StudioPatternPage({ params: Promise.resolve({ id: "x'; drop table" }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(openSavedBreak).not.toHaveBeenCalled(); // test-review:accept no_arg_called — validation must short-circuit
  });
});
