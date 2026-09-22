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

import StudioPage from '@/app/(studio)/studio/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { createMockAuthSession } from '@/tests/helpers/auth';

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
    const el = await StudioPage();
    // the frame reads its state from the provider, so the nesting is the contract
    expect(el.type).toBe(StudioProvider);
    expect(el.props.children.type).toBe(StudioFrame);
  });
});
