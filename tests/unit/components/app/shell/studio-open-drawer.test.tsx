// @vitest-environment happy-dom

/**
 * `/studio?drawer=patterns&tab=libraries` — the Studio arriving with a drawer
 * open, on the tab the address named (Home's "Browse the famous grooves").
 *
 * The frame, the provider and the Patterns drawer are real. What is under test
 * is the one timing rule: the drawer opens once the width is known, and on a
 * phone — where the width arriving closes whatever was open — it still ends up
 * open, as the bottom sheet.
 *
 * @see components/app/shell/studio-frame.tsx
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/app/breaks/breaks.css', () => ({}));
vi.mock('@/components/app/shell/studio.css', () => ({}));
vi.mock('@/components/layouts/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/lib/consent', () => ({ useConsent: () => ({ openPreferences: vi.fn() }) }));

import type { StudioDrawer } from '@/components/app/shell/studio-address';
import { StudioFrame } from '@/components/app/shell/studio-frame';
import { StudioProvider } from '@/components/app/studio/studio-provider';
import { testCatalogue } from '@/tests/helpers/catalogue';

function atWidth(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function mount(openDrawer?: StudioDrawer) {
  render(
    <StudioProvider catalogue={testCatalogue()} openDrawer={openDrawer}>
      <StudioFrame />
    </StudioProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(0), 0) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('opening the Studio on a drawer', () => {
  it.each([
    ['a laptop', true],
    ['a phone', false],
  ])('on %s, opens the Patterns drawer on the Libraries tab', async (_, wide) => {
    atWidth(wide);
    mount({ tool: 'patterns', tab: 'libraries' });

    const libraries = await screen.findByRole('tab', { name: 'Libraries' });
    expect(libraries).toHaveAttribute('aria-selected', 'true');
    // the tab is the drawer's own remembered one now, as if chosen by hand
    expect(localStorage.getItem('bb.patternsTab')).toBe('"libraries"');
  });

  it('opens a drawer that has no tabs', async () => {
    atWidth(true);
    mount({ tool: 'export' });
    expect(await screen.findByRole('heading', { name: 'Details' })).toBeInTheDocument();
  });

  it('opens nothing when the address asked for nothing', async () => {
    atWidth(true);
    mount();
    // the stage is up; no drawer came with it
    await screen.findByRole('heading', { level: 2 });
    expect(screen.queryByRole('tab', { name: 'Libraries' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
