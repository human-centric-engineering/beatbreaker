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

import StudioPage from '@/app/(studio)/studio/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { listHistory } from '@/lib/app/breaks/saved/history';
import { listPins } from '@/lib/app/breaks/saved/pins';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testCatalogue } from '@/tests/helpers/catalogue';

const SHELVES = { practising: [], later: [] };
const HISTORY: Awaited<ReturnType<typeof listHistory>> = [];
const ENTRY_ID = 'centry000000000000000001';

const params = (entry?: string | string[]) => ({
  searchParams: Promise.resolve(entry === undefined ? {} : { entry }),
});

describe('/studio', () => {
  beforeEach(() => {
    vi.mocked(listPins).mockResolvedValue(SHELVES);
    vi.mocked(listHistory).mockResolvedValue(HISTORY);
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
    // a plain /studio opens nothing on top of the pattern it arrives to
    expect(el.props.openEntry).toBeUndefined();
    expect(el.props.openDrawer).toBeUndefined();
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
});
