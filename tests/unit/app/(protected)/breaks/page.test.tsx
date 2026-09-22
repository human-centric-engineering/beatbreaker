/**
 * /breaks gates itself, because the proxy's edge redirect lost a shared link's
 * `#b=` fragment (H5). That /breaks is off the proxy's list is pinned in
 * tests/unit/lib/app/defaults.test.ts.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/utils', () => ({ getServerSession: vi.fn() }));
vi.mock('@/components/app/breaks/break-console', () => ({ BreakConsole: () => null }));

import BreaksPage from '@/app/(protected)/breaks/page';
import { BreakConsole } from '@/components/app/breaks/break-console';
import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { getServerSession } from '@/lib/auth/utils';
import { createMockAuthSession } from '@/tests/helpers/auth';

describe('/breaks', () => {
  it('sends a signed-out visitor to sign in through the browser, returning to /breaks', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const el = await BreaksPage();
    expect(el.type).toBe(SignInToOpen);
    expect(el.props).toEqual({ loginHref: '/login?callbackUrl=%2Fbreaks' });
  });

  it('renders the console for a signed-in user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockAuthSession());
    const el = await BreaksPage();
    expect(el.props.children.type).toBe(BreakConsole);
  });
});
