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

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/components/app/shell/studio-frame', () => ({ StudioFrame: () => null }));
/* The catalogue is three database queries. Mocked because this file is about
   the gate and the nesting, not about what is in the catalogue — but mocked at
   the data layer rather than at Prisma, so the page's own call still has to be
   the one the Studio expects. `tests/helpers/catalogue.ts` builds the real
   shape from the seed data, so what the provider receives is not a stub. */
vi.mock('@/lib/app/breaks/catalogue/data', () => ({ studioCatalogue: vi.fn() }));

import StudioPage from '@/app/(studio)/studio/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testCatalogue } from '@/tests/helpers/catalogue';

describe('/studio', () => {
  it('hands a signed-out visitor to the shim that keeps their link', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await StudioPage();
    expect(el.type).toBe(SignInToOpen);
    // back to /studio, so the shim has somewhere to restore the fragment onto
    expect(el.props).toEqual({ loginHref: '/login?callbackUrl=%2Fstudio' });
  });

  it('renders the frame inside the provider, in that order', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    const catalogue = testCatalogue();
    vi.mocked(studioCatalogue).mockResolvedValue(catalogue);
    const el = await StudioPage();
    // the frame reads its state from the provider, so the nesting is the contract
    expect(el.type).toBe(StudioProvider);
    expect(el.props.children.type).toBe(StudioFrame);
    /* The catalogue is loaded here, server-side, and handed down — not fetched
       by the client. The provider has no fallback, so a page that forgot this
       would render nothing at all; asserting identity is what says the page is
       the one doing the loading. */
    expect(el.props.catalogue).toBe(catalogue);
  });
});
