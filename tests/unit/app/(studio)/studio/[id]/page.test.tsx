/**
 * `/studio/<id>` — one saved pattern, open in the Studio.
 *
 * The id is accepted and nothing more until Phase 4 gives patterns a server-side
 * life. The route exists now so every link the later phases hand out already
 * resolves, and so the frame is reviewed once rather than twice. What matters
 * today is that it gates exactly as `/studio` does, and that the id it was asked
 * for is the id a visitor comes back to after signing in.
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

import StudioPatternPage from '@/app/(studio)/studio/[id]/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { studioCatalogue } from '@/lib/app/breaks/catalogue/data';
import { createMockAuthSession } from '@/tests/helpers/auth';
import { testCatalogue } from '@/tests/helpers/catalogue';

describe('/studio/[id]', () => {
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

  it('renders the frame inside the provider for a signed-in user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    const catalogue = testCatalogue();
    vi.mocked(studioCatalogue).mockResolvedValue(catalogue);
    const el = await StudioPatternPage({ params: Promise.resolve({ id: 'abc123' }) });
    expect(el.type).toBe(StudioProvider);
    expect(el.props.children.type).toBe(StudioFrame);
    /* The catalogue is loaded here, server-side, and handed down — not fetched
       by the client. The provider has no fallback, so a page that forgot this
       would render nothing at all; asserting identity is what says the page is
       the one doing the loading. */
    expect(el.props.catalogue).toBe(catalogue);
  });
});
