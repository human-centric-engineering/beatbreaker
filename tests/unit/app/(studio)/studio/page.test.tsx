/**
 * The Studio's own gate.
 *
 * `/studio` is deliberately absent from `lib/app/protected-routes.ts`, so this
 * page is the only thing standing between a signed-out visitor and the app. The
 * reason is H5: a shared break travels in the `#b=` fragment, the server never
 * sees a fragment, and the proxy's edge redirect to `/login` would drop it — so
 * a visitor with a link would sign in and land on a fresh break. `SignInToOpen`
 * stashes the fragment in the browser first.
 *
 * That the seam stays empty is pinned in tests/unit/lib/app/defaults.test.ts;
 * what is pinned here is that the page does the gating instead.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/components/app/shell/studio-frame', () => ({ StudioFrame: () => null }));
vi.mock('@/components/app/shell/studio-tour', () => ({ StudioTour: () => null }));
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
// and your samples, whose scope is tested through /api/v1/samples
vi.mock('@/lib/app/breaks/samples/data', () => ({ listSamples: vi.fn() }));
/* Your About-you styles (7B), so the Studio's style picker puts yours first;
   its own field-by-field read and the ordering it drives are tested through
   /api/v1/drummer-about and lib/app/breaks/catalogue/prefer.test.ts. */
vi.mock('@/lib/app/breaks/community/about', () => ({ getAbout: vi.fn() }));
/* A practice session (7D) is read with the page; its scoping is tested through
   GET /api/v1/practice-sessions/:id, which shares readSession. */
