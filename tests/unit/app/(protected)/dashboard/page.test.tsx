// @vitest-environment happy-dom

/**
 * Home — the `/dashboard` page (task 4.9)
 *
 * The real page and the real `HomeView` over a mocked `readHome` and a mocked
 * style list. `readHome`'s queries, scope and thumbnails are tested through
 * `GET /api/v1/home`, which shares it; what is pinned here is that the page
 * reads Home once, for the session user, and draws each state the copy in
 * `site-copy.md` §6 calls for.
 *
 * The thumbnail is a real engraving of a real pattern, so the card is checked
 * for drawing it rather than for passing a stub along.
 *
 * @see app/(protected)/dashboard/page.tsx
 * @see components/app/home/home-view.tsx
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth/clear-session', () => ({
  clearInvalidSession: vi.fn((returnUrl: string) => {
    throw new Error(`NEXT_REDIRECT:${returnUrl}`);
  }),
}));
vi.mock('@/lib/app/breaks/saved/home', () => ({ readHome: vi.fn() }));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ listStyles: vi.fn() }));

import DashboardPage from '@/app/(protected)/dashboard/page';
import { studioHref } from '@/components/app/home/home-view';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { engrave } from '@/lib/app/breaks/engrave';
import { generatePattern } from '@/lib/app/breaks/generate';
import type { HomeCard, HomeView } from '@/lib/app/breaks/saved/home';
import { readHome } from '@/lib/app/breaks/saved/home';
import { getServerSession } from '@/lib/auth/utils';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';

const MINE = 'cbrk00000000000000000001';
const ENTRY = 'centry000000000000000001';

const funk = testStyle('funk');
const thumbnail = engrave(
  generatePattern({ style: funk, meter: '4/4', seed: 5, bars: 2, density: 50, ghosts: 50 }),
  null,
  { scale: 0.55, perSystem: 2 }
);

const mineCard: HomeCard = {
  pinId: 'cpin1',
  target: {
    kind: 'break',
    id: MINE,
    title: 'Cold Carpet',
    style: 'funk',
    meter: '4/4',
    bpm: 88,
    level: 4,
    mine: true,
    updatedAt: new Date('2026-09-20T00:00:00Z'),
  },
  level: 4,
  bpm: 88,
  lastOpenedAt: new Date('2026-09-24T10:00:00Z'),
  thumbnail,
};

const entryCard: HomeCard = {
  pinId: 'cpin2',
  target: {
    kind: 'entry',
    id: ENTRY,
    libraryKey: 'famous',
    title: 'Funky Drummer',
    artist: 'James Brown · Clyde Stubblefield, 1970',
    styleKey: 'funk',
    meter: '4/4',
    bpm: 94,
  },
  level: 2,
  bpm: 72,
  lastOpenedAt: null,
  thumbnail: null,
};

const EMPTY: HomeView = { practising: [], recent: [], savedCount: 0 };

async function show(home: HomeView) {
  vi.mocked(readHome).mockResolvedValue(home);
  render(await DashboardPage());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
  vi.mocked(listStyles).mockResolvedValue([{ ...funk, group: 'Funk' }]);
});

describe('/dashboard — Home', () => {
  it('sends a request with no session to sign in, before reading anything', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
    expect(readHome).not.toHaveBeenCalled(); // test-review:accept no_arg_called — redirect must short-circuit
  });

  it('reads Home once, for the session user', async () => {
    await show(EMPTY);
    expect(readHome).toHaveBeenCalledTimes(1);
    expect(readHome).toHaveBeenCalledWith(createMockAuthSession().user.id);
  });

  it('welcomes a first visit, with New pattern and a way into the famous grooves', async () => {
    await show(EMPTY);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome to BeatBreaker' })).toBeTruthy();
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New pattern' }).getAttribute('href')).toBe('/studio');
    // the Studio, opened on the Patterns drawer's Libraries tab
    expect(
      screen.getByRole('link', { name: 'Browse the famous grooves' }).getAttribute('href')
    ).toBe('/studio?drawer=patterns&tab=libraries');
    expect(screen.queryByRole('heading', { name: 'Practising' })).toBeNull();
  });

  it('asks for a pin once there are saved patterns but an empty shelf', async () => {
    await show({ ...EMPTY, savedCount: 3 });
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(screen.getByText(/Pin the patterns you are practising this week/)).toBeTruthy();
    expect(screen.queryByText(/Welcome to BeatBreaker/)).toBeNull();
  });

  it('draws a Practising card per pin, with its thumbnail, tempo, layer and Continue', async () => {
    await show({ practising: [mineCard, entryCard], recent: [], savedCount: 1 });

    const cards = within(
      screen.getByRole('heading', { name: 'Practising' }).parentElement!
    ).getAllByRole('listitem');
    expect(cards).toHaveLength(2);

    const mine = within(cards[0]);
    expect(mine.getByText('Cold Carpet')).toBeTruthy();
    // the style by its picker name, not its key
    expect(mine.getByText(funk.params.label)).toBeTruthy();
    expect(mine.getByText('88 BPM · Ghosted')).toBeTruthy();
    // the engraving itself, drawn from its node tree
    const svg = mine.getByRole('img', { name: thumbnail.label });
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${thumbnail.width} ${thumbnail.height}`);
    expect(svg.children).toHaveLength(thumbnail.nodes.length);
    expect(mine.getByRole('link', { name: 'Continue Cold Carpet' }).getAttribute('href')).toBe(
      `/studio/${MINE}`
    );

    const entry = within(cards[1]);
    expect(entry.getByText('James Brown · Clyde Stubblefield, 1970')).toBeTruthy();
    expect(entry.getByText('72 BPM · Groove')).toBeTruthy();
    expect(entry.getByText('Not yet')).toBeTruthy();
    expect(entry.getByText('No preview')).toBeTruthy();
    expect(entry.getByRole('link', { name: 'Continue Funky Drummer' }).getAttribute('href')).toBe(
      `/studio?entry=${ENTRY}`
    );
  });

  it('lists Recent, each row opening where it lives', async () => {
    await show({
      practising: [],
      savedCount: 1,
      recent: [
        {
          id: 'cvis1',
          level: 5,
          bpm: 90,
          visitedAt: new Date('2026-09-24T10:00:00Z'),
          target: mineCard.target,
        },
        {
          id: 'cvis2',
          level: 2,
          bpm: 72,
          visitedAt: new Date('2026-09-23T10:00:00Z'),
          target: entryCard.target,
        },
      ],
    });

    const recent = within(screen.getByRole('heading', { name: 'Recent' }).parentElement!);
    const links = recent.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      `/studio/${MINE}`,
      `/studio?entry=${ENTRY}`,
    ]);
    expect(links[0].textContent).toContain('Cold Carpet');
    expect(links[1].textContent).toContain('Funky Drummer');
  });

  it('names a style the catalogue no longer holds by its key', async () => {
    await show({
      practising: [
        { ...mineCard, target: { ...mineCard.target, style: 'gone-style' } as HomeCard['target'] },
      ],
      recent: [],
      savedCount: 1,
    });
    expect(screen.getByText('gone-style')).toBeTruthy();
  });
});

describe('studioHref', () => {
  it('escapes an entry id it puts in a query string', () => {
    expect(studioHref({ ...entryCard.target, id: 'a&b' })).toBe('/studio?entry=a%26b');
  });
});
