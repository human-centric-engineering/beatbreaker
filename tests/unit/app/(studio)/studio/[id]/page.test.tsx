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

import StudioPatternPage from '@/app/(studio)/studio/[id]/page';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { getServerSession } from '@/lib/auth/utils';
import { createMockAuthSession } from '@/tests/helpers/auth';

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
    const el = await StudioPatternPage({ params: Promise.resolve({ id: 'abc123' }) });
    expect(el.type).toBe(StudioProvider);
    expect(el.props.children.type).toBe(StudioFrame);
  });
});
