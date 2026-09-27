// @vitest-environment happy-dom

/**
 * The loading state the three community pages share: it says what is coming,
 * politely, to a screen reader too.
 *
 * @see components/app/community/community-loading.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommunityLoading } from '@/components/app/community/community-loading';
import ExploreLoading from '@/app/(public)/explore/loading';
import PatternLoading from '@/app/(public)/p/[slug]/loading';
import DrummerLoading from '@/app/(public)/u/[username]/loading';

describe('CommunityLoading', () => {
  it('announces what it is waiting for', () => {
    render(<CommunityLoading label="Reading the community library…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Reading the community library…');
  });

  it.each([
    [PatternLoading, 'Opening the pattern…'],
    [ExploreLoading, 'Reading the community library…'],
    [DrummerLoading, 'Reading their patterns…'],
  ])('is what each community page shows while it loads', (Loading, label) => {
    render(<Loading />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });
});
