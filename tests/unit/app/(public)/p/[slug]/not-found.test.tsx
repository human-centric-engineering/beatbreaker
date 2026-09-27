// @vitest-environment happy-dom

/**
 * `/p/[slug]` not-found — the same page for a private, deleted or never-minted
 * address (site-copy §5), so a visitor learns nothing about which.
 *
 * @see app/(public)/p/[slug]/not-found.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PatternNotFound from '@/app/(public)/p/[slug]/not-found';

describe('PatternNotFound', () => {
  it('says the pattern is not shared any more and links back to the library', () => {
    render(<PatternNotFound />);
    expect(screen.getByText("This pattern isn't shared any more")).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Browse the community library' });
    expect(link).toHaveAttribute('href', '/explore');
  });
});
