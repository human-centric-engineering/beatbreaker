// @vitest-environment happy-dom

/**
 * `PatternCard` — one published pattern in the community library, `/explore`
 * and `/u/…`. Link icons only (task 6.7): no request to a provider from the
 * card itself.
 *
 * @see components/app/community/pattern-card.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PatternCard } from '@/components/app/community/pattern-card';
import type { PublicPatternCard } from '@/lib/app/breaks/community/public';
import { publicPath } from '@/lib/app/breaks/community/visibility';

function card(overrides: Partial<PublicPatternCard> = {}): PublicPatternCard {
  return {
    id: 'cbrk00000000000000000001',
    slug: 'abc1234567',
    title: 'Cold Carpet',
    description: null,
    style: 'funk',
    meter: '4/4',
    bpm: 90,
    level: 5,
    difficulty: null,
    linkKinds: [],
    publishedAt: '2026-01-01T00:00:00.000Z',
    author: 'ghostnotes',
    saves: 0,
    ...overrides,
  };
}

describe('PatternCard', () => {
  it('links to the pattern’s public address', () => {
    render(<PatternCard pattern={card()} styleLabel="Funk" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', publicPath('abc1234567'));
  });

  it('shows the author by default', () => {
    render(<PatternCard pattern={card({ author: 'ghostnotes' })} styleLabel="Funk" />);
    expect(screen.getByText('@ghostnotes')).toBeInTheDocument();
  });

  it('hides the author when showAuthor is false', () => {
    render(
      <PatternCard pattern={card({ author: 'ghostnotes' })} styleLabel="Funk" showAuthor={false} />
    );
    expect(screen.queryByText('@ghostnotes')).toBeNull();
  });

  it('hides the author line when the card has none, even with showAuthor true', () => {
    render(<PatternCard pattern={card({ author: null })} styleLabel="Funk" />);
    expect(screen.queryByText(/^@/)).toBeNull();
  });

  it('shows a video icon only when linkKinds includes video', () => {
    render(<PatternCard pattern={card({ linkKinds: ['video'] })} styleLabel="Funk" />);
    expect(screen.getByLabelText('Has a video link')).toBeInTheDocument();
    expect(screen.queryByLabelText('Has a song link')).toBeNull();
  });

  it('shows a song icon only when linkKinds includes song', () => {
    render(<PatternCard pattern={card({ linkKinds: ['song'] })} styleLabel="Funk" />);
    expect(screen.getByLabelText('Has a song link')).toBeInTheDocument();
    expect(screen.queryByLabelText('Has a video link')).toBeNull();
  });

  it('shows both icons when the card has both kinds of link', () => {
    render(<PatternCard pattern={card({ linkKinds: ['video', 'song'] })} styleLabel="Funk" />);
    expect(screen.getByLabelText('Has a video link')).toBeInTheDocument();
    expect(screen.getByLabelText('Has a song link')).toBeInTheDocument();
  });

  it('shows neither icon when the card has no reference links', () => {
    render(<PatternCard pattern={card({ linkKinds: [] })} styleLabel="Funk" />);
    expect(screen.queryByLabelText('Has a video link')).toBeNull();
    expect(screen.queryByLabelText('Has a song link')).toBeNull();
  });

  it('pluralises one save as singular', () => {
    render(<PatternCard pattern={card({ saves: 1 })} styleLabel="Funk" />);
    expect(screen.getByText('1 save')).toBeInTheDocument();
  });

  it('pluralises several saves as plural', () => {
    render(<PatternCard pattern={card({ saves: 3 })} styleLabel="Funk" />);
    expect(screen.getByText('3 saves')).toBeInTheDocument();
  });

  it('shows no saves count at all when there are none', () => {
    render(<PatternCard pattern={card({ saves: 0 })} styleLabel="Funk" />);
    expect(screen.queryByText(/save/)).toBeNull();
  });
});
