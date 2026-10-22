// @vitest-environment jsdom
/**
 * `SongTable` — a drummer's songs: scored rows open the Studio on the song,
 * unscored say so, and a link plays through a click-to-load embed.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SongTable } from '@/components/app/drummers/song-table';
import { parseReferenceLink } from '@/lib/app/breaks/links';
import type { SongRow } from '@/lib/app/lineage/songs';

const YT = parseReferenceLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

function song(extra: Partial<SongRow> = {}): SongRow {
  return {
    title: 'How Soon Is Now?',
    artist: 'The Smiths',
    record: 'Meat Is Murder',
    recordingId: 'rec:m',
    year: 1985,
    drums: 'A tremolo-driven backbeat.',
    drummerIds: ['drummer:mike-joyce'],
    scored: null,
    spotify: null,
    youtube: null,
    transcriptions: [],
    ...extra,
  };
}

describe('SongTable', () => {
  it('renders nothing for no songs', () => {
    const { container } = render(<SongTable songs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links a scored row to the Studio on its style and song', () => {
    render(<SongTable songs={[song({ scored: { styleKey: 'joyce', songKey: 'how-soon' } })]} />);
    const row = screen.getByText('How Soon Is Now?').closest('tr')!;
    expect(row).toHaveAttribute('data-scored', 'true');
    expect(within(row).getByRole('link', { name: /play it in the Studio/i })).toHaveAttribute(
      'href',
      '/studio?style=joyce&song=how-soon'
    );
    expect(screen.getByText(/1 song picked.*1 scored in the Studio/)).toBeInTheDocument();
  });

  it('says an unscored row is not scored yet, with no Studio link', () => {
    render(<SongTable songs={[song()]} />);
    const row = screen.getByText('How Soon Is Now?').closest('tr')!;
    expect(row).toHaveAttribute('data-scored', 'false');
    expect(within(row).getByText('Not scored yet')).toBeInTheDocument();
    expect(within(row).queryByRole('link')).toBeNull();
    expect(screen.getByText(/none scored yet/)).toBeInTheDocument();
  });

  it('loads the no-cookie player only on pressing play, and hides it on pressing again', async () => {
    const user = userEvent.setup();
    const { container } = render(<SongTable songs={[song({ youtube: YT })]} />);
    expect(container.querySelector('iframe')).toBeNull();

    const play = screen.getByRole('button', { name: /Play video from YouTube: How Soon Is Now\?/ });
    expect(play).toHaveAttribute('aria-pressed', 'false');
    await user.click(play);
    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
    expect(play).toHaveAttribute('aria-pressed', 'true');

    await user.click(play);
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('links a transcription that has an address, names one that has none', () => {
    render(
      <SongTable
        songs={[
          song({
            transcriptions: [
              { site: 'songsterr', url: 'https://songsterr.com/x' },
              { site: 'book', url: null },
            ],
          }),
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Songsterr' })).toHaveAttribute(
      'href',
      'https://songsterr.com/x'
    );
    expect(screen.getByText(/a book/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'a book' })).toBeNull();
  });
});
