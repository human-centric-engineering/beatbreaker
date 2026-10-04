// @vitest-environment happy-dom

/**
 * The notation key on `/help` (9-iv): one engraved bar per family of drums,
 * and beneath each, the names of its notes in order.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotationKey } from '@/components/app/help/notation-key';

describe('NotationKey', () => {
  it('draws a chart and lists the notes for each family of drums', () => {
    render(<NotationKey />);
    const figures = screen.getAllByRole('figure');
    expect(
      figures.map((f) => within(f).getByText(/./, { selector: 'figcaption' }).textContent)
    ).toEqual(['Snare', 'Hi-hat', 'Ride and crashes', 'Kick and toms']);
    const snare = figures[0];
    expect(within(snare).getByRole('img', { name: /^Snare: ghost, hit/ })).toBeInTheDocument();
    const names = within(snare)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(names).toEqual([
      '1 ghost',
      '2 hit',
      '3 accent',
      '4 cross-stick',
      '5 rimshot',
      '6 flam',
      '7 drag',
      '8 buzz',
    ]);
  });
});
