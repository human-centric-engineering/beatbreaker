// @vitest-environment happy-dom

/**
 * A shared pattern's chart, engraved on the server (task 6.6) — both
 * sections, at the full layer, real `engrave()` output rather than a mock.
 *
 * @see components/app/community/public-chart.tsx
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicChart } from '@/components/app/community/public-chart';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { breakPayload } from '@/lib/app/breaks/share';
import { testStyle } from '@/tests/helpers/catalogue';

function payload() {
  const funk = testStyle('funk');
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    seed: 6,
    bars: 2,
    density: 50,
    ghosts: 50,
  });
  return breakPayload({
    bpm: 100,
    swing: 0,
    level: 5,
    arrangement: ['A', 'B'],
    A,
    B: deriveB(A, funk.params),
  });
}

describe('PublicChart', () => {
  it('renders both sections as drum-notation images', () => {
    render(<PublicChart payload={payload()} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('captions the two sections A and B', () => {
    render(<PublicChart payload={payload()} />);
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.getByText('Section B')).toBeInTheDocument();
  });
});
