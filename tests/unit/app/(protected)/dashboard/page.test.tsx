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

import { cleanup, render, screen, within } from '@testing-library/react';
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

const EMPTY: HomeView = {
  practising: [],
  recent: [],
  savedCount: 0,
  published: [],
  askAbout: false,
  sessions: [],
  sessionsFirst: false,
};

type Later = 'askAbout' | 'sessions' | 'sessionsFirst';

/**
 * `askAbout`, `sessions` and `sessionsFirst` default to off and empty here so
 * the rest of this file's fixtures — written before Phases 7B and 7D added
 * them — need not each spell them out; a test about them passes them.
 */
async function show(home: Omit<HomeView, Later> & Partial<Pick<HomeView, Later>>) {
  vi.mocked(readHome).mockResolvedValue({
    askAbout: false,
    sessions: [],
    sessionsFirst: false,
    ...home,
  });
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
    // Phase 6: a first-visit way into the community library too
    expect(
      screen.getByRole('link', { name: 'Browse the community library' }).getAttribute('href')
    ).toBe('/explore');
    expect(screen.queryByRole('heading', { name: 'Practising' })).toBeNull();
  });

  it('asks for a pin once there are saved patterns but an empty shelf', async () => {
    await show({ ...EMPTY, savedCount: 3 });
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeTruthy();
    expect(screen.getByText(/Pin the patterns you are practising this week/)).toBeTruthy();
    expect(screen.queryByText(/Welcome to BeatBreaker/)).toBeNull();
  });

  it('draws a Practising card per pin, with its thumbnail, tempo, layer and Continue', async () => {
    await show({ practising: [mineCard, entryCard], recent: [], savedCount: 1, published: [] });

    const cards = within(
      screen.getByRole('heading', { name: 'Practising' }).closest('section')!
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
      published: [],
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

  it('lists Published patterns, each linking to its public page with its save count', async () => {
    await show({
      practising: [],
      recent: [],
      savedCount: 1,
      published: [
        {
          id: 'cbrk00000000000000000003',
          slug: 'cold000001',
          title: 'Cold Carpet',
          style: 'funk',
          bpm: 90,
          publishedAt: '2026-09-20T00:00:00.000Z',
          saves: 3,
          variations: 0,
        },
        {
          id: 'cbrk00000000000000000004',
          slug: 'warm000001',
          title: 'Warm Floor',
          style: 'funk',
          bpm: 100,
          publishedAt: '2026-09-18T00:00:00.000Z',
          saves: 0,
          variations: 0,
        },
      ],
    });

    const published = within(screen.getByRole('heading', { name: 'Published' }).parentElement!);
    const links = published.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/p/cold000001', '/p/warm000001']);
    expect(links[0].textContent).toContain('Cold Carpet');
    expect(links[0].textContent).toContain('3 saves');
    // no "0 saves" clutter for one nobody has copied yet
    expect(links[1].textContent).not.toContain('saves');
    expect(links[1].textContent).not.toContain('save');
  });

  it('says "1 save", not "1 saves"', async () => {
    await show({
      practising: [],
      recent: [],
      savedCount: 1,
      published: [
        {
          id: 'cbrk00000000000000000003',
          slug: 'cold000001',
          title: 'Cold Carpet',
          style: 'funk',
          bpm: 90,
          publishedAt: '2026-09-20T00:00:00.000Z',
          saves: 1,
          variations: 0,
        },
      ],
    });
    expect(screen.getByText(/1 save\b/)).toBeTruthy();
    expect(screen.queryByText(/1 saves/)).toBeNull();
  });

  it('counts published variations beside saves (7A)', async () => {
    await show({
      practising: [],
      recent: [],
      savedCount: 1,
      published: [
        {
          id: 'cbrk00000000000000000003',
          slug: 'cold000001',
          title: 'Cold Carpet',
          style: 'funk',
          bpm: 90,
          publishedAt: '2026-09-20T00:00:00.000Z',
          saves: 3,
          variations: 2,
        },
      ],
    });
    expect(screen.getByText(/3 saves · 2 variations ·/)).toBeTruthy();
  });

  it('has no Published section at all when nothing is published', async () => {
    await show({ practising: [mineCard], recent: [], savedCount: 1, published: [] });
    expect(screen.queryByRole('heading', { name: 'Published' })).toBeNull();
  });

  it('names a style the catalogue no longer holds by its key', async () => {
    await show({
      practising: [
        { ...mineCard, target: { ...mineCard.target, style: 'gone-style' } as HomeCard['target'] },
      ],
      recent: [],
      savedCount: 1,
      published: [],
    });
    expect(screen.getByText('gone-style')).toBeTruthy();
  });

  describe('the About-you card (7B, task 7B.7)', () => {
    it('is shown above Home when readHome says to ask', async () => {
      await show({ ...EMPTY, askAbout: true });
      expect(screen.getByText('Three quick questions')).toBeInTheDocument();
    });

    it('is not shown once you have answered or skipped it', async () => {
      await show({ ...EMPTY, askAbout: false });
      expect(screen.queryByText('Three quick questions')).not.toBeInTheDocument();
    });

    it('is given the catalogue’s styles, by key and label', async () => {
      await show({ ...EMPTY, askAbout: true });
      // the style picker lists the one style listStyles() was mocked with
      expect(screen.getByText(funk.params.label)).toBeInTheDocument();
    });
  });

  describe('Your sessions (7D, task 7D.7)', () => {
    const warmUp = {
      id: 'csess0000000000000000001',
      name: 'Warm-up',
      description: null,
      totalMinutes: 20,
      visibility: 'private' as const,
      slug: null,
      updatedAt: '2026-10-01T09:00:00.000Z',
      itemCount: 4,
      titles: ['Cold Carpet', 'Funky Drummer', 'Amen', 'Impeach the President'],
      lastRunAt: null,
    };

    const sectionHeadings = () =>
      screen
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent)
        .filter((t) => t === 'Practising' || t === 'Your sessions');

    it("leads a teacher's Home with their sessions", async () => {
      await show({
        ...EMPTY,
        practising: [mineCard],
        savedCount: 1,
        sessions: [warmUp],
        sessionsFirst: true,
      });
      expect(sectionHeadings()).toEqual(['Your sessions', 'Practising']);
    });

    it("leads a learner's Home with Practising", async () => {
      await show({ ...EMPTY, practising: [mineCard], savedCount: 1, sessions: [warmUp] });
      expect(sectionHeadings()).toEqual(['Practising', 'Your sessions']);
    });

    it('lists each session linking to its editor, from what readHome returned', async () => {
      await show({ ...EMPTY, savedCount: 1, sessions: [warmUp] });
      const link = screen.getByRole('link', { name: /Warm-up/ });
      expect(link.getAttribute('href')).toBe(`/practice/${warmUp.id}`);
      expect(within(link).getByText('Cold Carpet, Funky Drummer, Amen and 1 more')).toBeTruthy();
      expect(within(link).getByText('Not run yet')).toBeTruthy();
      expect(readHome).toHaveBeenCalledTimes(1);
    });

    it('is not a first visit once you have a session', async () => {
      await show({ ...EMPTY, sessions: [warmUp] });
      expect(screen.queryByText(/Welcome to BeatBreaker/)).toBeNull();
      expect(screen.getByRole('heading', { name: 'Your sessions' })).toBeTruthy();
    });

    it('offers Make a session from this shelf only when the shelf has patterns', async () => {
      await show({ ...EMPTY, savedCount: 1 });
      expect(screen.queryByRole('button', { name: /Make a session from this shelf/ })).toBeNull();
      cleanup();
      await show({ ...EMPTY, practising: [mineCard], savedCount: 1 });
      expect(screen.getByRole('button', { name: /Make a session from this shelf/ })).toBeTruthy();
    });
  });
});

describe('studioHref', () => {
  it('escapes an entry id it puts in a query string', () => {
    expect(studioHref({ ...entryCard.target, id: 'a&b' })).toBe('/studio?entry=a%26b');
  });
});