vi.mock('@/lib/app/breaks/saved/sessions', () => ({ readSession: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import StudioPage from '@/app/(studio)/studio/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioTour } from '@/components/app/shell/studio-tour';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { listHistory } from '@/lib/app/breaks/saved/history';
import { listPins } from '@/lib/app/breaks/saved/pins';
import { readStudioSettings } from '@/lib/app/breaks/saved/settings';
import { listSamples } from '@/lib/app/breaks/samples/data';
import { listYourKits } from '@/lib/app/breaks/samples/kits';
import { getAbout } from '@/lib/app/breaks/community/about';
import { readSession } from '@/lib/app/breaks/saved/sessions';
import { sessionView } from '@/tests/unit/components/app/practice/fixtures';
import { DEFAULT_STUDIO_SETTINGS } from '@/lib/validations/studio-settings';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testCatalogue } from '@/tests/helpers/catalogue';

const SHELVES = { practising: [], later: [] };
const HISTORY: Awaited<ReturnType<typeof listHistory>> = [];
const YOUR_SAMPLES = {
  samples: [],
  usage: { count: 0, bytes: 0, maxCount: 150, maxBytes: 52_428_800 },
};
const YOUR_KITS = [{ id: 'ckit00000000000000000001', key: 'yours-a', label: 'Mine', slots: {} }];
const SETTINGS = { ...DEFAULT_STUDIO_SETTINGS, kit: 'liveroom', countIn: 2 };
const ENTRY_ID = 'centry000000000000000001';

const params = (entry?: string | string[]) => ({
  searchParams: Promise.resolve(entry === undefined ? {} : { entry }),
});

describe('/studio', () => {
  beforeEach(() => {
    vi.mocked(listPins).mockResolvedValue(SHELVES);
    vi.mocked(listHistory).mockResolvedValue(HISTORY);
    vi.mocked(readStudioSettings).mockResolvedValue(SETTINGS);
    vi.mocked(listYourKits).mockResolvedValue(YOUR_KITS);
    vi.mocked(listSamples).mockResolvedValue(YOUR_SAMPLES);
    // no preferred styles by default — preferStyles is then the identity, so
    // the `toBe(catalogue)` assertion below keeps meaning what it says
    vi.mocked(getAbout).mockResolvedValue({
      purposes: [],
      styles: [],
      ability: null,
      styleAbility: {},
      channels: [],
      public: { purposes: false, styles: false, ability: false, channels: true },
      askedAt: null,
    });
  });

  it('hands a signed-out visitor to the shim that keeps their link', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await StudioPage(params());
    expect(el.type).toBe(SignInToOpen);
    // back to /studio, so the shim has somewhere to restore the fragment onto
    expect(el.props).toEqual({ loginHref: '/login?callbackUrl=%2Fstudio' });
  });

  it('renders the frame inside the provider, in that order', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    const catalogue = testCatalogue();
    vi.mocked(studioCatalogue).mockResolvedValue(catalogue);
    const el = await StudioPage(params());
    // the frame reads its state from the provider, so the nesting is the contract
    expect(el.type).toBe(StudioProvider);
    // the frame, then the first-run tour beside it (8.6), which reads the same provider
    expect(el.props.children.map((c: { type: unknown }) => c.type)).toEqual([
      StudioFrame,
      StudioTour,
    ]);
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
    expect(listSamples).toHaveBeenCalledWith(createMockAuthSession().user.id);
    expect(el.props.yourSamples).toBe(YOUR_SAMPLES);
    // a plain /studio opens nothing on top of the pattern it arrives to
    expect(el.props.openEntry).toBeUndefined();
    expect(el.props.openDrawer).toBeUndefined();
  });

  it('puts your About-you styles first in the catalogue handed to the provider (7B, task 7B.8)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    const catalogue = testCatalogue();
    vi.mocked(studioCatalogue).mockResolvedValue(catalogue);
    vi.mocked(getAbout).mockResolvedValue({
      purposes: [],
      styles: ['funk'],
      ability: null,
      styleAbility: {},
      channels: [],
      public: { purposes: false, styles: false, ability: false, channels: true },
      askedAt: null,
    });

    const el = await StudioPage(params());

    expect(getAbout).toHaveBeenCalledWith(createMockAuthSession().user.id);
    // preferStyles builds a new catalogue rather than handing back the same object
    expect(el.props.catalogue).not.toBe(catalogue);
    expect(el.props.catalogue.styleGroups[0]).toEqual(['Your styles', ['funk']]);
  });

  describe("?drawer= — Home's Browse the famous grooves", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
      vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
    });
    const query = (q: Record<string, string | string[]>) => ({ searchParams: Promise.resolve(q) });

    it('hands the drawer and its tab to the provider', async () => {
      const el = await StudioPage(query({ drawer: 'patterns', tab: 'libraries' }));
      expect(el.props.openDrawer).toEqual({ tool: 'patterns', tab: 'libraries' });
    });

    it('opens a drawer on its usual tab when the tab is not one', async () => {
      const el = await StudioPage(query({ drawer: 'patterns', tab: 'nope' }));
      expect(el.props.openDrawer).toEqual({ tool: 'patterns' });
    });

    it.each([
      ['not a tool', { drawer: 'admin' }],
      ['repeated', { drawer: ['patterns', 'kit'] }],
      ['empty', { drawer: '' }],
    ])('ignores a drawer that is %s, and still opens the Studio', async (_, q) => {
      const el = await StudioPage(query(q));
      expect(el.type).toBe(StudioProvider);
      expect(el.props.openDrawer).toBeUndefined();
    });
  });

  describe("?entry= — Home's Continue on a famous break", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
      vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
    });

    it('hands the entry to the provider to open once the Studio is up', async () => {
      const el = await StudioPage(params(ENTRY_ID));
      expect(el.props.openEntry).toBe(ENTRY_ID);
    });

    it.each([
      ['not an id', 'javascript:alert(1)'],
      ['repeated', [ENTRY_ID, ENTRY_ID]],
      ['empty', ''],
    ])('ignores one that is %s, and still opens the Studio', async (_, entry) => {
      const el = await StudioPage(params(entry));
      expect(el.type).toBe(StudioProvider);
      expect(el.props.openEntry).toBeUndefined();
    });
  });

  describe('?session= — running a practice session (7D)', () => {
    const SESSION_ID = 'csess0000000000000000001';
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
      vi.mocked(studioCatalogue).mockResolvedValue(testCatalogue());
    });
    const query = (q: Record<string, string | string[]>) => ({ searchParams: Promise.resolve(q) });

    it('reads your session with the page and hands it to the provider', async () => {
      const practice = sessionView();
      vi.mocked(readSession).mockResolvedValue(practice);
      const el = await StudioPage(query({ session: SESSION_ID }));
      expect(readSession).toHaveBeenCalledWith(createMockAuthSession().user.id, SESSION_ID);
      expect(el.props.session).toBe(practice);
    });

    it('is the not-found page for a session that is not yours', async () => {
      vi.mocked(readSession).mockResolvedValue(null);
      await expect(StudioPage(query({ session: SESSION_ID }))).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it.each([
      ['not an id', '../admin'],
      ['repeated', [SESSION_ID, SESSION_ID]],
      ['empty', ''],
    ])('is the not-found page for one that is %s, without asking the database', async (_, id) => {
      await expect(StudioPage(query({ session: id }))).rejects.toThrow('NEXT_NOT_FOUND');
      expect(readSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — a bad id never reaches the database
    });

    it('brings a signed-out drummer back to the session after signing in', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const el = await StudioPage(query({ session: SESSION_ID }));
      expect(el.type).toBe(SignInToOpen);
      expect(el.props.loginHref).toBe(
        `/login?callbackUrl=${encodeURIComponent(`/studio?session=${SESSION_ID}`)}`
      );
      const junk = await StudioPage(query({ session: 'javascript:alert(1)' }));
      expect(junk.props.loginHref).toBe(`/login?callbackUrl=${encodeURIComponent('/studio')}`);
    });

    it('brings a signed-out reader back to the famous break after signing in', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const el = await StudioPage(query({ entry: ENTRY_ID }));
      expect(el.type).toBe(SignInToOpen);
      expect(el.props.loginHref).toBe(
        `/login?callbackUrl=${encodeURIComponent(`/studio?entry=${ENTRY_ID}`)}`
      );
      const both = await StudioPage(query({ session: SESSION_ID, entry: ENTRY_ID }));
      expect(both.props.loginHref).toBe(
        `/login?callbackUrl=${encodeURIComponent(`/studio?session=${SESSION_ID}&entry=${ENTRY_ID}`)}`
      );
      const junk = await StudioPage(query({ entry: '../admin' }));
      expect(junk.props.loginHref).toBe(`/login?callbackUrl=${encodeURIComponent('/studio')}`);
    });

    it('reads no session without the parameter', async () => {
      const el = await StudioPage(query({}));
      expect(el.props.session).toBeUndefined();
      expect(readSession).not.toHaveBeenCalled(); // test-review:accept no_arg_called — nothing asked for
    });
  });
});
