// @vitest-environment happy-dom

/**
 * The signed-out face of /breaks: stash the shared link, then go and sign in (H5).
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInToOpen } from '@/components/app/breaks/sign-in-to-open';
import { takePendingLink } from '@/lib/app/breaks/pending-link';

const replace = vi.fn();

beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
  vi.stubGlobal('location', { ...window.location, hash: '#b=eyJ2ZXIiOjN9', replace });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SignInToOpen', () => {
  it('stashes the link in the URL and sends the visitor to sign in', () => {
    render(<SignInToOpen loginHref="/login?callbackUrl=%2Fbreaks" />);
    expect(screen.getByRole('status').textContent).toMatch(/sign in/i);
    expect(replace).toHaveBeenCalledWith('/login?callbackUrl=%2Fbreaks');
    expect(takePendingLink(localStorage)).toBe('#b=eyJ2ZXIiOjN9');
  });

  it('still sends a visitor with no link to sign in, stashing nothing', () => {
    vi.stubGlobal('location', { ...window.location, hash: '', replace });
    render(<SignInToOpen loginHref="/login" />);
    expect(replace).toHaveBeenCalledWith('/login');
    expect(localStorage.getItem('bb.pendingLink')).toBeNull();
  });
});
